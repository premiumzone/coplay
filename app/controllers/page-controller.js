'use strict';

const SpotifyService = require('../services/spotify-service');

let _port = null;

const PageController = {
  setPort: function(port) {
    _port = port;
  },

  index: function(req, res) {
    let spotifyServerAuthorizeURL = null;
    let spotifyUserAuthorizeURL = null;
    const spotifySharedPlaylistURL = SpotifyService.getSharedPlaylistURL();

    if (!SpotifyService.hasServerTokens()) {
      spotifyServerAuthorizeURL = SpotifyService.getServerAuthorizeURL(
        req,
        _port
      );
    } else {
      spotifyUserAuthorizeURL = SpotifyService.getImplicitGrantAuthURL(
        req,
        _port,
        'user'
      );
    }

    res.render('index', {
      'spotify_user_authorize_url': spotifyUserAuthorizeURL,
      'spotify_server_authorize_url': spotifyServerAuthorizeURL,
      'spotify_shared_playlist_url': spotifySharedPlaylistURL
    });
  },

  spotifyCallback: function(req, res) {
    if (req.query.error) {
      res.render('spotify_callback');
      return;
    }

    if (req.query.code) {
      SpotifyService.getServerTokensFromCode(req.query.code, (err) => {
        if (err) {
          res.json({
            'result': 'error',
            'message': err
          });
          return;
        }

        res.redirect(200, '/');
      });
      return;
    }

    // make sure we render something even if none of the checks above match
    res.render('spotify_callback');
  }
};

module.exports = PageController;
