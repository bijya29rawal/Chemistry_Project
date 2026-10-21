/**
 * experiments.js — the experiment state machine.
 *
 * Each experiment is a sequence of declared steps (see data.js). The student
 * performs an ACTION by clicking something in the 3D laboratory; this module
 * decides whether that action is legal right now, plays the corresponding
 * bench animation, mutates the run state and advances the procedure.
 *
 * States: IDLE → PREPARE → RINSE → FILL → MEASURE → ADD_REAGENT → TITRATE
 *         → APPROACH_ENDPOINT → ENDPOINT → CALCULATE → RESULT
 */

import * as THREE from 'three';
import { CONFIG, REAGENTS } from './data.js';
import { Solution, applySolution, endpointState, describeColor, INDICATOR_COLORS } from './chemicals.js';
import { EASE } from './animations.js';
import {
  equivalenceVolume, acidbaseAnalyteNormality, buildTitrationResult, buildMixedAlkalinityResult,
  buildInstrumentResult, buildPreparationResult, caco3MassForStandard, fmt,
} from './calculations.js';

export const PHASE = {
  IDLE: 'IDLE', PREPARE: 'PREPARE', RINSE: 'RINSE', FILL: 'FILL', MEASURE: 'MEASURE',
  ADD_REAGENT: 'ADD_REAGENT', TITRATE: 'TITRATE', APPROACH_ENDPOINT: 'APPROACH_ENDPOINT',
  ENDPOINT: 'ENDPOINT', CALCULATE: 'CALCULATE', RESULT: 'RESULT',
};

export class ExperimentController {
  constructor({ state, lab, animator }) {
    this.state = state;
    this.lab = lab;
    this.anim = animator;
    this.phase = PHASE.IDLE;
    this.flowMode = 'fast';            // fast | slow | drop
    this.busy = false;
    this.flowTicker = null;
    this.stopStirring = null;
    this.flaskSolution = new Solution(CONFIG.flaskCapacity_mL);
    this.beakerSolution = new Solution(150);
    this.vialSolution = new Solution(30);
    this.equivalence = 0;
    this.equivalenceStage2 = 0;
    this.dropAccumulator = 0;

    this.state.on('experiment:changed', () => this.resetBench());
    this.state.on('experiment:reset', () => this.resetBench());
  }

  /* ================================================================ */
  /* Housekeeping                                                     */
  /* ================================================================ */

  setPhase(p) {
    this.phase = p;
    this.state.emit('phase:changed', p);
  }

  resetBench() {
    this.stopFlow();
    if (this.stopStirring) { this.stopStirring(); this.stopStirring = null; }
    this.anim.clear();
    this.flaskSolution.reset();
    this.beakerSolution.reset();
    this.vialSolution.reset();
    this.equivalence = 0;
    this.equivalenceStage2 = 0;
    this.busy = false;
    this.setPhase(PHASE.IDLE);

    const o = this.lab.objects;
    for (const key of ['flask', 'beaker_ph', 'beaker_cond', 'vial', 'burette', 'pipette', 'cylinder', 'beaker_prep']) {
      const obj = o[key];
      if (obj?.userData?.liquid) obj.userData.liquid.setFill(0);
    }
    o.volumetric?.userData?.liquid?.setFill(0);
    o.volumetric?.userData?.neckLiquid?.setFill(0);

    // instruments off
    for (const key of ['phmeter', 'condmeter', 'turbmeter', 'balance']) {
      o[key]?.userData?.display?.set('', '', 'off');
    }
    // probes back to their rest height
    const el = o.phmeter?.userData?.electrode;
    if (el) el.position.y = el.userData.homeY;
    const cell = o.condmeter?.userData?.cell;
    if (cell) cell.position.y = cell.userData.homeY;
    if (o.vial && o.vial.userData.home) o.vial.position.copy(o.vial.userData.home);
    if (o.pipette && o.pipette.userData.home) o.pipette.position.copy(o.pipette.userData.home);
    o.burette.userData.stopcockKey.rotation.x = 0;

    this.state.emit('bench:reset');
  }

  /** The step the student is expected to perform now. */
  get expectedAction() {
    const step = this.state.currentStep;
    return step ? step.action : null;
  }

