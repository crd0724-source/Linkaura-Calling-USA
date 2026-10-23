import { TelnyxRTC, Call } from '@telnyx/webrtc';
import { CallStatus, TelephonyProviderInfo } from '../../types';
import { normalizeUSE164 } from '../../utils/phoneUtils';
import { audioTelephony } from './audioService';
import { TelephonyProvider } from './telephonyInterface';

export class TelnyxTelephonyProvider implements TelephonyProvider {
  id: 'telnyx' = 'telnyx';
  name = 'Telnyx WebRTC';
  isMock = false;
  isConfigured = false;

  private callerId: string = '';
  private callerIdConfigured = false;
  private currentStatus: CallStatus = 'idle';
  private listeners: Set<(status: CallStatus, message?: string) => void> = new Set();
  
  // WebRTC Client and Call References
  private client: TelnyxRTC | null = null;
  private activeCall: Call | null = null;
  private clientToken: string | null = null;
  private isConnectingClient = false;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private localStream: MediaStream | null = null;
  private sseEventSource: EventSource | null = null;

  constructor() {
    this.checkServerConfiguration();
    this.ensureRemoteAudioElement();
    this.initSSEListener();
  }

  private async checkServerConfiguration(): Promise<boolean> {
    try {
      const res = await fetch('/api/telephony/status');
      if (res.ok) {
        const data = await res.json();
        this.isConfigured = Boolean(data.configured);
        this.callerId = data.callerId || '';
        this.callerIdConfigured = Boolean(data.callerIdConfigured);
        return this.isConfigured;
      }
    } catch {
      // Offline / dev fallback
    }
    return false;
  }

  private ensureRemoteAudioElement(): HTMLAudioElement | null {
    if (typeof document === 'undefined') return null;

    if (!this.remoteAudioElement) {
      let el = document.getElementById('telnyx-remote-audio') as HTMLAudioElement;
      if (!el) {
        el = document.createElement('audio');
        el.id = 'telnyx-remote-audio';
        el.autoplay = true;
        (el as any).playsInline = true;
        el.style.display = 'none';
        document.body.appendChild(el);
      }
      this.remoteAudioElement = el;
    }
    return this.remoteAudioElement;
  }

