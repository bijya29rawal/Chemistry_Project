/**
 * chemicals.js — what is inside the glassware, and what colour that makes.
 *
 * Indicator colours are taken from the real transition ranges; the transition
 * is driven by how far the titration has progressed towards its equivalence
 * volume, never by a timer or a random number.
 */

import * as THREE from 'three';
import { REAGENTS } from './data.js';

/* Transition palettes: [before endpoint, transition, after endpoint] */
export const INDICATOR_COLORS = {
  ebt: {
    name: 'Eriochrome Black T',
    before: 0x9e2d42,      // wine red — Mg-EBT complex
    transition: 0x7b3f72,  // reddish purple
    after: 0x2f6fbf,       // steel blue — free indicator
    beforeLabel: 'Wine red', afterLabel: 'Steel blue',
  },
  phenolphthalein: {
    name: 'Phenolphthalein',
    before: 0xe2669b,      // pink in alkali
    transition: 0xf0b9cf,
    after: 0x58b6de,       // colourless aqueous tint
    beforeLabel: 'Pink', afterLabel: 'Colourless',
  },
  methylorange: {
    name: 'Methyl orange',
    before: 0xf0c53c,      // yellow above pH 4.4
    transition: 0xe08a34,
    after: 0xd1542f,       // orange-red
    beforeLabel: 'Yellow', afterLabel: 'Orange-red',
  },
  k2cro4: {
    name: 'Potassium chromate',
    before: 0xe7d05a,      // yellow chromate with white AgCl suspension
    transition: 0xdfa964,
    after: 0xc06a4a,       // brick red Ag2CrO4
    beforeLabel: 'Yellow with white precipitate', afterLabel: 'Brick red',
  },
};

/** Where the visible transition begins, as a fraction of the equivalence volume. */
const TRANSITION_START = 0.965;

/**
 * Colour of the flask contents at a given titration progress.
 * progress = volume delivered / equivalence volume.
 */
export function indicatorColorAt(indicatorKey, progress) {
  const palette = INDICATOR_COLORS[indicatorKey];
  if (!palette) return new THREE.Color(0x4aaed6);
  const before = new THREE.Color(palette.before);
  const mid = new THREE.Color(palette.transition);
  const after = new THREE.Color(palette.after);

  if (progress <= TRANSITION_START) {
    // barely perceptible drift — a real titration does dull slightly
    return before.clone().lerp(mid, (progress / TRANSITION_START) * 0.12);
  }
  if (progress >= 1.0) {
    const over = Math.min(1, (progress - 1) / 0.05);
    return mid.clone().lerp(after, 0.55 + 0.45 * over);
  }
  const t = (progress - TRANSITION_START) / (1 - TRANSITION_START);
  // ease so the change is slow at first and rapid at the very end
  const eased = t * t * (3 - 2 * t);
  return before.clone().lerp(mid, 0.12 + 0.88 * eased).lerp(after, eased * 0.45);
}

export function endpointState(progress) {
  if (progress >= 1.0) return 'endpoint';
  if (progress >= TRANSITION_START) return 'approaching';
  if (progress >= 0.8) return 'near';
  return 'titrating';
}

export function describeColor(indicatorKey, progress) {
  const p = INDICATOR_COLORS[indicatorKey];
  if (!p) return 'Colourless';
  if (progress >= 1.0) return p.afterLabel;
  if (progress >= TRANSITION_START) return `Changing — ${p.beforeLabel} fading`;
  return p.beforeLabel;
}

export function reagentColor(key) {
  const r = REAGENTS[key];
  return new THREE.Color(r ? r.color : 0xdfe9ee);
}

/* ------------------------------------------------------------------ */
/* Solution                                                            */
/* ------------------------------------------------------------------ */

/**
 * Tracks the contents of one vessel: total volume, which indicator is in it,
 * and the colour that should be shown. The 3D liquid mesh is driven from here.
 */
export class Solution {
  constructor(vesselCapacity_mL) {
    this.capacity = vesselCapacity_mL;
    this.reset();
  }

  reset() {
    this.volume_mL = 0;
    this.sampleVolume_mL = 0;
    this.titrantVolume_mL = 0;
    this.indicator = null;
    this.indicators = [];
    this.buffered = false;
    this.baseColor = new THREE.Color(0xcfe7f2);
    this.color = this.baseColor.clone();
    this.precipitate = false;
  }

  addSample(mL, color) {
    this.volume_mL += mL;
    this.sampleVolume_mL += mL;
    this.baseColor = new THREE.Color(color);
    this.color = this.baseColor.clone();
  }

  addReagent(key, mL) {
    const r = REAGENTS[key];
    this.volume_mL += mL;
    if (key === 'buffer') this.buffered = true;
    if (INDICATOR_COLORS[key]) {
      this.indicator = key;
      if (!this.indicators.includes(key)) this.indicators.push(key);
      this.color = new THREE.Color(INDICATOR_COLORS[key].before);
    } else if (r) {
      this.color = this.color.clone().lerp(new THREE.Color(r.color), 0.1);
    }
    return r;
  }

  addTitrant(mL) {
    this.volume_mL += mL;
    this.titrantVolume_mL += mL;
  }

  /** Update the visible colour for the current titration progress. */
  updateForProgress(progress) {
    if (!this.indicator) return this.color;
    this.color = indicatorColorAt(this.indicator, progress);
    return this.color;
  }

  get fillFraction() {
    return Math.max(0, Math.min(1, this.volume_mL / this.capacity));
  }
}

/** Bind a Solution to a vessel's liquid mesh. */
export function applySolution(vessel, solution) {
  const liquid = vessel?.userData?.liquid;
  if (!liquid) return;
  liquid.setFill(solution.fillFraction);
  liquid.setColor(solution.color);
}
