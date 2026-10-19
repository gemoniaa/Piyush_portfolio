/* Finds every photo and video in assets/creative/ on GitHub by itself, so you only have to upload files.
   It works on GitHub Pages addresses like yourname.github.io/repo-name.
   If your site uses its own domain, set  repo: "yourname/repo-name"  in config.js. */
(() => {
  'use strict';
  const C = window.SITE = window.SITE || {};
  const IMG = /\.(jpe?g|png|webp|gif|avif)$/i, VID = /\.(mp4|webm|mov|m4v)$/i;
  const nice = s => s.replace(/[-_]+/g, ' ').trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

  const where = () => {
    if (C.repo) return C.repo;
    const m = location.hostname.match(/^(.+)\.github\.io$/i);
    if (!m) return null;
    const first = location.pathname.split('/')[1] || '';
    return m[1] + '/' + (first && !/\.html?$/i.test(first) ? first : m[1] + '.github.io');
  };

  const build = (tree, titles) => {
    const files = tree.filter(n => n.type === 'blob' && n.path.indexOf('assets/creative/') === 0).map(n => n.path.slice('assets/creative/'.length))
      .filter(p => IMG.test(p) || VID.test(p)).sort(natural);
    const stems = {};
    files.forEach(p => { stems[p.replace(/\.[^./]+$/, '')] = (stems[p.replace(/\.[^./]+$/, '')] || []).concat(p); });
    const out = [];
    files.forEach(p => {
      const parts = p.split('/'), name = parts[parts.length - 1], stem = p.replace(/\.[^./]+$/, '');
      const src = 'assets/creative/' + parts.map(encodeURIComponent).join('/');
      const cat = parts.length > 1 ? nice(parts[0]) : '';
      const title = titles[name] || nice(name.replace(/\.[^.]+$/, ''));
      if (VID.test(p)) {
        const it = { type: 'video', src, title };
        const cover = (stems[stem] || []).find(q => IMG.test(q));
        if (cover) it.poster = 'assets/creative/' + cover.split('/').map(encodeURIComponent).join('/');
        if (cat) it.cat = cat;
        out.push(it);
      } else {
        if ((stems[stem] || []).some(q => VID.test(q))) return;
        const it = { type: 'image', src, title };
        if (cat) it.cat = cat;
        out.push(it);
      }
    });
    return out;
  };

  const merge = list => {
    const have = new Set((C.creative || []).map(x => decodeURIComponent(x.src)));
    C.creative = (C.creative || []).concat(list.filter(x => !have.has(decodeURIComponent(x.src))));
  };

  window.creativeReady = new Promise(done => {
    const repo = where();
    if (!repo || !window.fetch) { done(); return; }
    const key = 'pn_creative_' + repo;
    try {
      const c = JSON.parse(localStorage.getItem(key) || 'null');
      if (c && Date.now() - c.t < 120000) { merge(c.list); done(); return; }
    } catch (e) {}
    const stop = setTimeout(done, 5000);
    const get = async b => {
      const r = await fetch('https://api.github.com/repos/' + repo + '/git/trees/' + b + '?recursive=1');
      if (!r.ok) throw new Error(r.status);
      return r.json();
    };
    (async () => {
      let j = null;
      for (const b of [C.branch, 'main', 'master'].filter(Boolean)) { try { j = await get(b); break; } catch (e) {} }
      if (!j || !j.tree) throw new Error('no tree');
      const titles = {};
      try {
        const t = await (await fetch('assets/creative/titles.txt', { cache: 'no-cache' })).text();
        t.split('\n').forEach(l => { const i = l.indexOf('='); if (i > 0 && l.trim()[0] !== '#') titles[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
      } catch (e) {}
      const list = build(j.tree, titles);
      try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), list })); } catch (e) {}
      merge(list);
    })().catch(() => {
      try { const c = JSON.parse(localStorage.getItem(key) || 'null'); if (c) merge(c.list); } catch (e) {}
    }).then(() => { clearTimeout(stop); done(); });
  });
})();
