// env_suo.js - Suo-ympäristön 3D-määritelmä (Suonsilmäkkeet, Kelot, Kitukasvuiset Männyt & Suovillat)
(function() {
  window.ENV_BUILDERS = window.ENV_BUILDERS || {};

  function concatFloat32(arrays) {
    var total = 0;
    for (var i = 0; i < arrays.length; i++) total += arrays[i].length;
    var result = new Float32Array(total);
    var offset = 0;
    for (var i = 0; i < arrays.length; i++) { result.set(arrays[i], offset); offset += arrays[i].length; }
    return result;
  }

  function mergeGeometries(geometries) {
    if (!geometries || geometries.length === 0) return new THREE.BufferGeometry();
    var positions = [], normals = [], uvs = [];
    for (var i = 0; i < geometries.length; i++) {
      var g = geometries[i];
      var ng = g.index ? g.toNonIndexed() : g;
      positions.push(ng.attributes.position.array);
      normals.push(ng.attributes.normal.array);
      if (ng.attributes.uv) uvs.push(ng.attributes.uv.array);
    }
    var merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(concatFloat32(positions), 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(concatFloat32(normals), 3));
    if (uvs.length === geometries.length) {
      merged.setAttribute('uv', new THREE.BufferAttribute(concatFloat32(uvs), 2));
    }
    return merged;
  }

  window.ENV_BUILDERS['suo'] = function(track, bounds, ctx) {
    var bogGroup = new THREE.Group();

    var halfSize = bounds.size / 2 * 0.92;
    var exclR = ctx.ROAD_HALF_WIDTH + ctx.CURB_WIDTH + 2.8;

    // --- 1. SUONSILMÄKKEET / TUMMAT VESILÄTÄKÖT ---
    var poolMat = new THREE.MeshStandardMaterial({
      color: 0x1a2418,
      roughness: 0.08,
      metalness: 0.85,
      side: THREE.DoubleSide
    });

    var numPools = 45;
    for (var p = 0; p < numPools; p++) {
      var px = bounds.cx + (Math.random() * 2 - 1) * halfSize;
      var pz = bounds.cz + (Math.random() * 2 - 1) * halfSize;
      var pInfo = ctx.closestSampleInfo(track, px, pz);
      if (pInfo.dist < exclR + 4.0) continue;

      var py = ctx.terrainSample(track, px, pz).y + 0.02;
      var rx = 3.5 + Math.random() * 6.0;
      var rz = 2.5 + Math.random() * 5.0;

      var poolGeo = new THREE.CircleGeometry(rx, 16);
      poolGeo.rotateX(-Math.PI / 2);
      poolGeo.scale(1, 1, rz / rx);

      var poolMesh = new THREE.Mesh(poolGeo, poolMat);
      poolMesh.position.set(px, py, pz);
      poolMesh.rotation.y = Math.random() * Math.PI * 2;
      bogGroup.add(poolMesh);
    }

    // --- 2. KITUKASVUISET MÄNNYT JA HARMAAT KELOT ---
    var trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3b32, roughness: 0.92 });
    var keloMat = new THREE.MeshStandardMaterial({ color: 0x808580, roughness: 0.95 }); // Harmaa kelo
    var foliageMat = new THREE.MeshStandardMaterial({ color: 0x2e4224, roughness: 0.85 });

    var numBogTrees = 180;
    for (var i = 0; i < numBogTrees; i++) {
      var x = bounds.cx + (Math.random() * 2 - 1) * halfSize;
      var z = bounds.cz + (Math.random() * 2 - 1) * halfSize;
      var info = ctx.closestSampleInfo(track, x, z);
      if (info.dist < exclR) continue;

      var groundY = ctx.terrainSample(track, x, z).y;
      var isKelo = Math.random() < 0.35; // 35% keloja
      var scale = 0.6 + Math.random() * 0.8;

      var treeObj = new THREE.Group();

      var trunkH = (3.5 + Math.random() * 3.0) * scale;
      var trunkGeo = new THREE.CylinderGeometry(0.08 * scale, 0.22 * scale, trunkH, 7);
      trunkGeo.translate(0, trunkH / 2, 0);

      var trunkMesh = new THREE.Mesh(trunkGeo, isKelo ? keloMat : trunkMat);
      trunkMesh.castShadow = true;
      treeObj.add(trunkMesh);

      if (!isKelo) {
        // Kitukasvuisen männyn neulaskerrokset
        for (var c = 0; c < 3; c++) {
          var crownR = (1.2 - c * 0.3) * scale;
          var crownGeo = new THREE.ConeGeometry(crownR, 1.2 * scale, 6);
          crownGeo.translate(0, trunkH * (0.6 + c * 0.18), 0);
          var crownMesh = new THREE.Mesh(crownGeo, foliageMat);
          crownMesh.castShadow = true;
          treeObj.add(crownMesh);
        }
      } else {
        // Kelon kuivuneet oksat
        for (var b = 0; b < 3; b++) {
          var bGeo = new THREE.CylinderGeometry(0.02 * scale, 0.05 * scale, 1.2 * scale, 5);
          bGeo.rotateZ(0.8 * (b % 2 === 0 ? 1 : -1));
          bGeo.translate(0, trunkH * (0.5 + b * 0.15), 0);
          var bMesh = new THREE.Mesh(bGeo, keloMat);
          treeObj.add(bMesh);
        }
      }

      treeObj.position.set(x, groundY, z);
      treeObj.rotation.y = Math.random() * Math.PI * 2;
      bogGroup.add(treeObj);
    }

    // --- 3. SUOVILLAT (Valkoiset tupsut ohuiden varren päässä) ---
    var cottonStemMat = new THREE.MeshStandardMaterial({ color: 0x3d4a2b, roughness: 0.8 });
    var cottonHeadMat = new THREE.MeshStandardMaterial({ color: 0xf2f7f4, roughness: 0.9 });

    var cottonStemGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.8, 5);
    cottonStemGeo.translate(0, 0.4, 0);
    var cottonHeadGeo = new THREE.SphereGeometry(0.12, 8, 8);
    cottonHeadGeo.translate(0, 0.82, 0);

    var numCottonClusters = 220;
    for (var c = 0; c < numCottonClusters; c++) {
      var cx = bounds.cx + (Math.random() * 2 - 1) * halfSize;
      var cz = bounds.cz + (Math.random() * 2 - 1) * halfSize;
      var cInfo = ctx.closestSampleInfo(track, cx, cz);
      if (cInfo.dist < exclR) continue;

      var cy = ctx.terrainSample(track, cx, cz).y;
      var stemCount = 4 + Math.floor(Math.random() * 6);

      for (var s = 0; s < stemCount; s++) {
        var ox = cx + (Math.random() - 0.5) * 0.8;
        var oz = cz + (Math.random() - 0.5) * 0.8;
        var oy = heightAt ? heightAt(ox, oz) : cy;

        var stemMesh = new THREE.Mesh(cottonStemGeo, cottonStemMat);
        var headMesh = new THREE.Mesh(cottonHeadGeo, cottonHeadMat);

        var clusterSingle = new THREE.Group();
        clusterSingle.add(stemMesh);
        clusterSingle.add(headMesh);

        var scale = 0.7 + Math.random() * 0.5;
        clusterSingle.scale.set(scale, scale, scale);
        clusterSingle.position.set(ox, oy, oz);
        clusterSingle.rotation.y = Math.random() * Math.PI * 2;

        bogGroup.add(clusterSingle);
      }
    }

    // Helper heightAt fallbackif
    function heightAt(x, z) {
      return ctx.terrainSample(track, x, z).y;
    }

    return bogGroup;
  };
})();