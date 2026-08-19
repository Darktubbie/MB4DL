<div align="center">

![Banner](https://readmeforge.natrajx.in/api/banner?text=MBSM&subtext=Minecraft+Bedrock+Skin+Manager&metal=chrome&type=wave&height=200&width=900&animation=plasma&align=center&section=header&theme=dark&fontFamily=Orbitron&subtextFont=Rajdhani&visualStyle=holographic&border=none&borderWidth=2&colors=%237c3aed%2C%23a855f7&angle=74)

**A free and open-source toolkit for Minecraft Bedrock skin creators**

[![GPL v3](https://img.shields.io/badge/License-GPLv3-7c3aed?style=for-the-badge&logo=gnu&logoColor=white)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Web-a855f7?style=for-the-badge&logo=googlechrome&logoColor=white)](https://github.com/Darktubbie/MBSM)
[![Status](https://img.shields.io/badge/Status-Active_Development-8b5cf6?style=for-the-badge)](https://github.com/Darktubbie/MBSM)
<div align='center'>

---

## Overview

**MBSM (Minecraft Bedrock Skin Manager)** is a browser-based toolkit designed for **Minecraft Bedrock Edition skin packs**.

It helps creators **validate, repair, preview, and manage both regular and custom (4D/5D) skin packs** while keeping almost all processing on the user's device.

4D/5D models can be previewed live in 3D right in the browser (5D) or opened in an embedded Blockbench Web editor (4D) — no separate app, no extra tab.

No installation, no server-side processing for validation or repair, and no account required.

> **Project status:** Active development. New Bedrock skin utilities and creator-focused tools are planned for future updates.

---

## Features

### 4D / 5D Skin Validator

<table><tr><th width='35%'>Feature</th><th>Description</th></tr><tr><td><strong>.zip / .mcpack support</strong></td><td>Open and analyze Minecraft Bedrock skin pack archives directly in the browser.</td></tr><tr><td><strong>JSON validation</strong></td><td>Checks <code>skins.json</code>, <code>geometry.json</code>, <code>manifest.json</code>, and localization files.</td></tr><tr><td><strong>Reference checking</strong></td><td>Detects missing textures, broken geometry references, and invalid identifiers.</td></tr><tr><td><strong>Automatic repair</strong></td><td>Generates a corrected skin pack whenever the issue can be repaired automatically.</td></tr><tr><td><strong>4D / 5D awareness</strong></td><td>Designed specifically for custom geometry skin packs used in Minecraft Bedrock Edition.</td></tr></table>

### 4D / 5D Viewer

<table><tr><th width='35%'>Feature</th><th>Description</th></tr><tr><td><strong>Live 3D preview (5D)</strong></td><td>Renders <code>poly_mesh</code> geometries directly in the browser with Three.js — bones, cubes, pivots, wireframe and grid toggles included.</td></tr><tr><td><strong>Embedded Blockbench editor (4D)</strong></td><td>Legacy cube-based (4D) models open inside an embedded Blockbench Web editor, without leaving the page or opening a new tab.</td></tr><tr><td><strong>Automatic 4D/5D detection</strong></td><td>Detects 4D vs 5D per individual model — by geometry shape (cubes vs. poly_mesh), never by <code>format_version</code> or model name.</td></tr><tr><td><strong>Flexible input</strong></td><td>Accepts a full pack (<code>.zip</code> / <code>.mcpack</code>) or a loose <code>geometry.json</code> + texture.</td></tr><tr><td><strong>Large-model fallback</strong></td><td>4D models are sent to Blockbench by URL when small enough; oversized models automatically fall back to a manual download-and-drag-in flow.</td></tr></table>

### Classic Skins

<table><tr><th width='35%'>Feature</th><th>Description</th></tr><tr><td><strong>3D skin preview</strong></td><td>View regular Minecraft Bedrock skins directly in the browser.</td></tr><tr><td><strong>Model detection</strong></td><td>Automatically detects <strong>Steve (wide)</strong> and <strong>Alex (slim)</strong> models.</td></tr><tr><td><strong>Skin browser</strong></td><td>Browse skins contained inside a skin pack archive.</td></tr><tr><td><strong>Texture preview</strong></td><td>Inspect PNG textures used by the skin pack.</td></tr></table>

---

## Privacy

MBSM is designed with privacy in mind.

* **Files stay on your device by default**
* **Validating, repairing, previewing (5D) and building skin packs never upload anything to a server**
* **No account is required**
* **Core tools work entirely in the browser**

> The one exception: sending a 4D model to the embedded Blockbench Web editor briefly sends that model's data to `web.blockbench.net` (a third-party site) so it can open it. Everything else — validation, repair, 5D preview, Classic Skins, Skinpack Maker — stays fully local.

---

## Why MBSM?

Minecraft Bedrock skin packs can be surprisingly difficult to debug, especially when working with **custom geometry, localization files, and 4D/5D models**.

MBSM aims to provide a **single toolkit** that helps creators quickly identify problems, repair common issues, and preview their work before importing it into Minecraft.

---

## Current Tools

* 4D/5D Skin Pack Validator
* Automatic Skin Pack Repair
* 4D/5D Viewer — live 3D preview (5D) + embedded Blockbench Web editor (4D)
* Classic Skins — 3D skin viewer + Skinpack Maker

---

## Planned Features

The project is still growing. Planned additions include:

* Expanded regular skin pack support
* Skin pack editing tools
* Animation and geometry inspection
* Additional validation rules
* More creator-focused Bedrock utilities

---

## Technology Stack

<div align='center'>

|  Frontend  |   Rendering  | File Processing | External Integration |
| :--------: | :----------: | :-------------: | :-------------------: |
|    HTML    |   Three.js   |      JSZip      |    Blockbench Web (4D)    |
|     CSS    |     WebGL    |       JSON      |     opt-in, per model    |
| JavaScript | Browser APIs |   ZIP / MCPACK  |            —            |

</div>

---

## Running Locally

Clone the repository:

```bash
git clone https://github.com/Darktubbie/MBSM.git
```

Then open **index.html** in a modern browser.

No build process or local server is currently required.

---

## Contributing

Contributions, suggestions, bug reports, and feature requests are welcome.

### Development workflow

1. Fork the repository
2. Create a new branch
3. Implement your changes
4. Commit with a descriptive message
5. Push to your fork
6. Open a Pull Request

All changes should be discussed through issues or pull requests before major modifications are merged.

---

## License

MBSM is licensed under the **GNU General Public License v3.0 (GPL-3.0)**.

You may use, study, modify, and redistribute the project under the terms of the GPL v3.0.

See the **LICENSE** file for the complete license text.

---

## Minecraft Disclaimer

MBSM is an independent community project and is **not affiliated with, endorsed by, sponsored by, or officially associated with Mojang Studios or Microsoft**.

**Minecraft** is a trademark of Microsoft Corporation.

---

<div align='center'>

**Made with ❤️ for the Minecraft Bedrock community**

If MBSM helps you, consider giving the repository a ⭐ on GitHub.

![Wave Animation](https://waveify.onrender.com/api/wave?color=%237c3aed)

</div>
