(function () {
  const L = window.LifeOS;
  const { esc, $, formModal, toast } = L;
  L.mountChrome('schedule.html');
  const S = () => L.state;
  const CATS = ['work', 'content', 'review', 'health', 'learning', 'personal'];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const H0 = 6, H1 = 24, PX = 40; // visible hours 06:00–24:00, 40px per hour
  let offset = 0;

  const mins = (t) => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + m; };
  function weekStart() {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7); // Monday
    return d;
  }
  const dayDates = () => [...Array(7)].map((_, i) => { const d = weekStart(); d.setDate(d.getDate() + i); return d; });

  function renderWeek() {
    const dates = dayDates();
    const todayISO = L.todayISO();
    $('#weekLabel').textContent = `${dates[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${dates[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    $('#legend').innerHTML = [...CATS, 'event'].map((c) => `<span><span class="dot cat-${c}"></span>${c}</span>`).join(' ');
    const now = new Date();
    let html = '<div class="dh"></div>' + dates.map((d) => `<div class="dh ${L.iso(d) === todayISO ? 'today' : ''}">${DAYS[d.getDay()]} ${d.getDate()}</div>`).join('');
    html += `<div class="hours">${[...Array(H1 - H0)].map((_, i) => `<div>${String(H0 + i).padStart(2, '0')}:00</div>`).join('')}</div>`;
    html += dates.map((d) => {
      const iso = L.iso(d);
      const items = L.occurrencesOn(d);
      const blocks = items.filter((o) => o.start).map((o) => {
        const top = Math.max(0, (mins(o.start) - H0 * 60) / 60 * PX);
        const dur = o.end ? mins(o.end) - mins(o.start) : 45;
        const cat = o.kind === 'event' ? 'event' : o.category || 'work';
        return `<div class="blk cat-${esc(cat)}" style="top:${top}px;height:${Math.max(20, dur / 60 * PX - 2)}px" data-open="${o.kind}:${o.id}" title="${esc(o.title)}"><b>${o.notify ? '🔔 ' : ''}${esc(o.title)}</b>${esc(o.start)}${o.end ? '–' + esc(o.end) : ''}</div>`;
      }).join('');
      const nowLine = iso === todayISO ? `<div class="nowline" style="top:${((now.getHours() * 60 + now.getMinutes()) - H0 * 60) / 60 * PX}px"></div>` : '';
      return `<div class="col ${iso === todayISO ? 'today' : ''}" style="height:${(H1 - H0) * PX}px">${blocks}${nowLine}</div>`;
    }).join('');
    $('#week').innerHTML = html;

    $('#agenda').innerHTML = dates.map((d) => {
      const items = L.occurrencesOn(d);
      return `<div class="card" style="margin-bottom:10px"><h3>${d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
        <ul class="list">${items.map((o) => `<li class="row" data-open="${o.kind}:${o.id}"><span class="dot cat-${o.kind === 'event' ? 'event' : esc(o.category)}"></span><span class="num muted">${esc(o.start)}${o.end ? '–' + esc(o.end) : ''}</span><span>${o.notify ? '🔔 ' : ''}${esc(o.title)}</span></li>`).join('') || '<li class="empty">Free</li>'}</ul></div>`;
    }).join('');
  }

  function renderLists() {
    const s = S();
    const up = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      L.occurrencesOn(d).filter((o) => o.notify || o.kind === 'event').forEach((o) => up.push({ d, o }));
    }
    const nowM = new Date().getHours() * 60 + new Date().getMinutes();
    $('#upcoming').innerHTML = up.filter(({ d, o }) => !(d.toDateString() === new Date().toDateString() && mins(o.start) < nowM)).slice(0, 12).map(({ d, o }) =>
      `<li class="row"><span class="pill ${o.kind === 'event' ? 'warn' : 'accent'}">${d.toDateString() === new Date().toDateString() ? 'Today' : DAYS[d.getDay()] + ' ' + d.getDate()}</span><span class="num muted">${esc(o.start)}</span><span>${esc(o.title)}</span></li>`).join('') || '<li class="empty">No upcoming notices.</li>';
    $('#allItems').innerHTML = [
      ...s.schedule.map((r) => `<li class="row" data-open="routine:${r.id}"><span class="dot cat-${esc(r.category)}"></span><span style="flex:1;min-width:0">${r.notify ? '🔔 ' : ''}${esc(r.title)}<div class="small muted">${(r.days || []).map((x) => DAYS[x]).join(' ')} · ${esc(r.start)}–${esc(r.end)}</div></span><button class="btn-sm">Edit</button></li>`),
      ...s.events.map((e) => `<li class="row" data-open="event:${e.id}"><span class="dot cat-event"></span><span style="flex:1;min-width:0">${e.notify ? '🔔 ' : ''}${esc(e.title)}<div class="small muted">${esc(e.date)} ${esc(e.time)}</div></span><button class="btn-sm">Edit</button></li>`),
    ].join('');
  }

  async function editRoutine(id) {
    const s = S();
    const r = s.schedule.find((x) => x.id === id) || { title: '', days: [1, 2, 3, 4, 5], start: '09:00', end: '10:00', category: 'work', notify: true };
    const v = await formModal(id ? 'Edit routine' : 'New routine', [
      { name: 'title', label: 'Title', value: r.title },
      { name: 'days', label: 'Repeats on', type: 'days', value: r.days },
      { name: 'start', label: 'Start', type: 'time', value: r.start },
      { name: 'end', label: 'End', type: 'time', value: r.end },
      { name: 'category', label: 'Category', type: 'select', options: CATS, value: r.category },
      { name: 'notify', label: '🔔 Remind me', type: 'checkbox', value: r.notify },
      ...(id ? [{ name: 'del', label: 'Delete this routine', type: 'checkbox', value: false }] : []),
    ]);
    if (!v) return;
    if (v.del) s.schedule = s.schedule.filter((x) => x.id !== id);
    else if (!v.title) return;
    else { delete v.del; if (id) Object.assign(r, v); else s.schedule.push({ id: L.uid(), ...v }); }
    L.save(); render();
  }
  async function editEvent(id) {
    const s = S();
    const e = s.events.find((x) => x.id === id) || { title: '', date: L.todayISO(), time: '09:00', notify: true };
    const v = await formModal(id ? 'Edit event' : 'New event', [
      { name: 'title', label: 'Title', value: e.title },
      { name: 'date', label: 'Date', type: 'date', value: e.date },
      { name: 'time', label: 'Time', type: 'time', value: e.time },
      { name: 'notify', label: '🔔 Remind me', type: 'checkbox', value: e.notify },
      ...(id ? [{ name: 'del', label: 'Delete this event', type: 'checkbox', value: false }] : []),
    ]);
    if (!v) return;
    if (v.del) s.events = s.events.filter((x) => x.id !== id);
    else if (!v.title) return;
    else { delete v.del; if (id) Object.assign(e, v); else s.events.push({ id: L.uid(), ...v }); }
    L.save(); render();
  }

  function exportICS() {
    const s = S();
    const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    const dt = (date, time) => date.replace(/-/g, '') + 'T' + (time || '09:00').replace(':', '') + '00';
    const alarm = (on) => (on ? ['BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', 'DESCRIPTION:Reminder', 'END:VALARM'] : []);
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LifeOS//EN'];
    // Anchor each routine on its next matching day so DTSTART falls on an RRULE day.
    s.schedule.forEach((r) => {
      if (!r.days?.length) return;
      const d = new Date(); while (!r.days.includes(d.getDay())) d.setDate(d.getDate() + 1);
      const iso = L.iso(d);
      lines.push('BEGIN:VEVENT', `UID:${r.id}@lifeos`, `DTSTAMP:${stamp}`, `SUMMARY:${r.title}`, `DTSTART:${dt(iso, r.start)}`, `DTEND:${dt(iso, r.end || r.start)}`,
        `RRULE:FREQ=WEEKLY;BYDAY=${r.days.map((x) => BYDAY[x]).join(',')}`, ...alarm(r.notify), 'END:VEVENT');
    });
    s.events.forEach((e) => {
      lines.push('BEGIN:VEVENT', `UID:${e.id}@lifeos`, `DTSTAMP:${stamp}`, `SUMMARY:${e.title}`, `DTSTART:${dt(e.date, e.time)}`, `DURATION:PT1H`, ...alarm(e.notify), 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar' }));
    a.download = 'lifeos-schedule.ics'; a.click();
    toast('Calendar file downloaded');
  }

  function render() { renderWeek(); renderLists(); }
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-open]'); if (!el) return;
    const [kind, id] = el.dataset.open.split(':');
    kind === 'event' ? editEvent(id) : editRoutine(id);
  });
  $('#addRoutine').onclick = () => editRoutine(null);
  $('#addEvent').onclick = () => editEvent(null);
  $('#icsBtn').onclick = exportICS;
  $('#prevW').onclick = () => { offset--; renderWeek(); };
  $('#nextW').onclick = () => { offset++; renderWeek(); };
  $('#thisW').onclick = () => { offset = 0; renderWeek(); };
  render();
  setInterval(renderWeek, 60000);
})();
