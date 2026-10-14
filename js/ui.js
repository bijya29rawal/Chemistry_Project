/**
 * ui.js — every DOM panel, and the wiring between the panels and the
 * experiment controller. No chemistry lives here.
 */

import { CONFIG, EXPERIMENTS, EXPERIMENT_ORDER, SAMPLES, REAGENTS } from './data.js';
import { fmt } from './calculations.js';
import { INDICATOR_COLORS, describeColor } from './chemicals.js';

const $ = (id) => document.getElementById(id);

const TABS = ['objective', 'apparatus', 'chemicals', 'theory', 'procedure', 'observation', 'calculation', 'result', 'precautions'];

export class UI {
  constructor({ state, controller, labCamera, animator }) {
    this.state = state;
    this.controller = controller;
    this.labCamera = labCamera;
    this.animator = animator;
    this.activeTab = 'procedure';

    this.cacheNodes();
    this.buildExperimentList();
    this.buildSampleList();
    this.buildSettings();
    this.buildTabs();
    this.bindControls();
    this.subscribe();
    this.renderAll();
  }

  cacheNodes() {
    this.nodes = {
      expList: $('exp-list'),
      sampleList: $('sample-list'),
      shwSelect: $('shw-select'),
      shwNote: $('shw-note'),
      btnStart: $('btn-start'),
      btnReset: $('btn-reset'),
      btnPause: $('btn-pause'),
      modeGuided: $('mode-guided'),
      modeFree: $('mode-free'),
      speedSelect: $('speed-select'),
      reducedMotion: $('reduced-motion'),
      viewButtons: $('view-buttons'),
      tabs: $('tabs'),
      tabContent: $('tab-content'),
      currentStep: $('current-step'),
      stepHint: $('step-hint'),
      stepProgress: $('step-progress'),
      actionButtons: $('action-buttons'),
      hudInitial: $('hud-initial'),
      hudCurrent: $('hud-current'),
      hudFinal: $('hud-final'),
      hudUsed: $('hud-used'),
      hudColour: $('hud-colour'),
      hudPhase: $('hud-phase'),
      btnStopcock: $('btn-stopcock'),
      flowButtons: $('flow-buttons'),
      obsTable: $('obs-table'),
      resultPanel: $('result-panel'),
      savedTable: $('saved-table'),
      toastStack: $('toast-stack'),
      expTitle: $('exp-title'),
      expSubtitle: $('exp-subtitle'),
      selectionName: $('selection-name'),
      selectionMeta: $('selection-meta'),
      reagentStock: $('reagent-stock'),
    };
  }

  /* ================================================================ */
  /* Left column                                                      */
  /* ================================================================ */

  buildExperimentList() {
    const list = this.nodes.expList;
    list.innerHTML = '';
    for (const id of EXPERIMENT_ORDER) {
      const exp = EXPERIMENTS[id];
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'exp-item';
      btn.dataset.id = id;
      btn.innerHTML = `<span class="exp-tag">${exp.icon}</span>
        <span class="exp-body"><span class="exp-name">${exp.name}</span>
        <span class="exp-kind">${exp.kind}</span></span>`;
      btn.addEventListener('click', () => {
        this.state.selectExperiment(id);
        this.activeTab = 'procedure';
        const view = exp.kind === 'titration' ? 'titration'
          : exp.kind === 'preparation' ? 'preparation' : 'instruments';
        this.labCamera.flyToView(view, this.animator);
      });
      li.appendChild(btn);
      list.appendChild(li);
    }
  }

  buildSampleList() {
    const list = this.nodes.sampleList;
    list.innerHTML = '';
    for (const key of Object.keys(SAMPLES)) {
      const s = SAMPLES[key];
      const btn = document.createElement('button');
      btn.className = 'sample-item';
      btn.dataset.key = key;
      const swatch = `<span class="swatch" style="background:#${s.color.toString(16).padStart(6, '0')}"></span>`;
      btn.innerHTML = `${swatch}<span>${s.name}</span>`;
      btn.addEventListener('click', () => this.controller.dispatch('SELECT_SAMPLE', { sampleKey: key }));
      list.appendChild(btn);
    }
  }

