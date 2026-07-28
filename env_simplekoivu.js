// env_simplekoivu.js - Simple Koivu -ympäristön 3D-määritelmä (Kevyt peruskoivu)
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

  function mergeGeometriesWithColors(parts) {
    var positions = [], normals = [], colors = [];
    for (var i = 0; i < parts.length; i++) {
      var g = parts[i].geo;
      var ng = g.index ? g.toNonIndexed() : g;
      positions.push(ng.attributes.position.array);
      normals.push(ng.attributes.normal.array);
      var count = ng.attributes.position.count;
      var carr = new Float32Array(count * 3);
      for (var k = 0; k < count; k++) {
        carr[k * 3] = parts[i].color[0];
        carr[k * 3 + 1] = parts[i].color[1];
        carr[k * 3 + 2] = parts[i].color[2];
      }
      colors.push(carr);
    }
    var merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(concatFloat32(positions), 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(concatFloat32(normals), 3));
    merged.setAttribute('color', new THREE.BufferAttribute(concatFloat32(colors), 3));
    return merged;
  }

  function makeBirchTreeGeometry(currentSeason) {
    var parts = [];
    var trunk = new THREE.CylinderGeometry(0.06, 0.13, 2.4, 7);
    trunk.translate(0, 1.2, 0);
    parts.push({ geo: trunk, color: [0.88, 0.88, 0.82] });

    var baseKnots = new THREE.CylinderGeometry(0.135, 0.14, 0.5, 7);
    baseKnots.translate(0, 0.25, 0);
    parts.push({ geo: baseKnots, color: [0.15, 0.12, 0.10] });

    var branchCount = 6;
    var leafCol;
    if (currentSeason === 'kesa') {
      leafCol = [0.22, 0.52, 0.14];
    } else if (currentSeason === 'syksy') {
      leafCol = [0.85, 0.55, 0.08];
    } else if (currentSeason === 'talvi') {
      leafCol = [0.72, 0.78, 0.80];
    } else {
      leafCol = [0.45, 0.72, 0.20];
    }

    for (var b = 0; b < branchCount; b++) {
      var bt = b / branchCount;
      var by = 1.0 + bt * 1.5;
      var angle = b * 2.3;
      var bx = Math.cos(angle) * 0.35;
      var bz = Math.sin(angle) * 0.35;

      var bGeo = new THREE.CylinderGeometry(0.02, 0.04, 0.6, 5);
      bGeo.rotateZ(0.6);
      bGeo.rotateY(angle);
      bGeo.translate(bx * 0.5, by, bz * 0.5);
      parts.push({ geo: bGeo, color: [0.20, 0.16, 0.12] });

      var crown = new THREE.DodecahedronGeometry(0.35 + (1 - bt) * 0.2, 1);
      crown.translate(bx * 1.2, by + 0.2, bz * 1.2);
      parts.push({ geo: crown, color: leafCol });
    }

    return mergeGeometriesWithColors(parts);
  }

  window.ENV_BUILDERS['simplekoivu'] = function(track, bounds, ctx) {
    var treeGeo = makeBirchTreeGeometry(ctx.currentSeason);

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