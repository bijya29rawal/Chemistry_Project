/**
 * laboratory.js — builds the room and lays out every piece of apparatus.
 *
 * Layout rules enforced here:
 *  • the conical flask sits directly under the burette delivery tip,
 *  • nothing floats: every object rests on the bench top at y = 9.0,
 *  • instruments have their probes positioned over their own beakers.
 */

import * as THREE from 'three';
import { REAGENTS, SAMPLES } from './data.js';
import {
  MATERIALS, createBeaker, createConicalFlask, createVolumetricFlask,
  createMeasuringCylinder, createBurette, createPipette, createTestTubeRack,
  createReagentBottle, createWashBottle, createFunnel, createGlassRod,
  createDropper, createSampleVial,
} from './glassware.js';
import {
  createBuretteStand, createPHMeter, createConductivityMeter, createTurbidityMeter,
  createBalance, createMagneticStirrer, createThermometer, createStopwatch, createWasteJar,
} from './equipment.js';

export const BENCH_TOP_Y = 9.0;

export class Laboratory {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.objects = {};       // logical name -> THREE.Group
    this.interactive = [];   // groups eligible for raycasting
    this.scene.add(this.root);
    this.buildRoom();
    this.buildTitrationStation();
    this.buildReagentShelfArea();
    this.buildInstrumentStation();
    this.buildPreparationStation();
    this.buildAccessories();
  }

  register(key, group) {
    this.objects[key] = group;
    group.userData.key = key;
    if (group.userData.interactive) this.interactive.push(group);
    return group;
  }

  add(group, x, y, z) {
    group.position.set(x, y, z);
    this.root.add(group);
    return group;
  }

  /* -------------------- room -------------------- */

  buildRoom() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(46, 34),
      new THREE.MeshStandardMaterial({ color: 0xb9b3a7, roughness: 0.92 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.root.add(floor);

    // tiled wall behind the bench
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xdfe3e0, roughness: 0.85 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(46, 26, 0.4), wallMat);
    wall.position.set(0, 13, -3.6);
    wall.receiveShadow = true;
    this.root.add(wall);

    // dado band so the wall is not a flat sheet of colour
    const dado = new THREE.Mesh(
      new THREE.BoxGeometry(46, 2.4, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x8fa3a8, roughness: 0.7 }),
    );
    dado.position.set(0, 10.6, -3.39);
    this.root.add(dado);

    const sideWallGeo = new THREE.BoxGeometry(0.4, 26, 34);
    for (const x of [-23, 23]) {
      const sw = new THREE.Mesh(sideWallGeo, wallMat);
      sw.position.set(x, 13, 0);
      this.root.add(sw);
    }

    // bench carcass and black epoxy top
    const carcass = new THREE.Mesh(
<<<<<<< HEAD
      new THREE.BoxGeometry(20, 8.6, 5.4),
=======
      new THREE.BoxGeometry(17, 8.6, 5.4),
>>>>>>> 3ce52104b60cd5dd5d3974bb0041877056bfc956
      new THREE.MeshStandardMaterial({ color: 0x8c6d4f, roughness: 0.8 }),
    );
    carcass.position.set(0, 4.3, -0.6);
    carcass.castShadow = true; carcass.receiveShadow = true;
    this.root.add(carcass);

    const top = new THREE.Mesh(
<<<<<<< HEAD
      new THREE.BoxGeometry(20.6, 0.4, 5.8),
=======
      new THREE.BoxGeometry(17.6, 0.4, 5.8),
>>>>>>> 3ce52104b60cd5dd5d3974bb0041877056bfc956
      new THREE.MeshStandardMaterial({ color: 0x2b2f31, roughness: 0.45, metalness: 0.05 }),
    );
    top.position.set(0, BENCH_TOP_Y - 0.2, -0.6);
    top.receiveShadow = true; top.castShadow = true;
    this.root.add(top);
    this.benchTop = top;

    // drawer fronts
