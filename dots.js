/* The dots of the two i's in the name are small lights: they glow and give a soft hop every few seconds.
   The name is written with a dotless i and the dot is drawn on top, placed from the font's own measurements. */
(function () {
  'use strict';
  var cv = document.createElement('canvas').getContext('2d');
  function build(txt) {
    var f = document.createDocumentFragment(), n = 0;
    String(txt).split('').forEach(function (ch) {
      if (ch === 'i') {
        var s = document.createElement('span');
        s.className = 'gi'; s.setAttribute('aria-hidden', 'true');
        s.textContent = 'ı';
        var d = document.createElement('i'); d.style.setProperty('--dd', (n++ * 2.9) + 's');
        s.appendChild(d); f.appendChild(s);
      } else f.appendChild(document.createTextNode(ch));
    });
    return f;
  }
  function set(node, txt) {
    node.setAttribute('aria-label', txt);
    node.textContent = '';
    node.appendChild(build(txt));
    fit(node);
  }
  function fit(node) {
    var cs = getComputedStyle(node), fs = parseFloat(cs.fontSize) || 16;
    cv.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    var m = cv.measureText('ı'), asc = m.fontBoundingBoxAscent || fs * .95;
    var xh = cv.measureText('x').actualBoundingBoxAscent || fs * .53;
    var r = fs * .073, centre = asc - xh - fs * .137;
    node.style.setProperty('--dt', (centre - r).toFixed(2) + 'px');
    var ink = (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
    if (isFinite(ink) && ink > 0) node.style.setProperty('--dl', ink.toFixed(2) + 'px');
  }
  function fitAll() { document.querySelectorAll('[data-dots]').forEach(fit); }
  addEventListener('resize', fitAll);
  addEventListener('load', fitAll);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
  window.PNdots = { set: set, fitAll: fitAll };
})();
