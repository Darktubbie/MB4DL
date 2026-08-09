// viewer.js
// Visualizador de skin packs "normales" (no 4D) de Minecraft Bedrock:
// detecta modelo Steve/Alex (wide/slim) por skin y permite ver la textura
// o una previsualización 3D del modelo con la skin aplicada.

// ----------------------------
// Layout UV del formato de skin 64x64 (capa base). Cada cara es
// [x, y, w, h] en píxeles dentro de la textura, origen arriba-izquierda.
// Orden de caras: right, left, top, bottom, front, back
// (coincide con el orden de caras que usa THREE.BoxGeometry).
// ----------------------------
function mcLayoutWide() {
  return {
    head:     { right:[0,8,8,8],   left:[16,8,8,8],  top:[8,0,8,8],   bottom:[16,0,8,8],  front:[8,8,8,8],   back:[24,8,8,8] },
    body:     { right:[16,20,4,12],left:[28,20,4,12],top:[20,16,8,4], bottom:[28,16,8,4], front:[20,20,8,12],back:[32,20,8,12] },
    rightArm: { right:[40,20,4,12],left:[48,20,4,12],top:[44,16,4,4], bottom:[48,16,4,4], front:[44,20,4,12],back:[52,20,4,12] },
    leftArm:  { right:[32,52,4,12],left:[40,52,4,12],top:[36,48,4,4], bottom:[40,48,4,4], front:[36,52,4,12],back:[44,52,4,12] },
    rightLeg: { right:[0,20,4,12], left:[8,20,4,12],  top:[4,16,4,4],  bottom:[8,16,4,4],  front:[4,20,4,12], back:[12,20,4,12] },
    leftLeg:  { right:[16,52,4,12],left:[24,52,4,12], top:[20,48,4,4], bottom:[24,48,4,4], front:[20,52,4,12],back:[28,52,4,12] }
  };
}

function mcLayoutSlim() {
  const layout = mcLayoutWide();
  // Los brazos slim (Alex) miden 3px de ancho en vez de 4px.
  layout.rightArm = { right:[40,20,4,12], front:[44,20,3,12], left:[47,20,4,12], back:[51,20,3,12], top:[44,16,3,4], bottom:[47,16,3,4] };
  layout.leftArm  = { right:[32,52,4,12], front:[36,52,3,12], left:[39,52,4,12], back:[43,52,3,12], top:[36,48,3,4], bottom:[39,48,3,4] };
  return layout;
}

// Formato antiguo 64x32: no hay región independiente para brazo/pierna
// izquierdos, se reflejan desde los del lado derecho.
function mcLayoutLegacyWide() {
  const w = mcLayoutWide();
  return {
    head: w.head,
    body: w.body,
    rightArm: w.rightArm,
    leftArm: w.rightArm,
    rightLeg: w.rightLeg,
    leftLeg: w.rightLeg
  };
}

// ----------------------------
// Layout UV de la SEGUNDA CAPA (overlay/layer2): gorro, chaqueta,
// mangas y pantalones. Solo existe en el formato de textura 64x64;
// el formato antiguo 64x32 no tiene esta fila.
// ----------------------------
function mcOverlayWide() {
  return {
    hat:          { right:[32,8,8,8],  left:[48,8,8,8],  top:[40,0,8,8], bottom:[48,0,8,8], front:[40,8,8,8],  back:[56,8,8,8] },
    jacket:       { right:[16,36,4,12],left:[28,36,4,12],top:[20,32,8,4],bottom:[28,32,8,4],front:[20,36,8,12],back:[32,36,8,12] },
    rightSleeve:  { right:[40,36,4,12],left:[48,36,4,12],top:[44,32,4,4],bottom:[48,32,4,4],front:[44,36,4,12],back:[52,36,4,12] },
    leftSleeve:   { right:[48,52,4,12],left:[56,52,4,12],top:[52,48,4,4],bottom:[56,48,4,4],front:[52,52,4,12],back:[60,52,4,12] },
    rightPants:   { right:[0,36,4,12], left:[8,36,4,12],  top:[4,32,4,4], bottom:[8,32,4,4], front:[4,36,4,12], back:[12,36,4,12] },
    leftPants:    { right:[0,52,4,12], left:[8,52,4,12],  top:[4,48,4,4], bottom:[8,48,4,4], front:[4,52,4,12], back:[12,52,4,12] }
  };
}

