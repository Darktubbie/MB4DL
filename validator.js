// validator.js
// Analizador principal para skinpacks 4D de Minecraft Bedrock

async function validateSkinPack(zip, zipName, options = {}) {

  // Si es true, cuando el nombre base de un modelo (p. ej. "NombreDelModelo"
  // en "geometry.NombreDelModelo") coincide con MÁS DE UNA geometría distinta
  // dentro de geometry.json (p. ej. "geometry.NombreDelModelo" y
  // "geometry.custom.NombreDelModelo" al mismo tiempo), el validador
  // resolverá la ambigüedad automáticamente en lugar de detenerse a reportar
  // el conflicto. Por defecto está desactivado para no enmascarar errores.
  const resolveAmbiguousGeometry = !!options.resolveAmbiguousGeometry;
  const report = {
    results: [],
    stats: {
      skins: 0,
      errors: 0,
      warnings: 0,
      success: 0
    },
    checkAnimations: false,
    skinDetails: [],
    packInfo: null
  };

  function push(type, title, message) {
    report.results.push({ type, title, message });

    if (type === "error") report.stats.errors++;
    if (type === "warning") report.stats.warnings++;
    if (type === "success") report.stats.success++;
  }

  // ----------------------------
  // Obtener todos los archivos
  // ----------------------------
  const fileList = Object.keys(zip.files).filter(f => !zip.files[f].dir);

  push(
    "success",
    "Paquete cargado",
    `Se detectaron ${fileList.length} archivos en ${zipName}.`
  );

  // ----------------------------
  // Buscar archivos importantes
  // ----------------------------
  const manifestPath = fileList.find(f => /(^|\/)manifest\.json$/i.test(f));
  const skinsPath = fileList.find(f => /(^|\/)skins\.json$/i.test(f));
  const skinpacksPath = fileList.find(f => /(^|\/)skinpacks\.json$/i.test(f));

  const geometryPath = fileList.find(f => /(^|\/)geometry\.json$/i.test(f));

  const langPaths = fileList.filter(f =>
    /texts\/.*\.lang$/i.test(f)
  );

  const pngFiles = fileList.filter(f =>
    /\.png$/i.test(f)
  );

  // ----------------------------
  // Verificar existencia
  // ----------------------------
  if (manifestPath)
    push("success", "manifest.json", "Archivo encontrado.");
  else
    push("warning", "manifest.json", "No se encontró manifest.json.");

  // ----------------------------
  // Información del paquete (nombre, descripción, icono)
  // ----------------------------
  {
    let packName = null;
    let packDescription = null;

    if (manifestPath) {
      try {
        const manifestJson = JSON.parse(await zip.file(manifestPath).async("string"));

        if (manifestJson?.header?.name && String(manifestJson.header.name).trim()) {
          packName = String(manifestJson.header.name);
        }

        if (manifestJson?.header?.description && String(manifestJson.header.description).trim()) {
          packDescription = String(manifestJson.header.description);
        }

      } catch (e) {
        push(
          "warning",
          "manifest.json",
          `No se pudo leer el nombre/descripción del paquete: ${e.message}`
        );
      }
    }

    const iconPath = fileList.find(f => /(^|\/)pack_icon\.png$/i.test(f));
    let iconDataUrl = null;

    if (iconPath) {
      try {
        const base64 = await zip.file(iconPath).async("base64");
        iconDataUrl = `data:image/png;base64,${base64}`;
      } catch (e) {
        iconDataUrl = null;
      }
    }

    report.packInfo = {
      name: packName || zipName.replace(/\.(zip|mcpack)$/i, ""),
      description: packDescription || "Paquete de skins 4D",
      iconDataUrl
    };
  }

  if (!skinsPath) {
    push(
      "error",
      "skins.json",
      "No se encontró skins.json. El skinpack no puede analizarse correctamente."
    );
    return report;
  }

  if (!geometryPath) {
    push(
      "error",
      "Geometry",
      "No se encontró el archivo geometry.json."
    );
    return report;
  }

  push(
    "success",
    "Geometrías",
    "Se encontró el archivo geometry.json."
  );

  // ----------------------------
  // Leer JSON
  // ----------------------------
  let skinsJson = null;

  try {
    skinsJson = JSON.parse(await zip.file(skinsPath).async("string"));
    push("success", "skins.json", "JSON válido.");
  } catch (e) {
    push(
      "error",
      "skins.json",
      "El archivo contiene un JSON inválido."
    );
    return report;
  }

  // ----------------------------
  // Leer geometría (geometry.json)
  // ----------------------------
  const geometryIdentifiers = new Set();
  const geometryIdentifiersLower = new Map(); // lower-case id -> id original
  const geometryModelNames = new Map();        // nombre de modelo completo (tras "geometry.") -> id original

  // nombre BASE del modelo (último segmento tras el último punto de lo que
  // sigue a "geometry.") -> lista de ids originales que comparten ese nombre.
  // Esto permite que "geometry.custom.NombreDelModelo" se reconozca como
  // una variación de "geometry.NombreDelModelo" (y viceversa), ya que ambos
  // comparten el nombre base "NombreDelModelo".
  const geometryBaseNames = new Map();

  function getGeometryBaseName(id) {
    const m = id.match(/^geometry\.(.+)$/i);
    if (!m) return null;
    const parts = m[1].split(".");
    return parts[parts.length - 1].toLowerCase();
  }

  function addGeometryIdentifier(id) {
    if (!id || geometryIdentifiers.has(id)) return;

    geometryIdentifiers.add(id);
    geometryIdentifiersLower.set(id.toLowerCase(), id);

    const modelMatch = id.match(/^geometry\.(.+)$/i);
    if (modelMatch) {
      geometryModelNames.set(modelMatch[1].toLowerCase(), id);
    }

    const baseName = getGeometryBaseName(id);
    if (baseName) {
      if (!geometryBaseNames.has(baseName)) geometryBaseNames.set(baseName, []);
      geometryBaseNames.get(baseName).push(id);
    }
  }

  try {
    const geometryText = await zip.file(geometryPath).async("string");
    let geo = null;
    let geometryParseError = null;

    try {
      geo = JSON.parse(geometryText);
    } catch (e) {
      geometryParseError = e;
    }

    let usingFallbackOnly = false;

    if (geometryParseError) {

      push(
        "error",
        "Geometry",
        `${geometryPath} contiene un error de sintaxis JSON: ${geometryParseError.message}`
      );

      let continueAnyway = false;

      if (typeof confirm === "function") {
        continueAnyway = confirm(
          `geometry.json tiene un error de sintaxis (${geometryParseError.message}).\n\n` +
          `¿Deseas continuar el análisis de todas formas usando una búsqueda de respaldo ` +
          `basada en texto (menos precisa, ya que el archivo no es JSON válido)?`
        );
      }

      if (!continueAnyway) {

        push(
          "error",
          "Geometry",
          `Análisis detenido: no fue posible interpretar ${geometryPath} (${geometryParseError.message}). ` +
          `Revisa comas sobrantes u otros errores de sintaxis (por ejemplo "geometry.null": {},) y vuelve a intentarlo.`
        );

        return report;
      }

      usingFallbackOnly = true;

      push(
        "warning",
        "Geometry",
        "Continuando con una búsqueda de respaldo basada en texto. Los resultados de geometría pueden ser menos precisos."
      );

    }

    if (!usingFallbackOnly && geo) {

      // Formato nuevo (1.12.0+): array "minecraft:geometry"
      const arr = geo["minecraft:geometry"] || [];
      arr.forEach(g => addGeometryIdentifier(g?.description?.identifier));

      // Formato antiguo: la geometría es una clave de nivel superior,
      // p. ej. { "geometry.egg": { ... } }
      Object.keys(geo).forEach(k => {
        if (/^geometry\./i.test(k)) addGeometryIdentifier(k);
      });

    }

    // Búsqueda profunda de respaldo: cualquier "geometry.Modelo" presente
    // en cualquier parte del archivo. Se ejecuta siempre: si el JSON es
    // válido sirve para detectar identificadores en estructuras inusuales;
    // si el JSON es inválido y se decidió continuar, es la única fuente
    // de datos disponible.
    const deepMatches = geometryText.match(/"geometry\.[A-Za-z0-9_.\-]+"/gi) || [];
    deepMatches.forEach(m => addGeometryIdentifier(m.slice(1, -1)));

    if (!geometryParseError) {
      push(
        "success",
        "Geometry",
        `${geometryPath} leído correctamente (${geometryIdentifiers.size} geometría(s) encontrada(s)).`
      );
    }

    // ----------------------------
    // Detección de "geometry.null" (entrada de relleno típica de
    // paquetes 4D). Cuando aparece, se activa además la validación
    // de animaciones dentro de skins.json.
    // ----------------------------
    const hasGeometryNull =
      geometryIdentifiers.has("geometry.null") ||
      /"geometry\.null"\s*:\s*\{\s*\}\s*,?/i.test(geometryText);

    if (hasGeometryNull) {
      report.checkAnimations = true;

      push(
        "warning",
        "Geometry",
        `Se detectó la entrada de relleno "geometry.null" en ${geometryPath}. Se activará la validación adicional de animaciones en skins.json.`
      );
    }

  } catch (e) {
    push(
      "error",
      "Geometry",
      `${geometryPath} no pudo leerse: ${e.message}`
    );
  }

  // ----------------------------
  // Leer archivos LANG
  // ----------------------------
  const enUsPath = langPaths.find(f => /(^|\/)en_US\.lang$/i.test(f));

  let langEntries = new Map();   // claves combinadas de todos los .lang -> valor (uso informativo)
  let enUsEntries = new Map();   // claves solo de en_US.lang -> valor (idioma obligatorio en Bedrock)

  for (const path of langPaths) {
    const text = await zip.file(path).async("string");
    const entries = new Map();

    text.split(/\r?\n/).forEach(line => {
      line = line.trim();

      if (!line || line.startsWith("#")) return;

      const eq = line.indexOf("=");

      if (eq > 0) {
        const k = line.substring(0, eq).trim();
        const v = line.substring(eq + 1).trim();
        entries.set(k, v);
      }
    });

    entries.forEach((v, k) => langEntries.set(k, v));

    if (path === enUsPath) enUsEntries = entries;
  }

  if (langPaths.length)
    push("success", "texts", `Se detectaron ${langPaths.length} archivo(s) .lang.`);
  else
    push("warning", "texts", "No se encontró ningún archivo texts/*.lang.");

  if (langPaths.length) {
    if (enUsPath)
      push("success", "en_US.lang", "Archivo encontrado.");
    else
      push(
        "warning",
        "en_US.lang",
        "No se encontró en_US.lang. Minecraft Bedrock requiere este archivo como idioma principal (fallback) del paquete."
      );
  }

  // ----------------------------
  // Validar skins
  // ----------------------------
// ----------------------------
// Geometrías oficiales de Minecraft Bedrock
// (válidas aunque no existan dentro del ZIP)
// ----------------------------
const builtinGeometries = new Set([
  "geometry.humanoid.custom",      // Steve
  "geometry.humanoid.customSlim",  // Alex
  "geometry.humanoid",
  "geometry.humanoid.slim"
]);
  
const skins = skinsJson.skins || [];

  // localization_name del PAQUETE (top-level, junto a "serialize_name",
  // no pertenece a ninguna skin). En_US.lang usa este valor como
  // prefijo de cada clave: skin.<packLocalizationName>.<skinLocalizationName>
  const packLocalizationName =
    (typeof skinsJson.localization_name === "string" && skinsJson.localization_name.trim())
      ? skinsJson.localization_name.trim()
      : null;

  if (packLocalizationName) {
    push(
      "success",
      "localization_name (paquete)",
      `Se detectó el identificador de paquete "${packLocalizationName}", usado como prefijo en en_US.lang.`
    );
  } else {
    push(
      "warning",
      "localization_name (paquete)",
      "No se encontró un \"localization_name\" a nivel de paquete en skins.json. Las claves de en_US.lang podrían no coincidir con el formato esperado (skin.<paquete>.<skin>)."
    );
  }

  report.stats.skins = skins.length;

  const usedTextures = new Set();
  const usedNames = new Set();
  const usedGeometries = new Set();

  for (const skin of skins) {

    const name = skin.localization_name || "(sin localization_name)";

    const errorsBefore = report.stats.errors;
    const warningsBefore = report.stats.warnings;

    // localization_name duplicado
    if (usedNames.has(name)) {
      push(
        "warning",
        name,
        "localization_name duplicado."
      );
    }

    usedNames.add(name);

    // geometry
    if (!skin.geometry) {

      push(
        "error",
        name,
        "La skin no tiene geometry asignada."
      );

    } else {

  const geoLower = skin.geometry.toLowerCase();
  const exactMatch = geometryIdentifiers.has(skin.geometry) || builtinGeometries.has(skin.geometry);
  const matchedId = geometryIdentifiersLower.get(geoLower);
  const builtinLower = [...builtinGeometries].find(b => b.toLowerCase() === geoLower);
  const caseInsensitiveMatch = matchedId || builtinLower;

  if (!exactMatch && !caseInsensitiveMatch) {

      // ----------------------------------------------------------
      // Paso adicional: coincidencia por NOMBRE BASE del modelo.
      // Trata "geometry.custom.NombreDelModelo" como si fuera
      // "geometry.NombreDelModelo" (y viceversa), comparando solo el
      // último segmento del identificador.
      // ----------------------------------------------------------
      const skinBaseName = getGeometryBaseName(skin.geometry);
      const baseCandidates = skinBaseName ? (geometryBaseNames.get(skinBaseName) || []) : [];

      if (baseCandidates.length === 1) {

        // Coincidencia única y sin ambigüedad: se puede resolver de forma segura.
        const resolvedId = baseCandidates[0];
        usedGeometries.add(resolvedId);

        push(
          "warning",
          name,
          `La geometría "${skin.geometry}" no coincide exactamente, pero se resolvió por nombre base de modelo con "${resolvedId}".`
        );

      } else if (baseCandidates.length > 1) {

        // Ambigüedad: el mismo nombre base aparece en más de una geometría
        // distinta dentro de geometry.json (p. ej. con y sin namespace).
        // No se resuelve automáticamente para evitar asignar la geometría
        // incorrecta, salvo que el usuario decida continuar de todas formas.
        if (resolveAmbiguousGeometry) {

          const resolvedId = baseCandidates[0];
          usedGeometries.add(resolvedId);

          push(
            "warning",
            name,
            `La geometría "${skin.geometry}" es ambigua: se encontraron ${baseCandidates.length} coincidencias por nombre base (${baseCandidates.join(", ")}). Se continuó de todas formas y se usó "${resolvedId}" por ser la primera encontrada.`
          );

        } else {

          push(
            "error",
            name,
            `La geometría "${skin.geometry}" es ambigua: existen ${baseCandidates.length} geometrías distintas con el mismo nombre base (${baseCandidates.join(", ")}). El validador no puede elegir una automáticamente. Activa la opción "Resolver ambigüedades de geometría automáticamente" y vuelve a analizar si quieres continuar de todas formas; de lo contrario, corrige el "geometry" de la skin para que apunte exactamente a una de las coincidencias listadas.`
          );

        }

      } else {

      push(
        "error",
        name,
        `La geometría "${skin.geometry}" no existe en geometry.json.`
      );

      // Intentar sugerencia: comparar tanto contra el propio texto de
      // "geometry" como contra el localization_name de la skin.
      const geoSuffix = skin.geometry.replace(/^geometry\./i, "").toLowerCase();
      const nameLower = name.toLowerCase();

      const suggestion = [...geometryIdentifiers].find(id => {
        const idLower = id.toLowerCase();
        return idLower.includes(geoSuffix) || idLower.includes(nameLower);
      });

      if (suggestion) {
        push(
          "warning",
          name,
          `Posible coincidencia encontrada: "${suggestion}".`
        );
      }

      }

  } else if (!exactMatch && caseInsensitiveMatch) {

    usedGeometries.add(caseInsensitiveMatch);

    push(
      "warning",
      name,
      `La geometría "${skin.geometry}" existe como "${caseInsensitiveMatch}" pero difiere en mayúsculas/minúsculas.`
    );

  } else if (builtinGeometries.has(skin.geometry)) {
    push(
      "success",
      name,
      `Usa una geometría oficial de Minecraft: ${skin.geometry}.`
    );
  } else {

    usedGeometries.add(skin.geometry);

    push(
      "success",
      name,
      "La geometría existe y coincide."
    );
  }

}

    // texture
    if (!skin.texture) {

      push(
        "error",
        name,
        "La skin no tiene textura asignada."
      );

    } else {

      const tex = pngFiles.find(f =>
        f.split("/").pop().toLowerCase() === skin.texture.toLowerCase()
      );

      if (!tex) {

        push(
          "error",
          name,
          `La textura "${skin.texture}" no existe en el paquete.`
        );

      } else {

        push(
          "success",
          name,
          `Textura encontrada: ${skin.texture}.`
        );

        usedTextures.add(tex);

      }

    }

    // cape (opcional)
    if (skin.cape) {

      const capeTex = pngFiles.find(f =>
        f.split("/").pop().toLowerCase() === skin.cape.toLowerCase()
      );

      if (!capeTex) {

        push(
          "error",
          name,
          `La capa "${skin.cape}" no existe en el paquete.`
        );

      } else {

        push(
          "success",
          name,
          `Capa detectada correctamente: ${skin.cape}.`
        );

        usedTextures.add(capeTex);

      }

    }

    // localization
    // Formato correcto: skin.<localization_name del paquete>.<localization_name de la skin>
    const expectedKey = packLocalizationName
      ? `skin.${packLocalizationName}.${name}`
      : `skin.${name}`;

    let displayName = null;

    if (enUsPath) {

      const matched =
        [...enUsEntries.keys()].find(k => k === expectedKey) ||
        // Respaldo: por si el prefijo de paquete difiere en mayúsculas/minúsculas
        [...enUsEntries.keys()].find(k => k.toLowerCase() === expectedKey.toLowerCase()) ||
        // Respaldo: coincidencia solo por el nombre de la skin al final de la clave
        [...enUsEntries.keys()].find(k => k === `skin.${name}` || k.endsWith(`.${name}`));

      if (!matched) {

        push(
          "warning",
          name,
          `Falta la clave "${expectedKey}" en en_US.lang. Aplica la corrección "Sincronizar localization_name con texts/*.lang" para crearla.`
        );

      } else {

        displayName = enUsEntries.get(matched);

        push(
          "success",
          name,
          `Localization encontrada correctamente en en_US.lang ("${matched}").`
        );

      }

    } else if (langEntries.size > 0) {

      const matched =
        [...langEntries.keys()].find(k => k === expectedKey) ||
        [...langEntries.keys()].find(k => k.toLowerCase() === expectedKey.toLowerCase()) ||
        [...langEntries.keys()].find(k => k === `skin.${name}` || k.endsWith(`.${name}`));

      if (!matched) {

        push(
          "warning",
          name,
          `Falta la clave "${expectedKey}" en texts/*.lang.`
        );

      } else {

        displayName = langEntries.get(matched);

        push(
          "warning",
          name,
          `Clave "${matched}" encontrada en un archivo .lang, pero no en en_US.lang (idioma principal).`
        );

      }

    }

    // ----------------------------
    // Animaciones (validación adicional activada por "geometry.null")
    // ----------------------------
    if (report.checkAnimations && skin.animations && typeof skin.animations === "object") {

      const animEntries = Object.entries(skin.animations);
      const invalid = [];

      animEntries.forEach(([slot, val]) => {
        if (typeof val !== "string" || !/^animation\./i.test(val.trim())) {
          invalid.push(`${slot}: "${val}"`);
        }
      });

      if (invalid.length) {
        push(
          "warning",
          name,
          `Animaciones con valores inválidos: ${invalid.join(", ")}.`
        );
      } else {
        push(
          "success",
          name,
          `Animaciones válidas (${animEntries.length}).`
        );
      }

    }

    // Datos para el apartado de previsualización de skins
    const hasIssue =
      report.stats.errors > errorsBefore ||
      report.stats.warnings > warningsBefore;

    report.skinDetails.push({
      name,
      displayName,
      geometry: skin.geometry || null,
      cape: skin.cape || null,
      animations: skin.animations || null,
      hasIssue
    });

  }

  // ----------------------------
  // Texturas sin usar
  // ----------------------------
  pngFiles.forEach(tex => {
    if (/(^|\/)pack_icon\.png$/i.test(tex)) return; // no es una textura de skin
    if (!usedTextures.has(tex)) {
      push(
        "warning",
        "Textura sin usar",
        `${tex} existe pero no está referenciada por ninguna skin.`
      );
    }
  });

  // ----------------------------
  // Geometrías sin usar
  // ----------------------------
  geometryIdentifiers.forEach(id => {
    if (!usedGeometries.has(id)) {
      push(
        "warning",
        "Geometría sin usar",
        `${id} existe en geometry.json pero no está referenciada por ninguna skin.`
      );
    }
  });

  // ----------------------------
  // skinpacks.json
  // ----------------------------
  if (skinpacksPath) {
    try {

      const sp = JSON.parse(await zip.file(skinpacksPath).async("string"));

      if (Array.isArray(sp.serialize_name) || Array.isArray(sp.skinpacks)) {
        push(
          "success",
          "skinpacks.json",
          "Archivo detectado y leído correctamente."
        );
      } else {
        push(
          "warning",
          "skinpacks.json",
          "El archivo fue leído, pero su estructura parece inusual."
        );
      }

    } catch (e) {
      push(
        "error",
        "skinpacks.json",
        "El archivo contiene un JSON inválido."
      );
    }
  }

  // ----------------------------
  // Resultado final
  // ----------------------------
  if (report.stats.errors === 0) {

    push(
      "success",
      "Resultado final",
      "No se encontraron errores críticos. El skinpack parece estar correctamente configurado."
    );

  } else {

    push(
      "warning",
      "Resultado final",
      `Se detectaron ${report.stats.errors} error(es) y ${report.stats.warnings} advertencia(s).`
    );

  }

  return report;
}