(function() {
  'use strict';
  window.teliaCoplay = window.teliaCoplay || {};
  /* globals io */

  var _socket = io(
    document.location.protocol + '//' +
    document.location.host
  );

  _socket.on('connect', function() {
    if (typeof(teliaCoplay.onSocketConnected) === 'function') {
      teliaCoplay.onSocketConnected.apply(null, arguments);
    }
  });

  _socket.on('disconnect', function() {
    if (typeof(teliaCoplay.onSocketDisconnected) === 'function') {
      teliaCoplay.onSocketDisconnected.apply(null, arguments);
    }
  });

  _socket.on('user_connected', function(user) {
    if (typeof(teliaCoplay.onUserConnected) === 'function') {
      teliaCoplay.onUserConnected.call(null, user);
    }
  });

  _socket.on('user_disconnected', function(user) {
    if (typeof(teliaCoplay.onUserDisconnected) === 'function') {
      teliaCoplay.onUserDisconnected.call(null, user);
    }
  });

  _socket.on('user_updated', function(user) {
    if (typeof(teliaCoplay.onUserUpdated) === 'function') {
      teliaCoplay.onUserUpdated.call(null, user);
    }
  });


  teliaCoplay.socketClient = {};
})();
