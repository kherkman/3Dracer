// lotuser.js - Lotuser-automallin 3D-määritelmä (Kevyt ja viistoitettu keula)
(function() {
  window.CAR_MODELS = window.CAR_MODELS || {};

  window.CAR_MODELS['lotuser'] = function(bodyColorHex, accentColorHex, carTexUrl) {
    var carGroup = new THREE.Group();

    var baseCol = new THREE.Color(bodyColorHex);
    if (typeof window.texturesEnabled !== 'undefined' && window.texturesEnabled && carTexUrl) {
      baseCol.lerp(new THREE.Color(0xffffff), 0.35);
    }

    var bodyMat = new THREE.MeshStandardMaterial({
      color: baseCol,
      roughness: 0.25,
      metalness: 0.30
    });

    if (typeof window.texturesEnabled !== 'undefined' && window.texturesEnabled && carTexUrl && typeof window.loadTextureWithFallback === 'function') {
      var carTex = window.loadTextureWithFallback(carTexUrl, 1, 1, bodyColorHex, 'AUTOTEX');
      if (carTex) bodyMat.map = carTex;
    }

    var accentMat = new THREE.MeshStandardMaterial({ color: accentColorHex || 0x111111, roughness: 0.3 });

    // --- Lotuser: Kevyt roadster-kori viistoitetulla keulalla ---
    var bodyGeo = new THREE.BoxGeometry(1.65, 0.38, 3.3);
    var pos = bodyGeo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var z = pos.getZ(i);
      if (z > 0.4) { // Etuosa
        var factor = (z - 0.4) / 1.25;
        pos.setX(i, pos.getX(i) * (1.0 - factor * 0.28)); // Viistoitus kulmissa
        pos.setY(i, pos.getY(i) - factor * 0.06);
      }
    }
    bodyGeo.computeVertexNormals();
    bodyGeo.translate(0, 0.35, 0);

    var bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    carGroup.add(bodyMesh);

    // Pyöristetty ohjaamo / tuulilasi
    var cabinGeo = new THREE.SphereGeometry(0.72, 16, 12);
    cabinGeo.scale(0.88, 0.5, 1.2);
    cabinGeo.translate(0, 0.65, -0.1);
    var cabinMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.1, metalness: 0.85 });
    var cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
    cabinMesh.castShadow = true;
    carGroup.add(cabinMesh);

    // Sivun ilmanottoaukot
    var intakeGeo = new THREE.BoxGeometry(0.12, 0.22, 0.5);
    var int1 = new THREE.Mesh(intakeGeo, accentMat);
    int1.position.set(-0.84, 0.38, -0.2);
    var int2 = int1.clone();
    int2.position.x = 0.84;
    carGroup.add(int1); carGroup.add(int2);

    // Pieni takasiipi
    var spoilerGeo = new THREE.BoxGeometry(1.4, 0.05, 0.28);
    spoilerGeo.translate(0, 0.72, -1.52);
    var spoilerMesh = new THREE.Mesh(spoilerGeo, accentMat);
    spoilerMesh.castShadow = true;
    carGroup.add(spoilerMesh);

    // Renkaat
    var wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.24, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    var wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.7 });
    var wheelPos = [
      [-0.82, 0.3, 1.0], [0.82, 0.3, 1.0],
      [-0.82, 0.3, -1.0], [0.82, 0.3, -1.0]
    ];
    for (var i = 0; i < 4; i++) {
      var wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(wheelPos[i][0], wheelPos[i][1], wheelPos[i][2]);
      wheel.castShadow = true;
      carGroup.add(wheel);
    }

    // Ajovalot
    var headLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    var hl1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12), headLightMat);
    hl1.rotateX(Math.PI / 2);
    hl1.position.set(-0.44, 0.44, 1.55);
    var hl2 = hl1.clone(); hl2.position.x = 0.44;
    carGroup.add(hl1); carGroup.add(hl2);

    // Yövalot
    var spot1 = new THREE.SpotLight(0xfff5cc, 2.5, 45, Math.PI / 6, 0.4);
    spot1.position.set(-0.44, 0.44, 1.58);
    spot1.target.position.set(-0.44, 0.1, 15);
    spot1.visible = (typeof currentTimeOfDay !== 'undefined' && currentTimeOfDay === 'yo');
    carGroup.add(spot1); carGroup.add(spot1.target);

    var spot2 = new THREE.SpotLight(0xfff5cc, 2.5, 45, Math.PI / 6, 0.4);
    spot2.position.set(0.44, 0.44, 1.58);
    spot2.target.position.set(0.44, 0.1, 15);
    spot2.visible = (typeof currentTimeOfDay !== 'undefined' && currentTimeOfDay === 'yo');
    carGroup.add(spot2); carGroup.add(spot2.target);

    carGroup.userData.headlight1 = spot1;
    carGroup.userData.headlight2 = spot2;

    // Takavalot
    var tailLightMat = new THREE.MeshBasicMaterial({ color: 0xff1100 });
    var tl1 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), tailLightMat);
    tl1.position.set(-0.5, 0.48, -1.65);
    var tl2 = tl1.clone(); tl2.position.x = 0.5;
    carGroup.add(tl1); carGroup.add(tl2);

    return carGroup;
  };
})();