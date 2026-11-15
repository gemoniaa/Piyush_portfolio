/* The hanging objects at the end of the portfolio page.
   A cable bundle hangs from a rope. A CCTV camera, a watch and a laptop swing below it on threads.
   Move the mouse through the threads, click an object, or just scroll, and they swing.

   Plain WebGL2, no library. The models are in assets/hang/ (textures already shrunk).
   Change the look in the OBJECTS list below. If WebGL is missing the whole section removes itself. */
(() => {
  'use strict';

  /* ---------- small matrix helpers (column-major, like WebGL) ---------- */
  const M4 = {
    id: () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
    mul(a, b) {
      const o = new Float32Array(16);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s;
      }
      return o;
    },
    T: (x, y, z) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]),
    S: s => new Float32Array([s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1]),
    Rx: a => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); },
    Ry: a => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); },
    Rz: a => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); },
    persp(fov, asp, n, f) {
      const t = 1 / Math.tan(fov / 2), o = new Float32Array(16);
      o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o;
    },
    fromNode(n) {
      if (n.matrix) return new Float32Array(n.matrix);
      let m = M4.id();
      if (n.scale) m = M4.mul(new Float32Array([n.scale[0], 0, 0, 0, 0, n.scale[1], 0, 0, 0, 0, n.scale[2], 0, 0, 0, 0, 1]), m);
      if (n.rotation) {
        const [x, y, z, w] = n.rotation;
        const R = new Float32Array([
          1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0,
          2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0,
          2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0, 0, 0, 0, 1]);
        m = M4.mul(R, m);
      }
      if (n.translation) m = M4.mul(M4.T(...n.translation), m);
      return m;
    },
    pt(m, x, y, z) { return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]]; }
  };

  /* ---------- shaders ---------- */
  const VS = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec2 aT;
uniform mat4 uM, uVP; out vec3 vW; out vec3 vN; out vec2 vT;
void main(){ vec4 w=uM*vec4(aP,1.); vW=w.xyz; vN=mat3(uM)*aN; vT=aT; gl_Position=uVP*w; }`;
  const FS = `#version 300 es
