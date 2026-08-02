// game-core.js - Three.js 3D-moottori, kamerat, valaistus, hiukkasjärjestelmät ja fysiikkalaskenta
(function() {
  'use strict';

  /* ---------------------------------------------------------------
     PERUSTILA JA CALLBACKIT
  --------------------------------------------------------------- */
  var callbacks = {
    getGameState: null,
    getPlayerControls: null,
    onQualifyingLapFinish: null,
    onCareerRaceFinishCheck: null,
    onShopInputHandle: null,
    renderPreviewsAnimation: null,
    updateMinimap: null,
    updateHudUI: null
  };

  var isRacing = false;
  var isCountdown = false;
  var countdownTimeouts = [];
  var finishCounter = 0;

  var flyActive = false;
  var flyT = 0;
  var autoRotate = false;

  var stereoActive = false;
  var stereoEyeDist = 0.15;
  var stereoImageOffset = 0;

  var rearviewMirrorEnabled = false;
  var waterEnabled = true;
  var treesVisible = true;
  var curbsVisible = true;

  var isRain = false;
  var isFog = false;
  var isClouds = false;

  var currentTrack = null;
  var terrainInfo = null;
  var terrainMesh = null;
  var roadMesh = null;
  var curbMesh = null;
  var postMesh = null;
  var forestMesh = null;
  var finishLineMesh = null;
  var bridgeMeshGroup = null;
  var tunnelMeshGroup = null;
  var boosterGroup = null;
  var pitStopGroup = null;
  var puddlesList = [];

  var cars = [];

  /* ---------------------------------------------------------------
     THREE.JS NÄYTTÄMÖ, RENDERÖIJÄ JA KAMERAT
  --------------------------------------------------------------- */
  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd8e4d0, 1000, 100000);

  var camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 600);
  camera.position.set(70, 55, 90);

  var camera2 = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 600);
  var camera3 = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 600);
  var camera4 = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 600);

  var cameraLeft = new THREE.PerspectiveCamera(48, (window.innerWidth / 2) / window.innerHeight, 0.1, 600);
  var cameraRight = new THREE.PerspectiveCamera(48, (window.innerWidth / 2) / window.innerHeight, 0.1, 600);
  var camRightVec = new THREE.Vector3();

  var rearCamera = new THREE.PerspectiveCamera(52, 220 / 70, 0.1, 300);

  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  document.body.appendChild(renderer.domElement);

  var puddleCubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter
  });
  var puddleCubeCamera = new THREE.CubeCamera(0.1, 500, puddleCubeRenderTarget);
  scene.add(puddleCubeCamera);

  /* ---------------------------------------------------------------
     JARRUTUSJÄLJET (SKID MARKS)
  --------------------------------------------------------------- */
  var skidMarkGroup = new THREE.Group();
  scene.add(skidMarkGroup);

  var skidMarkMat = new THREE.MeshBasicMaterial({
    color: 0x111111,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4
  });

  function spawnSkidMarkSegment(c) {
    if (!currentTrack) return;

    var perpX = -Math.cos(c.angle);
    var perpZ = Math.sin(c.angle);
    var wheelWidthOffset = 0.72;

    var leftX = c.x - perpX * wheelWidthOffset;
    var leftZ = c.z - perpZ * wheelWidthOffset;
    var leftY = TrackGenerator.getRoadSurfaceHeight(currentTrack, leftX, leftZ) + 0.035;

    var rightX = c.x + perpX * wheelWidthOffset;
    var rightZ = c.z + perpZ * wheelWidthOffset;
    var rightY = TrackGenerator.getRoadSurfaceHeight(currentTrack, rightX, rightZ) + 0.035;

    if (c.lastSkidLeft && c.lastSkidRight) {
      var geoL = new THREE.BufferGeometry();
      var posL = new Float32Array([
        c.lastSkidLeft.x, c.lastSkidLeft.y, c.lastSkidLeft.z,
        leftX, leftY, leftZ,
        c.lastSkidLeft.x + perpX * 0.22, c.lastSkidLeft.y, c.lastSkidLeft.z + perpZ * 0.22,
        leftX + perpX * 0.22, leftY, leftZ + perpZ * 0.22
      ]);
      geoL.setAttribute('position', new THREE.BufferAttribute(posL, 3));
      geoL.setIndex([0, 1, 2, 1, 3, 2]);
      geoL.computeVertexNormals();
      var meshL = new THREE.Mesh(geoL, skidMarkMat);
      skidMarkGroup.add(meshL);

      var geoR = new THREE.BufferGeometry();
      var posR = new Float32Array([
        c.lastSkidRight.x, c.lastSkidRight.y, c.lastSkidRight.z,
        rightX, rightY, rightZ,
        c.lastSkidRight.x - perpX * 0.22, c.lastSkidRight.y, c.lastSkidRight.z - perpZ * 0.22,
        rightX - perpX * 0.22, rightY, rightZ - perpZ * 0.22
      ]);
      geoR.setAttribute('position', new THREE.BufferAttribute(posR, 3));
      geoR.setIndex([0, 1, 2, 1, 3, 2]);
      geoR.computeVertexNormals();
      var meshR = new THREE.Mesh(geoR, skidMarkMat);
      skidMarkGroup.add(meshR);
    }

    c.lastSkidLeft = { x: leftX, y: leftY, z: leftZ };
    c.lastSkidRight = { x: rightX, y: rightY, z: rightZ };
  }

  function clearSkidMarks() {
    while (skidMarkGroup.children.length > 0) {
      var obj = skidMarkGroup.children[0];
      if (obj.geometry) obj.geometry.dispose();
      skidMarkGroup.remove(obj);
    }
  }

  /* ---------------------------------------------------------------
     KAMERA-OHJAUS (ORBIT CONTROLS MOD)
  --------------------------------------------------------------- */
  var controls = (function(){
    var target = new THREE.Vector3(0, 6, 0);
    var spherical = new THREE.Spherical();
    var startOffset = new THREE.Vector3().copy(camera.position).sub(target);
    spherical.setFromVector3(startOffset);
    var targetSpherical = spherical.clone();

    var minDistance = 8, maxDistance = 400;
    var minPhi = 0.06, maxPhi = Math.PI/2 - 0.02;

    var dragging = false, prevX = 0, prevY = 0;
    var dom = renderer.domElement;
    dom.style.touchAction = 'none';

    dom.addEventListener('pointerdown', function(e){
      if (isRacing) return;
      dragging = true; prevX = e.clientX; prevY = e.clientY;
      dom.setPointerCapture(e.pointerId);
    });
    dom.addEventListener('pointerup', function(){ dragging = false; });
    dom.addEventListener('pointercancel', function(){ dragging = false; });
    dom.addEventListener('pointermove', function(e){
      if (!dragging || isRacing) return;
      var dx = e.clientX - prevX, dy = e.clientY - prevY;
      prevX = e.clientX; prevY = e.clientY;
      targetSpherical.theta -= dx * 0.006;
      targetSpherical.phi -= dy * 0.006;
      targetSpherical.phi = Math.max(minPhi, Math.min(maxPhi, targetSpherical.phi));
    });
    dom.addEventListener('wheel', function(e){
      if (isRacing) return;
      e.preventDefault();
      targetSpherical.radius *= (1 + e.deltaY * 0.001);
      targetSpherical.radius = Math.max(minDistance, Math.min(maxDistance, targetSpherical.radius));
    }, { passive:false });

    return {
      target: target,
      autoRotate: false,
      autoRotateSpeed: 0.7,
      update: function(delta){
        if (this.autoRotate) targetSpherical.theta += this.autoRotateSpeed * delta * 0.3;
        spherical.theta += (targetSpherical.theta - spherical.theta) * 0.12;
        spherical.phi += (targetSpherical.phi - spherical.phi) * 0.12;
        spherical.radius += (targetSpherical.radius - spherical.radius) * 0.12;
        var offset = new THREE.Vector3().setFromSpherical(spherical);
        camera.position.copy(target).add(offset);
        camera.lookAt(target);
      },
      setDistance: function(d){
        d = Math.max(minDistance, Math.min(maxDistance, d));
        spherical.radius = d; targetSpherical.radius = d;
      }
    };
  })();

  /* ---------------------------------------------------------------
     TAIVAS, VALOT JA AURINGONASENTO
  --------------------------------------------------------------- */
  var skyGeo = new THREE.SphereGeometry(280, 32, 16);
  var skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor:    { value: new THREE.Color(0x7fa8d8) },
      bottomColor: { value: new THREE.Color(0xe9ecdd) },
      offset:      { value: 20 },
      exponent:    { value: 0.75 }
    },
    vertexShader: [
      'varying vec3 vWorldPosition;',
      'void main() {',
      '  vec4 worldPosition = modelMatrix * vec4(position, 1.0);',
      '  vWorldPosition = worldPosition.xyz;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 topColor;',
      'uniform vec3 bottomColor;',
      'uniform float offset;',
      'uniform float exponent;',
      'varying vec3 vWorldPosition;',
      'void main() {',
      '  float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;',
      '  gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);',
      '}'
    ].join('\n'),
    side: THREE.BackSide
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  var sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(7, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xfffae0 })
  );
  sunMesh.position.set(180, 16, 90);
  scene.add(sunMesh);

  var moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(6, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xeeece1 })
  );
  moonMesh.position.set(-180, 16, -90);
  moonMesh.visible = false;
  scene.add(moonMesh);

  var numStars = 800;
  var starSphereGeo = new THREE.SphereGeometry(0.65, 8, 8);
  var starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  var starsMesh = new THREE.InstancedMesh(starSphereGeo, starMat, numStars);
  var dummyMatrix = new THREE.Matrix4();
  var dummyPos = new THREE.Vector3();
  var dummyScale = new THREE.Vector3();
  var dummyQuat = new THREE.Quaternion();

  var rDome = 200;
  for (var i = 0; i < numStars; i++) {
    var theta = Math.random() * Math.PI * 2.0;
    var phi = 0.10 + Math.random() * (Math.PI * 0.38); 
    var x = rDome * Math.sin(phi) * Math.cos(theta);
    var y = Math.max(12, rDome * Math.cos(phi) - 15);
    var z = rDome * Math.sin(phi) * Math.sin(theta);

    dummyPos.set(x, y, z);
    var s = 0.6 + Math.random() * 0.8;
    dummyScale.set(s, s, s);
    dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
    starsMesh.setMatrixAt(i, dummyMatrix);
  }
  starsMesh.instanceMatrix.needsUpdate = true;
  starsMesh.visible = false;
  scene.add(starsMesh);

  var hemi = new THREE.HemisphereLight(0xbcd4e8, 0x30301c, 0.85);
  scene.add(hemi);

  var sun = new THREE.DirectionalLight(0xfff2d8, 1.9);
  sun.position.set(180, 30, 90);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -150; sun.shadow.camera.right = 150;
  sun.shadow.camera.top = 150;  sun.shadow.camera.bottom = -150;
  sun.shadow.camera.near = 0.5;  sun.shadow.camera.far = 400;
  sun.shadow.bias = -0.0015;
  scene.add(sun); scene.add(sun.target);

  var fill = new THREE.DirectionalLight(0xbcd0ff, 0.3);
  fill.position.set(-60, 30, -50);
  scene.add(fill);

  function updateEnvironmentAtmosphere(currentTimeOfDay, currentSeason, currentEnvironment, isFogFlag) {
    isFog = !!isFogFlag;

    if (isFog) {
      scene.fog.near = 20;
      scene.fog.far = 180;
    } else {
      scene.fog.near = 1000;
      scene.fog.far = 100000;
    }

    if (currentEnvironment === 'synthwave') {
      skyMat.uniforms.topColor.value.set(0x2d0b5a);
      skyMat.uniforms.bottomColor.value.set(0xff007f);
      scene.fog.color.set(isFog ? 0x4a0055 : 0x200033);
      hemi.color.set(0xff00aa); hemi.groundColor.set(0x00f0ff);
      sun.color.set(0xff00aa); sun.intensity = 2.0;

      sunMesh.visible = false;
      moonMesh.visible = false;
      starsMesh.visible = true;
    } else if (currentEnvironment === 'suo') {
      skyMat.uniforms.topColor.value.set(0x2a3828);
      skyMat.uniforms.bottomColor.value.set(0x738060);
      scene.fog.color.set(isFog ? 0x3a4835 : 0x223020);
      hemi.color.set(0x8a9970); hemi.groundColor.set(0x1a2412);
      sun.color.set(0xe0d8a0); sun.intensity = 1.3;

      sunMesh.visible = true;
      moonMesh.visible = false;
      starsMesh.visible = false;
    } else if (currentEnvironment === 'jattikukkaniitty') {
      skyMat.uniforms.topColor.value.set(0x38bdf8);
      skyMat.uniforms.bottomColor.value.set(0xe0f2fe);
      scene.fog.color.set(isFog ? 0xbae6fd : 0xc0e8ff);
      hemi.color.set(0x7dd3fc); hemi.groundColor.set(0x15803d);
      sun.color.set(0xfff5cc); sun.intensity = 2.0;

      sunMesh.visible = true;
      moonMesh.visible = false;
      starsMesh.visible = false;
    } else if (currentEnvironment === 'jattisieni') {
      skyMat.uniforms.topColor.value.set(0x2d0b5a);
      skyMat.uniforms.bottomColor.value.set(0x6b21a8);
      scene.fog.color.set(isFog ? 0x4c1d95 : 0x2d0b5a);
      hemi.color.set(0xa855f7); hemi.groundColor.set(0x3b0764);
      sun.color.set(0xf472b6); sun.intensity = 1.6;

      sunMesh.visible = false;
      moonMesh.visible = false;
      starsMesh.visible = true;
    } else if (currentTimeOfDay === 'yo') {
      skyMat.uniforms.topColor.value.set(0x020408);
      skyMat.uniforms.bottomColor.value.set(0x0d1424);
      scene.fog.color.set(isFog ? 0x182030 : 0x0a0e17);
      hemi.color.set(0x1a2638); hemi.groundColor.set(0x05080f);
      sun.color.set(0x88aacc); sun.intensity = 0.25;
      
      sunMesh.visible = false;
      moonMesh.visible = true;
      starsMesh.visible = true;
    } else {
      sunMesh.visible = true;
      moonMesh.visible = false;
      starsMesh.visible = false;

      if (currentSeason === 'kesa') {
        skyMat.uniforms.topColor.value.set(0x7fa8d8);
        skyMat.uniforms.bottomColor.value.set(0xe9ecdd);
        scene.fog.color.set(isFog ? 0xb8c8c0 : 0xd8e4d0);
        hemi.color.set(0xbcd4e8); hemi.groundColor.set(0x30301c);
        sun.color.set(0xfff2d8); sun.intensity = 1.9;
      } else if (currentSeason === 'syksy') {
        skyMat.uniforms.topColor.value.set(0x4a382a);
        skyMat.uniforms.bottomColor.value.set(0xe8a868);
        scene.fog.color.set(isFog ? 0x806048 : 0x38281c);
        hemi.color.set(0xe8a868); hemi.groundColor.set(0x2a1c12);
        sun.color.set(0xff9e54); sun.intensity = 1.7;
      } else if (currentSeason === 'talvi') {
        skyMat.uniforms.topColor.value.set(0x6b8496);
        skyMat.uniforms.bottomColor.value.set(0xdfe8e6);
        scene.fog.color.set(isFog ? 0x98a8b8 : 0x1c2830);
        hemi.color.set(0xaebfc9); hemi.groundColor.set(0x24322c);
        sun.color.set(0xdfe9f2); sun.intensity = 1.25;
      } else if (currentSeason === 'kevat') {
        skyMat.uniforms.topColor.value.set(0x4a8ac2);
        skyMat.uniforms.bottomColor.value.set(0xd8f0e6);
        scene.fog.color.set(isFog ? 0x88b8a8 : 0xc2e4d8);
        hemi.color.set(0xb8e2f8); hemi.groundColor.set(0x2c4224);
        sun.color.set(0xfffae6); sun.intensity = 1.8;
      }
    }

    cars.forEach(function(c) {
      if (c.headlight1 && c.headlight2) {
        c.headlight1.visible = (currentTimeOfDay === 'yo' || c.inTunnel);
        c.headlight2.visible = (currentTimeOfDay === 'yo' || c.inTunnel);
      }
    });
  }

  /* ---------------------------------------------------------------
     PILVET, SADE JA LUMISADE
  --------------------------------------------------------------- */
  var cloudGroup = new THREE.Group();
  scene.add(cloudGroup);

  function buildClouds(isCloudsFlag, currentTimeOfDay, isRainFlag) {
    isClouds = !!isCloudsFlag;

    while(cloudGroup.children.length > 0) {
      var c = cloudGroup.children[0];
      if(c.geometry) c.geometry.dispose();
      cloudGroup.remove(c);
    }

    if (!isClouds) return;

    var cloudMat = new THREE.MeshStandardMaterial({
      color: (currentTimeOfDay === 'yo') ? 0x222834 : (isRainFlag ? 0x707880 : 0xffffff),
      roughness: 0.9,
      transparent: true,
      opacity: 0.85
    });

    for (var i = 0; i < 24; i++) {
      var cloudMeshGroup = new THREE.Group();
      var puffCount = 5 + Math.floor(Math.random() * 5);
      for (var p = 0; p < puffCount; p++) {
        var r = 12 + Math.random() * 14;
        var puffGeo = new THREE.DodecahedronGeometry(r, 1);
        var puff = new THREE.Mesh(puffGeo, cloudMat);
        puff.position.set((Math.random()-0.5)*28, (Math.random()-0.5)*6, (Math.random()-0.5)*28);
        cloudMeshGroup.add(puff);
      }
      var cx = (Math.random() - 0.5) * 350;
      var cz = (Math.random() - 0.5) * 350;
      var cy = 48 + Math.random() * 20;
      cloudMeshGroup.position.set(cx, cy, cz);
      cloudGroup.add(cloudMeshGroup);
    }
  }

  var rainLineCount = 1200;
  var rainLineGeo = new THREE.BufferGeometry();
  var rainLinePositions = new Float32Array(rainLineCount * 6);
  rainLineGeo.setAttribute('position', new THREE.BufferAttribute(rainLinePositions, 3));
  var rainLineMat = new THREE.LineBasicMaterial({ color: 0x99ccff, transparent: true, opacity: 0.75, linewidth: 1.5 });
  var rainLineSystem = new THREE.LineSegments(rainLineGeo, rainLineMat);
  rainLineSystem.visible = false;
  scene.add(rainLineSystem);

  function createSnowFlakeTexture() {
    var c = document.createElement('canvas'); c.width = 64; c.height = 64;
    var ctx = c.getContext('2d');
    var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1.0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(32, 32, 32, 0, Math.PI*2); ctx.fill();
    return new THREE.CanvasTexture(c);
  }

  var snowCount = 1200;
  var snowGeo = new THREE.BufferGeometry();
  var snowPos = new Float32Array(snowCount * 3);
  for (var i = 0; i < snowCount; i++) {
    snowPos[i*3] = (Math.random() - 0.5) * 120;
    snowPos[i*3+1] = Math.random() * 50;
    snowPos[i*3+2] = (Math.random() - 0.5) * 120;
  }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  var snowMat = new THREE.PointsMaterial({
    map: createSnowFlakeTexture(),
    size: 1.3,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  });
  var snowPointSystem = new THREE.Points(snowGeo, snowMat);
  snowPointSystem.visible = false;
  scene.add(snowPointSystem);

  function updatePrecipitation(delta, currentSeason) {
    if (!isRain) {
      rainLineSystem.visible = false;
      snowPointSystem.visible = false;
      return;
    }

    var isSnow = (currentSeason === 'talvi');
    rainLineSystem.visible = !isSnow;
    snowPointSystem.visible = isSnow;

    var targetCam = isRacing && cars[0] ? cars[0].mesh.position : camera.position;

    if (isSnow) {
      var pos = snowGeo.attributes.position;
      for (var i = 0; i < snowCount; i++) {
        var py = pos.getY(i);
        py -= (6.0 + Math.random()*2.0) * delta;
        var px = pos.getX(i) + Math.sin(py * 0.12 + i) * 1.5 * delta;
        var pz = pos.getZ(i);

        if (py < targetCam.y - 10) {
          py = targetCam.y + 35 + Math.random()*10;
          px = targetCam.x + (Math.random() - 0.5) * 120;
          pz = targetCam.z + (Math.random() - 0.5) * 120;
        }
        pos.setXYZ(i, px, py, pz);
      }
      pos.needsUpdate = true;
    } else {
      var posL = rainLineGeo.attributes.position;
      var dropLen = 2.2;
      for (var i = 0; i < rainLineCount; i++) {
        var idx = i * 6;
        var py = posL.array[idx + 1];
        py -= (42.0 + Math.random()*12.0) * delta;

        var px = posL.array[idx];
        var pz = posL.array[idx + 2];

        if (py < targetCam.y - 10) {
          py = targetCam.y + 35 + Math.random()*10;
          px = targetCam.x + (Math.random() - 0.5) * 120;
          pz = targetCam.z + (Math.random() - 0.5) * 120;
        }

        posL.array[idx] = px;
        posL.array[idx + 1] = py;
        posL.array[idx + 2] = pz;

        posL.array[idx + 3] = px;
        posL.array[idx + 4] = py - dropLen;
        posL.array[idx + 5] = pz;
      }
      posL.needsUpdate = true;
    }
  }

  /* ---------------------------------------------------------------
     PARTIKKELIJÄRJESTELMÄT
  --------------------------------------------------------------- */
  var dustParticles = [];
  var dustGeo = new THREE.SphereGeometry(0.35, 6, 6);
  var dustMat = new THREE.MeshStandardMaterial({
    color: 0xc2a678, roughness: 1.0, transparent: true, opacity: 0.6
  });

  function spawnDustParticles(x, y, z, count) {
    for (var i = 0; i < count; i++) {
      var mesh = new THREE.Mesh(dustGeo, dustMat);
      mesh.position.set(x + (Math.random()-0.5)*1.2, y + 0.2, z + (Math.random()-0.5)*1.2);
      var vx = (Math.random() - 0.5) * 2.0;
      var vy = 1.0 + Math.random() * 2.0;
      var vz = (Math.random() - 0.5) * 2.0;
      scene.add(mesh);
      dustParticles.push({ mesh: mesh, vx: vx, vy: vy, vz: vz, life: 0.6 + Math.random()*0.4, scale: 0.8 });
    }
  }

  function updateDustParticles(delta) {
    for (var i = dustParticles.length - 1; i >= 0; i--) {
      var p = dustParticles[i];
      p.life -= delta;
      if (p.life <= 0) {
        scene.remove(p.mesh);
        dustParticles.splice(i, 1);
      } else {
        p.mesh.position.x += p.vx * delta;
        p.mesh.position.y += p.vy * delta;
        p.mesh.position.z += p.vz * delta;
        p.scale += delta * 2.5;
        p.mesh.scale.set(p.scale, p.scale, p.scale);
      }
    }
  }

  var smokeParticles = [];
  var smokeGeo = new THREE.SphereGeometry(0.4, 8, 8);
  var smokeMat = new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.6 });

  function spawnSmokeParticles(x, y, z, count) {
    for (var i = 0; i < count; i++) {
      var mesh = new THREE.Mesh(smokeGeo, smokeMat);
      mesh.position.set(x + (Math.random()-0.5)*0.4, y + 0.4, z + (Math.random()-0.5)*0.4);
      var vx = (Math.random() - 0.5) * 1.0;
      var vy = 2.5 + Math.random() * 2.5;
      var vz = (Math.random() - 0.5) * 1.0;
      scene.add(mesh);
      smokeParticles.push({ mesh: mesh, vx: vx, vy: vy, vz: vz, life: 0.7 + Math.random()*0.5, scale: 0.6 });
    }
  }

  function updateSmokeParticles(delta) {
    for (var i = smokeParticles.length - 1; i >= 0; i--) {
      var p = smokeParticles[i];
      p.life -= delta;
      if (p.life <= 0) {
        scene.remove(p.mesh);
        smokeParticles.splice(i, 1);
      } else {
        p.mesh.position.x += p.vx * delta;
        p.mesh.position.y += p.vy * delta;
        p.mesh.position.z += p.vz * delta;
        p.scale += delta * 3.0;
        p.mesh.scale.set(p.scale, p.scale, p.scale);
      }
    }
  }

  var sparkParticles = [];
  var sparkGeo = new THREE.SphereGeometry(0.12, 6, 6);
  var sparkMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });

  function spawnSparkParticles(x, y, z, count) {
    for (var i = 0; i < count; i++) {
      var mesh = new THREE.Mesh(sparkGeo, sparkMat);
      mesh.position.set(x + (Math.random()-0.5)*0.5, y + (Math.random()-0.5)*0.3, z + (Math.random()-0.5)*0.5);
      var vx = (Math.random() - 0.5) * 12.0;
      var vy = 2.0 + Math.random() * 8.0;
      var vz = (Math.random() - 0.5) * 12.0;
      scene.add(mesh);
      sparkParticles.push({ mesh: mesh, vx: vx, vy: vy, vz: vz, life: 0.25 + Math.random()*0.25 });
    }
  }

  function updateSparkParticles(delta) {
    for (var i = sparkParticles.length - 1; i >= 0; i--) {
      var p = sparkParticles[i];
      p.life -= delta;
      if (p.life <= 0) {
        scene.remove(p.mesh);
        sparkParticles.splice(i, 1);
      } else {
        p.vy -= 18.0 * delta;
        p.mesh.position.x += p.vx * delta;
        p.mesh.position.y += p.vy * delta;
        p.mesh.position.z += p.vz * delta;
        var s = (p.life / 0.5);
        p.mesh.scale.set(s, s, s);
      }
    }
  }

  var orbScatterParticles = [];
  var orbScatterGeo = new THREE.SphereGeometry(0.18, 8, 8);
  var orbScatterMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00f0ff,
    emissiveIntensity: 1.0,
    roughness: 0.1,
    transparent: true,
    opacity: 0.95
  });

  function spawnOrbScatterParticles(x, y, z, count) {
    for (var i = 0; i < count; i++) {
      var mesh = new THREE.Mesh(orbScatterGeo, orbScatterMat);
      mesh.position.set(x, y, z);
      var angle = Math.random() * Math.PI * 2;
      var elevation = (Math.random() - 0.2) * Math.PI;
      var speed = 6.0 + Math.random() * 12.0;
      var vx = Math.cos(angle) * Math.cos(elevation) * speed;
      var vy = Math.sin(elevation) * speed + 2.0;
      var vz = Math.sin(angle) * Math.cos(elevation) * speed;

      scene.add(mesh);
      orbScatterParticles.push({
        mesh: mesh,
        vx: vx, vy: vy, vz: vz,
        life: 0.45 + Math.random() * 0.35,
        maxLife: 0.8
      });
    }
  }

  function updateOrbScatterParticles(delta) {
    for (var i = orbScatterParticles.length - 1; i >= 0; i--) {
      var p = orbScatterParticles[i];
      p.life -= delta;
      if (p.life <= 0) {
        scene.remove(p.mesh);
        orbScatterParticles.splice(i, 1);
      } else {
        p.vy -= 12.0 * delta;
        p.mesh.position.x += p.vx * delta;
        p.mesh.position.y += p.vy * delta;
        p.mesh.position.z += p.vz * delta;

        var scale = Math.max(0.01, (p.life / p.maxLife));
        p.mesh.scale.set(scale, scale, scale);
      }
    }
  }

  var waterGroup = new THREE.Group();
  scene.add(waterGroup);

  var splashParticles = [];
  var splashGeo = new THREE.SphereGeometry(0.08, 6, 6);
  var splashMat = new THREE.MeshStandardMaterial({ color: 0xc8e6ff, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.8 });

  function spawnSplashParticles(x, y, z, count, isHuman) {
    if (isHuman && window.AudioEngine) AudioEngine.playFX('splash');
    for (var i = 0; i < count; i++) {
      var mesh = new THREE.Mesh(splashGeo, splashMat);
      mesh.position.set(x + (Math.random()-0.5)*0.8, y + 0.1, z + (Math.random()-0.5)*0.8);
      var vx = (Math.random() - 0.5) * 3.5;
      var vy = 2.0 + Math.random() * 3.0;
      var vz = (Math.random() - 0.5) * 3.5;
      scene.add(mesh);
      splashParticles.push({ mesh: mesh, vx: vx, vy: vy, vz: vz, life: 0.4 + Math.random()*0.3 });
    }
  }

  function updateSplashParticles(delta) {
    for (var i = splashParticles.length - 1; i >= 0; i--) {
      var p = splashParticles[i];
      p.life -= delta;
      if (p.life <= 0) {
        scene.remove(p.mesh);
        splashParticles.splice(i, 1);
      } else {
        p.vy -= 9.8 * delta;
        p.mesh.position.x += p.vx * delta;
        p.mesh.position.y += p.vy * delta;
        p.mesh.position.z += p.vz * delta;
        var s = p.life * 2.0;
        p.mesh.scale.set(s, s, s);
      }
    }
  }

  /* ---------------------------------------------------------------
     KERÄILYPALLOT (COLLECTIBLES)
  --------------------------------------------------------------- */
  var collectiblesList = [];
  var collectiblesGroup = new THREE.Group();
  scene.add(collectiblesGroup);

  var orbGeo = new THREE.SphereGeometry(0.8, 16, 16);

  function spawnCollectiblesOnTrack() {
    while (collectiblesGroup.children.length > 0) {
      var obj = collectiblesGroup.children[0];
      if (obj.geometry) obj.geometry.dispose();
      collectiblesGroup.remove(obj);
    }
    collectiblesList = [];

    var state = callbacks.getGameState ? callbacks.getGameState() : {};
    if (!state.collectiblesEnabled || !currentTrack) return;

    var orbTex = state.texturesEnabled && state.loadTextureWithFallback
      ? state.loadTextureWithFallback(state.ENV_TEXTURE_PATHS ? state.ENV_TEXTURE_PATHS.pallo : 'pallo.jpg', 1, 1, '#00f0ff', 'PALLO')
      : null;

    var orbMat = new THREE.MeshStandardMaterial({
      map: orbTex,
      color: 0xffffff,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8
    });

    var numOrbs = 14 + Math.floor(Math.random() * 8);
    for (var i = 0; i < numOrbs; i++) {
      var sampleIdx = Math.floor(Math.random() * currentTrack.n);
      var s = currentTrack.samples[sampleIdx];
      var perp = new THREE.Vector3(-s.tz, 0, s.tx).normalize();
      var sideOffset = (Math.random() - 0.5) * TrackGenerator.ROAD_HALF_WIDTH * 1.4;

      var ox = s.x + perp.x * sideOffset;
      var oz = s.z + perp.z * sideOffset;
      var oy = TrackGenerator.getRoadSurfaceHeight(currentTrack, ox, oz) + 1.0;

      var mesh = new THREE.Mesh(orbGeo, orbMat);
      mesh.position.set(ox, oy, oz);
      collectiblesGroup.add(mesh);

      collectiblesList.push({
        mesh: mesh,
        x: ox, y: oy, z: oz,
        radius: 1.5,
        active: true,
        pulseTimer: Math.random() * Math.PI * 2
      });
    }
  }

  function updateCollectibles(delta) {
    var state = callbacks.getGameState ? callbacks.getGameState() : {};
    if (!state.collectiblesEnabled) return;

    for (var i = 0; i < collectiblesList.length; i++) {
      var orb = collectiblesList[i];
      if (!orb.active) continue;

      orb.pulseTimer += delta * 4.0;
      var scale = 0.85 + Math.sin(orb.pulseTimer) * 0.2;
      orb.mesh.scale.set(scale, scale, scale);
      orb.mesh.position.y = orb.y + Math.sin(orb.pulseTimer * 0.8) * 0.3;

      for (var cIdx = 0; cIdx < cars.length; cIdx++) {
        var car = cars[cIdx];
        if (car.finished) continue;

        var dx = car.x - orb.x;
        var dz = car.z - orb.z;
        var dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < orb.radius + 0.8) {
          orb.active = false;
          orb.mesh.visible = false;
          car.orbsCollected = (car.orbsCollected || 0) + 1;

          if (state.timeLimitSetting > 0 && car.lapTimeRemaining > 0) {
            car.lapTimeRemaining += 10.0;
          }

          spawnOrbScatterParticles(orb.x, orb.y, orb.z, 22);

          if (window.AudioEngine) AudioEngine.playFX('pallo');
          break;
        }
      }
    }
  }

  /* ---------------------------------------------------------------
     TAUSTAPEILI (REARVIEW MIRROR)
  --------------------------------------------------------------- */
  function renderRearviewMirror() {
    var frame = document.getElementById('rearviewFrame');
    if (!rearviewMirrorEnabled || !isRacing || !cars[0] || cars[0].finished) {
      if (frame) frame.style.display = 'none';
      return;
    }

    if (frame) frame.style.display = 'block';

    var c = cars[0];
    var forwardX = Math.sin(c.angle);
    var forwardZ = Math.cos(c.angle);

    rearCamera.position.set(
      c.x - forwardX * 0.4,
      c.y + 1.25,
      c.z - forwardZ * 0.4
    );
    rearCamera.lookAt(
      c.x - forwardX * 30,
      c.y + 1.0,
      c.z - forwardZ * 30
    );

    var mirrorWidth = 220;
    var mirrorHeight = 70;
    var left = Math.floor((window.innerWidth - mirrorWidth) / 2);
    var bottom = window.innerHeight - 12 - mirrorHeight;

    renderer.setScissorTest(true);
    renderer.setViewport(left, bottom, mirrorWidth, mirrorHeight);
    renderer.setScissor(left, bottom, mirrorWidth, mirrorHeight);

    rearCamera.aspect = mirrorWidth / mirrorHeight;
    rearCamera.updateProjectionMatrix();

    renderer.render(scene, rearCamera);
    renderer.setScissorTest(false);
  }

  /* ---------------------------------------------------------------
     AUTON 3D-RAKENTAMINEN
  --------------------------------------------------------------- */
  function buildCarMesh(bodyColorHex, accentColorHex, carTexUrl, modelType) {
    modelType = modelType || 'simple';

    var carGroup;
    if (window.CAR_MODELS && typeof window.CAR_MODELS[modelType] === 'function') {
      carGroup = window.CAR_MODELS[modelType](bodyColorHex, accentColorHex, carTexUrl);
    } else if (window.CAR_MODELS && typeof window.CAR_MODELS['simple'] === 'function') {
      carGroup = window.CAR_MODELS['simple'](bodyColorHex, accentColorHex, carTexUrl);
    } else {
      carGroup = new THREE.Group();
      var bodyGeo = new THREE.BoxGeometry(1.7, 0.5, 3.4);
      bodyGeo.translate(0, 0.45, 0);
      
      var baseCol = new THREE.Color(bodyColorHex);
      if (window.texturesEnabled && carTexUrl) {
        baseCol.lerp(new THREE.Color(0xffffff), 0.35);
      }

      var bodyMat = new THREE.MeshStandardMaterial({
        color: baseCol, roughness: 0.35, metalness: 0.15
      });

      if (window.texturesEnabled && carTexUrl && typeof window.loadTextureWithFallback === 'function') {
        var carTex = window.loadTextureWithFallback(carTexUrl, 2, 2, bodyColorHex, 'AUTOTEX');
        if (carTex) bodyMat.map = carTex;
      }

      var bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.castShadow = true;
      carGroup.add(bodyMesh);

      var cabinGeo = new THREE.BoxGeometry(1.35, 0.5, 1.6);
      cabinGeo.translate(0, 0.88, -0.1);
      var cabinMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.1, metalness: 0.8 });
      var cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
      cabinMesh.castShadow = true;
      carGroup.add(cabinMesh);

      var spoilerGeo = new THREE.BoxGeometry(1.6, 0.08, 0.45);
      spoilerGeo.translate(0, 1.22, -1.5);
      var accentMat = new THREE.MeshStandardMaterial({ color: accentColorHex || 0x111111, roughness: 0.4 });
      var spoilerMesh = new THREE.Mesh(spoilerGeo, accentMat);
      spoilerMesh.castShadow = true;
      carGroup.add(spoilerMesh);

      var post1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), accentMat);
      post1.position.set(-0.55, 1.05, -1.5);
      var post2 = post1.clone(); post2.position.x = 0.55;
      carGroup.add(post1); carGroup.add(post2);

      var wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.25, 16);
      wheelGeo.rotateZ(Math.PI / 2);
      var wheelMat = new THREE.MeshStandardMaterial({ color: 0x222225, roughness: 0.8 });
      var wheelPos = [
        [-0.85, 0.32, 1.0], [0.85, 0.32, 1.0],
        [-0.85, 0.32, -1.0], [0.85, 0.32, -1.0]
      ];
      for(var i=0; i<4; i++){
        var wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.set(wheelPos[i][0], wheelPos[i][1], wheelPos[i][2]);
        wheel.castShadow = true;
        carGroup.add(wheel);
      }

      var headLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      var hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.1), headLightMat);
      hl1.position.set(-0.5, 0.52, 1.71);
      var hl2 = hl1.clone(); hl2.position.x = 0.5;
      carGroup.add(hl1); carGroup.add(hl2);

      var state = callbacks.getGameState ? callbacks.getGameState() : {};
      var spot1 = new THREE.SpotLight(0xfff5cc, 2.5, 45, Math.PI/6, 0.4);
      spot1.position.set(-0.5, 0.52, 1.75);
      spot1.target.position.set(-0.5, 0.1, 15);
      spot1.visible = (state.currentTimeOfDay === 'yo');
      carGroup.add(spot1); carGroup.add(spot1.target);

      var spot2 = new THREE.SpotLight(0xfff5cc, 2.5, 45, Math.PI/6, 0.4);
      spot2.position.set(0.5, 0.52, 1.75);
      spot2.target.position.set(0.5, 0.1, 15);
      spot2.visible = (state.currentTimeOfDay === 'yo');
      carGroup.add(spot2); carGroup.add(spot2.target);

      carGroup.userData.headlight1 = spot1;
      carGroup.userData.headlight2 = spot2;

      var tailLightMat = new THREE.MeshBasicMaterial({ color: 0xff1100 });
      var tl1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), tailLightMat);
      tl1.position.set(-0.5, 0.55, -1.71);
      var tl2 = tl1.clone(); tl2.position.x = 0.5;
      carGroup.add(tl1); carGroup.add(tl2);
    }

    if (!carGroup.userData.glowMesh) {
      var glowGeo = new THREE.BoxGeometry(1.95, 0.85, 3.8);
      var glowMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff, transparent: true, opacity: 0.0, side: THREE.BackSide
      });
      var glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.position.set(0, 0.5, 0);
      carGroup.add(glowMesh);
      carGroup.userData.glowMesh = glowMesh;
    }

    return carGroup;
  }

  function createCars(state) {
    if (window.AudioEngine) AudioEngine.stopAllEngineSounds();

    for(var i = 0; i < cars.length; i++) {
      if(cars[i].mesh) scene.remove(cars[i].mesh);
    }
    cars = [];

    var aiCounter = 1;
    var playerConfigs = state.playerConfigs || [];
    var numPlayers = state.numPlayers || 1;
    var numCompetitors = state.numCompetitors || 2;

    var usedColors = playerConfigs.slice(0, numPlayers).map(function(c){ return c.color; });
    var usedTextures = playerConfigs.slice(0, numPlayers).map(function(c){ return c.texIdx; });

    var availColors = (state.PRESET_PALETTES || []).filter(function(c){ return usedColors.indexOf(c) === -1; });
    if (availColors.length === 0) availColors = (state.PRESET_PALETTES || []).slice();

    var carTexPaths = state.CAR_TEXTURE_PATHS || [];
    var availTextures = [];
    for (var t = 1; t < carTexPaths.length; t++) {
      if (usedTextures.indexOf(t) === -1) availTextures.push(t);
    }
    if (availTextures.length === 0) availTextures = [1, 2, 3, 4, 5, 6];

    for(var i = 0; i < numCompetitors; i++) {
      var isPlayerCar = (i < numPlayers);
      var carName = "", carColor = "", carTexIdx = 0, carModel = 'forder';

      if(isPlayerCar) {
        var cfg = playerConfigs[i];
        carName = (cfg.name && cfg.name.trim() !== "") ? cfg.name.trim() : ("Pelaaja " + (i + 1));
        carColor = cfg.color;
        carTexIdx = cfg.texIdx;
        carModel = cfg.model || 'forder';
      } else {
        carName = "Tietokone " + aiCounter;
        aiCounter++;
        carColor = availColors[(i - numPlayers) % availColors.length];
        carTexIdx = availTextures[(i - numPlayers) % availTextures.length];
        carModel = 'forder';
      }

      var carTexUrl = carTexPaths[carTexIdx] ? carTexPaths[carTexIdx].url : '';
      var mesh = buildCarMesh(carColor, '#111111', carTexUrl, carModel);
      scene.add(mesh);

      if (mesh.userData.headlight1 && mesh.userData.headlight2) {
        mesh.userData.headlight1.visible = (state.currentTimeOfDay === 'yo');
        mesh.userData.headlight2.visible = (state.currentTimeOfDay === 'yo');
      }

      var carObj = {
        id: i,
        name: carName,
        colorHex: carColor,
        colorCss: carColor,
        isHuman: isPlayerCar,
        playerNum: isPlayerCar ? (i + 1) : 0,
        mesh: mesh,
        headlight1: mesh.userData.headlight1,
        headlight2: mesh.userData.headlight2,
        x: 0, y: 0, z: 0, angle: 0, speed: 0,
        targetAngle: 0,
        progress: 0, prevProgress: 0, totalDist: 0,
        aiSpeed: state.getAiSpeedForDifficulty ? state.getAiSpeedForDifficulty() : 16.0,
        laps: 0, currentLapTime: 0, bestLapTime: null,
        lastSampleIdx: 0, passedMidpoint: false,
        finished: false, finishRank: 0, timeOut: false,
        outOfFuel: false,
        wrongWayTimer: 0,
        wrongWay: false,
        tireWear: 0.0,
        damage: 0.0,
        fuel: 100.0,
        orbsCollected: 0,
        lapTimeRemaining: state.timeLimitSetting > 0 ? state.timeLimitSetting : 0,
        upgrades: { accelMult: 1.0, speedMult: 1.0, tireMult: 1.0, dmgMult: 1.0, sandMult: 1.0, waterMult: 1.0, rainMult: 1.0 },
        pitTimer: 0.0,
        pitCooldown: 0.0,
        boostGlowTimer: 0.0,
        driftVx: 0.0,
        driftVz: 0.0,
        lastSkidLeft: null,
        lastSkidRight: null,
        inTunnel: false
      };

      if (isPlayerCar && window.AudioEngine) {
        AudioEngine.setupCarEngineSound(carObj);
      }

      cars.push(carObj);
    }
  }

  /* ---------------------------------------------------------------
     LÄHTÖLASKENTA JA KISASILMUKKA
  --------------------------------------------------------------- */
  function clearCountdownTimeouts() {
    for(var i = 0; i < countdownTimeouts.length; i++) {
      clearTimeout(countdownTimeouts[i]);
    }
    countdownTimeouts = [];
  }

  function startCountdown() {
    var overlay = document.getElementById('countdownOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    overlay.style.fontSize = '8rem';
    isCountdown = true;

    var steps = [
      { text: '3', color: '#ffc107', delay: 0, fx: 'beep' },
      { text: '2', color: '#ff9800', delay: 1000, fx: 'beep' },
      { text: '1', color: '#f44336', delay: 2000, fx: 'beep' },
      { text: 'GO!', color: '#28a745', delay: 3000, fx: 'go' }
    ];

    clearCountdownTimeouts();

    steps.forEach(function(s) {
      var t = setTimeout(function() {
        if (!isRacing) return;
        if (window.AudioEngine) AudioEngine.playFX(s.fx);
        overlay.textContent = s.text;
        overlay.style.color = s.color;
        overlay.classList.remove('countdown-pop');
        void overlay.offsetWidth;
        overlay.classList.add('countdown-pop');

        if (s.text === 'GO!') {
          isCountdown = false;
          cars.forEach(function(c) {
            if (window.AudioEngine) AudioEngine.startCarEngineSound(c);
          });
        }
      }, s.delay);
      countdownTimeouts.push(t);
    });

    var hideT = setTimeout(function() {
      overlay.style.display = 'none';
    }, 4000);
    countdownTimeouts.push(hideT);
  }

  function startSoloQualifyingLap(playerIdx, state) {
    if (!currentTrack) return;

    createCars(state);

    cars.forEach(function(c, idx) {
      if (idx !== playerIdx) {
        c.mesh.visible = false;
      }
    });

    var activeCar = cars[playerIdx];
    var s0 = currentTrack.samples[0];
    var s1 = currentTrack.samples[1];
    var dir = new THREE.Vector3(s1.x - s0.x, 0, s1.z - s0.z).normalize();
    var startAngle = Math.atan2(dir.x, dir.z);

    activeCar.x = s0.x;
    activeCar.z = s0.z;
    activeCar.y = TrackGenerator.getRoadSurfaceHeight(currentTrack, activeCar.x, activeCar.z, activeCar.y);
    activeCar.angle = startAngle;
    activeCar.targetAngle = startAngle;
    activeCar.speed = 0;
    activeCar.progress = 0;
    activeCar.laps = 0;
    activeCar.currentLapTime = 0;
    activeCar.passedMidpoint = false;
    activeCar.finished = false;
    activeCar.outOfFuel = false;
    activeCar.timeOut = false;
    activeCar.fuel = 100.0;
    activeCar.lapTimeRemaining = state.timeLimitSetting > 0 ? state.timeLimitSetting : 0;

    activeCar.mesh.position.set(activeCar.x, activeCar.y, activeCar.z);
    activeCar.mesh.rotation.y = activeCar.angle;
    activeCar.mesh.visible = true;

    isRacing = true;
    flyActive = false;
    controls.autoRotate = false;

    startCountdown();
  }

  function startMainRaceWithGridOrder(qualifyingResults, state) {
    if (!currentTrack) return;

    finishCounter = 0;
    clearSkidMarks();
    createCars(state);
    spawnCollectiblesOnTrack();

    var s0 = currentTrack.samples[0];
    var s1 = currentTrack.samples[1];
    var dir = new THREE.Vector3(s1.x - s0.x, 0, s1.z - s0.z).normalize();
    var startAngle = Math.atan2(dir.x, dir.z);

    for (var gridPos = 0; gridPos < qualifyingResults.length; gridPos++) {
      var res = qualifyingResults[gridPos];
      var c = cars[res.carIdx];

      var sampleOffsetIdx = (currentTrack.n - gridPos * 5 + currentTrack.n) % currentTrack.n;
      var samplePoint = currentTrack.samples[sampleOffsetIdx];

      c.x = samplePoint.x;
      c.z = samplePoint.z;
      c.y = TrackGenerator.getRoadSurfaceHeight(currentTrack, c.x, c.z, c.y);
      c.angle = startAngle;
      c.targetAngle = startAngle;
      c.speed = 0;
      c.progress = sampleOffsetIdx / currentTrack.n;
      c.prevProgress = c.progress;
      c.totalDist = 0;
      c.laps = 0;
      c.currentLapTime = 0;
      c.bestLapTime = null;
      c.lastSampleIdx = sampleOffsetIdx;
      c.passedMidpoint = false;
      c.finished = false;
      c.outOfFuel = false;
      c.finishRank = 0;
      c.timeOut = false;
      c.wrongWayTimer = 0;
      c.wrongWay = false;
      c.tireWear = 0.0;
      c.damage = 0.0;
      c.fuel = 100.0;
      c.lapTimeRemaining = state.timeLimitSetting > 0 ? state.timeLimitSetting : 0;
      c.pitTimer = 0.0;
      c.pitCooldown = 0.0;
      c.boostGlowTimer = 0.0;

      c.mesh.position.set(c.x, c.y, c.z);
      c.mesh.rotation.y = c.angle;
      c.mesh.visible = true;
    }

    isRacing = true;
    flyActive = false;
    controls.autoRotate = false;

    startCountdown();
  }

  function initRace(state) {
    if(!currentTrack) return;

    finishCounter = 0;
    clearSkidMarks();
    createCars(state);
    spawnCollectiblesOnTrack();

    var s0 = currentTrack.samples[0];
    var s1 = currentTrack.samples[1];
    var dir = new THREE.Vector3(s1.x - s0.x, 0, s1.z - s0.z).normalize();
    var startAngle = Math.atan2(dir.x, dir.z);
    var perp = new THREE.Vector3(-dir.z, 0, dir.x);

    for(var i = 0; i < cars.length; i++) {
      var c = cars[i];
      var row = Math.floor(i / 2);
      var colSign = (i % 2 === 0) ? 1 : -1;

      var sampleOffsetIdx = (currentTrack.n - row * 7 + currentTrack.n) % currentTrack.n;
      var samplePoint = currentTrack.samples[sampleOffsetIdx];

      c.x = samplePoint.x + perp.x * (1.6 * colSign);
      c.z = samplePoint.z + perp.z * (1.6 * colSign);
      c.y = TrackGenerator.getRoadSurfaceHeight(currentTrack, c.x, c.z, c.y);
      c.angle = startAngle;
      c.targetAngle = startAngle;
      c.speed = 0;
      c.progress = sampleOffsetIdx / currentTrack.n;
      c.prevProgress = c.progress;
      c.totalDist = 0;
      c.laps = 0;
      c.currentLapTime = 0;
      c.bestLapTime = null;
      c.lastSampleIdx = sampleOffsetIdx;
      c.passedMidpoint = false;
      c.finished = false;
      c.outOfFuel = false;
      c.finishRank = 0;
      c.timeOut = false;
      c.wrongWayTimer = 0;
      c.wrongWay = false;
      c.tireWear = 0.0;
      c.damage = 0.0;
      c.fuel = 100.0;
      c.lapTimeRemaining = state.timeLimitSetting > 0 ? state.timeLimitSetting : 0;
      c.pitTimer = 0.0;
      c.pitCooldown = 0.0;
      c.boostGlowTimer = 0.0;
      c.driftVx = 0.0;
      c.driftVz = 0.0;
      c.lastSkidLeft = null;
      c.lastSkidRight = null;

      c.mesh.position.set(c.x, c.y, c.z);
      c.mesh.rotation.y = c.angle;
      c.mesh.visible = true;
    }

    isRacing = true;
    flyActive = false;
    controls.autoRotate = false;

    startCountdown();
  }

  function stopRace() {
    isRacing = false;
    isCountdown = false;
    clearCountdownTimeouts();

    if (window.AudioEngine) AudioEngine.stopAllEngineSounds();

    for(var i = 0; i < cars.length; i++) {
      if(cars[i].mesh) cars[i].mesh.visible = false;
    }

    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  }

  /* ---------------------------------------------------------------
     FYSIIKKALASKENNAN SILMUKKA
  --------------------------------------------------------------- */
  function updatePhysics(delta) {
    if (!isRacing || !currentTrack) return;

    if (callbacks.onShopInputHandle) {
      callbacks.onShopInputHandle();
    }

    var n = currentTrack.n;
    var state = callbacks.getGameState ? callbacks.getGameState() : {};

    if (isCountdown) {
      for(var i = 0; i < cars.length; i++) {
        var c = cars[i];
        c.mesh.position.set(c.x, c.y, c.z);
        c.mesh.rotation.y = c.angle;
        if (window.AudioEngine) AudioEngine.setCarEngineVolume(c, 0);
      }
      updateCameras();
      return;
    }

    var isPitActive = state.tireWearEnabled || state.damageEnabled || (state.fuelEnabled && state.refuelEnabled);

    for(var i = 0; i < cars.length; i++) {
      var c = cars[i];

      if (c.finished) {
        if (window.AudioEngine) AudioEngine.setCarEngineVolume(c, 0);
        continue;
      }

      // POLTTOAINEEN KULUTUS
      if (state.fuelEnabled && !c.finished) {
        var usageRate = 0.02;

        if (c.isHuman) {
          var inp = callbacks.getPlayerControls ? callbacks.getPlayerControls(i) : {};
          if (inp.gas) {
            var isAccelerating = (c.speed < state.carMaxSpeedSetting * 0.95);
            var accelSpike = isAccelerating ? 0.75 : 0.35;
            usageRate = 0.10 + (Math.abs(c.speed) / state.carMaxSpeedSetting) * 0.25 + accelSpike;
          } else {
            usageRate = 0.02 + (Math.abs(c.speed) / state.carMaxSpeedSetting) * 0.03;
          }
        } else {
          var isAiAccel = (c.speed < c.aiSpeed * 0.95);
          usageRate = 0.10 + (Math.abs(c.speed) / state.carMaxSpeedSetting) * 0.25 + (isAiAccel ? 0.70 : 0.35);
        }

        c.fuel -= delta * usageRate;
        if (c.fuel <= 0) {
          c.fuel = 0;
          c.finished = true;
          c.outOfFuel = true;
          c.speed = 0;
          c.finishRank = ++finishCounter;
          c.mesh.visible = false;
          if (window.AudioEngine) AudioEngine.stopCarEngineSound(c);
          continue;
        }
      }

      // AIKARAJA
      if (state.timeLimitSetting > 0) {
        c.lapTimeRemaining -= delta;
        if (c.lapTimeRemaining <= 0) {
          c.lapTimeRemaining = 0;
          c.finished = true;
          c.timeOut = true;
          c.finishRank = ++finishCounter;
          c.mesh.visible = false;
          if (window.AudioEngine) AudioEngine.stopCarEngineSound(c);
          continue;
        }
      }

      if (state.damageEnabled && c.damage > 0.45 && Math.random() < 0.6) {
        var fX = c.x + Math.sin(c.angle) * 1.2;
        var fZ = c.z + Math.cos(c.angle) * 1.2;
        spawnSmokeParticles(fX, c.y + 0.3, fZ, 2);
      }

      if (c.boostGlowTimer > 0) {
        c.boostGlowTimer -= delta * 2.2;
        if (c.mesh && c.mesh.userData.glowMesh) {
          c.mesh.userData.glowMesh.material.opacity = Math.max(0, c.boostGlowTimer * 0.85);
        }
      } else if (c.mesh && c.mesh.userData.glowMesh) {
        c.mesh.userData.glowMesh.material.opacity = 0;
      }

      if (c.pitCooldown > 0) {
        c.pitCooldown = Math.max(0, c.pitCooldown - delta);
      }

      // VARIKKO
      if (c.pitTimer > 0) {
        c.pitTimer -= delta;
        c.speed = 0;
        if (c.pitTimer <= 0) {
          c.pitTimer = 0;
          c.tireWear = 0.0;
          c.damage = 0.0;
          if (state.fuelEnabled && state.refuelEnabled) {
            c.fuel = 100.0;
          }
          c.pitCooldown = 8.0;
          if (window.AudioEngine) AudioEngine.playFX('go');
        }
        c.mesh.position.set(c.x, c.y, c.z);
        c.mesh.rotation.y = c.angle;
        continue;
      }

      if (c.isHuman) {
        var inp = callbacks.getPlayerControls ? callbacks.getPlayerControls(i) : { gas:false, brake:false, left:false, right:false };
        
        var accel = state.carAccelSetting * c.upgrades.accelMult;
        var brake = state.carAccelSetting * 1.25;
        var friction = 4.5;
        var maxSpeed = state.carMaxSpeedSetting * c.upgrades.speedMult;

        if (state.damageEnabled) {
          maxSpeed *= (1.0 - c.damage * 0.65);
        }

        var gripFactor = 1.0;

        if (state.fuelEnabled && c.fuel < 50.0) {
          gripFactor *= (0.75 + (c.fuel / 50.0) * 0.25);
        }

        if (isRain) {
          gripFactor *= (0.65 + (1.0 - c.upgrades.rainMult) * 0.35);
        }

        if (state.tireWearEnabled) {
          c.tireWear += (Math.abs(c.speed) / maxSpeed) * delta * 0.022 * c.upgrades.tireMult;
          if (c.tireWear > 1.0) c.tireWear = 1.0;

          if (c.tireWear > 0.4) {
            gripFactor *= (1.0 - (c.tireWear - 0.4) * 0.75);
          }
        }

        if (inp.brake && c.speed > 14.0) {
          if (window.AudioEngine) AudioEngine.playFX('jarrutus');

          if (inp.left || inp.right) {
            gripFactor *= 0.55;
            spawnSkidMarkSegment(c);
          } else {
            c.lastSkidLeft = null;
            c.lastSkidRight = null;
          }
        } else {
          c.lastSkidLeft = null;
          c.lastSkidRight = null;
        }

        if(inp.gas) c.speed += accel * delta * gripFactor;
        else if(inp.brake) c.speed -= brake * delta;
        else {
          if(c.speed > 0) c.speed = Math.max(0, c.speed - friction * delta);
          else if(c.speed < 0) c.speed = Math.min(0, c.speed + friction * delta);
        }

        c.speed = THREE.MathUtils.clamp(c.speed, -12, maxSpeed);

        if (window.AudioEngine && typeof AudioEngine.updateCarEngineSound === 'function') {
          AudioEngine.updateCarEngineSound(c, inp.gas, c.speed, maxSpeed);
        }

        var turnSpeed = 2.8 * gripFactor;
        if(Math.abs(c.speed) > 0.5) {
          var dirFactor = c.speed > 0 ? 1 : -1;
          var leftVal = typeof inp.left === 'number' ? inp.left : (inp.left ? 1 : 0);
          var rightVal = typeof inp.right === 'number' ? inp.right : (inp.right ? 1 : 0);

          var steerInput = (leftVal - rightVal) * turnSpeed * dirFactor;
          c.targetAngle = (c.targetAngle || c.angle) + steerInput * delta;

          c.angle = THREE.MathUtils.lerp(c.angle, c.targetAngle, delta * 18.0);
        } else {
          c.targetAngle = c.angle;
        }

        var forwardX = Math.sin(c.angle);
        var forwardZ = Math.cos(c.angle);

        if (gripFactor < 0.85 && Math.abs(c.speed) > 8.0) {
          var sideX = -forwardZ;
          var sideZ = forwardX;
          var slideAmount = (1.0 - gripFactor) * (c.speed / maxSpeed) * 1.8;

          c.driftVx = THREE.MathUtils.lerp(c.driftVx, sideX * slideAmount, delta * 3.0);
          c.driftVz = THREE.MathUtils.lerp(c.driftVz, sideZ * slideAmount, delta * 3.0);

          if (Math.random() < 0.35) spawnDustParticles(c.x, c.y, c.z, 1);
        } else {
          c.driftVx = THREE.MathUtils.lerp(c.driftVx, 0, delta * 8.0);
          c.driftVz = THREE.MathUtils.lerp(c.driftVz, 0, delta * 8.0);
        }

        var nextX = c.x + (forwardX * c.speed + c.driftVx) * delta;
        var nextZ = c.z + (forwardZ * c.speed + c.driftVz) * delta;

        var trackInfo = TrackGenerator.closestSampleInfo(currentTrack, nextX, nextZ, c.y);

        c.inTunnel = !!(trackInfo.sample && trackInfo.sample.isTunnel);
        if (window.AudioEngine && typeof AudioEngine.setTunnelEcho === 'function') {
          AudioEngine.setTunnelEcho(c, c.inTunnel);
        }

        if (c.headlight1 && c.headlight2) {
          c.headlight1.visible = (state.currentTimeOfDay === 'yo' || c.inTunnel);
          c.headlight2.visible = (state.currentTimeOfDay === 'yo' || c.inTunnel);
        }

        var sampleHalfWidth = trackInfo.sample ? (trackInfo.sample.isPassingLane ? TrackGenerator.ROAD_HALF_WIDTH * 1.55 : TrackGenerator.ROAD_HALF_WIDTH) : TrackGenerator.ROAD_HALF_WIDTH;
        var maxLatDistance = sampleHalfWidth + TrackGenerator.CURB_WIDTH - 0.45;

        if (isPitActive && currentTrack.pitStopArea) {
          var pit = currentTrack.pitStopArea;
          var pdx = nextX - pit.x, pdz = nextZ - pit.z;
          if (Math.sqrt(pdx*pdx + pdz*pdz) < pit.radius + 6.0) {
            maxLatDistance = sampleHalfWidth + 4.2;
          }
        }

        var dot = forwardX * trackInfo.sample.tx + forwardZ * trackInfo.sample.tz;
        if (dot < -0.2) {
          c.wrongWayTimer = (c.wrongWayTimer || 0) + delta;
        } else {
          c.wrongWayTimer = Math.max(0, (c.wrongWayTimer || 0) - delta * 2);
        }
        c.wrongWay = (c.wrongWayTimer > 1.2);

        var isOnSand = (trackInfo.sample.surface === 1) || (Math.abs(trackInfo.latDist) > sampleHalfWidth);
        if (isOnSand) {
          var sandSlow = 0.16 * c.upgrades.sandMult;
          c.speed *= (1.0 - sandSlow * delta);
          if (Math.abs(c.speed) > 4.0) {
            if (Math.random() < 0.65) spawnDustParticles(nextX, c.y, nextZ, 2);
            if (Math.random() < 0.12 && window.AudioEngine) AudioEngine.playFX('sand');
          }
        }

        // TÖRMÄYS
        if(Math.abs(trackInfo.latDist) > maxLatDistance) {
          var sign = trackInfo.latDist > 0 ? 1 : -1;
          var s = trackInfo.sample;
          var perpX = -s.tz, perpZ = s.tx;

          if (state.curbStyle === 'seinat') {
            var bounceDist = maxLatDistance - 0.15;
            nextX = s.x + perpX * (bounceDist * sign);
            nextZ = s.z + perpZ * (bounceDist * sign);

            c.speed = Math.max(c.speed * 0.94, 6.0 * (c.speed > 0 ? 1 : -1));

            var trackHeading = Math.atan2(s.tx, s.tz);
            var angleDiff = trackHeading - c.angle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            c.angle += angleDiff * Math.min(1.0, delta * 6.0);
            c.targetAngle = c.angle;

            c.driftVx = THREE.MathUtils.lerp(c.driftVx, -perpX * sign * 0.5, delta * 5.0);
            c.driftVz = THREE.MathUtils.lerp(c.driftVz, -perpZ * sign * 0.5, delta * 5.0);

            if (state.damageEnabled && Math.abs(c.speed) > 5.0) {
              c.damage += delta * 0.04 * c.upgrades.dmgMult;
              if (c.damage > 1.0) c.damage = 1.0;
            }

            if (Math.abs(c.speed) > 6.0) {
              spawnSparkParticles(nextX, c.y + 0.3, nextZ, 2);
              if (window.AudioEngine && Math.random() < 0.15) AudioEngine.playFX('collision');
            }
          } else {
            nextX = s.x + perpX * (maxLatDistance * sign);
            nextZ = s.z + perpZ * (maxLatDistance * sign);
            c.speed *= 0.6;

            if (state.damageEnabled && Math.abs(c.speed) > 5.0) {
              c.damage += delta * 0.15 * c.upgrades.dmgMult;
              if (c.damage > 1.0) c.damage = 1.0;
              spawnSparkParticles(nextX, c.y + 0.3, nextZ, 3);
            }
          }
        }

        if (waterEnabled) {
          for (var p = 0; p < puddlesList.length; p++) {
            var pud = puddlesList[p];
            var pdx = nextX - pud.x, pdz = nextZ - pud.z;
            var pdist = Math.sqrt(pdx*pdx + pdz*pdz);
            if (pdist < pud.radius) {
              var waterSlow = 0.22 * c.upgrades.waterMult;
              c.speed *= (1.0 - waterSlow * delta);
              if (Math.abs(c.speed) > 5.0 && Math.random() < 0.6) {
                spawnSplashParticles(nextX, c.y, nextZ, 3, true);
              }
              break;
            }
          }
        }

        if (state.boostersEnabled && currentTrack.boosters) {
          for (var b = 0; b < currentTrack.boosters.length; b++) {
            var bst = currentTrack.boosters[b];
            var bdx = nextX - bst.x, bdz = nextZ - bst.z;
            if (Math.sqrt(bdx*bdx + bdz*bdz) < bst.radius) {
              c.speed = state.carMaxSpeedSetting * 1.15;
              c.boostGlowTimer = 1.0;
              if (window.AudioEngine) AudioEngine.playFX('kiihdytin');
              break;
            }
          }
        }

        if (isPitActive && currentTrack.pitStopArea && c.pitCooldown <= 0 && c.pitTimer === 0) {
          var pit = currentTrack.pitStopArea;
          var ptx = nextX - pit.x, ptz = nextZ - pit.z;
          if (Math.sqrt(ptx*ptx + ptz*ptz) < pit.radius && (c.tireWear > 0.10 || c.damage > 0.05 || (state.fuelEnabled && state.refuelEnabled && c.fuel < 90.0))) {
            c.pitTimer = 3.0;
            c.speed = 0;
            c.driftVx = 0;
            c.driftVz = 0;
            if (window.AudioEngine) AudioEngine.playFX('varikko');
          }
        }

        c.x = nextX;
        c.z = nextZ;
        c.y = TrackGenerator.getRoadSurfaceHeight(currentTrack, c.x, c.z, c.y);

        c.mesh.position.set(c.x, c.y, c.z);
        c.mesh.rotation.y = c.angle;

        c.currentLapTime += delta;
        var currentSampleIdx = trackInfo.sampleIndex;

        if(currentSampleIdx > n * 0.4 && currentSampleIdx < n * 0.6) {
          c.passedMidpoint = true;
        }

        if(c.lastSampleIdx > n - 25 && currentSampleIdx < 25 && c.passedMidpoint) {
          if (callbacks.onQualifyingLapFinish && state.isQualifying) {
            callbacks.onQualifyingLapFinish(c);
            return;
          }

          c.laps++;
          c.lapTimeRemaining = state.timeLimitSetting > 0 ? state.timeLimitSetting : 0;

          if(c.bestLapTime === null || c.currentLapTime < c.bestLapTime) {
            c.bestLapTime = c.currentLapTime;
          }
          c.currentLapTime = 0;
          c.passedMidpoint = false;

          if(c.laps >= state.targetLaps) {
            c.finished = true;
            c.finishRank = ++finishCounter;
            c.mesh.visible = false;
            if (window.AudioEngine) AudioEngine.stopCarEngineSound(c);
            if (window.AudioEngine) AudioEngine.playFX('finish');
          }
        }
        c.lastSampleIdx = currentSampleIdx;
        c.totalDist = c.laps * currentTrack.totalLength + (currentSampleIdx / n) * currentTrack.totalLength;

      } else {
        var trackLen = currentTrack.totalLength;
        
        if (state.fuelEnabled) {
          c.fuel -= delta * 0.35;
          if (c.fuel <= 0) {
            c.fuel = 0;
            c.finished = true;
            c.outOfFuel = true;
            c.finishRank = ++finishCounter;
            c.mesh.visible = false;
            continue;
          }
        }

        if (isPitActive && currentTrack.pitStopArea && c.pitCooldown <= 0 && c.pitTimer === 0) {
          c.tireWear += (c.aiSpeed / state.carMaxSpeedSetting) * delta * 0.022;
          if (c.tireWear > 0.75 || c.damage > 0.4 || (state.fuelEnabled && state.refuelEnabled && c.fuel < 25.0)) {
            var pit = currentTrack.pitStopArea;
            var ptx = c.x - pit.x, ptz = c.z - pit.z;
            if (Math.sqrt(ptx*ptx + ptz*ptz) < pit.radius) {
              c.pitTimer = 3.0;
              c.tireWear = 0.0;
              c.damage = 0.0;
              if (state.fuelEnabled && state.refuelEnabled) c.fuel = 100.0;
              c.pitCooldown = 8.0;
              if (window.AudioEngine) AudioEngine.playFX('varikko');
            }
          }
        }

        c.progress += (c.aiSpeed * delta) / trackLen;
        if(c.progress > 1) c.progress -= 1;

        var aiPos = currentTrack.curve3D.getPointAt(c.progress);
        var aiLook = currentTrack.curve3D.getPointAt((c.progress + 0.005) % 1);

        var aiDir = new THREE.Vector3().subVectors(aiLook, aiPos).normalize();
        var aiPerp = new THREE.Vector3(-aiDir.z, 0, aiDir.x);
        
        var laneOffset = (c.id % 2 === 0 ? 1.5 : -1.5);
        aiPos.addScaledVector(aiPerp, laneOffset);

        c.x = aiPos.x;
        c.z = aiPos.z;
        c.y = TrackGenerator.getRoadSurfaceHeight(currentTrack, c.x, c.z, c.y);
        c.angle = Math.atan2(aiDir.x, aiDir.z);

        if (state.boostersEnabled && currentTrack.boosters) {
          for (var b = 0; b < currentTrack.boosters.length; b++) {
            var bst = currentTrack.boosters[b];
            var bdx = c.x - bst.x, bdz = c.z - bst.z;
            if (Math.sqrt(bdx*bdx + bdz*bdz) < bst.radius) {
              c.progress += (c.aiSpeed * delta * 2.0) / trackLen;
              c.boostGlowTimer = 1.0;
              break;
            }
          }
        }

        var aiTrackInfo = TrackGenerator.closestSampleInfo(currentTrack, c.x, c.z, c.y);
        if (aiTrackInfo.sample.surface === 1 && Math.random() < 0.4) {
          spawnDustParticles(c.x, c.y, c.z, 1);
        }

        if (waterEnabled) {
          for (var p = 0; p < puddlesList.length; p++) {
            var pud = puddlesList[p];
            var pdx = c.x - pud.x, pdz = c.z - pud.z;
            if (Math.sqrt(pdx*pdx + pdz*pdz) < pud.radius && Math.random() < 0.4) {
              spawnSplashParticles(c.x, c.y, c.z, 2, false);
              break;
            }
          }
        }

        c.mesh.position.set(c.x, c.y, c.z);
        c.mesh.lookAt(aiLook.x + aiPerp.x*laneOffset, c.y, aiLook.z + aiPerp.z*laneOffset);

        c.currentLapTime += delta;
        if(c.progress > 0.4 && c.progress < 0.6) {
          c.passedMidpoint = true;
        }
        if(c.prevProgress > 0.85 && c.progress < 0.15 && c.passedMidpoint) {
          c.laps++;
          if(c.bestLapTime === null || c.currentLapTime < c.bestLapTime) {
            c.bestLapTime = c.currentLapTime;
          }
          c.currentLapTime = 0;
          c.passedMidpoint = false;

          if(c.laps >= state.targetLaps) {
            c.finished = true;
            c.finishRank = ++finishCounter;
            c.mesh.visible = false;
            if (window.AudioEngine) AudioEngine.playFX('finish');
          }
        }
        c.prevProgress = c.progress;
        c.totalDist = c.laps * currentTrack.totalLength + c.progress * currentTrack.totalLength;
      }
    }

    // TÖRMÄYS AUTOHIN
    for(var i = 0; i < cars.length; i++) {
      for(var j = i + 1; j < cars.length; j++) {
        var c1 = cars[i], c2 = cars[j];
        if(c1.finished || c2.finished) continue;

        var dx = c1.x - c2.x;
        var dz = c1.z - c2.z;
        var dist = Math.sqrt(dx*dx + dz*dz);
        var minDist = 2.2;

        if(dist < minDist && dist > 0.001) {
          var overlap = (minDist - dist) * 0.5;
          var nx = dx / dist, nz = dz / dist;

          if(c1.isHuman) {
            c1.x += nx * overlap; c1.z += nz * overlap; c1.speed *= 0.7;
          }
          if(c2.isHuman) {
            c2.x -= nx * overlap; c2.z -= nz * overlap; c2.speed *= 0.7;
          }

          if (state.damageEnabled) {
            var relSpeed = Math.abs(c1.speed - c2.speed) + 4.0;
            c1.damage += relSpeed * 0.008 * c1.upgrades.dmgMult;
            c2.damage += relSpeed * 0.008 * c2.upgrades.dmgMult;
            if (c1.damage > 1.0) c1.damage = 1.0;
            if (c2.damage > 1.0) c2.damage = 1.0;
          }

          spawnSparkParticles((c1.x + c2.x) / 2, (c1.y + c2.y) / 2 + 0.4, (c1.z + c2.z) / 2, 14);

          if (window.AudioEngine) AudioEngine.playFX('collision');
        }
      }
    }

    if (callbacks.onCareerRaceFinishCheck) {
      callbacks.onCareerRaceFinishCheck();
    }

    updateCollectibles(delta);
    updateOrbScatterParticles(delta);
    updateSplashParticles(delta);
    updateDustParticles(delta);
    updateSmokeParticles(delta);
    updateSparkParticles(delta);
    updatePrecipitation(delta, state.currentSeason);

    if (callbacks.updateMinimap) callbacks.updateMinimap();
    if (callbacks.updateHudUI) callbacks.updateHudUI();

    updateCameras();
  }

  function updateCameras() {
    var cams = [camera, camera2, camera3, camera4];
    var state = callbacks.getGameState ? callbacks.getGameState() : {};
    var numPlayers = state.numPlayers || 1;
    var playerConfigs = state.playerConfigs || [];

    for(var i = 0; i < numPlayers; i++) {
      if(cars.length > i) {
        var p = cars[i];
        var cam = cams[i];
        var cfg = playerConfigs[i] || {};
        var mode = cfg.cameraPos || 'far';

        var fX = Math.sin(p.angle);
        var fZ = Math.cos(p.angle);

        if (mode === 'near') {
          cam.up.set(0, 1, 0);
          var camDist = 4.8, camHeight = 1.9;
          var targetCamX = p.x - fX * camDist;
          var targetCamZ = p.z - fZ * camDist;
          var targetCamY = p.y + camHeight;

          cam.position.x = THREE.MathUtils.lerp(cam.position.x, targetCamX, 0.18);
          cam.position.y = THREE.MathUtils.lerp(cam.position.y, targetCamY, 0.18);
          cam.position.z = THREE.MathUtils.lerp(cam.position.z, targetCamZ, 0.18);

          cam.lookAt(p.x + fX * 4, p.y + 1.0, p.z + fZ * 4);
        } else if (mode === 'windshield') {
          cam.up.set(0, 1, 0);
          var targetCamX = p.x + fX * 0.2;
          var targetCamY = p.y + 0.95;
          var targetCamZ = p.z + fZ * 0.2;

          cam.position.x = THREE.MathUtils.lerp(cam.position.x, targetCamX, 0.35);
          cam.position.y = THREE.MathUtils.lerp(cam.position.y, targetCamY, 0.35);
          cam.position.z = THREE.MathUtils.lerp(cam.position.z, targetCamZ, 0.35);

          cam.lookAt(p.x + fX * 30.0, p.y + 0.95, p.z + fZ * 30.0);
        } else if (mode === 'topdown') {
          cam.up.set(fX, 0, fZ);
          var targetCamX = p.x;
          var targetCamY = p.y + 26.0;
          var targetCamZ = p.z;

          cam.position.x = THREE.MathUtils.lerp(cam.position.x, targetCamX, 0.2);
          cam.position.y = THREE.MathUtils.lerp(cam.position.y, targetCamY, 0.2);
          cam.position.z = THREE.MathUtils.lerp(cam.position.z, targetCamZ, 0.2);

          cam.lookAt(p.x, p.y, p.z);
        } else {
          // 'far' / default
          cam.up.set(0, 1, 0);
          var camDist = 8.5, camHeight = 3.2;
          var targetCamX = p.x - fX * camDist;
          var targetCamZ = p.z - fZ * camDist;
          var targetCamY = p.y + camHeight;

          cam.position.x = THREE.MathUtils.lerp(cam.position.x, targetCamX, 0.12);
          cam.position.y = THREE.MathUtils.lerp(cam.position.y, targetCamY, 0.12);
          cam.position.z = THREE.MathUtils.lerp(cam.position.z, targetCamZ, 0.12);

          cam.lookAt(p.x + fX * 4, p.y + 1.2, p.z + fZ * 4);
        }
      }
    }
  }

  /* ---------------------------------------------------------------
     RADAN, TERRAININ JA MAASTO-OBJEKTIEN LUONTI
  --------------------------------------------------------------- */
  function disposeMesh(m){
    if(!m) return;
    if(m.geometry) m.geometry.dispose();
    scene.remove(m);
  }

  function updatePuddleReflections() {
    if (!waterGroup || !waterEnabled) return;
    waterGroup.visible = false;
    if (currentTrack && currentTrack.samples && currentTrack.samples.length > 0) {
      var midSample = currentTrack.samples[Math.floor(currentTrack.n / 2)];
      puddleCubeCamera.position.set(midSample.x, midSample.y + 1.5, midSample.z);
    } else {
      puddleCubeCamera.position.set(0, 2, 0);
    }
    puddleCubeCamera.update(renderer, scene);
    waterGroup.visible = true;
  }

  // OPTIMOINTI: ESIKÄÄNNETÄÄN WEBGL-VARJOSTIMET (SHADERS) TUNNELI-LAGIN POISTAMISEKSI
  function precompileShaders(state) {
    if (!renderer || !scene || !camera) return;

    // Tilapäisesti aktivoidaan kaikkien autojen ajovalot esikäännöksen ajaksi
    cars.forEach(function(c) {
      if (c.headlight1) c.headlight1.visible = true;
      if (c.headlight2) c.headlight2.visible = true;
    });

    // Pakotetaan WebGL kääntämään kaikki PBR-materiaali- ja valovarjostimet (kerralla radan latauksessa)
    renderer.compile(scene, camera);

    // Palautetaan valojen oikea näkyvyystila
    var isNight = (state.currentTimeOfDay === 'yo');
    cars.forEach(function(c) {
      if (c.headlight1) c.headlight1.visible = isNight || c.inTunnel;
      if (c.headlight2) c.headlight2.visible = isNight || c.inTunnel;
    });
  }

  function regenerateAll(state) {
    state = state || (callbacks.getGameState ? callbacks.getGameState() : {});

    updateEnvironmentAtmosphere(state.currentTimeOfDay, state.currentSeason, state.currentEnvironment, state.isFog);
    buildClouds(state.isClouds, state.currentTimeOfDay, state.isRain);

    TrackGenerator.resetNoiseSeed();

    disposeMesh(terrainMesh); disposeMesh(roadMesh); disposeMesh(curbMesh);
    disposeMesh(postMesh); disposeMesh(forestMesh); disposeMesh(finishLineMesh);
    disposeMesh(bridgeMeshGroup); disposeMesh(tunnelMeshGroup); disposeMesh(boosterGroup); disposeMesh(pitStopGroup);
    clearSkidMarks();

    var track = TrackGenerator.buildTrackPath(state.tunnelEnabled, state.passingLaneEnabled);
    currentTrack = track;

    var terr = TrackGenerator.buildTerrain(track, state.currentEnvironment, state.currentSeason, state.texturesEnabled, state.loadTextureWithFallback, state.ENV_TEXTURE_PATHS);
    terrainMesh = terr.mesh; terrainInfo = terr.bounds;
    scene.add(terrainMesh);

    roadMesh = TrackGenerator.buildRoad(track, state.texturesEnabled, state.loadTextureWithFallback, state.ENV_TEXTURE_PATHS, state.currentEnvironment, state.gravelEnabled); scene.add(roadMesh);
    curbMesh = TrackGenerator.buildCurbs(track); scene.add(curbMesh);
    postMesh = TrackGenerator.buildDelineators(track, state.curbStyle); scene.add(postMesh);
    forestMesh = TrackGenerator.buildForest(track, terrainInfo, state.currentEnvironment, state.currentSeason, state.currentTimeOfDay, state.texturesEnabled, state.loadTextureWithFallback, state.CITY_TEXTURE_PATHS, state.HITECH_TEXTURE_PATHS, state.CAR_TEXTURE_PATHS); scene.add(forestMesh);
    finishLineMesh = TrackGenerator.buildFinishLine(track); scene.add(finishLineMesh);
    
    bridgeMeshGroup = TrackGenerator.buildBridgeStructures(track); scene.add(bridgeMeshGroup);

    if (typeof TrackGenerator.buildTunnelStructure === 'function') {
      tunnelMeshGroup = TrackGenerator.buildTunnelStructure(track, state.currentEnvironment, state.texturesEnabled, state.loadTextureWithFallback);
      if (tunnelMeshGroup) scene.add(tunnelMeshGroup);
    }

    if (typeof TrackGenerator.buildBoosters === 'function') {
      var bData = TrackGenerator.buildBoosters(track, state.boostersEnabled, state.texturesEnabled, state.loadTextureWithFallback, state.ENV_TEXTURE_PATHS);
      boosterGroup = bData.group;
      track.boosters = bData.boosters;
      if (boosterGroup) scene.add(boosterGroup);
    }

    if (typeof TrackGenerator.buildPitStop === 'function') {
      var isPitNeeded = state.tireWearEnabled || state.damageEnabled || (state.fuelEnabled && state.refuelEnabled);
      var pData = TrackGenerator.buildPitStop(currentTrack, isPitNeeded, state.texturesEnabled, state.loadTextureWithFallback, state.ENV_TEXTURE_PATHS);
      pitStopGroup = pData.group;
      currentTrack.pitStopArea = pData.pitStopArea;
      if (pitStopGroup) scene.add(pitStopGroup);
    }

    puddlesList = TrackGenerator.buildPuddles(track, waterGroup, waterEnabled, puddleCubeRenderTarget.texture, state.isRain);
    spawnCollectiblesOnTrack();

    curbMesh.visible = curbsVisible;
    postMesh.visible = curbsVisible;
    forestMesh.visible = treesVisible;

    var avgY=0;
    for(var i=0;i<track.n;i++) avgY += track.samples[i].y;
    avgY /= track.n;
    var midX=(terrainInfo.minX+terrainInfo.maxX)/2, midZ=(terrainInfo.minZ+terrainInfo.maxZ)/2;
    controls.target.set(midX, avgY+2, midZ);
    controls.setDistance(Math.max(60, terrainInfo.size*0.55));

    sun.target.position.set(midX, avgY, midZ);
    sun.position.set(midX+180, avgY+30, midZ+90);

    updatePuddleReflections();
    precompileShaders(state);
  }

  function generateCustomDrawnTrack(customDrawnPoints, canvasW, canvasH, state) {
    state = state || (callbacks.getGameState ? callbacks.getGameState() : {});

    updateEnvironmentAtmosphere(state.currentTimeOfDay, state.currentSeason, state.currentEnvironment, state.isFog);
    buildClouds(state.isClouds, state.currentTimeOfDay, state.isRain);

    disposeMesh(terrainMesh); disposeMesh(roadMesh); disposeMesh(curbMesh);
    disposeMesh(postMesh); disposeMesh(forestMesh); disposeMesh(finishLineMesh);
    disposeMesh(bridgeMeshGroup); disposeMesh(tunnelMeshGroup); disposeMesh(boosterGroup); disposeMesh(pitStopGroup);
    clearSkidMarks();

    if (TrackGenerator.buildTrackFromCustomPoints) {
      var track = TrackGenerator.buildTrackFromCustomPoints(customDrawnPoints, canvasW, canvasH, state.tunnelEnabled, state.passingLaneEnabled);
      currentTrack = track;
    } else {
      TrackGenerator.resetNoiseSeed();
      currentTrack = TrackGenerator.buildTrackPath(state.tunnelEnabled, state.passingLaneEnabled);
    }

    var terr = TrackGenerator.buildTerrain(currentTrack, state.currentEnvironment, state.currentSeason, state.texturesEnabled, state.loadTextureWithFallback, state.ENV_TEXTURE_PATHS);
    terrainMesh = terr.mesh; terrainInfo = terr.bounds;
    scene.add(terrainMesh);

    roadMesh = TrackGenerator.buildRoad(currentTrack, state.texturesEnabled, state.loadTextureWithFallback, state.ENV_TEXTURE_PATHS, state.currentEnvironment, state.gravelEnabled); scene.add(roadMesh);
    curbMesh = TrackGenerator.buildCurbs(currentTrack); scene.add(curbMesh);
    postMesh = TrackGenerator.buildDelineators(currentTrack, state.curbStyle); scene.add(postMesh);
    forestMesh = TrackGenerator.buildForest(currentTrack, terrainInfo, state.currentEnvironment, state.currentSeason, state.currentTimeOfDay, state.texturesEnabled, state.loadTextureWithFallback, state.CITY_TEXTURE_PATHS, state.HITECH_TEXTURE_PATHS, state.CAR_TEXTURE_PATHS); scene.add(forestMesh);
    finishLineMesh = TrackGenerator.buildFinishLine(currentTrack); scene.add(finishLineMesh);
    
    bridgeMeshGroup = TrackGenerator.buildBridgeStructures(currentTrack); scene.add(bridgeMeshGroup);

    if (typeof TrackGenerator.buildTunnelStructure === 'function') {
      tunnelMeshGroup = TrackGenerator.buildTunnelStructure(currentTrack, state.currentEnvironment, state.texturesEnabled, state.loadTextureWithFallback);
      if (tunnelMeshGroup) scene.add(tunnelMeshGroup);
    }

    if (typeof TrackGenerator.buildBoosters === 'function') {
      var bData = TrackGenerator.buildBoosters(currentTrack, state.boostersEnabled, state.texturesEnabled, state.loadTextureWithFallback, state.ENV_TEXTURE_PATHS);
      boosterGroup = bData.group;
      currentTrack.boosters = bData.boosters;
      if (boosterGroup) scene.add(boosterGroup);
    }

    if (typeof TrackGenerator.buildPitStop === 'function') {
      var isPitNeeded = state.tireWearEnabled || state.damageEnabled || (state.fuelEnabled && state.refuelEnabled);
      var pData = TrackGenerator.buildPitStop(currentTrack, isPitNeeded, state.texturesEnabled, state.loadTextureWithFallback, state.ENV_TEXTURE_PATHS);
      pitStopGroup = pData.group;
      currentTrack.pitStopArea = pData.pitStopArea;
      if (pitStopGroup) scene.add(pitStopGroup);
    }

    puddlesList = TrackGenerator.buildPuddles(currentTrack, waterGroup, waterEnabled, puddleCubeRenderTarget.texture, state.isRain);
    spawnCollectiblesOnTrack();

    curbMesh.visible = curbsVisible;
    postMesh.visible = curbsVisible;
    forestMesh.visible = treesVisible;

    var avgY=0;
    for(var i=0;i<currentTrack.n;i++) avgY += currentTrack.samples[i].y;
    avgY /= currentTrack.n;
    var midX=(terrainInfo.minX+terrainInfo.maxX)/2, midZ=(terrainInfo.minZ+terrainInfo.maxZ)/2;
    controls.target.set(midX, avgY+2, midZ);
    controls.setDistance(Math.max(60, terrainInfo.size*0.55));

    sun.target.position.set(midX, avgY, midZ);
    sun.position.set(midX+180, avgY+30, midZ+90);

    updatePuddleReflections();
    precompileShaders(state);
  }

  /* ---------------------------------------------------------------
     ANIMAATIO JA RENDERÖINTISILMUKKA
  --------------------------------------------------------------- */
  var clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    var delta = clock.getDelta();

    if (callbacks.renderPreviewsAnimation) {
      callbacks.renderPreviewsAnimation();
    }

    if (isClouds && cloudGroup) {
      cloudGroup.rotation.y += delta * 0.01;
    }

    var state = callbacks.getGameState ? callbacks.getGameState() : {};
    var numPlayers = state.numPlayers || 1;
    var isStereoOn = stereoActive && (numPlayers === 1);

    if(isRacing) {
      updatePhysics(delta);

      var w = window.innerWidth;
      var h = window.innerHeight;

      if(isStereoOn) {
        var halfW = Math.floor(w / 2);
        camRightVec.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize();

        cameraLeft.position.copy(camera.position).addScaledVector(camRightVec, -stereoEyeDist / 2);
        cameraLeft.quaternion.copy(camera.quaternion);

        cameraRight.position.copy(camera.position).addScaledVector(camRightVec, stereoEyeDist / 2);
        cameraRight.quaternion.copy(camera.quaternion);

        renderer.setScissorTest(true);

        renderer.setViewport(-stereoImageOffset, 0, halfW, h);
        renderer.setScissor(0, 0, halfW, h);
        cameraLeft.aspect = halfW / h; cameraLeft.updateProjectionMatrix();
        renderer.render(scene, cameraLeft);

        renderer.setViewport(halfW + stereoImageOffset, 0, halfW, h);
        renderer.setScissor(halfW, 0, halfW, h);
        cameraRight.aspect = halfW / h; cameraRight.updateProjectionMatrix();
        renderer.render(scene, cameraRight);

        renderer.setScissorTest(false);
      } else if(numPlayers === 1) {
        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
      } else if(numPlayers === 2) {
        var halfH = Math.floor(h / 2);
        renderer.setScissorTest(true);

        renderer.setViewport(0, halfH, w, halfH);
        renderer.setScissor(0, halfH, w, halfH);
        camera.aspect = w / halfH; camera.updateProjectionMatrix();
        renderer.render(scene, camera);

        renderer.setViewport(0, 0, w, halfH);
        renderer.setScissor(0, 0, w, halfH);
        camera2.aspect = w / halfH; camera2.updateProjectionMatrix();
        renderer.render(scene, camera2);

        renderer.setScissorTest(false);
      } else if(numPlayers === 3) {
        var halfW = Math.floor(w / 2);
        var halfH = Math.floor(h / 2);
        renderer.setScissorTest(true);

        renderer.setViewport(0, halfH, halfW, halfH);
        renderer.setScissor(0, halfH, halfW, halfH);
        camera.aspect = halfW / halfH; camera.updateProjectionMatrix();
        renderer.render(scene, camera);

        renderer.setViewport(halfW, halfH, halfW, halfH);
        renderer.setScissor(halfW, halfH, halfW, halfH);
        camera2.aspect = halfW / halfH; camera2.updateProjectionMatrix();
        renderer.render(scene, camera2);

        renderer.setViewport(0, 0, w, halfH);
        renderer.setScissor(0, 0, w, halfH);
        camera3.aspect = w / halfH; camera3.updateProjectionMatrix();
        renderer.render(scene, camera3);

        renderer.setScissorTest(false);
      } else if(numPlayers === 4) {
        var halfW = Math.floor(w / 2);
        var halfH = Math.floor(h / 2);
        renderer.setScissorTest(true);

        renderer.setViewport(0, halfH, halfW, halfH);
        renderer.setScissor(0, halfH, halfW, halfH);
        camera.aspect = halfW / halfH; camera.updateProjectionMatrix();
        renderer.render(scene, camera);

        renderer.setViewport(halfW, halfH, halfW, halfH);
        renderer.setScissor(halfW, halfH, halfW, halfH);
        camera2.aspect = halfW / halfH; camera2.updateProjectionMatrix();
        renderer.render(scene, camera2);

        renderer.setViewport(0, 0, halfW, halfH);
        renderer.setScissor(0, 0, halfW, halfH);
        camera3.aspect = halfW / halfH; camera3.updateProjectionMatrix();
        renderer.render(scene, camera3);

        renderer.setViewport(halfW, 0, halfW, halfH);
        renderer.setScissor(halfW, 0, halfW, halfH);
        camera4.aspect = halfW / halfH; camera4.updateProjectionMatrix();
        renderer.render(scene, camera4);

        renderer.setScissorTest(false);
      }

      renderRearviewMirror();

    } else if(flyActive && currentTrack){
      var speed = 0.025;
      flyT = (flyT + delta * speed) % 1.0;
      
      var pos = currentTrack.curve3D.getPointAt(flyT);
      var look = currentTrack.curve3D.getPointAt((flyT + 0.015) % 1.0);
      
      camera.position.set(pos.x, pos.y + 1.8, pos.z);
      camera.lookAt(look.x, look.y + 1.4, look.z);

      updatePrecipitation(delta, state.currentSeason);

      if(isStereoOn) {
        var w = window.innerWidth, h = window.innerHeight;
        var halfW = Math.floor(w / 2);
        camRightVec.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize();

        cameraLeft.position.copy(camera.position).addScaledVector(camRightVec, -stereoEyeDist / 2);
        cameraLeft.quaternion.copy(camera.quaternion);

        cameraRight.position.copy(camera.position).addScaledVector(camRightVec, stereoEyeDist / 2);
        cameraRight.quaternion.copy(camera.quaternion);

        renderer.setScissorTest(true);
        renderer.setViewport(-stereoImageOffset, 0, halfW, h);
        renderer.setScissor(0, 0, halfW, h);
        cameraLeft.aspect = halfW / h; cameraLeft.updateProjectionMatrix();
        renderer.render(scene, cameraLeft);

        renderer.setViewport(halfW + stereoImageOffset, 0, halfW, h);
        renderer.setScissor(halfW, 0, halfW, h);
        cameraRight.aspect = halfW / h; cameraRight.updateProjectionMatrix();
        renderer.render(scene, cameraRight);

        renderer.setScissorTest(false);
      } else {
        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
        renderer.render(scene, camera);
      }
    } else {
      controls.update(delta);
      updatePrecipitation(delta, state.currentSeason);

      if(isStereoOn) {
        var w = window.innerWidth, h = window.innerHeight;
        var halfW = Math.floor(w / 2);
        camRightVec.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize();

        cameraLeft.position.copy(camera.position).addScaledVector(camRightVec, -stereoEyeDist / 2);
        cameraLeft.quaternion.copy(camera.quaternion);

        cameraRight.position.copy(camera.position).addScaledVector(camRightVec, stereoEyeDist / 2);
        cameraRight.quaternion.copy(camera.quaternion);

        renderer.setScissorTest(true);
        renderer.setViewport(-stereoImageOffset, 0, halfW, h);
        renderer.setScissor(0, 0, halfW, h);
        cameraLeft.aspect = halfW / h; cameraLeft.updateProjectionMatrix();
        renderer.render(scene, cameraLeft);

        renderer.setViewport(halfW + stereoImageOffset, 0, halfW, h);
        renderer.setScissor(halfW, 0, halfW, h);
        cameraRight.aspect = halfW / h; cameraRight.updateProjectionMatrix();
        renderer.render(scene, cameraRight);

        renderer.setScissorTest(false);
      } else {
        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
        renderer.render(scene, camera);
      }
    }
  }

  /* ---------------------------------------------------------------
     IKKUNAN KOON MUUTTUMINEN
  --------------------------------------------------------------- */
  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ---------------------------------------------------------------
     MODUULIN ALUSTUS JA EXPORT
  --------------------------------------------------------------- */
  function init(options) {
    if (!options) return;
    callbacks.getGameState = options.getGameState || null;
    callbacks.getPlayerControls = options.getPlayerControls || null;
    callbacks.onQualifyingLapFinish = options.onQualifyingLapFinish || null;
    callbacks.onCareerRaceFinishCheck = options.onCareerRaceFinishCheck || null;
    callbacks.onShopInputHandle = options.onShopInputHandle || null;
    callbacks.renderPreviewsAnimation = options.renderPreviewsAnimation || null;
    callbacks.updateMinimap = options.updateMinimap || null;
    callbacks.updateHudUI = options.updateHudUI || null;

    animate();
  }

  window.GameCore = {
    init: init,
    buildCarMesh: buildCarMesh,
    getIsRacing: function() { return isRacing; },
    getIsCountdown: function() { return isCountdown; },
    getCars: function() { return cars; },
    getTrack: function() { return currentTrack; },
    getTerrainInfo: function() { return terrainInfo; },
    getFinishCounter: function() { return finishCounter; },
    initRace: initRace,
    stopRace: stopRace,
    startSoloQualifyingLap: startSoloQualifyingLap,
    startMainRaceWithGridOrder: startMainRaceWithGridOrder,
    regenerateAll: regenerateAll,
    generateCustomDrawnTrack: generateCustomDrawnTrack,
    updateEnvironmentAtmosphere: updateEnvironmentAtmosphere,
    buildClouds: buildClouds,
    updatePuddleReflections: updatePuddleReflections,
    spawnCollectiblesOnTrack: spawnCollectiblesOnTrack,
    clearSkidMarks: clearSkidMarks,
    toggleStereo: function() { stereoActive = !stereoActive; return stereoActive; },
    setStereoActive: function(active) { stereoActive = !!active; },
    setStereoEyeDist: function(d) { stereoEyeDist = d; },
    setStereoImageOffset: function(o) { stereoImageOffset = o; },
    toggleAutoRotate: function() { autoRotate = !autoRotate; controls.autoRotate = autoRotate; return autoRotate; },
    toggleTreesVisible: function() { treesVisible = !treesVisible; if(forestMesh) forestMesh.visible = treesVisible; return treesVisible; },
    toggleCurbsVisible: function() { curbsVisible = !curbsVisible; if(curbMesh) curbMesh.visible = curbsVisible; if(postMesh) postMesh.visible = curbsVisible; return curbsVisible; },
    setWaterEnabled: function(e) { waterEnabled = !!e; },
    toggleFlyActive: function() {
      flyActive = !flyActive;
      if (flyActive) { autoRotate = false; controls.autoRotate = false; }
      return flyActive;
    },
    setIsRain: function(r) { isRain = !!r; },
    setIsFog: function(f) { isFog = !!f; },
    setIsClouds: function(c) { isClouds = !!c; },
    setRearviewMirrorEnabled: function(e) { rearviewMirrorEnabled = !!e; },
    getScene: function() { return scene; },
    getRenderer: function() { return renderer; },
    getCamera: function() { return camera; }
  };

})();
