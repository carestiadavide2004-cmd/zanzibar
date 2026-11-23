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

  // Trasforma i documenti di Firestore nel formato usato da app.js.
  // Se le categorie non hanno ancora il campo "section" nel database c'è il vecchio menu di esempio:
  // restituisce null e il sito mostra il menu vero scritto in data.js.
  function buildMenu(categories, items) {
    if (!categories.some(function (c) { return typeof c.section === "string"; })) return null;
    return categories.slice().sort(byOrder).map(function (c) {
      return {
        id: c.id,
        name: c.name,
        section: c.section,
        note: c.note || "",
        visible: c.visible !== false,
        items: items.filter(function (v) { return v.categoryId === c.id; }).sort(byOrder).map(function (v) {
          return {
            id: v.id,
            name: v.name,
            desc: v.description || "",
            prices: Array.isArray(v.prices) ? v.prices : [],
            symbol: v.symbol || "",
            visible: v.visible !== false,
            hasPhoto: v.hasPhoto === true
          };
        })
      };
    });
  }

  function fail(err) {
    console.warn("Firestore non raggiungibile, uso il menu di data.js.", err && err.code);
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
    var update = function () {
      if (!categories || !items) return;
      var menu = buildMenu(categories, items);
      if (menu) site.setMenu(menu); else site.useFallbackMenu();
    };

    // Foto dei prodotti (collezione "photos", un documento per voce): lette una per volta,
    // solo quando si apre la scheda di quel prodotto, e tenute in memoria per le riaperture.
    var photoCache = {};
    window.ZanzibarPhotos = {
      get: function (id) {
        if (!photoCache[id]) {
          photoCache[id] = fs.getDoc(fs.doc(db, "photos", id)).then(function (snap) {
            var data = snap.exists() ? snap.data().data : null;
            return typeof data === "string" && data.indexOf("data:image/") === 0 ? data : null;
          }, function (err) {
            delete photoCache[id];   // errore di rete: riprova alla prossima apertura
            throw err;
          });
        }
        return photoCache[id];
      }
    };

    fs.onSnapshot(fs.collection(db, "categories"), function (snap) { categories = toList(snap); update(); }, fail);
    fs.onSnapshot(fs.collection(db, "items"), function (snap) { items = toList(snap); update(); }, fail);
  } catch (err) {
    fail(err);
  }
})();
