import { CallStatus, TelephonyProviderInfo } from '../../types';

export interface TelephonyProvider {
  id: 'mock' | 'telnyx';
  name: string;
  isMock: boolean;
  isConfigured: boolean;

  getProviderInfo(): TelephonyProviderInfo;
  checkMicrophonePermission(): Promise<boolean>;
  initiateCall(phoneNumber: string): Promise<{ success: boolean; error?: string }>;
  hangupCall(): Promise<void>;
  sendDTMF(tone: string): void;
  setMuted(muted: boolean): void;

  // Manual simulation hooks for SDR dev / testing
  simulateAnswer?(): void;
  simulateNoAnswer?(): void;
  simulateBusy?(): void;

  onStatusChange(listener: (status: CallStatus, message?: string) => void): () => void;
  cleanup(): void;
}
