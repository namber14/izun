// איזון · המוח: יעדים, תפריט, כמויות, קניות, אימונים, סדר יום, משימות וציון.
(function () {
  'use strict';
  const S = window.S;
  const { clamp, t2m, m2t, sum } = S;

  // ---------- יעדים אישיים ----------
  // נוסחת מיפלין וסנט ג׳אור, כפול רמת פעילות. הערכה בלבד, לא ייעוץ רפואי.
  S.targets = who => {
    const p = S.P(who);
    const age = clamp(new Date().getFullYear() - (p.birth || 1990), 16, 90);
    const bmr = 10 * p.weight + 6.25 * p.height - 5 * age + (p.sex === 'm' ? 5 : -161);
    const af = 1.3 + 0.04 * ((p.fit && p.fit.days) || []).length;
    const special = p.sex === 'f' ? (p.special || '') : '';
    const goal = special ? 'keep' : (p.goal || 'keep');
    let kcal = bmr * af;
    if (goal === 'lose') kcal *= 0.82;
    if (goal === 'gain') kcal *= 1.1;
    if (special === 'preg') kcal += 300;
    if (special === 'nurse') kcal += 450;
    kcal = Math.max(p.sex === 'm' ? 1500 : 1250, kcal);
    kcal = Math.round(kcal / 50) * 50;
    const ref = Math.min(p.weight, 27 * Math.pow(p.height / 100, 2)); // למשקל גבוה מחשבים לפי משקל ייחוס
    let protein = ref * (goal === 'lose' ? 1.4 : goal === 'gain' ? 1.5 : 1.2) + (special ? 20 : 0);
    protein = Math.round(protein / 5) * 5;
    return { kcal, protein, water: clamp(Math.round(p.weight * 30 / 250), 6, 12), bmr: Math.round(bmr), tdee: Math.round(bmr * af), goal, special };
  };

  // ---------- כמויות ----------
  S.roundQty = (id, g) => {
    const I = S.ING[id];
    if (I.u) { const step = I.r || 0.5; const n = Math.max(I.min || step, Math.round(g / I.u[2] / step) * step); return n * I.u[2]; }
    const st = g < 40 ? 5 : 10;
    return Math.max(st, Math.round(g / st) * st);
  };
  const FR = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
  S.qtyText = (id, g) => {
    const I = S.ING[id];
    if (!I.u) return `${Math.round(g)} ג׳`;
    const n = Math.round(g / I.u[2] * 4) / 4, w = Math.floor(n), f = n - w;
    const num = (w || '') + (FR[f] || '') || '0';
    if (I.self) return `<span class="ltr">${num}</span>`;
    return `<span class="ltr">${num}</span> ${n <= 1 ? I.u[0] : I.u[1]} <small>${Math.round(g)} ג׳</small>`;
  };
  const nut = items => {
    const o = { kcal: 0, p: 0, c: 0, f: 0 };
    for (const it of items) { const k = S.ING[it.id].k, m = it.g / 100; o.kcal += k[0] * m; o.p += k[1] * m; o.c += k[2] * m; o.f += k[3] * m; }
    return o;
  };
  S.dishBase = dish => nut(dish.i.map(([id, g]) => ({ id, g })));
  // מתאים מנה ליעד קלוריות. boost מגדיל את מקורות החלבון ומקטין את השאר, בלי לשנות את סך הקלוריות.
  S.portion = (dish, target, boost, lo, hi) => {
    const parts = dish.i.map(([id, g]) => ({ id, g, I: S.ING[id], kc: g * S.ING[id].k[0] / 100 }));
    const total = sum(parts, x => x.kc), fixK = sum(parts.filter(x => x.I.fix), x => x.kc), prK = sum(parts.filter(x => x.I.pr && !x.I.fix), x => x.kc);
    const restK = total - fixK - prK;
    const sc = clamp((target - fixK) / Math.max(1, total - fixK), lo, hi);
    const sp = Math.min(sc * (boost || 1), Math.max(sc, 1.7));
    let sr = sc;
    if (sp > sc && restK > 0) sr = clamp((sc * (prK + restK) - prK * sp) / restK, sc * 0.7, sc);
    const items = parts.map(x => ({ id: x.id, b: x.g, g: S.roundQty(x.id, x.I.fix ? x.g : x.g * (x.I.pr ? sp : sr)) }));
    return Object.assign({ items }, nut(items));
  };

  // ---------- משבצות הארוחה לפי סוג היום ----------
  S.mealSlots = k => {
    const kind = S.dayKind(k);
    if (kind === 'shabbat') return ['l', 'd'];
    if (kind === 'friday') return ['b', 's1', 'l', 'd'];
    return ['b', 's1', 'l', 's2', 'd'];
  };
  S.slotLabel = (k, slot) => {
    const kind = S.dayKind(k);
    if (kind === 'friday' && slot === 'd') return 'סעודת ליל שבת';
    if (kind === 'friday' && slot === 'l') return 'צהריים קל';
    if (kind === 'shabbat') return slot === 'l' ? 'סעודת שבת' : 'סעודה שלישית';
    return S.SLOTS[slot];
  };
  const SHARE = { b: 0.25, s1: 0.08, l: 0.35, s2: 0.08, d: 0.24 };
  const DEF_TIME = { b: '07:30', s1: '10:30', l: '13:00', s2: '16:00', d: '19:00' };
  S.slotTime = (k, who, slot) => {
    const kind = S.dayKind(k);
    if (kind === 'friday' && slot === 'd') return S.candles(k) + 100;
    if (kind === 'shabbat') return slot === 'l' ? 12 * 60 : S.havdala(k) - 100;
    const w = S.dow(k), p = S.P(who);
    const b = (p.blocks || []).find(x => x.k === 'meal' && x.slot === slot && x.d.includes(w));
    return t2m(b ? b.s : DEF_TIME[slot]);
  };
  // מאיזה מאגר נבחרת המנה במשבצת הזו
  const poolOf = (k, slot) => {
    const kind = S.dayKind(k);
    if (kind === 'shabbat') return slot === 'l' ? 'sd' : 's3';
    if (kind === 'friday' && slot === 'd') return 'sn';
    if (kind === 'friday' && slot === 'l') return 'd';
    return slot === 's1' || slot === 's2' ? 's' : slot;
  };
  const kosherWait = () => (S.home().kosher ? (S.home().waitHours ?? 6) * 60 : 0);
  // הפרש הזמן הקטן ביותר בין שתי ארוחות, אצל שני בני הזוג
  const gap = (k, s1, s2) => Math.min(...['a', 'b'].map(w => S.slotTime(k, w, s2) - S.slotTime(k, w, s1)));

  // ---------- תפריט שבועי ----------
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  S.genWeek = (wk, reshuffle) => {
    const prev = S.state.menu[wk];
    const n = prev ? prev.n + (reshuffle ? 1 : 0) : 0;
    const rnd = rng(hash(wk) + n * 7919);
    const used = new Set();
    const pick = (pool, kinds, prefer) => {
      let c = S.DISHES.filter(d => d.s === pool && kinds.includes(d.k));
      let fresh = c.filter(d => !used.has(d.id));
      if (!fresh.length) fresh = c;
      if (prefer) { const pf = fresh.filter(d => d.k === prefer); if (pf.length && rnd() < 0.7) fresh = pf; }
      const d = fresh[Math.floor(rnd() * fresh.length)];
      if (d) used.add(d.id);
      return d ? d.id : null;
    };
    const wait = kosherWait();
    const LUNCH = ['m', 'p', 'm', 'd', 'm', 'p', 'm'];
    const days = {};
    for (let i = 0; i < 7; i++) {
      const k = S.addDays(wk, i), kind = S.dayKind(k), o = {};
      if (kind === 'shabbat') { o.l = pick('sd', ['m']); o.d = pick('s3', ['p']); }
      else if (kind === 'friday') { o.b = pick('b', ['d', 'p']); o.s1 = pick('s', ['p', 'd']); o.l = pick('d', ['p', 'd']); o.d = pick('sn', ['m']); }
      else {
        o.l = pick('l', [LUNCH[i]]);
        const meat = S.dish(o.l).k === 'm';
        o.b = pick('b', ['d', 'p']);
        o.s1 = pick('s', ['d', 'p']);
        o.s2 = pick('s', meat && gap(k, 'l', 's2') < wait ? ['p'] : ['p', 'd']);
        if (meat) o.d = gap(k, 'l', 'd') < wait ? pick('d', ['p', 'm'], 'p') : pick('d', ['p', 'd']);
        else o.d = S.dish(o.l).k === 'd' ? pick('d', ['p', 'd'], 'p') : pick('d', ['p', 'd', 'm']);
        // ערב בשרי אחרי ביניים חלבי: מחליפים את הביניים לפרווה
        if (S.dish(o.d).k === 'm' && S.dish(o.s2).k === 'd' && wait) o.s2 = pick('s', ['p']);
      }
      days[k] = o;
    }
    S.state.menu[wk] = { n, days };
    S.save();
    return S.state.menu[wk];
  };
  S.menuDay = k => {
    const wk = S.weekKey(k);
    const m = S.state.menu[wk] || S.genWeek(wk);
    return m.days[k] || {};
  };
  // מנות שמותר להחליף אליהן, לפי כללי בשר וחלב של אותו יום
  S.swapOptions = (k, slot) => {
    const md = S.menuDay(k), wait = kosherWait(), pool = poolOf(k, slot);
    const slots = S.mealSlots(k);
    const kOf = s => (md[s] && S.dish(md[s]) ? S.dish(md[s]).k : 'p');
    return S.DISHES.filter(d => {
      if (d.s !== pool || d.id === md[slot]) return false;
      if (!wait) return true;
      for (const s of slots) {
        if (s === slot) continue;
        const dt = S.slotTime(k, 'a', slot) - S.slotTime(k, 'a', s); // חיובי: s לפני המשבצת
        const dt2 = Math.min(Math.abs(gap(k, s, slot)), Math.abs(gap(k, slot, s)));
        if (d.k === 'd' && kOf(s) === 'm' && dt > 0 && dt2 < wait) return false;
        if (d.k === 'm' && kOf(s) === 'd' && dt < 0 && dt2 < wait) return false;
      }
      return true;
    });
  };
  S.setDish = (k, slot, id) => { S.menuDay(k); S.state.menu[S.weekKey(k)].days[k][slot] = id; S.save(); };

  // אחרי העיגול ליחידות נוחות הסכום זז מעט. מתקנים בצעדים קטנים בפחמימות ובשומנים, עד 3 אחוזים מהיעד.
  const adjustable = id => { const I = S.ING[id]; return !I.fix && !I.pr && (I.cb || I.k[3] >= 15); };
  const stepOf = id => { const I = S.ING[id]; return I.u ? (I.r || 0.5) * I.u[2] : 10; };
  function tune(meals, target) {
    for (let n = 0; n < 16; n++) {
      const diff = sum(meals, m => m.kcal) - target;
      if (Math.abs(diff) <= target * 0.03) break;
      let best = null;
      for (const m of meals) {
        if (m.feast) continue;
        for (const it of m.items) {
          if (!adjustable(it.id)) continue;
          const I = S.ING[it.id], st = stepOf(it.id), kc = st * I.k[0] / 100;
          const minG = I.u ? (I.min || I.r || 0.5) * I.u[2] : 10;
          if (kc > Math.abs(diff) * 1.6) continue;
          if (diff > 0 && it.g - st < minG - 0.01) continue;
          if (diff < 0 && it.g + st > it.b * 2.3) continue;
          const score = diff > 0 ? it.g / it.b : -it.g / it.b;
          if (!best || score > best.score) best = { m, it, st, score };
        }
      }
      if (!best) break;
      best.it.g += diff > 0 ? -best.st : best.st;
      Object.assign(best.m, nut(best.m.items));
    }
  }

  // תפריט היום של אדם אחד, עם כמויות אישיות
  S.mealPlan = (k, who) => {
    const T = S.targets(who), md = S.menuDay(k), kind = S.dayKind(k), d = S.peek(k, who);
    const shab = clamp(T.kcal / 2000, 0.7, 1.4);
    const build = boost => S.mealSlots(k).map(slot => {
      const dish = md[slot] && S.dish(md[slot]);
      if (!dish) return null;
      const feast = ['sn', 'sd', 's3'].includes(dish.s);
      const snack = dish.s === 's';
      const base = S.dishBase(dish).kcal;
      const share = kind === 'friday' && slot === 'l' ? 0.22 : SHARE[slot];
      const por = feast ? S.portion(dish, base * shab, 1, 0.7, 1.4) : S.portion(dish, T.kcal * share, boost, snack ? 0.5 : 0.6, snack ? 2.2 : 1.9);
      return Object.assign(por, { slot, dish, label: S.slotLabel(k, slot), time: S.slotTime(k, who, slot), eaten: d.meals[slot] || 0, feast });
    }).filter(Boolean);
    let meals = build(1);
    const prot = () => sum(meals, m => m.p);
    if (kind !== 'shabbat') {
      if (prot() < T.protein * 0.95) meals = build(1.2);
      if (prot() < T.protein * 0.9) meals = build(1.4);
    }
    if (kind === 'week' || kind === 'rest') tune(meals, T.kcal);
    const total = { kcal: sum(meals, m => m.kcal), p: prot(), c: sum(meals, m => m.c), f: sum(meals, m => m.f) };
    return { meals, total, target: T };
  };

  // ---------- רשימת קניות ----------
  // from: מאיזה יום (כולל) עד סוף השבוע. מחשב לשניכם, ועוד הסועדים הנוספים בארוחות המשותפות.
  S.shopList = (wk, from) => {
    const need = {};
    const add = (id, g) => { need[id] = (need[id] || 0) + g; };
    const extra = S.home().extra || 0;
    for (let i = 0; i < 7; i++) {
      const k = S.addDays(wk, i);
      if (from && k < from) continue;
      for (const who of ['a', 'b']) for (const m of S.mealPlan(k, who).meals) for (const it of m.items) add(it.id, it.g);
      if (extra) {
        const md = S.menuDay(k);
        for (const slot of S.mealSlots(k)) {
          const dish = md[slot] && S.dish(md[slot]);
          if (!dish || !(slot === 'd' || ['sn', 'sd', 's3'].includes(dish.s))) continue;
          for (const [id, g] of dish.i) if (!S.ING[id].fix) add(id, g * 0.7 * extra);
        }
      }
    }
    const depts = {};
    for (const [id, g] of Object.entries(need)) {
      const I = S.ING[id];
      let name = I.n, text;
      if (I.buy) { name = I.buy.n; const dry = Math.ceil(g * I.buy.f / 50) * 50; text = dry >= 1000 ? `${(dry / 1000).toFixed(1)} ק״ג` : `${dry} ג׳`; }
      else if (I.self) { const n = Math.ceil(g / I.u[2] - 0.05); text = `${n}`; name = I.pl || I.u[1]; }
      else {
        const gr = Math.ceil(g / 50) * 50;
        text = gr >= 1000 ? `${(gr / 1000).toFixed(1)} ק״ג` : `${gr} ג׳`;
        if (I.pack) { const n = Math.ceil(g / I.pack[0] - 0.05); text = `${n} ${n === 1 ? I.pack[1] : I.pack[2]}`; }
        else if (id === 'tuna') { const n = Math.ceil(g / 110 - 0.05); text = `${n} ${n === 1 ? 'קופסה' : 'קופסאות'}`; }
        else if (id === 'yogurt_pro') { const n = Math.ceil(g / 200 - 0.05); text = `${n} ${n === 1 ? 'גביע' : 'גביעים'}`; }
      }
      (depts[I.d] || (depts[I.d] = [])).push({ id, name, text });
    }
    return ['veg', 'meat', 'dairy', 'deli', 'bake', 'frozen', 'pantry'].filter(d => depts[d]).map(d => ({ dept: d, label: S.DEPTS[d], items: depts[d].sort((a, b) => a.name.localeCompare(b.name, 'he')) }));
  };
  S.shopState = wk => S.state.shop[wk] || (S.state.shop[wk] = { got: {}, extra: [] });

  // ---------- אימונים ----------
  S.workoutFor = (k, who) => {
    const p = S.P(who), f = p.fit;
    if (!f || !f.days || !f.days.includes(S.dow(k)) || S.dayKind(k) === 'shabbat') return null;
    const sorted = f.days.slice().sort((a, b) => a - b);
    const variant = sorted.indexOf(S.dow(k)) % 2 ? 'B' : 'A';
    const soft = p.sex === 'f' && p.special === 'preg';
    const lv = soft ? 1 : clamp(+f.level || 1, 1, 3);
    const weeks = Math.max(0, Math.floor(S.diffDays(k, f.since || k) / 7));
    const bonus = clamp(Math.floor(weeks / 2), 0, 4);
    const mins = +f.minutes || 25;
    if (f.place === 'walk') {
      const items = [{ n: 'חימום בקצב נוח', secs: 180, how: 'הליכה רגועה, כתפיים משוחררות.' }];
      if (lv === 1 || soft) items.push({ n: 'הליכה מהירה', secs: (mins - 5) * 60, how: 'קצב שבו אפשר לדבר, אבל לא לשיר. צעדים ארוכים וידיים עובדות.' });
      else {
        const run = lv === 2 ? 60 + bonus * 15 : 120 + bonus * 20, walk = lv === 2 ? 120 : 90;
        const rounds = Math.max(2, Math.floor((mins - 5) * 60 / (run + walk)));
        for (let i = 0; i < rounds; i++) { items.push({ n: 'ריצה קלה', secs: run, how: 'קצב איטי שאפשר להחזיק. נשימה סדירה.' }); items.push({ n: 'הליכה', secs: walk, how: 'מורידים דופק והולכים בקצב נוח.' }); }
      }
      items.push({ n: 'שחרור בקצב איטי', secs: 120, how: 'מאטים בהדרגה ונושמים עמוק.' });
      return { type: 'walk', title: lv === 1 || soft ? 'הליכה מהירה' : 'ריצה והליכה לסירוגין', sets: 1, rest: 0, items, mins, variant };
    }
    const count = mins <= 15 ? 4 : mins <= 25 ? 5 : 6;
    const sets = mins <= 15 ? 2 : (mins >= 40 && lv >= 2 ? 4 : 3);
    const reps = [0, 10, 12, 14][lv] + bonus, secs = [0, 25, 35, 45][lv] + bonus * 5;
    const eqOk = f.place === 'home' ? ['none'] : f.place === 'db' ? ['db', 'none'] : ['gym', 'none'];
    const chosen = [], seen = {};
    for (const g of S.WORKOUT_ORDER[variant].slice(0, count)) {
      let c = Object.entries(S.EX).filter(([id, e]) => e.g === g && eqOk.includes(e.eq) && e.lv <= lv && !chosen.includes(id) && (!soft || e.soft));
      if (!c.length) continue;
      const top = Math.max(...c.map(([, e]) => e.lv));
      let best = c.filter(([, e]) => e.lv >= top - (lv >= 3 ? 1 : 0));
      const withEq = best.filter(([, e]) => e.eq === eqOk[0]);
      if (withEq.length) best = withEq;
      const idx = ((seen[g] || 0) + (variant === 'B' ? 1 : 0)) % best.length;
      seen[g] = (seen[g] || 0) + 1;
      chosen.push(best[idx][0]);
    }
    const items = chosen.map(id => { const e = S.EX[id]; return e.t === 's' ? { id, n: e.n, how: e.how, secs, side: e.side } : { id, n: e.n, how: e.how, reps, side: e.side }; });
    const rest = lv === 1 ? 50 : 40;
    const est = Math.round((sets * items.length * (38 + rest)) / 60) + 2;
    return { type: 'strength', title: `אימון כוח ${variant === 'A' ? 'א׳' : 'ב׳'}`, sets, rest, items, mins: est, variant, soft };
  };

  // ---------- סדר היום ----------
  // בונה את הבלוקים הקבועים של אדם מתוך הפרופיל. אפשר לערוך אחר כך כל בלוק.
  S.buildBlocks = who => {
    const p = S.P(who), keeps = S.home().shabbat;
    const W = t2m(p.wake), B = [];
    const WD = [0, 1, 2, 3, 4], FRI = [5], ALL = keeps ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6];
    const EVE = keeps ? [0, 1, 2, 3, 4, 6] : [0, 1, 2, 3, 4, 5, 6];
    const add = (t, k, s, m, d, x) => { if (d.length) B.push(Object.assign({ id: S.uid() + B.length, t, k, s: m2t(s), m, d }, x || {})); };
    const fitDays = (p.fit.days || []).filter(d => ALL.includes(d));
    const fm = +p.fit.minutes || 25, when = p.fit.when || 'evening';
    add('השכמה', 'wake', W, 10, keeps ? [0, 1, 2, 3, 4, 5] : ALL);
    let cur = W + 15;
    if (when === 'morning') { add('אימון', 'move', cur, fm, fitDays); cur += fm + 15; }
    if (p.shacharit) { const s = t2m(p.shacharit); add('שחרית', 'pray', s, 45, ALL); cur = Math.max(cur, s + 50); }
    const bf = cur;
    add('ארוחת בוקר', 'meal', bf, 20, ALL, { slot: 'b' });
    const work = p.work && p.work.on;
    if (work) add('עבודה', 'work', t2m(p.work.from), Math.max(60, t2m(p.work.to) - t2m(p.work.from)), WD);
    add('ביניים', 'meal', clamp(bf + 170, 600, 660), 10, ALL, { slot: 's1' });
    const lunch = bf > 570 ? 810 : 780;
    if (when === 'noon') add('אימון', 'move', lunch - fm - 10, fm, fitDays.filter(d => d !== 5));
    add('ארוחת צהריים', 'meal', lunch, 30, keeps ? WD : ALL, { slot: 'l' });
    if (keeps) {
      add('הכנות לשבת', 'home', Math.max(bf + 60, 570), 120, FRI);
      add('צהריים קל', 'meal', 720, 25, FRI, { slot: 'l' });
      if (when !== 'morning') add('אימון', 'move', Math.max(bf + 45, 540), fm, fitDays.filter(d => d === 5));
    }
    add('ביניים', 'meal', 960, 10, keeps ? WD : ALL, { slot: 's2' });
    const bed = ((W - Math.round((p.sleepHours || 7.5) * 60)) % 1440 + 1440) % 1440;
    const bedL = bed < W ? bed + 1440 : bed; // שעת השינה על ציר של היום, גם אם היא אחרי חצות
    const wind = bedL - 40;
    const workEnd = work ? t2m(p.work.to) : 17 * 60;
    let dinner = 19 * 60;
    if (when === 'evening') {
      const ws = Math.max(workEnd + 30, 17 * 60 + 30);
      add('אימון', 'move', ws, fm, fitDays.filter(d => d !== 5));
      dinner = Math.max(dinner, ws + fm + 20);
    }
    dinner = Math.min(dinner, wind - 120);
    add('ארוחת ערב', 'meal', dinner, 30, keeps ? WD : ALL, { slot: 'd' });
    if (p.study) add('לימוד קבוע', 'study', t2m(p.study), +p.studyMin || 45, WD);
    const windOf = x => { const w = t2m(x.wake), b = ((w - Math.round((x.sleepHours || 7.5) * 60)) % 1440 + 1440) % 1440; return (b < w ? b + 1440 : b) - 40; };
    const together = Math.floor((Math.min(windOf(S.P('a')), windOf(S.P('b'))) - 25) / 5) * 5;
    add('זמן לשניכם', 'couple', together, 20, WD);
    add('מתארגנים לשינה', 'wind', wind, 40, EVE);
    add('שינה', 'sleep', bedL, Math.round((p.sleepHours || 7.5) * 60), EVE);
    return B;
  };
  S.bedPlan = who => { const p = S.P(who); return ((t2m(p.wake) - Math.round((p.sleepHours || 7.5) * 60)) % 1440 + 1440) % 1440; };

  // הבלוקים של יום מסוים, לפי הסדר, עם מצב הביצוע
  S.blocksFor = (k, who) => {
    const p = S.P(who), kind = S.dayKind(k), w = S.dow(k), d = S.peek(k, who);
    const W = t2m(p.wake);
    let list = (p.blocks || []).filter(b => b.d.includes(w)).map(b => {
      let sm = t2m(b.s);
      if (sm < W - 60 && ['sleep', 'wind', 'couple', 'home', 'study', 'other'].includes(b.k)) sm += 1440; // אחרי חצות
      return Object.assign({}, b, { sm });
    });
    if (kind === 'friday') {
      const c = S.candles(k);
      list = list.filter(b => b.sm < c - 60);
      list.push({ id: '_prep', t: 'מתארגנים לשבת', k: 'shab', sm: c - 60, m: 60, auto: 1 });
      list.push({ id: '_candles', t: 'כניסת שבת', k: 'shab', sm: c, m: 0, auto: 1, note: 'זמן משוער' });
    }
    if (kind === 'shabbat') {
      const h = S.havdala(k);
      list = list.filter(b => b.sm >= h);
      list.push({ id: '_havdala', t: 'צאת השבת', k: 'shab', sm: h - 1, m: 0, auto: 1, note: 'זמן משוער' });
    }
    list.sort((a, b) => a.sm - b.sm);
    for (const b of list) {
      if (b.k === 'meal') b.done = Boolean(d.meals[b.slot]);
      else if (b.k === 'move') b.done = Boolean(d.workout && d.workout.done);
      else b.done = Boolean(d.done[b.id]);
    }
    return list;
  };
  // מה קורה עכשיו ומה הבא בתור
  S.nowBlock = (k, who) => {
    const list = S.blocksFor(k, who), now = S.nowMin();
    let cur = null, next = null;
    for (const b of list) {
      if (b.sm <= now && now < b.sm + Math.max(b.m, 1)) cur = b;
      else if (b.sm > now && !next) next = b;
    }
    return { cur, next, list };
  };

  // ---------- משימות ----------
  S.taskOn = (t, k) => {
    const start = t.due || S.dkey(new Date(t.c));
    if (t.rep) {
      if (k < start) return false;
      if (S.dayKind(k) === 'shabbat') return false;
      if (t.rep === 'd') return true;
      if (t.rep === 'w') return S.dow(k) === S.dow(start);
      if (t.rep === 'm') return S.kdate(k).getDate() === S.kdate(start).getDate();
    }
    if (!t.due) return false;
    if (t.done) return t.done === k;
    return t.due === k || (t.due < k && k === S.today());
  };
  S.taskDone = (t, k) => (t.rep ? Boolean(t.log && t.log[k]) : Boolean(t.done));
  S.tasksFor = (k, who) => S.state.tasks.filter(t => (who === 'both' || t.who === 'both' || t.who === who) && S.taskOn(t, k));
  S.toggleTask = (t, k) => {
    if (t.rep) { t.log = t.log || {}; if (t.log[k]) delete t.log[k]; else t.log[k] = 1; }
    else t.done = t.done ? null : k;
    S.save();
  };

  // ---------- שינה ----------
  S.sleepMins = sl => (sl && sl.bed && sl.wake ? ((t2m(sl.wake) - t2m(sl.bed)) % 1440 + 1440) % 1440 : 0);

  // ---------- ציון היום ----------
  S.score = (k, who) => {
    const d = S.peek(k, who), kind = S.dayKind(k), p = S.P(who), T = S.targets(who);
    const out = { shabbat: kind === 'shabbat' };
    // אוכל: ארוחות לפי התוכנית, ומים
    const slots = S.mealSlots(k).filter(s => !(kind === 'friday' && s === 'd') && kind !== 'shabbat');
    const mealPts = sum(slots, s => (d.meals[s] === 1 ? 1 : d.meals[s] === 2 ? 0.5 : 0));
    out.meals = [slots.filter(s => d.meals[s]).length, slots.length];
    out.water = [d.water || 0, T.water];
    out.food = slots.length ? (mealPts / slots.length) * 0.8 + clamp((d.water || 0) / T.water, 0, 1) * 0.2 : 0;
    // תנועה
    const wo = S.workoutFor(k, who), goal = p.walkGoal ?? 20;
    const walk = goal ? clamp((d.walk || 0) / goal, 0, 1) : 1;
    out.workout = wo ? (d.workout && d.workout.done ? 1 : 0) : null;
    out.walk = [d.walk || 0, goal];
    out.move = wo ? out.workout * 0.75 + walk * 0.25 : walk;
    // שינה
    const mins = S.sleepMins(d.sleep);
    out.sleepMins = mins;
    if (mins) {
      let diff = Math.abs(t2m(d.sleep.bed) - S.bedPlan(who));
      diff = Math.min(diff, 1440 - diff);
      out.sleep = clamp(mins / ((p.sleepHours || 7.5) * 60), 0, 1) * 0.7 + (diff <= 20 ? 1 : clamp(1 - (diff - 20) / 90, 0, 1)) * 0.3;
    } else out.sleep = 0;
    // סדר: עוגני היום והמשימות
    const blocks = S.blocksFor(k, who).filter(b => !b.auto && !['meal', 'move', 'sleep', 'wake', 'work'].includes(b.k));
    const tasks = S.tasksFor(k, who);
    const n = blocks.length + tasks.length;
    const done = blocks.filter(b => b.done).length + tasks.filter(t => S.taskDone(t, k)).length;
    out.orderN = [done, n];
    out.order = n ? done / n : null;
    const parts = [[out.food, 0.3], [out.move, 0.25], [out.sleep, 0.25]];
    if (out.order != null) parts.push([out.order, 0.2]);
    out.all = sum(parts, x => x[0] * x[1]) / sum(parts, x => x[1]);
    return out;
  };

  // רצף ימים מעל 60 אחוז (שבת לא שוברת רצף)
  S.streak = who => {
    let k = S.today(), n = 0;
    if (S.dayKind(k) !== 'shabbat' && S.score(k, who).all >= 0.6) n++;
    for (let i = 0; i < 400; i++) {
      k = S.addDays(k, -1);
      if (S.dayKind(k) === 'shabbat') continue;
      if (!S.state.days[k] || !S.state.days[k][who]) break;
      if (S.score(k, who).all >= 0.6) n++; else break;
    }
    return n;
  };

  // ---------- פרופיל ובית ----------
  S.newPerson = (sex, name) => ({
    name, sex, birth: 1990, height: sex === 'm' ? 176 : 163, weight: sex === 'm' ? 82 : 66, goal: 'lose', special: '',
    wake: '06:30', sleepHours: 7.5, work: { on: true, from: sex === 'm' ? '09:00' : '08:30', to: sex === 'm' ? '17:00' : '15:30' },
    shacharit: '', study: '', studyMin: 45, walkGoal: 20,
    fit: { place: 'home', level: 1, days: [0, 2, 4], minutes: 25, when: sex === 'm' ? 'evening' : 'morning', since: S.today() },
    blocks: []
  });
  S.newState = () => ({
    v: 1, createdAt: Date.now(),
    home: { kosher: true, shabbat: true, waitHours: 6, city: 'jerusalem', theme: 'night', extra: 0 },
    people: { a: S.newPerson('m', ''), b: S.newPerson('f', '') },
    days: {}, menu: {}, shop: {}, tasks: [], weights: [], reviews: {}
  });
  // בנייה מחדש שומרת על עוגנים שנוספו ביד
  S.rebuild = who => { const p = S.P(who); p.blocks = S.buildBlocks(who).concat((p.blocks || []).filter(b => b.u)); S.save(); };
  S.logWeight = (who, kg, k) => {
    k = k || S.today();
    const ws = S.state.weights;
    const i = ws.findIndex(x => x.who === who && x.k === k);
    if (i >= 0) ws[i].kg = kg; else ws.push({ who, k, kg });
    ws.sort((a, b) => (a.k < b.k ? -1 : 1));
    const last = ws.filter(x => x.who === who).pop();
    if (last) S.P(who).weight = last.kg;
    S.save();
  };
})();
