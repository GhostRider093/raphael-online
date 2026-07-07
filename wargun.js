// ==========================================================================
//  WARGUN  -  perso pilotable (mode "wargun")
// --------------------------------------------------------------------------
//  Fichier dedie au perso "wargun" (meme modele d'avion que le chasseur).
//  Rendu : finition METAL MILITAIRE (gris anthracite metallique), pas de
//  texture.
//
//  Dependances (scope global) : THREE, window.OBJLoader, player,
//  fitStlToPlayer(), hasRenderableMesh(), removePlayerPlaceholder().
// ==========================================================================

const WARGUN_MODEL_PATH = "./perso/chasseur.obj?v=wargun-shared-model-20260708";
let wargunModel = null;

function wargunMetalMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x3a4147,     // gunmetal SOMBRE : ne peut pas cramer en blanc sous la lumiere
    roughness: 0.55,
    metalness: 0.35
  });
}

function loadWargunModel() {
  if (!window.OBJLoader) {
    window.addEventListener("objloaderready", loadWargunModel, { once: true });
    return;
  }
  new window.OBJLoader().load(
    WARGUN_MODEL_PATH,
    obj => {
      obj.traverse(node => {
        if (!node.isMesh) return;
        node.castShadow = true;
        node.receiveShadow = true;
        node.frustumCulled = false;
        node.material = wargunMetalMaterial();
      });
      const wrapper = new THREE.Group();
      wrapper.add(obj);
      obj.rotation.set(0, -Math.PI / 2, 0);   // a plat, nez vers l'avant (-Z), ailes horizontales
      fitStlToPlayer(wrapper, 5.0);
      wargunModel = wrapper;
      player.add(wrapper);
      if (hasRenderableMesh(wrapper)) removePlayerPlaceholder();
      console.log("[wargun] OBJ charge (finition metal militaire)");
    },
    undefined,
    error => console.error("[wargun] ECHEC chargement OBJ :", error)
  );
}
