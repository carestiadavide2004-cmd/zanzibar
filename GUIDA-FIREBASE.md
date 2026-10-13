# Zanzibar — Configurazione di Firebase

Questa guida collega il sito a Firebase: il login del pannello `/admin` e il database del menu.
Tempo richiesto: circa 15 minuti. Il piano gratuito di Firebase (Spark) è più che sufficiente.

---

## 1. Crea il progetto Firebase

1. Vai su **https://console.firebase.google.com** e accedi con il tuo account Google.
2. Clicca **Crea un progetto** (o "Aggiungi progetto").
3. Nome: ad esempio `zanzibar-menu`. Continua.
4. Google Analytics non serve: puoi disattivarlo. Clicca **Crea progetto** e attendi, poi **Continua**.

## 2. Registra l'app web e copia le chiavi

1. Nella pagina iniziale del progetto clicca l'icona **`</>`** (Web).
2. Nickname dell'app: `Sito Zanzibar`. Non serve spuntare Hosting ora. Clicca **Registra app**.
3. Firebase mostra un blocco di codice con `const firebaseConfig = { ... }`.
   **Copia solo i valori** tra le graffe.
4. Apri il file **`firebase-config.js`** del sito e sostituisci i valori `INSERISCI_...`:

```js
window.ZANZIBAR_FIREBASE_CONFIG = {
  apiKey: "AIzaSy...",
  authDomain: "zanzibar-menu.firebaseapp.com",
  projectId: "zanzibar-menu",
  storageBucket: "zanzibar-menu.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123..."
};
```

> **Dove ritrovarle in seguito:** icona ingranaggio ⚙️ in alto a sinistra → **Impostazioni progetto** →
> scheda **Generali** → sezione **Le tue app** → la tua app web → **Configurazione SDK** → opzione **Config**.

> Queste chiavi **non sono segrete**: identificano il progetto e sono visibili a chiunque apra il sito.
> I dati sono protetti dalle regole di Firestore (passaggio 5).

## 3. Attiva il login con email e password

1. Menu a sinistra: **Build → Authentication** → **Inizia**.
2. Scheda **Metodo di accesso** (Sign-in method) → **Email/password** → attiva il primo interruttore
   (non serve "Link via email") → **Salva**.
3. Consigliato: **Impostazioni** (Settings) → **Azioni utente** (User actions) → togli la spunta a
   **Abilita creazione (registrazione)**, così nessun altro può creare account.
4. Sempre in **Impostazioni → Domini autorizzati**: `localhost` è già presente. Quando pubblichi il sito,
   aggiungi qui il tuo dominio (es. `menu.zanzibarlounge.it`). Se usi Firebase Hosting, i domini
   `*.web.app` e `*.firebaseapp.com` sono già inclusi.

## 4. Crea l'utente amministratore (il proprietario)

1. **Authentication** → scheda **Utenti** (Users) → **Aggiungi utente**.
2. Inserisci l'email del proprietario e una password robusta (almeno 12 caratteri) → **Aggiungi utente**.
3. Nella lista utenti copia il valore della colonna **UID utente** (una stringa tipo `Xy7Ab...`):
   serve al passaggio 5.
4. Apri **`firebase-config.js`** e metti la stessa email in `ZANZIBAR_ADMIN_EMAILS`:

```js
window.ZANZIBAR_ADMIN_EMAILS = [
  "tua-email@esempio.it"
];
```

## 5. Crea il database Firestore e proteggilo con le regole

1. Menu a sinistra: **Build → Firestore Database** → **Crea database**.
2. Edizione **Standard**, ID database `(default)`.
3. Posizione: scegli una località europea, es. **eur3 (Europa)** o **europe-west8 (Milano)**.
   ⚠️ Non si può cambiare in seguito.
4. Scegli **Avvia in modalità produzione** → **Crea**.
5. Apri la scheda **Regole**, cancella tutto e incolla il contenuto del file **`firestore.rules`** del sito.
6. Nel testo incollato sostituisci `INSERISCI_UID_PROPRIETARIO` con l'UID copiato al passaggio 4.
7. Clicca **Pubblica**.

Con queste regole:
- chiunque può **leggere** categorie e voci (servono al menu pubblico);
- solo il proprietario loggato può **aggiungere, modificare o eliminare**;
- i dati devono avere il formato corretto (nome non vuoto, prezzo numerico ≥ 0, categoria esistente…);
- tutto il resto del database è chiuso.