  buildSettings() {
    const sel = this.nodes.shwSelect;
    sel.innerHTML = '';
    for (const v of CONFIG.standardHardWaterPresets) {
      const opt = document.createElement('option');
      opt.value = String(v);
      opt.textContent = `${v} mg/L as CaCO3`;
      sel.appendChild(opt);
    }
    sel.value = String(CONFIG.standardHardWater_mgL);
    sel.addEventListener('change', () => {
      CONFIG.standardHardWater_mgL = Number(sel.value);
      this.state.preparedStandard = null;
      this.state.notify(`Standard hard water strength set to ${CONFIG.standardHardWater_mgL} mg/L as CaCO3.`, 'ok');
      this.renderSettingsNote();
      this.renderObservation();
    });
    this.renderSettingsNote();
  }

  renderSettingsNote() {
    const v = CONFIG.standardHardWater_mgL;
    this.nodes.shwNote.textContent = v < 10
      ? `At ${v} mg/L a 50 mL aliquot holds ${fmt(v * 0.05, 4)} mg CaCO3, so the EDTA titre is about `
        + `${fmt((v * 50) / (REAGENTS.edta.molarity * 100086.9), 4)} mL. Realistic, but far too small to read on a burette — `
        + `choose 1000 mg/L for a normal practical.`
      : `A 50 mL aliquot holds ${fmt(v * 0.05, 3)} mg CaCO3, giving an EDTA titre of about `
        + `${fmt((v * 50) / (REAGENTS.edta.molarity * 100086.9), 2)} mL.`;
  }

  /* ================================================================ */
  /* Right column tabs                                                */
  /* ================================================================ */

  buildTabs() {
    const bar = this.nodes.tabs;
    bar.innerHTML = '';
    for (const t of TABS) {
      const b = document.createElement('button');
      b.className = 'tab';
      b.dataset.tab = t;
      b.textContent = t.charAt(0).toUpperCase() + t.slice(1);
      b.addEventListener('click', () => { this.activeTab = t; this.renderTabs(); });
      bar.appendChild(b);
    }
  }

  renderTabs() {
    const exp = this.state.experiment;
    for (const b of this.nodes.tabs.querySelectorAll('.tab')) {
      b.classList.toggle('active', b.dataset.tab === this.activeTab);
    }
    const c = this.nodes.tabContent;
    if (!exp) {
      c.innerHTML = '<p class="muted">Choose an experiment on the left to see its notes.</p>';
      return;
    }
    const listOf = (arr) => `<ul class="bullets">${arr.map((x) => `<li>${x}</li>`).join('')}</ul>`;

    switch (this.activeTab) {
      case 'objective': c.innerHTML = `<p>${exp.objective}</p>`; break;
      case 'apparatus': c.innerHTML = listOf(exp.apparatus); break;
      case 'chemicals': c.innerHTML = listOf(exp.chemicals); break;
      case 'theory': c.innerHTML = `<p>${exp.theory}</p>`; break;
      case 'precautions': c.innerHTML = listOf(exp.precautions); break;
      case 'procedure': c.innerHTML = this.procedureHTML(); break;
      case 'observation': c.innerHTML = this.observationHTML(); break;
      case 'calculation': c.innerHTML = this.calculationHTML(); break;
      case 'result': c.innerHTML = this.resultHTML(); break;
      default: c.innerHTML = '';
    }
  }

  procedureHTML() {
    const exp = this.state.experiment;
    const run = this.state.run;
    const rows = exp.steps.map((s, i) => {
      const done = run.completedSteps.includes(s.id);
      const current = i === run.stepIndex && run.status !== 'idle' && !done;
      return `<li class="${done ? 'done' : current ? 'current' : ''}">
        <span class="mark">${done ? '✓' : i + 1}</span><span>${s.text}</span></li>`;
    }).join('');
    return `<ol class="steps">${rows}</ol>`;
  }

  observationHTML() {
    const rows = this.controller.observationRows();
    if (!rows.length) return '<p class="muted">No observations yet.</p>';
    return `<table class="data"><tbody>${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</tbody></table>`;
  }

  calculationHTML() {
    const r = this.state.run.result;
    if (!r) return '<p class="muted">The calculation appears once the readings are complete.</p>';
    return `
      <h4>Observation</h4>
      <table class="data"><tbody>${r.observation.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</tbody></table>
      <h4>Calculation</h4>
      <p class="formula">${r.formula}</p>
      <p class="formula">${r.substitution}</p>
      <pre class="working">${r.working}</pre>`;
  }

