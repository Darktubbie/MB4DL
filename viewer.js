// viewer.js
// Visualizador de skin packs "normales" (no 4D) de Minecraft Bedrock:
// detecta modelo Steve/Alex (wide/slim) por skin y permite ver la textura
// o una previsualización 3D del modelo con la skin aplicada.

// ----------------------------
// Geometría OFICIAL de Minecraft Bedrock para el modelo humanoide
// estándar (Steve = wide, Alex = slim), tomada directamente del
// player_geometry.json real del juego (solo Steve y Alex; la capa
// -"geometry.cape"- no se incluye aquí, se maneja aparte con
// addCapeMesh). Reemplaza al layout UV armado a mano que se usaba
// antes: se renderiza con el mismo pipeline genérico que ya usan los
// modelos personalizados de packs 4D/5D (buildCustomGeometryModel),
// así que el resultado es consistente y confiable en vez de depender
// de coordenadas de píxeles transcritas manualmente.
// ----------------------------
const OFFICIAL_PLAYER_GEOMETRY = {
  "geometry.npc.steve": {
    "texturewidth": 64,
    "textureheight": 64,
    "bones": [
      {
        "name": "root",
        "pivot": [0, 0, 0]
      },
      {
        "name": "body",
        "parent": "waist",
        "pivot": [0, 24, 0],
        "cubes": [
          {
            "origin": [-4, 12, -2],
            "size": [8, 12, 4],
            "uv": [16, 16]
          }
        ]
      },
      {
        "name": "waist",
        "parent": "root",
        "pivot": [0, 12, 0]
      },
      {
        "name": "head",
        "parent": "body",
        "pivot": [0, 24, 0],
        "cubes": [
          {
            "origin": [-4, 24, -4],
            "size": [8, 8, 8],
            "uv": [0, 0]
          }
        ]
      },
      {
        "name": "cape",
        "pivot": [0, 24, 3],
        "parent": "body"
      },
      {
        "name": "hat",
        "parent": "head",
        "pivot": [0, 24, 0],
        "cubes": [
          {
            "origin": [-4, 24, -4],
            "size": [8, 8, 8],
            "uv": [32, 0],
            "inflate": 0.5
          }
        ]
      },
      {
        "name": "leftArm",
        "parent": "body",
        "pivot": [5, 22, 0],
        "cubes": [
          {
            "origin": [4, 12, -2],
            "size": [4, 12, 4],
            "uv": [32, 48]
          }
        ]
      },
      {
        "name": "leftSleeve",
        "parent": "leftArm",
        "pivot": [5, 22, 0],
        "cubes": [
          {
            "origin": [4, 12, -2],
            "size": [4, 12, 4],
            "uv": [48, 48],
            "inflate": 0.25
          }
        ]
      },
      {
        "name": "leftItem",
        "pivot": [6, 15, 1],
        "parent": "leftArm"
      },
      {
        "name": "rightArm",
        "parent": "body",
        "pivot": [-5, 22, 0],
        "cubes": [
          {
            "origin": [-8, 12, -2],
            "size": [4, 12, 4],
            "uv": [40, 16]
          }
        ]
      },
      {
        "name": "rightSleeve",
        "parent": "rightArm",
        "pivot": [-5, 22, 0],
        "cubes": [
          {
            "origin": [-8, 12, -2],
            "size": [4, 12, 4],
            "uv": [40, 32],
            "inflate": 0.25
          }
        ]
      },
      {
        "name": "rightItem",
        "pivot": [-6, 15, 1],
        "locators": {
          "lead_hold": [-6, 15, 1]
        },
        "parent": "rightArm"
      },
      {
        "name": "leftLeg",
        "parent": "root",
        "pivot": [1.9, 12, 0],
        "cubes": [
          {
            "origin": [-0.1, 0, -2],
            "size": [4, 12, 4],
            "uv": [16, 48]
          }
        ]
      },
      {
        "name": "leftPants",
        "parent": "leftLeg",
        "pivot": [1.9, 12, 0],
        "cubes": [
          {
            "origin": [-0.1, 0, -2],
            "size": [4, 12, 4],
            "uv": [0, 48],
            "inflate": 0.25
          }
        ]
      },
      {
        "name": "rightLeg",
        "parent": "root",
        "pivot": [-1.9, 12, 0],
        "cubes": [
          {
            "origin": [-3.9, 0, -2],
            "size": [4, 12, 4],
            "uv": [0, 16]
          }
        ]
      },
      {
        "name": "rightPants",
        "parent": "rightLeg",
        "pivot": [-1.9, 12, 0],
        "cubes": [
          {
            "origin": [-3.9, 0, -2],
            "size": [4, 12, 4],
            "uv": [0, 32],
            "inflate": 0.25
          }
        ]
      },
      {
        "name": "jacket",
        "parent": "body",
        "pivot": [0, 24, 0],
        "cubes": [
          {
            "origin": [-4, 12, -2],
            "size": [8, 12, 4],
            "uv": [16, 32],
            "inflate": 0.25
          }
        ]
      }
    ]
  },
  "geometry.npc.alex": {
    "texturewidth": 64,
    "textureheight": 64,
    "bones": [
      {
        "name": "root",
        "pivot": [0, 0, 0]
      },
      {
        "name": "waist",
        "parent": "root",
        "pivot": [0, 12, 0]
      },
      {
        "name": "body",
        "parent": "waist",
        "pivot": [0, 24, 0],
        "cubes": [
          {
            "origin": [-4, 12, -2],
            "size": [8, 12, 4],
            "uv": [16, 16]
          }
        ]
      },
      {
        "name": "head",
        "parent": "body",
        "pivot": [0, 24, 0],
        "cubes": [
          {
            "origin": [-4, 24, -4],
            "size": [8, 8, 8],
            "uv": [0, 0]
          }
        ]
      },
      {
        "name": "hat",
        "parent": "head",
        "pivot": [0, 24, 0],
        "cubes": [
          {
            "origin": [-4, 24, -4],
            "size": [8, 8, 8],
            "uv": [32, 0],
            "inflate": 0.5
          }
        ]
      },
      {
        "name": "rightLeg",
        "parent": "root",
        "pivot": [-1.9, 12, 0],
        "cubes": [
          {
            "origin": [-3.9, 0, -2],
            "size": [4, 12, 4],
            "uv": [0, 16]
          }
        ]
      },
      {
        "name": "rightPants",
        "parent": "rightLeg",
        "pivot": [-1.9, 12, 0],
        "cubes": [
          {
            "origin": [-3.9, 0, -2],
            "size": [4, 12, 4],
            "uv": [0, 32],
            "inflate": 0.25
          }
        ]
      },
      {
        "name": "leftLeg",
        "parent": "root",
        "pivot": [1.9, 12, 0],
        "cubes": [
          {
            "origin": [-0.1, 0, -2],
            "size": [4, 12, 4],
            "uv": [0, 16]
          }
        ],
        "mirror": true
      },
      {
        "name": "leftPants",
        "parent": "leftLeg",
        "pivot": [1.9, 12, 0],
        "cubes": [
          {
            "origin": [-0.1, 0, -2],
            "size": [4, 12, 4],
            "uv": [0, 48],
            "inflate": 0.25
          }
        ]
      },
      {
        "name": "leftArm",
        "parent": "body",
        "pivot": [5, 21.5, 0],
        "cubes": [
          {
            "origin": [4, 11.5, -2],
            "size": [3, 12, 4],
            "uv": [32, 48]
          }
        ]
      },
      {
        "name": "leftSleeve",
        "parent": "leftArm",
        "pivot": [5, 21.5, 0],
        "cubes": [
          {
            "origin": [4, 11.5, -2],
            "size": [3, 12, 4],
            "uv": [48, 48],
            "inflate": 0.25
          }
        ]
      },
      {
        "name": "leftItem",
        "pivot": [6, 14.5, 1],
        "parent": "leftArm"
      },
      {
        "name": "rightArm",
        "parent": "body",
        "pivot": [-5, 21.5, 0],
        "cubes": [
          {
            "origin": [-7, 11.5, -2],
            "size": [3, 12, 4],
            "uv": [40, 16]
          }
        ]
      },
      {
        "name": "rightSleeve",
        "parent": "rightArm",
        "pivot": [-5, 21.5, 0],
        "cubes": [
          {
            "origin": [-7, 11.5, -2],
            "size": [3, 12, 4],
            "uv": [40, 32],
            "inflate": 0.25
          }
        ]
      },
      {
        "name": "rightItem",
        "pivot": [-6, 14.5, 1],
        "locators": {
          "lead_hold": [-6, 14.5, 1]
        },
        "parent": "rightArm"
      },
      {
        "name": "jacket",
        "parent": "body",
        "pivot": [0, 24, 0],
        "cubes": [
          {
            "origin": [-4, 12, -2],
            "size": [8, 12, 4],
            "uv": [16, 32],
            "inflate": 0.25
          }
        ]
      },
      {
        "name": "cape",
        "pivot": [0, 24, -3],
        "parent": "body"
      }
    ]
  }
}
;

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
// Aplica un layout de caras [x,y,w,h] (en píxeles) a un BoxGeometry,
// usando el orden de caras estándar de THREE.BoxGeometry:
// [+x right, -x left, +y top, -y bottom, +z front, -z back]
// ----------------------------
function setBoxUV(geometry, layout, texW, texH) {
  // NOTA: "right"/"left" en el layout se refieren a las regiones de
  // píxeles de la textura tal como las nombra el formato de Minecraft,
  // no directamente al eje +X/-X de three.js. Confirmado con un skin
  // real que esas dos regiones aparecían intercambiadas en el modelo
  // (la cara -X del box recibía los píxeles de "right" y viceversa),
  // así que aquí se emparejan al revés a propósito para que el
  // resultado se vea correcto.
  const order = ["left", "right", "top", "bottom", "front", "back"];
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

// ----------------------------
// Construye el modelo del jugador (Steve/Alex) con la textura aplicada.
// Devuelve un THREE.Group listo para agregar a la escena.
//
// Formato moderno (64x64): se renderiza con la geometría OFICIAL de
// Minecraft (OFFICIAL_PLAYER_GEOMETRY) usando el mismo pipeline genérico
// que ya usan los modelos personalizados de packs 4D/5D
// (buildCustomGeometryModel). Esto reemplaza el layout UV armado a mano
// que se usaba antes, y de paso corrige una inconsistencia real: la
// segunda capa (overlay) usaba un "inflate" fijo de 0.5 para TODAS las
// piezas, cuando en el modelo oficial solo el gorro usa 0.5 -la
// chaqueta, las mangas y los pantalones usan 0.25-, lo que hacía que esa
// capa se viera más separada/inflada de lo que debería.
//
// Formato antiguo (64x32): no tiene segunda capa ni distinción
// wide/slim, así que se sigue armando a mano con el layout clásico
// (no hay geometría oficial moderna para este formato).
// ----------------------------
function buildPlayerModel(texture, isSlim, texW, texH) {

  const legacy = texH < texW; // 64x32 = formato antiguo

  if (!legacy) {
    const identifier = isSlim ? "geometry.npc.alex" : "geometry.npc.steve";
    const model = buildCustomGeometryModel(OFFICIAL_PLAYER_GEOMETRY, identifier, texture, texW, texH);

    if (model) {
      model.position.y = -12; // centra el modelo verticalmente
      return model;
    }
    // Si por algún motivo no se pudo construir, se sigue de largo y se
    // usa el layout clásico como respaldo (no debería pasar nunca).
  }

  const material = new THREE.MeshLambertMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.FrontSide
  });

  const layout = mcLayoutLegacyWide();
  const armW = 4;

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

  group.position.y = -12; // centra el modelo verticalmente

  return group;
}

