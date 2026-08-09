// app.js
// Maneja la interfaz, drag & drop y carga del archivo ZIP

let currentZip = null;
let currentZipName = "";
let currentReport = null;

const dropzone = document.getElementById("dropzone");
const zipInput = document.getElementById("zipInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const selectedFile = document.getElementById("selectedFile");
const results = document.getElementById("results");

// ---------- i18n ----------
const I18N = {
  en: {
    nav: { validator: "Validator", about: "About", viewer: "Skin Viewer", wip: "WIP" },
    hero: {
      title: "CHECK YOUR 4D SKINPACK BEFORE YOU INSTALL IT",
      subtitle: `Automatically analyzes Minecraft Bedrock files like
        <strong>skins.json</strong>,
        <strong>geometry.json</strong>,
        <strong>manifest.json</strong>,
        <strong>skinpacks.json</strong>,
        <strong>texts/.lang</strong>
        and every texture in the pack.`,
      btnStart: "Start analysis",
      btnChecks: "See checks",
      statusTitle: "System status",
      statusReady: "Validator ready",
      statusInstant: "Instant analysis",
      statusPrivate: "No files uploaded to any server",
      miniSkins: "Skins",
      miniErrors: "Errors"
    },
    validator: {
      sectionTitle: "ANALYZE PACKAGE",
      dropTitle: "DRAG YOUR SKINPACK",
      dropText: `Accepts
        <strong>.zip</strong>
        and
        <strong>.mcpack</strong>
        Minecraft Bedrock skin pack files.`,
      selectFile: "Select file",
      noFile: "No file selected",
      summary: "Summary",
      statSkins: "Skins detected",
      statErrors: "Errors",
      statWarnings: "Warnings",
      statSuccess: "Passed",
      infoBrowser: "The analysis runs entirely in your browser.",
      infoPrivate: "No file is ever sent to any external server.",
      resultsTitle: "Analysis results",
      analyzeBtn: "Analyze package",
      ambiguousOption: `Automatically resolve geometry ambiguities (use the first match when a model's base name, e.g. "ModelName", appears in more than one geometry such as "geometry.ModelName" and "geometry.custom.ModelName")`,
      waitingTitle: "Waiting for a package",
      waitingText: "Select or drag a ZIP or MCPACK file to start the analysis.",
      loadingTitle: "Analyzing package",
      loadingText: "Reading files and checking references...",
      loadingBtn: "Loading...",
      analyzingBtn: "Analyzing...",
      readyTitle: "Package ready to analyze",
      invalidExtTitle: "Unsupported format",
      invalidExtText: "Files must be Minecraft Bedrock skin packs (.zip or .mcpack).",
      invalidExtSelected: "Only .zip or .mcpack files are allowed.",
      notPackTitle: "Incompatible package",
      notPackText: `Must be a compatible Minecraft Bedrock skin pack (skins.json is required, and a "skin_pack" module if manifest.json is present).`,
      notPackSelected: "The file doesn't look like a Minecraft Bedrock skin pack.",
      invalidFileTitle: "Invalid file",
      invalidFileText: "The selected file couldn't be opened correctly.",
      invalidFileSelected: "Couldn't open the file.",
      internalErrorTitle: "Internal error",
      internalErrorText: "Something went wrong during the package analysis.",
      needPackAlert: "Load a skinpack first."
    },
    fix: {
      title: "Available fixes",
      subtitle: "Select the repairs you want to apply.",
      jsonTitle: "Repair JSON",
      jsonDesc: "Fixes common syntax errors (trailing commas, etc.)",
      locTitle: "Sync localization_name",
      locDesc: "Links each skin to its entry in texts/.lang",
      textsTitle: "Create missing text entries",
      textsDesc: "Generates missing entries in language files",
      caseTitle: "Fix upper/lowercase",
      caseDesc: "Fixes texture/cape references in skins.json to match real file names",
      geoTitle: "Check geometries",
      geoDesc: "Checks that every model exists in geometry.json",
      dupTitle: "Remove duplicate or unused skins",
      dupDesc: "Removes duplicates and skins whose texture doesn't exist",
      repairBtn: "Create fixed ZIP",
      repairing: "Building fixed package...",
      repairError: "Something went wrong while building the fixed package. Check the console for details."
    },
    about: {
      title: "BUILT FOR 4D SKINPACKS",
      p1: `This tool is designed specifically for
        <strong>Minecraft Bedrock 4D</strong>
        projects, including custom geometries, complex models and packs with
        multiple language files.`,
      p2: "The goal is to catch exactly the mistakes that usually make a skin not show up in-game, a model fail to load, or textures break."
    },
    checks: {
      sectionTitle: "WHAT WE CHECK",
      geoTitle: "Geometries",
      geoText: `Verifies that the identifiers used in
        <strong>skins.json</strong>
        actually exist in
        <strong>geometry.json</strong>.`,
      texTitle: "Textures",
      texText: "Checks that every image referenced by a skin physically exists inside the package and detects upper/lowercase mismatches.",
      langTitle: "Texts / Lang",
      langText: `Checks that every
        <strong>localization_name</strong>
        has its matching entry in
        <strong>texts/.lang</strong>
        and detects missing or extra keys.`,
      manifestTitle: "Manifest",
      manifestText: `Validates
        <strong>UUID</strong>,
        <strong>format_version</strong>,
        present modules and other common issues in
        <strong>manifest.json</strong>.`,
      jsonTitle: "JSON",
      jsonText: "Detects JSON files with syntax errors and shows the approximate location of the problem whenever possible.",
      consTitle: "Consistency",
      consText: "Compares names, paths, duplicate references and overall consistency across every file in the skinpack."
    },
    footer: { text: "Visually inspired by Minecraft.net" },
    viewer: {
      sectionTitle: "SKIN PACK VIEWER",
      intro: "Load a regular (non-4D) Minecraft Bedrock skin pack to see each skin's texture and preview it in 3D on its Steve or Alex model.",
      dropTitle: "DRAG YOUR SKIN PACK",
      dropText: `Accepts
        <strong>.zip</strong>
        and
        <strong>.mcpack</strong>
        Minecraft Bedrock skin pack files.`,
      modelSteve: "Steve (Wide)",
      modelAlex: "Alex (Slim)",
      viewTexture: "View texture",
      view3D: "View in 3D",
      noTexture: "Texture not found in the package.",
      notASkinPack: "This file doesn't look like a Minecraft Bedrock skin pack.",
      noSkins: "No skins were found in this package.",
      loading: "Loading package..."
    },
    js: {
      skinsPreviewTitle: "👕 Detected skins",
      skinPreviewMissingLang: "(no name in lang)",
      rowName: "Name:",
      rowModel: "Model:",
      rowCape: "Cape:",
      animationsLabel: "Animations",
      defaultPackDescription: "4D skin pack",
      comingSoon: "Coming soon!"
    }
  },
  es: {
    nav: { validator: "Validador", about: "Acerca de", viewer: "Visor de Skins", wip: "WIP" },
    hero: {
      title: "REVISA TU SKINPACK 4D ANTES DE INSTALARLO",
      subtitle: `Analiza automáticamente archivos de Minecraft Bedrock como
        <strong>skins.json</strong>,
        <strong>geometry.json</strong>,
        <strong>manifest.json</strong>,
        <strong>skinpacks.json</strong>,
        <strong>texts/.lang</strong>
        y todas las texturas del paquete.`,
      btnStart: "Comenzar análisis",
      btnChecks: "Ver comprobaciones",
      statusTitle: "Estado del sistema",
      statusReady: "Validador listo",
      statusInstant: "Análisis instantáneo",
      statusPrivate: "Ningún archivo se sube a un servidor",
      miniSkins: "Skins",
      miniErrors: "Errores"
    },
    validator: {
      sectionTitle: "ANALIZAR PAQUETE",
      dropTitle: "ARRASTRA TU SKINPACK",
      dropText: `Admite archivos
        <strong>.zip</strong>
        y
        <strong>.mcpack</strong>
        de skins de Minecraft Bedrock.`,
      selectFile: "Seleccionar archivo",
      noFile: "Ningún archivo seleccionado",
      summary: "Resumen",
      statSkins: "Skins detectadas",
      statErrors: "Errores",
      statWarnings: "Advertencias",
      statSuccess: "Correctos",
      infoBrowser: "El análisis se ejecuta completamente en tu navegador.",
      infoPrivate: "Ningún archivo es enviado a servidores externos.",
      resultsTitle: "Resultados del análisis",
      analyzeBtn: "Analizar paquete",
      ambiguousOption: `Resolver ambigüedades de geometría automáticamente (usar la primera coincidencia cuando el nombre base del modelo, ej. "NombreDelModelo", aparece en más de una geometría distinta como "geometry.NombreDelModelo" y "geometry.custom.NombreDelModelo")`,
      waitingTitle: "Esperando un paquete",
      waitingText: "Selecciona o arrastra un archivo ZIP o MCPACK para comenzar el análisis.",
      loadingTitle: "Analizando paquete",
      loadingText: "Leyendo archivos y comprobando referencias...",
      loadingBtn: "Cargando...",
      analyzingBtn: "Analizando...",
      readyTitle: "Paquete listo para analizar",
      invalidExtTitle: "Formato no compatible",
      invalidExtText: "Deben ser paquetes de skins de Minecraft Bedrock (.zip o .mcpack).",
      invalidExtSelected: "Solo se permiten archivos .zip o .mcpack.",
      notPackTitle: "Paquete no compatible",
      notPackText: `Deben ser skins de Minecraft Bedrock compatibles (se requiere skins.json y, si hay manifest.json, un módulo de tipo "skin_pack").`,
      notPackSelected: "El archivo no parece ser un skinpack de Minecraft Bedrock.",
      invalidFileTitle: "Archivo inválido",
      invalidFileText: "El archivo seleccionado no pudo abrirse correctamente.",
      invalidFileSelected: "No se pudo abrir el archivo.",
      internalErrorTitle: "Error interno",
      internalErrorText: "Ocurrió un problema durante el análisis del paquete.",
      needPackAlert: "Primero carga un skinpack."
    },
    fix: {
      title: "Correcciones disponibles",
      subtitle: "Selecciona las reparaciones que quieres aplicar.",
      jsonTitle: "Reparar JSON",
      jsonDesc: "Corrige errores comunes de sintaxis (comas sobrantes, etc.)",
      locTitle: "Sincronizar localization_name",
      locDesc: "Vincula cada skin con su entrada en texts/.lang",
      textsTitle: "Crear textos faltantes",
      textsDesc: "Genera entradas faltantes en los archivos de idioma",
      caseTitle: "Corregir mayúsculas/minúsculas",
      caseDesc: "Corrige las referencias texture/cape en skins.json para que coincidan con el nombre real del archivo",
      geoTitle: "Revisar geometrías",
      geoDesc: "Comprueba que cada modelo exista en geometry.json",
      dupTitle: "Remover skins repetidas o no usadas",
      dupDesc: "Elimina duplicados y skins cuya textura no existe",
      repairBtn: "Crear ZIP corregido",
      repairing: "Generando paquete corregido...",
      repairError: "Ocurrió un problema al generar el paquete corregido. Revisa la consola para más detalles."
    },
    about: {
      title: "HECHO PARA SKINPACKS 4D",
      p1: `Esta herramienta está pensada específicamente para proyectos de
        <strong>Minecraft Bedrock 4D</strong>,
        incluyendo geometrías personalizadas, modelos complejos y paquetes con
        múltiples archivos de idioma.`,
      p2: "El objetivo es detectar exactamente los errores que suelen provocar que una skin no aparezca en el juego, que el modelo no cargue o que las texturas se rompan."
    },
    checks: {
      sectionTitle: "QUÉ COMPROBAMOS",
      geoTitle: "Geometrías",
      geoText: `Verifica que los identificadores usados en
        <strong>skins.json</strong>
        existan realmente en
        <strong>geometry.json</strong>.`,
      texTitle: "Texturas",
      texText: "Comprueba que todas las imágenes referenciadas por las skins existan físicamente dentro del paquete y detecta diferencias por mayúsculas y minúsculas.",
      langTitle: "Texts / Lang",
      langText: `Revisa que cada
        <strong>localization_name</strong>
        tenga su entrada correspondiente en
        <strong>texts/.lang</strong>
        y detecta claves faltantes o sobrantes.`,
      manifestTitle: "Manifest",
      manifestText: `Valida
        <strong>UUID</strong>,
        <strong>format_version</strong>,
        módulos presentes y otros problemas comunes de
        <strong>manifest.json</strong>.`,
      jsonTitle: "JSON",
      jsonText: "Detecta archivos JSON con errores de sintaxis y muestra la ubicación aproximada del problema cuando sea posible.",
      consTitle: "Consistencia",
      consText: "Compara nombres, rutas, referencias duplicadas y coherencia general entre todos los archivos del skinpack."
    },
    footer: { text: "Inspirado visualmente en Minecraft.net" },
    viewer: {
      sectionTitle: "VISOR DE SKIN PACKS",
      intro: "Carga un skin pack normal (no 4D) de Minecraft Bedrock para ver la textura de cada skin y previsualizarla en 3D sobre su modelo Steve o Alex.",
      dropTitle: "ARRASTRA TU SKIN PACK",
      dropText: `Admite archivos
        <strong>.zip</strong>
        y
        <strong>.mcpack</strong>
        de skins de Minecraft Bedrock.`,
      modelSteve: "Steve (Wide)",
      modelAlex: "Alex (Slim)",
      viewTexture: "Ver textura",
      view3D: "Ver en 3D",
      noTexture: "No se encontró la textura en el paquete.",
      notASkinPack: "El archivo no parece ser un skinpack de Minecraft Bedrock.",
      noSkins: "No se encontraron skins en este paquete.",
      loading: "Cargando paquete..."
    },
    js: {
      skinsPreviewTitle: "👕 Skins detectadas",
      skinPreviewMissingLang: "(sin nombre en el lang)",
      rowName: "Nombre:",
      rowModel: "Modelo:",
      rowCape: "Capa:",
      animationsLabel: "Animaciones",
      defaultPackDescription: "Paquete de skins 4D",
      comingSoon: "¡Próximamente!"
    }
  }
};

let currentLang = "en";

function t(key) {
  const parts = key.split(".");
  let node = I18N[currentLang];
  for (const p of parts) {
    if (!node) return key;
    node = node[p];
  }
  return typeof node === "string" ? node : key;
}

async function applyLanguage(lang) {
  if (!I18N[lang]) return;
  currentLang = lang;

  try { localStorage.setItem("mb4dl_lang", lang); } catch (e) {}

  document.documentElement.lang = lang;

  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });

  document.querySelectorAll("[data-i18n-html]").forEach(el => {
    el.innerHTML = t(el.getAttribute("data-i18n-html"));
  });

  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
  });

  // Los mensajes del análisis quedan fijados en el idioma con el que se
  // generaron, así que si ya hay un paquete cargado se vuelve a analizar
  // en el nuevo idioma para que los resultados también queden traducidos.
  if (currentZip) {

    try {
      const resolveAmbiguousGeometry =
        document.getElementById("resolveAmbiguousGeometry")?.checked || false;

      currentReport = await validateSkinPack(currentZip, currentZipName, {
        resolveAmbiguousGeometry,
        lang: currentLang
      });

      renderReport(currentReport);

    } catch (e) {
      console.error(e);
    }

  } else {
    clearResults();
  }

  if (typeof viewerResults !== "undefined" && viewerResults && !viewerResults._skinsData) {
    viewerShowMessage(t("validator.waitingText"));
  }

  if (analyzeBtn && analyzeBtn.textContent.trim() !== t("validator.loadingBtn") && analyzeBtn.textContent.trim() !== t("validator.analyzingBtn")) {
    analyzeBtn.textContent = t("validator.analyzeBtn");
  }
}

