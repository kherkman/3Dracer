// env_vuorenhuiput.js - Lumihuippuiset 3D-Vuorenhuiput (Maa poistettu radan alta, syvä kanjoni & vuorten juuri)
(function() {
  'use strict';

  window.ENV_BUILDERS = window.ENV_BUILDERS || {};

  /* =================================----------------==============
     SISÄÄNRAKENNETTU NOPEA SIMPLEX NOISE ALGORITMI
  ================================----------------================== */
  var SimplexNoiseSelf = function() {
    var F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    var G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    var p = new Uint8Array(256);
    for (var i = 0; i < 256; i++) p[i] = Math.floor(Math.random() * 256);
    var perm = new Uint8Array(512);
    var permMod12 = new Uint8Array(512);
    for (var i = 0; i < 512; i++) {
      perm[i] = p[i & 255];
      permMod12[i] = (perm[i] % 12);
    }
    return {
      noise2D: function(xin, yin) {
        var n0, n1, n2;
        var s = (xin + yin) * F2;
        var i = Math.floor(xin + s);
        var j = Math.floor(yin + s);
        var t = (i + j) * G2;
        var X0 = i - t;
        var Y0 = j - t;
        var x0 = xin - X0;
        var y0 = yin - Y0;
        var i1, j1;
        if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
        var x1 = x0 - i1 + G2;
        var y1 = y0 - j1 + G2;
        var x2 = x0 - 1.0 + 2.0 * G2;
        var y2 = y0 - 1.0 + 2.0 * G2;
        var ii = i & 255;
        var jj = j & 255;
        var gi0 = permMod12[ii + perm[jj]];
        var gi1 = permMod12[ii + i1 + perm[jj + j1]];
        var gi2 = permMod12[ii + 1 + perm[jj + 1]];
        var t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 < 0) n0 = 0.0;
        else {
          t0 *= t0;
          var g0 = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]][gi0 % 8];
          n0 = t0 * t0 * (g0[0] * x0 + g0[1] * y0);
        }
        var t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 < 0) n1 = 0.0;
        else {
          t1 *= t1;
          var g1 = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]][gi1 % 8];
          n1 = t1 * t1 * (g1[0] * x1 + g1[1] * y1);
        }
        var t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 < 0) n2 = 0.0;
        else {
          t2 *= t2;
          var g2 = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]][gi2 % 8];
          n2 = t2 * t2 * (g2[0] * x2 + g2[1] * y2);
        }
        return 70.0 * (n0 + n1 + n2);
      }
    };
  };

  var simplex = SimplexNoiseSelf();

  // --- TEEMAT JA LUMIRAJAT (VUORENHUIPUT.HTML VASTAAVUUS) ---
  var THEMES = {
    summer: {
      day: {
        lowColor: [0.12, 0.45, 0.15],
        midColor: [0.35, 0.32, 0.30],
        snowColor: [1.0, 1.0, 1.0],
        snowLine: 0.50,
        starsOpacity: 0,
        auroraOpacity: 0
      },
      night: { // Suomalainen valoisa yötön yö
        lowColor: [0.10, 0.28, 0.18],
        midColor: [0.25, 0.23, 0.25],
        snowColor: [0.92, 0.90, 0.98],
        snowLine: 0.50,
        starsOpacity: 0.15,
        auroraOpacity: 0
      }
    },
    autumn: {
      day: {
        lowColor: [0.75, 0.30, 0.08],
        midColor: [0.35, 0.30, 0.28],
        snowColor: [0.98, 0.99, 1.0],
        snowLine: 0.42,
        starsOpacity: 0,
        auroraOpacity: 0
      },
      night: {
        lowColor: [0.18, 0.08, 0.04],
        midColor: [0.12, 0.10, 0.12],
        snowColor: [0.60, 0.65, 0.80],
        snowLine: 0.42,
        starsOpacity: 0.85,
        auroraOpacity: 0.25
      }
    },
    winter: {
      day: {
        lowColor: [0.85, 0.90, 0.96],
        midColor: [0.55, 0.62, 0.70],
        snowColor: [1.0, 1.0, 1.0],
        snowLine: 0.05,
        starsOpacity: 0,
        auroraOpacity: 0
      },
      night: {
        lowColor: [0.12, 0.25, 0.32],
        midColor: [0.22, 0.35, 0.42],
        snowColor: [0.70, 0.95, 0.95],
        snowLine: 0.05,
        starsOpacity: 1.0,
        auroraOpacity: 1.0
      }
    },
    spring: {
      day: {
        lowColor: [0.20, 0.68, 0.22],
        midColor: [0.40, 0.38, 0.36],
        snowColor: [0.98, 0.99, 1.0],
        snowLine: 0.38,
        starsOpacity: 0,
        auroraOpacity: 0
      },
      night: {
        lowColor: [0.05, 0.18, 0.08],
        midColor: [0.12, 0.15, 0.18],
        snowColor: [0.55, 0.65, 0.80],
        snowLine: 0.38,
        starsOpacity: 0.8,
        auroraOpacity: 0.1
      }
    }
  };

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // --- REVONTULTEN SHADER-MATERIAALI (AURORA BOREALIS) ---
  function createAuroraMaterial() {
    var auroraVertexShader = [
      'uniform float uTime;',
      'varying vec2 vUv;',
      'void main() {',
      '  vUv = uv;',
      '  vec3 pos = position;',
      '  float wave1 = sin(pos.x * 0.015 + uTime * 0.8) * 18.0;',
      '  float wave2 = cos(pos.z * 0.02 + uTime * 0.5) * 12.0;',
      '  pos.y += wave1 + wave2;',
      '  pos.z += sin(pos.x * 0.03 + uTime * 1.1) * 10.0;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);',
      '}'
    ].join('\n');

    var auroraFragmentShader = [
      'uniform float uTime;',
      'uniform float uOpacity;',
      'varying vec2 vUv;',
      'void main() {',
      '  float verticalFade = sin(vUv.y * 3.14159);',
      '  verticalFade = pow(verticalFade, 1.4);',
      '  float ray1 = sin(vUv.x * 90.0 + uTime * 2.5) * 0.5 + 0.5;',
      '  float ray2 = sin(vUv.x * 180.0 - uTime * 1.8) * 0.3 + 0.5;',
      '  float rayPattern = clamp(ray1 * ray2 * 1.4, 0.2, 1.0);',
      '  vec3 emeraldGreen = vec3(0.05, 0.98, 0.45);',
      '  vec3 cyanSky = vec3(0.0, 0.82, 0.95);',
      '  vec3 purpleTop = vec3(0.65, 0.15, 0.85);',
      '  vec3 color = mix(emeraldGreen, cyanSky, vUv.y * 0.8);',
      '  color = mix(color, purpleTop, pow(vUv.y, 2.2));',
      '  float alpha = verticalFade * rayPattern * uOpacity * 0.75;',
      '  gl_FragColor = vec4(color * (1.2 + rayPattern * 0.5), alpha);',
      '}'
    ].join('\n');

    return new THREE.ShaderMaterial({
      vertexShader: auroraVertexShader,
      fragmentShader: auroraFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }

  // --- VUORENHUIPPUJEN PÄÄBUILDERI ---
  window.ENV_BUILDERS['vuorenhuiput'] = function(track, bounds, ctx) {
    var mountainGroup = new THREE.Group();

    var season = ctx.currentSeason || 'kesa';
    var timeOfDay = ctx.currentTimeOfDay || 'paiva';
    var seasonTheme = THEMES[season] ? THEMES[season][timeOfDay] : THEMES.summer.day;

    var TERRAIN_SIZE = Math.max(bounds.size * 2.4, 600);
    var TERRAIN_SEGMENTS = 200;

    // --- 1. VUORISTOMAATON GEOMETRIA (MAA POISTETTU RADAN ALTA, SYVÄ KANJONI RADAN KOHDALLA) ---
    var mountainGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
    mountainGeo.rotateX(-Math.PI / 2);
    mountainGeo.translate(bounds.cx, 0, bounds.cz);

    var pos = mountainGeo.attributes.position;
    var count = pos.count;
    var colors = new Float32Array(count * 3);
    var maxActualHeight = 0.001;

    var roadHalfWidth = ctx.ROAD_HALF_WIDTH || 4.0;
    var curbWidth = ctx.CURB_WIDTH || 0.55;
    var clearanceRadius = roadHalfWidth + curbWidth + 1.5; // Radan vapaa alue
    var blendRadius = clearanceRadius + 22.0;              // Kanjonin rinne osaksi vuoristoa

    var numSamples = track ? track.n : 0;
    var samples = track ? track.samples : [];

    // Vuorten juuritaso (laakson/järven pohjan taso)
    var mountainBaseLevel = -22.0;

    for (var i = 0; i < count; i++) {
      var worldX = pos.getX(i);
      var worldZ = pos.getZ(i);
      var x = worldX - bounds.cx;
      var z = worldZ - bounds.cz;

      var distFromCenter = Math.sqrt(x * x + z * z);
      var maxRadius = TERRAIN_SIZE * 0.48;

      var centerFactor = Math.cos(Math.min(distFromCenter / maxRadius, 1.0) * (Math.PI / 2));
      centerFactor = Math.pow(centerFactor, 1.1);

      var h = 0;
      var scale = 0.0055;
      var amp = 1.0;
      var freq = 1.0;

      for (var oct = 0; oct < 5; oct++) {
        var n = simplex.noise2D(x * scale * freq, z * scale * freq);
        if (oct >= 1) n = 1.0 - Math.abs(n);
        h += n * amp;
        amp *= 0.48;
        freq *= 2.15;
      }

      h = Math.pow(Math.max(0, h), 2.2);

      // Vuoret nousevat vuorten juuresta (-22m) aina huippuihin asti (+95m)
      var rawHeight = mountainBaseLevel + h * 120.0 * centerFactor;

      // Etsitään etäisyys rataan
      var minTrackDist = Infinity;

      if (track && numSamples > 0) {
        for (var s = 0; s < numSamples; s += 2) {
          var sObj = samples[s];
          var dx = worldX - sObj.x;
          var dz = worldZ - sObj.z;
          var d2 = dx * dx + dz * dz;

          if (d2 < minTrackDist) {
            minTrackDist = d2;
          }
        }
        minTrackDist = Math.sqrt(minTrackDist);
      }

      var height = rawHeight;

      // POISTETAAN MAA RADAN ALTA: Radan kohdalla maasto laskee vuorten juuren tasolle (kanjoni),
      // eli radan alla ei ole tasaisia nurmikko/hiekkapohjia vaan se kovertuu alas laaksoon.
      if (minTrackDist < blendRadius) {
        var t = THREE.MathUtils.smoothstep(minTrackDist, clearanceRadius, blendRadius);
        height = THREE.MathUtils.lerp(mountainBaseLevel, rawHeight, t);
      }

      pos.setY(i, height);

      if (height > maxActualHeight) {
        maxActualHeight = height;
      }
    }

    mountainGeo.computeVertexNormals();
    var normals = mountainGeo.attributes.normal;

    // Väritys ilman JPG-tekstuureja (käytetään puhdasta verkkografiikkaa ja verkkosekoitusta)
    var lowC = seasonTheme.lowColor;
    var midC = seasonTheme.midColor;
    var snowC = seasonTheme.snowColor;
    var baseSnowLine = seasonTheme.snowLine;

    for (var i = 0; i < count; i++) {
      var x = pos.getX(i) - bounds.cx;
      var y = pos.getY(i);
      var z = pos.getZ(i) - bounds.cz;
      var ny = normals.getY(i);

      var hFactor = Math.min(1.0, Math.max(0, (y - mountainBaseLevel) / (maxActualHeight - mountainBaseLevel)));
      var snowNoise = simplex.noise2D(x * 0.02, z * 0.02) * 0.06;
      var effectiveSnowLine = Math.max(0.02, baseSnowLine + snowNoise);

      var flatFactor = Math.max(0.35, ny);
      var rockFactor = Math.pow(1.0 - Math.max(0, ny), 1.8);

      var r, g, b;
      if (hFactor < 0.25) {
        var t = hFactor / 0.25;
        r = lerp(lowC[0], midC[0], t);
        g = lerp(lowC[1], midC[1], t);
        b = lerp(lowC[2], midC[2], t);
      } else {
        var t = (hFactor - 0.25) / 0.75;
        r = lerp(midC[0], midC[0] * 0.7, t);
        g = lerp(midC[1], midC[1] * 0.7, t);
        b = lerp(midC[2], midC[2] * 0.7, t);
      }

      r = lerp(r, midC[0] * 0.45, rockFactor);
      g = lerp(g, midC[1] * 0.45, rockFactor);
      b = lerp(b, midC[2] * 0.45, rockFactor);

      var snowBlend = 0;
      if (hFactor > effectiveSnowLine) {
        var depth = (hFactor - effectiveSnowLine) / (1.0 - effectiveSnowLine);
        snowBlend = Math.pow(depth, 0.4) * Math.pow(flatFactor, 0.6);
      }

      if (hFactor > 0.78 && season !== 'winter') {
        var peakTop = (hFactor - 0.78) / 0.22;
        snowBlend = Math.max(snowBlend, Math.pow(peakTop, 0.5));
      }

      if (season === 'winter') {
        var valleySnow = Math.pow(Math.max(0, ny - 0.1), 0.6);
        snowBlend = Math.max(snowBlend, valleySnow);
      }

      snowBlend = Math.min(1.0, Math.max(0.0, snowBlend));

      r = lerp(r, snowC[0], snowBlend);
      g = lerp(g, snowC[1], snowBlend);
      b = lerp(b, snowC[2], snowBlend);

      colors[i * 3]     = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    mountainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    var mountainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.75,
      metalness: 0.1,
      flatShading: false
    });

    var mountainMesh = new THREE.Mesh(mountainGeo, mountainMat);
    mountainMesh.castShadow = true;
    mountainMesh.receiveShadow = true;
    mountainGroup.add(mountainMesh);

    // --- 2. VUORISTOLAMPI / JÄRVI VUORTEN JUURELLA ---
    // Nosteaan veden pintaa (mountainBaseLevel + 1.5), jotta se ei välky (z-fighting) maaston pohjan kanssa
    var waterLevel = mountainBaseLevel + 1.5;
    var waterGeo = new THREE.PlaneGeometry(TERRAIN_SIZE * 1.2, TERRAIN_SIZE * 1.2);
    waterGeo.rotateX(-Math.PI / 2);
    waterGeo.translate(bounds.cx, waterLevel, bounds.cz);

    var waterMat = new THREE.MeshStandardMaterial({
      color: (season === 'winter') ? 0x38bdf8 : 0x0284c7,
      roughness: 0.1,
      metalness: 0.85,
      transparent: true,
      opacity: (season === 'winter') ? 0.95 : 0.8
    });

    var mountainWaterMesh = new THREE.Mesh(waterGeo, waterMat);
    mountainGroup.add(mountainWaterMesh);

    // --- 3. TÄHTITAIVAS YÖLLÄ ---
    var starGroup = new THREE.Group();
    if (seasonTheme.starsOpacity > 0.05) {
      var starCount = 2400;
      var starGeo = new THREE.BufferGeometry();
      var starPos = new Float32Array(starCount * 3);

      for (var sIdx = 0; sIdx < starCount; sIdx++) {
        starPos[sIdx * 3]     = bounds.cx + (Math.random() - 0.5) * 1200;
        starPos[sIdx * 3 + 1] = Math.random() * 500 + 40;
        starPos[sIdx * 3 + 2] = bounds.cz + (Math.random() - 0.5) * 1200;
      }

      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));

      var starMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.6,
        transparent: true,
        opacity: seasonTheme.starsOpacity
      });

      var starPoints = new THREE.Points(starGeo, starMat);
      starGroup.add(starPoints);
      mountainGroup.add(starGroup);
    }

    // --- 4. REVONTULET (AURORA BOREALIS - TALVI & SYKSY YÖLLÄ) ---
    var auroraGroup = new THREE.Group();
    var auroraMat = null;

    if (seasonTheme.auroraOpacity > 0.05) {
      auroraMat = createAuroraMaterial();
      auroraMat.uniforms.uOpacity.value = seasonTheme.auroraOpacity;

      var geo1 = new THREE.PlaneGeometry(600, 90, 120, 20);
      var mesh1 = new THREE.Mesh(geo1, auroraMat);
      mesh1.position.set(bounds.cx, 180, bounds.cz - 120);
      mesh1.rotation.x = Math.PI / 12;
      auroraGroup.add(mesh1);

      var geo2 = new THREE.PlaneGeometry(550, 75, 100, 20);
      var mesh2 = new THREE.Mesh(geo2, auroraMat);
      mesh2.position.set(bounds.cx + 30, 210, bounds.cz - 170);
      mesh2.rotation.x = Math.PI / 10;
      mesh2.rotation.y = -Math.PI / 16;
      auroraGroup.add(mesh2);

      mountainGroup.add(auroraGroup);
    }

    // --- 5. ANIMAATIO SILMUKASSA ---
    var startTime = performance.now();

    mountainGroup.onBeforeRender = function() {
      var timeSec = (performance.now() - startTime) * 0.001;

      // Veden kevyt aaltoilu vuorten juurella (säilytetään turvallinen etäisyys pohjaan)
      mountainWaterMesh.position.y = waterLevel + Math.sin(timeSec * 1.5) * 0.15;

      // Revontulten animaatio
      if (auroraMat) {
        auroraMat.uniforms.uTime.value = timeSec;
      }
    };

    return mountainGroup;
  };
})();