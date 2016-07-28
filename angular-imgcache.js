'use strict';

angular.module('ImgCache', [])
// The number of attempts to download and cache a file before falling back on linking directly
  .constant('NUMBER_OF_CACHE_ATTEMPTS', 2)
  .provider('ImgCache', function() {

      ImgCache.$init = function() {

          ImgCache.init(function() {
              ImgCache.$deferred.resolve();
          }, function() {
              ImgCache.$deferred.reject();
          });
      };

      this.manualInit = false;

      this.setOptions = function(options) {
          angular.extend(ImgCache.options, options);
      };

      this.setOption = function(name, value) {
          ImgCache.options[name] = value;
      };

      this.$get = ['$q', function ($q) {

          ImgCache.$deferred = $q.defer();
          ImgCache.$promise = ImgCache.$deferred.promise;

          if(!this.manualInit) {
              ImgCache.$init();
          }

          return ImgCache;
      }];

  })

  .directive('imgCache', ['NUMBER_OF_CACHE_ATTEMPTS', '$log', function(NUMBER_OF_CACHE_ATTEMPTS, $log) {
      $log = $log.getInstance('imgCache');
      return {
          restrict: 'A',
          scope: {
              icBg: '@',
              icSrc: '@'
          },
          link: function(scope, el, attrs) {

              var setImg = function(type, el, src) {

                  ImgCache.getCachedFileURL(src, function(src, dest) {
                      $log.log("Fetching cached image '" + src + " for use  as a '" + type + "'");
                      if(type === 'bg') {
                          el.css({'background-image': 'url(' + dest + ')' });
                      } else {
                          el.attr('src', dest);
                      }
                  });
              };

              /**
               * Attempt to cache a file to persistent storage
               * @param {String} type - The type of image (either bg or src)
               * @param {String} src - The URL source of the image
               * @param {Number} attemptNum - Track which attempt we are making to download
               * @returns
               */
              var attemptToCacheFile = function(type, src, attemptNum) {
                  ImgCache.cacheFile(src, function() {
                      $log.log("Successfully cached image {src} on attempt {attempt}", {src: src,
                          attempt: attemptNum});
                      setImg(type, el, src);
                  }, function(error) {
                      $log.warn("Failed to cache image {src} on attempt {attempt}", {src: src,
                          attempt: attemptNum});
                      // Attempt to cache the file once more
                      if (attemptNum <= NUMBER_OF_CACHE_ATTEMPTS) {
                          attemptToCacheFile(type, src, ++attemptNum);
                      } else {
                          $log.warn("Giving up trying to cache image {src} after attempt {attempt}",
                            {src: src, attempt: attemptNum});
                          // We failed downloading the image to the cache, so just attempt
                          // to show it directly in the tag
                          if(type === 'bg') {
                              el.css({'background-image': 'url(' + src + ')' });
                          } else {
                              el.attr('src', src);
                          }
                      }
                  });
              };


              var loadImg = function(type, el, src) {

                  ImgCache.$promise.then(function() {

                      ImgCache.isCached(src, function(path, success) {

                          if (success) {
                              setImg(type, el, src);
                          } else {
                              attemptToCacheFile(type, src, 1);
                          }

                      });
                  });
              };

              attrs.$observe('icSrc', function(src) {
                  if (!src) {
                    return $log.warn("attempted to load a cached image with no src attribute");
                  } else {
                    $log.log("attempting to load a potentially cached image for icSrc '" +
                        src + "'");
                  }

                  loadImg('src', el, src);

              });

              attrs.$observe('icBg', function(src) {
                if (!src) {
                  return $log.warn("attempted to load a cached image with no src attribute");
                } else {
                  $log.log("attempting to load a potentially cached image for icBg '" +
                    src + "'");
                }

                  loadImg('bg', el, src);

              });

          }
      };
  }]);
