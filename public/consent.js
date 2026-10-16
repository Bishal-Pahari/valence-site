/* Analytics consent. Loaded on every page with data-ga="<GA4 id>".
   With no id there is no analytics code and no banner, and this file does nothing.
   Google Analytics is loaded only after the visitor accepts, and the choice is kept in localStorage. */
(() => {
  'use strict';
  const me = document.currentScript;
  const id = me && me.dataset.ga;
  if (!id) return;

  const KEY = 'valence-consent';
  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const write = (v) => { try { localStorage.setItem(KEY, v); } catch { /* private mode: the choice lasts for this page only */ } };

  function loadAnalytics() {
    if (window.__gaLoaded) return;
    window.__gaLoaded = true;
    window['ga-disable-' + id] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id, { anonymize_ip: true });
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.append(s);
  }

  function stopAnalytics() {
    window['ga-disable-' + id] = true;
    const host = location.hostname.split('.');
    for (const name of document.cookie.split('; ').map((c) => c.split('=')[0])) {
      if (name === '_ga' || name.startsWith('_ga_')) {
        for (let i = 0; i < host.length; i++) document.cookie = name + '=; Max-Age=0; path=/; domain=.' + host.slice(i).join('.');
        document.cookie = name + '=; Max-Age=0; path=/';
      }
    }
  }

  let banner;
  function close() { if (banner) { banner.remove(); banner = null; } }

  function choose(value) {
    write(value);
    if (value === 'granted') loadAnalytics(); else stopAnalytics();
    close();
  }

  function open() {
    if (banner) return;
    if (!document.getElementById('consent-style')) {
      const st = document.createElement('style');
      st.id = 'consent-style';
      st.textContent = `
        .consent { position: fixed; z-index: 50; left: max(16px, env(safe-area-inset-left, 0px)); right: max(16px, env(safe-area-inset-right, 0px)); bottom: max(16px, env(safe-area-inset-bottom, 0px));
          max-width: 520px; padding: 18px 20px; border-radius: 12px; border: 1px solid var(--line-strong, var(--sl-color-gray-5, #d3d5d9));
          background: var(--surface, var(--sl-color-bg, #fff)); color: var(--fg, var(--sl-color-text, #2a2d31));
          font: 400 15px/1.55 var(--sans, var(--sl-font, system-ui, sans-serif)); box-shadow: 0 8px 30px rgba(16,18,21,.12); }
        .consent p { margin: 0 0 12px; }
        .consent a { color: inherit; text-underline-offset: 3px; }
        .consent .row { display: flex; flex-wrap: wrap; gap: 8px; }
        .consent button { min-height: 40px; padding: 0 16px; border-radius: 8px; font: 500 15px/1 inherit; cursor: pointer;
          border: 1px solid var(--line-strong, #d3d5d9); background: transparent; color: inherit; }
        .consent button[data-yes] { background: var(--ink, #101215); color: var(--on-ink, #fff); border-color: var(--ink, #101215); }
        .consent button:focus-visible { outline: 2px solid var(--accent, #2f6bb0); outline-offset: 2px; }`;
      document.head.append(st);
    }
    banner = document.createElement('div');
    banner.className = 'consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Analytics cookies');
    banner.innerHTML =
      '<p>Can we use Google Analytics to count visits and see which pages help? It sets cookies and sends usage data to Google. ' +
      'Nothing is loaded unless you accept. <a href="/privacy/">Privacy policy</a></p>' +
      '<div class="row"><button type="button" data-yes>Accept analytics</button><button type="button" data-no>Decline</button></div>';
    banner.querySelector('[data-yes]').addEventListener('click', () => choose('granted'));
    banner.querySelector('[data-no]').addEventListener('click', () => choose('denied'));
    document.body.append(banner);
    banner.querySelector('[data-yes]').focus({ preventScroll: true });
  }

  const start = () => {
    const saved = read();
    if (saved === 'granted') loadAnalytics();
    else if (saved !== 'denied') open();
    document.addEventListener('click', (e) => { if (e.target.closest('[data-consent-open]')) open(); });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