  private initSSEListener() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    try {
      if (this.sseEventSource) {
        this.sseEventSource.close();
      }

      const es = new EventSource('/api/telephony/events');
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleServerTelephonyEvent(data);
        } catch {
          // Ignore parse errors
        }
      };

      es.onerror = () => {
        // SSE reconnects automatically
      };

      this.sseEventSource = es;
    } catch (err) {
      console.warn('Failed to initialize SSE telemetry stream:', err);
    }
  }

  private handleServerTelephonyEvent(data: any) {
    if (!this.activeCall || !data) return;

    const eventType = data.type || '';
    const cause = data.cause || '';

    if (eventType === 'call.ringing' && this.currentStatus !== 'connected') {
      this.notify('ringing', 'Ringing...');
      audioTelephony.startRingback();
    } else if (eventType === 'call.answered' && this.currentStatus !== 'connected') {
      audioTelephony.stopRingback();
      audioTelephony.playConnectedChime();
      this.notify('connected', 'Call connected via Telnyx WebRTC');
    } else if (eventType === 'call.hangup') {
      audioTelephony.stopRingback();
      audioTelephony.playEndCallTone();

      if (cause === 'USER_BUSY' || cause === '486') {
        this.notify('busy', 'Line busy');
      } else if (cause === 'NO_ANSWER' || cause === '408' || cause === 'TIMEOUT') {
        this.notify('no-answer', 'No answer');
      } else {
        this.notify('ended', 'Call ended by remote party');
      }
      this.cleanupCallMedia();
    }
  }

  getProviderInfo(): TelephonyProviderInfo {
    if (this.isConfigured) {
      return {
        id: 'telnyx',
        name: 'Telnyx WebRTC (Live Calling)',
        isConfigured: true,
        statusText: this.callerIdConfigured
          ? `Ready (Caller ID: ${this.callerId})`
          : 'Ready (Caller ID Required)',
        description:
          'Direct two-way browser-to-PSTN WebRTC connection via Telnyx RTC signaling. Master API key is isolated server-side.',
      };
    }

    return {
      id: 'telnyx',
      name: 'Telnyx WebRTC',
      isConfigured: false,
      statusText: 'Telnyx Not Configured on Server',
      description:
        'Server requires TELNYX_API_KEY in .env. The API key is kept strictly on the backend and never exposed to the client.',
    };
  }

  async checkMicrophonePermission(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      return false;
    }
  }

  private notify(status: CallStatus, message?: string) {
    this.currentStatus = status;
    this.listeners.forEach((cb) => cb(status, message));
  }

  onStatusChange(listener: (status: CallStatus, message?: string) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Fetches an ephemeral WebRTC login token from our backend and connects TelnyxRTC
   */
  private async getOrInitTelnyxClient(): Promise<TelnyxRTC> {
    if (this.client && this.clientToken) {
      return this.client;
    }

    if (this.isConnectingClient) {
      // Wait for ongoing connection
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (this.client) return this.client;
    }

    this.isConnectingClient = true;

    try {
      const res = await fetch('/api/telephony/telnyx/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok || !data.token) {
        throw new Error(data.error || 'Failed to obtain Telnyx WebRTC session token from backend.');
      }

      const client = new TelnyxRTC({
        login_token: data.token,
      });

      this.setupClientListeners(client);

      // Connect to Telnyx WebRTC signaling
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          resolve(); // Resolve anyway so call attempt can proceed with standard retry
        }, 8000);

        client.on('telnyx.ready', () => {
          clearTimeout(timeoutId);
          resolve();
        });

        client.on('telnyx.error', (err: any) => {
          clearTimeout(timeoutId);
          console.error('[TelnyxRTC Client Error]:', err);
          reject(new Error(err?.message || 'Telnyx WebRTC signaling connection error.'));
        });

        client.connect();
      });

      this.client = client;
      this.clientToken = data.token;
      return client;
    } finally {
      this.isConnectingClient = false;
    }
  }

  private setupClientListeners(client: TelnyxRTC) {
    client.on('telnyx.notification', (notification: any) => {
      if (!notification) return;

      if (notification.type === 'callUpdate' && notification.call) {
        const call = notification.call;
        const callState = String(call.state || '').toLowerCase();
        const cause = call.cause || call.causeCode || '';

        switch (callState) {
          case 'trying':
          case 'requesting':
            this.notify('dialing', 'Dialing destination via Telnyx WebRTC...');
            break;

          case 'early':
          case 'ringing':
            this.notify('ringing', 'Ringing...');
            audioTelephony.startRingback();
            break;

          case 'active':
            audioTelephony.stopRingback();
            audioTelephony.playConnectedChime();
            this.notify('connected', 'Call connected via Telnyx');

            // Attach remote media stream to playback audio element
            if (call.remoteStream && this.remoteAudioElement) {
              this.remoteAudioElement.srcObject = call.remoteStream;
              this.remoteAudioElement.play().catch((e) => {
                console.warn('[Telnyx Audio Playback Warning]:', e);
              });
            }
            break;

          case 'hangup':
          case 'destroy':
          case 'purge':
            audioTelephony.stopRingback();
            audioTelephony.playEndCallTone();

            if (
              cause === 'USER_BUSY' ||
              cause === 486 ||
              String(cause).toUpperCase().includes('BUSY')
            ) {
              this.notify('busy', 'Line busy');
            } else if (
              cause === 'NO_ANSWER' ||
              cause === 408 ||
              String(cause).toUpperCase().includes('TIMEOUT')
            ) {
              this.notify('no-answer', 'No answer');
            } else if (cause === 'CALL_REJECTED' || cause === 403) {
              this.notify('failed', `Call rejected by network (${cause})`);
            } else {
              this.notify('ended', 'Call ended');
            }

            this.cleanupCallMedia();
            break;
        }
      }
    });

    client.on('telnyx.error', (error: any) => {
      console.error('[TelnyxRTC Error]:', error);
      if (this.currentStatus !== 'idle' && this.currentStatus !== 'ended') {
        this.notify('failed', error?.message || 'Telnyx WebRTC error occurred.');
      }
    });
  }

  async initiateCall(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    // 1. Phone number normalization to strict US E.164
    const norm = normalizeUSE164(phoneNumber);
    if (!norm.valid || !norm.e164) {
      const errMsg = norm.error || 'Invalid destination phone number.';
      this.notify('failed', errMsg);
      return { success: false, error: errMsg };
    }

    const normalizedNumber = norm.e164;

    // 2. Refresh server status and verify Caller ID
    await this.checkServerConfiguration();
    if (!this.isConfigured) {
      const errMsg =
        'Telnyx is not configured on the server. Please set TELNYX_API_KEY in your server environment.';
      this.notify('failed', errMsg);
      return { success: false, error: errMsg };
    }

    if (!this.callerId) {
      const errMsg =
        'Telnyx Caller ID is not configured. Please set TELNYX_CALLER_ID in .env or VITE_TELNYX_CALLER_ID with your assigned Telnyx phone number.';
      this.notify('failed', errMsg);
      return { success: false, error: errMsg };
    }

    // 3. Request and verify microphone access
    this.notify('requesting_mic', 'Checking microphone permission...');
    const hasMic = await this.checkMicrophonePermission();
    if (!hasMic) {
      const errMsg =
        'Microphone access denied. Please allow microphone permissions in your browser address bar to place calls.';
      this.notify('failed', errMsg);
      return { success: false, error: errMsg };
    }

    // Acquire persistent microphone stream for this session
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e: any) {
      const errMsg = 'Failed to access microphone: ' + (e?.message || 'Access denied');
      this.notify('failed', errMsg);
      return { success: false, error: errMsg };
    }

    // 4. Ensure remote playback audio element is mounted
    const remoteEl = this.ensureRemoteAudioElement();

    // 5. Connect or retrieve Telnyx WebRTC client
    this.notify('dialing', `Connecting to Telnyx WebRTC service...`);

    let rtcClient: TelnyxRTC;
    try {
      rtcClient = await this.getOrInitTelnyxClient();
    } catch (err: unknown) {
      const error = err as Error;
      this.notify('failed', error.message || 'Failed to authenticate with Telnyx WebRTC.');
      this.cleanupCallMedia();
      return { success: false, error: error.message };
    }

    // 6. Initiate live WebRTC Call
    this.notify('dialing', `Dialing ${normalizedNumber} via Telnyx...`);

    try {
      const call = rtcClient.newCall({
        destinationNumber: normalizedNumber,
        callerNumber: this.callerId,
        audio: true,
        video: false,
        remoteElement: remoteEl || undefined,
        localStream: this.localStream || undefined,
      });

      this.activeCall = call;

      // Start ringing feedback if audio is not yet connected
      audioTelephony.startRingback();

      return { success: true };
    } catch (err: unknown) {
      audioTelephony.stopRingback();
      const error = err as Error;
      console.error('[Telnyx newCall Exception]:', error);
      this.notify('failed', error.message || 'Call initiation failed.');
      this.cleanupCallMedia();
      return { success: false, error: error.message };
    }
  }

  async hangupCall(): Promise<void> {
    audioTelephony.stopRingback();
    audioTelephony.playEndCallTone();

    if (this.activeCall) {
      try {
        await this.activeCall.hangup();
      } catch (err) {
        console.warn('[Telnyx Hangup Warning]:', err);
      }
    }

    this.notify('ended', 'Call ended');
    this.cleanupCallMedia();
  }

  sendDTMF(tone: string) {
    audioTelephony.playDTMF(tone);
    if (this.activeCall) {
      try {
        this.activeCall.dtmf(tone);
      } catch (err) {
        console.warn('[Telnyx DTMF Warning]:', err);
      }
    }
  }

  setMuted(muted: boolean) {
    if (this.activeCall) {
      try {
        if (muted) {
          this.activeCall.muteAudio();
        } else {
          this.activeCall.unmuteAudio();
        }
      } catch (err) {
        console.warn('[Telnyx Mute Warning]:', err);
      }
    }

    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  private cleanupCallMedia() {
    audioTelephony.stopRingback();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.remoteAudioElement) {
      this.remoteAudioElement.pause();
      this.remoteAudioElement.srcObject = null;
    }

    this.activeCall = null;
  }

  cleanup() {
    this.cleanupCallMedia();
    if (this.sseEventSource) {
      this.sseEventSource.close();
      this.sseEventSource = null;
    }

    if (this.client) {
      try {
        this.client.disconnect();
      } catch {
        // Ignore disconnect error on teardown
      }
      this.client = null;
      this.clientToken = null;
    }

    this.currentStatus = 'idle';
  }
}
