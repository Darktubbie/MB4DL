// maker.js
// Skinpack Maker: permite crear un skinpack normal de Minecraft Bedrock
// desde cero. Importa skins (PNG local, o por nombre de usuario de Java
// / Bedrock), detecta automáticamente el modelo (wide/slim) y deja
// corregirlo a mano, configura nombre, descripción e ícono del pack (con
// selector de colores y formato de Bedrock), y genera un .mcpack
// descargable con un UUID nuevo en cada generación.
//
// Importación por usuario: usa varios servicios públicos con CORS
// habilitado (no hay backend propio). Para Java se prueban en orden
// minotar.net, mc-heads.net y mineskin.eu -todos aceptan el nombre de
// usuario directamente, sin resolver un UUID antes-. Para Bedrock se usa
// la API pública de GeyserMC (nombre de usuario/gamertag -> XUID de Xbox
// -> id de textura), y la textura final se descarga a través de wsrv.nl
// (un proxy de imágenes con CORS habilitado) porque textures.minecraft.net
// no envía cabeceras CORS. Nota: la búsqueda por Bedrock solo encuentra
// resultado si esa cuenta ya se conectó antes a algún servidor con
// Geyser, ya que así es como funciona la API de GeyserMC.
//
// Nota de orden de carga: este script se ejecuta ANTES que app.js, así
// que nunca debe llamar a t()/mcFormatToHtml()/escapeHtml() (definidas en
// app.js) desde código de nivel superior — solo dentro de callbacks que
// se disparan por interacción del usuario o desde applyLanguage(), que
// siempre corren después de que app.js ya definió esas funciones.

// ---------- Estado ----------
let makerSkins = [];       // { id, name, model: "wide"|"slim", dataUrl }
let makerPackIcon = null;  // { dataUrl } | null
let makerNextId = 1;
let makerPlatform = "java"; // "java" | "bedrock", para la importación por usuario
let makerActiveField = null; // <input> de nombre/descripción con foco más reciente

// ---------- Utilidades ----------

// Un skin de Minecraft válido es cuadrado (64x64, 128x128, ...) o tiene
// la proporción 2:1 del formato antiguo (64x32, 128x64, ...), siempre
// con el ancho como múltiplo de 64.
function makerValidDimensions(width, height) {
  if (!width || !height || width < 64 || width % 64 !== 0) return false;
  return height === width || width === height * 2;
}

// Detecta si una textura ya dibujada en un canvas usa el modelo "slim"
// (Alex, brazos de 3px) en vez de "wide" (Steve, brazos de 4px).
//
// Técnica estándar usada por launchers/editores de skins: en el layout
// 64x64, la manga derecha (capa 2) reserva una franja de 1px que solo se
// usa en el modelo wide; en las skins slim esa franja queda totalmente
// transparente. Si esos píxeles son 100% transparentes, es slim.
// El formato antiguo 64x32 nunca tiene modelo slim.
function makerDetectSlim(ctx, width, height) {
  if (height < 64) return false;

  try {
    const scale = width / 64;
    const x = Math.round(54 * scale);
    const y = Math.round(20 * scale);
    const w = Math.max(1, Math.round(scale));
    const h = Math.max(1, Math.round(12 * scale));

    const data = ctx.getImageData(x, y, w, h).data;

    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

// Convierte una imagen local (blob:) en un PNG "limpio" dibujándola en un
// canvas. Esto normaliza el formato de salida (siempre PNG real) y sirve
// como validación: si la imagen no es decodificable, el navegador dispara
// onerror. De paso calcula el modelo probable (wide/slim).
function makerImageToPng(sourceUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        if (!canvas.width || !canvas.height) {
          reject(new Error("empty_image"));
          return;
        }

        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0);

        resolve({
          dataUrl: canvas.toDataURL("image/png"),
          width: canvas.width,
          height: canvas.height,
          isSlimGuess: makerDetectSlim(ctx, canvas.width, canvas.height)
        });
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = () => reject(new Error("image_decode_error"));
    img.src = sourceUrl;
  });
}

function makerFileToPng(file) {
  const objectUrl = URL.createObjectURL(file);
  return makerImageToPng(objectUrl).finally(() => URL.revokeObjectURL(objectUrl));
}

