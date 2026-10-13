# Zanzibar — sito menu (QR code)

Sito statico e leggerissimo, nessuna installazione. Il menu si gestisce dal **pannello `/admin`**
(Firebase) e si aggiorna in tempo reale sul sito.

| File | A cosa serve |
|---|---|
| `data.js` | Testi, contatti, orari, foto, mappa. Il `menu` qui dentro è quello di partenza (importabile dal pannello) e di riserva |
| `index.html` | Struttura della pagina |
| `style.css` | Colori e stile (i colori principali sono in cima al file, in `:root`) |
| `app.js` | Logica (tab categorie, pannello hamburger, galleria, mappa) |
| `firebase-config.js` | Chiavi Firebase ed email del proprietario |
| `firebase-menu.js` | Legge il menu da Firestore in tempo reale e, solo quando si apre la scheda di un prodotto, la sua foto |
| `admin/` | Pannello di amministrazione (login + gestione categorie, piatti e bevande) |
| `firestore.rules`, `firebase.json` | Regole di sicurezza del database e configurazione Firebase Hosting |

## Pannello di amministrazione
Configurazione passo-passo in **`GUIDA-FIREBASE.md`**. Una volta configurato, apri `/admin`, accedi con
email e password del proprietario e potrai aggiungere, modificare, riordinare ed eliminare categorie e voci
(nome, descrizione, prezzo, etichetta, disponibilità e foto).

Le **foto dei prodotti** si scelgono nella modifica della voce (anche scattandole dal telefono): il pannello le riduce
a 900px e le comprime in JPEG sotto i 150 KB, poi le salva nella collezione Firestore `photos` (un documento per voce,
stesso ID). Sul sito si scaricano solo quando il cliente apre la scheda del prodotto; senza foto compare un segnaposto.

Finché Firebase non è configurato, il sito mostra il menu scritto in `data.js`.

## Aggiornare gli altri contenuti
Apri `data.js` con un editor di testo:
- **Etichette** facoltative delle voci: `tag: "Vegan"`, `tag: "Signature"`… (dal pannello: campo "Etichetta")
- **Foto**: metti le immagini in una cartella `img/` e scrivi `src: "img/nomefoto.jpg"`. Consigliato: JPG/WebP larghe ~1000px, sotto i 200 KB. La prima foto è anche quella di "Chi siamo".
- **Mappa**: nel campo `mappa` scrivi l'indirizzo reale o le coordinate (`"41.8902,12.4922"`).

## Provarlo in locale
Senza Firebase basta aprire `index.html` nel browser. Con Firebase serve un indirizzo `http://`:
`python3 -m http.server 8000` nella cartella, poi apri `http://localhost:8000` (sito) e `http://localhost:8000/admin/` (pannello).

## Pubblicarlo
Firebase Hosting (`firebase deploy`, vedi la guida) oppure un hosting statico gratuito (Netlify Drop, GitHub Pages, Cloudflare Pages). Genera il QR code con l'indirizzo del sito pubblico.
