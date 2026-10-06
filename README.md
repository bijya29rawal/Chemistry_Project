# Water Analysis Laboratory — 3D Simulator

An interactive virtual chemistry laboratory for engineering-college water analysis
practicals, built with plain HTML/CSS/JavaScript and Three.js (WebGL).

Ten experiments are simulated end to end: you fill the burette, pipette the sample,
add reagents, open the stopcock and watch the indicator turn. Every number in the
result sheet is computed from the volumes you actually delivered — no answer is
stored anywhere in the code.

---

## 1. Running it in VS Code

The project uses **ES modules**, which browsers refuse to load over the `file://`
protocol. So you cannot just double-click `index.html` — you need a local server.
Any one of these works.

### Option A — Live Server extension (easiest)

1. Open this folder in VS Code (`File ▸ Open Folder…`).
2. Install the extension **Live Server** by Ritwick Dey (VS Code will offer it
   automatically — see `.vscode/extensions.json`).
3. Right-click `index.html` in the Explorer → **Open with Live Server**.
4. The lab opens at `http://127.0.0.1:5500/index.html`.

### Option B — VS Code terminal

```bash
# Python (installed on most machines)
python -m http.server 8000
#   then open http://localhost:8000

# or Node
npx serve .
```

### Option C — no server at all

Open **`standalone.html`** by double-clicking it. It is the same application with
every module concatenated into one file, so there are no module requests to block.
Regenerate it after editing the sources with:

```bash
python build.py
```

An internet connection is needed on first load either way: Three.js is pulled from
the jsDelivr CDN and the fonts from Google Fonts. To go fully offline, download
`three.module.js` and the `examples/jsm` folder locally and repoint the import map
in `index.html`.

---

## 2. Project structure

```
water-lab/
├── index.html            markup, import map, panel layout
├── style.css             full stylesheet (light lab theme)
├── standalone.html       single-file build — runs from file://
├── build.py              bundles js/*.js + style.css into standalone.html
├── README.md
└── js/
    ├── main.js           bootstrap and render loop
    ├── scene.js          renderer, lighting, shadows
    ├── camera.js         camera and named view presets
    ├── controls.js       OrbitControls setup and limits
    ├── laboratory.js     the room: bench, shelves, station layout
    ├── equipment.js      instruments (pH, conductivity, turbidity, balance…)
    ├── glassware.js      burette, pipette, flasks, beakers, bottles
    ├── chemicals.js      indicator colour model
    ├── animations.js     tween engine, droplets, pouring, stirring
    ├── interaction.js    raycasting, hover/selection, click → action
    ├── experiments.js    state machine, action validation, procedures
    ├── calculations.js   chemistry engine (pure functions, no DOM)
    ├── data.js           CONFIG, reagents, samples, experiment definitions
    ├── state.js          application state + event emitter
    └── ui.js             all 2D panels, tabs, tables, result sheet
```

Rendering, chemistry, state and UI are kept apart on purpose: `calculations.js`
never touches the DOM, `ui.js` never touches Three.js, and `data.js` holds every
tunable constant.

---

## 3. Using the lab

1. Pick an experiment in the **left** panel, then pick a water sample.
2. Follow the procedure in the **right** panel. In **Guided** mode the simulator
   refuses out-of-order actions and tells you what is missing; in **Free Practice**
   only physically impossible actions are blocked.
3. Work the bench by clicking the 3D objects — the reagent bottle to rinse and fill
   the burette, the pipette to draw the sample, the stopcock to titrate.
4. Record initial/final readings, click **Calculate**, then **Save to table**.

Keyboard: `Space` toggles the stopcock, `B` gives the burette close-up, `R` returns
to the overview.

Animation speed (0.5× / 1× / 2×), pause and a reduced-motion switch are in the top
bar; reduced motion is also picked up from your operating system setting.

---

## 4. Configuration

Everything tunable lives at the top of `js/data.js`:

| Key | Meaning | Default |
|---|---|---|
| `standardHardWater_mgL` | strength of prepared standard hard water | `1` |
| `pipetteVolume_mL` | pipette size | `50` |
| `buretteCapacity_mL` | burette size | `50` |
| `flowRate_mLps` | stopcock flow rate | `1.2` |
| `dropVolume_mL` | one drop | `0.05` |
| `titrationScatter` | random spread on the true endpoint | `0.012` |

**A note on the standard hard water.** The specified default of 1 mg/L as CaCO₃ is
kept exactly as given and is configurable, not silently altered. Be aware that at
that strength the theoretical titre against 0.01 M EDTA is about 0.0009 mL, far
below what a burette can resolve, so standardisation against it is degenerate.
Presets for 100 and 1000 mg/L are offered in the sample panel; 1000 mg/L (1 g CaCO₃
made up to 1 L, the usual textbook preparation) gives a workable titration.

---

## 5. Experiments included

pH determination · total hardness by EDTA · acid–base titration · total alkalinity ·
mixed alkalinity (P and M end points) · chloride by Mohr's argentometric method ·
conductivity · total dissolved solids · turbidity (nephelometric) · preparation of
standard hard water.

---

## 6. Requirements

A WebGL2-capable browser (current Chrome, Edge, Firefox or Safari) and a graphics
driver that supports hardware acceleration. No build step, no npm install, no
framework.
