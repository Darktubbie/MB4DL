// validator.js
// Analizador principal para skinpacks 4D de Minecraft Bedrock

// ----------------------------
// Diccionario de mensajes (ES/EN)
// ----------------------------
const VALIDATOR_MESSAGES = {
  es: {
    geometriesTitle: "Geometrías",
    unusedTextureTitle: "Textura sin usar",
    unusedGeometryTitle: "Geometría sin usar",
    finalResultTitle: "Resultado final",
    packLocNameTitle: "localization_name (paquete)",
    geometryNullTitle: "geometry.null",
    noLocalizationName: "(sin localization_name)",
    missingLocalizationName: "Esta skin no tiene \"localization_name\" en skins.json, así que no se le puede generar un nombre para mostrar. Agrégalo manualmente en skins.json: esto no se puede corregir automáticamente, ya que alguien tiene que elegir el nombre.",

    packageLoaded: (c, n) => `Se detectaron ${c} archivos en ${n}.`,
    fileFound: "Archivo encontrado.",
    manifestNotFound: "No se encontró manifest.json.",
    manifestReadError: (m) => `No se pudo leer el nombre/descripción del paquete: ${m}`,
    skinsJsonNotFound: "No se encontró skins.json. El skinpack no puede analizarse correctamente.",
    geometryNotFound: "No se encontró el archivo geometry.json.",
    geometryFileFound: "Se encontró el archivo geometry.json.",
    jsonValid: "JSON válido.",
    jsonInvalid: "El archivo contiene un JSON inválido.",
    geometrySyntaxError: (p, m) => `${p} contiene un error de sintaxis JSON: ${m}`,
    geometryConfirmContinue: (m) =>
      `geometry.json tiene un error de sintaxis (${m}).\n\n¿Deseas continuar el análisis de todas formas usando una búsqueda de respaldo basada en texto (menos precisa, ya que el archivo no es JSON válido)?`,
    geometryStopped: (p, m) =>
      `Análisis detenido: no fue posible interpretar ${p} (${m}). Revisa comas sobrantes u otros errores de sintaxis (por ejemplo "geometry.null": {},) y vuelve a intentarlo.`,
    geometryFallbackContinue: "Continuando con una búsqueda de respaldo basada en texto. Los resultados de geometría pueden ser menos precisos.",
    geometryReadOk: (p, c) => `${p} leído correctamente (${c} geometría(s) encontrada(s)).`,
    geometryNullDetected: (p) =>
      `Se detectó la entrada de relleno "geometry.null" en ${p}. Se activará la validación adicional de animaciones en skins.json.`,
    geometryNullUnused: `"geometry.null" es una entrada de relleno habitual en paquetes 4D y no necesita estar asociada a ninguna skin.`,
    geometryReadFailed: (p, m) => `${p} no pudo leerse: ${m}`,
    langFilesDetected: (c) => `Se detectaron ${c} archivo(s) .lang.`,
    langFilesNotFound: "No se encontró ningún archivo texts/.lang.",
    enUsFound: "Archivo encontrado.",
    enUsNotFound: "No se encontró en_US.lang. Minecraft Bedrock requiere este archivo como idioma principal (fallback) del paquete.",
    packLocNameFound: (n) => `Se detectó el identificador de paquete "${n}", usado como prefijo en en_US.lang.`,
    packLocNameMissing: "No se encontró un \"localization_name\" a nivel de paquete en skins.json. Las claves de en_US.lang podrían no coincidir con el formato esperado (skin.<paquete>.<skin>).",
    dupLocName: "localization_name duplicado.",
    noGeometryAssigned: "La skin no tiene geometry asignada.",
    geometryResolvedByBaseName: (g, id) => `La geometría "${g}" no coincide exactamente, pero se resolvió por nombre base de modelo con "${id}".`,
    geometryResolvedByExtendedName: (g, id) =>
      `La geometría "${g}" no coincide exactamente, pero "${id}" es una versión más larga o más corta del mismo nombre de modelo, así que se usó esa coincidencia (funciona incluso con nombres de más de 3 palabras).`,
    geometryAmbiguousResolved: (g, c, list, id) => `La geometría "${g}" es ambigua: se encontraron ${c} coincidencias por nombre base (${list}). Se continuó de todas formas y se usó "${id}" por ser la primera encontrada.`,
    geometryAmbiguousError: (g, c, list) => `La geometría "${g}" es ambigua: existen ${c} geometrías distintas con el mismo nombre base (${list}). El validador no puede elegir una automáticamente. Activa la opción "Resolver ambigüedades de geometría automáticamente" y vuelve a analizar si quieres continuar de todas formas; de lo contrario, corrige el "geometry" de la skin para que apunte exactamente a una de las coincidencias listadas.`,
    geometryNotFoundForSkin: (g) => `La geometría "${g}" no existe en geometry.json.`,
    geometrySuggestion: (s) => `Posible coincidencia encontrada: "${s}".`,
    geometryCaseMismatch: (g, m) => `La geometría "${g}" existe como "${m}" pero difiere en mayúsculas/minúsculas.`,
    geometryBuiltin: (g) => `Usa una geometría oficial de Minecraft: ${g}.`,
    geometryOk: "La geometría existe y coincide.",
    noTextureAssigned: "La skin no tiene textura asignada.",
    textureNotFound: (t) => `La textura "${t}" no existe en el paquete.`,
    textureFound: (t) => `Textura encontrada: ${t}.`,
    capeNotFound: (c) => `La capa "${c}" no existe en el paquete.`,
    capeFound: (c) => `Capa detectada correctamente: ${c}.`,
    locKeyMissingEnUs: (k) => `Falta la clave "${k}" en en_US.lang. Aplica la corrección "Sincronizar localization_name con texts/.lang" para crearla.`,
    locKeyFoundEnUs: (k) => `Localization encontrada correctamente en en_US.lang ("${k}").`,
    locKeyMissingLang: (k) => `Falta la clave "${k}" en texts/.lang.`,
    locKeyFoundOtherLang: (k) => `Clave "${k}" encontrada en un archivo .lang, pero no en en_US.lang (idioma principal).`,
    animationsInvalid: (list) => `Animaciones con valores inválidos: ${list}.`,
    animationsValid: (c) => `Animaciones válidas (${c}).`,
    unusedTexture: (t) => `${t} existe pero no está referenciada por ninguna skin.`,
    unusedGeometry: (id) => `${id} existe en geometry.json pero no está referenciada por ninguna skin.`,
    skinpacksOk: "Archivo detectado y leído correctamente.",
    skinpacksUnusualStructure: "El archivo fue leído, pero su estructura parece inusual.",
    finalOk: "No se encontraron errores críticos. El skinpack parece estar correctamente configurado.",
    finalIssues: (e, w) => `Se detectaron ${e} error(es) y ${w} advertencia(s).`,
    defaultPackDescription: "Paquete de skins 4D"
  },
  en: {
    geometriesTitle: "Geometries",
    unusedTextureTitle: "Unused texture",
    unusedGeometryTitle: "Unused geometry",
    finalResultTitle: "Final result",
    packLocNameTitle: "localization_name (package)",
    geometryNullTitle: "geometry.null",
    noLocalizationName: "(no localization_name)",
    missingLocalizationName: "This skin has no \"localization_name\" in skins.json, so no display name can be generated for it. Add one manually in skins.json — this can't be fixed automatically, since someone has to choose the name.",

    packageLoaded: (c, n) => `Detected ${c} files in ${n}.`,
    fileFound: "File found.",
    manifestNotFound: "manifest.json was not found.",
    manifestReadError: (m) => `Couldn't read the pack's name/description: ${m}`,
    skinsJsonNotFound: "skins.json was not found. The skinpack can't be analyzed correctly.",
    geometryNotFound: "The geometry.json file was not found.",
    geometryFileFound: "geometry.json was found.",
    jsonValid: "Valid JSON.",
    jsonInvalid: "The file contains invalid JSON.",
    geometrySyntaxError: (p, m) => `${p} has a JSON syntax error: ${m}`,
    geometryConfirmContinue: (m) =>
      `geometry.json has a syntax error (${m}).\n\nDo you want to continue the analysis anyway using a text-based fallback search (less accurate, since the file isn't valid JSON)?`,
    geometryStopped: (p, m) =>
      `Analysis stopped: couldn't parse ${p} (${m}). Check for trailing commas or other syntax errors (e.g. "geometry.null": {},) and try again.`,
    geometryFallbackContinue: "Continuing with a text-based fallback search. Geometry results may be less accurate.",
    geometryReadOk: (p, c) => `${p} read successfully (${c} geometrie(s) found).`,
    geometryNullDetected: (p) =>
      `Detected the placeholder entry "geometry.null" in ${p}. Additional animation validation in skins.json will be enabled.`,
    geometryNullUnused: `"geometry.null" is a common placeholder entry in 4D packs and doesn't need to be linked to any skin.`,
    geometryReadFailed: (p, m) => `${p} couldn't be read: ${m}`,
    langFilesDetected: (c) => `Detected ${c} .lang file(s).`,
    langFilesNotFound: "No texts/.lang file was found.",
    enUsFound: "File found.",
    enUsNotFound: "en_US.lang was not found. Minecraft Bedrock requires this file as the pack's main (fallback) language.",
    packLocNameFound: (n) => `Detected the package identifier "${n}", used as a prefix in en_US.lang.`,
    packLocNameMissing: "No package-level \"localization_name\" was found in skins.json. Keys in en_US.lang might not match the expected format (skin.<package>.<skin>).",
    dupLocName: "Duplicate localization_name.",
    noGeometryAssigned: "The skin has no geometry assigned.",
    geometryResolvedByBaseName: (g, id) => `The geometry "${g}" doesn't match exactly, but it was resolved by the model's base name to "${id}".`,
    geometryResolvedByExtendedName: (g, id) =>
      `The geometry "${g}" doesn't match exactly, but "${id}" is a longer or shorter version of the same model name, so that match was used (works even with model names of more than 3 words).`,
    geometryAmbiguousResolved: (g, c, list, id) => `The geometry "${g}" is ambiguous: ${c} matches were found by base name (${list}). Continued anyway and used "${id}" as it was the first match found.`,
    geometryAmbiguousError: (g, c, list) => `The geometry "${g}" is ambiguous: there are ${c} different geometries with the same base name (${list}). The validator can't pick one automatically. Enable "Automatically resolve geometry ambiguities" and re-analyze if you want to continue anyway; otherwise, fix the skin's "geometry" so it points exactly to one of the listed matches.`,
    geometryNotFoundForSkin: (g) => `The geometry "${g}" doesn't exist in geometry.json.`,
    geometrySuggestion: (s) => `Possible match found: "${s}".`,
    geometryCaseMismatch: (g, m) => `The geometry "${g}" exists as "${m}" but differs in upper/lowercase.`,
    geometryBuiltin: (g) => `Uses an official Minecraft geometry: ${g}.`,
    geometryOk: "The geometry exists and matches.",
    noTextureAssigned: "The skin has no texture assigned.",
    textureNotFound: (t) => `The texture "${t}" doesn't exist in the package.`,
    textureFound: (t) => `Texture found: ${t}.`,
    capeNotFound: (c) => `The cape "${c}" doesn't exist in the package.`,
    capeFound: (c) => `Cape correctly detected: ${c}.`,
    locKeyMissingEnUs: (k) => `The key "${k}" is missing from en_US.lang. Apply the "Sync localization_name with texts/.lang" fix to create it.`,
    locKeyFoundEnUs: (k) => `Localization correctly found in en_US.lang ("${k}").`,
    locKeyMissingLang: (k) => `The key "${k}" is missing from texts/.lang.`,
    locKeyFoundOtherLang: (k) => `Key "${k}" found in a .lang file, but not in en_US.lang (main language).`,
    animationsInvalid: (list) => `Animations with invalid values: ${list}.`,
    animationsValid: (c) => `Valid animations (${c}).`,
    unusedTexture: (t) => `${t} exists but isn't referenced by any skin.`,
    unusedGeometry: (id) => `${id} exists in geometry.json but isn't referenced by any skin.`,
    skinpacksOk: "File detected and read successfully.",
    skinpacksUnusualStructure: "The file was read, but its structure looks unusual.",
    finalOk: "No critical errors were found. The skinpack looks correctly configured.",
    finalIssues: (e, w) => `Detected ${e} error(s) and ${w} warning(s).`,
    defaultPackDescription: "4D skin pack"
  }
};

