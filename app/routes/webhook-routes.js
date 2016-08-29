'use strict';

const express = require('express');

const WebhookController = require('../controllers/webhook-controller');

const Routes = function(app) {
  const router = express.Router();

  router.post('/webhook', WebhookController.webhook);

  app.use('/', router);
};

module.exports = Routes;
