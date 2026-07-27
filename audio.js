// audio.js - Modulaarinen äänimoottori (Taustamusiikit, FX-efektit ja Moottoriäänet)
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
    finish: 'finish.mp3'
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

    var engineAudio = new Audio('moottori.mp3');
    engineAudio.loop = true;
    engineAudio.volume = 0;
    engineAudio.playbackRate = 1.0;

    carObj.engineAudio = engineAudio;

    if (activeEngineCars.indexOf(carObj) === -1) {
      activeEngineCars.push(carObj);
    }
  }

  function startCarEngineSound(carObj) {
    if (carObj && carObj.engineAudio) {
      carObj.engineAudio.currentTime = 0;
      carObj.engineAudio.volume = fxVolume;
      carObj.engineAudio.play().catch(function() {});
    }
  }

  function stopCarEngineSound(carObj) {
    if (carObj && carObj.engineAudio) {
      carObj.engineAudio.pause();
      carObj.engineAudio.currentTime = 0;
    }
  }

  function setCarEngineVolume(carObj, vol) {
    if (carObj && carObj.engineAudio) {
      carObj.engineAudio.volume = vol;
    }
  }

  function updateCarEngineSound(carObj, isGas, speed, maxSpeed) {
    if (!carObj || !carObj.engineAudio) return;

    carObj.engineAudio.volume = fxVolume;
    if (isGas && speed > 0) {
      var speedRatio = Math.min(1.0, Math.max(0, speed / maxSpeed));
      carObj.engineAudio.playbackRate = 1.0 + speedRatio * 0.85;
    } else {
      carObj.engineAudio.playbackRate = 1.0;
    }
  }

  function stopAllEngineSounds() {
    activeEngineCars.forEach(function(c) {
      if (c.engineAudio) {
        c.engineAudio.pause();
        c.engineAudio.currentTime = 0;
      }
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

  // Rekisteröidään AudioEngine ikkuna-olioon HTML-tiedoston käyttöä varten
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