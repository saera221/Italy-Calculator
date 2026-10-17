/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-7e5eb42b'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "3b11c366215f98b2cd2585131aa6aaf8"
  }, {
    "url": "pwa-512x512.png",
    "revision": "d38e0e817faf662fb64998e503e7c9d5"
  }, {
    "url": "pwa-192x192.png",
    "revision": "9f60ff8167a46c72a246f862acb8c553"
  }, {
    "url": "index.html",
    "revision": "0c02819c8e094964ffc59dca88eab577"
  }, {
    "url": "icon.svg",
    "revision": "90a4b392f670480ef62236ef029d8e8d"
  }, {
    "url": "card-game.png",
    "revision": "b273648209d4261e6dbac2bcc6e188be"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "656295147c884f91596f493e78e5b89c"
  }, {
    "url": "app-logo.png",
    "revision": "b273648209d4261e6dbac2bcc6e188be"
  }, {
    "url": "assets/index-CVomk18A.css",
    "revision": null
  }, {
    "url": "assets/index-CIlPAzCd.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "656295147c884f91596f493e78e5b89c"
  }, {
    "url": "icon.svg",
    "revision": "90a4b392f670480ef62236ef029d8e8d"
  }, {
    "url": "pwa-192x192.png",
    "revision": "9f60ff8167a46c72a246f862acb8c553"
  }, {
    "url": "pwa-512x512.png",
    "revision": "d38e0e817faf662fb64998e503e7c9d5"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "3b11c366215f98b2cd2585131aa6aaf8"
  }, {
    "url": "manifest.webmanifest",
    "revision": "6d90489c14f7f9b36db61786c6c77e8c"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
