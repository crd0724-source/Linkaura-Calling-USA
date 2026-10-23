import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import Telnyx from 'telnyx';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Capture raw body for Telnyx Ed25519 webhook signature verification
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);

// Server-only secrets (Never exposed to the client)
const getTelnyxApiKey = () => process.env.TELNYX_API_KEY || '';
const getTelnyxPublicKey = () => process.env.TELNYX_PUBLIC_KEY || '';
const getTelnyxSipConnectionId = () =>
  process.env.TELNYX_SIP_CONNECTION_ID || process.env.VITE_TELNYX_SIP_CONNECTION_ID || '';
// Strict Caller ID: Read from server/client config with NO fake fallback
const getTelnyxCallerId = () =>
  process.env.TELNYX_CALLER_ID || process.env.VITE_TELNYX_CALLER_ID || '';

// In-memory cache for on-demand WebRTC credential
let cachedCredential: { id: string; sip_username?: string; created_at: number } | null = null;

// Track processed webhook event IDs to prevent duplicate actions/retries
const processedWebhookIds = new Map<string, number>();

// Server-Sent Events (SSE) subscribers for real-time telephony event dispatch
const sseClients = new Set<Response>();

function broadcastTelephonyEvent(payload: object) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(data);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Clean up processed webhook cache entries older than 1 hour
setInterval(() => {
  const oneHourAgo = Date.now() - 3600000;
  for (const [id, time] of processedWebhookIds.entries()) {
    if (time < oneHourAgo) processedWebhookIds.delete(id);
  }
}, 60000);

// API Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'LinkAura US Calling Server',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Telephony Provider Status (Safe public metadata only - NEVER returns secret keys)
app.get('/api/telephony/status', (_req: Request, res: Response) => {
  const apiKey = getTelnyxApiKey();
  const callerId = getTelnyxCallerId();
  const isConfigured = Boolean(apiKey);
  const callerIdConfigured = Boolean(callerId);

  res.json({
    configured: isConfigured,
    provider: isConfigured ? 'Telnyx' : 'Mock',
    callerId: callerId || null,
    callerIdConfigured,
    sipConnectionConfigured: Boolean(getTelnyxSipConnectionId()),
    webhookConfigured: Boolean(getTelnyxPublicKey()),
    features: {
      outboundCalling: true,
      dtmf: true,
      callWrapUp: true,
      recording: false, // explicitly disabled per requirements
      transcription: false, // explicitly disabled per requirements
      aiVoice: false, // explicitly disabled per requirements
    },
  });
});

