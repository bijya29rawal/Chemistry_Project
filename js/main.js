/**
 * main.js — initialises the simulator and connects the modules.
 *
 * Responsibilities kept deliberately small: build, wire, run the loop.
 */

import * as THREE from 'three';
import { CONFIG } from './data.js';
import { state } from './state.js';
import { LabScene } from './scene.js';
import { LabCamera } from './camera.js';
import { createControls } from './controls.js';
import { Laboratory } from './laboratory.js';
import { Animator } from './animations.js';
import { ExperimentController } from './experiments.js';
import { Interaction } from './interaction.js';
import { UI } from './ui.js';

function boot() {
  const container = document.getElementById('canvas-wrap');
  if (!container) throw new Error('#canvas-wrap is missing from the page');

  const labScene = new LabScene(container);
  const labCamera = new LabCamera(container);
  const controls = createControls(labCamera.camera, labScene.renderer.domElement);
  labCamera.attachControls(controls);
  labCamera.applyView('overview');

  const lab = new Laboratory(labScene.scene);
  const animator = new Animator(labScene.scene);
  const controller = new ExperimentController({ state, lab, animator });

  const interaction = new Interaction({
    renderer: labScene.renderer,
    camera: labCamera.camera,
    lab, state, controller, labCamera, animator,
  });

  const ui = new UI({ state, controller, labCamera, animator });

  // respect the operating-system reduced-motion preference
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const applyMotion = () => {
    if (mq.matches) {
      CONFIG.reducedMotion = true;
      const box = document.getElementById('reduced-motion');
      if (box) box.checked = true;
    }
  };
  applyMotion();
  mq.addEventListener?.('change', applyMotion);

  const clock = new THREE.Clock();
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.066);
    controls.update();
    animator.update(dt);
    interaction.update();
    labScene.render(labCamera.camera);
  }
  loop();

  let resizeTimer = null;
  const onResize = () => {
    if (resizeTimer) cancelAnimationFrame(resizeTimer);
    resizeTimer = requestAnimationFrame(() => {
      labCamera.resize();
      labScene.resize();
    });
  };
  window.addEventListener('resize', onResize);
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(onResize);
    ro.observe(container);
  }

  // hide the loading veil once the first frame is on screen
  requestAnimationFrame(() => {
    const veil = document.getElementById('loading');
    if (veil) { veil.classList.add('hidden'); setTimeout(() => veil.remove(), 600); }
  });

  state.notify('Laboratory ready. Choose an experiment from the list on the left.', 'ok');

  // expose for debugging in the browser console
  window.waterLab = { state, lab, animator, controller, ui, labCamera, labScene, interaction };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
