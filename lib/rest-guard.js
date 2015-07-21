/* global module */

'use strict';


var _ = require('underscore');

var paramsUrl = require('./parameter-url');
var rolesService = require('./role-permission-service');
var fnTools = require('./function-arguments-utils');
var getGetMethodName = require('./format-utils').getGetMethodName;
var modelService = require('./model-service');
var permissionService = require('./permission-service');

var Policies = require('./policies');

var getCallback = fnTools.getCallBack;
var toArray = fnTools.toArray;
var injectMethodBeforeCall = fnTools.injectMethodBeforeCall;

function __log() {
    if (_debug) {
        console.log.apply(console, arguments);
    }
}


/**
 *
 * @param modelOwnersFields, an Array of string with 'Model.ownerField' format.
 * @returns {setModelOwnerFields}
 */
function setModelOwnerFields(modelOwnersFields) {
    _modelOwnersFields = modelOwnersFields;
    return this;
}

/**
 *
 * @param modelOwnersFields, a Object with properties with 'Model.parentField': 'ParentModel' format (by default ParentModel._id field).
 * @returns {setModelParentingFields}
 */
function setModelParentingFields(modelOwnersFields) {
    _modelParentingFields = modelOwnersFields;
    return this;
}

function getOwner(modelName, model, callback) {
    __log(_modelOwnersFields, _modelParentingFields);
    modelService.getOwner(modelName, model, _modelOwnersFields, _modelParentingFields,
        function (err, ids) {
            __log('OWNERS', ids);
            callback(err, ids && ids[ids.length - 1]);
        });
}

function getParents(modelName, model, callback) {
    __log(_modelParentingFields);
    modelService.getParents(modelName, model, _modelParentingFields,
        function (err, ids) {
            __log('PARENTS', ids);
            callback(err, ids);
        });
}

var policyPart = function (model, index) {
    return {methods: {}, model: model, params: {}, index: index};
};

function createExpressInterceptor(apiUriRoot) {
    var data = _policies;
    _apiUriRoot = apiUriRoot;
    var matchRoot = false;
    var matchRootRegExp = new RegExp('^[\/]{0,1}' + _apiUriRoot);
    return function (methodName) {

        //__log('methodName', methodName);
        if (methodName == 'route') { // if is route method call
            _selectedUri = arguments[1];
            matchRoot = _selectedUri && _selectedUri.match(matchRootRegExp);
            if (matchRoot) {
                data.uri(_selectedUri)._model(_selectedMethod)._index(_.keys(data).length + 1);
            }
        } else { // if is get|post|put|delete method call
            if (matchRoot) {
                _selectedMethod = arguments[0];
                //data[index].methods.push({method:methodName, fn:arguments[0]});
                data.uri(_selectedUri)._method(_selectedMethod);
            }

        }
    };
}

function configureExpress(app, apiUriRoot) {
    var interceptor = createExpressInterceptor(apiUriRoot);
    injectMethodBeforeCall(app, 'route', interceptor, ['route'], function (returned) {
        injectMethodBeforeCall(returned, 'get', interceptor, ['get']);
        injectMethodBeforeCall(returned, 'post', interceptor, ['post']);
        injectMethodBeforeCall(returned, 'put', interceptor, ['put']);
        injectMethodBeforeCall(returned, 'delete', interceptor, ['delete']);
    });
    return this;
}

function setAlias(alias, method, uri) {
    var policy = _policies.
        uri(uri || _selectedUri).
        _method(method || _selectedMethod, alias);

    return this;
}
/**
 *
 * @param model, the Model's name.
 * @param actionAlias, alias for uri/method.
 * @param uri, the route.
 * @param httpMethod, the http method
 * @returns {*}
 */
function createPolicy(model, actionAlias, uri, httpMethod) {
    var ps = _policies.createPolicy(model, actionAlias, uri, httpMethod);
    return ps;
}

function count() {
    var count_acc = 0;
    var ps = _policies.policies;
    _.keys(ps).forEach(function (p) {
        count_acc += _.keys(ps[p].methods).length;
    });
    return count_acc;
}

