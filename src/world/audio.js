// Procedural Web Audio engine for Salt & Sail - zero external audio files needed
class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = typeof localStorage !== 'undefined' ? localStorage.getItem('salt-and-sail:muted') === 'true' : false;
    this.masterGain = null;
    this.ambientGain = null;
    this.ambientPlaying = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.35;
      this.masterGain.connect(this.ctx.destination);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.2;
      this.ambientGain.connect(this.masterGain);

      this.initialized = true;
      this.startAmbient();
    } catch {
      // AudioContext unavailable
    }
  }

  ensureContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('salt-and-sail:muted', String(this.muted));
    }
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.35, this.ctx.currentTime, 0.05);
    }
    return this.muted;
  }

  startAmbient() {
    if (!this.ctx || this.ambientPlaying) return;
    this.ambientPlaying = true;

    // Ocean surf pink noise generator
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2) * 0.15;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 380;
    filter.Q.value = 1.2;

    // LFO for wave modulation
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.18; // swell cycle ~5.5s
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 260;

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const waveGain = this.ctx.createGain();
    waveGain.gain.value = 0.6;

    whiteNoise.connect(filter);
    filter.connect(waveGain);
    waveGain.connect(this.ambientGain);

    whiteNoise.start();
    lfo.start();

    // Occasional seagull cry
    setInterval(() => {
      if (Math.random() < 0.28 && !this.muted && this.ctx?.state === 'running') {
        this.playSeagull();
      }
    }, 9000);
  }

  playSeagull() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';

    // Characteristic gull pitch glide
    const startFreq = 1600 + Math.random() * 400;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.linearRampToValueAtTime(startFreq + 600, t + 0.12);
    osc.frequency.exponentialRampToValueAtTime(startFreq - 200, t + 0.38);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.045, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.45);
  }

  playFootstep(wood = false) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = wood ? 'triangle' : 'sine';
    const freq = wood ? 120 + Math.random() * 30 : 85 + Math.random() * 20;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.08);

    gain.gain.setValueAtTime(wood ? 0.08 : 0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  playCannon() {
    this.ensureContext();
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;

    // 1. Initial explosive punch (low frequency thump)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.45);

    oscGain.gain.setValueAtTime(0.45, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

    // 2. Blast noise burst
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.8);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.18));

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(900, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(80, t + 0.7);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.55);
    noise.start(t);
    noise.stop(t + 0.8);
  }

  playImpact(isWood = true) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = isWood ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(isWood ? 240 : 110, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  playSplash() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.4);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(700, t);
    filter.frequency.exponentialRampToValueAtTime(320, t + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.4);
  }

  playCutlass() {
    this.ensureContext();
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.16);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  playCast() {
    this.ensureContext();
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.linearRampToValueAtTime(950, t + 0.15);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.35);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.38);
  }

  playBite() {
    this.ensureContext();
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    // Splash sound + high chime alert
    this.playSplash();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.linearRampToValueAtTime(1174, t + 0.08);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  playReelClick() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200 + Math.random() * 200, t);

    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.025);
  }

  playCoin() {
    this.ensureContext();
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [987.77, 1318.51].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);
      gain.gain.setValueAtTime(0, t + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.15, t + idx * 0.08 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.38);
    });
  }

  playFanfare() {
    this.ensureContext();
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.12);
      gain.gain.setValueAtTime(0, t + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.16, t + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.12 + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + idx * 0.12);
      osc.stop(t + idx * 0.12 + 0.55);
    });
  }
}

export const sound = new SoundManager();
