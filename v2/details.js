/* Show-details toggle (task nontech2-171000): one shared toggle in the top
   panel of every v2 page. OFF by default; the choice is remembered in
   localStorage. When off, body lacks .v2-details-on and kit.css hides every
   .v2-detail element (file paths, ids, API routes, raw logs, JSON, small
   token counts, zero-count rows). Progressive enhancement: without JS the
   toggle stays hidden and the page reads exactly as the toggle-off state. */
(function () {
  "use strict";
  var KEY = "v2-show-details";
  var boxId = "v2-details-toggle";
  document.documentElement.classList.add("v2-js");
  function apply(on) {
    document.body.classList.toggle("v2-details-on", !!on);
    var box = document.getElementById(boxId);
    if (box) box.checked = !!on;
  }
  var on = false;
  try { on = window.localStorage.getItem(KEY) === "1"; } catch (e) {}
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { apply(on); });
  } else {
    apply(on);
  }
  document.addEventListener("change", function (e) {
    if (!e.target || e.target.id !== boxId) return;
    var v = !!e.target.checked;
    try { window.localStorage.setItem(KEY, v ? "1" : "0"); } catch (e2) {}
    apply(v);
  });
})();
