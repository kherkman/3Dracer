// pontiacer.js - Pontiacer 3D automalli
(function() {
  'use strict';

  window.CAR_MODELS = window.CAR_MODELS || {};

  window.CAR_MODELS['pontiacer'] = function(bodyColorHex, accentColorHex, carTexUrl) {
    var carGroup = new THREE.Group();

    // Oletusvärit: Syvä metallinhohto-musta / Pontiac Blue & Mattamusta / Kulta-aksentit
    var bodyHex = bodyColorHex || 0x12151e;
    var accentHex = accentColorHex || 0x0f1014;

    var baseCol = new THREE.Color(bodyHex);
    if (typeof window.texturesEnabled !== 'undefined' && window.texturesEnabled && carTexUrl) {
      baseCol.lerp(new THREE.Color(0xffffff), 0.35);
    }

    // ---------------------------------------------------------
    // MATERIAALIT
    // ---------------------------------------------------------
    var bodyMat = new THREE.MeshPhysicalMaterial({
      color: baseCol,
      roughness: 0.22,
      metalness: 0.45,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 0.90
    });

    if (typeof window.texturesEnabled !== 'undefined' && window.texturesEnabled && carTexUrl && typeof window.loadTextureWithFallback === 'function') {
      var carTex = window.loadTextureWithFallback(carTexUrl, 1, 1, bodyHex, 'AUTOTEX');
      if (carTex) bodyMat.map = carTex;
    }

    var accentMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.4, metalness: 0.6 });
    var chromeMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.1, metalness: 0.95 });
    var glassMat = new THREE.MeshPhysicalMaterial({ color: 0x070b12, roughness: 0.05, metalness: 0.85, transmission: 0.82, transparent: true, opacity: 0.90 });
    var headLightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 4.0 });
    var tailLightMat = new THREE.MeshStandardMaterial({ color: 0xee0000, emissive: 0xee0000, emissiveIntensity: 3.5 });
    
    // Syvänmustat renkaat ja vanteet
    var tireMat = new THREE.MeshStandardMaterial({ color: 0x020202, roughness: 0.90 });
    var blackRimMat = new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.92, roughness: 0.15 });

    var sides = [-1, 1];
    var bodyBase = new THREE.Group();

    // ---------------------------------------------------------
    // A. RUNKO & LIHAKSIKKAAT KAARET (Coke-Bottle styling)
    // ---------------------------------------------------------
    var tubGeo = new THREE.BoxGeometry(1.52, 0.38, 3.8);
    tubGeo.translate(0, 0.36, -0.05);
    var tubMesh = new THREE.Mesh(tubGeo, bodyMat);
    tubMesh.castShadow = true;
    bodyBase.add(tubMesh);

    // Kylkilinjat ja leventyvät takalokasuojat
    for (var sIdx = 0; sIdx < sides.length; sIdx++) {
      var side = sides[sIdx];

      // Etulokasuojat
      var frontFenderGeo = new THREE.BoxGeometry(0.22, 0.42, 1.4);
      var fFender = new THREE.Mesh(frontFenderGeo, bodyMat);
      fFender.position.set(side * 0.82, 0.42, 1.0);
      fFender.castShadow = true;
      bodyBase.add(fFender);

      // Takalokasuojat (Muscular Rear Haunches)
      var rearHaunchGeo = new THREE.BoxGeometry(0.26, 0.46, 1.6);
      var rHaunch = new THREE.Mesh(rearHaunchGeo, bodyMat);
      rHaunch.position.set(side * 0.84, 0.44, -1.0);
      rHaunch.castShadow = true;
      bodyBase.add(rHaunch);

      // Sivuhelmat
      var skirtGeo = new THREE.BoxGeometry(0.12, 0.08, 2.2);
      var skirt = new THREE.Mesh(skirtGeo, accentMat);
      skirt.position.set(side * 0.86, 0.18, 0);
      bodyBase.add(skirt);
    }

    // ---------------------------------------------------------
    // B. PONTIAC V-SPLIT NOKKA & AJOVALOT
    // ---------------------------------------------------------
    var frontNoseGroup = new THREE.Group();

    // Keskinokka (Pontiac Arrowhead Beak)
    var beakGeo = new THREE.BoxGeometry(0.12, 0.32, 0.50);
    var beak = new THREE.Mesh(beakGeo, bodyMat);
    beak.position.set(0, 0.46, 1.95);
    beak.rotation.x = 0.15;
    frontNoseGroup.add(beak);

    // Kaksiosainen etusäleikkö (Pontiac Split nostrils)
    for (var sIdx = 0; sIdx < sides.length; sIdx++) {
      var side = sides[sIdx];

      var gFrameGeo = new THREE.BoxGeometry(0.58, 0.22, 0.12);
      var gFrame = new THREE.Mesh(gFrameGeo, chromeMat);
      gFrame.position.set(side * 0.40, 0.46, 1.90);
      gFrame.rotation.y = side * -0.10;
      frontNoseGroup.add(gFrame);

      var gMeshGeo = new THREE.BoxGeometry(0.54, 0.18, 0.08);
      var gMesh = new THREE.Mesh(gMeshGeo, accentMat);
      gMesh.position.set(side * 0.40, 0.46, 1.92);
      gMesh.rotation.y = side * -0.10;
      frontNoseGroup.add(gMesh);

      // Tupla-ajovalot per puoli (Quad Headlights)
      var hlOffsets = [-0.15, 0.15];
      for (var hIdx = 0; hIdx < hlOffsets.length; hIdx++) {
        var h = hlOffsets[hIdx];
        var hlGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.06, 16);
        hlGeo.rotateX(Math.PI / 2);
        var hlMesh = new THREE.Mesh(hlGeo, headLightMat);
        hlMesh.position.set(side * 0.40 + h, 0.46, 1.95);
        hlMesh.rotation.y = side * -0.10;
        frontNoseGroup.add(hlMesh);
      }
    }

    // Etuhuulispoileri (Chin Splitter)
    var chinGeo = new THREE.BoxGeometry(1.86, 0.08, 0.40);
    var chin = new THREE.Mesh(chinGeo, accentMat);
    chin.position.set(0, 0.22, 1.85);
    chin.rotation.x = 0.08;
    frontNoseGroup.add(chin);

    bodyBase.add(frontNoseGroup);

    // ---------------------------------------------------------
    // C. KONEPELTI & SHAKER HOOD SCOOP
    // ---------------------------------------------------------
    var hoodGeo = new THREE.BoxGeometry(1.42, 0.06, 1.55);
    var hood = new THREE.Mesh(hoodGeo, bodyMat);
    hood.position.set(0, 0.58, 1.05);
    hood.rotation.x = 0.07;
    bodyBase.add(hood);

    // Trans Am "Shaker" Scoop
    var scoopGroup = new THREE.Group();
    var scoopBaseGeo = new THREE.BoxGeometry(0.55, 0.12, 0.75);
    var scoopBase = new THREE.Mesh(scoopBaseGeo, accentMat);
    scoopBase.position.set(0, 0.65, 0.85);
    scoopBase.rotation.x = 0.07;
    scoopGroup.add(scoopBase);

    var scoopIntakeGeo = new THREE.BoxGeometry(0.48, 0.06, 0.10);
    var scoopIntake = new THREE.Mesh(scoopIntakeGeo, chromeMat);
    scoopIntake.position.set(0, 0.67, 1.20);
    scoopIntake.rotation.x = 0.07;
    scoopGroup.add(scoopIntake);
    bodyBase.add(scoopGroup);

    // ---------------------------------------------------------
    // D. OHJAAMO & T-TOP KATTO
    // ---------------------------------------------------------
    var cabinGroup = new THREE.Group();

    // Tuulilasi
    var wsGeo = new THREE.BoxGeometry(1.36, 0.03, 0.95);
    var windshield = new THREE.Mesh(wsGeo, glassMat);
    windshield.position.set(0, 0.76, 0.15);
    windshield.rotation.x = 0.52;
    cabinGroup.add(windshield);

    // Katto (T-Top tyylinen tumma katto)
    var roofGeo = new THREE.BoxGeometry(1.28, 0.04, 1.05);
    var roof = new THREE.Mesh(roofGeo, accentMat);
    roof.position.set(0, 0.98, -0.45);
    roof.castShadow = true;
    cabinGroup.add(roof);

    // Muotoillut sivulasit
    for (var sIdx = 0; sIdx < sides.length; sIdx++) {
      var side = sides[sIdx];

      var sideWindowShape = new THREE.Shape();
      sideWindowShape.moveTo(-0.45, 0.55);
      sideWindowShape.lineTo(0.15, 0.96);
      sideWindowShape.lineTo(0.65, 0.96);
      sideWindowShape.lineTo(0.75, 0.55);
      sideWindowShape.closePath();

      var sideWinGeo = new THREE.ExtrudeGeometry(sideWindowShape, { depth: 0.02, bevelEnabled: false });
      sideWinGeo.rotateY(Math.PI / 2);

      var sideWin = new THREE.Mesh(sideWinGeo, glassMat);
      sideWin.position.set(side > 0 ? 0.64 : -0.66, 0, 0);
      sideWin.rotation.z = side * 0.10;
      cabinGroup.add(sideWin);
    }

    // Fastback Takalasi
    var rearGlassGeo = new THREE.BoxGeometry(1.22, 0.03, 0.95);
    var rearGlass = new THREE.Mesh(rearGlassGeo, glassMat);
    rearGlass.position.set(0, 0.78, -1.25);
    rearGlass.rotation.x = -0.42;
    cabinGroup.add(rearGlass);

    bodyBase.add(cabinGroup);

    // ---------------------------------------------------------
    // E. TAKAOSA, YHTENÄINEN TAKAVALOPALKKI & DUCKTAIL
    // ---------------------------------------------------------
    var rearGroup = new THREE.Group();

    // Takapuskuri
    var rearFasciaGeo = new THREE.BoxGeometry(1.82, 0.38, 0.15);
    var rearFascia = new THREE.Mesh(rearFasciaGeo, bodyMat);
    rearFascia.position.set(0, 0.44, -1.95);
    rearGroup.add(rearFascia);

    // Pontiac Yhtenäinen takavalopalkki säleiköllä
    var tailBarGeo = new THREE.BoxGeometry(1.68, 0.14, 0.06);
    var tailBar = new THREE.Mesh(tailBarGeo, tailLightMat);
    tailBar.position.set(0, 0.52, -2.00);
    rearGroup.add(tailBar);

    var tailGridGeo = new THREE.BoxGeometry(1.64, 0.12, 0.07);
    var tailGrid = new THREE.Mesh(tailGridGeo, accentMat);
    tailGrid.position.set(0, 0.52, -1.99);
    rearGroup.add(tailGrid);

    // Nelois-pakoputkenpäät
    var exPositions = [-0.45, -0.32, 0.32, 0.45];
    for (var exIdx = 0; exIdx < exPositions.length; exIdx++) {
      var exX = exPositions[exIdx];
      var pipeGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.18, 16);
      pipeGeo.rotateX(Math.PI / 2);
      var pipe = new THREE.Mesh(pipeGeo, chromeMat);
      pipe.position.set(exX, 0.28, -2.00);
      rearGroup.add(pipe);
    }

    // Trans Am Takasiipi / Ducktail Spoiler
    var wingBaseGeo = new THREE.BoxGeometry(1.86, 0.08, 0.42);
    var wing = new THREE.Mesh(wingBaseGeo, accentMat);
    wing.position.set(0, 0.72, -1.88);
    wing.rotation.x = 0.12;
    wing.castShadow = true;
    rearGroup.add(wing);

    var wingPosts = [-0.85, 0, 0.85];
    for (var wpIdx = 0; wpIdx < wingPosts.length; wpIdx++) {
      var side = wingPosts[wpIdx];
      var wingPostGeo = new THREE.BoxGeometry(0.06, 0.16, 0.25);
      var wingPost = new THREE.Mesh(wingPostGeo, bodyMat);
      wingPost.position.set(side, 0.62, -1.88);
      rearGroup.add(wingPost);
    }

    bodyBase.add(rearGroup);
    carGroup.add(bodyBase);

    // ---------------------------------------------------------
    // F. YÖVALOT (Spotlights)
    // ---------------------------------------------------------
    var spot1 = new THREE.SpotLight(0xfff5cc, 3.0, 48, Math.PI / 6, 0.4);
    spot1.position.set(-0.48, 0.46, 1.95);
    spot1.target.position.set(-0.48, 0.1, 15);
    spot1.visible = (typeof currentTimeOfDay !== 'undefined' && currentTimeOfDay === 'yo');
    carGroup.add(spot1); carGroup.add(spot1.target);

    var spot2 = new THREE.SpotLight(0xfff5cc, 3.0, 48, Math.PI / 6, 0.4);
    spot2.position.set(0.48, 0.46, 1.95);
    spot2.target.position.set(0.48, 0.1, 15);
    spot2.visible = (typeof currentTimeOfDay !== 'undefined' && currentTimeOfDay === 'yo');
    carGroup.add(spot2); carGroup.add(spot2.target);

    carGroup.userData.headlight1 = spot1;
    carGroup.userData.headlight2 = spot2;

    // ---------------------------------------------------------
    // G. SNOWFLAKE MUSCLE CAR -MUSTAT VANTEET & RENKAAT
    // ---------------------------------------------------------
    function createMuscleWheel(isRear) {
      var wheelGroup = new THREE.Group();
      var radius = isRear ? 0.38 : 0.36;
      var width = isRear ? 0.34 : 0.30;

      // Musta rengaskumi
      var tireGeo = new THREE.CylinderGeometry(radius, radius, width, 32);
      tireGeo.rotateZ(Math.PI / 2);
      var tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      wheelGroup.add(tire);

      // Musta vannehuuli
      var rimLipGeo = new THREE.TorusGeometry(radius * 0.72, 0.025, 12, 32);
      rimLipGeo.rotateY(Math.PI / 2);
      var rimLip = new THREE.Mesh(rimLipGeo, blackRimMat);
      rimLip.position.x = width * 0.40;
      wheelGroup.add(rimLip);

      // Musta Snowflake 5-Tuplapuolainen vanne
      for (var s = 0; s < 5; s++) {
        var spokeGroup = new THREE.Group();
        var spoke1Geo = new THREE.BoxGeometry(0.025, radius * 0.65, 0.03);
        var spoke1 = new THREE.Mesh(spoke1Geo, blackRimMat);
        spoke1.position.set(width * 0.38, 0, 0);

        var spoke2 = spoke1.clone();
        spoke2.rotation.x = 0.15;
        spoke1.rotation.x = -0.15;

        spokeGroup.add(spoke1);
        spokeGroup.add(spoke2);
        spokeGroup.rotation.x = (Math.PI * 2 / 5) * s;
        wheelGroup.add(spokeGroup);
      }

      // Musta keskikuppi
      var capGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16);
      capGeo.rotateZ(Math.PI / 2);
      var cap = new THREE.Mesh(capGeo, blackRimMat);
      cap.position.x = width * 0.42;
      wheelGroup.add(cap);

      // Jarrulevy & Punainen Satula
      var discGeo = new THREE.CylinderGeometry(radius * 0.60, radius * 0.60, 0.02, 24);
      discGeo.rotateZ(Math.PI / 2);
      var disc = new THREE.Mesh(discGeo, chromeMat);
      disc.position.x = width * 0.10;
      wheelGroup.add(disc);

      var caliperGeo = new THREE.BoxGeometry(0.05, radius * 0.35, 0.10);
      var caliperMat = new THREE.MeshStandardMaterial({ color: 0xcc1111, roughness: 0.3, metalness: 0.4 });
      var caliper = new THREE.Mesh(caliperGeo, caliperMat);
      caliper.position.set(width * 0.10, radius * 0.32, 0);
      wheelGroup.add(caliper);

      return wheelGroup;
    }

    var wheelPos = [
      [-0.88, 0.36, 1.25, false], [0.88, 0.36, 1.25, false],
      [-0.90, 0.38, -1.25, true], [0.90, 0.38, -1.25, true]
    ];

    for (var i = 0; i < 4; i++) {
      var wh = createMuscleWheel(wheelPos[i][3]);
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
