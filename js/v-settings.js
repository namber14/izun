// איזון · הגדרות: פרופילים, הבית, מראה, תזכורות ליומן, גיבוי.
(function () {
  'use strict';
  const S = window.S, e = S.esc, pad = S.pad;

  S.views.settings = () => {
    const h = S.home(), ids = ['a', 'b'];
    const T = id => S.targets(id);
    return `${S.hdr('הגדרות', '', '', '#/today')}
      <div class="sec">המכשיר הזה שייך ל</div>
      <div class="seg">${ids.map(id => `<button class="${S.me === id ? 'on' : ''}" data-act="setMe" data-id="${id}">${e(S.name(id))}</button>`).join('')}</div>

      <div class="sec">הפרופילים</div>
      <div class="list">${ids.map(id => { const p = S.P(id), t = T(id); return `<button class="li li--pad" data-act="editPerson" data-id="${id}"><span class="li__main"><b>${e(p.name)}</b><small class="num">${t.kcal.toLocaleString('he-IL')} קל׳ ביום · ${t.protein} ג׳ חלבון · השכמה ${e(p.wake)}</small></span><span class="li__end">${S.icon('next')}</span></button>`; }).join('')}</div>

      <div class="sec">הבית</div>
      <section class="card stack" style="gap:16px" data-change="homeSave" id="home-form">
        ${S.field({ id: 'keeps', label: 'שומרים שבת וכשרות', type: 'toggle' }, h.shabbat)}
        ${h.shabbat ? S.field({ id: 'city', label: 'עיר, לזמני השבת', type: 'select', options: Object.entries(S.CITIES).map(([k, v]) => [k, v[0]]) }, h.city) : ''}
        ${h.kosher ? S.field({ id: 'waitHours', label: 'המתנה בין בשר לחלב', type: 'pills', options: [[6, '6'], [5, '5 ומשהו'], [3, '3'], [1, '1']], hint: 'בשעות. התפריט לא ישבץ חלבי לפני שעבר הזמן.' }, h.waitHours === 5.5 ? 5 : h.waitHours) : ''}
        ${S.field({ id: 'extra', label: 'ילדים בארוחות המשותפות', type: 'num', min: 0, max: 14, step: 1, hint: 'משפיע על רשימת הקניות ועל הכמויות לבישול.' }, h.extra || 0)}
        ${h.shabbat ? `<p class="note" style="padding:0">השבוע: כניסת שבת בערך ב-<span class="ltr num">${S.m2t(S.candles(S.addDays(S.weekKey(S.today()), 5)))}</span>, צאת השבת בערך ב-<span class="ltr num">${S.m2t(S.havdala(S.addDays(S.weekKey(S.today()), 6)))}</span>. הזמנים מחושבים ומשוערים, ולא באים במקום לוח.</p>` : ''}
      </section>

      <div class="sec">מראה</div>
      ${S.themePicker(h.theme, 'setTheme')}

      <div class="sec">תזכורות</div>
      <section class="card stack"><p>סדר היום של ${e(S.name(S.me))} נכנס ליומן של הטלפון, והיומן מזכיר בזמן.</p>
        <button class="btn btn--block" data-act="ics">${S.icon('bell')}להוסיף ליומן שלי</button>
        <p class="note" style="padding:0">אם משנים שעות, מוחקים ביומן את האירועים הישנים ומוסיפים שוב.</p></section>

      <div class="sec">גיבוי והעברה</div>
      <section class="card stack"><p>קובץ הגיבוי הוא גם הדרך להעביר את התוכנית לטלפון השני: שומרים כאן, שולחים בוואטסאפ, ופותחים שם.</p>
        <div class="btns"><button class="btn btn--sm" data-act="backup">${S.icon('share')}שמירת גיבוי</button><label class="btn btn--sm">שחזור<input type="file" accept=".json,application/json" data-change="restoreFile" hidden></label></div>
        <button class="btn btn--sm btn--ghost btn--block" data-act="csv">ייצוא היומן לאקסל</button></section>

      <div class="sec">להוסיף למסך הבית</div>
      <section class="card"><p class="muted">באייפון: כפתור השיתוף, ואז "הוספה למסך הבית". באנדרואיד: שלוש הנקודות, ואז "התקנת האפליקציה".</p></section>

      <p class="note">איזון נותנת הערכות כלליות לאנשים בריאים. היא לא מחליפה רופא או דיאטנית. במצב רפואי, בהריון או בהנקה כדאי להתייעץ לפני שמשנים תזונה ואימונים.</p>
      <button class="btn btn--dan btn--block" data-act="wipeAsk">מחיקת כל הנתונים</button>`;
  };

  S.act.setMe = el => { S.setMe(el.dataset.id); S.ui.who = S.me; S.ui.both = false; S.soft(); S.toast(`המכשיר של ${S.name(S.me)}`); };
  S.act.setTheme = el => { S.home().theme = el.dataset.t; S.save(); S.soft(); };
  S.act.homeSave = () => {
    const root = document.getElementById('home-form'), h = S.home();
    const fields = [{ id: 'keeps', type: 'toggle' }, { id: 'extra', type: 'num' }];
    if (root.querySelector('[name="city"]')) fields.push({ id: 'city', type: 'select' });
    if (root.querySelector('[name="waitHours"]')) fields.push({ id: 'waitHours', type: 'pills', options: [[6]] });
    const v = S.readFields(root, fields);
    const flipped = v.keeps !== h.shabbat, waited = 'waitHours' in v && +v.waitHours !== (h.waitHours === 5.5 ? 5 : h.waitHours);
    h.shabbat = h.kosher = v.keeps;
    h.extra = Math.max(0, v.extra || 0);
    if (v.city) h.city = v.city;
    if ('waitHours' in v) h.waitHours = +v.waitHours === 5 ? 5.5 : +v.waitHours;
    if (flipped) {
      for (const id of ['a', 'b']) { if (v.keeps) S.P(id).fit.days = S.P(id).fit.days.filter(d => d !== 6); S.rebuild(id); }
    }
    if (flipped || waited) {
      const wk = S.weekKey(S.today());
      for (const w of [wk, S.addDays(wk, 7)]) if (S.state.menu[w]) S.genWeek(w, true);
      S.toast('נשמר. התפריט וסדר היום נבנו מחדש.');
    } else S.toast('נשמר');
    S.save(); S.soft();
  };

  // ---------- עריכת פרופיל ----------
  S.act.editPerson = el => {
    const id = el.dataset.id, p = S.P(id), keeps = S.keepsShabbat();
    const fields = [{ id: 'name', label: 'שם', type: 'text' }].concat(S.personFields(p, 1, keeps), S.personFields(p, 2, keeps), S.personFields(p, 3, keeps),
      [{ id: 'study', label: 'לימוד קבוע', type: 'time', hint: 'אפשר להשאיר ריק.' }], S.personFields(p, 4, keeps));
    const vals = Object.assign({ name: p.name, study: p.study || '' }, S.personValues(p));
    S._pf = { id, fields };
    const t = S.targets(id);
    S.sheet(`<h2>${e(p.name)}</h2><p class="num">היעד היום: ${t.kcal.toLocaleString('he-IL')} קלוריות ו-${t.protein} גרם חלבון.</p>
      <div id="p-form" class="stack" style="gap:16px">${fields.map(f => S.field(f, vals[f.id])).join('')}</div>
      <button class="btn btn--pri btn--block" data-act="savePerson">שמירה</button>`);
  };
  S.act.savePerson = () => {
    const { id, fields } = S._pf, p = S.P(id), old = JSON.stringify(p);
    const v = S.readFields(document.getElementById('p-form'), fields);
    if (!v.name) { S.toast('חסר שם'); return; }
    const err = S.applyPerson(p, v);
    if (err) { S.toast(err); return; }
    p.name = v.name; p.study = v.study || '';
    delete p.pending;
    const was = JSON.parse(old);
    if (was.weight !== p.weight) S.logWeight(id, p.weight);
    if (was.fit.level !== p.fit.level || was.fit.place !== p.fit.place) p.fit.since = S.today();
    S.rebuild(id);
    S.save(); S.closeSheet(); S.soft();
    S.toast('נשמר. סדר היום נבנה מחדש.', () => { S.state.people[id] = was; S.save(); S.soft(); });
  };

  // ---------- תזכורות ליומן ----------
  const BY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  S.act.ics = () => {
    const p = S.P(S.me), today = S.today();
    const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//izun//he', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:איזון'];
    for (const b of p.blocks) {
      if (b.k === 'work' || !b.d.length) continue;
      let sm = S.t2m(b.s), shift = 0;
      if (sm < S.t2m(p.wake) - 60 && ['sleep', 'wind', 'couple'].includes(b.k)) shift = 1; // אחרי חצות: היום שלמחרת ביומן
      const days = b.d.map(d => (d + shift) % 7);
      let k = today;
      for (let i = 0; i < 7 && !days.includes(S.dow(k)); i++) k = S.addDays(k, 1);
      const dt = `${k.replace(/-/g, '')}T${pad(Math.floor(sm / 60))}${pad(sm % 60)}00`;
      const dur = b.k === 'sleep' || b.k === 'wake' ? 5 : Math.max(5, Math.min(b.m, 180));
      lines.push('BEGIN:VEVENT', `UID:${b.id}@izun`, `DTSTAMP:${stamp}`, `DTSTART:${dt}`, `DURATION:PT${dur}M`, `RRULE:FREQ=WEEKLY;BYDAY=${days.map(d => BY[d]).join(',')}`, `SUMMARY:${b.t}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${b.t}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    S.download('izun-seder-yom.ics', lines.join('\r\n'), 'text/calendar;charset=utf-8');
    S.toast('הקובץ ירד. פותחים אותו ומאשרים הוספה ליומן.');
  };

  // ---------- גיבוי ----------
  S.act.backup = () => {
    S.saveNow();
    const text = JSON.stringify(S.state);
    const name = `izun-gibuy-${S.today()}.json`;
    try {
      const file = new File([text], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: 'גיבוי איזון' }).catch(() => {}); return; }
    } catch { /* אין שיתוף קבצים: מורידים */ }
    S.download(name, text, 'application/json');
    S.toast('הגיבוי ירד למכשיר');
  };
  S.act.csv = () => {
    const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['תאריך', 'יום', 'שם', 'ציון', 'ארוחות', 'מים (כוסות)', 'אימון', 'הליכה (דק׳)', 'שינה (שעות)', 'משקל']];
    const wmap = {};
    for (const w of S.state.weights) wmap[w.k + w.who] = w.kg;
    for (const k of Object.keys(S.state.days).sort()) for (const id of ['a', 'b']) {
      if (!S.state.days[k][id]) continue;
      const sc = S.score(k, id), d = S.state.days[k][id];
      rows.push([k, S.DAYS[S.dow(k)], S.name(id), sc.shabbat ? '' : Math.round(sc.all * 100), `${sc.meals[0]}/${sc.meals[1]}`, d.water || 0, d.workout && d.workout.done ? 'כן' : '', d.walk || 0, sc.sleepMins ? (sc.sleepMins / 60).toFixed(1) : '', wmap[k + id] || '']);
    }
    S.download(`izun-yoman-${S.today()}.csv`, '﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
    S.toast('הקובץ ירד');
  };

  S.act.wipeAsk = () => S.sheet(`<h2>למחוק הכול?</h2><p>הפרופילים, התפריטים, המשימות וכל ההיסטוריה יימחקו מהמכשיר הזה. אי אפשר לבטל.</p>
    <button class="btn btn--block" data-act="backup">קודם לשמור גיבוי</button>
    <div class="btns"><button class="btn btn--pri" data-act="closeSheet">להשאיר</button><button class="btn btn--dan" data-act="wipe">למחוק</button></div>`);
  S.act.wipe = () => { S.closeSheet(true); S.wipe(); location.hash = ''; S.render(); };
})();
