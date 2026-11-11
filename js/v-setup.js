// איזון · שאלון הפתיחה: מכירים את שניכם, ובונים תוכנית.
(function () {
  'use strict';
  const S = window.S, e = S.esc;
  let st = null;
  const init = () => { st = { i: 0, d: S.newState(), later: false, building: false }; };
  const order = () => ['welcome', 'names', 'house', 'a1', 'a2', 'a3', 'a4', 'bhow'].concat(st.later ? [] : ['b1', 'b2', 'b3', 'b4']).concat(['theme']);
  const P = x => st.d.people[x];
  const g = (x, m, f) => (P(x).sex === 'f' ? f : m);
  const cityOptions = () => Object.entries(S.CITIES).map(([k, v]) => [k, v[0]]);

  // שדות הפרופיל משמשים גם את מסך ההגדרות
  S.personFields = (p, part, keeps) => {
    if (part === 1) return [
      { id: 'birth', label: 'שנת לידה', type: 'num', min: 1935, max: 2012, step: 1 },
      { id: 'height', label: 'גובה', type: 'num', unit: 'ס״מ', min: 130, max: 220, step: 1 },
      { id: 'weight', label: 'משקל', type: 'num', unit: 'ק״ג', min: 35, max: 220, step: 0.5 }
    ];
    if (part === 2) return [
      { id: 'goal', label: 'המטרה', type: 'pills', options: [['lose', 'לרדת במשקל', 'בקצב בריא'], ['keep', 'לשמור', 'ולהרגיש טוב'], ['gain', 'להתחזק', 'ולעלות במסה']] }
    ].concat(p.sex === 'f' ? [{ id: 'special', label: 'תקופה מיוחדת', type: 'pills', options: [['', 'לא'], ['preg', 'הריון'], ['nurse', 'הנקה']], hint: 'בהריון ובהנקה אין דיאטה: התפריט שומר ומוסיף, והאימונים עדינים. כדאי לאשר מול הרופא.' }] : []);
    if (part === 3) return [
      { id: 'wake', label: 'שעת השכמה', type: 'time' },
      { id: 'sleepHours', label: 'כמה שעות שינה', type: 'num', unit: 'שעות', min: 5.5, max: 10, step: 0.5, hint: 'רוב המבוגרים צריכים בין 7 ל-9.' },
      { id: 'work_on', label: 'יש שעות עבודה קבועות', type: 'toggle' },
      { id: 'work_from', label: 'מתחילים לעבוד', type: 'time' },
      { id: 'work_to', label: 'מסיימים לעבוד', type: 'time' }
    ].concat(keeps && p.sex === 'm' ? [{ id: 'shacharit', label: 'שחרית', type: 'time', hint: 'אפשר להשאיר ריק.' }] : []);
    return [
      { id: 'fit_place', label: 'איפה נוח להתאמן', type: 'pills', options: Object.entries(S.PLACES) },
      { id: 'fit_level', label: 'רמה היום', type: 'pills', options: [[1, 'מתחיל', 'או אחרי הפסקה'], [2, 'בינוני', 'מתאמן לפעמים'], [3, 'מתקדם', 'מתאמן קבוע']] },
      { id: 'fit_days', label: 'באילו ימים', type: 'days', skip: keeps ? [6] : [] },
      { id: 'fit_minutes', label: 'כמה זמן בכל פעם', type: 'pills', options: [[15, '15 דק׳'], [25, '25 דק׳'], [40, '40 דק׳']] },
      { id: 'fit_when', label: 'מתי ביום', type: 'pills', options: [['morning', 'בוקר'], ['noon', 'צהריים'], ['evening', 'ערב']] }
    ];
  };
  S.personValues = p => ({
    birth: p.birth, height: p.height, weight: p.weight, goal: p.goal, special: p.special || '', wake: p.wake, sleepHours: p.sleepHours,
    work_on: p.work.on, work_from: p.work.from, work_to: p.work.to, shacharit: p.shacharit || '',
    fit_place: p.fit.place, fit_level: p.fit.level, fit_days: p.fit.days, fit_minutes: p.fit.minutes, fit_when: p.fit.when
  });
  // מעדכן פרופיל מתוך ערכי הטופס. מחזיר הודעת שגיאה או ריק.
  S.applyPerson = (p, v) => {
    for (const k of ['birth', 'height', 'weight', 'sleepHours']) if (k in v) { if (v[k] == null || v[k] <= 0) return 'חסר מספר באחד השדות'; p[k] = v[k]; }
    for (const k of ['goal', 'special', 'wake', 'shacharit']) if (k in v) p[k] = v[k];
    if ('wake' in v && !v.wake) return 'חסרה שעת השכמה';
    if ('work_on' in v) p.work = { on: v.work_on, from: v.work_from || p.work.from, to: v.work_to || p.work.to };
    if ('fit_place' in v) {
      if (!v.fit_days.length) return 'צריך לבחור לפחות יום אחד';
      Object.assign(p.fit, { place: v.fit_place, level: +v.fit_level, days: v.fit_days, minutes: +v.fit_minutes, when: v.fit_when });
    }
    return '';
  };

  const fieldsOf = id => {
    const keeps = st.d.home.shabbat;
    if (id === 'names') return [[
      { id: 'me_name', label: 'השם שלך', type: 'text', placeholder: 'שם פרטי' },
      { id: 'me_sex', label: 'אני', type: 'pills', options: [['m', 'גבר'], ['f', 'אישה']] },
      { id: 'sp_name', label: 'ומי איתך?', type: 'text', placeholder: 'שם פרטי' }
    ], { me_name: P('a').name, me_sex: P('a').sex, sp_name: P('b').name }];
    if (id === 'house') return [[
      { id: 'keeps', label: 'שומרים שבת וכשרות', hint: 'התפריט מפריד בין בשר לחלב, ושבת היא יום בלי סימונים.', type: 'toggle' },
      { id: 'city', label: 'עיר, לזמני השבת', type: 'select', options: cityOptions() },
      { id: 'extra', label: 'כמה ילדים אוכלים איתכם', type: 'num', min: 0, max: 14, step: 1, hint: 'כדי שרשימת הקניות תספיק לכולם.' }
    ], { keeps: st.d.home.shabbat, city: st.d.home.city, extra: st.d.home.extra }];
    const m = id.match(/^([ab])([1-4])$/);
    if (m) return [S.personFields(P(m[1]), +m[2], keeps), S.personValues(P(m[1]))];
    return [[], {}];
  };
  const titleOf = id => {
    const b = P('b').name;
    const T = {
      names: ['נעים מאוד.', 'איך קוראים לכם?'],
      house: ['הבית שלכם', 'שלוש שאלות, ואפשר לשנות אחר כך.'],
      a1: ['כמה מספרים', 'מהם מחשבים כמה אוכל הגוף שלך צריך. נשאר רק במכשיר.'],
      a2: ['לאן רוצים להגיע?', ''],
      a3: ['היום שלך', 'סביב השעות האלה נבנה סדר היום.'],
      a4: ['תנועה', 'מתחילים ממה שבאמת אפשרי. האפליקציה מעלה את הרמה לבד.'],
      b1: [`המספרים של ${b}`, ''], b2: [`המטרה של ${b}`, ''], b3: [`היום של ${b}`, ''], b4: [`התנועה של ${b}`, ''],
      theme: ['איך זה ייראה?', 'אפשר להחליף בכל רגע בהגדרות.']
    };
    return T[id] || ['', ''];
  };
  const THEMES = S.THEMES = [['night', 'לילה', ['#0B0C10', '#A8E06A', '#FF7B47', '#9A8CFF']], ['cream', 'שמנת', ['#F3EEE5', '#3F9D4B', '#EE5A2A', '#5F57D8']], ['sea', 'ים', ['#06151B', '#7FE3B0', '#FF8D5E', '#A3ACFF']]];
  S.themePicker = (cur, act) => `<div class="themes">${THEMES.map(t => `<button class="${t[0] === cur ? 'on' : ''}" data-act="${act}" data-t="${t[0]}"><i>${t[2].map(c => `<b style="background:${c}"></b>`).join('')}</i>${t[1]}</button>`).join('')}</div>`;

  S.views.setup = () => {
    if (!st) init();
    const ids = order(), id = ids[st.i];
    if (st.building) return `<div class="setup"><div class="building"><div>${S.ring(0.28, { size: 84, sw: 6, color: 'tx', cls: 'spin' })}<p id="build-msg">מחשבים יעדים</p></div></div></div>`;
    // באייפון המידע נשמר בנפרד לדפדפן ולאפליקציה שעל מסך הבית. לכן קודם מתקינים, ורק אז ממלאים.
    if (id === 'welcome' && !st.here && S.isIOS() && !S.isInstalled() && /^https?:$/.test(location.protocol)) return `<div class="setup"><div class="welcome">
        <div class="mark">${['food', 'move', 'sleep', 'task'].map((c, i) => S.ring([0.8, 0.6, 0.9, 0.7][i], { size: 30, sw: 5, color: c })).join('')}</div>
        <h1 style="font-size:40px;line-height:1.1">קודם מוסיפים למסך הבית</h1>
        <p style="font-size:18px">באייפון, איזון שומרת את המידע שלכם רק כשפותחים אותה ממסך הבית.</p>
        <div class="list"><div class="li li--pad"><span class="li__main"><b>1. לוחצים על כפתור השיתוף</b><small>הריבוע עם החץ, בתחתית המסך</small></span>${S.icon('share')}</div>
          <div class="li li--pad"><span class="li__main"><b>2. בוחרים "הוספה למסך הבית"</b></span>${S.icon('plus')}</div>
          <div class="li li--pad"><span class="li__main"><b>3. פותחים את איזון מהמסך הראשי</b><small>ושם ממלאים את השאלות</small></span>${S.icon('home')}</div></div>
      </div><div class="setup__foot"><button class="btn btn--ghost btn--sm btn--block" data-act="setupHere">להמשיך כאן בכל זאת</button></div></div>`;
    if (id === 'welcome') return `<div class="setup"><div class="welcome">
        <div class="mark">${['food', 'move', 'sleep', 'task'].map((c, i) => S.ring([0.8, 0.6, 0.9, 0.7][i], { size: 30, sw: 5, color: c })).join('')}</div>
        <h1>איזון</h1>
        <p><b>סדר יום, אוכל, תנועה ושינה.</b><br>תוכנית אחת, לשניכם.</p>
      </div>
      <div class="setup__foot"><button class="btn btn--pri btn--block" data-act="setupNext">מתחילים</button>
        <label class="btn btn--ghost btn--sm btn--block">כבר התחלנו במכשיר אחר<input type="file" accept=".json,application/json" data-change="restoreFile" hidden></label>
        <p class="note" style="text-align:center">שלוש דקות של שאלות, ומכאן הכול נבנה לבד.</p></div></div>`;
    const [title, lead] = titleOf(id);
    let body = '';
    if (id === 'bhow') {
      const b = P('b').name;
      body = `<h1>ועכשיו ${e(b)}</h1><p class="lead">אפשר למלא יחד עכשיו, או ש${g('b', 'הוא ימלא', 'היא תמלא')} לבד אחר כך.</p>
        ${S.field({ id: 'later', type: 'pills', options: [['0', 'ממלאים עכשיו', 'עוד דקה וחצי'], ['1', 'אחר כך', 'בינתיים תוכנית כללית']] }, st.later ? '1' : '0')}`;
    } else if (id === 'theme') {
      body = `<h1>${e(title)}</h1><p class="lead">${e(lead)}</p>${S.themePicker(st.d.home.theme, 'setupTheme')}`;
    } else {
      const [fields, values] = fieldsOf(id);
      body = `<h1>${e(title)}</h1>${lead ? `<p class="lead">${e(lead)}</p>` : ''}${fields.map(f => {
        if ((f.id === 'work_from' || f.id === 'work_to') && !values.work_on) return '';
        const html = S.field(f, values[f.id]);
        return f.id === 'work_on' ? `<div data-change="setupLive">${html}</div>` : html;
      }).join('')}`;
    }
    const last = st.i === ids.length - 1;
    return `<div class="setup">
      <div class="setup__bar"><button class="ibtn ibtn--plain" data-act="setupBack" aria-label="חזרה">${S.icon('prev')}</button>${S.bar(st.i / (ids.length - 1), 'tx')}<small class="num ltr">${st.i}/${ids.length - 1}</small></div>
      <div class="setup__body" data-step="${id}">${body}</div>
      <div class="setup__foot"><button class="btn btn--pri btn--block" data-act="setupNext">${last ? 'בונים לנו תוכנית' : 'המשך'}</button></div></div>`;
  };

  // קורא את המסך הנוכחי לתוך הנתונים. מחזיר הודעת שגיאה או ריק.
  const read = () => {
    const id = order()[st.i], root = document.querySelector('.setup__body');
    if (!root) return '';
    if (id === 'bhow') { st.later = S.readFields(root, [{ id: 'later', type: 'pills', options: [['0'], ['1']] }]).later === '1'; P('b').pending = st.later; return ''; }
    if (id === 'theme') return '';
    const [fields] = fieldsOf(id);
    const shown = fields.filter(f => root.querySelector(`[data-f="${f.id}"]`));
    const v = S.readFields(root, shown);
    if (id === 'names') {
      P('a').name = v.me_name; P('b').name = v.sp_name;
      if (P('a').sex !== v.me_sex) {
        // מחליפים את ברירות המחדל לפי מי שממלא
        const a = S.newPerson(v.me_sex, v.me_name), b = S.newPerson(v.me_sex === 'm' ? 'f' : 'm', v.sp_name);
        st.d.people = { a, b };
      }
      return v.me_name && v.sp_name ? '' : 'צריך את שני השמות';
    }
    if (id === 'house') {
      st.d.home.shabbat = st.d.home.kosher = v.keeps;
      st.d.home.city = v.city; st.d.home.extra = Math.max(0, v.extra || 0);
      if (!v.keeps) for (const x of ['a', 'b']) P(x).shacharit = '';
      else for (const x of ['a', 'b']) P(x).fit.days = P(x).fit.days.filter(d => d !== 6);
      return '';
    }
    return S.applyPerson(P(id[0]), v);
  };

  S.act.setupNext = () => {
    const err = read();
    if (err) { S.toast(err); return; }
    const ids = order();
    if (st.i < ids.length - 1) { st.i++; S.render(); return; }
    finish();
  };
  S.act.setupHere = () => { st.here = true; S.render(); };
  S.act.setupBack = () => { if (st.i > 0) { read(); st.i--; S.render(); } };
  S.act.setupLive = () => { read(); S.render(true); };
  S.act.setupTheme = el => { st.d.home.theme = S.setupTheme = el.dataset.t; S.render(true); };

  function finish() {
    st.building = true;
    S.render();
    const msgs = ['מחשבים יעדים', 'בונים תפריט לשבוע', 'מסדרים את היום', 'מוכן'];
    let n = 0;
    const tick = setInterval(() => { const m = document.getElementById('build-msg'); if (m && msgs[++n]) m.textContent = msgs[n]; }, 420);
    setTimeout(() => {
      clearInterval(tick);
      const d = st.d;
      S.state = d;
      for (const x of ['a', 'b']) { d.people[x].fit.since = S.today(); S.rebuild(x); }
      S.genWeek(S.weekKey(S.today()));
      S.setMe('a');
      S.ui.who = 'a'; S.ui.both = false; S.ui.date = S.today();
      S.saveNow();
      st = null; S.setupTheme = null;
      if (location.hash && location.hash !== '#/today') location.hash = '#/today'; else S.render();
    }, 1500);
  }

  // שחזור מקובץ גיבוי (גם דרך להעביר את התוכנית למכשיר השני)
  S.act.restoreFile = el => {
    const file = el.files && el.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      let data = null;
      try { data = JSON.parse(String(r.result)); } catch { /* לא קובץ תקין */ }
      if (data && !data.days) data = null;
      data = S.normalize(data); // משלים שדות חסרים בגיבוי ישן או חלקי
      if (!data) { S.toast('זה לא קובץ גיבוי של איזון'); return; }
      const names = ['a', 'b'].map(x => data.people[x].name || '');
      S.sheet(`<h2>מי במכשיר הזה?</h2><p>כך האפליקציה תדע של מי היום שמוצג ראשון.</p>${S.state ? '<p class="late" style="font-weight:600">שימו לב: כל מה שסומן במכשיר הזה יוחלף במה שבקובץ.</p>' : ''}
        <div class="btns"><button class="btn" data-act="restoreAs" data-id="a">${e(names[0])}</button><button class="btn" data-act="restoreAs" data-id="b">${e(names[1])}</button></div>`);
      S._restore = data;
    };
    r.readAsText(file);
    el.value = '';
  };
  S.act.restoreAs = el => {
    if (!S._restore) return;
    const prev = S.state ? JSON.stringify(S.state) : null, prevMe = S.me;
    S.state = S._restore; S._restore = null;
    S.setMe(el.dataset.id);
    S.ui.who = S.me; S.ui.both = false; S.ui.date = S.today();
    S.saveNow();
    st = null;
    S.closeSheet(true);
    for (const x of ['a', 'b']) if (!S.P(x).blocks.length) S.P(x).blocks = S.buildBlocks(x);
    S.saveNow();
    S.toast('הגיבוי שוחזר', prev ? () => { S.state = JSON.parse(prev); S.setMe(prevMe); S.ui.who = S.me; S.saveNow(); S.render(); } : null);
    if (location.hash !== '#/today') location.hash = '#/today'; else S.render();
  };
})();
