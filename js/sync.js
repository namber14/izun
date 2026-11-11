// איזון · עדכון חי בין שני הטלפונים.
// כל פריט (יום של אדם, משימה, מנה, פריט קניות) מקבל חותמת זמן משלו, ובמיזוג מנצח מי שנגע בו אחרון.
// המידע מוצפן במכשיר עם מפתח שנגזר מהקוד המשפחתי. בענן נשמר רק גוש מוצפן.
(function () {
  'use strict';
  const S = window.S, CFG = window.IZUN_CONFIG || {};
  const SK = 'izun:sync', WINDOW = 120, POLL = 5000, DAY = 864e5;
  const ABC = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
  const enc = new TextEncoder(), dec = new TextDecoder();
  let sy = null, key = null, busy = false, again = false, pollT = null, pushT = null;
  let status = 'off', lastOk = 0;
  const auto = new Set();

  // ---------- כלים ----------
  // טקסט יציב לכל ערך (מפתחות ממוינים), כדי ששני מכשירים ישוו אותו דבר
  const canon = v => {
    if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  };
  const sha = async s => new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)));
  const hex = u => Array.from(u, b => b.toString(16).padStart(2, '0')).join('');
  const b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const cleanCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const fmtCode = c => cleanCode(c).replace(/(.{5})(?=.)/g, '$1-');
  const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(20)), b => ABC[b % ABC.length]).join('');
  const cutoff = () => S.addDays(S.today(), -WINDOW);

  async function derive(code) {
    const c = cleanCode(code);
    return { id: hex(await sha('izun-id:' + c)), k: await crypto.subtle.importKey('raw', await sha('izun-key:' + c), 'AES-GCM', false, ['encrypt', 'decrypt']) };
  }
  async function seal(obj, k) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc.encode(JSON.stringify(obj))));
    const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
    return 'p1:' + b64(out);
  }
  async function unseal(blob, k) {
    const raw = unb64(blob.slice(blob.indexOf(':') + 1));
    return JSON.parse(dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.subarray(0, 12) }, k, raw.subarray(12))));
  }
  async function rpc(fn, body) {
    const r = await fetch(`${CFG.url}/rest/v1/rpc/${fn}`, { method: 'POST', cache: 'no-store', headers: { apikey: CFG.key, Authorization: 'Bearer ' + CFG.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('הענן ענה ' + r.status);
    return r.json();
  }

  // ---------- פירוק המצב לפריטים, והרכבה חזרה ----------
  function flatten(st) {
    const o = {}, cut = cutoff();
    const put = (k, v) => { o[k] = canon(v); };
    const home = Object.assign({}, st.home); delete home.theme; // ערכת המראה אישית לכל מכשיר
    put('h', home); put('c', st.createdAt || 0);
    for (const x of ['a', 'b']) put('p|' + x, st.people[x]);
    for (const k of Object.keys(st.days)) {
      if (k < cut) continue;
      for (const w of Object.keys(st.days[k])) { const rec = Object.assign({}, st.days[k][w]); delete rec.sc; put(`d|${k}|${w}`, rec); } // הציון השמור נשאר מקומי
    }
    for (const wk of Object.keys(st.menu)) if (wk >= cut) put('m|' + wk, st.menu[wk]);
    for (const wk of Object.keys(st.shop)) {
      if (wk < cut) continue;
      const s = st.shop[wk];
      for (const id of Object.keys(s.got || {})) if (s.got[id]) put(`sg|${wk}|${id}`, 1);
      for (const x of s.extra || []) put(`sx|${wk}|${x.id}`, x);
    }
    for (const t of st.tasks) put('t|' + t.id, t);
    for (const w of st.weights) put(`w|${w.who}|${w.k}`, w.kg);
    for (const wk of Object.keys(st.reviews)) if (wk >= cut) put('r|' + wk, st.reviews[wk]);
    return o;
  }
  function unflatten(vals, local) {
    const st = { v: 1, createdAt: 0, home: {}, people: {}, days: {}, menu: {}, shop: {}, tasks: [], weights: [], reviews: {} };
    const cut = cutoff();
    if (local) { // מה שלא מסתנכרן נשאר כמו שהוא במכשיר: היסטוריה ישנה
      for (const k of Object.keys(local.days)) if (k < cut) st.days[k] = local.days[k];
      for (const part of ['menu', 'shop', 'reviews']) for (const wk of Object.keys(local[part])) if (wk < cut) st[part][wk] = local[part][wk];
    }
    const shop = wk => st.shop[wk] || (st.shop[wk] = { got: {}, extra: [] });
    for (const key of Object.keys(vals)) {
      if (vals[key] == null) continue;
      let v; try { v = JSON.parse(vals[key]); } catch { continue; }
      const p = key.split('|');
      if (p[0] === 'h') st.home = v;
      else if (p[0] === 'c') st.createdAt = v;
      else if (p[0] === 'p') st.people[p[1]] = v;
      else if (p[0] === 'd') {
        const old = local && local.days[p[1]] && local.days[p[1]][p[2]];
        if (old && old.sc) { const bare = Object.assign({}, old); delete bare.sc; if (canon(bare) === vals[key]) v.sc = old.sc; }
        (st.days[p[1]] || (st.days[p[1]] = {}))[p[2]] = v;
      }
      else if (p[0] === 'm') st.menu[p[1]] = v;
      else if (p[0] === 'sg') shop(p[1]).got[p.slice(2).join('|')] = 1;
      else if (p[0] === 'sx') shop(p[1]).extra.push(v);
      else if (p[0] === 't') st.tasks.push(v);
      else if (p[0] === 'w') st.weights.push({ who: p[1], k: p[2], kg: v });
      else if (p[0] === 'r') st.reviews[p[1]] = v;
    }
    st.home.theme = local ? local.home.theme : 'night';
    st.tasks.sort((a, b) => (a.c || 0) - (b.c || 0));
    st.weights.sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0));
    for (const wk of Object.keys(st.shop)) st.shop[wk].extra.sort((a, b) => (a.id < b.id ? -1 : 1));
    return S.normalize(st);
  }

  const persist = () => { try { if (sy) localStorage.setItem(SK, JSON.stringify(sy)); else localStorage.removeItem(SK); } catch { /* ריק */ } };

  // ---------- מעקב אחרי שינויים מקומיים ----------
  // נקרא אחרי כל שמירה. משווה כל פריט למה שנשמר בפעם הקודמת, ומחתים את מה שהשתנה.
  function track() {
    if (!sy || !S.state) return;
    const cur = flatten(S.state), now = Date.now(), cut = cutoff();
    let changed = false;
    for (const k in cur) {
      if (sy.base[k] === cur[k]) continue;
      // פריט שהאפליקציה יצרה לבד (תפריט לשבוע חדש) מקבל חותמת נמוכה, כדי שלא ידרוס עריכה אמיתית מהמכשיר השני
      sy.ts[k] = auto.has(k) && !(k in sy.ts) ? 1 : Math.max(now, (sy.ts[k] || 0) + 1);
      sy.base[k] = cur[k]; changed = true;
    }
    for (const k in sy.base) {
      if (k in cur) continue;
      const p = k.split('|');
      const dated = { d: 1, m: 1, sg: 1, sx: 1, r: 1 }[p[0]] && p[1] < cut;
      if (dated || (sy.base[k] === null && now - sy.ts[k] > 60 * DAY)) { delete sy.base[k]; delete sy.ts[k]; continue; } // יצא מחלון העדכון, או מחיקה ישנה מאוד
      if (sy.base[k] === null) continue;
      sy.base[k] = null; sy.ts[k] = Math.max(now, (sy.ts[k] || 0) + 1); changed = true; // נמחק במכשיר הזה
    }
    auto.clear();
    if (changed) { sy.dirty = true; persist(); clearTimeout(pushT); pushT = setTimeout(cycle, 1200); }
  }

  // ---------- מיזוג ----------
  function merge(doc) {
    let remoteWins = false, localWins = false;
    for (const k in doc) {
      const rts = doc[k][0], lts = sy.ts[k] || 0;
      if (rts > lts) { sy.ts[k] = rts; sy.base[k] = doc[k][1]; remoteWins = true; }
      else if (lts > rts) localWins = true;
    }
    for (const k in sy.ts) if (!(k in doc)) localWins = true;
    return { remoteWins, localWins };
  }
  const makeDoc = () => { const d = {}; for (const k in sy.ts) d[k] = [sy.ts[k], sy.base[k] === undefined ? null : sy.base[k]]; return d; };
  function applyRemote() {
    const st = unflatten(sy.base, S.state);
    if (!st) return;
    S.state = st;
    for (const x of ['a', 'b']) if (!st.people[x].blocks.length) st.people[x].blocks = S.buildBlocks(x);
    S.writeLocal();
    const a = document.activeElement;
    if (document.querySelector('.sheet-wrap, .player') || (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName))) { S.sync.pendingRender = true; return; }
    S.soft();
  }
  async function absorb(r) {
    const doc = await unseal(r.blob, key);
    track(); // קודם קולטים שינוי מקומי שעוד לא נרשם, כדי שלא יידרס
    const m = merge(doc);
    sy.rev = r.rev;
    sy.dirty = m.localWins;
    if (m.remoteWins) applyRemote();
    persist();
  }

  // ---------- מחזור עדכון: מושכים, ממזגים, דוחפים ----------
  async function cycle() {
    if (!sy || !key || !S.state) return;
    if (busy) { again = true; return; }
    busy = true;
    try {
      for (let i = 0; i < 5; i++) {
        if (!sy.dirty) {
          const r = await rpc('izun_pull', { p_id: sy.id, p_rev: sy.rev });
          if (r === null && sy.rev > 0) { cut('העדכון החי נותק: העותק בענן נמחק מהטלפון השני.'); break; }
          if (r === null) { sy.dirty = true; continue; }
          if (!r.blob) break;
          await absorb(r);
          if (!sy.dirty) break;
          continue;
        }
        const res = await rpc('izun_push', { p_id: sy.id, p_blob: await seal(makeDoc(), key), p_rev: sy.rev });
        if (res.ok) { sy.rev = res.rev; sy.dirty = false; persist(); if (!again) break; again = false; continue; }
        if (res.rev === 0 && sy.rev > 0) { cut('העדכון החי נותק: העותק בענן נמחק מהטלפון השני.'); break; }
        const r = await rpc('izun_pull', { p_id: sy.id, p_rev: 0 });
        if (r && r.blob) await absorb(r); else sy.rev = 0;
      }
      if (sy) { status = 'ok'; lastOk = Date.now(); }
    } catch (e) {
      status = navigator.onLine === false ? 'offline' : 'error';
    }
    busy = false;
    if (again && sy) { again = false; setTimeout(cycle, 300); }
  }
  function cut(msg) { sy = null; key = null; status = 'off'; persist(); stop(); if (msg) S.toast(msg); }
  function stop() { clearInterval(pollT); pollT = null; clearTimeout(pushT); }
  function startPolling() {
    stop();
    pollT = setInterval(() => { if (!document.hidden && sy) cycle(); }, POLL);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && sy) cycle(); });
  window.addEventListener('online', () => { if (sy) cycle(); });

  // ---------- מה שהמסכים משתמשים בו ----------
  S.sync = {
    pendingRender: false,
    available: () => Boolean(CFG.url && CFG.key && window.crypto && crypto.subtle && window.fetch),
    on: () => Boolean(sy),
    code: () => (sy ? fmtCode(sy.code) : ''),
    info: () => ({ status, lastOk, dirty: Boolean(sy && sy.dirty) }),
    track,
    markAuto: k => auto.add(k),
    now: cycle,
    // מפעיל עדכון חי במכשיר הזה, עם קוד משפחתי חדש
    async enable() {
      const code = newCode(), d = await derive(code);
      key = d.k;
      sy = { code, id: d.id, rev: 0, dirty: true, ts: {}, base: {} };
      track(); persist();
      await cycle();
      startPolling();
      return fmtCode(code);
    },
    // מושך בית קיים לפי קוד. מחזיר את המצב שנמצא, בלי להחיל אותו עדיין.
    async fetchHome(code) {
      if (cleanCode(code).length !== 20) throw new Error('בקוד יש 20 אותיות וספרות');
      const d = await derive(code);
      const r = await rpc('izun_pull', { p_id: d.id, p_rev: 0 });
      if (!r || !r.blob) throw new Error('לא נמצא בית עם הקוד הזה');
      const doc = await unseal(r.blob, d.k);
      const next = { code: cleanCode(code), id: d.id, rev: r.rev, dirty: false, ts: {}, base: {} };
      for (const k in doc) { next.ts[k] = doc[k][0]; next.base[k] = doc[k][1]; }
      const st = unflatten(next.base, null);
      if (!st) throw new Error('המידע בענן לא שלם');
      return { st, next, k: d.k };
    },
    // מחיל בית שנמשך: המצב שבמכשיר מוחלף בו
    adopt(found) {
      sy = found.next; key = found.k;
      S.state = found.st;
      for (const x of ['a', 'b']) if (!S.state.people[x].blocks.length) S.state.people[x].blocks = S.buildBlocks(x);
      S.writeLocal(); persist(); startPolling();
      status = 'ok'; lastOk = Date.now();
    },
    disconnect() { cut(''); },
    async dropCloud() { const id = sy && sy.id; cut(''); if (id) await rpc('izun_drop', { p_id: id }); },
    // בעליית האפליקציה: אם המכשיר כבר מחובר, ממשיכים
    async start() {
      try { sy = JSON.parse(localStorage.getItem(SK)); } catch { sy = null; }
      if (!sy || !sy.code || !S.sync.available() || !S.state) { sy = null; return; }
      try { key = (await derive(sy.code)).k; } catch { sy = null; return; }
      status = 'ok';
      startPolling();
      cycle();
    }
  };
})();
