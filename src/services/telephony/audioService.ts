/**
 * Web Audio API synthesizer for realistic telephony sounds:
 * - Dual-Tone Multi-Frequency (DTMF) keypad beeps
 * - Standard US Ringback tone (440Hz + 480Hz dual tone cadence)
 * - Call Connected alert
 * - Call Ended / Busy cadence
 */

// DTMF standard frequencies:
//          1209 Hz  1336 Hz  1477 Hz
// 697 Hz     1        2        3
// 770 Hz     4        5        6
// 852 Hz     7        8        9
// 941 Hz     *        0        #

const DTMF_FREQS: Record<string, [number, number]> = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477],
};

class AudioTelephonyService {
  private ctx: AudioContext | null = null;
  private ringbackInterval: number | null = null;
  private isRinging = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * Play DTMF tone for a pressed digit
   */
  playDTMF(digit: string, durationMs = 140) {
    const freqs = DTMF_FREQS[digit];
    if (!freqs) return;

    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const [f1, f2] = freqs;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(f1, ctx.currentTime);
      osc2.frequency.setValueAtTime(f2, ctx.currentTime);

      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + durationMs / 1000);
      osc2.stop(ctx.currentTime + durationMs / 1000);
    } catch {
      // Audio might be blocked if user hasn't interacted yet
    }
  }

  /**
   * Play standard US ringback tone (440Hz + 480Hz, 2 sec on, 3 sec off)
   */
  startRingback() {
    this.stopRingback();
    this.isRinging = true;

    const playOneRing = () => {
      if (!this.isRinging) return;
      try {
        const ctx = this.getContext();
        if (!ctx) return;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, ctx.currentTime);
        osc2.frequency.setValueAtTime(480, ctx.currentTime);

        const ringDuration = 1.6; // 1.6 seconds ring
        gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ringDuration);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + ringDuration);
        osc2.stop(ctx.currentTime + ringDuration);
      } catch {
        // Audio error handle
      }
    };

    playOneRing();
    this.ringbackInterval = setInterval(playOneRing, 3600) as unknown as number;
  }

  stopRingback() {
    this.isRinging = false;
    if (this.ringbackInterval) {
      clearInterval(this.ringbackInterval);
      this.ringbackInterval = null;
    }
  }

  /**
   * Call connected chime
   */
  playConnectedChime() {
    this.stopRingback();
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18); // A5

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio error handle
    }
  }

  /**
   * Call ended tone (busy click / descending beep)
   */
  playEndCallTone() {
    this.stopRingback();
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Audio error handle
    }
  }
}

export const audioTelephony = new AudioTelephonyService();
