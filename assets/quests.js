(function () {
  const L = window.LifeOS;
  const { esc, $, formModal, toast } = L;
  L.mountChrome('quests.html');
  const S = () => L.state;
  const XP_DEFAULT = { daily: 10, week: 40, month: 120, year: 400 };
  const RARITY = { daily: 'Common', week: 'Uncommon', month: 'Rare', year: 'Epic' };

  /* ---------- Goal questionnaire ---------- */
  const QUESTIONS = [
    { id: 'areas', q: 'Which life areas matter most to you this year? (pick up to 3)', type: 'multi', options: ['Business / income', 'Career / skills', 'Health / body', 'Relationships / family', 'Learning (AI, Web3…)', 'Creativity / content', 'Money / investing', 'Mind / rest'] },
    { id: 'vision', q: 'Imagine it is one year from today. What happened that makes you say "this year was truly worth it"?', type: 'text', hint: 'Describe it like a scene: where you are, what you have, how you feel.' },
    { id: 'why', q: 'Why does that matter to you — what changes in your life if you get it?', type: 'text' },
    { id: 'measure', q: 'What single number would prove you achieved it, and by when?', type: 'text', hint: 'e.g. "$3,000/month from automated products by Oct 2027", "10k subscribers", "run a half-marathon".' },
    { id: 'start', q: 'Where are you starting from today on that number?', type: 'text' },
    { id: 'hours', q: 'Honestly, how many hours per week can you put into this?', type: 'select', options: ['< 3', '3–5', '5–10', '10–20', '20+'] },
    { id: 'blockers', q: 'What has stopped you in the past?', type: 'text', hint: 'Time, energy, unclear next step, perfectionism, money, fear of posting…' },
    { id: 'no', q: 'What will you say NO to this year to make room?', type: 'text' },
    { id: 'reward', q: 'How will you reward yourself at each milestone?', type: 'text' },
    { id: 'year', q: 'Now write your YEAR goal (the final boss) in one sentence.', type: 'text', target: 'year', hint: 'Outcome + number + deadline.' },
    { id: 'month', q: 'This MONTH\'s milestone — what must be true in 30 days to be on track?', type: 'text', target: 'month', hint: 'Roughly 1/12 of the year number, or a leading indicator (e.g. "launch first product", "publish 12 videos").' },
    { id: 'week', q: 'This WEEK\'s focus — the 1–3 actions that move the month milestone.', type: 'text', target: 'week', hint: 'Each action becomes a quest. Keep each under 2 hours.' },
  ];
  let step = 0;
  let showQ = !S().goals.year;

  function renderQ() {
    const g = S().goals;
    const box = $('#questionnaire');
    if (!showQ) {
      box.innerHTML = g.year ? `<p class="small muted">Goal set. Revisit any time — your answers are saved.</p>` : '<p class="small muted">Hidden.</p>';
      return;
    }
    const q = QUESTIONS[step];
    const val = g.answers[q.id] ?? (q.target ? g[q.target] : '') ?? '';
    let input;
    if (q.type === 'multi') input = `<div class="row">${q.options.map((o) => `<label class="row" style="gap:4px;margin:0 10px 6px 0;color:var(--text)"><input type="checkbox" style="width:auto" value="${esc(o)}" ${(val || []).includes(o) ? 'checked' : ''}>${esc(o)}</label>`).join('')}</div>`;
    else if (q.type === 'select') input = `<select id="qa">${q.options.map((o) => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    else input = `<textarea id="qa" placeholder="${esc(q.hint || '')}">${esc(val)}</textarea>`;
    const ctx = q.target && g.answers.measure ? `<div class="callout small" style="margin-bottom:10px">Your number: <b>${esc(g.answers.measure)}</b> · starting point: <b>${esc(g.answers.start || '?')}</b> · ${esc(g.answers.hours || '?')} h/week</div>` : '';
    box.innerHTML = `
      <div class="row small muted" style="margin-bottom:6px"><span>Question ${step + 1} of ${QUESTIONS.length}</span><span class="spacer"></span></div>
      <div class="bar gold" style="margin-bottom:14px"><span style="width:${((step + 1) / QUESTIONS.length) * 100}%"></span></div>
      <h3>${esc(q.q)}</h3>${q.hint && q.type !== 'text' ? `<p class="small muted">${esc(q.hint)}</p>` : ''}${ctx}${input}
      <div class="row" style="margin-top:12px"><button id="qPrev" ${step === 0 ? 'disabled' : ''}>← Back</button><span class="spacer"></span>
      <button class="btn-primary" id="qNext">${step === QUESTIONS.length - 1 ? 'Finish & create quests ✨' : 'Next →'}</button></div>`;
    $('#qPrev').onclick = () => { saveAnswer(); step--; renderQ(); };
    $('#qNext').onclick = () => { saveAnswer(); if (step < QUESTIONS.length - 1) { step++; renderQ(); } else finishQ(); };
  }
  function saveAnswer() {
    const q = QUESTIONS[step];
    const g = S().goals;
    const v = q.type === 'multi' ? [...$('#questionnaire').querySelectorAll('input[type=checkbox]:checked')].map((x) => x.value) : $('#qa').value.trim();
    g.answers[q.id] = v;
    if (q.target) g[q.target] = v;
    L.save();
  }
  function finishQ() {
    const s = S();
    const g = s.goals;
    // Turn the week focus lines into quests (one per line / sentence).
    const lines = (g.week || '').split(/\n|;|•|(?<=\.)\s+/).map((x) => x.replace(/^[-*\d.)\s]+/, '').trim()).filter((x) => x.length > 2);
    let made = 0;
    lines.slice(0, 5).forEach((t) => {
      if (!s.quests.some((q) => q.title === t)) { s.quests.push({ id: L.uid(), title: t, horizon: 'week', status: 'todo', deadline: L.addDays(7 - new Date().getDay() || 7), xp: XP_DEFAULT.week, parent: '' }); made++; }
    });
    if (g.month && !s.quests.some((q) => q.title === g.month)) s.quests.push({ id: L.uid(), title: g.month, horizon: 'month', status: 'todo', deadline: L.addDays(30), xp: XP_DEFAULT.month, parent: '' });
    const intro = s.quests.find((q) => q.title === 'Answer the goal-setting questions' && q.status !== 'done');
    if (intro) complete(intro.id, true);
    showQ = false; L.save(); renderAll();
    toast(`Goals saved · ${made} weekly quest${made === 1 ? '' : 's'} created`);
  }

  /* ---------- Player ---------- */
  function streak() {
    const days = new Set(S().player.completedDays || []);
    let n = 0; const d = new Date();
    if (!days.has(L.iso(d))) d.setDate(d.getDate() - 1); // today not done yet doesn't break the streak
    while (days.has(L.iso(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function renderPlayer() {
    const p = S().player;
    const lvl = L.levelFor(p.xp);
    const cur = L.xpForLevel(lvl), nxt = L.xpForLevel(lvl + 1);
    const done = S().quests.filter((q) => q.status === 'done').length;
    $('#player').innerHTML = `
      <div class="avatar">🧙<span class="lv">Lv ${lvl}</span></div>
      <div>
        <div class="row"><h1 style="margin:0">${L.titleFor(lvl)}</h1><span class="pill accent">🔥 ${streak()}-day streak</span><span class="pill good">✔ ${done} quest${done === 1 ? '' : 's'} cleared</span></div>
        <div class="row small muted" style="margin:6px 0 4px"><span>XP</span><span class="spacer"></span><span class="num">${p.xp - cur} / ${nxt - cur} to Lv ${lvl + 1}</span></div>
        <div class="bar gold" style="height:12px"><span style="width:${((p.xp - cur) / (nxt - cur)) * 100}%"></span></div>
        <p class="small muted" style="margin:8px 0 0">Total ${p.xp} XP. Tip: one small quest a day keeps the streak alive — that's the whole game.</p>
      </div>`;
  }

  /* ---------- Bosses ---------- */
  function renderBosses() {
    const s = S();
    const defs = [['year', '🐉', 'Year boss'], ['month', '👹', 'Month boss'], ['week', '👾', 'Week boss']];
    $('#bosses').innerHTML = defs.map(([h, icon, label]) => {
      const qs = s.quests.filter((q) => q.horizon === h || (h === 'week' && q.horizon === 'daily'));
      const total = qs.length, done = qs.filter((q) => q.status === 'done').length;
      const hp = total ? Math.round(((total - done) / total) * 100) : 100;
      const goal = s.goals[h];
      const slain = total > 0 && done === total;
      return `<div class="card boss ${slain ? 'slain' : ''}">
        <div class="row"><span class="icon">${icon}</span><div style="min-width:0;flex:1"><div class="small muted">${label}</div><b>${goal ? esc(goal) : '<span class="muted">Not set — answer the Quest Giver</span>'}</b></div></div>
        <div class="hp"><span style="width:${hp}%"></span></div>
        <div class="row small muted" style="margin-top:4px"><span>HP ${hp}%</span><span class="spacer"></span><span>${done}/${total} quests</span></div>
        <button class="btn-sm" style="margin-top:8px" data-boss="${h}">Edit goal</button>
      </div>`;
    }).join('');
  }

  /* ---------- Quest map (SVG) ---------- */
  function renderMap() {
    const s = S();
    const W = 900, H = 150, DAYS = 45, pad = 30;
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const x = (iso) => { const d = new Date(iso + 'T00:00'); const k = Math.round((d - t0) / 864e5); return pad + Math.max(-1, Math.min(DAYS, k)) / DAYS * (W - 2 * pad); };
    const y = (xx) => H / 2 + Math.sin(xx / 70) * 30;
    let path = ''; for (let xx = pad; xx <= W - pad; xx += 6) path += `${xx === pad ? 'M' : 'L'}${xx},${y(xx).toFixed(1)} `;
    const qs = s.quests.filter((q) => q.deadline && q.status !== 'done').sort((a, b) => a.deadline.localeCompare(b.deadline));
    const col = { daily: '#94a3b8', week: '#22c55e', month: '#3b82f6', year: '#a855f7' };
    const used = {};
    const nodes = qs.map((q) => {
      const cx = x(q.deadline); const over = q.deadline < L.todayISO();
      const k = Math.round(cx); used[k] = (used[k] || 0) + 1;
      const cy = y(cx) - (used[k] - 1) * 18;
      return `<g><title>${esc(q.title)} — ${q.deadline}</title><circle cx="${cx}" cy="${cy}" r="8" fill="${over ? '#ef4444' : col[q.horizon] || '#94a3b8'}" stroke="var(--surface)" stroke-width="2"/>
        ${used[k] === 1 ? `<text x="${cx}" y="${y(cx) + 26}" font-size="10" text-anchor="middle" fill="var(--muted)">${esc(q.title.slice(0, 16))}${q.title.length > 16 ? '…' : ''}</text>` : ''}</g>`;
    }).join('');
    const ticks = [0, 7, 14, 21, 30, 45].map((d) => { const xx = pad + d / DAYS * (W - 2 * pad); return `<text x="${xx}" y="${H - 4}" font-size="10" text-anchor="middle" fill="var(--muted)">${d === 0 ? 'Today' : '+' + d + 'd'}</text>`; }).join('');
    $('#map').innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Upcoming quest deadlines">
      <path d="${path}" fill="none" stroke="var(--border)" stroke-width="10" stroke-linecap="round"/>
      <path d="${path}" fill="none" stroke="var(--surface)" stroke-width="2" stroke-dasharray="6 8"/>
      <text x="${pad}" y="${y(pad) - 16}" font-size="18" text-anchor="middle">🧙</text>
      <text x="${W - pad}" y="${y(W - pad) - 14}" font-size="18" text-anchor="middle">🏰</text>
      ${nodes}${ticks}</svg>
      <div class="row small muted">${[['#22c55e', 'week'], ['#3b82f6', 'month'], ['#a855f7', 'year'], ['#ef4444', 'overdue']].map(([c, l]) => `<span><span style="color:${c}">●</span> ${l}</span>`).join('')}</div>`;
  }

  /* ---------- Board ---------- */
  function daysLeft(d) { if (!d) return null; return Math.round((new Date(d + 'T00:00') - new Date(L.todayISO() + 'T00:00')) / 864e5); }
  function qCard(q) {
    const dl = daysLeft(q.deadline);
    const over = q.status !== 'done' && dl != null && dl < 0;
    const when = dl == null ? 'No deadline' : q.status === 'done' ? 'Cleared' : dl < 0 ? `${-dl}d overdue` : dl === 0 ? 'Due today' : `${dl}d left`;
    const wp = q.status === 'done' ? 'good' : over ? 'bad' : dl != null && dl <= 2 ? 'warn' : '';
    const parent = q.parent ? S().quests.find((p) => p.id === q.parent) : null;
    const actions = q.status === 'todo' ? `<button class="btn-sm" data-act="start" data-id="${q.id}">▶ Start</button><button class="btn-sm btn-primary" data-act="done" data-id="${q.id}">✔ Done</button>`
      : q.status === 'doing' ? `<button class="btn-sm btn-primary" data-act="done" data-id="${q.id}">✔ Complete (+${q.xp} XP)</button>`
      : `<button class="btn-sm" data-act="undo" data-id="${q.id}">↺ Undo</button>`;
    return `<div class="qcard r-${q.horizon} ${over ? 'overdue' : ''} ${q.status === 'done' ? 'done' : ''}">
      <div class="row small"><span class="pill">${RARITY[q.horizon] || ''} · ${q.horizon}</span><span class="spacer"></span><span class="pill ${wp}">${when}</span></div>
      <div class="qt" style="margin:6px 0 2px">${esc(q.title)}</div>
      ${parent ? `<div class="small muted">↳ part of: ${esc(parent.title)}</div>` : ''}
      <div class="row small muted" style="margin:4px 0 8px"><span>⭐ ${q.xp} XP</span>${q.deadline ? `<span>· ${esc(q.deadline)}</span>` : ''}</div>
      <div class="row">${actions}<span class="spacer"></span>
        ${over ? `<button class="btn-sm" data-act="snooze" data-id="${q.id}">+3 days</button>` : ''}
        ${q.status !== 'done' && q.horizon !== 'daily' ? `<button class="btn-sm btn-ghost" data-act="split" data-id="${q.id}" title="Break into smaller quests">✂ Split</button>` : ''}
        <button class="btn-sm btn-ghost" data-act="edit" data-id="${q.id}">Edit</button></div>
    </div>`;
  }
  function renderBoard() {
    const f = $('#filter').value;
    const qs = S().quests.filter((q) => !f || q.horizon === f);
    const byDl = (a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999');
    const cols = [['todo', '📜 Available'], ['doing', '⚔ In progress'], ['done', '🏆 Completed']];
    $('#board').innerHTML = cols.map(([st, lab]) => {
      const list = qs.filter((q) => q.status === st).sort(st === 'done' ? (a, b) => (b.doneAt || '').localeCompare(a.doneAt || '') : byDl);
      return `<div><div class="col-h"><span>${lab}</span><span class="pill">${list.length}</span></div>${list.slice(0, st === 'done' ? 8 : 99).map(qCard).join('') || '<p class="empty">—</p>'}</div>`;
    }).join('');
  }

  /* ---------- Achievements ---------- */
  function badges() {
    const s = S(); const done = s.quests.filter((q) => q.status === 'done');
    const lvl = L.levelFor(s.player.xp); const st = streak();
    const slain = (h) => { const q = s.quests.filter((x) => x.horizon === h); return q.length && q.every((x) => x.status === 'done'); };
    return [
      ['🌱', 'First step', done.length >= 1], ['🗡', '5 quests', done.length >= 5], ['🛡', '25 quests', done.length >= 25],
      ['🔥', '3-day streak', st >= 3], ['☄', '7-day streak', st >= 7], ['🧭', 'Goal set', !!s.goals.year],
      ['👾', 'Week boss', slain('week')], ['👹', 'Month boss', slain('month')], ['⭐', 'Level 5', lvl >= 5], ['🐉', 'Year boss', slain('year')],
    ];
  }
  function renderBadges() {
    $('#badges').innerHTML = badges().map(([i, n, on]) => `<div class="badge ${on ? 'on' : ''}"><div class="b">${i}</div>${n}</div>`).join('');
  }

  /* ---------- Actions ---------- */
  function burst() {
    const icons = ['✨', '⭐', '🎉', '💎', '🪙'];
    for (let i = 0; i < 14; i++) {
      const el = document.createElement('span'); el.className = 'burst'; el.textContent = icons[i % icons.length];
      el.style.left = innerWidth / 2 + 'px'; el.style.top = innerHeight / 2 + 'px';
      el.style.setProperty('--dx', (Math.random() * 400 - 200) + 'px'); el.style.setProperty('--dy', (Math.random() * -300 - 40) + 'px');
      document.body.appendChild(el); setTimeout(() => el.remove(), 1000);
    }
  }
  function complete(id, quiet) {
    const s = S(); const q = s.quests.find((x) => x.id === id); if (!q || q.status === 'done') return;
    const before = L.levelFor(s.player.xp);
    q.status = 'done'; q.doneAt = new Date().toISOString();
    s.player.xp += +q.xp || 0;
    const today = L.todayISO();
    if (!s.player.completedDays.includes(today)) s.player.completedDays.push(today);
    L.save();
    if (quiet) return;
    burst();
    const after = L.levelFor(s.player.xp);
    toast(after > before ? `⬆ LEVEL UP! You are now Lv ${after} — ${L.titleFor(after)}` : `+${q.xp} XP · Quest cleared!`);
  }
  async function editQuest(id, preset = {}) {
    const s = S();
    const q = s.quests.find((x) => x.id === id) || { title: '', horizon: 'week', status: 'todo', deadline: L.addDays(7), xp: '', parent: '', ...preset };
    const parents = [['', '— none —'], ...s.quests.filter((x) => x.id !== id && ['month', 'year'].includes(x.horizon)).map((x) => [x.id, x.title])];
    const v = await formModal(id ? 'Edit quest' : 'New quest', [
      { name: 'title', label: 'Quest', value: q.title, placeholder: 'Make it small and concrete' },
      { name: 'horizon', label: 'Horizon', type: 'select', options: [['daily', 'Daily (Common)'], ['week', 'Week (Uncommon)'], ['month', 'Month (Rare)'], ['year', 'Year (Epic)']], value: q.horizon },
      { name: 'deadline', label: 'Deadline', type: 'date', value: q.deadline },
      { name: 'xp', label: 'XP reward (blank = default for horizon)', type: 'number', value: q.xp },
      { name: 'parent', label: 'Part of (bigger quest)', type: 'select', options: parents, value: q.parent },
      { name: 'status', label: 'Status', type: 'select', options: [['todo', 'Available'], ['doing', 'In progress'], ['done', 'Completed']], value: q.status },
      ...(id ? [{ name: 'del', label: 'Delete this quest', type: 'checkbox', value: false }] : []),
    ]);
    if (!v) return;
    if (v.del) { s.quests = s.quests.filter((x) => x.id !== id); L.save(); return renderAll(); }
    delete v.del;
    if (!v.title) return;
    if (v.xp === '' || v.xp == null) v.xp = XP_DEFAULT[v.horizon];
    const becameDone = v.status === 'done' && q.status !== 'done';
    if (becameDone) v.status = q.status;
    if (id) Object.assign(q, v); else { q.id = L.uid(); Object.assign(q, v); s.quests.push(q); }
    L.save();
    if (becameDone) complete(q.id);
    renderAll();
  }
  async function split(id) {
    const q = S().quests.find((x) => x.id === id);
    const v = await formModal('Split into smaller quests', [
      { name: 'a', label: 'Step 1 (the first 30-minute action)', placeholder: 'e.g. List 10 product ideas' },
      { name: 'b', label: 'Step 2' }, { name: 'c', label: 'Step 3' },
    ], 'Create quests');
    if (!v) return;
    const child = q.horizon === 'year' ? 'month' : q.horizon === 'month' ? 'week' : 'daily';
    const steps = [v.a, v.b, v.c].filter(Boolean);
    const end = q.deadline ? new Date(q.deadline + 'T00:00') : new Date(Date.now() + 7 * 864e5);
    const span = Math.max(1, Math.round((end - new Date()) / 864e5));
    steps.forEach((t, i) => {
      const d = new Date(); d.setDate(d.getDate() + Math.max(1, Math.round(span * (i + 1) / steps.length)));
      S().quests.push({ id: L.uid(), title: t, horizon: child, status: 'todo', deadline: L.iso(d), xp: XP_DEFAULT[child], parent: q.horizon === 'week' ? '' : q.id });
    });
    L.save(); renderAll(); toast(`${steps.length} smaller quest${steps.length === 1 ? '' : 's'} added`);
  }

  function renderAll() { renderPlayer(); renderQ(); renderBosses(); renderMap(); renderBoard(); renderBadges(); }

  document.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const { act, id, boss } = b.dataset;
    if (boss) {
      const v = await formModal(`${boss[0].toUpperCase() + boss.slice(1)} goal`, [{ name: 'g', label: 'Goal', type: 'textarea', value: S().goals[boss] }]);
      if (v) { S().goals[boss] = v.g; S().goals.answers[boss] = v.g; L.save(); renderAll(); }
      return;
    }
    if (!act) return;
    const q = S().quests.find((x) => x.id === id);
    if (act === 'start') { q.status = 'doing'; L.save(); renderAll(); toast('Quest accepted ⚔'); }
    else if (act === 'done') { complete(id); renderAll(); }
    else if (act === 'undo') { q.status = 'todo'; S().player.xp = Math.max(0, S().player.xp - (+q.xp || 0)); L.save(); renderAll(); }
    else if (act === 'snooze') { const d = new Date(); d.setDate(d.getDate() + 3); q.deadline = L.iso(d); L.save(); renderAll(); toast('Rescheduled — no penalty'); }
    else if (act === 'split') split(id);
    else if (act === 'edit') editQuest(id);
  });
  $('#addQuest').onclick = () => editQuest(null);
  $('#filter').onchange = renderBoard;
  $('#toggleQ').onclick = () => { showQ = !showQ; step = 0; renderQ(); };
  renderAll();
})();
