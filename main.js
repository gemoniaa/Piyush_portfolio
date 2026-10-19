(() => {
  'use strict';
  const C = window.SITE;
  if (!C) return;
  const $ = s => document.querySelector(s);
  const root = document.documentElement;

  /* Email buttons open Gmail's compose window in a new tab */
  const gmail = (su, body) => 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(C.email) + (su ? '&su=' + encodeURIComponent(su) : '') + (body ? '&body=' + encodeURIComponent(body) : '');
  const add = (p, ...k) => { k.flat().forEach(c => { if (c) p.append(c); }); return p; };
  const el = (t, a = {}, ...k) => {
    const e = document.createElement(t);
    for (const n in a) {
      const v = a[n];
      if (v == null || v === false) continue;
      if (n === 'class') e.className = v;
      else if (n === 'text') e.textContent = v;
      else e.setAttribute(n, v);
    }
    return add(e, ...k);
  };
  const link = (href, label, cls) => href ? el('a', { class: cls || 'btn', href, target: '_blank', rel: 'noopener', text: label }) : null;
  const image = (src, alt, eager) => {
    const i = el('img', { src, alt: alt || '', loading: eager ? 'eager' : 'lazy', decoding: 'async' });
    i.addEventListener('error', () => i.classList.add('missing'));
    return i;
  };
  const watch = (n, fn) => {
    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver(es => es.forEach(e => fn(e.isIntersecting)), { rootMargin: '-42% 0px -42% 0px' }).observe(n);
  };

  /* Glow: the page light follows the colours of the photo on screen */
  const cache = new Map();
  const toneOf = o => {
    if (o.tone) return Promise.resolve(o.tone);
    if (o.video || !o.src) return Promise.resolve(null);
    if (!cache.has(o.src)) {
      cache.set(o.src, new Promise(res => {
        const im = new Image();
        im.onload = () => {
          try {
            const c = document.createElement('canvas');
            c.width = c.height = 16;
            const x = c.getContext('2d');
            x.drawImage(im, 0, 0, 16, 16);
            const d = x.getImageData(0, 0, 16, 16).data;
            let R = 0, G = 0, B = 0, W = 0;
            for (let p = 0; p < d.length; p += 4) {
              const w = Math.max(d[p], d[p + 1], d[p + 2]) - Math.min(d[p], d[p + 1], d[p + 2]) + 1;
              R += d[p] * w; G += d[p + 1] * w; B += d[p + 2] * w; W += w;
            }
            res('rgb(' + (R / W | 0) + ',' + (G / W | 0) + ',' + (B / W | 0) + ')');
          } catch (err) { res(null); }
        };
        im.onerror = () => res(null);
        im.src = o.src;
      }));
    }
    return cache.get(o.src);
  };
  const show = o => toneOf(o).then(c => { if (c) root.style.setProperty('--glow', c); });

  /* 3D tilt with glare, only on devices with a mouse */
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches && !matchMedia('(prefers-reduced-motion:reduce)').matches;
  const tilt = e => {
    if (!fine) return e;
    e.classList.add('tilt');
    e.addEventListener('pointermove', ev => {
      const b = e.getBoundingClientRect();
      const x = (ev.clientX - b.left) / b.width, y = (ev.clientY - b.top) / b.height;
      e.style.transform = 'perspective(1000px) rotateX(' + ((.5 - y) * 12) + 'deg) rotateY(' + ((x - .5) * 14) + 'deg)';
      e.style.setProperty('--mx', x * 100 + '%');
      e.style.setProperty('--my', y * 100 + '%');
    });
    e.addEventListener('pointerleave', () => { e.style.transform = ''; });
    return e;
  };

  /* Lightbox */
  const lb = $('#lb'), lbm = $('#lbm'), lbl = $('#lbl');
  let last = null;
  const openLB = o => {
    last = document.activeElement;
    lbm.replaceChildren(o.video ? el('video', { src: o.src, controls: '', playsinline: '' }) : el('img', { src: o.src, alt: o.title || '' }));
    $('#lbt').textContent = o.title || '';
    $('#lbd').textContent = o.caption || '';
    if (o.link) { lbl.href = o.link; lbl.textContent = o.linkLabel || 'View post'; lbl.hidden = false; } else lbl.hidden = true;
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    if (!o.video) show(o);
    $('#lbx').focus();
  };
  const closeLB = () => {
    lb.hidden = true;
    lbm.replaceChildren();
    document.body.style.overflow = '';
    if (last) last.focus();
  };
  $('#lbx').addEventListener('click', closeLB);
  lb.addEventListener('click', e => { if (e.target === lb) closeLB(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) closeLB(); });

  /* Hero */
  document.title = C.name + ' | ' + C.title;
  $('#name').setAttribute('data-dots', ''); if (window.PNdots) PNdots.set($('#name'), C.name); else $('#name').textContent = C.name;
  $('#title').textContent = C.title;
  $('#intro').textContent = C.intro;
  const hc = $('#heroCard');
  hc.append(image(C.hero.src, C.name, true));
  add($('#cta'),
    el('a', { class: 'btn pri', href: '#work', text: 'View my work' }),
    link(C.resume, 'Download resume'),
    link(C.links.github, 'GitHub'),
    link(C.links.linkedin, 'LinkedIn'),
    el('a', { class: 'btn', href: gmail(), target: '_blank', rel: 'noopener', text: 'Email' }),
    link(C.links.instagram, 'Instagram'));
  show(C.hero);
  document.querySelectorAll('[data-base]').forEach(s => watch(s, on => { if (on) show(C.hero); }));

  /* A browser-style frame on each project: a live preview of the site (on bigger screens) over a photo */
  const preview = p => {
    if (!p.shot && !p.embed) return null;
    const vp = el('div', { class: 'vp' });
    if (p.shot) vp.append(image(p.shot, p.title));
    if (p.embed && p.live && matchMedia('(min-width:761px)').matches && !matchMedia('(prefers-reduced-motion:reduce)').matches) {
      const go = () => {
        const f = el('iframe', { src: p.live, title: 'Preview of ' + p.title, tabindex: '-1', 'aria-hidden': 'true', loading: 'lazy' });
        const k = () => f.style.setProperty('--k', (vp.clientWidth / 1280).toFixed(4));
        k();
        addEventListener('resize', k);
        f.addEventListener('load', () => f.classList.add('on'));
        vp.append(f);
      };
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); go(); } }, { rootMargin: '300px' });
        io.observe(vp);
      } else go();
    }
    const host = (p.live || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    return add(el('div', { class: 'pv', 'aria-hidden': 'true' }),
      el('div', { class: 'bar' }, el('i'), el('i'), el('i'), el('span', { text: host })), vp);
  };

  /* Projects: big cards that stack on top of each other as you scroll (see scroll3d.js) */
  add($('#projects'), C.projects.map((p, i) => {
    const btns = [link(p.live, 'Live site', 'btn pri'), link(p.repo, 'GitHub'), link(p.post, 'View post')].filter(Boolean);
    const card = el('article', { class: 'card pcard', style: '--i:' + i });
    return add(card,
      el('span', { class: 'pn', text: String(i + 1).padStart(2, '0'), 'aria-hidden': 'true' }),
      add(el('div', { class: 'pb' }),
        el('h3', { text: p.title }),
        el('p', { class: 'meta', text: p.role }),
        el('p', { text: p.text }),
        add(el('div', { class: 'tags' }), p.tags.map(t => el('span', { class: 'tag', text: t }))),
        btns.length ? add(el('div', { class: 'row' }), btns) : null),
      preview(p));
  }));

  /* Education and languages */
  add($('#edu'), C.education.map(e => el('div', { class: 'card erow' + (e.logo ? '' : ' nl') },
    e.logo ? image(e.logo, e.place) : null,
    el('div', {}, el('b', { text: e.place }), el('span', { text: e.detail + ', ' + e.period })),
    el('div', { class: 'sc' }, e.score, el('small', { text: e.note })))));
  add($('#exp'), (C.experience || []).map(x => add(el('article', { class: 'card xrow' + (x.logo ? '' : ' nl') }),
    x.logo ? image(x.logo, x.org + ' logo') : null,
    add(el('div', { class: 'xb' }),
      el('h3', { text: x.role + ', ' + x.org }),
      el('p', { class: 'meta', text: x.period + ', ' + x.place }),
      el('p', { text: x.text }),
      add(el('div', { class: 'tags' }), x.skills.map(s => el('span', { class: 'tag', text: s })))))));
  add($('#langs'), C.languages.map(l => el('span', { class: 'tag', text: l.name + ': ' + l.level })));

  /* Certificates */
  add($('#certList'), C.certs.map(c => {
    const b = el('button', { class: 'imgbtn z', type: 'button', 'aria-label': 'View ' + c.title });
    b.append(image(c.img, c.title));
    b.addEventListener('click', () => openLB({ src: c.img, title: c.title, caption: c.issuer + ', ' + c.date, link: c.link }));
    return add(tilt(el('article', { class: 'card cert' })), b,
      el('h3', { class: 'z', text: c.title }),
      el('p', { class: 'meta z', text: c.issuer + ', ' + c.date }),
      c.note ? el('span', { class: 'tag z', text: c.note }) : null);
  }));

  /* Community and events */
  add($('#events'), C.events.map(ev => {
    const it = { src: ev.img, tone: ev.tone };
    const b = el('button', { class: 'imgbtn z', type: 'button', 'aria-label': 'View photo of ' + ev.title });
    b.append(image(ev.img, ev.title));
    b.addEventListener('click', () => openLB({ src: ev.img, title: ev.title, caption: ev.text, tone: ev.tone, link: ev.link }));
    const card = add(tilt(el('article', { class: 'card' })), b,
      el('h3', { class: 'z', text: ev.title }),
      el('p', { class: 'meta z', text: [ev.role, ev.date].filter(Boolean).join(', ') }),
      el('p', { class: 'z', text: ev.text }),
      ev.link ? add(el('div', { class: 'row z' }), link(ev.link, 'View LinkedIn post')) : null);
    card.addEventListener('pointerenter', () => show(it));
    watch(card, on => { if (on) show(it); });
    return card;
  }));

  /* 3D photo cylinder */
  const g = C.gallery || [];
  if (g.length < 3) {
    $('#gallery').hidden = true;
  } else {
    const wrap = $('#cylwrap'), ring = $('#ring'), n = g.length, step = 360 / n;
    g.forEach((it, i) => {
      const p = el('div', { class: 'p' });
      p.style.setProperty('--i', i);
      const im = image(it.src, it.title, true);
      im.draggable = false;
      ring.append(add(p, im));
    });
    const size = () => {
      const w = Math.min(190, wrap.clientWidth * .44);
      wrap.style.setProperty('--pw', w + 'px');
      wrap.style.setProperty('--ph', w * 1.35 + 'px');
      wrap.style.setProperty('--rad', (w / 2 / Math.tan(Math.PI / n) + 34) + 'px');
      wrap.style.setProperty('--step', step + 'deg');
    };
    size();
    addEventListener('resize', size);

    let a = 0, v = 0, tgt = null, drag = false, lx = 0, moved = 0, down = null, cur = -1, la = NaN, live = false;
    const apply = () => {
      ring.style.transform = 'translateZ(calc(var(--rad) * -1)) rotateY(' + a + 'deg)';
      const f = ((Math.round(-a / step) % n) + n) % n;
      if (f !== cur) {
        cur = f;
        [...ring.children].forEach((c, i) => c.classList.toggle('front', i === f));
        if (live) show(g[f]);
      }
    };
    const tick = () => {
      if (!drag) {
        if (tgt !== null) {
          a += (tgt - a) * .12;
          if (Math.abs(tgt - a) < .05) { a = tgt; tgt = null; }
        } else if (Math.abs(v) > .02) {
          a += v; v *= .94;
        } else {
          v = 0;
          const s = Math.round(a / step) * step;
          if (Math.abs(s - a) > .05) a += (s - a) * .1;
        }
      }
      if (a !== la) { la = a; apply(); }
      requestAnimationFrame(tick);
    };
    tick();

    wrap.addEventListener('pointerdown', e => {
      drag = true; moved = 0; lx = e.clientX; v = 0; tgt = null;
      down = e.target.closest('.p');
      wrap.setPointerCapture(e.pointerId);
      wrap.classList.add('grab');
    });
    wrap.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - lx;
      lx = e.clientX; moved += Math.abs(dx); a += dx * .35; v = dx * .35;
    });
    wrap.addEventListener('pointerup', () => {
      if (!drag) return;
      drag = false;
      wrap.classList.remove('grab');
      if (moved < 6 && down) {
        const it = g[[...ring.children].indexOf(down)];
        if (it) openLB(it);
      }
      down = null;
    });
    wrap.addEventListener('pointercancel', () => { drag = false; down = null; wrap.classList.remove('grab'); });
    const turn = d => { tgt = Math.round(a / step) * step + d * step; v = 0; };
    $('#prev').addEventListener('click', () => turn(1));
    $('#next').addEventListener('click', () => turn(-1));
    wrap.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); turn(1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); turn(-1); }
    });
    watch(wrap, on => { live = on; if (on && cur >= 0) show(g[cur]); });
    /* Scrolling past the ring gives it a push, so it spins as you go by */
    let ly = scrollY, near = false;
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { near = es[0].isIntersecting; }, { rootMargin: '10% 0px' }).observe(wrap);
    if (!matchMedia('(prefers-reduced-motion:reduce)').matches) addEventListener('scroll', () => {
      const dy = scrollY - ly; ly = scrollY;
      if (!near || drag) return;
      v += Math.max(-6, Math.min(6, dy * .04)); tgt = null;
    }, { passive: true });
  }

  /* Creative portfolio: only a doorway here, the work itself lives on creative.html */
  const cs = $('#cStack');
  const fillTeaser = () => {
    const works = C.creative || [];
    const pics = works.filter(w => w.type !== 'video').slice(0, 4);
    cs.replaceChildren();
    pics.forEach((w, i) => { const im = image(w.src, '', false); im.style.setProperty('--k', i); cs.append(im); });
    cs.hidden = !pics.length;
    $('#cCount').textContent = works.length ? works.length + ' pieces: posters, videos and brand work.' : 'Posters, videos and brand work.';
  };
  fillTeaser();
  if (window.creativeReady) window.creativeReady.then(fillTeaser);
  const drive = $('#driveBtn');
  if (C.links.drive) drive.href = C.links.drive; else drive.hidden = true;

  /* Contact */
  $('#mailText').textContent = 'Write to me at ' + C.email + '.';
  $('#copyMail').addEventListener('click', async e => {
    const b = e.currentTarget;
    try { await navigator.clipboard.writeText(C.email); b.textContent = 'Copied'; }
    catch (err) { b.textContent = 'Copy failed, use the form'; }
    setTimeout(() => { b.textContent = 'Copy email'; }, 2000);
  });
  add($('#social'), link(C.links.github, 'GitHub'), link(C.links.linkedin, 'LinkedIn'), link(C.links.instagram, 'Instagram'));
  const f = $('#cf');
  f.addEventListener('submit', e => {
    e.preventDefault();
    const d = new FormData(f);
    window.open(gmail('Message from ' + d.get('name'), d.get('message') + '\n\n' + d.get('from')), '_blank', 'noopener');
  });
  /* Phone dock: quick links along the bottom, like an app */
  const dk = el('nav', { class: 'dock', 'aria-label': 'Quick links' });
  [['top', 'Home', '.hero'], ['work', 'Projects', '#work'], ['certs', 'Certificates', '#certs'], ['gallery', 'Gallery', '#gallery'], ['contact', 'Contact', '#contact']].forEach(d => {
    const a = el('a', { href: '#' + d[0], text: d[1] });
    dk.append(a);
    const s = document.querySelector(d[2]);
    if (s) watch(s, on => { if (on) dk.querySelectorAll('a').forEach(x => x.classList.toggle('on', x === a)); });
  });
  document.body.append(dk);
  $('#yr').textContent = '\u00A9 ' + new Date().getFullYear() + ' ' + C.name;
})();