document.querySelectorAll(".lang-btn").forEach(btn => {
  btn.addEventListener("click", () => applyLanguage(btn.getAttribute("data-lang")));
});

// ---------- Animaciones de aparición al hacer scroll ----------
if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));
} else {
  document.querySelectorAll(".reveal").forEach(el => el.classList.add("in-view"));
}

// ---------- Estadísticas ----------
function resetStats() {
  document.getElementById("skinsCount").textContent = "0";
  document.getElementById("errorsCount").textContent = "0";
  document.getElementById("warningsCount").textContent = "0";
  document.getElementById("successCount").textContent = "0";

  document.getElementById("miniSkins").textContent = "0";
  document.getElementById("miniErrors").textContent = "0";
}

function setStats(stats) {
  document.getElementById("skinsCount").textContent = stats.skins || 0;
  document.getElementById("errorsCount").textContent = stats.errors || 0;
  document.getElementById("warningsCount").textContent = stats.warnings || 0;
  document.getElementById("successCount").textContent = stats.success || 0;

  document.getElementById("miniSkins").textContent = stats.skins || 0;
  document.getElementById("miniErrors").textContent = stats.errors || 0;
}

// ---------- Resultados ----------
function clearResults() {
    results.innerHTML = `
    <div class="result-placeholder">
        <div class="placeholder-icon">🧱</div>
        <h4>${t("validator.waitingTitle")}</h4>
        <p>${t("validator.waitingText")}</p>
    </div>
    `;
}