Le collezioni `categories` e `items` **non vanno create a mano**: le crea il pannello al primo salvataggio.

## 6. Prova in locale

Il **menu pubblico** funziona anche aprendo `index.html` con doppio clic. Il **pannello admin** invece richiede un indirizzo `http://` (il login di Firebase non funziona da file).

1. Apri il **Terminale** nella cartella del sito ed esegui:

```bash
python3 -m http.server 8000
```

2. Apri **http://localhost:8000/admin/** e accedi con email e password del passaggio 4.
3. Il database è vuoto: clicca **Importa menu attuale** per caricare categorie e voci già scritte in `data.js`.
4. Apri **http://localhost:8000** in un'altra scheda: ogni modifica fatta nel pannello compare sul menu
   in tempo reale, senza ricaricare la pagina.

## 7. Pubblica il sito (Firebase Hosting, gratuito)

Serve [Node.js](https://nodejs.org). Nel Terminale, dalla cartella del sito:

```bash
npm install -g firebase-tools
firebase login
firebase use --add          # scegli il progetto zanzibar-menu
firebase deploy
```

Il file `firebase.json` è già pronto: pubblica il sito e le regole di Firestore
(ricorda di aver sostituito l'UID in `firestore.rules` anche nel file, non solo nella console).
Al termine vedrai l'indirizzo, ad esempio `https://zanzibar-menu.web.app`.
Il pannello sarà su `https://zanzibar-menu.web.app/admin`.

Puoi usare anche un altro hosting (Netlify, Cloudflare Pages, GitHub Pages): carica tutti i file della
cartella e aggiungi il dominio in **Authentication → Impostazioni → Domini autorizzati**.
Il QR code va generato con l'indirizzo del sito pubblico (non quello di `/admin`).

---

## Come funziona

| File | A cosa serve |
|---|---|
| `firebase-config.js` | Le chiavi del progetto e l'email del proprietario (**l'unico file da modificare**) |
| `firebase-menu.js` | Legge il menu da Firestore e aggiorna il sito in tempo reale |
| `data.js` | Testi, orari, foto e contatti del locale. Il suo `menu` serve per l'importazione iniziale e come riserva se il database non risponde |
| `admin/` | Il pannello di amministrazione (login, elenco categorie e voci, form) |
| `firestore.rules` | Le regole di sicurezza del database |
| `firebase.json` | La configurazione per pubblicare con Firebase Hosting |

**Struttura del database**

- `categories` → `name` (nome), `order` (posizione)
- `items` → `name`, `description`, `price`, `available` (disponibile sì/no), `tag` (etichetta facoltativa),
  `categoryId` (la categoria di appartenenza), `order`

**Dal pannello puoi:** creare, rinominare, riordinare (frecce ↑ ↓) ed eliminare categorie; aggiungere,
modificare, riordinare ed eliminare piatti e bevande; attivare/disattivare la disponibilità con un tocco.
Eliminando una categoria vengono eliminate anche le sue voci. Le voci non disponibili restano nel menu
con la scritta "Non disponibile"; le categorie senza voci non compaiono sul sito.

## Problemi comuni

| Messaggio | Soluzione |
|---|---|
| "Collega Firebase" aprendo `/admin` | `firebase-config.js` contiene ancora i valori `INSERISCI_...` |
| "Email o password non corretti" | Controlla l'utente in Authentication → Utenti, o usa "Password dimenticata?" |
| "Questo account non è autorizzato" | L'email non è in `ZANZIBAR_ADMIN_EMAILS` |
| "Permesso negato" al salvataggio | L'UID in `firestore.rules` non corrisponde al tuo, o le regole non sono state pubblicate |
| "Dominio non autorizzato" | Aggiungi il dominio in Authentication → Impostazioni → Domini autorizzati |
| Il sito mostra il menu di `data.js` e non quello del database | Il database non risponde entro 8 secondi (connessione assente) oppure il browser usa una versione vecchia della pagina: ricarica con Cmd+Shift+R |
| Il sito mostra "Il menu è in aggiornamento" | Il database è vuoto: entra in `/admin` e importa il menu o crea le categorie |
