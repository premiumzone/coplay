(function() {
  'use strict';
  window.teliaCoplay = window.teliaCoplay || {};

  var kAPIBaseURL = 'https://api.spotify.com/v1';
  var accessToken = null;

  /**
   * @param {String} endpoint
   * @param {Function} successCallback
   * @param {Function} errorCallback (Optional)
   */
  var _get = function(endpoint, successCallback, errorCallback) {
    if (!accessToken) {
      throw Error('Invalid access token ('+accessToken+')');
    }

    if (typeof(endpoint) !== 'string') {
      throw Error('Invalid argument `endpoint` ('+endpoint+')');
    }

    if (typeof(successCallback) !== 'function') {
      throw Error('Invalid argument `successCallback` ('+successCallback+')');
    }

    var url = kAPIBaseURL + endpoint;

    teliaCoplay.utils.request(url, {
      additionalHeaders: [{name: 'Authorization', value: 'Bearer '+accessToken}],
      onSuccess: successCallback,
      onError: function(responseObj, xhr) {
        if (typeof(errorCallback) === 'function') {
          errorCallback.apply(null, arguments);
          return;
        }

        console.error('error: ', responseObj, xhr);
        if (responseObj && typeof(responseObj) === 'object' && responseObj.error) {
          console.error(' - message:', responseObj.error);
        }
      }
    });
  };

  var spotifyClient = {
    /**
     * @param {String} token
     */
    setAccessToken: function(token) {
      accessToken = token;
    },

    /**
     * @param {Object} user
     */
    formatUser: function(user) {
      var fullName = null;
      if (user.display_name) {  // jshint ignore:line
        fullName = user.display_name;  // jshint ignore:line
      }

      var guessedFirstName = null;
      var guessedLastName = null;
      if (fullName) {
        var arr = fullName.split(' ');
        var remainder = arr.splice(1).join(' ');
        guessedFirstName = arr[0];
        guessedLastName = remainder;
      }

      var avatarURL = null;
      if (user.images && user.images instanceof Array) {
        var firstImageObj = user.images[0];
        if (firstImageObj && firstImageObj.url) {
          avatarURL = firstImageObj.url;
        }
      }

      return {
        username: user.id,
        fullName: fullName,
        guessedFirstName: guessedFirstName,
        guessedLastName: guessedLastName,
        avatarURL: avatarURL
      };
    },

    /**
     * @param {Object} track
     */
    formatTrack: function(track) {
      var artistNames = track.artists.map(function(a) {
        return a.name;
      });

      var artistNamesFormatted = track.artists.map(function(a) {
        return a.name;
      });
      if (artistNamesFormatted.length > 1) {
        artistNamesFormatted =
          artistNamesFormatted.slice(0, -1).join(', ') +
          ' and ' + artistNamesFormatted.slice(-1);
      } else {
        artistNamesFormatted = artistNamesFormatted[0];
      }

      var albumArtURLs = null;
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
     * @param {Function} successCallback
     * @param {Function} errorCallback (Optional)
     */
    getUserDetails: function(successCallback, errorCallback) {
      if (typeof(successCallback) !== 'function') {
        throw Error('Invalid argument `successCallback` ('+successCallback+')');
      }

      _get('/me', successCallback, errorCallback);
    },

    /**
     * @param {Object} customOptions
     * @param {Function} successCallback
     * @param {Function} errorCallback (Optional)
     */
    getUserTopTracks: function(customOptions, successCallback, errorCallback) {
      if (typeof(successCallback) !== 'function') {
        throw Error('Invalid argument `successCallback` ('+successCallback+')');
      }

      var options = {
        'time_range': 'medium_term',
        'limit': 15
      };

      if (customOptions && typeof(customOptions) === 'object') {
        teliaCoplay.utils.extendObject(options, customOptions);
      }

      var qStr = '';
      for (var i in options) {
        if (options.hasOwnProperty(i)) {
          qStr += '&' + i + '=' + options[i];
        }
      }
      if (qStr.substr(0, 1) === '&') {
        qStr = '?' + qStr.substr(1);
      }

      _get('/me/top/tracks'+qStr, function(responseObj) {
        var tracks = responseObj.items;
        if (tracks instanceof Array) {
          tracks = tracks.map(function(t) {
            return spotifyClient.formatTrack(t);
          });
        }
        successCallback(tracks);
      }, errorCallback);
    },

    /**
     * @param {Object} topTracksOptions
     * @param {Function} successCallback
     * @param {Function} errorCallback (Optional)
     */
    getUserDetailsWithTopTracks: function(topTracksOptions, successCallback, errorCallback) {
      if (typeof(successCallback) !== 'function') {
        throw Error('Invalid argument `successCallback` ('+successCallback+')');
      }

      var data = {
        'user': null,
        'topTracks': []
      };

      spotifyClient.getUserDetails(function(userObj) {
        data.user = spotifyClient.formatUser(userObj);

        spotifyClient.getUserTopTracks(topTracksOptions, function(topTracks) {
          data.topTracks = topTracks;
          successCallback(data);
        }, errorCallback);

      }, errorCallback);
    }
  };

  teliaCoplay.spotifyClient = spotifyClient;
})();
