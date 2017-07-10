/**
 * test.js
 *
 * Hongcai Deng <admin@dhchouse.com>
 */

'use strict';

const request = new (require('../adapter/request'))();

request.download('./test.bin', {
  url: 'https://httpbin.org/range/1024'
}).then(console.log.bind(console))
  .catch(console.error.bind(console));
