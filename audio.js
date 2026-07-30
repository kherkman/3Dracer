// audio.js - Modulaarinen äänimoottori (Taustamusiikit, FX-efektit ja Dynamiset Moottoriäänet)
(function() {
  'use strict';

  var MUSIC_TRACKS = [
    { name: 'Musiikki Off', url: '' },
    { name: '🎵 Musiikki 1', url: 'music1.mp3' },
    { name: '🎵 Musiikki 2', url: 'music2.mp3' },
    { name: '🎵 Musiikki 3', url: 'music3.mp3' },
    { name: '🎵 Musiikki 4', url: 'music4.mp3' },
    { name: '🎵 Musiikki 5', url: 'music5.mp3' }
  ];

  var FX_FILES = {
    splash: 'splash.mp3',
    sand: 'sand.mp3',
    collision: 'collision.mp3',
    beep: 'beep.mp3',
    go: 'go.mp3',
    finish: 'finish.mp3',
    jarrutus: 'jarrutus.mp3',
    kiihdytin: 'kiihdytin.mp3',
    pallo: 'pallo.mp3',
    varikko: 'varikko.mp3'
  };

  var currentMusicAudio = null;
  var musicVolume = 0.5;
  var fxVolume = 0.7;
  var musicPlayed = false;
  var lastFxTimes = {};
  var activeEngineCars = [];

  function playSelectedMusic(index) {
    if (currentMusicAudio) {
      currentMusicAudio.pause();
      currentMusicAudio = null;
    }
    var track = MUSIC_TRACKS[index];
    if (!track || !track.url) return;

    currentMusicAudio = new Audio(track.url);
    currentMusicAudio.loop = true;
    currentMusicAudio.volume = musicVolume;
    currentMusicAudio.play().then(function() {
      musicPlayed = true;
    }).catch(function() {});
  }

  function tryPlayMusic() {
    var musicSelect = document.getElementById('musicSelect');
    if (!musicPlayed && musicSelect && parseInt(musicSelect.value) > 0) {
      playSelectedMusic(parseInt(musicSelect.value));
    }
  }

  function playFX(fxKey) {
    if (fxVolume <= 0 || !FX_FILES[fxKey]) return;

    var now = performance.now();
    if (lastFxTimes[fxKey] && now - lastFxTimes[fxKey] < 100) return;
    lastFxTimes[fxKey] = now;

    var audio = new Audio(FX_FILES[fxKey]);
    audio.volume = fxVolume;
    audio.play().catch(function() {});
  }

  function setupCarEngineSound(carObj) {
    if (!carObj) return;

    var idleAudio = new Audio('moottori.mp3');
    idleAudio.loop = true;
    idleAudio.volume = 0;

    var accelAudio = new Audio('kiihdytys.mp3');
    accelAudio.loop = false;
    accelAudio.volume = 0;

    carObj.idleAudio = idleAudio;
    carObj.accelAudio = accelAudio;
    carObj.engineAudioState = 'stopped';

    if (activeEngineCars.indexOf(carObj) === -1) {
      activeEngineCars.push(carObj);
    }
  }

  function startCarEngineSound(carObj) {
    if (carObj && carObj.idleAudio) {
      carObj.engineAudioState = 'idle';
      carObj.idleAudio.currentTime = 0;
      carObj.idleAudio.volume = fxVolume;
      carObj.idleAudio.playbackRate = 1.0;
      carObj.idleAudio.play().catch(function() {});
    }
  }

  function stopCarEngineSound(carObj) {
    if (!carObj) return;
    if (carObj.idleAudio) { carObj.idleAudio.pause(); carObj.idleAudio.currentTime = 0; }
    if (carObj.accelAudio) { carObj.accelAudio.pause(); carObj.accelAudio.currentTime = 0; }
    carObj.engineAudioState = 'stopped';
  }

  function setCarEngineVolume(carObj, vol) {
    if (!carObj) return;
    if (carObj.idleAudio) carObj.idleAudio.volume = vol;
    if (carObj.accelAudio) carObj.accelAudio.volume = vol;
  }

  function updateCarEngineSound(carObj, isGas, speed, maxSpeed) {
    if (!carObj || !carObj.idleAudio) return;

    var vol = fxVolume;
    var safeMaxSpeed = Math.max(1, maxSpeed || 38.0);
    var speedRatio = Math.max(0, speed) / safeMaxSpeed;
    var maxSpeedFactor = safeMaxSpeed / 38.0;

    var targetPitchRate = 0.85 + (speedRatio * 0.95) * maxSpeedFactor;
    if (typeof THREE !== 'undefined' && THREE.MathUtils) {
      targetPitchRate = THREE.MathUtils.clamp(targetPitchRate, 0.7, 2.8);
    } else {
      targetPitchRate = Math.max(0.7, Math.min(2.8, targetPitchRate));
    }

    var isAtMaxSpeed = (speed >= safeMaxSpeed * 0.94);

    if (!isGas) {
      if (carObj.accelAudio) { carObj.accelAudio.pause(); }

      carObj.idleAudio.playbackRate = targetPitchRate;
      if (carObj.engineAudioState !== 'idle') {
        carObj.engineAudioState = 'idle';
        carObj.idleAudio.volume = vol;
        carObj.idleAudio.play().catch(function() {});
      } else {
        carObj.idleAudio.volume = vol;
      }
    } else if (isGas && isAtMaxSpeed) {
      if (carObj.accelAudio) { carObj.accelAudio.pause(); }

      carObj.idleAudio.playbackRate = targetPitchRate;
      if (carObj.engineAudioState !== 'max') {
        carObj.engineAudioState = 'max';
        carObj.idleAudio.volume = vol;
        carObj.idleAudio.play().catch(function() {});
      } else {
        carObj.idleAudio.volume = vol;
      }
    } else {
      if (carObj.idleAudio) { carObj.idleAudio.pause(); }

      if (carObj.accelAudio) {
        carObj.accelAudio.playbackRate = Math.max(0.8, targetPitchRate);
      }

      if (carObj.engineAudioState !== 'accel') {
        carObj.engineAudioState = 'accel';
        if (carObj.accelAudio) {
          carObj.accelAudio.currentTime = 0;
          carObj.accelAudio.volume = vol;
          carObj.accelAudio.play().catch(function() {});
        }
      } else if (carObj.accelAudio) {
        carObj.accelAudio.volume = vol;
      }
    }
  }

  function stopAllEngineSounds() {
    activeEngineCars.forEach(function(c) {
      stopCarEngineSound(c);
    });
    activeEngineCars = [];
  }

  function initUI() {
    var musicSelect = document.getElementById('musicSelect');
    var musicVolSlider = document.getElementById('musicVolSlider');
    var musicVolVal = document.getElementById('musicVolVal');
    var fxVolSlider = document.getElementById('fxVolSlider');
    var fxVolVal = document.getElementById('fxVolVal');

    if (musicSelect) {
      musicSelect.innerHTML = '';
      MUSIC_TRACKS.forEach(function(track, idx) {
        var opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = track.name;
        if (idx === 1) opt.selected = true;
        musicSelect.appendChild(opt);
      });

      musicSelect.addEventListener('change', function(e) {
        playSelectedMusic(parseInt(e.target.value));
      });
    }

    if (musicVolSlider) {
      musicVolSlider.addEventListener('input', function(e) {
        musicVolume = parseFloat(e.target.value);
        if (currentMusicAudio) currentMusicAudio.volume = musicVolume;
        if (musicVolVal) musicVolVal.innerText = Math.round(musicVolume * 100) + "%";
        tryPlayMusic();
      });
    }

    if (fxVolSlider) {
      fxVolSlider.addEventListener('input', function(e) {
        fxVolume = parseFloat(e.target.value);
        if (fxVolVal) fxVolVal.innerText = Math.round(fxVolume * 100) + "%";
      });
    }

    window.addEventListener('pointerdown', tryPlayMusic, { once: true });
  }

  window.AudioEngine = {
    initUI: initUI,
    tryPlayMusic: tryPlayMusic,
    playSelectedMusic: playSelectedMusic,
    playFX: playFX,
    setupCarEngineSound: setupCarEngineSound,
    startCarEngineSound: startCarEngineSound,
    stopCarEngineSound: stopCarEngineSound,
    setCarEngineVolume: setCarEngineVolume,
    updateCarEngineSound: updateCarEngineSound,
    stopAllEngineSounds: stopAllEngineSounds,
    getFXVolume: function() { return fxVolume; },
    getMusicVolume: function() { return musicVolume; }
  };

})();