  /** Guided mode refuses out-of-order actions and explains why. */
  validate(action) {
    const run = this.state.run;
    const exp = this.state.experiment;
    if (!exp) return { ok: false, message: 'Choose an experiment from the list on the left first.' };
    if (run.status === 'idle') return { ok: false, message: 'Press "Start experiment" before working at the bench.' };

    // Hard physical rules, enforced in both modes
    if (action === 'TITRATE' && !run.burette.filled) {
      return { ok: false, message: 'Action not available yet. Fill the burette with the titrant first.' };
    }
    if (action === 'TITRATE' && run.flask.sampleVolume_mL <= 0) {
      return { ok: false, message: 'There is nothing in the flask. Pipette the sample into the conical flask first.' };
    }
    if (action === 'TITRATE' && !run.flask.indicator) {
      return { ok: false, message: 'Add the indicator before titrating — you would not see the endpoint.' };
    }
    if (action === 'ADD_ebt' && !run.flask.bufferAdded) {
      return { ok: false, message: 'Add the pH 10 ammonia buffer before the Eriochrome Black T.' };
    }
    if (action.startsWith('ADD_') && action !== 'ADD_buffer' && run.flask.sampleVolume_mL <= 0
        && exp.kind === 'titration') {
      return { ok: false, message: 'Pipette the water sample into the flask before adding reagents.' };
    }
    if (action === 'FILL_BURETTE' && !run.burette.rinsed && this.state.mode === 'guided') {
      return { ok: false, message: 'Rinse the burette with the titrant first, or the solution will be diluted.' };
    }
    if (action === 'RECORD_FINAL' && run.burette.initialReading === null) {
      return { ok: false, message: 'Record the initial burette reading before the final one.' };
    }
    if (action === 'PH_MEASURE' && !run.instrument.immersed) {
      return { ok: false, message: 'Lower the electrode into the sample before reading.' };
    }
    if (action === 'COND_MEASURE' && !run.instrument.immersed) {
      return { ok: false, message: 'Immerse the conductivity cell in the sample before reading.' };
    }
    if (action === 'TURB_MEASURE' && !run.vialInserted) {
      return { ok: false, message: 'Place the sample vial in the measuring well first.' };
    }
    if ((action === 'PH_IMMERSE' || action === 'COND_IMMERSE') && this.beakerSolution.volume_mL <= 0) {
      return { ok: false, message: 'The beaker is empty. Pour the water sample into the beaker first.' };
    }

    if (this.state.mode === 'free') return { ok: true, guided: false };

    const expected = this.expectedAction;
    if (expected && action !== expected) {
      const step = this.state.currentStep;
      return {
        ok: false,
        message: `Not the current step. ${step.text} (${step.hint})`,
      };
    }
    return { ok: true, guided: true };
  }

  /* ================================================================ */
  /* Action dispatch                                                  */
  /* ================================================================ */

  async dispatch(action, payload = {}) {
    if (!action) return false;

    // sample selection and the stopcock are always available
    if (action === 'SELECT_SAMPLE') {
      if (this.state.run.flask.sampleVolume_mL > 0 || this.beakerSolution.volume_mL > 0) {
        this.state.notify('The sample is already measured out. Reset the experiment to change it.', 'warn');
        return false;
      }
      this.state.setSample(payload.sampleKey);
      this.state.notify(`Sample selected: ${this.state.sample.name}`, 'ok');
      if (this.state.experiment?.id === 'acidbase' && acidbaseAnalyteNormality(this.state.sample) <= 0) {
        this.state.notify('This water is not alkaline enough for the acid–base titration — pick Unknown (X-7) or bore-well water.', 'warn');
      }
      return true;
    }

    if (this.busy) {
      this.state.notify('Wait for the current operation to finish.', 'warn');
      return false;
    }

    const check = this.validate(action);
    if (!check.ok) {
      this.state.recordError(check.message);
      return false;
    }

    this.busy = true;
    let completed = false;
    try {
      completed = await this.perform(action, payload);
    } catch (err) {
      console.error('action failed', action, err);
      this.state.recordError('That operation could not be completed. The bench has been left unchanged.');
    } finally {
      this.busy = false;
    }

    if (completed && this.state.mode === 'guided' && action === this.expectedAction) {
      this.state.completeStep();
    }
    this.state.emit('state:changed', this.state);
    return completed;
  }

  async perform(action, payload) {
    if (action.startsWith('ADD_')) return this.addReagent(action.slice(4));
    switch (action) {
      case 'RINSE_BURETTE': return this.rinseBurette();
      case 'FILL_BURETTE': return this.fillBurette();
      case 'RECORD_INITIAL': return this.recordInitial();
      case 'PIPETTE_SAMPLE': return this.pipetteSample();
      case 'TITRATE': return this.toggleStopcock();
      case 'SWIRL': return this.swirlFlask();
      case 'RECORD_P': return this.recordP();
      case 'RECORD_FINAL': return this.recordFinal();
      case 'CALCULATE': return this.calculate();

      case 'PH_POWER': return this.powerInstrument('phmeter', 'pH');
      case 'PH_CALIBRATE': return this.calibratePH();
      case 'PH_RINSE': return this.rinseProbe('phmeter');
      case 'PH_IMMERSE': return this.immerseProbe('phmeter');
      case 'PH_MEASURE': return this.measurePH();

      case 'COND_POWER': return this.powerInstrument('condmeter', 'uS/cm');
      case 'COND_RINSE': return this.rinseProbe('condmeter');
      case 'COND_IMMERSE': return this.immerseProbe('condmeter');
      case 'COND_MEASURE': return this.measureConductivity();

      case 'TURB_POWER': return this.powerInstrument('turbmeter', 'NTU');
      case 'TURB_CALIBRATE': return this.calibrateTurbidity();
      case 'TURB_FILL': return this.fillVial();
      case 'TURB_INSERT': return this.insertVial();
      case 'TURB_MEASURE': return this.measureTurbidity();

      case 'FILL_BEAKER': return this.fillBeaker();
      case 'RECORD_READING': return this.recordReading();

      case 'WEIGH_CACO3': return this.weighCaCO3();
      case 'DISSOLVE': return this.dissolve();
      case 'TRANSFER_VOLUMETRIC': return this.transferToVolumetric();
      case 'MAKE_UP': return this.makeUpToMark();
      default:
        this.state.notify('That object has no action in this experiment.', 'warn');
        return false;
    }
  }

  /* ================================================================ */
  /* Burette operations                                               */
  /* ================================================================ */

  get titrantKey() {
    const exp = this.state.experiment;
    return exp?.titrant || 'edta';
  }

