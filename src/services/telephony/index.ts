import { MockTelephonyProvider } from './mockTelephonyProvider';
import { TelephonyProvider } from './telephonyInterface';
import { TelnyxTelephonyProvider } from './telnyxTelephonyProvider';

let currentProviderInstance: TelephonyProvider | null = null;
let currentProviderType: 'mock' | 'telnyx' = 'mock';

export function getTelephonyProvider(type?: 'mock' | 'telnyx'): TelephonyProvider {
  const chosenType = type || currentProviderType;

  if (currentProviderInstance && currentProviderType === chosenType) {
    return currentProviderInstance;
  }

  if (currentProviderInstance) {
    currentProviderInstance.cleanup();
  }

  currentProviderType = chosenType;

  if (chosenType === 'telnyx') {
    currentProviderInstance = new TelnyxTelephonyProvider();
  } else {
    currentProviderInstance = new MockTelephonyProvider();
  }

  return currentProviderInstance;
}

export function getCurrentProviderType(): 'mock' | 'telnyx' {
  return currentProviderType;
}

export * from './audioService';
export * from './telephonyInterface';

