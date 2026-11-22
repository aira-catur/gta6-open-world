// audio.js — tiny WebAudio synth sound effects: no audio files, no network.
// One job: engine hum, sirens, cash chimes, crashes and UI clicks, all generated.

export class SoundEffects {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.engineOsc = null;
    this.engineGain = null;
  }

  ensureContext() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      // engine hum: sawtooth through a quiet gain, pitch follows speed
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();
      this.engineOsc.type = 'sawtooth'; this.engineOsc.frequency.value = 55;
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineGain).connect(this.ctx.destination);
      this.engineOsc.start();
      // siren: square wave LFO between two tones
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenGain = this.ctx.createGain();
      this.sirenOsc.type = 'square'; this.sirenOsc.frequency.value = 660;
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain).connect(this.ctx.destination);
      this.sirenOsc.start();
    } catch { this.ctx = null; }
  }

  blip(freq, dur = 0.12, type = 'sine', vol = 0.16) {
    if (!this.ctx || this.muted) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(); o.stop(this.ctx.currentTime + dur);
  }

  playCashReward() { this.blip(880, 0.1); setTimeout(() => this.blip(1320, 0.16), 90); }
  playStepComplete() { this.blip(660, 0.1, 'triangle', 0.2); }
  playCrash() { this.blip(90, 0.25, 'sawtooth', 0.3); }
  playPunch() { this.blip(160, 0.08, 'square', 0.22); }
  playCarjack() { this.blip(440, 0.09, 'square', 0.2); setTimeout(() => this.blip(440, 0.09, 'square', 0.2), 130); }
  playBusted() { this.blip(220, 0.4, 'sawtooth', 0.25); }
  playMissionFail() { this.blip(300, 0.2, 'triangle', 0.2); setTimeout(() => this.blip(200, 0.3, 'triangle', 0.2), 160); }

  // Called every frame: siren audible while wanted, engine pitch follows speed.
  updateAmbience(wantedStars, drivingSpeed, mutedToggle) {
    if (mutedToggle) this.muted = !this.muted;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.sirenGain) {
      const on = wantedStars > 0 && !this.muted;
      this.sirenGain.gain.setTargetAtTime(on ? 0.028 : 0, t, 0.2);
      if (on && this.sirenOsc) this.sirenOsc.frequency.setTargetAtTime(Math.floor(t * 1.4) % 2 ? 660 : 520, t, 0.05);
    }
    if (this.engineGain && this.engineOsc) {
      const driving = drivingSpeed !== null && !this.muted;
      this.engineGain.gain.setTargetAtTime(driving ? 0.035 : 0, t, 0.15);
      if (driving) this.engineOsc.frequency.setTargetAtTime(55 + Math.abs(drivingSpeed) * 0.35, t, 0.1);
    }
  }
}
