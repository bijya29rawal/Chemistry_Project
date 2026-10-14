/**
 * calculations.js — the analytical-chemistry engine.
 *
 * This module never touches the DOM or the 3D scene. It converts virtual
 * bench quantities (volumes, normalities, readings) into reported results,
 * and it also works in reverse: given the true composition of a sample it
 * predicts the equivalence volume so the simulated titration knows where the
 * endpoint should fall.
 */

import { CONFIG, REAGENTS } from './data.js';

export const EQ_WEIGHT = {
  CaCO3: 50.0,      // equivalent weight used in the standard alkalinity formula
  Cl: 35.45,        // equivalent weight used in the standard chloride formula
};
export const MOLAR_MASS = { CaCO3: 100.0869 };

/* ------------------------------------------------------------------ */
/* Generic helpers                                                     */
/* ------------------------------------------------------------------ */

export function round(value, dp = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

/** Format with a fixed number of decimals, keeping trailing zeros. */
export function fmt(value, dp = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (Math.abs(value) > 0 && Math.abs(value) < 10 ** -dp) return value.toExponential(2);
  return value.toFixed(dp);
}

export function normality(molarity, nFactor = 1) { return molarity * nFactor; }

export function equivalentWeight(molarWeight, nFactor) { return molarWeight / nFactor; }

/** N1V1 = N2V2 — returns the unknown normality N2. */
export function dilutionNormality(N1, V1, V2) {
  if (!V2) return 0;
  return (N1 * V1) / V2;
}

export function dilutionFactor(finalVolume_mL, aliquot_mL) {
  if (!aliquot_mL) return 1;
  return finalVolume_mL / aliquot_mL;
}

/* ------------------------------------------------------------------ */
/* Hardness — EDTA complexometric titration                            */
/* ------------------------------------------------------------------ */

/**
 * mg/L as CaCO3 = (M_EDTA × V_EDTA(mL) × 100 087 µg/mmol → mg) / V_sample(mL)
 *
 * mmol EDTA = M × V(mL);  mg CaCO3 = mmol × 100.0869;  per litre → × 1000/Vs
 */
export function hardnessFromTitration({ V_edta_mL, M_edta, V_sample_mL, dilution = 1 }) {
  if (!V_sample_mL) return 0;
  const mmol = M_edta * V_edta_mL;
  const mg = mmol * MOLAR_MASS.CaCO3;
  return (mg * 1000 / V_sample_mL) * dilution;
}

/** Inverse: EDTA volume expected for a sample of known hardness. */
export function edtaVolumeForHardness({ hardness_mgL, V_sample_mL, M_edta }) {
  if (!M_edta) return 0;
  return (hardness_mgL * V_sample_mL) / (M_edta * MOLAR_MASS.CaCO3 * 1000);
}

/* ------------------------------------------------------------------ */
/* Alkalinity / acidity                                                */
/* ------------------------------------------------------------------ */

/** mg/L as CaCO3 = (V_acid × N_acid × 50 000) / V_sample */
export function alkalinityFromTitration({ V_acid_mL, N_acid, V_sample_mL }) {
  if (!V_sample_mL) return 0;
  return (V_acid_mL * N_acid * EQ_WEIGHT.CaCO3 * 1000) / V_sample_mL;
}

export function acidVolumeForAlkalinity({ alkalinity_mgL, V_sample_mL, N_acid }) {
  if (!N_acid) return 0;
  return (alkalinity_mgL * V_sample_mL) / (N_acid * EQ_WEIGHT.CaCO3 * 1000);
}

/**
 * Classify a mixed-alkalinity result from the two endpoint volumes.
 * P = phenolphthalein volume, T = total volume to methyl orange.
 * Returns alkalinity components expressed as mg/L CaCO3.
 */
export function mixedAlkalinity({ P_mL, T_mL, N_acid, V_sample_mL }) {
  const k = (v) => alkalinityFromTitration({ V_acid_mL: v, N_acid, V_sample_mL });
  const half = T_mL / 2;
  const tol = Math.max(0.05, T_mL * 0.02);

  let species, OH_mL = 0, CO3_mL = 0, HCO3_mL = 0;

  if (P_mL <= 0.001) {
    species = 'Bicarbonate only (HCO3⁻)';
    HCO3_mL = T_mL;
  } else if (Math.abs(P_mL - T_mL) <= tol) {
    species = 'Hydroxide only (OH⁻)';
    OH_mL = T_mL;
  } else if (Math.abs(P_mL - half) <= tol) {
    species = 'Carbonate only (CO3²⁻)';
    CO3_mL = T_mL;
  } else if (P_mL < half) {
    species = 'Carbonate and bicarbonate (CO3²⁻ + HCO3⁻)';
    CO3_mL = 2 * P_mL;
    HCO3_mL = T_mL - 2 * P_mL;
  } else {
    species = 'Hydroxide and carbonate (OH⁻ + CO3²⁻)';
    OH_mL = 2 * P_mL - T_mL;
    CO3_mL = 2 * (T_mL - P_mL);
  }

  return {
    species,
    relation: P_mL <= 0.001 ? 'P = 0'
      : Math.abs(P_mL - T_mL) <= tol ? 'P = T'
        : Math.abs(P_mL - half) <= tol ? 'P = T/2'
          : P_mL < half ? 'P < T/2' : 'P > T/2',
    OH_mgL: k(OH_mL), CO3_mgL: k(CO3_mL), HCO3_mgL: k(HCO3_mL),
    total_mgL: k(T_mL), P_mgL: k(P_mL),
    OH_mL, CO3_mL, HCO3_mL,
  };
}

/* ------------------------------------------------------------------ */
/* Chloride — Mohr argentometric titration                             */
/* ------------------------------------------------------------------ */

/** mg/L Cl⁻ = (V_AgNO3 × N_AgNO3 × 35 453) / V_sample */
export function chlorideFromTitration({ V_ag_mL, N_ag, V_sample_mL }) {
  if (!V_sample_mL) return 0;
  return (V_ag_mL * N_ag * EQ_WEIGHT.Cl * 1000) / V_sample_mL;
}

export function agVolumeForChloride({ chloride_mgL, V_sample_mL, N_ag }) {
  if (!N_ag) return 0;
  return (chloride_mgL * V_sample_mL) / (N_ag * EQ_WEIGHT.Cl * 1000);
}

/* ------------------------------------------------------------------ */
/* Instruments                                                         */
/* ------------------------------------------------------------------ */

export function tdsFromConductivity(uS_cm, factor = 0.65) { return uS_cm * factor; }

export function classifyHardness(mgL) {
  if (mgL < 60) return 'Soft';
  if (mgL < 120) return 'Moderately hard';
  if (mgL < 180) return 'Hard';
  return 'Very hard';
}

export function classifyTurbidity(ntu) {
  if (ntu <= 1) return 'Within the IS 10500 desirable limit (1 NTU)';
  if (ntu <= 5) return 'Within the permissible limit (5 NTU)';
  return 'Exceeds the permissible limit of 5 NTU';
}

export function classifyPH(ph) {
  if (ph < 6.5) return 'Below the IS 10500 range 6.5–8.5 — acidic';
  if (ph > 8.5) return 'Above the IS 10500 range 6.5–8.5 — alkaline';
  return 'Within the IS 10500 acceptable range 6.5–8.5';
}

/* ------------------------------------------------------------------ */
/* Standard hard water preparation                                     */
/* ------------------------------------------------------------------ */

/** Mass of CaCO3 needed for a given strength in a given final volume. */
export function caco3MassForStandard({ strength_mgL, finalVolume_mL }) {
  return strength_mgL * (finalVolume_mL / 1000);
}

/* ------------------------------------------------------------------ */
/* Endpoint prediction                                                 */
/* ------------------------------------------------------------------ */

/**
 * The equivalence volume the virtual titration should reach, derived from the
 * true sample composition. A small random scatter is applied once per run so
 * repeated trials do not give identical numbers.
 */
export function equivalenceVolume(experimentId, sample, V_sample_mL, stage = 1) {
  const scatter = 1 + (Math.random() * 2 - 1) * CONFIG.titrationScatter;
  let v = 0;
  switch (experimentId) {
    case 'hardness':
      v = edtaVolumeForHardness({
        hardness_mgL: sample.hardness_mgL, V_sample_mL, M_edta: REAGENTS.edta.molarity,
      });
      break;
    case 'alkalinity_total':
      v = acidVolumeForAlkalinity({
        alkalinity_mgL: sample.alkalinity_T_mgL, V_sample_mL, N_acid: REAGENTS.hcl.normality,
      });
      break;
    case 'alkalinity_mixed':
      v = acidVolumeForAlkalinity({
        alkalinity_mgL: stage === 1 ? sample.alkalinity_P_mgL : sample.alkalinity_T_mgL,
        V_sample_mL, N_acid: REAGENTS.hcl.normality,
      });
      break;
    case 'chloride':
      v = agVolumeForChloride({
        chloride_mgL: sample.chloride_mgL, V_sample_mL, N_ag: REAGENTS.agno3.normality,
      });
      break;
    case 'acidbase':
      v = (sample.normality * V_sample_mL) / REAGENTS.hcl.normality;
      break;
    default:
      v = 0;
  }
  return Math.max(0, v * scatter);
}

/* ------------------------------------------------------------------ */
/* Result builders — each returns a printable calculation record       */
/* ------------------------------------------------------------------ */

export function buildTitrationResult({ experimentId, run, sample, V_sample_mL }) {
  const V1 = run.burette.initialReading ?? 0;
  const V2 = run.burette.finalReading ?? 0;
  const V = Math.max(0, V2 - V1);

  switch (experimentId) {
    case 'hardness': {
      const M = REAGENTS.edta.molarity;
      const value = hardnessFromTitration({ V_edta_mL: V, M_edta: M, V_sample_mL });
      return {
        title: 'Total hardness',
        observation: [
          ['Initial burette reading (V1)', `${fmt(V1)} mL`],
          ['Final burette reading (V2)', `${fmt(V2)} mL`],
          ['Volume of EDTA consumed (V2 − V1)', `${fmt(V)} mL`],
          ['Volume of sample pipetted', `${fmt(V_sample_mL)} mL`],
          ['Molarity of EDTA', `${M} M`],
        ],
        formula: 'Total hardness (mg/L as CaCO3) = [M(EDTA) × V(EDTA) × 100.09 × 1000] ÷ V(sample)',
        substitution: `= [${M} × ${fmt(V, 2)} × 100.09 × 1000] ÷ ${fmt(V_sample_mL)}`,
        working: `= ${fmt(M * V * MOLAR_MASS.CaCO3, 4)} mg CaCO3 in ${fmt(V_sample_mL)} mL`,
        value, unit: 'mg/L as CaCO3', dp: 2,
        remark: classifyHardness(value),
      };
    }
    case 'alkalinity_total': {
      const N = REAGENTS.hcl.normality;
      const value = alkalinityFromTitration({ V_acid_mL: V, N_acid: N, V_sample_mL });
      return {
        title: 'Total alkalinity',
        observation: [
          ['Initial burette reading (V1)', `${fmt(V1)} mL`],
          ['Final burette reading (V2)', `${fmt(V2)} mL`],
          ['Volume of HCl to methyl-orange endpoint', `${fmt(V)} mL`],
          ['Volume of sample pipetted', `${fmt(V_sample_mL)} mL`],
          ['Normality of HCl', `${N} N`],
        ],
        formula: 'Total alkalinity (mg/L as CaCO3) = [V(acid) × N(acid) × 50 000] ÷ V(sample)',
        substitution: `= [${fmt(V)} × ${N} × 50 000] ÷ ${fmt(V_sample_mL)}`,
        working: `= ${fmt(V * N * EQ_WEIGHT.CaCO3, 4)} mg CaCO3 equivalent in the aliquot`,
        value, unit: 'mg/L as CaCO3', dp: 2,
        remark: 'Methyl-orange (total) alkalinity, endpoint pH ≈ 4.3',
      };
    }
    case 'chloride': {
      const N = REAGENTS.agno3.normality;
      const value = chlorideFromTitration({ V_ag_mL: V, N_ag: N, V_sample_mL });
      return {
        title: 'Chloride content',
        observation: [
          ['Initial burette reading (V1)', `${fmt(V1)} mL`],
          ['Final burette reading (V2)', `${fmt(V2)} mL`],
          ['Volume of AgNO3 consumed', `${fmt(V)} mL`],
          ['Volume of sample pipetted', `${fmt(V_sample_mL)} mL`],
          ['Normality of AgNO3', `${N} N`],
        ],
        formula: 'Chloride (mg/L) = [V(AgNO3) × N(AgNO3) × 35 450] ÷ V(sample)',
        substitution: `= [${fmt(V)} × ${N} × 35 450] ÷ ${fmt(V_sample_mL)}`,
        working: `= ${fmt(V * N * EQ_WEIGHT.Cl, 4)} mg Cl⁻ in the aliquot`,
        value, unit: 'mg/L Cl⁻', dp: 2,
        remark: value <= 250 ? 'Within the IS 10500 desirable limit of 250 mg/L'
          : 'Exceeds the desirable limit of 250 mg/L',
      };
    }
    case 'acidbase': {
      const N1 = REAGENTS.hcl.normality;
      const N2 = dilutionNormality(N1, V, V_sample_mL);
      return {
        title: 'Strength of the sample',
        observation: [
          ['Initial burette reading (V1)', `${fmt(V1)} mL`],
          ['Final burette reading (V2)', `${fmt(V2)} mL`],
          ['Volume of acid consumed', `${fmt(V)} mL`],
          ['Volume of sample pipetted', `${fmt(V_sample_mL)} mL`],
          ['Normality of HCl', `${N1} N`],
        ],
        formula: 'N(sample) = [N(acid) × V(acid)] ÷ V(sample)',
        substitution: `= [${N1} × ${fmt(V)}] ÷ ${fmt(V_sample_mL)}`,
        working: `= ${fmt(N2, 5)} N, i.e. ${fmt(N2 * 40 * 1000, 2)} mg/L as NaOH`,
        value: N2, unit: 'N', dp: 5,
        remark: 'Equivalence point located with phenolphthalein (pH ≈ 8.3)',
      };
    }
    default:
      return null;
  }
}

export function buildMixedAlkalinityResult({ run, V_sample_mL }) {
  const V1 = run.burette.initialReading ?? 0;
  const Pr = run.burette.pReading ?? V1;
  const V2 = run.burette.finalReading ?? Pr;
  const P = Math.max(0, Pr - V1);
  const T = Math.max(0, V2 - V1);
  const N = REAGENTS.hcl.normality;
  const m = mixedAlkalinity({ P_mL: P, T_mL: T, N_acid: N, V_sample_mL });

  return {
    title: 'Mixed alkalinity',
    observation: [
      ['Initial burette reading', `${fmt(V1)} mL`],
      ['Reading at phenolphthalein endpoint', `${fmt(Pr)} mL`],
      ['Reading at methyl-orange endpoint', `${fmt(V2)} mL`],
      ['P (phenolphthalein volume)', `${fmt(P)} mL`],
      ['T (total volume)', `${fmt(T)} mL`],
      ['T/2', `${fmt(T / 2)} mL`],
      ['Normality of HCl', `${N} N`],
    ],
    formula: 'Alkalinity (mg/L as CaCO3) = [V × N × 50 000] ÷ V(sample);  species from P vs T/2',
    substitution: `${m.relation} → ${m.species}`,
    working: [
      `OH⁻ volume = ${fmt(m.OH_mL)} mL → ${fmt(m.OH_mgL)} mg/L`,
      `CO3²⁻ volume = ${fmt(m.CO3_mL)} mL → ${fmt(m.CO3_mgL)} mg/L`,
      `HCO3⁻ volume = ${fmt(m.HCO3_mL)} mL → ${fmt(m.HCO3_mgL)} mg/L`,
    ].join('\n'),
    value: m.total_mgL, unit: 'mg/L as CaCO3', dp: 2,
    remark: m.species,
    components: m,
  };
}

export function buildInstrumentResult({ experimentId, reading, sample }) {
  switch (experimentId) {
    case 'ph':
      return {
        title: 'pH of the sample',
        observation: [
          ['Sample', sample.name],
          ['Temperature', '25.0 °C'],
          ['Calibration buffers', 'pH 7.00 and 9.20'],
          ['Stabilised reading', fmt(reading, 2)],
        ],
        formula: 'pH = −log10 aH+ ; the meter reads the electrode potential directly on a pH scale',
        substitution: `Electrode potential converted at 59.16 mV/pH (25 °C)`,
        working: `Displayed value after stabilisation: ${fmt(reading, 2)}`,
        value: reading, unit: 'pH units', dp: 2,
        remark: classifyPH(reading),
      };
    case 'conductivity':
      return {
        title: 'Specific conductivity',
        observation: [
          ['Sample', sample.name],
          ['Cell constant', '1.00 cm⁻¹'],
          ['Temperature', '25.0 °C'],
          ['Stabilised reading', `${fmt(reading, 1)} µS/cm`],
        ],
        formula: 'κ = G × cell constant',
        substitution: `κ = ${fmt(reading, 1)} µS × 1.00 cm⁻¹`,
        working: `Approximate TDS = 0.65 × κ = ${fmt(tdsFromConductivity(reading), 1)} mg/L`,
        value: reading, unit: 'µS/cm', dp: 1,
        remark: reading < 300 ? 'Low mineral content' : reading < 800 ? 'Moderate mineral content' : 'High mineral content',
      };
    case 'tds': {
      const tds = tdsFromConductivity(reading, 0.65);
      return {
        title: 'Total dissolved solids',
        observation: [
          ['Sample', sample.name],
          ['Measured conductivity', `${fmt(reading, 1)} µS/cm`],
          ['Conversion factor ke', '0.65'],
        ],
        formula: 'TDS (mg/L) = ke × κ (µS/cm)',
        substitution: `= 0.65 × ${fmt(reading, 1)}`,
        working: `= ${fmt(tds, 1)} mg/L`,
        value: tds, unit: 'mg/L', dp: 1,
        remark: tds <= 500 ? 'Within the IS 10500 desirable limit of 500 mg/L'
          : tds <= 2000 ? 'Within the permissible limit of 2000 mg/L' : 'Exceeds the permissible limit',
      };
    }
    case 'turbidity':
      return {
        title: 'Turbidity',
        observation: [
          ['Sample', sample.name],
          ['Standardised with', '100 NTU formazin'],
          ['Stabilised reading', `${fmt(reading, 2)} NTU`],
        ],
        formula: 'Turbidity (NTU) = scattered intensity at 90° compared with the formazin standard',
        substitution: `Instrument reading = ${fmt(reading, 2)} NTU`,
        working: 'No further calculation is required for a direct-reading nephelometer.',
        value: reading, unit: 'NTU', dp: 2,
        remark: classifyTurbidity(reading),
      };
    default:
      return null;
  }
}

export function buildPreparationResult({ caco3_mg, finalVolume_mL }) {
  const strength = (caco3_mg * 1000) / finalVolume_mL;
  return {
    title: 'Standard hard water prepared',
    observation: [
      ['Target strength', `${CONFIG.standardHardWater_mgL} mg/L as CaCO3`],
      ['Mass of CaCO3 weighed', `${fmt(caco3_mg, 4)} mg`],
      ['Final volume', `${fmt(finalVolume_mL, 1)} mL`],
    ],
    formula: 'Strength (mg/L as CaCO3) = mass of CaCO3 (mg) × 1000 ÷ final volume (mL)',
    substitution: `= ${fmt(caco3_mg, 4)} × 1000 ÷ ${fmt(finalVolume_mL, 1)}`,
    working: `1 mL of this solution ≡ ${fmt(strength / 1000, 6)} mg CaCO3`,
    value: strength, unit: 'mg/L as CaCO3', dp: 3,
    remark: strength < 10
      ? 'Very dilute standard — prepare by dilution of a stronger stock in practice.'
      : 'Ready for use in the EDTA hardness titration.',
    strength_mgL: strength,
  };
}