function showLoading() {
    results.innerHTML = `
    <div class="result-placeholder">
        <div class="placeholder-icon">⏳</div>
        <h4>${t("validator.loadingTitle")}</h4>
        <p>${t("validator.loadingText")}</p>
    </div>
    `;
}
function addResult(type, title, message) {
  const item = document.createElement("div");
  item.className = `result-item ${type}`;

  item.innerHTML = `
<h4>${title}</h4>
<p>${message}</p>
`;

results.appendChild(item);
}

function beginResults() {
  results.innerHTML = "";
}

// ---------- Drag & Drop ----------
["dragenter", "dragover"].forEach(event => {
  dropzone.addEventListener(event, e => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add("drag");
  });
});

["dragleave", "dragend", "drop"].forEach(event => {
  dropzone.addEventListener(event, e => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove("drag");
  });
});

dropzone.addEventListener("drop", e => {
  const file = e.dataTransfer.files[0];
  if (file) {
    handleFile(file);
  }
});

// ---------- Selector ----------
zipInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (file) {
    handleFile(file);
  }
});

// ---------- Validación previa del paquete ----------
async function isLikelySkinPack(zip) {
  const files = Object.keys(zip.files).filter(f => !zip.files[f].dir);

  const hasSkinsJson = files.some(f => /(^|\/)skins\.json$/i.test(f));
  if (!hasSkinsJson) return false;

  const manifestPath = files.find(f => /(^|\/)manifest\.json$/i.test(f));
  if (!manifestPath) return true; // sin manifest: dejamos que el validador reporte el problema

  try {
    const manifest = JSON.parse(await zip.files[manifestPath].async("string"));
    const modules = manifest.modules || [];
    const isSkinModule = modules.some(m => (m.type || "").toLowerCase() === "skin_pack");

    // Si declara módulos pero ninguno es skin_pack, probablemente no es
    // un paquete de skins (podría ser un resource/behavior pack normal).
    if (modules.length && !isSkinModule) return false;

  } catch (e) {
    // manifest inválido: dejamos que el validador reporte el error específico
  }

  return true;
}

