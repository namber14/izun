// איזון · משימות: רשימה אחת לשניכם, עם הוספה מהירה שמבינה עברית.
(function () {
  'use strict';
  const S = window.S, e = S.esc;
  const DAYWORD = { 'ראשון': 0, 'שני': 1, 'שלישי': 2, 'רביעי': 3, 'חמישי': 4, 'שישי': 5, 'א': 0, 'ב': 1, 'ג': 2, 'ד': 3, 'ה': 4, 'ו': 5 };
  const REP = { d: 'כל יום', w: 'כל שבוע', m: 'כל חודש' };
  const nextDow = (w, from) => { const base = from || S.today(); let n = (w - S.dow(base) + 7) % 7; if (n === 0) n = 7; return S.addDays(base, n); };

  // מבין "מחר", "ביום שלישי", "כל שבוע", "12.3" וסימן קריאה בסוף
  S.parseTask = raw => {
    let t = ' ' + String(raw || '').trim() + ' ';
    const out = { due: S.today(), rep: null, star: false, tags: [] };
    const take = (re, fn) => { const m = t.match(re); if (!m) return false; t = t.replace(re, ' '); fn(m); return true; };
    if (take(/!+\s*$/, () => {})) { out.star = true; out.tags.push('חשוב'); }
    let dated = false;
    if (take(/\sכל יום (ראשון|שני|שלישי|רביעי|חמישי|שישי)(?=\s)/, m => { out.rep = 'w'; out.due = S.dow(S.today()) === DAYWORD[m[1]] ? S.today() : nextDow(DAYWORD[m[1]]); out.tags.push('כל יום ' + m[1]); })) dated = true;
    else if (take(/\sכל יום(?=\s)/, () => { out.rep = 'd'; out.tags.push('כל יום'); })) dated = true;
    else if (take(/\sכל שבוע(?=\s)/, () => { out.rep = 'w'; out.tags.push('כל שבוע'); })) dated = true;
    else if (take(/\sכל חודש(?=\s)/, () => { out.rep = 'm'; out.tags.push('כל חודש'); })) dated = true;
    if (!dated || out.rep === 'w' || out.rep === 'm') {
      take(/\sמחרתיים(?=\s)/, () => { out.due = S.addDays(S.today(), 2); out.tags.push('מחרתיים'); }) ||
      take(/\sמחר(?=\s)/, () => { out.due = S.addDays(S.today(), 1); out.tags.push('מחר'); }) ||
      take(/\sהיום(?=\s)/, () => { out.due = S.today(); out.tags.push('היום'); }) ||
      take(/\sמתישהו(?=\s)/, () => { out.due = null; out.tags.push('בלי תאריך'); }) ||
      take(/\sב?שבוע הבא(?=\s)/, () => { out.due = nextDow(0); out.tags.push('בשבוע הבא'); }) ||
      take(/\sב?מוצאי שבת(?=\s)/, () => { out.due = S.dow(S.today()) === 6 ? S.today() : nextDow(6); out.tags.push('מוצאי שבת'); }) ||
      take(/\s[בל]?יום (ראשון|שני|שלישי|רביעי|חמישי|שישי)(?=\s)/, m => { out.due = nextDow(DAYWORD[m[1]]); out.tags.push('יום ' + m[1]); }) ||
      take(/\s[בל]?יום ([אבגדהו])['׳](?=\s)/, m => { out.due = nextDow(DAYWORD[m[1]]); out.tags.push('יום ' + S.DAYS[DAYWORD[m[1]]]); }) ||
      take(/\sב?-?(\d{1,2})[./](\d{1,2})(?=\s)/, m => {
        const now = new Date(); let d = new Date(now.getFullYear(), +m[2] - 1, +m[1]);
        if (d.getMonth() !== +m[2] - 1) return;
        if (S.dkey(d) < S.today()) d = new Date(now.getFullYear() + 1, +m[2] - 1, +m[1]);
        out.due = S.dkey(d); out.tags.push(`${+m[1]}.${+m[2]}`);
      });
    }
    out.t = t.replace(/\s+/g, ' ').trim();
    return out;
  };

  const dueText = (t, today) => {
    if (!t.due) return '';
    const diff = S.diffDays(t.due, today);
    if (diff === 0) return 'היום';
    if (diff === 1) return 'מחר';
    if (diff === -1) return 'מאתמול';
    if (diff < 0) return `מלפני ${-diff} ימים`;
    if (diff < 7) return 'יום ' + S.DAYS[S.dow(t.due)];
    return `${S.DAYS1[S.dow(t.due)]} ${S.shortDate(t.due)}`;
  };
  const whoLabel = w => (w === 'both' ? 'שנינו' : S.name(w));
  const row = (t, k, o = {}) => {
    const done = S.taskDone(t, k), late = !t.rep && t.due && t.due < k && !done;
    const bits = [];
    if (o.who) bits.push(`<span class="who">${e(whoLabel(t.who))}</span>`);
    if (o.due && t.due && !t.rep) bits.push(`<span class="${late ? 'late' : ''}">${dueText(t, k)}</span>`);
    if (t.rep) bits.push(`<span>${REP[t.rep]}${t.rep === 'w' && t.due ? ', יום ' + S.DAYS[S.dow(t.due)] : ''}</span>`);
    return `<div class="li ${done ? 'done' : ''}">${o.nochk ? '<span style="width:8px"></span>' : S.chkBtn(done, 'taskToggle', `data-id="${t.id}" data-k="${k}"`, 'task')}
      <button class="li__main" data-act="taskEdit" data-id="${t.id}"><b>${e(t.t)}</b>${bits.length ? `<small>${bits.join('')}</small>` : ''}</button>
      <button class="star ${t.star ? 'on' : ''}" data-act="taskStar" data-id="${t.id}" aria-label="חשוב" aria-pressed="${t.star ? 'true' : 'false'}">${S.icon('star')}</button></div>`;
  };
  const sortTasks = list => list.slice().sort((a, b) => (b.star ? 1 : 0) - (a.star ? 1 : 0) || String(a.due || '9').localeCompare(String(b.due || '9')) || a.c - b.c);

  S.views.tasks = () => {
    const today = S.today(), f = S.ui.taskFilter;
    const mine = t => f === 'all' || t.who === f || (f !== 'both' && t.who === 'both');
    const all = S.state.tasks.filter(mine);
    const showWho = f === 'all';
    const todayList = sortTasks(all.filter(t => S.taskOn(t, today) && !(!t.rep && t.done && t.done !== today)));
    const later = sortTasks(all.filter(t => !t.rep && !t.done && t.due && t.due > today));
    const someday = sortTasks(all.filter(t => !t.rep && !t.done && !t.due));
    const fixed = all.filter(t => t.rep && !S.taskOn(t, today));
    const doneList = all.filter(t => !t.rep && t.done && t.done !== today).sort((a, b) => (a.done < b.done ? 1 : -1)).slice(0, 8);
    const open = todayList.filter(t => !S.taskDone(t, today)).length;
    const chips = [['all', 'הכול'], [S.me, S.name(S.me)], [S.other(S.me), S.name(S.other(S.me))], ['both', 'משותף']];
    const tw = S.ui.taskWho || S.me;
    const sec = (title, list, o) => (list.length ? `<div class="sec">${title}</div><div class="list">${list.map(t => row(t, today, Object.assign({ who: showWho }, o))).join('')}</div>` : '');
    return `${S.hdr('משימות', open ? `${open} פתוחות להיום` : 'אין משימות פתוחות להיום')}
      <div class="chips">${chips.map(c => `<button class="chip ${f === c[0] ? 'on' : ''}" data-act="taskFilter" data-f="${c[0]}">${e(c[1])}</button>`).join('')}</div>
      <div class="stack" style="gap:8px"><form class="quick" data-submit="taskAdd"><input name="t" data-input="taskPreview" placeholder="משימה חדשה: רופא שיניים מחר" autocomplete="off" enterkeyhint="done"><button class="ibtn" aria-label="הוספה">${S.icon('plus')}</button></form>
        <div class="parse" id="task-parse"></div>
        <div class="chips">${[[S.me, 'שלי'], [S.other(S.me), 'של ' + S.name(S.other(S.me))], ['both', 'של שנינו']].map(c => `<button class="chip ${tw === c[0] ? 'on' : ''}" data-act="taskWho" data-w="${c[0]}">${e(c[1])}</button>`).join('')}</div></div>
      ${sec('להיום', todayList, { due: true })}${sec('בהמשך', later, { due: true })}${sec('מתישהו', someday, {})}${sec('קבועות', fixed, { nochk: true })}
      ${doneList.length ? `<div class="sec">בוצעו</div><div class="list">${doneList.map(t => row(t, t.done, { who: showWho })).join('')}</div><button class="btn btn--ghost btn--sm btn--block" data-act="taskClean">לנקות את מה שבוצע</button>` : ''}
      ${all.length ? '' : `<div class="card empty"><b>רשימה נקייה</b>כותבים משימה למעלה, כמו שמדברים: "לשלם ארנונה מחר", "להוציא זבל כל יום".</div>`}`;
  };

  const find = id => S.state.tasks.find(t => t.id === id);
  S.act.taskFilter = el => { S.ui.taskFilter = el.dataset.f; S.soft(); };
  S.act.taskWho = el => { S.ui.taskWho = el.dataset.w; S.soft(); const i = document.querySelector('.quick input[data-input]'); if (i) i.focus(); };
  S.act.taskPreview = el => {
    const box = document.getElementById('task-parse');
    if (!box) return;
    const p = S.parseTask(el.value);
    box.innerHTML = el.value.trim() ? p.tags.map(x => `<span>${e(x)}</span>`).join('') : '';
  };
  S.act.taskAdd = el => {
    const inp = el.querySelector('input'), p = S.parseTask(inp.value);
    if (!p.t) return;
    S.state.tasks.push({ id: S.uid(), t: p.t, who: S.ui.taskWho || S.me, due: p.due, rep: p.rep, star: p.star, done: null, c: Date.now() });
    S.buzz(10); S.save(); S.soft();
    const again = document.querySelector('.quick input[data-input]');
    if (again) again.focus();
  };
  S.act.taskToggle = el => { const t = find(el.dataset.id); if (!t) return; S.toggleTask(t, el.dataset.k || S.today()); S.buzz(10); S.soft(); };
  S.act.taskStar = el => { const t = find(el.dataset.id); if (!t) return; t.star = !t.star; S.save(); S.soft(); };
  S.act.taskClean = () => {
    const old = S.state.tasks.slice();
    S.state.tasks = S.state.tasks.filter(t => t.rep || !t.done || t.done === S.today());
    S.save(); S.soft();
    S.toast('נוקה', () => { S.state.tasks = old; S.save(); S.soft(); });
  };

  const fields = t => [
    { id: 't', label: 'מה צריך לעשות', type: 'text' },
    { id: 'who', label: 'של מי', type: 'pills', options: [[S.me, S.name(S.me)], [S.other(S.me), S.name(S.other(S.me))], ['both', 'שנינו']] },
    { id: 'due', label: 'מתי', type: 'date', hint: 'ריק: בלי תאריך.' },
    { id: 'rep', label: 'חוזרת', type: 'pills', options: [['', 'לא'], ['d', 'כל יום'], ['w', 'כל שבוע'], ['m', 'כל חודש']] },
    { id: 'star', label: 'חשובה', type: 'toggle' }
  ];
  function editSheet(t, isNew) {
    S._task = { t, isNew };
    S.sheet(`<h2>${isNew ? 'משימה חדשה' : 'עריכת משימה'}</h2><div id="task-form" class="stack" style="gap:14px">${fields(t).map(f => S.field(f, f.id === 'rep' ? (t.rep || '') : t[f.id])).join('')}
      <div class="chips" style="margin:0;padding:0">${[['היום', 0], ['מחר', 1], ['בעוד שבוע', 7]].map(c => `<button class="chip" data-act="taskDue" data-n="${c[1]}">${c[0]}</button>`).join('')}<button class="chip" data-act="taskDue" data-n="">בלי תאריך</button></div></div>
      <div class="btns">${isNew ? '' : `<button class="btn btn--dan" data-act="taskDel">מחיקה</button>`}<button class="btn btn--pri" data-act="taskSave">שמירה</button></div>`);
    if (isNew) setTimeout(() => { const i = document.querySelector('#task-form input[name="t"]'); if (i) i.focus(); }, 350);
  }
  S.act.taskEdit = el => { const t = find(el.dataset.id); if (t) editSheet(t, false); };
  S.act.taskNew = () => editSheet({ id: '', t: '', who: S.ui.both ? 'both' : S.who(), due: S.ui.date, rep: null, star: false, done: null }, true);
  S.act.taskDue = el => { const i = document.querySelector('#task-form input[name="due"]'); if (i) i.value = el.dataset.n === '' ? '' : S.addDays(S.today(), +el.dataset.n); };
  S.act.taskSave = () => {
    const { t, isNew } = S._task, v = S.readFields(document.getElementById('task-form'), fields(t));
    if (!v.t) { S.toast('צריך לכתוב מה המשימה'); return; }
    const data = { t: v.t, who: v.who, due: v.due || null, rep: v.rep || null, star: v.star };
    if (data.rep && !data.due) data.due = S.today();
    if (isNew) S.state.tasks.push(Object.assign({ id: S.uid(), done: null, c: Date.now() }, data));
    else Object.assign(t, data);
    S.save(); S.closeSheet(); S.soft();
  };
  S.act.taskDel = () => {
    const { t } = S._task, i = S.state.tasks.indexOf(t);
    if (i < 0) return;
    S.state.tasks.splice(i, 1);
    S.save(); S.closeSheet(); S.soft();
    S.toast('המשימה נמחקה', () => { S.state.tasks.splice(i, 0, t); S.save(); S.soft(); });
  };
})();
