/**
 * controls.js — OrbitControls configured for a bench-top scene.
 *
 * The polar angle is clamped so the student cannot end up under the bench or
 * looking straight down on it; panning is limited to the working area.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createControls(camera, domElement) {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.rotateSpeed = 0.55;
  controls.panSpeed = 0.7;
  controls.zoomSpeed = 0.85;
  controls.screenSpacePanning = true;
  controls.minDistance = 1.8;
  controls.maxDistance = 34;
  controls.minPolarAngle = 0.35;       // never straight down
  controls.maxPolarAngle = Math.PI / 2 - 0.02;  // never below the bench
  controls.target.set(0, 10.6, -0.2);

  const minPan = new THREE.Vector3(-10.5, 8.6, -3.0);
  const maxPan = new THREE.Vector3(10.5, 16.0, 3.4);
  controls.addEventListener('change', () => {
    controls.target.clamp(minPan, maxPan);
  });

  controls.update();
  return controls;
}
