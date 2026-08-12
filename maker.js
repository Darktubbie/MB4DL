// maker.js
// Skinpack Maker: permite crear un skinpack normal de Minecraft Bedrock
// desde cero. Importa skins (PNG local), deja elegir nombre/modelo (wide
// o slim) por skin, configura nombre, descripción e ícono del pack (con
// códigos de formato de Bedrock), y genera un .mcpack descargable con un
// UUID nuevo en cada generación.
//
// La importación por URL y por usuario de Java Edition se quitó: ambas
// dependían de que servidores de terceros (hosts de imágenes, Crafatar)
// enviaran cabeceras CORS, algo fuera de nuestro control y que en la
// práctica falla seguido. Importar el PNG directamente es 100% confiable.
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

// ---------- Utilidades ----------

// Convierte una imagen local (blob:) en un PNG "limpio" dibujándola en un
// canvas. Esto normaliza el formato de salida (siempre PNG real) y sirve
// como validación: si la imagen no es decodificable, el navegador dispara
// onerror.
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
          height: canvas.height
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

function makerAddSkin(dataUrl, suggestedName) {
  const name = (suggestedName && suggestedName.trim())
    ? suggestedName.trim()
    : `${t("maker.defaultSkinName")} ${makerSkins.length + 1}`;

  makerSkins.push({
    id: makerNextId++,
    name,
    model: "wide",
    dataUrl
  });

  renderMakerSkinsList();
  makerSetStatus(t("maker.importOk")(name), "success");
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
        const suggestedName = file.name.replace(/\.[^.]+$/, "");
        makerAddSkin(png.dataUrl, suggestedName);
      } catch (err) {
        console.error(err);
        makerSetStatus(t("maker.importFailGeneric"), "error");
      }
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
}
