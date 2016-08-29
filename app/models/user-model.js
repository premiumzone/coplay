'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  mac: {
    type: String,
    unique: true
  },
  spotifyUsername: String,
  spotifyAvatarURL: String,
  spotifyFullName: String,
  spotifyGuessedFirstName: String,
  spotifyGuessedLastName: String,
  spotifyTopTracks: Array
});

UserSchema.statics.findOrCreate = function(userData, cb) {
  //console.log('UserSchema - finding or creating user', userData);

  const User = this;
  const criteria = { mac: userData.mac };

  this.findOne(criteria, (err, user) => {
    if (err) { throw err; }

    if (!user) {
      console.log('UserSchema - creating new user', userData);
      const newUser = new User(userData);
      newUser.save((err, user) => {
        if (err) { throw err; }
        cb(user);
      });
    } else {
      cb(user);
    }
  });
};

UserSchema.statics.updateOrCreate = function(userData, cb) {
  //console.log('UserSchema.statics.updateOrCreate - userData: ', userData);

  const criteria = { mac: userData.mac };
  const options = {
    upsert: true,
    setDefaultsOnInsert: true,
    new: true,
    fields: '-_id -__v'
  };

  this.findOneAndUpdate(criteria, userData, options, (err, user) => {
    if (err) { throw err; }

    cb(user);
  });
};

UserSchema.statics.findByMac = function(mac, cb) {
  console.log('UserSchema.statics.findByMac - mac: ', mac);

  if (!mac || typeof(mac) !== 'string') {
    throw Error(`Invalid mac address (${mac}).`);
  }
  if (typeof(cb) !== 'function') {
    throw Error('Invalid callback.');
  }

  const criteria = { mac: mac };
  const options = {
    '_id': 0,
    '__v': 0
  };

  this.findOne(criteria, options, (err, user) => {
    if (err) { throw err; }

    cb(user);
  });
};

UserSchema.statics.findUsersWithSpotifyTracks = function(cb) {
  const criteria = {
    spotifyTopTracks: {
      $exists: true,
      $not: {
        $size: 0
      }
    }
  };
  const options = {
    '_id': 0,
    '__v': 0
  };

  this.find(criteria, options, (err, user) => {
    if (err) { throw err; }

    cb(user);
  });
};

module.exports = mongoose.model('User', UserSchema);