function assertUriPolicy(uri, policy) {
    if (!policy) {
        throw  new Error('There is not a restGuard for \'' + uri + '\'')
    }
}

function setModel(modelName) {
    _selectedModel = modelName;
    !resourceIdParams.hasOwnProperty(_selectedModel) ? (resourceIdParams[_selectedModel] = {}) : null;
    !resourceOwnerIdParams.hasOwnProperty(_selectedModel) ? (resourceOwnerIdParams[_selectedModel] = {}) : null;
    !resourceParentIdParams.hasOwnProperty(_selectedModel) ? (resourceParentIdParams[_selectedModel] = {}) : null;
    return this;
}

function setResourceOwnerId(paramName, uri) {
    _policies.uri(uri || _selectedUri).setResourceOwnerId(paramName);
    return this;
}
function setResourceId(paramName, uri) {
    _policies.uri(uri || _selectedUri).setResourceId(paramName);
    return this;
}

function setResourceParentId(paramName, uri) {
    _policies.uri(uri || _selectedUri).setResourceParentId(paramName);
    return this;
}

/**
 * Get the roles permission object.
 * @param role
 * @returns {*|{}}
 */
function getRolesPermissions(role) {
    return rolesService.createRolesPermissionObject(role, _policies.policies);
}
/**
 * Prints policies Object.
 */
function printPolicies() {
    console.log('Policies', JSON.stringify(_policies.policies));
}

function findPolicyByHttpCall(uri, method) {
    method = method ? method.toLowerCase() : method;
    var policies = _policies.policies;
    var uris = _.keys(policies).filter(function (_uri) {
        return paramsUrl.urlMatch(_uri, uri) && _policies.uri(_uri).hasMethod(method);
    });

    var policies = [];
    uris.forEach(function (u) {
        policies.push({uri: u, policy: _policies.uri(u)});
    }, null);
    _.sortBy(policies, 'index');
    var policyContent = policies[0];
    if (policyContent) {
        var policyUri = policyContent.uri;

        var policy = new PolicyResult();

        _.extend(policy, policyContent.policy);
        var methodName = method;
        var _method = {};
        _.extend(_method, policy.methods[methodName]);
        _method.name = methodName;

        delete policy.methods;

        policy.url = policyUri;
        policy.access = _method.access;
        policy['method'] = _method;
        policy.id = rolesService.getActionName(_method.alias , policy.model);

        var params = paramsUrl.getParameters(policyUri, uri);
        AddGetMethod(policy, params, 'resource', function(req, cb){
            var id = modelService.getIdFromReq(req);
            cb&&cb(null, id);
        });
        AddGetMethod(policy, params, 'resourceOwner', function (id, req, cb) {
            var model = modelService.getModelFromReq(id, req);
            cb && getOwner(policy.model, model, cb);
        });
        AddGetMethod(policy, params, 'resourceParents', function (id, req, cb) {
            cb && getParents(policy.model, modelService.getModelFromReq(id, req), cb);
        });
    }

    return policy;

}

function AddGetMethod(policy, params, paramName, alternativeFn) {
    var methodName = getGetMethodName(paramName);
    PolicyResult.prototype['' + methodName] = getParamGetFn(policy, params, paramName, alternativeFn);
}

function getParamGetFn(policy, params, paramName, alternativeFn) {
    var field = policy.params[paramName];
    var value = params[field];

    return function (callback) {
        var cb = getCallback.apply(this, arguments);
        cb && (value || !value && !alternativeFn ) && cb(null, value)
        || alternativeFn && alternativeFn.apply(this, arguments);
    };
}

function findPolicy(uri, method) {
    var policy = _policies.policies[uri];
    var result = null;
    //Not by model, by method alias
    var found = false;
    if (policy) {
        var methodName = method;
        var _method = policy.methods[methodName];
        found = !!_method;

        if (found) {
            result = {};
            _.extend(result, policy);
            delete result.methods;
            result[methodName] = _method;
        }
    }
    return result;
}

