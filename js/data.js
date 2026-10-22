/**
 * data.js — static configuration for the virtual water-analysis laboratory.
 *
 * Nothing in this file is a "result". It holds the physical/chemical
 * properties of the virtual samples and reagents. Every number the student
 * finally sees is derived from these properties plus what they actually did
 * at the bench (see calculations.js).
 */

/* ------------------------------------------------------------------ */
/* Global configuration — editable at runtime from the Settings panel  */
/* ------------------------------------------------------------------ */
export const CONFIG = {
  /**
   * Standard hard water strength used by the "Standard hard water
   * preparation" experiment and by EDTA standardisation.
   *
   * The brief specifies 1 mg/L CaCO3 equivalent, so that is the default.
   * It is deliberately exposed here (and in the UI) rather than being
   * silently replaced: at 1 mg/L a 50 mL aliquot contains 0.05 mg CaCO3,
   * which consumes ~0.0005 mL of 0.01 M EDTA. The simulator reports that
   * honestly and warns the student. Typical teaching labs use 1000 mg/L;
   * both are selectable.
   */
  standardHardWater_mgL: 1,
  standardHardWaterPresets: [1, 100, 1000],

  pipetteVolume_mL: 50,          // bulb pipette used for all aliquots
  buretteCapacity_mL: 50,
  flaskCapacity_mL: 250,

  flowRate_mL_per_s: 1.2,        // stopcock fully open
  dropVolume_mL: 0.05,           // one drop from the burette tip

  meterNoise: 0.35,              // instrument fluctuation before stabilising
  titrationScatter: 0.012,       // ±1.2 % operator/indicator error

  animationSpeed: 1,
  reducedMotion: false,
};

/* ------------------------------------------------------------------ */
/* Reagents                                                            */
/* ------------------------------------------------------------------ */
export const REAGENTS = {
  edta: {
    key: 'edta', name: 'EDTA solution', formula: 'Na2H2Y·2H2O',
    molarity: 0.01, unit: 'M', color: 0x4aaed6, container: 'Reagent bottle',
    stock_mL: 1000, experiments: ['hardness', 'shw_prep'],
    note: 'Disodium salt of ethylenediaminetetraacetic acid, 0.01 M.',
  },
  hcl: {
    key: 'hcl', name: 'Hydrochloric acid', formula: 'HCl',
    normality: 0.02, unit: 'N', color: 0x58b6de, container: 'Reagent bottle',
    stock_mL: 1000, experiments: ['alkalinity_total', 'alkalinity_mixed', 'acidbase'],
    note: 'Standardised 0.02 N HCl.',
  },
  naoh: {
    key: 'naoh', name: 'Sodium hydroxide', formula: 'NaOH',
    normality: 0.02, unit: 'N', color: 0x50b0db, container: 'Reagent bottle',
    stock_mL: 1000, experiments: ['acidbase'],
    note: 'Standardised 0.02 N NaOH (used as the sample in the acid–base run).',
  },
  agno3: {
    key: 'agno3', name: 'Silver nitrate', formula: 'AgNO3',
    normality: 0.0141, unit: 'N', color: 0x62bee2, container: 'Amber bottle',
    stock_mL: 500, experiments: ['chloride'],
    note: '0.0141 N AgNO3 — 1 mL ≡ 0.5 mg Cl⁻ (Mohr method).',
  },
  buffer: {
    key: 'buffer', name: 'Ammonia buffer pH 10', formula: 'NH4Cl / NH4OH',
    color: 0x4eb2da, container: 'Reagent bottle', stock_mL: 250,
    experiments: ['hardness'], doseDrops: 0, doseVolume_mL: 2,
    note: 'Holds the sample at pH 10 so the EBT–Mg complex is stable.',
  },
  ebt: {
    key: 'ebt', name: 'Eriochrome Black T', formula: 'C20H12N3O7SNa',
    color: 0x5c2340, container: 'Indicator bottle', stock_mL: 50,
    experiments: ['hardness'], doseDrops: 3, doseVolume_mL: 0.15,
    note: 'Wine-red with Ca²⁺/Mg²⁺ at pH 10, steel-blue when free.',
  },
  phenolphthalein: {
    key: 'phenolphthalein', name: 'Phenolphthalein', formula: 'C20H14O4',
    color: 0xf7eef3, container: 'Indicator bottle', stock_mL: 50,
    experiments: ['alkalinity_mixed', 'acidbase'], doseDrops: 2, doseVolume_mL: 0.1,
    note: 'Pink above pH 8.3, colourless below.',
  },
  methylorange: {
    key: 'methylorange', name: 'Methyl orange', formula: 'C14H14N3NaO3S',
    color: 0xe8a33d, container: 'Indicator bottle', stock_mL: 50,
    experiments: ['alkalinity_total', 'alkalinity_mixed'], doseDrops: 2, doseVolume_mL: 0.1,
    note: 'Yellow above pH 4.4, orange-red below.',
  },
  k2cro4: {
    key: 'k2cro4', name: 'Potassium chromate', formula: 'K2CrO4',
    color: 0xe5c22a, container: 'Indicator bottle', stock_mL: 50,
    experiments: ['chloride'], doseDrops: 0, doseVolume_mL: 1,
    note: '5 % K2CrO4 — forms brick-red Ag2CrO4 at the Mohr endpoint.',
  },
  caco3: {
    key: 'caco3', name: 'Calcium carbonate (AR)', formula: 'CaCO3',
    color: 0xfbfbf8, container: 'Weighing bottle', stock_mg: 5000,
    experiments: ['shw_prep'], note: 'Primary standard, dried at 110 °C.',
  },
  distilled: {
    key: 'distilled', name: 'Distilled water', formula: 'H2O',
    color: 0x48b6e6, container: 'Wash bottle', stock_mL: 2000,
    experiments: ['all'], note: 'For rinsing and making up to the mark.',
  },
};

