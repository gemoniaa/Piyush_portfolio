/* Starts the site. It does four things, in this order:
   1. loads content.js, the edits you published from the private editor (if any),
   2. applies them on top of config.js,
   3. while the private editor is unlocked, also applies your unpublished draft from this browser,
   4. loads the rest of the page scripts (listed in data-next on the script tag).
   It also adds the hidden button in the footer that asks for the secret code. */
(() => {
  'use strict';
  const me = document.currentScript;
  const next = ((me && me.dataset.next) || '').split(',').map(s => s.trim()).filter(Boolean);
  const S = window.SITE = window.SITE || {};

  /* Everything the private editor is allowed to change */
  const KEYS = ['name', 'title', 'intro', 'email', 'links', 'resume', 'hero', 'projects', 'experience', 'education', 'languages', 'certs', 'events', 'gallery', 'creative'];
  /* The code is stored only as a hash. SHA-256 where the browser has it, a simple hash otherwise. */
  const H_SHA = '026d45fcf43e8ebcb3e4dcaef2680f58bc0713f10655dd9f36d4d6d42ab2cc11', H_FALL = '49a512aeda83e';
  const SALT = 'pn-admin-v1:';

  const clone = o => JSON.parse(JSON.stringify(o));
  const walk = (o, fn) => {
    if (typeof o === 'string') fn(o);
    else if (Array.isArray(o)) o.forEach(v => walk(v, fn));
    else if (o && typeof o === 'object') Object.keys(o).forEach(k => walk(o[k], fn));
  };
  const mapStr = (o, fn) => {
    if (typeof o === 'string') return fn(o);
    if (Array.isArray(o)) return o.map(v => mapStr(v, fn));
    if (o && typeof o === 'object') { const r = {}; Object.keys(o).forEach(k => { r[k] = mapStr(o[k], fn); }); return r; }
    return o;
  };
  const store = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} }, del: k => { try { sessionStorage.removeItem(k); } catch (e) {} } };
  const unlocked = () => store.get('pn_admin') === '1';

  /* Small database in this browser: the unpublished draft and the files you picked */
  let dbp = null;
  const DB = () => dbp || (dbp = new Promise((res, rej) => {
    if (!window.indexedDB) return rej(new Error('IndexedDB is not available'));
    const r = indexedDB.open('pn_admin', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('blobs'); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const op = (name, mode, fn) => DB().then(db => new Promise((res, rej) => {
    const t = db.transaction(name, mode), rq = fn(t.objectStore(name));
    t.oncomplete = () => res(rq && rq.result);
    t.onerror = t.onabort = () => rej(t.error);
  }));
  const table = name => ({
    get: k => op(name, 'readonly', s => s.get(k)),
    set: (k, v) => op(name, 'readwrite', s => s.put(v, k)),
    del: k => op(name, 'readwrite', s => s.delete(k)),
    clear: () => op(name, 'readwrite', s => s.clear())
  });
  const kv = table('kv'), blobs = table('blobs');

  const loadScript = (src, fast) => new Promise(res => {
    const s = document.createElement('script');
    s.src = src; s.async = false;
    let done = false;
    const end = () => { if (!done) { done = true; res(); } };
    s.onload = s.onerror = end;
    if (fast) setTimeout(end, 4500);
    document.body.append(s);
  });

  const PN = window.PN = { KEYS, clone, walk, mapStr, kv, blobs, store, unlocked, base: {}, draft: null, published: {}, stamp: 0, urls: {}, pathToId: {} };

  const apply = data => {
    KEYS.forEach(k => { if (data && data[k] !== undefined) S[k] = clone(data[k]); });
    if (data && data.creative) S.creativeLocked = true;
  };
  const refId = (s, pend) => (typeof s !== 'string' ? null : s.indexOf('idb:') === 0 ? s.slice(4) : (pend && pend[s]) || null);

  async function start() {
    /* 1 and 2: what you published */
    await loadScript('content.js?t=' + Math.floor(Date.now() / 60000), true);
    const pub = window.SITE_CONTENT || {};
    PN.published = clone(pub.data || {});
    PN.stamp = pub.stamp || 0;
    apply(PN.published);
    PN.base = {};
    KEYS.forEach(k => { if (S[k] !== undefined) PN.base[k] = clone(S[k]); });

    /* 3: the draft in this browser, only while unlocked */
    if (unlocked()) {
      try {
        let d = await kv.get('draft');
        if (d && d.pubStamp && PN.stamp >= d.pubStamp) {
          /* The published version has gone live, so the draft is no longer needed */
          await kv.del('draft'); await blobs.clear(); d = null;
        }
        if (d) {
          PN.draft = d;
          const pend = d.pending || {}, ids = new Set();
          walk(d.content || {}, s => { const id = refId(s, pend); if (id) ids.add(id); });
          for (const id of ids) {
            const b = await blobs.get(id);
            if (b) PN.urls[id] = URL.createObjectURL(b);
          }
          Object.keys(pend).forEach(p => { PN.pathToId[p] = pend[p]; });
          apply(mapStr(d.content || {}, s => { const id = refId(s, pend); return id && PN.urls[id] ? PN.urls[id] : s; }));
        }
      } catch (e) { PN.dbError = String(e && e.message || e); }
    }
  }

  /* The secret button and the code prompt */
  const CSS = '.pn-secret{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;margin:-8px -6px -8px 0;padding:0;border:0;border-radius:50%;background:transparent;color:inherit;cursor:default;opacity:.16;transition:opacity .25s,background .25s}' +
    '.pn-secret:hover,.pn-secret:focus-visible{opacity:.7;background:rgba(255,255,255,.1)}' +
    '.pn-secret i{width:6px;height:6px;border-radius:50%;background:currentColor}' +
    '.pn-gate{position:fixed;inset:0;z-index:2000;display:grid;place-items:center;padding:20px;background:rgba(5,5,7,.72);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}' +
    '.pn-gate[hidden]{display:none}' +
    '.pn-gbox{width:min(340px,100%);padding:28px 24px 22px;text-align:center;border-radius:24px;border:1px solid var(--line,rgba(255,255,255,.1));background:rgba(22,22,26,.92);box-shadow:0 30px 80px rgba(0,0,0,.6)}' +
    '.pn-gbox svg{color:var(--glow,#af795d);margin-bottom:10px}' +
    '.pn-gbox h2{font-size:20px;margin:0 0 4px}' +
    '.pn-gbox p{font-size:14px;color:var(--mut,#a1a1a6);margin:0 0 18px;min-height:21px}' +
    '.pn-gbox input{margin:0 auto;width:100%;text-align:center;letter-spacing:.7em;padding:14px 0 14px .7em;font-size:24px;border-radius:14px;border:1px solid var(--line,rgba(255,255,255,.1));background:rgba(255,255,255,.06);color:var(--tx,#fff);outline:none}' +
    '.pn-gbox input:focus{border-color:var(--glow,#af795d)}' +
    '.pn-gbox.bad{animation:pnshake .35s}' +
    '.pn-gbox.bad p{color:#ff7a7a}' +
    '.pn-gbox button{margin-top:14px;background:none;border:0;color:var(--mut,#a1a1a6);font:inherit;font-size:14px;cursor:pointer}' +
    '@keyframes pnshake{20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}';

  const sha = async s => {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
      return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
    }
    return null;
  };
  const fall = s => {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  };
  const correct = async code => { const s = SALT + code, a = await sha(s); return a ? a === H_SHA : fall(s) === H_FALL; };

  const lockInfo = () => { try { return JSON.parse(localStorage.getItem('pn_fail') || '{}'); } catch (e) { return {}; } };
  const setLock = o => { try { localStorage.setItem('pn_fail', JSON.stringify(o)); } catch (e) {} };

  let gateEl = null;
  function openGate() {
    if (unlocked()) { openEditor(); return; }
    if (!gateEl) {
      gateEl = document.createElement('div');
      gateEl.className = 'pn-gate'; gateEl.hidden = true;
      gateEl.innerHTML = '<div class="pn-gbox" role="dialog" aria-modal="true" aria-label="Private area">' +
        '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>' +
        '<h2>Private area</h2><p id="pnMsg">Enter your code</p>' +
        '<input id="pnCode" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" aria-label="Secret code">' +
        '<button type="button" id="pnCancel">Cancel</button></div>';
      document.body.append(gateEl);
      const box = gateEl.firstChild, inp = gateEl.querySelector('#pnCode'), msg = gateEl.querySelector('#pnMsg');
      const close = () => { gateEl.hidden = true; inp.value = ''; document.body.style.overflow = ''; };
      gateEl.querySelector('#pnCancel').addEventListener('click', close);
      gateEl.addEventListener('click', e => { if (e.target === gateEl) close(); });
      addEventListener('keydown', e => { if (e.key === 'Escape' && !gateEl.hidden) close(); });
      inp.addEventListener('input', async () => {
        inp.value = inp.value.replace(/\D/g, '');
        if (inp.value.length < 4) return;
        const li = lockInfo();
        if (li.until && Date.now() < li.until) {
          msg.textContent = 'Too many tries. Wait ' + Math.ceil((li.until - Date.now()) / 1000) + ' seconds.';
          inp.value = ''; return;
        }
        if (await correct(inp.value)) {
          setLock({});
          store.set('pn_admin', '1'); store.set('pn_open', '1');
          location.reload();
        } else {
          const n = (li.n || 0) + 1;
          setLock(n >= 5 ? { n: 0, until: Date.now() + 60000 } : { n });
          inp.value = '';
          msg.textContent = n >= 5 ? 'Too many tries. Wait a minute.' : 'Wrong code';
          box.classList.remove('bad'); void box.offsetWidth; box.classList.add('bad');
        }
      });
    }
    gateEl.querySelector('#pnMsg').textContent = 'Enter your code';
    gateEl.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => gateEl.querySelector('#pnCode').focus(), 50);
  }

  let adminLoaded = null;
  const loadAdmin = () => adminLoaded || (adminLoaded = loadScript('admin.js'));
  function openEditor() { loadAdmin().then(() => { if (window.PNAdmin) window.PNAdmin.open(); }); }
  PN.openGate = openGate;

  function addButton() {
    const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pn-secret'; b.setAttribute('aria-label', 'Private area');
    b.append(document.createElement('i'));
    b.addEventListener('click', openGate);
    const host = document.querySelector('.foot .row') || document.querySelector('.foot') || document.body;
    host.append(b);
  }

  (async () => {
    try { await start(); } catch (e) { /* the site must still load */ }
    try { addButton(); } catch (e) {}
    for (const src of next) await loadScript(src);
    if (unlocked()) {
      await loadAdmin();
      if (store.get('pn_open') === '1' && window.PNAdmin) { store.del('pn_open'); window.PNAdmin.open(); }
    }
  })();
})();