  /**
   * Carry a vessel over `target`, tilt it so its LIP (mouth) sits directly
   * above the target's axis, run `pourFn({ lip, mouth })`, then put it back.
   * The vessel's body hangs to the side of the lip, never over the target.
   */
  async tiltPour(vessel, target, pourFn, { tilt = -1.5, clear = 0.55 } = {}) {
    const home = vessel.position.clone();
    const h = vessel.userData.pourY
      ?? new THREE.Box3().setFromObject(vessel).getSize(new THREE.Vector3()).y;
    const box = new THREE.Box3().setFromObject(target);
    const axis = target.getWorldPosition(new THREE.Vector3());
    const topY = box.max.y;
    const lipY = topY + clear;
    const startBase = new THREE.Vector3(axis.x, topY + 0.25, axis.z);
    const upLipY = startBase.y + h;

    await this.anim.arcTo(vessel, startBase, 1.0, 0.8);

    const place = (e) => {
      const rot = tilt * e;
      const ly = THREE.MathUtils.lerp(upLipY, lipY, e);
      vessel.rotation.z = rot;
      vessel.position.set(axis.x + h * Math.sin(rot), ly - h * Math.cos(rot), axis.z);
    };
    await this.anim.tween({ duration: 0.6, onUpdate: place });

    const lip = new THREE.Vector3(axis.x, lipY, axis.z);
    const mouth = new THREE.Vector3(axis.x, topY, axis.z);
    await pourFn({ lip, mouth });

    await this.anim.tween({ duration: 0.5, onUpdate: (e) => place(1 - e) });
    vessel.rotation.z = 0;
    await this.anim.arcTo(vessel, home, 1.0, 0.8);
  }

  async rinseBurette() {
    const burette = this.lab.objects.burette;
    const key = this.titrantKey;
    const reagent = REAGENTS[key];
    this.setPhase(PHASE.RINSE);
    const bottle = this.lab.objects[`bottle_${key}`];

    await this.tiltPour(bottle, burette, async ({ lip, mouth }) => {
      await this.anim.pour(lip, mouth, 1.0, reagent.color);
      await this.anim.fillTo(burette.userData.liquid, 0.18, 0.7);
    });
    burette.userData.liquid.setColor(reagent.color);
    const tip = this.lab.getBuretteTip();
    for (let i = 0; i < 4; i++) this.anim.emitDrop(tip, tip.clone().setY(tip.y - 1.6), reagent.color, 0.4);
    await this.anim.fillTo(burette.userData.liquid, 0, 0.9);

    this.state.run.burette.rinsed = true;
    this.state.run.burette.reagent = key;
    this.state.consumeReagent(key, 15);
    this.state.notify(`Burette rinsed with ${reagent.name} and drained to waste.`, 'ok');
    return true;
  }

  async fillBurette() {
    const burette = this.lab.objects.burette;
    const key = this.titrantKey;
    const reagent = REAGENTS[key];
    this.setPhase(PHASE.FILL);

    const bottle = this.lab.objects[`bottle_${key}`];
    burette.userData.liquid.setColor(reagent.color);
    await this.tiltPour(bottle, burette, async ({ lip, mouth }) => {
      this.anim.showStream(lip, mouth, reagent.color);
      await this.anim.fillTo(burette.userData.liquid, 1.0, 2.2, EASE.out);
      this.anim.hideStream();
    });

    // expel the air bubble: run a little through the tip and settle on the zero mark
    const tip = this.lab.getBuretteTip();
    for (let i = 0; i < 3; i++) {
      this.anim.emitDrop(tip, tip.clone().setY(tip.y - 1.55), reagent.color, 0.4);
      await this.anim.wait(0.16);
    }
    const startReading = Math.round(Math.random() * 20) / 100;   // 0.00–0.20 mL
    const cap = CONFIG.buretteCapacity_mL;
    await this.anim.fillTo(burette.userData.liquid, (cap - startReading) / cap, 0.5);

    const b = this.state.run.burette;
    b.filled = true;
    b.reagent = key;
    b.reading_mL = startReading;
    b.volume_mL = cap - startReading;
    this.state.consumeReagent(key, cap);
    this.state.notify(`Burette filled with ${reagent.name}. Air bubble expelled.`, 'ok');
    this.setPhase(PHASE.MEASURE);
    return true;
  }

  recordInitial() {
    const b = this.state.run.burette;
    if (!b.filled) { this.state.recordError('Fill the burette before taking a reading.'); return false; }
    b.initialReading = b.reading_mL;
    this.state.notify(`Initial burette reading recorded: ${fmt(b.initialReading)} mL`, 'ok');
    this.state.emit('observation:changed');
    return true;
  }

  recordP() {
    const b = this.state.run.burette;
    if (this.state.run.flask.stage !== 1) { this.state.recordError('The phenolphthalein endpoint has already been recorded.'); return false; }
    b.pReading = b.reading_mL;
    this.state.run.flask.stage = 2;
    // the second equivalence point is the TOTAL volume from the same start
    this.equivalence = this.equivalenceStage2;
    this.state.notify(`Phenolphthalein endpoint recorded: ${fmt(b.pReading)} mL`, 'ok');
    this.state.emit('observation:changed');
    return true;
  }

  recordFinal() {
    const b = this.state.run.burette;
    b.finalReading = b.reading_mL;
    const used = b.finalReading - (b.initialReading ?? 0);
    this.state.notify(`Final burette reading recorded: ${fmt(b.finalReading)} mL (${fmt(used)} mL used)`, 'ok');
    this.setPhase(PHASE.CALCULATE);
    this.state.emit('observation:changed');
    return true;
  }