// ----------------------------
// Ajusta la cámara y los límites de OrbitControls para que el modelo
// completo (sin importar su tamaño real) quede visible dentro del
// encuadre, en vez de usar una distancia fija que puede recortarlo.
// ----------------------------
function fitCameraToObject(camera, controls, object, paddingFactor = 1.6) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const fov = camera.fov * (Math.PI / 180);
  let distance = Math.abs(maxDim / 2 / Math.tan(fov / 2));
  distance *= paddingFactor;

  camera.position.set(center.x, center.y, center.z + distance);
  camera.near = Math.max(distance / 100, 0.1);
  camera.far = distance * 100;
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.minDistance = distance * 0.35;
  controls.maxDistance = distance * 5;
  controls.update();
}

// ==========================================================
// Renderizador GENÉRICO de geometry.json (modelos 4D/5D con huesos y
// cubos personalizados, no solo el modelo estándar Steve/Alex).
// ==========================================================

// Calcula el layout UV estándar de "box UV" de Minecraft a partir de un
// origen [u,v] y el tamaño del cubo [sx,sy,sz]. Esta es la misma fórmula
// que usa el propio formato de skin del jugador (ya verificada contra
// las regiones conocidas del modelo humanoid).
function boxUVFromOrigin(u, v, sx, sy, sz, mirror) {
  const layout = {
    right:  [u,               v + sz, sz, sy],
    front:  [u + sz,          v + sz, sx, sy],
    left:   [u + sz + sx,     v + sz, sz, sy],
    back:   [u + 2 * sz + sx, v + sz, sx, sy],
    top:    [u + sz,          v,      sx, sz],
    bottom: [u + sz + sx,     v,      sx, sz]
  };

  // "mirror" (muy común en modelos hechos con Blockbench, sobre todo en
  // piezas simétricas como brazos/alas): intercambia las regiones UV de
  // las caras izquierda/derecha, igual que hace Minecraft/Blockbench.
  if (mirror) {
    const tmp = layout.right;
    layout.right = layout.left;
    layout.left = tmp;
  }

  return layout;
}

