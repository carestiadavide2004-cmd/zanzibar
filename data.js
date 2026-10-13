/* =========================================================
   ZANZIBAR — DATI DEL SITO
   Qui si modificano testi, contatti, orari e foto.
   Il MENU si gestisce dal pannello /admin (Firebase): quello
   scritto qui sotto serve per l'importazione iniziale e come
   riserva se il database non è configurato o non risponde.
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
     Ogni categoria ha: nome e lista di voci.
     Ogni voce: nome, desc (facoltativa), prezzo (numero), tag (facoltativo)
  */
  menu: [
    {
      categoria: "Caffetteria",
      voci: [
        { nome: "Espresso",         desc: "Miscela 100% arabica, tostatura media.", prezzo: 1.20 },
        { nome: "Cappuccino",       desc: "Espresso e latte montato vellutato.",     prezzo: 1.60 },
        { nome: "Caffè al ginseng", desc: "Piccolo o grande.",                       prezzo: 1.80 },
        { nome: "Marocchino",       desc: "Espresso, cacao e schiuma di latte.",     prezzo: 1.80 },
        { nome: "Latte macchiato",  desc: "Con latte vegetale su richiesta.",        prezzo: 2.00, tag: "Veg" },
        { nome: "Tè e infusi",      desc: "Selezione di tè verdi, neri e tisane.",   prezzo: 2.50 }
      ]
    },
    {
      categoria: "Colazioni",
      voci: [
        { nome: "Cornetto",         desc: "Vuoto, crema, marmellata o pistacchio.",       prezzo: 1.30 },
        { nome: "Cornetto integrale", desc: "Con miele millefiori.",                      prezzo: 1.50 },
        { nome: "Toast Zanzibar",   desc: "Pane in cassetta, prosciutto cotto e formaggio.", prezzo: 4.00 },
        { nome: "Yogurt bowl",      desc: "Yogurt greco, granola, frutta fresca e miele.", prezzo: 6.50, tag: "Veg" },
        { nome: "Avocado toast",    desc: "Pane ai cereali, avocado, lime e semi.",        prezzo: 7.50, tag: "Vegan" },
        { nome: "Spremuta d'arancia", desc: "Arance fresche spremute al momento.",         prezzo: 4.00 }
      ]
    },
    {
      categoria: "Aperitivi",
      voci: [
        { nome: "Spritz Aperol",    desc: "Aperol, prosecco, soda, arancia.",              prezzo: 7.00 },
        { nome: "Spritz Campari",   desc: "Campari, prosecco, soda.",                      prezzo: 7.00 },
        { nome: "Hugo",             desc: "Sciroppo di sambuco, prosecco, menta, lime.",   prezzo: 7.00 },
        { nome: "Calice di vino",   desc: "Bianco, rosso o bollicine della casa.",         prezzo: 6.00 },
        { nome: "Tagliere Zanzibar", desc: "Salumi, formaggi, olive e focaccia (per 2).",  prezzo: 16.00 },
        { nome: "Analcolico tropicale", desc: "Ananas, maracuja, lime e ginger beer.",     prezzo: 6.00, tag: "Analcolico" }
      ]
    },
    {
      categoria: "Cocktail",
      voci: [
        { nome: "Zanzibar Mule",    desc: "Rum speziato, ginger beer, lime e cannella.",   prezzo: 10.00, tag: "Signature" },
        { nome: "Spice Island",     desc: "Gin, chiodi di garofano, pompelmo rosa, tonica.", prezzo: 11.00, tag: "Signature" },
        { nome: "Negroni",          desc: "Gin, vermouth rosso, bitter.",                  prezzo: 9.00 },
        { nome: "Mojito",           desc: "Rum bianco, lime, menta, zucchero di canna, soda.", prezzo: 9.00 },
        { nome: "Piña Colada",      desc: "Rum, ananas, crema di cocco.",                  prezzo: 10.00 },
        { nome: "Gin Tonic",        desc: "Selezione di gin premium e toniche.",           prezzo: 10.00 }
      ]
    },
    {
      categoria: "Panini & Snack",
      voci: [
        { nome: "Club sandwich",    desc: "Pollo, bacon, lattuga, pomodoro, maionese. Con patatine.", prezzo: 11.00 },
        { nome: "Panino Caprese",   desc: "Mozzarella, pomodoro, basilico, olio EVO.",     prezzo: 7.00, tag: "Veg" },
        { nome: "Piadina crudo",    desc: "Prosciutto crudo, stracchino, rucola.",          prezzo: 7.50 },
        { nome: "Patatine fritte",  desc: "Con salse a scelta.",                           prezzo: 4.50 },
        { nome: "Nachos",           desc: "Con guacamole, salsa cheddar e jalapeños.",      prezzo: 7.00 },
        { nome: "Olive all'ascolana", desc: "Porzione da 8 pezzi.",                         prezzo: 5.50 }
      ]
    },
    {
      categoria: "Dolci",
      voci: [
        { nome: "Tiramisù",         desc: "Ricetta classica della casa.",                  prezzo: 5.50 },
        { nome: "Cheesecake al mango", desc: "Base croccante e coulis di mango.",          prezzo: 6.00 },
        { nome: "Tortino al cioccolato", desc: "Cuore fondente, servito tiepido.",         prezzo: 6.00 },
        { nome: "Macedonia tropicale", desc: "Frutta fresca di stagione e cocco.",         prezzo: 5.00, tag: "Vegan" },
        { nome: "Affogato al caffè", desc: "Gelato alla vaniglia ed espresso.",           prezzo: 4.50 }
      ]
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