function makerBlobToPng(blob) {
  const objectUrl = URL.createObjectURL(blob);
  return makerImageToPng(objectUrl).finally(() => URL.revokeObjectURL(objectUrl));
}

function makerDataUrlToBytes(dataUrl) {
  const base64 = dataUrl.substring(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Genera un UUID v4 nuevo y aleatorio. Se usa una función (no un valor
// fijo) a propósito: cada paquete generado, incluso con el mismo nombre,
// debe recibir identificadores distintos.
function makerGenerateUUID() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  // Respaldo para navegadores sin crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Permite escribir códigos de formato de Bedrock de dos formas: pegando
// el carácter § directamente (p. ej. "§c"), o escribiendo el atajo con
// ampersand ("&c"), más fácil de teclear. Ambas terminan guardadas como
// § real en el paquete final.
function makerNormalizeFormatting(str) {
  if (!str) return "";
  // Códigos válidos de Bedrock: 0-9 y a-u sin huecos (colores 0-9/a-j/m/n/
  // p/q/s/t/u + formato k/l/o/r), igual que MC_COLORS + mcFormatToHtml en
  // app.js.
  return str.replace(/&([0-9a-u])/gi, (m, c) => "§" + c.toLowerCase());
}

// Convierte un nombre libre en un identificador seguro (solo minúsculas,
// números y guiones bajos) para usarlo como localization_name / prefijo
// de claves en los .lang.
function makerSanitizeId(str, fallback) {
  const noFormatting = String(str || "").replace(/§./g, "").replace(/&[0-9a-u]/gi, "");
  let cleaned;
  try {
    cleaned = noFormatting.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  } catch (e) {
    cleaned = noFormatting;
  }
  cleaned = cleaned.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || fallback;
}

function makerSetStatus(message, type) {
  const el = document.getElementById("makerImportStatus");
  if (!el) return;
  el.textContent = message || "";
  el.className = "maker-status" + (type ? " " + type : "");
}

// ---------- Lista de skins ----------

function makerAddSkin(dataUrl, suggestedName, modelGuess) {
  const name = (suggestedName && suggestedName.trim())
    ? suggestedName.trim()
    : `${t("maker.defaultSkinName")} ${makerSkins.length + 1}`;

  makerSkins.push({
    id: makerNextId++,
    name,
    model: modelGuess === "slim" ? "slim" : "wide",
    dataUrl
  });

  renderMakerSkinsList();
  makerSetStatus(t("maker.importOk").replace("{name}", name), "success");
}

function renderMakerSkinsList() {
  const list = document.getElementById("makerSkinsList");
  if (!list) return;

  if (!makerSkins.length) {
    list.innerHTML = `<p class="maker-empty">${t("maker.noSkinsYet")}</p>`;
    return;
  }

  list.innerHTML = makerSkins.map(skin => `
    <div class="maker-skin-item" data-id="${skin.id}">
      <img src="${skin.dataUrl}" alt="">
      <input
        type="text"
        class="maker-skin-name maker-skin-name-input"
        data-id="${skin.id}"
        data-role="maker-skin-name"
        value="${escapeHtml(skin.name)}"
        aria-label="${escapeHtml(t("maker.skinName"))}"
      >
      <select class="maker-skin-model-select" data-id="${skin.id}" data-role="maker-skin-model" aria-label="${escapeHtml(t("maker.skinModel"))}">
        <option value="wide" ${skin.model === "wide" ? "selected" : ""}>${t("viewer.modelSteve")}</option>
        <option value="slim" ${skin.model === "slim" ? "selected" : ""}>${t("viewer.modelAlex")}</option>
      </select>
      <button type="button" class="maker-skin-remove" data-id="${skin.id}" data-role="maker-skin-remove">${t("maker.remove")}</button>
    </div>
  `).join("");
}

// Delegación de eventos: funciona sin importar cuántas veces se
// re-renderice la lista (no hace falta re-adjuntar listeners).
const makerSkinsListEl = document.getElementById("makerSkinsList");

if (makerSkinsListEl) {

  makerSkinsListEl.addEventListener("input", (e) => {
    const target = e.target.closest('[data-role="maker-skin-name"]');
    if (!target) return;
    const id = Number(target.getAttribute("data-id"));
    const skin = makerSkins.find(s => s.id === id);
    if (skin) skin.name = target.value;
  });

  makerSkinsListEl.addEventListener("change", (e) => {
    const target = e.target.closest('[data-role="maker-skin-model"]');
    if (!target) return;
    const id = Number(target.getAttribute("data-id"));
    const skin = makerSkins.find(s => s.id === id);
    if (skin) skin.model = target.value === "slim" ? "slim" : "wide";
  });

  makerSkinsListEl.addEventListener("click", (e) => {
    const target = e.target.closest('[data-role="maker-skin-remove"]');
    if (!target) return;
    const id = Number(target.getAttribute("data-id"));
    makerSkins = makerSkins.filter(s => s.id !== id);
    renderMakerSkinsList();
  });

}

// ---------- Importar: Subir PNG ----------

const makerFileInput = document.getElementById("makerFileInput");

if (makerFileInput) {
  makerFileInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // permite volver a elegir el mismo archivo después

    if (!files.length) return;

    makerSetStatus(t("maker.importing"));

    for (const file of files) {
      try {
        const png = await makerFileToPng(file);

        if (!makerValidDimensions(png.width, png.height)) {
          makerSetStatus(t("maker.invalidDimensions"), "error");
          continue;
        }

        const suggestedName = file.name.replace(/\.[^.]+$/, "");
        makerAddSkin(png.dataUrl, suggestedName, png.isSlimGuess ? "slim" : "wide");
      } catch (err) {
        console.error(err);
        makerSetStatus(t("maker.importFailGeneric"), "error");
      }
    }
  });
}

// ---------- Importar: por nombre de usuario (Java / Bedrock) ----------

// Todos aceptan el nombre de usuario directamente (sin resolver un UUID
// antes) y tienen CORS habilitado.
const MAKER_JAVA_SKIN_SOURCES = [
  { name: "minotar.net", url: (u) => `https://minotar.net/skin/${u}` },
  { name: "mc-heads.net", url: (u) => `https://mc-heads.net/skin/${u}` },
  { name: "mineskin.eu", url: (u) => `https://mineskin.eu/skin/${u}` }
];

async function makerFetchJavaSkin(username) {
  const encoded = encodeURIComponent(username.trim());

  for (const source of MAKER_JAVA_SKIN_SOURCES) {
    try {
      const res = await fetch(source.url(encoded), { mode: "cors" });
      if (!res.ok) continue;

      const blob = await res.blob();
      if (blob.size < 100) continue; // respuesta vacía / placeholder de error

      const png = await makerBlobToPng(blob);
      if (!makerValidDimensions(png.width, png.height)) continue;

      return png;
    } catch (e) {
      // intentar la siguiente fuente
    }
  }

  return null;
}

// GeyserMC expone una API pública para convertir un gamertag de
// Bedrock/Xbox a su XUID, y de ahí a la última skin que subió a un
// servidor con Geyser. La textura final se baja a través de wsrv.nl
// (proxy de imágenes con CORS) porque textures.minecraft.net no envía
// cabeceras CORS.
async function makerFetchBedrockSkin(gamertag) {
  try {
    const xuidRes = await fetch(
      `https://api.geysermc.org/v2/xbox/xuid/${encodeURIComponent(gamertag.trim())}`,
      { mode: "cors" }
    );
    if (!xuidRes.ok) return null;

    const xuidJson = await xuidRes.json();
    if (!xuidJson || !xuidJson.xuid) return null;

    const skinRes = await fetch(`https://api.geysermc.org/v2/skin/${xuidJson.xuid}`, { mode: "cors" });
    if (!skinRes.ok) return null;

    const skinJson = await skinRes.json();
    if (!skinJson || !skinJson.texture_id) return null;

    const textureUrl =
      `https://wsrv.nl/?url=${encodeURIComponent(`textures.minecraft.net/texture/${skinJson.texture_id}`)}&output=png`;

    const texRes = await fetch(textureUrl, { mode: "cors" });
    if (!texRes.ok) return null;

    const blob = await texRes.blob();
    const png = await makerBlobToPng(blob);
    if (!makerValidDimensions(png.width, png.height)) return null;

    return png;
  } catch (e) {
    return null;
  }
}

const makerUsernameInput = document.getElementById("makerUsernameInput");
const makerUsernameBtn = document.getElementById("makerUsernameBtn");
const makerUsernameHint = document.getElementById("makerUsernameHint");

document.querySelectorAll(".maker-platform-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    makerPlatform = btn.getAttribute("data-platform") === "bedrock" ? "bedrock" : "java";

    document.querySelectorAll(".maker-platform-btn").forEach(b => {
      b.classList.toggle("active", b === btn);
    });

    if (makerUsernameHint) {
      makerUsernameHint.textContent = t(
        makerPlatform === "bedrock" ? "maker.usernameHintBedrock" : "maker.usernameHintJava"
      );
    }
  });
});

