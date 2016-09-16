'use strict';

const express = require('express');

const UserController = require('../controllers/user-controller');
const ZoneController = require('../controllers/zone-controller');
const SpotifyController = require('../controllers/spotify-controller');

const Routes = function(app) {
  const router = express.Router();

  router.post('/user', UserController.createUser);

  router.post('/register', ZoneController.register);
  router.get('/zone', ZoneController.zone);
  router.get('/whoami', ZoneController.whoami);

  router.get('/playlist', SpotifyController.getSharedPlaylistTracks);
  router.post('/playlist', SpotifyController.populateSharedPlaylist);

  app.use('/api/v1', router);
};

module.exports = Routes;