// ---------- Códigos de formato de Minecraft (§) ----------
// Códigos de formato de Minecraft BEDROCK (distintos de Java en algunos casos):
// Bedrock reutiliza las letras "m" y "n" como colores adicionales de material
// en vez de tachado/subrayado, y agrega los colores "g" a "u".
const MC_COLORS = {
  "0": "#000000", "1": "#0000AA", "2": "#00AA00", "3": "#00AAAA",
  "4": "#AA0000", "5": "#AA00AA", "6": "#FFAA00", "7": "#AAAAAA",
  "8": "#555555", "9": "#5555FF", "a": "#55FF55", "b": "#55FFFF",
  "c": "#FF5555", "d": "#FF55FF", "e": "#FFFF55", "f": "#FFFFFF",
  // Colores exclusivos de Bedrock (material/minecoin)
  "g": "#DDD605", "h": "#E3D4D1", "i": "#CECACA", "j": "#443A3B",
  "m": "#971607", "n": "#B4684D", "p": "#DEB12D", "q": "#47A036",
  "s": "#2CBAA8", "t": "#21497B", "u": "#9A5CC6"
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mcFormatToHtml(text) {
  if (!text) return "";

  let html = "";
  let buffer = "";
  let color = null, bold = false, italic = false, underline = false, strikethrough = false, obfuscated = false;

  function flush() {
    if (!buffer) return;

    const styles = [];
    if (color) styles.push(`color:${color}`);
    if (bold) styles.push("font-weight:bold");
    if (italic) styles.push("font-style:italic");

    const decor = [];
    if (underline) decor.push("underline");
    if (strikethrough) decor.push("line-through");
    if (decor.length) styles.push(`text-decoration:${decor.join(" ")}`);

    const cls = obfuscated ? ' class="mc-obfuscated"' : "";

    html += `<span style="${styles.join(";")}"${cls}>${escapeHtml(buffer)}</span>`;
    buffer = "";
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === "§" && i + 1 < text.length) {
      flush();

      const code = text[i + 1].toLowerCase();

      if (MC_COLORS[code]) {
        color = MC_COLORS[code];
        bold = italic = underline = strikethrough = obfuscated = false;
      } else if (code === "l") bold = true;
      else if (code === "o") italic = true;
      else if (code === "k") obfuscated = true;
      else if (code === "r") {
        color = null;
        bold = italic = underline = strikethrough = obfuscated = false;
      }

      i++;
      continue;
    }

    buffer += ch;
  }

  flush();
  return html;
}