async function makerImportFromUsername() {
  const username = (makerUsernameInput.value || "").trim();

  if (!username) {
    makerSetStatus(t("maker.needUsername"), "error");
    return;
  }

  makerSetStatus(t("maker.importing"));

  const png = makerPlatform === "bedrock"
    ? await makerFetchBedrockSkin(username)
    : await makerFetchJavaSkin(username);

  if (!png) {
    makerSetStatus(
      t(makerPlatform === "bedrock" ? "maker.importFailUsernameBedrock" : "maker.importFailUsernameJava"),
      "error"
    );
    return;
  }

  makerAddSkin(png.dataUrl, username, png.isSlimGuess ? "slim" : "wide");
  makerUsernameInput.value = "";
}

if (makerUsernameBtn) {
  makerUsernameBtn.addEventListener("click", makerImportFromUsername);
}

if (makerUsernameInput) {
  makerUsernameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      makerImportFromUsername();
    }
  });
}

// ---------- Configuración del pack: nombre, descripción, ícono ----------

const makerPackName = document.getElementById("makerPackName");
const makerPackDescription = document.getElementById("makerPackDescription");
const makerNamePreview = document.getElementById("makerNamePreview");
const makerIconInput = document.getElementById("makerIconInput");
const makerIconPreview = document.getElementById("makerIconPreview");

