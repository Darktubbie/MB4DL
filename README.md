# MBSM — Minecraft Bedrock Skin Manager

MBSM (Minecraft Bedrock Skin Manager) is a free and open-source browser-based toolkit for **Minecraft Bedrock Edition skin packs**.

It is designed to help creators **validate, repair, preview, and manage regular and custom (4D/5D) skin packs**, while keeping files on the user's device.

> **Project status:** Active development. New tools and Bedrock skin utilities are planned for future updates.

## Features

### 4D / 5D Skin Validator

* Supports `.zip` and `.mcpack` skin packs
* Detects missing files and broken references
* Validates `skins.json`, `geometry.json`, `manifest.json`, and localization files
* Detects JSON errors and common Bedrock skin pack issues
* Checks references between skin definitions, textures, and geometry
* Generates a repaired skin pack automatically when possible

### Skin Studio

* Preview regular Minecraft Bedrock skins in **3D**
* Detect **Steve (wide)** and **Alex (slim)** models
* Browse skins contained in a skin pack
* Preview skin textures

### Privacy

MBSM is designed to process files locally in the browser.

* **Files are not uploaded to an MBSM server**
* Skin packs are analyzed directly on the user's device
* No account is required
* No server-side processing is required for the core tools

> MBSM's local processing depends on the browser and the libraries used by the project. External resources loaded by the website may have their own privacy policies.

## Why MBSM?

Minecraft Bedrock skin packs can be difficult to debug, especially when working with custom geometry, localization files, and 4D/5D models.

MBSM aims to provide a simple, all-in-one toolkit that helps creators identify problems, repair common issues, and preview their work before importing it into Minecraft.

The project is intended to make Bedrock skin-pack development easier and more accessible for creators and modding communities.

## Current Tools

* 4D/5D Skin Pack Validator
* Automatic Skin Pack Repair
* 3D Skin Viewer
* Skin Studio

## Planned Features

The project is still growing. Planned additions may include:

* Expanded regular skin-pack support
* Improved 4D/5D geometry preview
* Skin-pack editing tools
* Additional validation rules
* Animation and geometry inspection
* Skin texture tools
* More creator-focused Bedrock utilities

## Technologies

MBSM is built using web technologies, including:

* HTML
* CSS
* JavaScript
* Three.js
* JSZip

Additional libraries may be added as development continues.

## Running Locally

MBSM is designed to run directly in a modern web browser.

Clone the repository:

```bash
git clone https://github.com/Darktubbie/MBSM.git
```

Then open `index.html` in a modern browser.

No build process or local server is required for the current version.

> Some features may require an internet connection if they depend on external resources or CDN-hosted libraries.

## Contributing

Contributions, suggestions, bug reports, and feature requests are welcome.

If you find a problem or have an idea for a new Bedrock skin utility, feel free to open an issue or submit a pull request.

Before submitting significant changes, please consider opening an issue to discuss the proposed feature or change.

## License

MBSM is free and open-source software licensed under the **GNU General Public License v3.0 (GPL-3.0)**.

You may use, study, modify, and redistribute the project under the terms of the GPL v3.0.

See the `LICENSE` file for the complete license text.

## Minecraft Disclaimer

MBSM is an independent community project and is **not affiliated with, endorsed by, sponsored by, or officially associated with Mojang Studios or Microsoft**.

**Minecraft** is a trademark of Microsoft Corporation.

MBSM is intended as a third-party tool for working with Minecraft Bedrock Edition skin packs.

## Third-Party Libraries

MBSM uses third-party libraries and technologies that are distributed under their own respective licenses.

These licenses and the rights associated with third-party software are separate from the MBSM project license.

When applicable, third-party licenses and notices will be included in the repository.

---
