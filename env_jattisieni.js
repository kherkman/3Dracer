// env_jattisieni.js - Jättisieni-ympäristön 3D-määritelmä
(function() {
  window.ENV_BUILDERS = window.ENV_BUILDERS || {};

  window.ENV_BUILDERS['jattisieni'] = function(track, bounds, ctx) {
    var shroomGroup = new THREE.Group();

    // --- KAKSI ERIVÄRISTÄ AURINKOA PURPPURALLE TAIVAALLE ---
    // Ensimmäinen aurinko (Neon Magenta / Vaaleanpunainen)
    var sun1Mat = new THREE.MeshBasicMaterial({ color: 0xff00aa });
    var sun1Mesh = new THREE.Mesh(new THREE.SphereGeometry(14, 24, 24), sun1Mat);
    sun1Mesh.position.set(bounds.cx + 120, 85, bounds.cz + 160);
    shroomGroup.add(sun1Mesh);

    // Toinen aurinko (Neon Cyan / Syaani)
    var sun2Mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    var sun2Mesh = new THREE.Mesh(new THREE.SphereGeometry(9, 24, 24), sun2Mat);
    sun2Mesh.position.set(bounds.cx - 150, 105, bounds.cz - 110);
    shroomGroup.add(sun2Mesh);

    var neonCapColors = [0x00f0ff, 0xff00cc, 0x00ff66, 0xa000ff, 0xffee00, 0xff3300];
    var stemMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.3,
      emissive: 0x334455,
      emissiveIntensity: 0.35
    });

    var numMushrooms = 220;
    var halfSize = bounds.size / 2 * 0.92;
    var exclR = ctx.ROAD_HALF_WIDTH + ctx.CURB_WIDTH + 2.5;

    for (var i = 0; i < numMushrooms; i++) {
      var x = bounds.cx + (Math.random() * 2 - 1) * halfSize;
      var z = bounds.cz + (Math.random() * 2 - 1) * halfSize;
      var info = ctx.closestSampleInfo(track, x, z);
      if (info.dist < exclR) continue;

      var groundY = ctx.terrainSample(track, x, z).y;
      var scale = 0.8 + Math.random() * 2.2;
      var capColor = neonCapColors[Math.floor(Math.random() * neonCapColors.length)];

      var singleShroom = new THREE.Group();

      // Varsi
      var stemH = 2.5 * scale;
      var stemGeo = new THREE.CylinderGeometry(0.25 * scale, 0.45 * scale, stemH, 8);
      stemGeo.translate(0, stemH / 2, 0);
      var stemMesh = new THREE.Mesh(stemGeo, stemMat);
      stemMesh.castShadow = true;
      singleShroom.add(stemMesh);

      // Lakki (Pyöreä tattimainen hohtava sieni)
      var capRadius = (1.1 + Math.random() * 0.7) * scale;
      var capGeo = new THREE.SphereGeometry(capRadius, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
      capGeo.scale(1.0, 0.65, 1.0);
      capGeo.translate(0, stemH + 0.1 * scale, 0);

      var capMat = new THREE.MeshStandardMaterial({
        color: capColor,
        emissive: capColor,
        emissiveIntensity: 0.9,
        roughness: 0.2
      });

      var capMesh = new THREE.Mesh(capGeo, capMat);
      capMesh.castShadow = true;
      singleShroom.add(capMesh);

      // Pilkut lakkiin
      for (var dot = 0; dot < 6; dot++) {
        var dGeo = new THREE.SphereGeometry(0.12 * scale, 6, 6);
        var dMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        var dMesh = new THREE.Mesh(dGeo, dMat);
        var da = Math.random() * Math.PI * 2;
        var dr = Math.random() * capRadius * 0.75;
        dMesh.position.set(
          Math.cos(da) * dr,
          stemH + (0.35 + Math.random() * 0.25) * scale,
          Math.sin(da) * dr
        );
        singleShroom.add(dMesh);
      }

      singleShroom.position.set(x, groundY, z);
      singleShroom.rotation.y = Math.random() * Math.PI * 2;
      shroomGroup.add(singleShroom);
    }

    // Ilmassa leijailevat hohtavat pikkupallot
    var numFloatingBalls = 140;
    for (var b = 0; b < numFloatingBalls; b++) {
      var bx = bounds.cx + (Math.random() * 2 - 1) * halfSize;
      var bz = bounds.cz + (Math.random() * 2 - 1) * halfSize;
      var bInfo = ctx.closestSampleInfo(track, bx, bz);
      if (bInfo.dist < exclR * 0.8) continue;

      var bGroundY = ctx.terrainSample(track, bx, bz).y;
      var by = bGroundY + 1.5 + Math.random() * 14.0;
      var bRadius = 0.15 + Math.random() * 0.25;

      var ballColor = neonCapColors[Math.floor(Math.random() * neonCapColors.length)];
      var ballGeo = new THREE.SphereGeometry(bRadius, 8, 8);
      var ballMat = new THREE.MeshBasicMaterial({ color: ballColor });
      var ballMesh = new THREE.Mesh(ballGeo, ballMat);
      ballMesh.position.set(bx, by, bz);
      shroomGroup.add(ballMesh);
    }

    return shroomGroup;
  };
})();