function updateMakerPreview() {
  if (!makerNamePreview) return;

  const rawName = makerPackName ? makerNormalizeFormatting(makerPackName.value) : "";
  const rawDesc = makerPackDescription ? makerNormalizeFormatting(makerPackDescription.value) : "";

  const nameHtml = rawName ? mcFormatToHtml(rawName) : escapeHtml(t("maker.packNamePlaceholder"));
  const descHtml = rawDesc ? mcFormatToHtml(rawDesc) : "";

  makerNamePreview.innerHTML = `
    <div class="pack-info-name">${nameHtml}</div>
    ${descHtml ? `<div class="pack-info-description">${descHtml}</div>` : ""}
  `;
}

if (makerPackName) makerPackName.addEventListener("input", updateMakerPreview);
if (makerPackDescription) makerPackDescription.addEventListener("input", updateMakerPreview);

// ---------- Selector de colores y formato ----------
// Insertan el código § correspondiente en el campo (nombre o
// descripción) que tuvo el foco más recientemente, en la posición del
// cursor -igual que si el usuario lo hubiera tecleado a mano-. Así los
// códigos de Bedrock quedan accesibles con un toque, sin tener que
// escribir el símbolo § (difícil en la mayoría de los teclados) ni
// memorizar el atajo &.
[makerPackName, makerPackDescription].forEach(field => {
  if (!field) return;
  field.addEventListener("focus", () => { makerActiveField = field; });
});