<<<<<<< HEAD
    for (let i = -4; i <= 4; i++) {
=======
    for (let i = -3; i <= 3; i++) {
>>>>>>> 3ce52104b60cd5dd5d3974bb0041877056bfc956
      const d = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 1.0, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x9a7a58, roughness: 0.7 }),
      );
      d.position.set(i * 2.35, 7.6, 2.05);
      this.root.add(d);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 10), MATERIALS.steel);
      handle.rotation.z = Math.PI / 2;
      handle.position.set(i * 2.35, 7.6, 2.12);
      this.root.add(handle);
    }

    // wall shelf with spare stock bottles
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0xe6e2d8, roughness: 0.7 });
<<<<<<< HEAD
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(19, 0.16, 1.5), shelfMat);
    shelf.position.set(0, 13.4, -2.8);
    shelf.castShadow = true; shelf.receiveShadow = true;
    this.root.add(shelf);
    for (const x of [-9, 0, 9]) {
=======
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(16, 0.16, 1.5), shelfMat);
    shelf.position.set(0, 13.4, -2.8);
    shelf.castShadow = true; shelf.receiveShadow = true;
    this.root.add(shelf);
    for (const x of [-7.6, 0, 7.6]) {
>>>>>>> 3ce52104b60cd5dd5d3974bb0041877056bfc956
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 1.3), shelfMat);
      bracket.position.set(x, 12.8, -2.85);
      this.root.add(bracket);
    }
    const stockColors = [0xdfe9ee, 0xe9e3d6, 0xd7e6df, 0xe7d9e2, 0xdde4ee, 0xe4e9d8];
<<<<<<< HEAD
    for (let i = 0; i < 14; i++) {
=======
    for (let i = 0; i < 12; i++) {
>>>>>>> 3ce52104b60cd5dd5d3974bb0041877056bfc956
      const b = createReagentBottle({
        name: 'Stock', subtitle: '', color: stockColors[i % stockColors.length],
        height: 0.8 + (i % 3) * 0.12, radius: 0.19, amber: i % 4 === 0,
      });
      b.userData.interactive = false;
<<<<<<< HEAD
      b.position.set(-8.3 + i * 1.28, 13.48, -2.8);
=======
      b.position.set(-7 + i * 1.28, 13.48, -2.8);
>>>>>>> 3ce52104b60cd5dd5d3974bb0041877056bfc956
      this.root.add(b);
    }

    // sink at the right-hand end of the bench
    const sink = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.5, 1.8),
      new THREE.MeshStandardMaterial({ color: 0xa7adb0, roughness: 0.35, metalness: 0.7 }),
    );
<<<<<<< HEAD
    sink.position.set(8.9, BENCH_TOP_Y - 0.25, -1.1);
    this.root.add(sink);
    const tapCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(8.9, BENCH_TOP_Y, -2.0), new THREE.Vector3(8.9, BENCH_TOP_Y + 1.4, -2.0),
      new THREE.Vector3(8.9, BENCH_TOP_Y + 1.7, -1.6), new THREE.Vector3(8.9, BENCH_TOP_Y + 1.5, -1.15),
=======
    sink.position.set(7.4, BENCH_TOP_Y - 0.25, -1.1);
    this.root.add(sink);
    const tapCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(7.4, BENCH_TOP_Y, -2.0), new THREE.Vector3(7.4, BENCH_TOP_Y + 1.4, -2.0),
      new THREE.Vector3(7.4, BENCH_TOP_Y + 1.7, -1.6), new THREE.Vector3(7.4, BENCH_TOP_Y + 1.5, -1.15),
>>>>>>> 3ce52104b60cd5dd5d3974bb0041877056bfc956
    ]);
    const tap = new THREE.Mesh(new THREE.TubeGeometry(tapCurve, 20, 0.06, 10, false), MATERIALS.steel);
    this.root.add(tap);
  }

  /* -------------------- titration station -------------------- */

  buildTitrationStation() {
<<<<<<< HEAD
    const X = -1.5;
=======
    const X = -1.0;
>>>>>>> 3ce52104b60cd5dd5d3974bb0041877056bfc956

    const stand = createBuretteStand({ rodHeight: 5.6 });
    stand.rotation.y = -Math.PI / 2;    // rod to the back, clamp facing the front
    this.add(stand, X, BENCH_TOP_Y, 0);
    this.register('stand', stand);

    // white tile on the stand base — makes the endpoint colour readable
    const tile = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.03, 0.75),
      new THREE.MeshStandardMaterial({ color: 0xf3f1ea, roughness: 0.6 }),
    );
    tile.position.set(X, BENCH_TOP_Y + 0.115, 0.02);
    tile.receiveShadow = true;
    this.root.add(tile);

    const flask = createConicalFlask({ capacity: 250 });
    this.add(flask, X, BENCH_TOP_Y + 0.13, 0.02);
    this.register('flask', flask);

    // Burette: its tip is placed 0.34 units above the flask mouth, on the
    // same vertical axis as the flask. This is the mandatory relationship.
    const burette = createBurette({ capacity: 50 });
    const flaskMouthY = BENCH_TOP_Y + 0.13 + flask.userData.mouthY;
    const buretteY = flaskMouthY + 0.34 - burette.userData.tipY;
    this.add(burette, X, buretteY, 0.02);
    this.register('burette', burette);
    this.tipWorld = new THREE.Vector3(X, buretteY + burette.userData.tipY, 0.02);

    const stirrer = createMagneticStirrer();
