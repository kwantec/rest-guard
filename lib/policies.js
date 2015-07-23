/**
 * Created by rramirez on 7/6/15.
 */
'use strict';
var _ = require('underscore');


function UriData() {
    this.methods = {};
    this.uriParams = {};
    this.bodyParams= {};
    this.queryParams= {};

}

UriData.prototype.index = 0;
UriData.prototype.model = null;
UriData.prototype.ignorePermissions = false;
UriData.prototype.methods = {};
UriData.prototype.uriParams = {};
UriData.prototype.bodyParams = {};
UriData.prototype.queryParams= {};

UriData.prototype.hasMethod = hasMethod;
UriData.prototype.hasActionAlias = hasActionAlias;
UriData.prototype.getMethodByAlias = getMethodByAlias;
UriData.prototype._index = _index;
UriData.prototype._model = _model;
UriData.prototype._method = _method;
UriData.prototype._uriParam = _uriParam;
UriData.prototype._bodyParam = _bodyParam;
UriData.prototype._queryParam = _queryParam;


function _uri(policies, uri) {
    if (!(uri in policies)) {
        policies[uri] = new UriData();
    }
    return policies[uri];
}

function hasMethod(method){
    return !!this.methods[method.toLowerCase()];
}

function hasActionAlias(alias){
    var $this = this;
    return _.keys($this.methods).some(function(m){
        return $this.methods[m].alias == alias;
    });
}

function getMethodByAlias(alias){
    var $this = this;
    var _m;
    _.keys($this.methods).some(function(m){
        var is = $this.methods[m].alias == alias;
        if(is){
            _m = m;
        }
        return is;
    });
    return this.methods[_m];
}

function _uri2( uri) {
    var policies = this.policies;
    if (!(uri in policies)) {
        policies[uri] = new UriData();
    }
    return policies[uri];

}

function _model(model) {
    this.model = model;
    return this;
}

function _index(index) {
    this.index = index;
    return this;
}

function _method(method, alias) {

    method =  method?method.toLowerCase():method;
    if (!(method in this.methods)) {
        this.methods[method] = {};

    }

    if (typeof alias !== 'undefined') {
        this.methods[method].alias = alias;
    }

    return this;
}

function _uriParam(param, value) {
    this.uriParams[param] = value;
    return this;
}

function _bodyParam(param, value) {
    this.bodyParams[param] = value;
    return this;
}

function _queryParam(param, value) {
    this.queryParams[param] = value;
    return this;
}


function findUrisByModel(model){
    var $this = this;
    var uris = _.keys($this.policies).filter(function(uri){
        var uriData = $this.policies[uri];
        var isModel = uriData.model == model;
        return isModel;
    });

    return uris;
}

function createPolicy(model, actionAlias, uri, httpMethod) {
    this.selectedPolicy = _uri(this.policies, uri)._model(model)._method(httpMethod, actionAlias);
    this.selectedMethod = httpMethod?httpMethod.toLowerCase():null;
    return this;
}
function resourceIdFromUri(param) {
    this.selectedPolicy._uriParam('resource', param);
    return this;
}

function resourceOwnerIdFromUri(param) {
    this.selectedPolicy._uriParam('resourceOwner', param);
    return this;
}

function resourceParentIdFromUri(param) {
    this.selectedPolicy._uriParam('resourceParent', param);
    return this;
}

function resourceIdFromBody(param) {
    this.selectedPolicy._bodyParam('resource', param);
    return this;
}

function resourceOwnerIdFromBody(param) {
    this.selectedPolicy._bodyParam('resourceOwner', param);
    return this;
}

function resourceParentIdFromBody(param) {
    this.selectedPolicy._bodyParam('resourceParent', param);
    return this;
}

function resourceIdFromQuery(param) {
    this.selectedPolicy._queryParam('resource', param);
    return this;
}

function resourceOwnerIdFromQuery(param) {
    this.selectedPolicy._queryParam('resourceOwner', param);
    return this;
}

function resourceParentIdFromQuery(param) {
    this.selectedPolicy._queryParam('resourceParent', param);
    return this;
}

function access(model, action, access) {
    var $this = this;
    if(model && action) {
        var uris = findUrisByModel.call($this, model);
        uris.some(function(uri) {
            var found = false;
            var policy = $this.policies[uri];
            if (policy) {
                var method = policy.getMethodByAlias(action);
                if (method) {
                    if (access) {
                        method.access = true;
                    } else if (access == false) {
                        method.access = false;
                    } else {
                        delete method.access;
                    }
                    found = true;
                }
            }
            return found;
        });
    }
    return this;
}

function grant(model, action){
    if(arguments.length==2) {
        access.call(this, model, action, true);
    }else{
        this.selectedPolicy.methods[this.selectedMethod].access = true;
    }
    return this;
}

function deny(model, action){
    if (arguments.length==2) {
        access.call(this, model, action, false);
    } else {
        this.selectedPolicy.methods[this.selectedMethod].access = false;
    }
    return this;
}

function defaultAccess(model, action){
    if (arguments.length==2) {
        access.call(this, model, action, undefined);
    } else {
        delete this.selectedPolicy.methods[this.selectedMethod].access;
    }
    return this;
}

Policies.prototype.uri = _uri2;

Policies.prototype.selectedPolicy = null;

Policies.prototype.policies = {};
Policies.prototype.createPolicy = createPolicy;
Policies.prototype.grantAccess = grant;
Policies.prototype.denyAccess = deny;
Policies.prototype.defaultAccess = defaultAccess;


Policies.prototype.resourceIdFromUri = resourceIdFromUri;
Policies.prototype.resourceOwnerIdFromUri = resourceOwnerIdFromUri;
Policies.prototype.resourceParentIdFromUri = resourceParentIdFromUri;

Policies.prototype.resourceIdFromBody = resourceIdFromBody;
Policies.prototype.resourceOwnerIdFromBody = resourceOwnerIdFromBody;
Policies.prototype.resourceParentIdFromBody = resourceParentIdFromBody;

Policies.prototype.resourceIdFromQuery = resourceIdFromQuery;
Policies.prototype.resourceOwnerIdFromQuery = resourceOwnerIdFromQuery;
Policies.prototype.resourceParentIdFromQuery = resourceParentIdFromQuery;

function Policies() {
}

module.exports = Policies;


