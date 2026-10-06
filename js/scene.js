/**
 * scene.js — renderer, scene graph root and the lighting rig.
 *
 * The lighting imitates a real laboratory: broad ceiling fluorescents (a
 * hemisphere fill plus one key directional light that casts the shadows) and
 * two soft fills so glassware reads against the dark bench top.
 */

import * as THREE from 'three';

export class LabScene {
  constructor(container) {
    this.container = container;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xcfd6d4);
    this.scene.fog = new THREE.Fog(0xcfd6d4, 38, 72);

    this.addLights();
  }

  addLights() {
    const hemi = new THREE.HemisphereLight(0xf2f6f8, 0x8b8577, 1.15);
    hemi.position.set(0, 24, 0);
    this.scene.add(hemi);

    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xfff6e8, 2.1);
    key.position.set(6, 22, 12);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 2;
    key.shadow.camera.far = 60;
    key.shadow.camera.left = -16;
    key.shadow.camera.right = 16;
    key.shadow.camera.top = 16;
    key.shadow.camera.bottom = -6;
    key.shadow.bias = -0.0009;
    key.shadow.normalBias = 0.02;
    this.scene.add(key);
    this.keyLight = key;

    const fill = new THREE.DirectionalLight(0xdfeaf2, 0.55);
    fill.position.set(-12, 14, 8);
    this.scene.add(fill);

    // ceiling fittings over the bench
    for (const x of [-5.5, 5.5]) {
      const tube = new THREE.Mesh(
        new THREE.BoxGeometry(6.5, 0.18, 0.6),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e2, emissiveIntensity: 1.6 }),
      );
      tube.position.set(x, 19.5, -0.5);
      this.scene.add(tube);
      const lamp = new THREE.PointLight(0xfff3e4, 26, 34, 2);
      lamp.position.set(x, 18.6, -0.2);
      this.scene.add(lamp);
    }

    // a low bounce light so the underside of the glassware is not black
    const bounce = new THREE.PointLight(0xdfe8ee, 8, 22, 2);
    bounce.position.set(0, 10.5, 5);
    this.scene.add(bounce);
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
  }

  render(camera) {
    this.renderer.render(this.scene, camera);
  }

  dispose() {
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
