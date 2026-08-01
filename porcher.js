// porcher.js - Porcher 3D-automalli
(function() {
  'use strict';

  window.CAR_MODELS = window.CAR_MODELS || {};

  window.CAR_MODELS['porcher'] = function(bodyColorHex, accentColorHex, carTexUrl) {
    var carGroup = new THREE.Group();

    // Oletusvärit: Porsche Guards Red & Hiilikuitu-musta
    var bodyHex = bodyColorHex || 0xd5001c; 
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
      roughness: 0.12,
      metalness: 0.35,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
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
    var redCaliperMat = new THREE.MeshStandardMaterial({ color: 0xcc1111, roughness: 0.25, metalness: 0.5 });
    
    // Syvänmustat renkaat ja vanteet
    var tireMat = new THREE.MeshStandardMaterial({ color: 0x020202, roughness: 0.90 });
    var blackRimMat = new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.92, roughness: 0.15 });

    var headLightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 4.5 });
    var tailLightMat = new THREE.MeshStandardMaterial({ color: 0xff0022, emissive: 0xff0022, emissiveIntensity: 4.5 });

    var sides = [-1, 1];
    var bodyBase = new THREE.Group();

    // ---------------------------------------------------------
    // A. KESKIRUNKO & KAAREVAT SIVUPALKIT (Fender Arches)
    // ---------------------------------------------------------
    var tubGeo = new THREE.BoxGeometry(1.36, 0.32, 2.7);
    tubGeo.translate(0, 0.32, -0.1);
    var tubMesh = new THREE.Mesh(tubGeo, bodyMat);
    tubMesh.castShadow = true;
    bodyBase.add(tubMesh);

    // KAAREVAT ETUSIVUPALKIT
    var fFenderShape = new THREE.Shape();
    fFenderShape.moveTo(0.20, 0.45);
    fFenderShape.quadraticCurveTo(0.70, 0.72, 1.15, 0.70);
    fFenderShape.quadraticCurveTo(1.48, 0.65, 1.68, 0.44);
    fFenderShape.lineTo(1.68, 0.30);
    fFenderShape.quadraticCurveTo(1.15, 0.30, 0.20, 0.30);
    fFenderShape.closePath();

    var fFenderGeo = new THREE.ExtrudeGeometry(fFenderShape, { 
      depth: 0.26, 
      bevelEnabled: true, 
      bevelThickness: 0.04, 
      bevelSize: 0.03,
      bevelSegments: 5 
    });
    fFenderGeo.rotateY(-Math.PI / 2);

    for (var sIdx = 0; sIdx < sides.length; sIdx++) {
      var side = sides[sIdx];
      var fFender = new THREE.Mesh(fFenderGeo, bodyMat);
      fFender.position.set(side > 0 ? 0.88 : -0.62, 0, 0);
      fFender.castShadow = true;
      bodyBase.add(fFender);
    }

    // KAAREVAT TAKASIVUPALKIT
    var rFenderShape = new THREE.Shape();
    rFenderShape.moveTo(-0.10, 0.48);
    rFenderShape.quadraticCurveTo(-0.65, 0.74, -1.15, 0.72);
    rFenderShape.quadraticCurveTo(-1.48, 0.66, -1.68, 0.42);
    rFenderShape.lineTo(-1.68, 0.30);
    rFenderShape.quadraticCurveTo(-1.15, 0.30, -0.10, 0.30);
    rFenderShape.closePath();

    var rFenderGeo = new THREE.ExtrudeGeometry(rFenderShape, { 
      depth: 0.30, 
      bevelEnabled: true, 
      bevelThickness: 0.04, 
      bevelSize: 0.03,
      bevelSegments: 5 
    });
    rFenderGeo.rotateY(-Math.PI / 2);

    for (var sIdx = 0; sIdx < sides.length; sIdx++) {
      var side = sides[sIdx];
      var rHaunch = new THREE.Mesh(rFenderGeo, bodyMat);
      rHaunch.position.set(side > 0 ? 0.92 : -0.62, 0, 0);
      rHaunch.castShadow = true;
      bodyBase.add(rHaunch);
    }

    // ---------------------------------------------------------
    // B. KOROTETTU PYÖREÄ NOKKA & KOROTETTU ETUPUSKURI
    // ---------------------------------------------------------
    var frontNoseGroup = new THREE.Group();

    var hoodShape = new THREE.Shape();
    hoodShape.moveTo(-0.52, 0);
    hoodShape.lineTo(0.52, 0);
    hoodShape.quadraticCurveTo(0.54, 0.8, 0.38, 1.35);
    hoodShape.quadraticCurveTo(0, 1.72, -0.38, 1.35);
    hoodShape.quadraticCurveTo(-0.54, 0.8, -0.52, 0);
    hoodShape.closePath();

    var hoodGeo = new THREE.ExtrudeGeometry(hoodShape, { 
      depth: 0.08, 
      bevelEnabled: true, 
      bevelThickness: 0.05, 
      bevelSize: 0.04,
      bevelSegments: 8
    });
    hoodGeo.rotateX(Math.PI / 2);
    var hoodMesh = new THREE.Mesh(hoodGeo, bodyMat);
    hoodMesh.position.set(0, 0.52, 0.25);
    hoodMesh.rotation.x = 0.08;
    hoodMesh.castShadow = true;
    frontNoseGroup.add(hoodMesh);

    var splitterShape = new THREE.Shape();
    splitterShape.moveTo(-0.86, 0);
    splitterShape.lineTo(0.86, 0);
    splitterShape.quadraticCurveTo(0.55, 0.45, 0, 0.58);
    splitterShape.quadraticCurveTo(-0.55, 0.45, -0.86, 0);
    splitterShape.closePath();

    var splitterGeo = new THREE.ExtrudeGeometry(splitterShape, { 
      depth: 0.03, 
      bevelEnabled: true, 
      bevelThickness: 0.02, 
      bevelSize: 0.02,
      bevelSegments: 8
    });
    splitterGeo.rotateX(Math.PI / 2);
    var splitter = new THREE.Mesh(splitterGeo, carbonMat);
    splitter.position.set(0, 0.26, 1.48);
    splitter.castShadow = true;
    frontNoseGroup.add(splitter);

    bodyBase.add(frontNoseGroup);

    // ---------------------------------------------------------
    // C. PORSCHE OVAALIT AJOVALOT
    // ---------------------------------------------------------
    for (var sIdx = 0; sIdx < sides.length; sIdx++) {
      var side = sides[sIdx];
      var headGroup = new THREE.Group();
      headGroup.position.set(side * 0.54, 0.64, 1.45);
      headGroup.rotation.x = 0.26;
      headGroup.rotation.y = side * -0.12;

      var housingGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.06, 20);
      housingGeo.rotateX(Math.PI / 2);
      var housing = new THREE.Mesh(housingGeo, carbonMat);
      headGroup.add(housing);

      var dxOffsets = [-0.04, 0.04];
      var dyOffsets = [-0.04, 0.04];
      for (var dxIdx = 0; dxIdx < dxOffsets.length; dxIdx++) {
        for (var dyIdx = 0; dyIdx < dyOffsets.length; dyIdx++) {
          var ledDotGeo = new THREE.BoxGeometry(0.025, 0.025, 0.04);
          var ledDot = new THREE.Mesh(ledDotGeo, headLightMat);
          ledDot.position.set(dxOffsets[dxIdx], dyOffsets[dyIdx], 0.02);
          headGroup.add(ledDot);
        }
      }

      var lensGeo = new THREE.CylinderGeometry(0.125, 0.145, 0.07, 20);
      lensGeo.rotateX(Math.PI / 2);
      var lens = new THREE.Mesh(lensGeo, glassMat);
      headGroup.add(lens);

      bodyBase.add(headGroup);
    }

    // ---------------------------------------------------------
    // D. FLYLINE-OHJAAMO, SAUMATON KATTOLEVY & SIVULASIT
    // ---------------------------------------------------------
    var cabinGroup = new THREE.Group();

    var wsGeo = new THREE.BoxGeometry(1.22, 0.03, 1.05);
    var windshield = new THREE.Mesh(wsGeo, glassMat);
    windshield.position.set(0, 0.68, 0.12);
    windshield.rotation.y = Math.PI;
    windshield.rotation.x = 0.58;
    cabinGroup.add(windshield);

    var roofGeo = new THREE.BoxGeometry(0.98, 0.04, 0.50);
    var roof = new THREE.Mesh(roofGeo, carbonMat);
    roof.position.set(0, 0.94, -0.53);
    roof.rotation.x = -0.04;
    roof.castShadow = true;
    cabinGroup.add(roof);

    for (var sIdx = 0; sIdx < sides.length; sIdx++) {
      var side = sides[sIdx];
      var sideWinShape = new THREE.Shape();
      sideWinShape.moveTo(-0.48, 0.46);
      sideWinShape.lineTo(0.28, 0.94);
      sideWinShape.lineTo(0.78, 0.94);
      sideWinShape.lineTo(0.85, 0.48);
      sideWinShape.closePath();

      var sideWinGeo = new THREE.ExtrudeGeometry(sideWinShape, { depth: 0.02, bevelEnabled: false });
      sideWinGeo.rotateY(Math.PI / 2);

      var sideWin = new THREE.Mesh(sideWinGeo, glassMat);
      sideWin.position.set(side > 0 ? 0.56 : -0.58, 0, 0);
      sideWin.rotation.z = side * 0.12;
      cabinGroup.add(sideWin);
    }

    for (var sIdx = 0; sIdx < sides.length; sIdx++) {
      var side = sides[sIdx];
      var buttressGeo = new THREE.BoxGeometry(0.06, 0.20, 1.15);
      var buttress = new THREE.Mesh(buttressGeo, bodyMat);
      buttress.position.set(side * 0.48, 0.65, -1.15);
      buttress.rotation.x = -0.36;
      buttress.rotation.y = side * -0.08;
      buttress.castShadow = true;
      cabinGroup.add(buttress);
    }

    bodyBase.add(cabinGroup);

    // ---------------------------------------------------------
    // E. FASTBACK-TAKAMOOTTORINKANSI
    // ---------------------------------------------------------
    var engineGlassGeo = new THREE.BoxGeometry(0.74, 0.03, 0.95);
    var engineGlass = new THREE.Mesh(engineGlassGeo, glassMat);
    engineGlass.position.set(0, 0.74, -1.22);
    engineGlass.rotation.x = -0.34;
    bodyBase.add(engineGlass);

    for (var sIdx = 0; sIdx < sides.length; sIdx++) {
      var side = sides[sIdx];
      var scoopGeo = new THREE.BoxGeometry(0.12, 0.22, 0.55);
      var scoop = new THREE.Mesh(scoopGeo, carbonMat);
      scoop.position.set(side * 0.76, 0.38, -0.35);
      scoop.rotation.y = side * -0.15;
      bodyBase.add(scoop);

      var skirtGeo = new THREE.BoxGeometry(0.10, 0.06, 2.2);
      var skirt = new THREE.Mesh(skirtGeo, carbonMat);
      skirt.position.set(side * 0.78, 0.15, 0);
      bodyBase.add(skirt);
    }

    // ---------------------------------------------------------
    // F. TAKAOSA, CONTINUOUS LED LIGHTBAR & GT3 SPOILERI
    // ---------------------------------------------------------
    var rearGroup = new THREE.Group();

    var rearWallGeo = new THREE.BoxGeometry(1.62, 0.36, 0.12);
    var rearWall = new THREE.Mesh(rearWallGeo, bodyMat);
    rearWall.position.set(0, 0.42, -1.82);
    rearGroup.add(rearWall);

    var tailBarGeo = new THREE.BoxGeometry(1.58, 0.06, 0.06);
    var tailBar = new THREE.Mesh(tailBarGeo, tailLightMat);
    tailBar.position.set(0, 0.52, -1.86);
    rearGroup.add(tailBar);

    var exPositions = [-0.09, 0.09];
    for (var exIdx = 0; exIdx < exPositions.length; exIdx++) {
      var exX = exPositions[exIdx];
      var pipeGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.16, 16);
      pipeGeo.rotateX(Math.PI / 2);
      var pipe = new THREE.Mesh(pipeGeo, engineMetalMat);
      pipe.position.set(exX, 0.30, -1.88);
      rearGroup.add(pipe);
    }

    var diffGeo = new THREE.BoxGeometry(1.54, 0.14, 0.40);
    var diff = new THREE.Mesh(diffGeo, carbonMat);
    diff.position.set(0, 0.18, -1.82);
    diff.rotation.x = -0.10;
    rearGroup.add(diff);

    var spoilerGeo = new THREE.BoxGeometry(1.62, 0.04, 0.32);
    var spoilerMesh = new THREE.Mesh(spoilerGeo, carbonMat);
    spoilerMesh.position.set(0, 0.86, -1.80);
    spoilerMesh.rotation.x = -0.04;
    spoilerMesh.castShadow = true;

    var postSides = [-0.42, 0.42];
    for (var psIdx = 0; psIdx < postSides.length; psIdx++) {
      var side = postSides[psIdx];
      var postGeo = new THREE.BoxGeometry(0.04, 0.28, 0.14);
      var post = new THREE.Mesh(postGeo, carbonMat);
      post.position.set(side, 0.72, -1.78);
      post.rotation.x = -0.15;
      rearGroup.add(post);
    }

    var endplateSides = [-0.81, 0.81];
    for (var epIdx = 0; epIdx < endplateSides.length; epIdx++) {
      var side = endplateSides[epIdx];
      var endplateGeo = new THREE.BoxGeometry(0.03, 0.18, 0.36);
      var endplate = new THREE.Mesh(endplateGeo, carbonMat);
      endplate.position.set(side, 0.86, -1.80);
      rearGroup.add(endplate);
    }

    rearGroup.add(spoilerMesh);

    bodyBase.add(rearGroup);
    carGroup.add(bodyBase);

    // ---------------------------------------------------------
    // G. YÖVALOT (Spotlights)
    // ---------------------------------------------------------
    var spot1 = new THREE.SpotLight(0xfff5cc, 2.8, 48, Math.PI / 6, 0.4);
    spot1.position.set(-0.54, 0.64, 1.45);
    spot1.target.position.set(-0.54, 0.1, 15);
    spot1.visible = (typeof currentTimeOfDay !== 'undefined' && currentTimeOfDay === 'yo');
    carGroup.add(spot1); carGroup.add(spot1.target);

    var spot2 = new THREE.SpotLight(0xfff5cc, 2.8, 48, Math.PI / 6, 0.4);
    spot2.position.set(0.54, 0.64, 1.45);
    spot2.target.position.set(0.54, 0.1, 15);
    spot2.visible = (typeof currentTimeOfDay !== 'undefined' && currentTimeOfDay === 'yo');
    carGroup.add(spot2); carGroup.add(spot2.target);

    carGroup.userData.headlight1 = spot1;
    carGroup.userData.headlight2 = spot2;

    // ---------------------------------------------------------
    // H. PORSCHE CENTER-LOCK MUSTAT VANTEET & RENKAAT
    // ---------------------------------------------------------
    function createPorscheWheel(isRear) {
      var wheelGroup = new THREE.Group();
      var radius = isRear ? 0.37 : 0.34;
      var width = isRear ? 0.32 : 0.28;

      var tireGeo = new THREE.CylinderGeometry(radius, radius, width, 32);
      tireGeo.rotateZ(Math.PI / 2);
      var tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      wheelGroup.add(tire);

      var rimLipGeo = new THREE.TorusGeometry(radius * 0.72, 0.02, 12, 32);
      rimLipGeo.rotateY(Math.PI / 2);
      var rimLip = new THREE.Mesh(rimLipGeo, blackRimMat);
      rimLip.position.x = width * 0.42;
      wheelGroup.add(rimLip);

      for (var s = 0; s < 5; s++) {
        var spokeGroup = new THREE.Group();
        var spoke1Geo = new THREE.BoxGeometry(0.022, radius * 0.68, 0.025);
        var spoke1 = new THREE.Mesh(spoke1Geo, blackRimMat);
        spoke1.position.set(width * 0.40, 0, 0);

        var spoke2 = spoke1.clone();
        spoke2.rotation.x = 0.12;
        spoke1.rotation.x = -0.12;

        spokeGroup.add(spoke1);
        spokeGroup.add(spoke2);
        spokeGroup.rotation.x = (Math.PI * 2 / 5) * s;
        wheelGroup.add(spokeGroup);
      }

      var centerCapGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.02, 16);
      centerCapGeo.rotateZ(Math.PI / 2);
      var centerCap = new THREE.Mesh(centerCapGeo, blackRimMat);
      centerCap.position.x = width * 0.43;
      wheelGroup.add(centerCap);

      var discGeo = new THREE.CylinderGeometry(radius * 0.64, radius * 0.64, 0.018, 24);
      discGeo.rotateZ(Math.PI / 2);
      var disc = new THREE.Mesh(discGeo, engineMetalMat);
      disc.position.x = width * 0.12;
      wheelGroup.add(disc);

      var caliperGeo = new THREE.BoxGeometry(0.05, radius * 0.42, 0.10);
      var caliper = new THREE.Mesh(caliperGeo, redCaliperMat);
      caliper.position.set(width * 0.12, radius * 0.35, 0);
      wheelGroup.add(caliper);

      return wheelGroup;
    }

    var wheelPos = [
      [-0.85, 0.34, 1.15, false], [0.85, 0.34, 1.15, false],
      [-0.88, 0.37, -1.15, true], [0.88, 0.37, -1.15, true]
    ];

    for (var i = 0; i < 4; i++) {
      var wh = createPorscheWheel(wheelPos[i][3]);
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
