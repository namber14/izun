// איזון · השלד: ניווט בין מסכים, ציור, טיפול בלחיצות, ורכיבים שחוזרים בכמה מסכים.
(function () {
  'use strict';
  const S = window.S;
  const view = () => document.getElementById('view');
  const tabs = () => document.getElementById('tabs');

  // מצב התצוגה (לא נשמר): את מי רואים, איזה יום, ואיזו לשונית פתוחה בכל מסך
  S.ui = { who: 'a', both: false, date: S.today(), foodTab: 'day', shopNext: false, weekNext: false, taskFilter: 'all', week: null, anyway: false };
  S.who = () => S.ui.who;
  S.name = id => (S.P(id).name || (id === 'a' ? 'אני' : 'בן הזוג'));
  // ניסוח לפי מגדר
  S.g = (id, m, f) => (S.P(id).sex === 'f' ? f : m);

  const TABS = [['today', 'היום', 'today'], ['food', 'אוכל', 'food'], ['move', 'תנועה', 'move'], ['sleep', 'שינה', 'sleep'], ['tasks', 'משימות', 'tasks']];
  S.route = () => { const p = location.hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean); return p.length ? p : ['today']; };
  S.go = h => { if (location.hash === h) S.render(); else location.hash = h; };

  // טבעות מתמלאות מהערך הקודם שלהן, כדי שסימון ירגיש חי ולא יקפיץ את המסך
  const prevRing = {};
  const ringSuper = S.ring;
  S.ring = (p, o = {}) => {
    if (!o.key) return ringSuper(p, o);
    const size = o.size || 64, sw = o.sw || 7, c = 2 * Math.PI * ((size - sw) / 2);
    const from = prevRing[o.key] ?? 0, to = S.clamp(p || 0, 0, 1);
    prevRing[o.key] = to;
    return ringSuper(from, o).replace('class="ring__fg"', `class="ring__fg" data-to="${(c * (1 - to)).toFixed(1)}"`);
  };
  const animateRings = () => requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll('.ring__fg[data-to]').forEach(el => { el.style.strokeDashoffset = el.dataset.to; el.removeAttribute('data-to'); });
  }));

  let lastRoute = '';
  S.render = (soft) => {
    const v = view();
    if (!S.state) { tabs().hidden = true; v.className = 'view view--full view--bare still'; v.innerHTML = S.views.setup(); document.body.dataset.theme = S.setupTheme || 'night'; themeColor(); return; }
    document.body.dataset.theme = S.home().theme || 'night';
    themeColor();
    const r = S.route(), name = S.views[r[0]] ? r[0] : 'today';
    const same = lastRoute === name;
    lastRoute = name;
    const full = name === 'week' || name === 'settings';
    v.className = 'view' + ((soft || same) ? ' still' : '');
    const y = window.scrollY;
    v.innerHTML = S.views[name](r);
    tabs().hidden = false;
    tabs().innerHTML = TABS.map(t => `<a href="#/${t[0]}" data-t="${t[0]}" class="${t[0] === name || (full && false) ? 'on' : ''}">${S.icon(t[2])}<span>${t[1]}</span></a>`).join('');
    if (soft || same) window.scrollTo(0, y); else window.scrollTo(0, 0);
    animateRings();
  };
  const themeColor = () => { const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = getComputedStyle(document.body).getPropertyValue('--bg').trim() || '#0B0C10'; };
  S.soft = () => S.render(true);

  // ---------- רכיבים משותפים ----------
  S.hdr = (title, sub, actions, back) => `<header class="hdr">${back ? `<a class="ibtn" href="${back}" aria-label="חזרה">${S.icon('prev')}</a>` : ''}
    <div class="hdr__t"><h1>${S.esc(title)}</h1>${sub ? `<small>${S.esc(sub)}</small>` : ''}</div><div class="hdr__a">${actions || ''}</div></header>`;
  // מתג בין בני הזוג. withBoth מוסיף "שנינו".
  S.whoSeg = withBoth => {
    const u = S.ui, on = id => (!u.both && u.who === id ? 'on' : '');
    return `<div class="seg" role="tablist"><button class="${on(S.me)}" data-act="who" data-id="${S.me}">${S.esc(S.name(S.me))}</button>
      <button class="${on(S.other(S.me))}" data-act="who" data-id="${S.other(S.me)}">${S.esc(S.name(S.other(S.me)))}</button>
      ${withBoth ? `<button class="${u.both ? 'on' : ''}" data-act="who" data-id="both">שנינו</button>` : ''}</div>`;
  };
  S.act.who = el => { if (el.dataset.id === 'both') S.ui.both = true; else { S.ui.both = false; S.ui.who = el.dataset.id; } S.soft(); };
  S.chkBtn = (on, act, data, color) => `<button class="chk ${on ? 'on' : ''}" style="--rc:var(--${color || 'mut'})" data-act="${act}" ${data || ''} aria-pressed="${on ? 'true' : 'false'}" aria-label="סימון"><i>${S.icon('check')}</i></button>`;
  S.cups = (k, who) => {
    const d = S.peek(k, who), T = S.targets(who), n = d.water || 0;
    return `<div class="cups" style="--n:${T.water}">${Array.from({ length: T.water }, (_, i) => `<button class="cup ${i < n ? 'on' : ''}" data-act="water" data-n="${i + 1}" aria-label="כוס ${i + 1}">${S.icon('drop')}</button>`).join('')}</div>`;
  };
  S.act.water = el => {
    const d = S.day(S.ui.date, S.who()), n = +el.dataset.n;
    d.water = d.water === n ? n - 1 : n;
    S.buzz(8); S.save(); S.soft();
  };
  // ימי השבוע כצ׳יפים לבחירת יום
  S.dayChips = () => {
    const wk = S.weekKey(S.ui.date), t = S.today();
    return `<div class="chips">${Array.from({ length: 7 }, (_, i) => { const k = S.addDays(wk, i); return `<button class="chip ${k === S.ui.date ? 'on' : ''}" data-act="pickday" data-k="${k}">${k === t ? 'היום' : S.DAYS1[i]} <em class="num">${S.kdate(k).getDate()}</em></button>`; }).join('')}</div>`;
  };
  S.act.pickday = el => { S.ui.date = el.dataset.k; S.soft(); };
  S.act.shiftday = el => { S.ui.date = S.addDays(S.ui.date, +el.dataset.d); S.soft(); };
  S.act.gotoday = () => { S.ui.date = S.today(); S.soft(); };
  S.act.nav = el => S.go(el.dataset.to);
  S.act.closeSheet = () => S.closeSheet();

  // ---------- אירועים ----------
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const fn = S.act[el.dataset.act];
    if (fn) { if (el.tagName === 'A' || el.tagName === 'BUTTON') e.preventDefault(); fn(el, e); }
  });
  for (const type of ['change', 'input', 'submit']) {
    document.addEventListener(type, e => {
      const el = e.target.closest(`[data-${type}]`);
      if (!el) return;
      const fn = S.act[el.dataset[type]];
      if (type === 'submit') e.preventDefault();
      if (fn) fn(el, e);
    });
  }
  window.addEventListener('hashchange', () => { S.closeSheet(true); S.render(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') S.closeSheet(); });

  S.start = () => {
    S.load();
    if (S.state) { S.ui.who = S.me; S.ui.date = S.today(); }
    S.render();
    // הדקה מתחלפת: מעדכנים את "עכשיו", רק כשלא באמצע פעולה
    setInterval(() => {
      if (!S.state || document.hidden) return;
      if (document.querySelector('.sheet-wrap, .player')) return;
      const a = document.activeElement;
      if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
      if (S.route()[0] === 'today') S.soft();
    }, 60000);
    let lastDay = S.today();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden || !S.state) return;
      if (S.today() !== lastDay) { lastDay = S.today(); S.ui.date = lastDay; }
      if (!document.querySelector('.sheet-wrap, .player')) S.soft();
    });
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  };
})();
