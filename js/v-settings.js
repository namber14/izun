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

      ${syncCard()}

      <div class="sec">גיבוי</div>
      <section class="card stack"><p>קובץ אחד עם כל המידע. כדאי לשמור מדי פעם, למקרה שהטלפון מתחלף.</p>
        <div class="btns"><button class="btn btn--sm" data-act="backup">${S.icon('share')}שמירת גיבוי</button><label class="btn btn--sm">שחזור<input type="file" accept=".json,application/json" data-change="restoreFile" hidden></label></div>
        <button class="btn btn--sm btn--ghost btn--block" data-act="csv">ייצוא היומן לאקסל</button></section>

      <div class="sec">להוסיף למסך הבית</div>
      <section class="card"><p class="muted">באייפון: כפתור השיתוף, ואז "הוספה למסך הבית". באנדרואיד: שלוש הנקודות, ואז "התקנת האפליקציה".</p></section>

      <p class="note">איזון נותנת הערכות כלליות לאנשים בריאים. היא לא מחליפה רופא או דיאטנית. במצב רפואי, בהריון או בהנקה כדאי להתייעץ לפני שמשנים תזונה ואימונים.</p>
      <button class="btn btn--dan btn--block" data-act="wipeAsk">מחיקת כל הנתונים</button>`;
  };

  // ---------- הטלפון השני: עדכון חי ----------
  function syncCard() {
    const sy = S.sync, head = '<div class="sec">הטלפון השני</div>';
    if (!sy || !sy.available()) return `${head}<section class="card"><p class="muted">עדכון חי בין שני הטלפונים עובד כשפותחים את איזון מהכתובת שלה באינטרנט.</p></section>`;
    if (!sy.on()) return `${head}<section class="card stack"><p>כל סימון, משימה ופריט ברשימת הקניות יופיעו גם בטלפון השני, תוך שניות.</p>
      <p class="note" style="padding:0">המידע ננעל בטלפון עם קוד משפחתי לפני שהוא יוצא. בענן נשמר רק עותק נעול, שאי אפשר לקרוא בלי הקוד.</p>
      <button class="btn btn--pri btn--block" data-act="syncOn">להפעיל עדכון חי</button>
      <button class="btn btn--ghost btn--sm btn--block" data-act="joinAsk">יש לי כבר קוד משפחתי</button></section>`;
    const st = sy.info().status;
    const line = st === 'offline' ? 'אין חיבור כרגע. ימשיך לבד כשהחיבור יחזור.' : st === 'error' ? 'הענן לא ענה. מנסה שוב לבד.' : 'פעיל. כל שינוי עובר לטלפון השני תוך שניות.';
    return `${head}<section class="card stack"><p><b>${line}</b></p>
      <div class="f"><span class="lab">הקוד המשפחתי</span><div class="code ltr">${e(sy.code())}</div></div>
      <div class="btns"><button class="btn btn--sm" data-act="syncShare">${S.icon('share')}שליחה</button><button class="btn btn--sm" data-act="syncCopy">העתקה</button></div>
      <p class="note" style="padding:0">מי שמחזיק את הקוד רואה את כל המידע. שולחים אותו רק לבן או לבת הזוג.</p>
      <button class="btn btn--ghost btn--sm btn--block" data-act="syncOffAsk">לנתק</button></section>`;
  }
  const inviteText = () => `איזון, התוכנית שלנו.\n\n1. פותחים: ${location.origin}${location.pathname.replace(/index\.html$/, '')}\n2. מוסיפים למסך הבית, ופותחים משם.\n3. לוחצים "כבר התחלנו במכשיר אחר" ומדביקים את הקוד:\n\n${S.sync.code()}`;
  S.act.syncOn = async el => {
    el.disabled = true; el.textContent = 'מפעיל';
    try { await S.sync.enable(); } catch { S.toast('לא הצלחנו להפעיל. בודקים חיבור ומנסים שוב.'); S.soft(); return; }
    S.soft();
    if (S.sync.info().status !== 'ok') { S.toast('הופעל, אבל הענן עוד לא ענה. ינסה שוב לבד.'); return; }
    S.sheet(`<h2>העדכון החי פועל</h2><p>עכשיו מחברים את הטלפון השני. שולחים אליו את ההודעה, והיא מסבירה מה לעשות.</p>
      <div class="code ltr">${e(S.sync.code())}</div>
      <button class="btn btn--pri btn--block" data-act="syncShare">${S.icon('share')}לשלוח לטלפון השני</button>
      <button class="btn btn--ghost btn--sm btn--block" data-act="closeSheet">אחר כך</button>`);
  };
  S.act.syncShare = () => {
    const text = inviteText();
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
  };
  S.act.syncCopy = () => {
    const done = () => S.toast('הקוד הועתק');
    try { navigator.clipboard.writeText(S.sync.code()).then(done, () => S.toast('לא הצלחנו להעתיק. אפשר לסמן את הקוד ביד.')); } catch { S.toast('אפשר לסמן את הקוד ביד.'); }
  };
  S.act.syncOffAsk = () => S.sheet(`<h2>לנתק את העדכון החי?</h2><p>המידע שבמכשיר הזה נשאר. הוא רק מפסיק להתעדכן מול הטלפון השני.</p>
    <button class="btn btn--block" data-act="syncOff">לנתק רק את המכשיר הזה</button>
    <button class="btn btn--dan btn--block" data-act="syncDrop">לנתק ולמחוק את העותק מהענן</button>
    <p class="note" style="padding:0">מחיקה מהענן מנתקת גם את הטלפון השני. המידע נשאר בשני הטלפונים.</p>
    <button class="btn btn--ghost btn--sm btn--block" data-act="closeSheet">להשאיר מחובר</button>`);
  S.act.syncOff = () => { S.sync.disconnect(); S.closeSheet(); S.soft(); S.toast('המכשיר נותק'); };
  S.act.syncDrop = async () => { S.closeSheet(); try { await S.sync.dropCloud(); S.toast('נותק, והעותק בענן נמחק'); } catch { S.toast('המכשיר נותק, אבל המחיקה מהענן לא הצליחה. אפשר לנסות שוב כשיש חיבור.'); } S.soft(); };

  // התחברות לבית קיים עם קוד משפחתי (מההגדרות, או ממסך הפתיחה במכשיר חדש)
  S.act.joinAsk = () => S.sheet(`<h2>להתחבר עם קוד משפחתי</h2><p>הקוד נמצא בטלפון הראשון: הגדרות, "הטלפון השני".</p>
    ${S.state ? '<p class="late" style="font-weight:600">שימו לב: המידע שבמכשיר הזה יוחלף במה שבענן.</p>' : ''}
    <div class="f"><label for="join-code">הקוד</label><input id="join-code" type="text" dir="ltr" autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="XXXXX-XXXXX-XXXXX-XXXXX" style="text-align:center;letter-spacing:.04em"></div>
    <button class="btn btn--pri btn--block" data-act="joinGo">להתחבר</button>`);
  S.act.joinGo = async el => {
    const code = (document.getElementById('join-code') || {}).value || '';
    el.disabled = true; el.textContent = 'מתחבר';
    try { S._join = await S.sync.fetchHome(code); }
    catch (err) { el.disabled = false; el.textContent = 'להתחבר'; S.toast(/[\u0590-\u05FF]/.test(err.message || '') ? err.message : 'לא הצלחנו להתחבר. בודקים חיבור ומנסים שוב.'); return; }
    const st = S._join.st;
    S.sheet(`<h2>מי במכשיר הזה?</h2><p>כך האפליקציה תדע של מי היום שמוצג ראשון.</p>
      <div class="btns"><button class="btn" data-act="joinAs" data-id="a">${e(st.people.a.name)}</button><button class="btn" data-act="joinAs" data-id="b">${e(st.people.b.name)}</button></div>`);
  };
  S.act.joinAs = el => {
    if (!S._join) return;
    S.sync.adopt(S._join); S._join = null;
    S.setMe(el.dataset.id);
    S.ui.who = S.me; S.ui.both = false; S.ui.date = S.today();
    S.closeSheet(true);
    S.toast('מחובר. מעכשיו שני הטלפונים מתעדכנים יחד.');
    if (S.route()[0] !== 'today') location.hash = '#/today'; else S.render();
  };

  S.act.setMe = el => { S.setMe(el.dataset.id); S.ui.who = S.me; S.ui.both = false; S.soft(); S.toast(`המכשיר של ${S.name(S.me)}`); };
  S.act.setTheme = el => { S.home().theme = el.dataset.t; S.save(); S.soft(); };
  S.act.homeSave = () => {
    const root = document.getElementById('home-form'), h = S.home();
    const fields = [{ id: 'keeps', type: 'toggle' }, { id: 'extra', type: 'num' }];
    if (root.querySelector('[name="city"]')) fields.push({ id: 'city', type: 'select' });
    if (root.querySelector('[name="waitHours"]')) fields.push({ id: 'waitHours', type: 'pills', options: [[6]] });
    const v = S.readFields(root, fields);
    S.freezePast();
    const flipped = v.keeps !== h.shabbat, waited = 'waitHours' in v && +v.waitHours !== (h.waitHours === 5.5 ? 5 : h.waitHours);
    h.shabbat = h.kosher = v.keeps;
    h.extra = Math.max(0, v.extra || 0);
    if (v.city) h.city = v.city;
    if ('waitHours' in v) h.waitHours = +v.waitHours === 5 ? 5.5 : +v.waitHours;
    if (flipped) {
      for (const id of ['a', 'b']) { if (v.keeps) S.P(id).fit.days = S.P(id).fit.days.filter(d => d !== 6); S.rebuild(id); }
    }
    if (flipped) {
      // ימים שכבר עברו נשארים כפי שהיו. מהיום והלאה נבנה תפריט חדש.
      const wk = S.weekKey(S.today());
      for (const w of [wk, S.addDays(wk, 7)]) if (S.state.menu[w]) S.genWeek(w, true);
      S.toast('נשמר. התפריט וסדר היום נבנו מחדש.');
    } else if (waited) {
      const n = S.kosherFix();
      S.toast(n ? `נשמר. ${n === 1 ? 'מנה אחת הוחלפה' : n + ' מנות הוחלפו'} לפי זמן ההמתנה החדש.` : 'נשמר');
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
    const p = S.P(S.me), today = S.today(), W = S.t2m(p.wake);
    const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    const escText = t => String(t).replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\r?\n/g, '\\n');
    // בבית ששומר שבת: עוגן של יום שישי נכנס ליומן רק אם הוא לפני כניסת השבת המוקדמת ביותר בשנה
    let earliest = Infinity;
    if (S.keepsShabbat()) { let fri = today; while (S.dow(fri) !== 5) fri = S.addDays(fri, 1); for (let i = 0; i < 53; i++) earliest = Math.min(earliest, S.candles(S.addDays(fri, i * 7)) - 60); }
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//izun//he', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:איזון'];
    for (const b of p.blocks) {
      if (b.k === 'work') continue;
      const sm = S.t2m(b.s);
      // אותו כלל כמו בציר: עוגן של סוף היום שהשעה שלו אחרי חצות שייך ביומן ליום שלמחרת
      const shift = sm < W - 60 && ['sleep', 'wind', 'couple', 'home', 'study', 'other'].includes(b.k) ? 1 : 0;
      const days = b.d.filter(d => !(d === 5 && !shift && sm >= earliest)).map(d => (d + shift) % 7);
      if (!days.length) continue;
      let k = today;
      for (let i = 0; i < 7 && !days.includes(S.dow(k)); i++) k = S.addDays(k, 1);
      const dt = `${k.replace(/-/g, '')}T${pad(Math.floor(sm / 60))}${pad(sm % 60)}00`;
      const dur = b.k === 'sleep' || b.k === 'wake' ? 5 : Math.max(5, Math.min(b.m, 180));
      lines.push('BEGIN:VEVENT', `UID:${S.me}-${b.id}@izun`, `DTSTAMP:${stamp}`, `DTSTART:${dt}`, `DURATION:PT${dur}M`, `RRULE:FREQ=WEEKLY;BYDAY=${days.map(d => BY[d]).join(',')}`, `SUMMARY:${escText(b.t)}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escText(b.t)}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    const text = lines.join('\r\n');
    // באפליקציה שעל מסך הבית משתפים את הקובץ. בדפדפן רגיל הורדה פותחת את "הוספה ליומן".
    if (S.isInstalled()) S.shareFile('izun-seder-yom.ics', text, 'text/calendar', 'סדר היום של איזון');
    else S.download('izun-seder-yom.ics', text, 'text/calendar;charset=utf-8');
    S.toast('פותחים את הקובץ ומאשרים הוספה ליומן.');
  };

  // ---------- גיבוי ----------
  S.act.backup = () => {
    S.saveNow();
    if (S.shareFile(`izun-gibuy-${S.today()}.json`, JSON.stringify(S.state), 'application/json', 'גיבוי איזון') === 'download') S.toast('הגיבוי ירד למכשיר');
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
    const csvText = '\uFEFF' + rows.map(r => r.map(cell).join(',')).join('\r\n');
    if (S.isInstalled()) S.shareFile(`izun-yoman-${S.today()}.csv`, csvText, 'text/csv', 'יומן איזון');
    else { S.download(`izun-yoman-${S.today()}.csv`, csvText, 'text/csv;charset=utf-8'); S.toast('הקובץ ירד'); }
  };

  S.act.wipeAsk = () => S.sheet(`<h2>למחוק הכול?</h2><p>הפרופילים, התפריטים, המשימות וכל ההיסטוריה יימחקו מהמכשיר הזה. אי אפשר לבטל.</p>${S.sync && S.sync.on() ? '<p class="note" style="padding:0">המחיקה היא מהמכשיר הזה בלבד. הטלפון השני והעותק בענן נשארים.</p>' : ''}
    <button class="btn btn--block" data-act="backup">קודם לשמור גיבוי</button>
    <div class="btns"><button class="btn btn--pri" data-act="closeSheet">להשאיר</button><button class="btn btn--dan" data-act="wipe">למחוק</button></div>`);
  S.act.wipe = () => { S.closeSheet(true); S.wipe(); location.hash = ''; S.render(); };
})();
