import { CallStatus, TelephonyProviderInfo } from '../../types';
import { audioTelephony } from './audioService';
import { TelephonyProvider } from './telephonyInterface';

export class MockTelephonyProvider implements TelephonyProvider {
  id: 'mock' = 'mock';
  name = 'Telnyx WebRTC (Mock Mode)';
  isMock = true;
  isConfigured = false;

  private currentStatus: CallStatus = 'idle';
  private listeners: Set<(status: CallStatus, message?: string) => void> = new Set();
  private ringTimer: number | null = null;
  private autoAnswerTimer: number | null = null;
  private currentStream: MediaStream | null = null;
  private isMuted = false;

  getProviderInfo(): TelephonyProviderInfo {
    return {
      id: 'mock',
      name: 'Telnyx WebRTC (Simulation Mode)',
      isConfigured: false,
      statusText: 'Provider Not Configured',
      description: 'Using realistic browser audio simulation. Add TELNYX_API_KEY to your server environment to connect live calling.',
    };
  }

  async checkMicrophonePermission(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Clean up track immediately
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

  async initiateCall(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    this.cleanup();
    this.notify('requesting_mic', 'Checking microphone access...');

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          this.currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err: unknown) {
          const micError = err as Error;
          console.warn('Microphone permission skipped or blocked, proceeding in test audio mode:', micError.message);
        }
      }
    } catch {
      // Proceed gracefully
    }

    // Switch to ringing
    this.notify('ringing', `Calling ${phoneNumber}...`);
    audioTelephony.startRingback();

    // Auto answer after 4.5 seconds to simulate prospect answering
    this.autoAnswerTimer = setTimeout(() => {
      if (this.currentStatus === 'ringing') {
        this.simulateAnswer();
      }
    }, 4500) as unknown as number;

    return { success: true };
  }

  simulateAnswer() {
    if (this.autoAnswerTimer) {
      clearTimeout(this.autoAnswerTimer);
      this.autoAnswerTimer = null;
    }
    audioTelephony.stopRingback();
    audioTelephony.playConnectedChime();
    this.notify('connected', 'Call connected');
  }

  simulateNoAnswer() {
    this.cleanupTimers();
    audioTelephony.stopRingback();
    audioTelephony.playEndCallTone();
    this.notify('no-answer', 'No answer from prospect');
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => track.stop());
      this.currentStream = null;
    }
  }

  simulateBusy() {
    this.cleanupTimers();
    audioTelephony.stopRingback();
    audioTelephony.playEndCallTone();
    this.notify('busy', 'Line busy');
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => track.stop());
      this.currentStream = null;
    }
  }

  async hangupCall(): Promise<void> {
    this.cleanupTimers();
    audioTelephony.stopRingback();
    audioTelephony.playEndCallTone();
    this.notify('ended', 'Call disconnected');

    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => track.stop());
      this.currentStream = null;
    }
  }

  sendDTMF(tone: string) {
    audioTelephony.playDTMF(tone);
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.currentStream) {
      this.currentStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  private cleanupTimers() {
    if (this.ringTimer) {
      clearTimeout(this.ringTimer);
      this.ringTimer = null;
    }
    if (this.autoAnswerTimer) {
      clearTimeout(this.autoAnswerTimer);
      this.autoAnswerTimer = null;
    }
  }

  cleanup() {
    this.cleanupTimers();
    audioTelephony.stopRingback();
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => track.stop());
      this.currentStream = null;
    }
    this.currentStatus = 'idle';
  }
}
