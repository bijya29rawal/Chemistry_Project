/**
 * equipment.js — non-glassware hardware: stands, clamps, instruments.
 *
 * Instruments expose userData.display.set(line1, line2) so the measurement
 * animations can drive a real seven-segment style readout.
 */

import * as THREE from 'three';
import { MATERIALS, tagGroup, lathe, vec } from './glassware.js';

/* ------------------------------------------------------------------ */
/* Digital display panel                                               */
/* ------------------------------------------------------------------ */

function createDisplay({ width = 0.62, height = 0.3, unit = '' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: tex }),
  );

  function set(main, sub = unit, state = 'on') {
    ctx.fillStyle = state === 'off' ? '#1b2124' : '#16302c';
    ctx.fillRect(0, 0, 512, 256);
    if (state !== 'off') {
      ctx.fillStyle = '#7ef2c8';
      ctx.font = '700 132px "IBM Plex Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(main), 400, 118);
      ctx.font = '500 48px "IBM Plex Mono", monospace';
      ctx.fillStyle = '#4fd0a6';
      ctx.fillText(String(sub), 486, 200);
    }
    tex.needsUpdate = true;
  }
  set('', '', 'off');
  return { mesh, set };
}

/* ------------------------------------------------------------------ */
/* Burette stand with boss-head clamp                                  */
/* ------------------------------------------------------------------ */

export function createBuretteStand({ name = 'Burette stand', rodHeight = 5.6 } = {}) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.8), MATERIALS.darkSteel);
  base.position.y = 0.05; base.castShadow = true; base.receiveShadow = true;
  g.add(base);

  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, rodHeight, 16), MATERIALS.steel);
  rod.position.set(-0.4, rodHeight / 2 + 0.1, 0);
  rod.castShadow = true;
  g.add(rod);

  const boss = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), MATERIALS.darkSteel);
  boss.position.set(-0.4, rodHeight * 0.72, 0);
  g.add(boss);

  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.46, 12), MATERIALS.steel);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(-0.19, rodHeight * 0.72, 0);
  g.add(arm);

  const clamp = new THREE.Group();
  for (const s of [-1, 1]) {
    const jaw = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.018, 8, 20, Math.PI * 1.1), MATERIALS.darkSteel);
    jaw.rotation.x = Math.PI / 2;
    jaw.rotation.z = s > 0 ? -0.55 : Math.PI + 0.55;
    jaw.position.z = 0;
    jaw.position.y = s * 0.001;
    clamp.add(jaw);
  }
  const pad = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.012, 6, 20), MATERIALS.rubber);
  pad.rotation.x = Math.PI / 2;
  clamp.add(pad);
  clamp.position.set(0.02, rodHeight * 0.72, 0);
  g.add(clamp);

  // second clamp lower down for stability
  const clamp2 = clamp.clone();
  clamp2.position.y = rodHeight * 0.46;
  g.add(clamp2);
  const arm2 = arm.clone(); arm2.position.y = rodHeight * 0.46; g.add(arm2);
  const boss2 = boss.clone(); boss2.position.y = rodHeight * 0.46; g.add(boss2);

  g.userData.clampY = rodHeight * 0.72;
  return tagGroup(g, { name, type: 'stand', action: 'STAND', interactive: false });
}

/* ------------------------------------------------------------------ */
/* pH meter with a combination electrode on its own stand              */
/* ------------------------------------------------------------------ */

