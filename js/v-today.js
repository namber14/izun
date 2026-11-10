// איזון · המסך הראשי: היום.
(function () {
  'use strict';
  const S = window.S, e = S.esc, { m2t } = S;
  const pct = x => Math.round((x || 0) * 100);
  const COLOR = { meal: 'food', move: 'move', sleep: 'sleep', wind: 'sleep', wake: 'sleep', shab: 'shab' };
  const colorOf = k => COLOR[k] || 'task';

  const statText = (sc, id) => ({
    food: `${sc.meals[0]}/${sc.meals[1]} ארוחות`,
    move: sc.workout != null ? (sc.workout ? 'האימון בוצע' : 'אימון היום') : (sc.walk[1] ? `${sc.walk[0]}/${sc.walk[1]} דק׳` : 'יום מנוחה'),
    sleep: sc.sleepMins ? S.dur(sc.sleepMins) : 'לא נרשם',
    order: sc.orderN[1] ? `${sc.orderN[0]}/${sc.orderN[1]}` : 'אין משימות'
  })[id];
  const statShort = (sc, id) => ({
    food: `${sc.meals[0]}/${sc.meals[1]}`,
    move: sc.workout != null ? (sc.workout ? 'בוצע' : 'אימון') : (sc.walk[1] ? `${sc.walk[0]}/${sc.walk[1]}` : 'מנוחה'),
    sleep: sc.sleepMins ? `${Math.floor(sc.sleepMins / 60)}:${S.pad(sc.sleepMins % 60)}` : '·',
    order: sc.orderN[1] ? `${sc.orderN[0]}/${sc.orderN[1]}` : '·'
  })[id];
  const AREAS = [['food', 'אוכל', 'food', '#/food'], ['move', 'תנועה', 'move', '#/move'], ['sleep', 'שינה', 'sleep', '#/sleep'], ['order', 'סדר', 'task', '#/tasks']];

  function shabbatCard(k) {
    const md = S.menuDay(k), now = k === S.today();
    const meals = S.mealSlots(k).map(s => md[s] && S.dish(md[s]) ? `<div class="li li--pad"><span class="li__main"><small>${e(S.slotLabel(k, s))}</small><b>${e(S.dish(md[s]).n.replace(/^[^:]+: /, ''))}</b></span></div>` : '').join('');
    return `<section class="card shab">${S.icon('candle')}<h2>שבת שלום</h2>
      <p>${now ? 'היום נחים. בלי סימונים ובלי ציונים.' : 'שבת היא יום מנוחה, בלי סימונים.'} חוזרים אחרי צאת השבת, בערך ב-<span class="ltr num">${m2t(S.havdala(k))}</span>.</p></section>
      ${meals ? `<div class="sec">הסעודות</div><div class="list">${meals}</div>` : ''}`;
  }

  function bothView(k) {
    const ids = [S.me, S.other(S.me)], isToday = k === S.today();
    const scs = ids.map(id => S.score(k, id));
    const cards = ids.map((id, i) => {
      const sc = scs[i], nb = isToday ? S.nowBlock(k, id) : null, b = nb && (nb.cur || nb.next);
      return `<button class="card" data-act="who" data-id="${id}"><h3>${e(S.name(id))}</h3>
        ${S.ring(sc.all, { size: 104, sw: 9, color: 'tx', key: 'all-' + id, inner: `<span class="big big--sm">${pct(sc.all)}</span>` })}
        <small>${b ? `${nb.cur ? 'עכשיו' : m2t(b.sm)}: ${e(b.t)}` : '&nbsp;'}</small></button>`;
    }).join('');
    const rows = AREAS.map(a => `<span style="color:var(--${a[2]})">${S.icon(a[2] === 'task' ? 'tasks' : a[0])}${a[1]}</span>${ids.map((id, i) => `<div>${e(statText(scs[i], a[0]))}${S.bar(scs[i][a[0]] ?? 0, a[2])}</div>`).join('')}`).join('');
    const tasks = S.tasksFor(k, 'both');
    return `<div class="duo">${cards}</div>
      <section class="card"><div class="cmp"><span></span>${ids.map(id => `<b>${e(S.name(id))}</b>`).join('')}${rows}</div></section>
      ${taskCard(k, tasks, 'המשימות של שניכם')}`;
  }

  function taskCard(k, tasks, title) {
    const who = S.who();
    const items = tasks.slice(0, 6).map(t => {
      const done = S.taskDone(t, k);
      return `<div class="li ${done ? 'done' : ''}">${S.chkBtn(done, 'taskToggle', `data-id="${t.id}" data-k="${k}"`, 'task')}
        <button class="li__main" data-act="taskEdit" data-id="${t.id}"><b>${e(t.t)}</b>${!t.rep && t.due && t.due < k && !done ? `<small><span class="late">באיחור</span></small>` : ''}</button>
        ${S.ui.both || t.who !== who ? `<span class="who">${t.who === 'both' ? 'שנינו' : e(S.name(t.who))}</span>` : ''}</div>`;
    }).join('');
    return `<section><div class="card__h" style="padding:0 4px"><h3>${e(title)}</h3><button data-act="taskNew">${S.icon('plus')}משימה</button></div>
      ${tasks.length ? `<div class="list">${items}</div>${tasks.length > 6 ? `<a class="btn btn--ghost btn--sm btn--block" style="margin-top:8px" href="#/tasks">עוד ${tasks.length - 6} משימות</a>` : ''}` : `<div class="card empty"><b>אין משימות להיום</b>אפשר להוסיף, או פשוט ליהנות מזה.</div>`}</section>`;
  }

  function soloView(k) {
    const who = S.who(), p = S.P(who), isToday = k === S.today(), kind = S.dayKind(k);
    const d = S.peek(k, who);
    let html = '';
    if (p.pending) html += `<section class="card card--tint" style="--rc:var(--task)"><div class="row"><div><b>${e(p.name)} עוד לא ${S.g(who, 'מילא', 'מילאה')} פרטים</b><br><small>בינתיים התוכנית כללית. דקה וחצי וזה אישי.</small></div><button class="btn btn--sm" data-act="editPerson" data-id="${who}">למלא</button></div></section>`;

    // שבת: עד צאת השבת אין ציר ואין ציונים
    const afterShabbat = kind === 'shabbat' && isToday && S.nowMin() >= S.havdala(k);
    if (kind === 'shabbat' && !afterShabbat) return html + shabbatCard(k);

    const sc = S.score(k, who);
    const nb = S.nowBlock(k, who), mp = S.mealPlan(k, who), wo = S.workoutFor(k, who);
    const mealOf = slot => mp.meals.find(m => m.slot === slot);

    if (afterShabbat) {
      html += `<section class="card card--tint" style="--rc:var(--shab)"><div class="now__k" style="color:var(--shab)">שבוע טוב</div><div class="now__t">מתכוננים לשבוע</div>
        <div class="btns" style="margin-top:14px;flex-wrap:wrap"><button class="btn btn--sm" data-act="planWeek">תפריט וקניות</button><a class="btn btn--sm" href="#/week">סיכום השבוע</a></div></section>`;
    } else {
      const hour = new Date().getHours();
      const mood = k > S.today() ? 'עוד לפנינו' : sc.all >= 0.85 ? 'יום מצוין' : sc.all >= 0.6 ? 'בדרך הנכונה' : sc.all >= 0.3 ? 'מתקדמים יפה' : (isToday && hour < 12 ? 'היום עוד לפניך' : 'כל סימון קטן נחשב');
      html += `<section class="card hero"><div class="hero__top"><span class="hero__ring">${S.ring(sc.all, { size: 104, sw: 9, color: 'tx', key: 'all-' + who + k, inner: `<span class="big big--md">${pct(sc.all)}</span>` })}</span>
          <div class="hero__txt"><small>הציון של ${isToday ? 'היום' : S.dayName(k)}</small><b>${mood}</b></div></div>
        <div class="hero__stats">${AREAS.map(a => `<a class="stat" href="${a[3]}">${S.ring(sc[a[0]] ?? 0, { size: 46, sw: 5, color: a[2], key: a[0] + who + k, inner: S.icon(a[2] === 'task' ? 'tasks' : a[0]) })}<b>${e(statShort(sc, a[0]))}</b><small>${a[1]}</small></a>`).join('')}</div></section>`;
    }

    // עכשיו
    if (isToday) {
      const b = nb.cur || nb.next;
      if (b) {
        const meal = b.k === 'meal' ? mealOf(b.slot) : null;
        const left = b.sm - S.nowMin();
        const sub = nb.cur ? (b.m > 1 ? `עד ${m2t(b.sm + b.m)}` : (b.note || '')) : `<span class="ltr num">${m2t(b.sm)}</span> · בעוד ${S.dur(left)}`;
        const tap = b.k === 'meal' ? `data-act="meal" data-slot="${b.slot}"` : b.k === 'move' ? 'data-act="nav" data-to="#/move"' : '';
        html += `<section class="card card--tint now" style="--rc:var(--${colorOf(b.k)})"><${tap ? 'button' : 'div'} class="now__main" ${tap} style="text-align:start">
            <div class="now__k">${nb.cur ? 'עכשיו' : 'הבא בתור'}</div><div class="now__t">${e(b.t)}${meal ? ` · ${e(meal.dish.n)}` : ''}</div><div class="now__s">${sub}</div></${tap ? 'button' : 'div'}>
          ${nb.cur && !b.auto && b.k !== 'work' ? S.chkBtn(b.done, 'blk', `data-id="${b.id}"`, colorOf(b.k)) : ''}</section>`;
      } else {
        html += `<section class="card now" style="--rc:var(--sleep)"><div class="now__main"><div class="now__k">סוף היום</div><div class="now__t">לילה טוב</div><div class="now__s">מחר יום חדש.</div></div></section>`;
      }
    }

    // ציר היום
    const now = S.nowMin();
    const rows = nb.list.map(b => {
      const past = k < S.today() || (isToday && b.sm + b.m < now);
      const cur = isToday && nb.cur && nb.cur.id === b.id;
      let sub = b.note || (b.m > 1 && !['wake', 'meal', 'move', 'sleep'].includes(b.k) ? (b.k === 'work' ? `עד ${m2t(b.sm + b.m)}` : S.dur(b.m)) : '');
      let tap = `data-act="blkEdit" data-id="${b.id}"`;
      if (b.k === 'meal') { const m = mealOf(b.slot); if (m) sub = m.dish.n; tap = `data-act="meal" data-slot="${b.slot}"`; }
      if (b.k === 'move') { sub = wo ? `${wo.title} · כ-${wo.mins} דק׳` : ''; tap = 'data-act="nav" data-to="#/move"'; }
      if (b.k === 'sleep') sub = `${p.sleepHours} שעות`;
      if (b.auto) tap = '';
      return `<div class="tl__i ${b.done ? 'done' : ''} ${cur ? 'cur' : ''} ${past ? 'past' : ''}" data-k="${b.k}"><span class="tl__time">${m2t(b.sm)}</span><i class="tl__dot"></i>
        <${tap ? 'button' : 'div'} class="tl__main" ${tap}><b>${e(b.t)}</b>${sub ? `<small>${e(sub)}</small>` : ''}</${tap ? 'button' : 'div'}>
        ${b.auto || b.k === 'work' ? '<span style="width:44px"></span>' : S.chkBtn(b.done, 'blk', `data-id="${b.id}"`, colorOf(b.k))}</div>`;
    }).join('');
    html += `<section class="card" style="padding-bottom:8px"><div class="card__h"><h3>סדר היום</h3><button data-act="blkList">${S.icon('edit')}עריכה</button></div><div class="tl">${rows || '<div class="empty">אין עוגנים ביום הזה.</div>'}</div></section>`;

    // מים והליכה
    const T = mp.target;
    html += `<section class="card"><div class="card__h"><h3>מים</h3><small class="num">${d.water || 0} מתוך ${T.water} כוסות</small></div>${S.cups(k, who)}</section>`;
    if (sc.walk[1]) html += `<section class="card"><div class="card__h"><h3>הליכה</h3><small class="num">${sc.walk[0]} מתוך ${sc.walk[1]} דק׳</small></div>
      ${S.bar(sc.walk[0] / sc.walk[1], 'move')}<div class="btns" style="margin-top:12px"><button class="btn btn--sm" data-act="walk" data-n="5">+5</button><button class="btn btn--sm" data-act="walk" data-n="10">+10</button><button class="btn btn--sm" data-act="walk" data-n="20">+20</button><button class="btn btn--sm btn--ghost" data-act="walk" data-n="0">איפוס</button></div></section>`;

    html += taskCard(k, S.tasksFor(k, who), isToday ? 'המשימות של היום' : 'משימות');
    return html;
  }

  S.views.today = () => {
    const k = S.ui.date;
    const named = Math.abs(S.diffDays(k, S.today())) <= 1; // היום, מחר, אתמול: מוסיפים את שם היום
    const sub = `${named ? `יום ${S.DAYS[S.dow(k)]} · ` : ''}${S.hebDate(k)} · ${S.shortDate(k)}`;
    const actions = `<a class="ibtn" href="#/week" aria-label="השבוע">${S.icon('week')}</a><a class="ava" href="#/settings" aria-label="הגדרות">${e((S.name(S.me) || 'א').trim()[0])}</a>`;
    return `${S.hdr(S.dayName(k), sub, actions)}${S.whoSeg(true)}${S.dayChips()}${S.ui.both ? bothView(k) : soloView(k)}`;
  };

  // ---------- פעולות ----------
  // סימון עוגן בציר. השכמה ושינה רושמות גם את שעות השינה, בלי טופס.
  S.act.blk = el => {
    const k = S.ui.date, who = S.who(), d = S.day(k, who);
    const b = S.blocksFor(k, who).find(x => x.id === el.dataset.id);
    if (!b) return;
    const live = k === S.today();
    const stamp = planned => { const n = S.nowMin(); const diff = Math.min(Math.abs(n - planned % 1440), 1440 - Math.abs(n - planned % 1440)); return m2t(live && diff <= 90 ? n : planned); };
    if (b.k === 'meal') d.meals[b.slot] = d.meals[b.slot] ? 0 : 1;
    else if (b.k === 'move') { if (d.workout && d.workout.done) delete d.workout; else d.workout = { done: true, mins: (S.workoutFor(k, who) || {}).mins || 0 }; }
    else {
      const on = !d.done[b.id];
      if (on) d.done[b.id] = 1; else delete d.done[b.id];
      if (b.k === 'wake' && on) { d.sleep = d.sleep || {}; d.sleep.wake = stamp(b.sm); if (!d.sleep.bed) d.sleep.bed = m2t(S.bedPlan(who)); d.sleep.auto = !d.sleep.q; }
      if (b.k === 'sleep' && on) { const nx = S.day(S.addDays(k, 1), who); nx.sleep = nx.sleep || {}; nx.sleep.bed = stamp(b.sm); }
    }
    S.buzz(10); S.save(); S.soft();
    if (b.k === 'wake' && d.done[b.id]) S.toast('בוקר טוב. השינה נרשמה.');
    if (b.k === 'sleep' && d.done[b.id]) S.toast('לילה טוב. שעת השינה נרשמה.');
  };
  S.act.walk = el => {
    const d = S.day(S.ui.date, S.who()), n = +el.dataset.n;
    d.walk = n ? (d.walk || 0) + n : 0;
    S.buzz(8); S.save(); S.soft();
  };
  S.act.planWeek = () => { S.ui.foodTab = 'week'; S.ui.weekNext = true; S.go('#/food'); };

  // ---------- עריכת סדר היום ----------
  const KINDS = [['study', 'לימוד'], ['home', 'בית ומשפחה'], ['pray', 'תפילה'], ['couple', 'זמן זוגי'], ['other', 'אחר']];
  const LOCKED = ['wake', 'wind', 'sleep'];
  S.act.blkList = () => {
    const who = S.who(), p = S.P(who);
    const list = p.blocks.slice().sort((a, b) => S.t2m(a.s) - S.t2m(b.s));
    S.sheet(`<h2>סדר היום של ${e(p.name)}</h2><p>לוחצים על עוגן כדי לשנות שעה, משך או ימים.</p>
      <div class="list">${list.map(b => `<button class="li li--pad" data-act="blkEdit" data-id="${b.id}"><span class="li__main"><b>${e(b.t)}</b><small>${b.d.map(x => S.DAYS1[x]).join(' ')}</small></span><span class="li__end ltr num">${b.s}</span></button>`).join('')}</div>
      <button class="btn btn--pri btn--block" data-act="blkEdit" data-id="">${S.icon('plus')}עוגן חדש</button>
      <button class="btn btn--ghost btn--sm btn--block" data-act="blkRebuild">לבנות מחדש מהפרופיל</button>`);
  };
  S.act.blkEdit = el => {
    const who = S.who(), p = S.P(who), id = el.dataset.id;
    const b = id ? p.blocks.find(x => x.id === id) : { id: '', t: '', k: 'other', s: '20:00', m: 30, d: [0, 1, 2, 3, 4] };
    if (!b) return;
    if (LOCKED.includes(b.k)) {
      S.sheet(`<h2>${e(b.t)}</h2><p>שעות ההשכמה והשינה נקבעות יחד, במסך השינה.</p><button class="btn btn--pri btn--block" data-act="nav" data-to="#/sleep">למסך השינה</button>`);
      return;
    }
    const fixed = ['meal', 'move', 'work'].includes(b.k);
    const fields = [
      ...(fixed ? [] : [{ id: 't', label: 'מה', type: 'text', placeholder: 'למשל: שיעור, זמן עם הילדים' }]),
      ...(id || fixed ? [] : [{ id: 'k', label: 'סוג', type: 'pills', options: KINDS }]),
      { id: 's', label: 'שעה', type: 'time' },
      { id: 'm', label: 'משך', type: 'num', unit: 'דק׳', min: 5, max: 720, step: 5 },
      ...(b.k === 'move' ? [] : [{ id: 'd', label: 'ימים', type: 'days', skip: S.keepsShabbat() ? [6] : [] }])
    ];
    S.sheet(`<h2>${id ? e(b.t) : 'עוגן חדש'}</h2>${b.k === 'move' ? '<p>ימי האימון נקבעים במסך התנועה.</p>' : ''}
      <div id="blk-form" class="stack" style="gap:14px">${fields.map(f => S.field(f, b[f.id])).join('')}</div>
      <div class="btns">${id && !fixed ? `<button class="btn btn--dan" data-act="blkDel" data-id="${id}">מחיקה</button>` : ''}<button class="btn btn--pri" data-act="blkSave" data-id="${id}">שמירה</button></div>`);
    S._blkFields = fields;
  };
  S.act.blkSave = el => {
    const who = S.who(), p = S.P(who), id = el.dataset.id;
    const v = S.readFields(document.getElementById('blk-form'), S._blkFields);
    if ('t' in v && !v.t) { S.toast('צריך שם לעוגן'); return; }
    if (!v.s) { S.toast('צריך שעה'); return; }
    if ('d' in v && !v.d.length) { S.toast('צריך לבחור לפחות יום אחד'); return; }
    if (id) Object.assign(p.blocks.find(x => x.id === id), v, { m: v.m || 30 });
    else p.blocks.push(Object.assign({ id: S.uid(), k: 'other', u: 1 }, v, { m: v.m || 30 }));
    S.save(); S.closeSheet(); S.soft(); S.toast('נשמר');
  };
  S.act.blkDel = el => {
    const who = S.who(), p = S.P(who), i = p.blocks.findIndex(x => x.id === el.dataset.id);
    if (i < 0) return;
    const [old] = p.blocks.splice(i, 1);
    S.save(); S.closeSheet(); S.soft();
    S.toast('העוגן נמחק', () => { p.blocks.splice(i, 0, old); S.save(); S.soft(); });
  };
  S.act.blkRebuild = () => {
    const who = S.who(), old = S.P(who).blocks;
    S.rebuild(who); S.closeSheet(); S.soft();
    S.toast('סדר היום נבנה מחדש', () => { S.P(who).blocks = old; S.save(); S.soft(); });
  };
})();