/* ------------------------------------------------------------------ */
/* Water samples — the "truth" the student is trying to measure        */
/* ------------------------------------------------------------------ */
export const SAMPLES = {
  distilled: {
    key: 'distilled', name: 'Distilled water', color: 0x48b6e6, tint: 0.05,
    pH: 6.8, hardness_mgL: 2, alkalinity_P_mgL: 0, alkalinity_T_mgL: 4,
    chloride_mgL: 1, conductivity_uS: 3, turbidity_NTU: 0.2,
    normality: 0, description: 'Freshly distilled, used as blank and for rinsing.',
  },
  tap: {
    key: 'tap', name: 'Tap water', color: 0x44aed8, tint: 0.12,
    pH: 7.6, hardness_mgL: 184, alkalinity_P_mgL: 0, alkalinity_T_mgL: 142,
    chloride_mgL: 46, conductivity_uS: 512, turbidity_NTU: 1.4,
    normality: 0, description: 'Municipal supply, moderately hard.',
  },
  natural: {
    key: 'natural', name: 'Natural (bore-well) water', color: 0x42a8cf, tint: 0.2,
    pH: 8.4, hardness_mgL: 326, alkalinity_P_mgL: 22, alkalinity_T_mgL: 268,
    chloride_mgL: 118, conductivity_uS: 940, turbidity_NTU: 8.6,
    normality: 0, description: 'Ground water, hard, carbonate alkalinity present.',
  },
  standard_hard: {
    key: 'standard_hard', name: 'Standard hard water', color: 0x4ab2dc, tint: 0.07,
    pH: 7.0, hardness_mgL: null, /* taken from CONFIG at run time */
    alkalinity_P_mgL: 0, alkalinity_T_mgL: 0,
    chloride_mgL: 0, conductivity_uS: 6, turbidity_NTU: 0.3,
    normality: 0, description: 'Prepared from AR CaCO3 — strength set in Settings.',
  },
  unknown: {
    key: 'unknown', name: 'Unknown sample (X-7)', color: 0x3ea2c9, tint: 0.18,
    pH: 9.3, hardness_mgL: 248, alkalinity_P_mgL: 64, alkalinity_T_mgL: 196,
    chloride_mgL: 82, conductivity_uS: 726, turbidity_NTU: 4.1,
    normality: 0.012, description: 'Issued for analysis. Composition not disclosed.',
  },
};

