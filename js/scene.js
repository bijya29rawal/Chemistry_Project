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

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    const pr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xd2dbdb);
    this.scene.fog = new THREE.Fog(0xd2dbdb, 45, 88);

    this.buildEnvironment();
    this.addLights();
  }

  buildEnvironment() {
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      pmrem.compileEquirectangularShader();

      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color(0xdce5e9);

      // Overhead fluorescent light banks
      const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      for (const x of [-6, 0, 6]) {
        const light = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 2.2), lightMat);
        light.position.set(x, 14, 0);
        light.rotation.x = Math.PI / 2;
        envScene.add(light);
      }

      // Large laboratory window for natural directional reflections
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(18, 10),
        new THREE.MeshBasicMaterial({ color: 0xeaf3ff })
      );
      win.position.set(16, 8, 2);
      win.rotation.y = -Math.PI / 2;
      envScene.add(win);

      // Floor plane
      const gnd = new THREE.Mesh(
        new THREE.PlaneGeometry(36, 36),
        new THREE.MeshBasicMaterial({ color: 0x928c82 })
      );
      gnd.position.y = -2;
      gnd.rotation.x = -Math.PI / 2;
      envScene.add(gnd);

      const envMap = pmrem.fromScene(envScene, 0.04).texture;
      pmrem.dispose();
      this.scene.environment = envMap;
    } catch (e) {
      console.warn('Could not generate PMREM environment:', e);
    }
  }

  addLights() {
    const hemi = new THREE.HemisphereLight(0xf5f8fa, 0x8a857b, 1.25);
    hemi.position.set(0, 24, 0);
    this.scene.add(hemi);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    // Key directional light with 4K ultra-sharp shadow map
    const key = new THREE.DirectionalLight(0xfff7ed, 2.3);
    key.position.set(6, 22, 12);
    key.castShadow = true;
    key.shadow.mapSize.set(4096, 4096);
    key.shadow.camera.near = 4;
    key.shadow.camera.far = 50;
    key.shadow.camera.left = -14;
    key.shadow.camera.right = 14;
    key.shadow.camera.top = 13;
    key.shadow.camera.bottom = -4;
    key.shadow.bias = -0.0003;
    key.shadow.normalBias = 0.015;
    this.scene.add(key);
    this.keyLight = key;

    // Fill light from left
    const fill = new THREE.DirectionalLight(0xdceaf4, 0.65);
    fill.position.set(-12, 14, 8);
    this.scene.add(fill);

    // Back rim light to accentuate glassware silhouettes and bevels
    const rim = new THREE.DirectionalLight(0xf0f7fc, 0.85);
    rim.position.set(0, 18, -14);
    this.scene.add(rim);

    // Ceiling fittings over the bench
    for (const x of [-5.5, 5.5]) {
      const tube = new THREE.Mesh(
        new THREE.BoxGeometry(6.5, 0.18, 0.6),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xfff8ea,
          emissiveIntensity: 2.2,
          roughness: 0.1,
        }),
      );
      tube.position.set(x, 19.5, -0.5);
      this.scene.add(tube);
      const lamp = new THREE.PointLight(0xfff4e6, 28, 36, 1.8);
      lamp.position.set(x, 18.6, -0.2);
      this.scene.add(lamp);
    }

    // A low bounce light so the underside of glassware stays illuminated
    const bounce = new THREE.PointLight(0xe4eff6, 10, 22, 2);
    bounce.position.set(0, 10.5, 5);
    this.scene.add(bounce);
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (w === 0 || h === 0) return;
    const pr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.renderer.setPixelRatio(pr);
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
