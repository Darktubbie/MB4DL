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
        <h4>Esperando un paquete</h4>
        <p>Selecciona o arrastra un archivo ZIP para comenzar el análisis.</p>
    </div>
    `;
}

function showLoading() {
    results.innerHTML = `
    <div class="result-placeholder">
        <div class="placeholder-icon">⏳</div>
        <h4>Analizando paquete</h4>
        <p>Leyendo archivos y comprobando referencias...</p>
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
const MC_COLORS = {
  "0": "#000000", "1": "#0000AA", "2": "#00AA00", "3": "#00AAAA",
  "4": "#AA0000", "5": "#AA00AA", "6": "#FFAA00", "7": "#AAAAAA",
  "8": "#555555", "9": "#5555FF", "a": "#55FF55", "b": "#55FFFF",
  "c": "#FF5555", "d": "#FF55FF", "e": "#FFFF55", "f": "#FFFFFF"
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
      else if (code === "n") underline = true;
      else if (code === "m") strikethrough = true;
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
    ? `<img src="${packInfo.iconDataUrl}" alt="Icono del paquete">`
    : `<div class="pack-icon-default">🧊</div>`;

  return `
    <div class="pack-info-banner">
      <div class="pack-info-text">
        <div class="pack-info-name">${mcFormatToHtml(packInfo.name)}</div>
        <div class="pack-info-description">${mcFormatToHtml(packInfo.description)}</div>
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
      : `<span class="skin-preview-missing">(sin nombre en el lang)</span>`;

    let animationsHtml = "";
    if (skin.animations && Object.keys(skin.animations).length) {
      animationsHtml = `
        <div class="skin-preview-animations">
          ${Object.entries(skin.animations).map(([slot, val]) =>
            `<div class="skin-preview-anim-row"><code>${escapeHtml(slot)}</code> ➡️ <code>${escapeHtml(val)}</code></div>`
          ).join("")}
        </div>
      `;
    }

    return `
      <div class="skin-preview-card">
        <div class="skin-preview-displayname">${displayNameHtml}</div>
        <div class="skin-preview-row"><span>Nombre:</span> ${escapeHtml(skin.name)}</div>
        <div class="skin-preview-row"><span>Modelo:</span> ${escapeHtml(skin.geometry || "—")}</div>
        ${skin.cape ? `<div class="skin-preview-row"><span>Capa:</span> ${escapeHtml(skin.cape)}</div>` : ""}
        ${animationsHtml}
      </div>
    `;
  }).join("");

  return `
    <div class="card skins-preview-card">
      <h3 class="pixel-title">👕 Skins detectadas</h3>
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
    selectedFile.textContent = "Solo se permiten archivos .zip o .mcpack.";
    results.innerHTML = `
      <div class="result-placeholder">
        <div class="placeholder-icon">❌</div>
        <h4>Formato no compatible</h4>
        <p>Deben ser paquetes de skins de Minecraft Bedrock (.zip o .mcpack).</p>
      </div>
    `;
    return;
  }

  selectedFile.textContent = file.name;
  currentZipName = file.name;

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "Cargando...";

  try {
    currentZip = await JSZip.loadAsync(file);

    const looksValid = await isLikelySkinPack(currentZip);

    if (!looksValid) {
      currentZip = null;

      analyzeBtn.disabled = true;
      analyzeBtn.textContent = "Analizar paquete";

      selectedFile.textContent = "El archivo no parece ser un skinpack de Minecraft Bedrock.";

      results.innerHTML = `
        <div class="result-placeholder">
          <div class="placeholder-icon">❌</div>
          <h4>Paquete no compatible</h4>
          <p>Deben ser skins de Minecraft Bedrock compatibles (se requiere skins.json y, si hay manifest.json, un módulo de tipo "skin_pack").</p>
        </div>
      `;

      return;
    }

    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "Analizar paquete";

    results.innerHTML = `
      <div class="result-placeholder">
        <div class="placeholder-icon">📦</div>
        <h4>Paquete listo para analizar</h4>
        <p>${file.name}</p>
      </div>
    `;
  } catch (err) {
    console.error(err);

    currentZip = null;

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "Analizar paquete";

    selectedFile.textContent = "No se pudo abrir el archivo.";

    results.innerHTML = `
      <div class="result-placeholder">
        <div class="placeholder-icon">❌</div>
        <h4>Archivo inválido</h4>
        <p>El archivo seleccionado no pudo abrirse correctamente.</p>
      </div>
    `;
  }
}

// ---------- Ejecutar análisis ----------
analyzeBtn.addEventListener("click", async () => {
  if (!currentZip) return;

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "Analizando...";

  showLoading();

  try {
    const resolveAmbiguousGeometry =
      document.getElementById("resolveAmbiguousGeometry")?.checked || false;

    // Esta función estará en validator.js
    currentReport = await validateSkinPack(currentZip, currentZipName, {
      resolveAmbiguousGeometry
    });

const report = currentReport;

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

document
.getElementById("fixPanel")
.style.display = "block";

  } catch (err) {
    console.error(err);

    beginResults();

    addResult(
      "error",
      "Error interno",
      "Ocurrió un problema durante el análisis del paquete."
    );
  }

  analyzeBtn.disabled = false;
  analyzeBtn.textContent = "Analizar paquete";
});

// Inicializar
resetStats();
clearResults();


const repairButton =
document.getElementById("repairButton");


if(repairButton){

repairButton.addEventListener("click", async ()=>{

if(!currentZip){
    alert("Primero carga un skinpack.");
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


let changes =
await Fixer.apply(
currentZip,
options,
currentReport
);

console.log(changes);

let output =
await currentZip.generateAsync({
type:"blob"
});


let link=document.createElement("a");

link.href =
URL.createObjectURL(output);

link.download =
currentZipName.replace(".zip","_corregido.mcpack");

link.click();


});

}