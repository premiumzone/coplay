(function() {
  'use strict';
  /* globals history */
  window.teliaCoplay = window.teliaCoplay || {};

  var supportsReplaceState = 'replaceState' in history;

  var StateManager = {
    _stateHandlers: {},  // contents in the format of e.g. `{state: [callback]}`
    _currentState: {
      'state': null,
      'data': null
    },
    _contentElem: document.querySelector('.js-state-content'),
    _contentOverlayElem: document.querySelector('.js-state-content--overlay'),

    /**
     * @param {String} state
     * @param {Function} callback
     */
    _addStateHandler: function(state, callback) {
      if (!(this._stateHandlers[state] instanceof Array)) {
        this._stateHandlers[state] = [];
      }
      this._stateHandlers[state].push(callback);
    },

    /**
     * @param {String} state
     * @param {Function} callback
     */
    _removeStateHandler: function(state, callback) {
      if (!(this._stateHandlers[state] instanceof Array)) {
        return;
      }

      var pos = this._stateHandlers[state].indexOf(callback);
      if (pos !== -1) {
        this._stateHandlers[state].splice(pos, 1);
      }
    },

    /**
     * @param {String} state
     * @param {Object} data
     * @param {Boolean} isInitialState
     */
    _setState: function(state, data, isInitialState) {
      if (typeof(state) !== 'string') {
        throw Error('Invalid argument `state` ('+state+')');
      }

      if (state.indexOf('/') !== 0) {
        state = '/' + state;
      }

      if (supportsReplaceState) {
        history.replaceState({}, 'asdlkfj', state);
      } else {
        document.location.hash = state;
      }

      var stateIsDifferentFromCurrent = (
        this._currentState.state !== state ||
        JSON.stringify(data||{}) !== JSON.stringify(this._currentState.data||{})
      );

      if (stateIsDifferentFromCurrent || isInitialState) {
        this._onStateChange(state, data, isInitialState);
      }
    },

    /**
     * @param {String} state
     * @param {Object} data (Optional)
     * @param {Boolean} isInitialState
     */
    _onStateChange: function(state, data, isInitialState) {
      if (isInitialState) {
        //console.debug('%cStateManager - init:', 'font-weight: bold', state, data);
      } else {
        //console.debug('%cStateManager.onStateChange:', 'font-weight: bold', state, data);
      }

      if (!state) {
        state = '/';
      }

      document.body.setAttribute('data-current-state', state);

      this._currentState = {
        'state': state,
        'data': data
      };

      if (this._stateHandlers[state] instanceof Array) {
        for (var i = 0; i < this._stateHandlers[state].length; i++) {
          this._stateHandlers[state][i](data);
        }
      }
    }
  };

  document.body.addEventListener('click', function(e) {
    var elem = null;
    if (e.target.hasAttribute('data-state')) {
      elem = e.target;
    } else if (e.target.parentNode && e.target.parentNode.hasAttribute('data-state')) {
      elem = e.target.parentNode;
    }

    if (!elem) {
      return;
    }

    var state = elem.getAttribute('data-state');
    var stateData = elem.getAttribute('data-state-data') || null;
    if (stateData) {
      stateData = JSON.parse(stateData);
    }

    if (state) {
      e.preventDefault();
      StateManager._setState(state, stateData);
    }
  });


  teliaCoplay.StateManager = {
    'getStateContentElem': function() {
      return StateManager._contentElem;
    },
    'getStateOverlayContentElem': function() {
      return StateManager._contentOverlayElem;
    },
    'addStateHandler': teliaCoplay.utils.proxy(
      StateManager._addStateHandler, StateManager
    ),
    'removeStateHandler': teliaCoplay.utils.proxy(
      StateManager._removeStateHandler,
      StateManager
    ),
    'getCurrentState': function() {
      return StateManager._currentState;
    },
    'setState': teliaCoplay.utils.proxy(
      StateManager._setState,
      StateManager
    )
  };
})();