// ---------- Banner de información del paquete ----------
function renderPackInfo(packInfo) {
  if (!packInfo) return "";

  const iconHtml = packInfo.iconDataUrl
    ? `<img src="${packInfo.iconDataUrl}" alt="Pack icon">`
    : `<div class="pack-icon-default">🧊</div>`;

  // El validador usa "Paquete de skins 4D" como descripción por defecto;
  // la traducimos aquí para respetar el idioma activo de la interfaz.
  const description =
    packInfo.description === "Paquete de skins 4D"
      ? t("js.defaultPackDescription")
      : packInfo.description;

  return `
    <div class="pack-info-banner">
      <div class="pack-info-text">
        <div class="pack-info-name">${mcFormatToHtml(packInfo.name)}</div>
        <div class="pack-info-description">${mcFormatToHtml(description)}</div>
      </div>
      <div class="pack-info-icon">
        ${iconHtml}
      </div>
    </div>
  `;
}

// ---------- Preview de skins ----------
function renderSkinsPreview(skinDetails) {
  if (!skinDetails || !skinDetails.length) return "";

  const cards = skinDetails.map(skin => {

    const displayNameHtml = skin.displayName
      ? mcFormatToHtml(skin.displayName)
      : `<span class="skin-preview-missing">${t("js.skinPreviewMissingLang")}</span>`;

    let animationsHtml = "";
    if (skin.animations && Object.keys(skin.animations).length) {
      const animCount = Object.keys(skin.animations).length;
      animationsHtml = `
        <details class="skin-preview-animations">
          <summary>${t("js.animationsLabel")} (${animCount})</summary>
          <div class="skin-preview-animations-body">
            ${Object.entries(skin.animations).map(([slot, val]) =>
              `<div class="skin-preview-anim-row"><code>${escapeHtml(slot)}</code> <span class="anim-arrow">➡️</span> <code>${escapeHtml(val)}</code></div>`
            ).join("")}
          </div>
        </details>
      `;
    }

    const cardClass = skin.hasIssue
      ? "skin-preview-card skin-preview-card-warning"
      : "skin-preview-card";

    return `
      <div class="${cardClass}">
        <div class="skin-preview-displayname">${displayNameHtml}</div>
        <div class="skin-preview-row"><span>${t("js.rowName")}</span> ${escapeHtml(skin.name)}</div>
        <div class="skin-preview-row"><span>${t("js.rowModel")}</span> ${escapeHtml(skin.geometry || "—")}</div>
        ${skin.cape ? `<div class="skin-preview-row"><span>${t("js.rowCape")}</span> ${escapeHtml(skin.cape)}</div>` : ""}
        ${animationsHtml}
      </div>
    `;
  }).join("");

  return `
    <div class="card skins-preview-card">
      <h3 class="pixel-title">${t("js.skinsPreviewTitle")}</h3>
      <div class="skins-preview-grid">
        ${cards}
      </div>
    </div>
  `;
}

