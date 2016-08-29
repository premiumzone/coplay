(function() {
  'use strict';

  /**
   * Set classnames on <html> element so we can
   * target specific browsers in CSS
   */

  if (navigator.userAgent.indexOf('MSIE') !== -1 ||
      navigator.appVersion.indexOf('Trident/') > 0) {
    teliaCoplay.utils.addClass(document.documentElement, 'is-ie');
  }

  if (navigator.userAgent.indexOf('Android') !== -1) {
    teliaCoplay.utils.addClass(document.documentElement, 'is-android');
  }
})();
