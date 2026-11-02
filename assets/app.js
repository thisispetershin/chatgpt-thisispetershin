/* LifeOS shared store + UI helpers.
 * All data lives in this browser's localStorage under one key.
 * Use Export / Import on the dashboard to back up or move it between devices. */
(function () {
  const KEY = 'lifeos.v1';
  // Local-time YYYY-MM-DD (toISOString would shift the date in non-UTC timezones such as KST).
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayISO = () => iso(new Date());
  const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
  const uid = () => Math.random().toString(36).slice(2, 10);

  // Starter data. Everything here is an editable EXAMPLE — replace it with your own.
  function seed() {
    return {
      version: 1,
      createdAt: todayISO(),
      schedule: [
        { id: uid(), title: 'Deep work: build automation', days: [1, 2, 3, 4, 5], start: '09:00', end: '11:00', category: 'work', notify: true },
        { id: uid(), title: 'Review dashboard + metrics', days: [1, 3, 5], start: '11:30', end: '12:00', category: 'review', notify: true },
        { id: uid(), title: 'Content batch (script + record)', days: [2, 4], start: '14:00', end: '16:00', category: 'content', notify: true },
        { id: uid(), title: 'Exercise', days: [1, 3, 5, 6], start: '19:00', end: '20:00', category: 'health', notify: false },
        { id: uid(), title: 'Read AI / Web3 news + daily term', days: [0, 1, 2, 3, 4, 5, 6], start: '08:00', end: '08:20', category: 'learning', notify: true },
        { id: uid(), title: 'Weekly retro + plan next week', days: [0], start: '20:00', end: '21:00', category: 'review', notify: true },
      ],
      events: [
        { id: uid(), title: 'Example: launch v2 of product page', date: addDays(5), time: '10:00', notify: true },
      ],
      automations: [
        {
          id: uid(), name: 'Example: Digital template store', type: 'business', status: 'running', progress: 62,
          lastRun: addDays(-1), nextRun: addDays(1), owner: 'Claude / scheduled agent',
          tasks: 'Research trending niches → generate template drafts → QA → list on store → collect reviews',
          funnel: { impressions: 48000, awareness: 9100, consideration: 2300, visits: 1150, purchases: 23 },
          price: 19, cost: 3,
          p4: { product: 3, price: 3, place: 2, promotion: 2 },
        },
        {
          id: uid(), name: 'Example: Short-form channel "AI workflow in 60s"', type: 'content', status: 'running', progress: 40,
          lastRun: addDays(-2), nextRun: addDays(0), owner: 'Content pipeline',
          tasks: 'Pick topic from news feed → script → voice/visuals → publish 3×/week → repurpose to newsletter',
          funnel: { impressions: 120000, awareness: 15000, consideration: 2100, visits: 380, purchases: 9 },
          price: 0, cost: 0,
          p4: { product: 4, price: 2, place: 3, promotion: 3 },
        },
        {
          id: uid(), name: 'Example: Web3 "1-day 1-term" newsletter', type: 'content', status: 'paused', progress: 15,
          lastRun: addDays(-9), nextRun: '', owner: 'Not yet automated',
          tasks: 'Daily term from News page → 200-word explainer → email + thread',
          funnel: { impressions: 3000, awareness: 900, consideration: 300, visits: 140, purchases: 30 },
          price: 0, cost: 0,
          p4: { product: 3, price: 1, place: 2, promotion: 1 },
        },
      ],
      experiments: [
        {
          id: uid(), automation: 'Example: Digital template store', date: addDays(-7),
          change: 'New thumbnail with before/after screenshot instead of logo',
          metric: 'CTR (visits ÷ impressions)', before: 1.6, after: 2.4, unit: '%', sample: 'n≈48k impressions',
          decision: '', next: '',
        },
        {
          id: uid(), automation: 'Example: Short-form channel "AI workflow in 60s"', date: addDays(-4),
          change: 'Hook in first 2s ("Stop doing X manually") vs. intro',
          metric: '3-sec hold rate', before: 41, after: 43, unit: '%', sample: '6 videos',
          decision: '', next: '',
        },
      ],
      goals: { answers: {}, year: '', month: '', week: '' },
      quests: [
        { id: uid(), title: 'Answer the goal-setting questions', horizon: 'week', status: 'todo', deadline: addDays(2), xp: 50, parent: '' },
        { id: uid(), title: 'Replace example automations with your real ones', horizon: 'week', status: 'todo', deadline: addDays(3), xp: 40, parent: '' },
        { id: uid(), title: 'Turn on the daily news workflow on GitHub', horizon: 'week', status: 'todo', deadline: addDays(3), xp: 30, parent: '' },
      ],
      player: { xp: 0, completedDays: [], badges: [] },
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* storage blocked or corrupt — fall back to seed */ }
    return seed();
  }
  let state = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { toast('Could not save (browser storage blocked)'); }
  }

  /* ---------- UI helpers ---------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function toast(msg) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2400);
  }

  /** Generic modal form. fields: [{name,label,type,options,value,placeholder}] → resolves with values or null. */
  function formModal(title, fields, submitLabel = 'Save') {
    return new Promise((resolve) => {
      const dlg = document.createElement('dialog');
      const inputs = fields.map((f) => {
        const v = f.value ?? '';
        if (f.type === 'select') {
          return `<label>${esc(f.label)}<select name="${f.name}">${f.options.map((o) => {
            const [val, lab] = Array.isArray(o) ? o : [o, o];
            return `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lab)}</option>`;
          }).join('')}</select></label>`;
        }
        if (f.type === 'textarea') return `<label>${esc(f.label)}<textarea name="${f.name}" placeholder="${esc(f.placeholder || '')}">${esc(v)}</textarea></label>`;
        if (f.type === 'days') {
          const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          return `<label>${esc(f.label)}<div class="row" style="margin-top:4px">${names.map((n, i) =>
            `<span class="row" style="gap:3px"><input type="checkbox" style="width:auto" name="${f.name}" value="${i}" ${(v || []).includes(i) ? 'checked' : ''}>${n}</span>`).join('')}</div></label>`;
        }
        if (f.type === 'checkbox') return `<label class="row" style="gap:6px"><input type="checkbox" style="width:auto" name="${f.name}" ${v ? 'checked' : ''}> ${esc(f.label)}</label>`;
        return `<label>${esc(f.label)}<input type="${f.type || 'text'}" name="${f.name}" value="${esc(v)}" placeholder="${esc(f.placeholder || '')}" ${f.step ? `step="${f.step}"` : ''}></label>`;
      }).join('');
      dlg.innerHTML = `<form method="dialog"><h2>${esc(title)}</h2>${inputs}
        <div class="actions"><button value="cancel" type="submit" formnovalidate>Cancel</button><button class="btn-primary" value="ok" type="submit">${esc(submitLabel)}</button></div></form>`;
      document.body.appendChild(dlg);
      dlg.addEventListener('close', () => {
        let out = null;
        if (dlg.returnValue === 'ok') {
          out = {};
          const form = $('form', dlg);
          fields.forEach((f) => {
            if (f.type === 'days') out[f.name] = $$(`[name="${f.name}"]:checked`, form).map((x) => +x.value);
            else if (f.type === 'checkbox') out[f.name] = $(`[name="${f.name}"]`, form).checked;
            else if (f.type === 'number') { const n = $(`[name="${f.name}"]`, form).value; out[f.name] = n === '' ? '' : +n; }
            else out[f.name] = $(`[name="${f.name}"]`, form).value.trim();
          });
        }
        dlg.remove(); resolve(out);
      });
      dlg.showModal();
    });
  }

  /** In-page yes/no confirmation (native confirm() is blocked in some embedded viewers). */
  const ask = (msg, okLabel = 'OK') => formModal(msg, [], okLabel).then((v) => !!v);

  /* ---------- Gamification shared logic ---------- */
  const levelFor = (xp) => Math.floor(Math.sqrt(xp / 50)) + 1;          // L2 @50xp, L3 @200xp, L4 @450xp…
  const xpForLevel = (lvl) => 50 * (lvl - 1) ** 2;
  const TITLES = ['Wanderer', 'Apprentice', 'Adventurer', 'Pathfinder', 'Strategist', 'Builder', 'Architect', 'Champion', 'Legend'];
  const titleFor = (lvl) => TITLES[Math.min(lvl - 1, TITLES.length - 1)];

  /* ---------- Schedule helpers ---------- */
  function occurrencesOn(dateObj) {
    const day = iso(dateObj);
    const dow = dateObj.getDay();
    const recurring = state.schedule.filter((s) => (s.days || []).includes(dow)).map((s) => ({ ...s, date: day, kind: 'routine' }));
    const events = state.events.filter((e) => e.date === day).map((e) => ({ ...e, start: e.time || '', end: '', kind: 'event' }));
    return [...recurring, ...events].sort((a, b) => (a.start || '99').localeCompare(b.start || '99'));
  }

  /* Browser notifications for items flagged notify:true (works while any LifeOS tab is open). */
  function startReminders() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const fired = new Set();
    const tick = () => {
      const now = new Date();
      const hhmm = now.toTimeString().slice(0, 5);
      const soon = new Date(now.getTime() + 10 * 60000).toTimeString().slice(0, 5);
      occurrencesOn(now).filter((o) => o.notify && o.start).forEach((o) => {
        const key = o.id + o.date;
        if (o.start > hhmm && o.start <= soon && !fired.has(key)) {
          fired.add(key);
          new Notification('Starting soon: ' + o.title, { body: `${o.start}${o.end ? '–' + o.end : ''}` });
        }
      });
    };
    tick(); setInterval(tick, 60000);
  }

  /* ---------- Chrome: nav + theme ---------- */
  function mountChrome(active) {
    const pages = [['index.html', 'Dashboard'], ['schedule.html', 'Schedule'], ['quests.html', 'Quests'], ['news.html', 'News & Learn']];
    const header = document.createElement('header');
    header.className = 'topbar';
    header.innerHTML = `<div class="inner"><a class="brand" href="index.html">◆ LifeOS</a><nav class="nav">${pages.map(([h, l]) =>
      `<a href="${h}" class="${h === active ? 'active' : ''}">${l}</a>`).join('')}</nav>
      <button class="btn-ghost btn-sm" id="themeBtn" title="Toggle theme">◐ Theme</button></div>`;
    document.body.prepend(header);
    try { const t = localStorage.getItem('lifeos.theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
    $('#themeBtn').onclick = () => {
      const cur = document.documentElement.dataset.theme
        || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('lifeos.theme', next); } catch (e) {}
    };
    startReminders();
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `lifeos-backup-${todayISO()}.json`; a.click();
  }
  function importData(file, done) {
    const r = new FileReader();
    r.onload = () => {
      try { const d = JSON.parse(r.result); if (!d.schedule || !d.quests) throw 0; state = d; window.LifeOS.state = d; save(); done && done(); toast('Imported'); }
      catch (e) { toast('That file is not a LifeOS backup'); }
    };
    r.readAsText(file);
  }
  function resetData() { state = seed(); window.LifeOS.state = state; save(); }

  window.LifeOS = {
    get state() { return state; }, set state(v) { state = v; },
    save, uid, esc, $, $$, toast, formModal, ask, iso, todayISO, addDays,
    levelFor, xpForLevel, titleFor, occurrencesOn, mountChrome, exportData, importData, resetData,
  };
})();