// ---------- Carga del ZIP ----------
async function handleFile(file) {
  resetStats();
  clearResults();

  const lowerName = file.name.toLowerCase();
  const validExtension = lowerName.endsWith(".zip") || lowerName.endsWith(".mcpack");

  if (!validExtension) {
    selectedFile.textContent = t("validator.invalidExtSelected");
    results.innerHTML = `
      <div class="result-placeholder">
        <div class="placeholder-icon">❌</div>
        <h4>${t("validator.invalidExtTitle")}</h4>
        <p>${t("validator.invalidExtText")}</p>
      </div>
    `;
    return;
  }

  selectedFile.textContent = file.name;
  currentZipName = file.name;

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = t("validator.loadingBtn");

  try {
    currentZip = await JSZip.loadAsync(file);

    const looksValid = await isLikelySkinPack(currentZip);

    if (!looksValid) {
      currentZip = null;

      analyzeBtn.disabled = true;
      analyzeBtn.textContent = t("validator.analyzeBtn");

      selectedFile.textContent = t("validator.notPackSelected");

      results.innerHTML = `
        <div class="result-placeholder">
          <div class="placeholder-icon">❌</div>
          <h4>${t("validator.notPackTitle")}</h4>
          <p>${t("validator.notPackText")}</p>
        </div>
      `;

      return;
    }

    analyzeBtn.disabled = false;
    analyzeBtn.textContent = t("validator.analyzeBtn");

    results.innerHTML = `
      <div class="result-placeholder">
        <div class="placeholder-icon">📦</div>
        <h4>${t("validator.readyTitle")}</h4>
        <p>${escapeHtml(file.name)}</p>
      </div>
    `;
  } catch (err) {
    console.error(err);

    currentZip = null;

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = t("validator.analyzeBtn");

    selectedFile.textContent = t("validator.invalidFileSelected");

    results.innerHTML = `
      <div class="result-placeholder">
        <div class="placeholder-icon">❌</div>
        <h4>${t("validator.invalidFileTitle")}</h4>
        <p>${t("validator.invalidFileText")}</p>
      </div>
    `;
  }
}

// ---------- Renderiza un reporte completo en #results ----------
function renderReport(report) {
  beginResults();

  if (report.packInfo) {
    results.insertAdjacentHTML("beforeend", renderPackInfo(report.packInfo));
  }

  report.results.forEach(r => {
    addResult(r.type, r.title, r.message);
  });

  if (report.skinDetails && report.skinDetails.length) {
    results.insertAdjacentHTML("beforeend", renderSkinsPreview(report.skinDetails));
  }

  setStats(report.stats);
}

