/* ==========================================================
   Zanzibar — menu in tempo reale da Firestore
   Legge le collezioni "categories" e "items" e aggiorna il menu
   ad ogni modifica fatta dal pannello admin, senza ricaricare la pagina.

   È uno script normale (non type="module") che carica Firebase con import():
   così funziona sia dal sito pubblicato sia aprendo index.html con doppio clic
   (i browser bloccano i file type="module" locali, ma non questo caricamento).
   ========================================================== */
(async function () {
  "use strict";

  var site = window.ZanzibarMenu;
  if (!window.ZANZIBAR_FIREBASE_READY || !site) return;

  var SDK = "https://www.gstatic.com/firebasejs/12.19.0/";

  function byOrder(a, b) {
    return ((Number(a.order) || 0) - (Number(b.order) || 0)) || String(a.name).localeCompare(String(b.name), "it");
  }

  // Trasforma i documenti di Firestore nel formato di data.js (categoria → voci)
  function buildMenu(categories, items) {
    return categories.slice().sort(byOrder).map(function (c) {
      return {
        categoria: c.name,
        voci: items.filter(function (v) { return v.categoryId === c.id; }).sort(byOrder).map(function (v) {
          return {
            nome: v.name,
            desc: v.description || "",
            prezzo: Number(v.price) || 0,
            tag: v.tag || "",
            disponibile: v.available !== false
          };
        })
      };
    }).filter(function (c) { return c.voci.length; });
  }

  function fail(err) {
    console.warn("Firestore non raggiungibile, uso il menu di data.js.", err);
    site.useFallbackMenu();
  }

  try {
    var appMod = await import(SDK + "firebase-app.js");
    var fs = await import(SDK + "firebase-firestore.js");
    var app = appMod.initializeApp(window.ZANZIBAR_FIREBASE_CONFIG);

    // Sul sito pubblicato la cache locale fa comparire il menu subito alle visite successive.
    // Aprendo il file in locale (file://) la cache non è disponibile: si usa quella in memoria.
    var db = location.protocol === "file:"
      ? fs.getFirestore(app)
      : fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });

    var categories = null;
    var items = null;
    var toList = function (snap) { return snap.docs.map(function (d) { return Object.assign({}, d.data(), { id: d.id }); }); };
    var update = function () { if (categories && items) site.setMenu(buildMenu(categories, items)); };

    fs.onSnapshot(fs.collection(db, "categories"), function (snap) { categories = toList(snap); update(); }, fail);
    fs.onSnapshot(fs.collection(db, "items"), function (snap) { items = toList(snap); update(); }, fail);
  } catch (err) {
    fail(err);
  }
})();
