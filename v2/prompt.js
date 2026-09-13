/* Prompt page decks: fan-out interaction (task decks-004500).
 * Click a deck -> its child cards fan out in a grid under its row, other
 * decks dim; the Close back pill (or the deck itself, or Esc) folds them
 * back. Only one deck is open at a time. ?open=<card key> is rendered
 * open server-side; this script only wires the client interactions. */
(function () {
  "use strict";

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function fanoutFor(deck) {
    return document.getElementById("fanout-" + deck.getAttribute("data-key"));
  }

  function closeAll() {
    document.querySelectorAll(".v2p-deck.open").forEach(function (d) {
      d.classList.remove("open");
      d.setAttribute("aria-expanded", "false");
      var f = fanoutFor(d);
      if (f) f.hidden = true;
    });
    document.querySelectorAll(".v2p-decks.has-open").forEach(function (g) {
      g.classList.remove("has-open");
    });
  }

  function openDeck(deck) {
    closeAll();
    deck.classList.add("open");
    deck.setAttribute("aria-expanded", "true");
    var grid = deck.closest(".v2p-decks");
    if (grid) grid.classList.add("has-open");
    var f = fanoutFor(deck);
    if (f) {
      f.hidden = false;
      if (!reduceMotion) {
        f.classList.remove("v2p-fan");
        void f.offsetWidth;
        f.classList.add("v2p-fan");
      }
    }
  }

  document.addEventListener("click", function (ev) {
    if (!ev.target || !ev.target.closest) return;
    if (ev.target.closest(".v2p-backpill")) {
      closeAll();
      return;
    }
    var deck = ev.target.closest(".v2p-deck");
    if (!deck || deck.classList.contains("v2p-flat")) return;
    if (deck.classList.contains("open")) closeAll();
    else openDeck(deck);
  });

  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") closeAll();
  });
})();
