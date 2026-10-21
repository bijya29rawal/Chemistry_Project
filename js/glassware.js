/**
 * glassware.js — procedural Three.js builders for every piece of glassware.
 *
 * Scene units: 1 unit = 10 cm. A 250 mL conical flask is therefore ~1.5 units
 * tall and the bench top sits at y = 9 (90 cm), which keeps proportions honest.
 *
 * Every vessel exposes the same small API through userData:
 *   userData.liquid.setFill(fraction 0..1)
 *   userData.liquid.setColor(hex | THREE.Color)
 *   userData.name, userData.id, userData.interactive
 */

import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/* Shared materials (created once, reused everywhere)                  */
/* ------------------------------------------------------------------ */

export const MATERIALS = {
  glass: new THREE.MeshPhysicalMaterial({
    color: 0xeaf4f8, transparent: true, opacity: 0.26, roughness: 0.06,
    metalness: 0, ior: 1.5, clearcoat: 0.6, clearcoatRoughness: 0.08,
    side: THREE.DoubleSide, depthWrite: false,
  }),
  amberGlass: new THREE.MeshPhysicalMaterial({
    color: 0x8a5a1e, transparent: true, opacity: 0.55, roughness: 0.12,
    metalness: 0, clearcoat: 0.5, side: THREE.DoubleSide, depthWrite: false,
  }),
  frosted: new THREE.MeshStandardMaterial({
    color: 0xd9e4e8, transparent: true, opacity: 0.55, roughness: 0.65,
  }),
  steel: new THREE.MeshStandardMaterial({ color: 0xb9c0c6, roughness: 0.32, metalness: 0.9 }),
  darkSteel: new THREE.MeshStandardMaterial({ color: 0x5d666d, roughness: 0.4, metalness: 0.8 }),
  plasticWhite: new THREE.MeshStandardMaterial({ color: 0xe8e9e4, roughness: 0.55, metalness: 0.02 }),
  plasticBlue: new THREE.MeshStandardMaterial({ color: 0x2c5f86, roughness: 0.5, metalness: 0.05 }),
  plasticBlack: new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.6, metalness: 0.08 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x3a3d40, roughness: 0.85, metalness: 0 }),
  ptfe: new THREE.MeshStandardMaterial({ color: 0xf1f1ee, roughness: 0.35, metalness: 0 }),
  cork: new THREE.MeshStandardMaterial({ color: 0xb98a55, roughness: 0.8 }),
};

let uid = 0;
const nextId = (prefix) => `${prefix}_${++uid}`;

/* ------------------------------------------------------------------ */
/* Liquid column                                                       */
/* ------------------------------------------------------------------ */

/**
 * Build a liquid body that fills a vessel from yBase upward.
 * Geometry is created once; filling only changes scale.y, never geometry.
 */
