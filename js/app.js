/*
 * Storefront: catalogue, personaliser, order basket and WhatsApp checkout.
 * Orders never touch a server — the full order is typed into a WhatsApp message.
 */
(() => {
  const S = window.STORE;
  const C = window.CATALOG;

  /* ---------------------------------------------------------------- helpers */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = s => String(s ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  const money = new Intl.NumberFormat(S.locale, { style: "currency", currency: S.currency, maximumFractionDigits: 0 });
  const fmt = n => money.format(n);
  const icon = name => `<svg class="i" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const byId = Object.fromEntries(C.products.map(p => [p.id, p]));
  const category = id => C.categories.find(c => c.id === id) || { name: "", short: "" };
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const saved = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(`woodshop:${key}`);
        return v ? JSON.parse(v) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(`woodshop:${key}`, JSON.stringify(value));
      } catch (e) {
        /* private mode or storage full — the order still works, it just isn't remembered */
      }
    }
  };

  // Unsplash id → sized URL. Anything with a slash or dot is treated as your own image path.
  function photo(img, w, h) {
    if (!img) return "";
    if (/[/.]/.test(img)) return img;
    return `https://images.unsplash.com/photo-${img}?auto=format&fit=crop&w=${w}${h ? `&h=${h}` : ""}&q=70`;
  }

  function formatDate(iso) {
    const d = new Date(`${iso}T00:00:00`);
    return isNaN(d) ? iso : d.toLocaleDateString(S.locale, { day: "numeric", month: "short", year: "numeric" });
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } finally {
      ta.remove();
    }
    return Promise.resolve();
  }

  let toastTimer = 0;
  function toast(message) {
    const t = $("#toast");
    t.textContent = message;
    t.dataset.state = "open";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.dataset.state = "closed"), 2600);
  }

  /* ---------------------------------------------------------------- pricing */
  const retail = x => Math.max(49, Math.round(x / 50) * 50 - 1);

  // The catalogue price is for the first (default) wood; other woods scale from it.
  function woodFactor(p, wood) {
    const base = C.woods[p.woods[0]].factor;
    return (C.woods[wood] ? C.woods[wood].factor : base) / base;
  }

  function unitPrice(p, cfg) {
    const size = (p.sizes || []).find(s => s.id === cfg.size);
    let x = (p.price + (size ? size.add : 0)) * woodFactor(p, cfg.wood);
    (p.options || []).forEach(o => {
      const ch = o.choices.find(c => c.id === cfg.opts[o.id]);
      if (ch) x += ch.add;
    });
    return retail(x);
  }

  const eachPrice = (p, cfg) => unitPrice(p, cfg) + (cfg.gift ? S.giftWrap : 0);
  const fromPrices = {};
  const fromPrice = p => (fromPrices[p.id] ??= Math.min(...p.woods.map(w => unitPrice(p, { ...defaults(p), wood: w }))));
  const lineTotal = it => eachPrice(byId[it.pid], it.cfg) * it.qty;

  function totals(items) {
    const sub = items.reduce((s, it) => s + lineTotal(it), 0);
    const ship = !sub || sub >= S.shipping.freeAbove ? 0 : S.shipping.fee;
    return { sub, ship, total: sub + ship };
  }

  function defaults(p) {
    return {
      wood: p.woods[0],
      size: p.sizes ? p.sizes[0].id : null,
      opts: Object.fromEntries((p.options || []).map(o => [o.id, o.choices[0].id])),
      qty: p.minQty || 1,
      gift: false,
      note: "",
      photo: null
    };
  }

  // Human-readable summary of a configuration — used in the basket and the WhatsApp message.
  function specs(p, cfg) {
    const out = [];
    if (C.woods[cfg.wood]) out.push(["Wood", C.woods[cfg.wood].name]);
    const size = (p.sizes || []).find(s => s.id === cfg.size);
    if (size) out.push(["Size", `${size.label} (${size.dims})`]);
    (p.options || []).forEach(o => {
      const ch = o.choices.find(c => c.id === cfg.opts[o.id]);
      if (ch) out.push([o.label, ch.label]);
    });
    if (cfg.gift) out.push(["Gift wrap", "Yes, with note card"]);
    if (cfg.note) out.push(["Changes / requests", cfg.note]);
    return out;
  }

  /* --------------------------------------------------------------- WhatsApp */
  const waNumber = () => String(S.whatsappNumber || "").replace(/\D/g, "");
  const waLink = text => `https://wa.me/${waNumber()}?text=${encodeURIComponent(text)}`;
  const pageUrl = () => location.href.split("#")[0];
  const productUrl = p => `${pageUrl()}#p/${p.id}`;
  const askText = p => `Hi ${S.name}! I'm interested in the ${p.name} (${productUrl(p)}). Could you tell me more?`;

  function openWhatsApp(text) {
    const url = waLink(text);
    const win = window.open(url, "_blank");
    if (win) win.opener = null;
    else location.href = url;
  }

  function orderId() {
    const d = new Date();
    const stamp = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    return `${S.orderPrefix}-${stamp}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  function orderMessage(order) {
    const t = order.totals;
    const L = [
      `*New order — ${S.name}*`,
      `Order ID: ${order.id}`,
      `Date: ${new Date().toLocaleDateString(S.locale, { day: "numeric", month: "short", year: "numeric" })}`,
      ""
    ];
    order.items.forEach((it, i) => {
      const p = byId[it.pid];
      L.push(`*${i + 1}. ${p.name}* × ${it.qty}`);
      specs(p, it.cfg).forEach(([k, v]) => L.push(`   • ${k}: ${v}`));
      L.push(`   Price: ${fmt(eachPrice(p, it.cfg))} × ${it.qty} = ${fmt(lineTotal(it))}`, "");
    });
    L.push(`Subtotal: ${fmt(t.sub)}`, `Shipping: ${t.ship ? fmt(t.ship) : "Free"}`, `*Estimated total: ${fmt(t.total)}*`);
    const c = order.customer;
    if (c && !c.partial) {
      L.push("", "*Deliver to*", c.name, c.phone);
      if (c.email) L.push(c.email);
      L.push(c.address, `${c.city}, ${c.state} – ${c.pin}`, "", `Payment preference: ${c.payment}`);
      if (c.date) L.push(`Needed by: ${formatDate(c.date)}`);
      if (c.notes) L.push(`Notes: ${c.notes}`);
    } else {
      if (c) L.push("", "*Customer*", ...[c.name, c.phone].filter(Boolean));
      L.push("", "I'll share my delivery details here in the chat.");
    }
    L.push("", "Please confirm the details and delivery date. Thank you!");
    return L.join("\n");
  }

  /* ------------------------------------------------------------------ state */
  const state = {
    cat: "all",
    occasion: "all",
    q: "",
    sort: "featured",
    cart: saved.get("cart", []).filter(it => byId[it.pid]),
    checkout: null,
    editKey: null,
    lastOrder: saved.get("last-order", null)
  };

  function saveCart() {
    saved.set("cart", state.cart);
    const n = state.cart.reduce((s, it) => s + it.qty, 0);
    const badge = $("#bagCount");
    badge.textContent = n;
    badge.hidden = !n;
    $("#bagButton").setAttribute("aria-label", `Your order, ${n} ${n === 1 ? "item" : "items"}`);
  }

  /* ------------------------------------------------------------- 3D renders */
  const snaps = {};
  const snap = p => (snaps[p.id] ||= Viewer3D.snapshot(p, defaults(p)));
  const woodFallback = p => Wood.image(p.woods[0], 480, 600);

  function fillRender(img) {
    const p = byId[img.dataset.render];
    const done = src => {
      img.src = src;
      img.hidden = false;
      img.parentElement.classList.add("is-rendered");
    };
    if (!Viewer3D.supported || !p.model) return done(woodFallback(p));
    snap(p).then(done).catch(() => done(woodFallback(p)));
  }

  const renderObserver = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      renderObserver.unobserve(e.target);
      fillRender(e.target);
    }),
    { rootMargin: "300px" }
  );

  function thumb(p) {
    if (p.img) return `<img src="${photo(p.img, 160, 160)}" alt="" loading="lazy">`;
    return `<img data-thumb="${p.id}" alt="" hidden><span class="thumb-wood sw-${p.woods[0]}"></span>`;
  }

  function hydrateThumbs(root) {
    $$("img[data-thumb]", root).forEach(img => {
      const p = byId[img.dataset.thumb];
      if (!Viewer3D.supported || !p.model) return;
      snap(p).then(src => {
        img.src = src;
        img.hidden = false;
        if (img.nextElementSibling) img.nextElementSibling.remove();
      }).catch(() => {});
    });
  }

  /* --------------------------------------------------------- static content */
  function applyStore() {
    $$("[data-store-name]").forEach(el => (el.textContent = S.name));
    $$("[data-tagline]").forEach(el => (el.textContent = S.tagline));
    $$("[data-made-in]").forEach(el => (el.textContent = S.madeIn));
    $("#year").textContent = new Date().getFullYear();
    $("#setupBanner").hidden = !!waNumber();

    const hello = waLink(`Hi ${S.name}! I have a question about a custom wooden piece.`);
    $("#waFab").href = hello;
    $("#navWa").href = hello;

    $("#promises").innerHTML = S.promises.map(p => `<li>${icon("check")}<span>${esc(p)}</span></li>`).join("");
    $("#footerCats").innerHTML = C.categories.map(c => `<li><a href="#shop" data-cat-link="${c.id}">${esc(c.name)}</a></li>`).join("");
    $("#footerContact").innerHTML = [
      `<li><a href="${hello}" target="_blank" rel="noopener">WhatsApp us</a></li>`,
      S.contact.email && `<li><a href="mailto:${esc(S.contact.email)}">${esc(S.contact.email)}</a></li>`,
      S.contact.instagram && `<li><a href="${esc(S.contact.instagram)}" target="_blank" rel="noopener">Instagram</a></li>`,
      S.contact.address && `<li>${esc(S.contact.address)}</li>`,
      S.contact.hours && `<li>${esc(S.contact.hours)}</li>`
    ].filter(Boolean).join("");

    $("#faqList").innerHTML = S.faq.map(f => `
      <details class="faq__item">
        <summary>${esc(f.q)}<span class="faq__icon" aria-hidden="true"></span></summary>
        <p>${esc(f.a)}</p>
      </details>`).join("");

    if (S.reviews && S.reviews.length) {
      $("#reviews").hidden = false;
      $("#reviewGrid").innerHTML = S.reviews.map(r => `
        <figure class="review">
          <blockquote>${esc(r.text)}</blockquote>
          <figcaption>${esc(r.name)}${r.product ? ` · ${esc(r.product)}` : ""}</figcaption>
        </figure>`).join("");
    }

    // One stylesheet rule per wood, so every swatch dot on the page shares the same texture.
    const style = document.createElement("style");
    style.textContent = Object.keys(C.woods).map(w => `.sw-${w}{background-image:url(${Wood.swatch(w, 72)})}`).join("");
    document.head.appendChild(style);
  }

  function renderCrafts() {
    $("#craftGrid").innerHTML = C.categories.map((c, i) => {
      const n = C.products.filter(p => p.cat === c.id).length;
      const big = i < 2;
      return `
        <a class="craft${big ? " craft--big" : ""}" href="#shop" data-cat-link="${c.id}">
          <img src="${photo(c.cover, big ? 1000 : 640, big ? 640 : 640)}" alt="" loading="lazy">
          <span class="craft__body">
            <span class="craft__name">${esc(c.name)}</span>
            ${big ? `<span class="craft__blurb">${esc(c.blurb)}</span>` : ""}
            <span class="craft__meta">${n} designs ${icon("arrow")}</span>
          </span>
        </a>`;
    }).join("");
  }

  function renderWoods() {
    const order = ["teak", "sheesham", "walnut", "acacia", "mango", "neem", "maple", "bamboo"];
    $("#woodGrid").innerHTML = order.map(id => {
      const w = C.woods[id];
      return `
        <article class="wood-card">
          <div class="wood-card__swatch sw-${id}" data-wood="${id}"></div>
          <div class="wood-card__body">
            <h3>${esc(w.name)} <span>${esc(w.local)}</span></h3>
            <p>${esc(w.note)}</p>
            <dl class="facts">
              <div><dt>Hardness</dt><dd><span class="meter" style="--v:${w.hardness}" role="img" aria-label="${w.hardness} out of 5"></span></dd></div>
              <div><dt>Look</dt><dd>${esc(w.tone)}</dd></div>
              <div><dt>Best for</dt><dd>${esc(w.best)}</dd></div>
            </dl>
          </div>
        </article>`;
    }).join("");
    // Paint the large swatches one at a time as the section scrolls in.
    const queue = [];
    const pump = () => {
      const el = queue.shift();
      if (!el) return;
      el.style.backgroundImage = `url(${Wood.image(el.dataset.wood, 560, 300)})`;
      setTimeout(pump, 16);
    };
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      queue.push(e.target);
      if (queue.length === 1) setTimeout(pump, 0);
    }), { rootMargin: "300px" });
    $$("#woodGrid [data-wood]").forEach(el => io.observe(el));
  }

  /* ------------------------------------------------------------- catalogue */
  function renderToolbar() {
    $("#catChips").innerHTML = [{ id: "all", short: "All" }, ...C.categories]
      .map(c => `<button class="chip" type="button" data-cat="${c.id}" aria-pressed="${state.cat === c.id}">${esc(c.short)}</button>`)
      .join("");
    $("#occasionSelect").innerHTML = `<option value="all">Any occasion</option>` +
      C.occasions.map(o => `<option value="${o.id}">${esc(o.name)}</option>`).join("");
  }

  function setCat(id) {
    state.cat = id;
    $$("#catChips .chip").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.cat === id)));
    renderGrid();
  }

  function filtered() {
    const q = state.q.trim().toLowerCase();
    const list = C.products.filter(p => {
      if (state.cat !== "all" && p.cat !== state.cat) return false;
      if (state.occasion !== "all" && !p.occasions.includes(state.occasion)) return false;
      if (!q) return true;
      const hay = [p.name, p.desc, category(p.cat).name, ...p.woods.map(w => C.woods[w].name)].join(" ").toLowerCase();
      return q.split(/\s+/).every(word => hay.includes(word));
    });
    if (state.sort === "low") list.sort((a, b) => fromPrice(a) - fromPrice(b));
    if (state.sort === "high") list.sort((a, b) => fromPrice(b) - fromPrice(a));
    return list;
  }

  function card(p) {
    const woods = p.woods.map(w => C.woods[w].name).join(", ");
    const media = p.img
      ? `<img src="${photo(p.img, 520, 650)}" srcset="${photo(p.img, 400, 500)} 400w, ${photo(p.img, 640, 800)} 640w, ${photo(p.img, 900, 1125)} 900w" sizes="(min-width: 1180px) 280px, (min-width: 700px) 30vw, 46vw" alt="${esc(p.alt)}" loading="lazy">`
      : `<img data-render="${p.id}" alt="${esc(p.alt)} — 3D render" hidden><span class="card__skeleton" aria-hidden="true"></span>`;
    return `
      <article class="card">
        <a class="card__media${p.img ? "" : " card__media--render"}" href="#p/${p.id}" tabindex="-1" aria-hidden="true">
          ${media}
          ${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ""}
          ${p.model ? `<span class="tag3d">${icon("cube")}3D</span>` : ""}
        </a>
        <div class="card__body">
          <p class="card__cat">${esc(category(p.cat).short)}</p>
          <h3 class="card__title"><a href="#p/${p.id}">${esc(p.name)}</a></h3>
          <div class="card__meta">
            <p class="card__price"><span>From</span> ${fmt(fromPrice(p))}${p.minQty ? "<span> / piece</span>" : ""}</p>
            <span class="dots" title="${esc(woods)}"><span class="sr-only">Available in ${esc(woods)}</span>${p.woods.slice(0, 5).map(w => `<i class="sw-${w}"></i>`).join("")}</span>
          </div>
        </div>
        <div class="card__actions">
          <a class="btn btn--quiet btn--sm" href="#p/${p.id}">Customise</a>
          <a class="icon-btn icon-btn--wa" href="${waLink(askText(p))}" target="_blank" rel="noopener" aria-label="Ask about ${esc(p.name)} on WhatsApp">${icon("wa")}</a>
        </div>
      </article>`;
  }

  function renderGrid() {
    const list = filtered();
    const grid = $("#productGrid");
    $("#resultCount").textContent = `${list.length} ${list.length === 1 ? "design" : "designs"}`;
    if (!list.length) {
      grid.innerHTML = `
        <div class="empty">
          <p class="empty__title">Nothing matches${state.q ? ` “${esc(state.q)}”` : " these filters"}.</p>
          <p>Try another word or clear the filters — or ask us to make exactly what you have in mind.</p>
          <div class="empty__actions">
            <button class="btn btn--dark" type="button" data-clear>Clear filters</button>
            <a class="btn btn--quiet" href="#custom">Request a custom piece</a>
          </div>
        </div>`;
      return;
    }
    grid.innerHTML = list.map(card).join("");
    $$("img[data-render]", grid).forEach(img => renderObserver.observe(img));
  }

  function clearFilters() {
    state.q = "";
    state.occasion = "all";
    $("#searchInput").value = "";
    $("#occasionSelect").value = "all";
    setCat("all");
  }

  /* ---------------------------------------------------------------- layers */
  const layers = [];
  let pageFocus = null;
  const root = document.documentElement;
  // Everything behind an open dialog is made inert so keyboard and screen-reader users stay inside it.
  const setPageInert = on => ["#setupBanner", ".nav", "main", ".footer", "#waFab"].forEach(sel => {
    const el = $(sel);
    if (el) el.inert = on;
  });

  function showLayer(el) {
    if (!layers.length) {
      pageFocus = document.activeElement;
      root.style.setProperty("--sb", `${window.innerWidth - root.clientWidth}px`);
      setPageInert(true);
    }
    if (!layers.includes(el)) layers.push(el);
    root.classList.add("is-locked");
    el.hidden = false;
    void el.offsetWidth;
    el.dataset.state = "open";
    const target = el.querySelector("[data-autofocus]") || el.querySelector(".modal__close, .drawer__head [data-close]");
    if (target) target.focus({ preventScroll: true });
  }

  function hideLayer(el) {
    const i = layers.indexOf(el);
    if (i < 0) return;
    layers.splice(i, 1);
    el.dataset.state = "closed";
    const finish = () => {
      if (el.dataset.state !== "closed") return;
      el.hidden = true;
      if (!layers.length) {
        root.classList.remove("is-locked");
        setPageInert(false);
        if (pageFocus && document.contains(pageFocus)) pageFocus.focus({ preventScroll: true });
      }
    };
    if (reduceMotion) finish();
    else setTimeout(finish, 220);
  }

  document.addEventListener("keydown", e => {
    const top = layers[layers.length - 1];
    if (!top) return;
    if (e.key === "Escape") {
      e.preventDefault();
      if (top === modal) closeProduct();
      else hideLayer(drawer);
      return;
    }
    if (e.key !== "Tab") return;
    const items = $$('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])', top)
      .filter(x => x.offsetParent !== null && !x.closest("[hidden]"));
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  /* ----------------------------------------------------------- personaliser */
  const modal = $("#productModal");
  let current = null;
  let viewer = null;
  let stageFailed = false;
  let pendingPreset = null;
  let openedByNav = false;

  function openProduct(id, preset) {
    const p = byId[id];
    if (!p) return;
    const cfg = defaults(p);
    if (preset) Object.assign(cfg, preset, { opts: { ...cfg.opts, ...(preset.opts || {}) } });
    if (current && current.cfg.photo && current.cfg.photo !== cfg.photo) URL.revokeObjectURL(current.cfg.photo);
    current = { p, cfg };
    renderModal();
    showLayer(modal);
    $("#pmBody").scrollTop = 0;
    update3D();
  }

  function openWithPreset(id, preset) {
    pendingPreset = preset;
    if (location.hash === `#p/${id}`) route(true);
    else location.hash = `p/${id}`;
  }

  function closeProduct() {
    if (modal.hidden) return;
    state.editKey = null;
    if (viewer) viewer.pause(true);
    if (/^#p\//.test(location.hash)) {
      if (openedByNav) history.back();
      else {
        history.replaceState(null, "", pageUrl());
        hideLayer(modal);
      }
    } else {
      hideLayer(modal);
    }
  }

  function route(fromNav) {
    const m = location.hash.match(/^#p\/([\w-]+)$/);
    if (m && byId[m[1]]) {
      const preset = pendingPreset;
      pendingPreset = null;
      if (modal.hidden || !current || current.p.id !== m[1] || preset) {
        openedByNav = !!fromNav;
        openProduct(m[1], preset);
      }
      return;
    }
    if (!modal.hidden) hideLayer(modal);
  }

  function choiceGroup(name, legend, choices, selected, compact) {
    return `
      <fieldset class="field">
        <legend class="field__label">${esc(legend)}</legend>
        <div class="${compact ? "keys" : "choices"}">${choices.map(ch => `
          <label class="choice${compact ? " choice--key" : ""}">
            <input type="radio" name="${name}" value="${esc(ch.id)}"${ch.id === selected ? " checked" : ""}>
            <span class="choice__box">
              <span class="choice__label">${esc(ch.label)}</span>
              ${ch.sub ? `<span class="choice__sub">${esc(ch.sub)}</span>` : ""}
              ${ch.add ? `<span class="choice__add">${ch.add > 0 ? "+" : "−"}${fmt(Math.abs(ch.add))}</span>` : ""}
            </span>
          </label>`).join("")}
        </div>
      </fieldset>`;
  }

  function renderModal() {
    const { p, cfg } = current;
    const wood = C.woods[cfg.wood];
    const min = p.minQty || 1;
    const html = [`
      <div class="pm__head">
        <p class="eyebrow">${esc(category(p.cat).name)}</p>
        <h2 id="pmTitle">${esc(p.name)}</h2>
        <p class="pm__desc">${esc(p.desc)}</p>
      </div>
      <form class="pm__form" id="pmForm" novalidate>`];

    if (p.woods.length > 1) {
      html.push(`
        <fieldset class="field">
          <legend class="field__label">Wood <span class="field__value" data-legend="wood">${esc(wood.name)}</span></legend>
          <div class="woods-pick">${p.woods.map(w => `
            <label class="wood-opt">
              <input type="radio" name="wood" value="${w}"${w === cfg.wood ? " checked" : ""}>
              <span class="wood-opt__sw sw-${w}"></span>
              <span class="wood-opt__name">${esc(C.woods[w].name)}</span>
            </label>`).join("")}
          </div>
          <p class="field__hint" data-hint="wood">${esc(wood.note)}</p>
        </fieldset>`);
    } else {
      html.push(`<p class="field__static"><span class="field__label">Material</span>${esc(wood.name)} — ${esc(wood.local)}. ${esc(wood.note)}</p>`);
    }

    if (p.sizes && p.sizes.length > 1) {
      html.push(choiceGroup("size", "Size", p.sizes.map(s => ({ id: s.id, label: s.label, sub: s.dims, add: s.add })), cfg.size));
    }
    (p.options || []).forEach(o => html.push(choiceGroup(`opt-${o.id}`, o.label, o.choices, cfg.opts[o.id], o.choices.length > 6)));

    if (p.photo) {
      html.push(`
        <div class="field">
          <span class="field__label">Try your photo</span>
          <label class="upload">
            <input type="file" accept="image/*" id="pmUpload">
            <span class="upload__btn">Preview with your photo</span>
            <span class="upload__note" id="pmUploadNote">Only shown in the preview — it never leaves your device.</span>
          </label>
        </div>`);
    }

    html.push(`
        <div class="field field--row">
          <div class="qty" role="group" aria-label="Quantity">
            <button type="button" class="qty__btn" data-step="-1" aria-label="Decrease quantity">${icon("minus")}</button>
            <input class="qty__input" name="qty" type="number" inputmode="numeric" min="${min}" max="999" value="${cfg.qty}" aria-label="Quantity">
            <button type="button" class="qty__btn" data-step="1" aria-label="Increase quantity">${icon("plus")}</button>
          </div>
          <label class="check">
            <input type="checkbox" name="gift"${cfg.gift ? " checked" : ""}>
            <span class="check__box">${icon("check")}</span>
            <span>Gift wrap &amp; note card <span class="muted">+${fmt(S.giftWrap)}</span></span>
          </label>
        </div>
        ${min > 1 ? `<p class="field__hint">Minimum ${min} pieces. Tiered bulk pricing is confirmed on WhatsApp.</p>` : ""}
        <label class="input">
          <span class="input__label">Changes or special requests <span class="opt">(optional)</span></span>
          <textarea name="note" rows="3" maxlength="400" placeholder="A different size (e.g. 20 × 12 in), another wood, darker polish, a delivery deadline…">${esc(cfg.note)}</textarea>
          <span class="field__hint">Custom sizes and designs are quoted on WhatsApp. You can send reference photos in the chat.</span>
        </label>
      </form>
      <details class="pm__details">
        <summary>Details &amp; care</summary>
        <ul>${p.details.map(d => `<li>${esc(d)}</li>`).join("")}</ul>
        <p>Made to order — ships in ${esc(p.lead)} after we confirm the details with you.</p>
      </details>
      <div class="pm__links">
        <button class="link-btn" type="button" id="pmShare">${icon("share")}Share this design</button>
        <a class="link-btn" href="${waLink(askText(p))}" target="_blank" rel="noopener">${icon("wa")}Ask a question</a>
      </div>`);

    $("#pmBody").innerHTML = html.join("");
    $("#pmAdd").textContent = state.editKey ? "Update order" : "Add to order";
    setupStage();
    updatePrice();
  }

  function setupStage() {
    const { p } = current;
    const stage = $("#pmStage");
    const img = $("#pmPhoto");
    const has3d = !!p.model && Viewer3D.supported && !stageFailed;
    stage.classList.remove("is-ready");
    img.alt = p.alt;
    img.src = p.img ? photo(p.img, 1100, 1100) : has3d ? "" : woodFallback(p);
    $("#pmViews").hidden = !(has3d && p.img);
    $("#pmReset").hidden = !has3d;
    $("#pmNote").textContent = has3d
      ? "Drag to turn it. The preview is indicative — real grain varies from piece to piece."
      : "Every piece is made by hand, so grain and details vary from the photo.";
    setView(has3d ? "3d" : "photo");
  }

  function setView(view) {
    $("#pmStage").dataset.view = view;
    $("#pmPhoto").hidden = view !== "photo";
    $$("#pmViews [data-view]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.view === view)));
    if (viewer) viewer.pause(view !== "3d");
  }

  function fail3D() {
    stageFailed = true;
    if (current) setupStage();
  }

  let frame3d = 0;
  function update3D() {
    if (!current || !current.p.model || stageFailed || !Viewer3D.supported || frame3d) return;
    frame3d = requestAnimationFrame(() => {
      frame3d = 0;
      if (!viewer) {
        viewer = Viewer3D.create($("#pmStage"), { touch: "pan-y" });
        viewer.initPromise.catch(fail3D);
      }
      viewer.pause(false);
      const stage = $("#pmStage");
      viewer.show(current.p, current.cfg).then(() => stage.classList.add("is-ready")).catch(fail3D);
    });
  }

  function readForm() {
    const { p, cfg } = current;
    const d = new FormData($("#pmForm"));
    if (d.get("wood")) cfg.wood = d.get("wood");
    if (d.get("size")) cfg.size = d.get("size");
    (p.options || []).forEach(o => {
      const v = d.get(`opt-${o.id}`);
      if (v) cfg.opts[o.id] = v;
    });
    const min = p.minQty || 1;
    const q = parseInt(d.get("qty"), 10);
    cfg.qty = Math.min(999, Math.max(min, isNaN(q) ? min : q));
    cfg.gift = d.get("gift") === "on";
    cfg.note = String(d.get("note") || "").trim();
  }

  function syncForm() {
    const { cfg } = current;
    const legend = $('[data-legend="wood"]');
    if (legend) legend.textContent = C.woods[cfg.wood].name;
    const hint = $('[data-hint="wood"]');
    if (hint) hint.textContent = C.woods[cfg.wood].note;
  }

  function updatePrice() {
    const { p, cfg } = current;
    const each = eachPrice(p, cfg);
    $("#pmPrice").textContent = fmt(each * cfg.qty);
    $("#pmPriceNote").textContent = cfg.qty > 1 ? `${fmt(each)} each · made to order` : `Made to order · ships in ${p.lead}`;
  }

  function onFormChange(e) {
    if (!current) return;
    const t = e.target;
    if (t.id === "pmUpload") {
      const file = t.files && t.files[0];
      if (!file) return;
      if (current.cfg.photo) URL.revokeObjectURL(current.cfg.photo);
      current.cfg.photo = URL.createObjectURL(file);
      $("#pmUploadNote").textContent = `Showing ${file.name} in the preview.`;
      update3D();
      return;
    }
    readForm();
    syncForm();
    updatePrice();
    update3D();
  }

  function itemFrom(p, cfg) {
    const copy = JSON.parse(JSON.stringify({ ...cfg, photo: null }));
    return { key: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), pid: p.id, cfg: copy, qty: cfg.qty };
  }

  const signature = it => JSON.stringify([it.pid, { ...it.cfg, qty: 0 }]);

  function addToOrder() {
    readForm();
    const item = itemFrom(current.p, current.cfg);
    let key = item.key;
    if (state.editKey) {
      const i = state.cart.findIndex(it => it.key === state.editKey);
      if (i >= 0) {
        item.key = key = state.editKey;
        state.cart[i] = item;
      } else state.cart.push(item);
    } else {
      const same = state.cart.find(it => signature(it) === signature(item));
      if (same) {
        same.qty = Math.min(999, same.qty + item.qty);
        key = same.key;
      } else state.cart.push(item);
    }
    saveCart();
    closeProduct();
    openDrawer("cart", { highlight: key });
  }

  function buyNow() {
    readForm();
    const item = itemFrom(current.p, current.cfg);
    closeProduct();
    openDrawer("details", { items: [item] });
  }

  async function shareProduct() {
    const p = current.p;
    const url = productUrl(p);
    if (navigator.share) {
      try {
        await navigator.share({ title: p.name, text: `${p.name} — ${S.name}`, url });
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }
    copyText(url).then(() => toast("Link copied — paste it anywhere to share"));
  }

  /* ---------------------------------------------------------------- drawer */
  const drawer = $("#orderDrawer");
  const drawerBody = $("#drawerBody");
  const drawerFoot = $("#drawerFoot");

  function openDrawer(step = "cart", opts = {}) {
    if (opts.items) state.checkout = { items: opts.items, fromCart: false };
    else if (step !== "done") state.checkout = { items: state.cart, fromCart: true };
    renderDrawer(step, opts);
    if (drawer.hidden || drawer.dataset.state === "closed") showLayer(drawer);
  }

  function renderDrawer(step, opts = {}) {
    drawer.dataset.step = step;
    $("#drawerBack").hidden = !(step === "details" && state.checkout && state.checkout.fromCart);
    if (step === "cart") renderCartStep(opts);
    if (step === "details") renderDetailsStep();
    if (step === "done") renderDoneStep();
    drawerBody.scrollTop = 0;
  }

  function lineHTML(it, isNew) {
    const p = byId[it.pid];
    const sp = specs(p, it.cfg).filter(([k]) => k !== "Changes / requests").map(([, v]) => esc(v)).join(" · ");
    const note = it.cfg.note ? `<p class="line__note">“${esc(it.cfg.note)}”</p>` : "";
    const min = p.minQty || 1;
    return `
      <li class="line${isNew ? " is-new" : ""}" data-key="${it.key}">
        <div class="line__thumb">${thumb(p)}</div>
        <div class="line__info">
          <p class="line__name">${esc(p.name)}</p>
          <p class="line__specs">${sp}</p>
          ${note}
          <div class="line__row">
            <div class="qty qty--sm" role="group" aria-label="Quantity of ${esc(p.name)}">
              <button type="button" class="qty__btn" data-line-step="-1" aria-label="Decrease"${it.qty <= min ? " disabled" : ""}>${icon("minus")}</button>
              <span class="qty__val">${it.qty}</span>
              <button type="button" class="qty__btn" data-line-step="1" aria-label="Increase">${icon("plus")}</button>
            </div>
            <span class="line__price">${fmt(lineTotal(it))}</span>
          </div>
          <div class="line__links">
            <button type="button" class="link-btn" data-edit="${it.key}">Edit</button>
            <button type="button" class="link-btn" data-remove="${it.key}">Remove</button>
          </div>
        </div>
      </li>`;
  }

  function summary(items) {
    const t = totals(items);
    const gap = S.shipping.freeAbove - t.sub;
    return `
      ${t.sub && gap > 0 ? `<p class="ship-note">Add ${fmt(gap)} more for free shipping.</p>` : ""}
      <dl class="sum">
        <div><dt>Subtotal</dt><dd>${fmt(t.sub)}</dd></div>
        <div><dt>Shipping</dt><dd>${t.ship ? fmt(t.ship) : "Free"}</dd></div>
        <div class="sum__total"><dt>Estimated total</dt><dd>${fmt(t.total)}</dd></div>
      </dl>`;
  }

  function renderCartStep(opts) {
    $("#drawerTitle").textContent = "Your order";
    const items = state.cart;
    if (!items.length) {
      drawerBody.innerHTML = `
        <div class="empty empty--drawer">
          <span class="empty__mark">${icon("bag")}</span>
          <p class="empty__title">Your order is empty</p>
          <p>Customise a piece and it will wait here, ready to send to us on WhatsApp.</p>
          <a class="btn btn--dark" href="#shop" data-close>Browse the catalogue</a>
        </div>`;
      drawerFoot.hidden = true;
      return;
    }
    drawerBody.innerHTML = `<ul class="lines">${items.map(it => lineHTML(it, opts.highlight === it.key)).join("")}</ul>`;
    drawerFoot.hidden = false;
    drawerFoot.innerHTML = `
      ${summary(items)}
      <button class="btn btn--dark btn--block" type="button" data-go="details">Continue to delivery details ${icon("arrow")}</button>
      <p class="form-note">No payment on this website. We confirm everything with you on WhatsApp.</p>`;
    hydrateThumbs(drawerBody);
  }

  function field(name, label, type, value, o = {}) {
    const attrs = [
      `name="${name}"`,
      o.autocomplete ? `autocomplete="${o.autocomplete}"` : "",
      o.inputmode ? `inputmode="${o.inputmode}"` : "",
      o.required ? "required" : ""
    ].join(" ");
    const control = type === "textarea"
      ? `<textarea ${attrs} rows="2">${esc(value || "")}</textarea>`
      : `<input type="${type}" ${attrs} value="${esc(value || "")}">`;
    return `
      <label class="input">
        <span class="input__label">${esc(label)}${o.optional ? ' <span class="opt">(optional)</span>' : ""}</span>
        ${control}
        <span class="input__error" data-error="${name}"></span>
      </label>`;
  }

  function renderDetailsStep() {
    $("#drawerTitle").textContent = "Delivery details";
    const c = saved.get("customer", {});
    const items = state.checkout.items;
    const t = totals(items);
    drawerBody.innerHTML = `
      <form class="details" id="detailsForm" novalidate>
        <div class="details__summary">
          <p>${items.map(it => `${esc(byId[it.pid].name)} × ${it.qty}`).join("<br>")}</p>
          <p class="details__total">${fmt(t.total)}</p>
        </div>
        ${field("name", "Full name", "text", c.name, { autocomplete: "name", required: true })}
        ${field("phone", "Phone (WhatsApp)", "tel", c.phone, { autocomplete: "tel", inputmode: "tel", required: true })}
        ${field("email", "Email", "email", c.email, { autocomplete: "email", optional: true })}
        ${field("address", "House no., street, area, landmark", "textarea", c.address, { autocomplete: "street-address", required: true })}
        <div class="form-grid">
          ${field("city", "City", "text", c.city, { autocomplete: "address-level2", required: true })}
          ${field("pin", "PIN code", "text", c.pin, { autocomplete: "postal-code", inputmode: "numeric", required: true })}
        </div>
        ${field("state", "State", "text", c.state, { autocomplete: "address-level1", required: true })}
        <div class="form-grid">
          <label class="input">
            <span class="input__label">Payment preference</span>
            <span class="select select--block"><select name="payment">${S.payment.map(m => `<option${m === c.payment ? " selected" : ""}>${esc(m)}</option>`).join("")}</select></span>
          </label>
          ${field("date", "Needed by", "date", "", { optional: true })}
        </div>
        ${field("notes", "Anything else we should know?", "textarea", "", { optional: true })}
        <label class="check">
          <input type="checkbox" name="remember" checked>
          <span class="check__box">${icon("check")}</span>
          <span>Remember my details on this device</span>
        </label>
      </form>`;
    drawerFoot.hidden = false;
    drawerFoot.innerHTML = `
      <button class="btn btn--wa btn--block" type="submit" form="detailsForm">${icon("wa")} Send order on WhatsApp</button>
      <p class="form-note">WhatsApp opens with your order typed out — just press send.</p>
      <button class="link-btn link-btn--center" type="button" id="sendWithout">Rather share your address in the chat? Send without it</button>`;
    const first = $("#detailsForm input");
    if (first && !first.value) first.focus({ preventScroll: true });
  }

  function showErrors(form, errors) {
    $$("[data-error]", form).forEach(el => {
      const name = el.dataset.error;
      const control = form.elements[name];
      el.textContent = errors[name] || "";
      if (control) control.setAttribute("aria-invalid", errors[name] ? "true" : "false");
    });
    const firstBad = Object.keys(errors)[0];
    if (firstBad && form.elements[firstBad]) form.elements[firstBad].focus();
  }

  function validateDetails(form) {
    const d = Object.fromEntries(new FormData(form));
    Object.keys(d).forEach(k => (d[k] = typeof d[k] === "string" ? d[k].trim() : d[k]));
    const errors = {};
    if (!d.name) errors.name = "Please enter your name.";
    const digits = d.phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) errors.phone = "Enter a 10-digit mobile number.";
    if (d.email && !/^\S+@\S+\.\S+$/.test(d.email)) errors.email = "That email doesn't look right.";
    if (!d.address) errors.address = "We need an address to deliver to.";
    if (!d.city) errors.city = "Add your city.";
    if (S.currency === "INR" ? !/^\d{6}$/.test(d.pin) : !d.pin) errors.pin = S.currency === "INR" ? "PIN codes have 6 digits." : "Add your postal code.";
    if (!d.state) errors.state = "Add your state.";
    showErrors(form, errors);
    return Object.keys(errors).length ? null : d;
  }

  function sendOrder(customer) {
    const items = state.checkout.items;
    const order = { id: orderId(), items, customer, totals: totals(items) };
    const text = orderMessage(order);
    state.lastOrder = { id: order.id, text };
    saved.set("last-order", state.lastOrder);
    openWhatsApp(text);
    if (state.checkout.fromCart) {
      state.cart = [];
      saveCart();
    }
    renderDrawer("done");
  }

  function renderDoneStep() {
    $("#drawerTitle").textContent = "Order ready";
    const o = state.lastOrder;
    drawerBody.innerHTML = `
      <div class="done">
        <span class="done__mark">${icon("check")}</span>
        <p class="done__title">Your order is typed out in WhatsApp</p>
        <p>Order <strong>${esc(o.id)}</strong>. Press <em>send</em> in WhatsApp and we'll reply to confirm the details, delivery date and payment.</p>
        <div class="done__actions">
          <a class="btn btn--wa btn--block" href="${waLink(o.text)}" target="_blank" rel="noopener">${icon("wa")} Open WhatsApp again</a>
          <button class="btn btn--quiet btn--block" type="button" id="copyOrder">${icon("copy")} Copy order text</button>
        </div>
      </div>`;
    drawerFoot.hidden = false;
    drawerFoot.innerHTML = `<button class="btn btn--dark btn--block" type="button" data-close>Done</button>`;
  }

  drawer.addEventListener("click", e => {
    if (e.target.closest("[data-close]")) {
      hideLayer(drawer);
      return;
    }
    const t = e.target.closest("button, a");
    if (!t) return;
    if (t.id === "drawerBack") return renderDrawer("cart");
    if (t.matches("[data-go='details']")) return renderDrawer("details");
    if (t.id === "copyOrder") return copyText(state.lastOrder.text).then(() => toast("Order copied"));
    if (t.id === "sendWithout") {
      const form = $("#detailsForm");
      const name = form.elements.name.value.trim();
      const phone = form.elements.phone.value.trim();
      if (name || phone) saved.set("customer", { ...saved.get("customer", {}), name, phone });
      sendOrder(name || phone ? { name, phone, partial: true } : null);
      return;
    }
    const li = t.closest(".line");
    if (!li) return;
    const it = state.cart.find(x => x.key === li.dataset.key);
    if (!it) return;
    if (t.matches("[data-line-step]")) {
      const min = byId[it.pid].minQty || 1;
      it.qty = Math.min(999, Math.max(min, it.qty + Number(t.dataset.lineStep)));
      saveCart();
      renderCartStep({});
    } else if (t.matches("[data-remove]")) {
      state.cart = state.cart.filter(x => x !== it);
      saveCart();
      renderCartStep({});
      toast("Removed from your order");
    } else if (t.matches("[data-edit]")) {
      state.editKey = it.key;
      hideLayer(drawer);
      openWithPreset(it.pid, { ...it.cfg, qty: it.qty, photo: null });
    }
  });

  drawer.addEventListener("submit", e => {
    if (e.target.id !== "detailsForm") return;
    e.preventDefault();
    const d = validateDetails(e.target);
    if (!d) return;
    const customer = { name: d.name, phone: d.phone, email: d.email, address: d.address, city: d.city, state: d.state, pin: d.pin, payment: d.payment, date: d.date, notes: d.notes };
    if (d.remember) {
      const { name, phone, email, address, city, state: st, pin, payment } = customer;
      saved.set("customer", { name, phone, email, address, city, state: st, pin, payment });
    }
    sendOrder(customer);
  });

  /* ----------------------------------------------------------------- hero */
  // The hero is a small configurator: pick a piece, a wood and one key option, and the 3D model follows.
  const HERO_PIECES = [
    { id: "chopping-board", label: "Chopping board", control: { kind: "size", label: "Size" } },
    { id: "concert-bansuri", label: "Bansuri", control: { kind: "opt", opt: "key", label: "Scale", only: ["C", "D", "E", "G", "A"] } },
    { id: "masala-dabba", label: "Masala dabba", control: { kind: "opt", opt: "cups", label: "Katoris" } }
  ];

  function initHero() {
    const configs = Object.fromEntries(HERO_PIECES.map(h => [h.id, defaults(byId[h.id])]));
    let piece = HERO_PIECES[0];

    $("#heroPieces").innerHTML = HERO_PIECES.map(h => `
      <label class="chip-pick"><input type="radio" name="heroPiece" value="${h.id}"${h === piece ? " checked" : ""}><span>${esc(h.label)}</span></label>`).join("");

    function renderControls() {
      const p = byId[piece.id];
      const cfg = configs[piece.id];
      const ctl = piece.control;
      $("#heroWoods").innerHTML = p.woods.map(w => `
        <label class="sw-pick" title="${esc(C.woods[w].name)}">
          <input type="radio" name="heroWood" value="${w}"${w === cfg.wood ? " checked" : ""}>
          <span class="sw-pick__dot sw-${w}"></span>
          <span class="sr-only">${esc(C.woods[w].name)}</span>
        </label>`).join("");
      const choices = ctl.kind === "size"
        ? p.sizes.map(s => ({ id: s.id, label: s.label, on: s.id === cfg.size }))
        : p.options.find(o => o.id === ctl.opt).choices
            .filter(ch => !ctl.only || ctl.only.includes(ch.id))
            .map(ch => ({ id: ch.id, label: ch.label, on: ch.id === cfg.opts[ctl.opt] }));
      $("#heroOptLabel").textContent = ctl.label;
      $("#heroOpts").innerHTML = choices.map(ch => `
        <label class="chip-pick"><input type="radio" name="heroOpt" value="${esc(ch.id)}"${ch.on ? " checked" : ""}><span>${esc(ch.label)}</span></label>`).join("");
      updateNote();
    }

    function updateNote() {
      const p = byId[piece.id];
      const cfg = configs[piece.id];
      $("#heroNote").innerHTML = `${esc(p.name)} in ${esc(C.woods[cfg.wood].name)} · <strong>${fmt(unitPrice(p, cfg))}</strong>`;
    }

    const stage = $("#heroStage");
    let hv = null;
    const draw = () => {
      if (!hv) return;
      hv.show(byId[piece.id], configs[piece.id]).then(() => stage.classList.add("is-ready")).catch(() => stage.classList.add("is-fallback"));
    };
    $("#heroForm").addEventListener("change", e => {
      const t = e.target;
      const cfg = configs[piece.id];
      if (t.name === "heroPiece") {
        piece = HERO_PIECES.find(h => h.id === t.value);
        renderControls();
      } else if (t.name === "heroWood") {
        cfg.wood = t.value;
      } else if (t.name === "heroOpt") {
        if (piece.control.kind === "size") cfg.size = t.value;
        else cfg.opts[piece.control.opt] = t.value;
      }
      updateNote();
      draw();
    });
    $("#heroForm").addEventListener("submit", e => e.preventDefault());
    $("#heroCustomise").addEventListener("click", () => {
      state.editKey = null;
      const cfg = configs[piece.id];
      openWithPreset(piece.id, { wood: cfg.wood, size: cfg.size, opts: { ...cfg.opts } });
    });
    renderControls();

    if (!Viewer3D.supported) {
      stage.classList.add("is-fallback");
      return;
    }
    requestAnimationFrame(() => setTimeout(() => {
      hv = Viewer3D.create(stage, { touch: "pan-y", shadow: 0.5, fit: 0.84 });
      hv.initPromise.catch(() => stage.classList.add("is-fallback"));
      draw();
    }, 30));
  }

  function paintHeroWood() {
    const url = Wood.image("walnut", 1200, 700, 4);
    $("#hero").style.setProperty("--wood", `url(${url})`);
    $("#hero").classList.add("has-wood");
  }

  function initBand() {
    let key = "G";
    $("#bandKeys").innerHTML = ["C", "D", "E", "F", "G", "A"].map(k => `
      <label class="key-pick"><input type="radio" name="bandKey" value="${k}"${k === key ? " checked" : ""}><span>${k}</span></label>`).join("");
    $("#bandKeys").addEventListener("change", e => (key = e.target.value));
    $("#bandBuild").addEventListener("click", () => {
      state.editKey = null;
      openWithPreset("concert-bansuri", { opts: { key } });
    });
  }

  function initCustomForm() {
    $("#customCategory").innerHTML = C.categories.map(c => `<option>${esc(c.name)}</option>`).join("") + "<option>Something else</option>";
    $("#customWood").innerHTML = "<option>Help me choose</option>" + Object.values(C.woods).map(w => `<option>${esc(w.name)}</option>`).join("");
    $("#customForm").addEventListener("submit", e => {
      e.preventDefault();
      const form = e.target;
      const d = Object.fromEntries(new FormData(form));
      const errors = {};
      if (!d.name.trim()) errors.name = "Please tell us your name.";
      if (d.idea.trim().length < 8) errors.idea = "A sentence or two about the piece helps us quote.";
      showErrors(form, errors);
      if (Object.keys(errors).length) return;
      const L = [`*Custom design request — ${S.name}*`, "", `Name: ${d.name.trim()}`];
      if (d.phone.trim()) L.push(`Phone: ${d.phone.trim()}`);
      L.push(`For: ${d.type}`, `Category: ${d.category}`, `Wood: ${d.wood}`, `Quantity: ${d.qty || 1}`, `Budget per piece: ${d.budget}`);
      if (d.date) L.push(`Needed by: ${formatDate(d.date)}`);
      L.push("", "*What I'd like made*", d.idea.trim(), "", "I'll share reference photos here.");
      openWhatsApp(L.join("\n"));
      toast("Opening WhatsApp with your request…");
    });
  }

  /* ----------------------------------------------------------------- events */
  function bind() {
    document.addEventListener("click", e => {
      const link = e.target.closest("[data-cat-link]");
      if (link) {
        setCat(link.dataset.catLink);
        if (link.closest("#orderDrawer")) hideLayer(drawer);
      }
      const chip = e.target.closest("#catChips [data-cat]");
      if (chip) setCat(chip.dataset.cat);
      if (e.target.closest("[data-clear]")) clearFilters();
      const navLink = e.target.closest(".nav__links a");
      if (navLink) toggleMenu(false);
    });

    let searchTimer = 0;
    $("#searchInput").addEventListener("input", e => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.q = e.target.value;
        renderGrid();
      }, 120);
    });
    $("#occasionSelect").addEventListener("change", e => {
      state.occasion = e.target.value;
      renderGrid();
    });
    $("#sortSelect").addEventListener("change", e => {
      state.sort = e.target.value;
      renderGrid();
    });

    $("#bagButton").addEventListener("click", () => openDrawer("cart"));
    $("#menuButton").addEventListener("click", () => toggleMenu());

    modal.addEventListener("click", e => {
      const t = e.target.closest("button, [data-close]");
      if (!t) return;
      if (t.matches("[data-close]")) return closeProduct();
      if (t.id === "pmAdd") return addToOrder();
      if (t.id === "pmBuy") return buyNow();
      if (t.id === "pmReset" && viewer) return viewer.reset();
      if (t.id === "pmShare") return shareProduct();
      if (t.dataset.view) return setView(t.dataset.view);
      if (t.dataset.step) {
        const input = $("#pmForm .qty__input");
        const min = current.p.minQty || 1;
        input.value = Math.min(999, Math.max(min, (parseInt(input.value, 10) || min) + Number(t.dataset.step)));
        onFormChange({ target: input });
      }
    });
    $("#pmBody").addEventListener("input", onFormChange);
    $("#pmBody").addEventListener("change", onFormChange);

    window.addEventListener("hashchange", () => route(true));

    const nav = $(".nav");
    const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function toggleMenu(force) {
    const btn = $("#menuButton");
    const open = force ?? btn.getAttribute("aria-expanded") !== "true";
    btn.setAttribute("aria-expanded", String(open));
    $(".nav").classList.toggle("is-open", open);
  }

  /* ------------------------------------------------------------------ boot */
  applyStore();
  renderCrafts();
  renderToolbar();
  renderGrid();
  renderWoods();
  initHero();
  initBand();
  initCustomForm();
  bind();
  saveCart();
  route(false);
  setTimeout(paintHeroWood, 60);
})();
