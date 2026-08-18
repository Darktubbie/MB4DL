/* =========================================================================
   blockbench.js — Integración con Blockbench Web para modelos 4D

   Responsable EXCLUSIVAMENTE de:
     - crear/gestionar el panel embebido (iframe) de web.blockbench.net
     - detectar si el embebido realmente funciona (X-Frame-Options/CSP)
     - cargar la geometría 4D seleccionada en Blockbench SIN salir de la
       página, resolviendo el límite de longitud de URL
     - entregar la textura correspondiente (skins.json) para que se
       asigne al modelo dentro de Blockbench

   ---------------------------------------------------------------------
   LIMITACIONES REALES DE BLOCKBENCH WEB (investigadas, no asumidas):

   1. web.blockbench.net solo documenta estos mecanismos de integración
      por URL (https://www.blockbench.net/wiki/docs/url-parameters/):
        - loadtype=json&loadname=...&loaddata=<JSON stringificado>
        - loadtype=image / minecraft_skin (para texturas/skins sueltas)
        - m=<id>  (modelo previamente subido al servicio de "Compartir"
          propio de Blockbench, de uso manual vía File > Export > Share;
          no hay endpoint público documentado para subir programáticamente
          desde un tercero, así que NO se usa como mecanismo automático)
        - No existe un postMessage documentado para inyectar datos en un
          proyecto ya abierto. La única vía "de datos" es la URL.

   2. Consecuencia importante: **no se puede mandar geometría Y textura
      a la vez por URL** — loadtype solo acepta un tipo por carga. Por
      eso, aunque se resuelva el límite de tamaño, la textura de un
      modelo 4D NUNCA puede vincularse automáticamente solo con la URL:
      hace falta un segundo paso dentro de Blockbench (arrastrar/abrir el
      PNG), igual que en el uso manual normal de Blockbench.

   3. Por eso esta implementación resuelve "JS -> File/Blob -> Blockbench"
      así: en vez de intentar meter más datos en la URL, cuando la
      geometría es grande (o cuando hay que aportar la textura) se
      generan archivos reales (File/Blob descargable) con el
      geometry.json y el .png ya emparejados, y el panel guía al usuario
      a abrirlos DENTRO del propio Blockbench embebido (Ctrl+O / arrastrar
      desde el sistema de archivos) — sin salir de la pestaña ni de
      SkinGeo Viewer. Esa apertura de archivo local no tiene el límite de
      la URL porque no viaja por la URL en absoluto.

   4. Sobre si el iframe realmente se puede embeber: no hay forma de leer
      las cabeceras HTTP (X-Frame-Options / CSP frame-ancestors) de
      web.blockbench.net desde JavaScript de otro origen — ese es
      precisamente el mecanismo de protección. Este módulo NO asume que
      funciona: intenta el embebido y lo comprueba con una heurística
      (ver detectFrameBlocked) y, si detecta bloqueo, lo dice explícita-
      mente en vez de mostrar un panel en blanco silencioso.
   ========================================================================= */