// Layout UV cuando el cubo define coordenadas por cara explícitamente
// (formato "per-face uv" de Bedrock: north/south/east/west/up/down).
function perFaceUV(uvObj) {
  const map = { east: "right", west: "left", south: "front", north: "back", up: "top", down: "bottom" };
  const layout = {};

  Object.entries(map).forEach(([bedrockKey, ourKey]) => {
    const face = uvObj[bedrockKey];
    if (face && Array.isArray(face.uv) && Array.isArray(face.uv_size)) {
      layout[ourKey] = [face.uv[0], face.uv[1], face.uv_size[0], face.uv_size[1]];
    } else {
      layout[ourKey] = [0, 0, 0, 0];
    }
  });

  return layout;
}

// Busca la geometría de "identifier" dentro de geometry.json. Los packs
// 4D/5D usan siempre el formato de ENTIDAD LEGACY (format_version
// "1.8.0" o "1.10.0"): la geometría es una clave de nivel superior cuyo
// valor tiene un array "bones", por ejemplo:
//   { "geometry.egg": { "bones": [...] } }
// No se exige que la clave empiece con "geometry." porque algunos
// archivos 1.8.0 no siguen esa convención de forma estricta; en su
// lugar se detecta cualquier clave de nivel superior cuyo valor sea un
// objeto con un array "bones" (la señal real de que es una geometría).
//
// El formato nuevo ("minecraft:geometry", 1.12.0+) NO se soporta a
// propósito: los skinpacks 4D/5D no lo usan.
//
// IMPORTANTE sobre coordenadas: en TODAS las versiones del formato
// legacy (1.8.0 y 1.10.0 por igual), el "origin" de cada cubo está
// definido en espacio ABSOLUTO del modelo (el mismo espacio que el
// "pivot" del hueso), nunca relativo al pivote. Tratarlo como relativo
// (como se hacía antes) descolocaba las piezas del modelo.
//
// Devuelve { bones, texW, texH } o null si no se encontró nada.
function resolveCustomGeometry(geometryJson, identifier) {
  if (!geometryJson || !identifier) return null;

  const baseNameOf = (id) =>
    String(id).replace(/^geometry\./i, "").split(".").pop().toLowerCase();

  // Normaliza agresivamente: sin "geometry.", sin mayúsculas, y sin
  // separadores (puntos/guiones/guiones bajos/espacios). Esto hace que
  // "geometry.Angel_Geo", "geometry.angelgeo" y "geometry.angel-geo"
  // se reconozcan como el mismo nombre, algo común entre packs 4D/5D
  // hechos a mano donde el identificador de skins.json no coincide letra
  // por letra con la clave real de geometry.json.
  const normalize = (id) =>
    String(id)
      .replace(/^geometry\./i, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  // Recolecta TODAS las geometrías disponibles, sin importar si están
  // como claves de nivel superior o dentro de un array en la raíz
  // (algunos exportadores 1.8.0 atípicos guardan un array de geometrías
  // sueltas en vez de un objeto con claves "geometry.X").
  const candidates = [];

  Object.keys(geometryJson).forEach(k => {
    const val = geometryJson[k];
    if (val && typeof val === "object" && Array.isArray(val.bones)) {
      candidates.push({ key: k, obj: val });
    }
  });

  if (Array.isArray(geometryJson.geometry)) {
    geometryJson.geometry.forEach(g => {
      if (g && typeof g === "object" && Array.isArray(g.bones)) {
        const key = g.name || g.identifier || `geometry.${candidates.length}`;
        candidates.push({ key, obj: g });
      }
    });
  }

  let match =
    candidates.find(c => c.key === identifier) ||
    candidates.find(c => c.key.toLowerCase() === identifier.toLowerCase()) ||
    candidates.find(c => baseNameOf(c.key) === baseNameOf(identifier)) ||
    candidates.find(c => normalize(c.key) === normalize(identifier));

  // Último recurso: coincidencia parcial (una cadena contiene a la
  // otra), para nombres con sufijos/prefijos extra (p. ej. "AngelGeo"
  // dentro de "geometry.angel_geo_v2").
  if (!match) {
    const normId = normalize(identifier);
    if (normId) {
      match = candidates.find(c => {
        const nk = normalize(c.key);
        return nk && (nk.includes(normId) || normId.includes(nk));
      });
    }
  }

  // Si solo hay una geometría en todo el archivo, se usa esa como
  // último recurso aunque el identificador no calce en absoluto
  // (evita un falso "no encontrado" cuando es evidente cuál es).
  if (!match && candidates.length === 1) match = candidates[0];

  if (match) {
    const obj = match.obj;
    return {
      bones: obj.bones || [],
      texW: obj.texturewidth || obj.textureWidth || obj.texture_width || 64,
      texH: obj.textureheight || obj.textureHeight || obj.texture_height || 64
    };
  }

  // El archivo entero ES una única geometría sin clave contenedora
  // (algunos exportadores antiguos guardan {"bones":[...]} directo en
  // la raíz).
  if (Array.isArray(geometryJson.bones) && geometryJson.bones.length) {
    return {
      bones: geometryJson.bones,
      texW: geometryJson.texturewidth || geometryJson.textureWidth || geometryJson.texture_width || 64,
      texH: geometryJson.textureheight || geometryJson.textureHeight || geometryJson.texture_height || 64
    };
  }

  return null;
}

function buildCubeMesh(cube, texW, texH, material, inflate, mirror) {
  const size = cube.size || [0, 0, 0];
  const [sx, sy, sz] = size;
  const infl = (typeof inflate === "number") ? inflate : (cube.inflate || 0);
  const mirr = (typeof cube.mirror === "boolean") ? cube.mirror : !!mirror;

  const geo = new THREE.BoxGeometry(
    Math.max(sx + infl * 2, 0.001),
    Math.max(sy + infl * 2, 0.001),
    Math.max(sz + infl * 2, 0.001)
  );

  let layout;

  if (Array.isArray(cube.uv)) {
    layout = boxUVFromOrigin(cube.uv[0], cube.uv[1], sx, sy, sz, mirr);
  } else if (cube.uv && typeof cube.uv === "object") {
    layout = perFaceUV(cube.uv);
  } else {
    layout = boxUVFromOrigin(0, 0, sx, sy, sz, mirr);
  }

  setBoxUV(geo, layout, texW, texH);
  return new THREE.Mesh(geo, material);
}

// Construye el modelo 3D completo a partir de un identificador de
// geometría (p. ej. "geometry.egg") buscándolo dentro de geometry.json
// (formato nuevo o antiguo), respetando la jerarquía de huesos
// (parent/pivot/rotation) y aplicando la textura de la skin. Devuelve
// null si no se encuentra la geometría o si queda completamente vacía.
function buildCustomGeometryModel(geometryJson, identifier, texture, texW, texH) {

  const resolved = resolveCustomGeometry(geometryJson, identifier);

  if (!resolved) return null;

  const descTexW = resolved.texW || texW;
  const descTexH = resolved.texH || texH;
  const bones = resolved.bones;

  const material = new THREE.MeshLambertMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.FrontSide
  });

  const boneGroups = new Map();
  const bonesByName = new Map();

  bones.forEach(bone => {
    boneGroups.set(bone.name, new THREE.Group());
    bonesByName.set(bone.name, bone);
  });

  const root = new THREE.Group();

  bones.forEach(bone => {
    const group = boneGroups.get(bone.name);
    const pivot = bone.pivot || [0, 0, 0];
    const boneInflate = bone.inflate || 0;
    const boneMirror = !!bone.mirror;

    (bone.cubes || []).forEach(cube => {

      const inflate = (typeof cube.inflate === "number") ? cube.inflate : boneInflate;
      const mesh = buildCubeMesh(cube, descTexW, descTexH, material, inflate, boneMirror);

      const origin = cube.origin || [0, 0, 0];
      const size = cube.size || [0, 0, 0];

      // El "origin" del cubo siempre está en espacio ABSOLUTO del
      // modelo (igual que el "pivot" del hueso), en todas las
      // versiones del formato legacy (1.8.0 y 1.10.0 por igual).
      const center = [
        origin[0] + size[0] / 2,
        origin[1] + size[1] / 2,
        origin[2] + size[2] / 2
      ];

      if (cube.rotation) {

        // El cubo tiene su propio pivote/rotación, independiente del
        // hueso (una pieza dentro del hueso rotada por separado). Se
        // envuelve en un grupo intermedio para rotarlo alrededor de
        // SU PROPIO pivote, no del pivote del hueso.
        const cubePivot = cube.pivot || center;

        const wrapper = new THREE.Group();
        wrapper.position.set(
          cubePivot[0] - pivot[0],
          cubePivot[1] - pivot[1],
          cubePivot[2] - pivot[2]
        );

        const [crx, cry, crz] = cube.rotation;
        wrapper.rotation.set(
          THREE.MathUtils.degToRad(-crx),
          THREE.MathUtils.degToRad(-cry),
          THREE.MathUtils.degToRad(crz)
        );

        mesh.position.set(
          center[0] - cubePivot[0],
          center[1] - cubePivot[1],
          center[2] - cubePivot[2]
        );

        wrapper.add(mesh);
        group.add(wrapper);

      } else {

        mesh.position.set(
          center[0] - pivot[0],
          center[1] - pivot[1],
          center[2] - pivot[2]
        );

        group.add(mesh);

      }

    });

    if (bone.rotation) {
      const [rx, ry, rz] = bone.rotation;
      group.rotation.set(
        THREE.MathUtils.degToRad(-rx),
        THREE.MathUtils.degToRad(-ry),
        THREE.MathUtils.degToRad(rz)
      );
    }

    const parentBone = bone.parent && bonesByName.get(bone.parent);

    if (parentBone) {
      const parentPivot = parentBone.pivot || [0, 0, 0];
      group.position.set(
        pivot[0] - parentPivot[0],
        pivot[1] - parentPivot[1],
        pivot[2] - parentPivot[2]
      );
      boneGroups.get(bone.parent).add(group);
    } else {
      group.position.set(pivot[0], pivot[1], pivot[2]);
      root.add(group);
    }

  });

  // Si la geometría se encontró pero no contiene huesos/cubos visibles
  // (archivo malformado o vacío), tratamos esto igual que "no encontrada"
  // para poder mostrar un mensaje claro en vez de un canvas en blanco.
  let cubeCount = 0;
  root.traverse((obj) => { if (obj.isMesh) cubeCount++; });

  if (cubeCount === 0) return null;

  return root;
}