export function makeLiquid({ rTop, rBottom, maxHeight, yBase, color = 0xbfe2f0, opacity = 0.82 }) {
  const geo = new THREE.CylinderGeometry(rTop, rBottom, 1, 28, 1, false);
  geo.translate(0, 0.5, 0); // pivot at the base
  const mat = new THREE.MeshPhysicalMaterial({
    color, transparent: true, opacity, roughness: 0.14, metalness: 0,
    clearcoat: 0.4, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = yBase;
  mesh.scale.y = 0.0001;
  mesh.visible = false;
  mesh.renderOrder = 1;
  mesh.userData.isLiquid = true;

  const api = {
    mesh,
    maxHeight,
    fraction: 0,
    setFill(f) {
      const clamped = Math.max(0, Math.min(1, f));
      api.fraction = clamped;
      mesh.scale.y = Math.max(0.0001, clamped * maxHeight);
      mesh.visible = clamped > 0.002;
    },
    setColor(c) { mat.color.set(c); },
    getColor() { return mat.color.clone(); },
    setOpacity(o) { mat.opacity = o; },
  };
  mesh.userData.api = api;
  return api;
}

/* ------------------------------------------------------------------ */
/* Small shared helpers                                                */
/* ------------------------------------------------------------------ */

function lathe(points, segments = 32, material = MATERIALS.glass) {
  const geo = new THREE.LatheGeometry(points, segments);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function vec(x, y) { return new THREE.Vector2(x, y); }

/** Canvas-drawn graduation strip used by the burette and cylinders. */
function graduationTexture({ top = 0, bottom = 50, step = 5, minor = 1, flip = false }) {
  const w = 128, h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#1d2b33';
  ctx.fillStyle = '#1d2b33';
  ctx.font = '600 34px "IBM Plex Mono", monospace';
  ctx.textBaseline = 'middle';

  const range = bottom - top;
  for (let v = top; v <= bottom + 1e-6; v += minor) {
    const t = (v - top) / range;
    const y = flip ? (1 - t) * h : t * h;
    const isMajor = Math.abs(v % step) < 1e-6;
    const isMid = Math.abs(v % (step / 5)) < 1e-6;
    ctx.lineWidth = isMajor ? 4 : 2.5;
    ctx.beginPath();
    ctx.moveTo(6, y);
    ctx.lineTo(isMajor ? 62 : isMid ? 42 : 30, y);
    ctx.stroke();
    if (isMajor) ctx.fillText(String(Math.round(v)), 70, y);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Printed paper label wrapped on a bottle. */
function labelTexture(title, subtitle, accent = '#1f4f6d') {
  const w = 512, h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f7f4ec';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, w, 14);
  ctx.fillRect(0, h - 10, w, 10);
  ctx.fillStyle = '#16232b';
  ctx.font = '700 54px "IBM Plex Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, w / 2, 100);
  ctx.fillStyle = '#5a6a72';
  ctx.font = '400 34px "IBM Plex Mono", monospace';
  ctx.fillText(subtitle, w / 2, 160);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function tagGroup(group, { id, name, type, interactive = true, action = null }) {
  group.userData = Object.assign(group.userData || {}, {
    id: id || nextId(type), name, type, interactive, action, selectable: interactive,
  });
  group.traverse((child) => {
    if (child.isMesh) child.userData.owner = group;
  });
  return group;
}

/* ------------------------------------------------------------------ */
/* Beaker                                                              */
/* ------------------------------------------------------------------ */

export function createBeaker({ name = 'Beaker', capacity = 250, radius = 0.35, height = 0.55, action = 'BEAKER' } = {}) {
  const g = new THREE.Group();
  const t = 0.012;
  const profile = [
    vec(0, 0), vec(radius, 0), vec(radius, height), vec(radius - t, height),
    vec(radius - t, t * 2), vec(0, t * 2),
  ];
  g.add(lathe(profile, 40));

  // spout
  const spout = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.22, 0.02, 8, 16, Math.PI),
    MATERIALS.glass,
  );
  spout.rotation.x = Math.PI / 2;
  spout.position.set(radius * 0.92, height - 0.02, 0);
  g.add(spout);

  const liquid = makeLiquid({
    rTop: radius - t * 1.6, rBottom: radius - t * 1.6,
    maxHeight: height - 0.06, yBase: t * 2, color: 0xcfe7f2,
  });
  g.add(liquid.mesh);

  const grad = new THREE.Mesh(
    new THREE.PlaneGeometry(0.16, height * 0.6),
    new THREE.MeshBasicMaterial({
      map: graduationTexture({ top: 0, bottom: capacity, step: capacity / 5, minor: capacity / 20, flip: true }),
      transparent: true, opacity: 0.8,
    }),
  );
  grad.position.set(0, height * 0.42, radius + 0.002);
  g.add(grad);

  g.userData.liquid = liquid;
  g.userData.capacity = capacity;
  return tagGroup(g, { name, type: 'beaker', action });
}

/* ------------------------------------------------------------------ */
/* Conical (Erlenmeyer) flask                                          */
/* ------------------------------------------------------------------ */

export function createConicalFlask({ name = 'Conical flask', capacity = 250, action = 'FLASK' } = {}) {
  const g = new THREE.Group();
  const R = 0.42, neckR = 0.13, bodyH = 0.62, neckH = 0.34, t = 0.012;
  const outer = [
    vec(0, 0), vec(R, 0), vec(R, 0.06),
    vec(neckR + 0.012, bodyH), vec(neckR, bodyH + 0.04),
    vec(neckR, bodyH + neckH), vec(neckR + 0.03, bodyH + neckH),
    vec(neckR + 0.03, bodyH + neckH - 0.03),
    vec(neckR - t, bodyH + 0.02), vec(R - t, 0.08), vec(R - t, t), vec(0, t),
  ];
  g.add(lathe(outer, 44));

  const liquid = makeLiquid({
    rTop: R * 0.72, rBottom: R - t * 1.4, maxHeight: bodyH * 0.8, yBase: t, color: 0xcfe7f2,
  });
  // slight cone so the liquid follows the flask wall
  liquid.mesh.geometry.dispose();
  const lg = new THREE.CylinderGeometry(R * 0.55, R - t * 1.4, 1, 36, 1, false);
  lg.translate(0, 0.5, 0);
  liquid.mesh.geometry = lg;
  g.add(liquid.mesh);

  const capLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.1),
    new THREE.MeshBasicMaterial({ map: labelTexture(`${capacity} mL`, 'CONICAL', '#2c5f86'), transparent: true }),
  );
  capLabel.position.set(0, bodyH * 0.55, R * 0.72);
  capLabel.rotation.x = -0.12;
  g.add(capLabel);

  g.userData.liquid = liquid;
  g.userData.capacity = capacity;
  g.userData.mouthY = bodyH + neckH;
  return tagGroup(g, { name, type: 'flask', action });
}

/* ------------------------------------------------------------------ */
/* Volumetric flask                                                    */
/* ------------------------------------------------------------------ */

export function createVolumetricFlask({ name = 'Volumetric flask 1000 mL', action = 'VOLUMETRIC' } = {}) {
  const g = new THREE.Group();
  const R = 0.46, neckR = 0.1, bulbH = 0.6, neckH = 0.55, t = 0.012;
  const pts = [];
  pts.push(vec(0, 0), vec(R * 0.82, 0.02));
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 0.5;
    pts.push(vec(R * Math.cos(a * 0.85) * 0.99 + 0.005, 0.1 + Math.sin(a) * bulbH * 0.9));
  }
  pts.push(vec(neckR, bulbH + 0.12), vec(neckR, bulbH + neckH), vec(neckR + 0.028, bulbH + neckH));
  pts.push(vec(neckR - t, bulbH + neckH - 0.02), vec(neckR - t, bulbH + 0.1), vec(R - t, 0.12), vec(0, t));
  g.add(lathe(pts, 44));

  const ring = new THREE.Mesh(new THREE.TorusGeometry(neckR + 0.004, 0.006, 6, 30), MATERIALS.frosted);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = bulbH + neckH * 0.55;
  g.add(ring);

  const liquid = makeLiquid({ rTop: R * 0.92, rBottom: R * 0.3, maxHeight: bulbH * 0.9, yBase: 0.02, color: 0xdaeef5 });
  g.add(liquid.mesh);

  const neckLiquid = makeLiquid({ rTop: neckR - t, rBottom: neckR - t, maxHeight: neckH * 0.62, yBase: bulbH + 0.1, color: 0xdaeef5 });
  g.add(neckLiquid.mesh);

  g.userData.liquid = liquid;
  g.userData.neckLiquid = neckLiquid;
  g.userData.markY = bulbH + neckH * 0.55;
  return tagGroup(g, { name, type: 'volumetric', action });
}

/* ------------------------------------------------------------------ */
/* Measuring cylinder                                                  */
/* ------------------------------------------------------------------ */

export function createMeasuringCylinder({ name = 'Measuring cylinder 100 mL', capacity = 100, action = 'CYLINDER' } = {}) {
  const g = new THREE.Group();
  const R = 0.19, H = 1.0, t = 0.01;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.8, R * 1.9, 0.06, 32), MATERIALS.glass);
  base.position.y = 0.03;
  g.add(base);
  g.add(lathe([vec(0, 0.06), vec(R, 0.06), vec(R, H), vec(R - t, H), vec(R - t, 0.08), vec(0, 0.08)], 36));

  const liquid = makeLiquid({ rTop: R - t * 1.5, rBottom: R - t * 1.5, maxHeight: H - 0.14, yBase: 0.08, color: 0xcfe7f2 });
  g.add(liquid.mesh);

  const grad = new THREE.Mesh(
    new THREE.PlaneGeometry(0.13, H - 0.16),
    new THREE.MeshBasicMaterial({
      map: graduationTexture({ top: 0, bottom: capacity, step: capacity / 5, minor: capacity / 50, flip: true }),
      transparent: true, opacity: 0.85,
    }),
  );
  grad.position.set(0, 0.08 + (H - 0.16) / 2, R + 0.002);
  g.add(grad);

  g.userData.liquid = liquid;
  g.userData.capacity = capacity;
  return tagGroup(g, { name, type: 'cylinder', action });
}

