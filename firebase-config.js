/* ==========================================================
   Zanzibar — configurazione Firebase
   ----------------------------------------------------------
   Incolla qui i valori che trovi nella console Firebase:
   Impostazioni progetto (icona ingranaggio) → Generali →
   "Le tue app" → la tua app web → "Configurazione SDK" → Config.
   Vedi GUIDA-FIREBASE.md per tutti i passaggi.

   Queste chiavi NON sono segrete: identificano il progetto.
   La protezione dei dati è data dalle regole di Firestore
   (file firestore.rules) e dal login del pannello admin.
   ========================================================== */
window.ZANZIBAR_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBxo7djKjuysedA0Nyi_1VPzVwfREK9JBg",
  authDomain: "zanzibar-torredepasseri.firebaseapp.com",
  projectId: "zanzibar-torredepasseri",
  storageBucket: "zanzibar-torredepasseri.firebasestorage.app",
  messagingSenderId: "481117642122",
  appId: "1:481117642122:web:a52f8c95b1554e6258fc73"
};

/* UID degli account autorizzati ad accedere al pannello /admin
   (gli stessi scritti in isOwner() dentro firestore.rules).
   Per aggiungere un proprietario: aggiungi il suo UID qui E nelle regole. La sicurezza vera è nelle regole
   di Firestore: questo controllo serve solo a mostrare subito un messaggio
   chiaro a chi accede con un altro account. */
window.ZANZIBAR_ADMIN_UIDS = [
  "yFhDfv68LtUNvTAFlHcinSRU1mB2", // Davide
  "cWwlK0WlaufzCjAD9xuXw7wllaF3"  // Cristiano (titolare)
];

/* true quando la configurazione qui sopra è stata compilata */
window.ZANZIBAR_FIREBASE_READY = !/^INSERISCI/.test(window.ZANZIBAR_FIREBASE_CONFIG.apiKey || "INSERISCI");