function mcOverlaySlim() {
  const layout = mcOverlayWide();
  layout.rightSleeve = { right:[40,36,4,12], front:[44,36,3,12], left:[47,36,4,12], back:[51,36,3,12], top:[44,32,3,4], bottom:[47,32,3,4] };
  layout.leftSleeve  = { right:[48,52,4,12], front:[52,52,3,12], left:[55,52,4,12], back:[59,52,3,12], top:[52,48,3,4], bottom:[55,48,3,4] };
  return layout;
}

// ----------------------------
// Aplica un layout de caras [x,y,w,h] (en píxeles) a un BoxGeometry,
// usando el orden de caras estándar de THREE.BoxGeometry:
// [+x right, -x left, +y top, -y bottom, +z front, -z back]
// ----------------------------
function setBoxUV(geometry, layout, texW, texH) {
  const order = ["right", "left", "top", "bottom", "front", "back"];
  const uvAttr = geometry.attributes.uv;

  order.forEach((face, i) => {
    const [x, y, w, h] = layout[face];

    const u0 = x / texW;
    const u1 = (x + w) / texW;
    const v0 = 1 - (y + h) / texH;
    const v1 = 1 - y / texH;

    const base = i * 4;

    uvAttr.setXY(base + 0, u0, v1); // top-left
    uvAttr.setXY(base + 1, u1, v1); // top-right
    uvAttr.setXY(base + 2, u0, v0); // bottom-left
    uvAttr.setXY(base + 3, u1, v0); // bottom-right
  });

  uvAttr.needsUpdate = true;
}

function makePart(w, h, d, layout, texW, texH, material) {
  const geo = new THREE.BoxGeometry(w, h, d);
  setBoxUV(geo, layout, texW, texH);
  return new THREE.Mesh(geo, material);
}

// La segunda capa (gorro/chaqueta/mangas/pantalones) se dibuja como una
// caja ligeramente más grande que la pieza base, para que sobresalga
// visualmente igual que en el juego. Las zonas transparentes del PNG se
// descartan mediante alphaTest en el material.
function makeOverlayPart(w, h, d, layout, texW, texH, material) {
  const inflate = 0.5;
  const geo = new THREE.BoxGeometry(w + inflate * 2, h + inflate * 2, d + inflate * 2);
  setBoxUV(geo, layout, texW, texH);
  return new THREE.Mesh(geo, material);
}

// ----------------------------
// Construye el modelo del jugador (Steve/Alex) con la textura aplicada.
// Devuelve un THREE.Group listo para agregar a la escena.
// ----------------------------
function buildPlayerModel(texture, isSlim, texW, texH) {

  const material = new THREE.MeshLambertMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.FrontSide
  });

  const legacy = texH < texW; // 64x32 = formato antiguo
  const layout = legacy
    ? mcLayoutLegacyWide()
    : (isSlim ? mcLayoutSlim() : mcLayoutWide());

  const armW = (!legacy && isSlim) ? 3 : 4;

  const group = new THREE.Group();

  const head = makePart(8, 8, 8, layout.head, texW, texH, material);
  head.position.set(0, 28, 0);
  group.add(head);

  const body = makePart(8, 12, 4, layout.body, texW, texH, material);
  body.position.set(0, 18, 0);
  group.add(body);

  const rightArm = makePart(armW, 12, 4, layout.rightArm, texW, texH, material);
  rightArm.position.set(-(4 + armW / 2), 18, 0);
  group.add(rightArm);

  const leftArm = makePart(armW, 12, 4, layout.leftArm, texW, texH, material);
  leftArm.position.set(4 + armW / 2, 18, 0);
  group.add(leftArm);

  const rightLeg = makePart(4, 12, 4, layout.rightLeg, texW, texH, material);
  rightLeg.position.set(-2, 6, 0);
  group.add(rightLeg);

  const leftLeg = makePart(4, 12, 4, layout.leftLeg, texW, texH, material);
  leftLeg.position.set(2, 6, 0);
  group.add(leftLeg);

  // ----------------------------
  // Segunda capa (gorro, chaqueta, mangas, pantalones). Solo existe en
  // el formato de textura 64x64; el formato antiguo 64x32 no la tiene.
  // ----------------------------
  if (!legacy) {

    const overlay = isSlim ? mcOverlaySlim() : mcOverlayWide();

    const hat = makeOverlayPart(8, 8, 8, overlay.hat, texW, texH, material);
    hat.position.copy(head.position);
    group.add(hat);

    const jacket = makeOverlayPart(8, 12, 4, overlay.jacket, texW, texH, material);
    jacket.position.copy(body.position);
    group.add(jacket);

    const rightSleeve = makeOverlayPart(armW, 12, 4, overlay.rightSleeve, texW, texH, material);
    rightSleeve.position.copy(rightArm.position);
    group.add(rightSleeve);

    const leftSleeve = makeOverlayPart(armW, 12, 4, overlay.leftSleeve, texW, texH, material);
    leftSleeve.position.copy(leftArm.position);
    group.add(leftSleeve);

    const rightPants = makeOverlayPart(4, 12, 4, overlay.rightPants, texW, texH, material);
    rightPants.position.copy(rightLeg.position);
    group.add(rightPants);

    const leftPants = makeOverlayPart(4, 12, 4, overlay.leftPants, texW, texH, material);
    leftPants.position.copy(leftLeg.position);
    group.add(leftPants);

  }

  group.position.y = -12; // centra el modelo verticalmente

  return group;
}

