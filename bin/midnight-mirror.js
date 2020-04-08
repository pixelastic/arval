const midnightMirror = require('../lib/main.js');

// midnight-mirror
// midnightmirrorrc.js
// => source, thumbnails, resize options

(async function() {
  await midnightMirror.sync();
})();
