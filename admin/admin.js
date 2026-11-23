/* ==========================================================
   Zanzibar — pannello di amministrazione del menu
   Firebase Authentication (email e password) + Firestore
   Collezioni: "categories" { name, order, section ("food" | "drink"), note, visible }
               "items" { name, description, prices [{ label, value }] (0-2), symbol, visible, hasPhoto, categoryId, order }
               "photos" { data } → foto JPEG compressa (data URL), stesso ID della voce
   ========================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, onSnapshot, addDoc, setDoc, updateDoc, writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const ADMIN_EMAILS = (window.ZANZIBAR_ADMIN_EMAILS || []).map((e) => e.trim().toLowerCase()).filter(Boolean);

const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const byOrder = (a, b) => ((Number(a.order) || 0) - (Number(b.order) || 0)) || String(a.name).localeCompare(String(b.name), "it");
const nextOrder = (list) => list.reduce((m, x) => Math.max(m, Number(x.order) || 0), 0) + 1;

/* ---------- Viste ---------- */
const views = { loading: $("#viewLoading"), setup: $("#viewSetup"), login: $("#viewLogin"), app: $("#viewApp") };
function showView(name) {
  Object.entries(views).forEach(([k, el]) => { el.hidden = k !== name; });
}

/* ---------- Toast ---------- */
const toast = $("#toast");
let toastTimer;
function showToast(msg, isError = false) {
  toast.textContent = msg;
  toast.classList.toggle("is-error", isError);
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), isError ? 5000 : 3000);
}

function friendlyError(err) {
  const code = (err && err.code) || "";
  const map = {
    "auth/invalid-credential": "Email o password non corretti.",
    "auth/wrong-password": "Email o password non corretti.",
    "auth/user-not-found": "Email o password non corretti.",
    "auth/invalid-email": "L'indirizzo email non è valido.",
    "auth/missing-password": "Inserisci la password.",
    "auth/too-many-requests": "Troppi tentativi. Riprova tra qualche minuto.",
    "auth/user-disabled": "Questo account è stato disattivato.",
    "auth/network-request-failed": "Connessione assente. Controlla la rete e riprova.",
    "auth/unauthorized-domain": "Dominio non autorizzato: aggiungilo in Firebase → Authentication → Impostazioni → Domini autorizzati.",
    "auth/operation-not-allowed": "L'accesso con email e password non è attivo in Firebase Authentication.",
    "permission-denied": "Permesso negato: controlla che in Firebase siano pubblicate le regole aggiornate (file firestore.rules).",
    "too-many": "Troppe modifiche in una volta sola (oltre 500): contatta chi ha fatto il sito.",
    "unavailable": "Database non raggiungibile. Controlla la connessione.",
    "not-found": "L'elemento non esiste più.",
    "invalid-argument": "Dati non validi: controlla i campi e riprova.",
    "photo/not-image": "Il file scelto non è un'immagine.",
    "photo/too-large-file": "La foto è troppo grande (oltre 40 MB): scegline un'altra.",
    "photo/unreadable": "Impossibile leggere questa foto (formato non supportato da questo browser). Prova a scattarla di nuovo o a usare un JPEG.",
    "photo/too-large": "La foto resta troppo pesante anche dopo la compressione: scegline un'altra.",
    "photo/offline": "Connessione assente: la foto non può essere salvata. Controlla la rete e riprova.",
    "timeout": "Il database non ha confermato il salvataggio. Controlla la connessione e che le regole di Firestore pubblicate siano quelle del file firestore.rules."
  };
  return map[code] || "Si è verificato un errore" + (code ? ` (${code})` : "") + ".";
}

// Le scritture su Firestore si confermano solo quando il server risponde:
// se non risponde entro 15 secondi lo segnaliamo invece di restare in attesa per sempre.
function confirmed(promise, ms = 15000) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject({ code: "timeout" }), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function reportError(where, err) {
  console.error(`[admin] ${where} non riuscito:`, (err && err.code) || "", (err && err.message) || "", err);
  showToast(friendlyError(err), true);
  return friendlyError(err);
}

/* ---------- Compressione foto (nel browser, prima del salvataggio) ---------- */
// Lato lungo massimo 900px, JPEG, sotto i 150 KB. Il risultato è un data URL salvato in Firestore.
const PHOTO_MAX_SIDE = 900;
const PHOTO_MAX_BYTES = 150 * 1024;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject({ code: "photo/unreadable" }); };
    img.src = url;   // il browser applica da solo l'orientamento EXIF delle foto del telefono
  });
}
const toBlob = (canvas, q) => new Promise((res) => canvas.toBlob(res, "image/jpeg", q));
const blobToDataURL = (blob) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = () => rej({ code: "photo/unreadable" });
  r.readAsDataURL(blob);
});

