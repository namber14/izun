// איזון · ליבה: כלים, תאריכים, שמירה, שבת, ורכיבי מסך משותפים.
(function () {
  'use strict';
  const S = window.S = { v: 1, act: {}, views: {} };
  const KEY = 'izun:v1', ME = 'izun:me';

  // ---------- כלים ----------
  const pad = n => String(n).padStart(2, '0');
  S.pad = pad;
  S.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  S.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  S.clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  S.sum = (arr, f) => arr.reduce((a, x) => a + (f ? f(x) : x), 0);
  S.dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  S.kdate = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  S.addDays = (k, n) => { const d = S.kdate(k); d.setDate(d.getDate() + n); return S.dkey(d); };
  S.dow = k => S.kdate(k).getDay();
  S.weekKey = k => S.addDays(k, -S.dow(k)); // יום ראשון של אותו שבוע
  S.diffDays = (a, b) => Math.round((S.kdate(a) - S.kdate(b)) / 864e5);
  S.t2m = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  S.m2t = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
  S.nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  S.today = () => S.dkey();
  S.DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  S.DAYS1 = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  S.dur = min => { min = Math.round(min); const h = Math.floor(min / 60), m = min % 60; return h ? (m ? `${h}:${pad(m)} שע׳` : `${h} שע׳`) : `${m} דק׳`; };

  // תאריך עברי באותיות: כ״ה בחשוון
  const G1 = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], G10 = ['', 'י', 'כ', 'ל'];
  function gem(n) {
    if (n === 15) return 'ט״ו';
    if (n === 16) return 'ט״ז';
    const s = G10[Math.floor(n / 10)] + G1[n % 10];
    return s.length === 1 ? s + '׳' : s[0] + '״' + s[1];
  }
  let hebFmt = null;
  try { hebFmt = new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long' }); } catch { /* דפדפן ישן */ }
  S.hebDate = k => {
    if (!hebFmt) return '';
    try {
      const parts = hebFmt.formatToParts(S.kdate(k));
      const day = parseInt(parts.find(p => p.type === 'day').value, 10);
      const month = parts.find(p => p.type === 'month').value;
      return `${gem(day)} ב${month}`;
    } catch { return ''; }
  };
  S.dayName = k => {
    const diff = S.diffDays(k, S.today());
    if (diff === 0) return 'היום';
    if (diff === 1) return 'מחר';
    if (diff === -1) return 'אתמול';
    return 'יום ' + S.DAYS[S.dow(k)];
  };
  S.shortDate = k => { const d = S.kdate(k); return `${d.getDate()}.${d.getMonth() + 1}`; };

  // ---------- שמירה ----------
  S.state = null;
  S.me = 'a';
  S.load = () => {
    try { S.state = S.normalize(JSON.parse(localStorage.getItem(KEY))); } catch { S.state = null; }
    if (S.state) for (const x of ['a', 'b']) if (!S.state.people[x].blocks.length) S.state.people[x].blocks = S.buildBlocks(x);
    S.me = localStorage.getItem(ME) === 'b' ? 'b' : 'a';
  };
  let saveT = null;
  S.writeLocal = () => { try { localStorage.setItem(KEY, JSON.stringify(S.state)); return true; } catch { return false; } };
  const flush = () => {
    saveT = null;
    if (!S.state) return;
    S.state.updatedAt = Date.now();
    if (!S.writeLocal()) S.toast('אין מקום לשמור. כדאי לגבות ולנקות נתונים ישנים.');
    if (S.sync) S.sync.track(); // מה שהשתנה יוצא לטלפון השני
  };
  S.save = () => { if (!saveT) saveT = setTimeout(flush, 80); };
  S.saveNow = () => { clearTimeout(saveT); flush(); };
  // משלים שדות חסרים במצב שנטען או שוחזר (גיבוי ישן או חלקי), כדי ששום מסך לא יקרוס עליו
  S.normalize = st => {
    if (!st || typeof st !== 'object' || !st.people || !st.people.a || !st.people.b) return null;
    const base = S.newState();
    st.home = Object.assign({}, base.home, st.home || {});
    for (const x of ['a', 'b']) {
      const p = st.people[x], d = S.newPerson(p.sex === 'f' ? 'f' : 'm', '');
      st.people[x] = Object.assign({}, d, p, { work: Object.assign({}, d.work, p.work || {}), fit: Object.assign({}, d.fit, p.fit || {}), blocks: Array.isArray(p.blocks) ? p.blocks.filter(b => b && b.id && b.s && Array.isArray(b.d)) : [] });
      if (!Array.isArray(st.people[x].fit.days)) st.people[x].fit.days = d.fit.days;
    }
    for (const key of ['days', 'menu', 'shop', 'reviews']) if (!st[key] || typeof st[key] !== 'object' || Array.isArray(st[key])) st[key] = {};
    for (const key of ['tasks', 'weights']) if (!Array.isArray(st[key])) st[key] = [];
    for (const k of Object.keys(st.days)) {
      if (!st.days[k] || typeof st.days[k] !== 'object') { delete st.days[k]; continue; }
      for (const w of Object.keys(st.days[k])) {
        const r = st.days[k][w];
        if (!r || typeof r !== 'object') { delete st.days[k][w]; continue; }
        r.done = r.done || {}; r.meals = r.meals || {}; r.water = r.water || 0;
      }
    }
    for (const wk of Object.keys(st.menu)) if (!st.menu[wk] || !st.menu[wk].days) delete st.menu[wk];
    for (const wk of Object.keys(st.shop)) { const s = st.shop[wk] || (st.shop[wk] = {}); s.got = s.got || {}; s.extra = Array.isArray(s.extra) ? s.extra : []; }
    st.tasks = st.tasks.filter(t => t && t.id && typeof t.t === 'string');
    st.weights = st.weights.filter(w => w && w.k && w.who && w.kg > 0);
    return st;
  };
  S.setMe = id => { S.me = id; try { localStorage.setItem(ME, id); } catch { /* ריק */ } };
  S.wipe = () => { clearTimeout(saveT); saveT = null; if (S.sync) S.sync.disconnect(); S.state = null; try { localStorage.removeItem(KEY); } catch { /* ריק */ } };
  window.addEventListener('pagehide', () => { if (saveT) { clearTimeout(saveT); flush(); } });

  S.P = id => S.state.people[id];
  S.other = id => (id === 'a' ? 'b' : 'a');
  S.home = () => S.state.home;
  // רשומת היום של אדם. day() יוצר אותה, peek() רק קורא.
  const EMPTY = Object.freeze({ done: Object.freeze({}), meals: Object.freeze({}), water: 0 });
  S.day = (k, who) => {
    const d = S.state.days[k] || (S.state.days[k] = {});
    const r = d[who] || (d[who] = { done: {}, meals: {}, water: 0 });
    if (r.sc) delete r.sc; // נוגעים ביום שעבר: הציון השמור שלו יחושב מחדש
    return r;
  };
  S.peek = (k, who) => (S.state.days[k] && S.state.days[k][who]) || EMPTY;

  // ---------- שבת (זמנים משוערים לפי חישוב שקיעה) ----------
  // [שם, קו רוחב, קו אורך, דקות הדלקת נרות לפני השקיעה]
  S.CITIES = {
    jerusalem: ['ירושלים', 31.778, 35.235, 40], bnei_brak: ['בני ברק', 32.084, 34.834, 22], tel_aviv: ['תל אביב', 32.08, 34.78, 22],
    petah_tikva: ['פתח תקווה', 32.087, 34.887, 40], haifa: ['חיפה', 32.794, 34.989, 30], ashdod: ['אשדוד', 31.804, 34.655, 22],
    beit_shemesh: ['בית שמש', 31.747, 34.988, 22], modiin_illit: ['מודיעין עילית', 31.933, 35.043, 22], beitar: ['ביתר עילית', 31.697, 35.115, 22],
    elad: ['אלעד', 32.052, 34.951, 22], netanya: ['נתניה', 32.321, 34.853, 22], beer_sheva: ['באר שבע', 31.252, 34.791, 22],
    tzfat: ['צפת', 32.964, 35.496, 22], netivot: ['נתיבות', 31.42, 34.588, 22], rehovot: ['רחובות', 31.894, 34.811, 22]
  };
  // שקיעה בדקות מחצות, לפי השעון של המכשיר
  S.sunset = (k, deg) => {
    const c = S.CITIES[(S.state && S.state.home.city) || 'jerusalem'] || S.CITIES.jerusalem;
    const rad = Math.PI / 180, d = S.kdate(k);
    const jd = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12) / 864e5 + 2440587.5;
    const n = Math.round(jd - 2451545.0 + 0.0008);
    const js = n - c[2] / 360;
    const M = (357.5291 + 0.98560028 * js) % 360;
    const C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
    const L = (M + C + 180 + 102.9372) % 360;
    const jt = 2451545.0 + js + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
    const dec = Math.asin(Math.sin(L * rad) * Math.sin(23.44 * rad));
    const w = Math.acos((Math.sin(-(deg || 0.833) * rad) - Math.sin(c[1] * rad) * Math.sin(dec)) / (Math.cos(c[1] * rad) * Math.cos(dec))) / rad;
    const t = new Date((jt + w / 360 - 2440587.5) * 864e5);
    // תמיד לפי שעון ישראל, גם אם המכשיר מוגדר לאזור זמן אחר
    try {
      const parts = ilTime.formatToParts(t);
      const get = n => parseInt(parts.find(x => x.type === n).value, 10);
      return (get('hour') % 24) * 60 + get('minute');
    } catch { return t.getHours() * 60 + t.getMinutes(); }
  };
  let ilTime = null;
  try { ilTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hour12: false }); } catch { /* נופלים לשעון המכשיר */ }
  S.keepsShabbat = () => Boolean(S.state && S.state.home.shabbat);
  // מעגלים לחמש דקות לצד הבטוח: כניסה מוקדם יותר, יציאה מאוחר יותר
  S.candles = k => { const h = S.state.home; const c = S.CITIES[h.city] || S.CITIES.jerusalem; return Math.floor((S.sunset(k) - (h.candleMin ?? c[3])) / 5) * 5; };
  // צאת השבת: כשהשמש 8.5 מעלות מתחת לאופק (שלושה כוכבים), אלא אם הוגדר מספר דקות קבוע
  S.havdala = k => { const m = S.state.home.havdalaMin; return Math.ceil((m != null ? S.sunset(k) + m : S.sunset(k, 8.5)) / 5) * 5; };
  // סוג היום: week רגיל, friday ערב שבת, shabbat שבת, rest יום חופשי (למי שלא שומר)
  S.dayKind = k => {
    const w = S.dow(k);
    if (S.keepsShabbat()) return w === 6 ? 'shabbat' : w === 5 ? 'friday' : 'week';
    return w === 6 ? 'rest' : 'week';
  };
  S.isShabbatNow = () => {
    if (!S.keepsShabbat()) return false;
    const k = S.today(), w = S.dow(k), now = S.nowMin();
    return (w === 5 && now >= S.candles(k)) || (w === 6 && now < S.havdala(k));
  };

  // ---------- אייקונים ----------
  const I = {
    today: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    food: '<path d="M7 3v7a2.5 2.5 0 0 0 5 0V3M9.5 3v18M17 3c-2 1.5-3 4-3 7 0 2 1 3 3 3v8"/>',
    move: '<path d="M4 10v4M7.5 7v10M16.5 7v10M20 10v4M7.5 12h9"/>',
    sleep: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
    tasks: '<path d="M8.5 12.5l2.5 2.5 4.5-5"/><rect x="3.5" y="3.5" width="17" height="17" rx="5"/>',
    week: '<path d="M4 19V10M10 19V5M16 19v-6M22 19H2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.2 6.2l2.1 2.1M17.7 15.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 17.8l2.1-2.1M17.7 8.3l2.1-2.1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    next: '<path d="M15 6l-6 6 6 6"/>',
    prev: '<path d="M9 6l6 6-6 6"/>',
    swap: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
    cart: '<path d="M3 4h2.5l2.2 10.5h10l2-7.5H7"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="16.5" cy="19" r="1.4"/>',
    drop: '<path d="M12 3.5s6 6.3 6 10.5a6 6 0 0 1-12 0c0-4.2 6-10.5 6-10.5z"/>',
    star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9L12 17l-5.2 2.8 1-5.9-4.3-4.2 5.9-.8z"/>',
    fire: '<path d="M12 21a6.5 6.5 0 0 0 6.5-6.5c0-3-2-4.500-3-7-2 1-3 2.500-3.500 4.500C11 10.500 10 9 10 7c-2.500 2-4.500 4.500-4.500 7.500A6.500 6.500 0 0 0 12 21z"/>',
    play: '<path d="M8 5.500v13l11-6.500z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6.500 7l1 13h9l1-13"/>',
    share: '<path d="M12 15V4M8 7.500L12 3.500l4 4M5 12v7.500h14V12"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.500v2.500M12 19v2.500M2.500 12H5M19 12h2.500M5.300 5.300L7 7M17 17l1.700 1.700M5.300 18.700L7 17M17 7l1.700-1.700"/>',
    walk: '<circle cx="13" cy="4.500" r="1.800"/><path d="M9 21l2.500-6-2-2.500 1.500-5 3.500 1 2 3 3 1M11 7.500L7.500 9.500 7 13M13.500 14l1.500 3 .500 4"/>',
    bell: '<path d="M6 16.500V11a6 6 0 0 1 12 0v5.500l1.500 2h-15zM10 21h4"/>',
    candle: '<path d="M12 3c1.500 1.800 1.500 3.200 0 4.500-1.500-1.300-1.500-2.700 0-4.500zM9.500 10h5v11h-5zM7 21h10"/>',
    heart: '<path d="M12 20s-7.500-4.600-7.500-10A4.300 4.300 0 0 1 12 7.500 4.300 4.300 0 0 1 19.500 10c0 5.400-7.500 10-7.500 10z"/>',
    book: '<path d="M4 5.500A2.500 2.500 0 0 1 6.500 3H20v15H6.500A2.500 2.500 0 0 0 4 20.500zM4 20.500A2.500 2.500 0 0 0 6.500 23H20"/>',
    work: '<rect x="3" y="7.500" width="18" height="12" rx="2.500"/><path d="M9 7.500V5h6v2.500M3 13h18"/>',
    home: '<path d="M3.500 11.500L12 4.500l8.500 7V20h-5.500v-5.500h-6V20H3.500z"/>',
    dots: '<circle cx="5" cy="12" r="1.300"/><circle cx="12" cy="12" r="1.300"/><circle cx="19" cy="12" r="1.300"/>',
    scale: '<rect x="3.500" y="3.500" width="17" height="17" rx="4"/><path d="M8 9a5.500 5.500 0 0 1 8 0M12 9.500l1.500-2"/>',
    cal: '<rect x="3.500" y="5" width="17" height="15.500" rx="3"/><path d="M3.500 10h17M8 3v4M16 3v4"/>'
  };
  S.icon = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.800" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || I.dots}</svg>`;

  // ---------- טבעת ----------
  // p בין 0 ל-1. inner: תוכן באמצע הטבעת.
  S.ring = (p, o = {}) => {
    const size = o.size || 64, sw = o.sw || 7, r = (size - sw) / 2, c = 2 * Math.PI * r;
    const v = S.clamp(p || 0, 0, 1);
    return `<span class="ring ${o.cls || ''}" style="--rc:var(--${o.color || 'tx'});width:${size}px;height:${size}px">
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><circle class="ring__bg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}"/>
      <circle class="ring__fg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - v)).toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>
      ${o.inner != null ? `<span class="ring__in">${o.inner}</span>` : ''}</span>`;
  };
  S.bar = (p, color) => `<span class="bar" style="--rc:var(--${color || 'tx'})"><i style="width:${Math.round(S.clamp(p || 0, 0, 1) * 100)}%"></i></span>`;

  // ---------- הודעה קופצת ----------
  let toastT;
  S.toast = (text, undo) => {
    const el = document.getElementById('toast');
    if (!el) return;
    el.querySelector('span').textContent = text;
    const b = el.querySelector('button');
    b.hidden = !undo;
    b.onclick = undo ? () => { el.classList.remove('on'); undo(); } : null;
    el.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('on'), undo ? 5000 : 2200);
  };
  S.buzz = ms => { try { if (navigator.vibrate) navigator.vibrate(ms || 12); } catch { /* ריק */ } };

  // ---------- גיליון תחתון (נגרר למטה לסגירה) ----------
  let sheetClose = null;
  S.sheet = (html, o = {}) => {
    S.closeSheet(true);
    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML = `<div class="sheet-dim"></div><div class="sheet ${o.cls || ''}" role="dialog" aria-modal="true"><div class="sheet__grab" aria-hidden="true"><i></i></div><div class="sheet__body">${html}</div></div>`;
    document.body.append(wrap);
    const sheet = wrap.querySelector('.sheet'), dim = wrap.querySelector('.sheet-dim');
    requestAnimationFrame(() => wrap.classList.add('on'));
    let closed = false;
    const close = now => {
      if (closed) return;
      closed = true; sheetClose = null;
      if (o.onClose) o.onClose();
      if (S.sync && S.sync.pendingRender) { S.sync.pendingRender = false; setTimeout(() => { if (S.state && !document.querySelector('.sheet-wrap.on, .player')) S.soft(); }, 30); } // עדכון שהגיע מהטלפון השני בזמן שהגיליון היה פתוח
      if (now) { wrap.remove(); return; }
      wrap.classList.remove('on');
      sheet.style.transform = '';
      setTimeout(() => wrap.remove(), 320);
    };
    sheetClose = close;
    dim.addEventListener('click', () => close());
    // גרירה: עוקבים אחרי האצבע אחד לאחד, ובשחרור מחליטים לפי מהירות ומרחק
    let startY = 0, lastY = 0, lastT = 0, vel = 0, drag = false;
    const body = wrap.querySelector('.sheet__body');
    sheet.addEventListener('pointerdown', e => {
      if (e.target.closest('input, textarea, select, button, a, label, [data-act]') && !e.target.closest('.sheet__grab')) return;
      if (body.scrollTop > 0 && !e.target.closest('.sheet__grab')) return;
      drag = true; startY = lastY = e.clientY; lastT = e.timeStamp; vel = 0;
      sheet.style.transition = 'none';
      sheet.setPointerCapture(e.pointerId);
    });
    sheet.addEventListener('pointermove', e => {
      if (!drag) return;
      const dy = e.clientY - startY;
      const dt = e.timeStamp - lastT;
      if (dt > 0) vel = (e.clientY - lastY) / dt;
      lastY = e.clientY; lastT = e.timeStamp;
      sheet.style.transform = `translateY(${dy > 0 ? dy : dy / 6}px)`;
      dim.style.opacity = String(S.clamp(1 - dy / 500, 0.2, 1));
    });
    const end = e => {
      if (!drag) return;
      drag = false;
      sheet.style.transition = '';
      dim.style.opacity = '';
      const dy = e.clientY - startY;
      if (dy > 130 || (vel > 0.55 && dy > 20)) { sheet.style.transform = 'translateY(100%)'; close(); }
      else sheet.style.transform = '';
    };
    sheet.addEventListener('pointerup', end);
    sheet.addEventListener('pointercancel', end);
    return wrap;
  };
  S.closeSheet = now => { if (sheetClose) sheetClose(now); };

  // ---------- טפסים קטנים ----------
  // שדות: {id, label, type: text|num|time|pills|toggle|days|select, options, unit, min, max, step, hint}
  S.field = (f, v) => {
    const id = 'f-' + f.id, e = S.esc;
    const lab = f.label ? `<label for="${id}">${e(f.label)}</label>` : '';
    const hint = f.hint ? `<small class="hint">${e(f.hint)}</small>` : '';
    switch (f.type) {
      case 'num': return `<div class="f" data-f="${f.id}">${lab}<div class="stepper"><button type="button" class="ibtn" data-act="step" data-d="-1" aria-label="פחות">${S.icon('minus')}</button>
        <span class="stepper__v"><input id="${id}" name="${f.id}" inputmode="decimal" dir="ltr" value="${e(v ?? '')}" data-min="${f.min ?? ''}" data-max="${f.max ?? ''}" data-step="${f.step || 1}">${f.unit ? `<em>${e(f.unit)}</em>` : ''}</span>
        <button type="button" class="ibtn" data-act="step" data-d="1" aria-label="יותר">${S.icon('plus')}</button></div>${hint}</div>`;
      case 'time':
      case 'date': return `<div class="f f--row" data-f="${f.id}">${lab}<input id="${id}" name="${f.id}" type="${f.type}" value="${e(v || '')}">${hint}</div>`;
      case 'pills': return `<div class="f" data-f="${f.id}">${f.label ? `<span class="lab">${e(f.label)}</span>` : ''}<div class="pills">${f.options.map(o => `<label><input type="radio" name="${f.id}" value="${e(o[0])}" ${String(v) === String(o[0]) ? 'checked' : ''}><span>${e(o[1])}${o[2] ? `<small>${e(o[2])}</small>` : ''}</span></label>`).join('')}</div>${hint}</div>`;
      case 'days': return `<div class="f" data-f="${f.id}">${f.label ? `<span class="lab">${e(f.label)}</span>` : ''}<div class="daypick">${S.DAYS1.map((d, i) => (f.skip && f.skip.includes(i)) ? '' : `<label><input type="checkbox" name="${f.id}" value="${i}" ${(v || []).includes(i) ? 'checked' : ''}><span>${d}</span></label>`).join('')}</div>${hint}</div>`;
      case 'toggle': return `<div class="f" data-f="${f.id}"><label class="switch"><span>${e(f.label)}${f.hint ? `<small>${e(f.hint)}</small>` : ''}</span><input type="checkbox" name="${f.id}" ${v ? 'checked' : ''}><i></i></label></div>`;
      case 'select': return `<div class="f f--row" data-f="${f.id}">${lab}<select id="${id}" name="${f.id}">${f.options.map(o => `<option value="${e(o[0])}" ${String(v) === String(o[0]) ? 'selected' : ''}>${e(o[1])}</option>`).join('')}</select>${hint}</div>`;
      default: return `<div class="f" data-f="${f.id}">${lab}<input id="${id}" name="${f.id}" type="text" value="${e(v ?? '')}" placeholder="${e(f.placeholder || '')}" autocomplete="off">${hint}</div>`;
    }
  };
  // קורא ערכים מתוך אלמנט שמכיל שדות
  S.readFields = (root, fields) => {
    const out = {};
    for (const f of fields) {
      const q = n => root.querySelector(`[name="${n}"]`);
      if (f.type === 'toggle') out[f.id] = Boolean(q(f.id) && q(f.id).checked);
      else if (f.type === 'pills') { const c = root.querySelector(`[name="${f.id}"]:checked`); out[f.id] = c ? c.value : (f.options[0] && f.options[0][0]); }
      else if (f.type === 'days') out[f.id] = [...root.querySelectorAll(`[name="${f.id}"]:checked`)].map(x => +x.value);
      else if (f.type === 'num') { const el = q(f.id); const n = el ? parseFloat(String(el.value).replace(',', '.')) : NaN; out[f.id] = isNaN(n) ? null : n; }
      else out[f.id] = q(f.id) ? q(f.id).value.trim() : '';
    }
    return out;
  };
  S.act.step = el => {
    const inp = el.parentElement.querySelector('input');
    const step = parseFloat(inp.dataset.step) || 1;
    let n = parseFloat(String(inp.value).replace(',', '.'));
    if (isNaN(n)) n = parseFloat(inp.dataset.min) || 0;
    n = Math.round((n + step * (+el.dataset.d)) / step) * step;
    if (inp.dataset.min !== '') n = Math.max(+inp.dataset.min, n);
    if (inp.dataset.max !== '') n = Math.min(+inp.dataset.max, n);
    inp.value = String(+n.toFixed(2));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  };

  // הורדת קובץ מהדפדפן
  S.download = (name, text, type) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/plain;charset=utf-8' }));
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  };
  // באפליקציה שמותקנת על מסך הבית הורדה רגילה לא תמיד עובדת, ולכן קודם מנסים לשתף את הקובץ
  S.shareFile = (name, text, type, title) => {
    try {
      const file = new File([text], name, { type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: title || name }).catch(() => {}); return 'share'; }
    } catch { /* אין שיתוף קבצים */ }
    S.download(name, text, type + ';charset=utf-8');
    return 'download';
  };
  S.isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  S.isInstalled = () => Boolean(navigator.standalone) || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
})();
