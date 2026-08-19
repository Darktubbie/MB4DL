<div align="center">

![Banner](https://readmeforge.natrajx.in/api/banner?text=MBSM&subtext=Minecraft+Bedrock+Skin+Manager&metal=chrome&type=wave&height=200&width=900&animation=plasma&align=center&section=header&theme=dark&fontFamily=Orbitron&subtextFont=Rajdhani&visualStyle=holographic&border=none&borderWidth=2&colors=%237c3aed%2C%23a855f7&angle=74)

**A free and open-source toolkit for Minecraft Bedrock skin creators**

[![GPL v3](https://img.shields.io/badge/License-GPLv3-7c3aed?style=for-the-badge&logo=gnu&logoColor=white)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Web-a855f7?style=for-the-badge&logo=googlechrome&logoColor=white)](https://github.com/Darktubbie/MBSM)
[![Status](https://img.shields.io/badge/Status-Active_Development-8b5cf6?style=for-the-badge)](https://github.com/Darktubbie/MBSM)

</div>

---

## Overview

**MBSM (Minecraft Bedrock Skin Manager)** is a browser-based toolkit for creating, checking, repairing, previewing, and managing **Minecraft Bedrock Edition skin packs**.

MBSM brings several skin tools together in one place, including:

- Regular skin pack management and preview
- 4D/5D skin pack validation and repair
- A dedicated **4D/5D Viewer**
- **Blockbench Web integration** for 4D models
- A **Skin Pack Maker** for building regular skin packs from scratch

The goal is simple: keep the tools together so you don't have to jump between several different websites or utilities.

---

## Features

### 🧩 4D / 5D Skin Tools

The **SKINS 4D/5D** section contains the tools for custom-geometry Bedrock skin packs.

#### Validator

- Opens `.zip` and `.mcpack` skin packs directly in the browser.
- Validates `skins.json`, `geometry.json`, `manifest.json`, and localization files.
- Checks references between skins, geometries, textures, and localization entries.
- Detects missing or unused resources and invalid references.
- Reports JSON and geometry-related problems.
- Includes automatic repair tools for supported problems.

#### 4D/5D Viewer

The dedicated viewer is integrated directly into MBSM rather than opening a separate page.

- Loads 4D and 5D geometries from supported skin packs.
- Detects whether a model is **4D** or **5D**.
- Renders 5D models directly inside MBSM using Three.js.
- Sends supported 4D geometries to **Blockbench Web inside the same MBSM panel**.
- Keeps the 4D and 5D workflow inside the MBSM interface.
- Supports the associated skin texture when it can be resolved from the skin pack.
- Includes viewer controls such as rotation, wireframe, grid, pivots, and camera reset for the 5D renderer.

> **Note:** 4D models use Blockbench Web because their geometry format is handled by Blockbench. Very large geometries may exceed Blockbench Web's URL limit; MBSM prepares the geometry as a file instead of relying on an oversized URL.

---

### 🎨 Classic Skins

**Classic Skins** is the area for regular Minecraft Bedrock skin packs.

- Preview regular Minecraft skins.
- Detect **Steve (wide)** and **Alex (slim)** models.
- Browse skins contained in a skin pack.
- View skin textures.
- Preview skins in 3D without modifying the original skin pack.

The regular skin viewer is kept separate from the 4D/5D viewer so that custom-geometry functionality does not interfere with normal skin pack handling.

---

### 🛠️ Skin Pack Fixer

MBSM includes automatic repair functionality for supported skin-pack problems.

Depending on the detected issue, the fixer can help with things such as:

- JSON formatting problems
- Trailing commas
- Localization synchronization
- Missing `texts` files
- Filename/case mismatches
- Geometry-related fixes
- Broken references that can be repaired automatically

The fixer works on the pack locally and can generate a corrected skin pack for download.

---

### 📦 Skin Pack Maker

The **Skin Pack Maker** lets you create a regular Minecraft Bedrock skin pack from scratch.

It supports:

- Adding skin PNG files
- Detecting Steve/Alex model types
- Manual model selection
- Pack name and description
- Pack icon
- Bedrock text formatting
- Generating the required UUIDs
- Exporting the finished pack as `.mcpack`

---

## Privacy

MBSM is designed to keep your files local.

- **Files remain on your device**
- **No MBSM server is required to process your skin packs**
- **No MBSM account is required**
- Core validation, fixing, rendering, and pack creation happen in the browser

Some external web functionality, such as **Blockbench Web** or online skin lookup services used by specific tools, may naturally communicate with those external services when you choose to use them.

---

## Current Tools

| Tool | Purpose |
|---|---|
| **4D/5D Validator** | Analyze and validate custom-geometry skin packs |
| **Skin Pack Fixer** | Repair supported skin-pack problems automatically |
| **4D/5D Viewer** | Preview 5D models and open 4D models in embedded Blockbench Web |
| **Classic Skins** | Preview and browse regular Bedrock skins |
| **Skin Pack Maker** | Create regular `.mcpack` skin packs from scratch |

---

## Project Structure

MBSM intentionally keeps its web files together without unnecessary nested folders:

```text
MBSM/
├── index.html
├── style.css
├── app.js
├── validator.js
├── fixer.js
├── maker.js
├── viewer.js
├── skinpack.js
├── skinGeoViewer.js
├── renderer5d.js
└── blockbench.js
```

The important distinction is:

- `viewer.js` → regular Minecraft skin viewer / Classic Skins
- `skinGeoViewer.js` → 4D/5D viewer orchestration
- `renderer5d.js` → 5D rendering engine
- `blockbench.js` → embedded Blockbench Web integration
- `validator.js` → 4D/5D skin-pack validation
- `fixer.js` → automatic repairs
- `maker.js` → regular skin-pack creation
- `skinpack.js` → skin-pack loading and parsing
- `app.js` → main MBSM application logic

The regular skin viewer remains independent from the 4D/5D viewer.

---

## Technology Stack

<div align="center">

| Frontend | Rendering | File Processing |
|:---:|:---:|:---:|
| HTML | Three.js | JSZip |
| CSS | WebGL | JSON |
| JavaScript | Browser APIs | ZIP / MCPACK |

</div>

MBSM also integrates with **Blockbench Web** for displaying supported 4D geometry.

---

## Running Locally

Clone the repository:

```bash
git clone https://github.com/Darktubbie/MBSM.git
```

Then open `index.html` in a modern browser.

For the most reliable experience—especially for the embedded **Blockbench Web** panel and multi-file JavaScript modules—using a small local HTTP server is recommended:

```bash
python -m http.server
```

Then open the local address shown by the server in your browser.

No build system is required.

---

## Contributing

Contributions, suggestions, bug reports, and feature requests are welcome.

### Development workflow

1. Fork the repository
2. Create a new branch
3. Implement your changes
4. Test the affected MBSM tools
5. Commit with a descriptive message
6. Push to your fork
7. Open a Pull Request

When modifying the regular skin viewer, take care not to break the independent 4D/5D viewer and vice versa.

---

## Planned Features

MBSM is still under active development. Possible future improvements include:

- More advanced 4D/5D geometry inspection
- Better animation inspection
- Expanded skin-pack editing
- Additional validation and repair rules
- More creator-focused Bedrock utilities
- Further improvements to the integrated Blockbench workflow

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

<div align="center">

**Made with ❤️ for the Minecraft Bedrock community**

If MBSM helps you, consider giving the repository a ⭐ on GitHub.

![Wave Animation](https://waveify.onrender.com/api/wave?color=%237c3aed)

</div>
