'use strict';

const fs = require('fs');
const SpotifyWebAPI = require('spotify-web-api-node');
const config = require('../../config').spotify;
const tokensPath = __dirname + '/../../spotify-tokens.json';

const kAPIErrors = {
  'The access token expired': 'access_token_expired'
};

let ServerAPIClient;

const Spotify = {
  /**
   * @param {WebapiError} err The error object returned from the API client
   * @return {String}
   */
  getCodeFromAPIError(err) {
    const message = err.message || '';
    if (kAPIErrors.hasOwnProperty(message)) {
      return kAPIErrors[message];
    } else {
      return 'unknown_error';
    }
  },

  /**
   * @param {Object} track
   */
  formatTrack: function(track) {
    const artistNames = track.artists.map(a => a.name);

    let artistNamesFormatted = track.artists.map(a => a.name);
    if (artistNamesFormatted.length > 1) {
      artistNamesFormatted =
        artistNamesFormatted.slice(0, -1).join(', ') +
        ' and ' + artistNamesFormatted.slice(-1);
    } else {
      artistNamesFormatted = artistNamesFormatted[0];
    }

    let albumArtURLs = null;
    if (track.album && track.album.images && track.album.images instanceof Array) {
      albumArtURLs = track.album.images;
    }

    return {
      title: track.name,
      albumArtURLs: albumArtURLs,
      artistNames: artistNames,
      artistNamesFormatted: artistNamesFormatted,
      uri: track.uri
    };
  },

  /**
   * @param {Function} cb
   */
  getSharedPlaylistTracks: function(cb) {
    console.log('SpotifyService.getSharedPlaylistTracks');

    if (!Spotify.Auth._getServerAccessToken()) {
      console.log('No server access token!');
      Spotify.Auth._refreshServerAccessToken(() => {
        Spotify.getSharedPlaylistTracks(cb);
      });
      return;
    }

    const options = {
      'limit': 100
    };
    const args = [
      config.sharedAccountUsername,
      config.sharedAccountPlaylistID,
      options
    ];

    ServerAPIClient.getPlaylistTracks.apply(ServerAPIClient, args.concat((err, data) => {
      if (err) {
        if (Spotify.getCodeFromAPIError(err) === 'access_token_expired') {
          console.log('Server access token expired!');
          Spotify.Auth._refreshServerAccessToken(() => {
            Spotify.getSharedPlaylistTracks(cb);
          });
          return;
        }

        cb(err);
        return;
      }

      const tracks = data.body.items.map(i => i.track);
      const formattedTracks = tracks.map(t => Spotify.formatTrack(t));
      cb(null, formattedTracks);
    }));
  },

  /**
   * @param {Array<String>} newTrackURIs In the format e.g. ['spotify:track:asdf']
   * @param {Function} cb Callback
   */
  populateSharedPlaylist: function(newTrackURIs, cb) {
    console.log('Spotify.populateSharedPlaylist');

    if (!Spotify.Auth._getServerAccessToken()) {
      console.log('No server access token!');
      Spotify.Auth._refreshServerAccessToken(() => {
        Spotify.populateSharedPlaylist(newTrackURIs, cb);
      });
      return;
    }

    const options = null;
    const args = [
      config.sharedAccountUsername,
      config.sharedAccountPlaylistID,
      newTrackURIs,
      options
    ];

    ServerAPIClient.addTracksToPlaylist.apply(ServerAPIClient, args.concat((err) => {
      if (err) {
        if (Spotify.getCodeFromAPIError(err) === 'access_token_expired') {
          console.log('Server access token expired!');
          Spotify.Auth._refreshServerAccessToken(() => {
            Spotify.populateSharedPlaylist(newTrackURIs, cb);
          });
          return;
        }

        cb(err);
        return;
      }

      Spotify.getSharedPlaylistTracks(cb);
    }));
  }
};

