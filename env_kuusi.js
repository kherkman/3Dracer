// env_kuusi.js - Kuusi-ympäristön 3D-määritelmä (Satunnaisgeneroidut kuusi-3d-puu.html -mallit)
(function() {
  window.ENV_BUILDERS = window.ENV_BUILDERS || {};

  function concatFloat32(arrays) {
    var total = 0;
    for (var i=0;i<arrays.length;i++) total += arrays[i].length;
    var result = new Float32Array(total);
    var offset = 0;
    for (var i=0;i<arrays.length;i++) { result.set(arrays[i], offset); offset += arrays[i].length; }
    return result;
  }

  function mergeGeometries(geometries) {
    var positions = [], normals = [], uvs = [];
    for (var i=0;i<geometries.length;i++) {
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

  // Neulastupsun geometria (5 ohutta viuhkamaisesti ryhmiteltyä kartiota)
  function makeNeedleGeometry() {
    var parts = [];
    var n = 5;
    for (var i=0;i<n;i++){
      var geo = new THREE.ConeGeometry(0.09, 0.85, 5, 1, true);
      geo.translate(0, 0.425, 0);
      var ang = (i/(n-1) - 0.5) * 1.15;
      geo.rotateZ(ang);
      geo.rotateY(i * 1.3);
      parts.push(geo);
    }
    return mergeGeometries(parts);
  }

  // Käpygeometria
  function makeConeGeometry() {
    var body = new THREE.ConeGeometry(0.11, 0.34, 7);
    body.translate(0, -0.17, 0);
    return body;
  }

  // Kaarnatekstuuri rungolle ja oksille
  function createBarkTexture() {
    var size = 256;
    var c = document.createElement('canvas'); c.width = size; c.height = size;
    var ctx = c.getContext('2d');
    var grad = ctx.createLinearGradient(0,0,0,size);
    grad.addColorStop(0, '#4a382a');
    grad.addColorStop(0.5, '#3b2c20');
    grad.addColorStop(1, '#2c2018');
    ctx.fillStyle = grad; ctx.fillRect(0,0,size,size);
    for (var i=0;i<150;i++) {
      var x = Math.random()*size;
      var w = 2+Math.random()*5;
      ctx.fillStyle = 'rgba(15,10,6,0.4)';
      ctx.fillRect(x, 0, w, size);
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 4);
    return tex;
  }

  var cachedBarkTex = null;
  var cachedNeedleGeo = null;
  var cachedConeGeo = null;

  // Yksittäisen 3D-kuusen proseduraalinen generaattori
  function buildSingleTree(age, season) {
    if (!cachedBarkTex) cachedBarkTex = createBarkTexture();
    if (!cachedNeedleGeo) cachedNeedleGeo = makeNeedleGeometry();
    if (!cachedConeGeo) cachedConeGeo = makeConeGeometry();

    var branchGeometries = [];
    var needleInstances = [];
    var pineconeInstances = [];
    var up = new THREE.Vector3(0,1,0);

    function addBranchGeo(start, dir, length, r0, r1) {
      var geo = new THREE.CylinderGeometry(r1, r0, length, 5, 1, false);
      geo.translate(0, length/2, 0);
      var quat = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
      var mat = new THREE.Matrix4().compose(start, quat, new THREE.Vector3(1,1,1));
      geo.applyMatrix4(mat);
      branchGeometries.push(geo);
    }

    function addNeedleCluster(pos, dir, scale) {
      var quat = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
      needleInstances.push({ p: pos.clone(), quat: quat, scale: scale });
    }

    function addPinecone(pos, dir) {
      var quat = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
      pineconeInstances.push({ p: pos.clone(), quat: quat, scale: 0.8+Math.random()*0.5 });
    }

    function growBranch(start, dir, length, radius, depth, maxDepth) {
      var segCount = 3;
      var cur = start.clone();
      var curDir = dir.clone().normalize();
      var segLen = length / segCount;
      var curRadius = radius;

      for (var s=0; s<segCount; s++) {
        var t = s/segCount;
        var droopAmount = 0.10 + depth*0.05 + t*0.16;
        curDir.y -= droopAmount * 0.3;
        curDir.normalize();
        var r0 = curRadius * (1 - t*0.15);
        var r1 = curRadius * (1 - (t+1/segCount)*0.55);
        addBranchGeo(cur, curDir, segLen, Math.max(r0,0.008), Math.max(r1,0.006));
        var next = cur.clone().addScaledVector(curDir, segLen);

        if (Math.random() < 0.8) {
          var tuftDir = curDir.clone().lerp(new THREE.Vector3(Math.random()-0.5, -0.2+Math.random()*0.3, Math.random()-0.5), 0.5).normalize();
          addNeedleCluster(next, tuftDir, (0.5+Math.random()*0.4) * (1-depth*0.15));
        }
        cur = next;
      }

      if (depth < maxDepth && radius > 0.02) {
        var childCount = Math.random() < 0.5 ? 2 : 1;
        for (var i=0;i<childCount;i++){
          var branchAngle = Math.random()*Math.PI*2;
          var spread = new THREE.Vector3(Math.cos(branchAngle)*0.6, -0.05+Math.random()*0.15, Math.sin(branchAngle)*0.6);
          var childDir = curDir.clone().multiplyScalar(0.5).add(spread).normalize();
          var childLen = length * (0.45 + Math.random()*0.15);
          var childRadius = radius * 0.55;
          growBranch(cur, childDir, childLen, childRadius, depth+1, maxDepth);
        }
      } else {
        addNeedleCluster(cur, curDir, 0.6+Math.random()*0.4);
        if (age === 'vanha' && Math.random() < 0.12) addPinecone(cur, curDir);
      }
    }

    var trunkHeight = age === 'nuori' ? (3.5 + Math.random()*1.5) : (6.5 + Math.random()*2.5);
    var radiusBase  = age === 'nuori' ? (0.12 + Math.random()*0.04) : (0.22 + Math.random()*0.08);
    var trunkSegCount = 10;
    var trunkPoints = [];
    for (var i=0;i<=trunkSegCount;i++){
      var t = i/trunkSegCount;
      var sway = Math.sin(t*3.1 + Math.random()*0.5) * 0.12 * t;
      var sway2 = Math.cos(t*2.3 + Math.random()*0.5) * 0.08 * t;
      trunkPoints.push(new THREE.Vector3(sway, t*trunkHeight, sway2));
    }
    var trunkCurve = new THREE.CatmullRomCurve3(trunkPoints);

    for (var i=0;i<trunkSegCount;i++){
      var t0 = i/trunkSegCount, t1 = (i+1)/trunkSegCount;
      var p0 = trunkCurve.getPointAt(t0), p1 = trunkCurve.getPointAt(t1);
      var dir = p1.clone().sub(p0).normalize();
      var r0 = radiusBase * (1 - t0*0.92);
      var r1 = radiusBase * (1 - t1*0.92);
      addBranchGeo(p0, dir, p0.distanceTo(p1), Math.max(r0,0.015), Math.max(r1,0.012));
    }

    var crownStart = age === 'nuori' ? 0.15 : 0.25;
    var whorlCount = age === 'nuori' ? 7 : 12;
    for (var w=0; w<whorlCount; w++){
      var t = crownStart + (w/(whorlCount-1)) * (0.975 - crownStart);
      var heightFactor = (t - crownStart) / (1 - crownStart);
      var basePos = trunkCurve.getPointAt(t);
      var lengthFactor = Math.pow(1.0 - heightFactor, 1.05);
      var maxBranchLen = age === 'nuori' ? 1.4 : 2.6;
      var branchLen = 0.3 + lengthFactor * maxBranchLen;
      var branchesInWhorl = 3 + Math.floor(Math.random()*3);
      var angleOffset = Math.random()*Math.PI*2;

      for (var b=0; b<branchesInWhorl; b++){
        var angle = angleOffset + (b/branchesInWhorl)*Math.PI*2 + (Math.random()-0.5)*0.35;
        var upBias = 0.20 - heightFactor*0.28;
        var outDir = new THREE.Vector3(Math.cos(angle), upBias, Math.sin(angle)).normalize();
        var branchRadius = 0.035 + lengthFactor*0.03;
        var maxDepth = branchLen > 1.6 ? 1 : 0;
        growBranch(basePos, outDir, branchLen, branchRadius, 0, maxDepth);
      }
    }

    var tipPos = trunkCurve.getPointAt(0.99);
    for (var i=0;i<4;i++){
      var angle = (i/4)*Math.PI*2;
      var dir = new THREE.Vector3(Math.cos(angle)*0.35, 1, Math.sin(angle)*0.35).normalize();
      addNeedleCluster(tipPos, dir, 0.35);
    }
    addNeedleCluster(new THREE.Vector3(tipPos.x, tipPos.y+0.25, tipPos.z), new THREE.Vector3(0,1,0), 0.35);

    var treeGroup = new THREE.Group();

    if (branchGeometries.length > 0) {
      var mergedTrunkGeo = mergeGeometries(branchGeometries);
      mergedTrunkGeo.computeVertexNormals();
      var barkMat = new THREE.MeshStandardMaterial({
        map: cachedBarkTex,
        roughness: 0.92,
        metalness: 0.04
      });
      var trunkMesh = new THREE.Mesh(mergedTrunkGeo, barkMat);
      trunkMesh.castShadow = true;
      trunkMesh.receiveShadow = true;
      treeGroup.add(trunkMesh);
    }

    var needleCol;
    if (season === 'kesa') {
      needleCol = new THREE.Color(0x1c4d2a);
    } else if (season === 'syksy') {
      needleCol = new THREE.Color(0x3a4820);
    } else if (season === 'talvi') {
      needleCol = new THREE.Color(0xc2d8d2);
    } else {
      needleCol = new THREE.Color(0x2d6832);
    }

    if (needleInstances.length > 0) {
      var needleMat = new THREE.MeshStandardMaterial({
        color: needleCol,
        roughness: 0.85,
        metalness: 0.03,
        side: THREE.DoubleSide
      });
      var instNeedleMesh = new THREE.InstancedMesh(cachedNeedleGeo, needleMat, needleInstances.length);
      var m4 = new THREE.Matrix4();
      var col = new THREE.Color();

      for (var i=0; i<needleInstances.length; i++) {
        var N = needleInstances[i];
        m4.compose(N.p, N.quat, new THREE.Vector3(N.scale, N.scale, N.scale));
        instNeedleMesh.setMatrixAt(i, m4);
        var variation = (Math.random() - 0.5) * 0.06;
        col.setRGB(needleCol.r + variation, needleCol.g + variation, needleCol.b + variation);
        instNeedleMesh.setColorAt(i, col);
      }
      instNeedleMesh.instanceMatrix.needsUpdate = true;
      if (instNeedleMesh.instanceColor) instNeedleMesh.instanceColor.needsUpdate = true;
      instNeedleMesh.castShadow = true;
      instNeedleMesh.receiveShadow = true;
      treeGroup.add(instNeedleMesh);
    }

    if (pineconeInstances.length > 0) {
      var coneMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.9 });
      var instConeMesh = new THREE.InstancedMesh(cachedConeGeo, coneMat, pineconeInstances.length);
      var m4c = new THREE.Matrix4();
      for (var i=0; i<pineconeInstances.length; i++) {
        var P = pineconeInstances[i];
        m4c.compose(P.p, P.quat, new THREE.Vector3(P.scale, P.scale, P.scale));
        instConeMesh.setMatrixAt(i, m4c);
      }
      instConeMesh.instanceMatrix.needsUpdate = true;
      instConeMesh.castShadow = true;
      treeGroup.add(instConeMesh);
    }

    return treeGroup;
  }

  window.ENV_BUILDERS['kuusi'] = function(track, bounds, ctx) {
    var forestGroup = new THREE.Group();

    var desired = 320 + Math.floor(Math.random() * 160);
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

    var numTemplates = 12;
    var templates = [];
    var seasons = ctx.currentSeason || 'kesa';

    for (var t = 0; t < numTemplates; t++) {
      var age = (t % 2 === 0) ? 'nuori' : 'vanha';
      var treeMesh = buildSingleTree(age, seasons);
      templates.push(treeMesh);
    }

    for (var i = 0; i < accepted.length; i++) {
      var p = accepted[i];
      var y = ctx.terrainSample(track, p.x, p.z).y;

      var template = templates[i % templates.length];
      var treeInstance = template.clone(true);

      var scale = 0.75 + Math.random() * 0.65;
      treeInstance.scale.set(scale, scale * (0.9 + Math.random() * 0.25), scale);
      treeInstance.position.set(p.x, y, p.z);
      treeInstance.rotation.y = Math.random() * Math.PI * 2;

      forestGroup.add(treeInstance);
    }

    return forestGroup;
  };
})();