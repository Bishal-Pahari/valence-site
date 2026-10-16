(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- page behaviors ---------- */

  for (const el of document.querySelectorAll('pre[data-json]')) {
    el.innerHTML = esc(el.textContent).replace(
      /("(?:[^"\\]|\\.)*")(\s*:)?|\b(-?\d+(?:\.\d+)?)\b|\b(true|false|null)\b/g,
      (m, str, colon, num, lit) => str ? (colon ? `<span class="k">${str}</span>${colon}` : `<span class="s">${str}</span>`) : `<span class="n">${num ?? lit}</span>`
    );
  }

  for (const b of document.querySelectorAll('[data-copy]')) {
    b.addEventListener('click', () => {
      const use = b.querySelector('use');
      const done = () => { b.setAttribute('data-done', ''); use.setAttribute('href', '#i-check'); draw(b.querySelector('.ico')); setTimeout(() => { b.removeAttribute('data-done'); use.setAttribute('href', '#i-copy'); }, 1600); };
      const fallback = () => { const range = document.createRange(); range.selectNodeContents(b.parentElement.querySelector('code')); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range); };
      try { navigator.clipboard.writeText(b.dataset.copy).then(done, fallback); } catch { fallback(); }
    });
  }

  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const select = (t) => {
    for (const x of tabs) {
      const on = x === t;
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
    }
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      const n = tabs[(i + d + tabs.length) % tabs.length];
      select(n); n.focus();
    });
  });

  // Icons draw themselves in. The class is removed afterwards so hover animations don't replay the draw.
  function draw(ico, delay = 0) {
    if (reduced || !ico) return;
    ico.style.setProperty('--d', delay + 'ms');
    ico.removeAttribute('data-pre');
    ico.classList.remove('draw'); void ico.getBoundingClientRect(); ico.classList.add('draw');
    ico.addEventListener('animationend', () => ico.classList.remove('draw'), { once: true });
  }

  // Blocks and icons that start below the fold fade up and draw in as they enter. Everything on screen at load stays as is.
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target;
        io.unobserve(el);
        if (el.matches('.reveal')) el.removeAttribute('data-pre');
        else draw(el, 150);
      }
    }, { rootMargin: '0px 0px -8% 0px' });
    for (const el of document.querySelectorAll('.reveal, main .ico:not(#netIcon)')) {
      if (el.getBoundingClientRect().top > innerHeight) { el.setAttribute('data-pre', ''); io.observe(el); }
    }
    document.querySelectorAll('.nav .ico').forEach((i, n) => draw(i, n * 120));

    // Highlight the section in view in the nav.
    const links = new Map([...document.querySelectorAll('.nav-links a[href^="#"]')].map((a) => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) for (const [id, a] of links) id === e.target.id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current');
    }, { rootMargin: '-45% 0px -50% 0px' });
    for (const id of links.keys()) { const s = document.getElementById(id); if (s) spy.observe(s); }
    spy.observe($('.hero')); // has no id, so reaching it clears the highlight
  }

  /* ---------- the release console ---------- */
  // A faithful, sped-up model of contracts.md §2.3 (update algorithm), §2.4 (activation state machine) and §5.3 (pull),
  // running a reference app: a conference schedule.

  const APP_ID = 'app.valence.reference';
  const BUILTIN = 42;
  const SEED_USN = 1240;
  const NOW = '10:24';
  const fnv1a32 = (s) => { let h = 0x811c9dc5; for (const b of new TextEncoder().encode(s)) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));
  const seed = () => ({ sessions: [
    { t: '09:00', title: 'Doors open and coffee', room: 'Lobby' },
    { t: '09:30', title: 'Keynote: UI between releases', room: 'Hall A' },
    { t: '11:00', title: 'Offline-first sync in practice', room: 'Hall B' },
    { t: '13:30', title: 'Designing a typed bridge', room: 'Hall A' },
    { t: '15:00', title: 'Staged rollouts on mobile', room: 'Hall B' },
  ] });
  // Rows the sync server holds above the seed. Each row replaces the whole value of its key; a fix is just a newer row.
  const SERVER_ROWS = [
    { u: 1241, k: 'schedule/day-2', note: 'adds a workshop at 14:00', apply: () => {} },
    { u: 1242, k: 'schedule/day-1', note: 'offline talk moved from Hall B to Hall C, lightning talks added at 16:30', apply: (d) => {
      const s = d.sessions.find((x) => x.t === '11:00'); s.room = 'Hall C'; s.changed = true;
      d.sessions.push({ t: '16:30', title: 'Lightning talks', room: 'Hall A', changed: true });
    } },
  ];

  let S, server, dev, gen = 0, rollout = 100, prevState = {};

  function init() {
    const installId = uuid();
    S = { installId, port: fnv1a32(APP_ID + ':' + installId) % 20000 + 10000, current: BUILTIN, previous: null, pending: null, trial: null, trialFails: 0, serving: null, bad: [], floor: 40 };
    server = { pointer: { seq: BUILTIN, rollout }, manifests: { [BUILTIN]: { broken: false, floor: 40 } }, next: BUILTIN + 1 };
    dev = { online: true, maxUsn: SEED_USN, shown: BUILTIN, mode: 'app', data: seed() };
    prevState = { ...S };
    $('#log').textContent = '';
    log('phone', `Installed from the store with built-in bundle ${BUILTIN} and seed.db (usn up to ${SEED_USN}).`);
    log('phone', `Loopback server on 127.0.0.1:${S.port}. The port comes from fnv1a32(appId:installId).`);
    render();
  }

  const TAGS = { release: 'accent', phone: '', ok: 'ok', sync: '', fail: 'bad' };
  function log(kind, text) {
    const li = document.createElement('li');
    const t = document.createElement('span');
    t.className = 'tag ' + TAGS[kind];
    t.textContent = kind;
    const m = document.createElement('span');
    m.textContent = text;
    li.append(t, m);
    const ol = $('#log');
    ol.append(li);
    while (ol.children.length > 80) ol.firstChild.remove();
    ol.scrollTop = ol.scrollHeight;
  }

  /* rendering */

  function renderState() {
    const shown = { ...S, installId: S.installId.slice(0, 8) + '…' };
    const keys = Object.keys(shown);
    const lines = keys.map((k, i) => {
      const changed = JSON.stringify(S[k]) !== JSON.stringify(prevState[k]);
      const v = esc(JSON.stringify(shown[k]));
      return `  <span class="k">"${k}"</span>: ${changed ? `<span class="chg">${v}</span>` : v}${i < keys.length - 1 ? ',' : ''}`;
    });
    $('#stateView').innerHTML = '{\n' + lines.join('\n') + '\n}';
    prevState = JSON.parse(JSON.stringify(S));
    $('#sqliteView').textContent = `sqlite · bucket schedule/2 · max_usn ${dev.maxUsn}`;
  }

  function schedule(seq) {
    const v2 = seq > BUILTIN;
    const list = [...dev.data.sessions].sort((a, b) => a.t.localeCompare(b.t));
    const next = list.find((x) => x.t > NOW);
    const rows = list.map((x) => `<li class="${v2 && x.changed ? 'changed' : ''}"><span class="t">${x.t}</span><span class="ti">${x.title}</span><span class="rm">${x.room}</span></li>`).join('');
    return `<div class="app${v2 ? ' v2' : ''}">
      <div class="app-head">
        <div><div class="app-title">Schedule</div><div class="app-sub">Day 1 · Thu 12 Nov${v2 ? ` · ${list.length} sessions` : ''}</div></div>
        <button class="app-sync" type="button" id="appSync" aria-label="Sync now"><svg class="ico" aria-hidden="true"><use href="#i-sync"/></svg></button>
      </div>
      ${dev.online ? '' : '<div class="offline">Offline · reading from SQLite</div>'}
      ${v2 && next ? `<div class="upnext"><small>Up next · ${next.t}</small><span>${next.title}</span><em>${next.room}</em></div>` : ''}
      <ul class="sessions">${rows}</ul>
    </div>`;
  }

  function renderPhone() {
    const v = $('#appView');
    const net = $('#netIcon');
    const href = dev.online ? '#i-wifi' : '#i-plane';
    if (net.querySelector('use').getAttribute('href') !== href) { net.querySelector('use').setAttribute('href', href); draw(net); }
    net.setAttribute('aria-label', dev.online ? 'Online' : 'Airplane mode');
    if (dev.mode === 'boot') v.innerHTML = '<div class="boot"><i></i></div>';
    else if (dev.mode === 'crash') v.innerHTML = `<div class="crash">
        <div class="err">Uncaught TypeError: Cannot read properties of undefined (reading 'sessions')<br>at +page.svelte:41</div>
        <div class="wait"><span>waiting for app.ready()</span><span id="tleft">15 s</span></div>
        <div class="bar"><i id="tbar" style="transform:scaleX(1)"></i></div></div>`;
    else {
      v.innerHTML = schedule(dev.shown);
      $('#appSync').addEventListener('click', () => { log('phone', 'Web app → bridge call sync.now {}'); sync(gen); });
    }
  }

  function render() {
    renderState();
    renderPhone();
    const p = server.pointer;
    $('#pointerMeta').textContent = `channels/production.json → seq ${p.seq} · ${p.rollout}%`;
    $('#btnRelease').textContent = `Release seq ${server.next}`;
    for (const b of document.querySelectorAll('.seg button')) b.setAttribute('aria-pressed', String(+b.dataset.r === rollout));
    $('#btnAir').setAttribute('aria-pressed', String(!dev.online));
    const role = dev.mode === 'crash' || (S.serving !== null && dev.shown === S.serving) ? 'trial, waiting for ready()' : dev.shown === S.current ? 'current' : 'built-in';
    $('#caption').textContent = dev.mode === 'boot' ? 'starting…' : `bundle ${dev.shown} · ${role}`;
    $('#hint').textContent = hint();
  }

  function hint() {
    const top = server.next - 1;
    if (!dev.online) return 'The phone is offline and the schedule still works from SQLite. Turn airplane mode off and it syncs right away.';
    if (S.serving !== null) return 'The trial is on screen. Wait for it to call ready(), or restart now to simulate a crash.';
    if (S.bad.includes(top)) return `Seq ${top} is marked bad here and the phone stays on ${S.current}. Untick the crash box and release again: rolling back means rolling forward.`;
    if (S.trial !== null) return `Seq ${S.trial} failed once. Restart again: it gets one more try before it is marked bad.`;
    if (S.pending !== null) return `Seq ${S.pending} is downloaded and verified. Restart the app: it runs as a trial on the next launch.`;
    if (top > S.current) return `Seq ${top} is live on the CDN. Restart the app: the phone checks for updates after its first paint.`;
    if (S.current > BUILTIN) return 'Committed: the new UI adds an “Up next” card. Now tick “Next build crashes on start”, release, and restart twice. Or try a 10% rollout.';
    return `Release seq ${server.next}, then restart the app.`;
  }

  const show = (seq, mode = 'app') => { dev.shown = seq; dev.mode = mode; render(); };

  /* the update algorithm (§2.3) */

  async function updateCheck(g) {
    if (!dev.online) { log('phone', 'Update check skipped: no network.'); return; }
    const p = { ...server.pointer };
    log('phone', `GET channels/production.json → ${JSON.stringify(p)}`);
    await wait(380); if (g !== gen) return;
    if (S.pending !== null && p.seq < S.pending) { log('phone', `The pointer is below pending ${S.pending}, so the release was pulled. Dropping it.`); S.pending = null; render(); }
    if (S.bad.includes(p.seq)) { log('phone', `Seq ${p.seq} is marked bad on this phone. Waiting for a newer release.`); return; }
    if (p.seq <= S.current || p.seq === S.trial || (S.pending !== null && p.seq <= S.pending)) { log('phone', 'Up to date.'); return; }
    const h = fnv1a32(S.installId + ':' + p.seq) % 100;
    if (!(h < p.rollout)) { log('phone', `Rollout gate: fnv1a32(installId:${p.seq}) % 100 = ${h}, not below ${p.rollout}. This phone waits for a wider rollout.`); return; }
    log('phone', `Rollout gate: ${h} < ${p.rollout}, so this phone is in the cohort.`);
    log('phone', `GET manifests/${p.seq}.json and ${p.seq}.json.sig`);
    const checks = [
      '1 signature: Ed25519 over the exact manifest bytes, keyId k1',
      `2 appId: ${APP_ID}`,
      `3 seq: ${p.seq} equals pointer.seq`,
      `4 floor: ${p.seq} is not below ${S.floor}`,
      '5 requires: bridge 1, schedule schema 2',
      '6 files: paths, hashes and sizes well formed',
    ];
    for (const c of checks) { await wait(240); if (g !== gen) return; log('ok', c); }
    await wait(500); if (g !== gen) return;
    log('ok', '7 downloaded 3 of 41 files (182 KB); the rest are already in cas/. Each sha256 verified.');
    S.pending = p.seq;
    log('phone', `pending = ${p.seq}. It applies at the next launch, never in the middle of a session.`);
    render();
  }

  /* the activation state machine (§2.4) */

  function countFailure() {
    S.trialFails += 1;
    S.serving = null;
    if (S.trialFails >= 2) {
      log('fail', `Second failure: seq ${S.trial} is marked bad. This phone stays on ${S.current}.`);
      S.bad.push(S.trial); S.trial = null; S.trialFails = 0;
    } else {
      log('fail', `Failure 1 of 2 for seq ${S.trial}. It gets one more try at the next launch.`);
    }
  }

  function commit(seq) {
    S.previous = S.current; S.current = seq; S.trial = null; S.trialFails = 0; S.serving = null;
    S.floor = Math.max(S.floor, server.manifests[seq].floor);
    log('ok', `app.ready() from the trial page: committed ${seq}. previous = ${S.previous}.`);
    const kept = [...new Set([S.current, S.previous, BUILTIN])].sort((a, b) => b - a);
    log('phone', `Garbage collection kept manifests ${kept.join(', ')} and their files; deleted the rest.`);
  }

  async function runTrial(g, seq) {
    if (!server.manifests[seq].broken) {
      await wait(900); if (g !== gen) return false;
      log('phone', 'First paint done. The page calls app.ready().');
      commit(seq); show(seq);
      return true;
    }
    show(seq, 'crash');
    log('fail', 'The trial page threw on start. The 15 s ready timer is running (shown 5× faster).');
    for (let t = 15; t > 0; t--) {
      const left = $('#tleft'), bar = $('#tbar');
      if (left) left.textContent = t + ' s';
      if (bar) bar.style.transform = `scaleX(${(t - 1) / 15})`;
      await wait(200); if (g !== gen) return false;
    }
    log('fail', 'No app.ready() within 15 s of foreground time.');
    countFailure();
    log('phone', `Reloading the last good bundle, ${S.current}.`);
    show(S.current);
    return true;
  }

  async function uiStart() {
    const g = ++gen;
    dev.mode = 'boot'; render();
    log('phone', 'UI start');
    await wait(420); if (g !== gen) return;
    if (S.serving !== null && S.serving === S.trial) {
      log('fail', `The last launch showed trial ${S.trial} and the app died before ready().`);
      countFailure();
    }
    if (S.trial === null && S.pending !== null) {
      S.trial = S.pending; S.pending = null; S.trialFails = 0;
      log('phone', `pending ${S.trial} becomes the trial.`);
    }
    if (S.trial !== null) {
      S.serving = S.trial;
      log('phone', `Serving trial ${S.trial} from 127.0.0.1:${S.port}.`);
      show(S.trial);
      if (!(await runTrial(g, S.trial))) return;
    } else {
      log('phone', `Serving ${S.current}.`);
      show(S.current);
    }
    // Background work. It never blocks the first paint.
    await wait(700); if (g !== gen) return;
    if (dev.online) await sync(g);
    if (g !== gen) return;
    await updateCheck(g);
  }

  /* pull by usn (§5.3) */

  async function sync(g) {
    if (!dev.online) { log('sync', 'sync.now → {"offline": true}. The UI keeps reading SQLite.'); return; }
    $('#appSync')?.classList.add('busy');
    log('sync', `GET /schedule?since=${dev.maxUsn}&schema=2&limit=500`);
    await wait(500);
    $('#appSync')?.classList.remove('busy');
    if (g !== gen) return;
    const rows = SERVER_ROWS.filter((r) => r.u > dev.maxUsn);
    if (!rows.length) { log('sync', '200 · 0 rows. Already up to date.'); return; }
    for (const r of rows) r.apply(dev.data);
    dev.maxUsn = rows[rows.length - 1].u;
    log('sync', `200 · ${rows.length} rows · max ${dev.maxUsn}. Applied in one transaction.`);
    for (const r of rows) log('sync', `usn ${r.u} ${r.k}: ${r.note}`);
    log('sync', 'Event sync.changed {"buckets": ["schedule"]} to the page.');
    render();
  }

  /* controls */

  $('#btnRelease').addEventListener('click', () => {
    const seq = server.next++;
    const broken = $('#crash').checked;
    server.manifests[seq] = { broken, floor: 40 };
    server.pointer = { seq, rollout };
    log('release', `valence bundle → manifests/${seq}.json, signed with k1${broken ? '. This build throws on start.' : '.'}`);
    log('release', `Uploaded files, then the manifest, then the pointer: ${JSON.stringify(server.pointer)}`);
    render();
  });

  for (const b of document.querySelectorAll('.seg button')) {
    b.addEventListener('click', () => {
      rollout = +b.dataset.r;
      server.pointer = { ...server.pointer, rollout };
      if (server.pointer.seq > BUILTIN) log('release', `Pointer → ${JSON.stringify(server.pointer)}. It is unsigned, so no re-signing is needed.`);
      render();
    });
  }

  $('#btnRestart').addEventListener('click', uiStart);

  $('#btnAir').addEventListener('click', () => {
    dev.online = !dev.online;
    log('phone', dev.online ? 'Connectivity is back.' : 'Airplane mode on. Nothing changes for the UI: its data is local.');
    render();
    if (dev.online && dev.mode === 'app') sync(gen);
  });

  $('#btnReset').addEventListener('click', () => { gen++; init(); });

  init();
})();
