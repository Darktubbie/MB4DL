/* =========================================================================
   skinGeoViewer.js — UI y orquestación del visualizador 4D/5D de MBSM
   (basado en el código funcional de SkinGeo Viewer/Fixer)

   Responsable de:
     - dropzones (pack / geometría suelta / textura suelta)
     - selector de modelos
     - conmutar el panel visible (Renderer5D para 5D, BlockbenchPanel
       para 4D) dentro del mismo host, sin recargar la página
     - togglear controles (auto-rotar, wireframe, cuadrícula, pivotes) —
       estos solo aplican al panel 5D; en 4D esos controles viven dentro
       del propio Blockbench embebido
     - registro (log)

   AISLAMIENTO: todo vive dentro del namespace SkinGeoViewer (IIFE). No
   declara ninguna variable global (`state`, `log`, `$`...) como hacía el
   viewer.js original de SkinGeo — eso habría chocado potencialmente con
   otros módulos de MBSM. Los IDs del DOM que usa están todos prefijados
   con "sg" y viven exclusivamente dentro de la subpestaña de esta
   herramienta en index.html.

   IMPORTANTE: este archivo es un módulo INDEPENDIENTE del viewer.js
   original de MBSM (visualizador de Skin Packs normales). No lo
   sustituye, no lo modifica y no comparte estado con él.
   ========================================================================= */