Spotify.Auth = {
  /**
   * Load up the persisted authorization tokens from the file on disk (if any)
   *
   * @param {String} tokenName (Optional) Pass to return a specific token
   * @return {Object|String} The full list of tokens or the value of a specific token
   */
  _getPersistedServerTokens: function(tokenName) {
    let tokens = {};
    try {
      tokens = JSON.parse(
        fs.readFileSync(tokensPath, 'utf8')
      );
    } catch(e) {}

    if (tokenName && typeof(tokenName) === 'string') {
      if (!tokens.hasOwnProperty(tokenName)) {
        return undefined;
      } else {
        return tokens[tokenName];
      }
    } else {
      return tokens;
    }
  },

  /**
   * Stores tokens for the server API client
   * - on disk so it can retrieve them later
   * - on the server API client instance so it can authorize requests
   *
   * @param {Object} newTokens
   */
  _storeServerTokens: function(newTokens) {
    if (!newTokens || typeof(newTokens) !== 'object') {
      throw Error(`Invalid argument \`newTokens\` (${newTokens})`);
    }
    if (newTokens.hasOwnProperty('access_token') && !newTokens.access_token) {  // jshint ignore:line
      throw Error(`Invalid access token (${newTokens.access_token})`);  // jshint ignore:line
    }
    if (newTokens.hasOwnProperty('refresh_token') && !newTokens.refresh_token) {  // jshint ignore:line
      throw Error(`Invalid refresh token (${newTokens.refresh_token})`);  // jshint ignore:line
    }

    const tokens = Spotify.Auth._getPersistedServerTokens();
    for (let p in newTokens) {
      if (newTokens.hasOwnProperty(p)) {
        tokens[p] = newTokens[p];
      }
    }
    fs.writeFileSync(tokensPath, JSON.stringify(tokens), 'utf8');

    if (newTokens.hasOwnProperty('access_token')) {
      ServerAPIClient.setAccessToken(newTokens.access_token);  // jshint ignore:line
    }
    if (newTokens.hasOwnProperty('refresh_token')) {
      ServerAPIClient.setRefreshToken(newTokens.refresh_token);  // jshint ignore:line
    }
  },

  /**
   * Generates a redirect URI to use when generating
   * an authorization URL.
   *
   * @private
   * @param {Request} request
   * @param {Number} port
   * @return {String}
   */
  _getRedirectURI: function(request, port) {
    if (!request || typeof(request) !== 'object') {
      throw Error(`Invalid argument \`request\` (${request})`);
    }

    if (!port || typeof(port) !== 'number') {
      throw Error(`Invalid argument \`port\` (${port})`);
    }

    let uri = `${request.protocol}://${request.hostname}`;

    if (process.env.NODE_ENV !== 'production' && port !== 80) {
      uri += `:${port}`;
    }
    return uri + config.redirectPath;
  },

  /**
   * @param {Function} cb Callback
   */
  _refreshServerAccessToken: function(cb) {
    console.log('Spotify.Auth.refreshServerAccessToken');

    ServerAPIClient.refreshAccessToken((err, data) => {
      if (err) {
        console.error(err);
        throw err;
      }

      const tokens = {};
      if (data.body.hasOwnProperty('access_token')) {
        tokens.access_token = data.body.access_token;  // jshint ignore:line
      }
      if (data.body.hasOwnProperty('refresh_token')) {
        tokens.refresh_token = data.body.refresh_token;  // jshint ignore:line
      }
      Spotify.Auth._storeServerTokens(tokens);

      cb();
    });
  },

  _getServerAccessToken: function() {
    if (!ServerAPIClient) {
      return false;
    }

    return ServerAPIClient.getAccessToken();
  },

  _getServerRefreshToken: function() {
    if (!ServerAPIClient) {
      return false;
    }

    return ServerAPIClient.getRefreshToken();
  },

  /**
   * Checks if the server API client has an access token or
   * a refresh token so it can to obtain a new access token.
   *
   * @return {Boolean}
   */
  hasServerTokens: function() {
    return !!Spotify.Auth._getServerAccessToken() ||
      !!Spotify.Auth._getServerRefreshToken();
  },

  /**
   * Generates a Spotify Auth URL for the "Implicit Grant"
   * authorization flow.
   *
   * @param {Request} request The request from the Express application
   * @param {Number} port The port that the Express application is listening on
   * @param {String} scopeIdentifier What scopes to use from `config.scopes`
   * @return {String}
   */
  getImplicitGrantAuthURL: function(request, port, scopeIdentifier) {
    const redirectURI = escape(Spotify.Auth._getRedirectURI(request, port));

    let scopes = config.scopes[scopeIdentifier];
    if (!scopes || !(scopes instanceof Array) || !scopes.length) {
      throw Error(`Invalid \`scopes\` (${scopes})`);
    }
    scopes = escape(scopes.join(' '));

    const state = 'myState';

    return 'https://accounts.spotify.com/authorize' +
      `?client_id=${config.clientID}` +
      `&redirect_uri=${redirectURI}` +
      `&scope=${scopes}` +
      '&response_type=token' +
      `&state=${state}` +
      `&show_dialog=${config.enforceAuthDialog}`;
  },

  /**
   * Generates a Spotify Auth URL for the "Authorization Code"
   * authorization flow.
   *
   * @param {Request} request The request from the Express application
   * @param {Number} port The port that the Express application is listening on
   * @return {String}
   */
  getServerAuthorizeURL: function(request, port) {
    const redirectURI = escape(Spotify.Auth._getRedirectURI(request, port));

    ServerAPIClient.setRedirectURI(redirectURI);

    const scopes = config.scopes.server;
    if (!scopes || !(scopes instanceof Array) || !scopes.length) {
      throw Error(`Invalid scopes (${scopes})`);
    }

    const state = 'myState';

    return ServerAPIClient.createAuthorizeURL(scopes, state);
  },

  /**
   * @param {String} code
   * @param {Function} cb Callback
   */
  getServerTokensFromCode: function(code, cb) {
    console.log('Spotify.Auth.getServerTokensFromCode');

    if (!code || typeof(code) !== 'string') {
      throw Error(`Invalid argument \`code\` (${code})`);
    }

    ServerAPIClient.authorizationCodeGrant(code, (err, data) => {
      if (err) {
        console.error(err);
        throw err;
      }

      Spotify.Auth._storeServerTokens({
        'access_token': data.body.access_token,  // jshint ignore:line
        'refresh_token': data.body.refresh_token  // jshint ignore:line
      });

      cb(null);
    });
  }
};

