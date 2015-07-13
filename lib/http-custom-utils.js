/**
 * Created by rramirez on 7/1/15.
 */
'use strict';
var URL = require('url');

function getSystemAction(req) {
    return req.url;
}

function getMethod(req){
    return req.method;
}

function getRequestQuery(req) {
    var err = null;
    var query = {};
    try {
        var url_parts = URL.parse(req.url, true);
        query = url_parts.query;
    } catch (e) {
        err = e;
        if(module.exports.debug) {
            console.error(e);
        }
    }
    //callback(err, query);
    return query;

}

function getRequestBody(req) {
    var body = req.body || {};
    //callback(null, body);
    return body;
}

function getResultError(systemAction, allowed, policy, userIds, parents, resource) {
    var err = null;

    if (!policy) {
        err = new Error('Policy not found for \'' + systemAction + '\'');
    } else if(policy.access===false){
        err = new Error('Policy \'' + systemAction + '\' has denied access.');
    }else if (!userIds) {
        err = new Error('User not defined');
    } else if (!allowed) {
        err = new Error('Permission not found in restGuard \'' + policy.id + '\', for user \'' + userIds + '\' parents '+parents+' and resource \'' + resource + '\'');
    }
    return err;
}

function setReplacementFn(originalFn, replacementFn) {
    return function () {

        var result = replacementFn.call(this, arguments, originalFn);
    };
}

function asteriskAsDotAsterisk(str){
    return str?str.trim()=='*'?'.*':str:null;
}
module.exports.debug = false;
module.exports.getResultError = getResultError;
module.exports.getSystemAction = getSystemAction;
module.exports.getRequestQuery = getRequestQuery;
module.exports.getRequestBody = getRequestBody;
module.exports.getMethod = getMethod;