  /* ---------------- stopcock and flow ---------------- */

  setFlowMode(mode) {
    this.flowMode = mode;
    this.state.emit('flow:changed', mode);
  }

  get flowRate() {
    if (this.flowMode === 'drop') return CONFIG.dropVolume_mL * 2.2;   // ~2 drops/s
    if (this.flowMode === 'slow') return CONFIG.flowRate_mL_per_s * 0.28;
    return CONFIG.flowRate_mL_per_s;
  }

  toggleStopcock() {
    const b = this.state.run.burette;
    if (b.open) { this.stopFlow(); return true; }
    this.startFlow();
    return false;      // the step completes when the student CLOSES at the endpoint
  }

  startFlow() {
    const run = this.state.run;
    if (run.burette.open) return;
    if (run.burette.reading_mL >= CONFIG.buretteCapacity_mL - 0.01) {
      this.state.recordError('The burette is empty. Refill it and continue with a fresh reading.');
      return;
    }
    run.burette.open = true;
    this.setPhase(PHASE.TITRATE);

    const burette = this.lab.objects.burette;
    const flask = this.lab.objects.flask;
    const reagentColor = REAGENTS[this.titrantKey].color;
    this.anim.rotateTo(burette.userData.stopcockKey, new THREE.Euler(Math.PI / 2, 0, 0), 0.25);
    if (!this.stopStirring) this.stopStirring = this.anim.startStirring(flask, this.lab.objects.stirrer);

    const tipWorld = this.lab.getBuretteTip();
    const mouthWorld = this.lab.getFlaskMouth();
    this.dropAccumulator = 0;

    this.flowTicker = (dt) => {
      const rate = this.flowRate;
      const delivered = rate * dt;
      const b = run.burette;
      const remaining = CONFIG.buretteCapacity_mL - b.reading_mL;
      const actual = Math.min(delivered, remaining);
      b.reading_mL += actual;
      b.volume_mL = CONFIG.buretteCapacity_mL - b.reading_mL;

      burette.userData.liquid.setFill(b.volume_mL / CONFIG.buretteCapacity_mL);

      this.flaskSolution.addTitrant(actual);
      applySolution(flask, this.flaskSolution);

      // droplets / stream between tip and flask mouth
      this.dropAccumulator += actual;
      if (this.flowMode === 'fast') {
        this.anim.showStream(tipWorld, mouthWorld, reagentColor, 0.022);
      } else if (this.dropAccumulator >= CONFIG.dropVolume_mL) {
        this.dropAccumulator -= CONFIG.dropVolume_mL;
        this.anim.emitDrop(tipWorld, mouthWorld, reagentColor, 0.34);
      }

      this.updateTitrationColor();

      if (remaining <= 0.0001) {
        this.stopFlow();
        this.state.recordError('The burette ran dry before the endpoint. Refill and repeat the titration.');
      }
      this.state.emit('reading:changed', b);
    };
    this.anim.tickers.add(this.flowTicker);
    this.state.notify('Stopcock open — titrant flowing.', 'info');
  }

  stopFlow() {
    const run = this.state.run;
    if (this.flowTicker) {
      this.anim.tickers.delete(this.flowTicker);
      this.flowTicker = null;
    }
    this.anim.hideStream();
    if (!run.burette.open) return;
    run.burette.open = false;
    const burette = this.lab.objects.burette;
    this.anim.rotateTo(burette.userData.stopcockKey, new THREE.Euler(0, 0, 0), 0.25);
    this.state.notify(`Stopcock closed at ${fmt(run.burette.reading_mL)} mL.`, 'info');
    this.state.emit('reading:changed', run.burette);
  }

  get titrationProgress() {
    const b = this.state.run.burette;
    if (!this.equivalence) return 0;
    const delivered = b.reading_mL - (b.initialReading ?? 0);
    return delivered / this.equivalence;
  }

  updateTitrationColor() {
    const flask = this.lab.objects.flask;
    if (!this.flaskSolution.indicator) return;
    const progress = this.titrationProgress;
    const color = this.flaskSolution.updateForProgress(progress);
    flask.userData.liquid.setColor(color);
    const st = endpointState(progress);
    if (st === 'approaching' && this.phase !== PHASE.APPROACH_ENDPOINT && this.phase !== PHASE.ENDPOINT) {
      this.setPhase(PHASE.APPROACH_ENDPOINT);
      this.state.notify('The colour is beginning to change — add the titrant dropwise now.', 'warn');
    }
    if (st === 'endpoint' && this.phase !== PHASE.ENDPOINT) {
      this.setPhase(PHASE.ENDPOINT);
      this.state.run.status = 'endpoint';
      this.state.notify(`Endpoint reached — ${describeColor(this.flaskSolution.indicator, 1)}. Close the stopcock.`, 'ok');
    }
    this.state.emit('color:changed', { progress, state: st });
  }

  /* ================================================================ */
  /* Transfers                                                        */
  /* ================================================================ */