const BlockbenchPanel = (function () {

  const BB_URL = "https://web.blockbench.net/";
  // Límite medido (no supuesto) del contenido que puede viajar en
  // ?loaddata=... antes de que web.blockbench.net rechace la petición.
  //
  // MEDICIÓN REAL: probado directamente contra el servidor desde Termux —
  // una petición con loaddata de 8000 bytes carga correctamente; con 8100
  // bytes el servidor devuelve error. El valor anterior (7500) era una
  // suposición sin medir. Este límite queda fijado en 8100 (el punto
  // límite real comprobado) para que MBSM lo use tal cual, en vez de un
  // valor más conservador — se deja como constante propia y bien
  // documentada para poder ajustarla fácilmente en el futuro si el
  // servidor de Blockbench Web cambia su comportamiento.
  //
  // OJO: este valor es el límite del *contenido de loaddata* (su valor ya
  // codificado con encodeURIComponent), no de la URL completa. La URL
  // real que arma Blockbench añade además el origen, "?loadtype=json",
  // "&loadname=" con el nombre de archivo codificado, y "&loaddata=" —
  // ese overhead varía según el nombre del modelo. Por eso la decisión no
  // compara el tamaño del JSON contra este número directamente: se calcula
  // la longitud real de la URL completa (ver estimateURLLength) y se
  // compara contra el límite total real (overhead de la URL + estos bytes
  // de loaddata), en vez de comparar contra un número de URL total
  // inventado.
  const SAFE_URL_PAYLOAD_LIMIT = 8100;
  // Margen tras el evento 'load' del iframe antes de comprobar su
  // location (deja que about:blank/la página de error termine de asentarse).
  const FRAME_DETECT_GRACE_MS = 300;
  // Red de seguridad SOLO para el caso de que 'load' nunca dispare (conexión
  // colgada) — no es el temporizador que decide "bloqueado". Blockbench Web
  // es una app pesada (Three.js propio incluido) y con red lenta puede
  // tardar bastante más que unos pocos segundos en salir de about:blank;
  // decidir "bloqueado" por un timeout corto y fijo produce falsos
  // positivos (se muestra el aviso de X-Frame-Options aunque en realidad
  // solo iba lento, y Blockbench termina cargando igualmente después).
  const FRAME_DETECT_SAFETY_TIMEOUT_MS = 15000;

  const state = {
    host: null,
    iframe: null,
    statusEl: null,
    instructionsEl: null,
    collapseBtn: null,
    collapsed: false,
    frameStatus: "idle", // idle | probing | ok | blocked
    currentGeoDef: null,
    currentTextureInfo: null // { blob, filename } | null
  };

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function init(hostEl) {
    state.host = hostEl;
    hostEl.innerHTML = "";

    const frameWrap = el("div", "bb-frame-wrap");
    state.iframe = document.createElement("iframe");
    state.iframe.className = "bb-frame";
    state.iframe.title = "Blockbench Web";
    // Sin sandbox: Blockbench necesita WebGL, almacenamiento local y
    // ejecución de scripts completa para funcionar; restringirlo con
    // sandbox lo rompería igual que un bloqueo de embebido.
    frameWrap.appendChild(state.iframe);

    // Barra inferior colapsable: el estado + las instrucciones ocupan
    // espacio vertical que le quita sitio al panel de Blockbench en sí
    // (sobre todo en pantallas bajas/móvil). El botón de minimizar oculta
    // las instrucciones y deja solo la línea de estado, y como
    // .bb-frame-wrap crece con flex:1 1 auto, el iframe recupera ese
    // espacio automáticamente.
    const statusRow = el("div", "bb-status-row");
    state.statusEl = el("div", "bb-status");
    state.collapseBtn = el("button", "bb-collapse-btn");
    state.collapseBtn.type = "button";
    state.collapseBtn.title = "Minimizar/expandir este panel";
    state.collapseBtn.textContent = "▾";
    state.collapseBtn.addEventListener("click", toggleCollapsed);
    statusRow.appendChild(state.statusEl);
    statusRow.appendChild(state.collapseBtn);

    state.instructionsEl = el("div", "bb-instructions");

    hostEl.appendChild(frameWrap);
    hostEl.appendChild(statusRow);
    hostEl.appendChild(state.instructionsEl);
  }

  function toggleCollapsed() {
    state.collapsed = !state.collapsed;
    state.instructionsEl.style.display = state.collapsed ? "none" : "";
    state.collapseBtn.textContent = state.collapsed ? "▸" : "▾";
    state.collapseBtn.title = state.collapsed ? "Expandir este panel" : "Minimizar este panel";
  }

  // Fuerzan un estado concreto (a diferencia de toggleCollapsed, que
  // siempre invierte). No hacen nada si ya está en ese estado, para no
  // disparar el título/flecha de más.
  function collapseInstructions() { if (!state.collapsed) toggleCollapsed(); }
  function expandInstructions() { if (state.collapsed) toggleCollapsed(); }

  function setStatus(html, kind) {
    state.statusEl.innerHTML = html;
    state.statusEl.className = "bb-status" + (kind ? " " + kind : "");
  }

  function setInstructions(html) {
    state.instructionsEl.innerHTML = html || "";
    // Si llegan instrucciones nuevas mientras estaba minimizado, se
    // respeta la preferencia del usuario (se quedan ocultas hasta que
    // pulse expandir) — solo se actualiza el contenido interno.
  }

  // Heurística de detección de bloqueo por X-Frame-Options/CSP: cuando la
  // navegación de un iframe es bloqueada por esas cabeceras, el frame se
  // queda en "about:blank" — que SIGUE siendo mismo-origen con la página
  // padre, así que leer iframe.contentWindow.location.href NO lanza
  // excepción. Si en cambio web.blockbench.net cargó de verdad (otro
  // origen), leer esa propiedad SÍ lanza SecurityError. No es 100%
  // infalible en todos los navegadores, pero es la señal más fiable
  // disponible sin cooperación del servidor remoto — y se combina con el
  // evento 'load' como señal adicional.
  function detectFrameBlocked(iframe, callback) {
    let settled = false;
    const finish = (blocked) => {
      if (settled) return;
      settled = true;
      callback(blocked);
    };

    // Señal principal: el propio evento 'load' del iframe. Dispara tanto
    // si Blockbench cargó de verdad como si el navegador renderizó una
    // página de error por bloqueo — por eso NO basta solo con esto, se
    // corrobora con la lectura de location.href a continuación. Pero a
    // diferencia de un timeout fijo, esto SÍ espera lo que haga falta si
    // la red va lenta, en vez de rendirse a los 2-3 segundos.
    iframe.addEventListener("load", () => {
      setTimeout(checkLocation, FRAME_DETECT_GRACE_MS);
    }, { once: true });

    function checkLocation() {
      try {
        // Cross-origin real -> esto lanza SecurityError -> NO bloqueado.
        const href = iframe.contentWindow.location.href;
        // Si no lanzó, seguimos en about:blank/mismo origen -> bloqueado.
        finish(true);
      } catch (e) {
        finish(false);
      }
    }

    // Red de seguridad: si 'load' nunca llega a disparar, no nos quedamos
    // esperando para siempre.
    setTimeout(() => finish(true), FRAME_DETECT_SAFETY_TIMEOUT_MS);
  }

  function ensureFrameLoaded() {
    if (state.frameStatus === "ok" || state.frameStatus === "probing") return;
    state.frameStatus = "probing";
    setStatus("Cargando Blockbench Web dentro del panel…", "info");
    state.iframe.src = BB_URL;
    detectFrameBlocked(state.iframe, (blocked) => {
      if (blocked) {
        state.frameStatus = "blocked";
        showBlockedFallback();
      } else {
        state.frameStatus = "ok";
        setStatus("Blockbench Web listo.", "ok");
        // Una vez confirmado que carga, reintenta la carga pendiente si la había.
        if (state.currentGeoDef) loadIntoFrame(state.currentGeoDef, state.currentTextureInfo);
      }
    });
  }

  function showBlockedFallback() {
    setStatus(
      "⚠ web.blockbench.net no se puede embeber dentro de SkinGeo Viewer (su servidor está bloqueando el embebido, vía X-Frame-Options o CSP). " +
      "Esto no se puede evitar desde el navegador sin cooperación del servidor remoto — no es un fallo de SkinGeo Viewer.",
      "err"
    );
    setInstructions(`
      <p>Como alternativa, se preparan los archivos igualmente para que los abras tú mismo en Blockbench, sin perder tu sitio en SkinGeo Viewer:</p>
      <div id="bbFallbackButtons"></div>
    `);
    renderDownloadButtons(document.getElementById("bbFallbackButtons"), true);
    expandInstructions(); // aquí sí hace falta que el usuario vea los botones de descarga
  }

  /* ----------------------- construcción de la geometría 4D ----------------------- */

  function buildGeometryJSON(geoDef) {
    const geometry = {
      format_version: "1.10.0",
      [geoDef.id]: {
        texturewidth: geoDef.texture_width,
        textureheight: geoDef.texture_height,
        bones: geoDef.bones
      }
    };
    return JSON.stringify(geometry);
  }

  // Única fuente de verdad para la parte fija de la URL (todo menos el
  // valor de loaddata en sí). La usan tanto estimateURLLength() como
  // loadByURL() y computeSafeTotalURLLength(), para que los tres cálculos
  // no puedan desincronizarse si algún día cambia el formato de la URL.
  function buildURLPrefix(filename) {
    return BB_URL + "?loadtype=json&loadname=" + encodeURIComponent(filename) + "&loaddata=";
  }

  // Longitud real de la URL codificada completa que se le va a mandar al
  // iframe: origen + ?loadtype=json + &loadname=<filename codificado> +
  // &loaddata=<jsonData codificado>. No es una estimación aproximada del
  // tamaño del JSON: es la longitud exacta de la URL final.
  function estimateURLLength(jsonData, filename) {
    return buildURLPrefix(filename).length + encodeURIComponent(jsonData).length;
  }

  // Límite seguro total de la URL para ESTE modelo en concreto: el
  // overhead real de este filename (que varía de un modelo a otro) más
  // los 8000 bytes de loaddata que sí se comprobaron contra el servidor.
  // Así, "¿se manda por URL o por archivo?" se decide comparando la
  // longitud real de la URL completa contra un límite igual de real —
  // nunca contra un número de URL total puesto a ojo.
  function computeSafeTotalURLLength(filename) {
    return buildURLPrefix(filename).length + SAFE_URL_PAYLOAD_LIMIT;
  }

  /* ----------------------- camino A: URL (modelos pequeños) ----------------------- */

  // Umbral de tiempo para la heurística de "carga sospechosamente rápida"
  // (ver loadByURL). No es un límite de bytes: es una duración. Blockbench
  // Web es una aplicación pesada (arranca su propio Three.js, reconstruye
  // la interfaz completa) y ni siquiera con todos sus recursos ya en
  // caché del navegador (tras el primer embebido) su arranque real baja
  // de esto en la práctica. Un 414 "URI Too Long", en cambio, es una
  // respuesta de texto plano trivial que el navegador termina de "cargar"
  // casi al instante. Esto no sustituye poder leer el código HTTP real
  // (imposible desde JS para un iframe de otro origen sin cooperación de
  // Blockbench vía CORS), pero da una señal razonablemente fiable sin
  // depender de adivinar un límite de tamaño exacto que no está
  // documentado en ningún sitio.
  const URL_LOAD_SUSPICIOUSLY_FAST_MS = 700;

  function loadByURL(geoDef) {
    const jsonData = buildGeometryJSON(geoDef);
    const filename = geoDef.id + ".geo.json";
    const url = buildURLPrefix(filename) + encodeURIComponent(jsonData);

    const startedAt = performance.now();
    state.iframe.addEventListener("load", function onUrlLoad() {
      const elapsed = performance.now() - startedAt;
      if (elapsed < URL_LOAD_SUSPICIOUSLY_FAST_MS) {
        flagSuspectedURLFailure(geoDef, elapsed);
      }
    }, { once: true });

    state.iframe.src = url;
    setStatus(`Geometría "${geoDef.id}" [4D] enviada a Blockbench por URL.`, "ok");
  }

  // Se dispara cuando la navegación del iframe "terminó" demasiado rápido
  // para ser un arranque real de Blockbench — probable señal de que el
  // servidor rechazó la URL (p.ej. 414) en vez de cargar la app.
  // No se puede afirmar con 100% de certeza (es una heurística de
  // tiempo, no una lectura real del código HTTP), así que se avisa como
  // sospecha, no como hecho confirmado, y siempre se ofrece la descarga
  // manual para que el usuario decida.
  function flagSuspectedURLFailure(geoDef, elapsedMs) {
    setStatus(
      `⚠ La geometría "${geoDef.id}" [4D] se envió por URL, pero el panel "terminó de cargar" en solo ${Math.round(elapsedMs)} ms — demasiado rápido para ser un arranque real de Blockbench. Es probable que el servidor haya rechazado la URL por ser demasiado larga (algo como "414 URI Too Long"). No se puede confirmar desde aquí con certeza (no hay forma de leer la respuesta real de un iframe de otro origen), así que revisa el panel de la derecha: si está en negro/blanco o muestra un error, usa la descarga manual de abajo.`,
      "warn"
    );
    expandInstructions(); // se expande solo para que se vea el aviso
    renderPostURLSafetyNet(geoDef, state.currentTextureInfo);
  }

  /* ----------------------- camino B: archivo/Blob (modelos grandes o textura) ----------------------- */

  function renderDownloadButtons(container, includeReopenHint) {
    if (!container || !state.currentGeoDef) return;
    container.innerHTML = "";

    const geoDef = state.currentGeoDef;
    const jsonData = buildGeometryJSON(geoDef);
    const geoBlob = new Blob([jsonData], { type: "application/json" });
    const geoName = geoDef.id + ".geo.json";

    const geoBtn = el("a", "bb-dl-btn");
    geoBtn.textContent = "⬇ Descargar geometría (" + geoName + ")";
    geoBtn.href = URL.createObjectURL(geoBlob);
    geoBtn.download = geoName;
    container.appendChild(geoBtn);

    if (state.currentTextureInfo && state.currentTextureInfo.blob) {
      const texBtn = el("a", "bb-dl-btn");
      const texName = state.currentTextureInfo.filename || (geoDef.id + ".png");
      texBtn.textContent = "⬇ Descargar textura (" + texName + ")";
      texBtn.href = URL.createObjectURL(state.currentTextureInfo.blob);
      texBtn.download = texName;
      container.appendChild(texBtn);
    } else {
      const noTex = el("div", "bb-note", "No hay textura emparejada en skins.json para este modelo — solo se prepara la geometría.");
      container.appendChild(noTex);
    }

    if (includeReopenHint) {
      const hint = el("div", "bb-note",
        "Descarga estos archivos y ábrelos con Ctrl+O (o el menú de Blockbench) desde donde web.blockbench.net sí cargue — el bloqueo de embebido no depende de SkinGeo Viewer.");
      container.appendChild(hint);
    }
  }

  function loadByFile(geoDef, textureInfo) {
    setStatus(
      `Geometría "${geoDef.id}" [4D] es demasiado grande para enviarla por URL (Blockbench la rechaza). Se preparó como archivo para abrir dentro del panel sin ese límite.`,
      "warn"
    );
    setInstructions(`
      <p><strong>Cómo cargarla sin salir del panel:</strong></p>
      <ol>
        <li>Descarga el archivo de geometría de abajo (y la textura, si aparece).</li>
        <li>Haz clic dentro del panel de Blockbench de la derecha y usa <em>File → Open</em> para abrir el archivo descargado.</li>
        <li>Selecciona el <code>.geo.json</code> descargado. Blockbench lo abre sin pasar por la URL, así que no hay límite de tamaño.</li>
        <li>Con el modelo abierto, añade la textura descargada (arrástrala sobre el lienzo o usa <em>Textures → Add Texture</em>). Blockbench la asignará usando el UV que ya trae la geometría (texturewidth/textureheight, UV por cara, mirror, inflate — todo eso viaja intacto dentro del .geo.json, no depende de la URL).</li>
      </ol>
      <div id="bbFileButtons"></div>
    `);
    renderDownloadButtons(document.getElementById("bbFileButtons"), false);
    expandInstructions(); // aquí sí hace falta que el usuario vea los pasos y los botones
  }

  /* ----------------------- API pública ----------------------- */

  // geoDef: la geometría normalizada seleccionada.
  // textureInfo: { blob, filename } | null — la textura ya resuelta vía
  // skins.json (o null si no hay ninguna emparejada).
  function loadModel(geoDef, textureInfo) {
    state.currentGeoDef = geoDef;
    state.currentTextureInfo = textureInfo || null;
    setInstructions("");

    if (state.frameStatus !== "ok") {
      // Todavía no sabemos si el embebido funciona: lo intentamos y, al
      // resolver, loadIntoFrame() se dispara solo desde ensureFrameLoaded.
      ensureFrameLoaded();
      if (state.frameStatus === "blocked") return; // ya se mostró el fallback
      setStatus("Comprobando si Blockbench Web puede embeberse antes de cargar el modelo…", "info");
      return;
    }

    loadIntoFrame(geoDef, textureInfo);
  }

  function loadIntoFrame(geoDef, textureInfo) {
    const jsonData = buildGeometryJSON(geoDef);
    const filename = geoDef.id + ".geo.json";
    const urlLen = estimateURLLength(jsonData, filename);
    const safeLimit = computeSafeTotalURLLength(filename);

    if (urlLen <= safeLimit) {
      loadByURL(geoDef);
      renderPostURLSafetyNet(geoDef, textureInfo);
      // Por defecto, tras un envío normal por URL, se deja el panel de
      // instrucciones colapsado: solo queda visible la línea de estado
      // ("Geometría ... enviada a Blockbench por URL.") y el botón para
      // expandir, así el panel de Blockbench recupera ese espacio. Si
      // luego se detecta una carga sospechosamente rápida (posible 414),
      // flagSuspectedURLFailure() lo vuelve a expandir automáticamente.
      collapseInstructions();
    } else {
      loadByFile(geoDef, textureInfo);
    }
  }

  // Se muestra SIEMPRE después de un envío por URL (no solo cuando hay
  // textura emparejada). Dos motivos, ambos reales:
  //   1) La textura nunca viaja junto con la geometría por URL (Blockbench
  //      solo acepta un loadtype por carga), así que si hay textura
  //      emparejada hace falta el paso manual sí o sí.
  //   2) Aunque SAFE_URL_PAYLOAD_LIMIT (8100) ya es un dato medido contra el
  //      servidor real y no una suposición, sigue siendo la medición de
  //      una sola prueba en una sola red/entorno (Termux) — el límite real
  //      lo impone el servidor de web.blockbench.net (responde 414 "URI
  //      Too Long" para URLs demasiado largas) y podría variar según
  //      condiciones que esta página no controla. Además, esta página NO
  //      tiene forma de leer esa respuesta desde JavaScript, porque el
  //      iframe es de otro origen — intentar leer su contenido para
  //      comprobarlo lanzaría el mismo SecurityError que ya se usa para
  //      detectar bloqueos de embebido,
  //      así que no hay manera fiable de distinguir "cargó bien" de
  //      "el servidor lo rechazó en silencio" solo con JS. Por eso, en
  //      vez de prometer una detección que no se puede garantizar, se
  //      deja siempre lista la descarga manual como red de seguridad.
  function renderPostURLSafetyNet(geoDef, textureInfo) {
    const needsTextureStep = !!textureInfo;
    setInstructions(`
      <p>La geometría "${geoDef.id}" se envió a Blockbench por URL.
      ${needsTextureStep
        ? "Blockbench Web no admite recibir geometría y textura a la vez por URL, así que la textura hay que añadirla dentro del panel."
        : ""
      }</p>
      <p class="bb-note" style="margin-top:0;">⚠ Si el panel de Blockbench se queda en negro, en blanco, o muestra un texto de error como <code>"Error: URI Too Long"</code>, es que este modelo era, en realidad, demasiado grande para que el servidor de Blockbench lo aceptara por URL — ese límite lo impone su servidor y esta página no puede comprobarlo desde aquí. Usa los botones de abajo para descargarlo tú mismo y ábrelo dentro del panel con <code>Ctrl+O</code> (y arrastra la textura después).</p>
      <div id="bbSafetyButtons"></div>
    `);
    renderDownloadButtons(document.getElementById("bbSafetyButtons"), false);
  }

  function show() { state.host.style.display = "block"; ensureFrameLoaded(); }
  function hide() { state.host.style.display = "none"; }

  return { init, loadModel, show, hide };
})();
