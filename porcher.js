// porcher.js - Porcher-automallin 3D-määritelmä (Viistoitettu keula)
(function() {
  window.CAR_MODELS = window.CAR_MODELS || {};

  window.CAR_MODELS['porcher'] = function(bodyColorHex, accentColorHex, carTexUrl) {
    var carGroup = new THREE.Group();

    // Pohjavärin ja tekstuurin sekoitus
    var baseCol = new THREE.Color(bodyColorHex);
    if (typeof window.texturesEnabled !== 'undefined' && window.texturesEnabled && carTexUrl) {
      baseCol.lerp(new THREE.Color(0xffffff), 0.35);
    }

    var bodyMat = new THREE.MeshStandardMaterial({
      color: baseCol,
      roughness: 0.28,
      metalness: 0.25
    });

    if (typeof window.texturesEnabled !== 'undefined' && window.texturesEnabled && carTexUrl && typeof window.loadTextureWithFallback === 'function') {
      var carTex = window.loadTextureWithFallback(carTexUrl, 1, 1, bodyColorHex, 'AUTOTEX');
      if (carTex) bodyMat.map = carTex;
    }

    // --- Korin muotoilu (Porcher: Matala runko viistoitetulla keulalla) ---
    var bodyGeo = new THREE.BoxGeometry(1.8, 0.42, 3.6);
    var pos = bodyGeo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var z = pos.getZ(i);
      if (z > 0.5) { // Etuosa
        var factor = (z - 0.5) / 1.3;
        var x = pos.getX(i);
        // Kauniisti viistoitettu ja pyöristetty etuosa
        pos.setX(i, x * (1.0 - factor * 0.30));
        pos.setY(i, pos.getY(i) - factor * 0.08);
      }
    }
    bodyGeo.computeVertexNormals();
    bodyGeo.translate(0, 0.38, 0);

    var bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    carGroup.add(bodyMesh);

    // Pyöristetty ohjaamo/katto
    var cabinGeo = new THREE.SphereGeometry(0.82, 16, 12);
    cabinGeo.scale(0.9, 0.55, 1.3);
    cabinGeo.translate(0, 0.72, -0.2);
    var cabinMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.1, metalness: 0.8 });
    var cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
    cabinMesh.castShadow = true;
    carGroup.add(cabinMesh);

    // Takasiipi
    var spoilerGeo = new THREE.BoxGeometry(1.65, 0.06, 0.4);
    spoilerGeo.translate(0, 0.85, -1.65);
    var accentMat = new THREE.MeshStandardMaterial({ color: accentColorHex || 0x111111, roughness: 0.4 });
    var spoilerMesh = new THREE.Mesh(spoilerGeo, accentMat);
    spoilerMesh.castShadow = true;
    carGroup.add(spoilerMesh);

    // Renkaat
    var wheelGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.28, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    var wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.7 });
    var wheelPos = [
      [-0.88, 0.33, 1.1], [0.88, 0.33, 1.1],
      [-0.88, 0.33, -1.1], [0.88, 0.33, -1.1]
    ];
    for (var i = 0; i < 4; i++) {
      var wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(wheelPos[i][0], wheelPos[i][1], wheelPos[i][2]);
      wheel.castShadow = true;
      carGroup.add(wheel);
    }

    // Ajovalot
    var headLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    var hl1 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), headLightMat);
    hl1.scale.set(1, 0.6, 1);
    hl1.position.set(-0.54, 0.50, 1.68);
    var hl2 = hl1.clone(); hl2.position.x = 0.54;
    carGroup.add(hl1); carGroup.add(hl2);

    // Valonheittimet (yövalot)
    var spot1 = new THREE.SpotLight(0xfff5cc, 2.5, 45, Math.PI / 6, 0.4);
    spot1.position.set(-0.54, 0.50, 1.70);
    spot1.target.position.set(-0.54, 0.1, 15);
    spot1.visible = (typeof currentTimeOfDay !== 'undefined' && currentTimeOfDay === 'yo');
    carGroup.add(spot1); carGroup.add(spot1.target);

    var spot2 = new THREE.SpotLight(0xfff5cc, 2.5, 45, Math.PI / 6, 0.4);
    spot2.position.set(0.54, 0.50, 1.70);
    spot2.target.position.set(0.54, 0.1, 15);
    spot2.visible = (typeof currentTimeOfDay !== 'undefined' && currentTimeOfDay === 'yo');
    carGroup.add(spot2); carGroup.add(spot2.target);

    carGroup.userData.headlight1 = spot1;
    carGroup.userData.headlight2 = spot2;

    // Takavalo
    var tailLightMat = new THREE.MeshBasicMaterial({ color: 0xff1100 });
    var tl = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.08), tailLightMat);
    tl.position.set(0, 0.52, -1.81);
    carGroup.add(tl);

    return carGroup;
  };
})();