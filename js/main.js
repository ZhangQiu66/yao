/* =========================================================
   main.js — 交互：导航、滚动显现、首屏声波画布、琴房、AI 乐思
   ========================================================= */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const Audio = window.YaoAudio, Piano = window.YaoPiano, Music = window.YaoMusic;

  /* ---------- 年份 ---------- */
  const yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- 导航 ---------- */
  const nav = $('#nav'), toggle = $('#navToggle');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('#navLinks a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); document.body.style.overflow = '';
  }));
  // 当前章节高亮
  const links = new Map($$('#navLinks a').map(a => [a.getAttribute('href').slice(1), a]));
  const secObs = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { links.forEach(l => l.classList.remove('is-active')); const l = links.get(e.target.id); if (l) l.classList.add('is-active'); }
  }), { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((_, id) => { const s = document.getElementById(id); if (s) secObs.observe(s); });

  /* ---------- 滚动显现 ---------- */
  const revObs = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); revObs.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => revObs.observe(el));
  // 首屏立即显现
  requestAnimationFrame(() => $$('.hero .reveal').forEach(el => el.classList.add('is-in')));

  /* ---------- 光晕跟随 & 卡片高光 ---------- */
  const glow = $('.cursor-glow');
  if (window.matchMedia('(pointer: fine)').matches && !reduceMotion) {
    window.addEventListener('pointermove', e => { glow.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; }, { passive: true });
  } else glow.style.display = 'none';
  $$('.card').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
    c.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
  }));

  /* ---------- 首屏：琴键剪影 ---------- */
  const heroKeys = $('#heroKeys');
  const whiteEls = [];
  (function buildHeroKeys() {
    const N = 52, W = 1400 / N, ns = 'http://www.w3.org/2000/svg';
    for (let i = 0; i < N; i++) {
      const r = document.createElementNS(ns, 'rect');
      r.setAttribute('x', i * W); r.setAttribute('y', 0); r.setAttribute('width', W); r.setAttribute('height', 120);
      r.setAttribute('class', 'wk'); heroKeys.appendChild(r); whiteEls.push(r);
    }
    for (let i = 0; i < N - 1; i++) {
      if ([2, 6].includes(i % 7)) continue; // E-F、B-C 之间没有黑键
      const r = document.createElementNS(ns, 'rect');
      r.setAttribute('x', (i + 1) * W - W * 0.3); r.setAttribute('y', 0); r.setAttribute('width', W * 0.6); r.setAttribute('height', 74);
      r.setAttribute('class', 'bk'); heroKeys.appendChild(r);
    }
  })();
  if (!reduceMotion) {
    setInterval(() => {
      const el = whiteEls[Math.floor(Math.random() * whiteEls.length)];
      el.classList.add('lit'); setTimeout(() => el.classList.remove('lit'), 900);
    }, 650);
  }

  /* ---------- 首屏：声波画布 ---------- */
  const cv = $('#heroCanvas'), cx = cv.getContext('2d');
  let cw = 0, ch = 0, dpr = 1, heroVisible = true;
  function sizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = cv.clientWidth; ch = cv.clientHeight;
    cv.width = cw * dpr; cv.height = ch * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  sizeCanvas(); window.addEventListener('resize', sizeCanvas);
  const motes = Array.from({ length: 48 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + .3, s: Math.random() * .0004 + .0001, a: Math.random() }));
  let energy = 0; // 演奏时增强
  function drawHero(t) {
    cx.clearRect(0, 0, cw, ch);
    const lines = 9, baseY = ch * 0.52, gap = Math.max(10, ch * 0.018);
    const mobile = cw < 600;
    for (let i = 0; i < lines; i++) {
      const y0 = baseY + (i - lines / 2) * gap + (mobile ? ch * 0.02 : 0);
      const grad = cx.createLinearGradient(0, 0, cw, 0);
      const a = 0.08 + (i === 4 ? 0.22 : 0.08) + energy * 0.15;
      grad.addColorStop(0, 'rgba(194,165,110,0)');
      grad.addColorStop(0.35, `rgba(224,200,145,${a})`);
      grad.addColorStop(0.75, `rgba(236,228,214,${a * 0.7})`);
      grad.addColorStop(1, 'rgba(194,165,110,0)');
      cx.strokeStyle = grad; cx.lineWidth = i === 4 ? 1.2 : 0.7;
      cx.beginPath();
      for (let x = 0; x <= cw; x += 6) {
        const nx = x / cw;
        const env = Math.sin(Math.PI * nx) ** 2; // 中间振幅最大
        const amp = (ch * 0.07 + energy * ch * 0.05) * env;
        const y = y0
          + Math.sin(nx * 9 + t * 0.0006 + i * 0.35) * amp * 0.6
          + Math.sin(nx * 23 - t * 0.0011 + i * 0.2) * amp * 0.22
          + Math.sin(nx * 3.2 + t * 0.0003) * amp * 0.5;
        x === 0 ? cx.moveTo(x, y) : cx.lineTo(x, y);
      }
      cx.stroke();
    }
    motes.forEach(m => {
      m.y -= m.s * 16; if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
      const tw = 0.35 + 0.35 * Math.sin(t * 0.002 + m.a * 10);
      cx.fillStyle = `rgba(224,200,145,${tw * 0.6})`;
      cx.beginPath(); cx.arc(m.x * cw, m.y * ch, m.r, 0, Math.PI * 2); cx.fill();
    });
    energy *= 0.96;
  }
  const heroObs = new IntersectionObserver(es => { heroVisible = es[0].isIntersecting; });
  heroObs.observe($('#hero'));
  if (reduceMotion) drawHero(2000);
  else (function loop(t) { if (heroVisible) drawHero(t); requestAnimationFrame(loop); })(0);

  /* ---------- 琴房 ---------- */
  Piano.mount($('#keyboard'));
  const display = $('#noteDisplay');
  Piano.onNote(m => { display.textContent = Music.midiName(m); energy = Math.min(1, energy + 0.25); });
  $('#octDown').addEventListener('click', () => Piano.setOctave(Piano.octave - 1));
  $('#octUp').addEventListener('click', () => Piano.setOctave(Piano.octave + 1));
  $('#timbre').addEventListener('change', e => { Audio.timbre = e.target.value; });
  $('#volume').addEventListener('input', e => Audio.setVolume(+e.target.value));
  $('#sustain').addEventListener('change', e => { Audio.sustain = e.target.checked; if (!e.target.checked) Audio.releaseAll(); });
  window.addEventListener('keydown', e => {
    if (e.code === 'Space' && e.target === document.body && isInView($('#keyboard'))) {
      e.preventDefault(); const s = $('#sustain'); s.checked = !s.checked; s.dispatchEvent(new Event('change'));
    }
  });
  function isInView(el) { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }

  // 频谱可视化
  const vz = $('#pianoViz'), vx = vz.getContext('2d');
  let vzVisible = false, freqData = null;
  new IntersectionObserver(es => { vzVisible = es[0].isIntersecting; }).observe(vz);
  function drawViz() {
    const w = vz.clientWidth, h = vz.clientHeight, d = Math.min(devicePixelRatio || 1, 2);
    if (vz.width !== w * d) { vz.width = w * d; vz.height = h * d; }
    vx.setTransform(d, 0, 0, d, 0, 0);
    vx.clearRect(0, 0, w, h);
    const bars = Math.floor(w / 6);
    if (Audio.analyser && !freqData) freqData = new Uint8Array(Audio.analyser.frequencyBinCount);
    if (freqData) Audio.analyser.getByteFrequencyData(freqData);
    for (let i = 0; i < bars; i++) {
      const v = freqData ? freqData[Math.floor(i / bars * freqData.length * 0.5)] / 255 : 0;
      const bh = Math.max(1, v * h * 0.95);
      vx.fillStyle = `rgba(194,165,110,${0.18 + v * 0.7})`;
      vx.fillRect(i * 6, (h - bh) / 2, 2, bh);
    }
  }
  (function vloop() { if (vzVisible) drawViz(); requestAnimationFrame(vloop); })();

  // 自动演奏曲目（公版旋律）
  const SONGS = {
    twinkle: [[60,1],[60,1],[67,1],[67,1],[69,1],[69,1],[67,2],[65,1],[65,1],[64,1],[64,1],[62,1],[62,1],[60,2]],
    ode: [[64,1],[64,1],[65,1],[67,1],[67,1],[65,1],[64,1],[62,1],[60,1],[60,1],[62,1],[64,1],[64,1.5],[62,.5],[62,2]],
    jasmine: [[64,1],[64,.5],[67,.5],[69,.5],[72,.5],[72,.5],[69,.5],[67,1],[67,.5],[69,.5],[67,2],[64,1],[64,.5],[67,.5],[69,.5],[72,.5],[72,.5],[69,.5],[67,1],[67,.5],[69,.5],[67,2]]
  };
  let songTimers = [];
  function stopSong() { songTimers.forEach(clearTimeout); songTimers = []; $$('.chip').forEach(c => c.classList.remove('is-playing')); }
  $$('.chip').forEach(btn => btn.addEventListener('click', () => {
    stopSong();
    const song = SONGS[btn.dataset.song];
    if (!song || !Audio.init()) return;
    btn.classList.add('is-playing');
    const beat = 0.5, t0 = Audio.ctx.currentTime + 0.08;
    let acc = 0;
    song.forEach(([m, d]) => {
      const midi = m + (Piano.octave - 4) * 12;
      Audio.play(midi, t0 + acc * beat, d * beat * 0.95);
      songTimers.push(setTimeout(() => Piano.flash(midi, d * beat * 900), (acc * beat + 0.08) * 1000));
      acc += d;
    });
    songTimers.push(setTimeout(() => btn.classList.remove('is-playing'), (acc * beat + 0.4) * 1000));
  }));

  /* ---------- AI 乐思：本地生成式作曲 ---------- */
  // 均只使用白键调式，便于在五线谱上无升降号呈现
  const MOODS = {
    dawn:  { name: 'C 宫调式', root: 60, scale: [0,2,4,7,9], tempo: 76, meter: 4, prog: [[0,4,7],[9,12,16],[5,9,12],[7,11,14]], term: 'Dolce · con luce',
             titles: ['等待第一缕光','露水与窗','清晨的序章','薄雾初散'],
             lines: ['光从琴盖的缝隙里漏进来，','鸟鸣比闹钟更早一步，','天色由青转白，','第一个音很轻，'],
             ends: ['像一句尚未说完的问候。','把整个房间叫醒。','我把昨夜的梦折成音符。','怕惊扰了这个早晨。'] },
    rain:  { name: 'A 小调（自然小调）', root: 57, scale: [0,2,3,5,7,8,10], tempo: 62, meter: 4, prog: [[0,3,7],[-4,0,3],[-9,-5,0],[-2,2,5]], term: 'Lento · espressivo',
             titles: ['窗外的夜雨','未寄出的信','雨落琴弦','潮湿的回声'],
             lines: ['雨点敲在玻璃上，','路灯在水洼里摇晃，','夜很长，','雨把城市写成了慢板，'],
             ends: ['替我弹完了那一段小调。','像一盏不肯熄灭的心事。','适合把旧旋律再弹一遍。','每一滴都是休止符。'] },
    ink:   { name: 'G 徵调式（五声）', root: 55, scale: [0,2,4,7,9], tempo: 58, meter: 4, prog: [[0,7,12],[-3,4,9],[2,9,14],[0,7,12]], term: 'Sostenuto · 写意',
             titles: ['墨落宣纸','远山无声','留白','一叶扁舟'],
             lines: ['一笔浓，一笔淡，','山在纸上，也在琴上，','水墨不说话，','落笔之前，'],
             ends: ['剩下的交给空白。','都隔着一层轻雾。','却把江南写满了。','先听见了风。'] },
    waltz: { name: 'F 利底亚调式', root: 53, scale: [0,2,4,6,7,9,11], tempo: 132, meter: 3, prog: [[0,4,7],[7,11,14],[2,7,11],[0,4,7]], term: 'Tempo di valse · grazioso',
             titles: ['旋转的裙摆','午后圆舞','烛光与华尔兹','三拍子的信'],
             lines: ['一、二、三，','裙摆旋开一朵花，','烛光在镜子里转身，','三拍子很轻，'],
             ends: ['把心事踩成舞步。','整个大厅都在微笑。','我们踏着弱拍相遇。','却托起了整个夜晚。'] },
    dream: { name: 'D 多利亚调式', root: 62, scale: [0,2,3,5,7,9,10], tempo: 66, meter: 4, prog: [[0,3,7],[5,9,12],[-2,2,5],[0,3,7]], term: 'Misterioso · sognando',
             titles: ['月亮背面','梦的边缘','蓝色时辰','星屑'],
             lines: ['在梦与醒之间，','月亮把琴声收进口袋，','星星落在高音区，','我听见一扇门轻轻打开，'],
             ends: ['有一段旋律正在等我。','带去很远很远的地方。','一颗，一颗，又一颗。','门后是无边的蓝。'] }
  };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  let mood = 'dawn', composed = null, museTimers = [];

  $$('.mood').forEach(b => b.addEventListener('click', () => {
    $$('.mood').forEach(x => { x.classList.remove('is-active'); x.setAttribute('aria-checked', 'false'); });
    b.classList.add('is-active'); b.setAttribute('aria-checked', 'true'); mood = b.dataset.mood;
  }));

  function scalePitches(M) {
    const out = [];
    for (let m = 55; m <= 81; m++) {
      const pc = ((m - M.root) % 12 + 12) % 12;
      if (M.scale.includes(pc)) out.push(m);
    }
    return out.filter(m => m >= 62 && m <= 79); // 高音谱表内，无需加线
  }

  function compose(M) {
    const pitches = scalePitches(M);
    const bars = 4, beats = M.meter;
    const rhythms = beats === 3
      ? [[1,1,1],[2,1],[1,.5,.5,1],[1,2]]
      : [[1,1,1,1],[1,.5,.5,1,1],[2,1,1],[1.5,.5,1,1],[1,1,2],[.5,.5,1,1,1]];
    let idx = Math.floor(pitches.length / 2);
    const notes = [];
    for (let b = 0; b < bars; b++) {
      const chord = M.prog[b].map(i => ((M.root + i) % 12 + 12) % 12);
      const rhythm = b === bars - 1 ? (beats === 3 ? [1, 2] : [1, 1, 2]) : pick(rhythms);
      rhythm.forEach((d, j) => {
        const last = b === bars - 1 && j === rhythm.length - 1;
        if (last) {
          // 终止于主音
          const tonics = pitches.map((p, i) => [p, i]).filter(([p]) => ((p - M.root) % 12 + 12) % 12 === 0);
          const best = tonics.reduce((a, c) => Math.abs(c[1] - idx) < Math.abs(a[1] - idx) ? c : a, tonics[0]);
          idx = best[1];
        } else {
          // 马尔可夫式步进：级进为主，偶有跳进；强拍倾向和弦音
          const step = pick([-1, -1, 1, 1, 1, -2, 2, 0, -3, 3]);
          idx = Math.max(0, Math.min(pitches.length - 1, idx + step));
          if (j === 0) {
            for (let k = 0; k < 3; k++) {
              if (chord.includes(pitches[idx] % 12)) break;
              idx = Math.max(0, Math.min(pitches.length - 1, idx + (Math.random() < .5 ? -1 : 1)));
            }
          }
        }
        notes.push({ midi: pitches[idx], dur: d, bar: b });
      });
    }
    return {
      notes, bars, beats, M,
      title: '《' + pick(M.titles) + '》',
      poem: pick(M.lines) + pick(M.ends)
    };
  }

  // 五线谱渲染（高音谱表：E4 为最下线）
  const LETTER = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
  const diat = m => (Math.floor(m / 12)) * 7 + LETTER[m % 12];
  function renderStaff(c) {
    const svg = $('#museStaff'), ns = 'http://www.w3.org/2000/svg';
    svg.innerHTML = '';
    const el = (tag, attrs, parent = svg) => { const e = document.createElementNS(ns, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
    const top = 40, gap = 12, left = 70, right = 625;
    for (let i = 0; i < 5; i++) el('line', { x1: 10, x2: right, y1: top + i * gap, y2: top + i * gap, class: 'st' });
    const meterT = el('text', { x: 34, y: top + gap * 1.95, class: 'clef meter', 'font-size': 30, 'text-anchor': 'middle' }); meterT.textContent = c.beats;
    const meterB = el('text', { x: 34, y: top + gap * 3.95, class: 'clef meter', 'font-size': 30, 'text-anchor': 'middle' }); meterB.textContent = 4;
    const total = c.bars * c.beats, unit = (right - left - 10) / total;
    const e4 = diat(64);
    const yOf = m => top + 4 * gap - (diat(m) - e4) * (gap / 2);
    let acc = 0;
    const heads = [];
    c.notes.forEach((n, i) => {
      const x = left + acc * unit + 8, y = yOf(n.midi);
      const g = el('g', { class: 'note-g', style: `animation-delay:${i * 45}ms` });
      const hollow = n.dur >= 2;
      const head = el('ellipse', { cx: x, cy: y, rx: 6.4, ry: 4.6, transform: `rotate(-20 ${x} ${y})`, class: 'nh' }, g);
      if (hollow) { head.setAttribute('fill', 'none'); head.setAttribute('stroke', '#e0c891'); head.setAttribute('stroke-width', '1.6'); head.classList.remove('nh'); head.classList.add('nh', 'nh--h'); }
      const up = y > top + 2 * gap;
      const sx = up ? x + 5.6 : x - 5.6, sy2 = up ? y - 34 : y + 34;
      el('line', { x1: sx, x2: sx, y1: y, y2: sy2, class: 'stem' }, g);
      if (n.dur === 0.5) el('path', { d: up ? `M${sx} ${sy2} q 4 10 10 14` : `M${sx} ${sy2} q 4 -10 10 -14`, fill: 'none', stroke: '#e0c891', 'stroke-width': 1.4 }, g);
      if (n.dur === 1.5) el('circle', { cx: x + 11, cy: y - 2, r: 1.8, class: 'nh' }, g);
      if (diat(n.midi) <= diat(60)) el('line', { x1: x - 10, x2: x + 10, y1: yOf(60), y2: yOf(60), class: 'lg' }, g);
      heads.push(head);
      acc += n.dur;
      if (Math.abs(acc % c.beats) < 1e-6) {
        const bx = left + acc * unit;
        el('line', { x1: bx, x2: bx, y1: top, y2: top + 4 * gap, class: 'bar' });
        if (acc === total) el('line', { x1: bx + 4, x2: bx + 4, y1: top, y2: top + 4 * gap, class: 'bar', 'stroke-width': 3 });
      }
    });
    return heads;
  }
  let heads = [];

  const go = $('#museGo'), playBtn = $('#musePlay');
  go.addEventListener('click', () => {
    const M = MOODS[mood];
    composed = compose(M);
    const title = $('#museTitle'), poem = $('#musePoem');
    title.classList.add('fade'); poem.classList.add('fade');
    setTimeout(() => {
      title.textContent = composed.title; poem.textContent = composed.poem;
      title.classList.remove('fade'); poem.classList.remove('fade');
    }, reduceMotion ? 0 : 350);
    $('#museKey').textContent = M.name;
    $('#museTempo').textContent = '♩ = ' + M.tempo;
    $('#museMeter').textContent = M.meter + '/4';
    $('#museTerm').textContent = M.term;
    heads = renderStaff(composed);
    playBtn.disabled = false;
    playMuse();
  });
  playBtn.addEventListener('click', playMuse);

  function playMuse() {
    if (!composed || !Audio.init()) return;
    museTimers.forEach(clearTimeout); museTimers = [];
    const spb = 60 / composed.M.tempo, t0 = Audio.ctx.currentTime + 0.1;
    let acc = 0;
    // 伴奏：每小节一个分解和弦
    for (let b = 0; b < composed.bars; b++) {
      const ch = composed.M.prog[b].map(i => composed.M.root - 12 + i);
      ch.forEach((m, k) => Audio.play(m, t0 + b * composed.beats * spb + k * spb * 0.33, composed.beats * spb * 0.95, 0.45));
    }
    composed.notes.forEach((n, i) => {
      Audio.play(n.midi, t0 + acc * spb, n.dur * spb * 0.92, 0.85);
      museTimers.push(setTimeout(() => {
        heads.forEach(h => h.classList.remove('on'));
        if (heads[i]) heads[i].classList.add('on');
        energy = Math.min(1, energy + 0.2);
      }, (acc * spb + 0.1) * 1000));
      acc += n.dur;
    });
    museTimers.push(setTimeout(() => heads.forEach(h => h.classList.remove('on')), (acc * spb + 0.4) * 1000));
  }

  // 初始：预先渲染一段（不播放）
  composed = compose(MOODS.dawn);
  heads = renderStaff(composed);
  playBtn.disabled = false;
})();