  async pipetteSample() {
    if (this.state.experiment?.id === 'acidbase'
        && acidbaseAnalyteNormality(this.state.sample) <= 0) {
      this.state.setSample('unknown');
      this.state.notify(
        'The chosen water has no free base, so phenolphthalein would stay colourless. '
        + 'Using the alkaline unknown sample (X-7) for the acid–base titration.', 'warn');
    }
    const pipette = this.lab.objects.pipette;
    const flask = this.lab.objects.flask;
    const sample = this.state.sample;
    const bottle = this.lab.sampleBottle(this.state.sampleKey);
    const home = pipette.userData.home.clone();
    this.setPhase(PHASE.MEASURE);

    const V = CONFIG.pipetteVolume_mL;
    pipette.userData.liquid.setColor(sample.color);

    // 1. move over the sample bottle, 2. dip in
    const above = bottle.position.clone(); above.y += 1.35;
    await this.anim.arcTo(pipette, above, 1.0, 0.7);
    await this.anim.moveTo(pipette, above.clone().setY(above.y - 0.85), 0.5);

    // 3–4. draw the liquid up to the graduation mark
    await this.anim.fillTo(pipette.userData.liquid, 0.92, 1.5, EASE.out);
    await this.anim.wait(0.2);
    await this.anim.fillTo(pipette.userData.liquid, 0.85, 0.4);   // adjust to the mark

    // 5. carry it to the flask
    const overFlask = flask.position.clone();
    overFlask.y = this.lab.getFlaskMouth().y + 0.15;
    await this.anim.arcTo(pipette, overFlask, 1.3, 1.0);

    // 6–7. dispense
    const mouth = this.lab.getFlaskMouth();
    this.anim.showStream(mouth.clone().setY(mouth.y - 0.02), mouth.clone().setY(mouth.y - 0.45), sample.color, 0.03);
    await Promise.all([
      this.anim.fillTo(pipette.userData.liquid, 0, 2.2, EASE.in),
      this.anim.tween({
        duration: 2.2,
        onUpdate: (e) => {
          this.flaskSolution.volume_mL = V * e;
          this.flaskSolution.sampleVolume_mL = V * e;
          this.flaskSolution.baseColor = new THREE.Color(sample.color);
          this.flaskSolution.color = new THREE.Color(sample.color);
          applySolution(flask, this.flaskSolution);
        },
      }),
    ]);
    this.anim.hideStream();
    await this.anim.wait(0.3);          // drainage time

    // 8. back to its rest position
    await this.anim.arcTo(pipette, home, 1.1, 0.8);

    this.state.run.flask.sampleVolume_mL = V;
    this.flaskSolution.volume_mL = V;
    this.flaskSolution.sampleVolume_mL = V;

    // now the equivalence volume is known
    const exp = this.state.experiment;
    if (exp.kind === 'titration') {
      this.equivalence = equivalenceVolume(exp.id, sample, V, 1);
      this.equivalenceStage2 = exp.twoStage ? equivalenceVolume(exp.id, sample, V, 2) : this.equivalence;
      if (exp.id === 'hardness' && this.equivalence < 0.05) {
        this.state.notify(
          `Note: this sample is only ${fmt(sample.hardness_mgL, 3)} mg/L as CaCO3, so the expected titre is `
          + `about ${fmt(this.equivalence, 4)} mL. Change the standard strength in Settings for a normal practical.`,
          'warn',
        );
      }
    }
    this.state.notify(`${V} mL of ${sample.name} transferred to the conical flask.`, 'ok');
    return true;
  }

  async addReagent(key) {
    const reagent = REAGENTS[key];
    if (!reagent) { this.state.recordError('That reagent is not available on this bench.'); return false; }
    const exp = this.state.experiment;
    const bottle = this.lab.objects[`bottle_${key}`];
    const flask = this.lab.objects.flask;
    this.setPhase(PHASE.ADD_REAGENT);

    const dose = reagent.doseVolume_mL || 1;
    await this.tiltPour(bottle, flask, async ({ lip, mouth }) => {
      if (reagent.doseDrops) {
        for (let i = 0; i < reagent.doseDrops; i++) {
          this.anim.emitDrop(lip.clone().setY(lip.y - 0.05), mouth, reagent.color, 0.4);
          await this.anim.wait(0.34);
        }
      } else {
        await this.anim.pour(lip, mouth, 1.1, reagent.color);
      }
    });

    this.flaskSolution.addReagent(key, dose);
    applySolution(flask, this.flaskSolution);
    if (INDICATOR_COLORS[key]) {
      await this.anim.colorTo(flask.userData.liquid, INDICATOR_COLORS[key].before, 1.0);
    }

    await this.anim.swirl(flask, 2, 1.1);

    const run = this.state.run;
    if (key === 'buffer') run.flask.bufferAdded = true;
    if (INDICATOR_COLORS[key]) {
      run.flask.indicator = key;
      if (!run.flask.indicators.includes(key)) run.flask.indicators.push(key);
    }
    this.state.consumeReagent(key, dose);

    const colorWord = INDICATOR_COLORS[key] ? ` The solution turns ${INDICATOR_COLORS[key].beforeLabel.toLowerCase()}.` : '';
    this.state.notify(`${reagent.name} added (${fmt(dose, 2)} mL).${colorWord}`, 'ok');

    // in the mixed-alkalinity run the colour must reflect where we already are
    if (exp.twoStage && this.flaskSolution.titrantVolume_mL > 0) this.updateTitrationColor();
    return true;
  }

  async swirlFlask() {
    await this.anim.swirl(this.lab.objects.flask, 3, 1.4);
    this.state.notify('Flask swirled — contents mixed.', 'info');
    return true;
  }

  /* ================================================================ */
  /* Instruments                                                      */
  /* ================================================================ */

