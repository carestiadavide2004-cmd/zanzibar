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
    sottotitolo: "Bar & Lounge",
    chiSiamo: [
      "Zanzibar è il tuo angolo di esotico in città: un bar lounge dove i colori caldi della terracotta, il legno e il verde delle palme creano un'atmosfera rilassata, dalla colazione fino al dopocena.",
      "Selezioniamo materie prime di qualità, prepariamo cocktail classici e signature, e serviamo aperitivi generosi da condividere. Siediti, rilassati, il viaggio comincia qui."
    ],
    indirizzo: "Via delle Palme 12, 00100 Roma (RM)",
    telefono: "+39 06 1234 5678",
    email: "info@zanzibarlounge.it",
    social: [
      { nome: "Instagram", url: "https://instagram.com/" },
      { nome: "Facebook",  url: "https://facebook.com/" }
    ],
    // Testo usato per la mappa (indirizzo o coordinate "lat,lng")
    mappa: "Colosseo, Roma"
  },

  /* ---------- ORARI ---------- */
  orari: [
    { giorni: "Lunedì",            ore: "Chiuso" },
    { giorni: "Martedì – Giovedì", ore: "07:00 – 00:00" },
    { giorni: "Venerdì – Sabato",  ore: "07:00 – 02:00" },
    { giorni: "Domenica",          ore: "08:00 – 00:00" }
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

  /* ---------- GALLERIA ----------
     src: indirizzo della foto (link o file locale es. "img/sala.jpg")
     alt: breve descrizione (per accessibilità)
  */
  galleria: [
    { src: "https://images.pexels.com/photos/1581554/pexels-photo-1581554.jpeg?auto=compress&cs=tinysrgb&w=700", alt: "Sala interna con arredi in legno e rattan" },
    { src: "https://images.pexels.com/photos/2789328/pexels-photo-2789328.jpeg?auto=compress&cs=tinysrgb&w=700", alt: "Due cocktail con menta al bancone" },
    { src: "https://images.pexels.com/photos/941864/pexels-photo-941864.jpeg?auto=compress&cs=tinysrgb&w=700",   alt: "Bancone del bar con luci calde" },
    { src: "https://images.pexels.com/photos/338713/pexels-photo-338713.jpeg?auto=compress&cs=tinysrgb&w=700",   alt: "Spritz all'arancia con rosmarino" },
    { src: "https://images.pexels.com/photos/1304540/pexels-photo-1304540.jpeg?auto=compress&cs=tinysrgb&w=700", alt: "Negroni con scorza d'arancia" },
    { src: "https://images.pexels.com/photos/2531189/pexels-photo-2531189.jpeg?auto=compress&cs=tinysrgb&w=700", alt: "Tagliere di formaggi per l'aperitivo" },
    { src: "https://images.pexels.com/photos/2067628/pexels-photo-2067628.jpeg?auto=compress&cs=tinysrgb&w=700", alt: "Espresso in tazza gialla" },
    { src: "https://images.pexels.com/photos/1283219/pexels-photo-1283219.jpeg?auto=compress&cs=tinysrgb&w=700", alt: "Bottiglie esposte dietro il bancone" }
  ],

  // Simbolo valuta mostrato accanto ai prezzi
  valuta: "€"
};