// ---------- Ejecutar análisis ----------
analyzeBtn.addEventListener("click", async () => {
  if (!currentZip) return;

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = t("validator.analyzingBtn");

  showLoading();

  try {
    const resolveAmbiguousGeometry =
      document.getElementById("resolveAmbiguousGeometry")?.checked || false;

    // Esta función estará en validator.js
    currentReport = await validateSkinPack(currentZip, currentZipName, {
      resolveAmbiguousGeometry,
      lang: currentLang
    });

    renderReport(currentReport);

    document
    .getElementById("fixPanel")
    .style.display = "block";

  } catch (err) {
    console.error(err);

    beginResults();

    addResult(
      "error",
      t("validator.internalErrorTitle"),
      t("validator.internalErrorText")
    );
  }

  analyzeBtn.disabled = false;
  analyzeBtn.textContent = t("validator.analyzeBtn");
});


const repairButton =
document.getElementById("repairButton");


if(repairButton){

repairButton.addEventListener("click", async ()=>{

if(!currentZip){
    alert(t("validator.needPackAlert"));
    return;
}

let options={

fixJson:
document.getElementById("fixJson").checked,

syncLocalization:
document.getElementById("fixLocalization").checked,

createMissingTexts:
document.getElementById("fixTexts").checked,

fixCase:
document.getElementById("fixCase").checked,

fixGeometry:
document.getElementById("fixGeometry").checked,

removeDuplicatesOrUnused:
document.getElementById("removeDuplicatesOrUnused").checked

};


const originalBtnText = repairButton.textContent;
repairButton.disabled = true;
repairButton.textContent = t("fix.repairing");

try {

    let changes =
    await Fixer.apply(
    currentZip,
    options,
    currentReport
    );

    console.log(changes);

    let output =
    await currentZip.generateAsync({
        type:"blob",
        compression:"DEFLATE",
        compressionOptions:{ level:6 }
    });

    // Nombre de salida: conserva la extensión original (.zip o .mcpack)
    // en vez de asumir siempre ".zip", que dejaba el nombre sin cambios
    // para archivos .mcpack.
    const dotIndex = currentZipName.lastIndexOf(".");
    const baseName = dotIndex > -1 ? currentZipName.slice(0, dotIndex) : currentZipName;
    const ext = dotIndex > -1 ? currentZipName.slice(dotIndex) : ".mcpack";
    const downloadName = `${baseName}_corregido${ext}`;

    const blobUrl = URL.createObjectURL(output);

    let link = document.createElement("a");
    link.href = blobUrl;
    link.download = downloadName;
    link.style.display = "none";

    // Algunos navegadores (Firefox, Safari) no disparan la descarga si el
    // enlace no está insertado en el DOM al momento del click.
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Se revoca la URL luego de un momento para no interrumpir la descarga
    setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);

} catch (err) {

    console.error(err);
    alert(t("fix.repairError"));

} finally {

    repairButton.disabled = false;
    repairButton.textContent = originalBtnText;

}

});

}

// ==========================================================
// Sistema de pestañas (Validador / Acerca de / Visor / WIP)
// ==========================================================
function switchTab(tabId) {
  document.querySelectorAll(".tab-section").forEach(sec => {
    sec.classList.toggle("active-tab", sec.id === tabId);
  });

  document.querySelectorAll(".tab-link").forEach(link => {
    link.classList.toggle("active", link.getAttribute("data-tab") === tabId);
  });

  // Si salimos de la pestaña del visor, liberamos la escena 3D activa
  // para no seguir renderizando de fondo.
  if (tabId !== "viewer" && typeof dispose3DViewer === "function") {
    dispose3DViewer();
  }

  const target = document.getElementById(tabId);

  if (target) {
    target.classList.add("in-view");
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

document.querySelectorAll(".tab-link[data-tab]").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    switchTab(link.getAttribute("data-tab"));
  });
});

document.querySelectorAll(".tab-wip").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    alert(t("js.comingSoon"));
  });
});

// ==========================================================
// Visor de skin packs normales (no 4D)
// ==========================================================
const viewerDropzone = document.getElementById("viewerDropzone");
const viewerZipInput = document.getElementById("viewerZipInput");
const viewerSelectedFile = document.getElementById("viewerSelectedFile");
const viewerResults = document.getElementById("viewerResults");

function viewerShowMessage(msg) {
  viewerResults.innerHTML = `
    <div class="result-placeholder">
      <div class="placeholder-icon">🧱</div>
      <p>${escapeHtml(msg)}</p>
    </div>
  `;
}