export function createPHMeter({ name = 'Digital pH meter' } = {}) {
  const g = new THREE.Group();

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.34, 0.8), MATERIALS.plasticWhite);
  body.position.y = 0.17; body.castShadow = true; body.receiveShadow = true;
  g.add(body);
  const wedge = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 0.42), MATERIALS.plasticWhite);
  wedge.position.set(0, 0.42, -0.14);
  wedge.rotation.x = -0.42;
  wedge.castShadow = true;
  g.add(wedge);

  const display = createDisplay({ width: 0.72, height: 0.26, unit: 'pH' });
  display.mesh.position.set(0, 0.47, 0.06);
  display.mesh.rotation.x = -0.42;
  g.add(display.mesh);

  const keys = {};
  const keyDefs = [
    { id: 'power', label: 'PWR', x: -0.38, color: 0xc0392b },
    { id: 'cal', label: 'CAL', x: -0.06, color: 0x2c5f86 },
    { id: 'read', label: 'READ', x: 0.28, color: 0x2e7d5b },
  ];
  for (const k of keyDefs) {
    const key = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.06, 0.16),
      new THREE.MeshStandardMaterial({ color: k.color, roughness: 0.5 }),
    );
    key.position.set(k.x, 0.35, 0.26);
    key.userData.part = k.id;
    key.userData.owner = g;
    g.add(key);
    keys[k.id] = key;
  }

  // electrode on a small stand
  const eStand = new THREE.Group();
  const eBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.5), MATERIALS.darkSteel);
  eBase.position.y = 0.035; eStand.add(eBase);
  const eRod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 12), MATERIALS.steel);
  eRod.position.set(-0.16, 1.2, 0); eStand.add(eRod);
  const eArm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 10), MATERIALS.steel);
  eArm.rotation.z = Math.PI / 2; eArm.position.set(0.09, 1.85, 0); eStand.add(eArm);
  eStand.position.set(1.05, 0, 0);
  g.add(eStand);

  const electrode = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.05, 16), MATERIALS.glass);
  shaft.position.y = 0.55; electrode.add(shaft);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.058, 16, 12), MATERIALS.glass);
  bulb.position.y = 0.03; electrode.add(bulb);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 16), MATERIALS.plasticBlack);
  head.position.y = 1.18; electrode.add(head);
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.3, 0), new THREE.Vector3(-0.1, 1.6, -0.2),
    new THREE.Vector3(-0.7, 1.2, -0.35), new THREE.Vector3(-1.0, 0.25, -0.3),
  ]);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 20, 0.018, 8, false), MATERIALS.plasticBlack);
  electrode.add(cable);
  electrode.position.set(1.34, 1.45, 0);
  electrode.userData.homeY = 1.45;
  g.add(electrode);
  electrode.traverse((c) => { c.userData.owner = g; c.userData.part = 'electrode'; });

  g.userData.display = display;
  g.userData.keys = keys;
  g.userData.electrode = electrode;
  return tagGroup(g, { name, type: 'phmeter', action: 'PHMETER' });
}

/* ------------------------------------------------------------------ */
/* Conductivity / TDS meter                                            */
/* ------------------------------------------------------------------ */

export function createConductivityMeter({ name = 'Conductivity / TDS meter' } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.5, 0.7), MATERIALS.plasticBlue);
  body.position.y = 0.25; body.castShadow = true; body.receiveShadow = true;
  g.add(body);

  const display = createDisplay({ width: 0.66, height: 0.24, unit: 'uS/cm' });
  display.mesh.position.set(0, 0.42, 0.352);
  g.add(display.mesh);

  const keys = {};
  for (const [i, k] of [['power', 0xc0392b], ['read', 0x2e7d5b]].entries()) {
    const key = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.05),
      new THREE.MeshStandardMaterial({ color: k[1], roughness: 0.5 }));
    key.position.set(-0.24 + i * 0.48, 0.16, 0.36);
    key.userData.part = k[0]; key.userData.owner = g;
    g.add(key);
    keys[k[0]] = key;
  }

  const cell = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 14), MATERIALS.plasticBlack);
  shaft.position.y = 0.6; cell.add(shaft);
  const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.22, 14, 1, true), MATERIALS.glass);
  cage.position.y = 0.13; cell.add(cage);
  for (const s of [-1, 1]) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.012), MATERIALS.steel);
    plate.position.set(0, 0.13, s * 0.025);
    cell.add(plate);
  }
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.1, 0), new THREE.Vector3(-0.2, 1.3, -0.2),
    new THREE.Vector3(-0.7, 0.8, -0.3), new THREE.Vector3(-0.95, 0.2, -0.25),
  ]);
  cell.add(new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 18, 0.016, 8, false), MATERIALS.plasticBlack));
  cell.position.set(0.95, 1.3, 0);
  cell.userData.homeY = 1.3;
  g.add(cell);
  cell.traverse((c) => { c.userData.owner = g; c.userData.part = 'cell'; });

  const stand = new THREE.Group();
  const sBase = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.44), MATERIALS.darkSteel);
  sBase.position.y = 0.03; stand.add(sBase);
  const sRod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 12), MATERIALS.steel);
  sRod.position.set(-0.15, 1.1, 0); stand.add(sRod);
  const sArm = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.42, 10), MATERIALS.steel);
  sArm.rotation.z = Math.PI / 2; sArm.position.set(0.05, 1.75, 0); stand.add(sArm);
  stand.position.set(0.78, 0, 0);
  g.add(stand);

  g.userData.display = display;
  g.userData.keys = keys;
  g.userData.cell = cell;
  return tagGroup(g, { name, type: 'conductivity', action: 'CONDMETER' });
}

