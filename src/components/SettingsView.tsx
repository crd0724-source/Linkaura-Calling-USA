import React, { useState, useEffect } from 'react';
import {
  Settings,
  Radio,
  Database,
  Server,
  Key,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  Mic,
  ShieldCheck,
  AlertTriangle,
  Code2,
} from 'lucide-react';
import { dbService } from '../services/storage/dbService';
import { audioTelephony } from '../services/telephony/audioService';
import { TelephonyProvider } from '../services/telephony';

interface SettingsViewProps {
  provider: TelephonyProvider;
  onSwitchProvider: (type: 'mock' | 'telnyx') => void;
  onDataReset: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  provider,
  onSwitchProvider,
  onDataReset,
}) => {
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [isPlayingTestTone, setIsPlayingTestTone] = useState(false);
  const [micTestResult, setMicTestResult] = useState<string | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const isSupabaseConfigured = Boolean(supabaseUrl && supabaseUrl.includes('supabase.co'));

  const [serverStatus, setServerStatus] = useState<{ configured: boolean; provider: string } | null>(null);

  useEffect(() => {
    fetch('/api/telephony/status')
      .then((res) => res.json())
      .then((data) => setServerStatus(data))
      .catch(() => {});
  }, []);

  const isTelnyxConfigured = Boolean(serverStatus?.configured);
  const schemaSql = dbService.getSupabaseSchemaSql();

  const handleCopySchema = () => {
    navigator.clipboard.writeText(schemaSql);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  const handleTestDtmf = () => {
    audioTelephony.playDTMF('1', 200);
    setTimeout(() => audioTelephony.playDTMF('5', 200), 220);
    setTimeout(() => audioTelephony.playDTMF('9', 200), 440);
  };

  const handleToggleRingback = () => {
    if (isPlayingTestTone) {
      audioTelephony.stopRingback();
      setIsPlayingTestTone(false);
    } else {
      audioTelephony.startRingback();
      setIsPlayingTestTone(true);
      setTimeout(() => {
        audioTelephony.stopRingback();
        setIsPlayingTestTone(false);
      }, 3500);
    }
  };

  const handleTestMic = async () => {
    setMicTestResult('Testing...');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicTestResult('MediaDevices API not available in this browser context.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tracks = stream.getAudioTracks();
      setMicTestResult(`Microphone active: ${tracks[0]?.label || 'Default Audio Input'}`);
      tracks.forEach((t) => t.stop());
    } catch (e: unknown) {
      const err = e as Error;
      setMicTestResult(`Microphone access failed: ${err.message}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 tracking-tight">
          Telephony & Database Architecture
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Provider abstraction details, Telnyx SIP configuration, and Supabase database readiness
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Telephony Provider Abstraction (Telnyx) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-blue-400" />
              Telephony Provider: Telnyx
            </h3>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                isTelnyxConfigured
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-950/60 text-amber-300 border-amber-500/30'
              }`}
            >
              {isTelnyxConfigured ? 'Telnyx Connected' : 'Mock Mode Active'}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            LinkAura uses a modular <code className="text-blue-300">TelephonyProvider</code> interface. In development, the app runs with authentic Web Audio DTMF synthesis and simulated call ringback without requiring Telnyx credentials.
          </p>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 text-xs">
            <div className="font-semibold text-slate-300">Environment Variables Setup:</div>
            <p className="text-[11px] text-slate-400">
              To connect live Telnyx outbound trunking, set in your server environment:
            </p>
            <div className="p-2 bg-slate-900 rounded font-mono text-[10px] text-slate-300 space-y-1 overflow-x-auto">
              <div className="text-emerald-400"># Server-Only Secret (Never exposed to browser):</div>
              <div>TELNYX_API_KEY="KEY018...YOUR_KEY"</div>
              <div className="text-slate-500 pt-1"># Optional Non-Secret Client Configuration:</div>
              <div>VITE_TELNYX_SIP_CONNECTION_ID="your-sip-id"</div>
              <div>VITE_TELNYX_CALLER_ID="+18005550199"</div>
            </div>
            <p className="text-[10px] text-slate-500 pt-1">
              Security: The browser never receives TELNYX_API_KEY. All call requests proxy through the backend server.
            </p>
          </div>

          {/* Provider Mode Switcher */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">Active Provider Engine:</span>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => onSwitchProvider('mock')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  provider.id === 'mock'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mock Simulator
              </button>
              <button
                onClick={() => onSwitchProvider('telnyx')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  provider.id === 'telnyx'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Telnyx Live
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Audio & Microphone Hardware Diagnostics */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              Audio Synthesizer Diagnostics
            </h3>
            <span className="text-[10px] text-emerald-400 font-mono">Web Audio API</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Test the built-in dual-tone multi-frequency synthesizer used for keypad beeps and standard US ringback cadence (440Hz + 480Hz).
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleTestDtmf}
              className="px-3 py-2 text-xs font-medium text-slate-200 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Volume2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Test DTMF Beep</span>
            </button>
            <button
              onClick={handleToggleRingback}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${
                isPlayingTestTone
                  ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                  : 'text-slate-200 bg-slate-950 hover:bg-slate-800 border-slate-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isPlayingTestTone ? 'Stop Ringback' : 'Test US Ringing'}</span>
            </button>
          </div>

          {/* Mic test */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Microphone Input Test:</span>
              <button
                onClick={handleTestMic}
                className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1"
              >
                <Mic className="w-3 h-3 text-blue-400" />
                <span>Test Hardware Mic</span>
              </button>
            </div>
            {micTestResult && (
              <div className="text-[11px] font-mono text-slate-300 bg-slate-950 p-2 rounded border border-slate-800">
                {micTestResult}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Supabase Production Database Readiness */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              Supabase Production Architecture
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Ready-to-deploy PostgreSQL schema for <code className="text-slate-300">contacts</code> and <code className="text-slate-300">calls</code>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                isSupabaseConfigured
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {isSupabaseConfigured ? 'Supabase Connected' : 'Local Storage Mode (Active)'}
            </span>

            <button
              onClick={handleCopySchema}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm"
            >
              {copiedSchema ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSchema ? 'Copied SQL!' : 'Copy SQL Schema'}</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-400 leading-relaxed">
          LinkAura’s data models map 1:1 to Supabase tables. Currently, contacts and call records persist locally in your browser session. When you are ready to connect a live Supabase cloud database, run the DDL below in your Supabase SQL Editor and add <code className="text-amber-300">VITE_SUPABASE_URL</code> and <code className="text-amber-300">VITE_SUPABASE_ANON_KEY</code> to your environment.
        </div>

        <div className="relative bg-slate-950 rounded-lg border border-slate-800 p-3 font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto">
          <pre>{schemaSql}</pre>
        </div>
      </div>

      {/* Section 4: Data Management & Reset */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Demo Prospect & Call Data
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Reset to default pre-loaded US business prospect accounts (New York, Chicago, San Francisco, Austin, etc.)
          </p>
        </div>

        <button
          onClick={() => {
            if (confirm('Reset demo contacts and call logs to default seed records?')) {
              dbService.resetDemoData();
              onDataReset();
            }
          }}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Demo Data</span>
        </button>
      </div>
    </div>
  );
};