// Nombres de los 16 colores estándar + 11 colores de material exclusivos
// de Bedrock, en el mismo orden/valores que MC_COLORS (app.js) para que
// la vista previa coincida exactamente con el swatch elegido.
const MAKER_COLOR_CODES = [
  ["0", "#000000", "colorBlack"], ["1", "#0000AA", "colorDarkBlue"],
  ["2", "#00AA00", "colorDarkGreen"], ["3", "#00AAAA", "colorDarkAqua"],
  ["4", "#AA0000", "colorDarkRed"], ["5", "#AA00AA", "colorDarkPurple"],
  ["6", "#FFAA00", "colorGold"], ["7", "#AAAAAA", "colorGray"],
  ["8", "#555555", "colorDarkGray"], ["9", "#5555FF", "colorBlue"],
  ["a", "#55FF55", "colorGreen"], ["b", "#55FFFF", "colorAqua"],
  ["c", "#FF5555", "colorRed"], ["d", "#FF55FF", "colorLightPurple"],
  ["e", "#FFFF55", "colorYellow"], ["f", "#FFFFFF", "colorWhite"],
  ["g", "#DDD605", "colorMinecoinGold"], ["h", "#E3D4D1", "colorQuartz"],
  ["i", "#CECACA", "colorIron"], ["j", "#443A3B", "colorNetherite"],
  ["m", "#971607", "colorRedstone"], ["n", "#B4684D", "colorCopper"],
  ["p", "#DEB12D", "colorGoldMaterial"], ["q", "#47A036", "colorEmerald"],
  ["s", "#2CBAA8", "colorDiamond"], ["t", "#21497B", "colorLapis"],
  ["u", "#9A5CC6", "colorAmethyst"]
];

// Solo los códigos que son de verdad funciones de FORMATO en Bedrock
// (§n y §m, a diferencia de Java, son colores de material acá, no
// subrayado/tachado -por eso no aparecen como "formato"-).
const MAKER_FORMAT_CODES = [
  ["l", "B", "formatBold"], ["o", "I", "formatItalic"],
  ["k", "?", "formatObfuscated"], ["r", "R", "formatReset"]
];

function makerInsertCode(code) {
  const field = makerActiveField || makerPackName;
  if (!field) return;

  const start = field.selectionStart != null ? field.selectionStart : field.value.length;
  const end = field.selectionEnd != null ? field.selectionEnd : field.value.length;

  field.value = field.value.slice(0, start) + "§" + code + field.value.slice(end);
  field.focus();

  const caret = start + 2;
  field.setSelectionRange(caret, caret);

  updateMakerPreview();
}

function renderMakerCodePickers() {
  const swatchGrid = document.getElementById("makerColorSwatches");
  const formatRow = document.getElementById("makerFormatButtons");

  if (swatchGrid) {
    swatchGrid.innerHTML = MAKER_COLOR_CODES.map(([code, hex, nameKey]) => `
      <button
        type="button"
        class="maker-swatch"
        style="background:${hex}"
        data-code="${code}"
        title="${escapeHtml(t("maker." + nameKey))}"
        aria-label="${escapeHtml(t("maker." + nameKey))}"
      ></button>
    `).join("");
  }

  if (formatRow) {
    formatRow.innerHTML = MAKER_FORMAT_CODES.map(([code, label, nameKey]) => `
      <button
        type="button"
        class="maker-format-btn"
        data-code="${code}"
        title="${escapeHtml(t("maker." + nameKey))}"
        aria-label="${escapeHtml(t("maker." + nameKey))}"
      >${label}</button>
    `).join("");
  }
}

document.addEventListener("click", (e) => {
  const swatch = e.target.closest(".maker-swatch, .maker-format-btn");
  if (!swatch) return;
  makerInsertCode(swatch.getAttribute("data-code"));
});

if (makerIconInput) {
  makerIconInput.addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;

    try {
      const png = await makerFileToPng(file);
      makerPackIcon = { dataUrl: png.dataUrl };

      if (makerIconPreview) {
        makerIconPreview.innerHTML = `<img src="${png.dataUrl}" alt="">`;
      }
    } catch (err) {
      console.error(err);
      makerSetStatus(t("maker.importFailGeneric"), "error");
    }
  });
}

// ---------- Generar y descargar el .mcpack ----------

const makerGenerateBtn = document.getElementById("makerGenerateBtn");

