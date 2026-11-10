// איזון · שינה: הלילה שעבר, הלילה הקרוב, ושבעה לילות אחרונים.
(function () {
  'use strict';
  const S = window.S, e = S.esc, { t2m, m2t, pad } = S;
  const hm = mins => `${Math.floor(mins / 60)}:${pad(Math.round(mins) % 60)}`;
  const QS = [[1, 'עייף'], [3, 'בסדר'], [5, 'רענן']];

  function bars(days, goal) {
    const W = 320, H = 120, slot = W / 7, top = 10, base = 92;
    const max = Math.max(goal * 1.15, ...days.map(d => d.mins));
    const Y = m => base - (m / max) * (base - top);
    // מימין לשמאל: הלילה הישן מימין, האחרון משמאל
    const cols = days.map((d, i) => {
      const x = W - (i + 0.5) * slot, w = 22;
      const bar = d.mins ? `<rect x="${(x - w / 2).toFixed(1)}" y="${Y(d.mins).toFixed(1)}" width="${w}" height="${(base - Y(d.mins)).toFixed(1)}" rx="7" fill="var(--sleep)" opacity="${d.mins >= goal - 20 ? 1 : 0.55}"/>` : `<rect x="${(x - w / 2).toFixed(1)}" y="${base - 4}" width="${w}" height="4" rx="2" fill="var(--line)"/>`;
      return `${bar}<text x="${x.toFixed(1)}" y="${H - 6}" text-anchor="middle" ${d.today ? 'style="fill:var(--tx);font-weight:800"' : ''}>${S.DAYS1[S.dow(d.k)]}</text>`;
    }).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="שעות שינה בשבעת הלילות האחרונים"><line x1="4" x2="${W - 4}" y1="${Y(goal).toFixed(1)}" y2="${Y(goal).toFixed(1)}" stroke="var(--dim)" stroke-width="1.5" stroke-dasharray="3 5"/>${cols}</svg>`;
  }

  S.views.sleep = () => {
    const who = S.who(), p = S.P(who), k = S.ui.date, d = S.peek(k, who), sl = d.sleep;
    const goal = (p.sleepHours || 7.5) * 60, mins = S.sleepMins(sl), bed = S.bedPlan(who);
    let html = `${S.hdr('שינה', `${S.dayName(k)} · ${S.name(who)}`)}${S.whoSeg(false)}${S.dayChips()}`;

    if (mins) {
      html += `<section class="card"><div class="row"><div><div class="now__k" style="color:var(--sleep)">הלילה שעבר</div><div><span class="big">${hm(mins)}</span><span class="unit">שעות</span></div>
          <div class="now__s">שינה ב-<span class="ltr num">${e(sl.bed)}</span> · השכמה ב-<span class="ltr num">${e(sl.wake)}</span></div></div>
          ${S.ring(mins / goal, { size: 76, sw: 8, color: 'sleep', key: 'sl' + who + k, inner: S.icon('sleep') })}</div>
        <div class="sec" style="padding:16px 0 8px">איך קמת?</div>
        <div class="btns">${QS.map(q => `<button class="btn btn--sm ${sl.q === q[0] ? 'btn--pri' : ''}" data-act="sleepQ" data-q="${q[0]}">${q[1]}</button>`).join('')}</div>
        <button class="btn btn--ghost btn--sm btn--block" style="margin-top:10px" data-act="sleepEdit">${S.icon('edit')}תיקון שעות</button></section>`;
    } else {
      html += `<section class="card"><div class="now__k" style="color:var(--sleep)">הלילה שעבר</div><div class="now__t">איך ישנת?</div><div class="now__s">לחיצה אחת אם זה היה לפי התוכנית.</div>
        <div class="btns" style="margin-top:14px"><button class="btn btn--tint" style="--rc:var(--sleep)" data-act="sleepPlan">לפי התוכנית</button><button class="btn" data-act="sleepEdit">שעות אחרות</button></div></section>`;
    }

    if (k === S.today() && !S.isShabbatNow()) {
      const now = S.nowMin(), wind = (bed - 40 + 1440) % 1440;
      let left = (wind - now + 1440) % 1440;
      const late = left > 16 * 60; // כבר אחרי שעת ההתארגנות
      html += `<section class="card card--tint" style="--rc:var(--sleep)"><div class="now__k" style="color:var(--sleep)">הלילה</div>
        <div class="now__t">לישון עד <span class="ltr num">${m2t(bed)}</span></div>
        <div class="now__s">${late ? 'הגיע הזמן להתארגן לשינה.' : `מתחילים להתארגן ב-<span class="ltr num">${m2t(wind)}</span>, בעוד ${S.dur(left)}.`}</div>
        <p class="note" style="padding:12px 0 0">שעה לפני: מסכים בצד, אור עמום, חדר קריר. קפה רק עד הצהריים.</p></section>`;
    }

    // שבעה לילות
    const days = Array.from({ length: 7 }, (_, i) => { const dk = S.addDays(k, -6 + i); const s = S.peek(dk, who).sleep; return { k: dk, mins: S.sleepMins(s), bed: s && s.bed, today: dk === k }; });
    const got = days.filter(x => x.mins);
    let insight = 'אחרי שלושה לילות יופיעו כאן תובנות.';
    let kv = '';
    if (got.length) {
      const avg = S.sum(got, x => x.mins) / got.length;
      const beds = got.map(x => { const m = t2m(x.bed); return m < 720 ? m + 1440 : m; });
      const avgBed = S.sum(beds) / beds.length, spread = Math.max(...beds) - Math.min(...beds);
      kv = `<div class="kv" style="margin-top:12px"><div><small>ממוצע</small><span class="big big--sm">${hm(avg)}</span></div><div><small>שעת שינה ממוצעת</small><span class="big big--sm ltr">${m2t(avgBed)}</span></div></div>`;
      if (got.length >= 3) {
        if (avg < goal - 40) insight = `בממוצע חסרות ${S.dur(goal - avg)} בלילה. השבוע מקדימים את השינה ברבע שעה, לא יותר.`;
        else if (spread > 75) insight = 'שעת השינה זזה הרבה בין הלילות. שעה קבועה חשובה יותר ממספר השעות.';
        else insight = 'יציב ומספיק. ככה נראית שינה טובה.';
      }
    }
    html += `<section class="card"><div class="card__h"><h3>שבעה לילות</h3><small>היעד: <span class="ltr">${String(p.sleepHours).replace('.5', '½')}</span> שעות</small></div>${bars(days, goal)}${kv}<p class="note" style="padding:12px 0 0">${e(insight)}</p></section>`;

    html += `<section class="card"><div class="card__h"><h3>היעד</h3><button data-act="sleepGoal">${S.icon('edit')}שינוי</button></div>
      <div class="kv"><div><small>השכמה</small><span class="big big--sm ltr">${e(p.wake)}</span></div><div><small>שינה</small><span class="big big--sm ltr">${m2t(bed)}</span></div></div></section>`;
    return html;
  };

  S.act.sleepPlan = () => {
    const who = S.who(), p = S.P(who), d = S.day(S.ui.date, who);
    d.sleep = { bed: m2t(S.bedPlan(who)), wake: p.wake, q: (d.sleep && d.sleep.q) || 0 };
    S.buzz(10); S.save(); S.soft();
  };
  S.act.sleepQ = el => { const d = S.day(S.ui.date, S.who()); if (!d.sleep) return; const q = +el.dataset.q; d.sleep.q = d.sleep.q === q ? 0 : q; S.save(); S.soft(); };
  const F = [{ id: 'bed', label: 'הלכתי לישון', type: 'time' }, { id: 'wake', label: 'קמתי', type: 'time' }];
  S.act.sleepEdit = () => {
    const who = S.who(), p = S.P(who), sl = S.peek(S.ui.date, who).sleep || {};
    S.sheet(`<h2>הלילה שעבר</h2><div id="sl-form" class="stack" style="gap:14px">${S.field(F[0], sl.bed || m2t(S.bedPlan(who)))}${S.field(F[1], sl.wake || p.wake)}</div>
      <div class="btns">${sl.bed ? `<button class="btn btn--dan" data-act="sleepClear">מחיקה</button>` : ''}<button class="btn btn--pri" data-act="sleepSave">שמירה</button></div>`);
  };
  S.act.sleepSave = () => {
    const v = S.readFields(document.getElementById('sl-form'), F);
    if (!v.bed || !v.wake) { S.toast('חסרה שעה'); return; }
    const d = S.day(S.ui.date, S.who());
    d.sleep = { bed: v.bed, wake: v.wake, q: (d.sleep && d.sleep.q) || 0 };
    S.save(); S.closeSheet(); S.soft();
  };
  S.act.sleepClear = () => { delete S.day(S.ui.date, S.who()).sleep; S.save(); S.closeSheet(); S.soft(); };

  // שעות ההשכמה והשינה מזיזות את שלושת העוגנים שלהן בציר
  S.syncSleepBlocks = who => {
    const p = S.P(who), bed = S.bedPlan(who);
    for (const b of p.blocks) {
      if (b.k === 'wake') b.s = p.wake;
      if (b.k === 'sleep') { b.s = m2t(bed); b.m = Math.round(p.sleepHours * 60); }
      if (b.k === 'wind') b.s = m2t(bed - 40);
    }
  };
  const G = [{ id: 'wake', label: 'שעת השכמה', type: 'time' }, { id: 'sleepHours', label: 'כמה שעות שינה', type: 'num', unit: 'שעות', min: 5.5, max: 10, step: 0.5 }];
  S.act.sleepGoal = () => {
    const p = S.P(S.who());
    S.sheet(`<h2>היעד של ${e(p.name)}</h2><p>שעת השינה מחושבת מההשכמה לאחור.</p><div id="sg-form" class="stack" style="gap:14px">${S.field(G[0], p.wake)}${S.field(G[1], p.sleepHours)}</div>
      <p class="note">ארוחות, תפילה ואימון לא זזים לבד. אם ההשכמה השתנתה הרבה, אפשר לבנות את היום מחדש מתוך עריכת סדר היום.</p>
      <button class="btn btn--pri btn--block" data-act="sleepGoalSave">שמירה</button>`);
  };
  S.act.sleepGoalSave = () => {
    const who = S.who(), p = S.P(who), v = S.readFields(document.getElementById('sg-form'), G);
    if (!v.wake || !v.sleepHours) { S.toast('חסר ערך'); return; }
    p.wake = v.wake; p.sleepHours = v.sleepHours;
    S.syncSleepBlocks(who);
    S.save(); S.closeSheet(); S.soft(); S.toast('היעד עודכן');
  };
})();
