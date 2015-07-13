/**
 * Created by rramirez on 7/3/15.
 */
'use strict';
var _ = require('underscore');
var argsTool = require('./function-arguments-utils');

var VALID_ID_PATTERN = /^[a-fA-F0-9]{24}$/i;
var URL_ID_PATTERN_STR = '[a-fA-F0-9]{24}$';
var URL_PARAM_PATTERN_STR = '[^/\?]+';

function getElement(partialKey, object) {
    var key = partialKey && object ? _.keys(object).filter(function (key) {
        return key.split(/\./)[0] == partialKey;
    })[0] : null;
    return key;
}

function findPropertyName(ob, property, value) {
    var _property = _.keys(ob).filter(function (p) {
        return ob[p][property] == value;
    })[0];
    return _property;
}

function isValidId(id) {
    var r = false;
    if (id) {
        r = !!(id + '').match(VALID_ID_PATTERN);
    }
    return r;
}



module.exports.getElement = getElement;
module.exports.isValidId = isValidId;


