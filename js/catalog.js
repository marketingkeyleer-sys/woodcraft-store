/*
 * Catalogue — categories, woods and every product.
 *
 * Product photos are Unsplash photo ids (free for commercial use). Replace `img` with your own
 * photo path (e.g. "assets/products/board.jpg") as soon as you have product shots.
 * Products without `img` use a rendered 3D image of the piece instead.
 *
 * Pricing: `price` is the price of the default configuration (first wood, first size, first options).
 * Size `add` and option `add` are added to it; other woods scale it by their `factor` relative to the first wood.
 */
window.CATALOG = {
  categories: [
    { id: "kitchen", name: "Kitchen & Dining", short: "Kitchen", blurb: "Boards, belans, bowls and spice boxes, finished food-safe.", cover: "1692364959359-287fbe315403" },
    { id: "music", name: "Bansuri & Flutes", short: "Flutes", blurb: "Concert and beginner bansuris, practice sets and sheesham flutes, tuned to your key.", cover: "1761848022288-7ccce249d1f4" },
    { id: "gifts", name: "Gifts & Keepsakes", short: "Gifts", blurb: "Boxes, frames and hand-turned pens made for gifting.", cover: "1770816307472-945144576a1f" },
    { id: "decor", name: "Home Décor", short: "Décor", blurb: "Clocks, mandirs, shelves and wall pieces.", cover: "1609980775647-1fb1ef376268" },
    { id: "office", name: "Office & Desk", short: "Office", blurb: "Organisers, stands and monitor risers.", cover: "1789691925521-a0867031b263" },
    { id: "kids", name: "Kids & Toys", short: "Kids", blurb: "Trains, building blocks and stacking toys.", cover: "1777351396220-9a3801de44df" }
  ],

  occasions: [
    { id: "wedding", name: "Wedding & anniversary" },
    { id: "housewarming", name: "Griha pravesh" },
    { id: "birthday", name: "Birthday" },
    { id: "baby", name: "New baby" },
    { id: "festive", name: "Diwali & festive" },
    { id: "corporate", name: "Corporate gifting" },
    { id: "music", name: "For musicians" }
  ],

  woods: {
    acacia:   { name: "Acacia", local: "Babool", factor: 1.1, hardness: 4, tone: "High-contrast golden grain", best: "Chopping boards, platters", note: "Tough, water-resistant and kind to knife edges — the classic board wood." },
    teak:     { name: "Teak", local: "Sagwan", factor: 1.3, hardness: 4, tone: "Golden brown, naturally oily", best: "Trays, shelves, outdoor pieces", note: "Its natural oils shrug off water and weather, so it ages beautifully." },
    sheesham: { name: "Sheesham", local: "Indian rosewood", factor: 1.2, hardness: 4, tone: "Deep brown with dark streaks", best: "Boxes, flutes, mandirs", note: "Dense and durable with a rich figure. Our signature wood for heirlooms." },
    walnut:   { name: "Walnut", local: "Akhrot", factor: 1.5, hardness: 4, tone: "Chocolate brown, fine grain", best: "Desk pieces, premium gifts", note: "A refined, even grain with a deep chocolate colour — our premium choice." },
    mango:    { name: "Mango", local: "Aam", factor: 1, hardness: 3, tone: "Light honey with character marks", best: "Bowls, trays, décor", note: "Harvested from orchards after the trees stop fruiting — the most sustainable choice." },
    neem:     { name: "Neem", local: "Neem", factor: 1, hardness: 3, tone: "Light, tight-grained", best: "Spoons, spatulas, toys", note: "Long trusted in Indian kitchens; light, smooth and pleasant to hold." },
    maple:    { name: "Maple", local: "Hard maple", factor: 1.25, hardness: 5, tone: "Pale cream, closed grain", best: "Kids' toys, belans", note: "Very hard and smooth with almost no pores — easy to keep clean." },
    bamboo:   { name: "Bamboo", local: "Assam bamboo", factor: 1, hardness: 3, tone: "Pale gold, natural nodes", best: "Bansuri flutes", note: "Seasoned for months before we tune it — the traditional bansuri material." }
  },

  products: [
    /* ---------------- Kitchen & Dining ---------------- */
    {
      id: "chopping-board", name: "Chopping Board with Handle", cat: "kitchen",
      occasions: ["wedding", "housewarming", "festive"], price: 1299, badge: "Bestseller",
      img: "1587302108992-20648821725d", alt: "Wooden chopping board with handle",
      model: { type: "board", shape: "paddle" },
      woods: ["acacia", "mango", "teak", "sheesham", "walnut"],
      sizes: [
        { id: "m", label: "Medium", dims: "14 × 9 in", add: 0, scale: 1 },
        { id: "l", label: "Large", dims: "17 × 11 in", add: 450, scale: 1.18 },
        { id: "xl", label: "Extra large", dims: "20 × 13 in", add: 850, scale: 1.34 }
      ],
      options: [
        { id: "groove", label: "Juice groove", choices: [
          { id: "none", label: "Flat top", add: 0 },
          { id: "yes", label: "With juice groove", add: 150 }
        ] },
        { id: "finish", label: "Finish", choices: [
          { id: "oil", label: "Food-safe mineral oil", add: 0 },
          { id: "wax", label: "Oil + beeswax (extra sheen)", add: 150 }
        ] }
      ],
      desc: "Cut from a single slab with a comfortable handle and a hanging hole. Add a juice groove for fruit, meat and roasts.",
      details: ["18 mm thick, eased edges", "Food-safe finish — no lacquer", "Hand-wash, oil once a month"],
      lead: "4–6 days"
    },
    {
      id: "round-serving-board", name: "Round Serving & Pizza Board", cat: "kitchen",
      occasions: ["housewarming", "birthday", "festive"], price: 1199,
      img: "1624811533744-f85d5325d49c", alt: "Round wooden board with knife and vegetables",
      model: { type: "board", shape: "round" },
      woods: ["acacia", "mango", "teak", "sheesham"],
      sizes: [
        { id: "10", label: '10"', dims: "25 cm diameter", add: 0, scale: 0.9 },
        { id: "12", label: '12"', dims: "30 cm diameter", add: 300, scale: 1 },
        { id: "14", label: '14"', dims: "35 cm diameter", add: 600, scale: 1.12 }
      ],
      options: [
        { id: "groove", label: "Juice groove", choices: [
          { id: "none", label: "Flat top", add: 0 },
          { id: "yes", label: "With juice groove", add: 150 }
        ] }
      ],
      desc: "A generous round board for pizza, rotis or a cheese spread, with a hanging hole for the kitchen wall.",
      details: ["16 mm thick", "Food-safe oil finish", "Leather hanging loop included"],
      lead: "4–6 days"
    },
    {
      id: "grazing-platter", name: "Long Grazing Platter", cat: "kitchen",
      occasions: ["wedding", "housewarming", "festive", "corporate"], price: 1899,
      img: "1678572823447-45fc146df43c", alt: "Long wooden platter loaded with snacks",
      model: { type: "board", shape: "long" },
      woods: ["acacia", "mango", "teak", "walnut"],
      sizes: [
        { id: "24", label: "24 in", dims: "61 × 18 cm", add: 0, scale: 0.9 },
        { id: "30", label: "30 in", dims: "76 × 20 cm", add: 500, scale: 1 },
        { id: "36", label: "36 in", dims: "91 × 22 cm", add: 900, scale: 1.12 }
      ],
      options: [
        { id: "grips", label: "Ends", choices: [
          { id: "slots", label: "Cut-out finger grips", add: 0 },
          { id: "plain", label: "Plain ends", add: 0 }
        ] }
      ],
      desc: "A long serving board for festive spreads, mithai and party platters, with finger-grip slots at both ends.",
      details: ["20 mm thick", "Food-safe oil finish", "Fits most dining tables lengthwise"],
      lead: "5–7 days"
    },
    {
      id: "belan", name: "Belan (Rolling Pin)", cat: "kitchen",
      occasions: ["wedding", "housewarming"], price: 449,
      img: "1639583673260-eca9c67998c9", alt: "Wooden rolling pin on a wooden table",
      model: { type: "pin" },
      woods: ["sheesham", "neem", "teak", "maple"],
      sizes: [
        { id: "std", label: "Standard", dims: "15 in long", add: 0, scale: 0.92 },
        { id: "long", label: "Long", dims: "18 in long", add: 100, scale: 1.08 }
      ],
      options: [
        { id: "style", label: "Style", choices: [
          { id: "tapered", label: "Tapered Indian belan", add: 0 },
          { id: "handled", label: "Baker's pin with handles", add: 100 }
        ] }
      ],
      desc: "Lathe-turned from a single billet and balanced for rolling even rotis, puris and parathas.",
      details: ["No joints or glue", "Smooth, sealed finish so dough doesn't stick", "Wipe clean, oil occasionally"],
      lead: "3–5 days"
    },
    {
      id: "chakla-belan-set", name: "Chakla Belan Set", cat: "kitchen",
      occasions: ["wedding", "housewarming", "festive"], price: 999, badge: "New",
      img: null, alt: "Round wooden chakla on short feet with a belan resting on it",
      model: { type: "chakla" },
      woods: ["sheesham", "teak", "neem", "mango"],
      sizes: [
        { id: "9", label: '9"', dims: "23 cm board", add: 0, scale: 0.9 },
        { id: "10", label: '10"', dims: "25 cm board", add: 150, scale: 1 },
        { id: "12", label: '12"', dims: "30 cm board", add: 350, scale: 1.15 }
      ],
      options: [
        { id: "base", label: "Base", choices: [
          { id: "feet", label: "Raised on three feet", add: 0 },
          { id: "flat", label: "Flat base", add: 0 }
        ] }
      ],
      desc: "A round rolling board with a matching belan, turned from the same wood so the pair ages together.",
      details: ["Board and belan from one batch of wood", "Feet keep the chakla steady on the counter", "A favourite wedding and griha pravesh gift"],
      lead: "4–6 days"
    },
    {
      id: "spatula-set", name: "Neem Wood Spatula Set", cat: "kitchen",
      occasions: ["housewarming", "wedding", "festive"], price: 799,
      img: "1594761077961-cadd185540a4", alt: "Wooden spoons and spatulas in a wooden cup",
      model: { type: "utensils" },
      woods: ["neem", "sheesham", "teak"],
      sizes: [
        { id: "3", label: "3 pieces", dims: "Spatula, spoon, turner", add: 0, scale: 1 },
        { id: "5", label: "5 pieces", dims: "+ small spoon, small spatula", add: 350, scale: 1 }
      ],
      desc: "Hand-shaped spatulas that won't scratch non-stick or cast iron, with hanging holes in every handle.",
      details: ["Finished with food-grade oil only", "Heat-safe for everyday cooking", "Hand-wash, dry upright"],
      lead: "4–6 days"
    },
    {
      id: "masala-dabba", name: "Wooden Masala Dabba", cat: "kitchen",
      occasions: ["wedding", "housewarming", "festive"], price: 1599,
      img: null, alt: "Round wooden spice box with seven cups",
      model: { type: "masala" },
      woods: ["sheesham", "mango", "acacia", "teak"],
      options: [
        { id: "cups", label: "Inner cups", choices: [
          { id: "wood", label: "Wooden katoris", add: 0 },
          { id: "steel", label: "Steel katoris", add: 200 }
        ] }
      ],
      desc: "The family spice box in solid wood: seven katoris, a fitted lid and a turned knob.",
      details: ["9 in diameter, seven cups", "Fitted lid keeps spices fresh", "Wipe clean — do not soak"],
      lead: "6–8 days"
    },
    {
      id: "serving-tray", name: "Serving Tray with Handles", cat: "kitchen",
      occasions: ["housewarming", "festive", "corporate"], price: 1499,
      img: "1784901393087-988ae280ea4c", alt: "Two oval wooden serving trays",
      model: { type: "tray" },
      woods: ["mango", "teak", "sheesham", "acacia"],
      sizes: [
        { id: "m", label: "Medium", dims: "14 × 10 in", add: 0, scale: 1 },
        { id: "l", label: "Large", dims: "18 × 12 in", add: 400, scale: 1.15 }
      ],
      options: [
        { id: "handles", label: "Handles", choices: [
          { id: "brass", label: "Solid brass", add: 0 },
          { id: "wood", label: "Bent wood", add: 0 }
        ] }
      ],
      desc: "A raised-rim tray for chai, breakfast in bed or welcoming guests.",
      details: ["Rim height 4 cm", "Choice of brass or wooden handles", "Wipe with a damp cloth"],
      lead: "5–7 days"
    },
    {
      id: "coaster-set", name: "Wooden Coaster Set", cat: "kitchen",
      occasions: ["wedding", "housewarming", "corporate"], price: 599,
      img: "1784901391087-cf971397acdc", alt: "Round wooden coasters in a holder",
      model: { type: "coasters" },
      woods: ["mango", "acacia", "teak", "sheesham", "walnut"],
      sizes: [
        { id: "4", label: "Set of 4", dims: "10 cm each", add: 0, scale: 1 },
        { id: "6", label: "Set of 6", dims: "10 cm each", add: 250, scale: 1 }
      ],
      options: [
        { id: "shape", label: "Shape", choices: [
          { id: "round", label: "Round", add: 0 },
          { id: "square", label: "Square", add: 0 }
        ] },
        { id: "holder", label: "Holder", choices: [
          { id: "none", label: "No holder", add: 0 },
          { id: "box", label: "Wooden holder", add: 200 }
        ] }
      ],
      desc: "Solid-wood coasters with softly rounded edges — order in bulk for return gifts and cafés.",
      details: ["8 mm thick", "Water-resistant oil finish", "Bulk pricing from 25 sets"],
      lead: "3–5 days"
    },
    {
      id: "fruit-salad-bowl", name: "Hand-turned Fruit & Salad Bowl", cat: "kitchen",
      occasions: ["housewarming", "festive"], price: 1099,
      img: "1762631383588-7c9df7e91e64", alt: "Wooden bowl filled with grain salad",
      model: { type: "bowl" },
      woods: ["mango", "acacia", "teak", "sheesham"],
      sizes: [
        { id: "8", label: '8"', dims: "20 cm wide", add: 0, scale: 0.9 },
        { id: "10", label: '10"', dims: "25 cm wide", add: 300, scale: 1 },
        { id: "12", label: '12"', dims: "30 cm wide", add: 600, scale: 1.12 }
      ],
      desc: "Turned on the lathe from a single block, so the grain flows unbroken around the bowl.",
      details: ["Food-safe oil finish", "Not for hot liquids or the microwave", "Hand-wash only"],
      lead: "5–7 days"
    },

    /* ---------------- Bansuri & Flutes ---------------- */
    {
      id: "concert-bansuri", name: "Concert Bansuri, Tuned to Your Key", cat: "music",
      occasions: ["music", "birthday", "festive"], price: 1499, badge: "Hand-tuned",
      img: "1761848022288-7ccce249d1f4", alt: "Bamboo bansuri with a peacock feather on red velvet",
      model: { type: "flute", bamboo: true, length: 4.6 },
      woods: ["bamboo"],
      options: [
        { id: "key", label: "Scale (key)", choices: [
          { id: "C", label: "C", add: 0 }, { id: "C#", label: "C#", add: 0 }, { id: "D", label: "D", add: 0 },
          { id: "D#", label: "D#", add: 0 }, { id: "E", label: "E", add: 0 }, { id: "F", label: "F", add: 0 },
          { id: "F#", label: "F#", add: 0 }, { id: "G", label: "G", add: 0 }, { id: "G#", label: "G#", add: 0 },
          { id: "A", label: "A", add: 0 }, { id: "A#", label: "A#", add: 0 }, { id: "B", label: "B", add: 0 }
        ] },
        { id: "octave", label: "Register", choices: [
          { id: "medium", label: "Medium (most popular)", add: 0 },
          { id: "bass", label: "Bass — deep and slow", add: 1200 },
          { id: "high", label: "High — bright and small", add: 0 }
        ] },
        { id: "thread", label: "Binding", choices: [
          { id: "red", label: "Red silk", add: 0 },
          { id: "black", label: "Black silk", add: 0 },
          { id: "none", label: "No binding", add: 0 }
        ] }
      ],
      desc: "Made from seasoned Assam bamboo and tuned against an electronic tuner at A = 440 Hz, so it plays in tune with harmonium, tanpura and recordings.",
      details: ["Tuned to A = 440 Hz", "Cloth cover and fingering chart included", "Oil the bore with almond oil once a month"],
      lead: "7–10 days"
    },
    {
      id: "beginner-bansuri", name: "Beginner Bansuri (C Natural)", cat: "music",
      occasions: ["music", "birthday"], price: 699,
      img: "1778323485504-a1afad091a14", alt: "Musician playing a bamboo flute with sheet music",
      model: { type: "flute", bamboo: true, length: 3.4 },
      woods: ["bamboo"],
      options: [
        { id: "case", label: "Case", choices: [
          { id: "cloth", label: "Cloth cover", add: 0 },
          { id: "hard", label: "Hard wooden case", add: 300 }
        ] },
        { id: "thread", label: "Binding", choices: [
          { id: "red", label: "Red silk", add: 0 },
          { id: "black", label: "Black silk", add: 0 }
        ] }
      ],
      desc: "A forgiving medium-C bansuri with easy finger spacing — the flute most teachers recommend for the first year.",
      details: ["Medium C natural scale", "Fingering chart in the box", "Suitable for ages 8+"],
      lead: "4–6 days"
    },
    {
      id: "bansuri-set", name: "Bansuri Practice Set (3 Flutes)", cat: "music",
      occasions: ["music", "festive"], price: 2499,
      img: "1672578249566-3f4b6d564aa2", alt: "Three bamboo flutes on a bamboo mat",
      model: { type: "flute", bamboo: true, set: true, length: 4.6 },
      woods: ["bamboo"],
      options: [
        { id: "set", label: "Keys in the set", choices: [
          { id: "starter", label: "C, G and A (medium)", add: 0 },
          { id: "performer", label: "E bass, G and A", add: 1800 }
        ] },
        { id: "thread", label: "Binding", choices: [
          { id: "red", label: "Red silk", add: 0 },
          { id: "black", label: "Black silk", add: 0 }
        ] }
      ],
      desc: "Three matched flutes in the keys most used for practice and accompaniment, in a padded roll-up case.",
      details: ["All three tuned to A = 440 Hz", "Padded cloth roll included", "Ask on WhatsApp for other key sets"],
      lead: "8–12 days"
    },
    {
      id: "sheesham-flute", name: "Sheesham Wood Flute", cat: "music",
      occasions: ["music", "birthday"], price: 1899,
      img: "1567184344121-400f9a6feaa4", alt: "Dark wooden flute",
      model: { type: "flute", bamboo: false, length: 3.8 },
      woods: ["sheesham", "walnut"],
      options: [
        { id: "key", label: "Scale (key)", choices: [
          { id: "C", label: "C", add: 0 }, { id: "D", label: "D", add: 0 }, { id: "E", label: "E", add: 0 },
          { id: "G", label: "G", add: 0 }, { id: "A", label: "A", add: 0 }
        ] }
      ],
      desc: "Bored and voiced from a solid rosewood billet with brass rings at each end. Warmer and more stable than bamboo in changing weather.",
      details: ["Solid sheesham with brass ferrules", "Tuned to A = 440 Hz", "Velvet pouch included"],
      lead: "10–12 days"
    },

    /* ---------------- Gifts & Keepsakes ---------------- */
    {
      id: "photo-frame", name: "Wooden Photo Frame", cat: "gifts",
      occasions: ["wedding", "birthday", "baby"], price: 899,
      img: "1582053628662-c65b0e0544e9", alt: "Wooden photo frame on a wall",
      model: { type: "frame" }, photo: true,
      woods: ["teak", "walnut", "mango", "sheesham"],
      sizes: [
        { id: "4x6", label: "4 × 6", dims: "Photo 4 × 6 in", add: 0, scale: 1 },
        { id: "5x7", label: "5 × 7", dims: "Photo 5 × 7 in", add: 200, scale: 1.12 },
        { id: "8x10", label: "8 × 10", dims: "Photo 8 × 10 in", add: 500, scale: 1.35 }
      ],
      desc: "A solid-wood frame with a wide bottom rail, glass front and easel back. Upload a photo to see how it will look.",
      details: ["Glass front, easel back", "Stands on a table or hangs on the wall", "Custom frame sizes on request"],
      lead: "3–5 days"
    },
    {
      id: "jewellery-box", name: "Jewellery & Watch Box", cat: "gifts",
      occasions: ["wedding", "birthday", "festive"], price: 1799,
      img: "1549315309-f0857a904065", alt: "Wooden box with a gold watch and pendant",
      model: { type: "box", variant: "jewel" },
      woods: ["sheesham", "walnut", "teak", "mango"],
      sizes: [
        { id: "s", label: "Small", dims: "8 × 6 × 3 in", add: 0, scale: 1 },
        { id: "l", label: "Large", dims: "10 × 7 × 4 in, watch pillows", add: 700, scale: 1.15 }
      ],
      options: [
        { id: "lining", label: "Velvet lining", choices: [
          { id: "maroon", label: "Maroon", add: 0 },
          { id: "navy", label: "Navy", add: 0 },
          { id: "black", label: "Black", add: 0 }
        ] }
      ],
      desc: "Velvet-lined compartments for rings, earrings and a watch, with brass hinges and clasp.",
      details: ["Velvet-lined trays", "Brass hinges and clasp", "Dust with a dry cloth"],
      lead: "5–7 days"
    },
    {
      id: "wooden-pen", name: "Hand-turned Wooden Pen", cat: "gifts",
      occasions: ["corporate", "birthday"], price: 899,
      img: "1634442490908-dc90210c8bce", alt: "Wooden box holding two pens",
      model: { type: "pen" },
      woods: ["sheesham", "walnut", "teak"],
      options: [
        { id: "ink", label: "Pen type", choices: [
          { id: "ball", label: "Ballpoint", add: 0 },
          { id: "roller", label: "Rollerball", add: 150 },
          { id: "fountain", label: "Fountain pen", add: 450 }
        ] },
        { id: "trim", label: "Trim", choices: [
          { id: "gold", label: "Gold", add: 0 },
          { id: "chrome", label: "Chrome", add: 0 }
        ] }
      ],
      desc: "Turned on the lathe and finished by hand, with metal trim and a velvet-lined wooden box.",
      details: ["Standard refills, easy to replace", "Gift box included", "Bulk pricing from 25 pieces"],
      lead: "4–6 days"
    },
    {
      id: "keepsake-box", name: "Memory Keepsake Box", cat: "gifts",
      occasions: ["baby", "wedding", "birthday"], price: 1399,
      img: "1770816307472-945144576a1f", alt: "Wooden box with the lid open",
      model: { type: "box", variant: "keepsake" },
      woods: ["teak", "mango", "walnut", "sheesham"],
      sizes: [
        { id: "m", label: "Medium", dims: "8 × 6 × 4 in", add: 0, scale: 1 },
        { id: "l", label: "Large", dims: "10 × 8 × 5 in", add: 400, scale: 1.15 }
      ],
      desc: "For first shoes, hospital tags, wedding cards and letters — a box built to be opened for decades.",
      details: ["Solid-wood lid and base", "Brass hinges", "Custom sizes on request"],
      lead: "5–7 days"
    },
    {
      id: "dry-fruit-box", name: "Dry Fruit & Gift Box", cat: "gifts",
      occasions: ["festive", "wedding", "corporate"], price: 1299, badge: "Diwali pick",
      img: null, alt: "Wooden box with compartments of dry fruits and an open lid",
      model: { type: "dryfruit" },
      woods: ["sheesham", "mango", "teak"],
      sizes: [
        { id: "4", label: "4 compartments", dims: "9 × 9 in", add: 0, scale: 1 },
        { id: "6", label: "6 compartments", dims: "13 × 9 in", add: 400, scale: 1 }
      ],
      options: [
        { id: "lid", label: "Lid", choices: [
          { id: "lid", label: "With lid", add: 0 },
          { id: "open", label: "Open tray", add: -150 }
        ] }
      ],
      desc: "A compartment box for Diwali dry fruits, wedding favours or tea. Order in bulk for festive and corporate gifting.",
      details: ["Dry fruits not included", "Food-safe finish inside", "Bulk pricing from 25 pieces"],
      lead: "5–8 days"
    },

    /* ---------------- Home Décor ---------------- */
    {
      id: "wall-clock", name: "Wooden Wall Clock", cat: "decor",
      occasions: ["housewarming", "wedding", "corporate"], price: 1999,
      img: "1609980775647-1fb1ef376268", alt: "Round wooden wall clock",
      model: { type: "clock" },
      woods: ["teak", "walnut", "mango", "sheesham"],
      sizes: [
        { id: "12", label: '12"', dims: "30 cm", add: 0, scale: 1 },
        { id: "16", label: '16"', dims: "40 cm", add: 700, scale: 1.2 }
      ],
      options: [
        { id: "numerals", label: "Dial", choices: [
          { id: "roman", label: "Roman numerals", add: 0 },
          { id: "arabic", label: "Arabic numerals", add: 0 },
          { id: "ticks", label: "Minimal markers", add: 0 }
        ] }
      ],
      desc: "A silent sweep clock with a solid-wood dial and painted markers. No ticking at night.",
      details: ["Silent sweep movement, 1 × AA", "Keyhole hanger", "Dust with a dry cloth"],
      lead: "5–7 days"
    },
    {
      id: "pooja-mandir", name: "Pooja Mandir (Home Temple)", cat: "decor",
      occasions: ["housewarming", "festive"], price: 7999, badge: "Made to measure",
      img: null, alt: "Wooden home temple with pillars and a dome",
      model: { type: "mandir" },
      woods: ["sheesham", "teak", "mango"],
      sizes: [
        { id: "wall", label: "Wall-mounted", dims: "18 × 12 × 24 in", add: 0, scale: 1 },
        { id: "floor", label: "Floor-standing", dims: "24 × 16 × 36 in", add: 5000, scale: 1.2 }
      ],
      options: [
        { id: "back", label: "Back panel", choices: [
          { id: "jali", label: "Jali (lattice) panel", add: 0 },
          { id: "plain", label: "Plain panel", add: -400 }
        ] },
        { id: "light", label: "Lighting", choices: [
          { id: "none", label: "No lighting", add: 0 },
          { id: "led", label: "Warm LED under the dome", add: 400 }
        ] }
      ],
      desc: "Turned pillars, a jali back panel and a shikhara dome, sized to your wall or corner. Send us your space measurements on WhatsApp.",
      details: ["Built to your measurements", "Ships knocked-down with fittings", "Assembly guidance on WhatsApp"],
      lead: "14–18 days"
    },
    {
      id: "key-holder", name: "Wall Key Holder", cat: "decor",
      occasions: ["housewarming"], price: 899,
      img: "1685886069739-c1b96bba7953", alt: "Keys hanging on a wall hook",
      model: { type: "keyholder" },
      woods: ["teak", "mango", "sheesham", "walnut"],
      options: [
        { id: "hooks", label: "Hooks", choices: [
          { id: "4", label: "4 pegs", add: 0 },
          { id: "6", label: "6 pegs", add: 150 }
        ] },
        { id: "shelf", label: "Top shelf", choices: [
          { id: "none", label: "No shelf", add: 0 },
          { id: "yes", label: "With small shelf", add: 250 }
        ] }
      ],
      desc: "Turned wooden pegs on a solid board — keys, masks and lanyards finally have a home by the door.",
      details: ["Hidden wall fixings included", "Pegs hold up to 2 kg each", "Shelf fits wallets and phones"],
      lead: "4–6 days"
    },
    {
      id: "diya-candle-stand", name: "Turned Diya & Candle Stand Set", cat: "decor",
      occasions: ["festive", "wedding", "housewarming"], price: 1299,
      img: "1792187761035-52df4c0afc26", alt: "White candles in turned wooden holders",
      model: { type: "candles" },
      woods: ["mango", "sheesham", "teak"],
      desc: "Three lathe-turned stands of different heights on a shared base — made for Diwali diyas or pillar candles.",
      details: ["Brass cup inserts for diyas", "Candles not included", "Keep flames away from wood"],
      lead: "5–7 days"
    },
    {
      id: "floating-shelf", name: "Floating Wall Shelf", cat: "decor",
      occasions: ["housewarming"], price: 1599,
      img: "1588111948296-83a8e036e004", alt: "Wooden wall shelf with books",
      model: { type: "shelf" },
      woods: ["teak", "sheesham", "mango", "walnut"],
      sizes: [
        { id: "24", label: "24 in", dims: "61 cm", add: 0, scale: 1 },
        { id: "36", label: "36 in", dims: "91 cm", add: 600, scale: 1.4 },
        { id: "48", label: "48 in", dims: "122 cm", add: 1100, scale: 1.8 }
      ],
      desc: "A thick solid-wood shelf on a hidden steel bracket. Any length made to order.",
      details: ["Holds up to 20 kg", "Hidden bracket and fixings", "8 in deep"],
      lead: "6–8 days"
    },
    {
      id: "carved-elephant", name: "Hand-carved Elephant (Gaja)", cat: "decor",
      occasions: ["housewarming", "festive", "corporate"], price: 2499,
      img: "1739281468485-dfb4231a004d", alt: "Carved wooden elephant figurine",
      model: null,
      woods: ["sheesham", "teak"],
      sizes: [
        { id: "6", label: "6 in", dims: "15 cm tall", add: 0, scale: 1 },
        { id: "9", label: "9 in", dims: "23 cm tall", add: 900, scale: 1 },
        { id: "12", label: "12 in", dims: "30 cm tall", add: 1800, scale: 1 }
      ],
      desc: "Carved by hand with a raised trunk for good fortune. Each one is unique, so grain and details vary from the photo.",
      details: ["Hand-carved — no two alike", "Felt pads underneath", "Dust with a soft brush"],
      lead: "10–12 days"
    },

    /* ---------------- Office & Desk ---------------- */
    {
      id: "desk-organiser", name: "Desk Organiser", cat: "office",
      occasions: ["corporate", "birthday"], price: 1299,
      img: "1639917290489-4a4eb2a6aa3a", alt: "Desk organiser holding pens and scissors",
      model: { type: "organizer" },
      woods: ["walnut", "sheesham", "teak", "mango"],
      desc: "Pen cups, a phone slot and a card tray in one solid block of wood.",
      details: ["Felt-lined base", "Phone slot fits up to 9 mm", "Bulk orders for offices"],
      lead: "5–7 days"
    },
    {
      id: "phone-stand", name: "Phone & Tablet Stand", cat: "office",
      occasions: ["corporate", "birthday"], price: 549,
      img: "1675109322863-2f4eef9fe032", alt: "Phone resting on a wooden stand",
      model: { type: "stand" },
      woods: ["walnut", "teak", "sheesham", "maple"],
      sizes: [
        { id: "phone", label: "Phone", dims: "Up to 7 in", add: 0, scale: 1 },
        { id: "tablet", label: "Tablet", dims: "Up to 13 in", add: 250, scale: 1.4 }
      ],
      desc: "A low-profile stand angled for video calls and recipes, with a cable slot at the back.",
      details: ["Cable pass-through", "Anti-slip feet"],
      lead: "3–5 days"
    },
    {
      id: "charging-dock", name: "Charging Dock & Valet Tray", cat: "office",
      occasions: ["corporate", "birthday", "wedding"], price: 1499,
      img: "1789691925521-a0867031b263", alt: "Wooden charging station with phone and watches",
      model: { type: "stand", dock: true },
      woods: ["walnut", "sheesham", "teak"],
      desc: "A bedside dock for phone, watch, wallet and keys, with room for a wireless charger underneath.",
      details: ["Fits most wireless chargers", "Cable channel underneath"],
      lead: "5–7 days"
    },
    {
      id: "monitor-riser", name: "Monitor Riser", cat: "office",
      occasions: ["corporate"], price: 1999,
      img: null, alt: "Wooden monitor riser with a monitor on top",
      model: { type: "riser" },
      woods: ["walnut", "sheesham", "teak", "mango"],
      sizes: [
        { id: "24", label: "24 in", dims: "61 cm wide", add: 0, scale: 1 },
        { id: "32", label: "32 in", dims: "81 cm wide", add: 500, scale: 1.25 },
        { id: "40", label: "40 in", dims: "102 cm wide", add: 900, scale: 1.5 }
      ],
      options: [
        { id: "storage", label: "Underneath", choices: [
          { id: "open", label: "Open space", add: 0 },
          { id: "drawer", label: "With drawer", add: 700 }
        ] }
      ],
      desc: "Lifts your screen to eye level and frees desk space for a keyboard underneath. Any width made to order.",
      details: ["Holds up to 25 kg", "Felt feet protect your desk", "Custom widths on request"],
      lead: "6–8 days"
    },

    /* ---------------- Kids & Toys ---------------- */
    {
      id: "building-blocks", name: "Wooden Building Blocks", cat: "kids",
      occasions: ["baby", "birthday"], price: 1199, badge: "Kids' favourite",
      img: "1777351396220-9a3801de44df", alt: "Basket of colourful wooden building blocks",
      model: { type: "blocks" },
      woods: ["maple", "neem"],
      sizes: [
        { id: "40", label: "40 pieces", dims: "Cotton storage bag", add: 0, scale: 1 },
        { id: "80", label: "80 pieces", dims: "Wooden storage box", add: 700, scale: 1 }
      ],
      options: [
        { id: "finish", label: "Finish", choices: [
          { id: "colour", label: "Child-safe colours", add: 0 },
          { id: "natural", label: "Natural wood", add: 0 }
        ] }
      ],
      desc: "Cubes, arches, columns and roofs in a 4 cm system, sanded smooth for small hands.",
      details: ["Water-based child-safe colours", "Not for under 3 years — small parts", "Wipe clean"],
      lead: "5–7 days"
    },
    {
      id: "toy-train", name: "Wooden Toy Train", cat: "kids",
      occasions: ["baby", "birthday"], price: 899,
      img: "1505003098838-83ce5356c228", alt: "Wooden toy train",
      model: { type: "train" },
      woods: ["maple", "neem"],
      options: [
        { id: "wagons", label: "Wagons", choices: [
          { id: "3", label: "Engine + 3 wagons", add: 0 },
          { id: "5", label: "Engine + 5 wagons", add: 250 }
        ] },
        { id: "finish", label: "Finish", choices: [
          { id: "colour", label: "Child-safe colours", add: 0 },
          { id: "natural", label: "Natural wood", add: 0 }
        ] }
      ],
      desc: "A pull-along engine and wagons with real rolling wheels and magnetic couplings.",
      details: ["Water-based child-safe colours", "Not for under 3 years — small parts", "Magnetic couplings"],
      lead: "5–7 days"
    },
    {
      id: "stacking-rings", name: "Stacking Rings Toy", cat: "kids",
      occasions: ["baby"], price: 649,
      img: "1641563817292-d2085b953e78", alt: "Colourful wooden stacking rings",
      model: { type: "stacker" },
      woods: ["maple", "neem"],
      options: [
        { id: "finish", label: "Finish", choices: [
          { id: "colour", label: "Rainbow colours", add: 0 },
          { id: "natural", label: "Natural wood", add: 0 }
        ] }
      ],
      desc: "Five smooth rings on a turned base — sorting, stacking and first colours in one toy.",
      details: ["Child-safe water-based colours", "Rounded, sanded edges", "Suitable for ages 1+"],
      lead: "3–5 days"
    },
    {
      id: "elephant-family", name: "Wooden Elephant Family", cat: "kids",
      occasions: ["baby", "birthday"], price: 799,
      img: "1703581698778-2224c729135b", alt: "Three wooden elephant toys",
      model: null,
      woods: ["neem", "maple"],
      desc: "A set of three hand-finished elephants — big, medium and baby — for pretend play and nursery shelves.",
      details: ["Natural oil finish", "Rounded, sanded edges", "Suitable for ages 3+"],
      lead: "6–8 days"
    }
  ]
};
