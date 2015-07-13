/**
 * Created by rramirez on 7/6/15.
 */
'use strict';
var _ = require('underscore');


function UriData() {
    this.methods = {};
    this.params = {};

}

UriData.prototype.index = 0;
UriData.prototype.model = null;
UriData.prototype.ignorePermissions = false;
UriData.prototype.methods = {};
UriData.prototype.params = {};

UriData.prototype.hasMethod = hasMethod;
UriData.prototype.hasActionAlias = hasActionAlias;
UriData.prototype.getMethodByAlias = getMethodByAlias;
UriData.prototype._index = _index;
UriData.prototype._model = _model;
UriData.prototype._method = _method;
UriData.prototype._param = _param;


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

function _param(param, value) {
    this.params[param] = value;
    return this;
}


function findByModel(model){
    var $this = this;
    var uris = _.keys($this.policies).filter(function(uri){
        var uriData = $this.policies[uri];
        var isModel = uriData.model == model;
        return isModel;
    });

    var _uri = uris[0];
    return _uri?this.policies[_uri]:undefined;
}

function createPolicy(model, actionAlias, uri, httpMethod) {
    this.selectedPolicy = _uri(this.policies, uri)._model(model)._method(httpMethod, actionAlias);
    this.selectedMethod = httpMethod?httpMethod.toLowerCase():null;
    return this;
}
function setResourceIdParam(param) {
    this.selectedPolicy._param('resource', param);
    return this;
}

function setResourceOwnerIdParam(param) {
    this.selectedPolicy._param('resourceOwner', param);
    return this;
}

function setResourceParentIdParam(param) {
    this.selectedPolicy._param('resourceParent', param);
    return this;
}

function access(model, action, access) {
    if(model && action) {
        var data = findByModel.call(this, model);
        if(data) {
            var method = data.getMethodByAlias(action);
            if (method) {
                if (access) {
                    method.access = true;
                }else if(access==false){
                    method.access = false;
                }else{
                    delete method.access;
                }
            }
        }
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


Policies.prototype.setResourceId = setResourceIdParam;
Policies.prototype.setResourceOwnerId = setResourceOwnerIdParam;
Policies.prototype.setResourceParentId = setResourceParentIdParam;

function Policies() {
}

module.exports = Policies;