const setup = function() {
  console.log('>>>>>>>>> SpotifyService.setup');

  ServerAPIClient = new SpotifyWebAPI({
    clientId: config.clientID,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectURI,
    accessToken: Spotify.Auth._getPersistedServerTokens('access_token'),
    refreshToken: Spotify.Auth._getPersistedServerTokens('refresh_token')
  });

  console.log('SpotifyService.ServerAPIClient – access token: ', Spotify.Auth._getServerAccessToken());
  console.log('SpotifyService.ServerAPIClient - refresh token: ', Spotify.Auth._getServerRefreshToken());
};

module.exports = {
  setup: setup,

  getImplicitGrantAuthURL: Spotify.Auth.getImplicitGrantAuthURL,

  hasServerTokens: Spotify.Auth.hasServerTokens,
  getServerAuthorizeURL: Spotify.Auth.getServerAuthorizeURL,
  getServerTokensFromCode: Spotify.Auth.getServerTokensFromCode,

  populateSharedPlaylist: Spotify.populateSharedPlaylist,
  getSharedPlaylistTracks: Spotify.getSharedPlaylistTracks,
  getSharedPlaylistURL: function() {
    return 'https://open.spotify.com/user/' +
      config.sharedAccountUsername +
      '/playlist/' +
      config.sharedAccountPlaylistID;
  }
};