/* ------------------------------------------------------------------ */
/* Burette                                                             */
/* ------------------------------------------------------------------ */

export function createBurette({ name = 'Burette 50 mL', capacity = 50 } = {}) {
  const g = new THREE.Group();
  const R = 0.105, barrelH = 3.4, t = 0.009;

  // barrel (its base sits at y = 0 of this group)
  const barrel = lathe([
    vec(0, 0.28), vec(R, 0.3), vec(R, barrelH), vec(R + 0.026, barrelH + 0.04),
    vec(R + 0.026, barrelH + 0.09), vec(R - t, barrelH + 0.05), vec(R - t, 0.32), vec(0, 0.3),
  ], 30);
  g.add(barrel);

  // stopcock body and PTFE key
  const stopBody = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.25, R * 1.25, 0.17, 20), MATERIALS.glass);
  stopBody.position.y = 0.2;
  g.add(stopBody);

  const key = new THREE.Group();
  const keyBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.03, 0.34, 16), MATERIALS.ptfe);
  keyBarrel.rotation.z = Math.PI / 2;
  key.add(keyBarrel);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.2), MATERIALS.ptfe);
  handle.position.x = 0.19;
  key.add(handle);
  key.position.y = 0.2;
  g.add(key);

  // delivery tip
  const tip = lathe([vec(0, 0), vec(0.028, 0.0), vec(0.028, 0.1), vec(0.016, 0.16), vec(0.016, 0.2), vec(0, 0.2)], 16);
  tip.position.y = 0.0;
  const tipGroup = new THREE.Group();
  tipGroup.add(tip);
  tipGroup.position.y = -0.09;
  g.add(tipGroup);
  const taper = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.9, 0.03, 0.14, 16), MATERIALS.glass);
  taper.position.y = 0.08;
  g.add(taper);

  // liquid column — index 0 at the TOP of the scale
  const liquid = makeLiquid({
    rTop: R - t * 1.4, rBottom: R - t * 1.4, maxHeight: barrelH - 0.35, yBase: 0.32,
    color: 0xe3f0f6, opacity: 0.72,
  });
  g.add(liquid.mesh);

  const grad = new THREE.Mesh(
    new THREE.PlaneGeometry(0.16, barrelH - 0.35),
    new THREE.MeshBasicMaterial({
      map: graduationTexture({ top: 0, bottom: capacity, step: 5, minor: 1, flip: false }),
      transparent: true, opacity: 0.9,
    }),
  );
  grad.position.set(0, 0.32 + (barrelH - 0.35) / 2, R + 0.002);
  g.add(grad);

  g.userData.liquid = liquid;
  g.userData.capacity = capacity;
  g.userData.tipY = -0.09;              // local y of the delivery tip orifice
  g.userData.stopcockKey = key;
  g.userData.columnTopY = 0.32 + (barrelH - 0.35);
  g.userData.columnBaseY = 0.32;

  // interactive sub-parts
  tagGroup(g, { name, type: 'burette', action: 'BURETTE' });
  stopBody.userData.owner = g;
  key.traverse((c) => { c.userData.owner = g; c.userData.part = 'stopcock'; });
  stopBody.userData.part = 'stopcock';
  barrel.userData.part = 'barrel';
  taper.userData.part = 'barrel';
  return g;
}

