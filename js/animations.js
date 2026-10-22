/**
 * animations.js — a small promise-based tween engine plus the reusable
 * laboratory effects (droplets, pouring streams, swirling, stirring,
 * instrument stabilisation).
 *
 * Nothing here creates geometry per frame: droplets come from a pool and the
 * pour stream is a single reused mesh.
 */

import * as THREE from 'three';
import { CONFIG } from './data.js';

export const EASE = {
  linear: (t) => t,
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  out: (t) => 1 - (1 - t) ** 2,
  in: (t) => t * t,
};

export class Animator {
  constructor(scene) {
    this.scene = scene;
    this.tweens = [];
    this.tickers = new Set();
    this.paused = false;
    this.dropPool = [];
    this.activeDrops = [];
    this._initEffects();
  }

  get speed() { return CONFIG.reducedMotion ? 3 : CONFIG.animationSpeed; }

  _initEffects() {
    this.dropGeometry = new THREE.SphereGeometry(0.035, 16, 12);
    this.dropMaterialTemplate = new THREE.MeshPhysicalMaterial({
      color: 0xdff0f6, transparent: true, opacity: 0.92, roughness: 0.02,
      clearcoat: 1.0, clearcoatRoughness: 0.02, ior: 1.333,
    });

    // reusable pour stream
    const streamGeo = new THREE.CylinderGeometry(0.03, 0.045, 1, 18, 1, true);
    streamGeo.translate(0, -0.5, 0); // pivot at the top
    this.stream = new THREE.Mesh(streamGeo, new THREE.MeshPhysicalMaterial({
      color: 0xcfe7f2, transparent: true, opacity: 0.82, roughness: 0.02,
      clearcoat: 0.9, depthWrite: false, ior: 1.333,
    }));
    this.stream.visible = false;
    this.scene.add(this.stream);
  }

  /* ---------------- core loop ---------------- */

