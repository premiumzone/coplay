'use strict';

const request = require('request');
const UserModel = require('../models/user-model');

const config = require('../../config');

const ZoneController = {
  /**
   * API request controller to check if request is coming form the zone
   * Renders JSON true/false on res.
   */
  zone: function(req, res) {
    const requestIP = process.env.PUBLIC_TEST_IP || req.ip;  // use env var to manually set IP if e.g. running locally
    const url = `${config.zoneAPI.baseURL}/zone?ip=${requestIP}&apikey=${config.zoneAPI.key}`;

    request.get({url: url}, (err, httpResponse, body) => {
      if (err) {
        console.error('Failed to fetch current zone from zone API: ', err);
        res.json(JSON.parse(err));
        return;
      }

      const data = JSON.parse(body);
      if (!('clients' in data) || !(data.clients instanceof Array) || !data.clients.length) {
        return res.json(data);
      }

      // look up proper user objects for each connected client
      const lookupUser = function(index, cb) {
        UserModel.findByUsername(data.clients[index].userId, (user) => {
          if (user) {
            data.clients[index] = user;
          }

          if (index+1 === data.clients.length) {
            return cb();
          }

          lookupUser(++index, cb);
        });
      };

      lookupUser(0, () => {
        res.json(data);
      });
    });
  },

  whoami: function(req, res) {
    request.get({url: config.whoamiURL}, (err, httpResponse, body) => {
      if (err) {
        console.error('Failed to request MAC address from RGW: ', err);
        res.json(JSON.parse(err));
        return;
      }

      const data = JSON.parse(body);
      res.json(data);
    });
  },

  register: function(req, res) {
    const url = `${config.zoneAPI.baseURL}/register?apikey=${config.zoneAPI.key}`;
    const userData = req.body.user;

    request.post({
      url: url,
      form: { mac: userData.mac, userId: userData.spotifyUsername }
    }, (err, httpResponse, body) => {
      if (err) {
        console.error('Failed to register client to API:', err);
        res.json(JSON.parse(err));
        return;
      }

      const data = JSON.parse(body);
      res.json(data);
    });
  }
};

module.exports = ZoneController;
