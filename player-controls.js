// player-controls.js - Pelaajien ohjaus- ja syötelogiikka
(function() {
  'use strict';

  var keysInput = {
    p1: { gas:false, brake:false, left:false, right:false },
    p2: { gas:false, brake:false, left:false, right:false },
    p3: { gas:false, brake:false, left:false, right:false },
    p4: { gas:false, brake:false, left:false, right:false }
  };

  var touchInputState = [
    { gas:false, brake:false, left:false, right:false },
    { gas:false, brake:false, left:false, right:false },
    { gas:false, brake:false, left:false, right:false },
    { gas:false, brake:false, left:false, right:false }
  ];

  var mouseState = { leftDown: false, rightDown: false, xNorm: 0 };

  function initListeners(getIsRacing) {
    window.addEventListener('keydown', function(e){
      var k = e.key.toLowerCase();
      var isRacing = getIsRacing ? getIsRacing() : false;

      if(k==='w') keysInput.p1.gas = true;
      if(k==='s') keysInput.p1.brake = true;
      if(k==='a') keysInput.p1.left = true;
      if(k==='d') keysInput.p1.right = true;

      if(k==='arrowup') { keysInput.p2.gas = true; if(isRacing) e.preventDefault(); }
      if(k==='arrowdown') { keysInput.p2.brake = true; if(isRacing) e.preventDefault(); }
      if(k==='arrowleft') { keysInput.p2.left = true; if(isRacing) e.preventDefault(); }
      if(k==='arrowright') { keysInput.p2.right = true; if(isRacing) e.preventDefault(); }

      if(k==='t') keysInput.p3.gas = true;
      if(k==='g') keysInput.p3.brake = true;
      if(k==='f') keysInput.p3.left = true;
      if(k==='h') keysInput.p3.right = true;

      if(k==='i') keysInput.p4.gas = true;
      if(k==='k') keysInput.p4.brake = true;
      if(k==='j') keysInput.p4.left = true;
      if(k==='l') keysInput.p4.right = true;
    });

    window.addEventListener('keyup', function(e){
      var k = e.key.toLowerCase();

      if(k==='w') keysInput.p1.gas = false;
      if(k==='s') keysInput.p1.brake = false;
      if(k==='a') keysInput.p1.left = false;
      if(k==='d') keysInput.p1.right = false;

      if(k==='arrowup') keysInput.p2.gas = false;
      if(k==='arrowdown') keysInput.p2.brake = false;
      if(k==='arrowleft') keysInput.p2.left = false;
      if(k==='arrowright') keysInput.p2.right = false;

      if(k==='t') keysInput.p3.gas = false;
      if(k==='g') keysInput.p3.brake = false;
      if(k==='f') keysInput.p3.left = false;
      if(k==='h') keysInput.p3.right = false;

      if(k==='i') keysInput.p4.gas = false;
      if(k==='k') keysInput.p4.brake = false;
      if(k==='j') keysInput.p4.left = false;
      if(k==='l') keysInput.p4.right = false;
    });

    window.addEventListener('mousedown', function(e){
      var isRacing = getIsRacing ? getIsRacing() : false;
      if(!isRacing) return;
      if(e.button === 0) mouseState.leftDown = true;
      if(e.button === 2) mouseState.rightDown = true;
    });
    window.addEventListener('mouseup', function(e){
      if(e.button === 0) mouseState.leftDown = false;
      if(e.button === 2) mouseState.rightDown = false;
    });
    window.addEventListener('mousemove', function(e){
      var cx = window.innerWidth / 2;
      mouseState.xNorm = (e.clientX - cx) / cx;
    });
    window.addEventListener('contextmenu', function(e){
      var isRacing = getIsRacing ? getIsRacing() : false;
      if(isRacing) e.preventDefault();
    });
  }

  function bindTouchBtn(btnEl, playerIdx, action) {
    if(!btnEl) return;
    function setAction(active, e) {
      if(e) e.preventDefault();
      touchInputState[playerIdx][action] = active;
      btnEl.classList.toggle('active', active);
    }
    btnEl.addEventListener('pointerdown', function(e){ setAction(true, e); try { btnEl.setPointerCapture(e.pointerId); } catch(err){} });
    btnEl.addEventListener('pointerup', function(e){ setAction(false, e); });
    btnEl.addEventListener('pointercancel', function(e){ setAction(false, e); });
    btnEl.addEventListener('pointerleave', function(e){ setAction(false, e); });
  }

  function bindAllTouchControls() {
    for(var i = 0; i < 4; i++) {
      var pContainer = document.getElementById('touchP' + (i + 1));
      if(pContainer) {
        bindTouchBtn(pContainer.querySelector('.btn-left'), i, 'left');
        bindTouchBtn(pContainer.querySelector('.btn-right'), i, 'right');
        bindTouchBtn(pContainer.querySelector('.btn-brake'), i, 'brake');
        bindTouchBtn(pContainer.querySelector('.btn-gas'), i, 'gas');
      }
    }
  }

  function resetTouchState() {
    for(var i=0; i<4; i++) {
      touchInputState[i] = { gas:false, brake:false, left:false, right:false };
    }
  }

  function getGamepadInputs(gpIndex) {
    var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    var gp = gamepads[gpIndex];
    if(!gp) return { gas:false, brake:false, left:false, right:false };

    var steerAxis = gp.axes[0] || 0;
    var gasButton = (gp.buttons[7] && gp.buttons[7].value > 0.1) || (gp.buttons[0] && gp.buttons[0].pressed);
    var brakeButton = (gp.buttons[6] && gp.buttons[6].value > 0.1) || (gp.buttons[1] && gp.buttons[1].pressed);

    var dLeft = gp.buttons[14] && gp.buttons[14].pressed;
    var dRight = gp.buttons[15] && gp.buttons[15].pressed;

    return {
      gas: !!gasButton,
      brake: !!brakeButton,
      left: steerAxis < -0.2 || dLeft,
      right: steerAxis > 0.2 || dRight
    };
  }

  function getPlayerControls(playerIndex, playerConfigs, numPlayers) {
    var ctrlType = playerConfigs && playerConfigs[playerIndex] ? playerConfigs[playerIndex].ctrl : 'keyboard';

    if(ctrlType === 'touch') {
      return touchInputState[playerIndex];
    } else if(ctrlType === 'keyboard') {
      if(playerIndex === 0) {
        if(numPlayers === 1) {
          return {
            gas: keysInput.p1.gas || keysInput.p2.gas,
            brake: keysInput.p1.brake || keysInput.p2.brake,
            left: keysInput.p1.left || keysInput.p2.left,
            right: keysInput.p1.right || keysInput.p2.right
          };
        }
        return keysInput.p1;
      }
      if(playerIndex === 1) return keysInput.p2;
      if(playerIndex === 2) return keysInput.p3;
      if(playerIndex === 3) return keysInput.p4;
    } else if(ctrlType.indexOf('gamepad') === 0) {
      var gpIdx = parseInt(ctrlType.replace('gamepad', '')) || 0;
      return getGamepadInputs(gpIdx);
    } else if(ctrlType === 'mouse') {
      return {
        gas: mouseState.leftDown,
        brake: mouseState.rightDown,
        left: mouseState.xNorm < -0.12,
        right: mouseState.xNorm > 0.12
      };
    } else if(ctrlType === 'bluetooth') {
      return getGamepadInputs(playerIndex);
    }

    return { gas:false, brake:false, left:false, right:false };
  }

  function pairBluetoothDevice() {
    if(navigator.bluetooth && navigator.bluetooth.requestDevice) {
      navigator.bluetooth.requestDevice({ acceptAllDevices: true })
        .then(function(device) {
          alert("📶 Bluetooth-laite valittu: " + (device.name || "Tuntematon laite"));
        })
        .catch(function(err) {
          alert("Bluetooth-yhdistäminen peruutettiin tai ei tuettu: " + err);
        });
    } else {
      alert("⚠️ Liitä Bluetooth-näppäimistö, gamepad tai hiiri laitteesi asetuksista!");
    }
  }

  window.PlayerControls = {
    initListeners: initListeners,
    bindAllTouchControls: bindAllTouchControls,
    resetTouchState: resetTouchState,
    getPlayerControls: getPlayerControls,
    pairBluetoothDevice: pairBluetoothDevice
  };
})();
