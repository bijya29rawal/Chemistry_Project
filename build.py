#!/usr/bin/env python3
"""
build.py — bundles the modular source into a single self-contained standalone.html.

Why: ES modules cannot be loaded over the file:// protocol, so double-clicking
index.html fails. This script concatenates the modules (in dependency order),
strips the local import/export syntax, inlines style.css, and writes one HTML
file that runs from anywhere. The modular sources remain the source of truth.
"""

import re
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
JS = ROOT / "js"

# Dependency order: a module only uses things defined above it.
ORDER = [
    "data.js",
    "state.js",
    "calculations.js",
    "chemicals.js",
    "glassware.js",
    "equipment.js",
    "laboratory.js",
    "animations.js",
    "interaction.js",
    "experiments.js",
    "ui.js",
    "camera.js",
    "controls.js",
    "scene.js",
    "main.js",
]

# import ... from '...';  (single or multi-line)
IMPORT_RE = re.compile(r"^import\s[\s\S]*?from\s+['\"][^'\"]+['\"];\s*$", re.M)
# bare re-export lists: export { a, b };
EXPORT_LIST_RE = re.compile(r"^export\s*\{[^}]*\}\s*;\s*$", re.M)
# export const/function/class/let -> strip the keyword
EXPORT_DECL_RE = re.compile(r"^export\s+(?=(const|let|var|function|class|async))", re.M)


def strip_module_syntax(src: str) -> str:
    src = IMPORT_RE.sub("", src)
    src = EXPORT_LIST_RE.sub("", src)
    src = EXPORT_DECL_RE.sub("", src)
    return src.strip()


def build() -> None:
    parts = [
        "import * as THREE from 'three';",
        "import { OrbitControls } from 'three/addons/controls/OrbitControls.js';",
    ]
    for name in ORDER:
        code = (JS / name).read_text(encoding="utf-8")
        parts.append(f"/* ===== js/{name} ===== */\n" + strip_module_syntax(code))

    bundle = "\n\n".join(parts) + "\n"

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "style.css").read_text(encoding="utf-8")

    # Inline the stylesheet.
    html = re.sub(
        r'<link[^>]+href="style\.css"[^>]*>',
        lambda m: "<style>\n" + css + "\n</style>",
        html,
        count=1,
    )

    # Replace the module entry point with the bundled code.
    html, n = re.subn(
        r'<script type="module" src="[^"]*main\.js"></script>',
        lambda m: '<script type="module">\n' + bundle + "\n</script>",
        html,
        count=1,
    )
    if n != 1:
        raise SystemExit("could not find the main.js script tag in index.html")

    out = ROOT / "standalone.html"
    out.write_text(html, encoding="utf-8")
    print(f"wrote {out} ({out.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    build()