/** Resolve a sample, substituting the configured standard-hard-water value. */
export function getSample(key) {
  const s = SAMPLES[key];
  if (!s) return null;
  if (s.key === 'standard_hard') {
    return { ...s, hardness_mgL: CONFIG.standardHardWater_mgL };
  }
  return { ...s };
}

/* ------------------------------------------------------------------ */
/* Experiment definitions                                              */
/* ------------------------------------------------------------------ */
/**
 * Every step declares the ACTION the student must perform in the 3D scene.
 * experiments.js matches dispatched actions against these steps.
 */
export const EXPERIMENTS = {
  ph: {
    id: 'ph', name: 'pH determination', kind: 'instrument', icon: 'pH',
    defaultSample: 'tap',
    objective: 'Determine the pH of a given water sample using a calibrated digital pH meter.',
    apparatus: ['Digital pH meter', 'Glass combination electrode', 'Beaker (100 mL)', 'Wash bottle', 'Tissue', 'Thermometer'],
    chemicals: ['Water sample', 'Distilled water', 'Buffer solutions pH 4.0, 7.0, 9.2'],
    theory: 'pH is the negative logarithm of hydrogen-ion activity, pH = −log10 aH+. '
      + 'The glass electrode develops a potential across its membrane that varies linearly with pH '
      + 'by the Nernst relation, E = E° − 0.0591·pH at 25 °C. The meter converts this potential to a pH reading.',
    precautions: [
      'Never let the bulb of the electrode dry out.',
      'Rinse the electrode with distilled water between every sample.',
      'Blot — do not rub — the bulb dry.',
      'Calibrate with at least two buffers bracketing the expected pH.',
    ],
    steps: [
      { id: 's1', action: 'PH_POWER', text: 'Switch on the pH meter and let it warm up.', hint: 'Click the pH meter body.' },
      { id: 's2', action: 'PH_CALIBRATE', text: 'Calibrate the meter with the pH 7.00 buffer.', hint: 'Click the CAL key on the meter.' },
      { id: 's3', action: 'PH_RINSE', text: 'Rinse the electrode with distilled water.', hint: 'Click the wash bottle.' },
      { id: 's4', action: 'FILL_BEAKER', text: 'Pour about 50 mL of the sample into the clean beaker.', hint: 'Click the selected water-sample bottle.' },
      { id: 's5', action: 'PH_IMMERSE', text: 'Lower the electrode into the sample.', hint: 'Click the electrode.' },
      { id: 's6', action: 'PH_MEASURE', text: 'Start the measurement and wait for the reading to stabilise.', hint: 'Click the READ key.' },
      { id: 's7', action: 'RECORD_READING', text: 'Record the stabilised pH.', hint: 'Click "Record reading" in the observation panel.' },
    ],
  },

  hardness: {
    id: 'hardness', name: 'Total hardness by EDTA', kind: 'titration', icon: 'EDTA',
    defaultSample: 'tap',
    titrant: 'edta', indicator: 'ebt', needsBuffer: true,
    objective: 'Determine the total hardness of a water sample by complexometric titration with standard EDTA and express it as mg/L CaCO3.',
    apparatus: ['Burette (50 mL)', 'Burette stand and clamp', 'Pipette (50 mL)', 'Conical flask (250 mL)', 'Measuring cylinder', 'Wash bottle'],
    chemicals: ['0.01 M EDTA', 'Ammonia buffer pH 10', 'Eriochrome Black T', 'Water sample', 'Standard hard water'],
    theory: 'Ca²⁺ and Mg²⁺ form stable 1:1 chelates with the EDTA anion Y⁴⁻. At pH 10 the indicator '
      + 'Eriochrome Black T first binds Mg²⁺ to give a wine-red complex. EDTA added from the burette removes '
      + 'the free Ca²⁺ and Mg²⁺ and finally strips the metal from the indicator, releasing the free blue dye — '
      + 'the endpoint. Since the reaction is 1:1 in moles, mmol EDTA = mmol hardness, expressed conventionally as CaCO3.',
    precautions: [
      'Rinse the burette with the EDTA solution before filling.',
      'Expel the air bubble below the stopcock.',
      'Add the buffer before the indicator, never after.',
      'Titrate slowly near the endpoint — the colour change is slow.',
      'Read the lower meniscus at eye level.',
    ],
    steps: [
      { id: 's1', action: 'RINSE_BURETTE', text: 'Rinse the burette with a little EDTA solution.', hint: 'Click the EDTA bottle while the burette is selected.' },
      { id: 's2', action: 'FILL_BURETTE', text: 'Fill the burette with 0.01 M EDTA and expel the air bubble.', hint: 'Click the top of the burette.' },
      { id: 's3', action: 'RECORD_INITIAL', text: 'Record the initial burette reading.', hint: 'Click "Record initial reading".' },
      { id: 's4', action: 'PIPETTE_SAMPLE', text: 'Pipette 50 mL of the water sample into the conical flask.', hint: 'Click the pipette.' },
      { id: 's5', action: 'ADD_buffer', text: 'Add 2 mL of ammonia buffer (pH 10) to the flask.', hint: 'Click the buffer bottle.' },
      { id: 's6', action: 'ADD_ebt', text: 'Add 2–3 drops of Eriochrome Black T indicator.', hint: 'Click the EBT indicator bottle.' },
      { id: 's7', action: 'TITRATE', text: 'Open the stopcock and titrate until the wine-red turns steel-blue.', hint: 'Click the stopcock to start and stop the flow.' },
      { id: 's8', action: 'RECORD_FINAL', text: 'Close the stopcock at the endpoint and record the final reading.', hint: 'Click "Record final reading".' },
      { id: 's9', action: 'CALCULATE', text: 'Calculate the total hardness as mg/L CaCO3.', hint: 'Click "Calculate result".' },
    ],
  },

  acidbase: {
    id: 'acidbase', name: 'Acid–base titration', kind: 'titration', icon: 'HCl',
    defaultSample: 'unknown',
    titrant: 'hcl', indicator: 'phenolphthalein',
    objective: 'Determine the strength of an alkaline water sample by titration against standard hydrochloric acid using phenolphthalein.',
    apparatus: ['Burette', 'Burette stand', 'Pipette (50 mL)', 'Conical flask', 'Wash bottle'],
    chemicals: ['0.02 N HCl', 'Alkaline water sample', 'Phenolphthalein'],
    theory: 'A neutralisation reaction proceeds equivalent for equivalent: N1V1 = N2V2. '
      + 'Phenolphthalein is pink in the alkaline sample and becomes colourless when the last trace of base '
      + 'has been neutralised, marking the equivalence point.',
    precautions: [
      'Remove the funnel from the burette before reading.',
      'Swirl continuously while running in the acid.',
      'The endpoint is the first disappearance of pink that persists for 30 s.',
    ],
    steps: [
      { id: 's1', action: 'RINSE_BURETTE', text: 'Rinse the burette with the standard acid.', hint: 'Click the HCl bottle.' },
      { id: 's2', action: 'FILL_BURETTE', text: 'Fill the burette with 0.02 N HCl.', hint: 'Click the top of the burette.' },
      { id: 's3', action: 'RECORD_INITIAL', text: 'Record the initial burette reading.', hint: 'Click "Record initial reading".' },
      { id: 's4', action: 'PIPETTE_SAMPLE', text: 'Pipette 50 mL of the sample into the conical flask.', hint: 'Click the pipette.' },
      { id: 's5', action: 'ADD_phenolphthalein', text: 'Add 2 drops of phenolphthalein — the solution turns pink.', hint: 'Click the phenolphthalein bottle.' },
      { id: 's6', action: 'TITRATE', text: 'Run in the acid until the pink colour just disappears.', hint: 'Click the stopcock.' },
      { id: 's7', action: 'RECORD_FINAL', text: 'Record the final burette reading.', hint: 'Click "Record final reading".' },
      { id: 's8', action: 'CALCULATE', text: 'Calculate the normality of the sample.', hint: 'Click "Calculate result".' },
    ],
  },

  alkalinity_total: {
    id: 'alkalinity_total', name: 'Total alkalinity', kind: 'titration', icon: 'MO',
    defaultSample: 'natural',
    titrant: 'hcl', indicator: 'methylorange',
    objective: 'Determine the total alkalinity of a water sample by titration with standard acid to the methyl-orange endpoint and express it as mg/L CaCO3.',
    apparatus: ['Burette', 'Burette stand', 'Pipette (50 mL)', 'Conical flask', 'Measuring cylinder'],
    chemicals: ['0.02 N HCl', 'Methyl orange', 'Water sample'],
    theory: 'Alkalinity is the capacity of water to neutralise acid and arises from OH⁻, CO3²⁻ and HCO3⁻. '
      + 'Titration to the methyl-orange endpoint (pH ≈ 4.3) converts all three species to carbonic acid, so the '
      + 'acid consumed measures the TOTAL alkalinity. It is reported as an equivalent amount of CaCO3, '
      + 'equivalent weight 50.',
    precautions: [
      'Do not shake the sample — dissolved CO2 will be lost.',
      'Titrate soon after collecting the aliquot.',
      'Methyl orange gives a sharper endpoint against a white tile.',
    ],
    steps: [
      { id: 's1', action: 'RINSE_BURETTE', text: 'Rinse the burette with 0.02 N HCl.', hint: 'Click the HCl bottle.' },
      { id: 's2', action: 'FILL_BURETTE', text: 'Fill the burette with the standard acid.', hint: 'Click the top of the burette.' },
      { id: 's3', action: 'RECORD_INITIAL', text: 'Record the initial burette reading.', hint: 'Click "Record initial reading".' },
      { id: 's4', action: 'PIPETTE_SAMPLE', text: 'Pipette 50 mL of the sample into the conical flask.', hint: 'Click the pipette.' },
      { id: 's5', action: 'ADD_methylorange', text: 'Add 2 drops of methyl orange — the solution turns yellow.', hint: 'Click the methyl orange bottle.' },
      { id: 's6', action: 'TITRATE', text: 'Titrate until the yellow changes to orange-red.', hint: 'Click the stopcock.' },
      { id: 's7', action: 'RECORD_FINAL', text: 'Record the final burette reading.', hint: 'Click "Record final reading".' },
      { id: 's8', action: 'CALCULATE', text: 'Calculate the total alkalinity as mg/L CaCO3.', hint: 'Click "Calculate result".' },
    ],
  },

  alkalinity_mixed: {
    id: 'alkalinity_mixed', name: 'Mixed alkalinity (two endpoints)', kind: 'titration', icon: 'P/M',
    defaultSample: 'unknown',
    titrant: 'hcl', indicator: 'phenolphthalein', secondIndicator: 'methylorange', twoStage: true,
    objective: 'Determine the hydroxide, carbonate and bicarbonate alkalinity of a water sample using the phenolphthalein and methyl-orange endpoints.',
    apparatus: ['Burette', 'Burette stand', 'Pipette (50 mL)', 'Conical flask'],
    chemicals: ['0.02 N HCl', 'Phenolphthalein', 'Methyl orange', 'Water sample'],
    theory: 'Titration to the phenolphthalein endpoint (pH 8.3) neutralises all OH⁻ and converts CO3²⁻ to HCO3⁻ — '
      + 'volume P. Continuing to the methyl-orange endpoint (pH 4.3) converts all HCO3⁻ to H2CO3 — total volume T. '
      + 'Comparing P with T/2 identifies which species are present: '
      + 'P = 0 → HCO3⁻ only; P = T → OH⁻ only; P = T/2 → CO3²⁻ only; '
      + 'P < T/2 → CO3²⁻ + HCO3⁻; P > T/2 → OH⁻ + CO3²⁻. OH⁻ and HCO3⁻ cannot coexist.',
    precautions: [
      'Do not stop between the two endpoints — continue in the same flask.',
      'Record P before adding methyl orange.',
      'Avoid aeration of the sample throughout.',
    ],
    steps: [
      { id: 's1', action: 'RINSE_BURETTE', text: 'Rinse the burette with 0.02 N HCl.', hint: 'Click the HCl bottle.' },
      { id: 's2', action: 'FILL_BURETTE', text: 'Fill the burette with the standard acid.', hint: 'Click the top of the burette.' },
      { id: 's3', action: 'RECORD_INITIAL', text: 'Record the initial burette reading.', hint: 'Click "Record initial reading".' },
      { id: 's4', action: 'PIPETTE_SAMPLE', text: 'Pipette 50 mL of the sample into the conical flask.', hint: 'Click the pipette.' },
      { id: 's5', action: 'ADD_phenolphthalein', text: 'Add 2 drops of phenolphthalein — a pink colour appears.', hint: 'Click the phenolphthalein bottle.' },
      { id: 's6', action: 'TITRATE', text: 'Titrate until the pink just disappears — this is the P endpoint.', hint: 'Click the stopcock.' },
      { id: 's7', action: 'RECORD_P', text: 'Record the burette reading at the phenolphthalein endpoint (P).', hint: 'Click "Record P endpoint".' },
      { id: 's8', action: 'ADD_methylorange', text: 'Add 2 drops of methyl orange to the same flask.', hint: 'Click the methyl orange bottle.' },
      { id: 's9', action: 'TITRATE', text: 'Continue titrating until yellow turns orange-red — the M endpoint.', hint: 'Click the stopcock.' },
      { id: 's10', action: 'RECORD_FINAL', text: 'Record the final burette reading (T).', hint: 'Click "Record final reading".' },
      { id: 's11', action: 'CALCULATE', text: 'Calculate OH⁻, CO3²⁻, HCO3⁻ and total alkalinity.', hint: 'Click "Calculate result".' },
    ],
  },

  chloride: {
    id: 'chloride', name: 'Chloride by Mohr\u2019s method', kind: 'titration', icon: 'Cl',
    defaultSample: 'natural',
    titrant: 'agno3', indicator: 'k2cro4',
    objective: 'Determine the chloride content of a water sample by argentometric (Mohr) titration with standard silver nitrate.',
    apparatus: ['Burette', 'Burette stand', 'Pipette (50 mL)', 'Conical flask', 'Measuring cylinder'],
    chemicals: ['0.0141 N AgNO3', '5 % potassium chromate', 'Water sample'],
    theory: 'Ag⁺ + Cl⁻ → AgCl (white precipitate). Silver chloride is far less soluble than silver chromate, '
      + 'so AgCl precipitates first. Once the chloride is exhausted the next drop of AgNO3 reacts with the '
      + 'chromate indicator: 2Ag⁺ + CrO4²⁻ → Ag2CrO4, a brick-red precipitate marking the endpoint. '
      + 'The titration must be run near pH 7–8. 1 mL of 0.0141 N AgNO3 ≡ 0.5 mg Cl⁻.',
    precautions: [
      'The pH must be between 7 and 8 — chromate is protonated in acid and silver precipitates as oxide in alkali.',
      'Use a white background to see the first permanent red tinge.',
      'Silver nitrate stains skin and clothing; keep the amber bottle closed.',
    ],
    steps: [
      { id: 's1', action: 'RINSE_BURETTE', text: 'Rinse the burette with AgNO3 solution.', hint: 'Click the AgNO3 bottle.' },
      { id: 's2', action: 'FILL_BURETTE', text: 'Fill the burette with 0.0141 N AgNO3.', hint: 'Click the top of the burette.' },
      { id: 's3', action: 'RECORD_INITIAL', text: 'Record the initial burette reading.', hint: 'Click "Record initial reading".' },
      { id: 's4', action: 'PIPETTE_SAMPLE', text: 'Pipette 50 mL of the sample into the conical flask.', hint: 'Click the pipette.' },
      { id: 's5', action: 'ADD_k2cro4', text: 'Add 1 mL of potassium chromate indicator — the solution turns yellow.', hint: 'Click the K2CrO4 bottle.' },
      { id: 's6', action: 'TITRATE', text: 'Titrate with constant swirling until a persistent brick-red tinge appears.', hint: 'Click the stopcock.' },
      { id: 's7', action: 'RECORD_FINAL', text: 'Record the final burette reading.', hint: 'Click "Record final reading".' },
      { id: 's8', action: 'CALCULATE', text: 'Calculate the chloride content in mg/L.', hint: 'Click "Calculate result".' },
    ],
  },

  conductivity: {
    id: 'conductivity', name: 'Electrical conductivity', kind: 'instrument', icon: 'EC',
    defaultSample: 'tap',
    objective: 'Measure the specific electrical conductivity of a water sample and comment on its dissolved-solid content.',
    apparatus: ['Conductivity meter', 'Conductivity cell (k = 1.0 cm⁻¹)', 'Beaker (100 mL)', 'Wash bottle', 'Thermometer'],
    chemicals: ['Water sample', 'Distilled water', '0.01 M KCl for cell-constant check'],
    theory: 'Conductance G = 1/R depends on the cell geometry. Specific conductance κ = G × cell constant, '
      + 'reported in µS/cm at 25 °C. It is proportional to the concentration of dissolved ions, so it is a rapid '
      + 'surrogate measurement for dissolved solids.',
    precautions: [
      'Rinse the cell with distilled water and then with the sample.',
      'Keep the electrodes fully immersed and free of bubbles.',
      'Record the temperature — conductivity rises about 2 % per °C.',
    ],
    steps: [
      { id: 's1', action: 'COND_POWER', text: 'Switch on the conductivity meter.', hint: 'Click the conductivity meter.' },
      { id: 's2', action: 'COND_RINSE', text: 'Rinse the conductivity cell with distilled water.', hint: 'Click the wash bottle.' },
      { id: 's3', action: 'FILL_BEAKER', text: 'Pour the sample into the clean beaker.', hint: 'Click the water-sample bottle.' },
      { id: 's4', action: 'COND_IMMERSE', text: 'Immerse the cell in the sample.', hint: 'Click the conductivity cell.' },
      { id: 's5', action: 'COND_MEASURE', text: 'Read the conductivity once the display is steady.', hint: 'Click the READ key.' },
      { id: 's6', action: 'RECORD_READING', text: 'Record the conductivity in µS/cm.', hint: 'Click "Record reading".' },
    ],
  },

  tds: {
    id: 'tds', name: 'Total dissolved solids (TDS)', kind: 'instrument', icon: 'TDS',
    defaultSample: 'natural',
    objective: 'Estimate the total dissolved solids of a water sample from its electrical conductivity.',
    apparatus: ['Conductivity/TDS meter', 'Beaker (100 mL)', 'Wash bottle'],
    chemicals: ['Water sample', 'Distilled water'],
    theory: 'For natural waters the dissolved-solid content is roughly proportional to the conductivity: '
      + 'TDS (mg/L) ≈ ke × κ (µS/cm), with the empirical factor ke between 0.55 and 0.70 — 0.65 is used here. '
      + 'The gravimetric evaporation method is the reference; this is the rapid field estimate.',
    precautions: [
      'The factor ke is empirical — always state it with the result.',
      'Rinse the cell between samples.',
      'Highly turbid samples should be filtered first.',
    ],
    steps: [
      { id: 's1', action: 'COND_POWER', text: 'Switch on the meter and select the TDS mode.', hint: 'Click the conductivity meter.' },
      { id: 's2', action: 'COND_RINSE', text: 'Rinse the cell with distilled water.', hint: 'Click the wash bottle.' },
      { id: 's3', action: 'FILL_BEAKER', text: 'Pour the sample into the beaker.', hint: 'Click the water-sample bottle.' },
      { id: 's4', action: 'COND_IMMERSE', text: 'Immerse the cell in the sample.', hint: 'Click the conductivity cell.' },
      { id: 's5', action: 'COND_MEASURE', text: 'Wait for the reading to stabilise.', hint: 'Click the READ key.' },
      { id: 's6', action: 'RECORD_READING', text: 'Record the conductivity and convert it to TDS.', hint: 'Click "Record reading".' },
    ],
  },

  turbidity: {
    id: 'turbidity', name: 'Turbidity (nephelometric)', kind: 'instrument', icon: 'NTU',
    defaultSample: 'natural',
    objective: 'Measure the turbidity of a water sample with a nephelometric turbidity meter and report it in NTU.',
    apparatus: ['Nephelometric turbidity meter', 'Sample vial (cuvette)', 'Lint-free tissue'],
    chemicals: ['Water sample', 'Formazin standard 100 NTU', 'Distilled water'],
    theory: 'Suspended particles scatter light. A nephelometer measures the intensity scattered at 90° to an '
      + 'incident beam and compares it with a formazin standard. The result is reported in Nephelometric '
      + 'Turbidity Units (NTU). Drinking water should be below 5 NTU, ideally below 1 NTU.',
    precautions: [
      'Wipe the vial clean — fingerprints scatter light.',
      'Remove air bubbles by inverting the vial gently.',
      'Always insert the vial with the index mark aligned.',
    ],
    steps: [
      { id: 's1', action: 'TURB_POWER', text: 'Switch on the turbidity meter.', hint: 'Click the turbidity meter.' },
      { id: 's2', action: 'TURB_CALIBRATE', text: 'Standardise with the 100 NTU formazin standard.', hint: 'Click the CAL key.' },
      { id: 's3', action: 'TURB_FILL', text: 'Rinse and fill the sample vial with the water sample.', hint: 'Click the water-sample bottle.' },
      { id: 's4', action: 'TURB_INSERT', text: 'Insert the vial into the measuring well and close the lid.', hint: 'Click the sample vial.' },
      { id: 's5', action: 'TURB_MEASURE', text: 'Take the reading.', hint: 'Click the READ key.' },
      { id: 's6', action: 'RECORD_READING', text: 'Record the turbidity in NTU.', hint: 'Click "Record reading".' },
    ],
  },

  shw_prep: {
    id: 'shw_prep', name: 'Standard hard water preparation', kind: 'preparation', icon: 'SHW',
    defaultSample: 'distilled',
    objective: 'Prepare standard hard water of the configured strength from AR calcium carbonate and make it available as a sample for the hardness titration.',
    apparatus: ['Digital balance', 'Weighing bottle', 'Beaker', 'Glass rod', 'Volumetric flask (1000 mL)', 'Funnel', 'Wash bottle'],
    chemicals: ['AR CaCO3 dried at 110 °C', 'Dilute HCl', 'Distilled water'],
    theory: 'Standard hard water is a solution containing a known CaCO3 equivalent. Dissolving m mg of AR CaCO3 '
      + 'in a little acid and diluting to 1 L gives a solution of m mg/L as CaCO3, because the calcium is carried '
      + 'through the dilution quantitatively. 1 mL of this solution then contains m/1000 mg CaCO3.',
    precautions: [
      'Dry the CaCO3 before weighing; it is hygroscopic in damp weather.',
      'Dissolve completely before making up to the mark.',
      'Make up to the graduation mark with the lower meniscus on the line.',
      'At very low strengths the solution must be prepared by dilution of a stronger stock.',
    ],
    steps: [
      { id: 's1', action: 'WEIGH_CACO3', text: 'Weigh the calculated mass of AR CaCO3 on the digital balance.', hint: 'Click the digital balance.' },
      { id: 's2', action: 'DISSOLVE', text: 'Transfer to a beaker and dissolve in a little dilute HCl and distilled water.', hint: 'Click the beaker.' },
      { id: 's3', action: 'TRANSFER_VOLUMETRIC', text: 'Transfer the solution to the 1000 mL volumetric flask through the funnel.', hint: 'Click the volumetric flask.' },
      { id: 's4', action: 'MAKE_UP', text: 'Make up to the mark with distilled water and mix thoroughly.', hint: 'Click the wash bottle.' },
      { id: 's5', action: 'CALCULATE', text: 'Confirm the strength of the prepared standard hard water.', hint: 'Click "Calculate result".' },
    ],
  },
};

export const EXPERIMENT_ORDER = [
  'ph', 'hardness', 'acidbase', 'alkalinity_total', 'alkalinity_mixed',
  'chloride', 'conductivity', 'tds', 'turbidity', 'shw_prep',
];
