'use strict';

const socketIO = require('socket.io');

let socketIOServer;
const connectedSockets = {
};

const SocketService = {
  setup: function(httpServer) {
    socketIOServer = socketIO(httpServer);
    socketIOServer.on('connection', SocketService._onSocketClientConnected);
  },

  /**
   * @param {String} subject
   * @param {Object} msg
   * @param {String} zone
   */
  broadcast: function(subject, msg, zone) {
    console.log('SOCKET BROADCAST:', subject, msg, zone);

    if (!connectedSockets.hasOwnProperty(zone)) {
      console.log(
        'SocketService - can\'t broadcast ' +
        `- unknown zone '${zone}'`
      );
      return;
    }

    if (!connectedSockets[zone].length) {
      console.log(
        'SocketService - can\'t broadcast ' +
        `- no connected sockets for zone '${zone}'`
      );
      return;
    }

    connectedSockets[zone].forEach(s => s.emit(subject, msg));
  },

  _onSocketClientConnected: function(socket) {
    const key = String(
      process.env.PUBLIC_TEST_IP ||  // if e.g. running locally
      socket.handshake.headers['x-forwarded-for'] ||
      socket.handshake.headers.address ||
      socket.handshake.address
    );

    console.log('SocketIO client connected!', socket.id, key);

    socket.on('disconnect', () => {
      SocketService._onSocketClientDisconnected(socket);
    });

    if (!connectedSockets.hasOwnProperty(key)) {
      connectedSockets[key] = [];
    }
    connectedSockets[key].push(socket);

    const s = {};
    Object.keys(connectedSockets).forEach((k) => {
      s[k] = connectedSockets[k].length;
    });
    console.log(' - List of connected sockets: ', s);
  },

  _onSocketClientDisconnected: function(socket) {
    const key = String(
      process.env.PUBLIC_TEST_IP ||  // if e.g. running locally
      socket.handshake.headers['x-forwarded-for'] ||
      socket.handshake.headers.address ||
      socket.handshake.address
    );

    console.log('SocketIO client disconnected!', socket.id, key);

    const index = connectedSockets[key]
      .map(s => s.id)
      .indexOf(socket.id);

    if (index === -1) {
      console.warn(
        `Could not locate disconnected socket of id '${socket.id}' ` +
        `in list of connected sockets for the zone ${key}`
      );
    } else {
      //console.log(
        //`Located disconnected socket of id '${socket.id}' in list of ` +
        //`connected sockets for the zone ${key} - index was ${index}`
      //);
      connectedSockets[key].splice(index, 1);
    }

    const s = {};
    Object.keys(connectedSockets).forEach((k) => {
      s[k] = connectedSockets[k].length;
    });
    console.log(' - List of connected sockets: ', s);
  }
};

module.exports = {
  'setup': SocketService.setup,
  'broadcast': SocketService.broadcast
};