  resultHTML() {
    const r = this.state.run.result;
    if (!r) return '<p class="muted">No result yet.</p>';
    const comp = r.components ? `
      <table class="data"><tbody>
        <tr><th>Hydroxide alkalinity</th><td>${fmt(r.components.OH_mgL)} mg/L as CaCO3</td></tr>
        <tr><th>Carbonate alkalinity</th><td>${fmt(r.components.CO3_mgL)} mg/L as CaCO3</td></tr>
        <tr><th>Bicarbonate alkalinity</th><td>${fmt(r.components.HCO3_mgL)} mg/L as CaCO3</td></tr>
        <tr><th>Phenolphthalein alkalinity</th><td>${fmt(r.components.P_mgL)} mg/L as CaCO3</td></tr>
      </tbody></table>` : '';
    return `<div class="result-figure"><span class="value">${fmt(r.value, r.dp)}</span>
      <span class="unit">${r.unit}</span></div>
      <p class="remark">${r.remark}</p>${comp}`;
  }

  /* ================================================================ */
  /* Controls                                                         */
  /* ================================================================ */

  bindControls() {
    this.nodes.btnStart.addEventListener('click', () => {
      if (!this.state.experiment) { this.toast('Choose an experiment first.', 'warn'); return; }
      if (this.state.start()) this.toast(`${this.state.experiment.name} started.`, 'ok');
    });

    this.nodes.btnReset.addEventListener('click', () => {
      this.state.reset();
      this.toast('Bench reset. All glassware emptied.', 'info');
    });

    this.nodes.btnPause.addEventListener('click', () => {
      this.animator.paused = !this.animator.paused;
      this.state.paused = this.animator.paused;
      this.nodes.btnPause.textContent = this.animator.paused ? 'Resume' : 'Pause';
      this.nodes.btnPause.classList.toggle('active', this.animator.paused);
    });

    this.nodes.modeGuided.addEventListener('click', () => this.state.setMode('guided'));
    this.nodes.modeFree.addEventListener('click', () => this.state.setMode('free'));

    this.nodes.speedSelect.addEventListener('change', () => {
      CONFIG.animationSpeed = Number(this.nodes.speedSelect.value);
    });

    this.nodes.reducedMotion.addEventListener('change', () => {
      CONFIG.reducedMotion = this.nodes.reducedMotion.checked;
    });

    for (const btn of this.nodes.viewButtons.querySelectorAll('button')) {
      btn.addEventListener('click', () => this.labCamera.flyToView(btn.dataset.view, this.animator));
    }

    this.nodes.btnStopcock.addEventListener('click', () => this.controller.dispatch('TITRATE'));

    for (const btn of this.nodes.flowButtons.querySelectorAll('button')) {
      btn.addEventListener('click', () => {
        this.controller.setFlowMode(btn.dataset.flow);
        for (const b of this.nodes.flowButtons.querySelectorAll('button')) {
          b.classList.toggle('active', b === btn);
        }
      });
    }
  }

  renderActionButtons() {
    const exp = this.state.experiment;
    const box = this.nodes.actionButtons;
    box.innerHTML = '';
    if (!exp) return;

    const add = (label, action, handler) => {
      const b = document.createElement('button');
      b.className = 'action';
      b.textContent = label;
      b.addEventListener('click', handler || (() => this.controller.dispatch(action)));
      if (this.state.mode === 'guided' && this.controller.expectedAction === action) b.classList.add('expected');
      box.appendChild(b);
    };

    if (exp.kind === 'titration') {
      add('Record initial reading', 'RECORD_INITIAL');
      if (exp.twoStage) add('Record P endpoint', 'RECORD_P');
      add('Record final reading', 'RECORD_FINAL');
      add('Swirl flask', 'SWIRL');
    }
    if (exp.kind === 'instrument') add('Record reading', 'RECORD_READING');
    add('Calculate result', 'CALCULATE');

    const save = document.createElement('button');
    save.className = 'action ghost';
    save.textContent = 'Save observation';
    save.addEventListener('click', () => { this.controller.saveObservation(); this.renderSaved(); });
    box.appendChild(save);

    const clear = document.createElement('button');
    clear.className = 'action ghost';
    clear.textContent = 'Clear saved';
    clear.addEventListener('click', () => { this.state.clearObservations(); this.renderSaved(); });
    box.appendChild(clear);
  }

