/* =========================================================================
   renderer5d.js — Escena Three.js para modelos legacy 4D/5D de Bedrock

   Responsable EXCLUSIVAMENTE de:
     - escena, cámara, luces, OrbitControls
     - construcción de malla desde bones/cubes (4D) y bones/poly_mesh (5D)
     - texturas, wireframe, cuadrícula, pivotes, auto-rotación, encuadre

   Esta es la misma lógica de reconstrucción de malla que ya funcionaba
   en el prototipo original (box UV estándar de Minecraft, UV por cara,
   mirror heredado del hueso, inflate, jerarquía de huesos resuelta con
   quaterniones en vez de anidado automático de Object3D) — no se cambió
   ningún cálculo, solo se movió a este módulo.

   NOTA DE ALCANCE: este renderer sigue usándose para 5D (poly_mesh).
   También puede dibujar 4D (cubes) si algún día se necesita una vista
   previa local, pero el camino "oficial" para 4D en SkinGeo Viewer es
   el panel de Blockbench (ver blockbench.js) — ver viewer.js.
   ========================================================================= */

const Renderer5D = (function () {

  const state = {
    scene: null, camera: null, renderer: null, controls: null,
    grid: null,
    modelRoot: null,
    host: null,
    textureImg: null,
    spinning: true,
    wireframe: false,
    showGrid: true,
    showPivots: false,
    frameId: null,
    running: false
  };

  /* ----------------------- UV / geometría de cubos ----------------------- */

  function boxUV(u, v, dx, dy, dz, texW, texH) {
    const px = 1 / texW, py = 1 / texH;
    const rect = (x, y, w, h) => ({
      u0: (x) * px, v0: (y) * py,
      u1: (x + w) * px, v1: (y + h) * py
    });
    return {
      up:    rect(u + dz,          v,           dx, dz),
      down:  rect(u + dz + dx,     v,           dx, dz),
      east:  rect(u,                v + dz,      dz, dy),
      north: rect(u + dz,          v + dz,      dx, dy),
      west:  rect(u + dz + dx,     v + dz,      dz, dy),
      south: rect(u + dz + dx + dz, v + dz,      dx, dy)
    };
  }

  function perFaceUV(uvObj, u, v, dx, dy, dz, texW, texH) {
    const fallback = boxUV(u || 0, v || 0, dx, dy, dz, texW, texH);
    const px = 1 / texW, py = 1 / texH;
    const out = Object.assign({}, fallback);
    const faceKeys = { north: "north", south: "south", east: "east", west: "west", up: "up", down: "down" };
    Object.keys(faceKeys).forEach(face => {
      const def = uvObj[face];
      if (!def) return;
      const [fu, fv] = def.uv || [0, 0];
      const [fw, fh] = def.uv_size || [1, 1];
      out[face] = {
        u0: fu * px, v0: fv * py,
        u1: (fu + fw) * px, v1: (fv + fh) * py
      };
    });
    return out;
  }

  // Orden de grupos de BoxGeometry: 0 +x(east) 1 -x(west) 2 +y(up) 3 -y(down) 4 +z(south) 5 -z(north)
  function applyBoxUV(geometry, uvMap, mirror) {
    const uvAttr = geometry.attributes.uv;
    const order = ["east", "west", "up", "down", "south", "north"];
    for (let face = 0; face < 6; face++) {
      let f = uvMap[order[face]];
      if (!f) continue;
      let { u0, v0, u1, v1 } = f;
      if (mirror) {
        if (order[face] === "east") f = uvMap.west;
        else if (order[face] === "west") f = uvMap.east;
        ({ u0, v0, u1, v1 } = f);
        [u0, u1] = [u1, u0];
      }
      uvAttr.setXY(face * 4 + 0, u0, v1);
      uvAttr.setXY(face * 4 + 1, u1, v1);
      uvAttr.setXY(face * 4 + 2, u0, v0);
      uvAttr.setXY(face * 4 + 3, u1, v0);
    }
    uvAttr.needsUpdate = true;
  }

  /* ----------------------- jerarquía de huesos ----------------------- */

  function eulerToQuatThree(rotArr) {
    const r = rotArr || [0, 0, 0];
    const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -THREE.Math.degToRad(r[0]));
    const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -THREE.Math.degToRad(r[1]));
    const qz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1),  THREE.Math.degToRad(r[2]));
    return qz.multiply(qy).multiply(qx);
  }

  function computeWorldTransforms(bones) {
    const byName = {};
    bones.forEach(b => byName[b.name] = b);
    const world = {};

    function resolve(name) {
      if (world[name]) return world[name];
      const b = byName[name];
      if (!b) return null;
      const pivot = b.pivot || [0, 0, 0];
      const ownQuat = eulerToQuatThree(b.rotation);

      if (!b.parent || !byName[b.parent]) {
        world[name] = {
          pos: new THREE.Vector3(pivot[0] / 16, pivot[1] / 16, pivot[2] / 16),
          quat: ownQuat
        };
        return world[name];
      }

      const parentWorld = resolve(b.parent);
      const parentPivot = byName[b.parent].pivot || [0, 0, 0];
      const localOffset = new THREE.Vector3(
        (pivot[0] - parentPivot[0]) / 16,
        (pivot[1] - parentPivot[1]) / 16,
        (pivot[2] - parentPivot[2]) / 16
      ).applyQuaternion(parentWorld.quat);

      world[name] = {
        pos: parentWorld.pos.clone().add(localOffset),
        quat: parentWorld.quat.clone().multiply(ownQuat)
      };
      return world[name];
    }

    bones.forEach(b => resolve(b.name));
    return world;
  }

  /* ----------------------- construcción de malla ----------------------- */

  function buildCubeWorldMesh(cube, bonePivot, boneWorld, texW, texH, material) {
    const size = cube.size || [0, 0, 0];
    const origin = cube.origin || [0, 0, 0];
    const inflate = cube.inflate || 0;
    const uv = cube.uv;

    const dx = size[0], dy = size[1], dz = size[2];
    const w = dx + inflate * 2, h = dy + inflate * 2, d = dz + inflate * 2;
    if (w < 0 || h < 0 || d < 0) return null;

    const EPS = 0.01;
    const geometry = new THREE.BoxGeometry(Math.max(w, EPS), Math.max(h, EPS), Math.max(d, EPS));

    let uvMap;
    if (Array.isArray(uv)) {
      uvMap = boxUV(uv[0], uv[1], dx, dy, dz, texW, texH);
    } else if (uv && typeof uv === "object") {
      uvMap = perFaceUV(uv, 0, 0, dx, dy, dz, texW, texH);
    } else {
      uvMap = boxUV(0, 0, dx, dy, dz, texW, texH);
    }
    applyBoxUV(geometry, uvMap, !!cube.mirror);

    const mesh = new THREE.Mesh(geometry, material);
    const cubeCenterLocal = [origin[0] + dx / 2, origin[1] + dy / 2, origin[2] + dz / 2];

    let effectivePivot = bonePivot;
    let finalQuat = boneWorld.quat.clone();
    if (cube.rotation) {
      effectivePivot = cube.pivot || origin;
      finalQuat = finalQuat.multiply(eulerToQuatThree(cube.rotation));
    }

    const pivotOffsetFromBone = new THREE.Vector3(
      (effectivePivot[0] - bonePivot[0]) / 16,
      (effectivePivot[1] - bonePivot[1]) / 16,
      (effectivePivot[2] - bonePivot[2]) / 16
    ).applyQuaternion(boneWorld.quat);
    const pivotWorldPos = boneWorld.pos.clone().add(pivotOffsetFromBone);

    const centerOffset = new THREE.Vector3(
      (cubeCenterLocal[0] - effectivePivot[0]) / 16,
      (cubeCenterLocal[1] - effectivePivot[1]) / 16,
      (cubeCenterLocal[2] - effectivePivot[2]) / 16
    ).applyQuaternion(finalQuat);

    mesh.position.copy(pivotWorldPos).add(centerOffset);
    mesh.quaternion.copy(finalQuat);
    return mesh;
  }

  function buildPolyMeshWorld(pm, bonePivot, boneWorld, texW, texH, material) {
    const positions = pm.positions || [];
    const normals = pm.normals || [];
    const uvs = pm.uvs || [];
    const polys = pm.polys || [];
    if (!positions.length || !polys.length) return null;

    const outPos = [], outNorm = [], outUV = [];

    function pushVertex(ref) {
      const [pi, ni, ui] = ref;
      const p = positions[pi] || [0, 0, 0];
      const local = new THREE.Vector3(
        (p[0] - bonePivot[0]) / 16,
        (p[1] - bonePivot[1]) / 16,
        (p[2] - bonePivot[2]) / 16
      ).applyQuaternion(boneWorld.quat);
      const world = boneWorld.pos.clone().add(local);
      outPos.push(world.x, world.y, world.z);

      const n = normals[ni] || [0, 1, 0];
      const nRot = new THREE.Vector3(n[0], n[1], n[2]).applyQuaternion(boneWorld.quat);
      outNorm.push(nRot.x, nRot.y, nRot.z);

      const uv = uvs[ui] || [0, 0];
      if (pm.normalized_uvs) {
        outUV.push(uv[0], 1 - uv[1]);
      } else {
        outUV.push(uv[0] / texW, 1 - (uv[1] / texH));
      }
    }

    polys.forEach(poly => {
      if (poly.length === 3) {
        poly.forEach(pushVertex);
      } else if (poly.length === 4) {
        [poly[0], poly[1], poly[2]].forEach(pushVertex);
        [poly[0], poly[2], poly[3]].forEach(pushVertex);
      }
    });

    if (!outPos.length) return null;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(outPos, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(outNorm, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(outUV, 2));
    return new THREE.Mesh(geometry, material);
  }

  /* ----------------------- escena / ciclo de render ----------------------- */

  function ensureScene() {
    if (state.renderer) return;
    const host = state.host;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, host.clientWidth / host.clientHeight, 0.01, 100);
    camera.position.set(2.4, 1.8, 2.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    host.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.9, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.update();

    scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1d24, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 0.6);
    key.position.set(3, 5, 2);
    scene.add(key);

    const grid = new THREE.GridHelper(6, 24, 0x22d3ee, 0x1c2028);
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    scene.add(grid);

    state.scene = scene;
    state.camera = camera;
    state.renderer = renderer;
    state.controls = controls;
    state.grid = grid;

    window.addEventListener("resize", resize);
  }

  function resize() {
    if (!state.renderer || !state.host) return;
    const host = state.host;
    if (!host.clientWidth || !host.clientHeight) return;
    state.camera.aspect = host.clientWidth / host.clientHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(host.clientWidth, host.clientHeight);
  }

  function frameCamera() {
    if (!state.modelRoot || !state.camera) return;
    const box = new THREE.Box3().setFromObject(state.modelRoot);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const dist = maxDim * 2.1;
    state.camera.position.set(center.x + dist * 0.55, center.y + dist * 0.35, center.z + dist * 0.55);
    state.controls.target.copy(center);
    state.controls.update();
  }

  function animate() {
    if (!state.running) return;
    state.frameId = requestAnimationFrame(animate);
    // ensureScene() puede no haberse llamado todavía (p.ej. show() se
    // dispara al cargar la página, antes de subir ningún modelo) — sin
    // esta guarda, state.controls/renderer/camera son null aquí y se
    // rompe con "Cannot read properties of null (reading 'update')".
    if (!state.controls || !state.renderer || !state.camera) return;
    if (state.modelRoot && state.spinning) {
      state.modelRoot.rotation.y += 0.006;
    }
    state.controls.update();
    state.renderer.render(state.scene, state.camera);
  }

  function clearModel() {
    if (state.modelRoot) {
      state.scene.remove(state.modelRoot);
      state.modelRoot.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (obj.material.map) obj.material.map.dispose();
          obj.material.dispose();
        }
      });
      state.modelRoot = null;
    }
  }

  function applyWireframe() {
    if (!state.modelRoot) return;
    state.modelRoot.traverse(obj => {
      if (obj.material) obj.material.wireframe = state.wireframe;
    });
  }

  /* ----------------------- API pública ----------------------- */

  function init(hostEl) {
    state.host = hostEl;
  }

  function setTexture(img) {
    state.textureImg = img || null;
  }

  // Reconstruye la escena a partir de una geoDef normalizada
  // ({ id, texture_width, texture_height, bones, type }).
  // Devuelve estadísticas { bones, cubes, polys, meshCount, bboxSize }.
  function loadModel(geoDef) {
    ensureScene();

    const texW = geoDef.texture_width || 64;
    const texH = geoDef.texture_height || 64;
    const bones = geoDef.bones || [];

    clearModel();

    let material;
    let textureMismatch = null;
    if (state.textureImg) {
      const canvas = document.createElement("canvas");
      canvas.width = state.textureImg.width;
      canvas.height = state.textureImg.height;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(state.textureImg, 0, 0);
      const tex = new THREE.CanvasTexture(canvas);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.flipY = false;
      material = new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.15, side: THREE.DoubleSide });

      if (state.textureImg.width !== texW || state.textureImg.height !== texH) {
        textureMismatch = { texW: state.textureImg.width, texH: state.textureImg.height, expectedW: texW, expectedH: texH };
      }
    } else {
      material = new THREE.MeshLambertMaterial({ color: 0x3a4150 });
    }

    const worldTransforms = computeWorldTransforms(bones);
    const root = new THREE.Group();
    root.name = "model_root";

    bones.forEach(b => {
      const boneWorld = worldTransforms[b.name];
      if (!boneWorld) return;
      const bonePivot = b.pivot || [0, 0, 0];

      (b.cubes || []).forEach(cube => {
        const effectiveCube = ("mirror" in cube) ? cube : Object.assign({}, cube, { mirror: !!b.mirror });
        const mesh = buildCubeWorldMesh(effectiveCube, bonePivot, boneWorld, texW, texH, material);
        if (mesh) root.add(mesh);
      });

      if (b.poly_mesh) {
        const meshObj = buildPolyMeshWorld(b.poly_mesh, bonePivot, boneWorld, texW, texH, material);
        if (meshObj) root.add(meshObj);
      }

      if (state.showPivots) {
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.035, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xf5a623 })
        );
        dot.position.copy(boneWorld.pos);
        root.add(dot);
      }
    });

    root.rotation.y = Math.PI;
    state.scene.add(root);
    state.modelRoot = root;
    applyWireframe();

    const totalCubes = bones.reduce((n, b) => n + (b.cubes ? b.cubes.length : 0), 0);
    const totalPolys = bones.reduce((n, b) => n + (b.poly_mesh && b.poly_mesh.polys ? b.poly_mesh.polys.length : 0), 0);

    let meshCount = 0;
    root.traverse(o => { if (o.isMesh) meshCount++; });
    let bboxSize = null;
    if (meshCount) {
      const bbox = new THREE.Box3().setFromObject(root);
      bboxSize = bbox.getSize(new THREE.Vector3());
    }

    frameCamera();

    return {
      bones: bones.length,
      cubes: totalCubes,
      polys: totalPolys,
      meshCount,
      bboxSize,
      textureMismatch
    };
  }

  function setWireframe(v) { state.wireframe = v; applyWireframe(); }
  function setGrid(v) { state.showGrid = v; if (state.grid) state.grid.visible = v; }
  function setSpin(v) { state.spinning = v; }
  function setShowPivots(v) { state.showPivots = v; }

  function show() {
    // Garantiza que la escena (renderer/cámara/controles) exista antes de
    // arrancar el bucle de animación, aunque todavía no se haya cargado
    // ningún modelo — es lo que evita el crash de animate() al abrir la
    // página con el panel 5D visible por defecto.
    ensureScene();
    state.running = true;
    if (!state.frameId) animate();
    resize();
  }
  function hide() {
    state.running = false;
    if (state.frameId) { cancelAnimationFrame(state.frameId); state.frameId = null; }
  }

  return {
    init, setTexture, loadModel, clearModel,
    setWireframe, setGrid, setSpin, setShowPivots,
    frameCamera, resize, show, hide
  };
})();
