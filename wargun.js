// ==========================================================================
//  WARGUN  -  perso pilotable (mode "wargun")
// --------------------------------------------------------------------------
//  Fichier dedie au perso "wargun" (meme modele d'avion que le chasseur).
//  Rendu : finition METAL MILITAIRE (gris anthracite metallique), pas de
//  texture.
//
//  Dependances (scope global) : THREE, window.STLLoader, player,
//  fitStlToPlayer(), hasRenderableMesh(), removePlayerPlaceholder().
// ==========================================================================

const WARGUN_MODEL_PATH = "./perso/chasseur2.stl?v=stl-20260708";
let wargunModel = null;

function wargunMetalMaterial(geometry) {
  const hasVertexColors = !!(geometry && geometry.hasColors && geometry.getAttribute && geometry.getAttribute("color"));
  return new THREE.MeshStandardMaterial({
    color: hasVertexColors ? 0xffffff : 0x3a4147,
    vertexColors: hasVertexColors,
    transparent: hasVertexColors && geometry.alpha < 1,
    opacity: hasVertexColors ? (geometry.alpha || 1) : 1,
    roughness: 0.55,
    metalness: 0.35,
    side: THREE.DoubleSide
  });
}

function loadWargunModel() {
  if (!window.STLLoader) {
    window.addEventListener("stlloaderready", loadWargunModel, { once: true });
    return;
  }
  new window.STLLoader().load(
    WARGUN_MODEL_PATH,
    geometry => {
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, wargunMetalMaterial(geometry));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;

      const wrapper = new THREE.Group();
      wrapper.add(mesh);
      mesh.rotation.set(-Math.PI / 2, 0, 0);  // Z STL = hauteur, nez vers l'avant (-Z)
      fitStlToPlayer(wrapper, 5.0);
      wargunModel = wrapper;
      player.add(wrapper);
      if (hasRenderableMesh(wrapper)) removePlayerPlaceholder();
      if (typeof addChasseurThrusters === "function") addChasseurThrusters(player, wrapper);
      console.log("[wargun] STL charge", geometry.hasColors ? "(couleurs STL)" : "(finition metal militaire)");
    },
    undefined,
    error => console.error("[wargun] ECHEC chargement STL :", error)
  );
}
