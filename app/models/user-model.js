'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  spotifyUsername: {
    type: String,
    unique: true
  },
  spotifyAvatarURL: String,
  spotifyFullName: String,
  spotifyGuessedFirstName: String,
  spotifyGuessedLastName: String,
  spotifyTopTracks: Array
});

UserSchema.statics.findOrCreate = function(userData, cb) {
  //console.log('UserSchema - finding or creating user', userData);

  const User = this;
  const criteria = { spotifyUsername: userData.spotifyUsername };

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

  const criteria = { spotifyUsername: userData.spotifyUsername };
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

UserSchema.statics.findByUsername = function(username, cb) {
  console.log('UserSchema.statics.findByUsername - username: ', username);

  if (!username || typeof(username) !== 'string') {
    throw Error(`Invalid username (${username}).`);
  }
  if (typeof(cb) !== 'function') {
    throw Error('Invalid callback.');
  }

  const criteria = { spotifyUsername: username };
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
