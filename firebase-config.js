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
  appId: "1:481117642122:web:a52f8c95b1554e6258fc73",
  measurementId: "G-KF013JBEX8"
};

/* Email del proprietario autorizzato ad accedere al pannello /admin.
   (La sicurezza vera è nelle regole di Firestore: questo controllo
   serve solo a mostrare subito un messaggio chiaro agli altri account.) */
window.ZANZIBAR_ADMIN_EMAILS = [
  "carestia.davide2004@gmail.com"
];

/* true quando la configurazione qui sopra è stata compilata */
window.ZANZIBAR_FIREBASE_READY = !/^INSERISCI/.test(window.ZANZIBAR_FIREBASE_CONFIG.apiKey || "INSERISCI");
