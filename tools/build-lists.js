#!/usr/bin/env node
/* Finds every photo and video you uploaded and writes creative-list.js and gallery-list.js.
   It runs by itself on every deploy (see vercel.json), so you only upload files to GitHub.
   You can also run it by hand:  node tools/build-lists.js  */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const IMG = /\.(jpe?g|png|webp|gif|avif)$/i, VID = /\.(mp4|webm|mov|m4v)$/i;
const nat = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const words = s => s.replace(/[-_]+/g, ' ').trim();
const nice = s => words(s).split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const stem = f => f.replace(/\.[^./]+$/, '');
const ls = d => { try { return fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return []; } };

const size = f => {
  try {
    const b = fs.readFileSync(f);
    if (b[0] === 0x89 && b[1] === 0x50) return [b.readUInt32BE(16), b.readUInt32BE(20)];
    if (b[0] === 0xFF && b[1] === 0xD8) {
      let i = 2;
      while (i < b.length - 9) {
        if (b[i] !== 0xFF) { i++; continue; }
        const m = b[i + 1];
        if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
        i += 2 + b.readUInt16BE(i + 2);
      }
    }
  } catch (e) { /* size is optional */ }
  return null;
};

/* Creative portfolio: assets/creative/, sub-folders become filter tabs */
const CR = path.join(ROOT, 'assets', 'creative');
const titles = {};
try {
  fs.readFileSync(path.join(CR, 'titles.txt'), 'utf8').split('\n').forEach(l => {
    const i = l.indexOf('=');
    if (i > 0 && l.trim()[0] !== '#') titles[l.slice(0, i).trim()] = l.slice(i + 1).trim();
  });
} catch (e) { /* titles are optional */ }
const items = [];
const walkCreative = (dir, rel) => {
  const ents = ls(dir), files = ents.filter(e => e.isFile()).map(e => e.name).sort(nat);
  const cat = rel ? words(rel.split('/')[0]) : '';
  const stems = {};
  files.forEach(f => { (stems[stem(f)] = stems[stem(f)] || []).push(f); });
  files.forEach(f => {
    const web = 'assets/creative/' + (rel ? rel + '/' : '') + f;
    const title = titles[f] || nice(stem(f));
    if (VID.test(f)) {
      const it = { type: 'video', src: web, title };
      const cover = (stems[stem(f)] || []).find(g => IMG.test(g));
      if (cover) it.poster = web.replace(/[^/]+$/, cover);
      if (cat) it.cat = cat;
      items.push(it);
    } else if (IMG.test(f)) {
      if ((stems[stem(f)] || []).some(g => VID.test(g))) return;
      const it = { type: 'image', src: web, title };
      const s = size(path.join(dir, f));
      if (s) { it.w = s[0]; it.h = s[1]; }
      if (cat) it.cat = cat;
      items.push(it);
    }
  });
  ents.filter(e => e.isDirectory()).map(e => e.name).sort(nat).forEach(d => walkCreative(path.join(dir, d), rel ? rel + '/' + d : d));
};
walkCreative(CR, '');
fs.writeFileSync(path.join(ROOT, 'creative-list.js'),
  '/* Written by tools/build-lists.js on every deploy. You can leave it as it is. */\n' +
  'window.SITE = window.SITE || {};\n' +
  'window.SITE.creative = (window.SITE.creative || []).concat(' + JSON.stringify(items, null, 1) + ');\n');

/* Photo ring: every photo in assets/clicks/ that config.js does not already list */
const clicks = [];
const walkClicks = (dir, rel) => {
  const ents = ls(dir);
  ents.filter(e => e.isFile() && IMG.test(e.name)).map(e => e.name).sort(nat)
    .forEach(f => clicks.push({ src: 'assets/clicks/' + (rel ? rel + '/' : '') + f, title: nice(stem(f)) }));
  ents.filter(e => e.isDirectory()).map(e => e.name).sort(nat).forEach(d => walkClicks(path.join(dir, d), rel ? rel + '/' + d : d));
};
walkClicks(path.join(ROOT, 'assets', 'clicks'), '');
fs.writeFileSync(path.join(ROOT, 'gallery-list.js'),
  '/* Written by tools/build-lists.js on every deploy. You can leave it as it is. */\n' +
  'window.SITE = window.SITE || {};\n' +
  '(function () {\n' +
  '  var S = window.SITE, have = {}, hide = {};\n' +
  '  (S.gallery || []).forEach(function (g) { have[g.src] = 1; });\n' +
  '  (S.hide || []).forEach(function (h) { hide[h] = 1; });\n' +
  '  S.gallery = (S.gallery || []).concat(' + JSON.stringify(clicks) + '.filter(function (g) { return !have[g.src] && !hide[g.src]; }));\n' +
  '})();\n');
console.log('creative: ' + items.length + ' pieces, ring candidates: ' + clicks.length);
