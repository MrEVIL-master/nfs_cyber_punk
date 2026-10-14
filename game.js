/* ==========================================================
   REDLINE RIVALS — уличные гонки на Three.js
   Файл: game.js
   ========================================================== */
(function () {
  'use strict';

  if (typeof THREE === 'undefined') {
    document.getElementById('load-error').classList.remove('hidden');
    document.getElementById('load-text').textContent = 'Ошибка загрузки';
    return;
  }

  /* ========================================================
     КОНСТАНТЫ И НАСТРОЙКИ
     ======================================================== */
  const ROAD_HALF = 9;          // полуширина проезжей части, м
  const SHOULDER = 3.2;         // ширина тротуара до отбойника, м
  const WALL = ROAD_HALF + SHOULDER;
  const SAMPLE_STEP = 2;        // шаг точек трассы, м
  const SPRINT_START = 70;      // где стоит стартовая линия спринта, м
  const SPRINT_END = 160;       // зона торможения после финиша спринта, м
  const PHYS_STEP = 1 / 120;    // шаг физики, с

  const CAR_COLORS = [
    { hex: '#c8102e', name: 'Красный' },
    { hex: '#f1f1ee', name: 'Белый' },
    { hex: '#15171b', name: 'Чёрный' },
    { hex: '#ffc21a', name: 'Жёлтый' },
    { hex: '#1f5fe0', name: 'Синий' },
    { hex: '#28b45a', name: 'Зелёный' },
    { hex: '#ff6a00', name: 'Оранжевый' },
    { hex: '#7b3cff', name: 'Фиолетовый' },
    { hex: '#8b9299', name: 'Серебро' },
    { hex: '#00b3c6', name: 'Бирюза' }
  ];

  // vmax — м/с, accel — м/с², grip — боковое сцепление м/с², nitro — секунд закиси
  const CARS = [
    {
      id: 'hornet', name: 'Hornet S', cls: 'Хот-хэтч · класс D', price: 0,
      desc: 'Лёгкий и вертлявый хэтчбек. Прощает ошибки и отлично входит в повороты.',
      vmax: 64, accel: 9.6, grip: 21, steer: 1.08, brake: 26, nitro: 4, mass: 0.95,
      color: '#ffc21a', rim: '#b9bfc7',
      dims: { L: 4.05, W: 1.86, clear: 0.2, nose: 0.78, belt: 0.98, deck: 1.02, roof: 1.48, wR: 0.34, wb: 2.55,
        ws: 0.18, roofF: -0.05, roofR: -0.62, rw: -0.88, cabW: 0.84, spoiler: 'lip', type: 'hatch' }
    },
    {
      id: 'kestrel', name: 'Kestrel GT', cls: 'Спорт-купе · класс C', price: 6000,
      desc: 'Сбалансированное купе с задним приводом. Хороший разгон и стабильность на скорости.',
      vmax: 70, accel: 10.6, grip: 21.5, steer: 1.0, brake: 27, nitro: 4.5, mass: 1.05,
      color: '#1f5fe0', rim: '#c9ced6',
      dims: { L: 4.45, W: 1.9, clear: 0.18, nose: 0.72, belt: 0.92, deck: 0.98, roof: 1.32, wR: 0.355, wb: 2.68,
        ws: 0.28, roofF: 0.02, roofR: -0.42, rw: -0.68, cabW: 0.8, spoiler: 'lip', type: 'coupe' }
    },
    {
      id: 'bulldog', name: 'Bulldog V8', cls: 'Маслкар · класс B', price: 14000,
      desc: 'Восемь цилиндров чистой ярости. Бешеный разгон, но в поворотах нужна аккуратность.',
      vmax: 76, accel: 12.6, grip: 18.8, steer: 0.92, brake: 25, nitro: 5, mass: 1.3,
      color: '#15171b', rim: '#c9ced6',
      dims: { L: 4.85, W: 1.96, clear: 0.2, nose: 0.86, belt: 0.98, deck: 1.0, roof: 1.36, wR: 0.375, wb: 2.85,
        ws: 0.2, roofF: -0.05, roofR: -0.45, rw: -0.62, cabW: 0.78, spoiler: 'duck', type: 'muscle' }
    },
    {
      id: 'raptor', name: 'Raptor RS', cls: 'Спорткар · класс A', price: 26000,
      desc: 'Острый руль и цепкая подвеска. Машина для тех, кто тормозит позже всех.',
      vmax: 81, accel: 12.8, grip: 23.5, steer: 1.05, brake: 29, nitro: 5, mass: 1.05,
      color: '#c8102e', rim: '#1d1f24',
      dims: { L: 4.5, W: 1.94, clear: 0.15, nose: 0.66, belt: 0.86, deck: 0.94, roof: 1.25, wR: 0.37, wb: 2.6,
        ws: 0.3, roofF: 0.04, roofR: -0.38, rw: -0.72, cabW: 0.78, spoiler: 'wing', type: 'sports' }
    },
    {
      id: 'phantom', name: 'Phantom X', cls: 'Суперкар · класс S', price: 42000,
      desc: 'Среднемоторный клин с карбоновым днищем. На прямой его почти не догнать.',
      vmax: 87, accel: 14.2, grip: 25, steer: 1.05, brake: 31, nitro: 5.5, mass: 1.1,
      color: '#28b45a', rim: '#1d1f24',
      dims: { L: 4.6, W: 2.0, clear: 0.13, nose: 0.56, belt: 0.82, deck: 0.98, roof: 1.16, wR: 0.375, wb: 2.7,
        ws: 0.42, roofF: 0.12, roofR: -0.22, rw: -0.52, cabW: 0.72, spoiler: 'lip', type: 'super' }
    },
    {
      id: 'valkyrie', name: 'Valkyrie R', cls: 'Гиперкар · класс S+', price: 65000,
      desc: 'Вершина пищевой цепи. Огромный антикрыл, безумная тяга и гоночная прижимная сила.',
      vmax: 94, accel: 15.6, grip: 26.5, steer: 1.1, brake: 33, nitro: 6, mass: 1.1,
      color: '#7b3cff', rim: '#c9a54a',
      dims: { L: 4.75, W: 2.04, clear: 0.12, nose: 0.52, belt: 0.8, deck: 1.0, roof: 1.12, wR: 0.385, wb: 2.76,
        ws: 0.46, roofF: 0.16, roofR: -0.2, rw: -0.5, cabW: 0.7, spoiler: 'wing', type: 'hyper' }
    }
  ];

  const TRACKS = [
    {
      id: 'downtown', name: 'Даунтаун', type: 'circuit', theme: 'city',
      desc: 'Небоскрёбы, широкие проспекты и резкие связки между кварталами.',
      pts: [[0,0],[252,0],[462,-28],[602,56],[658,224],[602,392],[462,448],[336,420],[238,490],[210,644],[84,728],[-112,700],[-238,588],[-280,420],[-392,308],[-420,140],[-308,28],[-154,0]]
    },
    {
      id: 'port', name: 'Портовая зона', type: 'circuit', theme: 'industrial',
      desc: 'Длинная прямая вдоль причала, склады и контейнерные лабиринты.',
      pts: [[0,0],[420,0],[728,14],[896,112],[924,280],[812,378],[644,350],[532,420],[504,588],[350,672],[140,630],[0,532],[-168,560],[-336,476],[-364,280],[-252,126],[-126,28]]
    },
    {
      id: 'highway', name: 'Загородное шоссе', type: 'sprint', theme: 'forest',
      desc: 'Скоростной спринт через сосновый лес. Плавные дуги и максимальные скорости.',
      pts: [[0,0],[0,320],[96,608],[320,800],[608,864],[832,1024],[896,1312],[768,1568],[832,1840],[1088,2000],[1376,1984],[1600,2144],[1664,2432],[1536,2720],[1600,3008],[1840,3168]]
    },
    {
      id: 'cross', name: 'Через весь город', type: 'sprint', theme: 'suburb',
      desc: 'Спринт по городской сетке: прямые кварталы и жёсткие повороты на 90°.',
      pts: [[0,0],[402,0],[483,17],[523,80],[529,379],[552,448],[621,471],[1035,471],[1104,494],[1133,564],[1138,920],[1162,989],[1230,1012],[1667,1012],[1736,989],[1765,920],[1771,598],[1794,529],[1863,506],[2300,506],[2369,529],[2398,598],[2404,874]]
    }
  ];

  const DIFFICULTY = {
    easy:   { name: 'Лёгкая',  skill: 0.83, rubber: 0.55, reward: 0.7 },
    normal: { name: 'Средняя', skill: 0.92, rubber: 0.35, reward: 1.0 },
    hard:   { name: 'Сложная', skill: 0.995, rubber: 0.12, reward: 1.5 }
  };

  const TIMES = {
    day: {
      name: 'День', skyTop: '#4f86cc', skyHor: '#d9d3bf', skyBot: '#b9b19b', fog: '#cdc6b1', fogNear: 160, fogFar: 1700,
      sun: '#fff0d4', sunI: 2.7, sunDir: [0.5, 0.78, 0.36], hemiSky: '#d6e4ff', hemiGround: '#5c5243', hemiI: 0.75,
      exposure: 0.92, night: false, windows: 0.0, lamps: 0.0, smoke: '#d8d6d0', cloud: '#ffffff', cloudA: 0.9
    },
    sunset: {
      name: 'Закат', skyTop: '#2b4677', skyHor: '#ffad66', skyBot: '#8a5a44', fog: '#d39a70', fogNear: 120, fogFar: 1400,
      sun: '#ffb070', sunI: 2.5, sunDir: [0.78, 0.2, -0.5], hemiSky: '#ffd2a8', hemiGround: '#3c2c26', hemiI: 0.6,
      exposure: 1.0, night: false, windows: 0.25, lamps: 0.5, smoke: '#c9a891', cloud: '#ffb98a', cloudA: 0.85
    },
    night: {
      name: 'Ночь', skyTop: '#02040a', skyHor: '#1a2440', skyBot: '#0a0d16', fog: '#0f1526', fogNear: 60, fogFar: 900,
      sun: '#8ea4ff', sunI: 0.45, sunDir: [-0.35, 0.8, 0.45], hemiSky: '#3b4c80', hemiGround: '#0b0b12', hemiI: 0.42,
      exposure: 1.15, night: true, windows: 1.0, lamps: 1.0, smoke: '#7a808c', cloud: '#26304a', cloudA: 0.5
    }
  };

  const RIVAL_NAMES = ['Шторм', 'Кобра', 'Барон', 'Тень', 'Вольт', 'Ястреб', 'Нео', 'Призрак', 'Феникс', 'Гром', 'Скат', 'Джокер'];

  /* ========================================================
     УТИЛИТЫ
     ======================================================== */
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const smooth = (t) => t * t * (3 - 2 * t);
  const wrapAngle = (a) => {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  };
  const col = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  const kmh = (ms) => Math.round(Math.abs(ms) * 3.6);

  function fmtTime(sec) {
    if (sec == null || !isFinite(sec)) return '—';
    const m = Math.floor(sec / 60);
    const s = sec - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
  }
  function fmtMoney(v) {
    return '$' + Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  // детерминированный генератор случайных чисел для декораций
  function makeRng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  const carById = (id) => CARS.find((c) => c.id === id) || CARS[0];
  const trackById = (id) => TRACKS.find((t) => t.id === id) || TRACKS[0];

  /* ========================================================
     СОХРАНЕНИЕ В LOCALSTORAGE
     ======================================================== */
  const SAVE_KEY = 'redline_rivals_save_v1';

  const Save = {
    data: null,
    defaults() {
      return {
        name: 'Игрок',
        money: 2000,
        owned: ['hornet'],
        car: 'hornet',
        colors: {},
        records: {},
        stats: { races: 0, wins: 0, podiums: 0, earned: 0, distance: 0 },
        settings: { volume: 70, quality: 'high', camera: 0, grade: 'on' },
        setup: { type: 'circuit', track: 'downtown', laps: 3, opponents: 5, difficulty: 'normal', time: 'sunset' }
      };
    },
    merge(def, src) {
      if (!src || typeof src !== 'object' || Array.isArray(src)) return def;
      const out = {};
      for (const k in def) {
        const dv = def[k];
        const sv = src[k];
        if (sv === undefined || sv === null) out[k] = dv;
        else if (dv && typeof dv === 'object' && !Array.isArray(dv) && Object.keys(dv).length) out[k] = this.merge(dv, sv);
        else if (Array.isArray(dv)) out[k] = Array.isArray(sv) ? sv : dv;
        else if (typeof dv === typeof sv || (dv && typeof dv === 'object')) out[k] = sv;
        else out[k] = dv;
      }
      return out;
    },
    load() {
      let raw = null;
      try { raw = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { raw = null; }
      this.data = this.merge(this.defaults(), raw);
      const d = this.data;
      d.owned = d.owned.filter((id) => CARS.some((c) => c.id === id));
      if (!d.owned.includes('hornet')) d.owned.unshift('hornet');
      if (!d.owned.includes(d.car)) d.car = d.owned[0];
      if (!TRACKS.some((t) => t.id === d.setup.track)) d.setup.track = TRACKS[0].id;
      if (!DIFFICULTY[d.setup.difficulty]) d.setup.difficulty = 'normal';
      if (!TIMES[d.setup.time]) d.setup.time = 'sunset';
      if (!['low', 'medium', 'high'].includes(d.settings.quality)) d.settings.quality = 'high';
      d.setup.laps = clamp(parseInt(d.setup.laps, 10) || 3, 1, 5);
      d.setup.opponents = clamp(parseInt(d.setup.opponents, 10) || 5, 1, 7);
      d.settings.camera = clamp(parseInt(d.settings.camera, 10) || 0, 0, 2);
      d.money = Math.max(0, Number(d.money) || 0);
      return d;
    },
    write() {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) { /* хранилище недоступно */ }
    },
    reset() {
      try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
      this.data = this.defaults();
      this.write();
    },
    carColor(id) {
      return this.data.colors[id] || carById(id).color;
    },
    record(trackId) {
      if (!this.data.records[trackId]) this.data.records[trackId] = { bestLap: null, bestTime: {}, wins: 0, races: 0 };
      return this.data.records[trackId];
    }
  };

  /* ========================================================
     ЗВУК (синтез через Web Audio API, без файлов)
     ======================================================== */
  const SFX = {
    ctx: null,
    master: null,
    noise: null,
    curve: null,
    race: null,

    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC(); } catch (e) { this.ctx = null; return; }
      const c = this.ctx;
      this.master = c.createGain();
      this.master.gain.value = Save.data.settings.volume / 100;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.connect(comp).connect(c.destination);
      // буфер белого шума
      const len = c.sampleRate * 2;
      this.noise = c.createBuffer(1, len, c.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      // кривая лёгкого перегруза для мотора
      const n = 256;
      this.curve = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1;
        this.curve[i] = Math.tanh(x * 2.2);
      }
    },
    resume() {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    suspend() {
      if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
    },
    setVolume(v) {
      if (this.master) this.master.gain.setTargetAtTime(v / 100, this.ctx.currentTime, 0.05);
    },
    set(param, value, tc) {
      param.setTargetAtTime(value, this.ctx.currentTime, tc || 0.04);
    },

    makeEngine(level) {
      const c = this.ctx;
      const out = c.createGain();
      out.gain.value = 0;
      const pan = c.createStereoPanner ? c.createStereoPanner() : null;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 600;
      filter.Q.value = 3;
      const shaper = c.createWaveShaper();
      shaper.curve = this.curve;
      const o1 = c.createOscillator(); o1.type = 'sawtooth';
      const o2 = c.createOscillator(); o2.type = 'sawtooth'; o2.detune.value = 9;
      const o3 = c.createOscillator(); o3.type = 'square';
      const g1 = c.createGain(); g1.gain.value = 0.5;
      const g2 = c.createGain(); g2.gain.value = 0.25;
      const g3 = c.createGain(); g3.gain.value = 0.35;
      o1.connect(g1).connect(filter);
      o2.connect(g2).connect(filter);
      o3.connect(g3).connect(filter);
      filter.connect(shaper);
      if (pan) { shaper.connect(pan).connect(out); } else { shaper.connect(out); }
      out.connect(this.master);
      o1.start(); o2.start(); o3.start();
      const self = this;
      return {
        update(rpm, load, vol, panV) {
          const f = 18 + (rpm / 60) * 2.1;
          self.set(o1.frequency, f, 0.03);
          self.set(o2.frequency, f * 2, 0.03);
          self.set(o3.frequency, f * 0.5, 0.03);
          self.set(filter.frequency, 260 + rpm * 0.16 + load * 1300, 0.05);
          self.set(out.gain, vol * level * (0.45 + 0.55 * load), 0.06);
          if (pan && panV !== undefined) self.set(pan.pan, clamp(panV, -1, 1), 0.1);
        },
        stop() {
          try {
            out.gain.setTargetAtTime(0, c.currentTime, 0.05);
            o1.stop(c.currentTime + 0.3); o2.stop(c.currentTime + 0.3); o3.stop(c.currentTime + 0.3);
            setTimeout(() => out.disconnect(), 500);
          } catch (e) { /* ignore */ }
        }
      };
    },

    makeNoise(type, freq, q) {
      const c = this.ctx;
      const src = c.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const filter = c.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = q;
      const gain = c.createGain();
      gain.gain.value = 0;
      src.connect(filter).connect(gain).connect(this.master);
      src.start();
      return { src, filter, gain };
    },

    startRace(aiCount) {
      if (!this.ctx) return;
      this.stopRace();
      const c = this.ctx;
      const r = {};
      r.engine = this.makeEngine(0.32);
      r.ai = [];
      for (let i = 0; i < aiCount; i++) r.ai.push(this.makeEngine(0.22));
      r.wind = this.makeNoise('lowpass', 500, 0.5);
      r.squeal = this.makeNoise('bandpass', 1500, 7);
      r.nitro = this.makeNoise('bandpass', 2600, 1.2);
      // тональная часть визга шин
      const sq = c.createOscillator();
      sq.type = 'triangle';
      sq.frequency.value = 820;
      const sqg = c.createGain();
      sqg.gain.value = 0;
      sq.connect(sqg).connect(this.master);
      sq.start();
      r.sqOsc = sq; r.sqGain = sqg;
      this.race = r;
    },

    updateRace(p) {
      const r = this.race;
      if (!r) return;
      r.engine.update(p.rpm, p.load, 1, 0);
      this.set(r.wind.gain.gain, Math.min(0.35, p.speed * p.speed * 0.00005));
      this.set(r.wind.filter.frequency, 300 + p.speed * 18);
      const sq = clamp(p.slip, 0, 1);
      this.set(r.squeal.gain.gain, sq * 0.22, 0.05);
      this.set(r.sqGain.gain, sq * 0.035, 0.05);
      this.set(r.sqOsc.frequency, 760 + Math.sin(performance.now() * 0.02) * 40 + p.speed * 2, 0.05);
      this.set(r.nitro.gain.gain, p.nitro ? 0.28 : 0, 0.08);
      for (let i = 0; i < r.ai.length; i++) {
        const a = p.ai[i];
        if (a) r.ai[i].update(a.rpm, a.load, a.vol, a.pan);
      }
    },

    stopRace() {
      const r = this.race;
      if (!r) return;
      r.engine.stop();
      r.ai.forEach((e) => e.stop());
      [r.wind, r.squeal, r.nitro].forEach((n) => {
        try { n.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05); n.src.stop(this.ctx.currentTime + 0.3); } catch (e) { /* ignore */ }
      });
      try { r.sqOsc.stop(this.ctx.currentTime + 0.3); } catch (e) { /* ignore */ }
      this.race = null;
    },

    beep(freq, dur, vol, type) {
      if (!this.ctx) return;
      const c = this.ctx;
      const o = c.createOscillator();
      o.type = type || 'square';
      o.frequency.value = freq;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(vol || 0.2, c.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g).connect(this.master);
      o.start();
      o.stop(c.currentTime + dur + 0.05);
    },

    crash(strength) {
      if (!this.ctx) return;
      const c = this.ctx;
      const s = clamp(strength, 0.05, 1);
      const src = c.createBufferSource();
      src.buffer = this.noise;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 500 + s * 1800;
      const g = c.createGain();
      g.gain.setValueAtTime(0.5 * s, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18 + s * 0.35);
      src.connect(f).connect(g).connect(this.master);
      src.start(c.currentTime, Math.random());
      src.stop(c.currentTime + 0.6);
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(120, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.25);
      const og = c.createGain();
      og.gain.setValueAtTime(0.6 * s, c.currentTime);
      og.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
      o.connect(og).connect(this.master);
      o.start();
      o.stop(c.currentTime + 0.35);
    },

    shift() {
      if (!this.ctx) return;
      const c = this.ctx;
      const src = c.createBufferSource();
      src.buffer = this.noise;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1800;
      f.Q.value = 2;
      const g = c.createGain();
      g.gain.setValueAtTime(0.12, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
      src.connect(f).connect(g).connect(this.master);
      src.start(c.currentTime, Math.random());
      src.stop(c.currentTime + 0.15);
    },

    click() { this.beep(1400, 0.05, 0.06, 'triangle'); }
  };

  /* ========================================================
     ПРОЦЕДУРНЫЕ ТЕКСТУРЫ (рисуются на canvas, без картинок)
     ======================================================== */
  let renderer = null;

  const Tex = {
    cache: {},
    get(name) {
      if (!this.cache[name]) {
        const t = this.build[name]();
        t.userData.keep = true;
        this.cache[name] = t;
      }
      return this.cache[name];
    },
    make(w, h, draw, opts) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d');
      draw(g, w, h);
      const t = new THREE.CanvasTexture(c);
      t.userData = {};
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      if (!opts || opts.srgb !== false) t.encoding = THREE.sRGBEncoding;
      t.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
      return t;
    },
    noise(g, w, h, count, lo, hi, alpha, size) {
      for (let i = 0; i < count; i++) {
        const v = randInt(lo, hi);
        g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (alpha * Math.random()).toFixed(3) + ')';
        const s = size * (0.5 + Math.random());
        g.fillRect(Math.random() * w, Math.random() * h, s, s);
      }
    },
    build: {}
  };

  // Асфальт с разметкой: ширина 18 м → 512 px, длина тайла 16 м → 1024 px
  Tex.build.road = () => Tex.make(512, 1024, (g, w, h) => {
    g.fillStyle = '#3a3c40';
    g.fillRect(0, 0, w, h);
    Tex.noise(g, w, h, 42000, 20, 95, 0.55, 1.4);
    // заплатки
    for (let i = 0; i < 7; i++) {
      g.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '20,21,24' : '80,80,84') + ',' + rand(0.08, 0.18) + ')';
      g.fillRect(rand(0, w), rand(0, h), rand(30, 140), rand(40, 220));
    }
    // накатанные колеи
    const ppm = w / 18;
    [2.25, 6.75, 11.25, 15.75].forEach((lane) => {
      [-0.85, 0.85].forEach((o) => {
        const x = (lane + o) * ppm;
        const gr = g.createLinearGradient(x - 14, 0, x + 14, 0);
        gr.addColorStop(0, 'rgba(10,10,12,0)');
        gr.addColorStop(0.5, 'rgba(10,10,12,0.22)');
        gr.addColorStop(1, 'rgba(10,10,12,0)');
        g.fillStyle = gr;
        g.fillRect(x - 14, 0, 28, h);
      });
    });
    // трещины
    g.strokeStyle = 'rgba(12,12,14,0.55)';
    g.lineWidth = 1.2;
    for (let i = 0; i < 9; i++) {
      let x = rand(0, w), y = rand(0, h);
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 8; k++) { x += rand(-14, 14); y += rand(-24, 24); g.lineTo(x, y); }
      g.stroke();
    }
    // разметка
    const vpm = h / 16;
    const line = (x, wpx, color, dash) => {
      g.fillStyle = color;
      if (!dash) g.fillRect(x - wpx / 2, 0, wpx, h);
      else for (let y = 0; y < h; y += 8 * vpm) g.fillRect(x - wpx / 2, y + vpm, wpx, 3 * vpm);
    };
    line(0.45 * ppm, 5, 'rgba(235,235,228,0.9)', false);
    line(w - 0.45 * ppm, 5, 'rgba(235,235,228,0.9)', false);
    line(4.5 * ppm, 4, 'rgba(235,235,228,0.85)', true);
    line(w - 4.5 * ppm, 4, 'rgba(235,235,228,0.85)', true);
    line(w / 2 - 5, 3.5, 'rgba(230,178,40,0.9)', false);
    line(w / 2 + 5, 3.5, 'rgba(230,178,40,0.9)', false);
    // потёртости разметки
    Tex.noise(g, w, h, 9000, 40, 70, 0.6, 1.6);
  });

  // Тротуарная плитка: 3.2 м × 4 м
  Tex.build.sidewalk = () => Tex.make(256, 256, (g, w, h) => {
    g.fillStyle = '#8f8c86';
    g.fillRect(0, 0, w, h);
    Tex.noise(g, w, h, 9000, 90, 170, 0.35, 1.5);
    g.strokeStyle = 'rgba(40,40,40,0.45)';
    g.lineWidth = 2;
    for (let y = 0; y <= h; y += h / 4) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let x = 0; x <= w; x += w / 3) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    // бордюр
    g.fillStyle = '#c9c6bf';
    g.fillRect(0, 0, 14, h);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(14, 0, 3, h);
  });

  Tex.build.concrete = () => Tex.make(256, 256, (g, w, h) => {
    g.fillStyle = '#a9a7a0';
    g.fillRect(0, 0, w, h);
    Tex.noise(g, w, h, 14000, 90, 190, 0.3, 1.6);
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, 'rgba(40,36,30,0.45)');
    gr.addColorStop(0.25, 'rgba(40,36,30,0)');
    gr.addColorStop(0.75, 'rgba(40,36,30,0)');
    gr.addColorStop(1, 'rgba(40,36,30,0.45)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(30,30,30,0.6)';
    g.fillRect(0, 0, w, 3);
    // светоотражающая полоса
    g.fillStyle = 'rgba(230,190,40,0.85)';
    g.fillRect(w * 0.47, 0, w * 0.06, h);
  });

  Tex.build.grass = () => Tex.make(256, 256, (g, w, h) => {
    g.fillStyle = '#4b6a2c';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26000; i++) {
      const r = randInt(40, 110), gg = randInt(80, 140), b = randInt(20, 60);
      g.fillStyle = 'rgba(' + r + ',' + gg + ',' + b + ',' + rand(0.2, 0.7).toFixed(2) + ')';
      g.fillRect(Math.random() * w, Math.random() * h, rand(1, 3), rand(1, 4));
    }
    for (let i = 0; i < 12; i++) {
      g.fillStyle = 'rgba(110,90,50,' + rand(0.06, 0.16) + ')';
      g.beginPath();
      g.arc(rand(0, w), rand(0, h), rand(10, 40), 0, Math.PI * 2);
      g.fill();
    }
  });

  Tex.build.pavement = () => Tex.make(256, 256, (g, w, h) => {
    g.fillStyle = '#55565a';
    g.fillRect(0, 0, w, h);
    Tex.noise(g, w, h, 16000, 40, 120, 0.4, 1.5);
    g.strokeStyle = 'rgba(25,25,28,0.5)';
    g.lineWidth = 2;
    for (let y = 0; y <= h; y += h / 2) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let x = 0; x <= w; x += w / 2) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let i = 0; i < 6; i++) {
      g.fillStyle = 'rgba(15,15,15,' + rand(0.05, 0.15) + ')';
      g.beginPath();
      g.arc(rand(0, w), rand(0, h), rand(8, 30), 0, Math.PI * 2);
      g.fill();
    }
  });

  // Фасады: обычная карта + карта светящихся окон
  function facadeTextures(style) {
    const cols = 4, rows = 4;
    const lit = [];
    for (let i = 0; i < cols * rows; i++) lit.push(Math.random() < 0.45 ? rand(0.5, 1) : 0);
    const cfg = {
      glass: { wall: '#5b6672', win: ['#2c3c50', '#3f5770', '#24303e'], frame: '#9aa5b0', mx: 0.08, my: 0.12 },
      brick: { wall: '#7a4a38', win: ['#232a33', '#2e3846', '#1d232b'], frame: '#d8cfc0', mx: 0.26, my: 0.3 },
      panel: { wall: '#9c978c', win: ['#2a3038', '#363e48', '#20252c'], frame: '#c4bfb2', mx: 0.22, my: 0.3 },
      warehouse: { wall: '#8a8f94', win: ['#30363c', '#3a4148'], frame: '#6a6f74', mx: 0.1, my: 0.62 },
      house: { wall: '#d9d0bd', win: ['#28303a', '#323c48'], frame: '#f5f1e8', mx: 0.3, my: 0.34 }
    }[style];
    const drawWindows = (g, w, h, emissive) => {
      const cw = w / cols, ch = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * cw + cw * cfg.mx / 2, y = r * ch + ch * cfg.my / 2;
          const ww = cw * (1 - cfg.mx), wh = ch * (1 - cfg.my);
          const l = lit[r * cols + c];
          if (emissive) {
            if (l > 0) {
              const warm = Math.random() < 0.7;
              g.fillStyle = warm ? 'rgba(255,214,140,' + l + ')' : 'rgba(170,210,255,' + l + ')';
              g.fillRect(x, y, ww, wh);
            }
          } else {
            g.fillStyle = cfg.frame;
            g.fillRect(x - 2, y - 2, ww + 4, wh + 4);
            const gr = g.createLinearGradient(x, y, x + ww, y + wh);
            gr.addColorStop(0, pick(cfg.win));
            gr.addColorStop(1, pick(cfg.win));
            g.fillStyle = gr;
            g.fillRect(x, y, ww, wh);
            g.fillStyle = 'rgba(255,255,255,0.08)';
            g.fillRect(x, y, ww * 0.45, wh);
          }
        }
      }
    };
    const map = Tex.make(256, 256, (g, w, h) => {
      g.fillStyle = cfg.wall;
      g.fillRect(0, 0, w, h);
      Tex.noise(g, w, h, 6000, 60, 160, 0.25, 1.5);
      if (style === 'brick') {
        g.strokeStyle = 'rgba(40,20,15,0.35)';
        g.lineWidth = 1;
        for (let y = 0; y < h; y += 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      }
      if (style === 'warehouse') {
        for (let x = 0; x < w; x += 8) {
          g.fillStyle = 'rgba(0,0,0,0.12)';
          g.fillRect(x, 0, 3, h);
        }
      }
      drawWindows(g, w, h, false);
    });
    const em = Tex.make(256, 256, (g, w, h) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, w, h);
      drawWindows(g, w, h, true);
    });
    return { map, em };
  }
  ['glass', 'brick', 'panel', 'warehouse', 'house'].forEach((s) => {
    Tex.build['facade_' + s] = () => {
      const f = facadeTextures(s);
      f.em.userData.keep = true;
      Tex.cache['facadeEm_' + s] = f.em;
      return f.map;
    };
  });
  Tex.facade = (s) => ({ map: Tex.get('facade_' + s), em: Tex.cache['facadeEm_' + s] });

  Tex.build.roof = () => Tex.make(128, 128, (g, w, h) => {
    g.fillStyle = '#3d3e40';
    g.fillRect(0, 0, w, h);
    Tex.noise(g, w, h, 5000, 30, 110, 0.5, 1.4);
  });

  Tex.build.chevron = () => Tex.make(256, 128, (g, w, h) => {
    g.fillStyle = '#ffd21a';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#111';
    for (let i = 0; i < 3; i++) {
      const x = 30 + i * 70;
      g.beginPath();
      g.moveTo(x, 14); g.lineTo(x + 40, h / 2); g.lineTo(x, h - 14);
      g.lineTo(x + 22, h - 14); g.lineTo(x + 62, h / 2); g.lineTo(x + 22, 14);
      g.closePath();
      g.fill();
    }
    g.strokeStyle = '#111';
    g.lineWidth = 8;
    g.strokeRect(4, 4, w - 8, h - 8);
  });

  Tex.build.checker = () => Tex.make(288, 32, (g, w, h) => {
    for (let x = 0; x < 18; x++) {
      for (let y = 0; y < 2; y++) {
        g.fillStyle = (x + y) % 2 ? '#111' : '#eee';
        g.fillRect(x * 16, y * 16, 16, 16);
      }
    }
  });

  Tex.banner = (text) => Tex.make(1024, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#16181d');
    gr.addColorStop(1, '#07080a');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffc21a';
    g.fillRect(0, 0, w, 8);
    g.fillRect(0, h - 8, w, 8);
    g.font = 'italic 900 70px "Exo 2", "Arial Black", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    g.fillText(text, w / 2, h / 2 + 4);
  });

  const AD_TEXTS = [
    ['NITRO X', 'Энергия скорости', '#ff3b30', '#111'],
    ['ТУРБО ШИНЫ', 'Держат дорогу в любую погоду', '#1f5fe0', '#fff'],
    ['REDLINE', 'Уличная лига 2026', '#ffc21a', '#111'],
    ['АВТОМОЙКА 24/7', 'Блеск за 15 минут', '#28b45a', '#fff'],
    ['МАСЛО VORTEX', 'Для моторов на пределе', '#111', '#ffc21a']
  ];
  AD_TEXTS.forEach((ad, i) => {
    Tex.build['ad' + i] = () => Tex.make(512, 256, (g, w, h) => {
      g.fillStyle = ad[2];
      g.fillRect(0, 0, w, h);
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, 'rgba(255,255,255,0.18)');
      gr.addColorStop(1, 'rgba(0,0,0,0.25)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.fillStyle = ad[3];
      g.textAlign = 'center';
      g.font = 'italic 900 78px "Exo 2", "Arial Black", sans-serif';
      g.fillText(ad[0], w / 2, 128);
      g.font = '600 28px "Exo 2", Arial, sans-serif';
      g.fillText(ad[1], w / 2, 190);
    });
  });

  Tex.build.soft = () => Tex.make(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.25, 'rgba(255,255,255,0.65)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  }, { srgb: false });

  Tex.build.smoke = () => Tex.make(64, 64, (g, w, h) => {
    for (let i = 0; i < 10; i++) {
      const x = w / 2 + rand(-8, 8), y = h / 2 + rand(-8, 8), r = rand(10, 24);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.35)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    }
  }, { srgb: false });

  Tex.build.cloud = () => Tex.make(256, 128, (g, w, h) => {
    for (let i = 0; i < 26; i++) {
      const x = rand(w * 0.18, w * 0.82), y = rand(h * 0.35, h * 0.7), r = rand(18, 46);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.55)');
      gr.addColorStop(0.6, 'rgba(255,255,255,0.25)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    }
  });

  Tex.build.container = () => Tex.make(128, 64, (g, w, h) => {
    g.fillStyle = '#d8d8d8';
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 6) {
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.fillRect(x, 0, 2, h);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(x + 3, 0, 1, h);
    }
    g.fillStyle = 'rgba(60,30,10,0.25)';
    g.fillRect(0, h - 6, w, 6);
    Tex.noise(g, w, h, 1500, 60, 120, 0.25, 1.3);
  });

  Tex.build.plate = () => Tex.make(128, 32, (g, w, h) => {
    g.fillStyle = '#f2f2ee';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#222';
    g.lineWidth = 2;
    g.strokeRect(1, 1, w - 2, h - 2);
    g.fillStyle = '#16181c';
    g.font = 'bold 22px Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('RR 777', w / 2, h / 2 + 1);
  });

  Tex.build.skid = () => Tex.make(32, 32, (g, w, h) => {
    g.fillStyle = '#fff';
    g.fillRect(0, 0, w, h);
  }, { srgb: false });

  Tex.build.studioFloor = () => Tex.make(512, 512, (g, w, h) => {
    g.fillStyle = '#16191e';
    g.fillRect(0, 0, w, h);
    Tex.noise(g, w, h, 12000, 10, 60, 0.4, 1.4);
    g.strokeStyle = 'rgba(255,255,255,0.05)';
    g.lineWidth = 2;
    for (let i = 0; i <= w; i += 64) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke();
    }
  });

  /* ========================================================
     НЕБО, ОКРУЖЕНИЕ И ОТРАЖЕНИЯ
     ======================================================== */
  function makeSky(preset) {
    const sunDir = new THREE.Vector3().fromArray(preset.sunDir).normalize();
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        top: { value: col(preset.skyTop) },
        hor: { value: col(preset.skyHor) },
        bot: { value: col(preset.skyBot) },
        sunDir: { value: sunDir },
        sunCol: { value: col(preset.sun) },
        night: { value: preset.night ? 1 : 0 }
      },
      vertexShader: [
        'varying vec3 vDir;',
        'void main() {',
        '  vDir = normalize(position);',
        '  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '  gl_Position = p.xyww;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 top; uniform vec3 hor; uniform vec3 bot; uniform vec3 sunDir; uniform vec3 sunCol; uniform float night;',
        'varying vec3 vDir;',
        'void main() {',
        '  vec3 d = normalize(vDir);',
        '  float h = d.y;',
        '  vec3 c = h > 0.0 ? mix(hor, top, pow(clamp(h, 0.0, 1.0), 0.5)) : mix(hor, bot, pow(clamp(-h, 0.0, 1.0), 0.35));',
        '  float sd = max(dot(d, sunDir), 0.0);',
        '  float disc = night > 0.5 ? pow(sd, 2400.0) * 3.0 : pow(sd, 1100.0) * 9.0;',
        '  c += sunCol * (disc + pow(sd, 14.0) * 0.35 * (1.0 - night * 0.8) + pow(sd, 3.0) * 0.12 * (1.0 - night));',
        '  gl_FragColor = vec4(c, 1.0);',
        '  #include <tonemapping_fragment>',
        '  #include <encodings_fragment>',
        '}'
      ].join('\n'),
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = -10;
    return mesh;
  }

  function makeStars() {
    const n = 1400;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * Math.PI * 2;
      const v = rand(0.06, 1);
      const r = 2800;
      const y = v * r, rr = Math.sqrt(r * r - y * y);
      pos[i * 3] = Math.cos(u) * rr;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(u) * rr;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 });
    const p = new THREE.Points(geo, mat);
    p.frustumCulled = false;
    return p;
  }

  // Карта отражений для краски: рендерим маленькую «сферу неба» в PMREM
  function makeEnvMap(preset, studio) {
    const envScene = new THREE.Scene();
    const geo = new THREE.SphereGeometry(50, 48, 24);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const top = col(studio ? '#1a1d22' : preset.skyTop);
    const hor = col(studio ? '#3a3f47' : preset.skyHor);
    const bot = col(studio ? '#08090b' : preset.skyBot);
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = pos.getY(i) / 50;
      if (t > 0) tmp.copy(hor).lerp(top, Math.pow(t, 0.5));
      else tmp.copy(hor).lerp(bot, Math.pow(-t, 0.35));
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
    envScene.add(new THREE.Mesh(geo, skyMat));
    const disposables = [geo, skyMat];

    if (studio) {
      // софтбоксы студии
      const panelMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 5, 5.2), side: THREE.DoubleSide });
      const pg = new THREE.PlaneGeometry(30, 8);
      disposables.push(panelMat, pg);
      [[0, 40, 0, -Math.PI / 2, 0], [36, 18, 0, 0, -Math.PI / 2], [-36, 18, 0, 0, Math.PI / 2], [0, 18, 36, 0, Math.PI]].forEach((p) => {
        const m = new THREE.Mesh(pg, panelMat);
        m.position.set(p[0], p[1], p[2]);
        m.rotation.set(p[3], p[4], 0);
        envScene.add(m);
      });
      const warm = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.6, 0.4), side: THREE.DoubleSide });
      disposables.push(warm);
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(60, 1.2), warm);
      disposables.push(strip.geometry);
      strip.position.set(0, 4, -40);
      envScene.add(strip);
    } else {
      const sd = new THREE.Vector3().fromArray(preset.sunDir).normalize();
      const sunMat = new THREE.MeshBasicMaterial({ color: col(preset.sun).multiplyScalar(preset.night ? 2 : 22) });
      const sunGeo = new THREE.SphereGeometry(preset.night ? 1.5 : 3, 16, 8);
      disposables.push(sunMat, sunGeo);
      const sun = new THREE.Mesh(sunGeo, sunMat);
      sun.position.copy(sd).multiplyScalar(44);
      envScene.add(sun);
      // силуэты на горизонте — дают реалистичные «разрывы» в отражениях
      const bMat = new THREE.MeshBasicMaterial({ color: col(preset.night ? '#05070c' : '#2f3236') });
      const bGeo = new THREE.BoxGeometry(1, 1, 1);
      disposables.push(bMat, bGeo);
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2 + rand(-0.05, 0.05);
        const b = new THREE.Mesh(bGeo, bMat);
        const hgt = rand(2, 12);
        b.scale.set(rand(3, 9), hgt, 3);
        b.position.set(Math.cos(a) * 40, hgt / 2 - 1, Math.sin(a) * 40);
        b.lookAt(0, b.position.y, 0);
        envScene.add(b);
      }
      if (preset.night) {
        const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 1.2) });
        const lg = new THREE.SphereGeometry(0.4, 8, 6);
        disposables.push(lampMat, lg);
        for (let i = 0; i < 24; i++) {
          const a = Math.random() * Math.PI * 2;
          const m = new THREE.Mesh(lg, lampMat);
          m.position.set(Math.cos(a) * 38, rand(3, 8), Math.sin(a) * 38);
          envScene.add(m);
        }
      }
    }
    const pm = new THREE.PMREMGenerator(renderer);
    const rt = pm.fromScene(envScene, 0.02);
    pm.dispose();
    disposables.forEach((d) => d.dispose());
    return rt;
  }

  // Освобождение ресурсов сцены (кешированные текстуры не трогаем)
  function disposeObject(root) {
    const mats = new Set();
    const geos = new Set();
    root.traverse((o) => {
      if (o.geometry) geos.add(o.geometry);
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.add(m));
    });
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => {
      ['map', 'emissiveMap', 'roughnessMap', 'normalMap', 'alphaMap'].forEach((k) => {
        if (m[k] && !(m[k].userData && m[k].userData.keep)) m[k].dispose();
      });
      const um = m.uniforms && m.uniforms.map && m.uniforms.map.value;
      if (um && !(um.userData && um.userData.keep)) um.dispose();
      m.dispose();
    });
  }

  /* ========================================================
     3D-МОДЕЛИ МАШИН (собираются из примитивов и экструзий)
     ======================================================== */
  // Лофт: соединяет кольца точек в гладкую поверхность (с группами материалов)
  function loftGeometry(rings, closedRing, matOf, caps) {
    const n = rings.length, m = rings[0].length;
    const pos = [];
    rings.forEach((r) => r.forEach((p) => pos.push(p[0], p[1], p[2])));
    const groups = {};
    const push = (mi, a, b, c) => { (groups[mi] = groups[mi] || []).push(a, b, c); };
    const segs = closedRing ? m : m - 1;
    for (let k = 0; k < n - 1; k++) {
      for (let j = 0; j < segs; j++) {
        const j2 = (j + 1) % m;
        const a = k * m + j, b = k * m + j2, c = (k + 1) * m + j, e = (k + 1) * m + j2;
        const mi = matOf ? matOf(k, j) : 0;
        push(mi, a, c, b);
        push(mi, b, c, e);
      }
    }
    if (caps) {
      [[0, false], [n - 1, true]].forEach(([k, front]) => {
        let cx = 0, cy = 0, cz = 0;
        rings[k].forEach((p) => { cx += p[0]; cy += p[1]; cz += p[2]; });
        const ci = pos.length / 3;
        pos.push(cx / m, cy / m, cz / m);
        for (let j = 0; j < m; j++) {
          const j2 = (j + 1) % m;
          if (front) push(0, ci, k * m + j2, k * m + j);
          else push(0, ci, k * m + j, k * m + j2);
        }
      });
    }
    const index = [];
    const geo = new THREE.BufferGeometry();
    Object.keys(groups).map(Number).sort((x, y) => x - y).forEach((mi) => {
      geo.addGroup(index.length, groups[mi].length, mi);
      for (const v of groups[mi]) index.push(v);
    });
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(index);
    geo.computeVertexNormals();
    return geo;
  }

  function makeWheel(R, tw, side, mats) {
    const pivot = new THREE.Group();
    const spin = new THREE.Group();
    pivot.add(spin);
    const hw = tw / 2;
    const prof = [
      [R * 0.66, -hw], [R * 0.92, -hw], [R * 0.985, -hw + 0.03], [R, -hw + 0.07],
      [R, hw - 0.07], [R * 0.985, hw - 0.03], [R * 0.92, hw], [R * 0.66, hw]
    ].map((p) => new THREE.Vector2(p[0], p[1]));
    const tire = new THREE.Mesh(new THREE.LatheGeometry(prof, 30), mats.tire);
    tire.rotation.z = Math.PI / 2;
    spin.add(tire);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.67, R * 0.67, tw * 0.9, 24, 1, true), mats.barrel);
    barrel.rotation.z = Math.PI / 2;
    spin.add(barrel);

    const back = new THREE.Mesh(new THREE.CircleGeometry(R * 0.66, 24), mats.barrel);
    back.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    back.position.x = side * (hw - 0.22);
    spin.add(back);

    const disc = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.5, R * 0.5, 0.03, 24), mats.disc);
    disc.rotation.z = Math.PI / 2;
    disc.position.x = side * (hw - 0.16);
    spin.add(disc);

    const lip = new THREE.Mesh(new THREE.TorusGeometry(R * 0.64, 0.028, 8, 30), mats.rim);
    lip.rotation.y = Math.PI / 2;
    lip.position.x = side * (hw - 0.05);
    spin.add(lip);

    const spokeGeo = new THREE.BoxGeometry(0.035, R * 0.62, 0.08);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const sp = new THREE.Mesh(spokeGeo, mats.rim);
      sp.position.set(side * (hw - 0.07), Math.cos(a) * R * 0.33, Math.sin(a) * R * 0.33);
      sp.rotation.x = a;
      spin.add(sp);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.13, R * 0.13, 0.07, 14), mats.chrome);
    hub.rotation.z = Math.PI / 2;
    hub.position.x = side * (hw - 0.05);
    spin.add(hub);

    const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.07, R * 0.36, R * 0.24), mats.caliper);
    caliper.position.set(side * (hw - 0.12), R * 0.26, -R * 0.24);
    caliper.rotation.x = -0.6;
    pivot.add(caliper);
    return { pivot, spin };
  }

  function buildCarModel(spec, colorHex) {
    const d = spec.dims;
    const L = d.L, W = d.W, hl = L / 2;
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);

    const paint = new THREE.MeshPhysicalMaterial({
      color: col(colorHex), metalness: 0.45, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.3
    });
    const dark = new THREE.MeshStandardMaterial({ color: col('#141518'), roughness: 0.5, metalness: 0.35 });
    const black = new THREE.MeshStandardMaterial({ color: col('#060607'), roughness: 0.85 });
    const glass = new THREE.MeshPhysicalMaterial({ color: col('#0a0f15'), metalness: 0.25, roughness: 0.03, clearcoat: 1, envMapIntensity: 1.8 });
    const chrome = new THREE.MeshStandardMaterial({ color: col('#dfe3e8'), metalness: 1, roughness: 0.12 });
    const headMat = new THREE.MeshStandardMaterial({ color: col('#dfe8f2'), emissive: col('#fff3dc'), emissiveIntensity: 0.3, metalness: 0.5, roughness: 0.08 });
    const tailMat = new THREE.MeshStandardMaterial({ color: col('#3a0505'), emissive: col('#ff1212'), emissiveIntensity: 0.5, roughness: 0.2 });
    const plateMat = new THREE.MeshStandardMaterial({ map: Tex.get('plate'), roughness: 0.5 });
    const wheelMats = {
      tire: new THREE.MeshStandardMaterial({ color: col('#1a1a1b'), roughness: 0.92, side: THREE.DoubleSide }),
      barrel: new THREE.MeshStandardMaterial({ color: col('#232427'), roughness: 0.6, metalness: 0.6, side: THREE.DoubleSide }),
      disc: new THREE.MeshStandardMaterial({ color: col('#8b8e93'), roughness: 0.35, metalness: 0.9 }),
      rim: new THREE.MeshStandardMaterial({ color: col(spec.rim), roughness: 0.22, metalness: 0.95 }),
      chrome: chrome,
      caliper: new THREE.MeshStandardMaterial({ color: col(spec.id === 'valkyrie' || spec.id === 'raptor' ? '#ffc21a' : '#c8102e'), roughness: 0.4 })
    };

    // --- кузов: лофт из поперечных сечений ---
    const yb = d.clear, belt = d.belt;
    const xWs = d.ws * hl, xRw = d.rw * hl, xRF = d.roofF * hl, xRR = d.roofR * hl;
    const sporty = d.type !== 'hatch' && d.type !== 'coupe';
    const baseTop = (z) => {
      if (z >= xWs) { const t = (z - xWs) / (hl - xWs); return lerp(belt, d.nose, Math.pow(t, 1.5)); }
      if (z >= xRw) return belt;
      const t = (xRw - z) / (xRw + hl);
      return lerp(belt, d.deck, smooth(clamp(t * 1.8, 0, 1)));
    };
    const rf = 0.5, rr = 0.36;
    const sec = (z) => {
      let kw = 1, kt = 1, kb = 1;
      if (z > hl - rf) {
        const u = Math.min(1, (z - (hl - rf)) / rf), k = Math.sqrt(Math.max(0, 1 - u * u));
        kw = 0.72 + 0.28 * k; kt = 0.5 + 0.5 * k; kb = 0.72 + 0.28 * k;
      } else if (z < -hl + rr) {
        const u = Math.min(1, ((-z) - (hl - rr)) / rr), k = Math.sqrt(Math.max(0, 1 - u * u));
        kw = 0.82 + 0.18 * k; kt = 0.66 + 0.34 * k; kb = 0.76 + 0.24 * k;
      }
      const top0 = baseTop(z);
      const bot0 = yb + (z > hl * 0.72 ? ((z - hl * 0.72) / (hl * 0.28)) * 0.06 : 0) + (z < -hl * 0.8 ? ((-z - hl * 0.8) / (hl * 0.2)) * 0.05 : 0);
      const mid = bot0 + (top0 - bot0) * 0.45;
      let hw = (W / 2) * kw;
      if (sporty) hw *= 1 + 0.03 * Math.exp(-Math.pow((z + d.wb / 2) / 0.55, 2));
      return { hw, top: mid + (top0 - mid) * kt, bot: mid - (mid - bot0) * kb };
    };
    const ringAt = (z) => {
      const q = sec(z), w = q.hw, h = q.top - q.bot;
      const R = [
        [0, q.top + 0.012], [w * 0.55, q.top], [w * 0.86, q.top - 0.025], [w * 0.97, q.top - Math.min(0.09, h * 0.22)],
        [w, q.top - h * 0.38], [w * 0.995, q.bot + h * 0.28], [w * 0.96, q.bot + 0.05], [w * 0.85, q.bot], [0, q.bot]
      ];
      const ring = R.map((p) => [p[0], p[1], z]);
      for (let j = 7; j >= 1; j--) ring.push([-R[j][0], R[j][1], z]);
      return ring;
    };
    const NS = 46;
    const rings = [];
    for (let k = 0; k <= NS; k++) {
      const u = k / NS;
      rings.push(ringAt(-hl + L * (1 - Math.cos(Math.PI * u)) / 2));
    }
    const bodyGeo = loftGeometry(rings, true, (k, j) => (j >= 6 && j <= 9 ? 1 : 0), true);
    const bodyMesh = new THREE.Mesh(bodyGeo, [paint, dark]);
    body.add(bodyMesh);

    // --- кабина: стёкла, стойки, крыша ---
    const cabTop = (z) => {
      if (z > xRF) return lerp(d.roof, belt, Math.pow((z - xRF) / (xWs - xRF), 1.15));
      if (z < xRR) return lerp(d.roof, belt, Math.pow((xRR - z) / (xRR - xRw), 1.3));
      return d.roof + 0.012 * Math.sin(((z - xRR) / (xRF - xRR)) * Math.PI);
    };
    const cabRings = [];
    const NC = 30;
    for (let k = 0; k <= NC; k++) {
      const z = lerp(xRw + 0.01, xWs - 0.01, k / NC);
      const hb = sec(z).hw * d.cabW * 1.06;
      const ht = hb * 0.72;
      const yt = cabTop(z);
      const yl = belt - 0.04;
      const Rp = [[hb, yl], [lerp(hb, ht, 0.55) + 0.01, lerp(yl, yt, 0.55)], [ht + 0.03, yt - 0.06], [ht * 0.9, yt - 0.015], [ht * 0.48, yt]];
      const ring = [];
      for (let j = 0; j < Rp.length; j++) ring.push([-Rp[j][0], Rp[j][1], z]);
      ring.push([0, yt + 0.006, z]);
      for (let j = Rp.length - 1; j >= 0; j--) ring.push([Rp[j][0], Rp[j][1], z]);
      cabRings.push(ring);
    }
    const zB = lerp(xRR, xRF, 0.42);
    const cabZ = (k) => lerp(xRw + 0.01, xWs - 0.01, (k + 0.5) / NC);
    const cabGeo = loftGeometry(cabRings, false, (k, j) => {
      const z = cabZ(k);
      const region = z > xRF ? 'ws' : z < xRR ? 'rw' : 'roof';
      if (j === 2 || j === 7) return 1;
      if (j >= 3 && j <= 6) return region === 'roof' ? 1 : 0;
      if (Math.abs(z - zB) < 0.055 && region === 'roof') return 2;
      return 0;
    }, false);
    const cabin = new THREE.Mesh(cabGeo, [glass, paint, black]);
    body.add(cabin);

    // --- детали ---
    const add = (geo, mat, x, y, z, rx, ry, rz) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      if (rx) m.rotation.x = rx;
      if (ry) m.rotation.y = ry;
      if (rz) m.rotation.z = rz;
      body.add(m);
      return m;
    };
    const fr = sec(hl), bk = sec(-hl);
    const lens = new THREE.SphereGeometry(1, 20, 12);
    const zH = hl - 0.16, sH = sec(zH);
    const headPos = [-1, 1].map((sd) => [sd * sH.hw * 0.64, sH.top - 0.045, zH]);
    headPos.forEach((p) => {
      const m = add(lens, headMat, p[0], p[1], p[2], -0.18);
      m.scale.set(0.25, 0.045, 0.19);
    });
    add(new THREE.BoxGeometry(fr.hw * 1.15, 0.15, 0.08), black, 0, fr.bot + (fr.top - fr.bot) * 0.36, hl - 0.01);
    add(new THREE.BoxGeometry(W * 0.86, 0.04, 0.26), dark, 0, fr.bot + 0.02, hl - 0.1);
    const tailY = bk.bot + (bk.top - bk.bot) * 0.74;
    const tailPos = [-1, 1].map((sd) => [sd * (bk.hw - 0.27), tailY, -hl]);
    tailPos.forEach((p) => add(new THREE.BoxGeometry(0.42, 0.09, 0.08), tailMat, p[0], p[1], p[2]));
    add(new THREE.BoxGeometry(Math.max(0.2, (bk.hw - 0.5) * 2), 0.03, 0.06), tailMat, 0, tailY + 0.01, -hl);
    add(new THREE.BoxGeometry(bk.hw * 1.7, 0.14, 0.3), dark, 0, bk.bot + 0.07, -hl + 0.1);
    const exY = bk.bot + 0.1;
    [-1, 1].forEach((sd) => {
      add(new THREE.CylinderGeometry(0.055, 0.055, 0.22, 14), chrome, sd * 0.4 * (W / 1.9), exY, -hl - 0.02, Math.PI / 2);
      const zm = xWs - 0.12;
      add(new THREE.BoxGeometry(0.16, 0.08, 0.08), paint, sd * (sec(zm).hw * d.cabW * 1.06 + 0.06), belt + 0.08, zm);
      if (d.type === 'super' || d.type === 'hyper') {
        const zi = xRw + 0.45;
        add(new THREE.BoxGeometry(0.04, 0.12, 0.46), black, sd * (sec(zi).hw - 0.012), belt - 0.22, zi);
      }
    });
    const rp = add(new THREE.PlaneGeometry(0.52, 0.12), plateMat, 0, bk.bot + (bk.top - bk.bot) * 0.42, -hl - 0.045, 0, Math.PI);
    rp.castShadow = false;
    add(new THREE.PlaneGeometry(0.52, 0.12), plateMat, 0, fr.bot + (fr.top - fr.bot) * 0.12 + 0.03, hl + 0.045);
    if (d.type === 'muscle') {
      const zs = (hl + xWs) / 2 - 0.1;
      add(new THREE.BoxGeometry(0.6, 0.1, 0.85), black, 0, baseTop(zs) + 0.04, zs, 0.06);
    }
    const dk = sec(-hl + 0.32).top;
    if (d.spoiler === 'wing') {
      [-1, 1].forEach((sd) => add(new THREE.BoxGeometry(0.05, 0.3, 0.14), black, sd * 0.55, dk + 0.13, -hl + 0.32));
      add(new THREE.BoxGeometry(W * 0.94, 0.04, 0.34), black, 0, dk + 0.3, -hl + 0.28, -0.08);
      [-1, 1].forEach((sd) => add(new THREE.BoxGeometry(0.03, 0.17, 0.4), black, sd * W * 0.47, dk + 0.3, -hl + 0.28));
    } else if (d.spoiler === 'lip') {
      add(new THREE.BoxGeometry(W * 0.8, 0.05, 0.16), paint, 0, sec(-hl + 0.14).top + 0.02, -hl + 0.14, -0.18);
    } else if (d.spoiler === 'duck') {
      add(new THREE.BoxGeometry(W * 0.84, 0.07, 0.2), paint, 0, sec(-hl + 0.12).top + 0.02, -hl + 0.12, -0.32);
    }

    // --- колёсные арки и колёса ---
    const R = d.wR, tw = 0.27;
    const archGeo = new THREE.CircleGeometry(R * 1.14, 28);
    const wheels = [];
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sz]) => {
      const zw = sz * d.wb / 2;
      const hwz = sec(zw).hw;
      const arch = new THREE.Mesh(archGeo, black);
      arch.position.set(sx * (hwz + 0.004), R + 0.02, zw);
      arch.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
      body.add(arch);
      const w = makeWheel(R, tw, sx, wheelMats);
      w.pivot.position.set(sx * (hwz - tw / 2 + 0.035), R, zw);
      root.add(w.pivot);
      wheels.push({ pivot: w.pivot, spin: w.spin, front: sz > 0 });
    });

    root.traverse((o) => { if (o.isMesh) o.castShadow = true; });

    // --- свечение фар, стопов и нитро ---
    const soft = Tex.get('soft');
    const glow = (color, x, y, z, sc) => {
      const m = new THREE.SpriteMaterial({ map: soft, color: color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });
      const sp = new THREE.Sprite(m);
      sp.position.set(x, y, z);
      sp.scale.set(sc, sc, sc);
      body.add(sp);
      return sp;
    };
    const headGlow = headPos.map((p) => glow(0xfff1d0, p[0], p[1], p[2] + 0.18, 1.0));
    const tailGlow = tailPos.map((p) => glow(0xff2020, p[0], p[1], p[2] - 0.1, 0.65));

    const flameMat = new THREE.MeshBasicMaterial({ color: 0x7fb8ff, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.9, depthWrite: false });
    const flameGeo = new THREE.ConeGeometry(0.1, 0.8, 10, 1, true);
    const flames = [-1, 1].map((sd) => {
      const f = new THREE.Mesh(flameGeo, flameMat);
      f.rotation.x = -Math.PI / 2;
      f.position.set(sd * 0.4 * (W / 1.9), exY, -hl - 0.48);
      f.visible = false;
      body.add(f);
      return f;
    });

    const poolMat = new THREE.MeshBasicMaterial({ map: soft, color: 0xffe2b0, blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthWrite: false });
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, 0.06, hl + 9);
    pool.scale.set(9, 18, 1);
    pool.visible = false;
    root.add(pool);

    return {
      root, body, wheels, paint, headMat, tailMat, headGlow, tailGlow, flames, pool, R, dims: d,
      setColor(hex) { paint.color.copy(col(hex)); }
    };
  }

  /* ========================================================
     ТРАССА: геометрия, проекция машин, профиль скоростей
     ======================================================== */
  class Track {
    constructor(def) {
      this.def = def;
      this.closed = def.type === 'circuit';
      const pts = def.pts.map((p) => new THREE.Vector3(p[0], 0, p[1]));
      const curve = new THREE.CatmullRomCurve3(pts, this.closed, 'centripetal');
      const total = curve.getLength();
      const N = Math.round(total / SAMPLE_STEP);
      const sp = curve.getSpacedPoints(N);
      if (this.closed) sp.pop();
      const n = sp.length;
      this.n = n;
      this.length = total;
      this.ds = total / N;
      this.px = new Float32Array(n); this.pz = new Float32Array(n);
      this.tx = new Float32Array(n); this.tz = new Float32Array(n);
      this.rx = new Float32Array(n); this.rz = new Float32Array(n);
      this.head = new Float32Array(n);
      this.curv = new Float32Array(n);
      this.vbase = new Float32Array(n);
      for (let i = 0; i < n; i++) { this.px[i] = sp[i].x; this.pz[i] = sp[i].z; }
      for (let i = 0; i < n; i++) {
        const a = this.idx(i - 1), b = this.idx(i + 1);
        let dx = this.px[b] - this.px[a], dz = this.pz[b] - this.pz[a];
        const l = Math.hypot(dx, dz) || 1;
        dx /= l; dz /= l;
        this.tx[i] = dx; this.tz[i] = dz;
        this.rx[i] = -dz; this.rz[i] = dx;
        this.head[i] = Math.atan2(dx, dz);
      }
      // кривизна (+ поворот направо)
      const K = 4;
      const raw = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const a = this.idx(i - K), b = this.idx(i + K);
        const span = (this.closed ? 2 * K : (b - a)) * this.ds || 1;
        raw[i] = -wrapAngle(this.head[b] - this.head[a]) / span;
      }
      for (let i = 0; i < n; i++) {
        let s = 0, c = 0;
        for (let k = -3; k <= 3; k++) { s += raw[this.idx(i + k)]; c++; }
        this.curv[i] = s / c;
      }
      // профиль безопасной скорости при единичном боковом ускорении
      for (let i = 0; i < n; i++) this.vbase[i] = Math.min(30, Math.sqrt(1 / Math.max(Math.abs(this.curv[i]), 1e-4)));
      const passes = this.closed ? 3 : 1;
      for (let p = 0; p < passes; p++) {
        for (let i = n - 1; i >= 0; i--) {
          const j = this.closed ? this.idx(i + 1) : Math.min(n - 1, i + 1);
          const lim = Math.sqrt(this.vbase[j] * this.vbase[j] + 2 * 0.75 * this.ds);
          if (this.vbase[i] > lim) this.vbase[i] = lim;
        }
      }
      // границы и сетка для поиска ближайших точек
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (let i = 0; i < n; i++) {
        minX = Math.min(minX, this.px[i]); maxX = Math.max(maxX, this.px[i]);
        minZ = Math.min(minZ, this.pz[i]); maxZ = Math.max(maxZ, this.pz[i]);
      }
      this.bounds = { minX, maxX, minZ, maxZ, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, size: Math.max(maxX - minX, maxZ - minZ) };
      this.cell = 30;
      this.grid = new Map();
      for (let i = 0; i < n; i++) {
        const key = this.key(this.px[i], this.pz[i]);
        if (!this.grid.has(key)) this.grid.set(key, []);
        this.grid.get(key).push(i);
      }
      // старт / финиш
      if (this.closed) {
        this.startS = 0;
        this.raceLen = this.length;
      } else {
        this.startS = SPRINT_START;
        this.finishS = this.length - SPRINT_END;
        this.raceLen = this.finishS - this.startS;
      }
    }
    key(x, z) { return Math.floor(x / this.cell) + ',' + Math.floor(z / this.cell); }
    idx(i) {
      if (this.closed) return ((i % this.n) + this.n) % this.n;
      return i < 0 ? 0 : i >= this.n ? this.n - 1 : i;
    }
    sIndex(s) { return this.idx(Math.round(s / this.ds)); }
    // расстояние до осевой линии через сетку (для расстановки декораций)
    distTo(x, z) {
      const cx = Math.floor(x / this.cell), cz = Math.floor(z / this.cell);
      let best = Infinity;
      for (let a = -2; a <= 2; a++) {
        for (let b = -2; b <= 2; b++) {
          const list = this.grid.get((cx + a) + ',' + (cz + b));
          if (!list) continue;
          for (let k = 0; k < list.length; k++) {
            const i = list[k];
            const d = (x - this.px[i]) ** 2 + (z - this.pz[i]) ** 2;
            if (d < best) best = d;
          }
        }
      }
      return Math.sqrt(best);
    }
    // точное (медленное) расстояние до трассы — для крупных объектов вдали
    minDist(x, z) {
      let best = Infinity;
      for (let i = 0; i < this.n; i += 3) {
        const d = (x - this.px[i]) ** 2 + (z - this.pz[i]) ** 2;
        if (d < best) best = d;
      }
      return Math.sqrt(best);
    }
    nearestGlobal(x, z) {
      let best = Infinity, bi = 0;
      for (let i = 0; i < this.n; i++) {
        const d = (x - this.px[i]) ** 2 + (z - this.pz[i]) ** 2;
        if (d < best) { best = d; bi = i; }
      }
      return bi;
    }
    nearestLocal(x, z, hint) {
      if (hint < 0) return this.nearestGlobal(x, z);
      let best = Infinity, bi = hint;
      for (let k = -24; k <= 24; k++) {
        const i = this.idx(hint + k);
        const d = (x - this.px[i]) ** 2 + (z - this.pz[i]) ** 2;
        if (d < best) { best = d; bi = i; }
      }
      if (best > 60 * 60) return this.nearestGlobal(x, z);
      return bi;
    }
    // проекция точки на трассу: индекс, дистанция s, боковое смещение
    project(x, z, hint, out) {
      const i = this.nearestLocal(x, z, hint);
      const dx = x - this.px[i], dz = z - this.pz[i];
      const along = dx * this.tx[i] + dz * this.tz[i];
      out.i = i;
      out.along = along;
      out.lat = dx * this.rx[i] + dz * this.rz[i];
      let s = i * this.ds + along;
      if (this.closed) s = ((s % this.length) + this.length) % this.length;
      out.s = s;
      out.tx = this.tx[i]; out.tz = this.tz[i];
      out.rx = this.rx[i]; out.rz = this.rz[i];
      return out;
    }
    pointAt(s, lat) {
      let ss = s;
      if (this.closed) ss = ((s % this.length) + this.length) % this.length;
      const f = ss / this.ds;
      const i0 = this.idx(Math.floor(f)), i1 = this.idx(Math.floor(f) + 1);
      const t = f - Math.floor(f);
      const x = lerp(this.px[i0], this.px[i1], t) + lerp(this.rx[i0], this.rx[i1], t) * lat;
      const z = lerp(this.pz[i0], this.pz[i1], t) + lerp(this.rz[i0], this.rz[i1], t) * lat;
      const h = this.head[i0] + wrapAngle(this.head[i1] - this.head[i0]) * t;
      return { x, z, h };
    }
  }

  /* ---------- Протяжка профиля вдоль трассы (дорога, отбойники) ---------- */
  function sweepGeometry(track, profile, opts) {
    // profile: массив [смещение вбок, высота]; vScale — метров на повтор текстуры по длине
    const n = track.n;
    const rings = track.closed ? n + 1 : n;
    const m = profile.length;
    const pos = new Float32Array(rings * m * 3);
    const uv = new Float32Array(rings * m * 2);
    let plen = [0];
    for (let j = 1; j < m; j++) plen.push(plen[j - 1] + Math.hypot(profile[j][0] - profile[j - 1][0], profile[j][1] - profile[j - 1][1]));
    const ptot = plen[m - 1] || 1;
    for (let r = 0; r < rings; r++) {
      const i = r % n;
      const s = r * track.ds;
      for (let j = 0; j < m; j++) {
        const o = (r * m + j);
        const lat = profile[j][0];
        pos[o * 3] = track.px[i] + track.rx[i] * lat;
        pos[o * 3 + 1] = profile[j][1];
        pos[o * 3 + 2] = track.pz[i] + track.rz[i] * lat;
        uv[o * 2] = opts.uAbs ? plen[j] / opts.uAbs : plen[j] / ptot;
        uv[o * 2 + 1] = s / opts.vScale;
      }
    }
    const idx = [];
    for (let r = 0; r < rings - 1; r++) {
      for (let j = 0; j < m - 1; j++) {
        const a = r * m + j, b = r * m + j + 1, c = (r + 1) * m + j, d = (r + 1) * m + j + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
  }

  /* ========================================================
     ПОСТРОЕНИЕ МИРА: дорога, окружение, освещение
     ======================================================== */
  const QUALITY = {
    low: { density: 0.45, shadow: 0, ratio: 0.8 },
    medium: { density: 0.75, shadow: 1024, ratio: 1 },
    high: { density: 1, shadow: 2048, ratio: 1.75 }
  };

  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  function instanced(geo, mat, list, cast, receive) {
    if (!list.length) return null;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((it, i) => {
      _e.set(it.rx || 0, it.ry || 0, it.rz || 0);
      _q.setFromEuler(_e);
      _p.set(it.x, it.y || 0, it.z);
      _s.set(it.sx || 1, it.sy || 1, it.sz || 1);
      _m4.compose(_p, _q, _s);
      im.setMatrixAt(i, _m4);
      if (it.color) im.setColorAt(i, it.color);
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = !!cast;
    im.receiveShadow = !!receive;
    im.frustumCulled = false;
    return im;
  }

  // Коробка с UV в метрах (окна не растягиваются)
  function buildingGeo(w, h, d, tileW, tileH) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(0, h / 2, 0);
    const uv = g.attributes.uv;
    const sizes = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) {
      const sw = f === 2 || f === 3 ? sizes[f][0] / 8 : sizes[f][0] / tileW;
      const sh = f === 2 || f === 3 ? sizes[f][1] / 8 : sizes[f][1] / tileH;
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        uv.setXY(i, uv.getX(i) * sw, uv.getY(i) * sh);
      }
    }
    return g;
  }

  function makePlacer(track, extraCheck) {
    const occ = new Map();
    const C = 25;
    return {
      free(x, z, r, clear) {
        if (track.distTo(x, z) < WALL + clear + r) return false;
        if (extraCheck && !extraCheck(x, z, r)) return false;
        const cx = Math.floor(x / C), cz = Math.floor(z / C);
        for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
          const l = occ.get((cx + a) + ',' + (cz + b));
          if (!l) continue;
          for (const o of l) if (Math.hypot(o.x - x, o.z - z) < o.r + r + 1.5) return false;
        }
        return true;
      },
      add(x, z, r) {
        const k = Math.floor(x / C) + ',' + Math.floor(z / C);
        if (!occ.has(k)) occ.set(k, []);
        occ.get(k).push({ x, z, r });
      }
    };
  }

  function buildWorld(race) {
    const scene = race.scene;
    const track = race.track;
    const preset = race.preset;
    const theme = track.def.theme;
    const q = QUALITY[Save.data.settings.quality];
    const rng = makeRng(hashStr(track.def.id));
    const put = (o) => { if (o) scene.add(o); };
    const R = () => rng();
    const RR = (a, b) => a + rng() * (b - a);
    const out = { lampMats: [], windowMats: [], pools: null };

    // ----- небо, туман, свет -----
    scene.fog = new THREE.Fog(col(preset.fog), preset.fogNear, preset.fogFar);
    scene.background = col(preset.fog);
    out.sky = makeSky(preset);
    scene.add(out.sky);
    if (preset.night) { out.stars = makeStars(); scene.add(out.stars); }
    // облака
    const cloudMat = new THREE.SpriteMaterial({ map: Tex.get('cloud'), color: col(preset.cloud), transparent: true, opacity: preset.cloudA, fog: false, depthWrite: false });
    for (let k = 0; k < 30; k++) {
      const a = R() * Math.PI * 2, dd = RR(300, 1900);
      const sp = new THREE.Sprite(cloudMat);
      sp.position.set(track.bounds.cx + Math.cos(a) * dd, RR(240, 520), track.bounds.cz + Math.sin(a) * dd);
      const sc = RR(260, 640);
      sp.scale.set(sc, sc * 0.45, 1);
      sp.renderOrder = -5;
      scene.add(sp);
    }
    race.envRT = makeEnvMap(preset, false);
    scene.environment = race.envRT.texture;

    const hemi = new THREE.HemisphereLight(col(preset.hemiSky), col(preset.hemiGround), preset.hemiI);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(col(preset.sun), preset.sunI);
    out.sunDir = new THREE.Vector3().fromArray(preset.sunDir).normalize();
    if (q.shadow) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(q.shadow, q.shadow);
      const sc = sun.shadow.camera;
      sc.left = -75; sc.right = 75; sc.top = 75; sc.bottom = -75; sc.near = 10; sc.far = 700;
      sun.shadow.bias = -0.0004;
      sun.shadow.normalBias = 0.03;
    }
    scene.add(sun);
    scene.add(sun.target);
    out.sun = sun;

    // ----- земля -----
    const groundTex = {
      city: 'pavement', industrial: 'pavement', forest: 'grass', suburb: 'grass'
    }[theme];
    const gsize = Math.max(7000, track.bounds.size * 5);
    const gt = Tex.get(groundTex).clone();
    gt.userData = {};
    gt.needsUpdate = true;
    gt.repeat.set(gsize / (groundTex === 'grass' ? 10 : 14), gsize / (groundTex === 'grass' ? 10 : 14));
    const groundMat = new THREE.MeshStandardMaterial({
      map: gt, roughness: 1, metalness: 0,
      color: col(theme === 'forest' ? '#8ea070' : theme === 'suburb' ? '#a8b888' : '#9a9a9a'),
      polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4
    });
    // земля разбита на сегменты: огромные треугольники дают ошибки глубины у самой дороги
    const gseg = Math.min(160, Math.ceil(gsize / 90));
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(gsize, gsize, gseg, gseg), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(track.bounds.cx, 0, track.bounds.cz);
    ground.receiveShadow = true;
    scene.add(ground);

    // ----- вода в порту -----
    let waterZ = -Infinity;
    if (theme === 'industrial') {
      waterZ = track.bounds.minZ - 52;
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(gsize, 3000, Math.ceil(gsize / 100), 30),
        new THREE.MeshStandardMaterial({ color: col(preset.night ? '#08121c' : '#1d3a4c'), metalness: 0.9, roughness: 0.12, envMapIntensity: 1.2 })
      );
      water.rotation.x = -Math.PI / 2;
      water.position.set(track.bounds.cx, 0.06, waterZ - 1500);
      scene.add(water);
      const quay = new THREE.Mesh(new THREE.BoxGeometry(gsize, 1.2, 3), new THREE.MeshStandardMaterial({ map: Tex.get('concrete'), roughness: 0.9 }));
      quay.position.set(track.bounds.cx, 0.3, waterZ + 1.5);
      quay.receiveShadow = true;
      scene.add(quay);
    }

    // ----- дорога, тротуары, отбойники -----
    const roadMat = new THREE.MeshStandardMaterial({ map: Tex.get('road'), roughness: preset.night ? 0.62 : 0.86, metalness: 0.0, side: THREE.DoubleSide, envMapIntensity: 0.6 });
    const road = new THREE.Mesh(sweepGeometry(track, [[-ROAD_HALF, 0.03], [ROAD_HALF, 0.03]], { vScale: 16 }), roadMat);
    road.receiveShadow = true;
    scene.add(road);

    const swMat = new THREE.MeshStandardMaterial({ map: Tex.get('sidewalk'), roughness: 0.92, side: THREE.DoubleSide });
    [-1, 1].forEach((sd) => {
      const prof = [[sd * ROAD_HALF, 0.03], [sd * (ROAD_HALF + 0.01), 0.12], [sd * (WALL + 0.4), 0.12], [sd * (WALL + 0.45), 0.0]];
      const m = new THREE.Mesh(sweepGeometry(track, prof, { vScale: 4, uAbs: 3.45 }), swMat);
      m.receiveShadow = true;
      scene.add(m);
    });

    if (theme === 'forest') {
      const railMat = new THREE.MeshStandardMaterial({ color: col('#b9bec4'), metalness: 0.85, roughness: 0.35, side: THREE.DoubleSide });
      const posts = [];
      [-1, 1].forEach((sd) => {
        const c = sd * (WALL + 0.1);
        const prof = [[c, 0.45], [c + sd * 0.08, 0.53], [c, 0.62], [c + sd * 0.08, 0.71], [c, 0.8]];
        const m = new THREE.Mesh(sweepGeometry(track, prof, { vScale: 4 }), railMat);
        m.castShadow = true;
        scene.add(m);
        for (let i = 0; i < track.n; i += 2) {
          posts.push({ x: track.px[i] + track.rx[i] * (c + sd * 0.15), y: 0.42, z: track.pz[i] + track.rz[i] * (c + sd * 0.15), ry: track.head[i] });
        }
      });
      put(instanced(new THREE.BoxGeometry(0.12, 0.84, 0.12), new THREE.MeshStandardMaterial({ color: col('#7d8288'), metalness: 0.7, roughness: 0.5 }), posts, true, false));
    } else {
      const barMat = new THREE.MeshStandardMaterial({ map: Tex.get('concrete'), roughness: 0.88, side: THREE.DoubleSide });
      [-1, 1].forEach((sd) => {
        const c = sd * (WALL + 0.3);
        const prof = [[c - 0.32, 0.0], [c - 0.3, 0.28], [c - 0.1, 0.5], [c - 0.09, 0.92], [c + 0.09, 0.92], [c + 0.1, 0.5], [c + 0.3, 0.28], [c + 0.32, 0.0]];
        const m = new THREE.Mesh(sweepGeometry(track, prof, { vScale: 4 }), barMat);
        m.castShadow = true;
        m.receiveShadow = true;
        scene.add(m);
      });
    }

    // ----- шевроны на опасных поворотах -----
    const chev = [];
    for (let i = 0; i < track.n; i += 6) {
      const k = track.curv[i];
      if (Math.abs(k) < 1 / 95) continue;
      if (!track.closed && (i < 10 || i > track.n - 10)) continue;
      const sd = k > 0 ? -1 : 1;
      const lat = sd * (WALL - 0.05);
      const nx = -sd * track.rx[i], nz = -sd * track.rz[i];
      chev.push({ x: track.px[i] + track.rx[i] * lat, y: 1.45, z: track.pz[i] + track.rz[i] * lat, ry: Math.atan2(nx, nz), sx: -sd });
    }
    const chevMat = new THREE.MeshStandardMaterial({ map: Tex.get('chevron'), emissiveMap: Tex.get('chevron'), roughness: 0.5, side: THREE.DoubleSide, emissive: col('#ffffff'), emissiveIntensity: preset.night ? 0.35 : 0.0 });
    const chevIm = instanced(new THREE.PlaneGeometry(2.2, 1.0), chevMat, chev, false, false);
    if (chevIm) scene.add(chevIm);

    // ----- старт и финиш -----
    const gantry = (s, text) => {
      const p = track.pointAt(s, 0);
      const g = new THREE.Group();
      g.position.set(p.x, 0, p.z);
      g.rotation.y = p.h;
      const dark = new THREE.MeshStandardMaterial({ color: col('#1c1e22'), metalness: 0.6, roughness: 0.4 });
      [-1, 1].forEach((sd) => {
        const pil = new THREE.Mesh(new THREE.BoxGeometry(0.9, 8.2, 0.9), dark);
        pil.position.set(sd * (WALL + 1.0), 4.1, 0);
        pil.castShadow = true;
        g.add(pil);
      });
      const beam = new THREE.Mesh(new THREE.BoxGeometry(WALL * 2 + 2.8, 1.6, 1.0), dark);
      beam.position.y = 7.9;
      beam.castShadow = true;
      g.add(beam);
      const bt = Tex.banner(text);
      const bMat = new THREE.MeshStandardMaterial({ map: bt, emissive: col('#ffffff'), emissiveMap: bt, emissiveIntensity: preset.night ? 0.8 : 0.15, roughness: 0.6 });
      [1, -1].forEach((sd) => {
        const b = new THREE.Mesh(new THREE.PlaneGeometry(WALL * 2 + 1.6, 1.45), bMat);
        b.position.set(0, 7.9, sd * 0.52);
        if (sd < 0) b.rotation.y = Math.PI;
        g.add(b);
      });
      const chk = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2, 2.4),
        new THREE.MeshStandardMaterial({ map: Tex.get('checker'), roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      chk.rotation.x = -Math.PI / 2;
      chk.position.y = 0.04;
      chk.receiveShadow = true;
      g.add(chk);
      scene.add(g);
    };
    if (track.closed) gantry(0, 'СТАРТ  ·  ФИНИШ');
    else {
      gantry(track.startS, 'СТАРТ');
      gantry(track.finishS, 'ФИНИШ');
      // глухие стенки в концах спринта
      const endMat = new THREE.MeshStandardMaterial({ map: Tex.get('chevron'), roughness: 0.6 });
      [4, track.length - 4].forEach((s) => {
        const p = track.pointAt(s, 0);
        const wall = new THREE.Mesh(new THREE.BoxGeometry(WALL * 2 + 0.6, 1.4, 0.8), endMat);
        wall.position.set(p.x, 0.7, p.z);
        wall.rotation.y = p.h;
        wall.castShadow = true;
        scene.add(wall);
      });
    }

    // ----- фонари -----
    const lamps = { pole: [], arm: [], head: [], pool: [] };
    const lampStep = theme === 'forest' ? 70 : 42;
    const lampEnd = track.closed ? track.length - 10 : track.length - 6;
    let side = 1;
    for (let s = 10; s < lampEnd; s += lampStep) {
      side = -side;
      const i = track.sIndex(s);
      const lat = side * (WALL + 1.0);
      const x = track.px[i] + track.rx[i] * lat, z = track.pz[i] + track.rz[i] * lat;
      const dx = -side * track.rx[i], dz = -side * track.rz[i];
      const phi = Math.atan2(-dz, dx);
      lamps.pole.push({ x, y: 4.6, z });
      lamps.arm.push({ x: x + dx * 1.2, y: 9.1, z: z + dz * 1.2, ry: phi });
      lamps.head.push({ x: x + dx * 2.4, y: 9.0, z: z + dz * 2.4, ry: phi });
      lamps.pool.push({ x: x + dx * 4.5, y: 0.07, z: z + dz * 4.5, sx: 16, sz: 16, ry: phi });
    }
    const poleMat = new THREE.MeshStandardMaterial({ color: col('#3a3e44'), metalness: 0.75, roughness: 0.45 });
    put(instanced(new THREE.CylinderGeometry(0.11, 0.17, 9.2, 8), poleMat, lamps.pole, true));
    put(instanced(new THREE.BoxGeometry(2.5, 0.12, 0.12), poleMat, lamps.arm, true));
    const headMat = new THREE.MeshStandardMaterial({ color: col('#e8e2d0'), emissive: col('#ffd59a'), emissiveIntensity: preset.lamps * 2.2, roughness: 0.3 });
    put(instanced(new THREE.BoxGeometry(0.75, 0.16, 0.38), headMat, lamps.head, false));
    if (preset.lamps > 0) {
      const poolMat = new THREE.MeshBasicMaterial({ map: Tex.get('soft'), color: col('#ffcf8a'), transparent: true, opacity: 0.22 * preset.lamps, blending: THREE.AdditiveBlending, depthWrite: false });
      const pg = new THREE.PlaneGeometry(1, 1);
      pg.rotateX(-Math.PI / 2);
      put(instanced(pg, poolMat, lamps.pool, false));
      const glowMat = new THREE.SpriteMaterial({ map: Tex.get('soft'), color: 0xffd59a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 * preset.lamps });
      lamps.head.forEach((h) => {
        const sp = new THREE.Sprite(glowMat);
        sp.position.set(h.x, h.y - 0.2, h.z);
        sp.scale.set(3.2, 3.2, 3.2);
        scene.add(sp);
      });
    }

    // ----- декорации по теме -----
    const placer = makePlacer(track, waterZ > -Infinity ? (x, z, r) => z - r > waterZ + 6 : null);
    const dens = q.density;
    const sEnd = track.length;

    const addBuildings = (variants, rows, step, minOff) => {
      const lists = variants.map(() => []);
      for (let s = 0; s < sEnd; s += step / dens) {
        for (const sd of [-1, 1]) {
          for (let row = 0; row < rows; row++) {
            if (R() > 0.85) continue;
            const vi = Math.floor(R() * variants.length);
            const v = variants[vi];
            const r = Math.max(v.w, v.d) * 0.62;
            const off = minOff + row * 42 + RR(0, 10) + r;
            const p = track.pointAt(s + RR(-6, 6), sd * off);
            if (!placer.free(p.x, p.z, r, 3)) continue;
            placer.add(p.x, p.z, r);
            const t = RR(0.78, 1.08);
            lists[vi].push({ x: p.x, z: p.z, ry: p.h + (R() < 0.15 ? RR(-0.3, 0.3) : 0), sy: RR(0.8, 1.25), color: new THREE.Color(t, t * RR(0.96, 1.02), t * RR(0.95, 1.05)) });
          }
        }
      }
      variants.forEach((v, vi) => {
        const f = Tex.facade(v.style);
        const wallMat = new THREE.MeshStandardMaterial({
          map: f.map, emissiveMap: f.em, emissive: col('#ffe4b0'), emissiveIntensity: preset.windows * 1.4,
          roughness: v.style === 'glass' ? 0.25 : 0.85, metalness: v.style === 'glass' ? 0.55 : 0.05
        });
        const roofMat = new THREE.MeshStandardMaterial({ map: Tex.get('roof'), roughness: 0.95 });
        const geo = buildingGeo(v.w, v.h, v.d, v.style === 'house' ? 8 : 12, v.style === 'house' ? 6 : 14);
        const im = instanced(geo, [wallMat, wallMat, roofMat, roofMat, wallMat, wallMat], lists[vi], true, true);
        if (im) scene.add(im);
      });
    };

    const addTrees = (count, minOff, maxOff, pine) => {
      const trunks = [], crowns = [], crowns2 = [];
      const L = sEnd;
      for (let k = 0; k < count * dens; k++) {
        const s = R() * L;
        const sd = R() < 0.5 ? -1 : 1;
        const off = RR(minOff, maxOff);
        const p = track.pointAt(s, sd * off);
        const sc = RR(0.75, 1.35);
        if (!placer.free(p.x, p.z, 1.6 * sc, 2)) continue;
        placer.add(p.x, p.z, 1.2 * sc);
        const g = RR(0.75, 1.15);
        trunks.push({ x: p.x, y: 1.5 * sc, z: p.z, sx: sc, sy: sc, sz: sc });
        if (pine) {
          crowns.push({ x: p.x, y: 4.4 * sc, z: p.z, sx: sc, sy: sc * RR(0.9, 1.2), sz: sc, ry: R() * 6, color: new THREE.Color(0.55 * g, 0.75 * g, 0.5 * g) });
          crowns2.push({ x: p.x, y: 7.2 * sc, z: p.z, sx: sc * 0.72, sy: sc * 0.8, sz: sc * 0.72, ry: R() * 6, color: new THREE.Color(0.55 * g, 0.78 * g, 0.5 * g) });
        } else {
          crowns.push({ x: p.x, y: 4.6 * sc, z: p.z, sx: sc * RR(2.2, 2.8), sy: sc * RR(2.4, 3.2), sz: sc * RR(2.2, 2.8), ry: R() * 6, color: new THREE.Color(0.7 * g, 0.85 * g, 0.45 * g) });
        }
      }
      const trunkMat = new THREE.MeshStandardMaterial({ color: col('#4a3526'), roughness: 0.95 });
      put(instanced(new THREE.CylinderGeometry(0.2, 0.32, 3, 6), trunkMat, trunks, true));
      const leafMat = new THREE.MeshStandardMaterial({ color: col(pine ? '#2c5a2e' : '#4a7a2c'), roughness: 0.9, flatShading: true });
      if (pine) {
        put(instanced(new THREE.ConeGeometry(2.6, 5.4, 8), leafMat, crowns, true));
        put(instanced(new THREE.ConeGeometry(2.2, 4.4, 8), leafMat, crowns2, true));
      } else {
        put(instanced(new THREE.IcosahedronGeometry(1, 1), leafMat, crowns, true));
      }
    };

    const addHills = (count, color) => {
      const list = [];
      const b = track.bounds;
      for (let k = 0; k < count; k++) {
        const a = R() * Math.PI * 2;
        const d = b.size * 0.55 + RR(250, 900);
        const x = b.cx + Math.cos(a) * d, z = b.cz + Math.sin(a) * d;
        const sc = RR(150, 420);
        const szs = sc * RR(0.8, 1.2);
        if (track.minDist(x, z) < Math.max(sc, szs) * 1.05 + 60) continue;
        list.push({ x, y: -sc * 0.14, z, sx: sc, sy: sc * RR(0.22, 0.42), sz: szs, ry: R() * 6 });
      }
      const mat = new THREE.MeshStandardMaterial({ color: col(color), roughness: 1, flatShading: true });
      put(instanced(new THREE.IcosahedronGeometry(1, 2), mat, list, false));
    };

    const addSkyline = (count) => {
      const list = [];
      const b = track.bounds;
      for (let k = 0; k < count; k++) {
        const a = R() * Math.PI * 2;
        const d = b.size * 0.5 + RR(300, 1000);
        const x = b.cx + Math.cos(a) * d, z = b.cz + Math.sin(a) * d;
        if (track.minDist(x, z) < 160 || z < waterZ + 40) continue;
        const h = RR(60, 190);
        list.push({ x, z, sx: RR(0.9, 1.6), sy: h / 80, sz: RR(0.9, 1.6), ry: R() * 3 });
      }
      const f = Tex.facade('glass');
      const mat = new THREE.MeshStandardMaterial({ map: f.map, emissiveMap: f.em, emissive: col('#ffe2b0'), emissiveIntensity: preset.windows * 1.6, color: col('#9aa3ad'), roughness: 0.4, metalness: 0.4 });
      put(instanced(buildingGeo(30, 80, 30, 12, 14), [mat, mat, mat, mat, mat, mat], list, false));
    };

    const addBillboards = (count) => {
      for (let k = 0; k < count; k++) {
        const s = (k + 0.5) / count * sEnd + RR(-30, 30);
        const sd = k % 2 ? 1 : -1;
        const p = track.pointAt(s, sd * (WALL + 9));
        if (!placer.free(p.x, p.z, 6, 4)) continue;
        placer.add(p.x, p.z, 6);
        const g = new THREE.Group();
        g.position.set(p.x, 0, p.z);
        g.rotation.y = p.h + sd * (Math.PI / 2 + 0.45);
        const postMat = new THREE.MeshStandardMaterial({ color: col('#2b2e33'), metalness: 0.7, roughness: 0.5 });
        [-3, 3].forEach((x) => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 9, 0.4), postMat);
          post.position.set(x, 4.5, -0.3);
          post.castShadow = true;
          g.add(post);
        });
        const tex = Tex.get('ad' + (k % AD_TEXTS.length));
        const board = new THREE.Mesh(new THREE.BoxGeometry(12.4, 6.4, 0.3), [postMat, postMat, postMat, postMat,
          new THREE.MeshStandardMaterial({ map: tex, emissive: col('#ffffff'), emissiveMap: tex, emissiveIntensity: preset.lamps * 0.7, roughness: 0.5 }), postMat]);
        board.position.set(0, 9.5, 0);
        board.castShadow = true;
        g.add(board);
        scene.add(g);
      }
    };

    if (theme === 'city') {
      addBuildings([
        { w: 26, d: 26, h: 72, style: 'glass' }, { w: 30, d: 30, h: 44, style: 'glass' },
        { w: 24, d: 22, h: 26, style: 'brick' }, { w: 34, d: 20, h: 30, style: 'panel' },
        { w: 20, d: 20, h: 58, style: 'panel' }, { w: 38, d: 22, h: 17, style: 'brick' }
      ], 3, 30, WALL + 4);
      addTrees(260, WALL + 3, WALL + 6, false);
      addBillboards(8);
      addSkyline(80 * dens);
    } else if (theme === 'industrial') {
      addBuildings([
        { w: 52, d: 30, h: 13, style: 'warehouse' }, { w: 40, d: 26, h: 10, style: 'warehouse' },
        { w: 60, d: 36, h: 16, style: 'warehouse' }, { w: 22, d: 18, h: 22, style: 'panel' }
      ], 2, 46, WALL + 6);
      // контейнеры
      const cont = [];
      const palette = ['#b5482a', '#2a5fa8', '#2f8a4a', '#e07a1e', '#8a8f96', '#c9a227', '#7a2a2a'].map((h) => col(h));
      for (let s = 0; s < sEnd; s += 26 / dens) {
        for (const sd of [-1, 1]) {
          if (R() > 0.55) continue;
          const off = WALL + RR(8, 70);
          const p = track.pointAt(s, sd * off);
          if (!placer.free(p.x, p.z, 8, 3)) continue;
          placer.add(p.x, p.z, 8);
          const rows = randInt(1, 3), stack = randInt(1, 3);
          for (let a = 0; a < rows; a++) {
            for (let b = 0; b < stack; b++) {
              if (b > 0 && R() < 0.3) continue;
              const ox = (a - (rows - 1) / 2) * 2.6;
              cont.push({ x: p.x + Math.cos(p.h) * ox, y: 1.3 + b * 2.6, z: p.z - Math.sin(p.h) * ox, ry: p.h + Math.PI / 2 + (R() < 0.2 ? 0.08 : 0), color: pick(palette) });
            }
          }
        }
      }
      const cm = new THREE.MeshStandardMaterial({ map: Tex.get('container'), roughness: 0.7, metalness: 0.3 });
      put(instanced(new THREE.BoxGeometry(12.2, 2.6, 2.44), cm, cont, true, true));
      // портовые краны
      const craneMat = new THREE.MeshStandardMaterial({ color: col('#d8a21e'), metalness: 0.4, roughness: 0.6 });
      for (let k = 0; k < 4; k++) {
        const x = track.bounds.minX + (k + 0.5) / 4 * (track.bounds.maxX - track.bounds.minX);
        const z = waterZ + 10;
        if (track.minDist(x, z) < WALL + 24) continue;
        const g = new THREE.Group();
        g.position.set(x, 0, z);
        [[-6, -5], [6, -5], [-6, 5], [6, 5]].forEach(([a, b]) => {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(1, 34, 1), craneMat);
          leg.position.set(a, 17, b);
          g.add(leg);
        });
        const top = new THREE.Mesh(new THREE.BoxGeometry(14, 3, 12), craneMat);
        top.position.y = 34;
        g.add(top);
        const boom = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 60), craneMat);
        boom.position.set(0, 36, -22);
        g.add(boom);
        g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        scene.add(g);
      }
      addTrees(120, WALL + 3, WALL + 30, false);
      addSkyline(50 * dens);
    } else if (theme === 'forest') {
      addTrees(3600, WALL + 4, WALL + 140, true);
      addTrees(500, WALL + 5, WALL + 90, false);
      // камни
      const rocks = [];
      for (let k = 0; k < 220 * dens; k++) {
        const p = track.pointAt(R() * sEnd, (R() < 0.5 ? -1 : 1) * RR(WALL + 3, WALL + 60));
        const sc = RR(0.6, 2.4);
        if (!placer.free(p.x, p.z, sc, 1)) continue;
        rocks.push({ x: p.x, y: sc * 0.2, z: p.z, sx: sc * RR(1, 1.6), sy: sc * RR(0.6, 1), sz: sc, ry: R() * 6, rx: R() });
      }
      put(instanced(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: col('#7c7a74'), roughness: 0.95, flatShading: true }), rocks, true));
      addHills(55, '#4f6b3a');
    } else {
      // пригород: дома с крышами, магазины, деревья
      const houses = [], roofs = [];
      const wallColors = ['#e8dcc5', '#d9c3a5', '#c8d3d9', '#e3c9b8', '#cfd8c0', '#f0e6d2'].map((h) => col(h));
      const roofColors = ['#6a2c22', '#3d4249', '#5b3a2a', '#2f3b46'].map((h) => col(h));
      for (let s = 0; s < sEnd; s += 26 / dens) {
        for (const sd of [-1, 1]) {
          for (let row = 0; row < 2; row++) {
            if (R() > 0.75) continue;
            const w = RR(9, 13), d = RR(9, 12), h = RR(5.5, 7.5);
            const off = WALL + 10 + row * 30 + RR(0, 6) + w / 2;
            const p = track.pointAt(s + RR(-4, 4), sd * off);
            if (!placer.free(p.x, p.z, w * 0.7, 3)) continue;
            placer.add(p.x, p.z, w * 0.7);
            houses.push({ x: p.x, z: p.z, ry: p.h, sx: w / 10, sy: h / 6, sz: d / 10, color: pick(wallColors) });
            roofs.push({ x: p.x, y: h, z: p.z, ry: p.h + Math.PI / 4, sx: w / 10 * 1.05, sy: RR(0.9, 1.2), sz: d / 10 * 1.05, color: pick(roofColors) });
          }
        }
      }
      const f = Tex.facade('house');
      const hm = new THREE.MeshStandardMaterial({ map: f.map, emissiveMap: f.em, emissive: col('#ffd59a'), emissiveIntensity: preset.windows * 1.3, roughness: 0.85 });
      const rm = new THREE.MeshStandardMaterial({ color: col('#ffffff'), roughness: 0.8, flatShading: true });
      put(instanced(buildingGeo(10, 6, 10, 8, 6), [hm, hm, hm, hm, hm, hm], houses, true, true));
      const roofGeo = new THREE.ConeGeometry(7.4, 3.6, 4, 1);
      roofGeo.translate(0, 1.8, 0);
      put(instanced(roofGeo, rm, roofs, true));
      addBuildings([{ w: 26, d: 20, h: 12, style: 'brick' }, { w: 22, d: 22, h: 18, style: 'panel' }], 1, 120, WALL + 20);
      addTrees(1300, WALL + 3, WALL + 80, false);
      addTrees(300, WALL + 20, WALL + 100, true);
      addBillboards(6);
      addHills(40, '#62804a');
    }

    return out;
  }

  /* ========================================================
     ФИЗИКА МАШИНЫ (аркадная модель с заносом)
     ======================================================== */
  const GEARS = [0.27, 0.43, 0.58, 0.72, 0.86, 1.04];
  const _proj = { i: 0, s: 0, lat: 0, along: 0, tx: 0, tz: 1, rx: -1, rz: 0 };

  class Car {
    constructor(spec, color, name, isPlayer) {
      this.spec = spec;
      this.color = color;
      this.name = name;
      this.isPlayer = isPlayer;
      this.model = buildCarModel(spec, color);
      this.half = spec.dims.W / 2;
      this.x = 0; this.z = 0; this.h = 0;
      this.vx = 0; this.vz = 0; this.w = 0;
      this.steer = 0;
      this.input = { throttle: 0, brake: 0, steer: 0, hand: false, nitro: false };
      this.nitro = spec.nitro;
      this.nitroOn = false;
      this.gear = 1; this.rpm = 900; this.shiftT = 0;
      this.vF = 0; this.vR = 0; this.speed = 0; this.aLong = 0; this.aLat = 0;
      this.roll = 0; this.pitch = 0; this.wheelRot = 0; this.wheelRotRear = 0;
      this.ti = -1; this.s = 0; this.lat = 0;
      this.progress = 0; this.prevS = null;
      this.lapsDone = 0; this.lapStart = 0; this.lapTimes = []; this.bestLap = null;
      this.finished = false; this.finishTime = null; this.place = 0;
      this.wallHit = 0; this.wrongT = 0; this.stuckT = 0; this.slip = 0;
      this.ghost = 0;
      this.skid = [null, null];
      this.ai = null;
      this.distance = 0;
      this.lift = 0;
    }

    place2(x, z, h) {
      this.x = x; this.z = z; this.h = h;
      this.vx = this.vz = this.w = this.steer = 0;
      this.vF = this.vR = this.speed = 0;
    }

    step(dt, track) {
      const sp = this.spec, inp = this.input;
      const throttle = inp.throttle, brake = inp.brake, hand = inp.hand;
      const fx = Math.sin(this.h), fz = Math.cos(this.h);
      const rx = -fz, rz = fx;
      let vF = this.vx * fx + this.vz * fz;
      let vR = this.vx * rx + this.vz * rz;
      const vFold = vF;
      const off = Math.abs(this.lat) > ROAD_HALF + 0.4;
      const grip = sp.grip * (off ? 0.8 : 1);
      let vmax = sp.vmax * (off ? 0.8 : 1);
      let acc = sp.accel;

      // нитро
      const nitroOn = inp.nitro && this.nitro > 0.02 && throttle > 0.2 && vF > 4;
      this.nitroOn = nitroOn;
      if (nitroOn) {
        vmax *= 1.17;
        acc *= 1.6;
        this.nitro = Math.max(0, this.nitro - dt);
      } else {
        const driftBonus = Math.abs(vR) > 4 && vF > 15 ? 0.14 : 0;
        this.nitro = Math.min(sp.nitro, this.nitro + dt * sp.nitro * (0.035 + driftBonus));
      }
      if (this.shiftT > 0) { this.shiftT -= dt; acc *= 0.45; }

      // продольные силы
      let aDrive = 0, aRes = 0;
      const ratio = Math.max(0, vF) / vmax;
      if (throttle > 0) {
        if (vF >= -0.5) aDrive += acc * throttle * Math.max(0, 1 - Math.pow(ratio, 2.4));
        else aRes += sp.brake * throttle;
      }
      if (brake > 0) {
        if (vF > 0.8) aRes += sp.brake * brake;
        else if (vF > -13 && throttle === 0) aDrive -= 7 * brake;
      }
      aRes += 0.35 + 0.00042 * vF * vF * (throttle > 0 ? 0.35 : 1) + (off ? 0.12 * Math.abs(vF) : 0);
      if (ratio > 1) aRes += (ratio - 1) * 10;
      if (hand) aRes += 5.5;
      vF += aDrive * dt;
      const dec = aRes * dt;
      vF = Math.abs(vF) <= dec ? 0 : vF - Math.sign(vF) * dec;
      this.aLong = lerp(this.aLong, (vF - vFold) / dt, 0.2);

      // руль и поворот
      const speedAbs = Math.abs(vF);
      const steerMax = lerp(0.6, 0.12, clamp(speedAbs / 62, 0, 1)) * sp.steer;
      const target = inp.steer * steerMax;
      const rate = Math.abs(target) < Math.abs(this.steer) ? 4.5 : 2.6;
      this.steer += clamp(target - this.steer, -rate * dt, rate * dt);
      let wT = -(vF / sp.dims.wb) * Math.tan(this.steer);
      if (!hand) {
        const wLim = (grip * 1.08) / Math.max(speedAbs, 2);
        wT = clamp(wT, -wLim, wLim);
      } else {
        wT *= 1.5;
      }
      const resp = hand ? 4 : 7.5;
      this.w += (wT - this.w) * Math.min(1, resp * dt);
      this.h += this.w * dt;

      // боковое сцепление (если превышено — машина скользит)
      const latMax = grip * (hand ? 0.3 : 1) * dt;
      const corr = vR * (1 - Math.exp(-13 * dt));
      vR -= clamp(corr, -latMax, latMax);

      this.vx = fx * vF + rx * vR;
      this.vz = fz * vF + rz * vR;
      this.x += this.vx * dt;
      this.z += this.vz * dt;
      this.vF = vF;
      this.vR = vR;
      this.speed = Math.hypot(this.vx, this.vz);
      this.aLat = lerp(this.aLat, -vF * this.w, 0.2);
      this.distance += this.speed * dt;
      const brakeSlip = brake > 0.5 && vF > 18 ? 0.5 : 0;
      const spin = throttle > 0.8 && vF > 0 && vF < 9 && this.gear === 1 ? 0.6 : 0;
      this.slip = clamp(Math.max((Math.abs(vR) - 2.2) / 6, brakeSlip, spin, hand && speedAbs > 8 ? 0.7 : 0), 0, 1);
      if (this.ghost > 0) this.ghost -= dt;
      this.collideTrack(track);
    }

    collideTrack(track) {
      const p = track.project(this.x, this.z, this.ti, _proj);
      this.ti = p.i;
      this.s = p.s;
      this.lat = p.lat;
      const lim = WALL - this.half - 0.08;
      if (Math.abs(p.lat) > lim) {
        const sgn = Math.sign(p.lat);
        const pen = Math.abs(p.lat) - lim;
        const nx = p.rx * sgn, nz = p.rz * sgn;
        this.x -= nx * pen;
        this.z -= nz * pen;
        this.lat = sgn * lim;
        const vn = this.vx * nx + this.vz * nz;
        if (vn > 0) {
          this.vx -= nx * vn * 1.3;
          this.vz -= nz * vn * 1.3;
          const fr = clamp(0.015 + vn * 0.025, 0, 0.45);
          this.vx *= 1 - fr;
          this.vz *= 1 - fr;
          if (vn > this.wallHit) this.wallHit = vn;
          const th = Math.atan2(p.tx, p.tz);
          const fwd = Math.cos(this.h - th) >= 0 ? th : th + Math.PI;
          this.h += wrapAngle(fwd - this.h) * clamp(vn * 0.03, 0.02, 0.35);
          this.w *= 0.5;
        }
      }
      if (!track.closed) {
        const lo = 6, hi = track.length - 6;
        const sRaw = p.i * track.ds + p.along;
        let push = 0;
        if (sRaw < lo) push = lo - sRaw;
        else if (sRaw > hi) push = hi - sRaw;
        if (push !== 0) {
          this.x += p.tx * push;
          this.z += p.tz * push;
          const vt = this.vx * p.tx + this.vz * p.tz;
          if (vt * push < 0) {
            this.vx -= p.tx * vt * 1.2;
            this.vz -= p.tz * vt * 1.2;
            this.wallHit = Math.max(this.wallHit, Math.abs(vt));
          }
        }
      }
    }

    updateProgress(track) {
      if (this.prevS === null) { this.prevS = this.s; return; }
      let d = this.s - this.prevS;
      if (track.closed) {
        const L = track.length;
        if (d < -L / 2) d += L;
        else if (d > L / 2) d -= L;
      }
      this.progress += d;
      this.prevS = this.s;
    }

    updateEngine(dt, revOnly) {
      const sp = this.spec;
      const v = Math.abs(this.vF);
      if (!revOnly) {
        const top = sp.vmax * GEARS[this.gear - 1];
        const low = this.gear > 1 ? sp.vmax * GEARS[this.gear - 2] : 0;
        if (this.vF > top * 0.97 && this.gear < GEARS.length && this.input.throttle > 0.1) {
          this.gear++;
          this.shiftT = 0.15;
          if (this.isPlayer) SFX.shift();
        } else if (this.gear > 1 && this.vF < low * 0.8) {
          this.gear--;
        }
      }
      const top = sp.vmax * GEARS[this.gear - 1];
      let target = 900 + 6900 * clamp(v / top, 0, 1.04);
      if (revOnly) target = 900 + this.input.throttle * 6200;
      else if (this.gear === 1 && this.input.throttle > 0 && v < 6) target = Math.max(target, 2600 + this.input.throttle * 2600);
      if (this.slip > 0.5 && this.input.throttle > 0) target += 600;
      this.rpm += (target - this.rpm) * Math.min(1, dt * (revOnly ? 6 : 12));
      this.rpm = clamp(this.rpm, 800, 8200);
    }

    syncModel(dt, lightLevel, time, cam) {
      const m = this.model;
      const curb = Math.abs(this.lat) > ROAD_HALF + 0.15 ? 0.09 : 0;
      this.lift += (curb - this.lift) * Math.min(1, dt * 12);
      m.root.position.set(this.x, this.lift, this.z);
      m.root.rotation.y = this.h;
      const rollT = clamp(-this.aLat * 0.0042, -0.075, 0.075);
      const pitchT = clamp(-this.aLong * 0.0032, -0.05, 0.05);
      this.roll += (rollT - this.roll) * Math.min(1, dt * 6);
      this.pitch += (pitchT - this.pitch) * Math.min(1, dt * 6);
      m.body.rotation.z = this.roll;
      m.body.rotation.x = this.pitch;
      m.body.position.y = Math.sin(time * 37 + this.x) * 0.004 * clamp(this.speed / 40, 0, 1);
      this.wheelRot += (this.vF * dt) / m.R;
      if (!this.input.hand) this.wheelRotRear = this.wheelRot;
      for (const w of m.wheels) {
        w.spin.rotation.x = w.front ? this.wheelRot : this.wheelRotRear;
        if (w.front) w.pivot.rotation.y = -this.steer;
      }
      const braking = this.input.brake > 0 && this.vF > 1;
      let front = 1, back = 1;
      if (cam) {
        const vx = cam.x - this.x, vz = cam.z - this.z;
        const dot = (vx * Math.sin(this.h) + vz * Math.cos(this.h)) / (Math.hypot(vx, vz) || 1);
        front = clamp(dot * 1.8 + 0.1, 0, 1);
        back = clamp(-dot * 1.8 + 0.1, 0, 1);
      }
      m.tailMat.emissiveIntensity = braking ? 3 : 0.4 + lightLevel * 0.9;
      m.tailGlow.forEach((g) => { g.material.opacity = (braking ? 0.9 : lightLevel * 0.5) * back; });
      m.headMat.emissiveIntensity = 0.4 + lightLevel * 2.4;
      m.headGlow.forEach((g) => { g.material.opacity = lightLevel * 0.9 * front; });
      m.pool.visible = lightLevel > 0.05;
      m.pool.material.opacity = lightLevel * 0.32;
      for (const f of m.flames) {
        f.visible = this.nitroOn;
        if (this.nitroOn) {
          const k = rand(0.7, 1.35);
          f.scale.set(k, k * rand(0.8, 1.4), k);
        }
      }
    }
  }

  /* ---------- Столкновения машин между собой ---------- */
  const _ca = [{ x: 0, z: 0 }, { x: 0, z: 0 }], _cb = [{ x: 0, z: 0 }, { x: 0, z: 0 }];
  function carCircles(c, out) {
    const off = c.spec.dims.L / 2 - 1.0;
    const fx = Math.sin(c.h), fz = Math.cos(c.h);
    out[0].x = c.x + fx * off; out[0].z = c.z + fz * off;
    out[1].x = c.x - fx * off; out[1].z = c.z - fz * off;
  }
  function collideCars(cars, onHit) {
    for (let i = 0; i < cars.length; i++) {
      const a = cars[i];
      for (let j = i + 1; j < cars.length; j++) {
        const b = cars[j];
        if (a.ghost > 0 || b.ghost > 0) continue;
        if (Math.abs(a.x - b.x) > 7 || Math.abs(a.z - b.z) > 7) continue;
        carCircles(a, _ca);
        carCircles(b, _cb);
        const ra = a.half + 0.08, rb = b.half + 0.08;
        for (let p = 0; p < 2; p++) {
          for (let k = 0; k < 2; k++) {
            const dx = _cb[k].x - _ca[p].x, dz = _cb[k].z - _ca[p].z;
            const d = Math.hypot(dx, dz);
            const minD = ra + rb;
            if (d >= minD || d < 1e-4) continue;
            const nx = dx / d, nz = dz / d;
            const ma = a.spec.mass, mb = b.spec.mass;
            const ov = minD - d;
            a.x -= nx * ov * mb / (ma + mb); a.z -= nz * ov * mb / (ma + mb);
            b.x += nx * ov * ma / (ma + mb); b.z += nz * ov * ma / (ma + mb);
            const vrel = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
            if (vrel < 0) {
              const J = -(1.25 * vrel) / (1 / ma + 1 / mb);
              a.vx -= (J / ma) * nx; a.vz -= (J / ma) * nz;
              b.vx += (J / mb) * nx; b.vz += (J / mb) * nz;
              const rax = _ca[p].x - a.x, raz = _ca[p].z - a.z;
              const rbx = _cb[k].x - b.x, rbz = _cb[k].z - b.z;
              const tA = (-J * nx) * raz - (-J * nz) * rax;
              const tB = (J * nx) * rbz - (J * nz) * rbx;
              a.w += clamp(tA * 0.05 / ma, -1.2, 1.2);
              b.w += clamp(tB * 0.05 / mb, -1.2, 1.2);
              if (onHit) onHit(a, b, -vrel, (_ca[p].x + _cb[k].x) / 2, (_ca[p].z + _cb[k].z) / 2);
            }
          }
        }
      }
    }
  }

  /* ========================================================
     ИИ СОПЕРНИКОВ
     ======================================================== */
  class AIDriver {
    constructor(car, diff) {
      this.car = car;
      this.skill = clamp(diff.skill + rand(-0.03, 0.015), 0.7, 1.0);
      this.rubber = diff.rubber;
      this.lane = rand(-3.5, 3.5);
      this.laneT = rand(3, 8);
      this.cur = car.lat;
      this.react = rand(0.05, 0.45);
      this.nitroBias = rand(0.4, 1);
      this.nitroing = false;
    }
    update(dt, race) {
      const c = this.car, tr = race.track, inp = c.input;
      if (this.react > 0) {
        this.react -= dt;
        inp.throttle = 0.4; inp.brake = 0.5; inp.steer = 0;
        return;
      }
      const v = Math.max(c.vF, 0);
      const i = c.ti;
      this.laneT -= dt;
      if (this.laneT < 0) { this.lane = rand(-4, 4); this.laneT = rand(4, 9); }
      const kA = tr.curv[tr.idx(i + Math.round((18 + v * 0.9) / tr.ds))];
      const inside = clamp(kA * 140, -1, 1) * (ROAD_HALF - 2.4);
      const lim = ROAD_HALF - 1.7;
      let desired = clamp(this.lane * (1 - Math.min(1, Math.abs(kA) * 260)) + inside, -lim, lim);
      let slow = 1;
      for (const o of race.cars) {
        if (o === c) continue;
        const dp = o.progress - c.progress;
        if (dp <= 0 || dp > 14 + v * 0.45) continue;
        if (Math.abs(o.lat - this.cur) < 2.7) {
          const goRight = o.lat < 0;
          desired = clamp(o.lat + (goRight ? 3.4 : -3.4), -lim, lim);
          if (dp < 7.5 && o.vF < c.vF) slow = Math.min(slow, 0.93);
        }
      }
      this.cur += clamp(desired - this.cur, -dt * 4, dt * 4);
      const ia = tr.idx(i + Math.round((7 + v * 0.42) / tr.ds));
      const tx = tr.px[ia] + tr.rx[ia] * this.cur, tz = tr.pz[ia] + tr.rz[ia] * this.cur;
      const err = wrapAngle(Math.atan2(tx - c.x, tz - c.z) - c.h);
      inp.steer = clamp(-err * 3.2 + c.w * 0.22, -1, 1);

      const gk = Math.sqrt(c.spec.grip);
      const vC = Math.min(tr.vbase[i], tr.vbase[tr.idx(i + 3)], tr.vbase[tr.idx(i + 6)]) * gk;
      let vt = Math.min(vC * (0.9 + 0.1 * this.skill), c.spec.vmax * this.skill);
      const gap = c.progress - race.player.progress;
      const rb = 1 - clamp(gap / 350, -1, 1) * this.rubber * 0.14;
      vt = Math.min(vt * rb, vC) * slow;
      const dv = vt - c.vF;
      inp.throttle = dv > 0 ? clamp(0.35 + dv * 0.25, 0, 1) : 0;
      inp.brake = dv < -1.5 ? clamp(-dv * 0.18, 0.2, 1) : 0;
      inp.hand = false;
      if (!this.nitroing && c.nitro > c.spec.nitro * 0.5 && dv > 8 && Math.abs(kA) < 0.004 && Math.random() < dt * this.nitroBias * this.skill) this.nitroing = true;
      if (this.nitroing && (c.nitro < 0.1 || dv < 2 || Math.abs(kA) > 0.008)) this.nitroing = false;
      inp.nitro = this.nitroing;
    }
  }

  /* ========================================================
     ЭФФЕКТЫ: дым, искры, следы шин, камера
     ======================================================== */
  class Particles {
    constructor(max, tex, additive) {
      this.max = max;
      this.count = 0;
      this.pos = new Float32Array(max * 3);
      this.vel = new Float32Array(max * 3);
      this.col = new Float32Array(max * 3);
      this.size = new Float32Array(max);
      this.alpha = new Float32Array(max);
      this.life = new Float32Array(max);
      this.maxLife = new Float32Array(max);
      this.grow = new Float32Array(max);
      this.a0 = new Float32Array(max);
      this.geo = new THREE.BufferGeometry();
      this.attr = {
        position: new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage),
        size: new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage),
        alpha: new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage),
        pcol: new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage)
      };
      for (const k in this.attr) this.geo.setAttribute(k, this.attr[k]);
      this.geo.setDrawRange(0, 0);
      this.mat = new THREE.ShaderMaterial({
        uniforms: { map: { value: tex }, scale: { value: 600 } },
        vertexShader: [
          'attribute float size; attribute float alpha; attribute vec3 pcol;',
          'uniform float scale; varying float vA; varying vec3 vC;',
          'void main() {',
          '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
          '  gl_PointSize = size * scale / max(-mv.z, 0.2);',
          '  gl_Position = projectionMatrix * mv;',
          '  vA = alpha; vC = pcol;',
          '}'
        ].join('\n'),
        fragmentShader: [
          'uniform sampler2D map; varying float vA; varying vec3 vC;',
          'void main() {',
          '  vec4 t = texture2D(map, gl_PointCoord);',
          '  float a = t.a * vA;',
          '  if (a < 0.004) discard;',
          '  gl_FragColor = vec4(vC, a);',
          '}'
        ].join('\n'),
        transparent: true,
        depthWrite: false,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
      });
      this.points = new THREE.Points(this.geo, this.mat);
      this.points.frustumCulled = false;
      this.points.renderOrder = 5;
    }
    spawn(x, y, z, vx, vy, vz, life, size, grow, alpha, r, g, b) {
      if (this.count >= this.max) return;
      const i = this.count++;
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
      this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
      this.col[i * 3] = r; this.col[i * 3 + 1] = g; this.col[i * 3 + 2] = b;
      this.life[i] = life; this.maxLife[i] = life;
      this.size[i] = size; this.grow[i] = grow;
      this.a0[i] = alpha; this.alpha[i] = alpha;
    }
    update(dt, drag, gravity) {
      const k = Math.exp(-drag * dt);
      let i = 0;
      while (i < this.count) {
        this.life[i] -= dt;
        if (this.life[i] <= 0) {
          const last = --this.count;
          if (i !== last) {
            for (let c = 0; c < 3; c++) {
              this.pos[i * 3 + c] = this.pos[last * 3 + c];
              this.vel[i * 3 + c] = this.vel[last * 3 + c];
              this.col[i * 3 + c] = this.col[last * 3 + c];
            }
            this.life[i] = this.life[last]; this.maxLife[i] = this.maxLife[last];
            this.size[i] = this.size[last]; this.grow[i] = this.grow[last];
            this.a0[i] = this.a0[last]; this.alpha[i] = this.alpha[last];
          }
          continue;
        }
        const j = i * 3;
        this.vel[j] *= k; this.vel[j + 2] *= k;
        this.vel[j + 1] = this.vel[j + 1] * k - gravity * dt;
        this.pos[j] += this.vel[j] * dt;
        this.pos[j + 1] += this.vel[j + 1] * dt;
        this.pos[j + 2] += this.vel[j + 2] * dt;
        if (this.pos[j + 1] < 0.05) { this.pos[j + 1] = 0.05; this.vel[j + 1] *= -0.3; }
        this.size[i] += this.grow[i] * dt;
        const t = this.life[i] / this.maxLife[i];
        this.alpha[i] = this.a0[i] * Math.min(1, t * 1.6) * Math.min(1, (1 - t) * 8 + 0.2);
        i++;
      }
      this.geo.setDrawRange(0, this.count);
      for (const key in this.attr) this.attr[key].needsUpdate = true;
    }
  }

  class Skids {
    constructor(max) {
      this.max = max;
      this.i = 0;
      this.pos = new Float32Array(max * 12);
      const idx = new Uint32Array(max * 6);
      for (let q = 0; q < max; q++) {
        idx.set([q * 4, q * 4 + 2, q * 4 + 1, q * 4 + 1, q * 4 + 2, q * 4 + 3], q * 6);
      }
      this.geo = new THREE.BufferGeometry();
      this.attr = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
      this.geo.setAttribute('position', this.attr);
      this.geo.setIndex(new THREE.BufferAttribute(idx, 1));
      this.mat = new THREE.MeshBasicMaterial({
        color: 0x050505, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide,
        polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4
      });
      this.mesh = new THREE.Mesh(this.geo, this.mat);
      this.mesh.frustumCulled = false;
      this.mesh.renderOrder = 1;
      this.dirty = false;
    }
    add(ax, az, bx, bz, w) {
      const dx = bx - ax, dz = bz - az;
      const len = Math.hypot(dx, dz);
      if (len < 0.05 || len > 4) return;
      const nx = (-dz / len) * w * 0.5, nz = (dx / len) * w * 0.5;
      const o = this.i * 12;
      const y = 0.045;
      this.pos[o] = ax - nx; this.pos[o + 1] = y; this.pos[o + 2] = az - nz;
      this.pos[o + 3] = ax + nx; this.pos[o + 4] = y; this.pos[o + 5] = az + nz;
      this.pos[o + 6] = bx - nx; this.pos[o + 7] = y; this.pos[o + 8] = bz - nz;
      this.pos[o + 9] = bx + nx; this.pos[o + 10] = y; this.pos[o + 11] = bz + nz;
      this.i = (this.i + 1) % this.max;
      this.dirty = true;
    }
    flush() {
      if (this.dirty) { this.attr.needsUpdate = true; this.dirty = false; }
    }
  }

  /* ---------- Камера преследования ---------- */
  const CAM_MODES = [
    { dist: 7.2, height: 2.45, look: 1.25, fov: 64 },
    { dist: 5.2, height: 1.7, look: 1.0, fov: 68 },
    { bumper: true, fov: 76 }
  ];

  class ChaseCam {
    constructor(camera) {
      this.cam = camera;
      this.mode = Save.data.settings.camera;
      this.yaw = 0;
      this.off = new THREE.Vector3();
      this.lookAt = new THREE.Vector3();
      this.shake = 0;
      this.fov = 64;
      this.ready = false;
    }
    update(dt, car, introT) {
      const sp = car.spec;
      const speedK = clamp(car.speed / sp.vmax, 0, 1.2);
      let targetYaw = car.h;
      if (car.speed > 4 && car.vF > 0) {
        const vh = Math.atan2(car.vx, car.vz);
        targetYaw = car.h + wrapAngle(vh - car.h) * 0.45;
      }
      if (!this.ready) { this.yaw = targetYaw; }
      this.yaw += wrapAngle(targetYaw - this.yaw) * Math.min(1, dt * 4.5);
      const m = CAM_MODES[this.mode];
      const cam = this.cam;
      let fovT;
      if (m.bumper && introT >= 1) {
        const fx = Math.sin(car.h), fz = Math.cos(car.h);
        const hl = sp.dims.L / 2;
        cam.position.set(car.x + fx * (hl + 0.1), 0.62 + car.model.body.position.y, car.z + fz * (hl + 0.1));
        this.lookAt.set(car.x + fx * 30, 0.9, car.z + fz * 30);
        fovT = m.fov + speedK * 10 + (car.nitroOn ? 8 : 0);
      } else {
        const mm = m.bumper ? CAM_MODES[0] : m;
        let yaw = this.yaw;
        let dist = mm.dist + speedK * 0.9 - clamp(car.aLong, -15, 15) * 0.03;
        let h = mm.height;
        if (introT < 1) {
          const t = smooth(clamp(introT, 0, 1));
          yaw = this.yaw + lerp(2.5, 0, t);
          dist = lerp(10, dist, t);
          h = lerp(1.1, mm.height, t);
        }
        const tx = -Math.sin(yaw) * dist, tz = -Math.cos(yaw) * dist;
        if (!this.ready) this.off.set(tx, h, tz);
        const k = 1 - Math.exp(-dt * 10);
        this.off.x += (tx - this.off.x) * k;
        this.off.y += (h - this.off.y) * k;
        this.off.z += (tz - this.off.z) * k;
        cam.position.set(car.x + this.off.x, Math.max(0.5, this.off.y), car.z + this.off.z);
        this.lookAt.set(car.x + Math.sin(yaw) * 4, mm.look, car.z + Math.cos(yaw) * 4);
        fovT = mm.fov + speedK * 13 + (car.nitroOn ? 8 : 0);
      }
      this.ready = true;
      // тряска
      this.shake = Math.max(0, this.shake - dt * 2.5);
      const sh = this.shake * 0.35 + (speedK > 0.75 ? (speedK - 0.75) * 0.05 : 0) + (car.nitroOn ? 0.02 : 0);
      if (sh > 0) {
        cam.position.x += rand(-sh, sh);
        cam.position.y += rand(-sh, sh) * 0.6;
        cam.position.z += rand(-sh, sh);
      }
      cam.lookAt(this.lookAt);
      this.fov += (fovT - this.fov) * Math.min(1, dt * 3);
      if (Math.abs(cam.fov - this.fov) > 0.01) {
        cam.fov = this.fov;
        cam.updateProjectionMatrix();
      }
    }
    cycle() {
      this.mode = (this.mode + 1) % CAM_MODES.length;
    }
  }

  /* ========================================================
     ГОНКА: машины, правила, круги, позиции, финиш
     ======================================================== */
  const PRE_TIME = 4.2;   // интро-облёт камеры + отсчёт 3-2-1

  const Input = {
    keys: {},
    pressed: {},
    down(code) { if (!this.keys[code]) this.pressed[code] = true; this.keys[code] = true; },
    up(code) { this.keys[code] = false; },
    take(code) { const p = !!this.pressed[code]; this.pressed[code] = false; return p; },
    clear() { this.keys = {}; this.pressed = {}; }
  };

  class Race {
    constructor(setup, camera) {
      this.setup = Object.assign({}, setup);
      this.def = trackById(setup.track);
      this.track = new Track(this.def);
      this.preset = TIMES[setup.time];
      this.diff = DIFFICULTY[setup.difficulty];
      this.laps = this.track.closed ? setup.laps : 1;
      this.raceDist = this.track.closed ? this.laps * this.track.length : this.track.raceLen;
      this.camera = camera;
      this.scene = new THREE.Scene();
      this.world = buildWorld(this);
      this.lightLevel = this.preset.night ? 1 : setup.time === 'sunset' ? 0.45 : 0;

      this.smoke = new Particles(900, Tex.get('smoke'), false);
      this.sparks = new Particles(600, Tex.get('soft'), true);
      this.skids = new Skids(3000);
      this.scene.add(this.smoke.points, this.sparks.points, this.skids.mesh);
      this.smokeCol = col(this.preset.smoke);

      this.cars = [];
      this.createCars();
      this.chase = new ChaseCam(camera);
      camera.near = 0.3;
      camera.far = 4000;
      camera.fov = 64;
      camera.updateProjectionMatrix();

      this.state = 'pre';
      this.pre = 0;
      this.t = 0;
      this.acc = 0;
      this.clock = 0;
      this.cdShown = -1;
      this.finishedCount = 0;
      this.resultsTimer = -1;
      this.playerDone = false;
      this.flash = 0;
      this.respawnCd = 0;
      this.order = this.cars.slice();
      this.computePositions();
      SFX.startRace(this.cars.length - 1);
    }

    createCars() {
      const setup = this.setup;
      const n = setup.opponents + 1;
      const names = RIVAL_NAMES.slice().sort(() => Math.random() - 0.5);
      const pIdx = Math.max(0, CARS.findIndex((c) => c.id === Save.data.car));
      const playerColor = Save.carColor(Save.data.car);
      const freeColors = CAR_COLORS.map((c) => c.hex).filter((h) => h !== playerColor);
      for (let k = 0; k < n; k++) {
        const isPlayer = k === n - 1;
        let spec, color, name;
        if (isPlayer) {
          spec = carById(Save.data.car);
          color = playerColor;
          name = Save.data.name || 'Игрок';
        } else {
          spec = CARS[clamp(pIdx + randInt(-1, 1), 0, CARS.length - 1)];
          color = freeColors[(k + randInt(0, 9)) % freeColors.length];
          name = names[k % names.length];
        }
        const car = new Car(spec, color, name, isPlayer);
        const row = Math.floor(k / 2), colm = k % 2;
        const back = 12 + row * 9 + colm * 4.5;
        const lat = colm === 0 ? -3.6 : 3.6;
        const p = this.track.pointAt(this.track.startS - back, lat);
        car.place2(p.x, p.z, p.h);
        car.collideTrack(this.track);
        car.progress = -back;
        car.prevS = car.s;
        if (!isPlayer) car.ai = new AIDriver(car, this.diff);
        this.scene.add(car.model.root);
        this.cars.push(car);
        if (isPlayer) this.player = car;
      }
      if (this.lightLevel > 0.3) {
        const L = this.player.spec.dims.L;
        const spot = new THREE.SpotLight(0xfff1d6, 2.4 * this.lightLevel, 120, 0.52, 0.6, 1.2);
        spot.position.set(0, 0.9, L / 2);
        spot.target.position.set(0, 0, 36);
        this.player.model.root.add(spot, spot.target);
      }
    }

    readPlayerInput() {
      const c = this.player;
      if (c.finished && c.ai) return;
      const k = Input.keys;
      const inp = c.input;
      inp.throttle = k.KeyW || k.ArrowUp ? 1 : 0;
      inp.brake = k.KeyS || k.ArrowDown ? 1 : 0;
      inp.steer = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
      inp.hand = !!k.Space;
      inp.nitro = !!(k.ShiftLeft || k.ShiftRight);
    }

    update(dt) {
      this.clock += dt;
      if (Input.take('KeyC')) this.chase.cycle();
      this.respawnCd -= dt;
      if (Input.take('KeyR') && this.state === 'race' && this.respawnCd <= 0 && !this.player.finished) {
        this.respawn(this.player);
        this.respawnCd = 2;
      }

      if (this.state === 'pre') {
        this.pre += dt;
        this.readPlayerInput();
        for (const c of this.cars) {
          if (c.ai) c.input.throttle = Math.random() < 0.04 ? rand(0.3, 1) : c.input.throttle * 0.97;
          c.updateEngine(dt, true);
        }
        const step = Math.floor(this.pre - (PRE_TIME - 3));
        if (step >= 0 && step < 3 && step !== this.cdShown) {
          this.cdShown = step;
          HUD.countdown(String(3 - step), false);
          SFX.beep(440, 0.25, 0.25);
        }
        if (this.pre >= PRE_TIME) {
          this.state = 'race';
          this.t = 0;
          HUD.countdown('GO!', true);
          SFX.beep(880, 0.6, 0.3);
          for (const c of this.cars) { c.lapStart = 0; c.rpm = Math.max(c.rpm, 3000); }
        }
      } else {
        this.acc += dt;
        let steps = 0;
        while (this.acc >= PHYS_STEP && steps < 10) {
          this.physStep(PHYS_STEP);
          this.acc -= PHYS_STEP;
          steps++;
        }
        if (steps >= 10) this.acc = 0;
        this.checkStuck(dt);
      }

      this.computePositions();
      for (const c of this.cars) {
        c.syncModel(dt, this.lightLevel, this.clock, this.camera.position);
        c.model.root.visible = c.ghost > 0 ? Math.floor(this.clock * 12) % 2 === 0 : true;
      }
      this.emitEffects(dt);
      this.smoke.update(dt, 1.2, -0.4);
      this.sparks.update(dt, 2.0, 9);
      this.skids.flush();

      const introT = this.state === 'pre' ? this.pre / (PRE_TIME - 0.6) : 1;
      this.chase.update(dt, this.player, introT);
      const p = this.player;
      const w = this.world;
      w.sun.target.position.set(p.x, 0, p.z);
      w.sun.position.set(p.x + w.sunDir.x * 300, w.sunDir.y * 300, p.z + w.sunDir.z * 300);
      w.sky.position.copy(this.camera.position);
      if (w.stars) w.stars.position.copy(this.camera.position);

      this.flash = Math.max(0, this.flash - dt * 3);
      HUD.update(this, dt);
      this.updateAudio();

      if (this.resultsTimer > 0) {
        this.resultsTimer -= dt;
        if (this.resultsTimer <= 0) Game.showResults();
      }
    }

    physStep(h) {
      if (this.state === 'race') this.t += h;
      this.readPlayerInput();
      for (const c of this.cars) {
        if (c.ai) c.ai.update(h, this);
        if (c.finished && !this.track.closed) {
          c.input.throttle = 0;
          c.input.brake = c.vF > 1 ? 0.75 : 0;
          c.input.nitro = false;
        }
        c.step(h, this.track);
      }
      collideCars(this.cars, (a, b, imp, x, z) => this.onCarHit(a, b, imp, x, z));
      for (const c of this.cars) {
        c.collideTrack(this.track);
        c.updateProgress(this.track);
        c.updateEngine(h, false);
        this.checkLaps(c);
      }
    }

    checkLaps(c) {
      if (c.finished || this.state !== 'race') return;
      if (this.track.closed) {
        const L = this.track.length;
        while (c.progress >= (c.lapsDone + 1) * L) {
          const lt = this.t - c.lapStart;
          c.lapTimes.push(lt);
          if (c.bestLap === null || lt < c.bestLap) c.bestLap = lt;
          c.lapStart = this.t;
          c.lapsDone++;
          if (c.lapsDone >= this.laps) { this.finishCar(c); break; }
          if (c.isPlayer) {
            HUD.msg(c.lapsDone === this.laps - 1 ? 'Последний круг!' : 'Круг ' + (c.lapsDone + 1) + ' / ' + this.laps, fmtTime(lt));
          }
        }
      } else if (c.progress >= this.raceDist) {
        this.finishCar(c);
      }
    }

    finishCar(c) {
      c.finished = true;
      c.finishTime = this.t;
      c.place = ++this.finishedCount;
      if (c.isPlayer) {
        this.playerDone = true;
        HUD.msg(c.place === 1 ? 'Победа!' : 'Финиш · ' + c.place + ' место', fmtTime(c.finishTime));
        const ai = new AIDriver(c, DIFFICULTY.easy);
        ai.react = 0;
        ai.rubber = 0;
        c.ai = ai;
        this.resultsTimer = 3.4;
        SFX.beep(660, 0.15, 0.2, 'triangle');
        setTimeout(() => SFX.beep(990, 0.4, 0.2, 'triangle'), 160);
      }
    }

    computePositions() {
      const sorted = this.cars.slice().sort((a, b) => {
        if (a.finished && b.finished) return a.finishTime - b.finishTime;
        if (a.finished) return -1;
        if (b.finished) return 1;
        return b.progress - a.progress;
      });
      sorted.forEach((c, i) => { c.pos = i + 1; });
      this.order = sorted;
    }

    respawn(c) {
      const p = this.track.pointAt(c.s, clamp(c.lat, -5, 5));
      c.place2(p.x, p.z, p.h);
      c.ghost = 2;
      c.collideTrack(this.track);
      c.prevS = c.s;
      c.stuckT = 0;
      c.wrongT = 0;
      if (c.ai) c.ai.cur = c.lat;
    }

    checkStuck(dt) {
      if (this.state !== 'race') return;
      for (const c of this.cars) {
        const i = c.ti;
        const vt = c.vx * this.track.tx[i] + c.vz * this.track.tz[i];
        if (vt < -2) c.wrongT += dt; else c.wrongT = Math.max(0, c.wrongT - dt * 2);
        if (c.isPlayer && !c.finished) continue;
        if (c.speed < 2) c.stuckT += dt; else c.stuckT = 0;
        if (c.stuckT > 3 || c.wrongT > 2.5) this.respawn(c);
      }
    }

    onCarHit(a, b, imp, x, z) {
      if (imp < 2.5) return;
      const n = Math.min(26, Math.floor(imp * 1.6));
      for (let k = 0; k < n; k++) {
        this.sparks.spawn(x, rand(0.4, 0.9), z, rand(-6, 6), rand(1, 5), rand(-6, 6), rand(0.2, 0.5), rand(0.12, 0.28), -0.2, 1, 1.0, rand(0.5, 0.75), 0.2);
      }
      if (a.isPlayer || b.isPlayer) {
        this.chase.shake = Math.min(1, this.chase.shake + imp * 0.05);
        this.flash = Math.min(0.25, imp * 0.012);
        SFX.crash(imp / 22);
      }
    }

    emitEffects(dt) {
      const fps = dt * 60;
      for (const c of this.cars) {
        const d = c.spec.dims;
        const fx = Math.sin(c.h), fz = Math.cos(c.h), rx = -fz, rz = fx;
        const marks = c.slip > 0.32 && c.speed > 4 && Math.abs(c.lat) < ROAD_HALF + 0.2;
        for (let k = 0; k < 2; k++) {
          const side = k === 0 ? -1 : 1;
          const wx = c.x - fx * d.wb / 2 + rx * side * (d.W / 2 - 0.22);
          const wz = c.z - fz * d.wb / 2 + rz * side * (d.W / 2 - 0.22);
          if (marks) {
            const last = c.skid[k];
            if (last) this.skids.add(last.x, last.z, wx, wz, 0.28);
            c.skid[k] = { x: wx, z: wz };
            if (Math.random() < c.slip * 0.55 * fps) {
              const sc = this.smokeCol;
              this.smoke.spawn(wx, 0.35, wz, -c.vx * 0.08 + rand(-1, 1), rand(0.6, 1.6), -c.vz * 0.08 + rand(-1, 1),
                rand(1.2, 2.4), rand(0.9, 1.5), rand(2.2, 3.4), 0.32 * c.slip + 0.08, sc.r, sc.g, sc.b);
            }
          } else {
            c.skid[k] = null;
          }
        }
        if (c.wallHit > 2.2) {
          const side = Math.sign(c.lat) || 1;
          const sx = c.x + rx * side * c.half, sz = c.z + rz * side * c.half;
          const n = Math.min(30, Math.floor(c.wallHit * 1.4));
          for (let k = 0; k < n; k++) {
            this.sparks.spawn(sx + fx * rand(-1.5, 1.5), rand(0.3, 0.8), sz + fz * rand(-1.5, 1.5),
              c.vx * 0.4 + rand(-4, 4), rand(1, 5), c.vz * 0.4 + rand(-4, 4), rand(0.2, 0.55), rand(0.12, 0.26), -0.2, 1, 1.0, rand(0.45, 0.75), 0.15);
          }
          const dist = Math.hypot(c.x - this.player.x, c.z - this.player.z);
          if (c.isPlayer) {
            this.chase.shake = Math.min(1, this.chase.shake + c.wallHit * 0.04);
            this.flash = Math.min(0.22, c.wallHit * 0.01);
            SFX.crash(c.wallHit / 25);
          } else if (dist < 40) {
            SFX.crash((c.wallHit / 30) * (1 - dist / 40));
          }
        }
        c.wallHit = 0;
        if (c.nitroOn && Math.random() < 0.8 * fps) {
          const ex = c.x - fx * (d.L / 2 + 0.4), ez = c.z - fz * (d.L / 2 + 0.4);
          this.sparks.spawn(ex + rx * rand(-0.4, 0.4), d.clear + 0.12, ez + rz * rand(-0.4, 0.4), c.vx * 0.5 - fx * 6, rand(0, 0.6), c.vz * 0.5 - fz * 6,
            rand(0.1, 0.22), rand(0.3, 0.5), 1.5, 0.8, 0.45, 0.65, 1.0);
        }
      }
    }

    updateAudio() {
      if (!SFX.race) return;
      const p = this.player;
      const rx = -Math.cos(p.h), rz = Math.sin(p.h);
      const ai = [];
      for (const c of this.cars) {
        if (c === p) continue;
        const dx = c.x - p.x, dz = c.z - p.z;
        const d = Math.hypot(dx, dz);
        ai.push({ rpm: c.rpm, load: c.input.throttle, vol: Math.pow(clamp(1 - d / 90, 0, 1), 2), pan: (dx * rx + dz * rz) / 20 });
      }
      SFX.updateRace({
        rpm: p.rpm,
        load: this.state === 'pre' ? p.input.throttle : Math.max(p.input.throttle, 0.15),
        speed: p.speed,
        slip: Math.abs(p.lat) < ROAD_HALF + 0.2 ? p.slip : 0,
        nitro: p.nitroOn,
        ai
      });
    }

    results() {
      const t = this.t;
      return this.cars.map((c) => {
        let time = c.finishTime;
        if (!c.finished) {
          const avg = Math.max(c.progress / Math.max(t, 1), 15);
          time = t + ((this.raceDist - c.progress) / avg) * 1.03;
        }
        return { car: c, time, est: !c.finished, best: c.bestLap };
      }).sort((a, b) => a.time - b.time);
    }

    render() {
      const size = renderer.getDrawingBufferSize(new THREE.Vector2());
      const sc = size.y / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2));
      this.smoke.mat.uniforms.scale.value = sc;
      this.sparks.mat.uniforms.scale.value = sc;
      renderer.toneMappingExposure = this.preset.exposure;
      renderer.render(this.scene, this.camera);
    }

    dispose() {
      SFX.stopRace();
      disposeObject(this.scene);
      if (this.envRT) this.envRT.dispose();
      this.scene.clear();
    }
  }

  /* ========================================================
     HUD: спидометр, миникарта, таблица позиций, время
     ======================================================== */
  const HUD = {
    init() {
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.tacho = $('tacho');
      this.mini = $('minimap');
      this.tacho.width = this.tacho.height = Math.round(260 * this.dpr);
      this.mini.width = this.mini.height = Math.round(220 * this.dpr);
      this.tctx = this.tacho.getContext('2d');
      this.mctx = this.mini.getContext('2d');
      this.el = {
        pos: $('hud-pos'), posWrap: document.querySelector('.hud-pos'), total: $('hud-pos-total'),
        lapWrap: $('hud-lap-wrap'), lap: $('hud-lap'), laps: $('hud-laps'), board: $('board'),
        time: $('hud-time'), lapTime: $('hud-laptime'), lapRow: $('hud-laptime-row'), best: $('hud-best'),
        sprint: $('sprint-bar'), sprintTrack: $('sprint-track'), sprintDist: $('sprint-dist'),
        nitro: $('nitro-fill'), nitroWrap: document.querySelector('.nitro'),
        countdown: $('countdown'), msg: $('hud-msg'), wrong: $('wrongway'),
        speedfx: $('speedfx'), flash: $('flash')
      };
      this.buildTachoBg();
    },

    buildTachoBg() {
      const S = this.tacho.width;
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const g = c.getContext('2d');
      const cx = S / 2, R = S * 0.46;
      const gr = g.createRadialGradient(cx, cx, R * 0.2, cx, cx, R);
      gr.addColorStop(0, 'rgba(14,17,22,0.92)');
      gr.addColorStop(1, 'rgba(6,8,10,0.75)');
      g.fillStyle = gr;
      g.beginPath(); g.arc(cx, cx, R, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.14)';
      g.lineWidth = S * 0.008;
      g.beginPath(); g.arc(cx, cx, R, 0, Math.PI * 2); g.stroke();
      const a0 = Math.PI * 0.75, sweep = Math.PI * 1.5, maxR = 9;
      // красная зона
      g.strokeStyle = 'rgba(255,59,59,0.85)';
      g.lineWidth = S * 0.03;
      g.beginPath(); g.arc(cx, cx, R * 0.86, a0 + (7.2 / maxR) * sweep, a0 + sweep); g.stroke();
      for (let i = 0; i <= maxR * 2; i++) {
        const a = a0 + (i / (maxR * 2)) * sweep;
        const major = i % 2 === 0;
        const r1 = R * (major ? 0.74 : 0.8), r2 = R * 0.9;
        g.strokeStyle = i >= 7.2 * 2 ? '#ff5b5b' : 'rgba(255,255,255,0.8)';
        g.lineWidth = S * (major ? 0.012 : 0.006);
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * r1, cx + Math.sin(a) * r1);
        g.lineTo(cx + Math.cos(a) * r2, cx + Math.sin(a) * r2);
        g.stroke();
        if (major) {
          g.fillStyle = i >= 14 ? '#ff7a7a' : '#dfe4ea';
          g.font = '700 ' + Math.round(S * 0.062) + 'px "Exo 2", Arial, sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(String(i / 2), cx + Math.cos(a) * R * 0.6, cx + Math.sin(a) * R * 0.6);
        }
      }
      g.fillStyle = 'rgba(255,255,255,0.4)';
      g.font = '600 ' + Math.round(S * 0.038) + 'px "Exo 2", Arial, sans-serif';
      g.fillText('×1000 об/мин', cx, cx + R * 0.36);
      this.tachoBg = c;
    },

    setup(race) {
      const e = this.el;
      this.race = race;
      e.board.innerHTML = '';
      race.cars.forEach((c) => {
        const row = document.createElement('div');
        row.className = 'board-row' + (c.isPlayer ? ' me' : '');
        row.innerHTML = '<span class="p"></span><span class="n"></span><span class="g"></span>';
        c.row = row;
        c.rowEls = { p: row.children[0], n: row.children[1], g: row.children[2] };
        c.rowEls.n.textContent = c.name;
        e.board.appendChild(row);
      });
      const first = e.board.firstChild;
      this.rowH = first && first.offsetHeight ? first.offsetHeight + 3 : 30;
      e.board.style.height = race.cars.length * this.rowH + 'px';
      e.total.textContent = race.cars.length;
      const closed = race.track.closed;
      e.lapWrap.classList.toggle('hidden', !closed);
      e.lapRow.classList.toggle('hidden', !closed);
      e.laps.textContent = race.laps;
      e.sprint.classList.toggle('hidden', closed);
      e.sprintTrack.innerHTML = '';
      if (!closed) {
        race.cars.forEach((c) => {
          const d = document.createElement('div');
          d.className = 'dot' + (c.isPlayer ? ' me' : '');
          c.dot = d;
          e.sprintTrack.appendChild(d);
        });
      }
      const rec = Save.data.records[race.def.id];
      this.recordTime = rec ? (closed ? rec.bestLap : rec.bestTime.sprint) : null;
      // путь трассы для миникарты (в мировых координатах)
      const tr = race.track;
      const path = new Path2D();
      for (let i = 0; i < tr.n; i += 2) {
        if (i === 0) path.moveTo(tr.px[i], tr.pz[i]); else path.lineTo(tr.px[i], tr.pz[i]);
      }
      if (tr.closed) path.closePath(); else path.lineTo(tr.px[tr.n - 1], tr.pz[tr.n - 1]);
      this.path = path;
      this.lastPos = 0;
      this.boardT = 0;
      this.textT = 0;
      e.countdown.textContent = '';
      e.countdown.className = '';
      e.msg.className = '';
      e.wrong.classList.add('hidden');
    },

    countdown(text, go) {
      const el = this.el.countdown;
      el.className = '';
      void el.offsetWidth;
      el.textContent = text;
      el.className = 'pop' + (go ? ' go' : '');
    },

    msg(text, sub) {
      const el = this.el.msg;
      el.className = '';
      void el.offsetWidth;
      el.innerHTML = text + (sub ? '<div style="font-size:.55em;color:#fff;letter-spacing:1px;margin-top:4px">' + sub + '</div>' : '');
      el.className = 'show';
    },

    update(race, dt) {
      const e = this.el;
      const p = race.player;
      this.drawTacho(p);
      this.drawMinimap(race);
      e.nitro.style.width = (p.nitro / p.spec.nitro * 100).toFixed(1) + '%';
      e.nitroWrap.classList.toggle('active', p.nitroOn);
      const speedK = clamp(p.speed / p.spec.vmax, 0, 1.2);
      e.speedfx.style.opacity = (0.5 + speedK * 0.3 + (p.nitroOn ? 0.2 : 0)).toFixed(3);
      e.flash.style.opacity = race.flash.toFixed(3);
      e.wrong.classList.toggle('hidden', !(race.state === 'race' && !p.finished && p.wrongT > 1.2));

      this.textT -= dt;
      if (this.textT <= 0) {
        this.textT = 0.05;
        e.time.textContent = fmtTime(race.t);
        if (race.track.closed) {
          e.lapTime.textContent = fmtTime(race.state === 'race' && !p.finished ? race.t - p.lapStart : 0);
          e.lap.textContent = Math.min(race.laps, p.lapsDone + 1);
          e.best.textContent = fmtTime(p.bestLap !== null ? p.bestLap : this.recordTime);
        } else {
          e.best.textContent = fmtTime(this.recordTime);
          const left = Math.max(0, race.raceDist - p.progress);
          e.sprintDist.textContent = (left / 1000).toFixed(2) + ' км';
          for (const c of race.cars) c.dot.style.left = (clamp(c.progress / race.raceDist, 0, 1) * 100).toFixed(2) + '%';
        }
        if (p.pos !== this.lastPos) {
          e.pos.textContent = p.pos;
          if (this.lastPos) {
            e.posWrap.classList.remove('bump');
            void e.posWrap.offsetWidth;
            e.posWrap.classList.add('bump');
          }
          this.lastPos = p.pos;
        }
      }
      this.boardT -= dt;
      if (this.boardT <= 0) {
        this.boardT = 0.2;
        this.updateBoard(race);
      }
    },

    updateBoard(race) {
      const leader = race.order[0];
      const rh = leader.row.offsetHeight;
      if (rh && rh + 3 !== this.rowH) {
        this.rowH = rh + 3;
        this.el.board.style.height = race.cars.length * this.rowH + 'px';
      }
      const avg = race.t > 3 ? Math.max(leader.progress / race.t, 12) : 30;
      const lp = leader.finished ? race.raceDist : leader.progress;
      race.order.forEach((c, i) => {
        c.row.style.transform = 'translateY(' + i * this.rowH + 'px)';
        c.rowEls.p.textContent = i + 1;
        let g;
        if (c.finished) g = fmtTime(c.finishTime);
        else if (i === 0) g = race.track.closed ? 'Круг ' + Math.min(race.laps, c.lapsDone + 1) : 'Лидер';
        else g = '+' + Math.max(0, (lp - c.progress) / avg).toFixed(1) + ' с';
        c.rowEls.g.textContent = g;
        c.row.classList.toggle('fin', c.finished);
      });
    },

    drawTacho(car) {
      const g = this.tctx, S = this.tacho.width, cx = S / 2, R = S * 0.46;
      g.clearRect(0, 0, S, S);
      g.drawImage(this.tachoBg, 0, 0);
      const a0 = Math.PI * 0.75, sweep = Math.PI * 1.5;
      const rpm = car.rpm / 1000;
      const a = a0 + clamp(rpm / 9, 0, 1) * sweep;
      const red = rpm > 7.2;
      g.strokeStyle = red ? '#ff3b3b' : car.nitroOn ? '#5fe3ff' : '#ffc21a';
      g.lineWidth = S * 0.035;
      g.shadowColor = g.strokeStyle;
      g.shadowBlur = S * 0.04;
      g.beginPath(); g.arc(cx, cx, R * 0.97, a0, a); g.stroke();
      g.shadowBlur = 0;
      // стрелка
      g.save();
      g.translate(cx, cx);
      g.rotate(a);
      g.fillStyle = '#ff3b3b';
      g.beginPath();
      g.moveTo(-R * 0.1, -S * 0.012); g.lineTo(R * 0.88, 0); g.lineTo(-R * 0.1, S * 0.012);
      g.closePath();
      g.fill();
      g.restore();
      g.fillStyle = '#16191e';
      g.beginPath(); g.arc(cx, cx, R * 0.3, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.15)';
      g.lineWidth = S * 0.006;
      g.stroke();
      // скорость и передача
      g.fillStyle = '#fff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = 'italic 900 ' + Math.round(S * 0.17) + 'px "Exo 2", Arial, sans-serif';
      g.fillText(String(kmh(car.speed)), cx, cx - S * 0.01);
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.font = '700 ' + Math.round(S * 0.045) + 'px "Exo 2", Arial, sans-serif';
      g.fillText('КМ/Ч', cx, cx + S * 0.085);
      const gear = car.vF < -0.5 && car.speed < 20 ? 'R' : car.speed < 0.5 && car.input.throttle === 0 ? 'N' : String(car.gear);
      g.fillStyle = '#ffc21a';
      g.font = '900 ' + Math.round(S * 0.085) + 'px "Russo One", "Exo 2", Arial, sans-serif';
      g.fillText(gear, cx, cx + R * 0.66);
    },

    drawMinimap(race) {
      const g = this.mctx, S = this.mini.width, R = S / 2;
      const p = race.player, tr = race.track;
      const scale = S / 380;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, S, S);
      g.save();
      g.beginPath(); g.arc(R, R, R, 0, Math.PI * 2); g.clip();
      g.fillStyle = 'rgba(8,10,14,0.8)';
      g.fillRect(0, 0, S, S);
      const ch = Math.cos(p.h), sh = Math.sin(p.h);
      // мировые координаты → экран: игрок в центре, направление движения вверх
      g.setTransform(-ch * scale, -sh * scale, sh * scale, -ch * scale,
        R + scale * (ch * p.x - sh * p.z), R + scale * (sh * p.x + ch * p.z));
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(255,255,255,0.22)';
      g.lineWidth = 30;
      g.stroke(this.path);
      g.strokeStyle = '#4c5563';
      g.lineWidth = 20;
      g.stroke(this.path);
      // старт / финиш
      const mark = (s, color) => {
        const q = tr.pointAt(s, 0);
        g.save();
        g.translate(q.x, q.z);
        g.rotate(-q.h);
        g.fillStyle = color;
        g.fillRect(-12, -3, 24, 6);
        g.restore();
      };
      if (tr.closed) mark(0, '#ffffff');
      else { mark(tr.startS, '#ffffff'); mark(tr.finishS, '#ffc21a'); }
      for (const c of race.cars) {
        if (c.isPlayer) continue;
        g.fillStyle = '#000';
        g.beginPath(); g.arc(c.x, c.z, 11, 0, Math.PI * 2); g.fill();
        g.fillStyle = c.pos < p.pos ? '#ff4b3e' : '#ff9a6b';
        g.beginPath(); g.arc(c.x, c.z, 8, 0, Math.PI * 2); g.fill();
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
      // стрелка игрока
      g.fillStyle = '#5fe3ff';
      g.strokeStyle = '#04131a';
      g.lineWidth = 2 * this.dpr;
      g.beginPath();
      g.moveTo(R, R - 11 * this.dpr);
      g.lineTo(R + 7 * this.dpr, R + 8 * this.dpr);
      g.lineTo(R, R + 4 * this.dpr);
      g.lineTo(R - 7 * this.dpr, R + 8 * this.dpr);
      g.closePath();
      g.fill();
      g.stroke();
      g.restore();
      // виньетка по краю
      const vg = g.createRadialGradient(R, R, R * 0.7, R, R, R);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.55)');
      g.fillStyle = vg;
      g.beginPath(); g.arc(R, R, R, 0, Math.PI * 2); g.fill();
    }
  };

  /* ========================================================
     ШОУРУМ (3D-фон меню и гаража)
     ======================================================== */
  const Showroom = {
    init() {
      const scene = new THREE.Scene();
      this.scene = scene;
      scene.background = col('#0b0d12');
      scene.fog = new THREE.Fog(col('#0b0d12'), 16, 46);
      this.envRT = makeEnvMap(null, true);
      scene.environment = this.envRT.texture;

      const ft = Tex.get('studioFloor').clone();
      ft.userData = {};
      ft.needsUpdate = true;
      ft.repeat.set(10, 10);
      const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64),
        new THREE.MeshStandardMaterial({ map: ft, roughness: 0.32, metalness: 0.5, color: col('#9aa0a8') }));
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      this.turn = new THREE.Group();
      scene.add(this.turn);
      const plat = new THREE.Mesh(new THREE.CylinderGeometry(3.7, 3.85, 0.14, 72),
        new THREE.MeshStandardMaterial({ color: col('#1b1e24'), metalness: 0.8, roughness: 0.28 }));
      plat.position.y = 0.07;
      plat.receiveShadow = true;
      this.turn.add(plat);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(3.78, 0.03, 8, 120),
        new THREE.MeshStandardMaterial({ color: col('#ffc21a'), emissive: col('#ffb000'), emissiveIntensity: 2.2 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.12;
      scene.add(ring);

      scene.add(new THREE.HemisphereLight(col('#8ea0c0'), col('#0b0b0d'), 0.45));
      const key = new THREE.SpotLight(0xffffff, 3.2, 40, 0.55, 0.7, 1);
      key.position.set(3.5, 10, 5);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.bias = -0.0005;
      scene.add(key, key.target);
      const rimA = new THREE.PointLight(0xffa040, 2.6, 22, 1.5);
      rimA.position.set(-6, 2.6, -4);
      const rimB = new THREE.PointLight(0x40c8ff, 2.2, 22, 1.5);
      rimB.position.set(6.5, 2.2, -5);
      scene.add(rimA, rimB);

      // световые панели на заднем плане
      const barMat = new THREE.MeshBasicMaterial({ color: col('#ffffff') });
      const warmMat = new THREE.MeshBasicMaterial({ color: col('#ffb84a') });
      for (let i = -7; i <= 7; i++) {
        const h = 3 + Math.abs(Math.sin(i * 1.7)) * 5;
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, 0.12), i % 3 === 0 ? warmMat : barMat);
        const a = i * 0.11;
        bar.position.set(Math.sin(a) * 20, h / 2 + 0.5, -Math.cos(a) * 20);
        scene.add(bar);
      }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(34, 0.08, 0.08), warmMat);
      beam.position.set(0, 9.5, -19);
      scene.add(beam);

      this.camPos = new THREE.Vector3(6, 2, 8);
      this.camLook = new THREE.Vector3(0, 0.6, 0);
      this.carId = null;
      this.model = null;
    },

    setCar(id, color) {
      if (this.carId === id && this.model) {
        this.model.setColor(color);
        return;
      }
      if (this.model) {
        this.turn.remove(this.model.root);
        disposeObject(this.model.root);
      }
      const spec = carById(id);
      this.model = buildCarModel(spec, color);
      this.model.root.position.y = 0.14;
      this.model.headMat.emissiveIntensity = 0.45;
      this.model.tailMat.emissiveIntensity = 1.4;
      this.model.headGlow.forEach((g) => { g.material.opacity = 0.25; });
      this.model.tailGlow.forEach((g) => { g.material.opacity = 0.2; });
      this.turn.add(this.model.root);
      this.carId = id;
      this.spin = 0.9;
    },

    update(dt, screen, camera) {
      this.spin = Math.max(0, (this.spin || 0) - dt * 0.8);
      this.turn.rotation.y += dt * (0.22 + this.spin);
      let pos, look;
      if (screen === 'menu') { pos = [5.4, 1.75, 7.2]; look = [-1.9, 0.55, 0.4]; }
      else if (screen === 'garage') { pos = [5.6, 2.1, 7.6]; look = [0, 0.4, 0]; }
      else { pos = [4.6, 1.4, 6.2]; look = [0, 0.7, 0]; }
      const k = 1 - Math.exp(-dt * 3);
      this.camPos.lerp(_p.set(pos[0], pos[1], pos[2]), k);
      this.camLook.lerp(_s.set(look[0], look[1], look[2]), k);
      if (camera.fov !== 38 || camera.near !== 0.1) {
        camera.fov = 38;
        camera.near = 0.1;
        camera.far = 200;
        camera.updateProjectionMatrix();
      }
      camera.position.copy(this.camPos);
      camera.lookAt(this.camLook);
    },

    render(camera) {
      renderer.toneMappingExposure = 1.05;
      renderer.render(this.scene, camera);
    },

    refreshMaterials() {
      this.scene.traverse((o) => {
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.needsUpdate = true; });
      });
    }
  };

  /* ========================================================
     ИГРА: экраны, меню, гараж, настройка гонки, цикл
     ======================================================== */
  const TRACK_INFO = {};

  function rewardFor(setup, place) {
    const info = TRACK_INFO[setup.track];
    const closed = info.closed;
    const km = closed ? (info.length * setup.laps) / 1000 : (info.length - SPRINT_START - SPRINT_END) / 1000;
    const base = (km * 480 + 400) * DIFFICULTY[setup.difficulty].reward * (1 + setup.opponents * 0.06);
    const mult = [1, 0.55, 0.32, 0.18, 0.1, 0.06, 0.04, 0.03][place - 1] || 0.02;
    return Math.round((base * mult) / 50) * 50;
  }

  function drawTrackPreview(canvas, id, highlight) {
    const info = TRACK_INFO[id];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const S = 110 * dpr;
    canvas.width = canvas.height = S;
    const g = canvas.getContext('2d');
    const b = info.bounds;
    const pad = 12 * dpr;
    const sc = (S - pad * 2) / b.size;
    const ox = pad + ((S - pad * 2) - (b.maxX - b.minX) * sc) / 2;
    const oy = pad + ((S - pad * 2) - (b.maxZ - b.minZ) * sc) / 2;
    const P = (i) => [ox + (info.pts[i][0] - b.minX) * sc, S - (oy + (info.pts[i][1] - b.minZ) * sc)];
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.beginPath();
    info.pts.forEach((_, i) => { const q = P(i); if (i === 0) g.moveTo(q[0], q[1]); else g.lineTo(q[0], q[1]); });
    if (info.closed) g.closePath();
    g.strokeStyle = 'rgba(255,255,255,0.15)';
    g.lineWidth = 7 * dpr;
    g.stroke();
    g.strokeStyle = highlight ? '#ffc21a' : '#c9ced6';
    g.lineWidth = 2.6 * dpr;
    g.stroke();
    const s0 = P(0);
    g.fillStyle = '#7dff6b';
    g.beginPath(); g.arc(s0[0], s0[1], 4 * dpr, 0, Math.PI * 2); g.fill();
    if (!info.closed) {
      const e = P(info.pts.length - 1);
      g.fillStyle = '#ff3b3b';
      g.beginPath(); g.arc(e[0], e[1], 4 * dpr, 0, Math.PI * 2); g.fill();
    }
  }

  const Game = {
    state: 'loading',
    screen: 'loading',
    race: null,
    camera: null,
    clock: null,
    sel: null,
    garageSel: null,
    garageColor: null,

    async boot() {
      const steps = [
        ['Загрузка сохранений', () => Save.load()],
        ['Запуск графики', () => this.initRenderer()],
        ['Загрузка шрифтов', () => Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 1500))])],
        ['Генерация текстур', () => ['road', 'sidewalk', 'concrete', 'grass', 'pavement', 'soft', 'smoke', 'plate', 'studioFloor'].forEach((n) => Tex.get(n))],
        ['Сборка шоурума', () => Showroom.init()],
        ['Расчёт трасс', () => this.prepareTracks()],
        ['Прогрев двигателя', () => { HUD.init(); this.bindUI(); }]
      ];
      for (let i = 0; i < steps.length; i++) {
        $('load-text').textContent = steps[i][0] + '…';
        $('load-fill').style.width = ((i / steps.length) * 100).toFixed(0) + '%';
        await new Promise((r) => setTimeout(r, 40));
        try {
          await steps[i][1]();
        } catch (err) {
          console.error(err);
          $('load-text').textContent = 'Ошибка: ' + err.message;
          if (i === 1) {
            $('load-error').innerHTML = 'Не удалось запустить WebGL. Проверьте, что в браузере включено аппаратное ускорение, и обновите страницу.';
            $('load-error').classList.remove('hidden');
          }
          return;
        }
      }
      $('load-fill').style.width = '100%';
      this.applySettings();
      Showroom.setCar(Save.data.car, Save.carColor(Save.data.car));
      this.clock = new THREE.Clock();
      this.loop();
      await new Promise((r) => setTimeout(r, 300));
      this.goMenu();
    },

    initRenderer() {
      renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, powerPreference: 'high-performance' });
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 200);
      this.resize();
      window.addEventListener('resize', () => this.resize());
    },

    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    },

    prepareTracks() {
      TRACKS.forEach((def) => {
        const t = new Track(def);
        const pts = [];
        for (let i = 0; i < t.n; i += 4) pts.push([t.px[i], t.pz[i]]);
        if (!t.closed) pts.push([t.px[t.n - 1], t.pz[t.n - 1]]);
        TRACK_INFO[def.id] = { length: t.length, closed: t.closed, bounds: t.bounds, pts };
      });
    },

    applySettings() {
      const st = Save.data.settings;
      const q = QUALITY[st.quality];
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.ratio));
      const shadows = q.shadow > 0;
      if (renderer.shadowMap.enabled !== shadows) {
        renderer.shadowMap.enabled = shadows;
        if (Showroom.scene) Showroom.refreshMaterials();
      }
      this.resize();
      document.body.classList.toggle('grade-on', st.grade === 'on');
      SFX.setVolume(st.volume);
    },

    /* ---------- экраны ---------- */
    show(name, keepHud) {
      document.querySelectorAll('.screen').forEach((s) => {
        if (keepHud && s.id === 'hud') return;
        s.classList.remove('active');
      });
      const id = name === 'hud' ? 'hud' : 'screen-' + name;
      const el = $(id);
      if (el) el.classList.add('active');
      if (name !== 'pause' && name !== 'results') this.screen = name;
    },

    toast(text) {
      const t = $('toast');
      t.textContent = text;
      t.classList.add('show');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
    },

    refreshMoney() {
      const m = fmtMoney(Save.data.money);
      ['menu-money', 'garage-money', 'setup-money', 'records-money'].forEach((id) => { $(id).textContent = m; });
    },

    goMenu() {
      this.state = 'menu';
      const d = Save.data;
      $('menu-name').textContent = d.name;
      $('menu-wins').textContent = d.stats.wins;
      const spec = carById(d.car);
      $('menu-car-name').textContent = spec.name;
      $('menu-car-class').textContent = spec.cls;
      this.refreshMoney();
      Showroom.setCar(d.car, Save.carColor(d.car));
      this.show('menu');
    },

    /* ---------- гараж ---------- */
    openGarage() {
      this.state = 'menu';
      this.garageSel = Save.data.car;
      this.refreshMoney();
      this.renderCarList();
      this.selectGarageCar(Save.data.car);
      this.show('garage');
    },

    renderCarList() {
      const list = $('car-list');
      list.innerHTML = '';
      const d = Save.data;
      CARS.forEach((c) => {
        const b = document.createElement('button');
        b.className = 'car-item' + (c.id === this.garageSel ? ' active' : '');
        let tag;
        if (c.id === d.car) tag = '<span class="tag sel">Выбрана</span>';
        else if (d.owned.includes(c.id)) tag = '<span class="tag own">В гараже</span>';
        else tag = '<span class="tag ' + (d.money >= c.price ? 'price' : 'locked') + '">' + fmtMoney(c.price) + '</span>';
        b.innerHTML = '<div><b>' + c.name + '</b><small>' + c.cls + '</small></div>' + tag;
        b.addEventListener('click', () => { SFX.click(); this.selectGarageCar(c.id); });
        list.appendChild(b);
      });
    },

    selectGarageCar(id) {
      this.garageSel = id;
      const d = Save.data;
      const c = carById(id);
      const owned = d.owned.includes(id);
      this.garageColor = Save.carColor(id);
      document.querySelectorAll('.car-item').forEach((el, i) => el.classList.toggle('active', CARS[i].id === id));
      $('car-class').textContent = c.cls;
      $('car-name').textContent = c.name;
      $('car-desc').textContent = c.desc;
      const set = (key, frac, text) => {
        $('stat-' + key).style.width = (clamp(frac, 0.04, 1) * 100).toFixed(0) + '%';
        $('stat-' + key + '-v').textContent = text;
      };
      set('speed', (c.vmax * 3.6 - 190) / 170, kmh(c.vmax));
      set('accel', (c.accel - 7) / 9.5, (27.8 / (c.accel * 0.82)).toFixed(1) + ' с');
      set('handling', (c.grip - 16) / 11.5, (c.grip / 9.81).toFixed(2) + 'g');
      set('nitro', c.nitro / 6.2, c.nitro.toFixed(1) + ' с');
      const cl = $('color-list');
      cl.innerHTML = '';
      CAR_COLORS.forEach((cc) => {
        const s = document.createElement('button');
        s.className = 'swatch' + (cc.hex === this.garageColor ? ' active' : '');
        s.style.background = cc.hex;
        s.title = cc.name;
        s.addEventListener('click', () => {
          SFX.click();
          this.garageColor = cc.hex;
          if (Save.data.owned.includes(id)) {
            Save.data.colors[id] = cc.hex;
            Save.write();
          }
          cl.querySelectorAll('.swatch').forEach((x) => x.classList.toggle('active', x === s));
          Showroom.setCar(id, cc.hex);
        });
        cl.appendChild(s);
      });
      const btn = $('car-action');
      btn.classList.remove('owned');
      btn.disabled = false;
      if (owned) {
        if (d.car === id) { btn.textContent = 'Выбрана ✓'; btn.classList.add('owned'); }
        else btn.textContent = 'Выбрать';
      } else {
        btn.textContent = 'Купить · ' + fmtMoney(c.price);
        btn.disabled = d.money < c.price;
      }
      Showroom.setCar(id, this.garageColor);
    },

    garageAction() {
      const id = this.garageSel;
      const d = Save.data;
      const c = carById(id);
      if (!d.owned.includes(id)) {
        if (d.money < c.price) { this.toast('Недостаточно денег — выигрывайте гонки!'); return; }
        d.money -= c.price;
        d.owned.push(id);
        d.colors[id] = this.garageColor;
        d.car = id;
        Save.write();
        SFX.beep(660, 0.12, 0.15, 'triangle');
        setTimeout(() => SFX.beep(990, 0.25, 0.15, 'triangle'), 120);
        this.toast(c.name + ' теперь в вашем гараже!');
      } else if (d.car !== id) {
        d.car = id;
        Save.write();
        this.toast('Выбрана машина ' + c.name);
      }
      this.refreshMoney();
      this.renderCarList();
      this.selectGarageCar(id);
    },

    /* ---------- настройка гонки ---------- */
    openSetup() {
      this.state = 'menu';
      this.sel = Object.assign({}, Save.data.setup);
      this.refreshMoney();
      this.renderSetup();
      this.show('setup');
    },

    renderSetup() {
      const s = this.sel;
      if (trackById(s.track).type !== s.type) s.track = TRACKS.find((t) => t.type === s.type).id;
      document.querySelectorAll('.type-tab').forEach((b) => b.classList.toggle('active', b.dataset.type === s.type));
      const list = $('track-list');
      list.innerHTML = '';
      TRACKS.filter((t) => t.type === s.type).forEach((t) => {
        const info = TRACK_INFO[t.id];
        const rec = Save.data.records[t.id];
        const b = document.createElement('button');
        b.className = 'track-card' + (t.id === s.track ? ' active' : '');
        const cv = document.createElement('canvas');
        drawTrackPreview(cv, t.id, t.id === s.track);
        b.appendChild(cv);
        const ti = document.createElement('div');
        ti.className = 'ti';
        let recText = 'Рекорда пока нет';
        if (rec) {
          if (t.type === 'circuit' && rec.bestLap) recText = 'Лучший круг: ' + fmtTime(rec.bestLap);
          if (t.type === 'sprint' && rec.bestTime.sprint) recText = 'Рекорд: ' + fmtTime(rec.bestTime.sprint);
        }
        ti.innerHTML = '<b>' + t.name + '</b><small>' + t.desc + '</small><small>' +
          (info.length / 1000).toFixed(2) + ' км · ' + (t.type === 'circuit' ? 'кольцо' : 'спринт') + '</small><span class="rec">' + recText + '</span>';
        b.appendChild(ti);
        b.addEventListener('click', () => { SFX.click(); s.track = t.id; this.renderSetup(); });
        list.appendChild(b);
      });
      $('laps-row').classList.toggle('hidden', s.type !== 'circuit');
      this.syncSegs();
      const info = TRACK_INFO[s.track];
      const km = s.type === 'circuit' ? (info.length * s.laps) / 1000 : (info.length - SPRINT_START - SPRINT_END) / 1000;
      $('setup-summary').innerHTML =
        '<b>' + trackById(s.track).name + '</b> · ' + (s.type === 'circuit' ? s.laps + ' ' + this.plural(s.laps, 'круг', 'круга', 'кругов') : 'спринт') +
        ' · ' + km.toFixed(1) + ' км · ' + s.opponents + ' ' + this.plural(s.opponents, 'соперник', 'соперника', 'соперников') +
        ' · ' + DIFFICULTY[s.difficulty].name.toLowerCase() + ' сложность · ' + TIMES[s.time].name.toLowerCase() +
        '<br>Награда за 1-е место: <b class="money">' + fmtMoney(rewardFor(s, 1)) + '</b> · машина: <b>' + carById(Save.data.car).name + '</b>';
    },

    plural(n, one, few, many) {
      const m10 = n % 10, m100 = n % 100;
      if (m10 === 1 && m100 !== 11) return one;
      if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
      return many;
    },

    syncSegs() {
      const st = Save.data.settings;
      document.querySelectorAll('.seg').forEach((seg) => {
        const opt = seg.dataset.opt;
        let val;
        if (['laps', 'opponents', 'difficulty', 'time'].includes(opt)) val = this.sel ? this.sel[opt] : Save.data.setup[opt];
        else val = st[opt];
        seg.querySelectorAll('button').forEach((b) => b.classList.toggle('active', String(val) === b.dataset.val));
      });
    },

    onSeg(opt, raw) {
      const num = ['laps', 'opponents', 'camera'].includes(opt);
      const val = num ? parseInt(raw, 10) : raw;
      if (['laps', 'opponents', 'difficulty', 'time'].includes(opt)) {
        this.sel[opt] = val;
        this.renderSetup();
      } else {
        Save.data.settings[opt] = val;
        Save.write();
        if (opt === 'quality') { this.applySettings(); this.toast('Качество применится полностью в следующей гонке'); }
        if (opt === 'grade') this.applySettings();
        this.syncSegs();
      }
    },

    /* ---------- рекорды и настройки ---------- */
    openRecords() {
      this.state = 'menu';
      this.refreshMoney();
      const st = Save.data.stats;
      const cards = [
        ['Гонок', st.races], ['Побед', st.wins], ['Подиумов', st.podiums],
        ['Заработано', fmtMoney(st.earned)], ['Пробег', st.distance.toFixed(1) + ' км'], ['Машин', Save.data.owned.length + ' / ' + CARS.length]
      ];
      $('stats-cards').innerHTML = cards.map((c) => '<div class="stat-card"><small>' + c[0] + '</small><b>' + c[1] + '</b></div>').join('');
      const body = $('records-table').querySelector('tbody');
      body.innerHTML = TRACKS.map((t) => {
        const r = Save.data.records[t.id];
        let best = '—';
        if (r) {
          const times = Object.keys(r.bestTime).map((k) => (k === 'sprint' ? fmtTime(r.bestTime[k]) : fmtTime(r.bestTime[k]) + ' (' + k + ' кр.)'));
          if (times.length) best = times.join('<br>');
        }
        return '<tr><td><b>' + t.name + '</b></td><td>' + (t.type === 'circuit' ? 'Кольцевая' : 'Спринт') + '</td><td class="num">' +
          (r && r.bestLap ? fmtTime(r.bestLap) : '—') + '</td><td>' + best + '</td><td>' + (r ? r.wins : 0) + '</td></tr>';
      }).join('');
      this.show('records');
    },

    openSettings() {
      this.state = 'menu';
      const st = Save.data.settings;
      $('set-name').value = Save.data.name;
      $('set-volume').value = st.volume;
      $('set-volume-v').textContent = st.volume + '%';
      this.sel = this.sel || Object.assign({}, Save.data.setup);
      this.syncSegs();
      this.show('settings');
    },

    /* ---------- гонка ---------- */
    startRace() {
      SFX.init();
      SFX.resume();
      Save.data.setup = Object.assign({}, this.sel || Save.data.setup);
      Save.write();
      $('load-text').textContent = 'Загрузка трассы…';
      $('load-fill').style.width = '60%';
      this.show('loading');
      setTimeout(() => {
        if (this.race) { this.race.dispose(); this.race = null; }
        Input.clear();
        this.race = new Race(Save.data.setup, this.camera);
        HUD.setup(this.race);
        this.state = 'race';
        this.show('hud');
        this.clock.getDelta();
      }, 60);
    },

    pause() {
      if (this.state !== 'race' || !this.race) return;
      this.state = 'paused';
      SFX.suspend();
      Input.clear();
      this.show('pause', true);
    },

    resume() {
      if (this.state !== 'paused') return;
      this.state = 'race';
      SFX.resume();
      this.clock.getDelta();
      $('screen-pause').classList.remove('active');
    },

    quitRace() {
      if (this.race) { this.race.dispose(); this.race = null; }
      SFX.resume();
      Input.clear();
      this.goMenu();
    },

    showResults() {
      const race = this.race;
      if (!race || this.state === 'results') return;
      this.state = 'results';
      const res = race.results();
      const place = res.findIndex((r) => r.car.isPlayer) + 1;
      const setup = race.setup;
      const reward = rewardFor(setup, place);
      const d = Save.data;
      const p = race.player;
      d.money += reward;
      d.stats.races++;
      d.stats.earned += reward;
      d.stats.distance += p.distance / 1000;
      if (place === 1) d.stats.wins++;
      if (place <= 3) d.stats.podiums++;
      const rec = Save.record(race.def.id);
      rec.races++;
      if (place === 1) rec.wins++;
      const notes = [];
      if (race.track.closed && p.bestLap !== null && (rec.bestLap === null || p.bestLap < rec.bestLap)) {
        rec.bestLap = p.bestLap;
        notes.push('Новый рекорд круга!');
      }
      const key = race.track.closed ? String(race.laps) : 'sprint';
      if (p.finished && (!rec.bestTime[key] || p.finishTime < rec.bestTime[key])) {
        rec.bestTime[key] = p.finishTime;
        notes.push('Лучшее время на трассе!');
      }
      Save.write();

      $('res-place').textContent = place;
      $('res-title').textContent = place === 1 ? 'Победа!' : place <= 3 ? 'Подиум!' : 'Финиш';
      $('res-sub').textContent = race.def.name + ' · ' + (race.track.closed ? race.laps + ' ' + this.plural(race.laps, 'круг', 'круга', 'кругов') : 'спринт') +
        ' · ' + DIFFICULTY[setup.difficulty].name + ' сложность';
      $('res-reward').textContent = '+' + fmtMoney(reward);
      $('res-record').textContent = notes.join(' · ');
      $('res-table').querySelector('tbody').innerHTML = res.map((r, i) => {
        const c = r.car;
        return '<tr class="' + (c.isPlayer ? 'me' : '') + '"><td class="num">' + (i + 1) + '</td><td>' + c.name + (c.isPlayer ? ' (вы)' : '') +
          '</td><td>' + c.spec.name + '</td><td>' + (r.est ? '≈ ' : '') + fmtTime(r.time) + '</td><td>' + (r.best !== null ? fmtTime(r.best) : '—') + '</td></tr>';
      }).join('');
      this.show('results', true);
      if (place === 1) { SFX.beep(523, 0.15, 0.2, 'triangle'); setTimeout(() => SFX.beep(784, 0.15, 0.2, 'triangle'), 150); setTimeout(() => SFX.beep(1046, 0.4, 0.2, 'triangle'), 300); }
    },

    /* ---------- события интерфейса ---------- */
    bindUI() {
      document.addEventListener('click', (e) => {
        SFX.init();
        SFX.resume();
        const a = e.target.closest('[data-action]');
        if (a) {
          SFX.click();
          const act = a.dataset.action;
          if (act === 'setup') this.openSetup();
          else if (act === 'garage') this.openGarage();
          else if (act === 'records') this.openRecords();
          else if (act === 'settings') this.openSettings();
          else if (act === 'back') this.goMenu();
          else if (act === 'resume') this.resume();
          else if (act === 'restart') this.startRace();
          else if (act === 'quit' || act === 'menu') this.quitRace();
          return;
        }
        const segBtn = e.target.closest('.seg button');
        if (segBtn) {
          SFX.click();
          this.onSeg(segBtn.parentElement.dataset.opt, segBtn.dataset.val);
          return;
        }
        const tab = e.target.closest('.type-tab');
        if (tab) {
          SFX.click();
          this.sel.type = tab.dataset.type;
          this.renderSetup();
        }
      });
      $('btn-start').addEventListener('click', () => this.startRace());
      $('car-action').addEventListener('click', () => this.garageAction());
      $('set-name').addEventListener('input', (e) => {
        Save.data.name = e.target.value.trim().slice(0, 14) || 'Игрок';
        Save.write();
      });
      $('set-volume').addEventListener('input', (e) => {
        const v = parseInt(e.target.value, 10);
        Save.data.settings.volume = v;
        $('set-volume-v').textContent = v + '%';
        SFX.init();
        SFX.setVolume(v);
        Save.write();
      });
      $('btn-reset').addEventListener('click', () => {
        if (!window.confirm('Удалить весь прогресс, деньги, машины и рекорды?')) return;
        Save.reset();
        this.sel = Object.assign({}, Save.data.setup);
        this.applySettings();
        this.toast('Прогресс сброшен');
        this.openSettings();
      });

      const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
      window.addEventListener('keydown', (e) => {
        if (e.target && e.target.tagName === 'INPUT') return;
        if (gameKeys.includes(e.code) && (this.state === 'race' || this.state === 'results')) e.preventDefault();
        if (e.repeat && (e.code === 'Escape' || e.code === 'KeyP')) return;
        if (e.code === 'Escape' || e.code === 'KeyP') {
          if (this.state === 'race') this.pause();
          else if (this.state === 'paused') this.resume();
          else if (this.state === 'menu' && this.screen !== 'menu') { SFX.click(); this.goMenu(); }
          return;
        }
        if (e.code === 'Enter' && this.state === 'results') { this.quitRace(); return; }
        Input.down(e.code);
      });
      window.addEventListener('keyup', (e) => Input.up(e.code));
      window.addEventListener('blur', () => { Input.clear(); this.pause(); });
      document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); });
    },

    loop() {
      requestAnimationFrame(() => this.loop());
      const dt = Math.min(this.clock.getDelta(), 1 / 20);
      if (this.race && (this.state === 'race' || this.state === 'results')) {
        this.race.update(dt);
        this.race.render();
      } else if (this.race && this.state === 'paused') {
        this.race.render();
      } else {
        Showroom.update(dt, this.screen, this.camera);
        Showroom.render(this.camera);
      }
    }
  };

  let booted = false;
  const start = () => { if (!booted) { booted = true; Game.boot(); } };
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', start);
  else start();
})();
