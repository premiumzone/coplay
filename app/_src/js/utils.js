(function() {
  'use strict';
  window.teliaCoplay = window.teliaCoplay || {};
  teliaCoplay.utils = {};

  /* globals ga */

  /**
   * @param {String} str
   */
  teliaCoplay.utils.trim = function(str) {
    if (!str) {
      return str;
    }
    return str.replace(/^\s+/, '').replace(/\s+$/, '');
  };

  /**
   * @param {Object} objToExtend
   * @param {Object} objToExtendWith
   */
  teliaCoplay.utils.extendObject = function(objToExtend, objToExtendWith) {
    for (var i in objToExtendWith) {
      if (objToExtendWith.hasOwnProperty(i)) {
        objToExtend[i] = objToExtendWith[i];
      }
    }
  };

  /**
   * @param {String} paramName (Optional) Pass to only return one specific param
   */
  teliaCoplay.utils.getHashParams = function(paramName) {
    var hashStr = teliaCoplay.utils.trim(
      document.location.hash.replace('#', '')
    );
    var paramsObj = {};

    if (hashStr === '') {
      if (paramName && typeof(paramName) === 'string') {
        if (!paramsObj.hasOwnProperty(paramName)) {
          return undefined;
        } else {
          return paramsObj[paramName];
        }
      } else {
        return paramsObj;
      }
    }

    var paramsArr = hashStr
      .replace('?', '')
      .split('&');

    for (var i = 0; i < paramsArr.length; i++) {
      var data = paramsArr[i].split('=');
      var key = teliaCoplay.utils.trim(data[0]);
      var value = teliaCoplay.utils.trim(data[1]);

      if (key) {
        paramsObj[key] = value;
      }
    }

    if (paramName && typeof(paramName) === 'string') {
      if (!paramsObj.hasOwnProperty(paramName)) {
        return undefined;
      } else {
        return paramsObj[paramName];
      }
    } else {
      return paramsObj;
    }
  };

  /**
   * @public
   * @static
   * @param {String} url
   * @param {Object} customOptions Pass to set e.g. success/error callbacks
   */
  teliaCoplay.utils.request = function(url, customOptions) {
    var options = {
      method: 'GET',
      data: null,
      onSuccess: null,  // Will get called with the parsed JSON response as argument
      onError: null,  // Will get called with an `XMLHttpRequest` object as at least second argument
      timeout: 5000,
      accept: 'application/json',
      contentType: 'application/json',
      additionalHeaders: []
    };

    // extend `options` with `customOptions`, if it's passed
    teliaCoplay.utils.extendObject(options, customOptions);

    var request = new XMLHttpRequest();
    request.open(options.method.toUpperCase(), url, true);

    if (options.accept) {
      request.setRequestHeader('Accept', options.accept);
    }
    if (options.contentType) {
      request.setRequestHeader('Content-Type', options.contentType);
    }
    if (options.timeout) {
      request.timeout = options.timeout;
    }

    if (options.additionalHeaders instanceof Array && options.additionalHeaders.length) {
      for (var n = 0; n < options.additionalHeaders.length; n++) {
        request.setRequestHeader(
          options.additionalHeaders[n].name,
          options.additionalHeaders[n].value
        );
      }
    }

    request.onreadystatechange = function() {
      if (this.readyState === 4) {
        var data = this.responseText;
        if (options.accept === 'application/json') {
          try { data = JSON.parse(this.responseText); } catch(e) {}
        }

        if (this.status >= 200 && this.status < 400) {
          if (options.onSuccess) {
            options.onSuccess(data);
          }
        } else {
          if (options.onError) {
            options.onError(data, this);
          } else {
            teliaCoplay.utils.trackError({
              'message': 'XHR Failed ('+url+')',
              'details': 'Status: '+this.status+' ('+this.statusText+')'
            });
          }
        }
      }
    };

    if (options.data) {
      request.send(options.data);
    } else {
      request.send();
    }
    request = null;
  };

  /**
   * @param {Function} fn
   * @param {Object} scope
   */
  teliaCoplay.utils.proxy = function(fn, scope) {
    return function() {
      fn.apply(scope, arguments);
    };
  };

  /**
   * @param {Function} fn
   * @param {Number} delay
   */
  teliaCoplay.utils.throttle = function(fn, delay) {
    var timer = null;
    return function () {
      var context = this, args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(context, args);
      }, delay);
    };
  };

  /**
   * @param {String} templateName
   * @param {Object} data (Optional)
   * @return {DOMElement}
   */
  teliaCoplay.utils.getElementFromTemplate = function(templateName, data) {
    if (!(templateName in teliaCoplay.templates)) {
      throw Error('Cannot find template of name '+templateName+'.');
    }

    var html = teliaCoplay.utils.trim(
      teliaCoplay.templates[templateName](data)
    );
    if (!html) {
      console.warn('Template "'+templateName+'" appears to be empty.');
    }

    var elem = document.createElement('div');
    elem.innerHTML = html;
    return elem.firstChild;
  };

  /**
   * @param {String} templateName
   * @param {Object} data (Optional)
   * @param {DOMElement} parentElem (Optional) Defaults to <body>
   * @param {Function} cb (Optional) Callback to execute when element is inserted
   * @param {Boolean} append (Optional)
   * @param {Object} options (Optional)
   */
  teliaCoplay.utils.renderAndInsertTemplate = function(templateName, data, parentElem, cb, append, options) {
    if (!(templateName in teliaCoplay.templates)) {
      throw Error('Cannot find template of name '+templateName+'.');
    }

    if (!parentElem) {
      parentElem = document.body;
    }

    if (!options || typeof(options)) {
      options = {};
    }

    var appendedElem = null;
    if (append) {
      appendedElem = teliaCoplay.utils.getElementFromTemplate(templateName, data);
      parentElem.appendChild(appendedElem);
    } else {
      var html = teliaCoplay.utils.trim(
        teliaCoplay.templates[templateName](data)
      );
      if (!html) {
        console.warn('Template "'+templateName+'" appears to be empty.');
      }

      if (typeof(options.prependHTML) === 'string') {
        html = options.prependHTML + html;
      }
      if (typeof(options.appendHTML) === 'string') {
        html += options.appendHTML;
      }

      parentElem.innerHTML = html;
      parentElem.scrollTop = 0;
    }

    if (typeof(cb) === 'function') {
      setTimeout(function() {
        if (append) {
          cb(appendedElem);
        } else {
          cb(html);
        }
      }, 100);
    }
  };

  /**
   * @param {DOMElement} elem
   * @param {String} targetProperty (Optional)
   */
  teliaCoplay.utils.getCSSTransitionDuration = function(elem, targetProperty) {
    var elementStyle = getComputedStyle(elem);
    var transitionDurationCSSValue = elementStyle.transitionDuration || elementStyle.webkitTransitionDuration || elementStyle.mozTransitionDuration || '0';

    // if there's more than one transition specified for `elem`
    if (transitionDurationCSSValue.indexOf(',') > -1) {
      var transitionCSSValue = elementStyle.transition || elementStyle.webkitTransition || elementStyle.mozTransition || '0';

      // locate the transition duration for the specified property
      var targetPropertyIndex;

      // locate index of where `targetProperty` is defined in transitions
      var transitionCSSValueArr = transitionCSSValue.split(',');
      for (var i = 0; i < transitionCSSValueArr.length; i++) {
        if (transitionCSSValueArr[i].indexOf(targetProperty) !== -1) {
          targetPropertyIndex = i;
          break;
        }
      }

      if (!targetPropertyIndex) {  // no target property found - using the first one
        targetPropertyIndex = 0;
      }

      transitionDurationCSSValue = transitionDurationCSSValue.split(',')[targetPropertyIndex];
    }

    // parse transitionDurationCSSValue string into number
    var transitionDuration = Number(
        transitionDurationCSSValue
        .replace(/;/g, '')
        .replace(/,/g, '')
        .replace(/s|ms/g, '')
        );

    if (transitionDurationCSSValue.indexOf('ms') === -1) {  // value is in seconds - ensure milliseconds
      transitionDuration *= 1000;
    }

    return transitionDuration;
  };

  /**
   * @param {String} key (Optional)
   */
  teliaCoplay.utils.getPersistedState = function(key) {
    var data = localStorage.getItem('teliaCoplay');
    if (data) {
      try {
        data = JSON.parse(data);
      } catch(e) {
        data = {};
      }
    } else {
      data = {};
    }

    if (typeof(key) === 'string') {
      return data[key];
    }
    return data;
  };

  /**
   * @param {String} key
   * @param {String|Number|Array|Object|Boolean} value
   */
  teliaCoplay.utils.setPersistedState = function(key, value) {
    if (typeof(key) !== 'string') {
      throw Error('Invalid argument `key` ('+key+')');
    }

    if (typeof(value) === 'undefined') {
      throw Error('Invalid argument `value` ('+value+')');
    }
    if (value instanceof Date) {
      value = value.toISOString();
    }

    var data = localStorage.getItem('teliaCoplay');
    if (data) {
      try {
        data = JSON.parse(data);
      } catch(e) {
        data = {};
      }
    } else {
      data = {};
    }

    data[key] = value;

    var dataStr = JSON.stringify(data);
    localStorage.setItem('teliaCoplay', dataStr);

    return teliaCoplay.utils.getPersistedState();
  };

  /**
   * @param {DOMElement} elem
   */
  teliaCoplay.utils.elementIsVisible = function(elem) {
    var style = getComputedStyle(elem);
    if (style.display === 'none' ||
        parseInt(style.width, 10) === 0 ||
        parseInt(style.height, 10) === 0 ||
        parseInt(style.width, 10) === 0

    ) { return false; }

    return true;
  };

  /**
   * @public
   * @param {DOMElement} elem
   * @param {String} className
   */
  teliaCoplay.utils.hasClass = function(elem, className) {
    if (!elem || !('className' in elem) || typeof(elem.className) !== 'string') {
      return false;
    }

    var classNames = elem.className.split(' ');
    for (var i = 0; i < classNames.length; i++) {
      if (classNames[i].replace(/\s/g, '') === className) {
        return true;
      }
    }
    return false;
  };

  /**
   * @public
   * @param {DOMElement} elem
   * @param {String} className
   */
  teliaCoplay.utils.addClass = function(elem, className) {
    if (!elem || !('className' in elem) || typeof(elem.className) !== 'string') {
      return;
    }

    if (teliaCoplay.utils.hasClass(elem, className)) {
      return;
    }

    var classNames = elem.className.split(' ');
    classNames.push(className);
    elem.className = classNames.join(' ');
  };

  /**
   * @public
   * @param {DOMElement} elem
   * @param {String} className
   */
  teliaCoplay.utils.removeClass = function(elem, className) {
    if (!elem || !('className' in elem) || typeof(elem.className) !== 'string') {
      return;
    }

    if (!teliaCoplay.utils.hasClass(elem, className)) {
      return;
    }

    var classNames = elem.className.split(' ');
    var pos = null;
    while ((pos = classNames.indexOf(className)) !== -1) {
      classNames.splice(pos, 1);
    }

    elem.className = classNames.join(' ');
  };

  /**
   * @public
   * @param {DOMElement} elem
   * @param {String} className
   * @param {Boolean} add
   */
  teliaCoplay.utils.setClass = function(elem, className, add) {
    if (!elem || !('className' in elem) || typeof(elem.className) !== 'string') {
      return;
    }

    if (add) {
      teliaCoplay.utils.addClass(elem, className);
    } else {
      teliaCoplay.utils.removeClass(elem, className);
    }
  };

  /**
   * @param {DOMElement} srcElem
   * @param {String} selector
   */
  teliaCoplay.utils.getClosestParentElem = function(srcElem, selector) {
    if (!srcElem || typeof(selector) !== 'string') {
      console.error('Invalid arguments:', arguments);
      return null;
    }

    var matches = srcElem.matches ||
      srcElem.webkitMatchesSelector ||
      srcElem.mozMatchesSelector ||
      srcElem.msMatchesSelector;

    var max = 20;
    var foundElem = null;
    var currentParentElem = srcElem;
    while (!foundElem && --max > 0) {
      currentParentElem = currentParentElem.parentNode;
      if (currentParentElem === document.body) {
        break;
      }
      if (matches.call(currentParentElem, selector)) {
        foundElem = currentParentElem;
      }
    }

    return foundElem;
  };

  /**
   * @param {String} path (Optional) Defaults to `location.pathname`
   */
  teliaCoplay.utils.trackPageview = function(path) {
    if (!('ga' in window) || typeof(ga) !== 'function') {
      console.warn('Can\'t track pageview - no `ga` object present.');
      return;
    }

    if (!path) {
      path = location.pathname;
    }

    ga('send', 'pageview', path);
  };

  /**
   * @param {Object} error
   */
  teliaCoplay.utils.trackError = function(error) {
    if (!('ga' in window) || typeof(ga) !== 'function') {
      console.warn('Can\'t track pageview - no `ga` object present.');
      return;
    }

    var args = [
      'send',
      'event',
      'JavaScript Error',
      error.message || 'Unknown Error'
    ];

    if ('filename' in error && error.filename) {
      var details = error.filename;
      if ('lineno' in error) {
        details += ' (' + error.lineno;
        if ('colno' in error) {
          details += ':' + error.colno;
        }
        details += ')';
      }
      args.push(details);
    } else if ('details' in error && error.details) {
      args.push(error.details || 'Unknown details');
    }

    ga.apply(null, args);

    if ('preventDefault' in error && typeof(error.preventDefault) === 'function') {
      error.preventDefault();
    }
  };
})();
