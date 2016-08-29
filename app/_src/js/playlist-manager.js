(function() {
  'use strict';
  window.teliaCoplay = window.teliaCoplay || {};

  var PlaylistManager = {
    _currentUserTopTracks: [],

    /**
     * @param {Event} e
     */
    _onRemoveSongButtonClick: function(e) {
      var _this = this;

      var playlistItemElem = teliaCoplay.utils.getClosestParentElem(
        e.target,
        '.js-playlist-item'
      );
      if (!playlistItemElem) {
        throw Error('Could not locate playlist item element.');
      }

      var playlistContainerElem = teliaCoplay.utils.getClosestParentElem(
        playlistItemElem,
        '.js-user-playlist-tracks'
      );
      if (!playlistContainerElem) {
        throw Error('Could not locate playlist items container element.');
      }

      var trackToRemoveURI = playlistItemElem.getAttribute('data-track-uri');
      var listedTrackElems = playlistContainerElem.querySelectorAll('[data-track-uri]');
      var listedTrackURIs = Array.prototype.map.call(listedTrackElems, function(elem) {
        return elem.getAttribute('data-track-uri');
      });

      // remove track from _currentUserTopTracks
      var pos1 = this._currentUserTopTracks.map(function(t) {
        return t.uri;
      }).indexOf(trackToRemoveURI);
      if (pos1 === -1) {
        throw Error('Could not locate track with URI "'+trackToRemoveURI+'"');
      }
      this._currentUserTopTracks.splice(pos1, 1);
      var pos2 = listedTrackURIs.indexOf(trackToRemoveURI);
      if (pos2 === -1) {
        throw Error('Could not locate track with URI "'+trackToRemoveURI+'"');
      }
      listedTrackURIs.splice(pos2, 1);

      // remove track element from the DOM
      playlistItemElem.style.transition = 'opacity 200ms ease, transform 200ms ease';
      playlistItemElem.style.transform = 'scale(0.7, 0.7)';
      playlistItemElem.style.opacity = 0;

      setTimeout(function() {
        var nextSiblingElem = playlistItemElem.nextElementSibling;

        playlistItemElem.parentNode.removeChild(playlistItemElem);

        // get a new – unlisted – track from _currentUserTopTracks
        var newTrack = _this._currentUserTopTracks.filter(function(t) {
          return listedTrackURIs.indexOf(t.uri) === -1;
        })[0];

        // render the new track element to the DOM, if any
        if (!newTrack) {
          return;
        }

        newTrack.isConfirmingTracksMode = true;
        var elem = teliaCoplay.utils.getElementFromTemplate(
          '_playlist_item',
          newTrack
        );
        elem.className += ' playlist-item__disable-animation';
        elem.style.transform = 'scale(0.7, 0.7)';
        elem.style.opacity = 0;

        if ('insertBefore' in playlistContainerElem && nextSiblingElem) {
          playlistContainerElem.insertBefore(elem, nextSiblingElem);
        } else {
          playlistContainerElem.appendChild(elem);
        }

        setTimeout(function() {
          elem.style.transition = 'opacity 200ms ease, transform 200ms ease';
          elem.style.transform = 'none';
          elem.style.opacity = 1;
        }, 100);
      }, teliaCoplay.utils.getCSSTransitionDuration(playlistItemElem, 'opacity'));
    },

    /**
     * @param {Event} e
     */
    _onConfirmSongsToAddButtonClick: function(e) {
      var _this = this;
      var containerElem = teliaCoplay.utils.getClosestParentElem(
        e.target,
        '.js-choose-songs-to-add'
      );
      if (!containerElem) {
        throw Error('Could not locate "choose tracks to add" container element.');
      }

      var listedTrackElems = containerElem.querySelectorAll('[data-track-uri]');
      var listedTrackURIs = Array.prototype.map.call(listedTrackElems, function(elem) {
        return elem.getAttribute('data-track-uri');
      });
      var listedTracks = listedTrackURIs.map(function(uri) {
        return _this._currentUserTopTracks.filter(function(t) {
          return t.uri === uri;
        })[0];
      });

      for (var i = 0; i < listedTracks.length; i++) {
        delete listedTracks[i].isConfirmingTracksMode;
      }

      if (typeof(teliaCoplay.onConfirmTracksToAddToPlaylist) === 'function') {
        teliaCoplay.onConfirmTracksToAddToPlaylist(listedTracks);
      }
    },

    /**
     * @param {Array<Object}
     */
    _setCurrentUserTopTracks: function(tracks) {
      if (!(tracks instanceof Array)) {
        console.warn('Attempted to set invalid user top tracks.', tracks);
        this._currentUserTopTracks = [];
        return;
      }

      this._currentUserTopTracks = tracks.map(function(t) {
        return t;
      });
    }
  };

  document.body.addEventListener('click', function(e) {
    if (teliaCoplay.utils.hasClass(e.target, 'js-remove-song')) {
      PlaylistManager._onRemoveSongButtonClick.apply(
        PlaylistManager,
        arguments
      );
      return;
    }

    if (teliaCoplay.utils.hasClass(e.target, 'js-confirm-songs-to-add')) {
      PlaylistManager._onConfirmSongsToAddButtonClick.apply(
        PlaylistManager,
        arguments
      );
      return;
    }
  });


  teliaCoplay.PlaylistManager = {
    'setCurrentUserTopTracks': teliaCoplay.utils.proxy(
      PlaylistManager._setCurrentUserTopTracks,
      PlaylistManager
    )
  };
})();
