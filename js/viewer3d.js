/*
 * 3D product previews.
 * three.js is loaded from a CDN the first time a preview is needed. Every product has a
 * procedural model (see MODELS) that is rebuilt whenever the wood, size or an option changes.
 */
window.Viewer3D = (() => {
  const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
  let T = null;
  let loading = null;
  const ready = () => (loading ||= import(THREE_URL).then(m => (T = m)));

  const webgl = (() => {
    try {
      const c = document.createElement("canvas");
      return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch (e) {
      return false;
    }
  })();
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const BUMP = 2.2;

  /* ------------------------------------------------------------------ fonts */
  // Only the clock dial and the mandir medallion draw lettering.
  const FONTS = {
    classic: { css: "'Cinzel', serif", weight: 600 },
    serif: { css: "'Fraunces', serif", weight: 600 },
    hindi: { css: "'Tiro Devanagari Hindi', serif", weight: 400, sample: "ॐ" }
  };
  let fontsLoading = null;
  const fontsReady = () => (fontsLoading ||= document.fonts
    ? Promise.all(Object.values(FONTS).map(f => document.fonts.load(`${f.weight} 64px ${f.css}`, f.sample || "XII 12"))).catch(() => {})
    : Promise.resolve());
  const setFont = (c, f, px) => (c.font = `${f.weight} ${px}px ${f.css}`);

  /* --------------------------------------------------------- surface marks */
  // Paints a mark on the colour map and presses it into the bump map.
  // "paint" = dark painted marker, "inlay" = flush contrasting wood, "groove" = routed channel.
  function mark(surf, mode, draw) {
    const { ctx, bctx } = surf;
    ctx.save();
    if (mode === "inlay") ctx.fillStyle = ctx.strokeStyle = "rgba(48,28,14,0.78)";
    else if (mode === "groove") {
      ctx.fillStyle = ctx.strokeStyle = "rgba(58,32,14,0.34)";
      ctx.shadowColor = "rgba(40,20,8,0.35)";
      ctx.shadowBlur = 6;
    } else ctx.fillStyle = ctx.strokeStyle = "rgba(34,22,14,0.9)";
    draw(ctx);
    ctx.restore();
    // Paint and inlays sit flush with the surface; only a routed groove changes the height map.
    if (mode !== "groove") return;
    bctx.save();
    bctx.fillStyle = bctx.strokeStyle = "#3a3a3a";
    bctx.shadowColor = "rgba(0,0,0,0.8)";
    bctx.shadowBlur = 8;
    draw(bctx);
    bctx.restore();
  }

  function roundRectPath(c, x, y, w, h, r) {
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  /* --------------------------------------------------------------- surfaces */
  function blank(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  function makeSurface(env, sp, w, h, o = {}) {
    w = Math.round(w);
    h = Math.round(h);
    const along = o.along || "x";
    const seed = o.seed || 1;
    const color = blank(w, h);
    const height = blank(w, h);
    const ctx = color.getContext("2d");
    const bctx = height.getContext("2d");
    ctx.drawImage(Wood.canvas(sp, w, h, along, seed), 0, 0);
    bctx.drawImage(Wood.bump(sp, w, h, along, seed), 0, 0);
    const map = new T.CanvasTexture(color);
    map.colorSpace = T.SRGBColorSpace;
    map.anisotropy = env.aniso;
    const bump = new T.CanvasTexture(height);
    if (o.wrap) map.wrapS = bump.wrapS = T.RepeatWrapping;
    return { w, h, ctx, bctx, map, bump };
  }

  /* -------------------------------------------------------------- materials */
  function makeEnv(renderer) {
    const cache = new Map();
    const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const keep = (key, make) => {
      if (!cache.has(key)) {
        const m = make();
        m.userData.shared = true;
        cache.set(key, m);
      }
      return cache.get(key);
    };
    const METALS = {
      brass: [0xc9a256, 0.3],
      gold: [0xd8b25c, 0.24],
      chrome: [0xdcdde0, 0.16],
      steel: [0xbfc2c6, 0.3],
      black: [0x262422, 0.38]
    };
    return {
      aniso,
      wood(sp, rep = 0.45, along = "x", side = T.FrontSide) {
        return keep(`wood|${sp}|${rep}|${along}|${side}`, () => {
          const tex = new T.CanvasTexture(Wood.canvas(sp, 512, 512, along, 5));
          tex.colorSpace = T.SRGBColorSpace;
          tex.wrapS = tex.wrapT = T.RepeatWrapping;
          tex.repeat.set(rep, rep);
          tex.anisotropy = aniso;
          return new T.MeshStandardMaterial({ map: tex, roughness: Wood.roughness(sp), envMapIntensity: 0.8, side });
        });
      },
      paint(color, rough = 0.5) {
        return keep(`paint|${color}|${rough}`, () => new T.MeshStandardMaterial({ color, roughness: rough, envMapIntensity: 0.6 }));
      },
      metal(kind) {
        const [color, rough] = METALS[kind] || METALS.steel;
        return keep(`metal|${kind}`, () => new T.MeshStandardMaterial({ color, metalness: 1, roughness: rough }));
      },
      glow(color) {
        return keep(`glow|${color}`, () => new T.MeshBasicMaterial({ color }));
      },
      get dark() {
        return keep("dark", () => new T.MeshStandardMaterial({ color: 0x120a05, roughness: 0.95 }));
      },
      surface(surf, sp, o = {}) {
        return new T.MeshStandardMaterial({
          map: surf.map,
          bumpMap: surf.bump,
          bumpScale: o.bump ?? BUMP,
          roughness: o.rough ?? Wood.roughness(sp || "teak") + 0.03,
          envMapIntensity: 0.8,
          side: o.side || T.FrontSide
        });
      },
      dispose() {
        cache.forEach(m => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
        cache.clear();
      }
    };
  }

  function studioEnv(renderer) {
    const pm = new T.PMREMGenerator(renderer);
    const scene = new T.Scene();
    const room = new T.Mesh(new T.BoxGeometry(12, 8, 12), new T.MeshBasicMaterial({ color: 0x3a2c22, side: T.BackSide }));
    room.position.y = 2;
    scene.add(room);
    const panel = (w, h, pos, rot, k, color = 0xfff1e0) => {
      const m = new T.Mesh(
        new T.PlaneGeometry(w, h),
        new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(k), side: T.DoubleSide })
      );
      m.position.set(...pos);
      m.rotation.set(...rot);
      scene.add(m);
    };
    panel(6, 4, [0, 5.8, 0], [Math.PI / 2, 0, 0], 4.2);
    panel(3, 5, [-5.8, 2.5, 1], [0, Math.PI / 2, 0], 2.4, 0xffe6c8);
    panel(3, 4, [5.8, 2, -1], [0, -Math.PI / 2, 0], 1.6);
    panel(5, 2, [0, 2, -5.8], [0, 0, 0], 1.0, 0xffdcb8);
    const tex = pm.fromScene(scene, 0.035).texture;
    pm.dispose();
    scene.traverse(o => {
      if (o.isMesh) {
        o.geometry.dispose();
        o.material.dispose();
      }
    });
    return tex;
  }

  /* ----------------------------------------------------------------- shapes */
  function rrect(w, h, r, cx = 0, cy = 0, asPath = false) {
    const s = asPath ? new T.Path() : new T.Shape();
    r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3);
    const x = cx - w / 2, y = cy - h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }

  function circle(r, cx = 0, cy = 0, asPath = false) {
    const s = asPath ? new T.Path() : new T.Shape();
    s.absarc(cx, cy, r, 0, Math.PI * 2, asPath);
    return s;
  }

  function polyShape(pts) {
    const clean = [];
    for (const p of pts) {
      const q = clean[clean.length - 1];
      if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-4) clean.push(p);
    }
    const a = clean[0], b = clean[clean.length - 1];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-4) clean.pop();
    const s = new T.Shape();
    s.moveTo(clean[0][0], clean[0][1]);
    for (let i = 1; i < clean.length; i++) s.lineTo(clean[i][0], clean[i][1]);
    return s;
  }

  // Symmetric outline from a half-width function of y (spatulas and spoons).
  function symShape(halfW, y0, y1, n = 80) {
    const right = [], left = [];
    for (let i = 0; i <= n; i++) {
      const y = y0 + ((y1 - y0) * i) / n;
      const w = Math.max(0, halfW(y));
      right.push([w, y]);
      left.push([-w, y]);
    }
    return polyShape([...right, ...left.reverse()]);
  }

  const smooth01 = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const circ = (y, cy, r) => Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
  const hash = i => {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  /* ----------------------------------------------------------- mesh helpers */
  // Extrudes a shape and splits it into back (0), edges (1) and front (2) material slots,
  // with the front face UV-mapped 0..1 across its bounding box so it can carry its own canvas.
  function extrude(shape, depth, bevel, mats, curveSegments = 24) {
    const g = new T.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: bevel > 0 ? 3 : 0,
      curveSegments,
      steps: 1
    });
    const lid = g.groups[0];
    const side = g.groups[1];
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = lid.start; i < lid.start + lid.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const W = maxX - minX || 1, H = maxY - minY || 1;
    for (let i = lid.start; i < lid.start + lid.count; i++) uv.setXY(i, (pos.getX(i) - minX) / W, (pos.getY(i) - minY) / H);
    uv.needsUpdate = true;
    const half = lid.count / 2;
    g.clearGroups();
    g.addGroup(lid.start, half, 0);
    g.addGroup(side.start, side.count, 1);
    g.addGroup(lid.start + half, half, 2);
    const mesh = new T.Mesh(g, [mats.back || mats.side, mats.side, mats.front || mats.side]);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData = { bbox: { minX, maxX, minY, maxY, W, H }, bevel, depth };
    return mesh;
  }

  // Lies an extrusion flat (front face up, shape +y pointing away from the viewer).
  function flat(mesh, y0 = 0) {
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = (mesh.userData.bevel || 0) + y0;
    const g = new T.Group();
    g.add(mesh);
    return g;
  }

  // Stands an extrusion upright with its front face toward the viewer.
  function stand(mesh, z0 = 0) {
    mesh.position.z = (mesh.userData.bevel || 0) + z0;
    const g = new T.Group();
    g.add(mesh);
    return g;
  }

  function thickness(mesh) {
    return mesh.userData.depth + mesh.userData.bevel * 2;
  }

  // Lathe with phiStart = π so u = 0.5 faces the viewer, and arc-length v so textures aren't stretched.
  function lathe(pts, mat, seg = 96) {
    const g = new T.LatheGeometry(pts.map(p => new T.Vector2(p[0], p[1])), seg, Math.PI, Math.PI * 2);
    const n = pts.length;
    const acc = [0];
    for (let j = 1; j < n; j++) acc.push(acc[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
    const total = acc[n - 1] || 1;
    const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setY(k, acc[k % n] / total);
    uv.needsUpdate = true;
    const mesh = new T.Mesh(g, mat);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.arc = { acc, total };
    return mesh;
  }

  function box(w, h, d, mat) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.castShadow = m.receiveShadow = true;
    return m;
  }

  function cyl(r, h, mat, seg = 24, open = false) {
    const m = new T.Mesh(new T.CylinderGeometry(r, r, h, seg, 1, open), mat);
    m.castShadow = m.receiveShadow = true;
    return m;
  }

  function group(...items) {
    const g = new T.Group();
    items.forEach(i => g.add(i));
    return g;
  }

  // Canvas mapping for an extrusion's front face.
  function capMap(mesh, max = 1024) {
    const b = mesh.userData.bbox;
    const [cw, ch] = b.W >= b.H
      ? [max, Math.max(64, Math.round((max * b.H) / b.W))]
      : [Math.max(64, Math.round((max * b.W) / b.H)), max];
    return {
      cw, ch,
      sx: cw / b.W,
      sy: ch / b.H,
      px: x => ((x - b.minX) * cw) / b.W,
      py: y => ((b.maxY - y) * ch) / b.H
    };
  }

  // Gives an extrusion's front face its own wood canvas, so the grain is scaled to the real size.
  // `o.draw(surf, map)` can add painted markers, inlays or a juice groove.
  function face(c, mesh, o = {}) {
    const m = capMap(mesh, o.max || 1024);
    const sp = o.sp || c.sp;
    const surf = c.surface(m.cw, m.ch, { ...o, sp });
    if (o.draw) o.draw(surf, m);
    mesh.material[2] = c.env.surface(surf, sp, o);
    return surf;
  }

  /* ----------------------------------------------------------------- models */
  const KEY_STEPS = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
  const RAINBOW = ["#C8442F", "#E1782F", "#E7C33B", "#5E9B53", "#2F9C95", "#3E7FB0", "#5B5BA6", "#8A4F9E"];

  const MODELS = {
    board(c) {
      const s = c.scale;
      const kind = c.m.shape;
      const groove = c.opt.groove === "yes";
      let sh, depth = 0.17, groovePath = null;
      const bevel = 0.035;
      if (kind === "paddle") {
        const w = 3.3 * s, h = 2.2 * s, r = 0.28, L = 1.0 * s, hw = 0.34;
        sh = new T.Shape();
        sh.moveTo(-w / 2 + r, -h / 2);
        sh.lineTo(w / 2 - r, -h / 2);
        sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
        sh.lineTo(w / 2, -hw - 0.2);
        sh.quadraticCurveTo(w / 2, -hw, w / 2 + 0.2, -hw);
        sh.lineTo(w / 2 + L - hw, -hw);
        sh.absarc(w / 2 + L - hw, 0, hw, -Math.PI / 2, Math.PI / 2, false);
        sh.lineTo(w / 2 + 0.2, hw);
        sh.quadraticCurveTo(w / 2, hw, w / 2, hw + 0.2);
        sh.lineTo(w / 2, h / 2 - r);
        sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
        sh.lineTo(-w / 2 + r, h / 2);
        sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
        sh.lineTo(-w / 2, -h / 2 + r);
        sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
        sh.holes.push(circle(0.1, w / 2 + L - hw, 0, true));
        groovePath = (ctx, m) => roundRectPath(ctx, m.px(-w / 2 + 0.2), m.py(h / 2 - 0.2), (w - 0.4) * m.sx, (h - 0.4) * m.sy, 0.22 * m.sx);
      } else if (kind === "round") {
        const R = 1.55 * s;
        sh = circle(R);
        sh.holes.push(circle(0.09, 0, R - 0.22, true));
        groovePath = (ctx, m) => ctx.arc(m.px(0), m.py(0), (R - 0.42) * m.sx, 0, Math.PI * 2);
      } else if (kind === "long") {
        const w = 5.4 * s, h = 1.55;
        sh = rrect(w, h, 0.3);
        if (c.opt.grips !== "plain") {
          sh.holes.push(rrect(0.18, 0.75, 0.085, -w / 2 + 0.42, 0, true), rrect(0.18, 0.75, 0.085, w / 2 - 0.42, 0, true));
        }
        depth = 0.2;
      } else {
        const w = 3.2 * s, h = 2.1 * s;
        sh = rrect(w, h, 0.2);
      }
      const mesh = extrude(sh, depth, bevel, { side: c.env.wood(c.sp) }, 32);
      face(c, mesh, {
        draw: groove && groovePath
          ? (surf, m) => mark(surf, "groove", ctx => {
              ctx.lineWidth = 0.075 * m.sx;
              ctx.beginPath();
              groovePath(ctx, m);
              ctx.stroke();
            })
          : null
      });
      return { obj: flat(mesh), view: { elev: 52, azim: -14 } };
    },

    coasters(c) {
      const n = c.cfg.size === "6" ? 6 : 4;
      const square = c.opt.shape === "square";
      const R = 0.5, depth = 0.07, bevel = 0.018;
      const g = new T.Group();
      const make = seed => {
        const m = extrude(square ? rrect(R * 2, R * 2, 0.1) : circle(R), depth, bevel, { side: c.env.wood(c.sp, 0.9) }, 32);
        face(c, m, { max: 512, seed });
        return m;
      };
      const front = flat(make(1));
      front.position.set(0.25, 0, 0.5);
      front.rotation.y = square ? 0.18 : 0;
      g.add(front);
      const stackX = -0.95, stackZ = -0.35;
      const tk = depth + bevel * 2;
      for (let i = 0; i < n - 1; i++) {
        const cg = flat(make(i + 2), i * (tk + 0.004));
        cg.position.x = stackX + (hash(i) - 0.5) * 0.05;
        cg.position.z = stackZ + (hash(i + 4) - 0.5) * 0.05;
        cg.rotation.y = square ? (hash(i + 9) - 0.5) * 0.12 : hash(i + 9) * 2;
        g.add(cg);
      }
      if (c.opt.holder === "box") {
        const wood = c.env.wood(c.sp, 0.7);
        const wallH = (n - 1) * (tk + 0.004) * 0.65;
        const ring = square ? rrect(1.18, 1.18, 0.12) : rrect(1.18, 1.18, 0.08);
        ring.holes.push(rrect(1.06, 1.06, square ? 0.08 : 0.03, 0, 0, true));
        const walls = flat(extrude(ring, wallH, 0.01, { side: wood, front: wood, back: wood }));
        walls.position.set(stackX, 0, stackZ);
        g.add(walls);
      }
      return { obj: g, view: { elev: 48, azim: -10 } };
    },

    pin(c) {
      const handled = c.opt.style === "handled";
      const L = 4.4 * (c.scale || 1);
      let pts = [];
      if (handled) {
        const R = 0.27, hr = 0.11, hl = 0.78, y0 = -L / 2;
        const half = [[0, y0], [0.085, y0 + 0.006], [0.125, y0 + 0.04], [0.13, y0 + 0.1], [hr, y0 + 0.2], [hr, y0 + hl - 0.12], [hr + 0.03, y0 + hl - 0.05], [R - 0.03, y0 + hl], [R, y0 + hl + 0.04]];
        pts = [...half, ...half.map(([r, y]) => [r, -y]).reverse()];
      } else {
        const rmax = 0.2, rmin = 0.085, N = 40;
        pts.push([0, -L / 2], [rmin * 0.7, -L / 2 + 0.008], [rmin * 0.95, -L / 2 + 0.04]);
        for (let i = 1; i < N; i++) {
          const t = i / N;
          const k = 1 - Math.pow(Math.abs(2 * t - 1), 2.2);
          pts.push([rmin + (rmax - rmin) * k, -L / 2 + L * t]);
        }
        pts.push([rmin * 0.95, L / 2 - 0.04], [rmin * 0.7, L / 2 - 0.008], [0, L / 2]);
      }
      const rMid = Math.max(...pts.map(p => p[0]));
      const mesh = lathe(pts, c.env.wood(c.sp, 1, "y"), 96);
      mesh.rotation.z = Math.PI / 2;
      mesh.position.y = rMid;
      return { obj: group(mesh), view: { elev: 40, azim: -8, fit: 0.92 } };
    },

    chakla(c) {
      const s = c.scale, R = 1.55 * s, th = 0.2, bevel = 0.05;
      const top = extrude(circle(R), th, bevel, { side: c.env.wood(c.sp, 0.8) }, 48);
      face(c, top);
      const legs = c.opt.base !== "flat";
      const lift = legs ? 0.22 : 0;
      const g = group(flat(top, lift));
      if (legs) {
        const turned = c.env.wood(c.sp, 1, "y");
        for (let i = 0; i < 3; i++) {
          const a = (i * 2 * Math.PI) / 3 + Math.PI / 6;
          const foot = lathe([[0, 0], [0.17, 0], [0.19, 0.04], [0.15, 0.12], [0.16, 0.2], [0.12, 0.22], [0, 0.22]], turned, 24);
          foot.position.set(Math.cos(a) * R * 0.6, 0, Math.sin(a) * R * 0.6);
          g.add(foot);
        }
      }
      const belan = MODELS.pin({ ...c, opt: { style: "tapered" }, scale: 0.86 * s }).obj;
      belan.position.set(0, lift + thickness(top), 0.15);
      belan.rotation.y = 0.32;
      g.add(belan);
      return { obj: g, view: { elev: 40, azim: -14 } };
    },

    utensils(c) {
      const five = c.cfg.size === "5";
      const wood = c.env.wood(c.sp, 0.6);
      const th = 0.07, bv = 0.02;
      const handle = y => (y < 0.11 ? circ(y, 0.11, 0.11) : 0.11);
      const spatulaW = y => {
        if (y < 2.05) return handle(y);
        if (y < 2.45) return 0.11 + 0.29 * smooth01((y - 2.05) / 0.4);
        if (y < 3.25) return 0.4;
        return 0.2 + circ(y, 3.25, 0.2);
      };
      const turnerW = y => {
        if (y < 2.05) return handle(y);
        if (y < 2.4) return 0.11 + 0.35 * smooth01((y - 2.05) / 0.35);
        if (y < 3.3) return 0.46;
        return 0.34 + circ(y, 3.3, 0.12);
      };
      const spoonW = y => (y < 2.1 ? handle(y) : 0.11 - 0.04 * smooth01((y - 2.1) / 0.25));
      const withFace = mesh => {
        face(c, mesh, { max: 2048 });
        return mesh;
      };

      const spatulaShape = symShape(spatulaW, 0, 3.45, 90);
      spatulaShape.holes.push(circle(0.045, 0, 0.32, true));
      const turnerShape = symShape(turnerW, 0, 3.42, 90);
      turnerShape.holes.push(circle(0.045, 0, 0.32, true));
      [-0.2, 0, 0.2].forEach(x => turnerShape.holes.push(rrect(0.08, 0.6, 0.04, x, 2.92, true)));
      const spoonShape = symShape(spoonW, 0, 2.35, 60);
      spoonShape.holes.push(circle(0.045, 0, 0.32, true));

      const makeSpoon = () => {
        const sg = flat(withFace(extrude(spoonShape, th, bv, { side: wood })), 0.03);
        const capA = 0.95;
        const sy = 0.12 / (1 - Math.cos(capA));
        const bowl = new T.Mesh(new T.SphereGeometry(1, 40, 12, 0, Math.PI * 2, 0, capA), c.env.wood(c.sp, 0.6, "x", T.DoubleSide));
        bowl.castShadow = bowl.receiveShadow = true;
        bowl.rotation.x = Math.PI;
        bowl.scale.set(0.38, sy, 0.5);
        bowl.position.set(0, 0.03 + th + bv * 2 + Math.cos(capA) * sy, -2.78);
        sg.add(bowl);
        return sg;
      };

      const g = new T.Group();
      const place = (obj, x, yaw, scale = 1) => {
        obj.position.set(x, 0, 1.6 * scale);
        obj.rotation.y = yaw;
        obj.scale.setScalar(scale);
        g.add(obj);
      };
      place(makeSpoon(), -0.85, 0.1);
      place(flat(withFace(extrude(spatulaShape, th, bv, { side: wood }))), 0, 0);
      place(flat(withFace(extrude(turnerShape, th, bv, { side: wood }))), 0.85, -0.1);
      if (five) {
        place(flat(withFace(extrude(spatulaShape, th, bv, { side: wood }))), 1.6, -0.16, 0.8);
        place(makeSpoon(), -1.6, 0.16, 0.8);
      }
      return { obj: g, view: { elev: 64, azim: 0, fit: 0.9 } };
    },

    masala(c) {
      const R = 1.55, Hb = 0.62, wall = 0.12;
      const turned = c.env.wood(c.sp, 1, "y");
      const g = new T.Group();
      g.add(lathe([[0, 0], [R - 0.06, 0], [R, 0.06], [R, Hb - 0.05], [R - 0.03, Hb], [R - wall + 0.02, Hb], [R - wall, Hb - 0.04], [R - wall, 0.14], [R - wall - 0.06, 0.1], [0, 0.1]], turned));
      const cupMat = c.opt.cups === "steel" ? c.env.metal("steel") : turned;
      const spices = ["#D9A21B", "#A8321C", "#6E4A2B", "#3A2A1F", "#B08A55", "#7B4B2A", "#E8DFC9"];
      const spots = [[0, 0]];
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + Math.PI / 6;
        spots.push([Math.cos(a) * 0.86, Math.sin(a) * 0.86]);
      }
      spots.forEach(([x, z], i) => {
        const cr = 0.36;
        const cup = lathe([[0, 0], [cr - 0.04, 0], [cr, 0.04], [cr, 0.36], [cr - 0.03, 0.38], [cr - 0.05, 0.36], [cr - 0.05, 0.08], [0, 0.07]], cupMat, 48);
        cup.position.set(x, 0.1, z);
        g.add(cup);
        const spice = c.env.paint(spices[i], 0.95);
        const fill = cyl(cr - 0.05, 0.22, spice, 40);
        fill.position.set(x, 0.29, z);
        const mound = new T.Mesh(new T.ConeGeometry(cr - 0.05, 0.14, 40), spice);
        mound.position.set(x, 0.47, z);
        mound.castShadow = mound.receiveShadow = true;
        g.add(fill, mound);
      });
      const lid = extrude(circle(R), 0.08, 0.025, { side: c.env.wood(c.sp) }, 40);
      face(c, lid);
      const lidG = stand(lid);
      const knob = lathe([[0, 0], [0.13, 0], [0.14, 0.04], [0.09, 0.09], [0.11, 0.16], [0.08, 0.2], [0, 0.21]], turned, 32);
      knob.rotation.x = Math.PI / 2;
      knob.position.z = thickness(lid);
      lidG.add(knob);
      lidG.rotation.x = -0.28;
      lidG.position.set(0, R * Math.cos(0.28) + 0.02, -R - 0.45);
      g.add(lidG);
      return { obj: g, view: { elev: 32, azim: -12, fit: 0.95 } };
    },

    tray(c) {
      const s = c.scale, w = 3.5 * s, d = 2.4 * s, r = 0.22, wall = 0.07, rimH = 0.3;
      const wood = c.env.wood(c.sp);
      const base = extrude(rrect(w, d, r), 0.07, 0.015, { side: wood }, 32);
      face(c, base);
      const rimShape = rrect(w, d, r);
      rimShape.holes.push(rrect(w - wall * 2, d - wall * 2, r - wall, 0, 0, true));
      const rim = extrude(rimShape, rimH, 0.012, { side: wood, front: wood, back: wood }, 32);
      const g = group(flat(base), flat(rim));
      const handleMat = c.opt.handles === "wood" ? c.env.wood(c.sp, 1, "y") : c.env.metal("brass");
      const tube = c.opt.handles === "wood" ? 0.05 : 0.032;
      for (const sx of [-1, 1]) {
        const handle = new T.Mesh(new T.TorusGeometry(0.3, tube, 12, 32, Math.PI), handleMat);
        handle.rotation.y = Math.PI / 2;
        handle.position.set(sx * (w / 2 + 0.035), rimH * 0.55, 0);
        handle.castShadow = true;
        g.add(handle);
      }
      return { obj: g, view: { elev: 50, azim: -16 } };
    },

    bowl(c) {
      const s = c.scale, R = 1.6 * s, H = 0.85 * s, t = 0.08;
      const pts = [[0, 0], [0.5 * R, 0], [0.56 * R, 0.015], [0.62 * R, 0.06 * H], [0.8 * R, 0.25 * H], [0.92 * R, 0.5 * H], [0.985 * R, 0.78 * H], [R, H - 0.02], [R - 0.02, H], [R - t, H - 0.01], [R - t - 0.01, 0.78 * H], [0.9 * R - t, 0.5 * H], [0.76 * R - t, 0.27 * H], [0.55 * R - t, 0.13 * H], [0, 0.1 * H + t * 0.5]];
      const mesh = lathe(pts, c.env.wood(c.sp, 1, "y"), 128);
      return { obj: group(mesh), view: { elev: 24, azim: -8 } };
    },

    flute(c) {
      if (c.m.set) {
        const keys = c.opt.set === "performer" ? [["E", "bass"], ["G", "medium"], ["A", "medium"]] : [["C", "medium"], ["G", "medium"], ["A", "medium"]];
        const g = new T.Group();
        keys.forEach(([key, octave], i) => {
          const one = MODELS.flute({ ...c, m: { ...c.m, set: false }, opt: { ...c.opt, key, octave } }).obj;
          one.position.z = (i - 1) * 0.62;
          one.position.x = (i - 1) * 0.15;
          g.add(one);
        });
        return { obj: g, view: { elev: 50, azim: -6, fit: 0.88 } };
      }
      const bamboo = c.m.bamboo !== false;
      let L = c.m.length || 4.2;
      const key = c.opt.key, oct = c.opt.octave;
      if (key && KEY_STEPS[key] != null) L *= Math.pow(2, (-KEY_STEPS[key] / 12) * 0.9);
      if (oct === "bass") L *= 1.45;
      if (oct === "high") L *= 0.72;
      const r = bamboo ? 0.115 * (oct === "bass" ? 1.2 : oct === "high" ? 0.85 : 1) : 0.1;
      const ri = r * 0.72, y0 = -L / 2, y1 = L / 2;
      const pts = [[ri, y0 + 0.02], [r * 0.93, y0], [r, y0 + 0.025]];
      if (bamboo) {
        const node = y1 - L * 0.07;
        pts.push([r, node - 0.05], [r * 1.07, node], [r, node + 0.05]);
      }
      pts.push([r, y1 - 0.025], [r * 0.93, y1], [ri, y1 - 0.02]);
      const mesh = lathe(pts, null, 64);
      const arc = mesh.userData.arc;
      const H = 2048;
      const W = Math.round((H * 2 * Math.PI * r) / arc.total);
      const sp = bamboo ? "bamboo" : c.sp;
      const surf = c.surface(W, H, { along: "y", wrap: true, sp });
      const pxA = W / (2 * Math.PI * r), pxL = H / arc.total;
      const holes = [[0.86, 0.05], [0.47, 0.044], [0.41, 0.044], [0.35, 0.044], [0.27, 0.044], [0.21, 0.044], [0.15, 0.044]];
      for (const [v, rh] of holes) {
        const x = 0.62 * W, y = (1 - v) * H;
        for (const [ctx, dark] of [[surf.ctx, "rgba(14,7,3,0.96)"], [surf.bctx, "#000"]]) {
          ctx.save();
          ctx.fillStyle = dark;
          ctx.shadowColor = "rgba(60,30,10,0.6)";
          ctx.shadowBlur = rh * pxA * 0.35;
          ctx.beginPath();
          ctx.ellipse(x, y, rh * pxA, rh * pxL, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      mesh.material = c.env.surface(surf, sp, { side: T.DoubleSide });
      const inner = group(mesh);
      if (bamboo && c.opt.thread !== "none") {
        const silk = c.env.paint(c.opt.thread === "black" ? "#1D1A18" : "#9E1B1B", 0.6);
        [0.965, 0.92, 0.8, 0.31, 0.04].forEach(v => {
          const t = cyl(r * 1.045, 0.055, silk, 32, true);
          t.position.y = y0 + v * L;
          inner.add(t);
        });
      }
      if (!bamboo) {
        [0.012, 0.988].forEach(v => {
          const ring = cyl(r * 1.04, 0.07, c.env.metal("brass"), 32, true);
          ring.position.y = y0 + v * L;
          inner.add(ring);
        });
      }
      inner.rotation.z = Math.PI / 2;
      inner.position.y = r;
      const g = group(inner);
      g.rotation.y = 0.32;
      return { obj: g, view: { elev: 42, azim: -6, fit: 0.88 } };
    },

    box(c) {
      const s = c.scale;
      const w = 2.3 * s, d = 1.55 * s, hb = 0.62 * s, hl = 0.2 * s;
      const wood = c.env.wood(c.sp, 0.6);
      const base = extrude(rrect(w, d, 0.05), hb, 0.02, { side: wood, front: wood, back: wood });
      const lid = extrude(rrect(w, d, 0.05), hl, 0.02, { side: wood });
      face(c, lid);
      const top = thickness(base);
      const g = group(flat(base), flat(lid, top + 0.012));
      const seam = box(w - 0.03, 0.014, d - 0.03, c.env.dark);
      seam.position.y = top + 0.006;
      const clasp = box(0.16, 0.13, 0.025, c.env.metal("brass"));
      clasp.position.set(0, top + 0.01, d / 2 + 0.035);
      g.add(seam, clasp);
      return { obj: g, view: { elev: 40, azim: -22 } };
    },

    dryfruit(c) {
      const cols = c.cfg.size === "6" ? 3 : 2, rows = 2;
      const cell = 0.78, wall = 0.07, H = 0.4;
      const W = cols * cell + (cols + 1) * wall, D = rows * cell + (rows + 1) * wall;
      const wood = c.env.wood(c.sp, 0.6);
      const base = extrude(rrect(W, D, 0.06), 0.08, 0.015, { side: wood });
      face(c, base);
      const ring = rrect(W, D, 0.06);
      ring.holes.push(rrect(W - wall * 2, D - wall * 2, 0.03, 0, 0, true));
      const walls = extrude(ring, H, 0.01, { side: wood, front: wood, back: wood });
      const g = group(flat(base), flat(walls));
      for (let i = 1; i < cols; i++) {
        const dv = box(wall, H, D - wall * 2, wood);
        dv.position.set(-W / 2 + i * (cell + wall) + wall / 2, H / 2 + 0.02, 0);
        g.add(dv);
      }
      for (let j = 1; j < rows; j++) {
        const dv = box(W - wall * 2, H, wall, wood);
        dv.position.set(0, H / 2 + 0.02, -D / 2 + j * (cell + wall) + wall / 2);
        g.add(dv);
      }
      // almonds, cashews, raisins, pistachios, walnuts, dates
      const fruits = [["#B9773E", [0.1, 0.05, 0.065]], ["#EAD7AE", [0.1, 0.055, 0.06]], ["#5A2626", [0.05, 0.04, 0.045]], ["#A6B56C", [0.07, 0.05, 0.06]], ["#8C5A2E", [0.085, 0.06, 0.08]], ["#6A3519", [0.11, 0.05, 0.05]]];
      const geo = new T.SphereGeometry(1, 10, 8);
      const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), sc = new T.Vector3();
      let k = 0;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const [color, size] = fruits[k % fruits.length];
          const count = 34;
          const im = new T.InstancedMesh(geo, c.env.paint(color, 0.7), count);
          const cx = -W / 2 + wall + cell / 2 + i * (cell + wall);
          const cz = -D / 2 + wall + cell / 2 + j * (cell + wall);
          for (let n = 0; n < count; n++) {
            const a = hash(n * 3 + k * 101) * Math.PI * 2;
            const rr = Math.sqrt(hash(n * 7 + k * 53)) * cell * 0.4;
            const mound = 1 - rr / (cell * 0.45);
            p.set(cx + Math.cos(a) * rr, 0.12 + mound * 0.16 + hash(n + k) * 0.05, cz + Math.sin(a) * rr);
            e.set(hash(n * 5 + k) * 3, hash(n * 11 + k) * 6, hash(n * 13 + k) * 3);
            q.setFromEuler(e);
            sc.set(...size);
            m4.compose(p, q, sc);
            im.setMatrixAt(n, m4);
          }
          im.instanceMatrix.needsUpdate = true;
          im.castShadow = im.receiveShadow = true;
          g.add(im);
          k++;
        }
      }
      if (c.opt.lid !== "open") {
        const lid = extrude(rrect(W, D, 0.06), 0.07, 0.015, { side: wood });
        face(c, lid, { seed: 4 });
        const lg = stand(lid);
        lg.rotation.x = -0.32;
        lg.position.set(0, (D / 2) * Math.cos(0.32) + 0.02, -D / 2 - 0.3);
        g.add(lg);
      }
      return { obj: g, view: { elev: 46, azim: -14 } };
    },

    pen(c) {
      const metal = c.env.metal(c.opt.trim === "chrome" ? "chrome" : "gold");
      const turned = c.env.wood(c.sp, 1, "y");
      const r = 0.075, y0 = -0.75;
      const pen = group(
        lathe([[0, y0], [0.012, y0 + 0.01], [0.03, y0 + 0.08], [0.05, y0 + 0.16], [0.062, y0 + 0.2]], metal, 32),
        lathe([[0.062, y0 + 0.2], [r, y0 + 0.24], [r, y0 + 0.78], [0.072, y0 + 0.8]], turned, 64),
        lathe([[0.072, y0 + 0.8], [0.079, y0 + 0.81], [0.079, y0 + 0.86], [0.072, y0 + 0.87]], metal, 32),
        lathe([[0.072, y0 + 0.87], [r, y0 + 0.9], [r, y0 + 1.38], [0.06, y0 + 1.44]], turned, 48),
        lathe([[0.06, y0 + 1.44], [0.055, y0 + 1.47], [0.03, y0 + 1.5], [0, y0 + 1.5]], metal, 32)
      );
      const clip = box(0.018, 0.42, 0.03, metal);
      clip.position.set(r + 0.012, y0 + 1.16, 0);
      pen.add(clip);
      pen.rotation.z = Math.PI / 2;
      const wood = c.env.wood(c.sp, 0.6);
      const tray = extrude(rrect(1.95, 0.6, 0.05), 0.16, 0.015, { side: wood, front: c.env.paint("#1F2235", 0.9), back: wood });
      const lid = extrude(rrect(1.95, 0.6, 0.05), 0.07, 0.015, { side: wood });
      face(c, lid);
      const lidG = stand(lid);
      lidG.rotation.x = -0.3;
      lidG.position.set(0, 0.3, -0.5);
      pen.position.y = thickness(tray) + r;
      const g = group(flat(tray), lidG, pen);
      g.rotation.y = 0.12;
      return { obj: g, view: { elev: 36, azim: -6, fit: 0.9 } };
    },

    clock(c) {
      const s = c.scale, R = 1.5 * s;
      const dial = extrude(circle(R), 0.16, 0.045, { side: c.env.wood(c.sp, 0.7) }, 40);
      const mode = c.opt.numerals || "roman";
      face(c, dial, {
        draw: (surf, m) => mark(surf, "paint", ctx => {
          const k = m.sx;
          ctx.translate(m.px(0), m.py(0));
          for (let i = 0; i < 60; i++) {
            const hour = i % 5 === 0;
            if (mode !== "ticks" && hour) continue;
            const r1 = R * (hour ? 0.8 : 0.9) * k, r2 = R * 0.95 * k, tw = (hour ? 0.035 : 0.012) * R * k;
            ctx.save();
            ctx.rotate((i * Math.PI) / 30);
            ctx.fillRect(-tw / 2, -r2, tw, r2 - r1);
            ctx.restore();
          }
          if (mode === "ticks") return;
          const f = mode === "roman" ? FONTS.classic : FONTS.serif;
          const labels = mode === "roman"
            ? ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"]
            : ["12", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];
          setFont(ctx, f, R * k * (mode === "roman" ? 0.14 : 0.19));
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          labels.forEach((t, i) => {
            const a = (i * Math.PI) / 6;
            ctx.fillText(t, Math.sin(a) * R * 0.76 * k, -Math.cos(a) * R * 0.76 * k);
          });
        })
      });
      const g = group(stand(dial));
      const front = thickness(dial);
      const black = c.env.metal("black");
      const hand = (len, wd, z, angle) => {
        const geo = new T.BoxGeometry(wd, len, 0.02);
        geo.translate(0, len / 2 - 0.12, 0);
        const m = new T.Mesh(geo, black);
        m.castShadow = true;
        m.position.z = front + z;
        m.rotation.z = -angle;
        g.add(m);
      };
      hand(R * 0.5, 0.07, 0.03, (305 * Math.PI) / 180);
      hand(R * 0.74, 0.05, 0.055, (60 * Math.PI) / 180);
      const pin = cyl(0.06, 0.06, black, 20);
      pin.rotation.x = Math.PI / 2;
      pin.position.z = front + 0.07;
      g.add(pin);
      return { obj: g, view: { elev: 4, azim: -12 }, wall: true };
    },

    mandir(c) {
      const w = 2.6, d = 1.6, bh = 0.32, ph = 1.55, th = 0.16;
      const wood = c.env.wood(c.sp, 0.5);
      const turned = c.env.wood(c.sp, 1, "y");
      const g = new T.Group();
      const base = extrude(rrect(w, d, 0.04), bh, 0.02, { side: wood, front: wood, back: wood });
      g.add(flat(base));
      const floorY = thickness(base);
      const strip = extrude(rrect(w - 0.3, bh - 0.06, 0.02), 0.012, 0.004, { side: wood });
      face(c, strip, { seed: 3 });
      const sg = stand(strip, d / 2 + 0.02);
      sg.position.y = floorY / 2;
      g.add(sg);
      const pillar = [[0, 0], [0.11, 0], [0.11, 0.1], [0.08, 0.13], [0.075, 0.2], [0.06, 0.24], [0.06, ph - 0.28], [0.075, ph - 0.24], [0.06, ph - 0.2], [0.075, ph - 0.16], [0.1, ph - 0.1], [0.11, ph - 0.06], [0.11, ph], [0, ph]];
      [[-w / 2 + 0.22, d / 2 - 0.22], [w / 2 - 0.22, d / 2 - 0.22], [-w / 2 + 0.22, -d / 2 + 0.32], [w / 2 - 0.22, -d / 2 + 0.32]].forEach(([x, z]) => {
        const p = lathe(pillar, turned, 32);
        p.position.set(x, floorY, z);
        g.add(p);
      });
      const panel = extrude(rrect(w - 0.55, ph - 0.05, 0.03), 0.05, 0.012, { side: wood });
      face(c, panel, {
        draw: c.opt.back === "plain" ? null : surf => mark(surf, "inlay", ctx => {
          const W = surf.w, H = surf.h, step = W / 8;
          const mx = W / 2, my = step * 1.15, mr = step * 0.95;
          ctx.lineWidth = step * 0.06;
          for (let y = step * 2.4; y < H - step * 0.3; y += step) {
            for (let x = step * 0.5; x < W; x += step) {
              ctx.beginPath();
              ctx.arc(x, y, step * 0.62, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
          ctx.beginPath();
          ctx.arc(mx, my, mr, 0, Math.PI * 2);
          ctx.stroke();
          setFont(ctx, FONTS.hindi, mr * 1.25);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("ॐ", mx, my + mr * 0.05);
        })
      });
      const pg = stand(panel, -d / 2 + 0.08);
      pg.position.y = floorY + (ph - 0.05) / 2;
      g.add(pg);
      const top = extrude(rrect(w + 0.1, d + 0.1, 0.04), th, 0.02, { side: wood, front: wood, back: wood });
      g.add(flat(top, floorY + ph));
      const tierY = floorY + ph + thickness(top);
      const tier = extrude(rrect(w * 0.6, d * 0.7, 0.04), 0.12, 0.015, { side: wood, front: wood, back: wood });
      g.add(flat(tier, tierY));
      const domeY = tierY + thickness(tier);
      const dome = lathe([[0.62, 0], [0.62, 0.06], [0.58, 0.1], [0.6, 0.2], [0.56, 0.38], [0.46, 0.58], [0.32, 0.76], [0.2, 0.86], [0.12, 0.9], [0.13, 0.94], [0, 0.96]], turned, 48);
      dome.position.y = domeY;
      const kalash = lathe([[0, 0], [0.06, 0], [0.09, 0.05], [0.07, 0.11], [0.05, 0.13], [0.07, 0.16], [0.02, 0.24], [0, 0.26]], c.env.metal("gold"), 24);
      kalash.position.y = domeY + 0.96;
      const cloth = box(1.1, 0.012, 0.7, c.env.paint("#8E1C1C", 0.85));
      cloth.position.set(0, floorY + 0.006, 0.05);
      const diya = lathe([[0, 0], [0.12, 0], [0.16, 0.05], [0.15, 0.08], [0.13, 0.07], [0, 0.04]], c.env.metal("brass"), 24);
      diya.position.set(0, floorY + 0.012, 0.42);
      const flame = new T.Mesh(new T.SphereGeometry(0.035, 12, 8), c.env.glow(0xffb347));
      flame.scale.y = 1.8;
      flame.position.set(0, floorY + 0.15, 0.42);
      g.add(dome, kalash, cloth, diya, flame);
      if (c.opt.light === "led") {
        const lamp = new T.PointLight(0xffc27a, 3, 4, 2);
        lamp.position.set(0, floorY + ph - 0.15, 0);
        g.add(lamp);
      }
      g.scale.setScalar(c.scale);
      return { obj: group(g), view: { elev: 10, azim: -24, fit: 0.92 } };
    },

    keyholder(c) {
      const n = c.opt.hooks === "6" ? 6 : 4, w = n === 6 ? 3.6 : 3.0, h = 1.3;
      const wood = c.env.wood(c.sp, 0.6);
      const plate = extrude(rrect(w, h, 0.1), 0.12, 0.03, { side: wood });
      face(c, plate);
      const g = group(stand(plate));
      const front = thickness(plate);
      const peg = [[0, 0], [0.06, 0], [0.06, 0.2], [0.075, 0.24], [0.1, 0.27], [0.1, 0.31], [0.07, 0.34], [0, 0.345]];
      const turned = c.env.wood(c.sp, 1, "y");
      const step = (w - 0.6) / (n - 1);
      for (let i = 0; i < n; i++) {
        const p = lathe(peg, turned, 24);
        p.rotation.x = Math.PI / 2;
        p.position.set((i - (n - 1) / 2) * step, -0.2, front);
        g.add(p);
      }
      const ring = new T.Mesh(new T.TorusGeometry(0.11, 0.012, 8, 32), c.env.metal("steel"));
      ring.position.set((-(n - 1) / 2) * step, -0.33, front + 0.22);
      const key = box(0.05, 0.32, 0.012, c.env.metal("brass"));
      key.position.set(ring.position.x, -0.56, front + 0.22);
      g.add(ring, key);
      if (c.opt.shelf === "yes") {
        const shelf = extrude(rrect(w, 0.55, 0.05), 0.08, 0.015, { side: wood });
        face(c, shelf, { seed: 6 });
        const sh = flat(shelf, h / 2);
        sh.position.z = 0.27;
        g.add(sh);
      }
      return { obj: g, view: { elev: 10, azim: -14 }, wall: true };
    },

    candles(c) {
      const turned = c.env.wood(c.sp, 1, "y");
      const base = extrude(rrect(3.2, 1.3, 0.12), 0.1, 0.025, { side: c.env.wood(c.sp, 0.6) });
      face(c, base);
      const g = group(flat(base));
      const y0 = thickness(base);
      const wax = c.env.paint("#F3EBDD", 0.6);
      const glow = c.env.glow(0xffb347);
      [0.95, 1.4, 0.75].forEach((h, i) => {
        const x = (i - 1) * 0.95, z = -0.05;
        const holder = lathe([[0, 0], [0.32, 0], [0.33, 0.04], [0.3, 0.08], [0.16, 0.14], [0.11, 0.2], [0.1, h * 0.45], [0.15, h * 0.5], [0.1, h * 0.55], [0.1, h - 0.18], [0.2, h - 0.12], [0.26, h - 0.04], [0.26, h], [0, h]], turned, 40);
        holder.position.set(x, y0, z);
        const ch = 0.5 - i * 0.08;
        const candle = cyl(0.2, ch, wax, 32);
        candle.position.set(x, y0 + h + ch / 2, z);
        const wick = cyl(0.008, 0.06, c.env.paint("#1d1612", 0.9), 6);
        wick.position.set(x, y0 + h + ch + 0.03, z);
        const flame = new T.Mesh(new T.SphereGeometry(0.04, 16, 12), glow);
        flame.scale.set(1, 2.1, 1);
        flame.position.set(x, y0 + h + ch + 0.11, z);
        g.add(holder, candle, wick, flame);
      });
      return { obj: g, view: { elev: 22, azim: -16 } };
    },

    shelf(c) {
      const s = c.scale, L = 3.2 * s, Th = 0.26, D = 0.85;
      const slab = extrude(rrect(L, Th, 0.02), D, 0.015, { side: c.env.wood(c.sp, 0.5), back: c.env.wood(c.sp) });
      face(c, slab);
      const sg = stand(slab);
      const y = 1.2;
      sg.position.y = y;
      const g = group(sg);
      const topY = y + Th / 2 + 0.015;
      const zMid = D / 2;
      [["#2F4858", 0.18, 0.78], ["#8C3B2E", 0.15, 0.7], ["#C9A66B", 0.2, 0.82]].forEach(([col, t, hgt], i) => {
        const b = box(t, hgt, 0.58, c.env.paint(col, 0.7));
        b.position.set(-L / 2 + 0.35 + i * 0.21, topY + hgt / 2, zMid);
        g.add(b);
      });
      const lean = box(0.16, 0.7, 0.56, c.env.paint("#4E6B57", 0.7));
      lean.position.set(-L / 2 + 1.05, topY + 0.33, zMid);
      lean.rotation.z = -0.32;
      const pot = lathe([[0, 0], [0.2, 0], [0.26, 0.38], [0.28, 0.4], [0.28, 0.44], [0.24, 0.44], [0.22, 0.4], [0, 0.4]], c.env.paint("#B5653B", 0.8), 32);
      pot.position.set(L / 2 - 0.5, topY, zMid);
      const cactus = new T.Mesh(new T.CapsuleGeometry(0.13, 0.32, 6, 16), c.env.paint("#5F8A4E", 0.75));
      cactus.position.set(L / 2 - 0.5, topY + 0.62, zMid);
      cactus.castShadow = true;
      g.add(lean, pot, cactus);
      return { obj: g, view: { elev: 12, azim: -18 }, wall: true };
    },

    organizer(c) {
      const wood = c.env.wood(c.sp, 0.6);
      const low = extrude(rrect(2.6, 1.0, 0.05), 0.42, 0.02, { side: wood, back: wood });
      face(c, low);
      const tall = extrude(rrect(2.6, 0.7, 0.05), 0.95, 0.02, { side: wood, back: wood });
      face(c, tall, { seed: 3 });
      const lowG = flat(low);
      lowG.position.z = 0.35;
      const tallG = flat(tall);
      tallG.position.z = -0.5;
      const g = group(lowG, tallG);
      const tallTop = thickness(tall);
      const pens = [["#1F2A44", -0.1], ["#B23A2A", 0.12], ["#222", -0.05]];
      [-0.85, -0.3].forEach((x, i) => {
        const hole = cyl(0.2, 0.012, c.env.dark, 32);
        hole.position.set(x, tallTop + 0.002, -0.5);
        g.add(hole);
        pens.slice(i, i + 2).forEach(([col, tilt], j) => {
          const p = cyl(0.035, 1.05, c.env.paint(col, 0.4), 12);
          p.position.set(x + (j - 0.5) * 0.12, tallTop + 0.25, -0.5);
          p.rotation.z = tilt;
          p.rotation.x = (j - 0.5) * 0.18;
          g.add(p);
        });
      });
      const slot = box(0.95, 0.012, 0.08, c.env.dark);
      slot.position.set(0.6, thickness(low) + 0.002, 0.3);
      const cards = box(0.7, 0.012, 0.42, c.env.dark);
      cards.position.set(0.6, tallTop + 0.002, -0.5);
      g.add(slot, cards);
      return { obj: g, view: { elev: 28, azim: -20 } };
    },

    stand(c) {
      const s = c.scale, dock = !!c.m.dock;
      const wood = c.env.wood(c.sp, 0.6);
      const bw = dock ? 2.7 : 1.5 * s, bd = 1.3;
      const base = extrude(rrect(bw, bd, 0.08), 0.12, 0.02, { side: wood });
      face(c, base);
      const g = group(flat(base));
      const top = thickness(base);
      const sx = dock ? -0.55 : 0, pw = dock ? 1.2 : 1.5 * s, ph = 1.6 * s;
      const back = extrude(rrect(pw, ph, 0.08), 0.12, 0.02, { side: wood });
      face(c, back, { seed: 3 });
      const bg = stand(back);
      bg.rotation.x = -0.3;
      bg.position.set(sx, top + (ph / 2) * Math.cos(0.3), -0.3);
      const lip = box(pw, 0.12, 0.12, wood);
      lip.position.set(sx, top + 0.06, 0.12);
      g.add(bg, lip);
      const phone = extrude(rrect(0.78 * s, 1.6 * s, 0.11), 0.07, 0.01, { side: c.env.paint("#1B1B1D", 0.35), front: c.env.paint("#0F1420", 0.15) });
      const ph2 = stand(phone);
      ph2.rotation.x = -0.3;
      ph2.position.set(sx, top + 0.8 * s * Math.cos(0.3) + 0.02, 0.04);
      g.add(ph2);
      if (dock) {
        const rim = rrect(1.05, 0.9, 0.08);
        rim.holes.push(rrect(0.93, 0.78, 0.04, 0, 0, true));
        const tray = flat(extrude(rim, 0.1, 0.008, { side: wood, front: wood, back: wood }), top);
        tray.position.set(0.7, 0, -0.08);
        const watch = new T.Mesh(new T.TorusGeometry(0.2, 0.05, 12, 40), c.env.metal("steel"));
        watch.rotation.x = Math.PI / 2;
        watch.position.set(0.62, top + 0.05, -0.08);
        g.add(tray, watch);
      }
      return { obj: g, view: { elev: 22, azim: -18 } };
    },

    riser(c) {
      const s = c.scale, L = 3.6 * s, D = 1.05, Hh = 0.62;
      const wood = c.env.wood(c.sp, 0.5);
      const top = extrude(rrect(L, D, 0.06), 0.14, 0.02, { side: wood });
      face(c, top);
      const g = group(flat(top, Hh));
      [-1, 1].forEach(sx => {
        const leg = extrude(rrect(D - 0.02, Hh, 0.03), 0.14, 0.01, { side: wood, front: wood, back: wood });
        const lg = stand(leg, -0.07);
        lg.rotation.y = Math.PI / 2;
        lg.position.set(sx * (L / 2 - 0.22), Hh / 2, 0);
        g.add(lg);
      });
      if (c.opt.storage === "drawer") {
        const dw = extrude(rrect(L * 0.42, Hh - 0.16, 0.03), D - 0.14, 0.012, { side: wood, back: wood });
        face(c, dw, { seed: 4 });
        const dg = stand(dw, -(D - 0.14) / 2 - 0.02);
        dg.position.y = (Hh - 0.16) / 2 + 0.1;
        const knob = cyl(0.045, 0.07, c.env.metal("brass"), 16);
        knob.rotation.x = Math.PI / 2;
        knob.position.set(0, (Hh - 0.16) / 2 + 0.1, (D - 0.14) / 2 + 0.06);
        g.add(dg, knob);
      }
      const screen = c.env.paint("#16181D", 0.25);
      const yTop = Hh + 0.18;
      const foot = box(0.7, 0.03, 0.42, screen);
      foot.position.set(0, yTop + 0.015, -0.15);
      const neck = box(0.12, 0.62, 0.06, screen);
      neck.position.set(0, yTop + 0.33, -0.25);
      const monitor = box(2.7, 1.55, 0.07, screen);
      monitor.position.set(0, yTop + 1.2, -0.2);
      const keyboard = box(1.9, 0.05, 0.55, c.env.paint("#D9D6CF", 0.6));
      keyboard.position.set(0, 0.025, D / 2 + 0.55);
      g.add(foot, neck, monitor, keyboard);
      return { obj: g, view: { elev: 18, azim: -20, fit: 0.95 } };
    },

    blocks(c) {
      const colour = c.opt.finish !== "natural";
      const wood = c.env.wood(c.sp, 0.8);
      const paint = i => (colour ? c.env.paint(RAINBOW[i % RAINBOW.length], 0.5) : wood);
      const g = new T.Group();
      const put = (m, x, y, z, ry = 0) => {
        m.position.set(x, y, z);
        m.rotation.y = ry;
        m.castShadow = m.receiveShadow = true;
        g.add(m);
        return m;
      };
      const u = 0.5;
      const prism = (w, h, d, mat) => {
        const sh = polyShape([[-w / 2, 0], [w / 2, 0], [0, h]]);
        const m = new T.Mesh(new T.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }), mat);
        m.geometry.translate(0, 0, -d / 2);
        return m;
      };
      const arch = (w, h, d, mat) => {
        const sh = new T.Shape();
        sh.moveTo(-w / 2, 0);
        sh.lineTo(-w * 0.24, 0);
        sh.absarc(0, 0, w * 0.24, Math.PI, 0, true);
        sh.lineTo(w / 2, 0);
        sh.lineTo(w / 2, h);
        sh.lineTo(-w / 2, h);
        sh.lineTo(-w / 2, 0);
        const m = new T.Mesh(new T.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false, curveSegments: 24 }), mat);
        m.geometry.translate(0, 0, -d / 2);
        return m;
      };
      put(box(u, u, u, paint(0)), -0.62, u / 2, 0);
      put(box(u, u, u, paint(3)), 0.62, u / 2, 0);
      const ah = 0.55;
      put(arch(1.74, ah, u, paint(5)), 0, u, 0);
      put(cyl(0.16, 0.9, paint(2), 24), -0.62, u + ah + 0.45, 0);
      put(cyl(0.16, 0.9, paint(1), 24), 0.62, u + ah + 0.45, 0);
      put(box(1.9, 0.16, u, paint(4)), 0, u + ah + 0.9 + 0.08, 0);
      put(prism(1.2, 0.55, u, paint(0)), 0, u + ah + 0.9 + 0.16, 0);
      const extra = c.cfg.size === "80" ? 7 : 4;
      for (let i = 0; i < extra; i++) {
        const x = -1.9 + (i % 4) * 1.25 + hash(i) * 0.3;
        const z = 1.1 + Math.floor(i / 4) * 0.75 + hash(i + 5) * 0.2;
        if (i % 3 === 0) put(box(u, u, u, paint(i + 2)), x, u / 2, z, hash(i + 9) * 1.2);
        else if (i % 3 === 1) {
          const cy = put(cyl(0.16, 0.9, paint(i + 4), 24), x, 0.16, z, hash(i + 3) * 2);
          cy.rotation.z = Math.PI / 2;
        } else put(prism(0.7, 0.4, u, paint(i + 1)), x, 0, z, hash(i + 7) * 2);
      }
      return { obj: g, view: { elev: 26, azim: -18 } };
    },

    train(c) {
      const wagons = c.opt.wagons === "5" ? 5 : 3;
      const colour = c.opt.finish !== "natural";
      const wood = c.env.wood(c.sp, 0.8);
      const paint = i => (colour ? c.env.paint(RAINBOW[i % RAINBOW.length], 0.5) : wood);
      const wheelMat = colour ? c.env.paint("#B23A2A", 0.5) : c.env.wood("walnut", 0.6);
      const g = new T.Group();
      const wheel = (x, z) => {
        const w = cyl(0.15, 0.08, wheelMat, 24);
        w.rotation.x = Math.PI / 2;
        w.position.set(x, 0.15, z);
        return w;
      };
      const engine = new T.Group();
      const chassis = box(0.95, 0.12, 0.62, wood);
      chassis.position.y = 0.26;
      const boiler = cyl(0.24, 0.55, paint(0), 28);
      boiler.rotation.z = Math.PI / 2;
      boiler.position.set(-0.17, 0.56, 0);
      const cab = box(0.42, 0.55, 0.58, paint(5));
      cab.position.set(0.25, 0.6, 0);
      const roof = box(0.52, 0.06, 0.66, wood);
      roof.position.set(0.25, 0.9, 0);
      const chimney = cyl(0.08, 0.26, colour ? c.env.paint("#2A2522", 0.6) : wood, 20);
      chimney.position.set(-0.3, 0.9, 0);
      engine.add(chassis, boiler, cab, roof, chimney);
      [-0.3, 0.3].forEach(x => [-0.33, 0.33].forEach(z => engine.add(wheel(x, z))));
      g.add(engine);
      for (let i = 0; i < wagons; i++) {
        const car = new T.Group();
        const bed = box(0.7, 0.1, 0.6, wood);
        bed.position.y = 0.25;
        car.add(bed);
        [-0.22, 0.22].forEach(x => [-0.33, 0.33].forEach(z => car.add(wheel(x, z))));
        if (i % 2 === 0) {
          const cargo = box(0.5, 0.42, 0.48, paint(i + 1));
          cargo.position.y = 0.3 + 0.21;
          car.add(cargo);
        } else {
          [-0.14, 0.14].forEach((x, j) => {
            const log = cyl(0.12, 0.5, paint(i + 2 + j), 20);
            log.rotation.x = Math.PI / 2;
            log.position.set(x, 0.3 + 0.12, 0);
            car.add(log);
          });
        }
        car.position.x = 0.92 + i * 0.86;
        const link = cyl(0.03, 0.18, c.env.metal("steel"), 8);
        link.rotation.z = Math.PI / 2;
        link.position.set(car.position.x - 0.43, 0.25, 0);
        g.add(car, link);
      }
      return { obj: g, view: { elev: 18, azim: -20, fit: 0.95 } };
    },

    stacker(c) {
      const colour = c.opt.finish !== "natural";
      const base = extrude(circle(1.15), 0.2, 0.04, { side: c.env.wood(c.sp, 0.7) }, 40);
      face(c, base);
      const g = group(flat(base));
      let y = thickness(base);
      const turned = c.env.wood(c.sp, 1, "y");
      const peg = cyl(0.1, 1.15, turned, 24);
      peg.position.y = y + 0.575;
      g.add(peg);
      [0.62, 0.54, 0.46, 0.38, 0.31].forEach((R, i) => {
        const tube = 0.13 - i * 0.01;
        const ring = new T.Mesh(new T.TorusGeometry(R - tube, tube, 20, 48), colour ? c.env.paint(RAINBOW[[0, 1, 2, 3, 5][i]], 0.45) : turned);
        ring.rotation.x = Math.PI / 2;
        y += tube;
        ring.position.y = y;
        y += tube;
        ring.castShadow = ring.receiveShadow = true;
        g.add(ring);
      });
      const ball = new T.Mesh(new T.SphereGeometry(0.17, 24, 16), colour ? c.env.paint("#E7C33B", 0.45) : turned);
      ball.position.y = y + 0.12;
      ball.castShadow = true;
      g.add(ball);
      return { obj: g, view: { elev: 30, azim: -10 } };
    },

    frame(c) {
      const s = c.scale, W = 2.2 * s, H = 2.8 * s, ww = 1.45 * s, wh = 1.85 * s, off = 0.14 * s;
      const sh = rrect(W, H, 0.05);
      sh.holes.push(rrect(ww, wh, 0.02, 0, off, true));
      const frame = extrude(sh, 0.13, 0.03, { side: c.env.wood(c.sp, 0.6) });
      face(c, frame);
      const g = group(stand(frame));
      const photo = new T.Mesh(new T.PlaneGeometry(ww + 0.04, wh + 0.04), new T.MeshStandardMaterial({ map: c.photo(), roughness: 0.45 }));
      photo.position.set(0, off, 0.05);
      const backing = box(W - 0.1, H - 0.1, 0.03, c.env.paint("#3A2A1E", 0.8));
      backing.position.z = -0.02;
      const strut = box(0.25, H * 0.7, 0.04, c.env.wood(c.sp));
      strut.rotation.x = 0.35;
      strut.position.set(0, -H * 0.18, -0.45);
      g.add(photo, backing, strut);
      g.rotation.x = -0.1;
      return { obj: group(g), view: { elev: 10, azim: -14 } };
    }
  };

  /* --------------------------------------------------------------- viewer */
  const structKey = (p, cfg) => [p.id, cfg.wood, cfg.size, JSON.stringify(cfg.opts || {}), cfg.photo || ""].join("|");

  function placeholderPhoto() {
    const c = blank(512, 640);
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, 640);
    g.addColorStop(0, "#E9DAC4");
    g.addColorStop(1, "#C9B193");
    x.fillStyle = g;
    x.fillRect(0, 0, 512, 640);
    x.fillStyle = "rgba(255,246,230,0.75)";
    x.beginPath();
    x.arc(360, 200, 56, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = "#A88D6E";
    x.beginPath();
    x.moveTo(0, 470); x.lineTo(170, 300); x.lineTo(300, 430); x.lineTo(380, 360); x.lineTo(512, 480); x.lineTo(512, 640); x.lineTo(0, 640);
    x.fill();
    x.fillStyle = "rgba(60,40,25,0.6)";
    x.font = "600 34px 'Fraunces', serif";
    x.textAlign = "center";
    x.fillText("Your photo here", 256, 580);
    return x.canvas;
  }

  class Viewer {
    constructor(el, opts = {}) {
      this.el = el;
      this.opts = opts;
      this.yaw = 0;
      this.vel = 0;
      this.seq = 0;
      this.visible = true;
      this.sway = opts.sway !== false && !reduceMotion;
      this.t0 = performance.now();
      this.idleAt = 0;
      this.loop = this.loop.bind(this);
      this.initPromise = this.init();
    }

    async init() {
      await ready();
      const r = (this.renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!this.opts.snapshot }));
      r.setPixelRatio(this.opts.dpr || Math.min(window.devicePixelRatio || 1, 2));
      r.outputColorSpace = T.SRGBColorSpace;
      r.toneMapping = T.ACESFilmicToneMapping;
      r.toneMappingExposure = this.opts.exposure || 0.9;
      r.shadowMap.enabled = true;
      r.shadowMap.type = T.PCFSoftShadowMap;
      r.domElement.className = "gl";
      this.el.appendChild(r.domElement);
      this.scene = new T.Scene();
      this.scene.environment = studioEnv(r);
      this.camera = new T.PerspectiveCamera(26, 1, 0.05, 200);
      this.scene.add(new T.HemisphereLight(0xfff3e4, 0x2a1d14, 0.55));
      const key = (this.key = new T.DirectionalLight(0xffecd6, 2.4));
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.bias = -0.0004;
      key.shadow.normalBias = 0.02;
      const rim = new T.DirectionalLight(0xfff1e2, 0.7);
      rim.position.set(-4, 3, -5);
      this.scene.add(key, key.target, rim);
      this.pivot = new T.Group();
      this.scene.add(this.pivot);
      this.floor = new T.Mesh(new T.PlaneGeometry(80, 80), new T.ShadowMaterial({ opacity: this.opts.shadow || 0.3 }));
      this.floor.rotation.x = -Math.PI / 2;
      this.floor.receiveShadow = true;
      this.scene.add(this.floor);
      this.env = makeEnv(r);
      if (!this.opts.snapshot) this.bindPointer();
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(this.el);
      this.io = new IntersectionObserver(es => {
        this.visible = es[0].isIntersecting;
        if (this.visible) this.kick();
      });
      this.io.observe(this.el);
      this.resize();
    }

    bindPointer() {
      const el = this.renderer.domElement;
      el.style.touchAction = this.opts.touch || "pan-y";
      el.addEventListener("pointerdown", e => {
        this.drag = { x: e.clientX, yaw: this.yaw };
        this.lastX = e.clientX;
        this.lastT = performance.now();
        this.vel = 0;
        el.setPointerCapture(e.pointerId);
        el.classList.add("is-dragging");
        this.kick();
      });
      el.addEventListener("pointermove", e => {
        if (!this.drag) return;
        this.yaw = this.drag.yaw + (e.clientX - this.drag.x) * 0.009;
        const now = performance.now();
        this.vel = ((e.clientX - this.lastX) / Math.max(8, now - this.lastT)) * 0.15;
        this.lastX = e.clientX;
        this.lastT = now;
        this.kick();
      });
      const end = () => {
        if (!this.drag) return;
        this.drag = null;
        this.idleAt = performance.now();
        el.classList.remove("is-dragging");
        this.kick();
      };
      el.addEventListener("pointerup", end);
      el.addEventListener("pointercancel", end);
      el.addEventListener("dblclick", () => this.reset());
    }

    reset() {
      this.vel = 0;
      this.yaw = 0;
      this.idleAt = 0;
      this.t0 = performance.now();
      this.kick();
    }

    async show(product, cfg) {
      const seq = ++this.seq;
      await this.initPromise;
      await fontsReady();
      if (seq !== this.seq) return;
      const key = structKey(product, cfg);
      if (key !== this.key_) {
        this.build(product, cfg);
        this.key_ = key;
      }
      this.kick();
    }

    build(product, cfg) {
      this.clear();
      const builder = MODELS[product.model.type];
      const size = (product.sizes || []).find(x => x.id === cfg.size) || (product.sizes || [])[0] || {};
      const viewer = this;
      const ctx = {
        env: this.env,
        product,
        cfg,
        m: product.model,
        sp: cfg.wood,
        scale: size.scale || 1,
        opt: cfg.opts || {},
        surface: (w, h, o = {}) => makeSurface(this.env, o.sp || cfg.wood, w, h, o),
        photo() {
          const tex = new T.CanvasTexture(placeholderPhoto());
          tex.colorSpace = T.SRGBColorSpace;
          if (cfg.photo) {
            new T.TextureLoader().load(cfg.photo, t => {
              t.colorSpace = T.SRGBColorSpace;
              tex.image = t.image;
              tex.needsUpdate = true;
              viewer.kick();
            });
          }
          return tex;
        }
      };
      const out = builder(ctx);
      const obj = out.obj;
      const box3 = new T.Box3().setFromObject(obj);
      const center = box3.getCenter(new T.Vector3());
      obj.position.x -= center.x;
      obj.position.z -= center.z;
      obj.position.y -= box3.min.y;
      this.holder = new T.Group();
      this.holder.add(obj);
      this.holder.updateMatrixWorld(true);
      const fitBox = new T.Box3().setFromObject(obj);
      this.sphere = fitBox.getBoundingSphere(new T.Sphere());
      this.floor.visible = !out.wall;
      if (out.wall) {
        const wall = new T.Mesh(new T.PlaneGeometry(60, 60), new T.ShadowMaterial({ opacity: 0.26 }));
        wall.position.set(0, fitBox.min.y + 2, fitBox.min.z - 0.004);
        wall.receiveShadow = true;
        this.holder.add(wall);
      }
      this.pivot.add(this.holder);
      this.view = out.view || {};
      this.fit();
    }

    clear() {
      if (!this.holder) return;
      this.pivot.remove(this.holder);
      this.holder.traverse(o => {
        if (o.isMesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
            if (!m || m.userData.shared) return;
            if (m.map) m.map.dispose();
            if (m.bumpMap) m.bumpMap.dispose();
            m.dispose();
          });
        }
      });
      this.holder = null;
    }

    fit() {
      if (!this.sphere || !this.camera) return;
      const v = this.view || {};
      const sphere = this.sphere;
      const elev = T.MathUtils.degToRad(v.elev ?? 30);
      const azim = T.MathUtils.degToRad(v.azim ?? -20);
      const fov = T.MathUtils.degToRad(this.camera.fov);
      const fovX = 2 * Math.atan(Math.tan(fov / 2) * this.camera.aspect);
      const dist = (sphere.radius / Math.sin(Math.min(fov, fovX) / 2)) * (v.fit || 1) * (this.opts.fit || 1);
      const target = sphere.center.clone();
      this.camera.position.set(
        target.x + dist * Math.cos(elev) * Math.sin(azim),
        target.y + dist * Math.sin(elev),
        target.z + dist * Math.cos(elev) * Math.cos(azim)
      );
      this.camera.near = dist / 30;
      this.camera.far = dist * 10;
      this.camera.lookAt(target);
      this.camera.updateProjectionMatrix();
      const r = sphere.radius;
      this.key.position.set(target.x + r * 1.6, target.y + r * 3.2, target.z + r * 2.2);
      this.key.target.position.copy(target);
      const sc = this.key.shadow.camera;
      sc.left = sc.bottom = -r * 1.7;
      sc.right = sc.top = r * 1.7;
      sc.near = 0.1;
      sc.far = r * 10;
      sc.updateProjectionMatrix();
      this.kick();
    }

    resize() {
      if (!this.renderer) return;
      const w = this.el.clientWidth || this.opts.width || 600;
      const h = this.el.clientHeight || this.opts.height || 600;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.fit();
    }

    kick() {
      if (!this.raf && this.visible && this.renderer) this.raf = requestAnimationFrame(this.loop);
    }

    loop(now) {
      this.raf = 0;
      let again = false;
      if (!this.drag) {
        if (Math.abs(this.vel) > 0.0004) {
          this.yaw += this.vel;
          this.vel *= 0.93;
          again = true;
        } else if (this.sway && !this.paused && now - this.idleAt > 3500) {
          const target = Math.sin((now - this.t0) / 2200) * (this.view?.sway ?? 0.32);
          this.yaw += (target - this.yaw) * 0.03;
          again = true;
        }
      }
      this.pivot.rotation.y = this.yaw;
      this.renderer.render(this.scene, this.camera);
      if (again && !this.paused) this.kick();
    }

    pause(p = true) {
      this.paused = p;
      if (!p) this.kick();
    }

    snapshot() {
      this.pivot.rotation.y = this.yaw;
      this.renderer.render(this.scene, this.camera);
      return this.renderer.domElement.toDataURL("image/png");
    }
  }

  /* ----------------------------------------------------------- snapshots */
  let shooter = null;
  let queue = Promise.resolve();
  function snapshot(product, cfg) {
    queue = queue.then(async () => {
      if (!shooter) {
        const host = document.createElement("div");
        host.style.cssText = "position:fixed;left:-10000px;top:0;width:640px;height:800px;pointer-events:none";
        document.body.appendChild(host);
        shooter = new Viewer(host, { snapshot: true, sway: false, dpr: 1, width: 640, height: 800 });
        await shooter.initPromise;
        shooter.visible = false;
      }
      await shooter.show(product, cfg);
      shooter.yaw = 0;
      return shooter.snapshot();
    });
    return queue;
  }

  return {
    supported: webgl,
    ready,
    create: (el, opts) => new Viewer(el, opts),
    snapshot
  };
})();