// Agrega la capa (cape.png) como una caja delgada con el mismo mapeo de
// "caja UV" que el resto del modelo (formato estándar de Minecraft:
// región 10x16 en el origen [0,0] de la textura, profundidad 1), en vez
// de estirar toda la textura sobre un único plano.
//
// El tamaño/posición se adapta al bounding box REAL del modelo en vez de
// usar medidas fijas pensadas para el humanoide estándar: así se ve
// razonablemente bien tanto en el modelo Steve/Alex como en un modelo
// 4D/5D personalizado de cualquier tamaño.
function addCapeMesh(group, capeTexture, texW, texH) {
  const capeMat = new THREE.MeshLambertMaterial({
    map: capeTexture,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.FrontSide
  });

  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // Proporción estándar de la capa (10 de ancho x 16 de alto x 1 de
  // profundidad) escalada según el alto real del modelo, tomando el
  // humanoide estándar (32 de alto total) como referencia.
  const scale = Math.max(size.y / 32, 0.1);
  const capeW = 10 * scale;
  const capeH = 16 * scale;
  const capeD = 1 * scale;

  const capeLayout = boxUVFromOrigin(0, 0, 10, 16, 1);
  const capeGeo = new THREE.BoxGeometry(capeW, capeH, capeD);
  setBoxUV(capeGeo, capeLayout, texW, texH);

  const cape = new THREE.Mesh(capeGeo, capeMat);

  // Cuelga desde cerca de la parte superior del modelo, pegada a la
  // cara trasera real (el punto más "atrás" del bounding box), en vez
  // de una posición fija asumiendo las proporciones del humanoide.
  cape.position.set(
    center.x,
    box.max.y - capeH * 0.55,
    box.min.z - capeD * 0.6
  );
  cape.rotation.x = THREE.MathUtils.degToRad(8);

  group.add(cape);
}

