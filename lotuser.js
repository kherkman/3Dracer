// lotuser.js - Lotuser 3D-automalli 
(function() {
  'use strict';

  window.CAR_MODELS = window.CAR_MODELS || {};

  window.CAR_MODELS['lotuser'] = function(bodyColorHex, accentColorHex, carTexUrl) {
    var carGroup = new THREE.Group();

    // Oletusvärit: Lotus British Racing Green & Hiilikuitu-musta
    var bodyHex = bodyColorHex || 0x006b35; 
    var accentHex = accentColorHex || 0x111115;

    var baseCol = new THREE.Color(bodyHex);
    if (typeof window.texturesEnabled !== 'undefined' && window.texturesEnabled && carTexUrl) {
      baseCol.lerp(new THREE.Color(0xffffff), 0.35);
    }

    // ---------------------------------------------------------
    // MATERIAALIT
    // ---------------------------------------------------------
    var bodyMat = new THREE.MeshPhysicalMaterial({
      color: baseCol,
      roughness: 0.15,
      metalness: 0.30,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      reflectivity: 0.95
    });

    if (typeof window.texturesEnabled !== 'undefined' && window.texturesEnabled && carTexUrl && typeof window.loadTextureWithFallback === 'function') {
      var carTex = window.loadTextureWithFallback(carTexUrl, 1, 1, bodyHex, 'AUTOTEX');
      if (carTex) bodyMat.map = carTex;
    }

    var accentMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.3, metalness: 0.8 });
    var carbonMat = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.25, metalness: 0.85 });
    var glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x080e18,
      roughness: 0.05,
      metalness: 0.9,
      transmission: 0.85,
      transparent: true,
      opacity: 0.88
    });
    var engineMetalMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.2, metalness: 0.9 });
    var yellowCaliperMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.25, metalness: 0.5 });
    
    // Syvänmustat renkaat ja satiinimustat vanteet
    var tireMat = new THREE.MeshStandardMaterial({ color: 0x020202, roughness: 0.90 });
    var blackRimMat = new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.92, roughness: 0.18 });

    var headLightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 4.5 });
    var tailLightMat = new THREE.MeshStandardMaterial({ color: 0xff0022, emissive: 0xff0022, emissiveIntensity: 4.5 });

    var sides = [-1, 1];
    var bodyBase = new THREE.Group();

    // ---------------------------------------------------------
    // A. KESKIMOOTTORINEN ROADSTER-RUNKO & LOKASUOJAT
    // ---------------------------------------------------------
    var tubGeo = new THREE.BoxGeometry(1.38, 0.30, 2.5);
    tubGeo.translate(0, 0.28, -0.1);
    var tubMesh = new THREE.Mesh(tubGeo, bodyMat);
    tubMesh.castShadow = true;
    bodyBase.add(tubMesh);

    // Pyöristetyt etu- ja takalokasuojat
    for (var sIdx = 0; sIdx < sides.length; sIdx++) {
      var side = sides[sIdx];

      // Etulokasuojat
      var frontFenderGeo = new THREE.BoxGeometry(0.24, 0.36, 1.3);
      var fFender = new THREE.Mesh(frontFenderGeo, bodyMat);
      fFender.position.set(side * 0.74, 0.36, 0.85);
      fFender.castShadow = true;
      bodyBase.add(fFender);

      // Takalokasuojat (Muscular Rear Haunches)
      var rearHaunchGeo = new THREE.BoxGeometry(0.28, 0.40, 1.4);
      var rHaunch = new THREE.Mesh(rearHaunchGeo, bodyMat);
      rHaunch.position.set(side * 0.76, 0.38, -0.75);
      rHaunch.castShadow = true;
      bodyBase.add(rHaunch);
    }

    // ---------------------------------------------------------
    // B. LOTUS WEDGE -LEVEÄ ETUOSA & SÄLEIKÖT
    // ---------------------------------------------------------
    var frontNoseGroup = new THREE.Group();

    // Leveämpi viistoava konepelti / nokka
    var noseShape = new THREE.Shape();
    noseShape.moveTo(-0.74, 0);
    noseShape.lineTo(0.74, 0);
    noseShape.quadraticCurveTo(0.62, 0.7, 0.42, 1.25);
    noseShape.lineTo(0, 1.68);
    noseShape.lineTo(-0.42, 1.25);
    noseShape.quadraticCurveTo(-0.62, 0.7, -0.74, 0);
    noseShape.closePath();

    var noseGeo = new THREE.ExtrudeGeometry(noseShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04 });
    noseGeo.rotateX(Math.PI / 2);
    var noseMesh = new THREE.Mesh(noseGeo, bodyMat);
    noseMesh.position.set(0, 0.46, 0.25);
    noseMesh.rotation.x = 0.06;
    noseMesh.castShadow = true;
    frontNoseGroup.add(noseMesh);

    // Leveämmät ilmanottoaukot konepellissä (Lotus Hood Nostrils)
    var ventSides = [-0.28, 0.28];
    for (var vIdx = 0; vIdx < ventSides.length; vIdx++) {
      var side = ventSides[vIdx];
      var ventGeo = new THREE.BoxGeometry(0.22, 0.04, 0.48);
      var vent = new THREE.Mesh(ventGeo, carbonMat);
      vent.position.set(side, 0.48, 1.05);
      vent.rotation.x = -0.10;
      frontNoseGroup.add(vent);
    }

    // Leveämpi etusplitteri
    var splitterShape = new THREE.Shape();
    splitterShape.moveTo(-0.88, 0);
    splitterShape.lineTo(0.88, 0);
    splitterShape.quadraticCurveTo(0.52, 0.35, 0, 0.55);
    splitterShape.quadraticCurveTo(-0.52, 0.35, -0.88, 0);
    splitterShape.closePath();

    var splitterGeo = new THREE.ExtrudeGeometry(splitterShape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015 });
    splitterGeo.rotateX(Math.PI / 2);
    var splitter = new THREE.Mesh(splitterGeo, carbonMat);
    splitter.position.set(0, 0.16, 1.42);
    splitter.castShadow = true;
    frontNoseGroup.add(splitter);

    bodyBase.add(frontNoseGroup);

    // ---------------------------------------------------------
    // C. TEARDROP / CAT-EYE AJOVALOT
    // ---------------------------------------------------------
    for (var sIdx = 0; sIdx < sides.length; sIdx++) {
      var side = sides[sIdx];
      var headGroup = new THREE.Group();
      headGroup.position.set(side * 0.48, 0.48, 1.25);
      headGroup.rotation.x = 0.22;
      headGroup.rotation.y = side * -0.20;

      var housingGeo = new THREE.BoxGeometry(0.12, 0.05, 0.42);
      var housing = new THREE.Mesh(housingGeo, carbonMat);
      headGroup.add(housing);

      var ledStripGeo = new THREE.BoxGeometry(0.04, 0.04, 0.38);
      var ledStrip = new THREE.Mesh(ledStripGeo, headLightMat);
      ledStrip.position.set(0, 0.02, 0);
      headGroup.add(ledStrip);

      var lensGeo = new THREE.BoxGeometry(0.13, 0.04, 0.44);
      var lens = new THREE.Mesh(lensGeo, glassMat);
      lens.position.set(0, 0.02, 0);
      headGroup.add(lens);

      bodyBase.add(headGroup);
    }

    // ---------------------------------------------------------
    // D. OHJAAMO, TUULILASI, SAUMATON KATTOLEVY & SIVULASIT
    // ---------------------------------------------------------
    var cabinGroup = new THREE.Group();

    // Tuulilasi
    var wsGeo = new THREE.BoxGeometry(1.18, 0.03, 1.0);
    var windshield = new THREE.Mesh(wsGeo, glassMat);
    windshield.position.set(0, 0.68, 0.12);
    windshield.rotation.y = Math.PI;
    windshield.rotation.x = 0.58;
    cabinGroup.add(windshield);

    // SAUMATON KATTOLEVY (Yhdistyy etupäästä tuulilasiin ja takapäästä takalasiin)
    var roofGeo = new THREE.BoxGeometry(0.96, 0.04, 0.50);
    var roof = new THREE.Mesh(roofGeo, carbonMat);
    roof.position.set(0, 0.94, -0.53);
    roof.rotation.x = -0.04;
    roof.castShadow = true;
    cabinGroup.add(roof);

    // Muotoillut sivulasit
    for (var sIdx = 0; sIdx < sides.length; sIdx++) {
      var side = sides[sIdx];
      var sideWinShape = new THREE.Shape();
      sideWinShape.moveTo(-0.48, 0.46);
      sideWinShape.lineTo(0.28, 0.94);
      sideWinShape.lineTo(0.78, 0.94);
      sideWinShape.lineTo(0.82, 0.48);
      sideWinShape.closePath();

      var sideWinGeo = new THREE.ExtrudeGeometry(sideWinShape, { depth: 0.02, bevelEnabled: false });
      sideWinGeo.rotateY(Math.PI / 2);

      var sideWin = new THREE.Mesh(sideWinGeo, glassMat);
      sideWin.position.set(side > 0 ? 0.54 : -0.56, 0, 0);
      sideWin.rotation.z = side * 0.12;
      cabinGroup.add(sideWin);
    }

    // C-Pilarit
    for (var sIdx = 0; sIdx < sides.length; sIdx++) {
      var side = sides[sIdx];
      var buttressGeo = new THREE.BoxGeometry(0.05, 0.18, 0.95);
      var buttress = new THREE.Mesh(buttressGeo, bodyMat);
      buttress.position.set(side * 0.45, 0.65, -1.05);
      buttress.rotation.x = -0.32;
      buttress.rotation.y = side * -0.10;
      buttress.castShadow = true;
      cabinGroup.add(buttress);
    }

    bodyBase.add(cabinGroup);

    // ---------------------------------------------------------
    // E. LASINEN MOOTTORINKANSI
    // ---------------------------------------------------------
    var engineGlassGeo = new THREE.BoxGeometry(0.68, 0.03, 0.90);
    var engineGlass = new THREE.Mesh(engineGlassGeo, glassMat);
    engineGlass.position.set(0, 0.75, -1.20);
    engineGlass.rotation.x = -0.35;
    bodyBase.add(engineGlass);

    // Sivuilmanottoaukot (Lotus side pods)
    for (var sIdx = 0; sIdx < sides.length; sIdx++) {
      var side = sides[sIdx];
      var scoopGeo = new THREE.BoxGeometry(0.14, 0.24, 0.55);
      var scoop = new THREE.Mesh(scoopGeo, carbonMat);
      scoop.position.set(side * 0.70, 0.36, -0.25);
      scoop.rotation.y = side * -0.15;
      bodyBase.add(scoop);

      var skirtGeo = new THREE.BoxGeometry(0.10, 0.06, 2.0);
      var skirt = new THREE.Mesh(skirtGeo, carbonMat);
      skirt.position.set(side * 0.74, 0.15, 0);
      bodyBase.add(skirt);
    }

    // ---------------------------------------------------------
    // F. TAKAOSA, PYÖREÄT DOUBLE-TAKAVALOT & TAKASPOIILERI
    // ---------------------------------------------------------
    var rearGroup = new THREE.Group();

    var rearWallGeo = new THREE.BoxGeometry(1.50, 0.34, 0.12);
    var rearWall = new THREE.Mesh(rearWallGeo, bodyMat);
    rearWall.position.set(0, 0.40, -1.65);
    rearGroup.add(rearWall);

    // Lotus ikoniset tupla-pyöreät takavalot per puoli
    for (var sIdx = 0; sIdx < sides.length; sIdx++) {
      var side = sides[sIdx];
      for (var posIdx = 0; posIdx < 2; posIdx++) {
        var posX = side * (0.42 + posIdx * 0.18);
        var tHousingGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16);
        tHousingGeo.rotateX(Math.PI / 2);
        var tHousing = new THREE.Mesh(tHousingGeo, carbonMat);
        tHousing.position.set(posX, 0.44, -1.68);
        rearGroup.add(tHousing);

        var tRingGeo = new THREE.TorusGeometry(0.055, 0.018, 12, 24);
        var tRing = new THREE.Mesh(tRingGeo, tailLightMat);
        tRing.position.set(posX, 0.44, -1.70);
        rearGroup.add(tRing);
      }
    }

    // Keskitetty kaksoispakoputki
    var exPositions = [-0.08, 0.08];
    for (var exIdx = 0; exIdx < exPositions.length; exIdx++) {
      var exX = exPositions[exIdx];
      var pipeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.14, 16);
      pipeGeo.rotateX(Math.PI / 2);
      var pipe = new THREE.Mesh(pipeGeo, engineMetalMat);
      pipe.position.set(exX, 0.28, -1.70);
      rearGroup.add(pipe);
    }

    // Takadiffuusori
    var diffGeo = new THREE.BoxGeometry(1.48, 0.14, 0.38);
    var diff = new THREE.Mesh(diffGeo, carbonMat);
    diff.position.set(0, 0.18, -1.65);
    diff.rotation.x = -0.10;
    rearGroup.add(diff);

    // Takasiipi (Lotus Sport Wing)
    var spoilerGeo = new THREE.BoxGeometry(1.52, 0.04, 0.28);
    var spoilerMesh = new THREE.Mesh(spoilerGeo, carbonMat);
    spoilerMesh.position.set(0, 0.78, -1.62);
    spoilerMesh.rotation.x = -0.04;
    spoilerMesh.castShadow = true;

    var postSides = [-0.40, 0.40];
    for (var psIdx = 0; psIdx < postSides.length; psIdx++) {
      var side = postSides[psIdx];
      var postGeo = new THREE.BoxGeometry(0.04, 0.24, 0.12);
      var post = new THREE.Mesh(postGeo, carbonMat);
      post.position.set(side, 0.66, -1.60);
      post.rotation.x = -0.12;
      rearGroup.add(post);
    }

    var endplateSides = [-0.76, 0.76];
    for (var epIdx = 0; epIdx < endplateSides.length; epIdx++) {
      var side = endplateSides[epIdx];
      var endplateGeo = new THREE.BoxGeometry(0.03, 0.16, 0.32);
      var endplate = new THREE.Mesh(endplateGeo, carbonMat);
      endplate.position.set(side, 0.78, -1.62);
      rearGroup.add(endplate);
    }

    rearGroup.add(spoilerMesh);

    bodyBase.add(rearGroup);
    carGroup.add(bodyBase);

    // ---------------------------------------------------------
    // G. YÖVALOT (Spotlights)
    // ---------------------------------------------------------
    var spot1 = new THREE.SpotLight(0xfff5cc, 2.8, 48, Math.PI / 6, 0.4);
    spot1.position.set(-0.48, 0.48, 1.25);
    spot1.target.position.set(-0.48, 0.1, 15);
    spot1.visible = (typeof currentTimeOfDay !== 'undefined' && currentTimeOfDay === 'yo');
    carGroup.add(spot1); carGroup.add(spot1.target);

    var spot2 = new THREE.SpotLight(0xfff5cc, 2.8, 48, Math.PI / 6, 0.4);
    spot2.position.set(0.48, 0.48, 1.25);
    spot2.target.position.set(0.48, 0.1, 15);
    spot2.visible = (typeof currentTimeOfDay !== 'undefined' && currentTimeOfDay === 'yo');
    carGroup.add(spot2); carGroup.add(spot2.target);

    carGroup.userData.headlight1 = spot1;
    carGroup.userData.headlight2 = spot2;

    // ---------------------------------------------------------
    // H. LOTUS LIGHTWEIGHT MUSTAT VANTEET & MUSTAT RENKAAT
    // ---------------------------------------------------------
    function createLotusWheel(isRear) {
      var wheelGroup = new THREE.Group();
      var radius = isRear ? 0.35 : 0.32;
      var width = isRear ? 0.30 : 0.26;

      // Musta Rengaskumi
      var tireGeo = new THREE.CylinderGeometry(radius, radius, width, 32);
      tireGeo.rotateZ(Math.PI / 2);
      var tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      wheelGroup.add(tire);

      // Satiinimusta vannehuuli
      var rimLipGeo = new THREE.TorusGeometry(radius * 0.72, 0.018, 12, 32);
      rimLipGeo.rotateY(Math.PI / 2);
      var rimLip = new THREE.Mesh(rimLipGeo, blackRimMat);
      rimLip.position.x = width * 0.42;
      wheelGroup.add(rimLip);

      // 10-puolaiset ultra-kevytmetallisportvanteet
      for (var s = 0; s < 10; s++) {
        var spokeGeo = new THREE.BoxGeometry(0.018, radius * 0.68, 0.022);
        var spoke = new THREE.Mesh(spokeGeo, blackRimMat);
        spoke.position.x = width * 0.40;
        spoke.rotation.x = (Math.PI * 2 / 10) * s;
        wheelGroup.add(spoke);
      }

      // Keskikuppi
      var centerCapGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16);
      centerCapGeo.rotateZ(Math.PI / 2);
      var centerCap = new THREE.Mesh(centerCapGeo, blackRimMat);
      centerCap.position.x = width * 0.43;
      wheelGroup.add(centerCap);

      // Lotus Keltainen jarrusatula & jarrulevy
      var discGeo = new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, 0.018, 24);
      discGeo.rotateZ(Math.PI / 2);
      var disc = new THREE.Mesh(discGeo, engineMetalMat);
      disc.position.x = width * 0.12;
      wheelGroup.add(disc);

      var caliperGeo = new THREE.BoxGeometry(0.05, radius * 0.40, 0.09);
      var caliper = new THREE.Mesh(caliperGeo, yellowCaliperMat);
      caliper.position.set(width * 0.12, radius * 0.34, 0);
      wheelGroup.add(caliper);

      return wheelGroup;
    }

    var wheelPos = [
      [-0.74, 0.32, 1.05, false], [0.74, 0.32, 1.05, false],
      [-0.76, 0.35, -1.05, true], [0.76, 0.35, -1.05, true]
    ];

    for (var i = 0; i < 4; i++) {
      var wh = createLotusWheel(wheelPos[i][3]);
      wh.position.set(wheelPos[i][0], wheelPos[i][1], wheelPos[i][2]);
      if (wheelPos[i][0] > 0) wh.rotation.y = Math.PI;
      carGroup.add(wh);
    }

    // Kiihdytyshohto
    var glowGeo = new THREE.BoxGeometry(1.95, 0.85, 3.8);
    var glowMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff, transparent: true, opacity: 0.0, side: THREE.BackSide
    });
    var glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.set(0, 0.5, 0);
    carGroup.add(glowMesh);
    carGroup.userData.glowMesh = glowMesh;

    return carGroup;
  };
})();
