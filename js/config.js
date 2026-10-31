/*
 * Store settings — edit this file to make the site yours.
 * Everything customers see (name, WhatsApp number, prices, policies) comes from here and catalog.js.
 */
window.STORE = {
  name: "Grain & Groove",
  tagline: "Custom woodwork, made to order",
  madeIn: "Handmade in India",

  // WhatsApp number that receives orders: country code + number, digits only.
  // Example for India: "919812345678". Leave empty to let the customer pick a chat.
  whatsappNumber: "917339159673",

  currency: "INR",
  locale: "en-IN",
  orderPrefix: "GG",

  shipping: {
    freeAbove: 1999, // order subtotal for free shipping
    fee: 99          // shipping charged below that
  },
  giftWrap: 99,      // per item

  contact: {
    email: "",                 // e.g. "orders@yourstore.in"
    instagram: "",             // e.g. "https://instagram.com/yourstore"
    address: "",               // workshop address shown in the footer
    hours: "Mon–Sat, 10am–7pm"
  },

  payment: ["UPI", "Bank transfer", "Cash on delivery (select pin codes)"],

  // Short promises shown under the hero. Keep them true for your business.
  promises: [
    "We confirm every detail with you on WhatsApp before we start",
    "Custom sizes and designs on request",
    "Food-safe oil finish on all kitchenware"
  ],

  // Real customer reviews only. Format: { name: "Asha, Pune", text: "…", product: "Family chopping board" }
  // The reviews section stays hidden while this list is empty.
  reviews: [],

  // Edit these answers to match your actual policies.
  faq: [
    {
      q: "How do I place an order?",
      a: "Choose a piece, pick its wood, size and options, and tap “Order on WhatsApp” — or add several pieces to your order first. The full order, with your address, arrives in our WhatsApp chat. We confirm the price, delivery date and payment there."
    },
    {
      q: "Can you make a different size or design?",
      a: "Yes — that's what we do. Write the size or change in the “Changes or special requests” box, or use the custom order form. Send sketches or reference photos on WhatsApp and we'll quote before we start."
    },
    {
      q: "How long does it take?",
      a: "Most pieces ship 4–7 working days after we confirm your order; bansuris and larger pieces take 7–14 days. Delivery within India usually takes 2–6 days after dispatch."
    },
    {
      q: "How do I pay?",
      a: "UPI, bank transfer, or cash on delivery in select pin codes. Payment details are shared on WhatsApp once your order is confirmed — we never ask for card details on this site."
    },
    {
      q: "Are the kitchen pieces food-safe?",
      a: "Cutting boards, spoons, bowls and spice boxes are finished only with food-grade mineral oil and beeswax. No lacquer or varnish touches a food surface."
    },
    {
      q: "Can I return a made-to-order piece?",
      a: "Because every piece is made for your order, we can't take returns for a change of mind. If something arrives damaged or isn't what we confirmed together, we repair or remake it."
    },
    {
      q: "Do you take corporate or bulk orders?",
      a: "Yes — for Diwali gifting, weddings, events and restaurants, with gift packing and a GST invoice. Use the custom order form below or message us on WhatsApp with your quantity and deadline."
    },
    {
      q: "How do I care for wooden pieces?",
      a: "Hand-wash, never soak, and dry standing up. Rub kitchen pieces with a little mineral or coconut oil once a month. Keep flutes out of direct sun and away from AC vents."
    }
  ]
};