async function makerGeneratePack() {
  if (!makerSkins.length) {
    alert(t("maker.needSkins"));
    return;
  }

  const rawName = makerNormalizeFormatting(makerPackName ? makerPackName.value.trim() : "");

  if (!rawName) {
    alert(t("maker.needName"));
    return;
  }

  const rawDescription = makerNormalizeFormatting(makerPackDescription ? makerPackDescription.value.trim() : "");

  const originalBtnText = makerGenerateBtn.textContent;
  makerGenerateBtn.disabled = true;
  makerGenerateBtn.textContent = t("maker.generating");

  try {
    const zip = new JSZip();

    // UUID nuevos en cada generación: el manifest nunca reutiliza los de
    // un paquete anterior, ni entre header y module.
    const headerUuid = makerGenerateUUID();
    const moduleUuid = makerGenerateUUID();

    const baseId = makerSanitizeId(rawName, "custom_pack");
    const serializeName = `${baseId}_${headerUuid.slice(0, 8)}`;

    // ---- manifest.json ----
    const manifest = {
      format_version: 2,
      header: {
        name: rawName,
        description: rawDescription || t("js.defaultPackDescription"),
        uuid: headerUuid,
        version: [1, 0, 0],
        min_engine_version: [1, 16, 0]
      },
      modules: [
        {
          type: "skin_pack",
          uuid: moduleUuid,
          version: [1, 0, 0]
        }
      ]
    };

    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    // ---- skins.json + texturas ----
    // Las texturas van en la raíz del paquete (junto a manifest.json y
    // skins.json), igual que en los skinpacks reales: no en una
    // subcarpeta "skins/".
    const skinsJson = {
      serialize_name: serializeName,
      localization_name: serializeName,
      skins: []
    };

    const enUsLines = [`skinpack.${serializeName}=${rawName}`];
    const esEsLines = [`skinpack.${serializeName}=${rawName}`];

    makerSkins.forEach((skin, i) => {
      const skinId = `skin_${i + 1}`;
      const fileName = `${skinId}.png`;
      const displayName = makerNormalizeFormatting(skin.name.trim()) || `${t("maker.defaultSkinName")} ${i + 1}`;

      skinsJson.skins.push({
        localization_name: skinId,
        geometry: skin.model === "slim" ? "geometry.humanoid.customSlim" : "geometry.humanoid.custom",
        texture: fileName,
        type: "free"
      });

      zip.file(fileName, makerDataUrlToBytes(skin.dataUrl));

      const key = `skin.${serializeName}.${skinId}`;
      enUsLines.push(`${key}=${displayName}`);
      esEsLines.push(`${key}=${displayName}`);
    });

    zip.file("skins.json", JSON.stringify(skinsJson, null, 2));

    // ---- textos / idiomas ----
    zip.file("texts/en_US.lang", enUsLines.join("\n"));
    zip.file("texts/es_ES.lang", esEsLines.join("\n"));
    zip.file("texts/languages.json", JSON.stringify(["en_US", "es_ES"], null, 2));

    // ---- ícono del pack (opcional) ----
    if (makerPackIcon) {
      zip.file("pack_icon.png", makerDataUrlToBytes(makerPackIcon.dataUrl));
    }

    // streamFiles:false evita el uso de "data descriptors" (tamaños
    // escritos después de los datos en vez de en la cabecera local);
    // algunos antivirus/heurísticas de Windows son más desconfiados con
    // zips que usan ese modo de streaming, y aquí no hace ninguna falta
    // porque ya tenemos todos los bytes en memoria de antemano.
    const output = await zip.generateAsync({
      type: "blob",
      platform: "DOS",
      streamFiles: false,
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });

    const downloadName = `${baseId || "skinpack"}.mcpack`;
    const blobUrl = URL.createObjectURL(output);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = downloadName;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);

  } catch (err) {
    console.error(err);
    alert(t("maker.generateError"));
  } finally {
    makerGenerateBtn.disabled = false;
    makerGenerateBtn.textContent = originalBtnText;
  }
}

if (makerGenerateBtn) {
  makerGenerateBtn.addEventListener("click", makerGeneratePack);
}

// ---------- Refresco de idioma ----------
// app.js llama a esta función (si existe) cada vez que se cambia de
// idioma, para que la lista de skins ya renderizada y la vista previa del
// nombre/descripción queden también traducidas, ya que se generaron
// dinámicamente y data-i18n no las cubre.
function refreshMakerLanguage() {
  renderMakerSkinsList();
  updateMakerPreview();
  renderMakerCodePickers();

  const hintEl = document.getElementById("makerUsernameHint");
  if (hintEl) {
    hintEl.textContent = t(makerPlatform === "bedrock" ? "maker.usernameHintBedrock" : "maker.usernameHintJava");
  }
}