const SkinGeoViewer = (function () {

  const state = {
    geoData: null,
    selectedGeo: null,
    zip: null,
    currentOptions: null,
    textureURL: null,
    textureImg: null,
    textureBlob: null,
    textureFilename: null
  };

  const $ = (id) => document.getElementById(id);
  let logBox = null;

  function log(msg, kind) {
    if (!logBox) return;
    const line = document.createElement("div");
    if (kind) line.className = kind;
    line.textContent = msg;
    logBox.appendChild(line);
    logBox.scrollTop = logBox.scrollHeight;
  }
  function clearLog() { if (logBox) logBox.innerHTML = ""; }

  /* ---------------------------------------------------------------------
     Conmutación de panel (5D <-> 4D) dentro del host
     --------------------------------------------------------------------- */

  function showPanelFor(type) {
    const is4D = type === "4D";
    $("sgThreeViewer").style.display = is4D ? "none" : "block";
    $("sgBlockbenchViewer").style.display = is4D ? "block" : "none";
    $("sgViewportToolbar").style.display = is4D ? "none" : "flex";
    // La placa flotante con el nombre/medidas del modelo solo tiene sentido
    // sobre el canvas 3D fijo del Renderer5D. En 4D, Blockbench ya muestra
    // esa misma información en su propio panel de estado/instrucciones, y
    // como ese panel tiene texto de altura variable, la placa (posición
    // absoluta) terminaba superpuesta con ese texto en pantallas angostas.
    // selectModelOption() ya se encarga de volver a mostrarla para 5D.
    if (is4D) $("sgModelBadge").style.display = "none";
    // Los controles del sidebar (auto-rotar, wireframe, cuadrícula,
    // pivotes, encuadrar) solo aplican al Renderer5D — en 4D no tienen
    // ningún efecto porque el modelo vive dentro de Blockbench, así que
    // se quedan en gris y sin interacción mientras dure la selección 4D,
    // y vuelven a activarse al elegir un modelo 5D.
    $("sgRenderer5dControls").classList.toggle("controls-disabled", is4D);

    if (is4D) {
      Renderer5D.hide();
      BlockbenchPanel.show();
    } else {
      BlockbenchPanel.hide();
      Renderer5D.show();
    }
  }

  /* ---------------------------------------------------------------------
     Dropzones
     --------------------------------------------------------------------- */

  function setupDropzone(zoneId, inputId, nameId, onFile) {
    const zone = $(zoneId);
    const input = $(inputId);
    const nameEl = $(nameId);
    if (!zone || !input) return;

    zone.addEventListener("click", () => input.click());
    input.addEventListener("change", (e) => {
      if (e.target.files[0]) {
        if (nameEl) nameEl.textContent = e.target.files[0].name;
        onFile(e.target.files[0]);
      }
    });
    ["dragenter", "dragover"].forEach(evt =>
      zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.add("drag"); })
    );
    ["dragleave", "drop"].forEach(evt =>
      zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.remove("drag"); })
    );
    zone.addEventListener("drop", (e) => {
      const file = e.dataTransfer.files[0];
      if (file) {
        if (nameEl) nameEl.textContent = file.name;
        onFile(file);
      }
    });
  }

  function handleGeoFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const json = SkinPack.repairAndParseJSON(reader.result);
      if (!json) {
        log("No se pudo leer " + file.name + " como JSON válido (ni siquiera tras intentar reparar comas sobrantes).", "err");
        return;
      }
      const normalized = SkinPack.loadStandaloneGeometry(json, file.name, log);
      if (!normalized) return;

      state.geoData = normalized;
      state.zip = null;
      const options = normalized.map((g, i) => ({ label: `${g.id} [${g.type}]`, geoIndex: i, textureFile: null }));
      populateModelSelect(options);
      state.selectedGeo = 0;
      selectModelOption(options[0]);
    };
    reader.readAsText(file);
  }

  function handleTexFile(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      state.textureURL = url;
      state.textureImg = img;
      state.textureBlob = file;
      state.textureFilename = file.name;
      Renderer5D.setTexture(img);
      log(`Textura lista (${img.width}×${img.height}).`, "ok");
      if (state.geoData && state.selectedGeo !== null) {
        const geoDef = state.geoData[state.selectedGeo];
        if (geoDef && geoDef.type === "4D") {
          log(`Textura emparejada con "${geoDef.id}" [4D] para Blockbench.`, "ok");
          BlockbenchPanel.loadModel(geoDef, { blob: file, filename: file.name });
        } else {
          rebuildCurrentModel();
        }
      }
    };
    img.onerror = () => log("La textura no se pudo decodificar.", "err");
    img.src = url;
  }

  async function handlePackFile(file) {
    clearLog();
    const result = await SkinPack.parsePackFile(file, log);
    if (!result) return;

    state.geoData = result.geoData;
    state.zip = result.zip;
    state.currentOptions = result.options;

    populateModelSelect(result.options);
    if (result.options.length) {
      await selectModelOption(result.options[0]);
    }
  }

  /* ---------------------------------------------------------------------
     Selección de modelo -> enruta a 5D (Three.js) o 4D (Blockbench)
     --------------------------------------------------------------------- */

  function populateModelSelect(options) {
    const sel = $("sgModelSelect");
    sel.innerHTML = "";
    options.forEach((opt, i) => {
      const o = document.createElement("option");
      o.value = i;
      o.textContent = opt.label;
      sel.appendChild(o);
    });
    $("sgModelSelectWrap").style.display = options.length ? "block" : "none";
    sel.onchange = () => selectModelOption(options[parseInt(sel.value, 10)]);
    state.currentOptions = options;
  }

  async function selectModelOption(opt) {
    state.selectedGeo = opt.geoIndex;
    const geoDef = state.geoData[opt.geoIndex];
    if (!geoDef) return;

    $("sgEmptyState").style.display = "none";
    $("sgModelBadge").style.display = "block";
    $("sgModelBadgeName").textContent = `${geoDef.id || "modelo"} [${geoDef.type}]`;

    if (geoDef.type === "4D") {
      showPanelFor("4D");
      $("sgModelBadgeMeta").textContent = `${geoDef.texture_width}×${geoDef.texture_height} · ${geoDef.bones.length} huesos · editor Blockbench`;
      $("sgBtnReset").disabled = true;

      let textureInfo = null;
      if (opt.textureFile && state.zip) {
        const tex = await SkinPack.getTextureFromZip(state.zip, opt.textureFile, log);
        if (tex) textureInfo = { blob: tex.blob, filename: opt.textureFile.split("/").pop() };
      } else if (state.textureBlob) {
        textureInfo = { blob: state.textureBlob, filename: state.textureFilename };
      }
      BlockbenchPanel.loadModel(geoDef, textureInfo);
      return;
    }

    showPanelFor("5D");
    $("sgBtnReset").disabled = false;

    if (opt.textureFile && state.zip) {
      const tex = await SkinPack.getTextureFromZip(state.zip, opt.textureFile, log);
      if (tex) {
        state.textureURL = tex.url;
        state.textureImg = tex.img;
        Renderer5D.setTexture(tex.img);
      }
    }

    rebuildCurrentModel();
  }

  function rebuildCurrentModel() {
    const geoDef = state.geoData[state.selectedGeo];
    if (!geoDef) return;
    const stats = Renderer5D.loadModel(geoDef);

    $("sgStatBones").textContent = stats.bones;
    $("sgStatCubes").textContent = geoDef.type === "5D" ? stats.polys : stats.cubes;
    $("sgModelBadgeMeta").textContent = geoDef.type === "5D"
      ? `${geoDef.texture_width}×${geoDef.texture_height} · ${stats.bones} huesos · ${stats.polys} polys`
      : `${geoDef.texture_width}×${geoDef.texture_height} · ${stats.bones} huesos · ${stats.cubes} cubos`;

    if (stats.textureMismatch) {
      log(`Aviso: la textura mide ${stats.textureMismatch.texW}×${stats.textureMismatch.texH} pero la geometría espera ${stats.textureMismatch.expectedW}×${stats.textureMismatch.expectedH}. Se usará la textura tal cual, puede desalinearse.`, "warn");
    }
    if (stats.meshCount) {
      const s = stats.bboxSize;
      log(`Diagnóstico "${geoDef.id}": ${stats.meshCount} malla(s) en escena · caja ${s.x.toFixed(2)}×${s.y.toFixed(2)}×${s.z.toFixed(2)} unidades.`, "ok");
      if (s.x > 20 || s.y > 20 || s.z > 20) {
        log(`⚠ La caja de "${geoDef.id}" es sospechosamente grande frente al resto del modelo — puede haber una transformación fuera de escala en algún hueso/cubo/poly_mesh.`, "warn");
      }
    } else {
      log(`⚠ "${geoDef.id}" no generó ninguna malla visible (0 cubos y 0 poly_mesh renderizados) aunque declara ${geoDef.bones.length} huesos.`, "warn");
    }

    $("sgBtnReset").disabled = false;
  }

  /* ---------------------------------------------------------------------
     Controles de la UI (solo aplican al panel 5D)
     --------------------------------------------------------------------- */

  function bindSwitch(id, vtId, initial, onChange) {
    const elx = $(id);
    const vt = vtId ? $(vtId) : null;
    if (!elx) return;
    let value = initial;
    const paint = () => {
      elx.classList.toggle("on", value);
      if (vt) vt.classList.toggle("active", value);
    };
    paint();
    const flip = () => { value = !value; paint(); onChange(value); };
    elx.addEventListener("click", flip);
    if (vt) vt.addEventListener("click", flip);
  }

  /* ---------------------------------------------------------------------
     Inicialización — llamada una vez desde index.html (o al entrar a
     la subpestaña por primera vez)
     --------------------------------------------------------------------- */

  let initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;

    logBox = $("sgLog");

    Renderer5D.init($("sgThreeViewer"));
    BlockbenchPanel.init($("sgBlockbenchViewer"));

    setupDropzone("sgDzGeo", "sgInputGeo", "sgDzGeoName", handleGeoFile);
    setupDropzone("sgDzTex", "sgInputTex", "sgDzTexName", handleTexFile);
    setupDropzone("sgDzPack", "sgInputPack", "sgDzPackName", handlePackFile);

    bindSwitch("sgToggleSpin", "sgVtSpin", true, (v) => Renderer5D.setSpin(v));
    bindSwitch("sgToggleWire", "sgVtWire", false, (v) => Renderer5D.setWireframe(v));
    bindSwitch("sgToggleGrid", "sgVtGrid", true, (v) => Renderer5D.setGrid(v));
    bindSwitch("sgTogglePivots", null, false, (v) => {
      Renderer5D.setShowPivots(v);
      if (state.geoData && state.selectedGeo !== null && state.geoData[state.selectedGeo].type !== "4D") {
        rebuildCurrentModel();
      }
    });

    $("sgBtnReset").addEventListener("click", () => Renderer5D.frameCamera());

    // Panel 5D visible por defecto hasta que se cargue algo.
    showPanelFor("5D");
  }

  return { init };

})();