/* ------------------------------------------------------------------ */
/* Pipette                                                             */
/* ------------------------------------------------------------------ */

export function createPipette({ name = 'Bulb pipette 50 mL', action = 'PIPETTE' } = {}) {
  const g = new THREE.Group();
  const stemR = 0.035, bulbR = 0.115, totalH = 2.0;
  const pts = [
    vec(0, 0), vec(0.012, 0.02), vec(stemR, 0.12), vec(stemR, 0.62),
    vec(bulbR, 0.82), vec(bulbR, 1.18), vec(stemR, 1.38), vec(stemR, totalH),
    vec(stemR - 0.006, totalH), vec(stemR - 0.006, 1.39),
    vec(bulbR - 0.008, 1.18), vec(bulbR - 0.008, 0.82), vec(stemR - 0.006, 0.62),
    vec(stemR - 0.006, 0.12), vec(0, 0.02),
  ];
  g.add(lathe(pts, 28));

  const ring = new THREE.Mesh(new THREE.TorusGeometry(stemR + 0.003, 0.005, 6, 24), MATERIALS.frosted);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 1.55;
  g.add(ring);

  // liquid inside: bulb + stem, modelled as one tapered column
  const liquid = makeLiquid({ rTop: bulbR - 0.012, rBottom: stemR - 0.01, maxHeight: 1.5, yBase: 0.1, color: 0xcfe7f2, opacity: 0.8 });
  g.add(liquid.mesh);

  g.userData.liquid = liquid;
  g.userData.tipY = 0;
  g.userData.markY = 1.55;
  return tagGroup(g, { name, type: 'pipette', action });
}