// Server-Sent Events (SSE) for Real-Time Call Event Synchronization to the Browser
app.get('/api/telephony/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.add(res);

  // Initial connection heartbeat
  res.write(`data: ${JSON.stringify({ type: 'sse_connected', timestamp: Date.now() })}\n\n`);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Telnyx WebRTC Ephemeral Login Token Generator
// Server authenticates using TELNYX_API_KEY and mints short-lived JWT for browser TelnyxRTC
app.post('/api/telephony/telnyx/token', async (_req: Request, res: Response) => {
  const apiKey = getTelnyxApiKey();
  if (!apiKey) {
    res.status(400).json({
      configured: false,
      error: 'TELNYX_API_KEY is not configured in the server environment. Please set TELNYX_API_KEY in .env on the server.',
    });
    return;
  }

  try {
    let credentialId = process.env.TELNYX_CREDENTIAL_ID || cachedCredential?.id;

    // If no active credential ID, create an on-demand telephony credential tied to connection_id
    if (!credentialId) {
      const createRes = await fetch('https://api.telnyx.com/v2/telephony_credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          connection_id: getTelnyxSipConnectionId() || undefined,
          name: 'LinkAura WebRTC Client',
        }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        const msg = (errData as any)?.errors?.[0]?.detail || 'Failed to create Telnyx WebRTC telephony credential.';
        console.error('[Telnyx Credential Error]:', errData);
        res.status(createRes.status).json({ error: msg });
        return;
      }

      const credData = await createRes.json();
      credentialId = credData?.data?.id;
      cachedCredential = {
        id: credentialId!,
        sip_username: credData?.data?.sip_username,
        created_at: Date.now(),
      };
    }

    // Mint short-lived JWT token via POST /v2/telephony_credentials/{id}/token
    const tokenRes = await fetch(
      `https://api.telnyx.com/v2/telephony_credentials/${encodeURIComponent(credentialId!)}/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[Telnyx Token Error]:', errText);
      // Invalidate cached credential on failure so next request retries
      cachedCredential = null;
      res.status(tokenRes.status).json({
        error: 'Failed to mint Telnyx WebRTC session token from telephony credential.',
      });
      return;
    }

    const tokenText = await tokenRes.text();
    let jwtToken = tokenText.trim();
    try {
      const parsed = JSON.parse(tokenText);
      if (typeof parsed === 'string') jwtToken = parsed;
      else if (parsed.token) jwtToken = parsed.token;
      else if (parsed.data?.token) jwtToken = parsed.data.token;
    } catch {
      // plain text JWT string
    }

    // Strip quotation marks if returned as quoted string
    if (jwtToken.startsWith('"') && jwtToken.endsWith('"')) {
      jwtToken = jwtToken.slice(1, -1);
    }

    // Return ephemeral credential without exposing the master TELNYX_API_KEY
    res.json({
      configured: true,
      token: jwtToken,
      sip_username: cachedCredential?.sip_username,
      credential_id: credentialId,
      expires_in_hours: 24,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[Telnyx Token Exception]:', error.message);
    res.status(500).json({ error: 'Internal server error requesting Telnyx credentials.' });
  }
});

// Telnyx Webhook Receiver with Ed25519 Signature Verification
// Verifies incoming call events and forwards them to active browser clients via SSE
app.post('/api/telephony/webhook', async (req: Request, res: Response) => {
  const publicKey = getTelnyxPublicKey();
  const apiKey = getTelnyxApiKey();

  // Enforce webhook signature validation if public key is configured
  if (!publicKey) {
    console.warn('[Telnyx Webhook]: Received webhook event but TELNYX_PUBLIC_KEY is not configured.');
    res.status(401).json({
      error: 'Webhook verification rejected: TELNYX_PUBLIC_KEY is not configured on the server. Signature verification is required.',
    });
    return;
  }

  const rawBody = (req as any).rawBody || JSON.stringify(req.body);

  try {
    const telnyxClient = new Telnyx({
      apiKey: apiKey || 'dummy_key',
      publicKey: publicKey,
    });

    const event = await telnyxClient.webhooks.unwrap(rawBody, {
      headers: req.headers as Record<string, string>,
    });

    const webhookEvent = event as any;
    const eventId = webhookEvent?.data?.id || (req.body as any)?.data?.id;
    if (eventId) {
      if (processedWebhookIds.has(eventId)) {
        res.status(200).json({ received: true, duplicate: true });
        return;
      }
      processedWebhookIds.set(eventId, Date.now());
    }

    const eventType = webhookEvent?.data?.event_type || (req.body as any)?.data?.event_type;
    const payload = webhookEvent?.data?.payload || (req.body as any)?.data?.payload;

    console.log('[Telnyx Webhook Verified]:', eventType);

    // Broadcast verified event to browser subscribers
    broadcastTelephonyEvent({
      type: eventType,
      payload,
      call_control_id: payload?.call_control_id,
      call_leg_id: payload?.call_leg_id,
      client_state: payload?.client_state,
      state: payload?.state,
      cause: payload?.cause,
      timestamp: Date.now(),
    });

    res.status(200).json({ received: true, verified: true });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[Telnyx Webhook Verification Failed]:', error.message);
    res.status(400).json({ error: 'Invalid Telnyx webhook signature.' });
  }
});

// Serve frontend assets if built
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});

export default app;