  /* ================================================================ */
  /* Subscriptions                                                    */
  /* ================================================================ */

  subscribe() {
    this.state.on('state:changed', () => this.renderAll());
    this.state.on('experiment:changed', () => { this.renderAll(); });
    this.state.on('experiment:reset', () => this.renderAll());
    this.state.on('sample:changed', () => this.renderAll());
    this.state.on('mode:changed', () => this.renderAll());
    this.state.on('reading:changed', () => this.renderHUD());
    this.state.on('color:changed', () => this.renderHUD());
    this.state.on('phase:changed', () => this.renderHUD());
    this.state.on('result:ready', () => { this.activeTab = 'result'; this.renderAll(); });
    this.state.on('observations:changed', () => this.renderSaved());
    this.state.on('notify', ({ message, kind }) => this.toast(message, kind));
    this.state.on('selection:changed', (group) => this.renderSelection(group));
    this.state.on('reagents:changed', () => this.renderStock());
  }

  renderAll() {
    this.renderHeader();
    this.renderLists();
    this.renderStep();
    this.renderActionButtons();
    this.renderTabs();
    this.renderHUD();
    this.renderObservation();
    this.renderResult();
    this.renderStock();
  }

  renderHeader() {
    const exp = this.state.experiment;
    this.nodes.expTitle.textContent = exp ? exp.name : 'Select an experiment';
    this.nodes.expSubtitle.textContent = exp
      ? `${exp.objective}`
      : 'Ten water-analysis practicals are available. Look around the bench while you decide.';
    this.nodes.modeGuided.classList.toggle('active', this.state.mode === 'guided');
    this.nodes.modeFree.classList.toggle('active', this.state.mode === 'free');
    this.nodes.btnStart.disabled = !exp || this.state.run.status !== 'idle';
  }

  renderLists() {
    for (const b of this.nodes.expList.querySelectorAll('.exp-item')) {
      b.classList.toggle('active', b.dataset.id === this.state.experimentId);
    }
    for (const b of this.nodes.sampleList.querySelectorAll('.sample-item')) {
      b.classList.toggle('active', b.dataset.key === this.state.sampleKey);
      if (b.dataset.key === 'standard_hard') {
        const s = this.state.preparedStandard;
        b.title = s ? `Prepared at ${s.preparedAt}: ${fmt(s.strength_mgL, 3)} mg/L`
          : `Nominal ${CONFIG.standardHardWater_mgL} mg/L as CaCO3`;
      }
    }
  }

  renderStep() {
    const exp = this.state.experiment;
    const run = this.state.run;
    if (!exp) {
      this.nodes.currentStep.textContent = 'No experiment loaded.';
      this.nodes.stepHint.textContent = '';
      this.nodes.stepProgress.textContent = '';
      return;
    }
    if (run.status === 'idle') {
      this.nodes.currentStep.textContent = 'Press "Start experiment" when you are ready.';
      this.nodes.stepHint.textContent = `Sample loaded: ${this.state.sample.name}`;
      this.nodes.stepProgress.textContent = `0 / ${exp.steps.length}`;
      return;
    }
    const step = this.state.currentStep;
    if (this.state.mode === 'free') {
      this.nodes.currentStep.textContent = 'Free practice — work through the procedure yourself.';
      this.nodes.stepHint.textContent = 'The bench still refuses physically impossible operations.';
    } else if (step) {
      this.nodes.currentStep.textContent = step.text;
      this.nodes.stepHint.textContent = step.hint;
    }
    this.nodes.stepProgress.textContent = `${run.completedSteps.length} / ${exp.steps.length}`;
  }