function renderViewerSkins(skins) {
  if (!skins || !skins.length) {
    viewerShowMessage(t("viewer.noSkins"));
    return;
  }

  viewerResults.innerHTML = skins.map((skin, i) => {
    const modelLabel = skin.isSlim ? t("viewer.modelAlex") : t("viewer.modelSteve");

    return `
      <div class="viewer-skin-card" data-index="${i}">
        <div class="viewer-skin-header">
          <div class="viewer-skin-name">${escapeHtml(skin.name)}</div>
          <div class="viewer-skin-model">${modelLabel}</div>
        </div>

        <div class="viewer-skin-actions">
          <button type="button" class="btn btn-secondary viewer-btn-texture" data-index="${i}">🖼 ${t("viewer.viewTexture")}</button>
          <button type="button" class="btn btn-secondary viewer-btn-3d" data-index="${i}">🧊 ${t("viewer.view3D")}</button>
        </div>

        <div class="viewer-skin-content" id="viewerContent-${i}"></div>
      </div>
    `;
  }).join("");

  // Guardamos los datos para que los botones puedan usarlos
  viewerResults._skinsData = skins;

  viewerResults.querySelectorAll(".viewer-skin-header").forEach(header => {
    header.addEventListener("click", () => {
      header.closest(".viewer-skin-card").classList.toggle("expanded");
    });
  });

  viewerResults.querySelectorAll(".viewer-btn-texture").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = Number(btn.getAttribute("data-index"));
      const skin = viewerResults._skinsData[idx];
      const content = document.getElementById(`viewerContent-${idx}`);

      if (typeof dispose3DViewer === "function") dispose3DViewer();

      if (!skin.textureDataUrl) {
        content.innerHTML = `<p class="viewer-empty">${t("viewer.noTexture")}</p>`;
        return;
      }

      content.innerHTML = `<img class="viewer-texture-img" src="${skin.textureDataUrl}" alt="${escapeHtml(skin.name)}">`;
    });
  });

  viewerResults.querySelectorAll(".viewer-btn-3d").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = Number(btn.getAttribute("data-index"));
      const skin = viewerResults._skinsData[idx];
      const content = document.getElementById(`viewerContent-${idx}`);

      if (!skin.textureDataUrl) {
        content.innerHTML = `<p class="viewer-empty">${t("viewer.noTexture")}</p>`;
        return;
      }

      content.innerHTML = `<canvas class="viewer-3d-canvas"></canvas>`;
      const canvas = content.querySelector("canvas");

      // Se espera un frame para que el canvas tenga tamaño real en el DOM
      requestAnimationFrame(() => {
        open3DViewer(canvas, skin.textureDataUrl, skin.isSlim);
      });
    });
  });
}

async function handleViewerFile(file) {
  viewerSelectedFile.textContent = file.name;

  const lowerName = file.name.toLowerCase();
  const validExtension = lowerName.endsWith(".zip") || lowerName.endsWith(".mcpack");

  if (!validExtension) {
    viewerSelectedFile.textContent = t("validator.invalidExtSelected");
    viewerShowMessage(t("validator.invalidExtText"));
    return;
  }

  viewerShowMessage(t("viewer.loading"));

  try {
    const zip = await JSZip.loadAsync(file);
    const skins = await parseNormalSkinPack(zip);

    if (!skins) {
      viewerSelectedFile.textContent = t("validator.notPackSelected");
      viewerShowMessage(t("viewer.notASkinPack"));
      return;
    }

    renderViewerSkins(skins);

  } catch (err) {
    console.error(err);
    viewerSelectedFile.textContent = t("validator.invalidFileSelected");
    viewerShowMessage(t("validator.invalidFileText"));
  }
}

if (viewerDropzone && viewerZipInput) {

  viewerZipInput.addEventListener("change", (e) => {
    if (e.target.files[0]) handleViewerFile(e.target.files[0]);
  });

  viewerDropzone.addEventListener("click", (e) => {
    if (e.target.closest(".file-button")) return;
  });

  ["dragenter", "dragover"].forEach(evt => {
    viewerDropzone.addEventListener(evt, e => {
      e.preventDefault();
      e.stopPropagation();
      viewerDropzone.classList.add("drag");
    });
  });

  ["dragleave", "dragend", "drop"].forEach(evt => {
    viewerDropzone.addEventListener(evt, e => {
      e.preventDefault();
      e.stopPropagation();
      viewerDropzone.classList.remove("drag");
    });
  });

  viewerDropzone.addEventListener("drop", e => {
    const file = e.dataTransfer.files[0];
    if (file) handleViewerFile(file);
  });
}

// ---------- Inicializar ----------
resetStats();

let savedLang = "en";
try {
  const stored = localStorage.getItem("mb4dl_lang");
  if (stored === "es" || stored === "en") savedLang = stored;
} catch (e) {}

applyLanguage(savedLang);