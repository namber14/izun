// איזון · תנועה: האימון של היום, נגן אימון, הליכה ומשקל.
(function () {
  'use strict';
  const S = window.S, e = S.esc, pad = S.pad;
  const doseText = it => (it.secs ? (it.secs >= 90 ? `${Math.round(it.secs / 60)} דק׳` : `${it.secs} שנ׳`) : `${it.reps} חזרות`) + (it.side ? ' לכל צד' : '');

  // גרף קו קטן. series: [{color, pts:[{x, y}]}]
  S.spark = (series, o = {}) => {
    const W = 320, H = o.h || 96, padX = 6, padY = 12;
    const all = series.flatMap(s => s.pts);
    if (all.length < 2) return '';
    const xs = all.map(p => p.x), ys = all.map(p => p.y).concat(o.goal != null ? [o.goal] : []);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys) - (o.padY ?? 0.5), y1 = Math.max(...ys) + (o.padY ?? 0.5);
    const X = x => padX + (x1 === x0 ? 0.5 : (x - x0) / (x1 - x0)) * (W - 2 * padX);
    const Y = y => H - padY - (y1 === y0 ? 0.5 : (y - y0) / (y1 - y0)) * (H - 2 * padY);
    const lines = series.map(s => {
      if (!s.pts.length) return '';
      const path = s.pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ');
      const last = s.pts[s.pts.length - 1];
      return `<path d="${path}" fill="none" stroke="var(--${s.color})" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${X(last.x).toFixed(1)}" cy="${Y(last.y).toFixed(1)}" r="4.5" fill="var(--${s.color})"/>`;
    }).join('');
    const goal = o.goal != null ? `<line x1="${padX}" x2="${W - padX}" y1="${Y(o.goal).toFixed(1)}" y2="${Y(o.goal).toFixed(1)}" stroke="var(--dim)" stroke-width="1.5" stroke-dasharray="3 5"/>` : '';
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${e(o.label || 'גרף')}">${goal}${lines}</svg>`;
  };

  const nextWorkout = (who, from) => { for (let i = 0; i < 8; i++) { const k = S.addDays(from, i); const w = S.workoutFor(k, who); if (w) return { k, w }; } return null; };

  S.views.move = () => {
    const who = S.who(), p = S.P(who), k = S.ui.date, d = S.peek(k, who), f = p.fit;
    let w = S.workoutFor(k, who), borrowed = false;
    if (!w && S.ui.anyway === k + who) { const n = nextWorkout(who, k); if (n) { w = n.w; borrowed = true; } }
    const done = d.workout && d.workout.done;
    const shab = S.dayKind(k) === 'shabbat';
    let html = `${S.hdr('תנועה', `${S.dayName(k)} · ${S.name(who)}`)}${S.whoSeg(false)}${S.dayChips()}`;
    if (p.sex === 'f' && p.special === 'preg') html += `<p class="note">בהריון האימונים עדינים: בלי קפיצות ובלי שכיבה ממושכת על הגב. מתאמנים רק באישור הרופא, ועוצרים בכל אי נוחות.</p>`;

    if (w) {
      html += `<section class="card card--tint" style="--rc:var(--move)">
        <div class="now__k" style="color:var(--move)">${done ? 'בוצע' : borrowed ? 'אימון מחוץ לתוכנית' : k === S.today() ? 'האימון של היום' : 'האימון של ' + S.dayName(k)}</div>
        <div class="now__t">${e(w.title)}</div>
        <div class="now__s">${w.type === 'walk' ? `${w.mins} דק׳` : `${w.items.length} תרגילים · ${w.sets} סבבים · כ-${w.mins} דק׳`}${done && d.workout.mins ? ` · נרשמו ${d.workout.mins} דק׳` : ''}</div>
        <div class="list" style="margin:14px 0">${w.items.map((it, i) => `<button class="li li--pad" data-act="exInfo" data-i="${i}"><span class="li__main"><b>${e(it.n)}</b></span><span class="li__end num">${doseText(it)}</span></button>`).join('')}</div>
        ${done ? `<button class="btn btn--ghost btn--block" data-act="workoutUndo">ביטול הסימון</button>` : `<div class="btns"><button class="btn btn--tint" style="--rc:var(--move);flex:2" data-act="play">${S.icon('play')}מתחילים</button><button class="btn" data-act="workoutMark">עשיתי</button></div>`}</section>`;
    } else if (shab) {
      html += `<section class="card empty"><b>שבת</b>היום נחים. הליכה רגועה אחרי הסעודה תמיד טובה.</section>`;
    } else {
      const n = nextWorkout(who, S.addDays(k, 1));
      html += `<section class="card"><div class="now__k">יום מנוחה</div><div class="now__t">הגוף נבנה גם כשנחים</div><div class="now__s">${n ? `האימון הבא: ${S.dayName(n.k)}, ${e(n.w.title)}.` : 'אין ימי אימון בתוכנית.'}</div>
        ${n ? `<button class="btn btn--sm" style="margin-top:14px" data-act="anyway">להתאמן בכל זאת</button>` : ''}</section>`;
    }

    // הליכה
    const goal = p.walkGoal ?? 20;
    if (goal && !shab) html += `<section class="card"><div class="card__h"><h3>הליכה</h3><small>יעד יומי: ${goal} דק׳</small></div>
      <div class="row"><div><span class="big big--md">${d.walk || 0}</span><span class="unit">דק׳</span></div>${S.ring((d.walk || 0) / goal, { size: 52, sw: 6, color: 'move', key: 'walk' + who + k, inner: S.icon('walk') })}</div>
      <div class="btns" style="margin-top:14px"><button class="btn btn--sm" data-act="walk" data-n="5">+5</button><button class="btn btn--sm" data-act="walk" data-n="10">+10</button><button class="btn btn--sm" data-act="walk" data-n="20">+20</button><button class="btn btn--sm btn--ghost" data-act="walk" data-n="0">איפוס</button></div></section>`;

    // השבוע
    const wk = S.weekKey(k);
    const cells = Array.from({ length: 7 }, (_, i) => {
      const dk = S.addDays(wk, i), has = S.workoutFor(dk, who), dd = S.peek(dk, who), ok = dd.workout && dd.workout.done;
      return `<div class="wk__c ${dk === S.today() ? 'today' : ''}" style="display:grid;gap:6px;justify-items:center"><small>${S.DAYS1[i]}</small>${has || ok ? S.ring(ok ? 1 : 0, { size: 30, sw: 4, color: 'move', inner: ok ? S.icon('check') : '' }) : '<span style="width:30px;height:30px;display:grid;place-items:center;color:var(--dim)">·</span>'}</div>`;
    }).join('');
    html += `<section class="card"><div class="card__h"><h3>התוכנית</h3><button data-act="fitEdit">${S.icon('edit')}שינוי</button></div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr)">${cells}</div>
      <p class="note" style="padding:14px 0 0">${e(S.PLACES[f.place])} · ${e(S.LEVELS[f.level])} · ${f.minutes} דק׳. הרמה עולה לבד כל שבועיים.</p></section>`;

    // משקל
    const ws = S.state.weights.filter(x => x.who === who);
    const first = ws[0], last = ws[ws.length - 1];
    const delta = first && last && first !== last ? last.kg - first.kg : 0;
    html += `<section class="card"><div class="card__h"><h3>משקל</h3><button data-act="weigh">${S.icon('scale')}שקילה</button></div>
      <div class="row" style="align-items:flex-end"><div><span class="big big--md">${(+p.weight).toFixed(1)}</span><span class="unit">ק״ג</span></div>
      <small>${ws.length > 1 ? `<span class="ltr num">${delta > 0 ? '+' : ''}${delta.toFixed(1)}</span> ק״ג מאז <span class="ltr num">${S.shortDate(first.k)}</span>` : 'שקילה אחת בשבוע, באותו יום ובאותה שעה.'}</small></div>
      ${S.spark([{ color: 'move', pts: ws.map(x => ({ x: S.kdate(x.k).getTime(), y: x.kg })) }], { label: 'משקל לאורך זמן' })}</section>`;
    return html;
  };

  S.act.anyway = () => { S.ui.anyway = S.ui.date + S.who(); S.soft(); };
  const currentWorkout = () => {
    const who = S.who(), k = S.ui.date;
    let w = S.workoutFor(k, who);
    if (!w && S.ui.anyway === k + who) { const n = nextWorkout(who, k); if (n) w = n.w; }
    return w;
  };
  S.act.exInfo = el => {
    const w = currentWorkout(); if (!w) return;
    const it = w.items[+el.dataset.i];
    S.sheet(`<h2>${e(it.n)}</h2><p>${doseText(it)}${w.type === 'strength' ? ` · ${w.sets} סבבים` : ''}</p><div class="prep">${e(it.how)}</div><button class="btn btn--block" data-act="closeSheet">הבנתי</button>`);
  };
  S.act.workoutMark = () => { const w = currentWorkout(); S.day(S.ui.date, S.who()).workout = { done: true, mins: w ? w.mins : 0 }; S.buzz(15); S.save(); S.soft(); S.toast('כל הכבוד. האימון נרשם.'); };
  S.act.workoutUndo = () => { delete S.day(S.ui.date, S.who()).workout; S.save(); S.soft(); };

  S.act.weigh = () => {
    const who = S.who(), p = S.P(who);
    S.sheet(`<h2>שקילה</h2><p>הכי מדויק בבוקר, לפני האוכל.</p><div id="w-form">${S.field({ id: 'kg', type: 'num', unit: 'ק״ג', min: 35, max: 220, step: 0.1 }, (+p.weight).toFixed(1))}</div>
      <button class="btn btn--pri btn--block" data-act="weighSave">שמירה</button>`);
  };
  S.act.weighSave = () => {
    const v = S.readFields(document.getElementById('w-form'), [{ id: 'kg', type: 'num' }]).kg;
    if (!v || v < 30) { S.toast('המשקל לא נראה נכון'); return; }
    const who = S.who(), before = S.targets(who).kcal;
    if (!S.state.weights.some(x => x.who === who)) S.state.weights.push({ who, k: S.dkey(new Date(S.state.createdAt)), kg: S.P(who).weight });
    S.logWeight(who, Math.round(v * 10) / 10, S.ui.date);
    const after = S.targets(who).kcal;
    S.closeSheet(); S.soft();
    S.toast(after !== before ? 'נשמר. התפריט עודכן לפי המשקל החדש.' : 'השקילה נשמרה');
  };

  S.syncMoveBlocks = who => {
    const p = S.P(who), fresh = S.buildBlocks(who).filter(b => b.k === 'move');
    p.blocks = p.blocks.filter(b => b.k !== 'move').concat(fresh);
  };
  S.act.fitEdit = () => {
    const who = S.who(), p = S.P(who);
    const fields = S.personFields(p, 4, S.keepsShabbat()).concat([{ id: 'walkGoal', label: 'יעד הליכה יומי', type: 'num', unit: 'דק׳', min: 0, max: 120, step: 5, hint: 'אפס מבטל את היעד.' }]);
    S._fitFields = fields;
    S.sheet(`<h2>התוכנית של ${e(p.name)}</h2><div id="fit-form" class="stack" style="gap:16px">${fields.map(f => S.field(f, f.id === 'walkGoal' ? (p.walkGoal ?? 20) : S.personValues(p)[f.id])).join('')}</div>
      <button class="btn btn--pri btn--block" data-act="fitSave">שמירה</button>`);
  };
  S.act.fitSave = () => {
    const who = S.who(), p = S.P(who), v = S.readFields(document.getElementById('fit-form'), S._fitFields);
    const lvl = p.fit.level, place = p.fit.place;
    const err = S.applyPerson(p, v);
    if (err) { S.toast(err); return; }
    p.walkGoal = Math.max(0, v.walkGoal || 0);
    if (lvl !== p.fit.level || place !== p.fit.place) p.fit.since = S.today();
    S.syncMoveBlocks(who);
    S.save(); S.closeSheet(); S.soft(); S.toast('התוכנית עודכנה');
  };

  // ---------- נגן האימון ----------
  let ac = null;
  const beep = (f, dur) => {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = f; o.connect(g); g.connect(ac.destination);
      g.gain.setValueAtTime(0.18, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      o.start(); o.stop(ac.currentTime + dur);
    } catch { /* בלי צליל */ }
  };
  const clock = s => (s >= 60 ? `${Math.floor(s / 60)}:${pad(s % 60)}` : String(s));

  S.act.play = () => {
    const w = currentWorkout(); if (!w) return;
    const who = S.who(), k = S.ui.date;
    const steps = [];
    for (let s = 1; s <= w.sets; s++) for (const it of w.items) steps.push({ it, set: s });
    let i = 0, phase = 'work', running = false, endAt = 0, remain = 0, timer = null, lock = null, lastShown = -1;
    const started = Date.now();
    const el = document.createElement('div');
    el.className = 'player';
    document.body.append(el);
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(l => { lock = l; }).catch(() => {}); } catch { /* ריק */ }
    beep(1, 0.01); // פותח את הצליל בלחיצה הראשונה

    const stop = () => { clearInterval(timer); timer = null; running = false; };
    const run = secs => { stop(); remain = secs; endAt = Date.now() + secs * 1000; running = true; lastShown = -1; timer = setInterval(tick, 200); };
    const tick = () => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      if (left === lastShown) return;
      lastShown = left; remain = left;
      const n = el.querySelector('#p-num');
      if (n) n.textContent = clock(left);
      if (left <= 3 && left > 0) beep(520, 0.09);
      if (left === 0) { beep(880, 0.35); S.buzz(180); advance(); }
    };
    const startStep = () => {
      phase = 'work'; stop(); remain = 0;
      const it = steps[i].it;
      // תרגיל בזמן: הראשון מחכה ללחיצה, הבאים ברצף (בהליכה) מתחילים לבד
      if (it.secs && (w.type === 'walk' && i > 0)) run(it.secs);
      draw();
    };
    const advance = () => {
      stop();
      if (phase === 'work') {
        if (i >= steps.length - 1) { finish(); return; }
        if (w.rest > 0) { phase = 'rest'; run(w.rest); draw(); return; }
      }
      i++; startStep();
    };
    const finish = () => {
      stop(); phase = 'done';
      const mins = Math.max(1, Math.round((Date.now() - started) / 60000));
      S.day(k, who).workout = { done: true, mins };
      S.save();
      beep(660, 0.15); setTimeout(() => beep(990, 0.4), 160);
      draw(mins);
    };
    const close = () => { stop(); try { if (lock) lock.release(); } catch { /* ריק */ } el.remove(); S.soft(); };

    function draw(mins) {
      const st = steps[Math.min(i, steps.length - 1)], it = st.it, nx = steps[i + 1];
      const prog = (i + (phase === 'rest' ? 1 : 0)) / steps.length;
      const top = `<div class="player__top"><button class="ibtn" data-p="quit" aria-label="סגירה">${S.icon('x')}</button>${S.bar(phase === 'done' ? 1 : prog, 'move')}<small class="num">${w.type === 'strength' ? `סבב ${st.set} מתוך ${w.sets}` : `${i + 1} מתוך ${steps.length}`}</small></div>`;
      el.style.setProperty('--pc', phase === 'rest' ? 'var(--sleep)' : 'var(--move)');
      if (phase === 'done') {
        el.innerHTML = `${top}<div class="player__mid"><div class="player__k">סיימת</div><h2>כל הכבוד</h2><div><span class="big">${mins}</span><span class="unit">דק׳</span></div><p class="player__how">האימון נרשם. מים, ונשימה עמוקה.</p></div><button class="btn btn--pri btn--block" data-p="close">סיום</button>`;
        return;
      }
      if (phase === 'quit') {
        el.innerHTML = `${top}<div class="player__mid"><h2>לעצור כאן?</h2><p class="player__how">עברת ${i} מתוך ${steps.length} תרגילים.</p></div>
          <div class="stack"><button class="btn btn--pri btn--block" data-p="resume">להמשיך</button><button class="btn btn--block" data-p="markQuit">לסיים ולסמן שבוצע</button><button class="btn btn--ghost btn--block" data-p="close">לצאת בלי לסמן</button></div>`;
        return;
      }
      if (phase === 'rest') {
        el.innerHTML = `${top}<div class="player__mid"><div class="player__k">מנוחה</div><div class="big" id="p-num">${clock(remain)}</div><p class="player__how">נושמים עמוק. שותים קצת.</p></div>
          <div class="player__next">הבא: ${e(nx.it.n)} · ${doseText(nx.it)}</div><button class="btn btn--block" data-p="skip">לדלג על המנוחה</button>`;
        return;
      }
      const timed = Boolean(it.secs);
      el.innerHTML = `${top}<div class="player__mid"><div class="player__k">${w.type === 'strength' ? `תרגיל ${(i % w.items.length) + 1} מתוך ${w.items.length}` : e(w.title)}</div><h2>${e(it.n)}</h2>
          <div><span class="big" id="p-num">${timed ? clock(running ? remain : it.secs) : it.reps}</span>${timed ? '' : `<span class="unit">חזרות${it.side ? ' לכל צד' : ''}</span>`}</div>
          <p class="player__how">${e(it.how)}</p></div>
        <div class="player__next">${nx ? `אחר כך: ${e(nx.it.n)}` : 'זה התרגיל האחרון'}</div>
        ${timed ? (running ? `<div class="btns"><button class="btn" data-p="pause">${S.icon('pause')}עצירה</button><button class="btn" data-p="skip">לדלג</button></div>` : `<div class="btns"><button class="btn btn--tint" style="--rc:var(--move);flex:2" data-p="go">${S.icon('play')}${remain && remain < it.secs ? 'ממשיכים' : 'התחלה'}</button><button class="btn" data-p="skip">לדלג</button></div>`)
          : `<button class="btn btn--tint btn--block" style="--rc:var(--move)" data-p="skip">${S.icon('check')}סיימתי</button>`}`;
    }

    let before = 'work';
    el.addEventListener('click', ev => {
      const b = ev.target.closest('[data-p]');
      if (!b) return;
      const a = b.dataset.p;
      S.buzz(10);
      if (a === 'close') close();
      else if (a === 'quit') { if (phase === 'done') { close(); return; } before = phase; if (running) { remain = Math.max(1, Math.ceil((endAt - Date.now()) / 1000)); stop(); } phase = 'quit'; draw(); }
      else if (a === 'resume') { phase = before; if (phase === 'rest' || (steps[i].it.secs && remain && remain < steps[i].it.secs)) run(remain || 1); draw(); }
      else if (a === 'markQuit') finish();
      else if (a === 'skip') advance();
      else if (a === 'go') { const it = steps[i].it; run(remain && remain < it.secs ? remain : it.secs); draw(); }
      else if (a === 'pause') { remain = Math.max(1, Math.ceil((endAt - Date.now()) / 1000)); stop(); draw(); }
    });
    startStep();
  };
})();