<<<<<<< HEAD
    this.add(stirrer, X + 2.0, BENCH_TOP_Y, 0.3);
    this.register('stirrer', stirrer);

    const pipette = createPipette();
    this.add(pipette, X + 1.0, BENCH_TOP_Y, 1.9);
=======
    this.add(stirrer, X + 2.0, BENCH_TOP_Y, 0.4);
    this.register('stirrer', stirrer);

    const pipette = createPipette();
    this.add(pipette, X + 1.0, BENCH_TOP_Y, 1.55);
>>>>>>> 3ce52104b60cd5dd5d3974bb0041877056bfc956
    pipette.rotation.z = 0.0;
    this.register('pipette', pipette);
    pipette.userData.home = pipette.position.clone();

    const wash = createWashBottle();
<<<<<<< HEAD
    this.add(wash, X - 1.3, BENCH_TOP_Y, 1.8);
=======
    this.add(wash, X - 1.15, BENCH_TOP_Y, 1.5);
>>>>>>> 3ce52104b60cd5dd5d3974bb0041877056bfc956
    this.register('washbottle', wash);
  }

  /* -------------------- reagents and samples -------------------- */

  buildReagentShelfArea() {
    const bigs = [
      ['edta', 'EDTA', '0.01 M', '#2c5f86'],
      ['hcl', 'HCl', '0.02 N', '#8a4b2a'],
      ['naoh', 'NaOH', '0.02 N', '#3d6b4a'],
      ['agno3', 'AgNO3', '0.0141 N', '#6b4b2a'],
    ];
    bigs.forEach(([key, title, sub, accent], i) => {
      const r = REAGENTS[key];
      const b = createReagentBottle({
        name: title, subtitle: sub, color: r.color, accent,
        amber: key === 'agno3', height: 0.95, radius: 0.23,
        action: `ADD_${key}`,
      });
      b.userData.reagentKey = key;
      b.userData.name = r.name;
<<<<<<< HEAD
      this.add(b, -6.2 + i * 0.85, BENCH_TOP_Y, -2.0);
=======
      this.add(b, -4.9 + i * 0.78, BENCH_TOP_Y, -2.0);
>>>>>>> 3ce52104b60cd5dd5d3974bb0041877056bfc956
      this.register(`bottle_${key}`, b);
    });

    const smalls = [
      ['buffer', 'Buffer', 'pH 10', '#2c5f86'],
      ['ebt', 'EBT', 'indicator', '#5c2340'],
      ['phenolphthalein', 'Ph.ph', 'indicator', '#8e3a63'],
      ['methylorange', 'M.O.', 'indicator', '#b5651d'],
      ['k2cro4', 'K2CrO4', '5 %', '#9a7f16'],
    ];
    smalls.forEach(([key, title, sub, accent], i) => {
      const r = REAGENTS[key];
      const b = createReagentBottle({
        name: title, subtitle: sub, color: r.color, accent,
        height: 0.62, radius: 0.16, action: `ADD_${key}`,
      });
      b.userData.reagentKey = key;
      b.userData.name = r.name;
<<<<<<< HEAD
      this.add(b, -6.2 + i * 0.7, BENCH_TOP_Y, -1.1);
=======
      this.add(b, -4.9 + i * 0.62, BENCH_TOP_Y, -1.15);
>>>>>>> 3ce52104b60cd5dd5d3974bb0041877056bfc956
      this.register(`bottle_${key}`, b);
    });

    // water samples
    const order = ['distilled', 'tap', 'natural', 'standard_hard', 'unknown'];
    const short = { distilled: 'Distilled', tap: 'Tap', natural: 'Natural', standard_hard: 'Std hard', unknown: 'Unknown' };
    order.forEach((key, i) => {
      const s = SAMPLES[key];
      const b = createReagentBottle({
        name: short[key], subtitle: 'sample', color: s.color, accent: '#1f6d5f',
        height: 0.9, radius: 0.22, action: 'SELECT_SAMPLE',
      });
      b.userData.sampleKey = key;
      b.userData.name = s.name;
<<<<<<< HEAD
      this.add(b, 1.6 + i * 0.85, BENCH_TOP_Y, -2.0);
=======
      this.add(b, 1.4 + i * 0.8, BENCH_TOP_Y, -2.0);
>>>>>>> 3ce52104b60cd5dd5d3974bb0041877056bfc956
      this.register(`sample_${key}`, b);
    });
  }

  /* -------------------- instruments -------------------- */

  buildInstrumentStation() {
    const ph = createPHMeter();
<<<<<<< HEAD
    this.add(ph, 2.6, BENCH_TOP_Y, 0.2);
=======
    this.add(ph, 1.9, BENCH_TOP_Y, 0.4);
>>>>>>> 3ce52104b60cd5dd5d3974bb0041877056bfc956
    this.register('phmeter', ph);

    // beaker directly under the pH electrode
    const phBeaker = createBeaker({ name: 'Beaker 100 mL (pH)', capacity: 100, radius: 0.33, height: 0.62, action: 'BEAKER' });
<<<<<<< HEAD
    this.add(phBeaker, 2.6 + 1.34, BENCH_TOP_Y, 0.2);
    this.register('beaker_ph', phBeaker);

    const cond = createConductivityMeter();
    this.add(cond, 5.6, BENCH_TOP_Y, -0.35);
    this.register('condmeter', cond);

    const condBeaker = createBeaker({ name: 'Beaker 100 mL (EC)', capacity: 100, radius: 0.33, height: 0.62, action: 'BEAKER' });
    this.add(condBeaker, 5.6 + 0.95, BENCH_TOP_Y, -0.35);
    this.register('beaker_cond', condBeaker);

    const turb = createTurbidityMeter();
    this.add(turb, 7.9, BENCH_TOP_Y, 0.9);
    this.register('turbmeter', turb);

    const vial = createSampleVial();
    this.add(vial, 6.9, BENCH_TOP_Y, 1.8);
=======
    this.add(phBeaker, 1.9 + 1.34, BENCH_TOP_Y, 0.4);
    this.register('beaker_ph', phBeaker);

    const cond = createConductivityMeter();
    this.add(cond, 4.6, BENCH_TOP_Y, -0.35);
    this.register('condmeter', cond);

    const condBeaker = createBeaker({ name: 'Beaker 100 mL (EC)', capacity: 100, radius: 0.33, height: 0.62, action: 'BEAKER' });
    this.add(condBeaker, 4.6 + 0.95, BENCH_TOP_Y, -0.35);
    this.register('beaker_cond', condBeaker);

    const turb = createTurbidityMeter();
    this.add(turb, 6.3, BENCH_TOP_Y, 1.2);
    this.register('turbmeter', turb);

    const vial = createSampleVial();
    this.add(vial, 5.4, BENCH_TOP_Y, 1.6);
>>>>>>> 3ce52104b60cd5dd5d3974bb0041877056bfc956
    this.register('vial', vial);
    vial.userData.home = vial.position.clone();

    const thermo = createThermometer();
<<<<<<< HEAD
    this.add(thermo, 4.0, BENCH_TOP_Y, 1.8);
=======
    this.add(thermo, 3.1, BENCH_TOP_Y, 1.6);
>>>>>>> 3ce52104b60cd5dd5d3974bb0041877056bfc956
    thermo.rotation.z = 0.12;
    this.register('thermometer', thermo);

    const timer = createStopwatch();
<<<<<<< HEAD
    this.add(timer, 3.0, BENCH_TOP_Y, 1.8);
=======
    this.add(timer, 2.3, BENCH_TOP_Y, 1.7);
>>>>>>> 3ce52104b60cd5dd5d3974bb0041877056bfc956
    this.register('timer', timer);
  }

  /* -------------------- preparation station -------------------- */

  buildPreparationStation() {
    const balance = createBalance();
<<<<<<< HEAD
    this.add(balance, -8.0, BENCH_TOP_Y, -0.2);
    this.register('balance', balance);

    const volumetric = createVolumetricFlask();
    this.add(volumetric, -8.0, BENCH_TOP_Y, 1.5);
    this.register('volumetric', volumetric);

    const funnel = createFunnel();
    this.add(funnel, -6.9, BENCH_TOP_Y, 1.6);
    this.register('funnel', funnel);

    const prepBeaker = createBeaker({ name: 'Beaker 250 mL', capacity: 250, radius: 0.4, height: 0.68 });
    this.add(prepBeaker, -5.9, BENCH_TOP_Y, 1.6);
    this.register('beaker_prep', prepBeaker);

    const cylinder = createMeasuringCylinder({ capacity: 100 });
    this.add(cylinder, -4.8, BENCH_TOP_Y, 1.6);
=======
    this.add(balance, -6.6, BENCH_TOP_Y, -0.3);
    this.register('balance', balance);

    const volumetric = createVolumetricFlask();
    this.add(volumetric, -6.3, BENCH_TOP_Y, 1.3);
    this.register('volumetric', volumetric);

    const funnel = createFunnel();
    this.add(funnel, -5.4, BENCH_TOP_Y, 1.5);
    this.register('funnel', funnel);

    const prepBeaker = createBeaker({ name: 'Beaker 250 mL', capacity: 250, radius: 0.4, height: 0.68 });
    this.add(prepBeaker, -4.6, BENCH_TOP_Y, 1.4);
    this.register('beaker_prep', prepBeaker);

    const cylinder = createMeasuringCylinder({ capacity: 100 });
    this.add(cylinder, -3.6, BENCH_TOP_Y, 1.4);
>>>>>>> 3ce52104b60cd5dd5d3974bb0041877056bfc956
    this.register('cylinder', cylinder);
  }

  /* -------------------- odds and ends -------------------- */

  buildAccessories() {
    const rack = createTestTubeRack({ count: 6 });
<<<<<<< HEAD
    this.add(rack, -2.2, BENCH_TOP_Y, -2.0);
=======
    this.add(rack, -2.4, BENCH_TOP_Y, -2.0);
>>>>>>> 3ce52104b60cd5dd5d3974bb0041877056bfc956
    this.register('rack', rack);

    const rod = createGlassRod();
    rod.rotation.z = Math.PI / 2;
    rod.rotation.y = 0.35;
<<<<<<< HEAD
    this.add(rod, -3.7, BENCH_TOP_Y + 0.025, 2.1);
    this.register('rod', rod);

    const dropper = createDropper();
    this.add(dropper, -2.9, BENCH_TOP_Y, 2.0);
=======
    this.add(rod, -2.6, BENCH_TOP_Y + 0.025, 1.7);
    this.register('rod', rod);

    const dropper = createDropper();
    this.add(dropper, -1.9, BENCH_TOP_Y, 1.85);
>>>>>>> 3ce52104b60cd5dd5d3974bb0041877056bfc956
    dropper.rotation.z = 0.25;
    this.register('dropper', dropper);

    const waste = createWasteJar();
<<<<<<< HEAD
    this.add(waste, 8.9, BENCH_TOP_Y, 1.3);
=======
    this.add(waste, 7.4, BENCH_TOP_Y, 0.9);
>>>>>>> 3ce52104b60cd5dd5d3974bb0041877056bfc956
    this.register('waste', waste);
  }

  /* -------------------- helpers used by the experiment layer -------------------- */

  /** World position of the burette delivery tip. */
  getBuretteTip() {
    const b = this.objects.burette;
    const v = new THREE.Vector3(0, b.userData.tipY, 0);
    return b.localToWorld(v);
  }

  /** Mouth of the conical flask in world space. */
  getFlaskMouth() {
    const f = this.objects.flask;
    return f.localToWorld(new THREE.Vector3(0, f.userData.mouthY, 0));
  }

  /** The beaker an instrument experiment should use. */
  beakerFor(experimentId) {
    if (experimentId === 'conductivity' || experimentId === 'tds') return this.objects.beaker_cond;
    return this.objects.beaker_ph;
  }

  /** The sample bottle currently chosen. */
  sampleBottle(key) { return this.objects[`sample_${key}`]; }

  dispose() {
    this.root.traverse((o) => {
      if (o.isMesh) {
        o.geometry?.dispose?.();
      }
    });
    this.scene.remove(this.root);
  }
}
