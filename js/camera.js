/**
 * camera.js — the laboratory camera.
 *
 * The default view is a three-quarter front view of the bench at roughly
 * standing eye height, never a top-down view.
 */

import * as THREE from 'three';

export const VIEWS = {
<<<<<<< HEAD
  overview: { position: new THREE.Vector3(0.4, 13.8, 13.2), target: new THREE.Vector3(0, 10.6, -0.2) },
  titration: { position: new THREE.Vector3(-1.2, 13.2, 9.0), target: new THREE.Vector3(-1.5, 11.8, 0.0) },
  instruments: { position: new THREE.Vector3(5.4, 12.6, 8.2), target: new THREE.Vector3(5.2, 9.9, 0.3) },
  preparation: { position: new THREE.Vector3(-6.4, 12.4, 7.4), target: new THREE.Vector3(-6.4, 9.9, 0.8) },
  burette: { position: new THREE.Vector3(-1.4, 12.6, 6.4), target: new THREE.Vector3(-1.5, 11.4, 0.0) },
=======
  overview: { position: new THREE.Vector3(1.2, 13.4, 12.6), target: new THREE.Vector3(0, 10.4, -0.2) },
  titration: { position: new THREE.Vector3(-0.6, 12.6, 5.2), target: new THREE.Vector3(-1.0, 11.0, 0.0) },
  instruments: { position: new THREE.Vector3(4.2, 12.2, 6.0), target: new THREE.Vector3(3.4, 9.9, 0.1) },
  preparation: { position: new THREE.Vector3(-5.2, 12.0, 5.6), target: new THREE.Vector3(-5.6, 9.9, 0.4) },
  burette: { position: new THREE.Vector3(-0.9, 11.6, 3.4), target: new THREE.Vector3(-1.0, 10.6, 0.0) },
>>>>>>> 3ce52104b60cd5dd5d3974bb0041877056bfc956
};

export class LabCamera {
  constructor(container) {
    this.camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 400);
    this.container = container;
    this.controls = null;
    this.applyView('overview');
  }

  attachControls(controls) { this.controls = controls; }

  applyView(name) {
    const v = VIEWS[name] || VIEWS.overview;
    this.camera.position.copy(v.position);
    this.camera.lookAt(v.target);
    if (this.controls) {
      this.controls.target.copy(v.target);
      this.controls.update();
    }
  }

  /** Smoothly glide to a view preset. */
  flyTo(position, target, animator, duration = 1.0) {
    const startPos = this.camera.position.clone();
    const startTarget = this.controls ? this.controls.target.clone() : new THREE.Vector3();
    return animator.tween({
      duration,
      onUpdate: (e) => {
        this.camera.position.lerpVectors(startPos, position, e);
        if (this.controls) {
          this.controls.target.lerpVectors(startTarget, target, e);
          this.controls.update();
        }
      },
    });
  }

  flyToView(name, animator) {
    const v = VIEWS[name] || VIEWS.overview;
    return this.flyTo(v.position.clone(), v.target.clone(), animator);
  }

  /** Frame a selected object without losing the sense of the room. */
  focusOn(object3D, animator) {
    const box = new THREE.Box3().setFromObject(object3D);
    if (box.isEmpty()) return Promise.resolve();
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    const dist = Math.max(2.6, size * 1.9);
    const dir = new THREE.Vector3(0.25, 0.42, 1).normalize();
    const pos = center.clone().add(dir.multiplyScalar(dist));
    return this.flyTo(pos, center, animator, 0.85);
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
