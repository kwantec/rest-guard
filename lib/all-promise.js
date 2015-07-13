/**
 * Created by rramirez on 7/1/15.
 */
'use strict';

var Q = require('q');

var promisify = function ($this, fn) {
    var fn = arguments[arguments.length - 1];
    $this = arguments.length > 1 ? $this : null;
    var promise = null;
    if (typeof fn === 'function') {
        promise = function () {
            var deferred = Q.defer();

            var args = [];
            for (var i = 0; i < arguments.length; i++) {
                args.push(arguments[i]);
            }

            var callback = function (err, value) {
                if (!err) {
                    deferred.resolve(value);
                } else {
                    deferred.reject(err);
                }
            };
            args.push(callback);
            try {
                fn.apply($this, args);
            } catch (e) {
                deferred.reject(e);
            }
            return deferred.promise;
        };
    } else {
        throw new Error('fn is not a function.');
    }
    return promise;
};

module.exports.promisify = promisify;
