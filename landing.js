(() => {
  'use strict';
  const C = window.SITE;
  if (!C) { location.replace('portfolio.html'); return; }
  const $ = s => document.querySelector(s);
  const root = document.documentElement;
  const rm = matchMedia('(prefers-reduced-motion:reduce)').matches;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);

  const S = 700;
  const world = $('#world'), floor = $('#floor'), hint = $('#hint');
  const items = [];
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt) e.textContent = txt; return e; };
  const put = (n, k, o) => {
    n.classList.add('it');
    n.style.setProperty('--z', -k * S + 'px');
    world.append(n);
    items.push(Object.assign({ n, z: -k * S, side: 0 }, o));
  };
  const text = (t, sub, big) => {
    const d = el('div', 'tx' + (big ? ' big' : ''));
    d.append(el('p', '', t));
    if (sub) d.append(el('span', '', sub));
    return d;
  };
  const cut = (src, cls) => {
    const d = el('div', 'co ' + (cls || ''));
    const i = new Image();
    i.src = src; i.alt = ''; i.draggable = false;
    d.append(i);
    return d;
  };

  /* The scene: text, cut-out photos and logo pop-outs spread along the depth of the page */
  const cuts = C.cutouts || [];
  const cc = (i, k, side) => { if (cuts[i]) put(cut(cuts[i].src), k, { side, tone: cuts[i].tone, pop: 1 }); };
  /* A logo sits just behind its text, slides out as the text comes up, and tucks back behind it as you pass.
     side = which side of the text, v = how high (-1) or low (1) beside the text.
     If the screen is too narrow to put it beside the text, it goes above or below the text instead. */
  const logoSet = (k, tx, list) => list.forEach((s, j) => {
    const img = new Image();
    img.src = s.src; img.alt = ''; img.draggable = false;
    const d = el('div', 'lg' + (s.cls ? ' ' + s.cls : ''));
    d.style.setProperty('--sz', s.sz || 1);
    d.append(img);
    put(d, k, { logo: s, tx, img, az: -k * S, ph: j * 2.1 + k, px: 0, py: 0 });
    d.style.setProperty('--z', (-k * S - 24 - j * 6) + 'px');
  });
  const tt = (t, sub, k) => { const n = text(t, sub); put(n, k); return n; };
  put(text(C.name, C.title, true), 0, { tone: C.hero.tone, first: 1 });
  cc(2, 0.95, -1);
  logoSet(1.9, tt('Websites and projects', 'MedFlow, Raghusons and more', 1.9), [
    { src: 'assets/logos/claude.png', side: -1, v: -.55, rot: -12, spin: -80, sz: 1 },
    { src: 'assets/logos/github.png', side: 1, v: .55, rot: 10, spin: 90, sz: .9 }
  ]);
  cc(0, 2.8, 1);
  logoSet(3.7, tt('Active in my college tech club', 'CHiPSET, Cloud 9 with Google, hackathons', 3.7), [
    { src: 'assets/logos/chipset-bulb.png', side: -1, v: -.6, rot: -8, spin: -70, sz: 1.1, cls: 'bulb' }
  ]);
  cc(1, 4.6, -1);
  logoSet(5.5, tt('Design and branding', 'Posters, video editing and brand work', 5.5), [
    { src: 'assets/logos/canva.png', side: -1, v: .55, rot: -9, spin: -100, sz: .95 },
    { src: 'assets/logos/capcut.png', side: 1, v: -.55, rot: 13, spin: 85, sz: .9 }
  ]);
  logoSet(6.6, tt('SRM Institute of Science and Technology', 'B.Tech, Computer Science and Engineering', 6.6), [
    { src: 'assets/logos/srm.png', top: 1, side: 1, v: -1, rot: -8, spin: 120, sz: 1.2, cls: 'seal' }
  ]);

  /* The ending: a 3D laptop opens, and its button takes you into the portfolio */
  const sc = C.screen || C.hero;
  const fin = el('div', 'fin');
  const stageL = el('div', 'lapStage'), zoom = el('div', 'lapZoom'), lap = el('div', 'lap'), hinge = el('div', 'hinge');
  const base = el('div', 'base');
  const lid = el('div', 'lid'), lf = el('div', 'lf'), scr = el('div', 'scr');
  const me = new Image(); me.src = sc.src; me.alt = ''; me.draggable = false;
  const enter = el('a', 'arc', 'See portfolio');
  enter.href = 'portfolio.html';
  enter.append(el('span', '', '\u2192'));
  enter.querySelector('span').style.cssText = 'font-size:1.1em;color:inherit';
  const sctx = el('div', 'sc');
  sctx.append(el('b', '', C.name), el('span', '', C.title), enter);
  scr.append(me, sctx);
  lf.append(scr);
  lid.append(lf, el('div', 'lb'));
  hinge.append(base, el('div', 'lip'), lid);
  lap.append(hinge); zoom.append(lap); stageL.append(zoom);
  const links = el('div', 'links');
  [['privacy.html', 'Privacy policy'], ['terms.html', 'Terms and conditions']].forEach(l => {
    const a = el('a', '', l[1]); a.href = l[0]; links.append(a);
  });
  fin.append(stageL, links);
  put(fin, 7.8, { fin: true, tone: sc.tone || C.hero.tone });
  const END = 7.8 * S;

  const stage = $('.scene');
  /* Measure each text block (without any 3D scaling) so its logos can sit clear of it */
  const measure = tx => {
    const c = tx.cloneNode(true);
    c.classList.remove('it');
    const m = el('div'); m.style.cssText = 'position:fixed;left:-9999px;top:0;visibility:hidden';
    m.append(c); document.body.append(m);
    const rg = document.createRange(); rg.selectNodeContents(c.querySelector('p'));
    const r = rg.getBoundingClientRect(), o = { w: r.width, h: c.offsetHeight };
    m.remove();
    return o;
  };
  const layout = () => {
    const w = stage.clientWidth || innerWidth, h = stage.clientHeight || innerHeight;
    root.style.setProperty('--vw', w / 100 + 'px');
    root.style.setProperty('--vh', h / 100 + 'px');
    const d = w < 640 ? w * .2 : Math.min(w * .27, 340);
    items.forEach(it => it.n.style.setProperty('--x', it.side * d + 'px'));
    const gap = Math.max(22, w * .02), edge = 12;
    items.forEach(it => {
      if (!it.logo) return;
      const t = it.tx.__m || (it.tx.__m = measure(it.tx)), tw = t.w, th = t.h;
      if (it.tx.__w !== w) { it.tx.__m = measure(it.tx); it.tx.__w = w; }
      const m = it.tx.__m;
      const L = Math.max(it.img.offsetWidth, it.img.offsetHeight) || 100;
      const g2 = gap + L * .2, sx = m.w / 2 + L / 2 + g2;
      const s = it.logo;
      if (s.top) {
        it.px = 0; it.py = -Math.min(m.h / 2 + L / 2 + g2, h / 2 - L / 2 - 64);
      } else if (sx + L / 2 <= w / 2 - edge) {
        it.px = s.side * sx; it.py = s.v * m.h / 2;
      } else {
        const sy = m.h / 2 + L / 2 + g2;
        it.px = s.side * Math.min(w * .2, m.w / 2);
        it.py = (s.v < 0 ? -1 : 1) * Math.min(sy, h / 2 - L / 2 - 24);
      }
    });
  };
  if (matchMedia('(pointer:coarse)').matches) hint.textContent = 'Swipe up to enter';
  layout();
  addEventListener('resize', () => { items.forEach(i => { if (i.tx) i.tx.__w = 0; }); layout(); });
  addEventListener('load', () => { items.forEach(i => { if (i.tx) i.tx.__w = 0; }); layout(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { items.forEach(i => { if (i.tx) i.tx.__w = 0; }); layout(); });
  addEventListener('orientationchange', () => setTimeout(() => { items.forEach(i => { if (i.tx) i.tx.__w = 0; }); layout(); }, 250));
  if (rm) $('.track').style.height = '100vh';

  /* Scroll drives how far the camera has travelled */
  let cur = 0, last = '', entering = false, vel = 0, lt = performance.now();
  const frame = () => {
    if (entering) { requestAnimationFrame(frame); return; }
    const h = root.scrollHeight - innerHeight;
    const target = rm ? 1 : (h > 0 ? Math.min(1, Math.max(0, scrollY / h)) : 1);
    const nt = performance.now(), dt = Math.min(50, nt - lt);
    lt = nt;
    if (rm) cur = target;
    else {
      /* The camera has a top speed (about one scene every 0.65 s), so a hard flick never skips past everything */
      const mx = dt / 650 / 7.8;
      const want = Math.max(-mx, Math.min(mx, (target - cur) * .1 * dt / 16.7));
      vel += (want - vel) * .2;
      cur = Math.min(1, Math.max(0, cur + vel));
      if (Math.abs(target - cur) < .0004 && Math.abs(vel) < .0002) { cur = target; vel = 0; }
    }
    const wz = cur * END;
    world.style.transform = 'translateZ(' + wz + 'px)';
    floor.style.backgroundPositionY = wz * .5 + 'px';
    const reveal = Math.min(1, cur / .02);
    if (!entering) {
      const o2 = Math.min(1, Math.max(0, (cur - .86) / .1)), eo = o2 * o2 * (3 - 2 * o2);
      fin.style.setProperty('--open', eo.toFixed(3));
      fin.classList.toggle('ready', eo > .92);
    }
    let best = null, bd = 1e9;
    const now = performance.now();
    const ss = v => { v = Math.min(1, Math.max(0, v)); return v * v * (3 - 2 * v); };
    items.forEach(it => {
      const dz = it.z + wz;
      let o;
      if (it.logo) {
        const dza = it.az + wz, g = ss((dza + 820) / 560) * (1 - ss((dza - 60) / 420));
        const st = it.n.style;
        st.setProperty('--lx', (it.px * g).toFixed(1) + 'px');
        st.setProperty('--ly', (it.py * g + Math.sin(now / 650 + it.ph) * 4 * g).toFixed(1) + 'px');
        st.setProperty('--lr', (it.logo.rot * g + it.logo.spin * (1 - g)).toFixed(1) + 'deg');
        st.setProperty('--ls', (.4 + .6 * g).toFixed(3));
        o = Math.min(1, g * 1.5) * reveal;
        st.opacity = o;
        st.visibility = o < .01 ? 'hidden' : 'visible';
        return;
      }
      if (dz < -850) o = 0;
      else if (dz < -300) o = Math.pow((dz + 850) / 550, 2);
      else if (dz < 150 || it.fin) o = 1;
      else o = Math.max(0, 1 - (dz - 150) / 450);
      if (!it.first && !it.fin) o *= reveal;
      it.n.style.opacity = o;
      it.n.style.visibility = o < .01 ? 'hidden' : 'visible';
      it.n.style.pointerEvents = it.fin && dz > -300 ? 'auto' : 'none';
      if (it.tone && Math.abs(dz) < bd) { bd = Math.abs(dz); best = it; }
    });
    const t = best && bd < 600 ? best.tone : C.hero.tone;
    if (t !== last) { last = t; root.style.setProperty('--glow', t); }
    hint.style.opacity = cur < .03 ? 1 : 0;
    requestAnimationFrame(frame);
  };
  frame();

  /* Press the button: the laptop straightens, we zoom into its screen while it fades out, and the portfolio fades in */
  enter.addEventListener('click', e => {
    if (entering) return;
    e.preventDefault();
    try { sessionStorage.setItem('pn_enter', '1'); } catch (x) {}
    if (rm || !lap.animate) { location.href = 'portfolio.html'; return; }
    entering = true;
    document.body.classList.add('go');
    const cs = n => getComputedStyle(n).transform;
    const flat = { duration: 650, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' };
    lap.animate([{ transform: cs(lap) }, { transform: 'rotateX(0deg)' }], flat);
    lid.animate([{ transform: cs(lid) }, { transform: 'rotateX(0deg)' }], flat);
    setTimeout(() => {
      const r = scr.getBoundingClientRect(), z = zoom.getBoundingClientRect();
      const k = Math.max(innerWidth / r.width, innerHeight / r.height) * 1.04;
      const ox = r.left + r.width / 2 - z.left, oy = r.top + r.height / 2 - z.top;
      zoom.style.transformOrigin = ox + 'px ' + oy + 'px';
      const tx = innerWidth / 2 - (r.left + r.width / 2), ty = innerHeight / 2 - (r.top + r.height / 2);
      const T = 1500;
      zoom.animate([
        { transform: 'none', opacity: 1, offset: 0 },
        { opacity: .92, offset: .4 },
        { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(' + k + ')', opacity: 0, offset: 1 }
      ], { duration: T, easing: 'cubic-bezier(.55,.05,.3,1)', fill: 'forwards' });
      stage.animate([{ opacity: 1 }, { opacity: 1, offset: .35 }, { opacity: 0 }], { duration: T, easing: 'ease-in', fill: 'forwards' });
      setTimeout(() => { location.href = 'portfolio.html'; }, T - 60);
    }, 620);
  });
  addEventListener('pageshow', e => {
    if (!e.persisted) return;
    entering = false; document.body.classList.remove('go');
    [zoom, lap, lid, stage].forEach(n => n.getAnimations().forEach(a => a.cancel()));
  });

  /* Loader: a search bar opens, "Who is Piyush Nandi?" types in, a cursor clicks the button, a white sweep opens the page */
  let seen = false;
  try { seen = !!sessionStorage.getItem('pn_seen'); } catch (e) { /* ignore */ }
  const K = seen ? .55 : 1;

  const loader = $('#load'), pill = $('#lpill'), txt = $('#ltxt'), go = $('#lgo'), ptr = $('#lcur'), sweep = $('#lsweep');
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    try { sessionStorage.setItem('pn_seen', '1'); } catch (e) { /* ignore */ }
    loader.classList.add('done');
    document.body.classList.remove('lock');
    setTimeout(() => loader.remove(), 1300);
  };
  if (rm) { finish(); return; }

  const urls = [C.hero.src, (C.screen || C.hero).src].concat(cuts.map(p => p.src));
  let loaded = 0, winLoaded = document.readyState === 'complete';
  urls.forEach(u => { const i = new Image(); i.onload = i.onerror = () => { loaded++; }; i.src = u; });
  addEventListener('load', () => { winLoaded = true; });
  const ready = () => loaded >= urls.length && winLoaded;

  const sleep = ms => new Promise(r => setTimeout(r, ms * K));
  const fx = (n, kf, o) => (n && n.animate) ? n.animate(kf, Object.assign({ fill: 'both' }, o)) : null;

  const run = async () => {
    await sleep(300);
    if (done) return;
    fx(pill, [{ clipPath: 'inset(0 50% 0 50% round 999px)', opacity: 1 }, { clipPath: 'inset(0 0 0 0 round 999px)', opacity: 1 }], { duration: 760 * K, easing: 'cubic-bezier(.6,0,.2,1)' });
    await sleep(560);
    fx(go, [{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1.12)', opacity: 1, offset: .7 }, { transform: 'scale(1)', opacity: 1 }], { duration: 480 * K, easing: 'ease-out' });
    await sleep(600);
    const msg = "Who is Piyush Nandi?";
    for (let i = 1; i <= msg.length; i++) {
      if (done) return;
      txt.textContent = msg.slice(0, i);
      await sleep(46 + Math.random() * 34);
    }
    await sleep(500);
    const t0 = performance.now();
    while (!ready() && !done && performance.now() - t0 < 5500) await new Promise(r => setTimeout(r, 80));
    if (done) return;
    /* the cursor travels to the button and clicks it */
    const r = go.getBoundingClientRect();
    const tx = r.left + r.width * .52, ty = r.top + r.height * .45;
    const sx = Math.min(innerWidth - 40, tx + innerWidth * .22), sy = Math.min(innerHeight - 40, ty + innerHeight * .26);
    const mx = (sx + tx) / 2 - 30, my = (sy + ty) / 2 + 36;
    fx(ptr, [
      { transform: 'translate(' + sx + 'px,' + sy + 'px)', opacity: 0 },
      { transform: 'translate(' + mx + 'px,' + my + 'px)', opacity: 1, offset: .45 },
      { transform: 'translate(' + tx + 'px,' + ty + 'px)', opacity: 1 }
    ], { duration: 900 * K, easing: 'cubic-bezier(.45,0,.2,1)' });
    await sleep(960);
    if (done) return;
    go.classList.add('hit');
    fx(go, [{ transform: 'scale(1)' }, { transform: 'scale(.86)', offset: .4 }, { transform: 'scale(1)' }], { duration: 300 * K });
    fx(ptr, [{ transform: 'translate(' + tx + 'px,' + ty + 'px) scale(1)' }, { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(.82)', offset: .4 }, { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(1)' }], { duration: 300 * K });
    await sleep(320);
    /* a white light sweeps in from the top right and opens the landing page */
    const d = 850 * K + 150, s0 = performance.now();
    sweep.style.opacity = 1;
    await new Promise(res => {
      const tick = now => {
        const u = Math.min(1, (now - s0) / d), e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        sweep.style.setProperty('--p', (-30 + e * 150).toFixed(1) + '%');
        if (u < 1) requestAnimationFrame(tick); else res();
      };
      requestAnimationFrame(tick);
    });
    finish();
  };
  run();
  setTimeout(finish, 12000);
})();
