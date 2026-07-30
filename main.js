// main.js - Pelimoottori, renderöinti, peli-silmukka ja UI-hallinta
(function() {
  'use strict';

  /* ---------------------------------------------------------------
     MOBIILILAITTEEN TUNNISTUS
  --------------------------------------------------------------- */
  var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                 (('ontouchstart' in window) && (navigator.maxTouchPoints > 0));
  var defaultControlMethod = isMobile ? "touch" : "keyboard";

  /* ---------------------------------------------------------------
     GLOBAALIT MUUTTUJAT JA TILA
  --------------------------------------------------------------- */
  var texturesEnabled = true;
  window.texturesEnabled = texturesEnabled;

  var waterEnabled = true;
  var gravelEnabled = true;
  var speedometerEnabled = false;

  // ASETUKSET
  var damageEnabled = false;            // Vahingot On/Off
  var timeLimitSetting = 0;            // Aikaraja (0 = Off)
  var qualifyingEnabled = false;       // Aika-ajot On/Off
  var collectiblesEnabled = false;     // Keräily On/Off
  var preGenCareerTracksEnabled = false; // Ennakkoradat uralle On/Off
  var minimapEnabled = false;          // Ratakuva On/Off
  var rearviewMirrorEnabled = false;   // Taustapeili On/Off

  var preGeneratedTracks = [];
  var preGenCurrentIndex = 0;
  var isPreGeneratingCareer = false;

  var isQualifying = false;
  var qualifyingCurrentPlayerIdx = 0;
  var qualifyingResults = [];

  var isShopMode = false;
  var shopTimer = 30;
  var shopTimerInterval = null;
  var shopSelectedIndices = [0, 0, 0, 0];
  var prevShopInputStates = [
    { gas: false, brake: false, right: false },
    { gas: false, brake: false, right: false },
    { gas: false, brake: false, right: false },
    { gas: false, brake: false, right: false }
  ];

  // RADAN PIIRTO -TILA
  var customDrawnPoints = [];
  var isDrawingCustomTrack = false;
  var drawCanvas = null;
  var drawCtx = null;
  var curbStyle = 'pylvaat';

  var isRain = false;
  var isFog = false;
  var isClouds = false;
  var currentTimeOfDay = 'paiva';
  var currentSeason = 'kesa';
  var currentEnvironment = 'simple';
  var aiDifficulty = 'keskivaikea';

  var boostersEnabled = false;
  var tireWearEnabled = false;
  var carMaxSpeedSetting = 38.0;
  var carAccelSetting = 26.0;

  var isCareerMode = false;
  var careerCurrentRace = 0;
  var careerTotalRaces = 6;
  var careerHistory = [];
  var careerTransitionTimeout = null;

  var ENV_TEXTURE_PATHS = {
    grass: 'nurmikko.jpg',
    kukkamaa: 'kukkamaa.jpg',
    suo: 'suo.jpg',
    lumi: 'lumi.jpg',
    asphalt: 'asfaltti.jpg',
    gravel: 'hiekka.jpg',
    foliage: 'kuusenpiikit.jpg',
    trunk: 'kuusenrunko.jpg',
    cityfloor: 'cityfloor.jpg',
    hitechroad: 'futurecityfloor.jpg',
    hitechfloor: 'hitech_floor.jpg',
    shroomfloor: 'sienimaa.jpg',
    sienitie: 'sienitie.jpg',
    varikko: 'varikko.jpg',
    booster: 'kiihdytin.jpg',
    pallo: 'pallo.jpg'
  };

  var CITY_TEXTURE_PATHS = [
    'city_tex1.jpg', 'city_tex2.jpg', 'city_tex3.jpg',
    'city_tex4.jpg', 'city_tex5.jpg', 'city_tex6.jpg'
  ];

  var HITECH_TEXTURE_PATHS = [
    'hitech_tex1.jpg', 'hitech_tex2.jpg', 'hitech_tex3.jpg',
    'hitech_tex4.jpg', 'hitech_tex5.jpg', 'hitech_tex6.jpg'
  ];

  var CAR_TEXTURE_PATHS = [
    { name: 'Ei tekstuuria / Perus', url: '' },
    { name: 'Tekstuuri 1 (Urheilu)', url: 'car_tex1.jpg' },
    { name: 'Tekstuuri 2 (Raidat)', url: 'car_tex2.jpg' },
    { name: 'Tekstuuri 3 (Salamat)', url: 'car_tex3.jpg' },
    { name: 'Tekstuuri 4 (Liekit)', url: 'car_tex4.jpg' },
    { name: 'Tekstuuri 5 (Hiilikuitu)', url: 'car_tex5.jpg' },
    { name: 'Tekstuuri 6 (Camouflage)', url: 'car_tex6.jpg' },
    { name: 'Tekstuuri 7 (Grafiitti)', url: 'car_tex7.jpg' },
    { name: 'Tekstuuri 8 (Retro Ralli)', url: 'car_tex8.jpg' }
  ];

  var CAR_MODELS_LIST = [
    { id: 'simple', name: 'Simple (Perus)' },
    { id: 'porcher', name: 'Porcher' },
    { id: 'lotuser', name: 'Lotuser' },
    { id: 'pontiacer', name: 'Pontiacer' },
    { id: 'lambo', name: 'Lambo' },
    { id: 'ferrarer', name: 'Ferrarer' }
  ];

  var PRESET_PALETTES = [
    '#d42419', '#28a745', '#eb8b00', '#8e24aa',
    '#1e62d0', '#00acc1', '#ff6d00', '#d81b60'
  ];

  if (window.AudioEngine && typeof window.AudioEngine.initUI === 'function') {
    window.AudioEngine.initUI();
  }

  var textureLoader = new THREE.TextureLoader();
  var loadedTexturesCache = {};

  function createProceduralFallbackTex(colorHex, label) {
    var c = document.createElement('canvas'); c.width = 128; c.height = 128;
    var ctx = c.getContext('2d');
    ctx.fillStyle = colorHex || '#888888'; ctx.fillRect(0,0,128,128);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    for(var i=0; i<100; i++) ctx.fillRect(Math.random()*128, Math.random()*128, 2, 2);
    if(label) {
      ctx.fillStyle = '#ffffff'; ctx.font = '12px sans-serif'; ctx.textAlign='center';
      ctx.fillText(label, 64, 64);
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  function loadTextureWithFallback(url, repeatX, repeatY, fallbackColor, label) {
    if (!url) return null;
    if (loadedTexturesCache[url]) return loadedTexturesCache[url];

    var tex = textureLoader.load(
      url,
      function(t) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        if (repeatX && repeatY) t.repeat.set(repeatX, repeatY);
        t.needsUpdate = true;
      },
      undefined,
      function() {
        var fb = createProceduralFallbackTex(fallbackColor, label || 'JPG');
        if (repeatX && repeatY) fb.repeat.set(repeatX, repeatY);
        tex.image = fb.image;
        tex.needsUpdate = true;
      }
    );
    loadedTexturesCache[url] = tex;
    return tex;
  }

  window.loadTextureWithFallback = loadTextureWithFallback;

  /* ---------------------------------------------------------------
     INTRO SIVU & FULLSCREEN KÄSITTELY
  --------------------------------------------------------------- */
  function setupIntroOverlay() {
    var introOverlay = document.getElementById('introOverlay');
    if (!introOverlay) return;

    function launchGameFullscreen() {
      if (!introOverlay || introOverlay.style.display === 'none') return;
      
      introOverlay.style.transition = 'opacity 0.5s ease';
      introOverlay.style.opacity = '0';
      setTimeout(function() {
        introOverlay.style.display = 'none';
      }, 500);

      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(function() {});
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
      }
    }

    window.addEventListener('keydown', launchGameFullscreen, { once: true });
    window.addEventListener('pointerdown', launchGameFullscreen, { once: true });
  }

  /* ---------------------------------------------------------------
     APUFUNKTIOT
  --------------------------------------------------------------- */
  function lerp(a,b,t){ return a+(b-a)*t; }

  function closestSampleInfo(track, x, z, carY) {
    return TrackGenerator.closestSampleInfo(track, x, z, carY);
  }
  function getRoadSurfaceHeight(track, x, z, carY) {
    return TrackGenerator.getRoadSurfaceHeight(track, x, z, carY);
  }

  function formatTime(sec) {
    if (sec === null || sec === undefined || isNaN(sec)) return "--:--.-";
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    var ms = Math.floor((sec % 1) * 10);
    var mStr = m < 10 ? "0" + m : "" + m;
    var sStr = s < 10 ? "0" + s : "" + s;
    return mStr + ":" + sStr + "." + ms;
  }

  /* ---------------------------------------------------------------
     PERUSASETUKSET JA KAMERAT (MUKANA TAUSTAPEILIKAMERA)
  --------------------------------------------------------------- */
  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd8e4d0, 1000, 100000);

  var camera = new THREE.PerspectiveCamera(48, innerWidth/innerHeight, 0.1, 600);
  camera.position.set(70, 55, 90);

  var camera2 = new THREE.PerspectiveCamera(48, innerWidth/innerHeight, 0.1, 600);
  var camera3 = new THREE.PerspectiveCamera(48, innerWidth/innerHeight, 0.1, 600);
  var camera4 = new THREE.PerspectiveCamera(48, innerWidth/innerHeight, 0.1, 600);

  var cameraLeft = new THREE.PerspectiveCamera(48, (innerWidth/2)/innerHeight, 0.1, 600);
  var cameraRight = new THREE.PerspectiveCamera(48, (innerWidth/2)/innerHeight, 0.1, 600);
  var camRightVec = new THREE.Vector3();

  // TAUSTAPEILIKAMERA
  var rearCamera = new THREE.PerspectiveCamera(52, 220 / 70, 0.1, 300);

  var renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  document.body.appendChild(renderer.domElement);

  /* CubeCamera vesilätäköiden 3D-peilausta varten */
  var puddleCubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter
  });
  var puddleCubeCamera = new THREE.CubeCamera(0.1, 500, puddleCubeRenderTarget);
  scene.add(puddleCubeCamera);

  /* JARRUTUSJÄLJET (SKID MARKS) - RYHMÄ */
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
    var leftY = getRoadSurfaceHeight(currentTrack, leftX, leftZ) + 0.035;

    var rightX = c.x + perpX * wheelWidthOffset;
    var rightZ = c.z + perpZ * wheelWidthOffset;
    var rightY = getRoadSurfaceHeight(currentTrack, rightX, rightZ) + 0.035;

    if (c.lastSkidLeft && c.lastSkidRight) {
      var geoL = new THREE.BufferGeometry();
      var posL = new Float32Array([
        c.lastSkidLeft.x, c.lastSkidLeft.y, c.lastSkidLeft.z,
        leftX, leftY, leftZ,
        c.lastSkidLeft.x + perpX*0.22, c.lastSkidLeft.y, c.lastSkidLeft.z + perpZ*0.22,
        leftX + perpX*0.22, leftY, leftZ + perpZ*0.22
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
        c.lastSkidRight.x - perpX*0.22, c.lastSkidRight.y, c.lastSkidRight.z - perpZ*0.22,
        rightX - perpX*0.22, rightY, rightZ - perpZ*0.22
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

  /* Kameraohjaus */
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
     TAIVAS, AURINGONVALO, KUU JA TÄHDET
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

  function updateEnvironmentAtmosphere() {
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
        c.headlight1.visible = (currentTimeOfDay === 'yo');
        c.headlight2.visible = (currentTimeOfDay === 'yo');
      }
    });
  }

  /* ---------------------------------------------------------------
     PILVET & SADE
  --------------------------------------------------------------- */
  var cloudGroup = new THREE.Group();
  scene.add(cloudGroup);

  function buildClouds() {
    while(cloudGroup.children.length > 0) {
      var c = cloudGroup.children[0];
      if(c.geometry) c.geometry.dispose();
      cloudGroup.remove(c);
    }

    if (!isClouds) return;

    var cloudMat = new THREE.MeshStandardMaterial({
      color: (currentTimeOfDay === 'yo') ? 0x222834 : (isRain ? 0x707880 : 0xffffff),
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

  var curbStyleSelect = document.getElementById('curbStyleSelect');
  if (curbStyleSelect) {
    curbStyleSelect.addEventListener('change', function(e) {
      curbStyle = e.target.value;
      regenerateAll();
    });
  }

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

  function updatePrecipitation(delta) {
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
     PARTIKKELIT: HIEKKA, VESI, TÖRMÄYSKIPINÄT, SAVU JA PALLOJEN SCATTER
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

  // PALLOJEN KERÄYKSEN SCATTER-EFEKTI
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

  var puddlesList = [];
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
     KERÄILYPALLOT (COLLECTIBLES) JA PALLO.JPG TEKSTUURI
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

    if (!collectiblesEnabled || !currentTrack) return;

    var orbTex = texturesEnabled ? loadTextureWithFallback(ENV_TEXTURE_PATHS.pallo || 'pallo.jpg', 1, 1, '#00f0ff', 'PALLO') : null;
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
      var oy = getRoadSurfaceHeight(currentTrack, ox, oz) + 1.0;

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
    if (!collectiblesEnabled) return;

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

          if (timeLimitSetting > 0 && car.lapTimeRemaining > 0) {
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
     RATAKUVA (MINIMAP) - LIVENÄ PIIRRETTÄVÄ 2D-KARTTA (START/FINISH VIIVA)
  --------------------------------------------------------------- */
  function updateMinimap() {
    var canvas = document.getElementById('minimapCanvas');
    if (!canvas) return;

    if (!minimapEnabled || !isRacing || !currentTrack || !terrainInfo) {
      canvas.style.display = 'none';
      return;
    }

    canvas.style.display = 'block';
    var ctxCanvas = canvas.getContext('2d');
    ctxCanvas.clearRect(0, 0, canvas.width, canvas.height);

    var bounds = terrainInfo;
    var padding = 12;
    var w = canvas.width - padding * 2;
    var h = canvas.height - padding * 2;

    var scale = Math.min(w / bounds.size, h / bounds.size);

    function mapX(x) { return canvas.width / 2 + (x - bounds.cx) * scale; }
    function mapZ(z) { return canvas.height / 2 + (z - bounds.cz) * scale; }

    ctxCanvas.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctxCanvas.lineWidth = 4;
    ctxCanvas.beginPath();
    for (var i = 0; i < currentTrack.n; i++) {
      var s = currentTrack.samples[i];
      var mx = mapX(s.x);
      var mz = mapZ(s.z);
      if (i === 0) ctxCanvas.moveTo(mx, mz);
      else ctxCanvas.lineTo(mx, mz);
    }
    ctxCanvas.closePath();
    ctxCanvas.stroke();

    // Start/Finish viiva valkoiseksi poikkiviivaksi
    if (currentTrack.samples.length > 0) {
      var s0 = currentTrack.samples[0];
      var perp0X = -s0.tz;
      var perp0Z = s0.tx;
      var rWidth = TrackGenerator.ROAD_HALF_WIDTH;

      var lx1 = mapX(s0.x + perp0X * rWidth);
      var lz1 = mapZ(s0.z + perp0Z * rWidth);
      var lx2 = mapX(s0.x - perp0X * rWidth);
      var lz2 = mapZ(s0.z - perp0Z * rWidth);

      ctxCanvas.strokeStyle = '#ffffff';
      ctxCanvas.lineWidth = 7.0; // Poikkiviivan paksuus
      ctxCanvas.lineCap = 'square';
      ctxCanvas.beginPath();
      ctxCanvas.moveTo(lx1, lz1);
      ctxCanvas.lineTo(lx2, lz2);
      ctxCanvas.stroke();
    }

    cars.forEach(function(c) {
      if (c.finished) return;
      var cx = mapX(c.x);
      var cz = mapZ(c.z);

      ctxCanvas.fillStyle = c.colorCss || '#ffffff';
      ctxCanvas.beginPath();
      ctxCanvas.arc(cx, cz, c.isHuman ? 5 : 3.5, 0, Math.PI * 2);
      ctxCanvas.fill();

      if (c.playerNum === 1) {
        ctxCanvas.strokeStyle = '#ffffff';
        ctxCanvas.lineWidth = 1.5;
        ctxCanvas.stroke();
      }
    });
  }

  /* ---------------------------------------------------------------
     TAUSTAPEILI (REARVIEW MIRROR) RENDERÖINTI
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
    var left = Math.floor((innerWidth - mirrorWidth) / 2);
    var bottom = innerHeight - 12 - mirrorHeight;

    renderer.setScissorTest(true);
    renderer.setViewport(left, bottom, mirrorWidth, mirrorHeight);
    renderer.setScissor(left, bottom, mirrorWidth, mirrorHeight);

    rearCamera.aspect = mirrorWidth / mirrorHeight;
    rearCamera.updateProjectionMatrix();

    renderer.render(scene, rearCamera);
    renderer.setScissorTest(false);
  }

  /* ---------------------------------------------------------------
     RADAN PIIRTO KANKAALLE (CANVAS DRAWING)
  --------------------------------------------------------------- */
  function initDrawCanvasEvents() {
    drawCanvas = document.getElementById('drawCanvas');
    if (!drawCanvas) return;
    drawCtx = drawCanvas.getContext('2d');

    function getCanvasPos(e) {
      var rect = drawCanvas.getBoundingClientRect();
      var clientX = e.clientX;
      var clientY = e.clientY;
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
      return {
        x: (clientX - rect.left) * (drawCanvas.width / rect.width),
        y: (clientY - rect.top) * (drawCanvas.height / rect.height)
      };
    }

    drawCanvas.addEventListener('pointerdown', function(e) {
      isDrawingCustomTrack = true;
      customDrawnPoints = [getCanvasPos(e)];
      redrawCanvas();
    });

    drawCanvas.addEventListener('pointermove', function(e) {
      if (!isDrawingCustomTrack) return;
      var pt = getCanvasPos(e);
      var lastPt = customDrawnPoints[customDrawnPoints.length - 1];
      var dx = pt.x - lastPt.x;
      var dy = pt.y - lastPt.y;
      if (dx * dx + dy * dy > 16) {
        customDrawnPoints.push(pt);
        redrawCanvas();
      }
    });

    window.addEventListener('pointerup', function() {
      if (isDrawingCustomTrack) {
        isDrawingCustomTrack = false;
        redrawCanvas();
      }
    });

    var clearBtn = document.getElementById('clearDrawCanvasBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        customDrawnPoints = [];
        redrawCanvas();
      });
    }

    var acceptBtn = document.getElementById('acceptDrawTrackBtn');
    if (acceptBtn) {
      acceptBtn.addEventListener('click', function() {
        if (customDrawnPoints.length < 6) {
          alert('⚠️ Piirrä pidempi suljettu viiva radaksi!');
          return;
        }
        var drawModal = document.getElementById('drawTrackModal');
        if (drawModal) drawModal.style.display = 'none';

        generateCustomDrawnTrack();
      });
    }

    var closeBtn = document.getElementById('closeDrawTrackModalBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        var drawModal = document.getElementById('drawTrackModal');
        if (drawModal) drawModal.style.display = 'none';
      });
    }
  }

  function redrawCanvas() {
    if (!drawCtx || !drawCanvas) return;
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

    drawCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    drawCtx.lineWidth = 1;
    for (var x = 0; x < drawCanvas.width; x += 40) {
      drawCtx.beginPath(); drawCtx.moveTo(x, 0); drawCtx.lineTo(x, drawCanvas.height); drawCtx.stroke();
    }
    for (var y = 0; y < drawCanvas.height; y += 40) {
      drawCtx.beginPath(); drawCtx.moveTo(0, y); drawCtx.lineTo(drawCanvas.width, y); drawCtx.stroke();
    }

    if (customDrawnPoints.length < 2) return;

    drawCtx.strokeStyle = '#00f0ff';
    drawCtx.lineWidth = 16;
    drawCtx.lineCap = 'round';
    drawCtx.lineJoin = 'round';

    drawCtx.beginPath();
    drawCtx.moveTo(customDrawnPoints[0].x, customDrawnPoints[0].y);
    for (var i = 1; i < customDrawnPoints.length; i++) {
      drawCtx.lineTo(customDrawnPoints[i].x, customDrawnPoints[i].y);
    }
    if (!isDrawingCustomTrack && customDrawnPoints.length > 3) {
      drawCtx.lineTo(customDrawnPoints[0].x, customDrawnPoints[0].y);
    }
    drawCtx.stroke();

    drawCtx.strokeStyle = '#ffee00';
    drawCtx.lineWidth = 2;
    drawCtx.setLineDash([6, 6]);
    drawCtx.stroke();
    drawCtx.setLineDash([]);

    var startPt = customDrawnPoints[0];
    drawCtx.fillStyle = '#ef4444';
    drawCtx.beginPath();
    drawCtx.arc(startPt.x, startPt.y, 9, 0, Math.PI * 2);
    drawCtx.fill();
    drawCtx.strokeStyle = '#ffffff';
    drawCtx.lineWidth = 2;
    drawCtx.stroke();

    drawCtx.fillStyle = '#ffffff';
    drawCtx.font = 'bold 11px sans-serif';
    drawCtx.textAlign = 'center';
    drawCtx.fillText('START / FINISH', startPt.x, startPt.y - 14);
  }

  function generateCustomDrawnTrack() {
    if (!isCareerMode) stopRace();
    updateEnvironmentAtmosphere();
    buildClouds();

    disposeMesh(terrainMesh); disposeMesh(roadMesh); disposeMesh(curbMesh);
    disposeMesh(postMesh); disposeMesh(forestMesh); disposeMesh(finishLineMesh);
    disposeMesh(bridgeMeshGroup); disposeMesh(boosterGroup); disposeMesh(pitStopGroup);
    clearSkidMarks();

    if (TrackGenerator.buildTrackFromCustomPoints) {
      var track = TrackGenerator.buildTrackFromCustomPoints(customDrawnPoints, drawCanvas.width, drawCanvas.height);
      currentTrack = track;
    } else {
      TrackGenerator.resetNoiseSeed();
      currentTrack = TrackGenerator.buildTrackPath();
    }

    var terr = TrackGenerator.buildTerrain(currentTrack, currentEnvironment, currentSeason, texturesEnabled, loadTextureWithFallback, ENV_TEXTURE_PATHS);
    terrainMesh = terr.mesh; terrainInfo = terr.bounds;
    scene.add(terrainMesh);

    roadMesh = TrackGenerator.buildRoad(currentTrack, texturesEnabled, loadTextureWithFallback, ENV_TEXTURE_PATHS, currentEnvironment, gravelEnabled); scene.add(roadMesh);
    curbMesh = TrackGenerator.buildCurbs(currentTrack); scene.add(curbMesh);
    postMesh = TrackGenerator.buildDelineators(currentTrack, curbStyle); scene.add(postMesh);
    forestMesh = TrackGenerator.buildForest(currentTrack, terrainInfo, currentEnvironment, currentSeason, currentTimeOfDay, texturesEnabled, loadTextureWithFallback, CITY_TEXTURE_PATHS, HITECH_TEXTURE_PATHS, CAR_TEXTURE_PATHS); scene.add(forestMesh);
    finishLineMesh = TrackGenerator.buildFinishLine(currentTrack); scene.add(finishLineMesh);
    
    bridgeMeshGroup = TrackGenerator.buildBridgeStructures(currentTrack); scene.add(bridgeMeshGroup);

    if (typeof TrackGenerator.buildBoosters === 'function') {
      var bData = TrackGenerator.buildBoosters(currentTrack, boostersEnabled, texturesEnabled, loadTextureWithFallback, ENV_TEXTURE_PATHS);
      boosterGroup = bData.group;
      currentTrack.boosters = bData.boosters;
      if (boosterGroup) scene.add(boosterGroup);
    }

    if (typeof TrackGenerator.buildPitStop === 'function') {
      var pData = TrackGenerator.buildPitStop(currentTrack, tireWearEnabled || damageEnabled, texturesEnabled, loadTextureWithFallback, ENV_TEXTURE_PATHS);
      pitStopGroup = pData.group;
      currentTrack.pitStopArea = pData.pitStopArea;
      if (pitStopGroup) scene.add(pitStopGroup);
    }

    puddlesList = TrackGenerator.buildPuddles(currentTrack, waterGroup, waterEnabled, puddleCubeRenderTarget.texture);
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
  }

  /* ---------------------------------------------------------------
     AUTOMALLIN RAKENTAMINEN & HOHTOEFEKTI (BOOSTER GLOW)
  --------------------------------------------------------------- */
  function buildCarMesh(bodyColorHex, accentColorHex, carTexUrl, modelType) {
    modelType = modelType || 'simple';

    var carGroup;
    if (window.CAR_MODELS && typeof window.CAR_MODELS[modelType] === 'function') {
      carGroup = window.CAR_MODELS[modelType](bodyColorHex, accentColorHex, carTexUrl);
    } else {
      carGroup = new THREE.Group();
      var bodyGeo = new THREE.BoxGeometry(1.7, 0.5, 3.4);
      bodyGeo.translate(0, 0.45, 0);
      
      var baseCol = new THREE.Color(bodyColorHex);
      if (texturesEnabled && carTexUrl) {
        baseCol.lerp(new THREE.Color(0xffffff), 0.35);
      }

      var bodyMat = new THREE.MeshStandardMaterial({
        color: baseCol, roughness: 0.35, metalness: 0.15
      });

      if (texturesEnabled && carTexUrl) {
        var carTex = loadTextureWithFallback(carTexUrl, 2, 2, bodyColorHex, 'AUTOTEX');
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

      var spot1 = new THREE.SpotLight(0xfff5cc, 2.5, 45, Math.PI/6, 0.4);
      spot1.position.set(-0.5, 0.52, 1.75);
      spot1.target.position.set(-0.5, 0.1, 15);
      spot1.visible = (currentTimeOfDay === 'yo');
      carGroup.add(spot1); carGroup.add(spot1.target);

      var spot2 = new THREE.SpotLight(0xfff5cc, 2.5, 45, Math.PI/6, 0.4);
      spot2.position.set(0.5, 0.52, 1.75);
      spot2.target.position.set(0.5, 0.1, 15);
      spot2.visible = (currentTimeOfDay === 'yo');
      carGroup.add(spot2); carGroup.add(spot2.target);

      carGroup.userData.headlight1 = spot1;
      carGroup.userData.headlight2 = spot2;

      var tailLightMat = new THREE.MeshBasicMaterial({ color: 0xff1100 });
      var tl1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), tailLightMat);
      tl1.position.set(-0.5, 0.55, -1.71);
      var tl2 = tl1.clone(); tl2.position.x = 0.5;
      carGroup.add(tl1); carGroup.add(tl2);
    }

    var glowGeo = new THREE.BoxGeometry(1.95, 0.85, 3.8);
    var glowMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff, transparent: true, opacity: 0.0, side: THREE.BackSide
    });
    var glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.set(0, 0.5, 0);
    carGroup.add(glowMesh);
    carGroup.userData.glowMesh = glowMesh;

    return carGroup;
  }

  /* ---------------------------------------------------------------
     PELAAJIEN ASETUKSET
  --------------------------------------------------------------- */
  var playerConfigs = [
    { name: "Pelaaja 1", ctrl: defaultControlMethod, color: "#d42419", texIdx: 1, model: "simple" },
    { name: "Pelaaja 2", ctrl: defaultControlMethod, color: "#28a745", texIdx: 2, model: "simple" },
    { name: "Pelaaja 3", ctrl: defaultControlMethod, color: "#eb8b00", texIdx: 3, model: "simple" },
    { name: "Pelaaja 4", ctrl: defaultControlMethod, color: "#8e24aa", texIdx: 4, model: "simple" }
  ];

  var previewScenes = [];

  function clearPreviews() {
    previewScenes.forEach(function(ps) {
      ps.active = false;
      if(ps.renderer) ps.renderer.dispose();
    });
    previewScenes = [];
  }

  function initPlayerPreviews() {
    clearPreviews();

    var container = document.getElementById('modalCardsContainer');
    container.innerHTML = "";

    var defaultKbLabels = ["WASD", "Nuolet", "TFGH", "IJKL"];

    for(var i = 0; i < numPlayers; i++) {
      var pNum = i + 1;
      var cfg = playerConfigs[i];

      var card = document.createElement('div');
      card.className = 'player-card';

      var html = '<div class="player-card-header">🏎️ Pelaaja ' + pNum + '</div>';
      html += '<div class="car-preview-box" id="previewBox' + i + '"></div>';
      
      html += '<div class="ctrl-group">';
      html += '<label>✏️ Nimi:</label>';
      html += '<input type="text" class="player-name-input" data-player="' + i + '" value="' + cfg.name + '" maxlength="14">';
      html += '</div>';

      html += '<div class="ctrl-group">';
      html += '<label>🎮 Ohjain:</label>';
      html += '<select class="ctrl-select" data-player="' + i + '">';
      html += '<option value="keyboard"' + (cfg.ctrl === 'keyboard' ? ' selected' : '') + '>⌨️ Näppäimistö (' + defaultKbLabels[i] + ')</option>';
      html += '<option value="touch"' + (cfg.ctrl === 'touch' ? ' selected' : '') + '>📱 Kosketusnäyttö joystick</option>';
      html += '<option value="touch_wheel"' + (cfg.ctrl === 'touch_wheel' ? ' selected' : '') + '>🏎️ Kosketusnäyttö ratti & polkimet</option>';
      html += '<option value="gyro"' + (cfg.ctrl === 'gyro' ? ' selected' : '') + '>📱 Gyro / Kallistus</option>';
      html += '<option value="gamepad0"' + (cfg.ctrl === 'gamepad0' ? ' selected' : '') + '>🕹️ Gamepad 1</option>';
      html += '<option value="gamepad1"' + (cfg.ctrl === 'gamepad1' ? ' selected' : '') + '>🕹️ Gamepad 2</option>';
      html += '<option value="gamepad2"' + (cfg.ctrl === 'gamepad2' ? ' selected' : '') + '>🕹️ Gamepad 3</option>';
      html += '<option value="gamepad3"' + (cfg.ctrl === 'gamepad3' ? ' selected' : '') + '>🕹️ Gamepad 4</option>';
      html += '<option value="mouse"' + (cfg.ctrl === 'mouse' ? ' selected' : '') + '>🖱️ Hiiri</option>';
      html += '<option value="bluetooth"' + (cfg.ctrl === 'bluetooth' ? ' selected' : '') + '>📶 Bluetooth-laite</option>';
      html += '</select>';
      html += '</div>';

      html += '<div class="ctrl-group">';
      html += '<label>🏎️ Auton malli:</label>';
      html += '<select class="car-model-select" data-player="' + i + '">';
      CAR_MODELS_LIST.forEach(function(m) {
        html += '<option value="' + m.id + '"' + (cfg.model === m.id ? ' selected' : '') + '>' + m.name + '</option>';
      });
      html += '</select>';
      html += '</div>';

      html += '<div class="ctrl-group color-picker-row">';
      html += '<label>🎨 Auton väri:</label>';
      html += '<input type="color" class="car-color-picker" data-player="' + i + '" value="' + cfg.color + '">';
      html += '</div>';

      html += '<div class="ctrl-group">';
      html += '<label>🖼️ Auton tekstuuri:</label>';
      html += '<select class="car-tex-select" data-player="' + i + '">';
      CAR_TEXTURE_PATHS.forEach(function(tp, idx) {
        html += '<option value="' + idx + '"' + (cfg.texIdx === idx ? ' selected' : '') + '>' + tp.name + '</option>';
      });
      html += '</select>';
      html += '</div>';

      card.innerHTML = html;
      container.appendChild(card);

      setupPreviewCanvas(i, cfg);
    }

    container.querySelectorAll('.player-name-input').forEach(function(inp) {
      inp.addEventListener('input', function(e) {
        var pIdx = parseInt(e.target.getAttribute('data-player'));
        playerConfigs[pIdx].name = e.target.value;
      });
    });

    container.querySelectorAll('.ctrl-select').forEach(function(sel) {
      sel.addEventListener('change', function(e) {
        var pIdx = parseInt(e.target.getAttribute('data-player'));
        playerConfigs[pIdx].ctrl = e.target.value;
      });
    });

    container.querySelectorAll('.car-model-select').forEach(function(ms) {
      ms.addEventListener('change', function(e) {
        var pIdx = parseInt(e.target.getAttribute('data-player'));
        playerConfigs[pIdx].model = e.target.value;
        updatePreviewMesh(pIdx);
      });
    });

    container.querySelectorAll('.car-color-picker').forEach(function(cp) {
      cp.addEventListener('input', function(e) {
        var pIdx = parseInt(e.target.getAttribute('data-player'));
        playerConfigs[pIdx].color = e.target.value;
        updatePreviewMesh(pIdx);
      });
    });

    container.querySelectorAll('.car-tex-select').forEach(function(ts) {
      ts.addEventListener('change', function(e) {
        var pIdx = parseInt(e.target.getAttribute('data-player'));
        playerConfigs[pIdx].texIdx = parseInt(e.target.value);
        updatePreviewMesh(pIdx);
      });
    });
  }

  function setupPreviewCanvas(playerIdx, cfg) {
    var box = document.getElementById('previewBox' + playerIdx);
    if (!box) return;

    var w = box.clientWidth || 220;
    var h = box.clientHeight || 130;

    var pScene = new THREE.Scene();
    pScene.background = new THREE.Color(0x1e293b);

    var pCam = new THREE.PerspectiveCamera(40, w / h, 0.1, 50);
    pCam.position.set(3.6, 2.2, 4.4);
    pCam.lookAt(0, 0.5, 0);

    var pLight = new THREE.DirectionalLight(0xffffff, 1.8);
    pLight.position.set(6, 10, 6);
    pScene.add(pLight);
    pScene.add(new THREE.AmbientLight(0xffffff, 0.8));

    var pRenderer = new THREE.WebGLRenderer({ antialias: true });
    pRenderer.setSize(w, h);
    pRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    box.appendChild(pRenderer.domElement);

    var carTexUrl = CAR_TEXTURE_PATHS[cfg.texIdx] ? CAR_TEXTURE_PATHS[cfg.texIdx].url : '';
    var carMesh = buildCarMesh(cfg.color, '#ffffff', carTexUrl, cfg.model);
    pScene.add(carMesh);

    var pData = {
      active: true,
      renderer: pRenderer,
      scene: pScene,
      camera: pCam,
      carMesh: carMesh,
      playerIdx: playerIdx,
      box: box
    };
    previewScenes.push(pData);
  }

  function updatePreviewMesh(pIdx) {
    var ps = previewScenes.find(function(p) { return p.playerIdx === pIdx; });
    if (!ps) return;
    ps.scene.remove(ps.carMesh);

    var cfg = playerConfigs[pIdx];
    var carTexUrl = CAR_TEXTURE_PATHS[cfg.texIdx] ? CAR_TEXTURE_PATHS[cfg.texIdx].url : '';
    ps.carMesh = buildCarMesh(cfg.color, '#ffffff', carTexUrl, cfg.model);
    ps.scene.add(ps.carMesh);
  }

  function renderPreviewsAnimation() {
    previewScenes.forEach(function(ps) {
      if (ps.active && ps.carMesh && ps.renderer) {
        if(ps.box && ps.box.clientWidth > 0 && ps.box.clientHeight > 0) {
          var bw = ps.box.clientWidth, bh = ps.box.clientHeight;
          if (ps.renderer.domElement.width !== bw || ps.renderer.domElement.height !== bh) {
            ps.renderer.setSize(bw, bh);
            ps.camera.aspect = bw / bh;
            ps.camera.updateProjectionMatrix();
          }
        }
        ps.carMesh.rotation.y += 0.015;
        ps.renderer.render(ps.scene, ps.camera);
      }
    });
  }

  var playerModal = document.getElementById('playerModal');
  document.getElementById('openPlayersModalBtn').addEventListener('click', function() {
    playerModal.style.display = 'flex';
    setTimeout(function() {
      initPlayerPreviews();
    }, 20);
  });
  document.getElementById('closeModalBtn').addEventListener('click', function() {
    playerModal.style.display = 'none';
    clearPreviews();
  });

  /* ---------------------------------------------------------------
     ASETUKSET-MODAALI SÄÄDÖT JA PAINIKKEET
  --------------------------------------------------------------- */
  var settingsModal = document.getElementById('settingsModal');
  var openSettingsModalBtn = document.getElementById('openSettingsModalBtn');
  var closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');

  if (openSettingsModalBtn) {
    openSettingsModalBtn.addEventListener('click', function() {
      if (settingsModal) settingsModal.style.display = 'flex';
    });
  }
  if (closeSettingsModalBtn) {
    closeSettingsModalBtn.addEventListener('click', function() {
      if (settingsModal) settingsModal.style.display = 'none';
    });
  }

  var damageBtn = document.getElementById('damageBtn');
  if (damageBtn) {
    damageBtn.addEventListener('click', function() {
      damageEnabled = !damageEnabled;
      damageBtn.textContent = damageEnabled ? '💥 Vahingot On' : '💥 Vahingot Off';
      damageBtn.classList.toggle('active', damageEnabled);
      regenerateAll();
    });
  }

  var timeLimitInput = document.getElementById('timeLimitInput');
  if (timeLimitInput) {
    timeLimitInput.addEventListener('change', function(e) {
      var val = parseInt(e.target.value) || 0;
      timeLimitSetting = Math.max(0, val);
      e.target.value = timeLimitSetting;
    });
  }

  var qualifyingBtn = document.getElementById('qualifyingBtn');
  if (qualifyingBtn) {
    qualifyingBtn.addEventListener('click', function() {
      qualifyingEnabled = !qualifyingEnabled;
      qualifyingBtn.textContent = qualifyingEnabled ? '⏱️ Aika-ajot On' : '⏱️ Aika-ajot Off';
      qualifyingBtn.classList.toggle('active', qualifyingEnabled);
    });
  }

  var collectiblesBtn = document.getElementById('collectiblesBtn');
  if (collectiblesBtn) {
    collectiblesBtn.addEventListener('click', function() {
      collectiblesEnabled = !collectiblesEnabled;
      collectiblesBtn.textContent = collectiblesEnabled ? '🔮 Keräily On' : '🔮 Keräily Off';
      collectiblesBtn.classList.toggle('active', collectiblesEnabled);
      spawnCollectiblesOnTrack();
    });
  }

  var preGenCareerBtn = document.getElementById('preGenCareerBtn');
  if (preGenCareerBtn) {
    preGenCareerBtn.addEventListener('click', function() {
      preGenCareerTracksEnabled = !preGenCareerTracksEnabled;
      preGenCareerBtn.textContent = preGenCareerTracksEnabled ? '🗺️ Ennakkoradat uralle On' : '🗺️ Ennakkoradat uralle Off';
      preGenCareerBtn.classList.toggle('active', preGenCareerTracksEnabled);
      if (!preGenCareerTracksEnabled) {
        preGeneratedTracks = [];
        preGenCurrentIndex = 0;
        isPreGeneratingCareer = false;
        var careerBtnEl = document.getElementById('careerBtn');
        if (careerBtnEl) careerBtnEl.textContent = '🏆 Aloita Ura';
      }
    });
  }

  var minimapBtn = document.getElementById('minimapBtn');
  if (minimapBtn) {
    minimapBtn.addEventListener('click', function() {
      minimapEnabled = !minimapEnabled;
      minimapBtn.textContent = minimapEnabled ? '🗺️ Ratakuva On' : '🗺️ Ratakuva Off';
      minimapBtn.classList.toggle('active', minimapEnabled);
    });
  }

  var rearviewMirrorBtn = document.getElementById('rearviewMirrorBtn');
  if (rearviewMirrorBtn) {
    rearviewMirrorBtn.addEventListener('click', function() {
      rearviewMirrorEnabled = !rearviewMirrorEnabled;
      rearviewMirrorBtn.textContent = rearviewMirrorEnabled ? '🪞 Taustapeili On' : '🪞 Taustapeili Off';
      rearviewMirrorBtn.classList.toggle('active', rearviewMirrorEnabled);
    });
  }

  var speedometerBtn = document.getElementById('speedometerBtn');
  if (speedometerBtn) {
    speedometerBtn.addEventListener('click', function() {
      speedometerEnabled = !speedometerEnabled;
      speedometerBtn.textContent = speedometerEnabled ? '⏱️ Nopeusmittari On' : '⏱️ Nopeusmittari Off';
      speedometerBtn.classList.toggle('active', speedometerEnabled);
      updateHudUI();
    });
  }

  /* ---------------------------------------------------------------
     YMPÄRISTÖ-MODAALI
  --------------------------------------------------------------- */
  var envModal = document.getElementById('envModal');
  var openEnvModalBtn = document.getElementById('openEnvModalBtn');
  var closeEnvModalBtn = document.getElementById('closeEnvModalBtn');

  if (openEnvModalBtn) {
    openEnvModalBtn.addEventListener('click', function() {
      if (envModal) envModal.style.display = 'flex';
    });
  }
  if (closeEnvModalBtn) {
    closeEnvModalBtn.addEventListener('click', function() {
      if (envModal) envModal.style.display = 'none';
    });
  }

  var gravelBtn = document.getElementById('gravelBtn');
  if (gravelBtn) {
    gravelBtn.addEventListener('click', function() {
      gravelEnabled = !gravelEnabled;
      gravelBtn.textContent = gravelEnabled ? '🏖️ Hiekka On' : '🏖️ Hiekka Off';
      gravelBtn.classList.toggle('active', gravelEnabled);
      regenerateAll();
    });
  }

  /* ---------------------------------------------------------------
     OHJAIMET JA SYÖTTEET
  --------------------------------------------------------------- */
  var isRacing = false;
  var isCountdown = false;
  var countdownTimeouts = [];

  var numCompetitors = 2;
  var numPlayers = 1;
  var targetLaps = 3;
  var finishCounter = 0;

  var stereoActive = false;
  var stereoEyeDist = 0.15;
  var stereoImageOffset = 0;

  var cars = [];

  if (window.PlayerControls) {
    PlayerControls.initListeners(function() { return isRacing; });
    PlayerControls.bindAllTouchControls();
  }

  document.getElementById('btPairBtn').addEventListener('click', function(){
    if (window.PlayerControls) PlayerControls.pairBluetoothDevice();
  });

  var stereoBtn = document.getElementById('stereoBtn');
  var stereoControls = document.getElementById('stereoControls');
  var eyeDistSlider = document.getElementById('eyeDistSlider');
  var eyeDistVal = document.getElementById('eyeDistVal');
  var imgOffsetSlider = document.getElementById('imgOffsetSlider');
  var imgOffsetVal = document.getElementById('imgOffsetVal');

  if (stereoBtn) {
    stereoBtn.addEventListener('click', function(){
      stereoActive = !stereoActive;
      stereoBtn.classList.toggle('active', stereoActive);
      if (stereoControls) stereoControls.style.display = stereoActive ? 'block' : 'none';
    });
  }

  if (eyeDistSlider) {
    eyeDistSlider.addEventListener('input', function(e){
      stereoEyeDist = parseFloat(e.target.value) || 0.15;
      if (eyeDistVal) eyeDistVal.innerText = stereoEyeDist.toFixed(2) + "m";
    });
  }

  if (imgOffsetSlider) {
    imgOffsetSlider.addEventListener('input', function(e){
      stereoImageOffset = parseInt(e.target.value) || 0;
      if (imgOffsetVal) imgOffsetVal.innerText = stereoImageOffset + "px";
    });
  }

  var boostersBtn = document.getElementById('boostersBtn');
  if (boostersBtn) {
    boostersBtn.addEventListener('click', function(e) {
      boostersEnabled = !boostersEnabled;
      boostersBtn.textContent = boostersEnabled ? '⚡ Kiihdyttimet On' : '⚡ Kiihdyttimet Off';
      boostersBtn.classList.toggle('active', boostersEnabled);
      regenerateAll();
    });
  }

  var tireWearBtn = document.getElementById('tireWearBtn');
  if (tireWearBtn) {
    tireWearBtn.addEventListener('click', function(e) {
      tireWearEnabled = !tireWearEnabled;
      tireWearBtn.textContent = tireWearEnabled ? '🛞 Kuluminen On' : '🛞 Kuluminen Off';
      tireWearBtn.classList.toggle('active', tireWearEnabled);
      regenerateAll();
    });
  }

  var maxSpeedSlider = document.getElementById('maxSpeedSlider');
  var maxSpeedVal = document.getElementById('maxSpeedVal');
  if (maxSpeedSlider) {
    maxSpeedSlider.addEventListener('input', function(e) {
      carMaxSpeedSetting = parseFloat(e.target.value) || 38.0;
      if (maxSpeedVal) maxSpeedVal.innerText = Math.round(carMaxSpeedSetting) + " km/h";
    });
  }

  var accelSlider = document.getElementById('accelSlider');
  var accelVal = document.getElementById('accelVal');
  if (accelSlider) {
    accelSlider.addEventListener('input', function(e) {
      carAccelSetting = parseFloat(e.target.value) || 26.0;
      if (accelVal) accelVal.innerText = Math.round(carAccelSetting);
    });
  }

  var compInput = document.getElementById('numCompetitors');
  var playInput = document.getElementById('numPlayers');
  var lapsInput = document.getElementById('numLaps');
  var aiDiffSelect = document.getElementById('aiDifficulty');

  if (aiDiffSelect) {
    aiDiffSelect.addEventListener('change', function(e) {
      aiDifficulty = e.target.value;
    });
  }

  if (lapsInput) {
    lapsInput.addEventListener('change', function(){
      var val = parseInt(lapsInput.value) || 1;
      targetLaps = THREE.MathUtils.clamp(val, 1, 20);
      lapsInput.value = targetLaps;
    });
  }

  if (compInput) {
    compInput.addEventListener('change', function(){
      var val = parseInt(compInput.value) || 1;
      numCompetitors = THREE.MathUtils.clamp(val, 1, 8);
      compInput.value = numCompetitors;
      if(numPlayers > numCompetitors) {
        numPlayers = numCompetitors;
        if (playInput) playInput.value = numPlayers;
      }
    });
  }

  if (playInput) {
    playInput.addEventListener('change', function(){
      var val = parseInt(playInput.value) || 1;
      numPlayers = THREE.MathUtils.clamp(val, 1, 4);
      playInput.value = numPlayers;
      if(numCompetitors < numPlayers) {
        numCompetitors = numPlayers;
        if (compInput) compInput.value = numCompetitors;
      }
      
      if (stereoBtn) {
        if(numPlayers === 1) {
          stereoBtn.style.display = 'block';
        } else {
          stereoBtn.style.display = 'none';
          stereoActive = false;
          stereoBtn.classList.remove('active');
          if (stereoControls) stereoControls.style.display = 'none';
        }
      }
    });
  }

  function getAiSpeedForDifficulty() {
    var ratio = carMaxSpeedSetting / 38.0;
    if (aiDifficulty === 'helppo') {
      return (12.0 + Math.random() * 2.5) * ratio;
    } else if (aiDifficulty === 'hyvin vaikea') {
      return (21.5 + Math.random() * 4.0) * ratio;
    }
    return (16.5 + Math.random() * 3.5) * ratio;
  }

  function createCars() {
    if (window.AudioEngine) AudioEngine.stopAllEngineSounds();

    for(var i = 0; i < cars.length; i++) {
      if(cars[i].mesh) scene.remove(cars[i].mesh);
    }
    cars = [];

    var aiCounter = 1;
    var usedColors = playerConfigs.slice(0, numPlayers).map(function(c){ return c.color; });
    var usedTextures = playerConfigs.slice(0, numPlayers).map(function(c){ return c.texIdx; });

    var availColors = PRESET_PALETTES.filter(function(c){ return usedColors.indexOf(c) === -1; });
    if (availColors.length === 0) availColors = PRESET_PALETTES.slice();

    var availTextures = [];
    for (var t = 1; t < CAR_TEXTURE_PATHS.length; t++) {
      if (usedTextures.indexOf(t) === -1) availTextures.push(t);
    }
    if (availTextures.length === 0) availTextures = [1, 2, 3, 4, 5, 6];

    for(var i = 0; i < numCompetitors; i++) {
      var isPlayerCar = (i < numPlayers);
      var carName = "", carColor = "", carTexIdx = 0, carModel = 'simple';

      if(isPlayerCar) {
        var cfg = playerConfigs[i];
        carName = (cfg.name && cfg.name.trim() !== "") ? cfg.name.trim() : ("Pelaaja " + (i + 1));
        carColor = cfg.color;
        carTexIdx = cfg.texIdx;
        carModel = cfg.model || 'simple';
      } else {
        carName = "Tietokone " + aiCounter;
        aiCounter++;
        carColor = availColors[(i - numPlayers) % availColors.length];
        carTexIdx = availTextures[(i - numPlayers) % availTextures.length];
        carModel = 'simple';
      }

      var carTexUrl = CAR_TEXTURE_PATHS[carTexIdx] ? CAR_TEXTURE_PATHS[carTexIdx].url : '';
      var mesh = buildCarMesh(carColor, '#111111', carTexUrl, carModel);
      scene.add(mesh);

      if (mesh.userData.headlight1 && mesh.userData.headlight2) {
        mesh.userData.headlight1.visible = (currentTimeOfDay === 'yo');
        mesh.userData.headlight2.visible = (currentTimeOfDay === 'yo');
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
        progress: 0, prevProgress: 0, totalDist: 0,
        aiSpeed: getAiSpeedForDifficulty(),
        laps: 0, currentLapTime: 0, bestLapTime: null,
        lastSampleIdx: 0, passedMidpoint: false,
        finished: false, finishRank: 0, timeOut: false,
        wrongWayTimer: 0,
        wrongWay: false,
        tireWear: 0.0,
        damage: 0.0,
        orbsCollected: 0,
        lapTimeRemaining: timeLimitSetting > 0 ? timeLimitSetting : 0,
        upgrades: { accelMult: 1.0, speedMult: 1.0, tireMult: 1.0, dmgMult: 1.0, sandMult: 1.0, waterMult: 1.0, rainMult: 1.0 },
        pitTimer: 0.0,
        pitCooldown: 0.0,
        boostGlowTimer: 0.0,
        driftVx: 0.0,
        driftVz: 0.0,
        lastSkidLeft: null,
        lastSkidRight: null
      };

      if (isPlayerCar && window.AudioEngine) {
        AudioEngine.setupCarEngineSound(carObj);
      }

      cars.push(carObj);
    }
  }

  function positionHuds() {
    var huds = [
      document.getElementById('hudP1'),
      document.getElementById('hudP2'),
      document.getElementById('hudP3'),
      document.getElementById('hudP4')
    ];

    for(var i=0; i<4; i++) if (huds[i]) huds[i].style.display = 'none';

    if(!isRacing) return;

    if(numPlayers === 1 && huds[0]) {
      huds[0].style.display = 'block';
      huds[0].style.top = '18px'; huds[0].style.right = '18px';
      huds[0].style.bottom = 'auto'; huds[0].style.left = 'auto';
    } else if(numPlayers === 2 && huds[0] && huds[1]) {
      huds[0].style.display = 'block';
      huds[0].style.top = '18px'; huds[0].style.right = '18px';
      huds[0].style.bottom = 'auto'; huds[0].style.left = 'auto';

      huds[1].style.display = 'block';
      huds[1].style.bottom = '18px'; huds[1].style.right = '18px';
      huds[1].style.top = 'auto'; huds[1].style.left = 'auto';
    } else if(numPlayers === 3 && huds[0] && huds[1] && huds[2]) {
      huds[0].style.display = 'block';
      huds[0].style.top = '18px'; huds[0].style.left = 'calc(50% - 188px)';
      huds[0].style.bottom = 'auto'; huds[0].style.right = 'auto';

      huds[1].style.display = 'block';
      huds[1].style.top = '18px'; huds[1].style.right = '18px';
      huds[1].style.bottom = 'auto'; huds[1].style.left = 'auto';

      huds[2].style.display = 'block';
      huds[2].style.bottom = '18px'; huds[2].style.right = '18px';
      huds[2].style.top = 'auto'; huds[2].style.left = 'auto';
    } else if(numPlayers === 4 && huds[0] && huds[1] && huds[2] && huds[3]) {
      huds[0].style.display = 'block';
      huds[0].style.top = '18px'; huds[0].style.left = 'calc(50% - 188px)';
      huds[0].style.bottom = 'auto'; huds[0].style.right = 'auto';

      huds[1].style.display = 'block';
      huds[1].style.top = '18px'; huds[1].style.right = '18px';
      huds[1].style.bottom = 'auto'; huds[1].style.left = 'auto';

      huds[2].style.display = 'block';
      huds[2].style.bottom = '18px'; huds[2].style.left = 'calc(50% - 188px)';
      huds[2].style.top = 'auto'; huds[2].style.right = 'auto';

      huds[3].style.display = 'block';
      huds[3].style.bottom = '18px'; huds[3].style.right = '18px';
      huds[3].style.top = 'auto'; huds[3].style.left = 'auto';
    }
  }

  function positionTouchControls() {
    var tContainersJoystick = [
      document.getElementById('touchP1'),
      document.getElementById('touchP2'),
      document.getElementById('touchP3'),
      document.getElementById('touchP4')
    ];

    var tContainersWheel = [
      document.getElementById('touchWheelP1'),
      document.getElementById('touchWheelP2'),
      document.getElementById('touchWheelP3'),
      document.getElementById('touchWheelP4')
    ];

    for(var i=0; i<4; i++) {
      if (tContainersJoystick[i]) tContainersJoystick[i].style.display = 'none';
      if (tContainersWheel[i]) tContainersWheel[i].style.display = 'none';
    }

    if(!isRacing) return;

    for(var i = 0; i < numPlayers; i++) {
      var ctrlType = playerConfigs[i] ? playerConfigs[i].ctrl : 'keyboard';

      if (!cars[i] || cars[i].finished) continue;

      var el = null;
      if (ctrlType === 'touch') {
        el = tContainersJoystick[i];
      } else if (ctrlType === 'touch_wheel') {
        el = tContainersWheel[i];
      }

      if (!el) continue;
      el.style.display = 'block';

      if(numPlayers === 1) {
        el.style.top = '0'; el.style.left = '0'; el.style.width = '100%'; el.style.height = '100%';
      } else if(numPlayers === 2) {
        if(i === 0) { el.style.top = '0'; el.style.left = '0'; el.style.width = '100%'; el.style.height = '50%'; }
        else { el.style.top = '50%'; el.style.left = '0'; el.style.width = '100%'; el.style.height = '50%'; }
      } else if(numPlayers === 3) {
        if(i === 0) { el.style.top = '0'; el.style.left = '0'; el.style.width = '50%'; el.style.height = '50%'; }
        else if(i === 1) { el.style.top = '0'; el.style.left = '50%'; el.style.width = '50%'; el.style.height = '50%'; }
        else { el.style.top = '50%'; el.style.left = '0'; el.style.width = '100%'; el.style.height = '50%'; }
      } else if(numPlayers === 4) {
        if(i === 0) { el.style.top = '0'; el.style.left = '0'; el.style.width = '50%'; el.style.height = '50%'; }
        else if(i === 1) { el.style.top = '0'; el.style.left = '50%'; el.style.width = '50%'; el.style.height = '50%'; }
        else if(i === 2) { el.style.top = '50%'; el.style.left = '0'; el.style.width = '50%'; el.style.height = '50%'; }
        else if(i === 3) { el.style.top = '50%'; el.style.left = '50%'; el.style.width = '50%'; el.style.height = '50%'; }
      }
    }
  }

  function updateHudUI() {
    var pIcons = ['🔴', '🟢', '🟡', '🟣'];

    for(var i = 0; i < numPlayers; i++) {
      var c = cars[i];
      var pNum = i + 1;
      var hudBox = document.getElementById('hudP' + pNum);
      if (!hudBox) continue;

      if (c) {
        var html = '<h3 style="color:' + c.colorCss + ';">' + pIcons[i] + ' ' + c.name + '</h3>';
        if (c.finished) {
          if (c.timeOut) {
            html += '<div style="font-size:0.85rem; font-weight:800; color:#ef4444; margin:4px 0;">⏰ AIKARAJA LOPPU!</div>';
            html += '<div class="hud-row"><span>Sijoitus:</span><span class="hud-val" style="font-size:0.95rem; color:#ef4444;">' + c.finishRank + '. / ' + numCompetitors + '</span></div>';
          } else {
            html += '<div style="font-size:0.85rem; font-weight:800; color:#28a745; margin:4px 0;">🏁 MAALISSA!</div>';
            html += '<div class="hud-row"><span>Sijoitus:</span><span class="hud-val" style="font-size:0.95rem; color:#d4611f;">' + c.finishRank + '. / ' + numCompetitors + '</span></div>';
            html += '<div class="hud-row"><span>Paras aika:</span><span class="hud-val">' + formatTime(c.bestLapTime) + '</span></div>';
          }
        } else {
          if (isQualifying) {
            html += '<div class="hud-row" style="color:#000000; font-weight:800;"><span>⏱️ AIKA-AJOT</span></div>';
            html += '<div class="hud-row"><span>Aika:</span><span class="hud-val">' + formatTime(c.currentLapTime) + '</span></div>';
          } else {
            html += '<div class="hud-row"><span>Kierros:</span><span class="hud-val">' + c.laps + ' / ' + targetLaps + '</span></div>';
            html += '<div class="hud-row"><span>Aika:</span><span class="hud-val">' + formatTime(c.currentLapTime) + '</span></div>';
            html += '<div class="hud-row"><span>Paras:</span><span class="hud-val">' + formatTime(c.bestLapTime) + '</span></div>';
          }

          if (timeLimitSetting > 0) {
            var timeRemColor = c.lapTimeRemaining <= 20 ? '#ef4444' : '#000000';
            html += '<div class="hud-row"><span>Aikaraja:</span><span class="hud-val" style="color:' + timeRemColor + '; font-weight:800;">' + c.lapTimeRemaining.toFixed(1) + 's</span></div>';
          }

          if (collectiblesEnabled) {
            html += '<div class="hud-row"><span>🔮 Palloja:</span><span class="hud-val" style="color:#000000; font-weight:800;">' + (c.orbsCollected || 0) + '</span></div>';
          }

          if (damageEnabled) {
            var dmgPct = Math.round(c.damage * 100);
            var dmgColor = dmgPct > 60 ? '#ef4444' : (dmgPct > 25 ? '#ffaa00' : '#28a745');
            html += '<div class="hud-row"><span>Vahinko:</span><span class="hud-val" style="color:' + dmgColor + ';">' + dmgPct + '%</span></div>';
          }

          if (tireWearEnabled) {
            var wearPct = Math.round(c.tireWear * 100);
            var wearColor = wearPct > 70 ? '#ef4444' : (wearPct > 40 ? '#ffaa00' : '#28a745');
            html += '<div class="hud-row"><span>Renkaat:</span><span class="hud-val" style="color:' + wearColor + ';">' + (100 - wearPct) + '%</span></div>';
          }

          if (c.pitTimer > 0) {
            html += '<div class="wrong-way-banner" style="color:#000000; border-color:#0284c7; background:rgba(2,132,199,0.15);">🛞 VARIKKO: ' + c.pitTimer.toFixed(1) + 's</div>';
          }

          if (c.wrongWay) {
            html += '<div class="wrong-way-banner">⚠️ VÄÄRÄ SUUNTA!</div>';
          }

          if (speedometerEnabled) {
            var kmh = Math.round(Math.max(0, c.speed * 2.8));
            var speedRatio = Math.min(1.0, Math.max(0, c.speed / carMaxSpeedSetting));
            var needleDeg = -120 + (speedRatio * 240);
            
            html += '<div class="analog-speedometer-box" style="position:relative; right:auto; top:auto; transform:none; margin:8px auto 2px auto;">';
            html += '<div class="speedo-dial">';
            html += '<div class="speedo-ticks"></div>';
            html += '<div class="speedo-needle" style="transform: rotate(' + needleDeg + 'deg);"></div>';
            html += '<div class="speedo-cap"></div>';
            html += '</div>';
            html += '<div class="speedo-val-text">' + kmh + ' <span class="speedo-unit">km/h</span></div>';
            html += '</div>';
          }
        }
        hudBox.innerHTML = html;
      }
    }

    // AIKARAJA WARING CENTER OVERLAY
    if (isRacing && timeLimitSetting > 0 && cars[0] && !cars[0].finished && cars[0].lapTimeRemaining <= 20 && cars[0].lapTimeRemaining > 0) {
      var cdOverlay = document.getElementById('countdownOverlay');
      if (cdOverlay) {
        cdOverlay.style.display = 'flex';
        cdOverlay.style.fontSize = '3.5rem';
        cdOverlay.style.color = '#ef4444';
        cdOverlay.textContent = '⏱️ AIKARAJA: ' + cars[0].lapTimeRemaining.toFixed(1) + 's';
      }
    } else if (!isCountdown && document.getElementById('countdownOverlay') && !careerTransitionTimeout) {
      var cdOverlay = document.getElementById('countdownOverlay');
      if (cdOverlay && cdOverlay.style.fontSize === '3.5rem') {
        cdOverlay.style.display = 'none';
        cdOverlay.style.fontSize = '8rem';
      }
    }

    var sorted = cars.slice().sort(function(a, b){
      if (a.finished && b.finished) return a.finishRank - b.finishRank;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.totalDist - a.totalDist;
    });

    var lb = document.getElementById('leaderboardBar');
    if (lb) {
      var htmlLb = "";

      if (isCareerMode) {
        htmlLb += '<div class="lb-item" style="color:#ffc107; font-weight:900; margin-right:10px;">🏆 URA: KISA ' + careerCurrentRace + '/' + careerTotalRaces + '</div>';
      }

      for(var i = 0; i < sorted.length; i++) {
        var car = sorted[i];
        var pos = i + 1;
        var statusIcon = car.timeOut ? ' ⏰' : (car.finished ? ' 🏁' : '');
        htmlLb += '<div class="lb-item">';
        htmlLb += '<span>' + pos + '.</span>';
        htmlLb += '<span class="lb-badge" style="background:' + car.colorCss + ';"></span>';
        htmlLb += '<span>' + car.name + statusIcon + '</span>';
        htmlLb += '</div>';
      }
      lb.innerHTML = htmlLb;
    }
  }

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

  function clearSkidMarks() {
    while (skidMarkGroup.children.length > 0) {
      var obj = skidMarkGroup.children[0];
      if (obj.geometry) obj.geometry.dispose();
      skidMarkGroup.remove(obj);
    }
  }

  /* ---------------------------------------------------------------
     AIKA-AJOT LOGIIKKA (QUALIFYING)
  --------------------------------------------------------------- */
  function startQualifyingPhase() {
    isQualifying = true;
    qualifyingCurrentPlayerIdx = 0;
    qualifyingResults = [];
    startSoloQualifyingLap();
  }

  function startSoloQualifyingLap() {
    if (!currentTrack) return;

    createCars();

    cars.forEach(function(c, idx) {
      if (idx !== qualifyingCurrentPlayerIdx) {
        c.mesh.visible = false;
      }
    });

    var activeCar = cars[qualifyingCurrentPlayerIdx];
    var s0 = currentTrack.samples[0];
    var s1 = currentTrack.samples[1];
    var dir = new THREE.Vector3(s1.x - s0.x, 0, s1.z - s0.z).normalize();
    var startAngle = Math.atan2(dir.x, dir.z);

    activeCar.x = s0.x;
    activeCar.z = s0.z;
    activeCar.y = getRoadSurfaceHeight(currentTrack, activeCar.x, activeCar.z, activeCar.y);
    activeCar.angle = startAngle;
    activeCar.speed = 0;
    activeCar.progress = 0;
    activeCar.laps = 0;
    activeCar.currentLapTime = 0;
    activeCar.passedMidpoint = false;
    activeCar.finished = false;
    activeCar.timeOut = false;
    activeCar.lapTimeRemaining = timeLimitSetting > 0 ? timeLimitSetting : 0;

    activeCar.mesh.position.set(activeCar.x, activeCar.y, activeCar.z);
    activeCar.mesh.rotation.y = activeCar.angle;
    activeCar.mesh.visible = true;

    isRacing = true;
    positionHuds();
    positionTouchControls();
    startCountdown();
  }

  function finishQualifyingLap(car) {
    qualifyingResults.push({
      carIdx: car.id,
      name: car.name,
      bestTime: car.currentLapTime
    });

    qualifyingCurrentPlayerIdx++;

    if (qualifyingCurrentPlayerIdx < numPlayers) {
      startSoloQualifyingLap();
    } else {
      for (var i = numPlayers; i < numCompetitors; i++) {
        qualifyingResults.push({
          carIdx: i,
          name: cars[i].name,
          bestTime: (18.0 + Math.random() * 8.0)
        });
      }

      qualifyingResults.sort(function(a, b) { return a.bestTime - b.bestTime; });

      isQualifying = false;
      startMainRaceWithGridOrder();
    }
  }

  function startMainRaceWithGridOrder() {
    if (!currentTrack) return;

    if (window.AudioEngine) AudioEngine.tryPlayMusic();
    finishCounter = 0;
    clearSkidMarks();
    createCars();
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
      c.y = getRoadSurfaceHeight(currentTrack, c.x, c.z, c.y);
      c.angle = startAngle;
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
      c.finishRank = 0;
      c.timeOut = false;
      c.wrongWayTimer = 0;
      c.wrongWay = false;
      c.tireWear = 0.0;
      c.damage = 0.0;
      c.lapTimeRemaining = timeLimitSetting > 0 ? timeLimitSetting : 0;
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

    setupRaceUI();
    startCountdown();
  }

  /* ---------------------------------------------------------------
     KISA ALUSTUS JA LOPETUS
  --------------------------------------------------------------- */
  function setupRaceUI() {
    var rotateBtn = document.getElementById('rotateBtn');
    var flyBtn = document.getElementById('flyBtn');
    var raceBtn = document.getElementById('raceBtn');
    if (rotateBtn) rotateBtn.classList.remove('active');
    if (flyBtn) flyBtn.classList.remove('active');
    if (raceBtn) raceBtn.classList.add('active');

    var uiPanel = document.getElementById('ui');
    if (uiPanel) uiPanel.style.display = 'none';

    var exitBtn = document.getElementById('exitRaceBtn');
    var lbBar = document.getElementById('leaderboardBar');
    if (exitBtn) exitBtn.style.display = 'flex';
    if (lbBar) lbBar.style.display = 'flex';

    var dH = document.getElementById('dividerH');
    var dV = document.getElementById('dividerV');
    var dVTop = document.getElementById('dividerVTop');

    if (dH) dH.style.display = (numPlayers >= 2) ? 'block' : 'none';
    if (dV) dV.style.display = (numPlayers === 4) ? 'block' : 'none';
    if (dVTop) dVTop.style.display = (numPlayers === 3) ? 'block' : 'none';

    positionHuds();
    positionTouchControls();
    updateHudUI();
  }

  function initRace(){
    if(!currentTrack) return;

    if (qualifyingEnabled && !isQualifying) {
      startQualifyingPhase();
      return;
    }

    if (window.AudioEngine) AudioEngine.tryPlayMusic();
    finishCounter = 0;
    clearSkidMarks();
    createCars();
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
      c.y = getRoadSurfaceHeight(currentTrack, c.x, c.z, c.y);
      c.angle = startAngle;
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
      c.finishRank = 0;
      c.timeOut = false;
      c.wrongWayTimer = 0;
      c.wrongWay = false;
      c.tireWear = 0.0;
      c.damage = 0.0;
      c.lapTimeRemaining = timeLimitSetting > 0 ? timeLimitSetting : 0;
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

    setupRaceUI();
    startCountdown();
  }

  function stopRace(){
    isRacing = false;
    isCountdown = false;
    isQualifying = false;
    isCareerMode = false;
    clearCountdownTimeouts();

    if (shopTimerInterval) {
      clearInterval(shopTimerInterval);
      shopTimerInterval = null;
    }
    isShopMode = false;
    var shopOverlay = document.getElementById('shopOverlay');
    if (shopOverlay) shopOverlay.style.display = 'none';

    var minimapCanvas = document.getElementById('minimapCanvas');
    if (minimapCanvas) minimapCanvas.style.display = 'none';

    var rearviewFrame = document.getElementById('rearviewFrame');
    if (rearviewFrame) rearviewFrame.style.display = 'none';

    if (careerTransitionTimeout) {
      clearTimeout(careerTransitionTimeout);
      careerTransitionTimeout = null;
    }

    var cdOverlay = document.getElementById('countdownOverlay');
    var dH = document.getElementById('dividerH');
    var dV = document.getElementById('dividerV');
    var dVTop = document.getElementById('dividerVTop');
    var exitBtn = document.getElementById('exitRaceBtn');
    var lbBar = document.getElementById('leaderboardBar');
    var uiPanel = document.getElementById('ui');

    if (cdOverlay) cdOverlay.style.display = 'none';
    if (dH) dH.style.display = 'none';
    if (dV) dV.style.display = 'none';
    if (dVTop) dVTop.style.display = 'none';
    if (exitBtn) exitBtn.style.display = 'none';
    if (lbBar) lbBar.style.display = 'none';
    if (uiPanel) uiPanel.style.display = 'block';

    if (window.AudioEngine) AudioEngine.stopAllEngineSounds();

    for(var i = 0; i < cars.length; i++) {
      if(cars[i].mesh) cars[i].mesh.visible = false;
    }

    if (window.PlayerControls) PlayerControls.resetTouchState();

    positionHuds();
    positionTouchControls();
    var raceBtn = document.getElementById('raceBtn');
    if (raceBtn) raceBtn.classList.remove('active');

    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, innerWidth, innerHeight);
  }

  var exitRaceBtn = document.getElementById('exitRaceBtn');
  if (exitRaceBtn) exitRaceBtn.addEventListener('click', stopRace);

  /* ---------------------------------------------------------------
     KAUPPA (SHOP) KISOJEN VÄLIIN URATILASSA & MAKSIMIARVOJEN TARKISTUS
  --------------------------------------------------------------- */
  var shopItems = [
    { name: "⚡ Kiihtyvyys (+10%)", cost: 3, key: "accelMult", step: 1.10, maxVal: 2.00, isMin: false, unit: "x" },
    { name: "🏎️ Maksiminopeus (+5%)", cost: 4, key: "speedMult", step: 1.05, maxVal: 1.50, isMin: false, unit: "x" },
    { name: "🛞 Renkaiden kestävyys (+20%)", cost: 3, key: "tireMult", step: 0.80, maxVal: 0.20, isMin: true, unit: "x" },
    { name: "💥 Vahingonsieto (+20%)", cost: 3, key: "dmgMult", step: 0.80, maxVal: 0.20, isMin: true, unit: "x" },
    { name: "🏖️ Hiekan pito (+25%)", cost: 2, key: "sandMult", step: 0.75, maxVal: 0.25, isMin: true, unit: "x" },
    { name: "🌊 Veden pito (+25%)", cost: 2, key: "waterMult", step: 0.75, maxVal: 0.25, isMin: true, unit: "x" },
    { name: "🌧️ Sateen pito (+25%)", cost: 2, key: "rainMult", step: 0.75, maxVal: 0.25, isMin: true, unit: "x" }
  ];

  function openCareerShopModal(callback) {
    isShopMode = true;
    shopTimer = 30;
    shopSelectedIndices = [0, 0, 0, 0];
    prevShopInputStates = [
      { gas: false, brake: false, right: false },
      { gas: false, brake: false, right: false },
      { gas: false, brake: false, right: false },
      { gas: false, brake: false, right: false }
    ];

    var shopOverlay = document.getElementById('shopOverlay');
    if (!shopOverlay) return callback();

    shopOverlay.style.display = 'flex';
    updateShopUI();

    if (shopTimerInterval) clearInterval(shopTimerInterval);
    shopTimerInterval = setInterval(function() {
      shopTimer--;
      var timerEl = document.getElementById('shopTimerText');
      if (timerEl) timerEl.textContent = shopTimer + 's';

      if (shopTimer <= 0) {
        clearInterval(shopTimerInterval);
        shopTimerInterval = null;
        isShopMode = false;
        shopOverlay.style.display = 'none';
        callback();
      }
    }, 1000);
  }

  function isUpgradeMaxed(car, item) {
    var cur = car.upgrades[item.key];
    if (item.isMin) {
      return cur <= item.maxVal + 0.001;
    }
    return cur >= item.maxVal - 0.001;
  }

  function formatUpgradeCurrentAndMax(car, item) {
    var cur = car.upgrades[item.key];
    var maxStr = item.maxVal.toFixed(2) + item.unit;
    var curStr = cur.toFixed(2) + item.unit;
    if (isUpgradeMaxed(car, item)) {
      return '<span style="color:#ef4444; font-weight:800;">TÄYNNÄ (' + curStr + ')</span>';
    }
    return curStr + ' / MAX ' + maxStr;
  }

  function updateShopUI() {
    var container = document.getElementById('shopCardsContainer');
    if (!container) return;
    container.innerHTML = "";

    for (var i = 0; i < numPlayers; i++) {
      var car = cars[i];
      if (!car) continue;

      var card = document.createElement('div');
      card.className = 'player-card';
      card.style.background = '#1e293b';
      card.style.color = '#ffffff';

      var html = '<h3 style="color:' + car.colorCss + ';">' + car.name + '</h3>';
      html += '<div style="font-size:0.85rem; color:#00f0ff; font-weight:700;">🔮 Palloja: ' + car.orbsCollected + '</div>';
      html += '<div style="margin-top:8px; display:flex; flex-direction:column; gap:4px;">';

      shopItems.forEach(function(item, idx) {
        var isSel = (shopSelectedIndices[i] === idx);
        var isMaxed = isUpgradeMaxed(car, item);

        var bg = isSel ? 'rgba(0, 240, 255, 0.25)' : 'transparent';
        var border = isSel ? '1px solid #00f0ff' : '1px solid transparent';
        var costText = isMaxed ? 'MAX' : (item.cost + ' 🔮');
        var valInfo = formatUpgradeCurrentAndMax(car, item);

        html += '<div style="padding:5px 6px; border-radius:6px; background:' + bg + '; border:' + border + '; font-size:0.75rem; display:flex; flex-direction:column; gap:2px;">';
        html += '<div style="display:flex; justify-space-between; align-items:center;">';
        html += '<span style="font-weight:700;">' + item.name + '</span><span style="color:#ffee00; font-weight:800;">' + costText + '</span>';
        html += '</div>';
        html += '<div style="font-size:0.68rem; color:#cbd5e1; text-align:right;">' + valInfo + '</div>';
        html += '</div>';
      });

      html += '</div>';
      card.innerHTML = html;
      container.appendChild(card);
    }
  }

  function handleShopInputs() {
    for (var i = 0; i < numPlayers; i++) {
      var inp = window.PlayerControls ? PlayerControls.getPlayerControls(i, playerConfigs, numPlayers) : {};
      var car = cars[i];
      if (!car) continue;

      var prev = prevShopInputStates[i];

      // Reuna-ilmaisu (edge trigger / Askel kerrallaan)
      var brakePressed = inp.brake && !prev.brake;
      var gasPressed = inp.gas && !prev.gas;
      var rightPressed = inp.right && !prev.right;

      if (brakePressed) {
        shopSelectedIndices[i] = (shopSelectedIndices[i] - 1 + shopItems.length) % shopItems.length;
        updateShopUI();
      } else if (gasPressed) {
        shopSelectedIndices[i] = (shopSelectedIndices[i] + 1) % shopItems.length;
        updateShopUI();
      } else if (rightPressed) {
        var item = shopItems[shopSelectedIndices[i]];
        var isMaxed = isUpgradeMaxed(car, item);

        if (!isMaxed && car.orbsCollected >= item.cost) {
          car.orbsCollected -= item.cost;
          
          if (item.isMin) {
            car.upgrades[item.key] = Math.max(item.maxVal, car.upgrades[item.key] * item.step);
          } else {
            car.upgrades[item.key] = Math.min(item.maxVal, car.upgrades[item.key] * item.step);
          }

          if (window.AudioEngine) AudioEngine.playFX('go');
          updateShopUI();
        }
      }

      prevShopInputStates[i] = { gas: !!inp.gas, brake: !!inp.brake, right: !!inp.right };
    }
  }

  /* ---------------------------------------------------------------
     URA-TILAN LIIKETOIMINTALOGIIKKA
  --------------------------------------------------------------- */
  function randomizeEnvironmentAndTrack() {
    var envSelect = document.getElementById('envSelect');
    var seasonSelect = document.getElementById('seasonSelect');
    var timeSelect = document.getElementById('timeSelect');
    var rainBtn = document.getElementById('rainBtn');
    var fogBtn = document.getElementById('fogBtn');
    var cloudsBtn = document.getElementById('cloudsBtn');
    var gravelBtn = document.getElementById('gravelBtn');
    var musicSelect = document.getElementById('musicSelect');

    if (envSelect) {
      var envs = Array.from(envSelect.options).map(function(o){ return o.value; });
      currentEnvironment = envs[Math.floor(Math.random() * envs.length)];
      envSelect.value = currentEnvironment;
    }

    if (seasonSelect) {
      var seasons = Array.from(seasonSelect.options).map(function(o){ return o.value; });
      currentSeason = seasons[Math.floor(Math.random() * seasons.length)];
      seasonSelect.value = currentSeason;
    }

    if (timeSelect) {
      var times = Array.from(timeSelect.options).map(function(o){ return o.value; });
      currentTimeOfDay = times[Math.floor(Math.random() * times.length)];
      timeSelect.value = currentTimeOfDay;
    }

    gravelEnabled = Math.random() < 0.75;
    if (gravelBtn) {
      gravelBtn.textContent = gravelEnabled ? '🏖️ Hiekka On' : '🏖️ Hiekka Off';
      gravelBtn.classList.toggle('active', gravelEnabled);
    }

    var wRand = Math.random();
    if (wRand < 0.28) {
      isRain = true; isFog = false; isClouds = true;
    } else if (wRand < 0.56) {
      isRain = false; isFog = true; isClouds = Math.random() < 0.5;
    } else {
      isRain = false; isFog = false; isClouds = Math.random() < 0.4;
    }

    if (rainBtn) {
      rainBtn.textContent = isRain ? '🌧️ Sade On' : '🌧️ Sade Off';
      rainBtn.classList.toggle('active', isRain);
    }

    if (fogBtn) {
      fogBtn.textContent = isFog ? '🌫️ Sumu On' : '🌫️ Sumu Off';
      fogBtn.classList.toggle('active', isFog);
    }

    if (cloudsBtn) {
      cloudsBtn.textContent = isClouds ? '☁️ Pilvet On' : '☁️ Pilvet Off';
      cloudsBtn.classList.toggle('active', isClouds);
    }

    if (musicSelect && parseInt(musicSelect.value) > 0) {
      var trackOptions = Array.from(musicSelect.options).filter(function(o){ return parseInt(o.value) > 0; });
      if (trackOptions.length > 0) {
        var randomTrack = trackOptions[Math.floor(Math.random() * trackOptions.length)];
        var newIdx = parseInt(randomTrack.value);
        musicSelect.value = newIdx;
        if (window.AudioEngine) AudioEngine.playSelectedMusic(newIdx);
      }
    }

    regenerateAll();
  }

  function startCareer() {
    var numInput = document.getElementById('numCareerRaces');
    var races = parseInt(numInput ? numInput.value : 6) || 6;
    careerTotalRaces = THREE.MathUtils.clamp(races, 2, 20);
    if (numInput) numInput.value = careerTotalRaces;

    if (preGenCareerTracksEnabled && !isPreGeneratingCareer && preGeneratedTracks.length === 0) {
      isPreGeneratingCareer = true;
      preGenCurrentIndex = 1;
      preGeneratedTracks = [];
      
      var careerBtnEl = document.getElementById('careerBtn');
      if (careerBtnEl) careerBtnEl.textContent = 'Seuraava rata (' + preGenCurrentIndex + '/' + careerTotalRaces + ')';
      randomizeEnvironmentAndTrack();
      return;
    }

    if (isPreGeneratingCareer) {
      preGeneratedTracks.push({
        env: currentEnvironment, season: currentSeason, time: currentTimeOfDay,
        rain: isRain, fog: isFog, clouds: isClouds, gravel: gravelEnabled
      });

      preGenCurrentIndex++;

      if (preGenCurrentIndex <= careerTotalRaces) {
        var careerBtnEl = document.getElementById('careerBtn');
        if (careerBtnEl) {
          if (preGenCurrentIndex === careerTotalRaces) {
            careerBtnEl.textContent = 'Aloita ura (Kisa 1/' + careerTotalRaces + ')';
          } else {
            careerBtnEl.textContent = 'Seuraava rata (' + preGenCurrentIndex + '/' + careerTotalRaces + ')';
          }
        }
        randomizeEnvironmentAndTrack();
        return;
      } else {
        isPreGeneratingCareer = false;
        var careerBtnEl = document.getElementById('careerBtn');
        if (careerBtnEl) careerBtnEl.textContent = '🏆 Aloita Ura';
      }
    }

    isCareerMode = true;
    careerCurrentRace = 1;
    careerHistory = [];

    if (preGeneratedTracks.length > 0) {
      applyPreGeneratedTrack(0);
    } else {
      randomizeEnvironmentAndTrack();
    }
    initRace();
  }

  function applyPreGeneratedTrack(idx) {
    if (!preGeneratedTracks[idx]) return;
    var tData = preGeneratedTracks[idx];
    currentEnvironment = tData.env;
    currentSeason = tData.season;
    currentTimeOfDay = tData.time;
    isRain = tData.rain;
    isFog = tData.fog;
    isClouds = tData.clouds;
    gravelEnabled = tData.gravel;

    regenerateAll();
  }

  function recordCareerRaceResults() {
    var unfinishedCars = cars.filter(function(c){ return !c.finished; });
    unfinishedCars.sort(function(a, b){ return b.totalDist - a.totalDist; });
    unfinishedCars.forEach(function(c){
      c.finished = true;
      c.finishRank = ++finishCounter;
    });

    cars.forEach(function(c) {
      var entry = careerHistory.find(function(item) { return item.name === c.name; });
      if (!entry) {
        entry = { name: c.name, colorCss: c.colorCss, ranks: [] };
        careerHistory.push(entry);
      }
      entry.ranks.push(c.finishRank);
    });
  }

  function handleCareerRaceFinish() {
    if (careerTransitionTimeout) return;

    recordCareerRaceResults();

    var overlay = document.getElementById('countdownOverlay');
    if (!overlay) return;

    overlay.style.display = 'flex';
    overlay.style.fontSize = '2.5rem';
    overlay.style.color = '#ffc107';

    var nextStepAction = function() {
      if (careerCurrentRace < careerTotalRaces) {
        overlay.textContent = 'Kisa ' + careerCurrentRace + '/' + careerTotalRaces + ' päättyi!';
        careerTransitionTimeout = setTimeout(function() {
          overlay.style.display = 'none';
          overlay.style.fontSize = '8rem';
          careerTransitionTimeout = null;
          careerCurrentRace++;

          if (preGeneratedTracks.length >= careerCurrentRace) {
            applyPreGeneratedTrack(careerCurrentRace - 1);
          } else {
            randomizeEnvironmentAndTrack();
          }
          initRace();
        }, 3500);
      } else {
        overlay.textContent = 'URA PÄÄTTYI!';
        careerTransitionTimeout = setTimeout(function() {
          overlay.style.display = 'none';
          overlay.style.fontSize = '8rem';
          careerTransitionTimeout = null;
          stopRace();
          showCareerResultsModal();
        }, 3500);
      }
    };

    if (collectiblesEnabled) {
      openCareerShopModal(nextStepAction);
    } else {
      nextStepAction();
    }
  }

  function showCareerResultsModal() {
    var modal = document.getElementById('careerModal');
    var container = document.getElementById('careerResultsContainer');
    if (!modal || !container) return;

    careerHistory.forEach(function(entry) {
      var sum = entry.ranks.reduce(function(a, b) { return a + b; }, 0);
      entry.avgRank = sum / entry.ranks.length;
    });

    careerHistory.sort(function(a, b) { return a.avgRank - b.avgRank; });

    var html = '<table class="career-table">';
    html += '<thead><tr><th>Sijoitus</th><th>Kuljettaja</th>';
    for (var r = 1; r <= careerTotalRaces; r++) {
      html += '<th>Kisa ' + r + '</th>';
    }
    html += '<th>Keskiarvosijoitus</th></tr></thead><tbody>';

    careerHistory.forEach(function(entry, idx) {
      var pos = idx + 1;
      html += '<tr>';
      html += '<td><b>' + pos + '.</b></td>';
      html += '<td style="font-weight:700; color:' + entry.colorCss + ';">' + entry.name + '</td>';
      entry.ranks.forEach(function(rk) {
        html += '<td>' + rk + '.</td>';
      });
      html += '<td style="font-weight:800; color:#d4611f;">' + entry.avgRank.toFixed(2) + '</td>';
      html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
    modal.style.display = 'flex';
  }

  var careerBtn = document.getElementById('careerBtn');
  var closeCareerModalBtn = document.getElementById('closeCareerModalBtn');
  var closeCareerBtn = document.getElementById('closeCareerBtn');

  if (careerBtn) careerBtn.addEventListener('click', startCareer);
  if (closeCareerModalBtn) {
    closeCareerModalBtn.addEventListener('click', function() {
      var cModal = document.getElementById('careerModal');
      if (cModal) cModal.style.display = 'none';
    });
  }
  if (closeCareerBtn) {
    closeCareerBtn.addEventListener('click', function() {
      var cModal = document.getElementById('careerModal');
      if (cModal) cModal.style.display = 'none';
    });
  }

  /* ---------------------------------------------------------------
     FYSIIKKA- JA PELISILMUKKA
  --------------------------------------------------------------- */
  function updatePhysics(delta){
    if(!isRacing || !currentTrack) return;

    if (isShopMode) {
      handleShopInputs();
      return;
    }

    var n = currentTrack.n;

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

    for(var i = 0; i < cars.length; i++) {
      var c = cars[i];

      if (c.finished) {
        if (window.AudioEngine) AudioEngine.setCarEngineVolume(c, 0);
        continue;
      }

      if (timeLimitSetting > 0) {
        c.lapTimeRemaining -= delta;
        if (c.lapTimeRemaining <= 0) {
          c.lapTimeRemaining = 0;
          c.finished = true;
          c.timeOut = true;
          c.finishRank = ++finishCounter;
          c.mesh.visible = false;
          if (window.AudioEngine) AudioEngine.stopCarEngineSound(c);
          positionTouchControls();
          continue;
        }
      }

      if (damageEnabled && c.damage > 0.45 && Math.random() < 0.6) {
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

      if (c.pitTimer > 0) {
        c.pitTimer -= delta;
        c.speed = 0;
        if (c.pitTimer <= 0) {
          c.pitTimer = 0;
          c.tireWear = 0.0;
          c.damage = 0.0;
          c.pitCooldown = 8.0;
          if (window.AudioEngine) AudioEngine.playFX('go');
        }
        c.mesh.position.set(c.x, c.y, c.z);
        c.mesh.rotation.y = c.angle;
        continue;
      }

      if(c.isHuman) {
        var inp = window.PlayerControls ? PlayerControls.getPlayerControls(i, playerConfigs, numPlayers) : { gas:false, brake:false, left:false, right:false };
        
        var accel = carAccelSetting * c.upgrades.accelMult;
        var brake = carAccelSetting * 1.25;
        var friction = 4.5;
        var maxSpeed = carMaxSpeedSetting * c.upgrades.speedMult;

        if (damageEnabled) {
          maxSpeed *= (1.0 - c.damage * 0.65);
        }

        var gripFactor = 1.0;
        if (isRain) {
          gripFactor *= (0.65 + (1.0 - c.upgrades.rainMult) * 0.35);
        }

        if (tireWearEnabled) {
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

        var turnSpeed = 2.3 * gripFactor;
        if(Math.abs(c.speed) > 0.5) {
          var dirFactor = c.speed > 0 ? 1 : -1;
          var leftVal = typeof inp.left === 'number' ? inp.left : (inp.left ? 1 : 0);
          var rightVal = typeof inp.right === 'number' ? inp.right : (inp.right ? 1 : 0);

          if(leftVal > 0) c.angle += turnSpeed * delta * dirFactor * leftVal;
          if(rightVal > 0) c.angle -= turnSpeed * delta * dirFactor * rightVal;
        }

        var forwardX = Math.sin(c.angle);
        var forwardZ = Math.cos(c.angle);

        if (gripFactor < 0.85 && Math.abs(c.speed) > 8.0) {
          var sideX = -forwardZ;
          var sideZ = forwardX;
          var slideAmount = (1.0 - gripFactor) * (c.speed / maxSpeed) * 1.8;

          c.driftVx = lerp(c.driftVx, sideX * slideAmount, delta * 3.0);
          c.driftVz = lerp(c.driftVz, sideZ * slideAmount, delta * 3.0);

          if (Math.random() < 0.35) spawnDustParticles(c.x, c.y, c.z, 1);
        } else {
          c.driftVx = lerp(c.driftVx, 0, delta * 8.0);
          c.driftVz = lerp(c.driftVz, 0, delta * 8.0);
        }

        var nextX = c.x + (forwardX * c.speed + c.driftVx) * delta;
        var nextZ = c.z + (forwardZ * c.speed + c.driftVz) * delta;

        var trackInfo = closestSampleInfo(currentTrack, nextX, nextZ, c.y);
        var maxLatDistance = TrackGenerator.ROAD_HALF_WIDTH + TrackGenerator.CURB_WIDTH - 0.45;

        if ((tireWearEnabled || damageEnabled) && currentTrack.pitStopArea) {
          var pit = currentTrack.pitStopArea;
          var pdx = nextX - pit.x, pdz = nextZ - pit.z;
          if (Math.sqrt(pdx*pdx + pdz*pdz) < pit.radius + 6.0) {
            maxLatDistance = TrackGenerator.ROAD_HALF_WIDTH + 4.2;
          }
        }

        var dot = forwardX * trackInfo.sample.tx + forwardZ * trackInfo.sample.tz;
        if (dot < -0.2) {
          c.wrongWayTimer = (c.wrongWayTimer || 0) + delta;
        } else {
          c.wrongWayTimer = Math.max(0, (c.wrongWayTimer || 0) - delta * 2);
        }
        c.wrongWay = (c.wrongWayTimer > 1.2);

        var isOnSand = (trackInfo.sample.surface === 1) || (Math.abs(trackInfo.latDist) > TrackGenerator.ROAD_HALF_WIDTH);
        if (isOnSand) {
          var sandSlow = 0.16 * c.upgrades.sandMult;
          c.speed *= (1.0 - sandSlow * delta);
          if (Math.abs(c.speed) > 4.0) {
            if (Math.random() < 0.65) spawnDustParticles(nextX, c.y, nextZ, 2);
            if (Math.random() < 0.12 && window.AudioEngine) AudioEngine.playFX('sand');
          }
        }

        if(Math.abs(trackInfo.latDist) > maxLatDistance) {
          var sign = trackInfo.latDist > 0 ? 1 : -1;
          var s = trackInfo.sample;
          var perpX = -s.tz, perpZ = s.tx;

          nextX = s.x + perpX * (maxLatDistance * sign);
          nextZ = s.z + perpZ * (maxLatDistance * sign);
          c.speed *= 0.6;

          if (damageEnabled && Math.abs(c.speed) > 5.0) {
            c.damage += delta * 0.15 * c.upgrades.dmgMult;
            if (c.damage > 1.0) c.damage = 1.0;
            spawnSparkParticles(nextX, c.y + 0.3, nextZ, 3);
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

        if (boostersEnabled && currentTrack.boosters) {
          for (var b = 0; b < currentTrack.boosters.length; b++) {
            var bst = currentTrack.boosters[b];
            var bdx = nextX - bst.x, bdz = nextZ - bst.z;
            if (Math.sqrt(bdx*bdx + bdz*bdz) < bst.radius) {
              c.speed = carMaxSpeedSetting * 1.15;
              c.boostGlowTimer = 1.0;
              if (window.AudioEngine) AudioEngine.playFX('kiihdytin');
              break;
            }
          }
        }

        if ((tireWearEnabled || damageEnabled) && currentTrack.pitStopArea && c.pitCooldown <= 0 && c.pitTimer === 0) {
          var pit = currentTrack.pitStopArea;
          var ptx = nextX - pit.x, ptz = nextZ - pit.z;
          if (Math.sqrt(ptx*ptx + ptz*ptz) < pit.radius && (c.tireWear > 0.10 || c.damage > 0.05)) {
            c.pitTimer = 3.0;
            c.speed = 0;
            c.driftVx = 0;
            c.driftVz = 0;
            if (window.AudioEngine) AudioEngine.playFX('varikko');
          }
        }

        c.x = nextX;
        c.z = nextZ;
        c.y = getRoadSurfaceHeight(currentTrack, c.x, c.z, c.y);

        c.mesh.position.set(c.x, c.y, c.z);
        c.mesh.rotation.y = c.angle;

        c.currentLapTime += delta;
        var currentSampleIdx = trackInfo.sampleIndex;

        if(currentSampleIdx > n * 0.4 && currentSampleIdx < n * 0.6) {
          c.passedMidpoint = true;
        }

        if(c.lastSampleIdx > n - 25 && currentSampleIdx < 25 && c.passedMidpoint) {
          if (isQualifying) {
            finishQualifyingLap(c);
            return;
          }

          c.laps++;
          c.lapTimeRemaining = timeLimitSetting > 0 ? timeLimitSetting : 0;

          if(c.bestLapTime === null || c.currentLapTime < c.bestLapTime) {
            c.bestLapTime = c.currentLapTime;
          }
          c.currentLapTime = 0;
          c.passedMidpoint = false;

          if(c.laps >= targetLaps) {
            c.finished = true;
            c.finishRank = ++finishCounter;
            c.mesh.visible = false;
            if (window.AudioEngine) AudioEngine.stopCarEngineSound(c);
            if (window.AudioEngine) AudioEngine.playFX('finish');
            positionTouchControls();
          }
        }
        c.lastSampleIdx = currentSampleIdx;
        c.totalDist = c.laps * currentTrack.totalLength + (currentSampleIdx / n) * currentTrack.totalLength;

      } else {
        var trackLen = currentTrack.totalLength;
        
        if (tireWearEnabled || damageEnabled) {
          c.tireWear += (c.aiSpeed / carMaxSpeedSetting) * delta * 0.022;
          if ((c.tireWear > 0.75 || c.damage > 0.4) && currentTrack.pitStopArea && c.pitCooldown <= 0 && c.pitTimer === 0) {
            var pit = currentTrack.pitStopArea;
            var ptx = c.x - pit.x, ptz = c.z - pit.z;
            if (Math.sqrt(ptx*ptx + ptz*ptz) < pit.radius) {
              c.pitTimer = 3.0;
              c.tireWear = 0.0;
              c.damage = 0.0;
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
        c.y = getRoadSurfaceHeight(currentTrack, c.x, c.z, c.y);
        c.angle = Math.atan2(aiDir.x, aiDir.z);

        if (boostersEnabled && currentTrack.boosters) {
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

        var aiTrackInfo = closestSampleInfo(currentTrack, c.x, c.z, c.y);
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

          if(c.laps >= targetLaps) {
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

          if (damageEnabled) {
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

    if (isCareerMode && !careerTransitionTimeout) {
      var allHumansFinished = cars.filter(function(c) { return c.isHuman; }).every(function(c) { return c.finished; });
      if (allHumansFinished) {
        handleCareerRaceFinish();
      }
    }

    updateCollectibles(delta);
    updateOrbScatterParticles(delta);
    updateSplashParticles(delta);
    updateDustParticles(delta);
    updateSmokeParticles(delta);
    updateSparkParticles(delta);
    updatePrecipitation(delta);
    updateMinimap();
    updateHudUI();
    updateCameras();
  }

  function updateCameras() {
    var camDist = 8.5, camHeight = 3.2;
    var cams = [camera, camera2, camera3, camera4];

    for(var i = 0; i < numPlayers; i++) {
      if(cars.length > i) {
        var p = cars[i];
        var cam = cams[i];

        var targetCamX = p.x - Math.sin(p.angle) * camDist;
        var targetCamZ = p.z - Math.cos(p.angle) * camDist;
        var targetCamY = p.y + camHeight;

        cam.position.x = lerp(cam.position.x, targetCamX, 0.12);
        cam.position.y = lerp(cam.position.y, targetCamY, 0.12);
        cam.position.z = lerp(cam.position.z, targetCamZ, 0.12);

        cam.lookAt(
          p.x + Math.sin(p.angle) * 4,
          p.y + 1.2,
          p.z + Math.cos(p.angle) * 4
        );
      }
    }
  }

  /* ---------------------------------------------------------------
     GENEROINTI JA HALLINTA
  --------------------------------------------------------------- */
  var currentTrack=null, terrainInfo=null;
  var terrainMesh=null, roadMesh=null, curbMesh=null, postMesh=null, forestMesh=null, finishLineMesh=null;
  var bridgeMeshGroup=null, boosterGroup=null, pitStopGroup=null;
  var treesVisible=true, curbsVisible=true;

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

  function regenerateAll(){
    if (!isCareerMode) stopRace();
    updateEnvironmentAtmosphere();
    buildClouds();

    TrackGenerator.resetNoiseSeed();

    disposeMesh(terrainMesh); disposeMesh(roadMesh); disposeMesh(curbMesh);
    disposeMesh(postMesh); disposeMesh(forestMesh); disposeMesh(finishLineMesh);
    disposeMesh(bridgeMeshGroup); disposeMesh(boosterGroup); disposeMesh(pitStopGroup);
    clearSkidMarks();

    var track = TrackGenerator.buildTrackPath();
    currentTrack = track;

    var terr = TrackGenerator.buildTerrain(track, currentEnvironment, currentSeason, texturesEnabled, loadTextureWithFallback, ENV_TEXTURE_PATHS);
    terrainMesh = terr.mesh; terrainInfo = terr.bounds;
    scene.add(terrainMesh);

    roadMesh = TrackGenerator.buildRoad(track, texturesEnabled, loadTextureWithFallback, ENV_TEXTURE_PATHS, currentEnvironment, gravelEnabled); scene.add(roadMesh);
    curbMesh = TrackGenerator.buildCurbs(track); scene.add(curbMesh);
    postMesh = TrackGenerator.buildDelineators(track, curbStyle); scene.add(postMesh);
    forestMesh = TrackGenerator.buildForest(track, terrainInfo, currentEnvironment, currentSeason, currentTimeOfDay, texturesEnabled, loadTextureWithFallback, CITY_TEXTURE_PATHS, HITECH_TEXTURE_PATHS, CAR_TEXTURE_PATHS); scene.add(forestMesh);
    finishLineMesh = TrackGenerator.buildFinishLine(track); scene.add(finishLineMesh);
    
    bridgeMeshGroup = TrackGenerator.buildBridgeStructures(track); scene.add(bridgeMeshGroup);

    if (typeof TrackGenerator.buildBoosters === 'function') {
      var bData = TrackGenerator.buildBoosters(track, boostersEnabled, texturesEnabled, loadTextureWithFallback, ENV_TEXTURE_PATHS);
      boosterGroup = bData.group;
      track.boosters = bData.boosters;
      if (boosterGroup) scene.add(boosterGroup);
    }

    if (typeof TrackGenerator.buildPitStop === 'function') {
      var pData = TrackGenerator.buildPitStop(track, tireWearEnabled || damageEnabled, texturesEnabled, loadTextureWithFallback, ENV_TEXTURE_PATHS);
      pitStopGroup = pData.group;
      track.pitStopArea = pData.pitStopArea;
      if (pitStopGroup) scene.add(pitStopGroup);
    }

    puddlesList = TrackGenerator.buildPuddles(track, waterGroup, waterEnabled, puddleCubeRenderTarget.texture);
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
  }

  /* ---------------------------------------------------------------
     UI-TAPAHTUMAT
  --------------------------------------------------------------- */
  var regenBtn = document.getElementById('regenBtn');
  if (regenBtn) regenBtn.addEventListener('click', regenerateAll);

  var drawTrackBtn = document.getElementById('drawTrackBtn');
  if (drawTrackBtn) {
    drawTrackBtn.addEventListener('click', function() {
      var modal = document.getElementById('drawTrackModal');
      if (modal) {
        modal.style.display = 'flex';
        customDrawnPoints = [];
        redrawCanvas();
      }
    });
  }

  var randomEnvBtn = document.getElementById('randomEnvBtn');
  if (randomEnvBtn) {
    randomEnvBtn.addEventListener('click', randomizeEnvironmentAndTrack);
  }

  var raceBtn = document.getElementById('raceBtn');
  if (raceBtn) {
    raceBtn.addEventListener('click', function(){
      if(isRacing) stopRace(); else initRace();
    });
  }

  var timeSelect = document.getElementById('timeSelect');
  if (timeSelect) {
    timeSelect.addEventListener('change', function(e){
      currentTimeOfDay = e.target.value;
      updateEnvironmentAtmosphere();
      buildClouds();
      updatePuddleReflections();
    });
  }

  var seasonSelect = document.getElementById('seasonSelect');
  if (seasonSelect) {
    seasonSelect.addEventListener('change', function(e){
      currentSeason = e.target.value;
      regenerateAll();
    });
  }

  var envSelect = document.getElementById('envSelect');
  if (envSelect) {
    envSelect.addEventListener('change', function(e){
      currentEnvironment = e.target.value;
      regenerateAll();
    });
  }

  var rainBtn = document.getElementById('rainBtn');
  var fogBtn = document.getElementById('fogBtn');
  var cloudsBtn = document.getElementById('cloudsBtn');

  if (rainBtn) {
    rainBtn.addEventListener('click', function(e){
      isRain = !isRain;
      rainBtn.textContent = isRain ? '🌧️ Sade On' : '🌧️ Sade Off';
      rainBtn.classList.toggle('active', isRain);

      if (isRain && isFog) {
        isFog = false;
        if (fogBtn) {
          fogBtn.textContent = '🌫️ Sumu Off';
          fogBtn.classList.remove('active');
        }
      }

      if (isRain && !isClouds) {
        isClouds = true;
        if (cloudsBtn) {
          cloudsBtn.textContent = '☁️ Pilvet On';
          cloudsBtn.classList.add('active');
        }
        buildClouds();
      }
      updateEnvironmentAtmosphere();
      updatePuddleReflections();
    });
  }

  if (fogBtn) {
    fogBtn.addEventListener('click', function(e){
      isFog = !isFog;
      fogBtn.textContent = isFog ? '🌫️ Sumu On' : '🌫️ Sumu Off';
      fogBtn.classList.toggle('active', isFog);

      if (isFog && isRain) {
        isRain = false;
        if (rainBtn) {
          rainBtn.textContent = '🌧️ Sade Off';
          rainBtn.classList.remove('active');
        }
      }

      updateEnvironmentAtmosphere();
    });
  }

  if (cloudsBtn) {
    cloudsBtn.addEventListener('click', function(e){
      if (isRain && isClouds) {
        isRain = false;
        if (rainBtn) {
          rainBtn.textContent = '🌧️ Sade Off';
          rainBtn.classList.remove('active');
        }
      }

      isClouds = !isClouds;
      cloudsBtn.textContent = isClouds ? '☁️ Pilvet On' : '☁️ Pilvet Off';
      cloudsBtn.classList.toggle('active', isClouds);
      buildClouds();
      updatePuddleReflections();
    });
  }

  var autoRotate=false;
  var rotateBtn = document.getElementById('rotateBtn');
  if (rotateBtn) {
    rotateBtn.addEventListener('click', function(e){
      if(isRacing) stopRace();
      autoRotate=!autoRotate;
      controls.autoRotate=autoRotate;
      e.target.classList.toggle('active', autoRotate);
    });
  }

  var treesBtn = document.getElementById('treesBtn');
  if (treesBtn) {
    treesBtn.addEventListener('click', function(e){
      treesVisible=!treesVisible;
      if(forestMesh) forestMesh.visible=treesVisible;
      e.target.classList.toggle('active', treesVisible);
      updatePuddleReflections();
    });
  }

  var curbBtn = document.getElementById('curbBtn');
  if (curbBtn) {
    curbBtn.addEventListener('click', function(e){
      curbsVisible=!curbsVisible;
      if(curbMesh) curbMesh.visible=curbsVisible;
      if(postMesh) postMesh.visible=curbsVisible;
      e.target.classList.toggle('active', curbsVisible);
    });
  }

  var texturesBtn = document.getElementById('texturesBtn');
  if (texturesBtn) {
    texturesBtn.addEventListener('click', function(e){
      texturesEnabled = !texturesEnabled;
      window.texturesEnabled = texturesEnabled;
      e.target.textContent = texturesEnabled ? '🖼️ Tekstuurit On' : '🖼️ Tekstuurit Off';
      e.target.classList.toggle('active', texturesEnabled);
      regenerateAll();
    });
  }

  var waterBtn = document.getElementById('waterBtn');
  if (waterBtn) {
    waterBtn.addEventListener('click', function(e){
      waterEnabled = !waterEnabled;
      e.target.textContent = waterEnabled ? '🌊 Vesi On' : '🌊 Vesi Off';
      e.target.classList.toggle('active', waterEnabled);
      if (currentTrack) puddlesList = TrackGenerator.buildPuddles(currentTrack, waterGroup, waterEnabled, puddleCubeRenderTarget.texture);
      updatePuddleReflections();
    });
  }

  var flyActive=false, flyT=0;
  var flyBtn = document.getElementById('flyBtn');
  if (flyBtn) {
    flyBtn.addEventListener('click', function(e){
      if(isRacing) stopRace();
      flyActive=!flyActive;
      if(flyActive){
        autoRotate=false; controls.autoRotate=false;
        if (rotateBtn) rotateBtn.classList.remove('active');
      }
      e.target.classList.toggle('active', flyActive);
    });
  }

  /* ---------------------------------------------------------------
     KÄYNNISTYS JA ANIMAATIO
  --------------------------------------------------------------- */
  setupIntroOverlay();
  initDrawCanvasEvents();
  regenerateAll();
  setTimeout(function(){
    var l=document.getElementById('loading');
    if(l) {
      l.style.opacity='0';
      setTimeout(function(){ l.remove(); }, 650);
    }
  }, 350);

  var clock=new THREE.Clock();

  function animate(){
    requestAnimationFrame(animate);
    var delta=clock.getDelta();

    renderPreviewsAnimation();

    if (isClouds && cloudGroup) {
      cloudGroup.rotation.y += delta * 0.01;
    }

    var isStereoOn = stereoActive && (numPlayers === 1);

    if(isRacing) {
      updatePhysics(delta);

      var w = innerWidth;
      var h = innerHeight;

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

      updatePrecipitation(delta);

      if(isStereoOn) {
        var w = innerWidth, h = innerHeight;
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
        renderer.setViewport(0, 0, innerWidth, innerHeight);
        renderer.render(scene, camera);
      }
    } else {
      controls.update(delta);
      updatePrecipitation(delta);

      if(isStereoOn) {
        var w = innerWidth, h = innerHeight;
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
        renderer.setViewport(0, 0, innerWidth, innerHeight);
        renderer.render(scene, camera);
      }
    }
  }

  animate();

  window.addEventListener('resize', function(){
    renderer.setSize(innerWidth, innerHeight);
    positionHuds();
    positionTouchControls();
  });

})();