  async powerInstrument(key, unit) {
    const inst = this.lab.objects[key];
    const display = inst.userData.display;
    display.set('----', unit);
    await this.anim.wait(0.6);
    display.set('0.00', unit);
    this.state.run.instrument.on = true;
    this.setPhase(PHASE.PREPARE);
    this.state.notify(`${inst.userData.name} switched on.`, 'ok');
    return true;
  }

  async calibratePH() {
    const inst = this.lab.objects.phmeter;
    if (!this.state.run.instrument.on) { this.state.recordError('Switch the meter on before calibrating.'); return false; }
    await this.anim.blink({ display: inst.userData.display, text: '7.00', unit: 'CAL', times: 3 });
    await this.anim.wait(0.4);
    inst.userData.display.set('7.00', 'pH');
    this.state.run.instrument.calibrated = true;
    this.state.notify('Calibrated against pH 7.00 buffer. Slope accepted.', 'ok');
    return true;
  }

  async calibrateTurbidity() {
    const inst = this.lab.objects.turbmeter;
    if (!this.state.run.instrument.on) { this.state.recordError('Switch the meter on before calibrating.'); return false; }
    await this.anim.blink({ display: inst.userData.display, text: '100.0', unit: 'CAL', times: 3 });
    inst.userData.display.set('0.00', 'NTU');
    this.state.run.instrument.calibrated = true;
    this.state.notify('Standardised with the 100 NTU formazin standard.', 'ok');
    return true;
  }

  async rinseProbe(meterKey) {
    const meter = this.lab.objects[meterKey];
    const probe = meterKey === 'phmeter' ? meter.userData.electrode : meter.userData.cell;
    const wash = this.lab.objects.washbottle;
    const nozzle = wash.localToWorld(wash.userData.nozzle.clone());
    const target = probe.getWorldPosition(new THREE.Vector3());
    target.y -= 0.1;

    const home = wash.position.clone();
    await this.anim.arcTo(wash, new THREE.Vector3(target.x - 0.6, home.y + 0.4, target.z + 0.2), 1.0, 0.6);
    await this.anim.pour(nozzle.clone().add(new THREE.Vector3(0.1, 0, 0)), target, 1.2, 0xdff0f6);
    await this.anim.arcTo(wash, home, 1.0, 0.6);
    this.state.run.instrument.rinsed = true;
    this.state.notify('Probe rinsed with distilled water and blotted dry.', 'ok');
    return true;
  }

  async fillBeaker() {
    const exp = this.state.experiment;
    const beaker = this.lab.beakerFor(exp.id);
    const sample = this.state.sample;
    const bottle = this.lab.sampleBottle(this.state.sampleKey);
    this.beakerSolution.reset();
    await this.tiltPour(bottle, beaker, async ({ lip, mouth }) => {
      this.anim.showStream(lip, mouth.clone().setY(mouth.y - 0.3), sample.color, 0.035);
      await this.anim.tween({
        duration: 1.8,
        onUpdate: (e) => {
          this.beakerSolution.volume_mL = 80 * e;
          this.beakerSolution.color = new THREE.Color(sample.color);
          applySolution(beaker, this.beakerSolution);
        },
      });
      this.anim.hideStream();
    });

    this.state.run.beaker.sampleVolume_mL = 80;
    this.state.notify(`80 mL of ${sample.name} poured into the beaker.`, 'ok');
    return true;
  }

  async immerseProbe(meterKey) {
    const meter = this.lab.objects[meterKey];
    const probe = meterKey === 'phmeter' ? meter.userData.electrode : meter.userData.cell;
    const beaker = this.lab.beakerFor(this.state.experiment.id);
    const targetY = probe.userData.homeY - 0.95;
    await this.anim.tween({
      duration: 1.4,
      onUpdate: (e) => { probe.position.y = probe.userData.homeY + (targetY - probe.userData.homeY) * e; },
    });
    await this.anim.bubbles(beaker.position.clone().setY(beaker.position.y + 0.3), 4, 0.9);
    this.state.run.instrument.immersed = true;
    this.state.notify('Probe immersed in the sample.', 'ok');
    this.setPhase(PHASE.MEASURE);
    return true;
  }

  async measurePH() {
    const inst = this.lab.objects.phmeter;
    const sample = this.state.sample;
    if (!this.state.run.instrument.calibrated && this.state.mode === 'guided') {
      this.state.recordError('Calibrate the meter before measuring, otherwise the reading is meaningless.');
      return false;
    }
    const target = sample.pH + (Math.random() * 2 - 1) * 0.04;
    const value = await this.anim.stabilise({ display: inst.userData.display, target, unit: 'pH', dp: 2, duration: 4.5 });
    this.state.run.instrument.reading = value;
    this.state.run.instrument.stable = true;
    this.state.notify(`Reading stable at pH ${fmt(value)}.`, 'ok');
    this.setPhase(PHASE.CALCULATE);
    return true;
  }

  async measureConductivity() {
    const inst = this.lab.objects.condmeter;
    const sample = this.state.sample;
    const target = sample.conductivity_uS * (1 + (Math.random() * 2 - 1) * 0.01);
    const value = await this.anim.stabilise({
      display: inst.userData.display, target, unit: 'uS/cm', dp: 1, duration: 4.0, noise: 6,
    });
    this.state.run.instrument.reading = value;
    this.state.run.instrument.stable = true;
    this.state.notify(`Conductivity stable at ${fmt(value, 1)} µS/cm.`, 'ok');
    this.setPhase(PHASE.CALCULATE);
    return true;
  }

