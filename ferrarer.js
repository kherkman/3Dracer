// ferrarer.js - Ferrarer-automallin 3D-määritelmä
(function() {
  window.CAR_MODELS = window.CAR_MODELS || {};

  window.CAR_MODELS['ferrarer'] = function(bodyColorHex, accentColorHex, carTexUrl) {
    var carGroup = new THREE.Group();

    // Korimateriaali (aerodynaaminen italialainen urheiluauto)
    var bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColorHex,
      roughness: 0.18,
      metalness: 0.45
    });

    if (typeof texturesEnabled !== 'undefined' && texturesEnabled && carTexUrl && typeof loadTextureWithFallback === 'function') {
      var carTex = loadTextureWithFallback(carTexUrl, 1, 1, bodyColorHex, 'AUTOTEX');
      if (carTex) bodyMat.map = carTex;
    }

    var accentMat = new THREE.MeshStandardMaterial({ color: accentColorHex || 0x111111, roughness: 0.3 });

    // --- Korin muotoilu ---
    // Keskirunko
    var bodyGeo = new THREE.BoxGeometry(1.62, 0.38, 3.6);
    bodyGeo.translate(0, 0.36, 0);
    var bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    carGroup.add(bodyMesh);

    // Kaareva keula
    var hoodGeo = new THREE.CylinderGeometry(0.72, 0.8, 1.2, 16);
    hoodGeo.scale(1.0, 0.3, 1.0);
    hoodGeo.translate(0, 0.38, 1.2);
    var hoodMesh = new THREE.Mesh(hoodGeo, bodyMat);
    hoodMesh.castShadow = true;
    carGroup.add(hoodMesh);

    // Aerodynaaminen ohjaamo
    var cabinGeo = new THREE.SphereGeometry(0.78, 16, 12);
    cabinGeo.scale(0.85, 0.58, 1.35);
    cabinGeo.translate(0, 0.68, -0.05);
    var cabinMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.08, metalness: 0.85 });
    var cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
    cabinMesh.castShadow = true;
    carGroup.add(cabinMesh);

    // Lasinen takamoottorinsuojus
    var engineGlassGeo = new THREE.BoxGeometry(0.8, 0.08, 0.9);
    engineGlassGeo.translate(0, 0.62, -0.85);
    var glassMat = new THREE.MeshStandardMaterial({ color: 0x335566, roughness: 0.1, transparent: true, opacity: 0.7 });
    var glassMesh = new THREE.Mesh(engineGlassGeo, glassMat);
    carGroup.add(glassMesh);

    // Takaspoileri
    var spoilerGeo = new THREE.BoxGeometry(1.5, 0.08, 0.3);
    spoilerGeo.translate(0, 0.76, -1.72);
    var spoilerMesh = new THREE.Mesh(spoilerGeo, accentMat);
    carGroup.add(spoilerMesh);

    // Renkaat
    var wheelGeo = new THREE.CylinderGeometry(0.31, 0.31, 0.25, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    var wheelMat = new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.7 });
    var wheelPos = [
      [-0.86, 0.31, 1.05], [0.86, 0.31, 1.05],
      [-0.86, 0.31, -1.05], [0.86, 0.31, -1.05]
    ];
    for (var i = 0; i < 4; i++) {
      var wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(wheelPos[i][0], wheelPos[i][1], wheelPos[i][2]);
      wheel.castShadow = true;
      carGroup.add(wheel);
    }

    // Mantelinmuotoiset etuvalot
    var headLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    var hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.35), headLightMat);
    hl1.rotation.y = -0.15;
    hl1.position.set(-0.52, 0.44, 1.48);
    var hl2 = hl1.clone();
    hl2.rotation.y = 0.15;
    hl2.position.x = 0.52;
    carGroup.add(hl1); carGroup.add(hl2);

    // Yövalot
    var spot1 = new THREE.SpotLight(0xfff5cc, 2.5, 48, Math.PI / 6, 0.4);
    spot1.position.set(-0.52, 0.44, 1.55);
    spot1.target.position.set(-0.52, 0.1, 15);
    spot1.visible = (typeof currentTimeOfDay !== 'undefined' && currentTimeOfDay === 'yo');
    carGroup.add(spot1); carGroup.add(spot1.target);

    var spot2 = new THREE.SpotLight(0xfff5cc, 2.5, 48, Math.PI / 6, 0.4);
    spot2.position.set(0.52, 0.44, 1.55);
    spot2.target.position.set(0.52, 0.1, 15);
    spot2.visible = (typeof currentTimeOfDay !== 'undefined' && currentTimeOfDay === 'yo');
    carGroup.add(spot2); carGroup.add(spot2.target);

    carGroup.userData.headlight1 = spot1;
    carGroup.userData.headlight2 = spot2;

    // Pyöreät tuplatakavalot
    var tailLightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    var tGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.04, 12);
    tGeo.rotateX(Math.PI / 2);

    var t1 = new THREE.Mesh(tGeo, tailLightMat); t1.position.set(-0.58, 0.48, -1.81);
    var t2 = new THREE.Mesh(tGeo, tailLightMat); t2.position.set(-0.42, 0.48, -1.81);
    var t3 = new THREE.Mesh(tGeo, tailLightMat); t3.position.set(0.42, 0.48, -1.81);
    var t4 = new THREE.Mesh(tGeo, tailLightMat); t4.position.set(0.58, 0.48, -1.81);
    carGroup.add(t1); carGroup.add(t2); carGroup.add(t3); carGroup.add(t4);

    return carGroup;
  };
})();