async function validateSkinPack(zip, zipName, options = {}) {

  const lang = (options.lang === "en") ? "en" : "es";
  const M = VALIDATOR_MESSAGES[lang];

  // Devuelve solo el nombre de archivo (sin la ruta de carpetas), ya que
  // la carpeta contenedora no afecta el proceso de validación en sí.
  const bn = (p) => (p ? p.split("/").pop() : p);

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
    // el tipo "info" no se cuenta en las estadísticas: no es un
    // error/advertencia/éxito, se usa para notas neutrales (ej. geometry.null)
  }

  // ----------------------------
  // Obtener todos los archivos
  // ----------------------------
  const fileList = Object.keys(zip.files).filter(f => !zip.files[f].dir);

  push(
    "success",
    lang === "es" ? "Paquete cargado" : "Package loaded",
    M.packageLoaded(fileList.length, zipName)
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
    push("success", "manifest.json", M.fileFound);
  else
    push("warning", "manifest.json", M.manifestNotFound);

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
        push("warning", "manifest.json", M.manifestReadError(e.message));
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
      description: packDescription || M.defaultPackDescription,
      iconDataUrl
    };
  }

  if (!skinsPath) {
    push("error", "skins.json", M.skinsJsonNotFound);
    return report;
  }

  if (!geometryPath) {
    push("error", M.geometriesTitle, M.geometryNotFound);
    return report;
  }

  push("success", M.geometriesTitle, M.geometryFileFound);

  // ----------------------------
  // Leer JSON
  // ----------------------------
  let skinsJson = null;

  try {
    skinsJson = JSON.parse(await zip.file(skinsPath).async("string"));
    push("success", "skins.json", M.jsonValid);
  } catch (e) {
    push("error", "skins.json", M.jsonInvalid);
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

  function getGeometrySuffix(id) {
    const m = id.match(/^geometry\.(.+)$/i);
    return m ? m[1] : null;
  }

  function getGeometryBaseName(id) {
    const suffix = getGeometrySuffix(id);
    if (!suffix) return null;
    const parts = suffix.split(".");
    return parts[parts.length - 1].toLowerCase();
  }

  // Compara dos sufijos de geometría COMPLETOS (no solo la última
  // palabra). Esto es lo que permite detectar con precisión modelos con
  // nombres de varias palabras (ej. "egg.and.friends" o
  // "egg.and.friends.name"): si uno es una versión truncada o extendida
  // del otro —respetando límites de punto—, se consideran el mismo
  // modelo. Comparar solo la última palabra sería impreciso aquí, ya que
  // "chicken.and.friends" y "egg.and.friends" comparten la última
  // palabra ("friends") sin ser el mismo modelo en absoluto.
  function geometrySuffixesRelated(suffixA, suffixB) {
    if (!suffixA || !suffixB) return false;
    const a = suffixA.toLowerCase();
    const b = suffixB.toLowerCase();
    if (a === b) return true;
    return a.startsWith(b + ".") || b.startsWith(a + ".");
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

      push("error", M.geometriesTitle, M.geometrySyntaxError(bn(geometryPath), geometryParseError.message));

      let continueAnyway = false;

      if (typeof confirm === "function") {
        continueAnyway = confirm(M.geometryConfirmContinue(geometryParseError.message));
      }

      if (!continueAnyway) {
        push("error", M.geometriesTitle, M.geometryStopped(bn(geometryPath), geometryParseError.message));
        return report;
      }

      usingFallbackOnly = true;

      push("warning", M.geometriesTitle, M.geometryFallbackContinue);

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
      push("success", M.geometriesTitle, M.geometryReadOk(bn(geometryPath), geometryIdentifiers.size));
    }

    // ----------------------------
    // Detección de tipo (4D/5D) por identificador de geometría, para
    // mostrar una etiqueta junto a cada skin detectada. Misma lógica que
    // el visor 4D/5D (por huesos individuales: "cubes" = 4D, "poly_mesh"
    // = 5D -- nunca por format_version ni por el nombre del modelo).
    // Deliberadamente self-contenido: no depende de SkinPack (del visor
    // 4D/5D) para que el validador siga siendo un módulo independiente.
    // ----------------------------
    function findGeometryBones(id) {
      if (usingFallbackOnly || !geo || !id) return null;
      if (geo[id] && Array.isArray(geo[id].bones)) return geo[id].bones;
      const list = geo["minecraft:geometry"];
      if (Array.isArray(list)) {
        const entry = list.find(g => g && g.description && g.description.identifier === id);
        if (entry && Array.isArray(entry.bones)) return entry.bones;
      }
      return null;
    }

    function detectGeometryTypeById(id) {
      const bones = findGeometryBones(id);
      if (!bones) return null;
      const hasCubes = bones.some(b => Array.isArray(b.cubes) && b.cubes.length > 0);
      const hasPolyMesh = bones.some(b => b.poly_mesh && Array.isArray(b.poly_mesh.positions) && Array.isArray(b.poly_mesh.polys));
      if (hasCubes && hasPolyMesh) return "MIXTO";
      if (hasPolyMesh) return "5D";
      if (hasCubes) return "4D";
      return null;
    }

    // ----------------------------
    // Detección de "geometry.null" (entrada de relleno típica de
    // paquetes 4D). Cuando aparece, se activa además la validación
    // de animaciones dentro de skins.json. No se marca como advertencia
    // (amarillo): es una nota neutral, se usa el tipo "info" con su
    // propio color, distinto de error/advertencia/éxito.
    // ----------------------------
    const hasGeometryNull =
      geometryIdentifiers.has("geometry.null") ||
      /"geometry\.null"\s*:\s*\{\s*\}\s*,?/i.test(geometryText);

    if (hasGeometryNull) {
      report.checkAnimations = true;

      push("info", M.geometryNullTitle, M.geometryNullDetected(bn(geometryPath)));
    }

  } catch (e) {
    push("error", M.geometriesTitle, M.geometryReadFailed(bn(geometryPath), e.message));
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
    push("success", "texts", M.langFilesDetected(langPaths.length));
  else
    push("warning", "texts", M.langFilesNotFound);

  if (langPaths.length) {
    if (enUsPath)
      push("success", "en_US.lang", M.enUsFound);
    else
      push("warning", "en_US.lang", M.enUsNotFound);
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
    push("success", M.packLocNameTitle, M.packLocNameFound(packLocalizationName));
  } else {
    push("warning", M.packLocNameTitle, M.packLocNameMissing);
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
      push("warning", name, M.dupLocName);
    }

    usedNames.add(name);

    // geometry
    if (!skin.geometry) {

      push("error", name, M.noGeometryAssigned);

    } else {

      const geoLower = skin.geometry.toLowerCase();
      const exactMatch = geometryIdentifiers.has(skin.geometry) || builtinGeometries.has(skin.geometry);
      const matchedId = geometryIdentifiersLower.get(geoLower);
      const builtinLower = [...builtinGeometries].find(b => b.toLowerCase() === geoLower);
      const caseInsensitiveMatch = matchedId || builtinLower;

      if (!exactMatch && !caseInsensitiveMatch) {

        // ----------------------------------------------------------
        // Paso adicional 1: coincidencia por SUFIJO COMPLETO del
        // modelo (más preciso, funciona con nombres de varias
        // palabras). Trata "geometry.egg.and.friends" como el mismo
        // modelo que "geometry.egg.and.friends.name" (en cualquier
        // dirección), ya que uno es una versión truncada/extendida del
        // otro respetando límites de punto.
        // ----------------------------------------------------------
        const skinSuffix = getGeometrySuffix(skin.geometry);
        const suffixCandidates = skinSuffix
          ? [...geometryIdentifiers].filter(id => geometrySuffixesRelated(skinSuffix, getGeometrySuffix(id)))
          : [];

        // ----------------------------------------------------------
        // Paso adicional 2 (respaldo, menos preciso): coincidencia por
        // NOMBRE BASE del modelo (último segmento tras el último punto
        // de lo que sigue a "geometry."). Trata "geometry.custom.Egg"
        // como si fuera "geometry.Egg" (y viceversa), útil cuando solo
        // cambia el espacio de nombres del modelo. Solo se usa si el
        // paso 1 no encontró nada, ya que comparar solo la última
        // palabra es menos confiable en nombres largos.
        // ----------------------------------------------------------
        const skinBaseName = getGeometryBaseName(skin.geometry);
        const baseNameCandidates = skinBaseName ? (geometryBaseNames.get(skinBaseName) || []) : [];

        const usingSuffixMatch = suffixCandidates.length > 0;
        const baseCandidates = usingSuffixMatch ? suffixCandidates : baseNameCandidates;

        if (baseCandidates.length === 1) {

          // Coincidencia única y sin ambigüedad: se puede resolver de forma segura.
          const resolvedId = baseCandidates[0];
          usedGeometries.add(resolvedId);

          push("warning", name, usingSuffixMatch
            ? M.geometryResolvedByExtendedName(skin.geometry, resolvedId)
            : M.geometryResolvedByBaseName(skin.geometry, resolvedId));

        } else if (baseCandidates.length > 1) {

          // Ambigüedad: el mismo nombre base aparece en más de una geometría
          // distinta dentro de geometry.json (p. ej. con y sin namespace).
          // No se resuelve automáticamente para evitar asignar la geometría
          // incorrecta, salvo que el usuario decida continuar de todas formas.
          if (resolveAmbiguousGeometry) {

            const resolvedId = baseCandidates[0];
            usedGeometries.add(resolvedId);

            push("warning", name, M.geometryAmbiguousResolved(skin.geometry, baseCandidates.length, baseCandidates.join(", "), resolvedId));

          } else {

            push("error", name, M.geometryAmbiguousError(skin.geometry, baseCandidates.length, baseCandidates.join(", ")));

          }

        } else {

          push("error", name, M.geometryNotFoundForSkin(skin.geometry));

          // Intentar sugerencia: comparar tanto contra el propio texto de
          // "geometry" como contra el localization_name de la skin. Se
          // compara en ambas direcciones porque el nombre real puede ser
          // más largo O más corto que el escrito en la skin.
          const geoSuffix = skin.geometry.replace(/^geometry\./i, "").toLowerCase();
          const nameLower = name.toLowerCase();

          const suggestion = [...geometryIdentifiers].find(id => {
            const idLower = id.toLowerCase();
            const idSuffix = idLower.replace(/^geometry\./i, "");
            return idLower.includes(geoSuffix) || geoSuffix.includes(idSuffix) || idLower.includes(nameLower);
          });

          if (suggestion) {
            push("warning", name, M.geometrySuggestion(suggestion));
          }

        }

      } else if (!exactMatch && caseInsensitiveMatch) {

        usedGeometries.add(caseInsensitiveMatch);

        push("warning", name, M.geometryCaseMismatch(skin.geometry, caseInsensitiveMatch));

      } else if (builtinGeometries.has(skin.geometry)) {
        push("success", name, M.geometryBuiltin(skin.geometry));
      } else {

        usedGeometries.add(skin.geometry);

        push("success", name, M.geometryOk);
      }

    }

    // texture
    if (!skin.texture) {

      push("error", name, M.noTextureAssigned);

    } else {

      const tex = pngFiles.find(f =>
        f.split("/").pop().toLowerCase() === skin.texture.toLowerCase()
      );

      if (!tex) {

        push("error", name, M.textureNotFound(skin.texture));

      } else {

        push("success", name, M.textureFound(skin.texture));

        usedTextures.add(tex);

      }

    }

    // cape (opcional)
    if (skin.cape) {

      const capeTex = pngFiles.find(f =>
        f.split("/").pop().toLowerCase() === skin.cape.toLowerCase()
      );

      if (!capeTex) {

        push("error", name, M.capeNotFound(skin.cape));

      } else {

        push("success", name, M.capeFound(skin.cape));

        usedTextures.add(capeTex);

      }

    }

    // localization
    // Formato correcto: skin.<localization_name del paquete>.<localization_name de la skin>
    let displayName = null;

    if (!skin.localization_name) {

      // Sin localization_name no hay forma de generar una clave de
      // en_US.lang con sentido, y el fixer "Sync localization_name" salta
      // estas skins a propósito (no puede inventar un nombre). Avisar de
      // esto en vez del mensaje genérico de "clave faltante", que sugiere
      // (incorrectamente) que ese fix la resolvería.
      push("error", name, M.missingLocalizationName);

    } else {

    const expectedKey = packLocalizationName
      ? `skin.${packLocalizationName}.${name}`
      : `skin.${name}`;

    if (enUsPath) {

      const matched =
        [...enUsEntries.keys()].find(k => k === expectedKey) ||
        // Respaldo: por si el prefijo de paquete difiere en mayúsculas/minúsculas
        [...enUsEntries.keys()].find(k => k.toLowerCase() === expectedKey.toLowerCase()) ||
        // Respaldo: coincidencia solo por el nombre de la skin al final de la clave
        [...enUsEntries.keys()].find(k => k === `skin.${name}` || k.endsWith(`.${name}`));

      if (!matched) {

        push("warning", name, M.locKeyMissingEnUs(expectedKey));

      } else {

        displayName = enUsEntries.get(matched);

        push("success", name, M.locKeyFoundEnUs(matched));

      }

    } else if (langEntries.size > 0) {

      const matched =
        [...langEntries.keys()].find(k => k === expectedKey) ||
        [...langEntries.keys()].find(k => k.toLowerCase() === expectedKey.toLowerCase()) ||
        [...langEntries.keys()].find(k => k === `skin.${name}` || k.endsWith(`.${name}`));

      if (!matched) {

        push("warning", name, M.locKeyMissingLang(expectedKey));

      } else {

        displayName = langEntries.get(matched);

        push("warning", name, M.locKeyFoundOtherLang(matched));

      }

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
        push("warning", name, M.animationsInvalid(invalid.join(", ")));
      } else {
        push("success", name, M.animationsValid(animEntries.length));
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
      geometryType: skin.geometry ? detectGeometryTypeById(skin.geometry) : null,
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
      push("warning", M.unusedTextureTitle, M.unusedTexture(tex));
    }
  });

  // ----------------------------
  // Geometrías sin usar
  // ----------------------------
  geometryIdentifiers.forEach(id => {
    if (usedGeometries.has(id)) return;

    if (id.toLowerCase() === "geometry.null") {
      // "geometry.null" es una entrada de relleno habitual: no se marca
      // en amarillo/advertencia, se usa el tipo "info" (color distinto).
      push("info", M.geometryNullTitle, M.geometryNullUnused);
      return;
    }

    push("warning", M.unusedGeometryTitle, M.unusedGeometry(id));
  });

  // ----------------------------
  // skinpacks.json
  // ----------------------------
  if (skinpacksPath) {
    try {

      const sp = JSON.parse(await zip.file(skinpacksPath).async("string"));

      if (Array.isArray(sp.serialize_name) || Array.isArray(sp.skinpacks)) {
        push("success", "skinpacks.json", M.skinpacksOk);
      } else {
        push("warning", "skinpacks.json", M.skinpacksUnusualStructure);
      }

    } catch (e) {
      push("error", "skinpacks.json", M.jsonInvalid);
    }
  }

  // ----------------------------
  // Resultado final
  // ----------------------------
  if (report.stats.errors === 0) {
    push("success", M.finalResultTitle, M.finalOk);
  } else {
    push("warning", M.finalResultTitle, M.finalIssues(report.stats.errors, report.stats.warnings));
  }

  return report;
}
