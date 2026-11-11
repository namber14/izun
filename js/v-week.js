// איזון · מבט שבועי: טבלת שליטה לשניכם, מדדים, ורבע שעה של סיכום.
(function () {
  'use strict';
  const S = window.S, e = S.esc, pad = S.pad;
  const hm = mins => `${Math.floor(mins / 60)}:${pad(Math.round(mins) % 60)}`;
  const pct = x => Math.round((x || 0) * 100);

  function stats(who, wk) {
    const today = S.today();
    let scores = [], plannedW = 0, doneW = 0, sleeps = [], mealsDone = 0, mealsAll = 0, water = [];
    for (let i = 0; i < 7; i++) {
      const k = S.addDays(wk, i), kind = S.dayKind(k), d = S.peek(k, who);
      if (S.workoutFor(k, who)) plannedW++;
      if (d.workout && d.workout.done) doneW++;
      if (k > today || kind === 'shabbat') continue;
      const sc = S.score(k, who);
      if (S.state.days[k] && S.state.days[k][who]) { scores.push(sc.all); water.push(d.water || 0); }
      if (sc.sleepMins) sleeps.push(sc.sleepMins);
      mealsDone += sc.meals[0]; mealsAll += sc.meals[1];
    }
    const ws = S.state.weights.filter(x => x.who === who);
    const inWeek = ws.filter(x => x.k >= wk && x.k <= S.addDays(wk, 6)), before = ws.filter(x => x.k < wk).pop();
    const lastW = inWeek[inWeek.length - 1];
    return {
      avg: scores.length ? S.sum(scores) / scores.length : null,
      workouts: [doneW, plannedW],
      sleep: sleeps.length ? S.sum(sleeps) / sleeps.length : null,
      meals: mealsAll ? mealsDone / mealsAll : null,
      water: water.length ? S.sum(water) / water.length : null,
      weight: lastW && before ? lastW.kg - before.kg : null
    };
  }

  S.views.week = () => {
    const cur = S.weekKey(S.today()), wk = S.ui.week || cur, today = S.today();
    const ids = [S.me, S.other(S.me)];
    const head = `<span></span>${Array.from({ length: 7 }, (_, i) => `<small ${S.addDays(wk, i) === today ? 'style="color:var(--tx);font-weight:800"' : ''}>${S.DAYS1[i]}</small>`).join('')}`;
    const rows = ids.map(id => `<span class="wk__n">${e(S.name(id))}</span>${Array.from({ length: 7 }, (_, i) => {
      const k = S.addDays(wk, i);
      if (S.dayKind(k) === 'shabbat') return `<span class="wk__c" style="color:var(--shab)">${S.icon('candle')}</span>`;
      if (k > today) return `<span class="wk__c">${S.ring(0, { size: 34, sw: 4, color: 'dim' })}</span>`;
      const sc = S.score(k, id);
      return `<button class="wk__c ${k === today ? 'today' : ''}" data-act="weekDay" data-k="${k}" data-id="${id}" aria-label="${pct(sc.all)} אחוז">${S.ring(sc.all, { size: 34, sw: 4, color: sc.all >= 0.6 ? 'food' : sc.all >= 0.3 ? 'task' : 'move', inner: pct(sc.all) })}</button>`;
    }).join('')}`).join('');

    const st = ids.map(id => stats(id, wk));
    const line = (label, f) => `<span>${label}</span>${st.map(s => `<div>${f(s)}</div>`).join('')}`;
    const cmp = `<div class="cmp"><span></span>${ids.map(id => `<b>${e(S.name(id))}</b>`).join('')}
      ${line('ציון', s => (s.avg == null ? '·' : `<span class="big big--sm">${pct(s.avg)}</span>`))}
      ${line('אימונים', s => `${s.workouts[0]} מתוך ${s.workouts[1]}${S.bar(s.workouts[1] ? s.workouts[0] / s.workouts[1] : 0, 'move')}`)}
      ${line('שינה', s => (s.sleep == null ? '·' : hm(s.sleep)))}
      ${line('ארוחות', s => (s.meals == null ? '·' : `${pct(s.meals)}%${S.bar(s.meals, 'food')}`))}
      ${line('מים', s => (s.water == null ? '·' : `${s.water.toFixed(1)} כוסות`))}
      ${line('משקל', s => (s.weight == null ? '·' : `<span><span class="ltr">${s.weight > 0 ? '+' : ''}${s.weight.toFixed(1)}</span> ק״ג</span>`))}
      ${wk === cur ? line('רצף', (s) => { const id = ids[st.indexOf(s)]; const n = S.streak(id); return n ? `${n} ימים` : '·'; }) : ''}</div>`;

    const rv = S.state.reviews[wk] || {};
    const q = (id, label, ph) => `<div class="f"><label for="rv-${id}">${label}</label><textarea id="rv-${id}" data-change="reviewSave" data-input="reviewDraft" data-wk="${wk}" data-f="${id}" placeholder="${ph}">${e(rv[id] || '')}</textarea></div>`;
    const nav = `<button class="ibtn" data-act="weekShift" data-d="-7" aria-label="שבוע קודם">${S.icon('prev')}</button><button class="ibtn" data-act="weekShift" data-d="7" aria-label="שבוע הבא" ${wk >= cur ? 'disabled style="opacity:.3"' : ''}>${S.icon('next')}</button>`;
    return `${S.hdr(wk === cur ? 'השבוע' : 'שבוע קודם', `${S.shortDate(wk)} עד ${S.shortDate(S.addDays(wk, 6))}`, nav)}
      <section class="card"><div class="wk">${head}${rows}</div><p class="note" style="padding:12px 0 0">כל עיגול הוא ציון היום. לוחצים כדי לפתוח את היום.</p></section>
      <section class="card">${cmp}</section>
      <section class="card"><div class="card__h"><h3>רבע שעה על השבוע</h3><small>יחד, פעם בשבוע</small></div>
        <div class="stack" style="gap:14px">${q('good', 'מה עבד לנו השבוע?', 'דבר אחד או שניים')}${q('fix', 'מה נשנה?', 'משהו קטן שאפשר לשנות')}${q('one', 'דבר אחד לשבוע הבא', 'רק אחד')}</div></section>
      <button class="btn btn--block" data-act="planWeek">${S.icon('cart')}לתכנן את השבוע הבא</button>`;
  };

  S.act.weekShift = el => { const cur = S.weekKey(S.today()); const n = S.addDays(S.ui.week || cur, +el.dataset.d); if (n > cur) return; S.ui.week = n === cur ? null : n; S.soft(); };
  S.act.weekDay = el => { S.ui.date = el.dataset.k; S.ui.who = el.dataset.id; S.ui.both = false; S.go('#/today'); };
  // נשמר תוך כדי הקלדה, כדי שמעבר לאפליקציה אחרת לא ימחק את מה שנכתב
  S.act.reviewDraft = el => { const r = S.state.reviews[el.dataset.wk] || (S.state.reviews[el.dataset.wk] = {}); r[el.dataset.f] = el.value; S.save(); };
  S.act.reviewSave = el => { const r = S.state.reviews[el.dataset.wk] || (S.state.reviews[el.dataset.wk] = {}); r[el.dataset.f] = el.value.trim(); S.save(); S.toast('נשמר'); };
})();
