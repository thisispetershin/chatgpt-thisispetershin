(function () {
  const L = window.LifeOS;
  const { esc, $, formModal, toast } = L;
  L.mountChrome('index.html');
  const S = () => L.state;

  const STAGES = [
    { key: 'impressions', ko: '노출', en: 'Impressions', bench: null },
    { key: 'awareness', ko: '인지', en: 'Awareness', bench: 15 },
    { key: 'consideration', ko: '고려', en: 'Consideration', bench: 20 },
    { key: 'visits', ko: '방문', en: 'Visits', bench: 40 },
    { key: 'purchases', ko: '구매결정', en: 'Purchase', bench: 2 },
  ];

  // What to do when a given stage under-converts. Keyed by the stage being entered.
  const STAGE_FIX = {
    awareness: {
      why: 'People see it but do not register it — the hook, thumbnail or first line is not stopping the scroll.',
      actions: [
        'A/B test 3 hooks/thumbnails per post; keep the winner by hold rate or CTR.',
        'Lead with the outcome ("Saved 4 hours/week") instead of the brand or tool name.',
        'Post at the times your analytics show the highest active audience.',
        'Track: reach → 3-sec views / ad recall; brand-search volume.',
      ],
    },
    consideration: {
      why: 'They notice you but do not see why it matters to them — the problem/solution fit is unclear.',
      actions: [
        'Add proof: before/after demos, case numbers, user quotes.',
        'Create comparison content ("X vs doing it by hand") and FAQ posts addressing objections.',
        'Retarget engaged viewers with a deeper explainer or free sample.',
        'Track: saves, shares, profile visits, email sign-ups, time on page.',
      ],
    },
    visits: {
      why: 'Interest does not turn into clicks — the call-to-action or link path is weak.',
      actions: [
        'One clear CTA per piece of content; pin it and repeat it verbally.',
        'Shorten the path: link-in-bio → product page directly, no extra hops.',
        'Offer a lead magnet (free mini-template, checklist) to earn the click.',
        'Track: CTR, link clicks, landing-page sessions by source (UTM tags).',
      ],
    },
    purchases: {
      why: 'Visitors arrive but do not buy — offer, price, trust or checkout friction.',
      actions: [
        'Rewrite the landing page above the fold: who it is for, outcome, price, CTA.',
        'Add social proof near the buy button (reviews, number of buyers).',
        'Test price anchoring / bundle (basic vs. pro), and a time-boxed launch discount.',
        'Remove checkout steps; add abandoned-cart or follow-up emails.',
        'Track: conversion rate, average order value, refund rate.',
      ],
    },
  };

  /* ---------- KPIs ---------- */
  function renderKpis() {
    const s = S();
    const now = new Date();
    const today = L.occurrencesOn(now);
    const running = s.automations.filter((a) => a.status === 'running').length;
    const avg = s.automations.length ? Math.round(s.automations.reduce((t, a) => t + (+a.progress || 0), 0) / s.automations.length) : 0;
    const open = s.quests.filter((q) => q.status !== 'done');
    const overdue = open.filter((q) => q.deadline && q.deadline < L.todayISO()).length;
    const lvl = L.levelFor(s.player.xp);
    $('#kpis').innerHTML = [
      ['Today', today.length, 'scheduled blocks'],
      ['Automations', `${running}/${s.automations.length}`, 'running'],
      ['Avg progress', avg + '%', 'across automations'],
      ['Quest level', 'Lv ' + lvl, `${open.length} open · ${overdue} overdue`],
    ].map(([l, v, sub]) => `<div class="card stat"><div class="label">${l}</div><div class="value">${v}</div><div class="sub">${sub}</div></div>`).join('');
    const h = now.getHours();
    $('#greet').textContent = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    $('#today').textContent = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  /* ---------- Today + notices ---------- */
  function renderToday() {
    const now = new Date();
    const hhmm = now.toTimeString().slice(0, 5);
    const items = L.occurrencesOn(now);
    $('#todayList').innerHTML = items.length ? items.map((o) => {
      const state = o.end && o.end <= hhmm ? 'done' : o.start <= hhmm && (!o.end || o.end > hhmm) ? 'now' : 'later';
      const pill = state === 'now' ? '<span class="pill good">Now</span>' : state === 'done' ? '<span class="pill">Done</span>' : '';
      return `<li class="row"><span class="num muted" style="min-width:96px">${esc(o.start)}${o.end ? '–' + esc(o.end) : ''}</span><span class="spacer" style="min-width:0">${esc(o.title)}</span>${pill}</li>`;
    }).join('') : '<li class="empty">Nothing scheduled today.</li>';

    const notices = [];
    const s = S();
    const t = L.todayISO();
    const in3 = L.addDays(3);
    s.events.filter((e) => e.date >= t && e.date <= L.addDays(7)).forEach((e) => notices.push({ lvl: 'accent', txt: `📅 ${e.title}`, when: e.date + (e.time ? ' ' + e.time : '') }));
    s.quests.filter((q) => q.status !== 'done' && q.deadline && q.deadline < t).forEach((q) => notices.push({ lvl: 'bad', txt: `⚠ Overdue quest: ${q.title}`, when: q.deadline }));
    s.quests.filter((q) => q.status !== 'done' && q.deadline && q.deadline >= t && q.deadline <= in3).forEach((q) => notices.push({ lvl: 'warn', txt: `⏳ Quest due soon: ${q.title}`, when: q.deadline }));
    s.automations.filter((a) => a.nextRun && a.nextRun <= t && a.status === 'running').forEach((a) => notices.push({ lvl: 'accent', txt: `⚙ Automation run due: ${a.name}`, when: a.nextRun }));
    s.automations.filter((a) => a.status === 'paused').forEach((a) => notices.push({ lvl: 'warn', txt: `⏸ Paused: ${a.name}`, when: 'decide: resume or retire' }));
    s.experiments.filter((x) => !x.decision).forEach((x) => notices.push({ lvl: 'warn', txt: `🧪 Decide on: ${x.change}`, when: 'keep / iterate / revert' }));
    $('#noticeCount').textContent = notices.length;
    $('#notices').innerHTML = notices.length ? notices.slice(0, 8).map((n) =>
      `<li><div>${esc(n.txt)}</div><div class="small"><span class="pill ${n.lvl}">${esc(n.when)}</span></div></li>`).join('') : '<li class="empty">All clear.</li>';
  }

  /* ---------- Automations ---------- */
  const statusPill = (st) => ({ running: 'good', paused: 'warn', failed: 'bad', planned: '' }[st] ?? '');
  function renderAutos() {
    const s = S();
    $('#autos').innerHTML = s.automations.map((a, i) => `
      <div class="card lift">
        <div class="card-head"><h3 style="margin:0">${esc(a.name)}</h3><span class="pill ${statusPill(a.status)}">${esc(a.status)}</span></div>
        <div class="row small muted" style="margin-bottom:6px"><span>${esc(a.type)}</span><span>·</span><span>${esc(a.owner || '')}</span></div>
        <div class="row small"><span>Progress</span><span class="spacer"></span><b class="num">${+a.progress || 0}%</b></div>
        <div class="bar ${a.progress >= 80 ? 'good' : ''}"><span style="width:${+a.progress || 0}%"></span></div>
        <dl class="kv" style="margin:12px 0 8px"><dt>Last run</dt><dd>${esc(a.lastRun || '—')}</dd><dt>Next run</dt><dd>${esc(a.nextRun || '—')}</dd></dl>
        <p class="small muted">${esc(a.tasks || '')}</p>
        <div class="row"><button class="btn-sm" data-edit="${i}">Edit</button><button class="btn-sm" data-eval="${i}">Evaluate</button><span class="spacer"></span><button class="btn-sm btn-ghost" data-del="${i}">Delete</button></div>
      </div>`).join('') || '<p class="empty">No automations yet.</p>';
  }

  async function editAuto(i) {
    const a = i == null ? { name: '', type: 'business', status: 'planned', progress: 0, lastRun: '', nextRun: '', owner: '', tasks: '', funnel: {}, price: 0, cost: 0, p4: { product: 3, price: 3, place: 3, promotion: 3 } } : S().automations[i];
    const v = await formModal(i == null ? 'New automation' : 'Edit automation', [
      { name: 'name', label: 'Name', value: a.name },
      { name: 'type', label: 'Type', type: 'select', options: [['business', 'Business / product'], ['content', 'Content channel'], ['ops', 'Operations / internal'], ['research', 'Research']], value: a.type },
      { name: 'status', label: 'Status', type: 'select', options: ['planned', 'running', 'paused', 'failed', 'done'], value: a.status },
      { name: 'progress', label: 'Progress %', type: 'number', value: a.progress },
      { name: 'lastRun', label: 'Last run', type: 'date', value: a.lastRun },
      { name: 'nextRun', label: 'Next run', type: 'date', value: a.nextRun },
      { name: 'owner', label: 'Runs on / owner', value: a.owner, placeholder: 'e.g. Claude scheduled task, Zapier, n8n' },
      { name: 'tasks', label: 'Pipeline steps', type: 'textarea', value: a.tasks },
      { name: 'price', label: 'Price per sale (0 if free)', type: 'number', value: a.price, step: 'any' },
      { name: 'cost', label: 'Cost per sale', type: 'number', value: a.cost, step: 'any' },
    ]);
    if (!v || !v.name) return;
    v.progress = Math.max(0, Math.min(100, +v.progress || 0));
    if (i == null) S().automations.push({ id: L.uid(), funnel: {}, p4: a.p4, ...v });
    else Object.assign(S().automations[i], v);
    L.save(); renderAll();
  }

  /* ---------- Evaluation ---------- */
  let evalIdx = 0;
  const pct = (a, b) => (b ? (a / b) * 100 : 0);
  const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : String(n ?? 0));

  function funnelStats(a) {
    const f = a.funnel || {};
    let worst = null;
    const rows = STAGES.map((st, i) => {
      const v = +f[st.key] || 0;
      const prev = i ? +f[STAGES[i - 1].key] || 0 : null;
      const conv = i ? pct(v, prev) : null;
      const gap = st.bench && prev ? conv / st.bench : null; // <1 means under benchmark
      if (gap != null && (worst == null || gap < worst.gap)) worst = { ...st, gap, conv };
      return { ...st, v, conv, gap };
    });
    return { rows, worst, top: rows[0].v || 1 };
  }

  function renderEval() {
    const s = S();
    const pick = $('#evalPick');
    pick.innerHTML = s.automations.map((a, i) => `<option value="${i}" ${i === evalIdx ? 'selected' : ''}>${esc(a.name)}</option>`).join('');
    const a = s.automations[evalIdx];
    if (!a) { ['#funnel', '#diagnosis', '#fourP', '#econ', '#playbook'].forEach((x) => ($(x).innerHTML = '<p class="empty">Add an automation first.</p>')); return; }
    const { rows, worst, top } = funnelStats(a);

    $('#funnel').innerHTML = rows.map((r) => `
      <div class="funnel-row ${worst && r.key === worst.key && worst.gap < 1 ? 'leak' : ''}">
        <span><b>${r.ko}</b> <span class="muted small">${r.en}</span></span>
        <div class="fbar"><span style="width:${Math.max(2, Math.sqrt(r.v / top) * 100)}%"></span></div>
        <span class="conv"><b>${fmt(r.v)}</b>${r.conv != null ? ` · ${r.conv.toFixed(1)}%` : ''}</span>
      </div>`).join('');

    const f = a.funnel || {};
    const ctr = pct(+f.visits || 0, +f.impressions || 0);
    const cvr = pct(+f.purchases || 0, +f.visits || 0);
    let diag = `<div class="grid g2" style="margin-bottom:12px">
      <div class="stat"><div class="label">CTR (방문 ÷ 노출)</div><div class="value">${ctr.toFixed(2)}%</div><div class="sub">${ctr >= 1.5 ? '<span class="pill good">healthy</span>' : '<span class="pill warn">below ~1.5% rule of thumb</span>'}</div></div>
      <div class="stat"><div class="label">Conversion (구매 ÷ 방문)</div><div class="value">${cvr.toFixed(2)}%</div><div class="sub">${cvr >= 2 ? '<span class="pill good">healthy</span>' : '<span class="pill warn">below ~2% rule of thumb</span>'}</div></div></div>`;
    if (worst && worst.gap < 1 && STAGE_FIX[worst.key]) {
      const fx = STAGE_FIX[worst.key];
      diag += `<div class="callout warn"><b>Biggest leak: → ${worst.ko} (${worst.en})</b> — ${worst.conv.toFixed(1)}% vs ~${worst.bench}% benchmark.<br>${fx.why}</div>
        <ol class="small" style="padding-left:18px;margin:10px 0 0">${fx.actions.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`;
    } else if (worst) {
      diag += `<div class="callout">Every stage is at or above benchmark. Scale what works: increase 노출 (more posts, paid boost on top performers) and raise price/AOV.</div>`;
    } else {
      diag += '<p class="empty">Enter funnel numbers to get a diagnosis.</p>';
    }
    $('#diagnosis').innerHTML = diag;

    const P4 = {
      product: ['Product', 'Interview 5 buyers/viewers; ship the most-requested variant; bundle related items.'],
      price: ['Price', 'Add a premium tier and a starter tier; anchor with the premium; test one price change at a time.'],
      place: ['Place', 'Add one new channel (marketplace, newsletter, community) where your audience already buys.'],
      promotion: ['Promotion', 'Turn every product into 3 content pieces; collaborate with one creator per month.'],
    };
    const p4 = a.p4 || {};
    const weakest = Object.keys(P4).sort((x, y) => (p4[x] || 0) - (p4[y] || 0))[0];
    $('#fourP').innerHTML = Object.entries(P4).map(([k, [lab, tip]]) => `
      <div style="margin-bottom:10px"><div class="row small"><b>${lab}</b><span class="spacer"></span><span class="num">${p4[k] || 0}/5</span></div>
      <div class="bar ${(p4[k] || 0) >= 4 ? 'good' : (p4[k] || 0) <= 2 ? 'warn' : ''}"><span style="width:${(p4[k] || 0) * 20}%"></span></div>
      ${k === weakest ? `<p class="small" style="margin-top:4px">👉 ${esc(tip)}</p>` : ''}</div>`).join('');

    const rev = (+f.purchases || 0) * (+a.price || 0);
    const profit = (+f.purchases || 0) * ((+a.price || 0) - (+a.cost || 0));
    const rpm = f.impressions ? (rev / f.impressions) * 1000 : 0;
    $('#econ').innerHTML = (+a.price || 0) ? `<div class="grid g3">
      <div class="stat"><div class="label">Revenue</div><div class="value">$${rev.toLocaleString()}</div></div>
      <div class="stat"><div class="label">Profit</div><div class="value">$${profit.toLocaleString()}</div></div>
      <div class="stat"><div class="label">Rev / 1k 노출</div><div class="value">$${rpm.toFixed(2)}</div></div></div>
      <p class="small muted" style="margin-top:8px">+1 percentage point of conversion here ≈ <b>$${Math.round((+f.visits || 0) * 0.01 * (+a.price - +a.cost)).toLocaleString()}</b> more profit at current traffic.</p>`
      : `<p class="small">This is a free/content automation — measure it by what it feeds: <b>${fmt(+f.purchases || 0)}</b> conversions (sign-ups, follows, or sales attributed). Set a price on a linked product to see revenue per 1k views.</p>`;

    renderPlaybook(a, worst);
  }

  async function editFunnel() {
    const a = S().automations[evalIdx]; if (!a) return;
    const v = await formModal('Funnel numbers (this period)', STAGES.map((st) => ({ name: st.key, label: `${st.ko} · ${st.en}`, type: 'number', value: (a.funnel || {})[st.key] ?? '' })));
    if (!v) return; a.funnel = v; L.save(); renderAll();
  }
  async function edit4p() {
    const a = S().automations[evalIdx]; if (!a) return;
    const opts = [1, 2, 3, 4, 5];
    const v = await formModal('Rate the 4Ps (1 weak → 5 strong)', ['product', 'price', 'place', 'promotion'].map((k) => ({ name: k, label: k[0].toUpperCase() + k.slice(1), type: 'select', options: opts, value: (a.p4 || {})[k] || 3 })));
    if (!v) return; Object.keys(v).forEach((k) => (v[k] = +v[k])); a.p4 = v; L.save(); renderEval();
  }

  /* ---------- Playbook ---------- */
  const TABS = [['offer', 'More products & services'], ['research', 'Research & user journey'], ['measure', 'Marketing measurement'], ['content', 'Content automation'], ['media', 'Content as a business']];
  let tab = 'offer';
  function renderPlaybook(a, worst) {
    $('#pbTabs').innerHTML = TABS.map(([k, l]) => `<button data-tab="${k}" class="${k === tab ? 'active' : ''}">${l}</button>`).join('');
    const isContent = a.type === 'content';
    const leak = worst && worst.gap < 1 ? `${worst.ko} (${worst.en})` : null;
    const B = {
      offer: `<h3>Expand the offer ladder</h3>
        <ol>
          <li><b>Free → low → core → premium.</b> Free lead magnet, a $5–15 entry product, your core product, and a premium/done-for-you service.</li>
          <li><b>Mine demand signals weekly:</b> top-commented questions, search queries in your niche, competitor 1–3★ reviews (unmet needs). Each recurring question = a product candidate.</li>
          <li><b>Variant multiplication:</b> one proven product → versions per audience (students / freelancers / teams), per language (EN/KO), and per format (template, course, checklist, GPT/agent).</li>
          <li><b>Productise services:</b> anything you do manually twice → a fixed-scope, fixed-price package; then automate parts of delivery.</li>
          <li><b>Kill rule:</b> any product under 0.5% conversion after ~1,000 visits gets reworked or retired.</li>
        </ol>`,
      research: `<h3>Improve the product from research + the user journey</h3>
        <ol>
          <li><b>Map the journey</b> (노출 → 인지 → 고려 → 방문 → 구매결정 → use → repeat/refer) and write the user's question at each step.</li>
          <li><b>Collect evidence every cycle:</b> 3 short user interviews or survey replies, session recordings / heatmaps on the landing page, refund & support reasons.</li>
          <li><b>Jobs-to-be-done:</b> rewrite the product promise as "When I ___, I want to ___, so I can ___". Test it as the headline.</li>
          <li><b>Close the loop:</b> each insight → one change → logged in the improvement log below with a metric.</li>
          ${leak ? `<li><b>Current priority:</b> research why people drop at <b>${leak}</b> — ask 3 people who stopped there.</li>` : ''}
        </ol>`,
      measure: `<h3>How to measure marketing & operations</h3>
        <div class="table-wrap"><table><thead><tr><th>Stage</th><th>Metric</th><th>Where to get it</th></tr></thead><tbody>
          <tr><td>노출 Impressions</td><td>Reach, impressions, share of voice</td><td>Platform analytics, Search Console</td></tr>
          <tr><td>인지 Awareness</td><td>3-sec views, hold rate, brand searches</td><td>YouTube/IG/TikTok analytics, Google Trends</td></tr>
          <tr><td>고려 Consideration</td><td>Saves, shares, profile visits, email sign-ups</td><td>Platform analytics, email tool</td></tr>
          <tr><td>방문 Visit</td><td>CTR, sessions by source (UTM)</td><td>GA4 / Plausible with UTM links</td></tr>
          <tr><td>구매결정 Purchase</td><td>Conversion rate, AOV, CAC, refund rate</td><td>Store / Stripe / Gumroad dashboard</td></tr>
          <tr><td>Ops</td><td>Run success rate, time saved, cost per run</td><td>Automation logs (this dashboard)</td></tr>
        </tbody></table></div>
        <p class="small muted" style="margin-top:8px">Weekly ritual: update the funnel numbers above every Sunday during the retro block, then log one change to test next week.</p>`,
      content: `<h3>Automated content engine</h3>
        <ol>
          <li><b>Pick a channel per goal:</b> Shorts/Reels/TikTok for 노출; YouTube long-form or blog for 고려 (SEO); newsletter for 방문 → 구매.</li>
          <li><b>Pipeline (automate each step):</b> trend feed (News page) → AI picks 3 topics → script draft → you approve → voice/visual generation → scheduled publish → metrics pulled back here.</li>
          <li><b>Content pillars (3:1 rule):</b> 3 value posts (how-to, workflow demo, "1-day 1-term" explainer) for every 1 offer post.</li>
          <li><b>Repurpose:</b> 1 long video → 5 shorts → 1 newsletter → 1 thread → 1 blog post.</li>
          <li><b>Feedback loop:</b> every week keep the top 20% formats by hold rate & CTR, drop the bottom 20%, and add one new format experiment.</li>
          ${isContent ? '<li><b>This automation is a content channel</b> — its main job is to push people into the product funnel; track link clicks per post.</li>' : '<li><b>For this business:</b> build a companion channel that demonstrates the product solving a real task on camera.</li>'}
        </ol>`,
      media: `<h3>When the content itself is the business</h3>
        <ol>
          <li><b>Revenue stack:</b> platform ad revenue → sponsorships → affiliate links (AI tools, exchanges/wallets — disclose clearly) → paid community / premium newsletter → own products.</li>
          <li><b>Metric that matters:</b> revenue per 1k views (RPM) and returning-viewer %; aim to raise RPM, not just views.</li>
          <li><b>Moat:</b> a recurring format people return for (e.g. "AI workflow of the week", "1-day 1-term Web3") + an email list you own.</li>
          <li><b>Sponsor-ready:</b> keep a one-page media kit (audience, views, CTR) — this dashboard's funnel numbers are its source.</li>
        </ol>`,
    };
    $('#playbook').innerHTML = `<p class="small muted">For: <b>${esc(a.name)}</b></p>${B[tab]}`;
  }

  /* ---------- Experiments ---------- */
  function verdict(x) {
    const b = +x.before, af = +x.after;
    if (!isFinite(b) || !isFinite(af) || b === 0) return { lift: null, label: 'Add numbers', cls: '', advice: 'Enter before/after values to get a verdict.' };
    const lift = ((af - b) / Math.abs(b)) * 100;
    if (lift >= 10) return { lift, label: 'Keep & scale', cls: 'good', advice: 'Clear win. Make it the default, then stack the next test on top of it.' };
    if (lift >= 5) return { lift, label: 'Keep, re-test', cls: 'good', advice: 'Likely positive but small — keep it and re-run on a fresh sample to confirm.' };
    if (lift > -5) return { lift, label: 'Inconclusive → iterate', cls: 'warn', advice: 'Too small to matter. Try a bolder variant of the same idea, or test a different lever.' };
    return { lift, label: 'Revert', cls: 'bad', advice: 'It hurt the metric. Roll back and note why it might have failed.' };
  }
  function nextIdeas(metric) {
    const m = (metric || '').toLowerCase();
    if (/ctr|click|thumbnail|title/.test(m)) return ['Test curiosity vs. outcome titles', 'Face vs. no-face thumbnails', 'Number in title ("3 workflows")'];
    if (/hold|retention|watch|view/.test(m)) return ['Pattern interrupt every 3–5s', 'Show the end result in the first second', 'Cut intro entirely; start mid-action'];
    if (/conv|purchase|sale|구매/.test(m)) return ['Add reviews next to the buy button', 'Bundle / tiered pricing', 'Money-back guarantee line'];
    if (/sign|email|lead/.test(m)) return ['Swap the lead magnet', 'Inline sign-up form vs. link', 'One-field form'];
    return ['Change only one variable next time', 'Increase the sample before deciding', 'Try a lever from a different funnel stage'];
  }
  function renderExps() {
    const s = S();
    const list = [...s.experiments].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    $('#exps').innerHTML = list.map((x) => {
      const v = verdict(x);
      const idx = s.experiments.indexOf(x);
      const dec = x.decision ? `<span class="pill accent">Your decision: ${esc(x.decision)}</span>` : '<span class="pill warn">Decision pending</span>';
      return `<div class="card">
        <div class="card-head"><div><h3 style="margin:0">${esc(x.change)}</h3><div class="small muted">${esc(x.automation)} · ${esc(x.date)}</div></div><span class="pill ${v.cls}">${v.label}</span></div>
        <div class="grid g3">
          <div class="stat"><div class="label">${esc(x.metric)} before</div><div class="value">${esc(x.before)}${esc(x.unit)}</div></div>
          <div class="stat"><div class="label">after</div><div class="value">${esc(x.after)}${esc(x.unit)}</div></div>
          <div class="stat"><div class="label">change</div><div class="value" style="color:var(--${v.lift == null ? 'muted' : v.lift >= 5 ? 'good' : v.lift <= -5 ? 'bad' : 'warn'})">${v.lift == null ? '—' : (v.lift > 0 ? '+' : '') + v.lift.toFixed(1) + '%'}</div><div class="sub">${esc(x.sample || '')}</div></div>
        </div>
        <p class="small" style="margin-top:10px"><b>Recommendation:</b> ${v.advice}</p>
        <p class="small"><b>Other methods to try next:</b> ${nextIdeas(x.metric).map(esc).join(' · ')}</p>
        ${x.next ? `<p class="small"><b>Your next step:</b> ${esc(x.next)}</p>` : ''}
        <div class="row">${dec}<span class="spacer"></span>
          <button class="btn-sm" data-dec="${idx}" data-v="keep">Keep</button><button class="btn-sm" data-dec="${idx}" data-v="iterate">Iterate</button><button class="btn-sm" data-dec="${idx}" data-v="revert">Revert</button>
          <button class="btn-sm" data-xedit="${idx}">Edit</button><button class="btn-sm btn-ghost" data-xdel="${idx}">Delete</button></div>
      </div>`;
    }).join('') || '<p class="empty">No changes logged yet. After each session, log what you changed and the metric before/after.</p>';
  }
  async function editExp(i) {
    const x = i == null ? { automation: S().automations[evalIdx]?.name || '', date: L.todayISO(), change: '', metric: '', before: '', after: '', unit: '%', sample: '', next: '' } : S().experiments[i];
    const v = await formModal(i == null ? 'Log a change' : 'Edit change', [
      { name: 'automation', label: 'Automation', type: 'select', options: S().automations.map((a) => a.name), value: x.automation },
      { name: 'date', label: 'Session date', type: 'date', value: x.date },
      { name: 'change', label: 'What changed (the improvement)', value: x.change },
      { name: 'metric', label: 'Metric it should move', value: x.metric, placeholder: 'CTR, hold rate, conversion…' },
      { name: 'before', label: 'Before', type: 'number', step: 'any', value: x.before },
      { name: 'after', label: 'After', type: 'number', step: 'any', value: x.after },
      { name: 'unit', label: 'Unit', value: x.unit },
      { name: 'sample', label: 'Sample size / period', value: x.sample },
      { name: 'next', label: 'Your planned next step', type: 'textarea', value: x.next },
    ]);
    if (!v || !v.change) return;
    if (i == null) S().experiments.push({ id: L.uid(), decision: '', ...v }); else Object.assign(S().experiments[i], v);
    L.save(); renderAll();
  }

  /* ---------- Wiring ---------- */
  function renderAll() { renderKpis(); renderToday(); renderAutos(); renderEval(); renderExps(); }

  document.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    const d = t.dataset;
    if (d.edit) editAuto(+d.edit);
    else if (d.eval) { evalIdx = +d.eval; renderEval(); $('#evalPick').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    else if (d.del) { if (confirm('Delete this automation?')) { S().automations.splice(+d.del, 1); evalIdx = 0; L.save(); renderAll(); } }
    else if (d.tab) { tab = d.tab; renderEval(); }
    else if (d.dec) { S().experiments[+d.dec].decision = d.v; L.save(); renderAll(); toast('Decision saved: ' + d.v); }
    else if (d.xedit) editExp(+d.xedit);
    else if (d.xdel) { if (confirm('Delete this entry?')) { S().experiments.splice(+d.xdel, 1); L.save(); renderAll(); } }
  });
  $('#addAuto').onclick = () => editAuto(null);
  $('#addExp').onclick = () => editExp(null);
  $('#editFunnel').onclick = editFunnel;
  $('#edit4p').onclick = edit4p;
  $('#evalPick').onchange = (e) => { evalIdx = +e.target.value; renderEval(); };
  $('#exportBtn').onclick = L.exportData;
  $('#importInput').onchange = (e) => e.target.files[0] && L.importData(e.target.files[0], renderAll);
  $('#resetBtn').onclick = () => { if (confirm('Replace all your data with the example data?')) { L.resetData(); evalIdx = 0; renderAll(); } };
  $('#notifyBtn').onclick = async () => {
    if (!('Notification' in window)) return toast('This browser does not support notifications');
    const p = await Notification.requestPermission();
    toast(p === 'granted' ? 'Reminders on — 10 min before flagged items' : 'Notifications blocked');
    if (p === 'granted') location.reload();
  };
  renderAll();
  setInterval(renderToday, 60000);
})();
