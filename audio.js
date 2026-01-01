// audio.js
// Simple AudioManager using WebAudio API to synthesize SFX and a light ambient music loop.
// Exposes window.audioManager with methods:
//  - init()                 // call once after a user gesture to create/resume AudioContext
//  - playSfx(name)          // name: 'attack'|'special'|'defend'|'win'|'lose'|'ui'
//  - startMusic() / stopMusic()
//  - setSfxEnabled(on), setMusicEnabled(on)
//  - setSfxVolume(v), setMusicVolume(v)

(function () {
  class AudioManager {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.sfxGain = null;
      this.musicGain = null;
      this.musicOsc = null;
      this.musicLFO = null;
      this.musicRunning = false;
      this.sfxEnabled = true;
      this.musicEnabled = true;
      this.sfxVol = 0.9;
      this.musicVol = 0.25;
      this._userInitialized = false;
    }

    init() {
      if (this._userInitialized) return;
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.master.gain.value = 1.0;
        this.sfxGain.gain.value = this.sfxVol;
        this.musicGain.gain.value = this.musicVol;
        // routing
        this.sfxGain.connect(this.master);
        this.musicGain.connect(this.master);
        this.master.connect(this.ctx.destination);
        this._userInitialized = true;
      } catch (e) {
        console.warn('AudioContext init failed', e);
      }
    }

    // toggles and volumes
    setSfxEnabled(on) { this.sfxEnabled = !!on; }
    setMusicEnabled(on) {
      this.musicEnabled = !!on;
      if (!this.musicEnabled) this.stopMusic();
      else if (this.musicRunning) this.startMusic();
    }
    setSfxVolume(v) {
      this.sfxVol = v;
      if (this.sfxGain) this.sfxGain.gain.setValueAtTime(v, this.ctx.currentTime);
    }
    setMusicVolume(v) {
      this.musicVol = v;
      if (this.musicGain) this.musicGain.gain.setValueAtTime(v, this.ctx.currentTime);
    }

    // small helper: white noise burst (percussive)
    _playNoise(duration = 0.12, volume = 0.9, type = 'noise') {
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.value = volume;
      src.connect(gain);
      gain.connect(this.sfxGain);
      src.start();
      src.stop(this.ctx.currentTime + duration);
    }

    // short percussive click for attack
    _attackSfx() {
      if (!this.ctx) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = 220 + Math.random() * 40;
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(this.sfxGain);
      const now = this.ctx.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.9 * this.sfxVol, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      o.frequency.setValueAtTime(o.frequency.value * 1.1, now + 0.02);
      o.start(now);
      o.stop(now + 0.2);
    }

    // stronger sound for special
    _specialSfx() {
      if (!this.ctx) return;
      // layered oscillator burst + noise
      const now = this.ctx.currentTime;
      const o1 = this.ctx.createOscillator();
      const o2 = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o1.type = 'triangle';
      o2.type = 'sine';
      o1.frequency.value = 360 + Math.random() * 80;
      o2.frequency.value = 540 + Math.random() * 120;
      g.gain.value = 0.0001;
      o1.connect(g); o2.connect(g);
      g.connect(this.sfxGain);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(1.2 * this.sfxVol, now + 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      o1.start(now); o2.start(now);
      o1.stop(now + 0.65); o2.stop(now + 0.65);
      // add noise impact
      this._playNoise(0.18, 0.6);
    }

    // defend little sound
    _defendSfx() {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'square';
      o.frequency.value = 140;
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(this.sfxGain);
      g.gain.exponentialRampToValueAtTime(0.35 * this.sfxVol, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      o.start(now);
      o.stop(now + 0.26);
    }

    // win melody
    _winSfx() {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [660, 880, 990];
      notes.forEach((n, i) => {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.value = n;
        g.gain.value = 0.0001;
        o.connect(g);
        g.connect(this.sfxGain);
        const t = now + i * 0.14;
        g.gain.exponentialRampToValueAtTime(0.7 * this.sfxVol, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        o.start(t); o.stop(t + 0.26);
      });
    }

    // lose chord
    _loseSfx() {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const chord = [220, 165, 110];
      chord.forEach((n, i) => {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.value = n;
        g.gain.value = 0.0001;
        o.connect(g);
        g.connect(this.sfxGain);
        const t = now + i * 0.02;
        g.gain.exponentialRampToValueAtTime(0.6 * this.sfxVol, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
        o.start(t); o.stop(t + 1.0);
      });
      // low rumble
      this._playNoise(0.6, 0.25);
    }

    // ui click
    _uiSfx() {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(this.sfxGain);
      g.gain.exponentialRampToValueAtTime(0.18 * this.sfxVol, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      o.start(now); o.stop(now + 0.14);
    }

    // public playSfx
    playSfx(name) {
      if (!this._userInitialized) return;
      if (!this.sfxEnabled) return;
      switch (name) {
        case 'attack': this._attackSfx(); break;
        case 'special': this._specialSfx(); break;
        case 'defend': this._defendSfx(); break;
        case 'win': this._winSfx(); break;
        case 'lose': this._loseSfx(); break;
        case 'ui': this._uiSfx(); break;
        default: this._uiSfx(); break;
      }
    }

    // simple ambient music: single detuned saw oscillator with slow LFO amplitude modulation
    startMusic() {
      if (!this._userInitialized) return;
      if (!this.musicEnabled) return;
      if (this.musicRunning) return;
      this.musicRunning = true;
      const now = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const o2 = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sawtooth';
      o2.type = 'sawtooth';
      o.frequency.value = 60;
      o2.frequency.value = 62;
      g.gain.value = 0.0001;
      o.connect(g);
      o2.connect(g);
      g.connect(this.musicGain);
      // slow tremolo using periodicWave
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 0.16 + Math.random() * 0.08;
      lfoGain.gain.value = 0.5;
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);
      // set base volume
      g.gain.setValueAtTime(this.musicVol, now);
      // Start
      o.start(now); o2.start(now);
      lfo.start(now);
      // keep handles for stop
      this.musicOsc = [o, o2];
      this.musicLFO = [lfo, lfoGain, g];
    }

    stopMusic() {
      if (!this._userInitialized) return;
      if (!this.musicRunning) return;
      this.musicRunning = false;
      try {
        const now = this.ctx.currentTime;
        if (this.musicLFO && this.musicLFO[0]) this.musicLFO[0].stop(now + 0.02);
        if (this.musicOsc && this.musicOsc.length) {
          this.musicOsc.forEach(o => o.stop(now + 0.02));
        }
        this.musicOsc = null; this.musicLFO = null;
      } catch (e) {
        console.warn('stopMusic error', e);
      }
    }
  }

  window.audioManager = new AudioManager();
})();