  async fillVial() {
    const vial = this.lab.objects.vial;
    const sample = this.state.sample;
    const bottle = this.lab.sampleBottle(this.state.sampleKey);
    this.vialSolution.reset();
    await this.tiltPour(bottle, vial, async ({ lip, mouth }) => {
      this.anim.showStream(lip, mouth.clone().setY(mouth.y - 0.3), sample.color, 0.025);
      await this.anim.tween({
        duration: 1.4,
        onUpdate: (e) => {
          this.vialSolution.volume_mL = 25 * e;
          this.vialSolution.color = new THREE.Color(sample.color);
          applySolution(vial, this.vialSolution);
        },
      });
      this.anim.hideStream();
    }, { clear: 0.45 });
    this.state.run.vialFilled = true;
    this.state.notify('Sample vial rinsed and filled to the mark.', 'ok');
    return true;
  }

  async insertVial() {
    if (!this.state.run.vialFilled) { this.state.recordError('Fill the vial with the sample first.'); return false; }
    const vial = this.lab.objects.vial;
    const meter = this.lab.objects.turbmeter;
    const well = meter.localToWorld(meter.userData.wellPosition.clone());
    await this.anim.arcTo(vial, well, 1.2, 0.9);
    await this.anim.tween({
      duration: 0.5,
      onUpdate: (e) => { meter.userData.lid.position.y = 0.66 + 0.18 * (1 - e); },
    });
    this.state.run.vialInserted = true;
    this.state.notify('Vial seated in the measuring well, lid closed.', 'ok');
    return true;
  }

  async measureTurbidity() {
    const inst = this.lab.objects.turbmeter;
    const sample = this.state.sample;
    const target = sample.turbidity_NTU * (1 + (Math.random() * 2 - 1) * 0.02);
    const value = await this.anim.stabilise({
      display: inst.userData.display, target, unit: 'NTU', dp: 2, duration: 3.2, noise: 0.25,
    });
    this.state.run.instrument.reading = value;
    this.state.run.instrument.stable = true;
    this.state.notify(`Turbidity reading: ${fmt(value)} NTU.`, 'ok');
    this.setPhase(PHASE.CALCULATE);
    return true;
  }

  recordReading() {
    const run = this.state.run;
    if (run.instrument.reading === null) { this.state.recordError('Take a reading before recording it.'); return false; }
    run.readings.push(run.instrument.reading);
    this.state.notify('Reading recorded in the observation table.', 'ok');
    this.calculate();
    return true;
  }

  /* ================================================================ */
  /* Standard hard water preparation                                  */
  /* ================================================================ */

  async weighCaCO3() {
    const balance = this.lab.objects.balance;
    const target = caco3MassForStandard({
      strength_mgL: CONFIG.standardHardWater_mgL, finalVolume_mL: 1000,
    });
    balance.userData.display.set('0.0000', 'mg');
    await this.anim.wait(0.4);
    const weighed = await this.anim.stabilise({
      display: balance.userData.display, target, unit: 'mg', dp: 4, duration: 2.6, noise: target * 0.02 + 0.0005,
    });
    this.state.run.caco3_mg = weighed;
    this.state.notify(`${fmt(weighed, 4)} mg of AR CaCO3 weighed out.`, 'ok');
    return true;
  }

  async dissolve() {
    const beaker = this.lab.objects.beaker_prep;
    if (this.state.run.caco3_mg === null) { this.state.recordError('Weigh the CaCO3 before dissolving it.'); return false; }
    const sol = new Solution(250);
    sol.volume_mL = 0;
    await this.anim.tween({
      duration: 1.4,
      onUpdate: (e) => {
        sol.volume_mL = 90 * e;
        sol.color = new THREE.Color(0xdff0f6);
        applySolution(beaker, sol);
      },
    });
    await this.anim.bubbles(beaker.position.clone().setY(beaker.position.y + 0.25), 12, 1.8);
    this.state.notify('CaCO3 dissolved in dilute HCl — effervescence of CO2 observed.', 'ok');
    return true;
  }

  async transferToVolumetric() {
    const beaker = this.lab.objects.beaker_prep;
    const volumetric = this.lab.objects.volumetric;
    await this.tiltPour(beaker, volumetric, async ({ lip, mouth }) => {
      this.anim.showStream(lip, mouth, 0xdff0f6);
      await Promise.all([
        this.anim.fillTo(beaker.userData.liquid, 0, 1.6),
        this.anim.fillTo(volumetric.userData.liquid, 0.7, 1.6),
      ]);
      this.anim.hideStream();
    }, { tilt: -1.2, clear: 0.6 });
    this.state.notify('Solution transferred quantitatively through the funnel, beaker rinsed in.', 'ok');
    return true;
  }

  async makeUpToMark() {
    const volumetric = this.lab.objects.volumetric;
    const wash = this.lab.objects.washbottle;
    const home = wash.position.clone();
    const vTop = new THREE.Box3().setFromObject(volumetric).max.y;
    const over = volumetric.position.clone().setY(vTop + 0.9);
    await this.anim.arcTo(wash, over, 1.2, 0.8);
    await this.anim.pour(over.clone().setY(over.y - 0.2), volumetric.position.clone().setY(vTop - 0.3), 1.4, 0xdff0f6);
    await this.anim.fillTo(volumetric.userData.liquid, 1.0, 0.8);
    await this.anim.fillTo(volumetric.userData.neckLiquid, 1.0, 0.9);
    await this.anim.arcTo(wash, home, 1.1, 0.8);
    this.state.run.madeUp = true;
    this.state.notify('Made up to the 1000 mL mark and inverted twenty times to mix.', 'ok');
    return true;
  }

