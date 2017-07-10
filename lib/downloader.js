/**
 * downloader.js
 *
 * Hongcai Deng <admin@dhchouse.com>
 */

'use strict';

const debug = require('debug')('ant-downloader');
const contentRange = require('content-range');
const parallelLimit = require('async/parallelLimit');
const fs = require('fs-extra');
const assert = require('assert');
const _ = require('lodash');
const _download = Symbol('download');

function caculateRanges(length, sliceLimit) {
  const subLength = Math.floor(length / sliceLimit);
  const ranges = [];
  let start;
  let end;
  for (let i = 0; i < sliceLimit; i++) {
    start = i * subLength;
    end = start + subLength - 1;
    ranges.push({start, end});
  }
  if (end < length - 1) {
    ranges.push({
      start: end + 1,
      end: length - 1
    });
  }

  return ranges;
}

module.exports = function (requestWrapper) {

  assert(requestWrapper, 'missing request wrapper');

  class AntDownloader {
    constructor(options) {
      options = options || {};
      this.options = _.cloneDeep(options);
      this.options.parallelLimit = options.parallelLimit || 10;
      this.options.sliceLimit = options.sliceLimit || 10;
    }

    detectServerSupport(opts) {
      const options = _.cloneDeep(opts);
      options.headers = options.headers || {};
      options.headers['range'] = 'bytes=0-1';
      return requestWrapper.detect(options)
        .then(response => {
          if (response.statusCode !== 206 || !response.headers['content-range']) {
            return Promise.reject(new Error('server do not support http range'));
          } else {
            return Promise.resolve(response);
          }
        });
    }

    [_download](ranges, downloadPath, opts) {
      return new Promise((resolve, reject) => {
        const tasks = ranges.map(task => {
          return function (callback) {
            debug(`start task ${task.start} ${task.end}`);
            const options = _.cloneDeep(opts);
            options.headers = options.headers || {};
            options.headers['range'] = `bytes=${task.start}-${task.end}`;
            const s = fs.createWriteStream(downloadPath, {
              flags: 'r+',
              start: task.start,
            });
            s.on('error', callback);
            s.on('finish', callback);
            requestWrapper.download(s, options, callback);
          };
        });
        parallelLimit(tasks, this.options.parallelLimit, err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    /**
     * download
     *
     * @param {String} downloadPath destination to download file
     * @param {Object} opts
     * @returns {Promise.<TResult>}
     */
    download(downloadPath, opts) {
      const options = _.merge(_.cloneDeep(this.options), opts || {});

      return this.detectServerSupport(options)
        .then(response => {
          const resRange = contentRange.parse(response.headers['content-range']);
          debug('content-range is %o', resRange);
          const ranges = caculateRanges(resRange.length, this.options.sliceLimit);
          return this[_download](ranges, downloadPath, options);
        })
        .catch(err => {
          debug(err);
          return new Promise((resolve, reject) => {
            const s = fs.createWriteStream(downloadPath);
            s.on('error', reject);
            s.on('finish', resolve);
            return requestWrapper.download(s, opts, reject); // fallback to normal
          });
        });
    }
  }

  return AntDownloader;
};
