# Grain & Groove — custom woodcraft storefront

A static online store for made-to-order wooden products. Customers customise a piece
(wood, size, design options, finish, plus any special request), see it as a live 3D model,
and send the complete order to your WhatsApp. There is no backend, database or payment
gateway — you confirm price, details and payment in the WhatsApp chat.

## 1. Set your WhatsApp number (required)

Open `js/config.js` and fill in:

```js
whatsappNumber: "919812345678", // country code + number, digits only
```

Until this is set, a yellow setup banner shows at the top of the site and orders open
WhatsApp without a recipient.

In the same file you can change the store name, tagline, shipping rules, gift-wrap price,
payment methods, the promises under the hero, the FAQ answers and your contact details.
If you rename the store, also update the `<title>` and `og:` tags at the top of `index.html`.

## 2. Products

Everything is in `js/catalog.js`:

- **categories** — the six crafts and their cover photos
- **woods** — species, price factor (e.g. walnut costs 1.5× the cheapest wood offered)
- **products** — 33 products across Kitchen, Bansuri & Flutes, Gifts, Décor, Office and Kids

Price rule: `price` is what the default configuration costs (first wood, first size, first
options). Size and option add-ons are added; other woods scale the price by their factor
relative to the first wood. Totals round to a retail price ending in 9, and the catalogue
card shows the cheapest wood as "From". An option can have a negative `add` (a cheaper
variant, e.g. an open tray without a lid).

To add a product, copy an existing one with the same `model.type` (the 3D shape) and edit
the text, prices, woods, sizes and options. Set `model: null` for pieces with no 3D model
(they show the photo only). Customers can always describe a different size or design in the
"Changes or special requests" box; it appears in the WhatsApp order.

## 3. Photos — replace before launch

Product photos are free Unsplash images used as placeholders (`img: "<unsplash id>"`).
They are **not** your products, so swap in your own photos as soon as you can:

1. Put files in `assets/products/` (e.g. `assets/products/family-board.jpg`)
2. Set `img: "assets/products/family-board.jpg"` on the product

Products with `img: null` use an automatic 3D render as their catalogue image.

## 4. Preview locally

Browsers treat files opened straight from disk differently, so for a reliable preview
(including the 3D viewer) serve the folder and open http://localhost:5173:

```bash
python -m http.server 5173
```

## 5. Publish

Upload the whole folder to any static host — Netlify (drag and drop), GitHub Pages,
Cloudflare Pages, or your Hostinger/GoDaddy `public_html`. No build step needed.

## How an order reaches you

The customer's WhatsApp opens with a message like:

```
*New order — Grain & Groove*
Order ID: GG-261031-4821

*1. Chopping Board with Handle* × 1
   • Wood: Teak
   • Size: Large (17 × 11 in)
   • Juice groove: With juice groove
   • Finish: Food-safe mineral oil
   • Changes / requests: Make the handle a little longer
   Price: ₹2,199 × 1 = ₹2,199

Subtotal: ₹2,199
Shipping: Free
*Estimated total: ₹2,199*

*Deliver to*
…
```

## Files

| File | What it does |
|---|---|
| `index.html` | Page structure |
| `css/style.css` | All styling |
| `js/config.js` | Store settings — edit this first |
| `js/catalog.js` | Categories, woods and products |
| `js/wood.js` | Procedural wood textures (shared by 3D models and swatches) |
| `js/viewer3d.js` | 3D models of every product (three.js, loaded from a CDN) |
| `js/app.js` | Catalogue, personaliser, basket and WhatsApp checkout |
