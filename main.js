// main.js - Pelilogiikka, käyttöliittymä, tilaohjaus ja UI-integraatio
(function() {
  'use strict';

  /* ---------------------------------------------------------------
     MOBIILILAITTEEN TUNNISTUS
  --------------------------------------------------------------- */
  var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                 (('ontouchstart' in window) && (navigator.maxTouchPoints > 0));
  var defaultControlMethod = isMobile ? "touch" : "keyboard";

  /* ---------------------------------------------------------------
     GLOBAALIT MUUTTUJAT JA PELITILA
  --------------------------------------------------------------- */
  var texturesEnabled = true;
  window.texturesEnabled = texturesEnabled;

  var waterEnabled = true;
  var gravelEnabled = true;
  var speedometerEnabled = false;

  // Peliasetukset
  var damageEnabled = false;            // Vahingot On/Off
  var fuelEnabled = false;              // Polttoaineen kulutus On/Off
  var refuelEnabled = false;            // Tankkaus kisassa On/Off
  var tunnelEnabled = false;            // Tunneli On/Off
  var passingLaneEnabled = false;      // Ohituskaista On/Off
  var timeLimitSetting = 0;            // Aikaraja (0 = Off)
  var qualifyingEnabled = false;       // Aika-ajot On/Off
  var collectiblesEnabled = false;     // Keräily On/Off
  var preGenCareerTracksEnabled = false; // Ennakkoradat uralle On/Off
  var minimapEnabled = false;          // Ratakuva On/Off
  var rearviewMirrorEnabled = false;   // Taustapeili On/Off
  var ballGameDuration = 3;            // Pallopelin kesto minuutteina (oletus 3 min)

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

  // Radan piirto canvas-tila
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

  var numCompetitors = 2;
  var numPlayers = 1;
  var targetLaps = 3;

  var playerConfigs = [
    { name: "Pelaaja 1", ctrl: defaultControlMethod, color: "#d42419", texIdx: 1, model: "forder", cameraPos: "far" },
    { name: "Pelaaja 2", ctrl: defaultControlMethod, color: "#28a745", texIdx: 1, model: "forder", cameraPos: "far" },
    { name: "Pelaaja 3", ctrl: defaultControlMethod, color: "#eb8b00", texIdx: 1, model: "forder", cameraPos: "far" },
    { name: "Pelaaja 4", ctrl: defaultControlMethod, color: "#8e24aa", texIdx: 1, model: "forder", cameraPos: "far" }
  ];

  var previewScenes = [];
  var pendingUploadPlayerIdx = null;

  var ENV_TEXTURE_PATHS = {
    grass: 'nurmikko.jpg',
    kukkamaa: 'kukkamaa.jpg',
    suo: 'suo.jpg',
    pyramidi: 'pyramidi.jpg',
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
    { id: 'forder', name: 'Forder' },
    { id: 'porcher', name: 'Porcher' },
    { id: 'lotuser', name: 'Lotuser' },
    { id: 'pontiacer', name: 'Pontiacer' },
    { id: 'lambo', name: 'Lambo' },
    { id: 'ferrarer', name: 'Ferrarer' },
    { id: 'simple', name: 'Simple (Perus)' },
    { id: 'custom_upload', name: '➕ Lataa oma malli...' }
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
     INTRO OVERLAY SETUP
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
  function formatTime(sec) {
    if (sec === null || sec === undefined || isNaN(sec)) return "--:--.-";
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    var ms = Math.floor((sec % 1) * 10);
    var mStr = m < 10 ? "0" + m : "" + m;
    var sStr = s < 10 ? "0" + s : "" + s;
    return mStr + ":" + sStr + "." + ms;
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

  /* ---------------------------------------------------------------
     RADAN GENERUONTI & PÄIVITYS 3D-MOOTTORIIN (GAMECORE)
  --------------------------------------------------------------- */
  function regenerateAll() {
    if (!isCareerMode && window.GameCore) GameCore.stopRace();

    var state = getGameState();
    if (window.GameCore) {
      GameCore.regenerateAll(state);
    }
  }

  function generateCustomDrawnTrack() {
    if (!isCareerMode && window.GameCore) GameCore.stopRace();

    var state = getGameState();
    if (window.GameCore) {
      GameCore.generateCustomDrawnTrack(customDrawnPoints, drawCanvas ? drawCanvas.width : 460, drawCanvas ? drawCanvas.height : 420, state);
    }
  }

  function getGameState() {
    return {
      texturesEnabled: texturesEnabled,
      waterEnabled: waterEnabled,
      gravelEnabled: gravelEnabled,
      damageEnabled: damageEnabled,
      fuelEnabled: fuelEnabled,
      refuelEnabled: refuelEnabled,
      tunnelEnabled: tunnelEnabled,
      passingLaneEnabled: passingLaneEnabled,
      timeLimitSetting: timeLimitSetting,
      collectiblesEnabled: collectiblesEnabled,
      boostersEnabled: boostersEnabled,
      tireWearEnabled: tireWearEnabled,
      carMaxSpeedSetting: carMaxSpeedSetting,
      carAccelSetting: carAccelSetting,
      curbStyle: curbStyle,
      isRain: isRain,
      isFog: isFog,
      isClouds: isClouds,
      currentTimeOfDay: currentTimeOfDay,
      currentSeason: currentSeason,
      currentEnvironment: currentEnvironment,
      aiDifficulty: aiDifficulty,
      numCompetitors: numCompetitors,
      numPlayers: numPlayers,
      targetLaps: targetLaps,
      playerConfigs: playerConfigs,
      ENV_TEXTURE_PATHS: ENV_TEXTURE_PATHS,
      CITY_TEXTURE_PATHS: CITY_TEXTURE_PATHS,
      HITECH_TEXTURE_PATHS: HITECH_TEXTURE_PATHS,
      CAR_TEXTURE_PATHS: CAR_TEXTURE_PATHS,
      PRESET_PALETTES: PRESET_PALETTES,
      loadTextureWithFallback: loadTextureWithFallback,
      getAiSpeedForDifficulty: getAiSpeedForDifficulty
    };
  }

  /* ---------------------------------------------------------------
     RATAKUVA (MINIMAP)
  --------------------------------------------------------------- */
  function updateMinimap() {
    var canvas = document.getElementById('minimapCanvas');
    if (!canvas || !window.GameCore) return;

    var currentTrack = GameCore.getTrack();
    var terrainInfo = GameCore.getTerrainInfo();
    var cars = GameCore.getCars();
    var isRacing = GameCore.getIsRacing();

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
      ctxCanvas.lineWidth = 7.0;
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

  /* ---------------------------------------------------------------
     OMAN JS-AUTOMALLIN LATAAMINEN & SÄÄTÖ
  --------------------------------------------------------------- */
  function initCustomCarFileLoader() {
    var customFileInput = document.getElementById('customCarFileInput');
    if (!customFileInput) return;

    customFileInput.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) {
        revertSelect();
        return;
      }

      var reader = new FileReader();
      reader.onload = function(evt) {
        var code = evt.target.result;
        var existingKeys = Object.keys(window.CAR_MODELS || {});

        try {
          var scriptEl = document.createElement('script');
          scriptEl.textContent = code;
          document.body.appendChild(scriptEl);

          var newKeys = Object.keys(window.CAR_MODELS || {}).filter(function(k) {
            return existingKeys.indexOf(k) === -1;
          });

          var newModelKey = newKeys.length > 0 ? newKeys[newKeys.length - 1] : null;

          if (!newModelKey) {
            var allKeys = Object.keys(window.CAR_MODELS || {});
            if (allKeys.length > 0) newModelKey = allKeys[allKeys.length - 1];
          }

          if (newModelKey) {
            var friendlyName = 'Ladattu: ' + newModelKey;
            var customIndex = CAR_MODELS_LIST.findIndex(function(m) { return m.id === 'custom_upload'; });
            if (customIndex !== -1) {
              CAR_MODELS_LIST.splice(customIndex, 0, { id: newModelKey, name: friendlyName });
            } else {
              CAR_MODELS_LIST.push({ id: newModelKey, name: friendlyName });
            }

            refreshCarModelSelects();

            if (pendingUploadPlayerIdx !== null) {
              playerConfigs[pendingUploadPlayerIdx].model = newModelKey;
              var container = document.getElementById('modalCardsContainer');
              if (container) {
                var sel = container.querySelector('.car-model-select[data-player="' + pendingUploadPlayerIdx + '"]');
                if (sel) sel.value = newModelKey;
              }
              updatePreviewMesh(pendingUploadPlayerIdx);
            }
          } else {
            alert('⚠️ Tiedostosta ei löytynyt yhteensopivaa window.CAR_MODELS -mallia!');
            revertSelect();
          }
        } catch (err) {
          alert('⚠️ Virhe ladattaessa automallia: ' + err.message);
          revertSelect();
        }
      };
      reader.readAsText(file);
    });
  }

  function revertSelect() {
    if (pendingUploadPlayerIdx !== null) {
      var container = document.getElementById('modalCardsContainer');
      if (container) {
        var sel = container.querySelector('.car-model-select[data-player="' + pendingUploadPlayerIdx + '"]');
        if (sel) sel.value = playerConfigs[pendingUploadPlayerIdx].model;
      }
    }
  }

  function refreshCarModelSelects() {
    var container = document.getElementById('modalCardsContainer');
    if (!container) return;
    container.querySelectorAll('.car-model-select').forEach(function(ms) {
      var pIdx = parseInt(ms.getAttribute('data-player'));
      var curVal = playerConfigs[pIdx].model;
      ms.innerHTML = '';
      CAR_MODELS_LIST.forEach(function(m) {
        var opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name;
        if (m.id === curVal) opt.selected = true;
        ms.appendChild(opt);
      });
    });
  }

  /* ---------------------------------------------------------------
     PELAAJIEN ASETUKSET JA ESIKATSELU
  --------------------------------------------------------------- */
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
      html += '<label>📹 Kameran sijainti:</label>';
      html += '<select class="camera-pos-select" data-player="' + i + '">';
      html += '<option value="far"' + ((cfg.cameraPos === 'far' || !cfg.cameraPos) ? ' selected' : '') + '>📷 Kaukana (Oletus)</option>';
      html += '<option value="near"' + (cfg.cameraPos === 'near' ? ' selected' : '') + '>🔍 Lähellä</option>';
      html += '<option value="windshield"' + (cfg.cameraPos === 'windshield' ? ' selected' : '') + '>🏎️ Tuulilasi</option>';
      html += '<option value="topdown"' + (cfg.cameraPos === 'topdown' ? ' selected' : '') + '>⬇️ Ylhäältä Alas</option>';
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

    container.querySelectorAll('.camera-pos-select').forEach(function(sel) {
      sel.addEventListener('change', function(e) {
        var pIdx = parseInt(e.target.getAttribute('data-player'));
        playerConfigs[pIdx].cameraPos = e.target.value;
      });
    });

    container.querySelectorAll('.car-model-select').forEach(function(ms) {
      ms.addEventListener('change', function(e) {
        var pIdx = parseInt(e.target.getAttribute('data-player'));
        var selectedVal = e.target.value;

        if (selectedVal === 'custom_upload') {
          pendingUploadPlayerIdx = pIdx;
          var fileInput = document.getElementById('customCarFileInput');
          if (fileInput) {
            fileInput.value = '';
            fileInput.click();
          }
        } else {
          playerConfigs[pIdx].model = selectedVal;
          updatePreviewMesh(pIdx);
        }
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
    var carMesh = GameCore ? GameCore.buildCarMesh(cfg.color, '#ffffff', carTexUrl, cfg.model) : new THREE.Group();
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
    ps.carMesh = GameCore ? GameCore.buildCarMesh(cfg.color, '#ffffff', carTexUrl, cfg.model) : new THREE.Group();
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

  // AUTOEDITORIN NAPIN & MODAALIN TAPAHTUMAT
  var openCarEditorBtn = document.getElementById('openCarEditorBtn');
  var carEditorModal = document.getElementById('carEditorModal');
  var carEditorFrame = document.getElementById('carEditorFrame');
  var closeCarEditorModalBtn = document.getElementById('closeCarEditorModalBtn');

  if (openCarEditorBtn) {
    openCarEditorBtn.addEventListener('click', function() {
      if (carEditorModal) {
        carEditorModal.style.display = 'flex';
        if (carEditorFrame) carEditorFrame.src = 'car_editor.html';
      }
    });
  }

  if (closeCarEditorModalBtn) {
    closeCarEditorModalBtn.addEventListener('click', function() {
      if (carEditorModal) {
        carEditorModal.style.display = 'none';
        if (carEditorFrame) carEditorFrame.src = '';
      }
    });
  }

  /* ---------------------------------------------------------------
     ASETUKSET-MODAALI SÄÄDÖT
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

  var fuelBtn = document.getElementById('fuelBtn');
  var refuelBtn = document.getElementById('refuelBtn');

  if (fuelBtn) {
    fuelBtn.addEventListener('click', function() {
      fuelEnabled = !fuelEnabled;
      fuelBtn.textContent = fuelEnabled ? '⛽ Polttoaine On' : '⛽ Polttoaine Off';
      fuelBtn.classList.toggle('active', fuelEnabled);
      if (refuelBtn) refuelBtn.style.display = fuelEnabled ? 'block' : 'none';
      regenerateAll();
    });
  }

  if (refuelBtn) {
    refuelBtn.addEventListener('click', function() {
      refuelEnabled = !refuelEnabled;
      refuelBtn.textContent = refuelEnabled ? '⛽ Tankkaus On' : '⛽ Tankkaus Off';
      refuelBtn.classList.toggle('active', refuelEnabled);
      regenerateAll();
    });
  }

  var tunnelBtn = document.getElementById('tunnelBtn');
  if (tunnelBtn) {
    tunnelBtn.addEventListener('click', function() {
      tunnelEnabled = !tunnelEnabled;
      tunnelBtn.textContent = tunnelEnabled ? '🚇 Tunneli On' : '🚇 Tunneli Off';
      tunnelBtn.classList.toggle('active', tunnelEnabled);
      regenerateAll();
    });
  }

  var passingLaneBtn = document.getElementById('passingLaneBtn');
  if (passingLaneBtn) {
    passingLaneBtn.addEventListener('click', function() {
      passingLaneEnabled = !passingLaneEnabled;
      passingLaneBtn.textContent = passingLaneEnabled ? '🏎️ Ohituskaista On' : '🏎️ Ohituskaista Off';
      passingLaneBtn.classList.toggle('active', passingLaneEnabled);
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

  var ballGameDurationInput = document.getElementById('ballGameDurationInput');
  if (ballGameDurationInput) {
    ballGameDurationInput.addEventListener('change', function(e) {
      var val = parseInt(e.target.value) || 3;
      ballGameDuration = THREE.MathUtils.clamp(val, 1, 10);
      e.target.value = ballGameDuration;
      localStorage.setItem('ballGameDuration', ballGameDuration);
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
      if (window.GameCore) GameCore.spawnCollectiblesOnTrack();
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
      if (window.GameCore) GameCore.setRearviewMirrorEnabled(rearviewMirrorEnabled);
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
     OHJAIMET JA STEREO-SÄÄDÖT
  --------------------------------------------------------------- */
  if (window.PlayerControls) {
    PlayerControls.initListeners(function() { return window.GameCore ? GameCore.getIsRacing() : false; });
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
      var active = window.GameCore ? GameCore.toggleStereo() : false;
      stereoBtn.classList.toggle('active', active);
      if (stereoControls) stereoControls.style.display = active ? 'block' : 'none';
    });
  }

  if (eyeDistSlider) {
    eyeDistSlider.addEventListener('input', function(e){
      var dist = parseFloat(e.target.value) || 0.15;
      if (window.GameCore) GameCore.setStereoEyeDist(dist);
      if (eyeDistVal) eyeDistVal.innerText = dist.toFixed(2) + "m";
    });
  }

  if (imgOffsetSlider) {
    imgOffsetSlider.addEventListener('input', function(e){
      var offset = parseInt(e.target.value) || 0;
      if (window.GameCore) GameCore.setStereoImageOffset(offset);
      if (imgOffsetVal) imgOffsetVal.innerText = offset + "px";
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
          if (window.GameCore) GameCore.setStereoActive(false);
          stereoBtn.classList.remove('active');
          if (stereoControls) stereoControls.style.display = 'none';
        }
      }
    });
  }

  function positionHuds() {
    var huds = [
      document.getElementById('hudP1'),
      document.getElementById('hudP2'),
      document.getElementById('hudP3'),
      document.getElementById('hudP4')
    ];

    for(var i=0; i<4; i++) if (huds[i]) huds[i].style.display = 'none';

    var isRacing = GameCore ? GameCore.getIsRacing() : false;
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

    var isRacing = GameCore ? GameCore.getIsRacing() : false;
    var cars = GameCore ? GameCore.getCars() : [];
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
    var cars = GameCore ? GameCore.getCars() : [];
    var isRacing = GameCore ? GameCore.getIsRacing() : false;
    var isCountdown = GameCore ? GameCore.getIsCountdown() : false;

    for(var i = 0; i < numPlayers; i++) {
      var c = cars[i];
      var pNum = i + 1;
      var hudBox = document.getElementById('hudP' + pNum);
      if (!hudBox) continue;

      if (c) {
        var html = '<h3 style="color:' + c.colorCss + ';">' + pIcons[i] + ' ' + c.name + '</h3>';
        if (c.finished) {
          if (c.outOfFuel) {
            html += '<div style="font-size:0.85rem; font-weight:900; color:#ef4444; margin:4px 0;">⛽ POLTTOAINE LOPPUI!</div>';
            html += '<div class="hud-row"><span>Sijoitus:</span><span class="hud-val" style="font-size:0.95rem; color:#ef4444;">' + c.finishRank + '. / ' + numCompetitors + '</span></div>';
          } else if (c.timeOut) {
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

          if (fuelEnabled) {
            var fuelPct = Math.round(c.fuel);
            var fuelColor = fuelPct <= 20 ? '#ef4444' : (fuelPct <= 45 ? '#ffaa00' : '#28a745');
            html += '<div class="hud-row"><span>Polttoaine:</span><span class="hud-val" style="color:' + fuelColor + '; font-weight:800;">' + fuelPct + '%</span></div>';
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
            var pitMsg = refuelEnabled ? '🛞 VARIKKO / TANKKAUS: ' : '🛞 VARIKKO: ';
            html += '<div class="wrong-way-banner" style="color:#000000; border-color:#0284c7; background:rgba(2,132,199,0.15);">' + pitMsg + c.pitTimer.toFixed(1) + 's</div>';
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
        var statusIcon = car.outOfFuel ? ' ⛽' : (car.timeOut ? ' ⏰' : (car.finished ? ' 🏁' : ''));
        htmlLb += '<div class="lb-item">';
        htmlLb += '<span>' + pos + '.</span>';
        htmlLb += '<span class="lb-badge" style="background:' + car.colorCss + ';"></span>';
        htmlLb += '<span>' + car.name + statusIcon + '</span>';
        htmlLb += '</div>';
      }
      lb.innerHTML = htmlLb;
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
    var state = getGameState();
    if (window.GameCore) {
      GameCore.startSoloQualifyingLap(qualifyingCurrentPlayerIdx, state);
    }

    setupRaceUI();
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
      var cars = GameCore ? GameCore.getCars() : [];
      for (var i = numPlayers; i < numCompetitors; i++) {
        qualifyingResults.push({
          carIdx: i,
          name: cars[i] ? cars[i].name : "AI " + i,
          bestTime: (18.0 + Math.random() * 8.0)
        });
      }

      qualifyingResults.sort(function(a, b) { return a.bestTime - b.bestTime; });

      isQualifying = false;
      startMainRaceWithGridOrder();
    }
  }

  function startMainRaceWithGridOrder() {
    if (window.AudioEngine) AudioEngine.tryPlayMusic();

    var state = getGameState();
    if (window.GameCore) {
      GameCore.startMainRaceWithGridOrder(qualifyingResults, state);
    }

    setupRaceUI();
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
    if (qualifyingEnabled && !isQualifying) {
      startQualifyingPhase();
      return;
    }

    if (window.AudioEngine) AudioEngine.tryPlayMusic();

    var state = getGameState();
    if (window.GameCore) {
      GameCore.initRace(state);
    }

    setupRaceUI();
  }

  function stopRace(){
    isQualifying = false;
    isCareerMode = false;

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

    if (window.GameCore) {
      GameCore.stopRace();
    }

    if (window.PlayerControls) PlayerControls.resetTouchState();

    positionHuds();
    positionTouchControls();
    var raceBtn = document.getElementById('raceBtn');
    if (raceBtn) raceBtn.classList.remove('active');
  }

  var exitRaceBtn = document.getElementById('exitRaceBtn');
  if (exitRaceBtn) exitRaceBtn.addEventListener('click', stopRace);

  /* ---------------------------------------------------------------
     KAUPPA (SHOP) KISOJEN VÄLIIN URATILASSA
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

    var cars = GameCore ? GameCore.getCars() : [];

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
    var cars = GameCore ? GameCore.getCars() : [];

    for (var i = 0; i < numPlayers; i++) {
      var inp = window.PlayerControls ? PlayerControls.getPlayerControls(i, playerConfigs, numPlayers) : {};
      var car = cars[i];
      if (!car) continue;

      var prev = prevShopInputStates[i];

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
     URA-TILAN LOGIIKKA
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
    var cars = GameCore ? GameCore.getCars() : [];
    var finishCounter = GameCore ? GameCore.getFinishCounter() : 0;

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

  // ALOITA PALLOPELI -NAPIN KUUNTELIJA (Tallennetaan kaikki valitut ympäristötyypit)
  var ballGameBtn = document.getElementById('ballGameBtn');
  if (ballGameBtn) {
    ballGameBtn.addEventListener('click', function() {
      localStorage.setItem('ballGameDuration', ballGameDuration);
      localStorage.setItem('numPlayers', numPlayers);
      localStorage.setItem('numCompetitors', numCompetitors);
      localStorage.setItem('playerConfigs', JSON.stringify(playerConfigs));
      localStorage.setItem('currentEnvironment', currentEnvironment);
      localStorage.setItem('currentSeason', currentSeason);
      localStorage.setItem('currentTimeOfDay', currentTimeOfDay);
      localStorage.setItem('texturesEnabled', texturesEnabled);
      localStorage.setItem('isRain', isRain);
      localStorage.setItem('isFog', isFog);
      localStorage.setItem('isClouds', isClouds);
      window.location.href = 'pallopeli.html';
    });
  }

  var randomEnvBtn = document.getElementById('randomEnvBtn');
  if (randomEnvBtn) {
    randomEnvBtn.addEventListener('click', randomizeEnvironmentAndTrack);
  }

  var raceBtn = document.getElementById('raceBtn');
  if (raceBtn) {
    raceBtn.addEventListener('click', function(){
      var isRacing = GameCore ? GameCore.getIsRacing() : false;
      if(isRacing) stopRace(); else initRace();
    });
  }

  var timeSelect = document.getElementById('timeSelect');
  if (timeSelect) {
    timeSelect.addEventListener('change', function(e){
      currentTimeOfDay = e.target.value;
      if (window.GameCore) {
        GameCore.updateEnvironmentAtmosphere(currentTimeOfDay, currentSeason, currentEnvironment, isFog);
        GameCore.buildClouds(isClouds, currentTimeOfDay, isRain);
        GameCore.updatePuddleReflections();
      }
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
      }

      if (window.GameCore) {
        GameCore.setIsRain(isRain);
        GameCore.setIsClouds(isClouds);
        GameCore.updateEnvironmentAtmosphere(currentTimeOfDay, currentSeason, currentEnvironment, isFog);
        GameCore.buildClouds(isClouds, currentTimeOfDay, isRain);
        GameCore.updatePuddleReflections();
      }
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
        if (window.GameCore) GameCore.setIsRain(false);
      }

      if (window.GameCore) {
        GameCore.setIsFog(isFog);
        GameCore.updateEnvironmentAtmosphere(currentTimeOfDay, currentSeason, currentEnvironment, isFog);
      }
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
        if (window.GameCore) GameCore.setIsRain(false);
      }

      isClouds = !isClouds;
      cloudsBtn.textContent = isClouds ? '☁️ Pilvet On' : '☁️ Pilvet Off';
      cloudsBtn.classList.toggle('active', isClouds);

      if (window.GameCore) {
        GameCore.setIsClouds(isClouds);
        GameCore.buildClouds(isClouds, currentTimeOfDay, isRain);
        GameCore.updatePuddleReflections();
      }
    });
  }

  var curbStyleSelect = document.getElementById('curbStyleSelect');
  if (curbStyleSelect) {
    curbStyleSelect.addEventListener('change', function(e) {
      curbStyle = e.target.value;
      regenerateAll();
    });
  }

  var rotateBtn = document.getElementById('rotateBtn');
  if (rotateBtn) {
    rotateBtn.addEventListener('click', function(e){
      if(GameCore && GameCore.getIsRacing()) stopRace();
      var active = GameCore ? GameCore.toggleAutoRotate() : false;
      e.target.classList.toggle('active', active);
    });
  }

  var treesBtn = document.getElementById('treesBtn');
  if (treesBtn) {
    treesBtn.addEventListener('click', function(e){
      var visible = GameCore ? GameCore.toggleTreesVisible() : true;
      e.target.classList.toggle('active', visible);
    });
  }

  var curbBtn = document.getElementById('curbBtn');
  if (curbBtn) {
    curbBtn.addEventListener('click', function(e){
      var visible = GameCore ? GameCore.toggleCurbsVisible() : true;
      e.target.classList.toggle('active', visible);
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
      if (window.GameCore) GameCore.setWaterEnabled(waterEnabled);
      regenerateAll();
    });
  }

  var flyBtn = document.getElementById('flyBtn');
  if (flyBtn) {
    flyBtn.addEventListener('click', function(e){
      if(GameCore && GameCore.getIsRacing()) stopRace();
      var active = GameCore ? GameCore.toggleFlyActive() : false;
      if(active && rotateBtn) rotateBtn.classList.remove('active');
      e.target.classList.toggle('active', active);
    });
  }

  /* ---------------------------------------------------------------
     ALUSTUS JA ANIMAATIOSILMUKKA
  --------------------------------------------------------------- */
  setupIntroOverlay();
  initDrawCanvasEvents();
  initCustomCarFileLoader();

  if (window.GameCore) {
    GameCore.init({
      getGameState: getGameState,
      getPlayerControls: function(playerIdx) {
        return window.PlayerControls ? PlayerControls.getPlayerControls(playerIdx, playerConfigs, numPlayers) : {};
      },
      onQualifyingLapFinish: function(car) {
        finishQualifyingLap(car);
      },
      onCareerRaceFinishCheck: function() {
        if (isCareerMode && !careerTransitionTimeout) {
          var cars = GameCore.getCars();
          var allHumansFinished = cars.filter(function(c) { return c.isHuman; }).every(function(c) { return c.finished; });
          if (allHumansFinished) {
            handleCareerRaceFinish();
          }
        }
      },
      onShopInputHandle: function() {
        if (isShopMode) {
          handleShopInputs();
        }
      },
      renderPreviewsAnimation: renderPreviewsAnimation,
      updateMinimap: updateMinimap,
      updateHudUI: updateHudUI
    });
  }

  regenerateAll();

  setTimeout(function(){
    var l = document.getElementById('loading');
    if(l) {
      l.style.opacity = '0';
      setTimeout(function(){ l.remove(); }, 650);
    }
  }, 350);

})();
