(function() {
  'use strict';
  window.teliaCoplay = window.teliaCoplay || {};

  var Notification;
  var elementEventTypes;
  var elementIdentifier = 'js-notification';
  var elementVisibleClassName = 'notification--visible';
  var autoHideDelay = 8000;  // in milliseconds

  Notification = {
    /**
     * @param {Object} data (Optional)
     * @param {Boolean} autoHide (Optional) Defaults to true
     */
    show: function(data, autoHide) {
      if (!data || typeof(data) !== 'object') {
        data = {};
      }

      if (typeof(autoHide) !== 'boolean') {
        autoHide = true;
      }

      var existingNotificationElems = this.getExistingNotificationElems();

      teliaCoplay.utils.renderAndInsertTemplate('notification', data, null, function(elem) {
        if (existingNotificationElems.length) {
          var oldElem = existingNotificationElems[existingNotificationElems.length-1];  // get last added notification element
          var oldElemBottomPoint = oldElem.getBoundingClientRect().bottom;
          var oldElemBottomMargin = parseInt(getComputedStyle(oldElem).marginBottom, 10);

          var newElemTopPoint = elem.getBoundingClientRect().top;
          var newElemTopMargin = parseInt(getComputedStyle(elem).marginTop, 10);
          if (oldElemBottomPoint+oldElemBottomMargin >= newElemTopPoint+newElemTopMargin) {
            var margin = 20;
            for (var i = 0; i < existingNotificationElems.length; i++) {
              var rect = existingNotificationElems[i].getBoundingClientRect();
              var currentBottom = parseInt(getComputedStyle(existingNotificationElems[i]).bottom, 10);

              var newBottom = currentBottom + rect.height * (i+1) + margin;
              existingNotificationElems[i].style.bottom = newBottom + 'px';
            }
          }
        }

        Notification.addElementEventListeners(elem);

        teliaCoplay.utils.addClass(elem, elementVisibleClassName);
        if (autoHide) {
          setTimeout(function() {
            Notification.hide(elem);
          }, teliaCoplay.utils.getCSSTransitionDuration(elem, 'opacity') + autoHideDelay);
        }
      }, true);
    },

    /**
     * Hides and removes a notification element
     * @param {DOMElement} elem
     */
    hide: function(elem) {
      Notification.removeElementEventListeners(elem);

      teliaCoplay.utils.removeClass(elem, elementVisibleClassName);

      setTimeout(function() {
        if (elem && elem.parentNode) {
          elem.parentNode.removeChild(elem);
        }
      }, teliaCoplay.utils.getCSSTransitionDuration(elem, 'opacity'));
    },

    /**
     * @return {Array<DOMElement>}
     */
    getExistingNotificationElems: function() {
      var arr = [];
      var nodeList = document.querySelectorAll('.'+elementIdentifier);
      for (var i = 0; i < nodeList.length; i++) {
        arr.push(nodeList[i]);
      }
      return arr;
    },

    /**
     * Adds all event listeners to a notification element (events defined in `elementEventTypes`)
     * @param {DOMElement} elem
     */
    addElementEventListeners: function(elem) {
      for (var eventType in elementEventTypes) {
        if (elementEventTypes.hasOwnProperty(eventType)) {
          elem.addEventListener(eventType, elementEventTypes[eventType]);
        }
      }
    },

    /**
     * Removes all event listeners from a notification element (events defined in `elementEventTypes`)
     * @param {DOMElement} elem
     */
    removeElementEventListeners: function(elem) {
      for (var eventType in elementEventTypes) {
        if (elementEventTypes.hasOwnProperty(eventType)) {
          elem.removeEventListener(eventType, elementEventTypes[eventType]);
        }
      }
    },

    /**
     * @param {Event} e
     */
    onElemClick: function(e) {
      var elem = e.currentTarget;
      Notification.removeElementEventListeners(elem);
      this.hide(elem);
    }
  };

  elementEventTypes = {  // in the format of e.g. `{eventName: callback}`
    'click': teliaCoplay.utils.proxy(Notification.onElemClick, Notification)
  };

  teliaCoplay.Notification = Notification;
})();

