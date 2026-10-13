/* ==========================================================
   Zanzibar — pannello di amministrazione del menu
   Firebase Authentication (email e password) + Firestore
   Collezioni: "categories" { name, order }
               "items" { name, description, price, available, tag, categoryId, order }
   ========================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const ADMIN_EMAILS = (window.ZANZIBAR_ADMIN_EMAILS || []).map((e) => e.trim().toLowerCase()).filter(Boolean);

const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const euro = (n) => "€ " + (Number(n) || 0).toFixed(2).replace(".", ",");
const pad = (n) => (n < 10 ? "0" : "") + n;
const byOrder = (a, b) => ((Number(a.order) || 0) - (Number(b.order) || 0)) || String(a.name).localeCompare(String(b.name), "it");
const nextOrder = (list) => list.reduce((m, x) => Math.max(m, Number(x.order) || 0), 0) + 1;
const slugId = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "categoria";

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
    "permission-denied": "Permesso negato. Controlla che le regole di Firestore contengano il tuo UID.",
    "unavailable": "Database non raggiungibile. Controlla la connessione.",
    "not-found": "L'elemento non esiste più.",
    "invalid-argument": "Dati non validi: controlla i campi e riprova.",
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

  function render() {
    if (!loaded.categories || !loaded.items) return;
    renderStats();
    renderCategoryOptions();
    renderGroups();
  }

  function renderStats() {
    const available = items.filter((v) => v.available !== false).length;
    $("#statCategories").textContent = categories.length;
    $("#statItems").textContent = items.length;
    $("#statAvailable").textContent = available;
    $("#statOut").textContent = items.length - available;
  }

  // Aggiorna le tendine delle categorie mantenendo la scelta corrente
  function renderCategoryOptions() {
    const options = categories.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
    const filterValue = categoryFilter.value;
    categoryFilter.innerHTML = '<option value="">Tutte le categorie</option>' + options;
    categoryFilter.value = categoryById(filterValue) ? filterValue : "";
    const formValue = F.categoryId.value;
    F.categoryId.innerHTML = options;
    if (categoryById(formValue)) F.categoryId.value = formValue;
  }

  const searchInput = $("#searchInput");
  const categoryFilter = $("#categoryFilter");
  const availabilityFilter = $("#availabilityFilter");
  [searchInput, categoryFilter, availabilityFilter].forEach((el) => el.addEventListener("input", renderGroups));

  const icons = {
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'
  };
  const iconBtn = (action, icon, label, opts = "") =>
    `<button class="icon-btn${action === "delete" ? " icon-btn--danger" : ""}" data-action="${action}" aria-label="${esc(label)}" title="${esc(label.split(" ")[0])}" ${opts}>${icons[icon]}</button>`;

  function renderGroups() {
    const q = searchInput.value.trim().toLowerCase();
    const cat = categoryFilter.value;
    const av = availabilityFilter.value;
    const filtering = !!(q || av);
    const matches = (v) =>
      (!q || [v.name, v.description, v.tag].some((s) => String(s || "").toLowerCase().includes(q))) &&
      (!av || (av === "yes") === (v.available !== false));

    // Voci rimaste senza categoria (non visibili sul sito): mostrate in fondo per poterle sistemare
    const orphans = items.filter((v) => !categoryById(v.categoryId));
    const groups = categories.map((c, i) => ({ cat: c, index: i, list: itemsOf(c.id) }));
    if (orphans.length) groups.push({ cat: null, index: groups.length, list: orphans });

    const isEmpty = categories.length === 0 && items.length === 0;
    $("#emptyState").hidden = !isEmpty;
    $("#toolbar").hidden = isEmpty;

    let shown = 0;
    $("#menuGroups").innerHTML = groups
      .filter((g) => !cat || (g.cat && g.cat.id === cat))
      .map((g) => {
        const list = g.list.filter(matches);
        if (filtering && !list.length) return "";
        shown += list.length;
        const c = g.cat;
        const head = c ? `
          <header class="group__head">
            <div class="group__info">
              <span class="group__num">${pad(g.index + 1)}</span>
              <h2 class="group__title">${esc(c.name)}</h2>
              <span class="group__count">${g.list.length} ${g.list.length === 1 ? "voce" : "voci"}</span>
            </div>
            <div class="group__actions">
              ${iconBtn("cat-up", "up", `Sposta su ${c.name}`, g.index === 0 ? "disabled" : "")}
              ${iconBtn("cat-down", "down", `Sposta giù ${c.name}`, g.index === categories.length - 1 ? "disabled" : "")}
              ${iconBtn("cat-edit", "edit", `Rinomina ${c.name}`)}
              ${iconBtn("cat-delete", "trash", `Elimina ${c.name}`)}
              <button class="btn btn--small" data-action="cat-add">${icons.plus}<span>Voce</span></button>
            </div>
          </header>` : `
          <header class="group__head group__head--warn">
            <div class="group__info">
              <h2 class="group__title">Senza categoria</h2>
              <span class="group__count">Non visibili sul sito: modificale e scegli una categoria</span>
            </div>
          </header>`;
        const rows = list.map((v, i) => {
          const available = v.available !== false;
          const pos = g.list.indexOf(v);
          return `
          <div class="row${available ? "" : " is-out"}" data-id="${esc(v.id)}" style="animation-delay:${Math.min(i, 12) * 25}ms">
            <div class="row__main">
              <p class="row__name">${esc(v.name)}${v.tag ? `<span class="chip">${esc(v.tag)}</span>` : ""}</p>
              ${v.description ? `<p class="row__desc">${esc(v.description)}</p>` : ""}
            </div>
            <span class="row__price">${euro(v.price)}</span>
            <span class="row__avail">
              <label class="switch">
                <input type="checkbox" data-toggle ${available ? "checked" : ""} aria-label="Disponibilità di ${esc(v.name)}">
                <span class="switch__track" aria-hidden="true"></span>
                <span class="row__avail-label">${available ? "Disponibile" : "Non disp."}</span>
              </label>
            </span>
            <span class="row__actions">
              ${c ? iconBtn("item-up", "up", `Sposta su ${v.name}`, pos === 0 ? "disabled" : "") : ""}
              ${c ? iconBtn("item-down", "down", `Sposta giù ${v.name}`, pos === g.list.length - 1 ? "disabled" : "") : ""}
              ${iconBtn("item-edit", "edit", `Modifica ${v.name}`)}
              ${iconBtn("delete", "trash", `Elimina ${v.name}`)}
            </span>
          </div>`;
        }).join("");
        return `
        <section class="group" data-cat="${c ? esc(c.id) : ""}">
          ${head}
          <div class="group__rows">${rows || (filtering ? "" : '<p class="group__empty">Nessuna voce: aggiungi il primo piatto o bevanda.</p>')}</div>
        </section>`;
      }).join("");

    $("#noResults").hidden = isEmpty || !filtering || shown > 0;
  }

  $("#menuGroups").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn || btn.disabled) return;
    const group = btn.closest(".group");
    const category = categoryById(group.dataset.cat);
    const row = btn.closest(".row");
    const item = row ? items.find((v) => v.id === row.dataset.id) : null;
    switch (btn.dataset.action) {
      case "cat-up": return moveCategory(category, -1);
      case "cat-down": return moveCategory(category, 1);
      case "cat-edit": return openCategoryForm(category);
      case "cat-delete": return askDelete({ type: "category", data: category });
      case "cat-add": return openItemForm(null, category.id);
      case "item-up": return item && moveItem(item, -1);
      case "item-down": return item && moveItem(item, 1);
      case "item-edit": return item && openItemForm(item);
      case "delete": return item && askDelete({ type: "item", data: item });
    }
  });

  // Cambio rapido di disponibilità direttamente dall'elenco
  $("#menuGroups").addEventListener("change", async (e) => {
    if (!e.target.matches("[data-toggle]")) return;
    const row = e.target.closest(".row");
    const available = e.target.checked;
    row.classList.add("is-busy");
    try {
      await confirmed(updateDoc(doc(db, "items", row.dataset.id), { available, updatedAt: serverTimestamp() }));
      showToast(available ? "Voce di nuovo disponibile" : "Voce segnata come non disponibile");
    } catch (err) {
      e.target.checked = !available;
      reportError("Cambio disponibilità", err);
    } finally {
      row.classList.remove("is-busy");
    }
  });

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
  const moveCategory = (c, dir) => reorder("categories", categories, c, dir);
  const moveItem = (v, dir) => reorder("items", itemsOf(v.categoryId), v, dir);

  /* ---------- Importazione del menu di data.js ---------- */
  async function seedMenu(btn) {
    const menu = (window.ZANZIBAR && window.ZANZIBAR.menu) || [];
    btn.disabled = true;
    btn.textContent = "Importazione…";
    try {
      const batch = writeBatch(db);
      let count = 0;
      const used = {};
      menu.forEach((c, ci) => {
        let catId = slugId(c.categoria);
        while (used[catId]) catId += "-" + (ci + 1);
        used[catId] = true;
        batch.set(doc(db, "categories", catId), {
          name: String(c.categoria), order: ci + 1, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
        });
        (c.voci || []).forEach((v, vi) => {
          batch.set(doc(db, "items", `${catId}-${vi + 1}`), {
            name: String(v.nome),
            description: String(v.desc || ""),
            price: Math.round((Number(v.prezzo) || 0) * 100) / 100,
            available: true,
            tag: String(v.tag || ""),
            categoryId: catId,
            order: vi + 1,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          count++;
        });
      });
      await confirmed(batch.commit());
      showToast(`Importate ${menu.length} categorie e ${count} voci`);
    } catch (err) {
      reportError("Importazione", err);
    } finally {
      btn.disabled = false;
      btn.textContent = "Importa menu attuale";
    }
  }
  $("#seedBtn").addEventListener("click", (e) => seedMenu(e.currentTarget));

  /* ---------- Apertura / chiusura pannelli ---------- */
  let returnFocus = null;
  function openLayer(el, focusEl) {
    returnFocus = document.activeElement;
    el.hidden = false;
    document.body.classList.add("no-scroll");
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-open")));
    setTimeout(() => focusEl && focusEl.focus({ preventScroll: true }), 300);
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
    $("#itemFormTitle").textContent = item ? item.name : "Aggiungi al menu";
    itemSaveBtn.textContent = item ? "Salva modifiche" : "Aggiungi al menu";

    const v = item || {};
    F.name.value = v.name || "";
    F.categoryId.value = categoryById(v.categoryId) ? v.categoryId
      : categoryById(categoryId) ? categoryId
      : categoryById(categoryFilter.value) ? categoryFilter.value
      : categories[0].id;
    F.price.value = v.price != null ? v.price : "";
    F.description.value = v.description || "";
    F.tag.value = v.tag || "";
    F.available.checked = v.available !== false;

    openLayer(itemDrawer, F.name);
  }
  const closeItemForm = () => closeLayer(itemDrawer, 700);

  $("#newItemBtn").addEventListener("click", () => openItemForm(null));
  $$("[data-close-item]").forEach((el) => el.addEventListener("click", closeItemForm));

  function readItemForm() {
    const errors = [];
    const mark = (el, bad) => el.classList.toggle("is-invalid", bad);
    const name = F.name.value.trim();
    const price = Number(String(F.price.value).replace(",", "."));
    const categoryId = F.categoryId.value;

    mark(F.name, !name);
    if (!name) errors.push("il nome");
    const badPrice = F.price.value === "" || !isFinite(price) || price < 0;
    mark(F.price, badPrice);
    if (badPrice) errors.push("un prezzo valido");
    const badCat = !categoryById(categoryId);
    mark(F.categoryId, badCat);
    if (badCat) errors.push("la categoria");

    if (errors.length) return { errors };

    // Se la categoria cambia (o la voce è nuova) va in fondo alla categoria scelta
    const keepOrder = editingItem && editingItem.categoryId === categoryId;
    return {
      data: {
        name,
        description: F.description.value.trim(),
        price: Math.round(price * 100) / 100,
        available: F.available.checked,
        tag: F.tag.value.trim(),
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
    itemSaveBtn.disabled = true;
    const label = itemSaveBtn.textContent;
    itemSaveBtn.textContent = "Salvataggio…";
    try {
      if (editingItem) {
        await confirmed(updateDoc(doc(db, "items", editingItem.id), data));
        showToast(`"${data.name}" aggiornato`);
      } else {
        await confirmed(addDoc(itemsCol, { ...data, createdAt: serverTimestamp() }));
        showToast(`"${data.name}" aggiunto al menu`);
      }
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
    $("#categoryFormTitle").textContent = category ? "Rinomina categoria" : "Aggiungi categoria";
    categoryName.value = category ? category.name : "";
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
    categorySaveBtn.disabled = true;
    try {
      if (editingCategory) {
        await confirmed(updateDoc(doc(db, "categories", editingCategory.id), { name, updatedAt: serverTimestamp() }));
        showToast(`Categoria rinominata in "${name}"`);
      } else {
        await confirmed(addDoc(categoriesCol, { name, order: nextOrder(categories), createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
        showToast(`Categoria "${name}" creata`);
      }
      closeCategoryForm();
    } catch (err) {
      categoryFormMsg.textContent = reportError("Salvataggio categoria", err);
    } finally {
      categorySaveBtn.disabled = false;
    }
  });

  /* ---------- Eliminazione ---------- */
  const confirmDialog = $("#confirmDialog");
  let deleting = null;

  function askDelete(target) {
    deleting = target;
    if (target.type === "category") {
      const n = itemsOf(target.data.id).length;
      $("#confirmTitle").textContent = "Eliminare la categoria?";
      $("#confirmText").textContent = `"${target.data.name}"` +
        (n ? ` e ${n === 1 ? "la sua voce" : "le sue " + n + " voci"} verranno rimosse dal menu.` : " verrà rimossa dal menu.") +
        " L'operazione non può essere annullata.";
    } else {
      $("#confirmTitle").textContent = "Eliminare la voce?";
      $("#confirmText").textContent = `"${target.data.name}" verrà rimosso dal menu. L'operazione non può essere annullata.`;
    }
    openLayer(confirmDialog, $("[data-cancel].btn", confirmDialog));
  }
  function closeConfirm() {
    deleting = null;
    closeLayer(confirmDialog, 450);
  }
  $$("[data-cancel]", confirmDialog).forEach((el) => el.addEventListener("click", closeConfirm));

  $("#confirmDelete").addEventListener("click", async (e) => {
    if (!deleting) return;
    const btn = e.currentTarget;
    const { type, data } = deleting;
    btn.disabled = true;
    try {
      const batch = writeBatch(db);
      if (type === "category") {
        // La categoria viene eliminata insieme a tutte le sue voci
        itemsOf(data.id).forEach((v) => batch.delete(doc(db, "items", v.id)));
        batch.delete(doc(db, "categories", data.id));
      } else {
        batch.delete(doc(db, "items", data.id));
      }
      await confirmed(batch.commit());
      showToast(`"${data.name}" eliminat${type === "category" ? "a" : "o"}`);
      closeConfirm();
    } catch (err) {
      reportError("Eliminazione", err);
    } finally {
      btn.disabled = false;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!confirmDialog.hidden) closeConfirm();
    else if (!categoryDialog.hidden) closeCategoryForm();
    else if (!itemDrawer.hidden) closeItemForm();
  });
}