/* ------------------------------------------------------------------ */
/* Test tube + rack                                                    */
/* ------------------------------------------------------------------ */

export function createTestTube({ name = 'Test tube' } = {}) {
  const g = new THREE.Group();
  const R = 0.075, H = 0.75;
  const pts = [vec(0, 0)];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI / 2 + (i / 8) * (Math.PI / 2);
    pts.push(vec(R * Math.cos(a) * -1, R + R * Math.sin(a) - R));
  }
  pts.push(vec(R, R), vec(R, H), vec(R - 0.008, H), vec(R - 0.008, R), vec(0, 0.012));
  g.add(lathe(pts, 24));
  const liquid = makeLiquid({ rTop: R - 0.012, rBottom: R - 0.012, maxHeight: H - 0.14, yBase: R * 0.6, color: 0xcfe7f2 });
  g.add(liquid.mesh);
  g.userData.liquid = liquid;
  return tagGroup(g, { name, type: 'testtube', action: 'TESTTUBE' });
}

export function createTestTubeRack({ name = 'Test-tube rack', count = 6 } = {}) {
  const g = new THREE.Group();
  const w = count * 0.24 + 0.16;
  const wood = new THREE.MeshStandardMaterial({ color: 0xc9a06a, roughness: 0.75 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 0.42), wood);
  base.position.y = 0.025; base.castShadow = true; base.receiveShadow = true;
  g.add(base);
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, 0.42), wood);
  top.position.y = 0.6; top.castShadow = true;
  g.add(top);
  for (const x of [-w / 2 + 0.04, w / 2 - 0.04]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.42), wood);
    post.position.set(x, 0.3, 0); post.castShadow = true;
    g.add(post);
  }
  const tubes = [];
  for (let i = 0; i < count; i++) {
    const tube = createTestTube({ name: `Test tube ${i + 1}` });
    tube.position.set(-w / 2 + 0.24 * (i + 0.5) + 0.08, 0.06, 0);
    g.add(tube);
    tubes.push(tube);
  }
  g.userData.tubes = tubes;
  return tagGroup(g, { name, type: 'rack', action: 'RACK' });
}

/* ------------------------------------------------------------------ */
/* Reagent bottle                                                      */
/* ------------------------------------------------------------------ */

export function createReagentBottle({
  name, subtitle = '', color = 0xdfe9ee, amber = false,
  height = 0.9, radius = 0.21, action = 'REAGENT', accent = '#1f4f6d',
} = {}) {
  const g = new THREE.Group();
  const bodyMat = amber ? MATERIALS.amberGlass : MATERIALS.glass;
  const neckR = radius * 0.42;
  const body = lathe([
    vec(0, 0), vec(radius, 0.02), vec(radius, height * 0.72),
    vec(neckR, height * 0.86), vec(neckR, height),
    vec(neckR - 0.01, height), vec(neckR - 0.01, height * 0.87),
    vec(radius - 0.012, height * 0.73), vec(radius - 0.012, 0.03), vec(0, 0.015),
  ], 32, bodyMat);
  g.add(body);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(neckR + 0.022, neckR + 0.022, 0.13, 20), MATERIALS.plasticWhite);
  cap.position.y = height + 0.045;
  cap.castShadow = true;
  g.add(cap);

  const liquid = makeLiquid({
    rTop: radius - 0.02, rBottom: radius - 0.02, maxHeight: height * 0.68, yBase: 0.03, color,
  });
  liquid.setFill(0.72);
  g.add(liquid.mesh);

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 1.75, height * 0.42),
    new THREE.MeshBasicMaterial({ map: labelTexture(name, subtitle, accent), transparent: true }),
  );
  label.position.set(0, height * 0.38, radius + 0.004);
  g.add(label);

  g.userData.liquid = liquid;
  g.userData.cap = cap;
  g.userData.capY = height + 0.045;
  g.userData.open = false;
  g.userData.pourY = height;
  return tagGroup(g, { name, type: 'reagent', action });
}

