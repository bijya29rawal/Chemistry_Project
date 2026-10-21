/**
 * interaction.js — turns clicks in the 3D laboratory into experiment actions.
 *
 * Highlighting is deliberately restrained: a thin ring on the bench under the
 * object plus a floating name tag. No glowing outlines on the glassware itself,
 * which would destroy the impression of real glass.
 */

import * as THREE from 'three';

export class Interaction {
  constructor({ renderer, camera, lab, state, controller, labCamera, animator }) {
    this.renderer = renderer;
    this.camera = camera;
    this.labCamera = labCamera;
    this.lab = lab;
    this.state = state;
    this.controller = controller;
    this.animator = animator;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.hovered = null;
    this.selected = null;
    this.enabled = true;

    this.labelEl = document.getElementById('object-label');
    this.buildRings();
    this.bind();
  }

  buildRings() {
    const make = (color, opacity) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.98, 1.0, 48),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.visible = false;
      ring.renderOrder = 3;
      this.lab.scene.add(ring);
      return ring;
    };
    this.hoverRing = make(0x2f8f7a, 0.55);
    this.selectRing = make(0xd9a441, 0.9);
  }

  bind() {
    const el = this.renderer.domElement;
    this._onMove = (e) => this.onPointerMove(e);
    this._onDown = (e) => this.onPointerDown(e);
    this._onKey = (e) => this.onKey(e);
    el.addEventListener('pointermove', this._onMove);
    el.addEventListener('pointerdown', this._onDown);
    window.addEventListener('keydown', this._onKey);
  }

  dispose() {
    const el = this.renderer.domElement;
    el.removeEventListener('pointermove', this._onMove);
    el.removeEventListener('pointerdown', this._onDown);
    window.removeEventListener('keydown', this._onKey);
  }

  updatePointer(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  pick() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.lab.interactive, true);
    for (const hit of hits) {
      const mesh = hit.object;
      const group = mesh.userData.owner || this.findGroup(mesh);
      if (group && group.userData.interactive) return { group, mesh, point: hit.point };
    }
    return null;
  }

  findGroup(object) {
    let o = object;
    while (o) {
      if (o.userData && o.userData.selectable) return o;
      o = o.parent;
    }
    return null;
  }

  placeRing(ring, group) {
    const box = new THREE.Box3().setFromObject(group);
    if (box.isEmpty()) { ring.visible = false; return; }
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const r = Math.max(0.28, Math.max(size.x, size.z) * 0.62);
    ring.scale.setScalar(r);
    ring.position.set(center.x, box.min.y + 0.012, center.z);
    ring.visible = true;
  }

  onPointerMove(event) {
    if (!this.enabled) return;
    this.updatePointer(event);
    const hit = this.pick();
    const group = hit ? hit.group : null;
    if (group !== this.hovered) {
      this.hovered = group;
      this.renderer.domElement.style.cursor = group ? 'pointer' : 'default';
      if (group) this.placeRing(this.hoverRing, group);
      else this.hoverRing.visible = false;
    }
    this.updateLabel();
  }

  onPointerDown(event) {
    if (!this.enabled || event.button !== 0) return;
    this.updatePointer(event);
    const hit = this.pick();
    if (!hit) {
      this.selected = null;
      this.selectRing.visible = false;
      this.state.emit('selection:changed', null);
      return;
    }
    this.selected = hit.group;
    this.placeRing(this.selectRing, hit.group);
    this.state.selectedObject = hit.group.userData.key || hit.group.userData.id;
    this.state.emit('selection:changed', hit.group);

    const action = this.resolveAction(hit.group, hit.mesh);
    if (action) {
      this.controller.dispatch(action.type, action.payload || {});
    }
  }

  onKey(event) {
    if (event.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
    if (event.code === 'Space') {
      event.preventDefault();
      this.controller.dispatch('TITRATE');
    } else if (event.key.toLowerCase() === 'r') {
      this.labCamera.flyToView('overview', this.animator);
    } else if (event.key.toLowerCase() === 'b') {
      this.labCamera.flyToView('burette', this.animator);
    }
  }

  updateLabel() {
    const group = this.hovered || this.selected;
    if (!group || !this.labelEl) {
      if (this.labelEl) this.labelEl.classList.remove('visible');
      return;
    }
    const box = new THREE.Box3().setFromObject(group);
    const p = new THREE.Vector3(box.getCenter(new THREE.Vector3()).x, box.max.y + 0.15, box.getCenter(new THREE.Vector3()).z);
    p.project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = (p.x * 0.5 + 0.5) * rect.width;
    const y = (-p.y * 0.5 + 0.5) * rect.height;
    if (p.z > 1) { this.labelEl.classList.remove('visible'); return; }
    this.labelEl.textContent = group.userData.name || group.userData.type;
    this.labelEl.style.transform = `translate(-50%, -120%) translate(${x}px, ${y}px)`;
    this.labelEl.classList.add('visible');
  }

  /** Keep the rings and the label attached as the camera moves. */
  update() {
    if (this.selected) this.placeRing(this.selectRing, this.selected);
    if (this.hovered) this.placeRing(this.hoverRing, this.hovered);
    this.updateLabel();
  }

  /**
   * Work out which experiment action a click means, given what was clicked
   * and which experiment is loaded.
   */
  resolveAction(group, mesh) {
    const ud = group.userData;
    const part = mesh.userData.part;
    const exp = this.state.experiment;
    const expId = exp ? exp.id : null;
    const run = this.state.run;

    switch (ud.type) {
      case 'burette':
        if (part === 'stopcock') return { type: 'TITRATE' };
        return { type: 'FILL_BURETTE' };

      case 'flask':
        return { type: 'SWIRL' };

      case 'pipette':
        return { type: 'PIPETTE_SAMPLE' };

      case 'reagent':
        if (ud.sampleKey) return { type: 'SELECT_SAMPLE', payload: { sampleKey: ud.sampleKey } };
        if (ud.reagentKey) {
          // the same bottle rinses the burette at the start of a titration
          if (exp && exp.titrant === ud.reagentKey && !run.burette.rinsed) return { type: 'RINSE_BURETTE' };
          if (exp && exp.titrant === ud.reagentKey && !run.burette.filled) return { type: 'FILL_BURETTE' };
          return { type: `ADD_${ud.reagentKey}` };
        }
        return null;

      case 'washbottle':
        if (expId === 'shw_prep') return { type: 'MAKE_UP' };
        if (expId === 'conductivity' || expId === 'tds') return { type: 'COND_RINSE' };
        return { type: 'PH_RINSE' };

      case 'phmeter':
        if (part === 'power') return { type: 'PH_POWER' };
        if (part === 'cal') return { type: 'PH_CALIBRATE' };
        if (part === 'read') return { type: 'PH_MEASURE' };
        if (part === 'electrode') return { type: 'PH_IMMERSE' };
        return { type: 'PH_POWER' };

      case 'conductivity':
        if (part === 'power') return { type: 'COND_POWER' };
        if (part === 'read') return { type: 'COND_MEASURE' };
        if (part === 'cell') return { type: 'COND_IMMERSE' };
        return { type: 'COND_POWER' };

      case 'turbidity':
        if (part === 'power') return { type: 'TURB_POWER' };
        if (part === 'cal') return { type: 'TURB_CALIBRATE' };
        if (part === 'read') return { type: 'TURB_MEASURE' };
        return { type: 'TURB_POWER' };

      case 'vial':
        return run.vialFilled ? { type: 'TURB_INSERT' } : { type: 'TURB_FILL' };

      case 'beaker':
        if (ud.key === 'beaker_prep') return { type: 'DISSOLVE' };
        return { type: 'FILL_BEAKER' };

      case 'balance':
        return { type: 'WEIGH_CACO3' };

      case 'volumetric':
        return { type: 'TRANSFER_VOLUMETRIC' };

      case 'stirrer':
      case 'rack':
      case 'testtube':
      case 'cylinder':
      case 'funnel':
      case 'rod':
      case 'dropper':
      case 'thermometer':
      case 'timer':
      case 'waste':
        return null;    // selectable and labelled, but no action of their own

      default:
        return null;
    }
  }
}
