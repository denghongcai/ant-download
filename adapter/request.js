/**
 * request.js
 *
 * Hongcai Deng <admin@dhchouse.com>
 */

'use strict';

const request = require('request');
const downloader = require('../lib/downloader');

const wrapper = {
  detect(options) {
    return new Promise((resolve, reject) => {
      request(options, (err, response) => {
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      });
    });
  },
  download(stream, options, errCallback) {
    request(options)
      .on('error', errCallback)
      .pipe(stream);
  }
};

module.exports = downloader(wrapper);
