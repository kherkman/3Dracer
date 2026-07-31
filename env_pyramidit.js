// env_pyramidit.js - Pyramidi Aavikko -ympäristön 3D-määritelmä (Täydellinen ratasuojaus 9-pisteen tarkistuksella)
(function() {
  'use strict';

  window.ENV_BUILDERS = window.ENV_BUILDERS || {};

  window.ENV_BUILDERS['pyramidit'] = function(track, bounds, ctx) {
    var pyramidGroup = new THREE.Group();

    // Ladataan pyramidin tekstuuri pyramidi.jpg
    var pyramidTexUrl = 'pyramidi.jpg';
    var pyramidTex = (ctx.texturesEnabled && typeof ctx.loadTextureWithFallback === 'function')
      ? ctx.loadTextureWithFallback(pyramidTexUrl, 4, 4, '#d4a373', 'PYRAMIDI')
      : null;

    var pyramidMat = new THREE.MeshStandardMaterial({
      map: pyramidTex,
      color: 0xf5c999,
      roughness: 0.85,
      metalness: 0.05
    });

    // Nelisivuisen pyramidin luontifunktio
    function createPyramid(baseWidth, height) {
      var radius = baseWidth / Math.SQRT2; // Todellinen kulmasta-kulmaan-säde
      var geo = new THREE.ConeGeometry(radius, height, 4, 1, false);
      geo.rotateY(Math.PI / 4); // Käännetään 45 astetta suorien sivujen aikaansaamiseksi
      geo.translate(0, height / 2, 0);

      var mesh = new THREE.Mesh(geo, pyramidMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    }

    var ROAD_MARGIN = ctx.ROAD_HALF_WIDTH + ctx.CURB_WIDTH + 8.0; // Turvaetäisyys tien reunasta

    // 9-PISTEEN TARKISTUS: Varmistaa ettei MIKÄÄN osa pyramidin kannasta osu rataan
    function isPyramidSafeFromTrack(cx_pos, cz_pos, baseWidth) {
      var halfW = (baseWidth / 2) + 2.0; // Lisätään 2m lisämarginaali
      var testPoints = [
        { x: cx_pos, z: cz_pos },                         // Keskipiste
        { x: cx_pos + halfW, z: cz_pos },                 // Itä
        { x: cx_pos - halfW, z: cz_pos },                 // Länsi
        { x: cx_pos, z: cz_pos + halfW },                 // Pohjoinen
        { x: cx_pos, z: cz_pos - halfW },                 // Etelä
        { x: cx_pos + halfW, z: cz_pos + halfW },         // Koillinen
        { x: cx_pos - halfW, z: cz_pos + halfW },         // Luode
        { x: cx_pos + halfW, z: cz_pos - halfW },         // Kaakko
        { x: cx_pos - halfW, z: cz_pos - halfW }          // Lounas
      ];

      for (var p = 0; p < testPoints.length; p++) {
        var info = ctx.closestSampleInfo(track, testPoints[p].x, testPoints[p].z);
        if (info.dist < ROAD_MARGIN) {
          return false; // Jos yksikään piste on liian lähellä rataa, paikka hylätään
        }
      }
      return true;
    }

    var placedPyramids = [];

    // Järjestelmällinen spiraalihaku vapaan paikan löytämiseksi
    function findFoolproofPyramidPos(baseWidth) {
      var cornerRadius = baseWidth / Math.SQRT2;
      var searchRadius = bounds.size * 0.42;

      for (var r = 35; r < searchRadius; r += 10) {
        var steps = Math.floor(2 * Math.PI * r / 14);
        for (var s = 0; s < steps; s++) {
          var angle = (s / steps) * Math.PI * 2 + (placedPyramids.length * 1.8);
          var candX = bounds.cx + Math.cos(angle) * r;
          var candZ = bounds.cz + Math.sin(angle) * r;

          // 1. Tarkistetaan 9 pisteellä ettei MIKÄÄN osan kannasta osu rataan
          if (!isPyramidSafeFromTrack(candX, candZ, baseWidth)) {
            continue;
          }

          // 2. Tarkistetaan ettei pyramidi osu muihin pyramideihin
          var overlap = false;
          for (var p = 0; p < placedPyramids.length; p++) {
            var other = placedPyramids[p];
            var dx = candX - other.x;
            var dz = candZ - other.z;
            var centerDist = Math.sqrt(dx * dx + dz * dz);
            var minRequiredDist = cornerRadius + (other.baseWidth / Math.SQRT2) + 20.0; // 20m tyhjä rako väliin

            if (centerDist < minRequiredDist) {
              overlap = true;
              break;
            }
          }

          if (!overlap) {
            var y = ctx.terrainSample(track, candX, candZ).y;
            var posObj = { x: candX, y: y, z: candZ, baseWidth: baseWidth };
            placedPyramids.push(posObj);
            return posObj;
          }
        }
      }

      // Varmuusasettelu kartan äärilaidoille mikäli keskialue on täynnä
      var cornerAngle = (placedPyramids.length * 2.1) + Math.PI / 4;
      var fallbackX = bounds.cx + Math.cos(cornerAngle) * searchRadius * 0.85;
      var fallbackZ = bounds.cz + Math.sin(cornerAngle) * searchRadius * 0.85;
      var yFb = ctx.terrainSample(track, fallbackX, fallbackZ).y;
      var fbObj = { x: fallbackX, y: yFb, z: fallbackZ, baseWidth: baseWidth };
      placedPyramids.push(fbObj);
      return fbObj;
    }

    // 1. SUURI NÄYTTÄVÄ PYRAMIDI
    var p1Pos = findFoolproofPyramidPos(58);
    var p1Mesh = createPyramid(58, 40);
    p1Mesh.position.set(p1Pos.x, p1Pos.y, p1Pos.z);
    pyramidGroup.add(p1Mesh);

    // 2. KESKIKOKOINEN PYRAMIDI
    var p2Pos = findFoolproofPyramidPos(38);
    var p2Mesh = createPyramid(38, 25);
    p2Mesh.position.set(p2Pos.x, p2Pos.y, p2Pos.z);
    pyramidGroup.add(p2Mesh);

    // 3. PIENI PYRAMIDI
    var p3Pos = findFoolproofPyramidPos(26);
    var p3Mesh = createPyramid(26, 17);
    p3Mesh.position.set(p3Pos.x, p3Pos.y, p3Pos.z);
    pyramidGroup.add(p3Mesh);

    // 4. AAVIKKOKIVET
    var rockGeo = new THREE.DodecahedronGeometry(1, 1);
    var rockMat = new THREE.MeshStandardMaterial({ color: 0xdfb07a, roughness: 0.9 });

    for (var i = 0; i < 35; i++) {
      var rx = bounds.cx + (Math.random() * 2 - 1) * bounds.size * 0.4;
      var rz = bounds.cz + (Math.random() * 2 - 1) * bounds.size * 0.4;
      var rInfo = ctx.closestSampleInfo(track, rx, rz);
      if (rInfo.dist < ctx.ROAD_HALF_WIDTH + 5.0) continue;

      var ry = ctx.terrainSample(track, rx, rz).y;
      var rockMesh = new THREE.Mesh(rockGeo, rockMat);
      var s = 0.8 + Math.random() * 2.2;
      rockMesh.scale.set(s * (1 + Math.random() * 0.4), s * 0.5, s * (1 + Math.random() * 0.4));
      rockMesh.position.set(rx, ry + s * 0.2, rz);
      rockMesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      rockMesh.castShadow = true;
      pyramidGroup.add(rockMesh);
    }

    return pyramidGroup;
  };
})();