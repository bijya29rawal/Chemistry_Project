#!/usr/bin/env node
/**
 * build.js — bundles the modular source into a single self-contained standalone.html.
 * Node.js counterpart of build.py.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const JS = path.join(ROOT, 'js');

const ORDER = [
  'data.js',
  'state.js',
  'calculations.js',
  'chemicals.js',
  'glassware.js',
  'equipment.js',
  'laboratory.js',
  'animations.js',
  'interaction.js',
  'experiments.js',
  'ui.js',
  'camera.js',
  'controls.js',
  'scene.js',
  'main.js',
];

const IMPORT_RE = /^import\s[\s\S]*?from\s+['"][^'"]+['"];\s*$/gm;
const EXPORT_LIST_RE = /^export\s*\{[^}]*\}\s*;\s*$/gm;
const EXPORT_DECL_RE = /^export\s+(?=(const|let|var|function|class|async))/gm;

function stripModuleSyntax(src) {
  src = src.replace(IMPORT_RE, '');
  src = src.replace(EXPORT_LIST_RE, '');
  src = src.replace(EXPORT_DECL_RE, '');
  return src.trim();
}

function build() {
  const parts = [
    "import * as THREE from 'three';",
    "import { OrbitControls } from 'three/addons/controls/OrbitControls.js';",
  ];

  for (const name of ORDER) {
    const code = fs.readFileSync(path.join(JS, name), 'utf8');
    parts.push(`/* ===== js/${name} ===== */\n` + stripModuleSyntax(code));
  }

  const bundle = parts.join('\n\n') + '\n';
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');

  // Inline stylesheet
  html = html.replace(/<link[^>]+href="style\.css"[^>]*>/, () => `<style>\n${css}\n</style>`);

  // Replace module entry point
  let replaced = false;
  html = html.replace(/<script type="module" src="[^"]*main\.js"><\/script>/, () => {
    replaced = true;
    return `<script type="module">\n${bundle}\n</script>`;
  });

  if (!replaced) {
    console.error('could not find the main.js script tag in index.html');
    process.exit(1);
  }

  const out = path.join(ROOT, 'standalone.html');
  fs.writeFileSync(out, html, 'utf8');
  const sizeKb = (fs.statSync(out).size / 1024).toFixed(0);
  console.log(`wrote ${out} (${sizeKb} KB)`);
}

build();