/* ------------------------------------------------------------------ */
/* Wash bottle, funnel, glass rod, dropper                             */
/* ------------------------------------------------------------------ */

export function createWashBottle({ name = 'Wash bottle (distilled water)' } = {}) {
  const g = new THREE.Group();
  const R = 0.2, H = 0.8;
  const body = lathe([
    vec(0, 0), vec(R, 0.04), vec(R, H * 0.78), vec(R * 0.45, H * 0.92), vec(R * 0.45, H),
    vec(R * 0.45 - 0.01, H), vec(R * 0.45 - 0.01, H * 0.93), vec(R - 0.012, H * 0.79), vec(R - 0.012, 0.05), vec(0, 0.02),
  ], 28, new THREE.MeshPhysicalMaterial({
    color: 0xe9f2f5, transparent: true, opacity: 0.4, roughness: 0.25, side: THREE.DoubleSide, depthWrite: false,
  }));
  g.add(body);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.5, R * 0.5, 0.1, 18), MATERIALS.plasticBlue);
  cap.position.y = H + 0.04; g.add(cap);
  const spoutCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, H + 0.09, 0), new THREE.Vector3(0, H + 0.3, 0),
    new THREE.Vector3(0.08, H + 0.42, 0), new THREE.Vector3(0.28, H + 0.3, 0),
    new THREE.Vector3(0.3, H + 0.02, 0),
  ]);
  const spout = new THREE.Mesh(new THREE.TubeGeometry(spoutCurve, 24, 0.022, 10, false), MATERIALS.plasticBlue);
  g.add(spout);
  const liquid = makeLiquid({ rTop: R - 0.02, rBottom: R - 0.02, maxHeight: H * 0.7, yBase: 0.04, color: 0xdff0f6 });
  liquid.setFill(0.8);
  g.add(liquid.mesh);
  g.userData.liquid = liquid;
  g.userData.nozzle = new THREE.Vector3(0.3, H + 0.02, 0);
  return tagGroup(g, { name, type: 'washbottle', action: 'WASH' });
}

export function createFunnel({ name = 'Glass funnel' } = {}) {
  const g = new THREE.Group();
  g.add(lathe([vec(0, 0), vec(0.04, 0), vec(0.04, 0.34), vec(0.34, 0.6), vec(0.34, 0.615),
    vec(0.032, 0.35), vec(0.032, 0.0)], 28));
  return tagGroup(g, { name, type: 'funnel', action: 'FUNNEL' });
}

export function createGlassRod({ name = 'Glass stirring rod' } = {}) {
  const g = new THREE.Group();
  const geo = typeof THREE.CapsuleGeometry === 'function'
    ? new THREE.CapsuleGeometry(0.022, 0.9, 6, 12)
    : new THREE.CylinderGeometry(0.022, 0.022, 0.95, 12);
  const rod = new THREE.Mesh(geo, MATERIALS.glass);
  rod.castShadow = true;
  g.add(rod);
  return tagGroup(g, { name, type: 'rod', action: 'ROD' });
}

export function createDropper({ name = 'Dropper' } = {}) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.008, 0.42, 12), MATERIALS.glass);
  stem.position.y = 0.21; g.add(stem);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), MATERIALS.rubber);
  bulb.position.y = 0.48; bulb.scale.y = 1.35; g.add(bulb);
  return tagGroup(g, { name, type: 'dropper', action: 'DROPPER' });
}

/* ------------------------------------------------------------------ */
/* Sample vial for the turbidity meter                                 */
/* ------------------------------------------------------------------ */

export function createSampleVial({ name = 'Turbidity sample vial' } = {}) {
  const g = new THREE.Group();
  const R = 0.11, H = 0.5;
  g.add(lathe([vec(0, 0), vec(R, 0.01), vec(R, H), vec(R - 0.008, H), vec(R - 0.008, 0.02), vec(0, 0.012)], 24));
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.012, R + 0.012, 0.08, 18), MATERIALS.plasticBlack);
  cap.position.y = H + 0.03; g.add(cap);
  const liquid = makeLiquid({ rTop: R - 0.014, rBottom: R - 0.014, maxHeight: H - 0.08, yBase: 0.02, color: 0xd8e7e2 });
  g.add(liquid.mesh);
  g.userData.liquid = liquid;
  return tagGroup(g, { name, type: 'vial', action: 'VIAL' });
}

export { graduationTexture, labelTexture, tagGroup, lathe, vec };
