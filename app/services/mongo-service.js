'use strict';

const mongoose = require('mongoose');
const config = require('../../config').database;

const MongoService = function() {
  console.log('Connecting to mongodb server:', config.uri);
  mongoose.connect(config.uri);
};

module.exports = MongoService;