// ----------------------------
// Maneja una única instancia activa de escena 3D a la vez, para no
// acumular renderers/animation loops si el usuario expande varias skins.
// ----------------------------
let active3DViewer = null;

function dispose3DViewer() {
  if (!active3DViewer) return;
  cancelAnimationFrame(active3DViewer.frameId);
  active3DViewer.renderer.dispose();
  active3DViewer.controls.dispose();
  active3DViewer = null;
}

// Abre el visor 3D en un <canvas> dado, con la textura (data URL) y si el
// modelo es slim (Alex) o wide (Steve).
function open3DViewer(canvas, textureDataUrl, isSlim) {
  dispose3DViewer();

  const width = canvas.clientWidth || 320;
  const height = canvas.clientHeight || 320;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);
  camera.position.set(0, 4, 46);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.55);
  dirLight.position.set(20, 30, 40);
  scene.add(dirLight);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 4, 0);
  controls.enablePan = false;
  controls.minDistance = 20;
  controls.maxDistance = 90;
  controls.update();

  const state = { scene, camera, renderer, controls, frameId: null };
  active3DViewer = state;

  const loader = new THREE.TextureLoader();

  loader.load(textureDataUrl, (texture) => {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    const img = texture.image;
    const model = buildPlayerModel(texture, isSlim, img.width, img.height);
    scene.add(model);
  });

  function animate() {
    state.frameId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  return state;
}

// ----------------------------
// Analiza un skin pack "normal" (no 4D): extrae nombre, textura y si el
// modelo es slim (Alex) o wide (Steve) para cada skin de skins.json.
// ----------------------------
async function parseNormalSkinPack(zip) {

  const fileList = Object.keys(zip.files).filter(f => !zip.files[f].dir);
  const skinsPath = fileList.find(f => /(^|\/)skins\.json$/i.test(f));

  if (!skinsPath) return null;

  let skinsJson;
  try {
    skinsJson = JSON.parse(await zip.file(skinsPath).async("string"));
  } catch (e) {
    return null;
  }

  const pngFiles = fileList.filter(f => /\.png$/i.test(f));
  const skins = skinsJson.skins || [];

  const results = [];

  for (const skin of skins) {

    const name = skin.localization_name || "?";
    const geometry = skin.geometry || "";
    const isSlim = /slim/i.test(geometry);

    let texturePath = null;
    let textureDataUrl = null;

    if (skin.texture) {
      texturePath = pngFiles.find(f =>
        f.split("/").pop().toLowerCase() === skin.texture.toLowerCase()
      );

      if (texturePath) {
        try {
          const base64 = await zip.file(texturePath).async("base64");
          textureDataUrl = `data:image/png;base64,${base64}`;
        } catch (e) {
          textureDataUrl = null;
        }
      }
    }

    results.push({
      name,
      isSlim,
      texturePath,
      textureDataUrl
    });
  }

  return results;
}
