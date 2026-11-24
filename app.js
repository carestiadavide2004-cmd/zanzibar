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
  var slug = function (s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x"; };
  var root = document.documentElement;

  /* ---------- PREZZI ---------- */
  // Prezzi validi (0, 1 o 2). Nel menu: "€ 6,50 / 9,00" come nel menu stampato.
  function validPrices(list) {
    return (Array.isArray(list) ? list : []).filter(function (p) {
      return p && p.value !== null && p.value !== "" && isFinite(Number(p.value)) && Number(p.value) >= 0;
    });
  }
  var money = function (n) { return Number(n).toFixed(2).replace(".", ","); };
  function priceText(list) {
    var p = validPrices(list);
    return p.length ? "€ " + p.map(function (x) { return money(x.value); }).join(" / ") : "";
  }
  // Versione per chi usa lo screen reader: "100 g 6,50 euro, 200 g 9,00 euro"
  function priceSpeech(list) {
    return validPrices(list).map(function (x) { return (x.label ? x.label + " " : "") + money(x.value) + " euro"; }).join(", ");
  }

  /* ---------- DATI ---------- */
  // Formato comune usato dal sito: [{ id, name, section, note, visible, items: [{ id, name, desc, prices, symbol, visible, hasPhoto }] }]
  var SECTIONS = D.sezioni || { food: "Menù Food", drink: "Drink" };

  function fromData(menu) {
    return (menu || []).map(function (c, ci) {
      return {
        id: "d" + ci, name: c.categoria, section: c.sezione || "food", note: c.nota || "", visible: c.visibile !== false,
        items: (c.voci || []).map(function (v) {
          return {
            id: null, name: v.nome, desc: v.desc || "", symbol: v.simbolo || "", visible: v.visibile !== false, hasPhoto: false,
            prices: (v.prezzi || []).map(function (p) { return { label: p.etichetta || "", value: p.valore }; })
          };
        })
      };
    });
  }

  // Tiene solo ciò che si deve vedere: categorie e voci visibili, niente categorie vuote
  function prepare(cats) {
    return Object.keys(SECTIONS).map(function (key) {
      var list = cats.filter(function (c) { return c.section === key && c.visible !== false; })
        .map(function (c) {
          return Object.assign({}, c, { items: (c.items || []).filter(function (v) { return v.visible !== false && v.name; }) });
        })
        .filter(function (c) { return c.items.length; });
      return { id: key, title: SECTIONS[key], cats: list };
    }).filter(function (s) { return s.cats.length; });
  }

  /* ---------- MENU ---------- */
  // Il menu arriva da Firestore (firebase-menu.js) e si aggiorna in tempo reale.
  // Se Firebase non risponde, o nel database c'è ancora il vecchio menu di esempio, si usa quello di data.js.
  var liveMode = !!window.ZANZIBAR_FIREBASE_READY;
  var tabsEl = $("#tabs");
  var menuEl = $("#menu");
  var heroTitle = $("#heroTitle");
  var tabs = [];
  var bar = null;
  var clickLock = false;
  var current = null;
  var menuLoaded = false;
  var revealed = {};   // categorie già comparse: non rifanno l'animazione a ogni aggiornamento
  var io = null, reveal = null;
  var sheetItems = [];  // voci con foto, per aprire la scheda

  var CAMERA = '<svg class="item-cam" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';

  function renderItem(v, cat) {
    var pt = priceText(v.prices);
    var k = -1;
    if (v.hasPhoto && v.id) { k = sheetItems.length; sheetItems.push({ cat: cat.name, item: v }); }
    var open = k >= 0 ? ' data-k="' + k + '" role="button" tabindex="0" aria-haspopup="dialog"' : "";
    return '<article class="item' + (k >= 0 ? " has-photo" : "") + '"' + open + ">" +
      '<div class="item-head">' +
        '<h3 class="item-name">' + esc(v.name) +
          (v.symbol ? ' <span class="item-sym">' + esc(v.symbol) + "</span>" : "") +
          (k >= 0 ? CAMERA + '<span class="sr-only"> (apri la foto)</span>' : "") +
        "</h3>" +
        (pt ? '<span class="item-price" aria-hidden="true">' + esc(pt) + '</span><span class="sr-only">' + esc(priceSpeech(v.prices)) + "</span>" : "") +
      "</div>" +
      (v.desc ? '<p class="item-desc">' + esc(v.desc) + "</p>" : "") +
      "</article>";
  }

  function renderCat(c, anchor) {
    // senza descrizioni (es. Fritteria) le voci sono più compatte, come nel menu stampato
    var compact = !c.items.some(function (v) { return v.desc; });
    return '<section class="cat' + (compact ? " cat--compact" : "") + '" id="' + anchor + '">' +
      '<h2 class="cat-title"><span>' + esc(c.name) + "</span></h2>" +
      '<div class="items" style="--rows:' + Math.ceil(c.items.length / 2) + '">' +
        c.items.map(function (v) { return renderItem(v, c); }).join("") +
      "</div>" +
      (c.note ? '<p class="cat-note">' + esc(c.note) + "</p>" : "") +
      "</section>";
  }

  function renderMenu(cats) {
    var sections = prepare(cats);
    var activeId = current ? current.dataset.target : null;
    sheetItems = [];

    if (!sections.length) {
      tabsEl.innerHTML = "";
      tabs = []; bar = null; current = null;
      menuEl.innerHTML = '<p class="menu-empty">Il menu è in aggiornamento.<br>Chiedi al nostro staff le proposte di oggi.</p>';
      return;
    }

    heroTitle.textContent = sections[0].title;
    var anchors = {};
    var anchorOf = function (c) {
      var a = "cat-" + slug(c.name), n = 2;
      while (anchors[a]) a = "cat-" + slug(c.name) + "-" + n++;
      anchors[a] = true;
      return a;
    };

    var tabsHtml = "", menuHtml = "";
    sections.forEach(function (s, si) {
      menuHtml += '<div class="macro" id="sez-' + esc(s.id) + '">' +
        (si > 0 ? '<header class="macro-head"><p class="kicker">' + esc(D.info.nome) + '</p><h2 class="macro-title">' + esc(s.title) + "</h2></header>" : "");
      s.cats.forEach(function (c, ci) {
        var a = anchorOf(c);
        tabsHtml += '<button class="tab' + (si > 0 && ci === 0 ? " tab--group" : "") + '" data-target="' + a + '">' + esc(c.name) + "</button>";
        menuHtml += renderCat(c, a);
      });
      menuHtml += "</div>";
    });

    tabsEl.innerHTML = tabsHtml + '<span class="tabs-bar" aria-hidden="true"></span>';
    menuEl.innerHTML = menuHtml;

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
  // ricalcola quando il font è caricato o cambia la LARGHEZZA dello schermo (non l'altezza: barra del browser)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { moveBar(current); });
  var lastW = window.innerWidth;
  window.addEventListener("resize", function () {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    moveBar(current);
  });

  // ombra leggera sotto le categorie quando la barra si ferma in alto
  var stuck = false;
  var catbar = $(".catbar");
  window.addEventListener("scroll", function () {
    var s = catbar.getBoundingClientRect().top <= 0.5;
    if (s !== stuck) { stuck = s; root.classList.toggle("is-stuck", s); }
  }, { passive: true });

  tabsEl.addEventListener("click", function (e) {
    var t = e.target.closest(".tab");
    if (!t) return;
    setActive(t.dataset.target);
    clickLock = true;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(t.dataset.target).scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    clearTimeout(tabsEl._t);
    tabsEl._t = setTimeout(function () { clickLock = false; }, 800);
  });

  // evidenzia la categoria visibile durante lo scroll + comparsa morbida (una sola volta)
  function observeSections() {
    if (!("IntersectionObserver" in window)) return;
    if (io) io.disconnect();
    if (reveal) reveal.disconnect();
    io = new IntersectionObserver(function (entries) {
      if (clickLock) return;
      entries.forEach(function (en) { if (en.isIntersecting) setActive(en.target.id); });
    }, { rootMargin: "-80px 0px -60% 0px" });

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

  function setMenu(cats) {
    menuLoaded = true;
    clearTimeout(fallbackTimer);
    renderMenu(cats);
  }
  function useFallbackMenu() { if (!menuLoaded) setMenu(fromData(D.menu)); }

  // Se il database non risponde entro pochi secondi, mostra il menu di data.js
  var fallbackTimer = null;
  if (liveMode) {
    menuEl.innerHTML = '<div class="menu-loading" aria-label="Caricamento del menu"><span></span><span></span><span></span></div>';
    fallbackTimer = setTimeout(useFallbackMenu, 6000);
  } else {
    setMenu(fromData(D.menu));
  }

  window.ZanzibarMenu = { setMenu: setMenu, useFallbackMenu: useFallbackMenu };

  /* ---------- APERTO ORA / CHIUSO ----------
     Legge D.apertura (0 = domenica). Se la chiusura è prima dell'apertura
     (es. 06:00 – 01:00) il locale resta aperto fino all'1:00 del giorno dopo. */
  var GIORNI_NOME = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
  var toMin = function (hhmm) { var p = String(hhmm).split(":"); return Number(p[0]) * 60 + Number(p[1] || 0); };
  var hourText = function (hhmm) { return String(hhmm).replace(/^0(\d)/, "$1"); };
  var alle = function (hhmm) { var h = hourText(hhmm); return (/^1:/.test(h) ? "all'" : "alle ") + h; };

  function openState(now) {
    var A = D.apertura || [];
    var day = now.getDay(), mins = now.getHours() * 60 + now.getMinutes();
    var y = A[(day + 6) % 7];
    if (y && toMin(y[1]) <= toMin(y[0]) && mins < toMin(y[1])) return { open: true, until: y[1] };
    var t = A[day];
    if (t) {
      var o = toMin(t[0]), c = toMin(t[1]);
      if (mins >= o && (c <= o || mins < c)) return { open: true, until: t[1] };
      if (mins < o) return { open: false, next: alle(t[0]) };
    }
    for (var i = 1; i <= 7; i++) {
      var n = A[(day + i) % 7];
      if (n) return { open: false, next: (i === 1 ? "domani " : GIORNI_NOME[(day + i) % 7] + " ") + alle(n[0]) };
    }
    return null;
  }
  function openText() {
    var st = openState(new Date());
    if (!st) return "";
    return st.open
      ? '<span class="dot is-open" aria-hidden="true"></span><strong>Aperto ora</strong> · fino ' + esc(alle(st.until))
      : '<span class="dot" aria-hidden="true"></span><strong>Chiuso</strong> · apre ' + esc(st.next);
  }
  function renderOpenNow() {
    var el = $("#openNow"), html = openText();
    el.innerHTML = html + '<span class="open-addr">' + esc(D.info.indirizzo) + "<br>" + esc(D.info.riferimento || "") + "</span>";
    el.hidden = false;
  }
  renderOpenNow();

  /* ---------- FOOTER LEGALE ---------- */
  var L = D.legale || {};
  $("#legal").innerHTML =
    "<p><strong>" + esc(D.info.nome) + " · " + esc(D.info.sottotitolo) + "</strong><br>" + esc(D.info.indirizzo) + "</p>" +
    "<p>" + esc(L.ragioneSociale) + " · P.IVA " + esc(L.piva) + "<br>Sede legale: " + esc(L.sede) + "</p>" +
    '<p><a href="privacy.html">Privacy</a></p>';

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
    renderOpenNow();
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
    if (!(state && state.sheet)) closeSheet();
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
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (sheetOpen) closeSheetFromUser();
    else if (drawer.classList.contains("is-open")) closeAll();
  });

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
      $("#about").innerHTML =
        '<span class="eyebrow">' + esc(D.info.nome) + " · " + esc(D.info.sottotitolo) + "</span>" +
        D.info.chiSiamo.map(function (p, i) { return "<p" + (i === 0 ? ' class="lead"' : "") + ">" + esc(p) + "</p>"; }).join("");
    },

    contacts: function () {
      var I = D.info;
      var wa = "https://wa.me/" + I.whatsapp + "?text=" + encodeURIComponent(I.whatsappMessaggio || "");
      $("#contacts").innerHTML =
        '<div class="block"><h3>Orari di apertura</h3><p class="open-line">' + openText() + '</p><table class="hours">' +
          D.orari.map(function (o) { return "<tr" + (isToday(o.giorni) ? ' class="is-today"' : "") + "><td>" + esc(o.giorni) + "</td><td>" + esc(o.ore) + "</td></tr>"; }).join("") +
        "</table></div>" +
        '<div class="block"><h3>Contatti</h3><p>' + esc(I.telefono) + "</p>" +
          '<div class="btn-row"><a class="btn btn-primary" href="tel:' + esc(I.telefonoLink) + '">Chiama</a>' +
          '<a class="btn" href="' + esc(wa) + '" target="_blank" rel="noopener">WhatsApp</a></div></div>' +
        '<div class="block"><h3>Indirizzo</h3><p>' + esc(I.indirizzo) + "<br>" + esc(I.riferimento || "") + "</p></div>" +
        (I.social && I.social.length ? '<div class="block"><h3>Seguici</h3><div class="btn-row">' +
          I.social.map(function (s) { return '<a class="btn" href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.nome) + "</a>"; }).join("") +
        "</div></div>" : "");
    },

    // La mappa di Google si carica SOLO dopo il clic su "Mostra la mappa"
    map: function () {
      var q = encodeURIComponent(D.info.mappa || D.info.indirizzo);
      var box = $("#map");
      box.innerHTML =
        '<div class="map-box" id="mapBox">' +
          '<p class="map-addr"><strong>' + esc(D.info.nome) + "</strong><br>" + esc(D.info.indirizzo) + "<br>" + esc(D.info.riferimento || "") + "</p>" +
          '<button type="button" class="btn btn-primary" id="mapLoad">Mostra la mappa</button>' +
          '<p class="map-note">Caricando la mappa, Google riceverà alcuni dati di navigazione.</p>' +
        "</div>" +
        '<div class="btn-row"><a class="btn" href="https://www.google.com/maps/search/?api=1&query=' + q + '" target="_blank" rel="noopener">Apri in Google Maps</a></div>';
      $("#mapLoad").addEventListener("click", function () {
        var f = document.createElement("iframe");
        f.className = "map-frame";
        f.title = "Mappa di " + D.info.nome;
        f.referrerPolicy = "no-referrer-when-downgrade";
        f.src = "https://maps.google.com/maps?q=" + q + "&z=16&output=embed";
        $("#mapBox").replaceWith(f);
      });
    }
  };

  /* ---------- SCHEDA PRODOTTO ---------- */
  // La foto si scarica solo quando si apre la scheda: il menu resta leggero.
  var sheet = $("#sheet"), card = $("#sheetCard"), sheetImg = $("#sheetImg"), sheetPh = $("#sheetPh");
  var sheetOpen = false, sheetToken = 0, sheetReturn = null;
  var desktop = window.matchMedia("(min-width: 760px)");

  function openSheet(k) {
    var entry = sheetItems[k];
    if (!entry) return;
    var v = entry.item;
    var token = ++sheetToken;
    sheetReturn = document.activeElement;

    $("#sheetCat").textContent = entry.cat;
    $("#sheetName").innerHTML = esc(v.name) + (v.symbol ? ' <span class="item-sym">' + esc(v.symbol) + "</span>" : "");
    $("#sheetDesc").textContent = v.desc || "";
    $("#sheetDesc").hidden = !v.desc;
    // nella scheda i prezzi hanno anche l'etichetta: "100 g € 6,50 · 200 g € 9,00"
    var ps = validPrices(v.prices);
    $("#sheetPrice").innerHTML = ps.map(function (x) {
      return "<span>" + (x.label ? "<small>" + esc(x.label) + "</small> " : "") + "€ " + money(x.value) + "</span>";
    }).join('<i aria-hidden="true">·</i>');
    $(".sheet-foot", sheet).hidden = !ps.length;
    $("#sheetPhName").textContent = v.name;

    // Foto: parte nascosta sopra il segnaposto e compare in dissolvenza solo se si carica davvero
    sheetImg.classList.remove("is-loaded");
    sheetImg.parentNode.classList.remove("has-photo");
    sheetImg.removeAttribute("src");
    sheetImg.alt = v.name;
    getPhoto(v).then(function (src) {
      if (!src || token !== sheetToken) return;
      sheetImg.onload = function () {
        if (token !== sheetToken) return;
        sheetImg.classList.add("is-loaded");
        sheetImg.parentNode.classList.add("has-photo");   // il segnaposto sfuma via: non traspare sotto la foto
      };
      sheetImg.onerror = function () { sheetImg.removeAttribute("src"); };
      sheetImg.src = src;
    });

    card.style.transform = "";
    card.scrollTop = 0;
    sheet.hidden = false;
    document.body.classList.add("lock");
    sheetOpen = true;
    requestAnimationFrame(function () { requestAnimationFrame(function () { sheet.classList.add("is-open"); }); });
    setTimeout(function () { var x = $(".sheet-close", sheet); if (x) x.focus({ preventScroll: true }); }, 50);
  }

  function getPhoto(v) {
    if (v.id && window.ZanzibarPhotos) return window.ZanzibarPhotos.get(v.id).catch(function () { return null; });
    return Promise.resolve(null);
  }

  function closeSheet() {
    if (!sheetOpen) return;
    sheetOpen = false;
    sheetToken++;
    sheet.classList.remove("is-open");
    card.style.transform = "";
    if (!drawer.classList.contains("is-open")) document.body.classList.remove("lock");
    setTimeout(function () { if (!sheetOpen) { sheet.hidden = true; sheetImg.removeAttribute("src"); } }, 420);
    if (sheetReturn && document.contains(sheetReturn)) sheetReturn.focus({ preventScroll: true });
  }
  // chiusura da X, sfondo, Esc o swipe: torna indietro nella cronologia (così il tasto "indietro" resta coerente)
  function closeSheetFromUser() {
    if (history.state && history.state.sheet) history.back(); else closeSheet();
  }

  menuEl.addEventListener("click", function (e) {
    var it = e.target.closest(".item[data-k]");
    if (!it) return;
    history.pushState({ sheet: 1 }, "");
    openSheet(+it.dataset.k);
  });
  menuEl.addEventListener("keydown", function (e) {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches(".item[data-k]")) { e.preventDefault(); e.target.click(); }
  });
  $$("[data-close-sheet]", sheet).forEach(function (el) { el.addEventListener("click", closeSheetFromUser); });

  // Swipe verso il basso per chiudere (solo telefono, quando la scheda è in cima)
  var startY = null, startT = 0, dy = 0;
  card.addEventListener("touchstart", function (e) {
    if (desktop.matches || card.scrollTop > 0 || e.touches.length > 1) { startY = null; return; }
    startY = e.touches[0].clientY; startT = Date.now(); dy = 0;
  }, { passive: true });
  card.addEventListener("touchmove", function (e) {
    if (startY === null) return;
    dy = e.touches[0].clientY - startY;
    if (dy <= 0) { card.style.transform = ""; return; }
    card.classList.add("is-dragging");
    card.style.transform = "translateY(" + dy + "px)";
    if (e.cancelable) e.preventDefault();
  }, { passive: false });
  card.addEventListener("touchend", function () {
    if (startY === null) return;
    card.classList.remove("is-dragging");
    var fast = dy > 40 && dy / Math.max(1, Date.now() - startT) > 0.5;
    if (dy > 120 || fast) closeSheetFromUser();
    else card.style.transform = "";
    startY = null;
  });

  // se la pagina viene ricaricata con il pannello o la scheda aperti, riparti pulito
  if (history.state && (history.state.z || history.state.sheet)) history.replaceState(null, "");
})();