  renderHUD() {
    const run = this.state.run;
    const b = run.burette;
    const exp = this.state.experiment;
    const used = (b.finalReading ?? b.reading_mL) - (b.initialReading ?? 0);
    this.nodes.hudInitial.textContent = b.initialReading === null ? '—' : fmt(b.initialReading);
    this.nodes.hudCurrent.textContent = fmt(b.reading_mL);
    this.nodes.hudFinal.textContent = b.finalReading === null ? '—' : fmt(b.finalReading);
    this.nodes.hudUsed.textContent = fmt(Math.max(0, used));
    this.nodes.hudPhase.textContent = this.controller.phase;
    this.nodes.btnStopcock.textContent = b.open ? 'Close stopcock' : 'Open stopcock';
    this.nodes.btnStopcock.classList.toggle('open', b.open);

    const ind = run.flask.indicator;
    if (ind && exp) {
      const p = this.controller.titrationProgress;
      const c = INDICATOR_COLORS[ind];
      this.nodes.hudColour.textContent = describeColor(ind, p);
      this.nodes.hudColour.style.color = `#${(p >= 1 ? c.after : c.before).toString(16).padStart(6, '0')}`;
    } else {
      this.nodes.hudColour.textContent = '—';
      this.nodes.hudColour.style.color = '';
    }
  }

  renderObservation() {
    const rows = this.controller.observationRows();
    this.nodes.obsTable.innerHTML = rows.length
      ? `<table class="data"><tbody>${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</tbody></table>`
      : '<p class="muted">Observations appear here as you work.</p>';
  }

  renderResult() {
    this.nodes.resultPanel.innerHTML = this.state.run.result
      ? this.resultHTML()
      : '<p class="muted">The result is reported here once the calculation is done.</p>';
  }

  renderSaved() {
    const obs = this.state.observations;
    if (!obs.length) {
      this.nodes.savedTable.innerHTML = '<p class="muted">No saved observations.</p>';
      return;
    }
    const rows = obs.map((o, i) => `<tr><td>${i + 1}</td><td>${o.experiment}</td><td>${o.sample}</td>
      <td>${fmt(o.value, o.dp)} ${o.unit}</td><td>${o.savedAt}</td></tr>`).join('');
    this.nodes.savedTable.innerHTML = `<table class="data wide">
      <thead><tr><th>#</th><th>Experiment</th><th>Sample</th><th>Result</th><th>Saved</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
  }

  renderSelection(group) {
    if (!group) {
      this.nodes.selectionName.textContent = 'Nothing selected';
      this.nodes.selectionMeta.textContent = 'Click any apparatus on the bench.';
      return;
    }
    this.nodes.selectionName.textContent = group.userData.name;
    const ud = group.userData;
    let meta = ud.type;
    if (ud.reagentKey) {
      const r = REAGENTS[ud.reagentKey];
      meta = `${r.formula} · ${r.molarity ? `${r.molarity} M` : r.normality ? `${r.normality} N` : 'reagent'} · ${fmt(r.stock_mL ?? 0, 0)} mL left`;
    } else if (ud.sampleKey) {
      meta = SAMPLES[ud.sampleKey].description;
    } else if (ud.capacity) {
      meta = `Capacity ${ud.capacity} mL`;
    }
    this.nodes.selectionMeta.textContent = meta;
  }

  renderStock() {
    const keys = ['edta', 'hcl', 'agno3', 'buffer', 'ebt', 'phenolphthalein', 'methylorange', 'k2cro4'];
    this.nodes.reagentStock.innerHTML = keys.map((k) => {
      const r = REAGENTS[k];
      const pct = Math.max(0, Math.min(100, (r.stock_mL / (k === 'edta' || k === 'hcl' ? 1000 : k === 'agno3' ? 500 : k === 'buffer' ? 250 : 50)) * 100));
      return `<div class="stock-row"><span>${r.name}</span>
        <span class="bar"><span style="width:${pct}%"></span></span>
        <span class="mono">${fmt(r.stock_mL, 0)} mL</span></div>`;
    }).join('');
  }

  /* ================================================================ */
  /* Toasts                                                           */
  /* ================================================================ */

  toast(message, kind = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = message;
    this.nodes.toastStack.appendChild(el);
    setTimeout(() => { el.classList.add('out'); }, 4200);
    setTimeout(() => { el.remove(); }, 4800);
    while (this.nodes.toastStack.children.length > 4) {
      this.nodes.toastStack.removeChild(this.nodes.toastStack.firstChild);
    }
  }
}
