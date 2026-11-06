/* The private editor. It only loads after the secret code was entered (see boot.js).
   Edits are saved as a draft in this browser straight away. "Publish" sends them to your GitHub
   repository in one commit, and your site (GitHub Pages or Vercel) updates by itself. */
(() => {
  'use strict';
  const PN = window.PN;
  if (!PN || window.PNAdmin) return;
  const { KEYS, clone, walk, mapStr, kv, blobs, store } = PN;
  const S = window.SITE;

  /* ---------- small helpers ---------- */
  const h = (tag, props, ...kids) => {
    const e = document.createElement(tag);
    for (const k in (props || {})) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'hidden') e[k] = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach(c => { if (c != null && c !== false) e.append(c); });
    return e;
  };
  const nice = s => { const t = String(s || '').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim(); return t.charAt(0).toUpperCase() + t.slice(1); };
  const slug = n => String(n || 'file').toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'file';
  const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  /* ---------- the working copy ---------- */
  const W = {};
  KEYS.forEach(k => {
    const dc = (PN.draft && PN.draft.content) || {};
    const v = dc[k] !== undefined ? dc[k] : PN.base[k];
    if (v !== undefined) W[k] = clone(v);
  });
  W.links = W.links || {};
  W.hero = W.hero || { src: '' };
  ['projects', 'experience', 'education', 'languages', 'certs', 'events', 'gallery', 'creative'].forEach(k => { W[k] = W[k] || []; });

  const idOf = s => (typeof s !== 'string' ? null : s.indexOf('idb:') === 0 ? s.slice(4) : PN.pathToId[s] || null);
  const src = s => { const id = idOf(s); return id && PN.urls[id] ? PN.urls[id] : (s || ''); };

  let changed = false, timer = 0;
  const dirtyKeys = () => KEYS.filter(k => W[k] !== undefined && !same(W[k], PN.base[k]));
  const unpublished = () => !!(PN.draft && PN.draft.content && Object.keys(PN.draft.content).length && !PN.draft.pubStamp);
  async function flush() {
    const keys = dirtyKeys();
    const pend = (PN.draft && PN.draft.pending) || {};
    if (!keys.length && !Object.keys(pend).length) { try { await kv.del('draft'); } catch (e) {} PN.draft = null; return; }
    const content = {};
    keys.forEach(k => { content[k] = clone(W[k]); });
    /* The "published" mark stays only while nothing has changed since publishing */
    const keep = PN.draft && PN.draft.pubStamp && same(PN.draft.content, content) ? PN.draft.pubStamp : null;
    PN.draft = { content, pending: pend, pubStamp: keep };
    try { await kv.set('draft', PN.draft); } catch (e) { toast('Could not save the draft in this browser: ' + (e.message || e)); }
  }
  const save = now => {
    changed = true;
    clearTimeout(timer);
    timer = setTimeout(() => { flush().then(status); }, now ? 0 : 350);
    status();
  };

  /* ---------- files ---------- */
  const loadImg = file => new Promise((res, rej) => {
    const u = URL.createObjectURL(file), i = new Image();
    i.onload = () => { URL.revokeObjectURL(u); res(i); };
    i.onerror = () => { URL.revokeObjectURL(u); rej(new Error('That image format is not supported. Use JPG, PNG or WebP.')); };
    i.src = u;
  });
  const extOf = f => { const m = /\.([a-z0-9]+)$/i.exec(f.name || ''); if (m) return m[1].toLowerCase(); const t = (f.type || '').split('/')[1] || 'bin'; return t.replace('jpeg', 'jpg').replace('quicktime', 'mov'); };
  const LIMITS = { photo: [1800, false], logo: [500, true], cutout: [1600, true] };
  async function prepare(file, kind) {
    const type = file.type || '';
    if (/^video\//.test(type) || type === 'application/pdf') return { blob: file, ext: extOf(file), w: 0, h: 0 };
    const img = await loadImg(file);
    const nw = img.naturalWidth, nh = img.naturalHeight;
    if (/svg|gif/.test(type)) return { blob: file, ext: extOf(file), w: nw, h: nh };
    const lim = LIMITS[kind] || LIMITS.photo, sc = Math.min(1, lim[0] / Math.max(nw, nh));
    const w = Math.round(nw * sc), hh = Math.round(nh * sc);
    if (sc === 1 && file.size < 700000 && /^image\/(jpeg|png|webp)$/.test(type)) return { blob: file, ext: extOf(file), w, h: hh };
    const c = document.createElement('canvas');
    c.width = w; c.height = hh;
    const x = c.getContext('2d');
    if (!lim[1]) { x.fillStyle = '#fff'; x.fillRect(0, 0, w, hh); }
    x.drawImage(img, 0, 0, w, hh);
    const blob = await new Promise(r => c.toBlob(r, lim[1] ? 'image/png' : 'image/jpeg', .86));
    if (!blob) throw new Error('Could not process that image.');
    return { blob, ext: lim[1] ? 'png' : 'jpg', w, h: hh };
  }
  async function addFile(file, kind) {
    const p = await prepare(file, kind);
    const id = rid() + '-' + slug(file.name) + '.' + p.ext;
    await blobs.set(id, p.blob);
    PN.urls[id] = URL.createObjectURL(p.blob);
    return { ref: 'idb:' + id, w: p.w, h: p.h, video: /^video\//.test(file.type || '') || /^(mp4|webm|mov|m4v)$/.test(p.ext), name: file.name, size: p.blob.size };
  }
  const pick = (accept, multiple) => new Promise(res => {
    const i = h('input', { type: 'file', accept, style: 'display:none' });
    i.multiple = !!multiple;
    i.addEventListener('change', () => { res(Array.from(i.files)); i.remove(); });
    i.addEventListener('cancel', () => { res([]); i.remove(); });
    document.body.append(i);
    i.click();
  });
  async function toast(msg, ms) {
    const t = h('div', { class: 'pn-toast', role: 'status', text: msg });
    document.body.append(t);
    setTimeout(() => t.remove(), ms || 4200);
  }

  /* ---------- form fields ---------- */
  const F = {
    text: (k, label, o) => Object.assign({ k, label, t: 'text' }, o),
    area: (k, label, o) => Object.assign({ k, label, t: 'area' }, o),
    url: (k, label, o) => Object.assign({ k, label, t: 'url' }, o),
    tags: (k, label, o) => Object.assign({ k, label, t: 'tags' }, o),
    img: (k, label, kind, o) => Object.assign({ k, label, t: 'image', kind: kind || 'photo' }, o),
    chk: (k, label) => ({ k, label, t: 'check' })
  };

  function field(obj, f, onChange) {
    const change = () => { onChange && onChange(); save(); };
    if (f.t === 'check') {
      return h('label', { class: 'pn-chk' }, h('input', { type: 'checkbox', checked: !!obj[f.k], onchange: e => { obj[f.k] = e.target.checked; change(); } }), f.label);
    }
    if (f.t === 'image' || f.t === 'pdf') {
      const box = h('div', { class: 'pn-img' });
      const render = () => {
        const v = obj[f.k];
        box.replaceChildren(
          f.t === 'image' ? (v ? h('img', { src: src(v), alt: '' }) : h('span', { class: 'pn-ph', text: 'No image' })) : h('span', { class: 'pn-file', text: v ? String(v).replace(/^idb:[^-]+-/, '') : 'No file' }),
          h('button', {
            type: 'button', class: 'pn-btn', text: v ? 'Replace' : 'Choose file',
            onclick: async () => {
              const fl = (await pick(f.t === 'pdf' ? 'application/pdf' : 'image/*'))[0];
              if (!fl) return;
              try { const r = await addFile(fl, f.kind); obj[f.k] = r.ref; if (f.resets) delete obj.tone; render(); change(); }
              catch (e) { toast(e.message || String(e)); }
            }
          }),
          v && !f.required ? h('button', { type: 'button', class: 'pn-btn ghost', text: 'Remove', onclick: () => { obj[f.k] = ''; if (f.resets) delete obj.tone; render(); change(); } }) : null);
      };
      render();
      return h('div', { class: 'pn-f' }, h('span', { class: 'pn-l', text: f.label }), box);
    }
    const val = f.t === 'tags' ? (obj[f.k] || []).join(', ') : (obj[f.k] || '');
    const on = e => { obj[f.k] = f.t === 'tags' ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : e.target.value; change(); };
    const input = f.t === 'area'
      ? h('textarea', { rows: f.rows || 3, value: val, oninput: on })
      : h('input', { type: f.t === 'url' ? 'url' : 'text', value: val, oninput: on, placeholder: f.ph || '', list: f.list || null, autocapitalize: f.t === 'url' ? 'none' : null });
    return h('label', { class: 'pn-f' }, f.label, input);
  }

  /* ---------- the lists ---------- */
  const SCHEMA = {
    projects: {
      label: 'Projects', one: 'project', end: true, title: i => i.title, thumb: 'shot',
      blank: () => ({ title: '', text: '', role: '', tags: [], live: '', repo: '', post: '', shot: '', embed: false }),
      fields: [F.text('title', 'Title'), F.area('text', 'Description'), F.text('role', 'Your role or a short note'), F.tags('tags', 'Tags, separated by commas'),
        F.url('live', 'Live site link', { ph: 'https://' }), F.url('repo', 'GitHub repository link', { ph: 'https://github.com/' }), F.url('post', 'Post link (LinkedIn, GitHub or any link)', { ph: 'https://' }),
        F.img('shot', 'Photo', 'photo', { resets: true }), F.chk('embed', 'Show a live preview of the site on large screens')]
    },
    experience: {
      label: 'Experience', one: 'role', title: i => [i.role, i.org].filter(Boolean).join(', '), thumb: 'logo',
      blank: () => ({ logo: '', role: '', org: '', period: '', place: '', text: '', skills: [] }),
      fields: [F.text('role', 'Role'), F.text('org', 'Organisation'), F.text('period', 'Period', { ph: 'September 2025 to present' }), F.text('place', 'Place'), F.area('text', 'What you did', { rows: 4 }), F.tags('skills', 'Skills, separated by commas'), F.img('logo', 'Logo', 'logo')]
    },
    education: {
      label: 'Education', one: 'school', title: i => i.place, thumb: 'logo',
      blank: () => ({ logo: '', place: '', detail: '', period: '', score: '', note: '' }),
      fields: [F.text('place', 'School or college'), F.text('detail', 'Course or class'), F.text('period', 'Years'), F.text('score', 'Score', { ph: 'CGPA 9.63' }), F.text('note', 'Note under the score'), F.img('logo', 'Logo', 'logo')]
    },
    languages: {
      label: 'Languages', one: 'language', end: true, title: i => i.name,
      blank: () => ({ name: '', level: '' }), fields: [F.text('name', 'Language'), F.text('level', 'Level')]
    },
    certs: {
      label: 'Certificates', one: 'certificate', title: i => i.title, thumb: 'img',
      bulk: { accept: 'image/*', field: 'img', kind: 'photo', title: 'title' },
      blank: () => ({ title: '', issuer: '', date: '', note: '', img: '', link: '' }),
      fields: [F.img('img', 'Certificate image', 'photo'), F.text('title', 'Title'), F.text('issuer', 'Issued by'), F.text('date', 'Date'), F.text('note', 'Short note', { ph: 'Participation, Finalist, Course completed' }), F.url('link', 'Link (optional)', { ph: 'https://' })]
    },
    events: {
      label: 'Posts and events', one: 'post', title: i => i.title, thumb: 'img',
      bulk: { accept: 'image/*', field: 'img', kind: 'photo', title: 'title' },
      blank: () => ({ title: '', role: '', text: '', date: '', img: '', link: '' }),
      fields: [F.img('img', 'Photo', 'photo', { resets: true }), F.text('title', 'Title'), F.text('role', 'Your role'), F.text('date', 'Date'), F.area('text', 'Description'), F.url('link', 'Post link (LinkedIn, GitHub or any link)', { ph: 'https://' })]
    },
    gallery: {
      label: 'Gallery', one: 'photo', title: i => i.title, thumb: 'src',
      bulk: { accept: 'image/*', field: 'src', kind: 'photo', title: 'title' },
      blank: () => ({ src: '', title: '', caption: '' }),
      fields: [F.img('src', 'Photo', 'photo', { resets: true }), F.text('title', 'Title'), F.text('caption', 'Caption (optional)')]
    },
    creative: {
      label: 'Creative portfolio', one: 'piece', title: i => i.title, thumb: 'src', media: true,
      bulk: { accept: 'image/*,video/*', field: 'src', kind: 'photo', title: 'title' },
      blank: () => ({ type: 'image', src: '', title: '', cat: '' }),
      fields: [F.text('title', 'Title'), F.text('cat', 'Category (the filter tab)', { list: 'pn-cats', ph: 'Posters, Videos, Branding' })]
    }
  };

  const open = new WeakSet();
  function thumbOf(it, sc) {
    if (!sc.thumb || !it[sc.thumb]) return h('span', { class: 'pn-tph' });
    const s = src(it[sc.thumb]);
    return it.type === 'video' ? h('video', { src: s + '#t=0.1', muted: true, preload: 'metadata' }) : h('img', { src: s, alt: '' });
  }

  function listPane(key) {
    const sc = SCHEMA[key], arr = W[key];
    const wrap = h('div', { class: 'pn-in' });
    const listEl = h('div', { class: 'pn-list' });
    const count = h('span', { class: 'pn-count' });
    const cats = h('datalist', { id: 'pn-cats' });
    let newCat = '';
    const updCats = () => { cats.replaceChildren(...[...new Set(W.creative.map(x => x.cat).filter(Boolean))].map(c => h('option', { value: c }))); };

    const render = () => {
      listEl.replaceChildren(...arr.map((it, i) => row(it, i)));
      count.textContent = arr.length + (arr.length === 1 ? ' ' + sc.one : ' ' + sc.one + 's');
      if (key === 'creative') updCats();
    };
    const mv = (i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; save(); render(); };
    function row(it, i) {
      const title = h('span', { class: 'pn-it', text: sc.title(it) || 'Untitled ' + sc.one });
      const body = h('div', { class: 'pn-ib', hidden: !open.has(it) });
      if (sc.media) {
        body.append(h('div', { class: 'pn-media' }, it.type === 'video' ? h('video', { src: src(it.src), controls: true, preload: 'metadata' }) : h('img', { src: src(it.src), alt: '' })));
      }
      sc.fields.forEach(f => body.append(field(it, f, () => { title.textContent = sc.title(it) || 'Untitled ' + sc.one; })));
      const head = h('div', { class: 'pn-ih', onclick: e => { if (e.target.closest('button')) return; body.hidden = !body.hidden; if (body.hidden) open.delete(it); else open.add(it); } },
        thumbOf(it, sc), title,
        h('button', { type: 'button', class: 'pn-ico', 'aria-label': 'Move up', text: '↑', onclick: () => mv(i, -1) }),
        h('button', { type: 'button', class: 'pn-ico', 'aria-label': 'Move down', text: '↓', onclick: () => mv(i, 1) }),
        h('button', { type: 'button', class: 'pn-ico del', 'aria-label': 'Delete', text: '×', onclick: () => { if (confirm('Delete "' + (sc.title(it) || 'this ' + sc.one) + '"?')) { arr.splice(i, 1); save(); render(); } } }));
      return h('div', { class: 'pn-item' }, head, body);
    }
    const addBlank = () => {
      const it = sc.blank();
      sc.end ? arr.push(it) : arr.unshift(it);
      open.add(it); save(); render();
      const n = listEl.children[sc.end ? arr.length - 1 : 0];
      if (n) n.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    const bar = h('div', { class: 'pn-bar2' });
    if (!sc.bulk) bar.append(h('button', { type: 'button', class: 'pn-btn pri', text: 'Add ' + sc.one, onclick: addBlank }));
    else {
      if (key === 'creative') bar.append(h('input', { class: 'pn-cat', type: 'text', placeholder: 'Category for new uploads', list: 'pn-cats', oninput: e => { newCat = e.target.value.trim(); } }));
      bar.append(
        h('button', { type: 'button', class: 'pn-btn pri', text: key === 'creative' ? 'Upload posters or videos' : 'Upload ' + (key === 'gallery' ? 'photos' : 'images'), onclick: async () => {
          const files = await pick(sc.bulk.accept, true);
          if (!files.length) return;
          toast('Adding ' + files.length + (files.length === 1 ? ' file' : ' files') + '…', 2500);
          let n = 0;
          for (const f of files.reverse()) {
            try {
              const r = await addFile(f, sc.bulk.kind);
              const it = sc.blank();
              it[sc.bulk.field] = r.ref;
              it[sc.bulk.title] = nice(f.name);
              if (key === 'creative') { it.type = r.video ? 'video' : 'image'; if (r.w && r.h && !r.video) { it.w = r.w; it.h = r.h; } if (newCat) it.cat = newCat; }
              if (r.video && r.size > 25 * 1048576) toast(f.name + ' is large (' + Math.round(r.size / 1048576) + ' MB). Under 25 MB loads faster.', 6000);
              arr.unshift(it); n++;
            } catch (e) { toast(f.name + ': ' + (e.message || e)); }
          }
          if (n) { save(); render(); }
        } }),
        h('button', { type: 'button', class: 'pn-btn', text: 'Add without a file', onclick: addBlank }));
    }
    bar.append(count);
    wrap.append(bar, listEl, cats);
    if (key === 'gallery') wrap.append(h('p', { class: 'pn-hint', text: 'The 3D ring needs at least 3 photos to show.' }));
    if (key === 'creative') wrap.append(h('p', { class: 'pn-hint', text: 'Items with the same category share a filter tab on the creative page. Posters and videos you add here are saved on your site as normal files when you publish.' }));
    render();
    return wrap;
  }

  /* ---------- Basics ---------- */
  function basicsPane() {
    const w = h('div', { class: 'pn-in pn-form' });
    const top = [F.text('name', 'Your name'), F.text('title', 'Headline under your name'), F.area('intro', 'Intro paragraph', { rows: 4 }), F.text('email', 'Email address')];
    top.forEach(f => w.append(field(W, f)));
    w.append(h('h3', { text: 'Links' }));
    [['github', 'GitHub'], ['linkedin', 'LinkedIn'], ['instagram', 'Instagram (leave empty to hide)'], ['drive', 'Google Drive folder']].forEach(([k, l]) => w.append(field(W.links, F.url(k, l, { ph: 'https://' }))));
    w.append(h('h3', { text: 'Files' }));
    w.append(field(W, { k: 'resume', label: 'Resume (PDF)', t: 'pdf', required: true }));
    w.append(field(W.hero, F.img('src', 'Main photo at the top of the portfolio (a cut-out PNG or WebP looks best)', 'cutout', { resets: true, required: true })));
    return w;
  }

  /* ---------- Publish ---------- */
  const CFG = 'pn_gh';
  const guessRepo = () => {
    if (S.repo) return S.repo;
    const m = location.hostname.match(/^(.+)\.github\.io$/i);
    if (!m) return '';
    const first = location.pathname.split('/')[1] || '';
    return m[1] + '/' + (first && !/\.html?$/i.test(first) ? first : m[1] + '.github.io');
  };
  const getCfg = () => { try { return JSON.parse(localStorage.getItem(CFG) || store.get(CFG) || '{}'); } catch (e) { return {}; } };
  const setCfg = (c, remember) => {
    const s = JSON.stringify(c);
    try { if (remember) { localStorage.setItem(CFG, s); store.del(CFG); } else { localStorage.removeItem(CFG); store.set(CFG, s); } } catch (e) {}
  };

  const explain = (st, m) => ({
    401: 'GitHub rejected the token. Check that it was copied completely and has not expired.',
    403: 'The token may not write to this repository. Give it "Contents: Read and write". GitHub says: ' + m,
    404: 'Repository not found, or the token has no access to it. Check the name is written owner/repository.'
  }[st] || (m || 'GitHub returned an error (' + st + ').'));
  async function gh(cfg, path) {
    const r = await fetch('https://api.github.com/repos/' + cfg.repo + path, { headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } });
    if (!r.ok) { let m = ''; try { m = (await r.json()).message; } catch (e) {} const e = new Error(explain(r.status, m)); e.status = r.status; throw e; }
    return r.json();
  }
  /* JSON bodies (creating blobs, trees and commits) */
  async function ghj(cfg, path, method, body) {
    const r = await fetch('https://api.github.com/repos/' + cfg.repo + path, { method, body: JSON.stringify(body), headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' } });
    if (!r.ok) { let m = ''; try { m = (await r.json()).message; } catch (e) {} const e = new Error(explain(r.status, m)); e.status = r.status; throw e; }
    return r.json();
  }
  const b64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
  const utf8b64 = s => { const b = new TextEncoder().encode(s); let t = ''; for (let i = 0; i < b.length; i += 8192) t += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); return btoa(t); };

  async function publish(cfg, log) {
    const base = 'Bearer ';
    log('Connecting to ' + cfg.repo + '…');
    const info = await gh(cfg, '');
    if (info.permissions && !info.permissions.push) throw new Error('This token can read the repository but not write to it.');
    const branch = cfg.branch || info.default_branch || 'main';

    /* What is already published (it may come from another device), then your changes on top */
    let remote = {};
    try {
      const r = await fetch('https://api.github.com/repos/' + cfg.repo + '/contents/content.js?ref=' + encodeURIComponent(branch), { headers: { Authorization: base + cfg.token, Accept: 'application/vnd.github.raw+json' } });
      if (r.ok) { const t = await r.text(); const a = t.indexOf('{', t.indexOf('SITE_CONTENT')), z = t.lastIndexOf('}'); remote = (JSON.parse(t.slice(a, z + 1)).data) || {}; }
    } catch (e) { remote = PN.published || {}; }
    await flush();
    const data = Object.assign({}, remote, clone((PN.draft && PN.draft.content) || {}));

    /* Files you picked in this browser become real files in the repository */
    const refs = new Map();
    walk(data, s => { const id = s.indexOf('idb:') === 0 ? s.slice(4) : null; if (id && !refs.has(id)) refs.set(id, 'assets/uploads/' + id); });
    const files = [];
    let n = 0;
    for (const [id, path] of refs) {
      const b = await blobs.get(id);
      if (!b) throw new Error('A picked file is missing from this browser (' + id + '). Open that item and choose the file again.');
      log('Uploading file ' + (++n) + ' of ' + refs.size + '…');
      const blob = await ghj(cfg, '/git/blobs', 'POST', { content: await b64(b), encoding: 'base64' });
      files.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const out = mapStr(data, s => (s.indexOf('idb:') === 0 && refs.has(s.slice(4)) ? refs.get(s.slice(4)) : s));
    const stamp = Date.now();
    const js = '/* Written by the private editor. It changes whenever you press Publish. You can leave it as it is. */\nwindow.SITE_CONTENT = ' + JSON.stringify({ stamp, data: out }, null, 1) + ';\n';
    const cblob = await ghj(cfg, '/git/blobs', 'POST', { content: utf8b64(js), encoding: 'base64' });
    files.push({ path: 'content.js', mode: '100644', type: 'blob', sha: cblob.sha });

    log('Saving to GitHub…');
    let done = false;
    for (let attempt = 0; attempt < 3 && !done; attempt++) {
      const ref = await gh(cfg, '/git/ref/heads/' + encodeURIComponent(branch));
      const parent = await gh(cfg, '/git/commits/' + ref.object.sha);
      const tree = await ghj(cfg, '/git/trees', 'POST', { base_tree: parent.tree.sha, tree: files });
      const commit = await ghj(cfg, '/git/commits', 'POST', { message: 'Update portfolio content from the private editor', tree: tree.sha, parents: [ref.object.sha] });
      try { await ghj(cfg, '/git/refs/heads/' + encodeURIComponent(branch), 'PATCH', { sha: commit.sha }); done = true; }
      catch (e) { if (e.status !== 422 && e.status !== 409) throw e; }
    }
    if (!done) throw new Error('GitHub changed while publishing. Press Publish again.');

    /* Keep showing your own files until the new version of the site is live */
    const pending = Object.assign({}, (PN.draft && PN.draft.pending) || {});
    refs.forEach((path, id) => { pending[path] = id; PN.pathToId[path] = id; });
    const remap = s => (s.indexOf('idb:') === 0 && refs.has(s.slice(4)) ? refs.get(s.slice(4)) : s);
    KEYS.forEach(k => { if (W[k] !== undefined) W[k] = mapStr(W[k], remap); });
    PN.draft = { content: clone(out), pending, pubStamp: stamp };
    await kv.set('draft', PN.draft);
    PN.published = out;
    changed = true;
    status();
  }

  function publishPane() {
    const w = h('div', { class: 'pn-in pn-form' });
    const c = getCfg();
    const repo = h('input', { type: 'text', value: c.repo || guessRepo(), placeholder: 'yourname/your-repository', autocapitalize: 'none', spellcheck: 'false' });
    const branch = h('input', { type: 'text', value: c.branch || '', placeholder: 'Leave empty to use the default branch', autocapitalize: 'none' });
    const token = h('input', { type: 'password', value: c.token || '', placeholder: 'github_pat_…', autocomplete: 'off' });
    const rem = h('input', { type: 'checkbox', checked: c.remember !== false });
    const logEl = h('pre', { class: 'pn-log', hidden: true });
    const log = m => { logEl.hidden = false; logEl.textContent = m; };
    const cfg = () => { const o = { repo: repo.value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, ''), branch: branch.value.trim(), token: token.value.trim(), remember: rem.checked }; setCfg(o, o.remember); return o; };
    const need = o => (!/^[^/\s]+\/[^/\s]+$/.test(o.repo) ? 'Enter the repository as owner/name.' : !o.token ? 'Paste your GitHub token first.' : '');

    const pubBtn = h('button', { type: 'button', class: 'pn-btn pri', text: 'Publish to my site' });
    pubBtn.addEventListener('click', async () => {
      const o = cfg(), bad = need(o);
      if (bad) { log(bad); return; }
      if (!dirtyKeys().length && !unpublished()) { log('Nothing new to publish.'); return; }
      pubBtn.disabled = true;
      try { await publish(o, log); log('Published. Your site updates in about a minute.\nThis device keeps showing your changes until then.'); toast('Published'); }
      catch (e) { log('Could not publish: ' + (e.message || e)); }
      pubBtn.disabled = false;
    });
    const testBtn = h('button', { type: 'button', class: 'pn-btn', text: 'Test connection' });
    testBtn.addEventListener('click', async () => {
      const o = cfg(), bad = need(o);
      if (bad) { log(bad); return; }
      try { const i = await gh(o, ''); log(i.permissions && !i.permissions.push ? 'Connected, but this token cannot write. Give it Contents: Read and write.' : 'Connected to ' + i.full_name + '. Ready to publish (branch ' + (o.branch || i.default_branch) + ').'); }
      catch (e) { log(e.message); }
    });

    w.append(
      h('p', { class: 'pn-hint', text: 'Your edits are already saved on this device. Publishing sends them to GitHub in a single commit, and your site (GitHub Pages or Vercel) rebuilds by itself within a minute.' }),
      h('label', { class: 'pn-f' }, 'GitHub repository', repo),
      h('label', { class: 'pn-f' }, 'Branch (optional)', branch),
      h('label', { class: 'pn-f' }, 'GitHub token', token),
      h('label', { class: 'pn-chk' }, rem, 'Remember the token on this device'),
      h('details', { class: 'pn-how' },
        h('summary', { text: 'How do I get a token? (one time per device)' }),
        h('ol', {},
          h('li', {}, 'Open ', h('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener', text: 'github.com/settings/personal-access-tokens/new' }), '.'),
          h('li', { text: 'Name it "portfolio editor" and set a long expiry.' }),
          h('li', { text: 'Under Repository access choose "Only select repositories" and pick your portfolio repository.' }),
          h('li', { text: 'Under Permissions, Repository permissions, set Contents to "Read and write".' }),
          h('li', { text: 'Create the token, copy it, and paste it above.' }))),
      h('div', { class: 'pn-row' }, pubBtn, testBtn),
      logEl,
      h('h3', { text: 'More' }),
      h('div', { class: 'pn-row' },
        h('button', { type: 'button', class: 'pn-btn', text: 'Download a backup', onclick: () => {
          const data = {}; KEYS.forEach(k => { if (W[k] !== undefined) data[k] = W[k]; });
          const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify({ saved: new Date().toISOString(), data }, null, 1)], { type: 'application/json' })), download: 'portfolio-backup.json' });
          document.body.append(a); a.click(); a.remove();
        } }),
        h('button', { type: 'button', class: 'pn-btn', text: 'Discard unpublished changes', onclick: async () => {
          if (!confirm('Throw away everything you changed on this device that is not published?')) return;
          try { await kv.del('draft'); await blobs.clear(); } catch (e) {}
          changed = false; location.reload();
        } }),
        h('button', { type: 'button', class: 'pn-btn', text: 'Lock private mode', onclick: () => { store.del('pn_admin'); location.reload(); } })));
    return w;
  }

  /* ---------- the editor window ---------- */
  const TABS = [['basics', 'Basics', basicsPane], ['projects', 'Projects'], ['experience', 'Experience'], ['education', 'Education'], ['languages', 'Languages'], ['certs', 'Certificates'], ['events', 'Posts and events'], ['gallery', 'Gallery'], ['creative', 'Creative'], ['publish', 'Publish', publishPane]];
  let ed = null, stat = null, bar = null, cur = 'basics';
  function status() {
    const n = dirtyKeys().length, live = !!(PN.draft && PN.draft.pubStamp), wait = n > 0 && !live;
    if (stat) stat.textContent = live ? 'Published, going live shortly' : wait ? 'Saved on this device · ' + n + (n === 1 ? ' section' : ' sections') + ' changed · not published yet' : 'No changes yet';
    if (bar) bar.classList.toggle('pending', wait);
  }
  function show(id) {
    cur = id;
    ed.querySelectorAll('.pn-tab').forEach(t => t.classList.toggle('on', t.dataset.id === id));
    const pane = ed.querySelector('.pn-pane');
    const t = TABS.find(x => x[0] === id);
    pane.replaceChildren(t[2] ? t[2]() : listPane(id));
    pane.scrollTop = 0;
  }
  function openEditor() {
    if (ed) return;
    ed = h('div', { class: 'pn-ed', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Private editor' });
    stat = h('span', { class: 'pn-stat' });
    ed.append(
      h('div', { class: 'pn-top' }, h('h2', { text: 'Private editor' }), stat, h('button', { type: 'button', class: 'pn-btn pri', text: 'Done', onclick: closeEditor })),
      h('div', { class: 'pn-body' },
        h('nav', { class: 'pn-tabs' }, TABS.map(t => h('button', { type: 'button', class: 'pn-tab', 'data-id': t[0], text: t[1], onclick: () => show(t[0]) }))),
        h('div', { class: 'pn-pane' })));
    document.body.append(ed);
    document.body.style.overflow = 'hidden';
    if (PN.dbError) toast('This browser blocks saving drafts (' + PN.dbError + '). Publish right after editing.', 7000);
    show(cur); status();
  }
  async function closeEditor() {
    clearTimeout(timer);
    await flush();
    ed.remove(); ed = null; stat = null;
    document.body.style.overflow = '';
    if (changed) location.reload();
  }
  addEventListener('keydown', e => { if (e.key === 'Escape' && ed) closeEditor(); });

  /* ---------- the little bar that shows while private mode is on ---------- */
  function addBar() {
    bar = h('div', { class: 'pn-pill' },
      h('i', { class: 'pn-live' }),
      h('span', { text: 'Private mode' }),
      h('button', { type: 'button', text: 'Edit', onclick: openEditor }),
      h('button', { type: 'button', text: 'Lock', onclick: () => { store.del('pn_admin'); location.reload(); } }));
    document.body.append(bar);
  }

  const CSS = `
.pn-pill{position:fixed;left:14px;bottom:14px;z-index:1400;display:flex;align-items:center;gap:6px;padding:6px 8px 6px 12px;border-radius:99px;border:1px solid var(--line,rgba(255,255,255,.1));background:rgba(20,20,24,.9);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);font-size:13px;color:var(--tx,#fff);box-shadow:0 10px 30px rgba(0,0,0,.45)}
.pn-pill button{border:0;border-radius:99px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer;background:rgba(255,255,255,.1);color:inherit}
.pn-pill button:first-of-type{background:var(--tx,#fff);color:#000}
.pn-live{width:8px;height:8px;border-radius:50%;background:#4ade80;box-shadow:0 0 10px #4ade80}
.pn-pill.pending .pn-live{background:#fbbf24;box-shadow:0 0 10px #fbbf24}
@media(max-width:760px){.pn-pill{bottom:74px}}
.pn-ed{position:fixed;inset:0;z-index:1500;display:flex;flex-direction:column;background:#0d0d10;color:var(--tx,#f5f5f7)}
.pn-top{display:flex;align-items:center;gap:12px;padding:12px max(16px,3vw);border-bottom:1px solid var(--line,rgba(255,255,255,.1))}
.pn-top h2{font-size:17px;margin:0;white-space:nowrap}
.pn-stat{flex:1;min-width:0;font-size:13px;color:var(--mut,#a1a1a6);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pn-body{flex:1;min-height:0;display:flex;flex-direction:column}
.pn-tabs{display:flex;gap:6px;overflow-x:auto;padding:10px 16px;border-bottom:1px solid var(--line,rgba(255,255,255,.1));scrollbar-width:none;flex:none}
.pn-tab{flex:none;text-align:left;border:0;border-radius:12px;padding:9px 14px;font:inherit;font-size:14px;color:var(--mut,#a1a1a6);background:transparent;cursor:pointer}
.pn-tab:hover{color:var(--tx,#fff);background:rgba(255,255,255,.06)}
.pn-tab.on{color:#000;background:var(--tx,#fff)}
.pn-pane{flex:1;overflow:auto;padding:22px max(16px,3vw) 90px;-webkit-overflow-scrolling:touch}
@media(min-width:820px){.pn-body{flex-direction:row}.pn-tabs{flex-direction:column;overflow:visible;width:220px;border-bottom:0;border-right:1px solid var(--line,rgba(255,255,255,.1));padding:16px 12px}}
.pn-in{max-width:760px;margin:0 auto}
.pn-form{display:grid;gap:14px}
.pn-form h3{margin:18px 0 0;font-size:16px}
.pn-f{display:grid;gap:0;font-size:14px;color:var(--mut,#a1a1a6)}
.pn-f input,.pn-f textarea{margin-top:6px}
.pn-l{margin-bottom:6px}
.pn-chk{display:flex;gap:10px;align-items:center;font-size:14px;color:var(--mut,#a1a1a6)}
.pn-chk input{width:auto;margin:0}
.pn-btn{display:inline-flex;align-items:center;justify-content:center;padding:9px 16px;border-radius:99px;border:1px solid var(--line,rgba(255,255,255,.1));background:rgba(255,255,255,.08);color:var(--tx,#fff);font:inherit;font-size:14px;cursor:pointer}
.pn-btn:hover{background:rgba(255,255,255,.16)}
.pn-btn.pri{background:var(--tx,#fff);color:#000;border-color:var(--tx,#fff)}
.pn-btn.pri:hover{background:#fff}
.pn-btn.ghost{background:transparent}
.pn-btn:disabled{opacity:.5;cursor:default}
.pn-row{display:flex;flex-wrap:wrap;gap:10px}
.pn-bar2{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:16px}
.pn-bar2 .pn-cat{width:auto;flex:1;min-width:170px;margin:0;padding:9px 14px;border-radius:99px;font-size:14px}
.pn-count{margin-left:auto;font-size:13px;color:var(--mut,#a1a1a6)}
.pn-item{border:1px solid var(--line,rgba(255,255,255,.1));border-radius:16px;background:var(--card,rgba(255,255,255,.055));margin-bottom:10px;overflow:hidden}
.pn-ih{display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer}
.pn-ih img,.pn-ih video,.pn-tph{width:44px;height:44px;border-radius:10px;object-fit:cover;background:#17171b;flex:none;display:block}
.pn-it{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pn-ico{flex:none;width:34px;height:34px;border-radius:50%;border:1px solid var(--line,rgba(255,255,255,.1));background:rgba(255,255,255,.06);color:var(--tx,#fff);font:inherit;font-size:16px;cursor:pointer}
.pn-ico:hover{background:rgba(255,255,255,.16)}
.pn-ico.del:hover{background:#7f1d1d}
.pn-ib{display:grid;gap:14px;padding:8px 14px 18px}
.pn-ib[hidden]{display:none}
.pn-media img,.pn-media video{max-width:100%;max-height:260px;border-radius:12px;display:block;margin:0 auto;background:#111}
.pn-img{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.pn-img img{width:84px;height:64px;object-fit:contain;border-radius:10px;background:#17171b}
.pn-ph,.pn-file{font-size:13px;color:var(--mut,#a1a1a6);max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pn-hint{font-size:13px;color:var(--mut,#a1a1a6);margin:10px 0}
.pn-how{font-size:14px;color:var(--mut,#a1a1a6)}
.pn-how summary{cursor:pointer;color:var(--tx,#fff)}
.pn-how ol{margin:10px 0 0 20px;display:grid;gap:4px}
.pn-log{white-space:pre-wrap;font:13px/1.5 ui-monospace,Menlo,monospace;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid var(--line,rgba(255,255,255,.1));color:var(--tx,#fff)}
.pn-log[hidden]{display:none}
.pn-toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:2100;max-width:min(92vw,460px);padding:11px 18px;border-radius:14px;background:#26262c;border:1px solid var(--line,rgba(255,255,255,.1));color:var(--tx,#fff);font-size:14px;box-shadow:0 14px 40px rgba(0,0,0,.5)}
`;
  const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);

  window.PNAdmin = { open: openEditor };
  addBar();
  status();
})();