  update(deltaSeconds) {
    if (this.paused) return;
    const dt = deltaSeconds * this.speed;
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.elapsed += dt;
      const t = Math.min(1, tw.elapsed / tw.duration);
      tw.onUpdate(tw.ease(t), t);
      if (t >= 1) {
        this.tweens.splice(i, 1);
        tw.resolve();
      }
    }
    for (const fn of this.tickers) fn(dt);
    this._updateDrops(dt);
  }

  /* ---------------- primitives ---------------- */

  tween({ duration = 1, ease = EASE.inOut, onUpdate = () => {} }) {
    return new Promise((resolve) => {
      this.tweens.push({ duration: Math.max(0.0001, duration), ease, onUpdate, elapsed: 0, resolve });
    });
  }

  wait(seconds) { return this.tween({ duration: seconds, ease: EASE.linear }); }

  /** Cancel every running tween (used by Reset). */
  clear() {
    for (const tw of this.tweens) tw.resolve();
    this.tweens.length = 0;
    for (const d of this.activeDrops) d.mesh.visible = false;
    this.activeDrops.length = 0;
    this.stream.visible = false;
  }

  moveTo(object, target, duration = 1, ease = EASE.inOut) {
    const start = object.position.clone();
    const end = target.clone();
    return this.tween({
      duration, ease,
      onUpdate: (e) => { object.position.lerpVectors(start, end, e); },
    });
  }

  /** Move along an arc so glassware lifts before it travels. */
  arcTo(object, target, duration = 1.2, lift = 0.9) {
    const start = object.position.clone();
    const end = target.clone();
    return this.tween({
      duration, ease: EASE.inOut,
      onUpdate: (e) => {
        object.position.lerpVectors(start, end, e);
        object.position.y += Math.sin(e * Math.PI) * lift;
      },
    });
  }

  rotateTo(object, euler, duration = 0.6) {
    const start = object.rotation.clone();
    return this.tween({
      duration,
      onUpdate: (e) => {
        object.rotation.x = THREE.MathUtils.lerp(start.x, euler.x, e);
        object.rotation.y = THREE.MathUtils.lerp(start.y, euler.y, e);
        object.rotation.z = THREE.MathUtils.lerp(start.z, euler.z, e);
      },
    });
  }

  /** Animate a liquid api from one fill fraction to another. */
  fillTo(liquid, to, duration = 1.2, ease = EASE.inOut) {
    const from = liquid.fraction;
    return this.tween({ duration, ease, onUpdate: (e) => liquid.setFill(from + (to - from) * e) });
  }

  /** Gradual colour change of a liquid. */
  colorTo(liquid, target, duration = 0.8) {
    const from = liquid.getColor();
    const to = new THREE.Color(target);
    const tmp = new THREE.Color();
    return this.tween({
      duration,
      onUpdate: (e) => { tmp.copy(from).lerp(to, e); liquid.setColor(tmp); },
    });
  }

  /* ---------------- droplets ---------------- */

  _getDrop() {
    let drop = this.dropPool.pop();
    if (!drop) {
      const mesh = new THREE.Mesh(this.dropGeometry, this.dropMaterialTemplate.clone());
      this.scene.add(mesh);
      drop = { mesh };
    }
    drop.mesh.visible = true;
    return drop;
  }

  /**
   * Emit one falling droplet from `from` to `to`.
   * The drop stretches slightly as it accelerates, like a real drop.
   */
  emitDrop(from, to, color = 0xdff0f6, duration = 0.42) {
    const drop = this._getDrop();
    drop.mesh.material.color.set(color);
    drop.mesh.position.copy(from);
    drop.from = from.clone();
    drop.to = to.clone();
    drop.t = 0;
    drop.duration = duration;
    this.activeDrops.push(drop);
  }

  _updateDrops(dt) {
    for (let i = this.activeDrops.length - 1; i >= 0; i--) {
      const d = this.activeDrops[i];
      d.t += dt / d.duration;
      const e = Math.min(1, d.t);
      const fall = e * e; // gravity
      d.mesh.position.lerpVectors(d.from, d.to, fall);
      d.mesh.scale.set(1 - 0.25 * fall, 1 + 0.7 * fall, 1 - 0.25 * fall);
      if (e >= 1) {
        d.mesh.visible = false;
        d.mesh.scale.set(1, 1, 1);
        this.activeDrops.splice(i, 1);
        this.dropPool.push(d);
      }
    }
  }

  /* ---------------- pouring stream ---------------- */

  showStream(from, to, color = 0xcfe7f2, radius = 0.04) {
    const length = from.distanceTo(to);
    this.stream.material.color.set(color);
    this.stream.position.copy(from);
    this.stream.scale.set(radius / 0.03, length, radius / 0.03);
    const dir = new THREE.Vector3().subVectors(to, from).normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    this.stream.quaternion.copy(quat);
    this.stream.visible = true;
  }

  hideStream() { this.stream.visible = false; }

  /** Pour from one point to another for a duration, with the stream visible. */
  async pour(from, to, duration = 1.4, color = 0xcfe7f2) {
    this.showStream(from, to, color);
    await this.tween({
      duration, ease: EASE.linear,
      onUpdate: (e) => { this.stream.material.opacity = 0.75 * Math.sin(Math.min(1, e * 1.05) * Math.PI); },
    });
    this.hideStream();
    this.stream.material.opacity = 0.75;
  }

  /* ---------------- swirling and stirring ---------------- */

  /** Tilt-and-rotate swirl of a flask. */
  async swirl(object, cycles = 2, duration = 1.2) {
    const base = object.rotation.clone();
    const liquid = object.userData.liquid?.mesh;
    await this.tween({
      duration, ease: EASE.linear,
      onUpdate: (e) => {
        const a = e * Math.PI * 2 * cycles;
        object.rotation.z = base.z + Math.sin(a) * 0.075;
        object.rotation.x = base.x + Math.cos(a) * 0.075;
        if (liquid) {
          liquid.rotation.z = Math.sin(a) * 0.14;
          liquid.rotation.x = Math.cos(a) * 0.14;
        }
      },
    });
    object.rotation.copy(base);
    if (liquid) { liquid.rotation.set(0, 0, 0); }
  }

  /** Continuous magnetic stirring — returns a stop() function. */
  startStirring(flask, stirrer) {
    const liquid = flask.userData.liquid?.mesh;
    if (stirrer?.userData?.led) stirrer.userData.led.material.color.set(0x35d07f);
    let phase = 0;
    const ticker = (dt) => {
      phase += dt * 5.2;
      if (liquid) {
        liquid.rotation.y = phase;
        liquid.rotation.z = Math.sin(phase) * 0.03;
      }
    };
    this.tickers.add(ticker);
    return () => {
      this.tickers.delete(ticker);
      if (liquid) liquid.rotation.set(0, 0, 0);
      if (stirrer?.userData?.led) stirrer.userData.led.material.color.set(0x3b3f42);
    };
  }

  /* ---------------- instrument readouts ---------------- */

  /**
   * Drive a digital display from a noisy start to a stable final value.
   * Returns the final value so the caller can record it.
   */
  async stabilise({ display, target, unit, dp = 2, duration = 4.5, noise = CONFIG.meterNoise }) {
    await this.tween({
      duration, ease: EASE.linear,
      onUpdate: (e) => {
        const decay = (1 - e) ** 2;
        const jitter = (Math.random() * 2 - 1) * noise * decay * 4;
        const drift = target * (1 - 0.06 * decay);
        display.set((drift + jitter).toFixed(dp), unit);
      },
    });
    display.set(target.toFixed(dp), unit);
    return target;
  }

  /** Blink a display, e.g. while calibrating. */
  async blink({ display, text, unit, times = 4, period = 0.35 }) {
    for (let i = 0; i < times; i++) {
      display.set(text, unit);
      await this.wait(period);
      display.set('', '', 'off');
      await this.wait(period * 0.5);
    }
    display.set(text, unit);
  }

  /* ---------------- bubbles ---------------- */

  /** A short burst of rising bubbles inside a vessel (dissolution, CO2). */
  async bubbles(worldPosition, count = 10, duration = 1.6, color = 0xffffff) {
    for (let i = 0; i < count; i++) {
      const p = worldPosition.clone();
      p.x += (Math.random() - 0.5) * 0.18;
      p.z += (Math.random() - 0.5) * 0.18;
      const top = p.clone(); top.y += 0.25 + Math.random() * 0.15;
      const drop = this._getDrop();
      drop.mesh.material.color.set(color);
      drop.mesh.scale.setScalar(0.4 + Math.random() * 0.4);
      drop.from = p; drop.to = top; drop.t = 0; drop.duration = duration / 2;
      drop.mesh.position.copy(p);
      this.activeDrops.push(drop);
      await this.wait(duration / count / 2);
    }
  }
}
