/* =========================================================
   piano.js — Web Audio 合成钢琴（无需任何音频文件）
   对外暴露 window.YaoAudio 与 window.YaoPiano
   ========================================================= */
(function () {
  'use strict';

  const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const SOLFEGE = ['do', '', 're', '', 'mi', 'fa', '', 'sol', '', 'la', '', 'si'];
  const midiToFreq = m => 440 * Math.pow(2, (m - 69) / 12);
  const midiName = m => NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 1);

  /* ---------------- 音频引擎 ---------------- */
  const Audio = {
    ctx: null, master: null, analyser: null, reverb: null,
    timbre: 'grand', volume: 0.7, sustain: false,
    voices: new Map(),

    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain();
      this.master.gain.value = this.volume;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      // 生成式混响（指数衰减噪声脉冲）
      this.reverb = ctx.createConvolver();
      this.reverb.buffer = this._impulse(2.6, 2.4);
      const wet = ctx.createGain(); wet.gain.value = 0.28;
      this.dry = ctx.createGain(); this.dry.gain.value = 1;
      this.dry.connect(comp);
      this.dry.connect(this.reverb); this.reverb.connect(wet); wet.connect(comp);
      comp.connect(this.master);
      this.master.connect(this.analyser);
      this.analyser.connect(ctx.destination);
      return ctx;
    },

    _impulse(seconds, decay) {
      const rate = this.ctx.sampleRate, len = Math.floor(rate * seconds);
      const buf = this.ctx.createBuffer(2, len, rate);
      for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return buf;
    },

    setVolume(v) { this.volume = v; if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); },

    /** 构建一个音（返回可释放的 voice） */
    _voice(midi, when, velocity) {
      const ctx = this.ctx, f = midiToFreq(midi);
      const t = when || ctx.currentTime;
      const out = ctx.createGain();
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.Q.value = 0.6;
      const oscs = [];
      let partials, decay, cutoff, attack;
      // 高音区衰减更快，接近真实钢琴
      const reg = Math.max(0.35, 1.4 - (midi - 48) / 40);
      if (this.timbre === 'felt') {
        partials = [[1, 'sine', 1], [2, 'sine', 0.18], [3, 'triangle', 0.05]];
        decay = 2.2 * reg; cutoff = 1400 + f * 1.2; attack = 0.012;
      } else if (this.timbre === 'glass') {
        partials = [[1, 'sine', 1], [2.76, 'sine', 0.32], [5.4, 'sine', 0.12]];
        decay = 3.6 * reg; cutoff = 9000; attack = 0.004;
      } else {
        partials = [[1, 'triangle', 1], [2, 'sine', 0.42], [3, 'sine', 0.16], [4.01, 'sine', 0.08], [0.5, 'sine', 0.05]];
        decay = 3.2 * reg; cutoff = 2600 + f * 3; attack = 0.003;
      }
      partials.forEach(([mult, type, amp], i) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = f * mult;
        o.detune.value = (i === 0 ? 0 : (Math.random() - 0.5) * 6);
        const g = ctx.createGain();
        g.gain.value = amp;
        o.connect(g); g.connect(filt);
        o.start(t);
        oscs.push(o);
      });
      // 滤波包络：击弦后变暗
      filt.frequency.setValueAtTime(Math.min(cutoff * 1.8, 16000), t);
      filt.frequency.exponentialRampToValueAtTime(Math.max(cutoff * 0.5, 300), t + decay * 0.6);
      // 振幅包络
      const peak = 0.22 * velocity;
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(peak, t + attack);
      out.gain.exponentialRampToValueAtTime(peak * 0.45, t + 0.25);
      out.gain.exponentialRampToValueAtTime(0.0005, t + decay);
      filt.connect(out); out.connect(this.dry);
      const stopAt = t + decay + 0.1;
      oscs.forEach(o => o.stop(stopAt));
      return { out, oscs, start: t, end: stopAt };
    },

    _release(v, at) {
      const ctx = this.ctx, t = Math.max(at || ctx.currentTime, v.start + 0.02);
      if (t >= v.end) return;
      try {
        v.out.gain.cancelScheduledValues(t);
        v.out.gain.setTargetAtTime(0.0001, t, 0.12);
        v.oscs.forEach(o => { try { o.stop(t + 0.8); } catch (e) { /* 已停止 */ } });
      } catch (e) { /* 忽略 */ }
    },

    noteOn(midi, velocity = 0.9) {
      if (!this.init()) return;
      const prev = this.voices.get(midi);
      if (prev) this._release(prev);
      this.voices.set(midi, this._voice(midi, 0, velocity));
    },
    noteOff(midi) {
      const v = this.voices.get(midi);
      if (!v || this.sustain) return;
      this._release(v);
      this.voices.delete(midi);
    },
    releaseAll() {
      this.voices.forEach(v => this._release(v));
      this.voices.clear();
    },
    /** 在指定时间演奏一个音（用于自动演奏） */
    play(midi, when, dur, velocity = 0.8) {
      if (!this.init()) return;
      const v = this._voice(midi, when, velocity);
      this._release(v, when + dur);
    }
  };

  /* ---------------- 键盘 UI ---------------- */
  // 电脑键盘映射（相对当前八度的半音偏移）
  const KEYMAP = {
    a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11,
    k: 12, o: 13, l: 14, p: 15, ';': 16, "'": 17
  };
  const KEY_LABEL = {};
  Object.keys(KEYMAP).forEach(k => { KEY_LABEL[KEYMAP[k]] = k.toUpperCase(); });

  const Piano = {
    el: null, octave: 4, keys: new Map(), listeners: [],
    onNote(fn) { this.listeners.push(fn); },

    build() {
      const el = this.el;
      el.innerHTML = '';
      this.keys.clear();
      const octaves = window.innerWidth < 600 ? 1 : 2;
      const start = (this.octave + 1) * 12; // MIDI: C4 = 60
      const end = start + octaves * 12;     // 包含结尾的 C
      const whites = [];
      for (let m = start; m <= end; m++) if (![1, 3, 6, 8, 10].includes(m % 12)) whites.push(m);
      el.style.setProperty('--wn', whites.length);
      let wi = 0;
      for (let m = start; m <= end; m++) {
        const black = [1, 3, 6, 8, 10].includes(m % 12);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'key ' + (black ? 'key--b' : 'key--w');
        b.dataset.midi = m;
        b.setAttribute('aria-label', midiName(m));
        b.tabIndex = -1;
        const off = m - start;
        const label = KEY_LABEL[off] ? `<b>${KEY_LABEL[off]}</b>` : '';
        b.innerHTML = `<span class="key__label">${label}${black ? '' : (m % 12 === 0 ? midiName(m) : (SOLFEGE[m % 12] || ''))}</span>`;
        if (black) b.style.left = `calc(100% / ${whites.length} * ${wi})`;
        else wi++;
        el.appendChild(b);
        this.keys.set(m, b);
      }
      const ov = document.getElementById('octVal');
      if (ov) ov.textContent = this.octave;
    },

    press(midi, fromUser = true) {
      const k = this.keys.get(midi);
      if (k) k.classList.add('is-down');
      if (fromUser) Audio.noteOn(midi);
      this.listeners.forEach(fn => fn(midi));
    },
    release(midi, fromUser = true) {
      const k = this.keys.get(midi);
      if (k) k.classList.remove('is-down');
      if (fromUser) Audio.noteOff(midi);
    },
    flash(midi, ms) {
      const k = this.keys.get(midi);
      this.listeners.forEach(fn => fn(midi));
      if (!k) return;
      k.classList.add('is-down');
      setTimeout(() => k.classList.remove('is-down'), ms);
    },

    setOctave(o) {
      this.octave = Math.max(2, Math.min(6, o));
      Audio.releaseAll();
      this.build();
    },

    mount(el) {
      this.el = el;
      this.build();
      const pointers = new Map();
      el.addEventListener('pointerdown', e => {
        const k = e.target.closest('.key');
        if (!k) return;
        e.preventDefault();
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
        const m = +k.dataset.midi;
        pointers.set(e.pointerId, m);
        this.press(m);
      });
      el.addEventListener('pointermove', e => {
        if (!pointers.has(e.pointerId)) return;
        const t = document.elementFromPoint(e.clientX, e.clientY);
        const k = t && t.closest && t.closest('.key');
        const m = k ? +k.dataset.midi : null;
        const prev = pointers.get(e.pointerId);
        if (m !== prev) {
          if (prev != null) this.release(prev);
          if (m != null) this.press(m);
          pointers.set(e.pointerId, m);
        }
      });
      const up = e => {
        if (!pointers.has(e.pointerId)) return;
        const m = pointers.get(e.pointerId);
        if (m != null) this.release(m);
        pointers.delete(e.pointerId);
      };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);

      const held = new Set();
      window.addEventListener('keydown', e => {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
        const key = e.key.toLowerCase();
        if (key === 'z') { this.setOctave(this.octave - 1); return; }
        if (key === 'x') { this.setOctave(this.octave + 1); return; }
        if (!(key in KEYMAP) || held.has(key)) return;
        const m = (this.octave + 1) * 12 + KEYMAP[key];
        held.add(key);
        this.press(m);
      });
      window.addEventListener('keyup', e => {
        const key = e.key.toLowerCase();
        if (!held.has(key)) return;
        held.delete(key);
        this.release((this.octave + 1) * 12 + KEYMAP[key]);
      });
      window.addEventListener('blur', () => { held.clear(); Audio.releaseAll(); });

      let lastW = window.innerWidth;
      window.addEventListener('resize', () => {
        if ((lastW < 600) !== (window.innerWidth < 600)) this.build();
        lastW = window.innerWidth;
      });
    }
  };

  window.YaoAudio = Audio;
  window.YaoPiano = Piano;
  window.YaoMusic = { midiToFreq, midiName, NOTE_NAMES };
})();