precision highp float;
in vec3 vW; in vec3 vN; in vec2 vT; out vec4 o;
uniform sampler2D uTex, uEm;
uniform vec4 uBase; uniform vec3 uEmis, uCam;
uniform int uHasTex, uHasEm;
uniform float uMetal, uRough, uCut, uBright;
vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
vec3 env(vec3 r){
  float up = r.y*.5+.5;
  vec3 c = mix(vec3(.03,.028,.032), vec3(.3,.28,.29), smoothstep(0.,1.,up));
  c += vec3(1.,.8,.55)*pow(max(dot(r,normalize(vec3(-.5,.7,.6))),0.),12.)*1.7;
  c += vec3(.45,.7,1.)*pow(max(dot(r,normalize(vec3(.9,.1,.2))),0.),8.)*.9;
  return c;
}
void main(){
  vec4 b = uBase;
  if(uHasTex==1){ vec4 t = texture(uTex,vT); b.rgb *= lin(t.rgb); b.a *= t.a; }
  if(uCut>0. && b.a<uCut) discard;
  vec3 N = normalize(vN); if(!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCam - vW);
  vec3 L1 = normalize(vec3(-.5,.7,.7)), L2 = normalize(vec3(.9,.15,.3));
  float d1 = max(dot(N,L1),0.), d2 = max(dot(N,L2),0.);
  vec3 amb = mix(vec3(.06,.055,.06), vec3(.26,.24,.25), N.y*.5+.5);
  vec3 dif = amb + vec3(1.,.84,.66)*d1*1.05 + vec3(.5,.7,1.)*d2*.45;
  vec3 col = b.rgb*dif*(1.-uMetal*.7);
  vec3 R = reflect(-V,N);
  float fr = pow(1.-max(dot(N,V),0.),4.);
  float F = mix(.05,.85,uMetal)*(1.-uRough*.55) + fr*.25;
  col += env(R)*F*mix(vec3(1.),b.rgb,uMetal);
  vec3 H = normalize(L1+V);
  col += vec3(1.,.9,.75)*pow(max(dot(N,H),0.), mix(90.,10.,uRough))*(1.-uRough)*.6;
  if(uHasEm==1) col += lin(texture(uEm,vT).rgb)*uEmis; else col += uEmis;
  col *= uBright;
  col = pow(col, vec3(1./2.2));
  o = vec4(col*b.a, b.a);
}`;

  /* ---------- the objects and how they hang (edit here) ---------- */
  /* rot: turns the model so its front faces the viewer. h: height in world units.
     from: which end of the cross bar the thread is tied to. len: thread length. z: depth. */
  const THREAD = [1.0, 0.8, 0.55];
  const OBJECTS = [
    { key: 'cctv',   file: 'cctv.glb',   from: 'L', len: 0.8,  h: 1.4,  z: -0.2, rot: [0, 0, 0], look: true,  thread: THREAD },
    { key: 'watch',  file: 'watch.glb',  from: 'M', len: 1.4,  h: 1.55, z: 0.3,  rot: [0, 0, 0], spin: true,  thread: THREAD },
    { key: 'laptop', file: 'laptop.glb', from: 'R', len: 1.0,  h: 0.95, z: -0.2, rot: [0, -Math.PI / 2, 0],  thread: THREAD }
  ];
  const BUNDLE = { file: 'cable.glb', w: 1.7, rot: [Math.PI / 2, 0, 0] };

  window.__HangEngine = { M4, loadGLB, fitMatrix, VS, FS };
  const sec = document.getElementById('hang');
  if (!sec) return;
  const cv = sec.querySelector('canvas');
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const BASE = 'assets/hang/';

  /* ---------- GLB loader ---------- */
  async function loadGLB(gl, url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('missing ' + url);
    const buf = await res.arrayBuffer();
    const dv = new DataView(buf);
    let off = 12;
    const jl = dv.getUint32(off, true); off += 8;
    const j = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, off, jl))); off += jl;
    off += 8;
    const bin = new Uint8Array(buf, off);
    const bvOf = i => { const v = j.bufferViews[i], o = v.byteOffset || 0; return bin.subarray(o, o + v.byteLength); };

    /* textures */
    const smp = j.samplers || [];
    const imgs = await Promise.all((j.images || []).map(im =>
      createImageBitmap(new Blob([bvOf(im.bufferView)], { type: im.mimeType }), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' })));
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    const texs = (j.textures || []).map(t => {
      const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[t.source]);
      gl.generateMipmap(gl.TEXTURE_2D);
      const s = smp[t.sampler] || {};
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, s.wrapS || gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, s.wrapT || gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 4);
      return tx;
    });

    /* materials */
    const mats = (j.materials || [{}]).map(m => {
      const p = m.pbrMetallicRoughness || {};
      return {
        base: p.baseColorFactor || [1, 1, 1, 1],
        tex: p.baseColorTexture ? texs[p.baseColorTexture.index] : null,
        emis: m.emissiveFactor || [0, 0, 0],
        emTex: m.emissiveTexture ? texs[m.emissiveTexture.index] : null,
        metal: Math.min(0.85, p.metallicFactor == null ? 0.2 : p.metallicFactor),
        rough: p.roughnessFactor == null ? 0.6 : p.roughnessFactor,
        blend: m.alphaMode === 'BLEND', cut: m.alphaMode === 'MASK' ? (m.alphaCutoff == null ? 0.5 : m.alphaCutoff) : 0
      };
    });

    /* buffers */
    const glbuf = {};
    const arr = i => glbuf[i] || (glbuf[i] = (() => {
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, bvOf(i), gl.STATIC_DRAW); return b;
    })());
    const idxb = {};
    const eli = i => idxb[i] || (idxb[i] = (() => {
      const b = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, bvOf(i), gl.STATIC_DRAW); return b;
    })());
    const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

    const draws = [], bmin = [1e9, 1e9, 1e9], bmax = [-1e9, -1e9, -1e9];
    const walk = (i, pm) => {
      const n = j.nodes[i], m = M4.mul(pm, M4.fromNode(n));
      if (n.mesh != null) for (const pr of j.meshes[n.mesh].primitives) {
        if (pr.mode != null && pr.mode !== 4) continue;
        const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
        const bind = (loc, ai, dflt) => {
          if (ai == null) { gl.disableVertexAttribArray(loc); gl.vertexAttrib3f(loc, ...dflt); return; }
          const a = j.accessors[ai], bv = j.bufferViews[a.bufferView];
          gl.bindBuffer(gl.ARRAY_BUFFER, arr(a.bufferView));
          gl.enableVertexAttribArray(loc);
          gl.vertexAttribPointer(loc, NC[a.type], a.componentType, !!a.normalized, bv.byteStride || 0, a.byteOffset || 0);
        };
        bind(0, pr.attributes.POSITION, [0, 0, 0]); bind(1, pr.attributes.NORMAL, [0, 0, 1]); bind(2, pr.attributes.TEXCOORD_0, [0, 0, 0]);
        const d = { vao, mat: mats[pr.material == null ? 0 : pr.material] || mats[0], m };
        if (pr.indices != null) {
          const a = j.accessors[pr.indices];
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, eli(a.bufferView));
          d.count = a.count; d.type = a.componentType; d.off = a.byteOffset || 0;
        } else d.count = j.accessors[pr.attributes.POSITION].count;
        draws.push(d);
        const pa = j.accessors[pr.attributes.POSITION];
        for (let c = 0; c < 8; c++) {
          const q = M4.pt(m, c & 1 ? pa.max[0] : pa.min[0], c & 2 ? pa.max[1] : pa.min[1], c & 4 ? pa.max[2] : pa.min[2]);
          for (let k = 0; k < 3; k++) { bmin[k] = Math.min(bmin[k], q[k]); bmax[k] = Math.max(bmax[k], q[k]); }
        }
      }
      (n.children || []).forEach(c => walk(c, m));
    };
    (j.scenes[j.scene || 0].nodes).forEach(i => walk(i, M4.id()));
    gl.bindVertexArray(null);
    return { draws, bmin, bmax };
  }

  /* Matrix that turns a model to face the viewer, scales it to a height, and puts its top centre at (0,0,0) */
  function fitMatrix(model, rot, h, anchor) {
    const R = M4.mul(M4.Rz(rot[2]), M4.mul(M4.Ry(rot[1]), M4.Rx(rot[0])));
    const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (let c = 0; c < 8; c++) {
      const q = M4.pt(R, c & 1 ? model.bmax[0] : model.bmin[0], c & 2 ? model.bmax[1] : model.bmin[1], c & 4 ? model.bmax[2] : model.bmin[2]);
      for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], q[k]); hi[k] = Math.max(hi[k], q[k]); }
    }
    const s = h / (hi[1] - lo[1]);
    const top = anchor === 'center' ? (lo[1] + hi[1]) / 2 : hi[1];
    return { m: M4.mul(M4.S(s), M4.mul(M4.T(-(lo[0] + hi[0]) / 2, -top, -(lo[2] + hi[2]) / 2), R)), s, w: (hi[0] - lo[0]) * s, h: (hi[1] - lo[1]) * s };
  }

  const gl = cv && cv.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true });
  if (!gl) { sec.remove(); return; }

  function prog() {
    const mk = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  let P, U = {};
  try {
    P = prog();
    ['uM', 'uVP', 'uTex', 'uEm', 'uBase', 'uEmis', 'uCam', 'uHasTex', 'uHasEm', 'uMetal', 'uRough', 'uCut', 'uBright'].forEach(n => { U[n] = gl.getUniformLocation(P, n); });
  } catch (e) { sec.remove(); return; }

  /* ---------- rope meshes (a tube along a chain of points, rebuilt every frame) ---------- */
  const SIDES = 8;
  function makeRope(ids, radius, color, metal, rough) {
    const samples = (ids.length - 1) * 4 + 1, vcount = samples * SIDES;
    const pos = new Float32Array(vcount * 6);
    const idx = new Uint16Array((samples - 1) * SIDES * 6);
    let q = 0;
    for (let s = 0; s < samples - 1; s++) for (let k = 0; k < SIDES; k++) {
      const a = s * SIDES + k, b = s * SIDES + (k + 1) % SIDES, c = a + SIDES, d = b + SIDES;
      idx.set([a, c, b, b, c, d], q); q += 6;
    }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, pos.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    gl.disableVertexAttribArray(2); gl.vertexAttrib2f(2, 0, 0);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { ids, radius, color, metal, rough, samples, pos, vb, vao, n: idx.length };
  }
  function updateRope(r, pts, z) {
    const ps = r.ids.map(i => pts[i]), n = ps.length, out = r.pos;
    const get = i => ps[Math.max(0, Math.min(n - 1, i))];
    for (let s = 0; s < r.samples; s++) {
      const u = s / 4, i = Math.floor(u), f = u - i;
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2), ff = f * f, fff = ff * f;
      const cr = k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * f + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * ff + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * fff);
      const x = cr('x'), y = cr('y');
      const tx = 0.5 * ((-p0.x + p2.x) + 2 * (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * f + 3 * (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * ff);
      const ty = 0.5 * ((-p0.y + p2.y) + 2 * (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * f + 3 * (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * ff);
      let l = Math.hypot(tx, ty) || 1; const nx = -ty / l, ny = tx / l;
      for (let k = 0; k < SIDES; k++) {
        const a = k / SIDES * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), o = (s * SIDES + k) * 6;
        const dx = nx * c, dy = ny * c, dz = sn;
        out[o] = x + dx * r.radius; out[o + 1] = y + dy * r.radius; out[o + 2] = z + dz * r.radius;
        out[o + 3] = dx; out[o + 4] = dy; out[o + 5] = dz;
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, r.vb); gl.bufferSubData(gl.ARRAY_BUFFER, 0, out);
  }

  /* ---------- physics: points joined by fixed-length links (Verlet) ---------- */
  const clamp = (v, m) => Math.max(-m, Math.min(m, v));
  const pts = [], links = [];
  const addP = (x, y, w) => { pts.push({ x, y, px: x, py: y, w }); return pts.length - 1; };
  const link = (a, b, len) => links.push([a, b, len == null ? Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y) : len]);
  const chain = (from, to, n, w) => {   /* n new points between two existing ones */
    const ids = [from], a = pts[from], b = pts[to];
    for (let i = 1; i <= n; i++) { const f = i / (n + 1); ids.push(addP(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, w)); }
    ids.push(to); for (let i = 0; i < ids.length - 1; i++) link(ids[i], ids[i + 1]); return ids;
  };

  const TOP = 3.9, BAR = 1.15;
  const iA = addP(0, TOP, 0);
  const iT = addP(0, 1.95, 0.9);
  const mainIds = chain(iA, iT, 7, 1);
  const iL = addP(-BAR, 1.0, 0.5), iM = addP(0, 1.0, 0.5), iR = addP(BAR, 1.0, 0.5);
  link(iL, iM); link(iM, iR); link(iL, iR); link(iT, iL); link(iT, iM); link(iT, iR);
  const hubOf = { L: iL, M: iM, R: iR };

  const objs = OBJECTS.map(o => {
    const from = hubOf[o.from], a = pts[from];
    const iE = addP(a.x, a.y - o.len, 0.22);
    const ids = chain(from, iE, 4, 1);
    return Object.assign({ ids, end: iE, ang: 0, vang: 0, yaw: 0, model: null, fit: null }, o);
  });
  const bar = { L: iL, R: iR };

  const ropes = [
    makeRope(mainIds, 0.034, [0.05, 0.05, 0.055], 0.3, 0.55),
    makeRope([iT, iL], 0.011, THREAD, 0, 0.9),
    makeRope([iT, iM], 0.011, THREAD, 0, 0.9),
    makeRope([iT, iR], 0.011, THREAD, 0, 0.9),
    makeRope([iL, iM, iR], 0.02, [0.05, 0.05, 0.055], 0.3, 0.55)
  ];
  objs.forEach(o => ropes.push(makeRope(o.ids, 0.011, o.thread, 0, 0.9)));

  /* ---------- state ---------- */
  let bundle = null, ready = false, visible = false, kicked = false;
  let W = 1, Hh = 1, VH = 6.2, VW = 6, D = 10, camX = 0, camY = 0;
  const FOV = 30 * Math.PI / 180;
  const mouse = { x: 0, y: 0, vx: 0, vy: 0, on: false, t: 0 };
  let t = 0, acc = 0, last = 0, raf = 0, scrollY0 = scrollY;
  const chips = {};
  sec.querySelectorAll('[data-for]').forEach(c => { chips[c.dataset.for] = c; });

  function resize() {
    const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width)); Hh = Math.max(1, Math.round(r.height));
    cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr);
    const asp = W / Hh;
    VH = 6.2; VW = VH * asp;
    if (VW < 4.6) { VW = 4.6; VH = VW / asp; }
    D = (VH / 2) / Math.tan(FOV / 2);
    camY = W >= 900 ? 0 : -0.35;   /* phones: lift everything to leave room for the words underneath */
    camX = W >= 900 ? -0.17 * VW : 0;   /* wide screens: the objects sit right of centre, the words on the left */
  }
  const toWorld = (cx, cy) => { const r = cv.getBoundingClientRect(); return [((cx - r.left) / r.width - 0.5) * VW + camX, (0.5 - (cy - r.top) / r.height) * VH + camY]; };
  const toScreen = (x, y) => [((x - camX) / VW + 0.5) * W, (0.5 - (y - camY) / VH) * Hh];

  /* ---------- physics step ---------- */
  function kick(amount) {
    pts.forEach(p => { if (p.w) { const k = (TOP - p.y) / TOP; p.px = p.x - amount * k; } });
  }
  function step(h) {
    const g = 11, wind = (0.55 * Math.sin(t * 0.55) + 0.35 * Math.sin(t * 1.27 + 1.3)) * (reduce ? 0 : 1);
    for (const p of pts) {
      if (!p.w) continue;
      const vx = clamp((p.x - p.px) * 0.9965, 0.022), vy = clamp((p.y - p.py) * 0.9965, 0.022);   /* a little air drag, and a speed limit so nothing can go wild */
      const k = Math.max(0, (TOP - p.y) / TOP);
      p.px = p.x; p.py = p.y;
      p.x += vx + wind * k * h * h; p.y += vy - g * h * h;
    }
    for (let it = 0; it < 14; it++) for (const [a, b, len] of links) {
      const A = pts[a], B = pts[b], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1e-6, ws = A.w + B.w;
      if (!ws) continue;
      const diff = (d - len) / d;
      A.x += dx * diff * A.w / ws; A.y += dy * diff * A.w / ws;
      B.x -= dx * diff * B.w / ws; B.y -= dy * diff * B.w / ws;
    }
    /* objects: angle follows the thread with a little springy lag */
    for (const o of objs) {
      const e = pts[o.end], q = pts[o.ids[o.ids.length - 2]];
      const target = Math.atan2(e.x - q.x, -(e.y - q.y));
      let d = target - o.ang; d = Math.atan2(Math.sin(d), Math.cos(d));
      o.vang += (d * 38 - o.vang * 3.2) * h; o.ang += o.vang * h;
    }
  }

  /* pointer pushes whatever it passes through */
  function pushAt(x, y, dx, dy) {
    const R = 0.8;
    for (const p of pts) {
      if (!p.w) continue;
      const d = Math.hypot(p.x - x, p.y - y); if (d > R) continue;
      const f = (1 - d / R) ** 2 * Math.sqrt(p.w) * 0.2;
      p.x += clamp(dx * f, 0.02); p.y += clamp(dy * f, 0.012);
    }
  }
  addEventListener('pointermove', e => {
    if (!visible || reduce) return;
    const [x, y] = toWorld(e.clientX, e.clientY), now = performance.now();
    const first = !mouse.on, dx = first ? 0 : x - mouse.x, dy = first ? 0 : y - mouse.y;
    mouse.x = x; mouse.y = y; mouse.t = now;
    const r = cv.getBoundingClientRect();
    mouse.on = e.clientY > r.top && e.clientY < r.bottom;
    if (mouse.on) pushAt(x, y, dx, dy);
  }, { passive: true });
  cv.addEventListener('pointerleave', () => { mouse.on = false; });
  cv.addEventListener('pointerdown', e => {
    const [x, y] = toWorld(e.clientX, e.clientY);
    let best = null, bd = 1.2;
    for (const o of objs) { const c = center(o); const d = Math.hypot(c[0] - x, c[1] - y); if (d < bd) { bd = d; best = o; } }
    if (best) { const dir = x < center(best)[0] ? 1 : -1; pts[best.end].px += dir * 0.01; pts[best.ids[best.ids.length - 2]].px += dir * 0.004; }
    else { for (const p of pts) if (p.w) p.px -= (x < camX ? 1 : -1) * 0.006 * (TOP - p.y) / TOP; }
  });
  addEventListener('scroll', () => {
    const dy = scrollY - scrollY0; scrollY0 = scrollY;
    if (!visible || reduce) return;
    const k = Math.max(-1, Math.min(1, dy / 90)) * 0.007;
    for (const p of pts) if (p.w) p.px -= k * (TOP - p.y) / TOP;
  }, { passive: true });

  const center = o => { const e = pts[o.end], q = pts[o.ids[o.ids.length - 2]]; const a = o.ang; return [e.x + Math.sin(a) * o.fit.h * 0.5, e.y - Math.cos(a) * o.fit.h * 0.5]; };

  /* ---------- drawing ---------- */
  function drawMesh(d, model, extra) {
    const m = M4.mul(model, d.m), mt = d.mat;
    gl.uniformMatrix4fv(U.uM, false, m);
    gl.uniform4fv(U.uBase, mt.base);
    gl.uniform3fv(U.uEmis, mt.emis);
    gl.uniform1f(U.uMetal, mt.metal); gl.uniform1f(U.uRough, mt.rough); gl.uniform1f(U.uCut, mt.cut);
    gl.uniform1f(U.uBright, extra || 1);
    gl.uniform1i(U.uHasTex, mt.tex ? 1 : 0); gl.uniform1i(U.uHasEm, mt.emTex ? 1 : 0);
    if (mt.tex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, mt.tex); }
    if (mt.emTex) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, mt.emTex); }
    gl.bindVertexArray(d.vao);
    if (d.type) gl.drawElements(gl.TRIANGLES, d.count, d.type, d.off); else gl.drawArrays(gl.TRIANGLES, 0, d.count);
  }
  function drawModel(model, matrix) {
    gl.disable(gl.BLEND); gl.depthMask(true);
    for (const d of model.draws) if (!d.mat.blend) drawMesh(d, matrix);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    for (const d of model.draws) if (d.mat.blend) drawMesh(d, matrix);
    gl.depthMask(true); gl.disable(gl.BLEND);
  }
  function drawRope(r, z) {
    updateRope(r, pts, z);
    gl.uniformMatrix4fv(U.uM, false, M4.id());
    gl.uniform4f(U.uBase, r.color[0], r.color[1], r.color[2], 1);
    gl.uniform3f(U.uEmis, 0, 0, 0); gl.uniform1i(U.uHasTex, 0); gl.uniform1i(U.uHasEm, 0);
    gl.uniform1f(U.uMetal, r.metal); gl.uniform1f(U.uRough, r.rough); gl.uniform1f(U.uCut, 0); gl.uniform1f(U.uBright, 1);
    gl.bindVertexArray(r.vao); gl.drawElements(gl.TRIANGLES, r.n, gl.UNSIGNED_SHORT, 0);
  }

  function draw() {
    gl.viewport(0, 0, cv.width, cv.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(P);
    const vp = M4.mul(M4.persp(FOV, W / Hh, 0.5, 60), M4.T(-camX, -camY, -D));
    gl.uniformMatrix4fv(U.uVP, false, vp); gl.uniform3f(U.uCam, camX, camY, D);
    gl.uniform1i(U.uTex, 0); gl.uniform1i(U.uEm, 1);

    /* ropes first, at their own depth */
    ropes.forEach((r, i) => drawRope(r, i === 0 ? 0 : i <= 4 ? 0 : objs[i - 5].z));

    /* cable bundle at the middle of the cross bar */
    if (bundle) {
      const L = pts[iL], R = pts[iR], M = pts[iM];
      const a = Math.atan2(R.y - L.y, R.x - L.x);
      const m = M4.mul(M4.T(M.x, M.y - 0.04, 0.05), M4.mul(M4.Rz(a), bundle.fit.m));
      drawModel(bundle.model, m);
    }

    for (const o of objs) {
      if (!o.model) continue;
      const e = pts[o.end];
      const sway = (e.x - e.px) * 60;
      let yaw;
      if (o.look) {
        const c = center(o), tx = mouse.on ? Math.max(-1.1, Math.min(1.1, (mouse.x - c[0]) * 0.55)) : Math.sin(t * 0.5) * 0.5;
        o.yaw += (tx - o.yaw) * 0.08; yaw = o.yaw;
      } else if (o.spin) { o.yaw = Math.sin(t * 0.7) * 0.7 + sway * 0.4; yaw = o.yaw; }
      else { o.yaw = Math.sin(t * 0.6 + 2) * 0.3 + sway * 0.4; yaw = o.yaw; }
      const m = M4.mul(M4.T(e.x, e.y, o.z), M4.mul(M4.Rz(o.ang), M4.mul(M4.Ry(yaw), o.fit.m)));
      drawModel(o.model, m);
    }
    gl.bindVertexArray(null);
  }

  /* labels follow the objects */
  const fmt = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
  function labels() {
    for (const o of objs) {
      const c = chips[o.key]; if (!c) continue;
      const cen = center(o), [sx, sy] = toScreen(cen[0], cen[1] - o.fit.h * 0.5 - 0.12);
      c.style.transform = 'translate(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px) translate(-50%,0)';
    }
    if (chips.watch) { const s = fmt.format(new Date()); if (chips.watch.dataset.t !== s) { chips.watch.dataset.t = s; chips.watch.querySelector('b').textContent = s; } }
  }

  /* ---------- loop ---------- */
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; t += dt; acc += dt;
    const h = 1 / 120;
    while (acc >= h) { step(h); acc -= h; }
    draw(); labels();
  }
  const start = () => { if (!raf && ready && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());

  /* ---------- load the models when the section is near ---------- */
  let loading = false;
  async function load() {
    if (loading) return; loading = true;
    try {
      const [b, ...ms] = await Promise.all([BUNDLE, ...OBJECTS].map(o => loadGLB(gl, BASE + o.file)));
      const bf = fitMatrix(b, BUNDLE.rot, 1, 'center');   /* measure at height 1, then scale to the wanted width */
      bundle = { model: b, fit: fitMatrix(b, BUNDLE.rot, BUNDLE.w * bf.h / bf.w, 'center') };
      objs.forEach((o, i) => { o.model = ms[i]; o.fit = fitMatrix(ms[i], o.rot, o.h, 'top'); });
      resize(); ready = true; sec.classList.add('ready');
      if (reduce) { for (let i = 0; i < 400; i++) step(1 / 120); draw(); labels(); }
      else start();
    } catch (e) { console.warn('hang section:', e); sec.remove(); }
  }
  new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) load(); }), { rootMargin: '700px 0px' }).observe(sec);
  new IntersectionObserver(es => es.forEach(e => {
    visible = e.isIntersecting;
    if (visible) { if (!kicked && ready && !reduce) { kicked = true; kick(0.008); } start(); } else stop();
  }), { threshold: 0.12 }).observe(sec);
  new IntersectionObserver(() => { if (ready && visible && !kicked && !reduce) { kicked = true; kick(0.008); } }, { threshold: 0.25 }).observe(sec);
  addEventListener('resize', () => { if (ready) { resize(); if (!raf) { draw(); labels(); } } });
  resize();
})();