async function compressPhoto(file) {
  if (!file || !/^image\//.test(file.type || "image/")) throw { code: "photo/not-image" };
  if (file.size > 40 * 1024 * 1024) throw { code: "photo/too-large-file" };
  const img = await loadImage(file);
  let scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  for (let round = 0; round < 6; round++) {
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    ctx.fillStyle = "#fff";   // le PNG trasparenti diventano su fondo bianco
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const q of [0.82, 0.74, 0.66, 0.58, 0.5]) {
      const blob = await toBlob(canvas, q);
      if (blob && blob.size <= PHOTO_MAX_BYTES) {
        return { dataUrl: await blobToDataURL(blob), bytes: blob.size, width: canvas.width, height: canvas.height };
      }
    }
    scale *= 0.85;   // ancora troppo pesante: riduce un po' le dimensioni e riprova
  }
  throw { code: "photo/too-large" };
}

/* ---------- Avvio ---------- */
if (!window.ZANZIBAR_FIREBASE_READY) {
  showView("setup");
} else {
  start();
}

function start() {
  let app;
  try {
    app = initializeApp(window.ZANZIBAR_FIREBASE_CONFIG);
  } catch (err) {
    console.error(err);
    showView("setup");
    return;
  }
  const auth = getAuth(app);
  const db = getFirestore(app);
  const categoriesCol = collection(db, "categories");
  const itemsCol = collection(db, "items");

  let categories = [];
  let items = [];
  let loaded = { categories: false, items: false };
  let unsubscribers = [];

  /* ---------- Autenticazione ---------- */
  const loginForm = $("#loginForm");
  const loginMsg = $("#loginMsg");
  const loginSubmit = $("#loginSubmit");
  const emailInput = $("#loginEmail");
  const passwordInput = $("#loginPassword");

  onAuthStateChanged(auth, (user) => {
    unsubscribers.forEach((u) => u());
    unsubscribers = [];
    if (!user) {
      showView("login");
      return;
    }
    if (ADMIN_EMAILS.length && !ADMIN_EMAILS.includes((user.email || "").toLowerCase())) {
      signOut(auth);
      loginMsg.classList.remove("is-ok");
      loginMsg.textContent = "Questo account non è autorizzato ad accedere al pannello.";
      return;
    }
    $("#userEmail").textContent = user.email;
    showView("app");
    listenMenu();
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginMsg.classList.remove("is-ok");
    loginMsg.textContent = "";
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
      loginMsg.textContent = "Inserisci email e password.";
      return;
    }
    loginSubmit.disabled = true;
    loginSubmit.textContent = "Accesso in corso…";
    try {
      await signInWithEmailAndPassword(auth, email, password);
      passwordInput.value = "";
    } catch (err) {
      loginMsg.textContent = friendlyError(err);
    } finally {
      loginSubmit.disabled = false;
      loginSubmit.textContent = "Accedi";
    }
  });

  $("#togglePassword").addEventListener("click", (e) => {
    const show = passwordInput.type === "password";
    passwordInput.type = show ? "text" : "password";
    e.currentTarget.textContent = show ? "Nascondi" : "Mostra";
    e.currentTarget.setAttribute("aria-label", show ? "Nascondi password" : "Mostra password");
  });

  $("#forgotPassword").addEventListener("click", async () => {
    const email = emailInput.value.trim();
    loginMsg.classList.remove("is-ok");
    if (!email) {
      loginMsg.textContent = "Scrivi la tua email qui sopra, poi premi di nuovo \"Password dimenticata?\".";
      emailInput.focus();
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      if (err.code === "auth/invalid-email" || err.code === "auth/network-request-failed") {
        loginMsg.textContent = friendlyError(err);
        return;
      }
    }
    // Stesso messaggio in ogni caso, per non rivelare quali email sono registrate
    loginMsg.classList.add("is-ok");
    loginMsg.textContent = "Se l'indirizzo è registrato, riceverai un'email per reimpostare la password.";
  });

  $("#logoutBtn").addEventListener("click", () => signOut(auth));


  /* ---------- Menu in tempo reale ---------- */
  const SECTIONS = (window.ZANZIBAR && window.ZANZIBAR.sezioni) || { food: "Menù Food", drink: "Drink" };
  const SECTION_KEYS = Object.keys(SECTIONS);

  function listenMenu() {
    loaded = { categories: false, items: false };
    const onError = (err) => {
      console.error(err);
      showToast(friendlyError(err), true);
    };
    unsubscribers.push(onSnapshot(categoriesCol, (snap) => {
      categories = snap.docs.map((d) => ({ ...d.data(), id: d.id })).sort(byOrder);
      loaded.categories = true;
      render();
    }, onError));
    unsubscribers.push(onSnapshot(itemsCol, (snap) => {
      items = snap.docs.map((d) => ({ ...d.data(), id: d.id })).sort(byOrder);
      loaded.items = true;
      render();
    }, onError));
  }

  const itemsOf = (catId) => items.filter((v) => v.categoryId === catId);
  const categoryById = (id) => categories.find((c) => c.id === id);
  const catsOf = (section) => categories.filter((c) => c.section === section);
  const sameSection = (c) => categories.filter((x) => x.section === c.section);
  // Il vecchio menu di esempio non ha il campo "section" nelle categorie
  const isLegacy = () => categories.length > 0 && !categories.some((c) => typeof c.section === "string");

  // Prezzi di una voce (accetta anche il vecchio formato con un solo "price")
  const pricesOf = (v) => Array.isArray(v.prices) ? v.prices : (typeof v.price === "number" ? [{ label: "", value: v.price }] : []);
  const isVisible = (x) => (x.visible !== undefined ? x.visible !== false : x.available !== false);
  const money = (n) => Number(n).toFixed(2).replace(".", ",");
  const priceText = (list) => (list.length ? "€ " + list.map((p) => money(p.value)).join(" / ") : "");

  function render() {
    if (!loaded.categories || !loaded.items) return;
    $("#legacyNotice").hidden = !isLegacy();
    renderCategoryOptions();
    renderGroups();
  }

  // Tendina delle categorie nel form voce, divisa per sezione
  function renderCategoryOptions() {
    const opt = (c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`;
    const others = categories.filter((c) => !SECTIONS[c.section]);
    const formValue = F.categoryId.value;
    F.categoryId.innerHTML = SECTION_KEYS.map((k) => {
      const list = catsOf(k);
      return list.length ? `<optgroup label="${esc(SECTIONS[k])}">${list.map(opt).join("")}</optgroup>` : "";
    }).join("") + (others.length ? `<optgroup label="Senza sezione">${others.map(opt).join("")}</optgroup>` : "");
    if (categoryById(formValue)) F.categoryId.value = formValue;
  }

  const searchInput = $("#searchInput");
  searchInput.addEventListener("input", renderGroups);

  const icons = {
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 5.6A10 10 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-3.2 3.9M6.6 6.6C3.8 8.3 2 12 2 12s3.6 6.5 10 6.5c1.6 0 3-.4 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>'
  };
  const iconBtn = (action, icon, label, disabled = false) =>
    `<button class="icon-btn${action.endsWith("delete") ? " icon-btn--danger" : ""}" data-action="${action}" aria-label="${esc(label)}" title="${esc(label)}"${disabled ? " disabled" : ""}>${icons[icon]}</button>`;

  function rowHtml(v, pos, total, inCategory) {
    const vis = isVisible(v);
    const ps = pricesOf(v);
    const labels = ps.map((p) => p.label).filter(Boolean);
    return `
      <div class="row${vis ? "" : " is-hidden"}" data-id="${esc(v.id)}">
        <button class="row__main" data-action="item-edit" aria-label="Modifica ${esc(v.name)}">
          <span class="row__name">${esc(v.name)}${v.symbol ? ` <span class="row__sym">${esc(v.symbol)}</span>` : ""}</span>
          ${v.description ? `<span class="row__desc">${esc(v.description)}</span>` : ""}
          <span class="row__meta">
            <span class="row__price${ps.length ? "" : " is-empty"}">${ps.length ? esc(priceText(ps)) : "Senza prezzo"}</span>
            ${labels.length ? `<span class="row__labels">${esc(labels.join(" / "))}</span>` : ""}
            ${v.hasPhoto ? '<span class="badge badge--soft">Foto</span>' : ""}
            ${vis ? "" : '<span class="badge">Nascosta</span>'}
          </span>
        </button>
        <div class="row__actions">
          ${inCategory ? iconBtn("item-up", "up", `Sposta su ${v.name}`, pos === 0) : ""}
          ${inCategory ? iconBtn("item-down", "down", `Sposta giù ${v.name}`, pos === total - 1) : ""}
          ${iconBtn("item-visible", vis ? "eye" : "eyeOff", vis ? `Nascondi ${v.name}` : `Mostra ${v.name}`)}
          ${iconBtn("item-delete", "trash", `Elimina ${v.name}`)}
        </div>
      </div>`;
  }

  function groupHtml(c, index, count, all, list) {
    const hidden = c.visible === false;
    const shownOnSite = !hidden && all.some(isVisible);
    const badges =
      (hidden ? '<span class="badge">Nascosta</span>' : "") +
      (!hidden && !shownOnSite ? '<span class="badge badge--soft">Vuota: non compare sul menù</span>' : "");
    return `
      <section class="group${hidden ? " is-hidden" : ""}" data-cat="${esc(c.id)}">
        <header class="group__head">
          <button class="group__name" data-action="cat-edit" aria-label="Modifica la categoria ${esc(c.name)}">
            <span class="group__title">${esc(c.name)}</span>
            <span class="group__meta">${all.length} ${all.length === 1 ? "voce" : "voci"} ${badges}</span>
            ${c.note ? `<span class="group__note">Nota: ${esc(c.note)}</span>` : ""}
          </button>
          <div class="group__actions">
            ${iconBtn("cat-up", "up", `Sposta su ${c.name}`, index === 0)}
            ${iconBtn("cat-down", "down", `Sposta giù ${c.name}`, index === count - 1)}
            ${iconBtn("cat-visible", hidden ? "eyeOff" : "eye", hidden ? `Mostra ${c.name}` : `Nascondi ${c.name}`)}
            ${iconBtn("cat-delete", "trash", `Elimina ${c.name}`)}
          </div>
        </header>
        <div class="group__rows">${list.map((v) => rowHtml(v, all.indexOf(v), all.length, true)).join("") ||
          '<p class="group__empty">Nessuna voce in questa categoria.</p>'}</div>
        <button class="group__add" data-action="cat-add">+ Aggiungi una voce in ${esc(c.name)}</button>
      </section>`;
  }

  function renderGroups() {
    const q = searchInput.value.trim().toLowerCase();
    const matches = (v) => !q || [v.name, v.description].some((s) => String(s || "").toLowerCase().includes(q));

    const isEmpty = categories.length === 0 && items.length === 0;
    $("#emptyState").hidden = !isEmpty;
    $("#toolbar").hidden = isEmpty;

    const blocks = SECTION_KEYS.map((k) => ({ title: SECTIONS[k], cats: catsOf(k) }));
    const others = categories.filter((c) => !SECTIONS[c.section]);
    if (others.length) blocks.push({ title: "Senza sezione", warn: true, cats: others });

    let shown = 0;
    let html = isEmpty ? "" : blocks.map((b) => {
      const groups = b.cats.map((c, i) => {
        const all = itemsOf(c.id);
        const list = all.filter(matches);
        if (q && !list.length) return "";
        shown += list.length;
        return groupHtml(c, i, b.cats.length, all, list);
      }).join("");
      if (q && !groups) return "";
      return `<section class="block">
        <h2 class="block__title">${esc(b.title)}${b.warn ? ' <span class="badge badge--warn">da sistemare</span>' : ""}</h2>
        ${groups || '<p class="block__empty">Nessuna categoria in questa sezione: creala con “+ Categoria”.</p>'}
      </section>`;
    }).join("");

    // Voci rimaste senza categoria (non visibili sul sito): mostrate in fondo per poterle sistemare
    const orphans = items.filter((v) => !categoryById(v.categoryId)).filter(matches);
    if (orphans.length) {
      shown += orphans.length;
      html += `<section class="block"><h2 class="block__title">Voci senza categoria <span class="badge badge--warn">non visibili</span></h2>
        <section class="group" data-cat=""><div class="group__rows">${orphans.map((v) => rowHtml(v, 0, 1, false)).join("")}</div></section></section>`;
    }

    $("#menuGroups").innerHTML = html;
    $("#noResults").hidden = isEmpty || !q || shown > 0;
  }

  $("#menuGroups").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn || btn.disabled) return;
    const group = btn.closest(".group");
    const category = group ? categoryById(group.dataset.cat) : null;
    const row = btn.closest(".row");
    const item = row ? items.find((v) => v.id === row.dataset.id) : null;
    switch (btn.dataset.action) {
      case "cat-up": return category && reorder("categories", sameSection(category), category, -1);
      case "cat-down": return category && reorder("categories", sameSection(category), category, 1);
      case "cat-visible": return category && toggleVisible("categories", category);
      case "cat-edit": return category && openCategoryForm(category);
      case "cat-delete": return category && askDeleteCategory(category);
      case "cat-add": return category && openItemForm(null, category.id);
      case "item-up": return item && reorder("items", itemsOf(item.categoryId), item, -1);
      case "item-down": return item && reorder("items", itemsOf(item.categoryId), item, 1);
      case "item-visible": return item && toggleVisible("items", item);
      case "item-edit": return item && openItemForm(item);
      case "item-delete": return item && askDeleteItem(item);
    }
  });

  /* ---------- Visibile / nascosta ---------- */
  async function toggleVisible(colName, x) {
    const visible = !isVisible(x);
    try {
      await confirmed(updateDoc(doc(db, colName, x.id), { visible, updatedAt: serverTimestamp() }));
      showToast(`"${x.name}" ${visible ? "di nuovo visibile sul menù" : "nascost" + (colName === "categories" ? "a" : "o") + " dal menù"}`);
    } catch (err) {
      reportError("Cambio visibilità", err);
    }
  }

  /* ---------- Ordinamento (frecce su / giù) ---------- */
  // Scambia l'elemento con il vicino e riscrive le posizioni 1, 2, 3… solo dove cambiano
  async function reorder(colName, list, el, dir) {
    const arr = list.slice();
    const i = arr.indexOf(el);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    const batch = writeBatch(db);
    let changes = 0;
    arr.forEach((x, k) => {
      if (Number(x.order) !== k + 1) {
        batch.update(doc(db, colName, x.id), { order: k + 1, updatedAt: serverTimestamp() });
        changes++;
      }
    });
    if (!changes) return;
    try {
      await confirmed(batch.commit());
    } catch (err) {
      reportError("Riordino", err);
    }
  }

  /* ---------- Importazione del menù vero (da data.js) ---------- */
  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function askImport() {
    const menu = window.ZANZIBAR && window.ZANZIBAR.menu;
    if (!Array.isArray(menu) || !menu.length) {
      showToast("Non trovo il menù vero nel file data.js.", true);
      return;
    }
    const nItems = menu.reduce((n, c) => n + (c.voci || []).length, 0);
    askConfirm({
      title: "Importare il menù vero?",
      text: `Tutto quello che c'è ora nel pannello (${categories.length} categorie, ${items.length} voci e le loro foto) verrà sostituito con il menù vero: ${menu.length} categorie e ${nItems} voci. ` +
        "Prima viene scaricata sul dispositivo una copia di sicurezza di quello che c'è adesso. L'operazione non si può annullare dal pannello.",
      ok: "Sì, sostituisci tutto",
      run: () => importRealMenu(menu)
    });
  }

  async function importRealMenu(menu) {
    // 1) Copia di sicurezza di tutto quello che c'è ora (anche le foto), scaricata sul dispositivo
    const photosCol = collection(db, "photos");
    const [cs, is, ps] = await Promise.all([getDocs(categoriesCol), getDocs(itemsCol), getDocs(photosCol)]);
    const dump = (snap) => snap.docs.map((d) => ({ id: d.id, data: d.data() }));
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    downloadJSON({
      progetto: window.ZANZIBAR_FIREBASE_CONFIG.projectId,
      esportato: new Date().toISOString(),
      collezioni: { categories: dump(cs), items: dump(is), photos: dump(ps) }
    }, `zanzibar-copia-di-sicurezza-${stamp}.json`);

    // 2) Sostituzione in un'unica operazione: o va a buon fine tutta, o non cambia niente
    const batch = writeBatch(db);
    let ops = 0;
    [cs, is, ps].forEach((snap) => snap.docs.forEach((d) => { batch.delete(d.ref); ops++; }));
    let count = 0;
    menu.forEach((c, ci) => {
      const cref = doc(categoriesCol);
      batch.set(cref, {
        name: String(c.categoria),
        order: ci + 1,
        section: SECTIONS[c.sezione] ? c.sezione : SECTION_KEYS[0],
        note: String(c.nota || ""),
        visible: c.visibile !== false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      ops++;
      (c.voci || []).forEach((v, vi) => {
        const prices = (v.prezzi || [])
          .filter((p) => p && p.valore !== null && p.valore !== "" && isFinite(Number(p.valore)))
          .slice(0, 2)
          .map((p) => ({ label: String(p.etichetta || ""), value: Math.round(Number(p.valore) * 100) / 100 }));
        batch.set(doc(itemsCol), {
          name: String(v.nome),
          description: String(v.desc || ""),
          prices,
          symbol: String(v.simbolo || ""),
          visible: v.visibile !== false,
          hasPhoto: false,
          categoryId: cref.id,
          order: vi + 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        ops++;
        count++;
      });
    });
    if (ops > 500) throw { code: "too-many" };
    await confirmed(batch.commit(), 45000);
    searchInput.value = "";
    showToast(`Menù vero importato: ${menu.length} categorie e ${count} voci`);
  }
  $$("[data-import]").forEach((b) => b.addEventListener("click", askImport));

  /* ---------- Apertura / chiusura pannelli ---------- */
  let returnFocus = null;
  function openLayer(el, focusEl) {
    returnFocus = document.activeElement;
    el.hidden = false;
    document.body.classList.add("no-scroll");
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-open")));
    // sul telefono niente focus automatico sui campi: aprirebbe la tastiera e farebbe "saltare" la pagina
    if (focusEl && window.matchMedia("(hover: hover)").matches) setTimeout(() => focusEl.focus({ preventScroll: true }), 300);
  }
  function closeLayer(el, delay) {
    el.classList.remove("is-open");
    if (![itemDrawer, categoryDialog, confirmDialog].some((x) => x !== el && !x.hidden)) document.body.classList.remove("no-scroll");
    setTimeout(() => { if (!el.classList.contains("is-open")) el.hidden = true; }, delay);
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
  }

  /* ---------- Form voce ---------- */
  const itemDrawer = $("#itemDrawer");
  const itemForm = $("#itemForm");
  const F = itemForm.elements; // campi del form (itemForm.name sarebbe il nome del form stesso)
  const itemFormMsg = $("#itemFormMsg");
  const itemSaveBtn = $("#itemSaveBtn");
  let editingItem = null;

  itemForm.addEventListener("input", (e) => e.target.classList.remove("is-invalid"));
  $$("[data-symbol]", itemForm).forEach((b) => b.addEventListener("click", () => { F.symbol.value = b.dataset.symbol; }));

  /* ---------- Foto del prodotto ---------- */
  const photoBox = $("#photoBox");
  const photoImg = $("#photoImg");
  const photoInput = $("#fPhoto");
  const photoHint = $("#photoHint");
  const photoRemove = $("#photoRemove");
  const PHOTO_HINT = photoHint.textContent;
  // saved: foto già salvata (data URL o null) · next: undefined = invariata, stringa = nuova, null = da rimuovere
  let photo = { saved: null, next: undefined, token: 0, failed: false };

  function setPhotoHint(text, kind) {
    photoHint.textContent = text;
    photoHint.classList.toggle("is-ok", kind === "ok");
    photoHint.classList.toggle("is-error", kind === "error");
  }
  function setPhotoBusy(on, label = "Preparazione…") {
    photoBox.classList.toggle("is-busy", on);
    $("#photoBusy").hidden = !on;
    $("#photoBusy").textContent = label;
  }
  function showPhoto(src) {
    const has = !!src;
    photoBox.classList.toggle("has-photo", has);
    photoImg.hidden = !has;
    if (has) photoImg.src = src; else photoImg.removeAttribute("src");
    $("#photoEmpty").hidden = has;
    photoRemove.hidden = !has;
    $("#photoPickLabel").textContent = has ? "Sostituisci" : "Scegli foto";
  }

  async function loadPhoto(item) {
    const token = ++photo.token;
    photo = { saved: null, next: undefined, token, failed: false };
    photoInput.value = "";
    setPhotoHint(PHOTO_HINT);
    showPhoto(null);
    if (!item) return;
    setPhotoBusy(true, "Caricamento…");
    try {
      const snap = await getDoc(doc(db, "photos", item.id));
      if (token !== photo.token) return;
      photo.saved = snap.exists() ? snap.data().data || null : null;
      if (photo.next === undefined) showPhoto(photo.saved);
    } catch (err) {
      if (token !== photo.token) return;
      photo.failed = true;
      console.error("[admin] Lettura foto non riuscita:", err);
      setPhotoHint("Non riesco a leggere la foto salvata: " + friendlyError(err), "error");
    } finally {
      if (token === photo.token) setPhotoBusy(false);
    }
  }

  photoInput.addEventListener("change", async () => {
    const file = photoInput.files && photoInput.files[0];
    if (!file) return;
    const token = photo.token;
    setPhotoBusy(true);
    setPhotoHint("Compressione della foto…");
    try {
      const out = await compressPhoto(file);
      if (token !== photo.token) return;
      photo.next = out.dataUrl;
      showPhoto(out.dataUrl);
      setPhotoHint(`Foto pronta: ${out.width}×${out.height} px, ${Math.round(out.bytes / 1024)} KB. Verrà salvata con "Salva".`, "ok");
    } catch (err) {
      if (token !== photo.token) return;
      console.error("[admin] Foto non valida:", err);
      setPhotoHint(friendlyError(err), "error");
    } finally {
      if (token === photo.token) setPhotoBusy(false);
      photoInput.value = "";   // permette di riscegliere lo stesso file
    }
  });

  photoRemove.addEventListener("click", () => {
    photo.next = null;
    showPhoto(null);
    setPhotoHint(photo.saved ? 'La foto verrà rimossa quando premi "Salva".' : PHOTO_HINT, photo.saved ? "ok" : undefined);
  });

  function openItemForm(item, categoryId) {
    if (!categories.length) {
      showToast("Crea prima una categoria", true);
      openCategoryForm(null);
      return;
    }
    editingItem = item;
    itemForm.reset();
    itemFormMsg.textContent = "";
    $$(".is-invalid", itemForm).forEach((el) => el.classList.remove("is-invalid"));
    $("#itemFormEyebrow").textContent = item ? "Modifica voce" : "Nuova voce";
    $("#itemFormTitle").textContent = item ? item.name : "Aggiungi al menù";
    itemSaveBtn.textContent = item ? "Salva" : "Aggiungi";

    const v = item || {};
    F.name.value = v.name || "";
    F.categoryId.value = categoryById(v.categoryId) ? v.categoryId
      : categoryById(categoryId) ? categoryId
      : categories[0].id;
    F.description.value = v.description || "";
    const ps = item ? pricesOf(item) : [];
    F.label1.value = ps[0] ? ps[0].label || "" : "";
    F.value1.value = ps[0] ? money(ps[0].value) : "";
    F.label2.value = ps[1] ? ps[1].label || "" : "";
    F.value2.value = ps[1] ? money(ps[1].value) : "";
    F.symbol.value = v.symbol || "";
    F.visible.checked = item ? isVisible(item) : true;
    loadPhoto(item);

    openLayer(itemDrawer, F.name);
  }
  const closeItemForm = () => closeLayer(itemDrawer, 700);

  $("#newItemBtn").addEventListener("click", () => openItemForm(null));
  $$("[data-close-item]").forEach((el) => el.addEventListener("click", closeItemForm));

  // "6,50" → 6.5 · vuoto → null · non valido → NaN
  function parsePrice(text) {
    const t = String(text).replace(/[\s€]/g, "").replace(",", ".");
    if (!t) return null;
    const n = Number(t);
    return isFinite(n) && n >= 0 && n <= 100000 ? Math.round(n * 100) / 100 : NaN;
  }

  function readItemForm() {
    const errors = [];
    const mark = (el, bad) => el.classList.toggle("is-invalid", bad);
    const name = F.name.value.trim();
    const categoryId = F.categoryId.value;

    mark(F.name, !name);
    if (!name) errors.push("il nome");
    const badCat = !categoryById(categoryId);
    mark(F.categoryId, badCat);
    if (badCat) errors.push("la categoria");

    const prices = [];
    let badPrice = false;
    [[F.label1, F.value1], [F.label2, F.value2]].forEach(([labelEl, valueEl]) => {
      const label = labelEl.value.trim();
      const value = parsePrice(valueEl.value);
      if (value === null) {
        // etichetta senza prezzo: probabilmente il prezzo è stato dimenticato
        if (label) { mark(valueEl, true); badPrice = true; }
        return;
      }
      if (Number.isNaN(value)) { mark(valueEl, true); badPrice = true; return; }
      prices.push({ label, value });
    });
    if (badPrice) errors.push("un prezzo valido (es. 6,50) oppure cancella l'etichetta");

    if (errors.length) return { errors };

    // Se la categoria cambia (o la voce è nuova) va in fondo alla categoria scelta
    const keepOrder = editingItem && editingItem.categoryId === categoryId;
    return {
      data: {
        name,
        description: F.description.value.trim(),
        prices,
        symbol: F.symbol.value.trim(),
        visible: F.visible.checked,
        categoryId,
        order: keepOrder ? Number(editingItem.order) || 0 : nextOrder(itemsOf(categoryId)),
        updatedAt: serverTimestamp()
      }
    };
  }

  itemForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    itemFormMsg.textContent = "";
    let data, errors;
    try {
      ({ data, errors } = readItemForm());
    } catch (err) {
      itemFormMsg.textContent = reportError("Lettura del form", err);
      return;
    }
    if (errors) {
      itemFormMsg.textContent = "Inserisci " + errors.join(", ") + ".";
      return;
    }
    if (photoBox.classList.contains("is-busy")) {
      itemFormMsg.textContent = "Attendi che la foto sia pronta.";
      return;
    }
    const photoChanged = photo.next !== undefined && photo.next !== photo.saved;
    if (photoChanged && !navigator.onLine) {
      itemFormMsg.textContent = reportError("Salvataggio foto", { code: "photo/offline" });
      return;
    }
    // hasPhoto dice al sito se la voce si può aprire per vedere la foto
    data.hasPhoto = photoChanged ? !!photo.next
      : photo.failed ? !!(editingItem && editingItem.hasPhoto)
      : !!photo.saved;

    itemSaveBtn.disabled = true;
    const label = itemSaveBtn.textContent;
    itemSaveBtn.textContent = "Salvataggio…";
    try {
      // Voce e foto vengono salvate insieme: o tutto o niente.
      // set (non update) riscrive la voce intera: toglie anche i campi del vecchio formato.
      const batch = writeBatch(db);
      const ref = editingItem ? doc(db, "items", editingItem.id) : doc(itemsCol);
      batch.set(ref, { ...data, createdAt: (editingItem && editingItem.createdAt) || serverTimestamp() });
      if (photoChanged) {
        const photoRef = doc(db, "photos", ref.id);
        if (photo.next) batch.set(photoRef, { data: photo.next, updatedAt: serverTimestamp() });
        else batch.delete(photoRef);
      }
      await confirmed(batch.commit(), photoChanged ? 30000 : 15000);
      if (photoChanged) photo.saved = photo.next;
      const what = photoChanged ? (photo.next ? " con la nuova foto" : ", foto rimossa") : "";
      showToast(editingItem ? `"${data.name}" aggiornato${what}` : `"${data.name}" aggiunto al menù${what}`);
      closeItemForm();
    } catch (err) {
      itemFormMsg.textContent = reportError("Salvataggio voce", err);
    } finally {
      itemSaveBtn.disabled = false;
      itemSaveBtn.textContent = label;
    }
  });

  /* ---------- Form categoria ---------- */
  const categoryDialog = $("#categoryDialog");
  const categoryForm = $("#categoryForm");
  const C = categoryForm.elements;
  const categoryName = $("#cName");
  const categoryFormMsg = $("#categoryFormMsg");
  const categorySaveBtn = $("#categorySaveBtn");
  let editingCategory = null;

  function openCategoryForm(category) {
    editingCategory = category;
    categoryForm.reset();
    categoryFormMsg.textContent = "";
    categoryName.classList.remove("is-invalid");
    $("#categoryFormEyebrow").textContent = category ? "Modifica categoria" : "Nuova categoria";
    $("#categoryFormTitle").textContent = category ? category.name : "Aggiungi categoria";
    categoryName.value = category ? category.name : "";
    C.section.value = category && SECTIONS[category.section] ? category.section : SECTION_KEYS[0];
    C.note.value = category ? category.note || "" : "";
    C.visible.checked = category ? category.visible !== false : true;
    categorySaveBtn.textContent = category ? "Salva" : "Crea categoria";
    openLayer(categoryDialog, categoryName);
  }
  const closeCategoryForm = () => closeLayer(categoryDialog, 450);

  $("#newCategoryBtn").addEventListener("click", () => openCategoryForm(null));
  $("#emptyNewBtn").addEventListener("click", () => openCategoryForm(null));
  $$("[data-close-category]").forEach((el) => el.addEventListener("click", closeCategoryForm));
  categoryName.addEventListener("input", () => categoryName.classList.remove("is-invalid"));

  categoryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = categoryName.value.trim();
    if (!name) {
      categoryName.classList.add("is-invalid");
      categoryFormMsg.textContent = "Inserisci il nome della categoria.";
      return;
    }
    const duplicate = categories.find((c) => c !== editingCategory && c.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      categoryName.classList.add("is-invalid");
      categoryFormMsg.textContent = "Esiste già una categoria con questo nome.";
      return;
    }
    const section = SECTIONS[C.section.value] ? C.section.value : SECTION_KEYS[0];
    // cambiando sezione (o se è nuova) la categoria va in fondo alla sezione scelta
    const keepOrder = editingCategory && editingCategory.section === section;
    const data = {
      name,
      section,
      note: C.note.value.trim(),
      visible: C.visible.checked,
      order: keepOrder ? Number(editingCategory.order) || 0 : nextOrder(catsOf(section)),
      createdAt: (editingCategory && editingCategory.createdAt) || serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    categorySaveBtn.disabled = true;
    try {
      if (editingCategory) {
        await confirmed(setDoc(doc(db, "categories", editingCategory.id), data));
        showToast(`Categoria "${name}" salvata`);
      } else {
        await confirmed(addDoc(categoriesCol, data));
        showToast(`Categoria "${name}" creata`);
      }
      closeCategoryForm();
    } catch (err) {
      categoryFormMsg.textContent = reportError("Salvataggio categoria", err);
    } finally {
      categorySaveBtn.disabled = false;
    }
  });

  /* ---------- Conferme (eliminazione e importazione) ---------- */
  const confirmDialog = $("#confirmDialog");
  const confirmOk = $("#confirmOk");
  let pending = null;

  function askConfirm({ title, text, ok, run }) {
    pending = run;
    $("#confirmTitle").textContent = title;
    $("#confirmText").textContent = text;
    confirmOk.textContent = ok;
    openLayer(confirmDialog, $("[data-cancel].btn", confirmDialog));
  }
  function closeConfirm() {
    pending = null;
    closeLayer(confirmDialog, 450);
  }
  $$("[data-cancel]", confirmDialog).forEach((el) => el.addEventListener("click", closeConfirm));

  confirmOk.addEventListener("click", async () => {
    if (!pending || confirmOk.disabled) return;
    const label = confirmOk.textContent;
    confirmOk.disabled = true;
    confirmOk.textContent = "Attendi…";
    try {
      await pending();
      closeConfirm();
    } catch (err) {
      reportError("Operazione", err);
    } finally {
      confirmOk.disabled = false;
      confirmOk.textContent = label;
    }
  });

  function askDeleteCategory(c) {
    const list = itemsOf(c.id);
    const n = list.length;
    askConfirm({
      title: "Eliminare la categoria?",
      text: `"${c.name}"` + (n ? ` e ${n === 1 ? "la sua voce" : "le sue " + n + " voci"} verranno eliminate.` : " verrà eliminata.") +
        " L'operazione non può essere annullata. Se vuoi solo toglierla per un po', usa l'occhio per nasconderla.",
      ok: "Elimina",
      run: async () => {
        const batch = writeBatch(db);
        list.forEach((v) => {
          batch.delete(doc(db, "items", v.id));
          batch.delete(doc(db, "photos", v.id));
        });
        batch.delete(doc(db, "categories", c.id));
        await confirmed(batch.commit());
        showToast(`"${c.name}" eliminata`);
      }
    });
  }

  function askDeleteItem(v) {
    askConfirm({
      title: "Eliminare la voce?",
      text: `"${v.name}" verrà eliminata dal menù, insieme alla sua foto. L'operazione non può essere annullata. Se vuoi solo toglierla per un po', usa l'occhio per nasconderla.`,
      ok: "Elimina",
      run: async () => {
        const batch = writeBatch(db);
        batch.delete(doc(db, "items", v.id));
        batch.delete(doc(db, "photos", v.id));   // anche la sua foto, se c'è
        await confirmed(batch.commit());
        showToast(`"${v.name}" eliminata`);
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!confirmDialog.hidden) closeConfirm();
    else if (!categoryDialog.hidden) closeCategoryForm();
    else if (!itemDrawer.hidden) closeItemForm();
  });
}
