/* ZANZIBAR — logica del sito (non serve modificarlo per aggiornare i contenuti:
   il menu si gestisce dal pannello /admin, il resto da data.js) */
(function () {
  "use strict";

  var D = window.ZANZIBAR;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var slug = function (s) { return "cat-" + s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); };
  var price = function (n) { return "<small>" + esc(D.valuta) + "</small>" + Number(n).toFixed(2).replace(".", ","); };
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var root = document.documentElement;

  /* ---------- MENU ---------- */
  // Il menu arriva da Firestore (firebase-menu.js) e si aggiorna in tempo reale.
  // Se Firebase non è configurato o non risponde, si usa quello scritto in data.js.
  var liveMode = !!window.ZANZIBAR_FIREBASE_READY;
  var tabsEl = $("#tabs");
  var menuEl = $("#menu");
  var tabs = [];
  var bar = null;
  var clickLock = false;
  var current = null;
  var menuLoaded = false;
  var revealed = {};   // categorie già comparse: non rifanno l'animazione a ogni aggiornamento
  var io = null, reveal = null;

  function renderMenu(menu) {
    var activeId = current ? current.dataset.target : null;

    if (!menu.length) {
      tabsEl.innerHTML = "";
      tabs = []; bar = null; current = null;
      menuEl.innerHTML = '<p class="menu-empty">Il menu è in aggiornamento.<br>Chiedi al nostro staff le proposte di oggi.</p>';
      return;
    }

    tabsEl.innerHTML = menu.map(function (c) {
      return '<button class="tab" data-target="' + slug(c.categoria) + '">' + esc(c.categoria) + "</button>";
    }).join("") + '<span class="tabs-bar" aria-hidden="true"></span>';

    menuEl.innerHTML = menu.map(function (c, i) {
      return '<section class="cat" id="' + slug(c.categoria) + '">' +
        '<header class="cat-head"><span class="cat-num">' + pad(i + 1) + "</span>" +
        '<h2 class="cat-title">' + esc(c.categoria) + "</h2></header>" +
        c.voci.map(function (v) {
          var off = v.disponibile === false;
          return '<article class="item' + (off ? " is-off" : "") + '">' +
            '<div class="item-head">' +
              '<span class="item-name">' + esc(v.nome) + (v.tag ? '<span class="tag">' + esc(v.tag) + "</span>" : "") + "</span>" +
              '<span class="item-dots" aria-hidden="true"></span>' +
              '<span class="item-price">' + price(v.prezzo) + "</span>" +
            "</div>" +
            (v.desc ? '<p class="item-desc">' + esc(v.desc) + "</p>" : "") +
            (off ? '<p class="item-off">Non disponibile</p>' : "") +
            "</article>";
        }).join("") +
        "</section>";
    }).join("");

    tabs = $$(".tab", tabsEl);
    bar = $(".tabs-bar", tabsEl);
    // resta sulla categoria che si stava guardando, se esiste ancora
    current = tabs.filter(function (t) { return t.dataset.target === activeId; })[0] || tabs[0];
    current.classList.add("is-active");
    moveBar(current);
    observeSections();
  }

  // sposta la linea sotto la categoria attiva
  function moveBar(t) {
    if (!t || !bar) return;
    bar.style.transform = "translateX(" + t.offsetLeft + "px) scaleX(" + t.offsetWidth + ")";
  }

  function setActive(id) {
    tabs.forEach(function (t) {
      var on = t.dataset.target === id;
      t.classList.toggle("is-active", on);
      if (on) {
        moveBar(t);
        current = t;
        // porta il tab attivo in vista senza muovere la pagina
        var left = t.offsetLeft - (tabsEl.clientWidth - t.offsetWidth) / 2;
        tabsEl.scrollTo({ left: left, behavior: "smooth" });
      }
    });
  }
  // ricalcola quando il font è caricato o cambia la larghezza dello schermo
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { moveBar(current); });
  window.addEventListener("resize", function () { moveBar(current); });

  // ombra leggera sotto le categorie quando si scorre
  var scrolled = false;
  window.addEventListener("scroll", function () {
    var s = window.scrollY > 4;
    if (s !== scrolled) { scrolled = s; root.classList.toggle("is-scrolled", s); }
  }, { passive: true });

  tabsEl.addEventListener("click", function (e) {
    var t = e.target.closest(".tab");
    if (!t) return;
    setActive(t.dataset.target);
    clickLock = true;
    document.getElementById(t.dataset.target).scrollIntoView({ behavior: "smooth", block: "start" });
    clearTimeout(tabsEl._t);
    tabsEl._t = setTimeout(function () { clickLock = false; }, 700);
  });

  // evidenzia la categoria visibile durante lo scroll + comparsa morbida (una sola volta)
  function observeSections() {
    if (!("IntersectionObserver" in window)) return;
    if (io) io.disconnect();
    if (reveal) reveal.disconnect();
    io = new IntersectionObserver(function (entries) {
      if (clickLock) return;
      entries.forEach(function (en) { if (en.isIntersecting) setActive(en.target.id); });
    }, { rootMargin: "-130px 0px -65% 0px" });

    root.classList.add("js-reveal");
    reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); revealed[en.target.id] = true; reveal.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });

    $$(".cat", menuEl).forEach(function (s) {
      io.observe(s);
      if (revealed[s.id]) s.classList.add("is-in"); else reveal.observe(s);
    });
  }

  function setMenu(menu) {
    menuLoaded = true;
    clearTimeout(fallbackTimer);
    renderMenu(menu);
  }
  function useFallbackMenu() { if (!menuLoaded) setMenu(D.menu); }

  // Se il database non risponde entro pochi secondi, mostra il menu di data.js
  var fallbackTimer = null;
  if (liveMode) {
    menuEl.innerHTML = '<div class="menu-loading" aria-label="Caricamento del menu"><span></span><span></span><span></span></div>';
    fallbackTimer = setTimeout(useFallbackMenu, 8000);
  } else {
    setMenu(D.menu);
  }

  window.ZanzibarMenu = { setMenu: setMenu, useFallbackMenu: useFallbackMenu };

  $("#navFoot").innerHTML = esc(D.info.indirizzo) + "<br>" + esc(D.info.telefono);

  /* ---------- PANNELLO HAMBURGER ---------- */
  var drawer = $("#drawer"), scrim = $("#scrim"), burger = $("#burger");
  var backBtn = $("#back"), titleEl = $("#drawerTitle");
  var built = {};

  function showView(name) {
    $$(".view", drawer).forEach(function (v) { v.classList.toggle("is-active", v.dataset.view === name); });
    var v = $('.view[data-view="' + name + '"]', drawer);
    titleEl.textContent = name === "nav" ? D.info.nome : v.dataset.title;
    backBtn.hidden = name === "nav";
    $(".drawer-body", drawer).scrollTop = 0;
    if (!built[name] && builders[name]) { builders[name](); built[name] = true; }
  }

  function openDrawer(view) {
    scrim.hidden = false;
    requestAnimationFrame(function () { scrim.classList.add("is-open"); });
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    burger.setAttribute("aria-expanded", "true");
    document.body.classList.add("lock");
    showView(view || "nav");
  }

  function closeDrawer() {
    scrim.classList.remove("is-open");
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    burger.setAttribute("aria-expanded", "false");
    document.body.classList.remove("lock");
    setTimeout(function () { if (!drawer.classList.contains("is-open")) scrim.hidden = true; }, 260);
  }

  // cronologia: il tasto "indietro" del telefono chiude il pannello invece di uscire dal sito
  function render(state) {
    if (state && state.z) openDrawer(state.z); else closeDrawer();
  }
  function closeAll() {
    if (history.state && history.state.z) {
      var depth = history.state.depth || 1;
      history.go(-depth);
    } else closeDrawer();
  }

  burger.addEventListener("click", function () { history.pushState({ z: "nav", depth: 1 }, ""); render({ z: "nav" }); });
  scrim.addEventListener("click", closeAll);
  $("#close").addEventListener("click", closeAll);
  backBtn.addEventListener("click", function () { history.back(); });
  window.addEventListener("popstate", function (e) { render(e.state); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && drawer.classList.contains("is-open")) closeAll(); });

  $$("[data-go]", drawer).forEach(function (b) {
    b.addEventListener("click", function () {
      var target = b.dataset.go;
      if (target === "menu") { closeAll(); return; }
      history.pushState({ z: target, depth: 2 }, "");
      render({ z: target });
    });
  });

  // evidenzia negli orari la riga di oggi (legge testi come "Martedì – Giovedì" o "Domenica")
  var GIORNI = ["domenica", "lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato"];
  function isToday(label) {
    var norm = function (s) { return s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); };
    var parts = String(label).split(/[–—-]/).map(function (p) { return GIORNI.indexOf(norm(p)); });
    if (parts.some(function (n) { return n < 0; })) return false;
    var today = new Date().getDay(), a = parts[0], b = parts[parts.length - 1];
    // i giorni partono da lunedì: trasformo domenica (0) in 7
    var t = today || 7; a = a || 7; b = b || 7;
    return a <= b ? t >= a && t <= b : t >= a || t <= b;
  }

  /* ---------- CONTENUTI (creati solo alla prima apertura = caricamento più veloce) ---------- */
  var builders = {
    about: function () {
      var img = D.galleria[0];
      $("#about").innerHTML =
        (img ? '<img class="about-hero" src="' + esc(img.src) + '" alt="' + esc(img.alt) + '" loading="lazy" decoding="async">' : "") +
        '<span class="eyebrow">' + esc(D.info.nome) + " · " + esc(D.info.sottotitolo) + "</span>" +
        D.info.chiSiamo.map(function (p, i) { return "<p" + (i === 0 ? ' class="lead"' : "") + ">" + esc(p) + "</p>"; }).join("");
    },

    gallery: function () {
      var g = $("#gallery");
      g.innerHTML = D.galleria.map(function (f, i) {
        return '<button data-i="' + i + '" aria-label="Ingrandisci: ' + esc(f.alt) + '"><img src="' + esc(f.src) + '" alt="' + esc(f.alt) + '" loading="lazy" decoding="async"></button>';
      }).join("");
      $$("img", g).forEach(function (im) {
        if (im.complete) im.classList.add("is-loaded");
        else im.addEventListener("load", function () { im.classList.add("is-loaded"); });
      });
      var lb = $("#lightbox"), lbImg = $("img", lb);
      g.addEventListener("click", function (e) {
        var b = e.target.closest("button");
        if (!b) return;
        var f = D.galleria[b.dataset.i];
        lbImg.src = f.src.replace(/w=\d+/, "w=1200");
        lbImg.alt = f.alt;
        lb.hidden = false;
      });
      lb.addEventListener("click", function () { lb.hidden = true; lbImg.removeAttribute("src"); });
    },

    contacts: function () {
      var I = D.info;
      var tel = I.telefono.replace(/[^\d+]/g, "");
      $("#contacts").innerHTML =
        '<div class="block"><h3>Orari di apertura</h3><table class="hours">' +
          D.orari.map(function (o) { return "<tr" + (isToday(o.giorni) ? ' class="is-today"' : "") + "><td>" + esc(o.giorni) + "</td><td>" + esc(o.ore) + "</td></tr>"; }).join("") +
        "</table></div>" +
        '<div class="block"><h3>Indirizzo</h3><p>' + esc(I.indirizzo) + "</p></div>" +
        '<div class="block"><h3>Contatti</h3><p>' + esc(I.telefono) + "<br>" + esc(I.email) + "</p>" +
          '<div class="btn-row"><a class="btn btn-primary" href="tel:' + esc(tel) + '">Chiama</a>' +
          '<a class="btn" href="mailto:' + esc(I.email) + '">Scrivici</a></div></div>' +
        (I.social && I.social.length ? '<div class="block"><h3>Seguici</h3><div class="btn-row">' +
          I.social.map(function (s) { return '<a class="btn" href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.nome) + "</a>"; }).join("") +
        "</div></div>" : "");
    },

    map: function () {
      var q = encodeURIComponent(D.info.mappa || D.info.indirizzo);
      $("#map").innerHTML =
        '<iframe class="map-frame" title="Mappa di ' + esc(D.info.nome) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=' + q + '&z=16&output=embed"></iframe>' +
        "<p>" + esc(D.info.indirizzo) + "</p>" +
        '<div class="btn-row"><a class="btn btn-primary" href="https://www.google.com/maps/search/?api=1&query=' + q + '" target="_blank" rel="noopener">Apri in Google Maps</a></div>';
    }
  };

  // se la pagina viene ricaricata con il pannello aperto, riparti pulito
  if (history.state && history.state.z) history.replaceState(null, "");
})();
