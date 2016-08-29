'use strict';

const SpotifyService = require('../services/spotify-service');
const UserModel = require('../models/user-model');

const SpotifyController = {
  getSharedPlaylistTracks: function(req, res) {
    console.log('SpotifyController.getSharedPlaylistTracks');

    SpotifyService.getSharedPlaylistTracks((err, tracks) => {
      if (err) {
        throw err;
      }

      if (!tracks || !tracks.length) {
        return res.json([]);
      }

      // map tracks to the user that added them
      UserModel.findUsersWithSpotifyTracks((users) => {
        if (!users || !users.length) {
          return res.json(tracks);
        }

        tracks.forEach((t, i) => {
          let addedByUser = null;
          for (let n = 0; n < users.length; n++) {
            const userTracks = users[n].spotifyTopTracks.map(t => t.uri);
            if (userTracks.indexOf(t.uri) !== -1) {
              addedByUser = {
                'spotifyAvatarURL': users[n].spotifyAvatarURL
              };
              break;
            }
          }
          tracks[i].added_by = addedByUser;  // jshint ignore:line
        });

        res.json(tracks);
      });
    });
  },

  populateSharedPlaylist: function(req, res) {
    console.log('SpotifyController.populateSharedPlaylist', req.body.tracks);

    let tracks = req.body.tracks;
    if (!tracks || !(tracks instanceof Array) || !tracks.length) {
      res.json({ error: 'Invalid tracks.' });
      return;
    }

    if (typeof(tracks[0]) !== 'string') {
      // `SpotifyService.populateSharedPlaylist` expects tracks
      // in format e.g. ['spotify:track:asdf']
      tracks = tracks.map(t => t.uri);
    }

    SpotifyService.populateSharedPlaylist(tracks, (err, newPlaylistTracks) => {
      if (err) {
        throw err;
      }

      res.json(newPlaylistTracks);
    });
  },
};

module.exports = SpotifyController;