/* ------------------------------------------------------------------ */
/* Nephelometric turbidity meter                                       */
/* ------------------------------------------------------------------ */

export function createTurbidityMeter({ name = 'Turbidity meter (nephelometer)' } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.62, 0.8), MATERIALS.plasticWhite);
  body.position.y = 0.31; body.castShadow = true; body.receiveShadow = true;
  g.add(body);

  const display = createDisplay({ width: 0.6, height: 0.24, unit: 'NTU' });
  display.mesh.position.set(-0.15, 0.5, 0.402);
  g.add(display.mesh);

  const well = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.45, 20, 1, true), MATERIALS.plasticBlack);
  well.position.set(0.32, 0.4, 0);
  g.add(well);
  const wellFloor = new THREE.Mesh(new THREE.CircleGeometry(0.14, 20), MATERIALS.plasticBlack);
  wellFloor.rotation.x = -Math.PI / 2; wellFloor.position.set(0.32, 0.18, 0);
  g.add(wellFloor);

  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 20), MATERIALS.plasticBlack);
  lid.position.set(0.32, 0.66, 0);
  lid.userData.part = 'lid'; lid.userData.owner = g;
  g.add(lid);

  const keys = {};
  for (const [i, k] of [['power', 0xc0392b], ['cal', 0x2c5f86], ['read', 0x2e7d5b]].entries()) {
    const key = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.06, 0.05),
      new THREE.MeshStandardMaterial({ color: k[1], roughness: 0.5 }));
    key.position.set(-0.36 + i * 0.2, 0.2, 0.41);
    key.userData.part = k[0]; key.userData.owner = g;
    g.add(key);
    keys[k[0]] = key;
  }

  g.userData.display = display;
  g.userData.keys = keys;
  g.userData.lid = lid;
  g.userData.wellPosition = new THREE.Vector3(0.32, 0.2, 0);
  return tagGroup(g, { name, type: 'turbidity', action: 'TURBMETER' });
}

/* ------------------------------------------------------------------ */
/* Digital balance                                                     */
/* ------------------------------------------------------------------ */

export function createBalance({ name = 'Digital analytical balance' } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.22, 0.85), MATERIALS.plasticWhite);
  body.position.y = 0.11; body.castShadow = true; body.receiveShadow = true;
  g.add(body);
  const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 28), MATERIALS.steel);
  pan.position.set(0, 0.24, -0.06);
  pan.userData.part = 'pan'; pan.userData.owner = g;
  g.add(pan);
  const display = createDisplay({ width: 0.6, height: 0.2, unit: 'mg' });
  display.mesh.position.set(0, 0.12, 0.427);
  g.add(display.mesh);
  const tare = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.05), MATERIALS.plasticBlack);
  tare.position.set(0.32, 0.03, 0.43);
  tare.userData.part = 'tare'; tare.userData.owner = g;
  g.add(tare);
  g.userData.display = display;
  g.userData.panY = 0.25;
  return tagGroup(g, { name, type: 'balance', action: 'BALANCE' });
}

