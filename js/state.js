/**
 * state.js — the single source of truth for the session.
 *
 * Nothing else in the application keeps its own copy of experiment progress.
 * Modules subscribe with state.on(event, handler) and are notified on change.
 */

import { CONFIG, REAGENTS, EXPERIMENTS, getSample } from './data.js';

class Emitter {
  constructor() { this._handlers = new Map(); }
  on(event, fn) {
    if (!this._handlers.has(event)) this._handlers.set(event, new Set());
    this._handlers.get(event).add(fn);
    return () => this.off(event, fn);
  }
  off(event, fn) {
    const set = this._handlers.get(event);
    if (set) set.delete(fn);
  }
  emit(event, payload) {
    const set = this._handlers.get(event);
    if (!set) return;
    for (const fn of [...set]) {
      try { fn(payload); } catch (err) { console.error(`handler for "${event}" failed`, err); }
    }
  }
}

/** Blank per-experiment run record. */
function emptyRun() {
  return {
    status: 'idle',          // idle | running | endpoint | complete
    stepIndex: 0,
    completedSteps: [],
    burette: {
      filled: false, rinsed: false, reagent: null,
      volume_mL: 0, reading_mL: 0,        // reading grows downward from 0
      initialReading: null, finalReading: null, pReading: null,
      open: false,
    },
    flask: {
      sampleVolume_mL: 0,
      titrantVolume_mL: 0,
      indicator: null,
      indicators: [],
      bufferAdded: false,
      stage: 1,                            // 1 = P stage, 2 = M stage
    },
    beaker: { sampleVolume_mL: 0 },
    instrument: { on: false, calibrated: false, rinsed: false, immersed: false, reading: null, stable: false },
    vialFilled: false,
    vialInserted: false,
    caco3_mg: null,
    madeUp: false,
    readings: [],
    result: null,
    errors: [],
  };
}

export class AppState extends Emitter {
  constructor() {
    super();
    this.mode = 'guided';                 // guided | free
    this.experimentId = null;
    this.sampleKey = 'tap';
    this.preparedStandard = null;         // set by the SHW preparation experiment
    this.selectedObject = null;           // userData key of the selected 3D object
    this.heldObject = null;
    this.paused = false;
    this.run = emptyRun();
    this.observations = [];               // saved observation rows
    this.log = [];
  }

  /* ---------------- experiment lifecycle ---------------- */

  selectExperiment(id) {
    if (!EXPERIMENTS[id]) return;
    this.experimentId = id;
    this.run = emptyRun();
    this.sampleKey = EXPERIMENTS[id].defaultSample || this.sampleKey;
    this.emit('experiment:changed', this.experiment);
    this.emit('state:changed', this);
  }

  get experiment() {
    return this.experimentId ? EXPERIMENTS[this.experimentId] : null;
  }

  get currentStep() {
    const exp = this.experiment;
    if (!exp) return null;
    return exp.steps[this.run.stepIndex] || null;
  }

  get sample() {
    if (this.sampleKey === 'standard_hard' && this.preparedStandard) {
      const s = getSample('standard_hard');
      s.hardness_mgL = this.preparedStandard.strength_mgL;
      s.prepared = true;
      return s;
    }
    return getSample(this.sampleKey);
  }

  setSample(key) {
    this.sampleKey = key;
    this.emit('sample:changed', this.sample);
    this.emit('state:changed', this);
  }

  setMode(mode) {
    this.mode = mode;
    this.emit('mode:changed', mode);
    this.emit('state:changed', this);
  }

  start() {
    if (!this.experiment) return false;
    this.run.status = 'running';
    this.logEvent(`Started: ${this.experiment.name} — sample: ${this.sample.name}`);
    this.emit('state:changed', this);
    return true;
  }

  reset() {
    this.run = emptyRun();
    this.emit('experiment:reset', this.experiment);
    this.emit('state:changed', this);
  }

  completeStep() {
    const step = this.currentStep;
    if (!step) return;
    this.run.completedSteps.push(step.id);
    if (this.run.stepIndex < this.experiment.steps.length - 1) this.run.stepIndex += 1;
    this.emit('step:completed', step);
    this.emit('state:changed', this);
  }

  /** Move past a step without repeating it (used by two-stage titrations). */
  setStepIndex(i) {
    this.run.stepIndex = Math.max(0, Math.min(i, this.experiment.steps.length - 1));
    this.emit('state:changed', this);
  }

  /* ---------------- reagent stock ---------------- */

  consumeReagent(key, mL) {
    const r = REAGENTS[key];
    if (!r || typeof r.stock_mL !== 'number') return;
    r.stock_mL = Math.max(0, r.stock_mL - mL);
    this.emit('reagents:changed', REAGENTS);
  }

  /* ---------------- messaging ---------------- */

  logEvent(message, kind = 'info') {
    const entry = { time: new Date().toLocaleTimeString(), message, kind };
    this.log.push(entry);
    if (this.log.length > 200) this.log.shift();
    this.emit('log', entry);
  }

  notify(message, kind = 'info') {
    this.logEvent(message, kind);
    this.emit('notify', { message, kind });
  }

  recordError(message) {
    this.run.errors.push(message);
    this.notify(message, 'error');
  }

  saveObservation(row) {
    this.observations.push({ ...row, savedAt: new Date().toLocaleString() });
    this.emit('observations:changed', this.observations);
  }

  clearObservations() {
    this.observations = [];
    this.emit('observations:changed', this.observations);
  }

  get config() { return CONFIG; }
}

export const state = new AppState();
