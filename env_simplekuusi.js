// env_simple.js - Simple-puuympäristön 3D-määritelmä
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

  function mergeGeometriesWithColors(parts) {
    var positions = [], normals = [], colors = [];
    for (var i=0;i<parts.length;i++) {
      var g = parts[i].geo;
      var ng = g.index ? g.toNonIndexed() : g;
      positions.push(ng.attributes.position.array);
      normals.push(ng.attributes.normal.array);
      var count = ng.attributes.position.count;
      var carr = new Float32Array(count*3);
      for (var k=0;k<count;k++) { carr[k*3]=parts[i].color[0]; carr[k*3+1]=parts[i].color[1]; carr[k*3+2]=parts[i].color[2]; }
      colors.push(carr);
    }
    var merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(concatFloat32(positions), 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(concatFloat32(normals), 3));
    merged.setAttribute('color', new THREE.BufferAttribute(concatFloat32(colors), 3));
    return merged;
  }

  function makeSimpleTreeGeometry(currentSeason) {
    var trunk = new THREE.CylinderGeometry(0.05, 0.09, 1.0, 5); trunk.translate(0, 0.5, 0);
    var f1 = new THREE.ConeGeometry(0.62, 1.1, 7); f1.translate(0, 1.15, 0);
    var f2 = new THREE.ConeGeometry(0.48, 0.95, 7); f2.translate(0, 1.75, 0);
    var f3 = new THREE.ConeGeometry(0.32, 0.8, 7); f3.translate(0, 2.35, 0);

    var folCol1, folCol2, folCol3;
    if (currentSeason === 'kesa') {
      folCol1 = [0.13, 0.30, 0.14]; folCol2 = [0.15, 0.34, 0.16]; folCol3 = [0.18, 0.38, 0.18];
    } else if (currentSeason === 'syksy') {
      folCol1 = [0.45, 0.32, 0.12]; folCol2 = [0.52, 0.38, 0.14]; folCol3 = [0.60, 0.45, 0.16];
    } else if (currentSeason === 'talvi') {
      folCol1 = [0.75, 0.82, 0.85]; folCol2 = [0.80, 0.88, 0.90]; folCol3 = [0.88, 0.92, 0.95];
    } else {
      folCol1 = [0.22, 0.45, 0.18]; folCol2 = [0.26, 0.50, 0.20]; folCol3 = [0.30, 0.55, 0.22];
    }

    return mergeGeometriesWithColors([
      { geo: trunk, color: [0.30, 0.20, 0.12] },
      { geo: f1, color: folCol1 },
      { geo: f2, color: folCol2 },
      { geo: f3, color: folCol3 }
    ]);
  }

  window.ENV_BUILDERS['simple'] = function(track, bounds, ctx) {
    var treeGeo = makeSimpleTreeGeometry(ctx.currentSeason);

    var desired = 550 + Math.floor(Math.random() * 300);
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

    var treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
    var inst = new THREE.InstancedMesh(treeGeo, treeMat, accepted.length);
    var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(), euler = new THREE.Euler();

    for (var i = 0; i < accepted.length; i++) {
      var p = accepted[i];
      var y = ctx.terrainSample(track, p.x, p.z).y;
      euler.set(0, Math.random() * Math.PI * 2, 0);
      q.setFromEuler(euler);
      var s = 0.75 + Math.random() * 0.9;
      m4.compose(new THREE.Vector3(p.x, y, p.z), q, new THREE.Vector3(s, s * (0.9 + Math.random() * 0.3), s));
      inst.setMatrixAt(i, m4);
      var tint = 0.88 + Math.random() * 0.24;
      col.setRGB(tint, tint, tint);
      inst.setColorAt(i, col);
    }

    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.castShadow = true; inst.receiveShadow = true;
    return inst;
  };
})();