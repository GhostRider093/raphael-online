// ==========================================================================
//  CHASSEUR  -  avion de chasse pilotable (mode "chasseur")
// --------------------------------------------------------------------------
//  Fichier dedie au perso "chasseur".
//  Rendu : finition METAL MILITAIRE (gris anthracite metallique), pas de
//  texture (l'atlas Meshy etait du bruit colore).
//  La physique de vol (FLIGHT_*, updateFlight, HUD) reste dans rzphzel.js.
//
//  Dependances (scope global) : THREE, window.OBJLoader, player,
//  fitStlToPlayer(), hasRenderableMesh(), removePlayerPlaceholder().
// ==========================================================================

const CHASSEUR_ASSET_DIR = "./perso/chasseur-texture/";
const CHASSEUR_OBJ_FILE = "Meshy_AI_Avion_type_chasseur_d_0708033342_texture.obj?v=obj-texture-20260708c";
const CHASSEUR_TEXTURE_FILE = "Meshy_AI_Avion_type_chasseur_d_0708033342_texture.png?v=obj-texture-20260708c";
let chasseurModel = null;
let chasseurTexture = null;

function getChasseurTexture() {
  if (chasseurTexture) return chasseurTexture;
  chasseurTexture = new THREE.TextureLoader().setPath(CHASSEUR_ASSET_DIR).load(
    CHASSEUR_TEXTURE_FILE,
    () => {
      document.body.dataset.fighterTexture = "loaded";
      console.log("[chasseur] texture PNG chargee");
    },
    undefined,
    error => {
      document.body.dataset.fighterTexture = "error";
      console.error("[chasseur] ECHEC chargement texture PNG :", error);
    }
  );
  if (THREE.SRGBColorSpace) chasseurTexture.colorSpace = THREE.SRGBColorSpace;
  else chasseurTexture.encoding = THREE.sRGBEncoding;
  chasseurTexture.anisotropy = 8;
  document.body.dataset.fighterTexture = "loading";
  return chasseurTexture;
}

function makeChasseurTextureMaterial() {
  return new THREE.MeshStandardMaterial({
    map: getChasseurTexture(),
    color: 0x9fb3c2,
    roughness: 0.72,
    metalness: 0.08,
    side: THREE.DoubleSide
  });
}

function prepareChasseurObject(obj) {
  const material = makeChasseurTextureMaterial();
  let texturedMeshes = 0;
  obj.traverse(node => {
    if (!(node.isMesh || node.type === "Mesh" || (node.geometry && node.material))) return;
    node.castShadow = true;
    node.receiveShadow = true;
    node.frustumCulled = false;
    node.material = material;
    texturedMeshes++;
  });
  document.body.dataset.fighterTexturedMeshes = String(texturedMeshes);
}

function loadTexturedChasseurObject(onLoaded, label) {
  if (!window.OBJLoader) {
    const retry = () => loadTexturedChasseurObject(onLoaded, label);
    if (!window.OBJLoader) window.addEventListener("objloaderready", retry, { once: true });
    return;
  }

  new window.OBJLoader()
    .setPath(CHASSEUR_ASSET_DIR)
    .load(
      CHASSEUR_OBJ_FILE,
      obj => {
        prepareChasseurObject(obj);
        onLoaded(obj);
        console.log(`[${label}] OBJ texture charge`);
      },
      undefined,
      error => console.error(`[${label}] ECHEC chargement OBJ texture :`, error)
    );
}

function loadChasseurModel() {
  loadTexturedChasseurObject(
    obj => {
      const wrapper = new THREE.Group();
      wrapper.add(obj);
      obj.rotation.set(0, -Math.PI / 2, 0);   // orientation OBJ Meshy deja validee
      fitStlToPlayer(wrapper, 5.0);
      chasseurModel = wrapper;
      player.add(wrapper);
      if (hasRenderableMesh(wrapper)) removePlayerPlaceholder();
      addChasseurThrusters(player, wrapper);
    },
    "chasseur"
  );
}

// ── REACTEURS / TUYERES ──────────────────────────────────────────────────
let chasseurThrusters = null;
let chasseurThrusterLoopOn = false;

function makeChasseurThruster(len, rad) {
  const g = new THREE.Group();
  const nozzle = new THREE.Mesh(
    new THREE.TorusGeometry(rad * 1.05, rad * 0.14, 10, 24),
    new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: 0.42, metalness: 0.7 })
  );
  g.add(nozzle);
  const cone = (r, h, color, op) => {
    const m = new THREE.Mesh(
      new THREE.ConeGeometry(r, h, 18, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    m.rotation.x = -Math.PI / 2;   // apex vers +Z = vers l'arriere
    m.position.z = h / 2;          // base a la tuyere (origine), s'etend vers l'arriere
    return m;
  };
  g.add(cone(rad,       len,      0xff6a10, 0.5));   // halo orange
  g.add(cone(rad * 0.6, len * 0.78, 0xffae2e, 0.7)); // coeur orange
  g.add(cone(rad * 0.3, len * 0.5, 0xfff3b0, 0.95)); // coeur jaune-blanc
  return g;
}

function addChasseurThrusters(player, wrapper) {
  player.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(wrapper);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const rearZ = box.max.z;                 // nez en -Z -> arriere en +Z
  const len = size.z * 0.20;
  const rad = Math.max(0.06, size.x * 0.04);
  const spread = size.x * 0.15;
  const y = center.y - size.y * 0.05;
  const group = new THREE.Group();
  [-spread, spread].forEach(dx => {
    const t = makeChasseurThruster(len, rad);
    t.position.copy(player.worldToLocal(new THREE.Vector3(center.x + dx, y, rearZ - size.z * 0.005)));
    group.add(t);
  });
  player.add(group);
  chasseurThrusters = group;
  if (!chasseurThrusterLoopOn) { chasseurThrusterLoopOn = true; animateChasseurThrusters(); }
}

function animateChasseurThrusters() {
  requestAnimationFrame(animateChasseurThrusters);
  const g = chasseurThrusters;
  if (!g || !g.parent) return;
  const t = performance.now() * 0.001;
  let throttle = 0.45;
  if (typeof flightSpeed === "number") throttle = Math.max(0.25, Math.min(1, Math.abs(flightSpeed) / 72));
  const flick = 0.9 + Math.sin(t * 45) * 0.07 + Math.sin(t * 27) * 0.05;
  g.children.forEach(thr => {
    thr.scale.z = (0.6 + throttle * 0.8) * flick;
    thr.scale.x = thr.scale.y = 0.9 + (flick - 0.9);
  });
}
