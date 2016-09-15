(function() {
  'use strict';
  window.teliaCoplay = window.teliaCoplay || {};

  window.addEventListener('error', function(e) {
    teliaCoplay.utils.trackError(e);
  });

  var main = null;
  var Main = function() {
    var _this = this;

    this._zoneData = {
      'clients': [],
      'isZone': false,
      'zone': null
    };
    this._userData = {};
    this._bubbles = null;
    this._mainHeaderElem = document.querySelector('.js-main-header');
    this._whoamiURL = 'http://192.168.1.1:19191/whoami';

    this._setStateHandlers();

    this._addScrollPrevention();

    this._requestZone(function() {
      if (!_this._validateInZone()) {
        return;
      }

      _this._init.call(_this);
    });
  };

  Main.prototype._init = function() {
    console.debug('%cMain.init', 'font-weight: bold', this);

    if (!this._validateInZone()) {
      return;
    }

    // init bubbles
    this._bubbles = new teliaCoplay.Bubbles(
      '.bubbles__container',
      this._zoneData.clients
    );

    /**
     * @param {Object} user
     */
    teliaCoplay.onUserConnected = teliaCoplay.utils.proxy(function(user) {
      console.debug('%conUserConnected', 'font-weight: bold', user);
      this._bubbles.addNode(user);
    }, this);

    /**
     * @param {Object} user
     */
    teliaCoplay.onUserDisconnected = teliaCoplay.utils.proxy(function(user) {
      console.debug('%conUserDisconnected', 'font-weight: bold', user);
      this._bubbles.removeNode(user.spotifyUsername);
    }, this);

    /**
     * @param {Object} user
     * @param {Boolean} userQueuedTracks (Optional) Defaults to true
     */
    teliaCoplay.onUserUpdated = teliaCoplay.utils.proxy(function(user, userQueuedTracks) {
      if (typeof(userQueuedTracks) !== 'boolean') {
        userQueuedTracks = true;
      }
      console.debug(
        '%conUserUpdated', 'font-weight: bold',
        user,
        userQueuedTracks
      );

      this._bubbles.replaceNode(user.spotifyUsername, user);

      if (!userQueuedTracks) {
        return;
      }

      var myUser = this._getExistingUser();
      if (myUser && typeof(myUser) === 'object' && user.spotifyUsername === myUser.spotifyUsername) {
        // updated user is the same as the local current user
        return;
      }

      if (user.spotifyTopTracks && user.spotifyTopTracks instanceof Array && user.spotifyTopTracks[0]) {
        var username = user.spotifyGuessedFirstName || user.spotifyUsername || 'Someone';

        teliaCoplay.Notification.show({
          preTitle: username + ' added a song',
          title: user.spotifyTopTracks[0].artistNamesFormatted,
          subTitle: user.spotifyTopTracks[0].title,
          imageURL: user.spotifyTopTracks[0].albumArtURLs[1].url,
          icon: 'spotify'
        });
      }
    }, this);

    /**
     * @param {Array<Object>} tracks
     */
    teliaCoplay.onConfirmTracksToAddToPlaylist = teliaCoplay.utils.proxy(function(tracks) {
      console.debug('onConfirmTracksToAddToPlaylist - tracks: ', tracks);

      this._userData.spotifyTopTracks = tracks;

      var _this = this;
      this._renderOverlay('loading', { 'message': 'Saving…' }, function() {
        this._saveUser(this._userData, function(user) {
          console.log('Successfully saved user', user);

          // initially, only add user's first two tracks to the playlist
          // (we might want to add user's other tracks later)
          var tracksToAddToPlaylist = tracks.slice(0, 2);

          _this._updatePlaylistWithUserTracks.call(
            _this,
            tracksToAddToPlaylist,
            teliaCoplay.utils.proxy(_this._onSpotifyPairCompleted, _this)
          );
        });
      });
    }, this);

    var existingUser = this._getExistingUser();
    var spotifyAccessToken = teliaCoplay.utils.getHashParams('access_token');
    if (existingUser && existingUser.spotifyUsername) {
      teliaCoplay.StateManager.setState('/spotify/connected', null, true);
    } else if (spotifyAccessToken) {
      teliaCoplay.spotifyClient.setAccessToken(spotifyAccessToken);
      teliaCoplay.StateManager.setState('/spotify/callback');
    } else {
      teliaCoplay.StateManager.setState('/', null, true);
    }
  };

  /**
   * Check whether there's an existing user already or not
   * @return {Object}
   */
  Main.prototype._getExistingUser = function() {
    return teliaCoplay.utils.getPersistedState('user') || null;
  };

  /**
   * @param {Function} cb Callback
   */
  Main.prototype._requestZone = function(cb) {
    this._renderOverlay('loading');

    var _this = this;
    teliaCoplay.utils.request('/api/v1/zone', {
      onSuccess: function(zoneData) {
        _this._zoneData = zoneData;
        console.log(_this._zoneData);

        // ensure local persisted user (if any) is in sync with zone data
        var existingUser = _this._getExistingUser();
        if (existingUser && _this._zoneData.clients && _this._zoneData.clients.length) {
          teliaCoplay.utils.setPersistedState('user', null);
          var existingUserClient = _this._zoneData.clients.filter(function(c) {
            return c.spotifyUsername === existingUser.spotifyUsername;
          })[0];
          if (existingUserClient && existingUserClient.spotifyUsername) {
            teliaCoplay.utils.setPersistedState('user', existingUserClient);
          }
        }

        cb.call(_this);
      },
      onError: function(err, xhr) {
        console.error('requestZone - error: ', err, xhr);
        alert('Failed to fetch current zone, please try again.');
        teliaCoplay.utils.trackError({
          'message': 'Failed to request zone',
          'details': 'Status: '+xhr.status+' ('+xhr.statusText+')'
        });
      }
    });
  };

  /**
   * @param {Object} userData
   * @param {Function} successCallback
   */
  Main.prototype._saveUser = function(userData, successCallback) {
    var _this = this;

    var onError = function(responseData, request) {
      if (responseData && typeof(responseData) === 'object' && responseData.error) {
        console.error('Failed to save user: ', responseData.error);
        teliaCoplay.utils.trackError({
          'message': 'Failed to save user – status: '+request.status+' ('+request.statusText+')',
          'details': responseData.error
        });
      } else {
        console.error('Failed to save user: ', arguments);
        teliaCoplay.utils.trackError({
          'message': 'Failed to save user – status: '+request.status+' ('+request.statusText+')',
        });
      }

      switch(request.status) {
        case 409:
          teliaCoplay.utils.setPersistedState('user', userData);
          teliaCoplay.onUserUpdated(userData, false);
          teliaCoplay.StateManager.setState('/spotify/connected', userData);
          alert('Oops!\nLooks like you’ve already added your top tracks :)');
          break;

        default: break;
      }
    };

    // 1. Request user's MAC address
    teliaCoplay.utils.request(this._whoamiURL, {
      accept: null,
      contentType: null,
      timeout: 5000,
      onSuccess: function(me) {
        if (typeof(me) === 'string') {
          try {
            me = JSON.parse(me);
          } catch(e) {
            console.error('Failed to parse response from RGW: ', e);
            teliaCoplay.StateManager.setState('/', null, true);
            alert('An error occurred while saving, please try again.');
            return;
          }
        }

        if (!me || !me.mac || typeof(me.mac) !== 'string') {
          console.error('Could not resolve user\'s MAC adress: ', me);
          teliaCoplay.StateManager.setState('/', null, true);
          alert('An error occurred while saving, please try again.');
          return;
        }
        userData.mac = me.mac;

        // 2. Register user with Zone API
        console.log('Registering user…', userData.mac);
        teliaCoplay.utils.request('/api/v1/register', {
          method: 'POST',
          data: JSON.stringify({ user: userData }),
          onSuccess: function(response) {
            console.log('successful reigster', response);

            // 3. Persist user in database
            console.log('Saving user…', userData);
            teliaCoplay.utils.request('/api/v1/user', {
              method: 'POST',
              data: JSON.stringify({ user: userData }),
              onSuccess: function(response) {
                if (response && typeof(response) === 'object' && response.code === 'ECONNRESET') {
                  onError.apply(_this, arguments);
                } else {
                  teliaCoplay.utils.setPersistedState('user', response);
                  successCallback.apply(_this, arguments);
                }
              },
              onError: onError
            });
          },
          onError: function(response, request) {
            console.log('Failed to register user:', response, request);
            teliaCoplay.utils.trackError({
              'message': 'Failed to register user with Zone API',
              'details': 'Status: '+request.status+' ('+request.statusText+')'
            });
            alert('An error occurred, please try again.');
            teliaCoplay.StateManager.setState('/');
          }
        });
      },
      onError: function(response, request) {
        console.error('Failed to request user\'s MAC address: ', response, request);
        teliaCoplay.utils.trackError({
          'message': 'Failed to request user\'s MAC address',
          'details': 'Status: '+request.status+' ('+request.statusText+')'
        });
        alert('An error occurred, please try again.');
        teliaCoplay.StateManager.setState('/');
      }
    });
  };

  /**
   * @param {Array<Object>} userTracks
   * @param {Function} cb Callback
   */
  Main.prototype._updatePlaylistWithUserTracks = function(userTracks, cb) {
    console.log('Updating shared playlist with user\'s top tracks…');

    teliaCoplay.utils.request('/api/v1/playlist', {
      method: 'POST',
      data: JSON.stringify({ tracks: userTracks }),
      onSuccess: function(newPlaylistTracks) {
        console.debug(
          'Successfully updated playlist with new tracks - new playlist:',
          newPlaylistTracks
        );
        cb(newPlaylistTracks);
      },
      onError: function(responseText, xhr) {
        console.error('updatePlaylistWithUserTracks error: ', arguments);
        teliaCoplay.utils.trackError({
          'message': 'Failed to update playlist with user\'s tracks',
          'details': 'Status: '+xhr.status+' ('+xhr.statusText+')'
        });
      }
    });
  };

  /**
   * @param {Array<Object} playlistTracks
   */
  Main.prototype._onSpotifyPairCompleted = function(playlistTracks) {
    var user = this._getExistingUser();

    console.log('Spotify pair completed', user, playlistTracks);

    this._renderOverlay('loading', { 'message': 'Connected!' }, function() {
      setTimeout(function() {
        teliaCoplay.StateManager.setState('/spotify/connected', user);

        setTimeout(function() {
          teliaCoplay.Notification.show({
            preTitle: 'You added a song',
            title: user.spotifyTopTracks[0].artistNamesFormatted,
            subTitle: user.spotifyTopTracks[0].title,
            imageURL: user.spotifyTopTracks[0].albumArtURLs[1].url,
            icon: 'spotify'
          });
        }, 1000);
      }, 1000);
    });
  };

  Main.prototype._setStateHandlers = function() {
    teliaCoplay.StateManager.addStateHandler(
      '/',
      teliaCoplay.utils.proxy(this._onStateInitial, this)
    );

    teliaCoplay.StateManager.addStateHandler(
      '/not-in-zone',
      teliaCoplay.utils.proxy(this._onStateNotInZone, this)
    );

    teliaCoplay.StateManager.addStateHandler(
      '/spotify/connected',
      teliaCoplay.utils.proxy(this._onStateConnectedWithSpotify, this)
    );

    teliaCoplay.StateManager.addStateHandler(
      '/spotify/callback',
      teliaCoplay.utils.proxy(this._onStateSpotifyCallback, this)
    );

    teliaCoplay.StateManager.addStateHandler(
      '/spotify/skip',
      teliaCoplay.utils.proxy(this._onStateSkipSpotifyConnect, this)
    );

    teliaCoplay.StateManager.addStateHandler(
      '/user/info',
      teliaCoplay.utils.proxy(this._onStateUserInfo, this)
    );

    teliaCoplay.StateManager.addStateHandler(
      '/help',
      teliaCoplay.utils.proxy(this._onStateHelp, this)
    );

    teliaCoplay.StateManager.addStateHandler(
      '/playlist',
      teliaCoplay.utils.proxy(this._onStatePlaylist, this)
    );
  };

  /**
   * Check if user is in the zone or not
   * @return {Boolean}
   */
  Main.prototype._validateInZone = function() {
    var inZone = this._zoneData.isZone;

    if (!inZone) {
      teliaCoplay.StateManager.setState('/not-in-zone');
    }

    return inZone;
  };

  /**
   * @param {String} templateName Pass `null` to just hide the current page
   * @param {Object} data (Optional)
   * @param {Function} cb (Optional) Callback to execute when element rendered and visible
   * @param {Boolean} setStaticContentInactive (Optional) Defaults to true
   */
  Main.prototype._renderPage = function(templateName, data, cb, setStaticContentInactive) {
    if (typeof(setStaticContentInactive) !== 'boolean') {
      setStaticContentInactive = true;
    }

    var _this = this;
    var contentElem = teliaCoplay.StateManager.getStateContentElem();
    var staticContentElems = document.querySelectorAll('.js-state-content--static');

    var onOverlayHidden = function() {
      teliaCoplay.utils.removeClass(contentElem, 'state-content--visible');

      var hideAnimDuration;
      if (!teliaCoplay.utils.elementIsVisible(contentElem)) {
        hideAnimDuration = 0;
      } else {
        hideAnimDuration = teliaCoplay.utils.getCSSTransitionDuration(contentElem, 'opacity');
      }

      teliaCoplay.utils.setClass(
        contentElem,
        'state-content--joined-with-static',
        !setStaticContentInactive
      );

      if (setStaticContentInactive) {
        Array.prototype.forEach.call(staticContentElems, function(elem) {
          teliaCoplay.utils.setClass(
            elem,
            'state-content--inactive',
            templateName !== null
          );
        });
      }

      setTimeout(function() {
        if (templateName === null) {
          contentElem.innerHTML = '';
          contentElem.style.display = 'none';
          if (typeof(cb) === 'function') {
            cb.call(_this);
          }
          return;
        }

        contentElem.style.display = '';

        teliaCoplay.utils.renderAndInsertTemplate(
          templateName,
          data,
          contentElem,
          function() {
            teliaCoplay.utils.addClass(contentElem, 'state-content--visible');

            setTimeout(function() {
              if (typeof(cb) === 'function') {
                cb.call(_this);
              }
            }, teliaCoplay.utils.getCSSTransitionDuration(contentElem, 'opacity'));
          }
        );
      }, teliaCoplay.utils.getCSSTransitionDuration(contentElem, 'opacity'));
    };

    this._renderOverlay(null, null, onOverlayHidden);
  };

  /**
   * @param {String} templateName Pass `null` to just hide the overlay
   * @param {Object} data (Optional)
   * @param {Function} cb (Optional) Callback to execute when element rendered and visible
   */
  Main.prototype._renderOverlay = function(templateName, data, cb) {
    var _this = this;
    var overlayElem = teliaCoplay.StateManager.getStateOverlayContentElem();
    var contentElem = teliaCoplay.StateManager.getStateContentElem();
    var staticContentElems = document.querySelectorAll('.js-state-content--static');

    teliaCoplay.utils.removeClass(overlayElem, 'state-content--visible');
    teliaCoplay.utils.setClass(
      contentElem,
      'state-content--inactive',
      templateName !== null
    );

    Array.prototype.forEach.call(staticContentElems, function(elem) {
      teliaCoplay.utils.setClass(
        elem,
        'state-content--inactive',
        templateName !== null
      );
    });

    var hideAnimDuration;
    if (!teliaCoplay.utils.elementIsVisible(overlayElem)) {
      hideAnimDuration = 0;
    } else {
      hideAnimDuration = teliaCoplay.utils.getCSSTransitionDuration(overlayElem, 'opacity');
    }

    setTimeout(function() {
      if (templateName === null) {
        if (typeof(cb) === 'function') {
          overlayElem.innerHTML = '';
          cb.call(_this);
        }
        return;
      }

      overlayElem.style.display = '';

      teliaCoplay.utils.renderAndInsertTemplate(
        templateName,
        data,
        overlayElem,
        function(overlayHTML) {
          if (teliaCoplay.utils.trim(overlayHTML) !== '') {
            Array.prototype.forEach.call(staticContentElems, function(elem) {
              teliaCoplay.utils.setClass(
                elem,
                'state-content--inactive',
                true
              );
            });

            teliaCoplay.utils.addClass(overlayElem, 'state-content--visible');

            setTimeout(function() {
              if (typeof(cb) === 'function') {
                cb.call(_this);
              }
            }, teliaCoplay.utils.getCSSTransitionDuration(overlayElem, 'opacity'));
          } else {
            if (typeof(cb) === 'function') {
              cb.call(_this);
            }
          }
        }
      );
    }, hideAnimDuration);
  };

  Main.prototype._addScrollPrevention = function() {
    var scrollContainerClassName = 'state-content__container--scrollable';

    document.body.addEventListener('touchmove', function(e) {
      var isScrollContainer = teliaCoplay.utils.hasClass(
        e.target,
        scrollContainerClassName
      );
      var isChildOfScrollContainer = !!teliaCoplay.utils.getClosestParentElem(
        e.target,
        '.'+scrollContainerClassName
      );

      if (!isScrollContainer && !isChildOfScrollContainer) {
        e.preventDefault();
      }
    });
  };



  ///////////////////////////////////////////////////////////
  // State handlers
  ///////////////////////////////////////////////////////////

  /**
   * @param {Object} data (Optional)
   */
  Main.prototype._onStateInitial = function(data) {
    console.debug('%conStateInitial', 'font-weight: bold', data);

    if (!this._validateInZone()) {
      return;
    }

    var existingUser = this._getExistingUser();

    teliaCoplay.utils.removeClass(
      this._mainHeaderElem,
      'main-header--has-overlay'
    );

    this._renderOverlay('initial', {
      'current_user': existingUser,
      'spotify_user_authorize_url': teliaCoplay.spotifyUserAuthorizeURL
    }, function() {
      teliaCoplay.utils.trackPageview();
    });
  };

  /**
   * @param {Object} currentUser
   */
  Main.prototype._onStateConnectedWithSpotify = function(currentUser) {
    console.debug('%conStateConnectedWithSpotify', 'font-weight: bold', currentUser);

    if (!this._validateInZone()) {
      return;
    }

    // point all links referencing the "/" state to the "connected" state
    Array.prototype.forEach.call(document.querySelectorAll('[data-state="/"]'), function(elem) {
      elem.setAttribute(
        'data-state',
        teliaCoplay.StateManager.getCurrentState().state
      );
    });

    teliaCoplay.utils.removeClass(
      this._mainHeaderElem,
      'main-header--has-overlay'
    );

    this._renderPage(null, currentUser, function() {
      teliaCoplay.utils.trackPageview();
    });
  };

  /**
   * @param {Object} data (Optional)
   */
  Main.prototype._onStateSpotifyCallback = function(data) {
    console.debug('%conStateSpotifyCallback', 'font-weight: bold', data);

    if (!this._validateInZone()) {
      return;
    }

    teliaCoplay.utils.addClass(
      this._mainHeaderElem,
      'main-header--has-overlay'
    );

    var _this = this;

    var existingUser = this._getExistingUser();
    if (existingUser && existingUser.spotifyUsername) {
      teliaCoplay.Notification.show({
        title: 'Already connected',
        body: 'You’re already connected with Spotify',
        imageURL: existingUser.spotifyAvatarURL || ''
      });
      teliaCoplay.StateManager.setState('/spotify/connected', existingUser);
      return;
    }

    console.debug('Requesting Spotify user, including his/her top tracks…');

    this._renderOverlay('loading', {
      'message': 'Fetching your Spotify user profile…'
    });

    teliaCoplay.spotifyClient.getUserDetailsWithTopTracks(null, function(data) {
      console.debug('Got Spotify user and top tracks:\n', data);

      _this._userData = {
        'spotifyUsername': data.user.username,
        'spotifyAvatarURL': data.user.avatarURL,
        'spotifyFullName': data.user.fullName,
        'spotifyGuessedFirstName': data.user.guessedFirstName,
        'spotifyGuessedLastName': data.user.guessedLastName,
        'spotifyTopTracks': data.topTracks.slice(0, 5)
      };

      teliaCoplay.PlaylistManager.setCurrentUserTopTracks(data.topTracks);

      // set up data object only to be used when rendering the template
      var renderData = {};
      for (var i in _this._userData) {
        renderData[i] = _this._userData[i];
      }
      for (var n in renderData.spotifyTopTracks) {
        renderData.spotifyTopTracks[n].isConfirmingTracksMode = true;
      }

      setTimeout(function() {
        _this._renderOverlay.call(_this, 'spotify_callback', renderData, function() {
          teliaCoplay.utils.trackPageview();
        });
      }, 1500);
    });
  };

  /**
   * @param {Object} data (Optional)
   */
  Main.prototype._onStateSkipSpotifyConnect = function(data) {
    console.debug('%conStateSkipSpotifyConnect', 'font-weight: bold', data);

    if (!this._validateInZone()) {
      return;
    }

    // point all links referencing the state "/" to the "connected" state
    Array.prototype.forEach.call(document.querySelectorAll('[data-state="/"]'), function(elem) {
      elem.setAttribute(
        'data-state',
        teliaCoplay.StateManager.getCurrentState().state
      );
    });

    teliaCoplay.utils.removeClass(
      this._mainHeaderElem,
      'main-header--has-overlay'
    );

    this._renderPage('spotify_skip', {
      'spotify_user_authorize_url': teliaCoplay.spotifyUserAuthorizeURL
    }, function() {
      teliaCoplay.utils.trackPageview();
    }, false);
  };

  /**
   * @param {Object} data (Optional)
   */
  Main.prototype._onStateNotInZone = function(data) {
    console.log('%conStateNotInZone: ', 'font-weight: bold', data);

    teliaCoplay.utils.trackPageview();
    setTimeout(function() {
      document.location.href = 'https://developers.premiumzone.com/';
    }, 1000);
  };

  /**
   * @param {Object} data (Optional)
   */
  Main.prototype._onStateUserInfo = function(data) {
    console.debug('%conStateUserInfo: ', 'font-weight: bold', data);

    if (!this._validateInZone()) {
      return;
    }

    if (!data || typeof(data) !== 'object') {
      // invalid user
      return;
    }

    teliaCoplay.utils.addClass(
      this._mainHeaderElem,
      'main-header--has-overlay'
    );

    this._renderOverlay('user_info', data, function() {
      //console.log('Rendered user info');
      teliaCoplay.utils.trackPageview();
    });
  };

  /**
   * @param {Object} data (Optional)
   */
  Main.prototype._onStateHelp = function(data) {
    console.debug('%conStateHelp: ', 'font-weight: bold', data);

    if (!this._validateInZone()) {
      return;
    }

    teliaCoplay.utils.addClass(
      this._mainHeaderElem,
      'main-header--has-overlay'
    );

    this._renderOverlay('help', data, function() {
      //console.log('Rendered help');
      teliaCoplay.utils.trackPageview();
    });
  };

  /**
   * @param {Object} data (Optional)
   */
  Main.prototype._onStatePlaylist = function(data) {
    console.debug('%conStatePlaylist: ', 'font-weight: bold', data);

    if (!this._validateInZone()) {
      return;
    }

    teliaCoplay.utils.addClass(
      this._mainHeaderElem,
      'main-header--has-overlay'
    );

    var _this = this;

    this._renderOverlay('loading');

    teliaCoplay.utils.request('/api/v1/playlist', {
      onSuccess: function(responseObj) {
        console.debug('Fetched playlist');

        var data = {
          'playlist_items': responseObj,
          'spotify_shared_playlist_url': teliaCoplay.spotifySharedPlaylistURL
        };
        _this._renderOverlay.call(_this, 'playlist', data, function() {
          console.log('Rendered playlist');
          teliaCoplay.utils.trackPageview();
        });
      },
      onError: function(err, xhr) {
        console.error('Failed to load playlist - error: ', err, xhr);
        teliaCoplay.utils.trackError({
          'message': 'Failed to update playlist with user\'s tracks',
          'details': 'Status: '+xhr.status+' ('+xhr.statusText+')'
        });

        teliaCoplay.utils.removeClass(
          _this._mainHeaderElem,
          'main-header--has-overlay'
        );

        _this._renderOverlay.call(_this, null);

        alert('Failed to fetch playlist, please try again.');
      }
    });
  };


  main = new Main();
})();
