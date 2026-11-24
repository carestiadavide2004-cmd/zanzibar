/* =========================================================
   ZANZIBAR — DATI DEL SITO
   Qui si modificano testi, contatti, orari e foto.
   Il MENU si gestisce dal pannello /admin (Firebase): quello
   scritto qui sotto è il menu vero, usato dal pulsante "Importa
   menù vero" e come riserva se il database non risponde.
   Regole: mantieni virgolette "..." e virgole tra gli elementi.
   ========================================================= */

window.ZANZIBAR = {

  /* ---------- INFO LOCALE ---------- */
  info: {
    nome: "Zanzibar",
    sottotitolo: "Coffee & Lounge Bar",
    chiSiamo: [
      "Zanzibar è il Coffee & Lounge Bar di Torre de' Passeri, di fronte alla stazione.",
      "Apriamo alle 6 del mattino per il caffè e la colazione, e chiudiamo all'una di notte: in mezzo panini, burger, fritti, taglieri per l'aperitivo, spritz e gin."
    ],
    indirizzo: "Viale della Repubblica 72 bis, 65029 Torre de' Passeri (PE)", // VERIFICARE CAP
    riferimento: "Di fronte alla stazione",
    telefono: "+39 392 285 0875",
    telefonoLink: "+393922850875",
    whatsapp: "393922850875",
    whatsappMessaggio: "Ciao Zanzibar! Vorrei un'informazione.",
    social: [
      { nome: "Instagram", url: "https://www.instagram.com/zanzibar_torre/" },
      { nome: "Facebook",  url: "https://www.facebook.com/zanzibarpub/" }
    ],
    // Testo cercato su Google Maps (solo dopo il clic su "Mostra la mappa")
    mappa: "Viale della Repubblica 72 bis, 65029 Torre de' Passeri PE"
  },

  /* ---------- DATI LEGALI (footer e privacy.html) ---------- */
  legale: {
    ragioneSociale: "[RAGIONE SOCIALE DA CONFERMARE]", // DA CONFERMARE
    piva: "00000000000",                               // DA CONFERMARE
    sede: "[SEDE LEGALE DA CONFERMARE]"                // DA CONFERMARE
  },

  /* ---------- ORARI ----------
     orari: righe mostrate nella tabella.
     apertura: orari usati per "Aperto ora / Chiuso", un elemento per giorno
     (0 = domenica, 1 = lunedì … 6 = sabato). Se la chiusura è più piccola
     dell'apertura (es. 01:00) vuol dire che si chiude dopo mezzanotte.
     null = giorno di chiusura. */
  orari: [
    { giorni: "Lunedì – Sabato", ore: "6:00 – 1:00" },
    { giorni: "Domenica",        ore: "7:00 – 1:00" }
  ],
  apertura: [
    ["07:00", "01:00"], // domenica
    ["06:00", "01:00"], // lunedì
    ["06:00", "01:00"], // martedì
    ["06:00", "01:00"], // mercoledì
    ["06:00", "01:00"], // giovedì
    ["06:00", "01:00"], // venerdì
    ["06:00", "01:00"]  // sabato
  ],

  /* ---------- MENU ----------
     Il menu VERO di Zanzibar. Il pannello /admin lo usa per il pulsante
     "Importa menù vero"; il sito lo mostra finché nel database non c'è il menu vero.
     Categoria: categoria, sezione ("food" o "drink"), nota (facoltativa), voci.
     Voce: nome, desc (facoltativa), prezzi (da 0 a 2: { etichetta, valore }), simbolo (facoltativo).
     prezzi: [] = nessun prezzo mostrato.
  */
  sezioni: { food: "Menù Food", drink: "Drink" },

  menu: [
    {
      categoria: "Aperitivi", sezione: "food",
      voci: [
        { nome: "Tagliere salumi e formaggi", prezzi: [{ etichetta: "", valore: 3.00 }] },
        { nome: "Tagliere Plus", desc: "salumi, formaggi, verdure grigliate", prezzi: [{ etichetta: "", valore: 7.00 }] },
        { nome: "Tagliere Zanzibar", desc: "3 finger food, Tagliere Plus, fritti mix", prezzi: [{ etichetta: "", valore: 10.00 }] },
        { nome: "Aperitivo cenato", desc: "9 finger food, tagliere salumi e formaggi, verdure grigliate, fritti mix, patate al forno", prezzi: [{ etichetta: "", valore: 18.00 }] }
      ]
    },
    {
      categoria: "Panini", sezione: "food",
      voci: [
        { nome: "Classic Burger", desc: "hamburger 100 g o 200 g di Black Angus, insalata, pomodoro, salse a scelta", prezzi: [{ etichetta: "100 g", valore: 6.50 }, { etichetta: "200 g", valore: 9.00 }] },
        { nome: "Cheese Burger", desc: "hamburger 100 g o 200 g di Black Angus, cheddar, bacon, pomodoro, insalata, salse a scelta", prezzi: [{ etichetta: "100 g", valore: 6.50 }, { etichetta: "200 g", valore: 9.00 }] },
        { nome: "Pistacchioso", desc: "hamburger 100 g o 200 g di Black Angus, pistacchio, mortadella, stracciatella", prezzi: [{ etichetta: "100 g", valore: 8.00 }, { etichetta: "200 g", valore: 10.50 }] },
        { nome: "Patatosa", desc: "hamburger 100 g o 200 g di Black Angus, crema di patate, funghi, maionese al tartufo, provola affumicata", prezzi: [{ etichetta: "100 g", valore: 7.50 }, { etichetta: "200 g", valore: 10.00 }] },
        { nome: "Tacos", desc: "manzo e fagioli messicani · pollo e mango · salmone", prezzi: [{ etichetta: "", valore: 9.00 }] },
        { nome: "Hot Dog", desc: "wurstel e salse", prezzi: [{ etichetta: "", valore: 4.00 }] },
        { nome: "Salsiccia e Friarielli", desc: "salsiccia, crema di friarielli, provola", prezzi: [{ etichetta: "", valore: 6.50 }] },
        { nome: "Pulled Pork", desc: "pulled pork, cipolla caramellata, provola, BBQ", prezzi: [{ etichetta: "", valore: 7.50 }] },
        { nome: "Crispy Chicken Burger", desc: "filetto di pollo fritto, insalata, salsa cocktail", prezzi: [{ etichetta: "", valore: 7.00 }] },
        { nome: "Zanzi Burger", desc: "hamburger 100 g o 200 g di Black Angus, uovo, bacon, cipolla croccante, salse a scelta", prezzi: [{ etichetta: "100 g", valore: 8.50 }, { etichetta: "200 g", valore: 11.00 }] },
        { nome: "Mega Burger", desc: "hamburger da 350 g, cheddar, bacon, cipolla croccante, salsa burger", prezzi: [{ etichetta: "", valore: 12.00 }] },
        { nome: "Spicy Burger", simbolo: "★", desc: "hamburger 100 g o 200 g di Black Angus, crema di peperoncino, jalapeños, anelli di cipolla, insalata", prezzi: [{ etichetta: "100 g", valore: 7.50 }, { etichetta: "200 g", valore: 10.00 }] },
        { nome: "Piadina Crudo", desc: "prosciutto crudo, formaggio, insalata, pomodoro", prezzi: [{ etichetta: "", valore: 6.00 }] },
        { nome: "Piadina Cotto", desc: "prosciutto cotto, formaggio, insalata, pomodoro", prezzi: [{ etichetta: "", valore: 5.50 }] }
      ]
    },
    {
      categoria: "Fritteria", sezione: "food", nota: "Supplementi € 0,50",
      voci: [
        { nome: "Dippers", prezzi: [{ etichetta: "", valore: 4.00 }] },
        { nome: "Patatine cheddar e bacon", prezzi: [{ etichetta: "", valore: 5.00 }] },
        { nome: "Stick di patatine fritte", prezzi: [{ etichetta: "", valore: 4.00 }] },
        { nome: "Olive ascolane (5 pz)", prezzi: [{ etichetta: "", valore: 4.50 }] },
        { nome: "Nuggets di pollo (5 pz)", prezzi: [{ etichetta: "", valore: 4.50 }] },
        { nome: "Crocchette di patate (5 pz)", prezzi: [{ etichetta: "", valore: 4.00 }] },
        { nome: "Alette di pollo (5 pz)", prezzi: [{ etichetta: "", valore: 5.50 }] },
        { nome: "Supplì (3 pz)", prezzi: [] },
        { nome: "Mini supplì (5 pz)", prezzi: [{ etichetta: "", valore: 4.50 }] },
        { nome: "Onion rings (5 pz)", prezzi: [{ etichetta: "", valore: 4.00 }] },
        { nome: "Jalapeños (5 pz)", prezzi: [{ etichetta: "", valore: 4.50 }] },
        { nome: "Chele di granchio (5 pz)", prezzi: [{ etichetta: "", valore: 5.50 }] },
        { nome: "Gamberi in tempura (5 pz)", prezzi: [{ etichetta: "", valore: 6.00 }] },
        { nome: "Mix fritto (5 pz)", prezzi: [{ etichetta: "", valore: 4.50 }] }
      ]
    },
    {
      categoria: "Spritz", sezione: "drink",
      voci: [
        { nome: "Violet Spritz", prezzi: [] },
        { nome: "Venturo Spritz", prezzi: [] },
        { nome: "Watermelon Spritz", prezzi: [] },
        { nome: "Beer Spritz", prezzi: [] },
        { nome: "Mango Spritz", prezzi: [] },
        { nome: "Ginger Spritz", prezzi: [] }
      ]
    },
    {
      categoria: "Gin", sezione: "drink",
      voci: []
    }
  ],

  // Simbolo valuta mostrato accanto ai prezzi
  valuta: "€"
};