  /* ================================================================ */
  /* Results                                                          */
  /* ================================================================ */

  calculate() {
    const exp = this.state.experiment;
    const run = this.state.run;
    const sample = this.state.sample;
    let result = null;

    if (exp.id === 'alkalinity_mixed') {
      if (run.burette.finalReading === null) { this.state.recordError('Record the final burette reading first.'); return false; }
      result = buildMixedAlkalinityResult({ run, V_sample_mL: run.flask.sampleVolume_mL || CONFIG.pipetteVolume_mL });
    } else if (exp.kind === 'titration') {
      if (run.burette.finalReading === null) { this.state.recordError('Record the final burette reading first.'); return false; }
      result = buildTitrationResult({
        experimentId: exp.id, run, sample,
        V_sample_mL: run.flask.sampleVolume_mL || CONFIG.pipetteVolume_mL,
      });
    } else if (exp.kind === 'instrument') {
      if (run.instrument.reading === null) { this.state.recordError('Take a reading before calculating.'); return false; }
      result = buildInstrumentResult({ experimentId: exp.id, reading: run.instrument.reading, sample });
    } else if (exp.kind === 'preparation') {
      if (run.caco3_mg === null) { this.state.recordError('Weigh the CaCO3 first.'); return false; }
      if (!run.madeUp) { this.state.recordError('Make the solution up to the mark before reporting its strength.'); return false; }
      result = buildPreparationResult({ caco3_mg: run.caco3_mg, finalVolume_mL: 1000 });
      this.state.preparedStandard = { strength_mgL: result.strength_mgL, preparedAt: new Date().toLocaleString() };
      this.state.notify('Standard hard water is now available as a sample for the hardness titration.', 'ok');
    }

    if (!result) return false;
    run.result = result;
    run.status = 'complete';
    this.setPhase(PHASE.RESULT);
    this.state.emit('result:ready', result);
    return true;
  }

  /** Called by the UI "Save observation" button. */
  saveObservation() {
    const run = this.state.run;
    const exp = this.state.experiment;
    if (!run.result) { this.state.recordError('Complete the calculation before saving the observation.'); return false; }
    this.state.saveObservation({
      experiment: exp.name,
      sample: this.state.sample.name,
      value: run.result.value,
      unit: run.result.unit,
      dp: run.result.dp,
      detail: run.result.observation,
    });
    this.state.notify('Observation saved to the record sheet.', 'ok');
    return true;
  }

  /** Rows for the live observation table. */
  observationRows() {
    const run = this.state.run;
    const exp = this.state.experiment;
    if (!exp) return [];
    const rows = [['Sample', this.state.sample.name]];
    if (exp.kind === 'titration') {
      rows.push(['Titrant', REAGENTS[exp.titrant].name]);
      rows.push(['Titrant concentration',
        REAGENTS[exp.titrant].molarity ? `${REAGENTS[exp.titrant].molarity} M` : `${REAGENTS[exp.titrant].normality} N`]);
      rows.push(['Volume of sample pipetted', `${fmt(run.flask.sampleVolume_mL)} mL`]);
      rows.push(['Indicator', run.flask.indicator ? INDICATOR_COLORS[run.flask.indicator].name : '—']);
      rows.push(['Initial burette reading', run.burette.initialReading === null ? '—' : `${fmt(run.burette.initialReading)} mL`]);
      if (exp.twoStage) {
        rows.push(['Phenolphthalein endpoint (P)', run.burette.pReading === null ? '—' : `${fmt(run.burette.pReading)} mL`]);
      }
      rows.push(['Current burette reading', `${fmt(run.burette.reading_mL)} mL`]);
      rows.push(['Final burette reading', run.burette.finalReading === null ? '—' : `${fmt(run.burette.finalReading)} mL`]);
      const used = (run.burette.finalReading ?? run.burette.reading_mL) - (run.burette.initialReading ?? 0);
      rows.push(['Volume of titrant used', `${fmt(Math.max(0, used))} mL`]);
      rows.push(['Solution colour', run.flask.indicator ? describeColor(run.flask.indicator, this.titrationProgress) : '—']);
    } else if (exp.kind === 'instrument') {
      rows.push(['Instrument', exp.id === 'turbidity' ? 'Nephelometer' : exp.id === 'ph' ? 'pH meter' : 'Conductivity meter']);
      rows.push(['Calibrated', run.instrument.calibrated ? 'Yes' : 'No']);
      rows.push(['Probe immersed', run.instrument.immersed || run.vialInserted ? 'Yes' : 'No']);
      rows.push(['Reading', run.instrument.reading === null ? '—' : fmt(run.instrument.reading, exp.id === 'conductivity' ? 1 : 2)]);
    } else if (exp.kind === 'preparation') {
      rows.push(['Target strength', `${CONFIG.standardHardWater_mgL} mg/L as CaCO3`]);
      rows.push(['Mass of CaCO3 weighed', run.caco3_mg === null ? '—' : `${fmt(run.caco3_mg, 4)} mg`]);
      rows.push(['Final volume', '1000.0 mL']);
      rows.push(['Made up to the mark', run.madeUp ? 'Yes' : 'No']);
    }
    return rows;
  }
}
