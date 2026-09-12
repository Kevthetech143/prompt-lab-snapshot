/* IdeasPanel v1 — panel.js. Vanilla JS, zero dependencies, no remote fetches, no build step.
   Exposes window.IdeasPanel.mount(el, { src: 'ideas.json' | object, onAction(fn) }).
   Renders sections/rows in the reference style; "..." menu per row with
   Done / Dismiss / Copy; row click opens the detail pop-up (step 1b) with
   "What's included", "How it works" and the "Let's do it" button; top-right
   Refresh; empty state. Status updates are kept in memory and reported via
   onAction({ id, action, idea? }). */

(function () {
  "use strict";

  var ACTIONS = ["done", "dismissed", "copy"];
  var MENU_LABELS = { done: "Done", dismissed: "Dismiss", copy: "Copy" };

  /* Flat monochrome lightbulb, the one icon every row and included-row shows.
     the icon fields in the data are ignored by the renderer. */
  var LIGHTBULB_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true" focusable="false"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>';

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function closeOpenMenu(root) {
    var open = root.querySelector(".ideas-panel__menu");
    if (open) open.remove();
  }

  function openMenu(root, idea, btn, onAction) {
    closeOpenMenu(root);
    var menu = el("div", "ideas-panel__menu");
    menu.setAttribute("role", "menu");
    ACTIONS.forEach(function (action) {
      var item = el("button", "ideas-panel__menu-item", MENU_LABELS[action]);
      item.type = "button";
      item.setAttribute("role", "menuitem");
      item.addEventListener("click", function (ev) {
        ev.stopPropagation();
        if (action === "copy") {
          copyIdea(idea);
        }
        idea.status = action === "copy" ? idea.status : action;
        onAction({ id: idea.id, action: action });
        closeOpenMenu(root);
      });
      menu.appendChild(item);
    });
    var rect = btn.getBoundingClientRect();
    var rootRect = root.getBoundingClientRect();
    menu.style.position = "absolute";
    menu.style.top = (rect.bottom - rootRect.top + 4) + "px";
    menu.style.right = (rootRect.right - rect.right) + "px";
    root.style.position = "relative";
    root.appendChild(menu);

    var first = menu.querySelector(".ideas-panel__menu-item");
    if (first) first.focus();

    // Close on outside click or Escape.
    setTimeout(function () {
      document.addEventListener("click", function onDoc(ev) {
        if (!menu.contains(ev.target)) {
          closeOpenMenu(root);
          document.removeEventListener("click", onDoc);
        }
      });
    }, 0);
    menu.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") {
        closeOpenMenu(root);
        btn.focus();
      }
    });
  }

  function copyIdea(idea) {
    var text = idea.title + "\n" + idea.body;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () { /* ignore */ });
    } else {
      var ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) { /* ignore */ }
      document.body.removeChild(ta);
    }
  }

  /* Detail pop-up (step 1b): centered modal over a dimmed backdrop.
     Title (2 lines), body, optional "What's included" rows, optional
     "How it works" outcome, and the "Let's do it" button when
     idea.action exists. Esc and backdrop click close; focus is trapped
     inside; background scrolling is locked while open. */
  function focusableIn(container) {
    var nodes = container.querySelectorAll(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    return Array.prototype.slice.call(nodes).filter(function (node) {
      return !node.disabled && node.offsetParent !== null;
    });
  }

  function openModal(idea, onStart) {
    var previousFocus = document.activeElement;
    var overlay = el("div", "ideas-panel__modal-overlay");
    var modal = el("div", "ideas-panel__modal");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", idea.title);

    var closeBtn = el("button", "ideas-panel__modal-close", "\u00D7");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close details");
    closeBtn.addEventListener("click", close);
    modal.appendChild(closeBtn);

    modal.appendChild(el("h2", "ideas-panel__modal-title", idea.title));
    modal.appendChild(el("p", "ideas-panel__modal-body", idea.body));

    if (idea.included && idea.included.length) {
      modal.appendChild(el("h3", "ideas-panel__modal-heading", "What's included"));
      var list = el("div", "ideas-panel__included");
      idea.included.forEach(function (row) {
        var item = el("div", "ideas-panel__included-row");
        var icon = el("span", "ideas-panel__included-icon");
        icon.setAttribute("aria-hidden", "true");
        icon.innerHTML = LIGHTBULB_SVG;
        item.appendChild(icon);
        var wrap = el("div", "ideas-panel__included-text");
        wrap.appendChild(el("strong", "ideas-panel__included-label", row.label));
        wrap.appendChild(el("p", "ideas-panel__included-detail", row.detail));
        item.appendChild(wrap);
        list.appendChild(item);
      });
      modal.appendChild(list);
    }

    if (idea.outcome) {
      modal.appendChild(el("h3", "ideas-panel__modal-heading", "How it works"));
      modal.appendChild(el("p", "ideas-panel__modal-body", idea.outcome));
    }

    if (idea.action) {
      var cta = el("button", "ideas-panel__cta", "Let's do it");
      cta.type = "button";
      cta.setAttribute("aria-label", "Let's do it: " + idea.title);
      cta.addEventListener("click", function () {
        close();
        onStart(idea);
      });
      modal.appendChild(cta);
    }

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    var prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // scroll lock behind the modal

    function close() {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocus && previousFocus.focus) previousFocus.focus();
    }

    function onKey(ev) {
      if (ev.key === "Escape") {
        close();
        return;
      }
      if (ev.key === "Tab") {
        // Focus trap: keep Tab cycling inside the dialog.
        var focusables = focusableIn(modal);
        if (!focusables.length) {
          ev.preventDefault();
          return;
        }
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (ev.shiftKey && document.activeElement === first) {
          last.focus();
          ev.preventDefault();
        } else if (!ev.shiftKey && document.activeElement === last) {
          first.focus();
          ev.preventDefault();
        }
      }
    }

    document.addEventListener("keydown", onKey, true);
    overlay.addEventListener("click", function (ev) {
      if (ev.target === overlay) close(); // backdrop click closes
    });

    closeBtn.focus();
  }

  function renderRow(root, idea, onAction) {
    var row = el("button", "ideas-panel__row");
    row.type = "button";
    row.setAttribute("aria-label", idea.title + ". " + idea.body);

    var icon = el("span", "ideas-panel__icon");
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = LIGHTBULB_SVG;
    row.appendChild(icon);

    var text = el("div", "ideas-panel__text");
    text.appendChild(el("h3", "ideas-panel__idea-title", idea.title));
    text.appendChild(el("p", "ideas-panel__idea-body", idea.body));
    row.appendChild(text);

    if (idea.status === "started") {
      row.appendChild(el("span", "ideas-panel__started", "Started"));
    }

    var menuBtn = el("button", "ideas-panel__menu-btn", "\u22EF");
    menuBtn.type = "button";
    menuBtn.setAttribute("aria-label", "Actions for " + idea.title);
    menuBtn.setAttribute("aria-haspopup", "menu");
    menuBtn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      openMenu(root, idea, menuBtn, onAction);
    });
    row.appendChild(menuBtn);

    // Row click opens the detail pop-up; the "..." menu keeps its own button.
    row.addEventListener("click", function (ev) {
      if (ev.target === menuBtn || menuBtn.contains(ev.target)) return;
      closeOpenMenu(root);
      openModal(idea, function (started) {
        onAction({ id: started.id, action: "start", idea: started });
      });
    });

    return row;
  }

  function renderInto(root, data, onAction, setStatus) {
    root.innerHTML = "";
    var panel = el("div", "ideas-panel");

    var header = el("div", "ideas-panel__header");
    header.appendChild(el("h2", "ideas-panel__title", "Next Moves"));
    var refresh = el("button", "ideas-panel__refresh", "Refresh");
    refresh.type = "button";
    refresh.setAttribute("aria-label", "Refresh next moves");
    refresh.addEventListener("click", function () {
      onAction({ id: null, action: "refresh" });
    });
    header.appendChild(refresh);
    panel.appendChild(header);

    var sections = (data && data.sections) || [];
    var count = 0;
    sections.forEach(function (section) {
      var sec = el("div", "ideas-panel__section");
      sec.appendChild(el("h3", "ideas-panel__section-title", section.title));
      (section.ideas || []).forEach(function (idea) {
        sec.appendChild(renderRow(panel, idea, onAction));
        count += 1;
      });
      panel.appendChild(sec);
    });

    if (count === 0) {
      panel.appendChild(el("p", "ideas-panel__empty", "No next moves yet, check back tomorrow"));
    }

    var status = el("p", "ideas-panel__status", setStatus || "");
    panel.appendChild(status);

    root.appendChild(panel);
  }

  function mount(container, options) {
    options = options || {};
    var onAction = options.onAction || function () {};
    var src = options.src;
    var root = container;
    var data = null;

    function handleAction(evt) {
      if (evt && evt.action === "refresh") {
        load();
        return;
      }
      if (evt && evt.action === "start" && evt.idea) {
        // "Let's do it": mark started, close modal (done by the modal),
        // re-render so the row shows the "Started" pill, then notify host.
        evt.idea.status = "started";
        renderInto(root, data, handleAction, statusLine());
        onAction({ id: evt.id, action: "start", idea: evt.idea });
        return;
      }
      onAction(evt);
    }

    function setData(d) {
      data = d;
      renderInto(root, data, handleAction, statusLine());
    }

    function statusLine() {
      if (!data || !data.generated_at) return "";
      var d = new Date(data.generated_at);
      return "Generated " + (isNaN(d.getTime()) ? data.generated_at : d.toLocaleString());
    }

    function load() {
      if (!src) {
        setData({ sections: [] });
        return;
      }
      if (typeof src === "object") {
        setData(src);
        return;
      }
      fetch(src, { cache: "no-store" })
        .then(function (resp) {
          if (!resp.ok) throw new Error("HTTP " + resp.status);
          return resp.json();
        })
        .then(setData)
        .catch(function (err) {
          renderInto(root, { sections: [] }, handleAction,
            "Could not load the next-moves list (" + err.message + ")");
        });
    }

    load();
    return { refresh: load, getData: function () { return data; } };
  }

  window.IdeasPanel = { mount: mount };
})();