function setDisabled(disabled){
    permissionService.setDisabled(disabled);
}

function RestGuard() {

}



var _modelOwnersFields = [];
var _modelParentingFields = {};
var _policies = new Policies();
var _apiUriRoot = '';
var _selectedModel = null;
var _selectedUri = null;
var _selectedMethod = null;
var resourceIdParams = {};
var resourceOwnerIdParams = {};
var resourceParentIdParams = {};

function PolicyResult() {

}
PolicyResult.prototype.constructor = PolicyResult;

RestGuard.prototype.setModelOwnerFields = setModelOwnerFields;
RestGuard.prototype.setModelParentingFields = setModelParentingFields;
RestGuard.prototype.getOwner = getOwner;
RestGuard.prototype.getParents = getParents;
RestGuard.prototype.printPolicies = printPolicies;
RestGuard.prototype.printRoles = rolesService.printRoles;
RestGuard.prototype.createPolicy = createPolicy;
RestGuard.prototype.policiesCount = count;
RestGuard.prototype.setResourceId = setResourceId;
RestGuard.prototype.setResourceOwnerId = setResourceOwnerId;
RestGuard.prototype.setResourceParentId = setResourceParentId;
RestGuard.prototype.setDisabled = setDisabled;

RestGuard.prototype.grantRoles = function (roles, methods, model) {
    rolesService.grantRoles.apply(rolesService, arguments);
    return this;
};

RestGuard.prototype.revokeRoles = function (roles, methods, model) {
    rolesService.revokeRoles.apply(rolesService, arguments);
    return this;
};

RestGuard.prototype.grantPermission = function (permissions, callback) {
    permissionService.save.apply(permissionService, arguments);
    return this;
};

RestGuard.prototype.revokePermission = function (permissions, callback) {
    permissionService.remove.apply(permissionService, arguments);
    return this;
};

RestGuard.prototype.userCredentialsFn = function (fn) {
    permissionService.userCredentialsFn.apply(permissionService, arguments);
    return this;
}

RestGuard.prototype.configureStorage = function (mongoose, collectionName) {
    modelService.setMongoose(mongoose);
    permissionService.configureStorage.apply(permissionService, [mongoose.connection, collectionName]);
    return this;
};

RestGuard.prototype.middleware = function (req, res, next) {
    return permissionService.evaluateEndpoint.apply(permissionService, arguments);
};

RestGuard.prototype.evaluate = function (policy, userIds, owner, parents, resource, systemAction, callback) {
    return permissionService.evaluate.apply(permissionService, arguments);
};

/**
 * Grant access to the endpoint represented by action_model, ignoring all permissions.
 * @param model
 * @param action
 * @returns {*}
 */
RestGuard.prototype.grantAccess = function (model, action) {
    return _policies.grantAccess.apply(_policies, arguments);
};

/**
 * Deny access to the endpoint represented by action_model, ignoring all permissions.
 * @param model
 * @param action
 * @returns {*}
 */
RestGuard.prototype.denyAccess = function (model, action) {
    return _policies.denyAccess.apply(_policies, arguments);
};

/**
 * Default access to the endpoint represented by action_model, looking for permissions to allow access.
 * @param model
 * @param action
 * @returns {*}
 */
RestGuard.prototype.defaultAccess = function (model, action) {
    return _policies.defaultAccess.apply(_policies, arguments);
};

RestGuard.prototype.findPolicyByHttpCall = findPolicyByHttpCall;
RestGuard.prototype.hasRolePolicyPermission = rolesService.hasRolePolicyPermission;
RestGuard.prototype.getRolesPermissions = getRolesPermissions;

RestGuard.prototype.ALL = '*';

exports = module.exports = new RestGuard();

var _debug;
RestGuard.prototype.debug = function (debug) {
    _debug = debug;
    permissionService.debug(debug);
}
permissionService.setPolicyService(module.exports);