// Identificadores de geometría OFICIALES de Minecraft (no son modelos
// personalizados). Cuando una skin 4D/5D usa una de estas, no tiene
// sentido buscarla en geometry.json: se renderiza con el mismo modelo
// Steve/Alex que usa el visor de skins normales.
const BUILTIN_HUMANOID_IDS = new Set([
  "geometry.humanoid.custom",
  "geometry.humanoid.customslim",
  "geometry.humanoid",
  "geometry.humanoid.slim"
]);

// Abre el visor 3D con la geometría PERSONALIZADA de una skin 4D/5D
// (en vez del modelo genérico Steve/Alex), y agrega la capa si se provee.
// Si el "geometry" de la skin es un identificador oficial de Minecraft
// (geometry.humanoid.custom / .customSlim / etc.), se usa directamente
// el modelo estándar en vez de buscarlo en geometry.json.
// onNotFound (opcional) se llama si la geometría no existe/está vacía,
// para que la interfaz pueda mostrar un mensaje en vez de un canvas
// en blanco sin explicación.
function open3DViewerCustom(canvas, textureDataUrl, geometryJson, identifier, capeDataUrl, onNotFound) {
  dispose3DViewer();

  const width = canvas.clientWidth || 320;
  const height = canvas.clientHeight || 320;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);
  camera.position.set(0, 4, 60);

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
  controls.update();

  const state = { scene, camera, renderer, controls, frameId: null };
  active3DViewer = state;

  const loader = new THREE.TextureLoader();

  loader.load(textureDataUrl, (texture) => {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    const img = texture.image;
    const idLower = (identifier || "").toLowerCase();

    let model;

    if (BUILTIN_HUMANOID_IDS.has(idLower)) {
      // Geometría oficial de Minecraft: no es un modelo personalizado
      // del pack, se usa el mismo renderizado Steve/Alex de las skins
      // normales aunque no exista (ni deba existir) en geometry.json.
      const isSlim = idLower.includes("slim");
      model = buildPlayerModel(texture, isSlim, img.width, img.height);
    } else {
      model = buildCustomGeometryModel(geometryJson, identifier, texture, img.width, img.height);
    }

    if (!model) {
      dispose3DViewer();
      if (typeof onNotFound === "function") onNotFound();
      return;
    }

    scene.add(model);

    const finish = () => fitCameraToObject(camera, controls, model);

    if (capeDataUrl) {
      loader.load(capeDataUrl, (capeTexture) => {
        capeTexture.magFilter = THREE.NearestFilter;
        capeTexture.minFilter = THREE.NearestFilter;
        const capeImg = capeTexture.image;
        addCapeMesh(model, capeTexture, capeImg.width, capeImg.height);
        finish();
      }, undefined, finish);
    } else {
      finish();
    }

    function animate() {
      state.frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }

    animate();

  }, undefined, (err) => {
    console.error("No se pudo cargar la textura:", err);
    dispose3DViewer();
    if (typeof onNotFound === "function") onNotFound();
  });

  return state;
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
  camera.position.set(0, 4, 60);

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

    fitCameraToObject(camera, controls, model);
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
// Analiza un skin pack 4D/5D: a diferencia de parseNormalSkinPack, aquí
// sí interesa el identificador de geometría REAL (para renderizarlo con
// buildCustomGeometryModel), el nombre resuelto desde en_US.lang, y la
// capa (cape) de cada skin si la tiene.
// ----------------------------
async function parseCustomSkinPack(zip) {

  const fileList = Object.keys(zip.files).filter(f => !zip.files[f].dir);
  const skinsPath = fileList.find(f => /(^|\/)skins\.json$/i.test(f));
  const geometryPath = fileList.find(f => /(^|\/)geometry\.json$/i.test(f));

  if (!skinsPath || !geometryPath) return null;

  let skinsJson, geometryJson;

  try {
    skinsJson = JSON.parse(await zip.file(skinsPath).async("string"));
  } catch (e) {
    return null;
  }

  try {
    geometryJson = JSON.parse(await zip.file(geometryPath).async("string"));
  } catch (e) {
    geometryJson = null;
  }

  const pngFiles = fileList.filter(f => /\.png$/i.test(f));

  // Resolver nombres desde en_US.lang, usando el mismo formato que el
  // validador: skin.<localization_name del paquete>.<localization_name de la skin>
  const langPaths = fileList.filter(f => /texts\/.*\.lang$/i.test(f));
  const enUsPath = langPaths.find(f => /(^|\/)en_US\.lang$/i.test(f));

  const enUsEntries = new Map();

  if (enUsPath) {
    const text = await zip.file(enUsPath).async("string");

    text.split(/\r?\n/).forEach(line => {
      line = line.trim();
      if (!line || line.startsWith("#")) return;

      const eq = line.indexOf("=");
      if (eq > 0) {
        enUsEntries.set(line.substring(0, eq).trim(), line.substring(eq + 1).trim());
      }
    });
  }

  const packLocalizationName =
    (typeof skinsJson.localization_name === "string" && skinsJson.localization_name.trim())
      ? skinsJson.localization_name.trim()
      : null;

  const skins = skinsJson.skins || [];
  const results = [];

  for (const skin of skins) {

    const rawName = skin.localization_name || "?";
    const geometryId = skin.geometry || null;

    const expectedKey = packLocalizationName
      ? `skin.${packLocalizationName}.${rawName}`
      : `skin.${rawName}`;

    const matchedKey =
      [...enUsEntries.keys()].find(k => k === expectedKey) ||
      [...enUsEntries.keys()].find(k => k.toLowerCase() === expectedKey.toLowerCase()) ||
      [...enUsEntries.keys()].find(k => k === `skin.${rawName}` || k.endsWith(`.${rawName}`));

    const displayName = matchedKey ? enUsEntries.get(matchedKey) : null;

    let textureDataUrl = null;
    if (skin.texture) {
      const texturePath = pngFiles.find(f =>
        f.split("/").pop().toLowerCase() === skin.texture.toLowerCase()
      );
      if (texturePath) {
        try {
          const base64 = await zip.file(texturePath).async("base64");
          textureDataUrl = `data:image/png;base64,${base64}`;
        } catch (e) {}
      }
    }

    let capeDataUrl = null;
    if (skin.cape) {
      const capePath = pngFiles.find(f =>
        f.split("/").pop().toLowerCase() === skin.cape.toLowerCase()
      );
      if (capePath) {
        try {
          const base64 = await zip.file(capePath).async("base64");
          capeDataUrl = `data:image/png;base64,${base64}`;
        } catch (e) {}
      }
    }

    results.push({
      name: rawName,
      displayName,
      geometryId,
      textureDataUrl,
      hasCape: !!skin.cape,
      capeName: skin.cape || null,
      capeDataUrl
    });
  }

  return { skins: results, geometryJson };
}
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

  // Resolver el nombre visible desde en_US.lang, igual que hace
  // parseCustomSkinPack para los packs 4D/5D. Sin esto, el visor
  // siempre mostraba "(no name in lang)" aunque el paquete sí tuviera
  // el nombre traducido correctamente.
  const langPaths = fileList.filter(f => /texts\/.*\.lang$/i.test(f));
  const enUsPath = langPaths.find(f => /(^|\/)en_US\.lang$/i.test(f));

  const enUsEntries = new Map();

  if (enUsPath) {
    const text = await zip.file(enUsPath).async("string");

    text.split(/\r?\n/).forEach(line => {
      line = line.trim();
      if (!line || line.startsWith("#")) return;

      const eq = line.indexOf("=");
      if (eq > 0) {
        enUsEntries.set(line.substring(0, eq).trim(), line.substring(eq + 1).trim());
      }
    });
  }

  const packLocalizationName =
    (typeof skinsJson.localization_name === "string" && skinsJson.localization_name.trim())
      ? skinsJson.localization_name.trim()
      : null;

  const results = [];

  for (const skin of skins) {

    const name = skin.localization_name || "?";
    const geometry = skin.geometry || "";
    const isSlim = /slim/i.test(geometry);

    const expectedKey = packLocalizationName
      ? `skin.${packLocalizationName}.${name}`
      : `skin.${name}`;

    const matchedKey =
      [...enUsEntries.keys()].find(k => k === expectedKey) ||
      [...enUsEntries.keys()].find(k => k.toLowerCase() === expectedKey.toLowerCase()) ||
      [...enUsEntries.keys()].find(k => k === `skin.${name}` || k.endsWith(`.${name}`));

    const displayName = matchedKey ? enUsEntries.get(matchedKey) : null;

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
      displayName,
      isSlim,
      texturePath,
      textureDataUrl
    });
  }

  return results;
}
