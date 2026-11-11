// איזון · אוכל: תפריט היום, תפריט השבוע ורשימת קניות.
(function () {
  'use strict';
  const S = window.S, e = S.esc, { m2t } = S;
  const r = n => Math.round(n);
  const fmt = n => r(n).toLocaleString('he-IL');

  const mealRow = (k, m) => `<div class="meal ${m.eaten ? 'eaten' : ''}">
      <button class="meal__main" data-act="meal" data-slot="${m.slot}" style="text-align:start">
        <div class="meal__k"><span class="ltr num">${m2t(m.time)}</span><span>${e(m.label)}</span>${S.home().kosher ? `<span class="tag" data-k="${m.dish.k}">${S.KLABEL[m.dish.k]}</span>` : ''}</div>
        <div class="meal__n">${e(m.dish.n)}</div>
        <div class="meal__m num">${fmt(m.kcal)} קל׳ · ${r(m.p)} ג׳ חלבון${m.dish.t ? ` · ${m.dish.t} דק׳ הכנה` : ''}${m.eaten === 2 ? ' · אכלתי משהו אחר' : ''}</div>
      </button>${S.dayKind(k) === 'shabbat' || m.feast ? '' : S.chkBtn(m.eaten, 'eat', `data-slot="${m.slot}"`, 'food')}</div>`;

  function dayTab(k, who) {
    const mp = S.mealPlan(k, who), T = mp.target, d = S.peek(k, who);
    const eaten = mp.meals.filter(m => m.eaten === 1);
    const ek = S.sum(eaten, m => m.kcal), ep = S.sum(eaten, m => m.p);
    const shab = S.dayKind(k) === 'shabbat';
    return `${S.dayChips()}
      ${shab ? '' : `<section class="card"><div class="goalrow">
        <div><div class="row"><small>קלוריות</small><small class="num">מתוך ${fmt(T.kcal)}</small></div><div class="big big--md">${fmt(ek)}</div>${S.bar(ek / T.kcal, 'food')}</div>
        <div><div class="row"><small>חלבון</small><small class="num">מתוך ${T.protein} ג׳</small></div><div class="big big--md">${r(ep)}</div>${S.bar(ep / T.protein, 'food')}</div>
      </div><p class="note" style="padding:12px 0 0">בתוכנית להיום: ${fmt(mp.total.kcal)} קל׳ ו-${r(mp.total.p)} ג׳ חלבון. הספירה עולה כשמסמנים ארוחה.</p></section>`}
      <div class="stack">${mp.meals.map(m => mealRow(k, m)).join('')}</div>
      ${shab ? '<p class="note">בשבת אוכלים במידה ונהנים. צלחת אחת מכל מנה, בלי סימונים.</p>' : `<section class="card"><div class="card__h"><h3>מים</h3><small class="num">${d.water || 0} מתוך ${T.water} כוסות</small></div>${S.cups(k, who)}</section>`}
      <p class="note">הכמויות מחושבות לפי הגוף והמטרה של ${e(S.name(who))}. בשר ודגים במשקל לפני בישול, אורז ופסטה אחרי בישול. זו הערכה ולא ייעוץ רפואי.</p>`;
  }

  function weekTab() {
    const base = S.weekKey(S.today()), wk = S.ui.weekNext ? S.addDays(base, 7) : base;
    if (!S.state.menu[wk]) S.genWeek(wk);
    const days = Array.from({ length: 7 }, (_, i) => S.addDays(wk, i)).map(k => {
      const md = S.menuDay(k);
      const rows = S.mealSlots(k).filter(s => !/^s\d$/.test(s)).map(s => md[s] && S.dish(md[s]) ? `<button class="li li--pad" data-act="weekMeal" data-k="${k}" data-slot="${s}"><span class="li__main"><small>${e(S.slotLabel(k, s))}</small><b>${e(S.dish(md[s]).n)}</b></span>${S.home().kosher ? `<span class="tag" data-k="${S.dish(md[s]).k}">${S.KLABEL[S.dish(md[s]).k]}</span>` : ''}</button>` : '').join('');
      return `<div class="sec">${k === S.today() ? 'היום' : 'יום ' + S.DAYS[S.dow(k)]} · ${S.shortDate(k)}</div><div class="list">${rows}</div>`;
    }).join('');
    return `<div class="seg"><button class="${S.ui.weekNext ? '' : 'on'}" data-act="weekPick" data-n="0">השבוע</button><button class="${S.ui.weekNext ? 'on' : ''}" data-act="weekPick" data-n="1">השבוע הבא</button></div>
      ${days}
      <button class="btn btn--block" data-act="reshuffle" data-wk="${wk}">${S.icon('swap')}תפריט אחר לשבוע הזה</button>
      <p class="note">התפריט אחד לשניכם, והכמויות אישיות. לוחצים על מנה כדי לראות או להחליף.</p>`;
  }

  function shopTab() {
    const base = S.weekKey(S.today()), next = S.ui.shopNext;
    const wk = next ? S.addDays(base, 7) : base;
    if (!S.state.menu[wk]) S.genWeek(wk);
    const list = S.shopList(wk, next ? null : S.today()), st = S.shopState(wk);
    const all = list.flatMap(d => d.items), left = all.filter(i => !st.got[i.id]).length + st.extra.filter(x => !x.got).length;
    const extra = S.home().extra || 0;
    return `<div class="seg"><button class="${next ? '' : 'on'}" data-act="shopPick" data-n="0">מהיום עד שבת</button><button class="${next ? 'on' : ''}" data-act="shopPick" data-n="1">השבוע הבא</button></div>
      <div class="row" style="padding:0 4px"><small>${left ? `נשארו ${left} פריטים` : 'הכול בעגלה'}${extra ? ` · כולל ${extra} ילדים בארוחות המשותפות` : ''}</small><button class="btn btn--sm" data-act="shopShare" data-wk="${wk}">${S.icon('share')}שליחה</button></div>
      ${list.map(dp => `<div class="sec">${e(dp.label)}</div><div class="list">${dp.items.map(i => `<div class="li ${st.got[i.id] ? 'done' : ''}">${S.chkBtn(st.got[i.id], 'shopGot', `data-wk="${wk}" data-id="${i.id}"`, 'food')}<span class="li__main"><b>${e(i.name)}</b></span><span class="li__end num">${e(i.text)}</span></div>`).join('')}</div>`).join('')}
      <div class="sec">עוד דברים</div>
      ${st.extra.length ? `<div class="list">${st.extra.map(x => `<div class="li ${x.got ? 'done' : ''}">${S.chkBtn(x.got, 'shopGotX', `data-wk="${wk}" data-id="${x.id}"`, 'food')}<span class="li__main"><b>${e(x.t)}</b></span><button class="ibtn ibtn--plain" data-act="shopDelX" data-wk="${wk}" data-id="${x.id}" aria-label="מחיקה">${S.icon('x')}</button></div>`).join('')}</div>` : ''}
      <form class="quick" data-submit="shopAdd" data-wk="${wk}"><input name="t" placeholder="להוסיף לרשימה: נייר טואלט, סבון" autocomplete="off" enterkeyhint="done"><button class="ibtn" aria-label="הוספה">${S.icon('plus')}</button></form>
      <p class="note">הרשימה מחושבת מהתפריט, לשניכם${extra ? ' ולילדים' : ''}. תבלינים, מלח ורוטב סויה לא נספרים.</p>`;
  }

  S.views.food = () => {
    const tab = S.ui.foodTab, who = S.who();
    const body = tab === 'week' ? weekTab() : tab === 'shop' ? shopTab() : dayTab(S.ui.date, who);
    return `${S.hdr('אוכל', tab === 'day' ? `${S.dayName(S.ui.date)} · התפריט של ${S.name(who)}` : tab === 'week' ? 'תפריט אחד, לשניכם' : 'רשימת קניות')}
      <div class="seg">${[['day', 'היום'], ['week', 'השבוע'], ['shop', 'קניות']].map(t => `<button class="${tab === t[0] ? 'on' : ''}" data-act="foodTab" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>
      ${tab === 'day' ? S.whoSeg(false) : ''}${body}`;
  };

  S.act.foodTab = el => { S.ui.foodTab = el.dataset.t; S.soft(); };
  S.act.weekPick = el => { S.ui.weekNext = el.dataset.n === '1'; S.soft(); };
  S.act.shopPick = el => { S.ui.shopNext = el.dataset.n === '1'; S.soft(); };
  S.act.eat = el => {
    const d = S.day(S.ui.date, S.who()), s = el.dataset.slot;
    d.meals[s] = d.meals[s] ? 0 : 1;
    S.buzz(10); S.save(); S.soft();
  };
  S.act.weekMeal = el => S.act.meal(el);
  S.act.reshuffle = el => {
    const wk = el.dataset.wk, old = JSON.stringify(S.state.menu[wk]);
    S.genWeek(wk, true); S.soft();
    S.toast('נבנה תפריט חדש', () => { S.state.menu[wk] = JSON.parse(old); S.save(); S.soft(); });
  };

  // ---------- גיליון ארוחה ----------
  let mealView = 'me', mealK = null; // היום שהגיליון מציג. לא משנה את היום הפעיל במסכים.
  function mealSheet(slot) {
    const k = mealK, who = S.who(), other = S.other(who);
    const mine = S.mealPlan(k, who).meals.find(m => m.slot === slot);
    if (!mine) return;
    const theirs = S.mealPlan(k, other).meals.find(m => m.slot === slot);
    let items = mine.items, nut = mine, title = `הכמות של ${S.name(who)}`;
    if (mealView === 'other' && theirs) { items = theirs.items; nut = theirs; title = `הכמות של ${S.name(other)}`; }
    if (mealView === 'both' && theirs) {
      const extra = S.home().extra || 0, shared = slot === 'd' || mine.feast;
      items = mine.items.map(it => { const o = theirs.items.find(x => x.id === it.id); const kids = shared && extra && !S.ING[it.id].fix ? it.b * 0.7 * extra : 0; return { id: it.id, g: S.roundQty(it.id, it.g + (o ? o.g : 0) + kids) }; });
      nut = null;
      title = shared && extra ? `לבשל לכולם (שניכם ועוד ${extra})` : 'לבשל לשניכם';
    }
    const feast = mine.feast, d = S.peek(k, who);
    const eaten = d.meals[slot] || 0;
    const html = `<h2>${e(mine.dish.n)}</h2><p>${e(mine.label)} · <span class="ltr num">${m2t(mine.time)}</span>${mine.dish.t ? ` · ${mine.dish.t} דק׳ הכנה` : ''}${S.home().kosher ? ` · ${S.KLABEL[mine.dish.k]}` : ''}</p>
      <div class="seg"><button class="${mealView === 'me' ? 'on' : ''}" data-act="mealView" data-v="me" data-slot="${slot}">${e(S.name(who))}</button><button class="${mealView === 'other' ? 'on' : ''}" data-act="mealView" data-v="other" data-slot="${slot}">${e(S.name(other))}</button><button class="${mealView === 'both' ? 'on' : ''}" data-act="mealView" data-v="both" data-slot="${slot}">לבשל</button></div>
      ${nut ? `<div class="macros num"><div><b>${fmt(nut.kcal)}</b><small>קלוריות</small></div><div><b>${r(nut.p)}</b><small>חלבון</small></div><div><b>${r(nut.c)}</b><small>פחמימה</small></div><div><b>${r(nut.f)}</b><small>שומן</small></div></div>` : ''}
      <div><div class="sec" style="padding:0 0 4px">${e(title)}</div><ul class="ings">${items.map(it => `<li><span>${e(S.ING[it.id].n)}</span><b class="num">${S.qtyText(it.id, it.g)}</b></li>`).join('')}</ul></div>
      <div class="prep">${e(mine.dish.h)}</div>
      ${feast || S.dayKind(k) === 'shabbat' ? '' : `<div class="btns"><button class="btn ${eaten === 1 ? '' : 'btn--tint'}" style="--rc:var(--food)" data-act="eatSheet" data-slot="${slot}" data-v="1">${eaten === 1 ? 'ביטול הסימון' : 'אכלתי'}</button><button class="btn" data-act="eatSheet" data-slot="${slot}" data-v="2">${eaten === 2 ? 'ביטול' : 'אכלתי אחרת'}</button></div>`}
      <button class="btn btn--ghost btn--block" data-act="swapList" data-slot="${slot}">${S.icon('swap')}להחליף מנה</button>`;
    S.sheet(html);
  }
  S.act.meal = el => { mealView = 'me'; mealK = el.dataset.k || S.ui.date; mealSheet(el.dataset.slot); };
  S.act.mealView = el => { mealView = el.dataset.v; mealSheet(el.dataset.slot); };
  S.act.eatSheet = el => {
    const d = S.day(mealK, S.who()), s = el.dataset.slot, v = +el.dataset.v;
    d.meals[s] = d.meals[s] === v ? 0 : v;
    S.buzz(10); S.save(); S.closeSheet(); S.soft();
  };
  S.act.swapList = el => {
    const k = mealK, slot = el.dataset.slot, who = S.who(), T = S.targets(who);
    const opts = S.swapOptions(k, slot);
    const cur = S.dish(S.menuDay(k)[slot]);
    S.sheet(`<h2>במקום ${e(cur ? cur.n : '')}</h2><p>${S.home().kosher ? 'מוצגות רק מנות שמתאימות לבשר ולחלב של אותו יום. ' : ''}ההחלפה חלה על שניכם.</p>
      <div class="list">${opts.map(d => `<button class="li li--pad" data-act="swapTo" data-slot="${slot}" data-id="${d.id}"><span class="li__main"><b>${e(d.n)}</b><small class="num">${d.t ? d.t + ' דק׳ הכנה · ' : ''}${r(S.dishBase(d).p)} ג׳ חלבון במנה בסיסית</small></span>${S.home().kosher ? `<span class="tag" data-k="${d.k}">${S.KLABEL[d.k]}</span>` : ''}</button>`).join('') || '<div class="empty">אין כרגע מנה אחרת שמתאימה ליום הזה.</div>'}</div>`);
    void T;
  };
  S.act.swapTo = el => {
    const k = mealK, slot = el.dataset.slot, old = S.menuDay(k)[slot];
    S.setDish(k, slot, el.dataset.id);
    S.soft(); mealView = 'me'; mealSheet(slot);
    S.toast('המנה הוחלפה', () => { S.setDish(k, slot, old); S.closeSheet(); S.soft(); });
  };

  // ---------- קניות ----------
  S.act.shopGot = el => { const st = S.shopState(el.dataset.wk), id = el.dataset.id; if (st.got[id]) delete st.got[id]; else st.got[id] = 1; S.buzz(8); S.save(); S.soft(); };
  S.act.shopGotX = el => { const x = S.shopState(el.dataset.wk).extra.find(i => i.id === el.dataset.id); if (x) x.got = !x.got; S.save(); S.soft(); };
  S.act.shopDelX = el => { const st = S.shopState(el.dataset.wk); st.extra = st.extra.filter(i => i.id !== el.dataset.id); S.save(); S.soft(); };
  S.act.shopAdd = el => {
    const inp = el.querySelector('input'), t = inp.value.trim();
    if (!t) return;
    for (const part of t.split(/[,،]/).map(x => x.trim()).filter(Boolean)) S.shopState(el.dataset.wk).extra.push({ id: S.uid(), t: part, got: false });
    S.save(); S.soft();
    const again = document.querySelector('.quick input[name="t"]');
    if (again) again.focus();
  };
  S.act.shopShare = el => {
    const wk = el.dataset.wk, st = S.shopState(wk);
    const list = S.shopList(wk, S.ui.shopNext ? null : S.today());
    const lines = ['רשימת קניות'];
    for (const dp of list) { const items = dp.items.filter(i => !st.got[i.id]); if (items.length) { lines.push('', `*${dp.label}*`); for (const i of items) lines.push(`• ${i.name}: ${i.text}`); } }
    const ex = st.extra.filter(x => !x.got);
    if (ex.length) { lines.push('', '*עוד דברים*'); for (const x of ex) lines.push(`• ${x.t}`); }
    const text = lines.join('\n');
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
  };
})();