/* ------------------------------------------------------------------ */
/* Magnetic stirrer (also the platform under the titration flask)      */
/* ------------------------------------------------------------------ */

export function createMagneticStirrer({ name = 'Magnetic stirrer' } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 1.0), MATERIALS.plasticWhite);
  body.position.y = 0.11; body.castShadow = true; body.receiveShadow = true;
  g.add(body);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.03, 32), MATERIALS.steel);
  plate.position.y = 0.235;
  g.add(plate);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 18), MATERIALS.plasticBlack);
  knob.position.set(0.44, 0.24, 0.34);
  knob.userData.part = 'speed'; knob.userData.owner = g;
  g.add(knob);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x3b3f42, emissive: 0x000000 }));
  led.position.set(-0.44, 0.24, 0.34);
  g.add(led);
  g.userData.led = led;
  g.userData.plateY = 0.25;
  g.userData.running = false;
  return tagGroup(g, { name, type: 'stirrer', action: 'STIRRER' });
}

/* ------------------------------------------------------------------ */
/* Thermometer, stopwatch, waste jar                                   */
/* ------------------------------------------------------------------ */

export function createThermometer({ name = 'Thermometer −10 to 110 °C' } = {}) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.4, 14), MATERIALS.glass);
  stem.position.y = 0.72; g.add(stem);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.042, 14, 10),
    new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.3 }));
  bulb.position.y = 0.04; g.add(bulb);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.7, 8),
    new THREE.MeshStandardMaterial({ color: 0xc0392b }));
  column.position.y = 0.4; g.add(column);
  return tagGroup(g, { name, type: 'thermometer', action: 'THERMOMETER' });
}

export function createStopwatch({ name = 'Laboratory timer' } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.34), MATERIALS.plasticBlack);
  body.position.y = 0.04; body.castShadow = true; g.add(body);
  const display = createDisplay({ width: 0.26, height: 0.1, unit: 's' });
  display.mesh.rotation.x = -Math.PI / 2;
  display.mesh.position.set(0, 0.081, -0.02);
  g.add(display.mesh);
  g.userData.display = display;
  return tagGroup(g, { name, type: 'timer', action: 'TIMER' });
}

export function createWasteJar({ name = 'Waste container' } = {}) {
  const g = new THREE.Group();
  const R = 0.42, H = 0.9;
  g.add(lathe([vec(0, 0), vec(R, 0.03), vec(R, H), vec(R - 0.016, H), vec(R - 0.016, 0.05), vec(0, 0.03)], 28,
    new THREE.MeshPhysicalMaterial({
      color: 0xd7dcd4, transparent: true, opacity: 0.38, roughness: 0.3,
      side: THREE.DoubleSide, depthWrite: false,
    })));
  const collar = new THREE.Mesh(new THREE.TorusGeometry(R, 0.022, 8, 28), MATERIALS.plasticBlack);
  collar.rotation.x = Math.PI / 2; collar.position.y = H; g.add(collar);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.2),
    new THREE.MeshBasicMaterial({ color: 0xf2c14e }));
  label.position.set(0, H * 0.55, R + 0.005);
  g.add(label);
  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(R - 0.03, R - 0.03, 0.3, 24),
    new THREE.MeshPhysicalMaterial({ color: 0x9fb0a6, transparent: true, opacity: 0.6, roughness: 0.2 }),
  );
  liquid.position.y = 0.2;
  g.add(liquid);
  g.userData.wasteLiquid = liquid;
  return tagGroup(g, { name, type: 'waste', action: 'WASTE' });
}

export { createDisplay };
