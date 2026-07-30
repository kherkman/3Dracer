// env_jattikukkaniitty.js - Jättikukkaniitty-ympäristön 3D-määritelmä (Perustuu forest7.html-malleihin)
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

  function makeCrossPlaneGeo(w, h) {
    var p1 = new THREE.PlaneGeometry(w, h);
    var p2 = new THREE.PlaneGeometry(w, h);
    p2.rotateY(Math.PI / 2);
    p1.translate(0, h / 2, 0); p2.translate(0, h / 2, 0);
    return mergeGeometries([p1, p2]);
  }

  // --- KUKKATEKSTUURIT KANVAKSELTA ---
  function createFlowerTextures() {
    var c1 = document.createElement('canvas'); c1.width = c1.height = 128;
    var ctx1 = c1.getContext('2d'); ctx1.fillStyle = '#ffffff';
    for (var i = 0; i < 18; i++) {
      ctx1.save(); ctx1.translate(64, 64); ctx1.rotate((Math.PI * 2 / 18) * i);
      ctx1.beginPath(); ctx1.ellipse(0, -32, 5, 24, 0, 0, Math.PI * 2); ctx1.fill(); ctx1.restore();
    }

    var c2 = document.createElement('canvas'); c2.width = c2.height = 128;
    var ctx2 = c2.getContext('2d'); ctx2.fillStyle = '#ffd23f';
    for (var i = 0; i < 26; i++) {
      ctx2.save(); ctx2.translate(64, 64); ctx2.rotate((Math.PI * 2 / 26) * i);
      ctx2.beginPath(); ctx2.ellipse(0, -32, 4, 26, 0, 0, Math.PI * 2); ctx2.fill(); ctx2.restore();
    }

    return {
      daisy: new THREE.CanvasTexture(c1),
      dandelion: new THREE.CanvasTexture(c2)
    };
  }

  function makeFluffySphereGeo(radius, spikeCount) {
    var spikeGeometries = [], up = new THREE.Vector3(0, 1, 0), goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < spikeCount; i++) {
      var t = (i + 0.5) / spikeCount, phi = Math.acos(1 - 2 * t), theta = goldenAngle * i;
      var dir = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)).normalize();
      var len = radius * (0.8 + Math.random() * 0.4);
      var spike = new THREE.CylinderGeometry(radius * 0.015, radius * 0.03, len, 3, 1, true);
      spike.translate(0, len / 2, 0);
      var quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      spike.applyMatrix4(new THREE.Matrix4().compose(dir.clone().multiplyScalar(radius * 0.12), quat, new THREE.Vector3(1, 1, 1)));
      spikeGeometries.push(spike);
    }
    var merged = mergeGeometries(spikeGeometries);
    merged.computeVertexNormals();
    return merged;
  }

  var flowerTexCache = null;

  window.ENV_BUILDERS['jattikukkaniitty'] = function(track, bounds, ctx) {
    var meadowGroup = new THREE.Group();

    if (!flowerTexCache) flowerTexCache = createFlowerTextures();

    var stemMat = new THREE.MeshStandardMaterial({ color: 0x4a7c2f, roughness: 0.8 });
    var daisyPetalMat = new THREE.MeshStandardMaterial({ map: flowerTexCache.daisy, alphaTest: 0.25, side: THREE.DoubleSide, roughness: 0.6 });
    var daisyCenterMat = new THREE.MeshStandardMaterial({ color: 0xf5ba20, roughness: 0.5 });

    var dandelionPetalMat = new THREE.MeshStandardMaterial({ map: flowerTexCache.dandelion, alphaTest: 0.25, side: THREE.DoubleSide, roughness: 0.6 });
    var dandelionCenterMat = new THREE.MeshStandardMaterial({ color: 0xe59b12, roughness: 0.5 });
    var puffballMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, transparent: true, opacity: 0.9 });

    var bloomPlaneGeo = new THREE.PlaneGeometry(2.4, 2.4); bloomPlaneGeo.rotateX(-Math.PI / 2);
    var centerSphereGeo = new THREE.SphereGeometry(0.5, 12, 8); centerSphereGeo.scale(1, 0.4, 1);
    var puffballGeo = makeFluffySphereGeo(1.2, 50);

    var numFlowerGroups = 260;
    var halfSize = bounds.size / 2 * 0.92;
    var exclR = ctx.ROAD_HALF_WIDTH + ctx.CURB_WIDTH + 3.0;

    for (var i = 0; i < numFlowerGroups; i++) {
      var x = bounds.cx + (Math.random() * 2 - 1) * halfSize;
      var z = bounds.cz + (Math.random() * 2 - 1) * halfSize;
      var info = ctx.closestSampleInfo(track, x, z);
      if (info.dist < exclR) continue;

      var groundY = ctx.terrainSample(track, x, z).y;
      var flowerType = Math.random(); // 0-0.4 daisy, 0.4-0.8 dandelion/puffball, 0.8-1.0 grass
      var scale = 1.8 + Math.random() * 2.8;

      var singleFlower = new THREE.Group();

      // Varsi
      var stemH = (3.0 + Math.random() * 2.5) * scale;
      var stemGeo = new THREE.CylinderGeometry(0.08 * scale, 0.14 * scale, stemH, 7);
      stemGeo.translate(0, stemH / 2, 0);
      var stemMesh = new THREE.Mesh(stemGeo, stemMat);
      stemMesh.castShadow = true;
      singleFlower.add(stemMesh);

      var headY = stemH;

      if (flowerType < 0.42) {
        // Päivänkakkara
        var petalMesh = new THREE.Mesh(bloomPlaneGeo, daisyPetalMat);
        petalMesh.position.set(0, headY, 0);
        petalMesh.scale.set(scale, scale, scale);

        var centerMesh = new THREE.Mesh(centerSphereGeo, daisyCenterMat);
        centerMesh.position.set(0, headY + 0.05 * scale, 0);
        centerMesh.scale.set(scale, scale, scale);

        singleFlower.add(petalMesh);
        singleFlower.add(centerMesh);
      } else if (flowerType < 0.82) {
        // Voikukka tai Haituvapallo
        if (Math.random() < 0.35) {
          // Haituvapallo (voikukan haituvat)
          var puffMesh = new THREE.Mesh(puffballGeo, puffballMat);
          puffMesh.position.set(0, headY, 0);
          puffMesh.scale.set(scale, scale, scale);
          singleFlower.add(puffMesh);
        } else {
          // Keltainen voikukka
          var petalMesh = new THREE.Mesh(bloomPlaneGeo, dandelionPetalMat);
          petalMesh.position.set(0, headY, 0);
          petalMesh.scale.set(scale, scale, scale);

          var centerMesh = new THREE.Mesh(centerSphereGeo, dandelionCenterMat);
          centerMesh.position.set(0, headY + 0.04 * scale, 0);
          centerMesh.scale.set(scale, scale, scale);

          singleFlower.add(petalMesh);
          singleFlower.add(centerMesh);
        }
      } else {
        // Jättimäinen ruohotupsu
        var grassGeo = makeCrossPlaneGeo(0.8 * scale, 3.5 * scale);
        var grassMat = new THREE.MeshStandardMaterial({ color: 0x68a33c, roughness: 0.8, side: THREE.DoubleSide });
        var grassMesh = new THREE.Mesh(grassGeo, grassMat);
        grassMesh.position.set(0, 0, 0);
        singleFlower.add(grassMesh);
      }

      singleFlower.position.set(x, groundY, z);
      singleFlower.rotation.y = Math.random() * Math.PI * 2;
      meadowGroup.add(singleFlower);
    }

    return meadowGroup;
  };
})();