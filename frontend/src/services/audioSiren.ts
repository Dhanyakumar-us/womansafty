class AudioSirenService {
  private audioCtx: AudioContext | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private isPlaying: boolean = false;

  public startSiren(volume: number = 1.0) {
    if (this.isPlaying) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) {
        console.warn('Web Audio API is not supported on this browser.');
        return;
      }

      this.audioCtx = new AudioCtxClass();

      // Master Gain
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(Math.min(1.0, Math.max(0.1, volume)), this.audioCtx.currentTime);
      this.gainNode.connect(this.audioCtx.destination);

      // Oscillator 1 (Primary High Pitch Alert Siren)
      this.osc1 = this.audioCtx.createOscillator();
      this.osc1.type = 'sawtooth';
      this.osc1.frequency.setValueAtTime(850, this.audioCtx.currentTime);

      // Oscillator 2 (Secondary Sub-harmonic Alert Siren)
      this.osc2 = this.audioCtx.createOscillator();
      this.osc2.type = 'square';
      this.osc2.frequency.setValueAtTime(650, this.audioCtx.currentTime);

      // LFO for Wailing Dual Siren Pitch Sweeping Effect
      this.lfo = this.audioCtx.createOscillator();
      this.lfo.type = 'sine';
      this.lfo.frequency.setValueAtTime(2.5, this.audioCtx.currentTime); // 2.5 Hz siren sweep rate

      this.lfoGain = this.audioCtx.createGain();
      this.lfoGain.gain.setValueAtTime(350, this.audioCtx.currentTime); // Frequency shift depth

      // Connect LFO to pitch modulation
      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.osc1.frequency);
      this.lfoGain.connect(this.osc2.frequency);

      // Connect oscillators to master gain
      this.osc1.connect(this.gainNode);
      this.osc2.connect(this.gainNode);

      // Start audio generators
      this.lfo.start();
      this.osc1.start();
      this.osc2.start();

      this.isPlaying = true;
      console.log('[AudioSiren] Emergency distress siren triggered.');
    } catch (err) {
      console.error('[AudioSiren] Failed to start Web Audio siren:', err);
    }
  }

  public stopSiren() {
    if (!this.isPlaying) return;

    try {
      if (this.osc1) { this.osc1.stop(); this.osc1.disconnect(); }
      if (this.osc2) { this.osc2.stop(); this.osc2.disconnect(); }
      if (this.lfo) { this.lfo.stop(); this.lfo.disconnect(); }
      if (this.audioCtx) { this.audioCtx.close(); }
    } catch (err) {
      console.warn('[AudioSiren] Error stopping siren:', err);
    } finally {
      this.audioCtx = null;
      this.osc1 = null;
      this.osc2 = null;
      this.lfo = null;
      this.gainNode = null;
      this.lfoGain = null;
      this.isPlaying = false;
      console.log('[AudioSiren] Siren stopped.');
    }
  }

  public setVolume(volume: number) {
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(Math.min(1.0, Math.max(0.05, volume)), this.audioCtx.currentTime);
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const sirenService = new AudioSirenService();
