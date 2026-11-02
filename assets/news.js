(function () {
  const L = window.LifeOS;
  const { esc, $ } = L;
  L.mountChrome('news.html');

  const CATS = [
    ['all', 'All'],
    ['ai_workflow', 'AI workflows & automation'],
    ['ai_creative', 'Creativity with AI'],
    ['ai_general', 'AI industry'],
    ['web3', 'Web3 · blockchain · coins'],
  ];
  const SOURCES = {
    'AI workflows & automation': [['Simon Willison', 'https://simonwillison.net/'], ['Hugging Face blog', 'https://huggingface.co/blog'], ['Latent Space', 'https://www.latent.space/'], ['n8n blog', 'https://blog.n8n.io/']],
    'Creativity with AI': [['Runway research', 'https://runwayml.com/research'], ['Google DeepMind blog', 'https://deepmind.google/discover/blog/'], ['Ben\'s Bites', 'https://www.bensbites.com/']],
    'Web3 · blockchain': [['CoinDesk', 'https://www.coindesk.com/'], ['The Block', 'https://www.theblock.co/'], ['Decrypt', 'https://decrypt.co/'], ['L2BEAT (rollup risk)', 'https://l2beat.com/'], ['DefiLlama (TVL data)', 'https://defillama.com/']],
  };

  /* ---------- Term of the day ---------- */
  const dayIndex = () => { const d = new Date(); return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5); };
  let ti = dayIndex() % window.GLOSSARY.length;
  function renderTerm() {
    const g = window.GLOSSARY[ti];
    const isToday = ti === dayIndex() % window.GLOSSARY.length;
    $('#term').innerHTML = `
      <div class="card-head"><div><p class="eyebrow">${isToday ? 'One day · one discovery' : 'From the archive'} · ${esc(g.tag)}</p><h2 class="term-title">${esc(g.term)}</h2></div>
      <div class="row"><button class="btn-sm" id="tPrev">←</button><span class="small muted num">${ti + 1}/${window.GLOSSARY.length}</span><button class="btn-sm" id="tNext">→</button></div></div>
      <p class="term-lead">${esc(g.what)}</p>
      <div class="grid g3">
        <div><h3>⚙ How it works</h3><p class="small">${esc(g.how)}</p></div>
        <div><h3>💡 Why it matters</h3><p class="small">${esc(g.why)}</p></div>
        <div><h3>⚠ Risks</h3><p class="small">${esc(g.risks)}</p></div>
      </div>
      <p class="small muted" style="margin:6px 0 0">Content idea: turn today's term into a 60-second explainer for your channel.</p>`;
    $('#tPrev').onclick = () => { ti = (ti - 1 + window.GLOSSARY.length) % window.GLOSSARY.length; renderTerm(); };
    $('#tNext').onclick = () => { ti = (ti + 1) % window.GLOSSARY.length; renderTerm(); };
  }

  /* ---------- Headlines (data/news.json, refreshed daily by GitHub Actions) ---------- */
  let items = [], cat = 'all';
  const ago = (iso) => {
    const h = Math.round((Date.now() - new Date(iso)) / 36e5);
    if (!isFinite(h)) return '';
    return h < 1 ? 'just now' : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
  };
  function renderNews() {
    $('#tabs').innerHTML = CATS.map(([k, l]) => `<button data-cat="${k}" class="${k === cat ? 'active' : ''}">${l}${k !== 'all' ? ` <span class="muted small">${items.filter((x) => x.category === k).length}</span>` : ''}</button>`).join('');
    const q = $('#search').value.toLowerCase();
    const list = items.filter((x) => (cat === 'all' || x.category === cat) && (!q || (x.title + ' ' + (x.summary || '')).toLowerCase().includes(q)));
    $('#news').innerHTML = list.slice(0, 60).map((x) => `
      <a class="card news-card" href="${esc(x.link)}" target="_blank" rel="noopener">
        <div class="row small"><span class="pill accent">${esc((CATS.find((c) => c[0] === x.category) || [, ''])[1])}</span><span class="spacer"></span><span class="muted">${ago(x.published)}</span></div>
        <h3>${esc(x.title)}</h3>
        ${x.summary ? `<p class="small muted">${esc(x.summary)}</p>` : ''}
        <div class="small muted">${esc(x.source || '')}</div>
      </a>`).join('') || `<div class="card span2"><p class="empty">${items.length ? 'No headlines match.' : 'No headlines yet. The “Daily news refresh” GitHub Action fills this page every morning — run it once from the Actions tab to populate it now.'}</p></div>`;
  }
  fetch('data/news.json', { cache: 'no-store' }).then((r) => r.json()).then((d) => {
    items = (d.items || []).sort((a, b) => (b.published || '').localeCompare(a.published || ''));
    $('#updated').textContent = d.updated ? `Headlines updated ${new Date(d.updated).toLocaleString()}` : 'Headlines not fetched yet';
    renderNews();
  }).catch(() => { $('#updated').textContent = 'Open via a web server (e.g. GitHub Pages) to load headlines.'; renderNews(); });

  $('#sources').innerHTML = Object.entries(SOURCES).map(([k, list]) => `<div><h3>${k}</h3><ul class="list small">${list.map(([n, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${n} ↗</a></li>`).join('')}</ul></div>`).join('');
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) { cat = b.dataset.cat; renderNews(); } });
  $('#search').oninput = renderNews;
  renderTerm();
})();
