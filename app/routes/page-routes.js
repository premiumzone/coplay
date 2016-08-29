'use strict';

const express = require('express');
const PageController = require('../controllers/page-controller');

const Routes = function(app, port) {
  const router = express.Router();

  PageController.setPort(port);

  router.get('/*', PageController.index);

  app.use('/', router);
};

module.exports = Routes;
