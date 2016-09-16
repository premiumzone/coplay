'use strict';

const SocketService = require('../services/socket-service');
const UserModel = require('../models/user-model');

const WebhookController = {
  webhook: function(req, res) {
    const data = req.body;

    if (!data || typeof(data) !== 'object') {
      res.sendStatus(404).end();
      return;
    }

    console.log('INCOMING WEBHOOK - data: ', data);

    let user = data.client;

    switch(data.event_type) {  // jshint ignore:line
      case 'connected':
        // look up proper user object of connecting user
        UserModel.findByUsername(user.userId, (persistedUser) => {
          if (persistedUser) {
            user = persistedUser;
          }
          SocketService.broadcast('user_connected', user, data.zone);
        });
        break;

      case 'disconnected':
        // look up proper user object of disconnecting user
        UserModel.findByUsername(user.userId, (persistedUser) => {
          if (persistedUser) {
            user = persistedUser;
          }
          SocketService.broadcast('user_disconnected', user, data.zone);
        });
        break;

      default:
        console.log('Unhandled webhook event_type: ', data.event_type);  // jshint ignore:line
    }

    res.sendStatus(200).end();
  }
};

module.exports = WebhookController;
