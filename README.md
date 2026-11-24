# Zanzibar — sito menu (QR code)

Sito statico e leggerissimo, nessuna installazione. Il menu si gestisce dal **pannello `/admin`**
(Firebase) e si aggiorna in tempo reale sul sito.

| File | A cosa serve |
|---|---|
| `data.js` | Testi, contatti, orari, dati legali (footer e privacy), mappa. Il `menu` qui dentro è il **menù vero** (pulsante "Importa menù vero" del pannello) e la riserva se il database non risponde o contiene ancora il menù di esempio |
| `index.html` | Struttura della pagina |
| `style.css` | Colori e stile, ripresi dal menù stampato (PDF): i colori sono in cima al file, in `:root` |
| `fonts/` | Cormorant Garamond e Jost, ospitati nel sito (nessun font esterno) |
| `app.js` | Logica (tab categorie, pannello hamburger, aperto/chiuso, mappa al clic) |
| `firebase-config.js` | Chiavi Firebase e UID dell'account del pannello |
| `firebase-menu.js` | Legge il menu da Firestore in tempo reale e, solo quando si apre la scheda di un prodotto, la sua foto |
| `admin/` | Pannello di amministrazione (login + gestione categorie, piatti e bevande) |
| `firestore.rules`, `firebase.json` | Regole di sicurezza del database e configurazione Firebase Hosting |

## Pannello di amministrazione
Configurazione passo-passo in **`GUIDA-FIREBASE.md`**. Una volta configurato, apri `/admin`, accedi con
email e password del proprietario e potrai aggiungere, modificare, riordinare ed eliminare categorie e voci
(nome, descrizione, uno o due prezzi con etichetta, simbolo come la ★, foto, visibile/nascosta).
Le categorie stanno in due sezioni, **Menù Food** e **Drink**, e possono avere una nota in fondo (es. "Supplementi € 0,50").
Le categorie senza voci visibili non compaiono sul menù pubblico.

Struttura dei dati in Firestore:
- `categories`: `name`, `order`, `section` (`food` o `drink`), `note`, `visible`
- `items`: `name`, `description`, `prices` (0–2 elementi `{ label, value }`), `symbol`, `visible`, `hasPhoto`, `categoryId`, `order`
- `photos`: la foto della voce (stesso ID della voce)

Le **foto dei prodotti** si scelgono nella modifica della voce (anche scattandole dal telefono): il pannello le riduce
a 900px e le comprime in JPEG sotto i 150 KB, poi le salva nella collezione Firestore `photos` (un documento per voce,
stesso ID). Sul sito si scaricano solo quando il cliente apre la scheda del prodotto; senza foto compare un segnaposto.

Finché Firebase non risponde, o nel database c'è ancora il vecchio menù di esempio, il sito mostra il menù scritto in `data.js`.

## Aggiornare gli altri contenuti
Apri `data.js` con un editor di testo:
- **Etichette** facoltative delle voci: `tag: "Vegan"`, `tag: "Signature"`… (dal pannello: campo "Etichetta")
- **Orari**: `orari` per la tabella, `apertura` per "Aperto ora / Chiuso" (chiusura all'1:00 = giorno dopo).
- **Mappa**: nel campo `mappa` c'è l'indirizzo cercato su Google Maps (solo dopo il clic su "Mostra la mappa").
- **Dati legali**: in `legale` (ragione sociale, P.IVA, sede): li usano il footer e `privacy.html`.

## Provarlo in locale
Senza Firebase basta aprire `index.html` nel browser. Con Firebase serve un indirizzo `http://`:
`python3 -m http.server 8000` nella cartella, poi apri `http://localhost:8000` (sito) e `http://localhost:8000/admin/` (pannello).

## Pubblicarlo
Firebase Hosting (`firebase deploy`, vedi la guida) oppure un hosting statico gratuito (Netlify Drop, GitHub Pages, Cloudflare Pages). Genera il QR code con l'indirizzo del sito pubblico.
