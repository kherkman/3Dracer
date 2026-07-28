// env_koivu.js - Rauduskoivu-ympäristön 3D-määritelmä (Perustuu koivu-3d.html -malliin)
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

  // Luodaan realistinen ei-toistuva tuohen tekstuuri
  function makeBirchBarkTexture() {
    var sizeX = 512, sizeY = 1024;
    var c = document.createElement('canvas'); c.width = sizeX; c.height = sizeY;
    var ctx = c.getContext('2d');

    ctx.fillStyle = '#f2f3eb';
    ctx.fillRect(0, 0, sizeX, sizeY);

    for (var i = 0; i < 800; i++) {
      var x = Math.random() * sizeX;
      var y = Math.random() * sizeY;
      var w = 8 + Math.random() * 30;
      var h = 2 + Math.random() * 6;
      ctx.fillStyle = 'rgba(' + (210 + Math.floor(Math.random() * 25)) + ',' + (215 + Math.floor(Math.random() * 20)) + ',' + (205 + Math.floor(Math.random() * 25)) + ', ' + (0.08 + Math.random() * 0.12) + ')';
      ctx.fillRect(x, y, w, h);
    }

    for (var x = 0; x < sizeX; x++) {
      var baseH = sizeY * (0.78 + Math.sin(x * 0.02) * 0.06 + (Math.random() - 0.5) * 0.04);
      var grad = ctx.createLinearGradient(x, baseH, x, sizeY);
      grad.addColorStop(0, 'rgba(25,22,18,0)');
      grad.addColorStop(0.2, 'rgba(30,25,20,0.6)');
      grad.addColorStop(0.6, 'rgba(20,16,12,0.92)');
      grad.addColorStop(1, 'rgba(12,10,8,0.99)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, baseH, 1, sizeY - baseH);
    }

    for (var i = 0; i < 40; i++) {
      var x0 = Math.random() * sizeX;
      ctx.strokeStyle = 'rgba(15, 12, 10, ' + (0.65 + Math.random() * 0.3) + ')';
      ctx.lineWidth = 1.5 + Math.random() * 3.5;
      ctx.beginPath(); ctx.moveTo(x0, sizeY);
      for (var y = sizeY; y > sizeY * 0.72; y -= 15) {
        x0 += (Math.random() - 0.5) * 12;
        ctx.lineTo(x0, y);
      }
      ctx.stroke();
    }

    for (var i = 0; i < 900; i++) {
      var x = Math.random() * sizeX;
      var y = Math.random() * sizeY * 0.78;
      var w = 4 + Math.random() * 24;
      var h = 1.2 + Math.random() * 2.8;

      ctx.fillStyle = 'rgba(22, 18, 14, ' + (0.35 + Math.random() * 0.5) + ')';
      ctx.beginPath();
      ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  // Koivunlehtitekstuuri
  function makeBirchLeafTexture() {
    var size = 128;
    var c = document.createElement('canvas'); c.width = size; c.height = size;
    var ctx = c.getContext('2d'); ctx.clearRect(0, 0, size, size);
    var cx = size / 2, topY = 8, botY = size - 12;

    ctx.fillStyle = '#5fb332'; ctx.beginPath(); ctx.moveTo(cx, topY);
    ctx.quadraticCurveTo(cx + size * 0.22, size * 0.18, cx + size * 0.18, size * 0.25);
    ctx.quadraticCurveTo(cx + size * 0.42, size * 0.35, cx + size * 0.36, size * 0.48);
    ctx.quadraticCurveTo(cx + size * 0.35, size * 0.62, cx + size * 0.28, size * 0.72);
    ctx.quadraticCurveTo(cx + size * 0.14, size * 0.82, cx, botY);

    ctx.quadraticCurveTo(cx - size * 0.14, size * 0.82, cx - size * 0.28, size * 0.72);
    ctx.quadraticCurveTo(cx - size * 0.35, size * 0.62, cx - size * 0.36, size * 0.48);
    ctx.quadraticCurveTo(cx - size * 0.42, size * 0.35, cx - size * 0.18, size * 0.25);
    ctx.quadraticCurveTo(cx - size * 0.22, size * 0.18, cx, topY);
    ctx.closePath(); ctx.fill();

    ctx.strokeStyle = 'rgba(30,60,15,0.45)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(cx, topY + 4); ctx.lineTo(cx, botY); ctx.stroke();

    var tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  var cachedBarkTex = null;
  var cachedLeafTex = null;
  var cachedLeafGeo = null;

  function buildSingleBirch(age, season) {
    if (!cachedBarkTex) cachedBarkTex = makeBirchBarkTexture();
    if (!cachedLeafTex) cachedLeafTex = makeBirchLeafTexture();
    if (!cachedLeafGeo) cachedLeafGeo = makeCrossPlaneGeo(0.38, 0.40);

    var birchBarkMat = new THREE.MeshStandardMaterial({ map: cachedBarkTex, roughness: 0.88 });
    var birchTwigMat = new THREE.MeshStandardMaterial({ color: 0x242322, roughness: 0.92, metalness: 0.04 });

    var leafMat = new THREE.MeshStandardMaterial({
      map: cachedLeafTex,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
      roughness: 0.8
    });

    var thickGeometries = [], thinGeometries = [], leafInstances = [];
    var up = new THREE.Vector3(0, 1, 0);

    var MAX_DEPTH = age === 'nuori' ? 5 : 7;
    var MAX_BRANCHES = age === 'nuori' ? 400 : 1200;
    var MAX_LEAVES = age === 'nuori' ? 2500 : 7500;
    var branchCount = 0;

    function addBranchGeo(start, dir, length, r0, r1, depth) {
      var geo = new THREE.CylinderGeometry(r1, r0, length, 5, 1, false);
      geo.translate(0, length / 2, 0);
      var quat = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
      geo.applyMatrix4(new THREE.Matrix4().compose(start, quat, new THREE.Vector3(1, 1, 1)));

      if (depth >= 2 || r0 < 0.05) {
        thinGeometries.push(geo);
      } else {
        thickGeometries.push(geo);
      }
    }

    function grow(start, dir, length, radius, depth) {
      var cur = start.clone();
      var curDir = dir.clone().normalize();

      if (depth >= 2) {
        curDir.y -= (0.08 + (depth - 1) * 0.06);
        curDir.normalize();
      }

      var end = cur.clone().addScaledVector(curDir, length);
      addBranchGeo(cur, curDir, length, radius, radius * 0.70, depth);
      branchCount++;

      if (depth >= 2 && leafInstances.length < MAX_LEAVES) {
        var density = age === 'nuori' ? 3 : 5;
        for (var k = 0; k < density; k++) {
          var midP = cur.clone().lerp(end, Math.random()).add(new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5));
          var quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI * 2, Math.random() * Math.PI));
          leafInstances.push({ p: midP, quat: quat, scale: 0.75 + Math.random() * 0.4, rnd: Math.random() });
        }
      }

      if (depth >= MAX_DEPTH || radius < 0.008 || branchCount > MAX_BRANCHES) {
        if (leafInstances.length < MAX_LEAVES) {
          var clusterCount = age === 'nuori' ? 8 : 14;
          for (var i = 0; i < clusterCount; i++) {
            var p = end.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.7));
            var quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI * 2, Math.random() * Math.PI));
            leafInstances.push({ p: p, quat: quat, scale: 0.8 + Math.random() * 0.45, rnd: Math.random() });
          }
        }
        return;
      }

      var numChildren = depth < 2 ? 2 : (Math.random() < 0.6 ? 2 : 1);
      for (var i = 0; i < numChildren; i++) {
        var axis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        var angleDeg = depth < 2 ? (20 + Math.random() * 25) : (22 + Math.random() * 30);
        var childDir = curDir.clone().applyAxisAngle(axis, THREE.MathUtils.degToRad(angleDeg)).normalize();
        childDir.y += depth < 2 ? 0.15 : -0.04 * (depth - 1);
        childDir.normalize();

        grow(end, childDir, length * (0.68 + Math.random() * 0.12), radius * (0.66 + Math.random() * 0.08), depth + 1);
      }
    }

    var trunkHeight = age === 'nuori' ? (6.0 + Math.random() * 1.5) : (11.5 + Math.random() * 3.0);
    var radiusBase = age === 'nuori' ? (0.20 + Math.random() * 0.04) : (0.36 + Math.random() * 0.08);

    grow(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.02, 1, 0.02).normalize(), trunkHeight * 0.30, radiusBase, 0);

    var trunkMidCount = age === 'nuori' ? 10 : 22;
    for (var m = 0; m < trunkMidCount; m++) {
      var hRatio = 0.20 + Math.random() * 0.60;
      var startP = new THREE.Vector3(
        Math.sin(hRatio * 3.1) * 0.12,
        hRatio * trunkHeight,
        Math.cos(hRatio * 2.3) * 0.10
      );
      var angle = Math.random() * Math.PI * 2;
      var outDir = new THREE.Vector3(Math.cos(angle), -0.10 - Math.random() * 0.25, Math.sin(angle)).normalize();
      grow(startP, outDir, (1.0 + Math.random() * 1.5), 0.025 + Math.random() * 0.015, 2);
    }

    var singleGroup = new THREE.Group();

    if (thickGeometries.length) {
      var thickMerged = mergeGeometries(thickGeometries);
      thickMerged.computeVertexNormals();
      var thickMesh = new THREE.Mesh(thickMerged, birchBarkMat);
      thickMesh.castShadow = thickMesh.receiveShadow = true;
      singleGroup.add(thickMesh);
    }

    if (thinGeometries.length) {
      var thinMerged = mergeGeometries(thinGeometries);
      thinMerged.computeVertexNormals();
      var thinMesh = new THREE.Mesh(thinMerged, birchTwigMat);
      thinMesh.castShadow = thinMesh.receiveShadow = true;
      singleGroup.add(thinMesh);
    }

    if (leafInstances.length > 0) {
      var instLeafMesh = new THREE.InstancedMesh(cachedLeafGeo, leafMat, leafInstances.length);
      var m4 = new THREE.Matrix4();
      var col = new THREE.Color();

      for (var i = 0; i < leafInstances.length; i++) {
        var L = leafInstances[i];
        var t = L.rnd;
        var scale = L.scale;

        if (season === 'kevat') {
          col.setRGB(0.58 + t * 0.08, 0.85 + t * 0.08, 0.25);
          scale *= 0.55;
        } else if (season === 'syksy') {
          if (t < 0.25) col.setRGB(0.88 - t * 0.1, 0.18 + Math.random() * 0.1, 0.08);
          else if (t < 0.55) col.setRGB(0.92, 0.42 + Math.random() * 0.15, 0.05);
          else col.setRGB(0.95 - (t - 0.5) * 0.1, 0.75 - (t - 0.5) * 0.15, 0.06);
        } else if (season === 'talvi') {
          col.setRGB(0.85, 0.88, 0.90);
          scale = 0.00001;
        } else { // kesä
          col.setRGB(0.28 + t * 0.08, 0.68 + t * 0.08, 0.16);
        }

        m4.compose(L.p, L.quat, new THREE.Vector3(scale, scale, scale));
        instLeafMesh.setMatrixAt(i, m4);
        instLeafMesh.setColorAt(i, col);
      }
      instLeafMesh.instanceMatrix.needsUpdate = true;
      if (instLeafMesh.instanceColor) instLeafMesh.instanceColor.needsUpdate = true;
      instLeafMesh.castShadow = true;
      singleGroup.add(instLeafMesh);
    }

    return singleGroup;
  }

  window.ENV_BUILDERS['koivu'] = function(track, bounds, ctx) {
    var forestGroup = new THREE.Group();

    var desired = 280 + Math.floor(Math.random() * 120);
    var maxAttempts = desired * 6;
    var accepted = [];
    var halfSize = bounds.size / 2 * 0.92;
    var exclR = ctx.ROAD_HALF_WIDTH + ctx.CURB_WIDTH + 2.5;
    var attempts = 0;

    while (accepted.length < desired && attempts < maxAttempts) {
      attempts++;
      var x = bounds.cx + (Math.random() * 2 - 1) * halfSize;
      var z = bounds.cz + (Math.random() * 2 - 1) * halfSize;
      var info = ctx.closestSampleInfo(track, x, z);
      if (info.dist < exclR) continue;
      accepted.push({ x: x, z: z });
    }

    var numTemplates = 10;
    var templates = [];
    var season = ctx.currentSeason || 'kesa';

    for (var t = 0; t < numTemplates; t++) {
      var age = (t % 2 === 0) ? 'nuori' : 'vanha';
      var treeMesh = buildSingleBirch(age, season);
      templates.push(treeMesh);
    }

    for (var i = 0; i < accepted.length; i++) {
      var p = accepted[i];
      var y = ctx.terrainSample(track, p.x, p.z).y;

      var template = templates[i % templates.length];
      var treeInstance = template.clone(true);

      var scale = 0.7 + Math.random() * 0.55;
      treeInstance.scale.set(scale, scale * (0.9 + Math.random() * 0.25), scale);
      treeInstance.position.set(p.x, y, p.z);
      treeInstance.rotation.y = Math.random() * Math.PI * 2;

      forestGroup.add(treeInstance);
    }

    return forestGroup;
  };
})();