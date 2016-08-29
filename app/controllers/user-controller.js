'use strict';

const UserModel = require('../models/user-model');
const SocketService = require('../services/socket-service');

const UserController = {
  /**
   * Updates user in database.
   *
   * Expects request body to contain a user object with
   * user's MAC address and the user properties to update
   */
  createUser: function(req, res) {
    console.log('UserController.createUser');

    const userData = req.body.user;
    const requestIP = process.env.PUBLIC_TEST_IP || req.ip;  // use env var to manually set IP if e.g. running locally

    if (!userData) {
      res.status(400).json({ error: 'Invalid request, missing user.' });
      return;
    }

    UserModel.findByMac(userData.mac, (user) => {
      if (user && user.spotifyTopTracks && user.spotifyTopTracks.length) {
        return res.status(409).json({
          'error': 'User has already added Spotify tracks.'
        });
      }

      UserModel.updateOrCreate(userData, (user) => {
        console.log('UPDATED OR CREATED USER: ', user, requestIP);
        SocketService.broadcast('user_updated', user, requestIP);
        res.json(user);
      });
    });
  }
};

module.exports = UserController;
