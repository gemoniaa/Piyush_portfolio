/* Written by tools/build-lists.js on every deploy. You can leave it as it is. */
window.SITE = window.SITE || {};
(function () {
  var S = window.SITE, have = {}, hide = {};
  (S.gallery || []).forEach(function (g) { have[g.src] = 1; });
  (S.hide || []).forEach(function (h) { hide[h] = 1; });
  S.gallery = (S.gallery || []).concat([{"src":"assets/clicks/night-suit.jpg","title":"Night Suit"},{"src":"assets/clicks/polo-back.jpg","title":"Polo Back"},{"src":"assets/clicks/work-session.jpg","title":"Work Session"}].filter(function (g) { return !have[g.src] && !hide[g.src]; }));
})();
