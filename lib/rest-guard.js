/* global module */

'use strict';


var _ = require('underscore');

var paramsUrl = require('./parameter-url');
var rolesService = require('./role-permission-service');
var modelService = require('./model-service');
var permissionService = require('./permission-service');
var deepQuery = require('./deep-query');

var Policies = require('./policies');

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

function getOwner(modelName,  model, owner, parents, callback) {
    __log(_modelOwnersFields, _modelParentingFields);
    modelService.getOwner(modelName, model, owner, parents, _modelOwnersFields, _modelParentingFields,
        function (err, ids) {
            __log('OWNERS', ids);
            callback(err, ids && ids[ids.length - 1]);
        });
}

function getParents(modelName, model, parent, callback) {
    __log(_modelParentingFields);
    modelService.getParents(modelName, model, parent, _modelParentingFields,
        function (err, ids) {
            __log('PARENTS', ids);
            callback(err, ids);
        });
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
        policy.id = rolesService.getActionName(_method.alias, policy.model);

        var params = paramsUrl.getParameters(policyUri, uri);

        PolicyResult.prototype.getResource = getResourceMethod(policy, params).bind(policy);
        PolicyResult.prototype.getResourceOwner = getResourceOwnerMethod(policy, params).bind(policy);
        PolicyResult.prototype.getResourceParents = getResourceParentsMethod(policy, params).bind(policy);

    }

    return policy;

}

PolicyResult.prototype.getResource = function (req, callback) {
};
PolicyResult.prototype.getResourceOwner = function (id, parents, req, callback) {
};
PolicyResult.prototype.getResourceParents = function (id, req, callback) {
};

function getResourceMethod(policy, uriParams) {
    var paramName = 'resource';
    var id = getValueFromUri(policy, uriParams, paramName)[0];
    return function (req, callback) {
        id = id ? id : modelService.getIdFromReq(req);
        id = id ? id : getValueFromQuery(policy, req, paramName)[0];
        id = id ? id : getValueFromBody(policy, req, paramName)[0];

        callback(null, id);

    }
}


function getResourceOwnerMethod(policy, uriParams) {
    var paramName = 'resourceOwner';
    var owner = getValueFromUri(policy, uriParams, paramName)[0];
    return function (id, parents, req, callback) {
        owner = owner ? owner : getValueFromQuery(policy, req, paramName)[0];
        owner = owner ? owner : getValueFromBody(policy, req, paramName)[0];


        var model = modelService.getModelFromReq(id, req);
        getOwner(policy.model, model, owner, parents, callback);

    }
}

function getResourceParentsMethod(policy, uriParams) {
    var paramName = 'resourceParent';
    var parent = getValueFromUri(policy, uriParams, paramName)[0];
    return function (id, req, callback) {
        parent = parent ? parent : getValueFromQuery(policy, req, paramName)[0];
        parent = parent ? parent : getValueFromBody(policy, req, paramName)[0];


        var model = modelService.getModelFromReq(id, req);
        getParents(policy.model,  model, parent, callback);

    }
}

function getValueFromUri(policy, params, paramName) {
    return getValueFromSource(policy, params, paramName, 'uriParams');
}

function getValueFromQuery(policy, req, paramName) {
    return getValueFromSource(policy, req.query, paramName, 'queryParams');
}

function getValueFromBody(policy, req, paramName) {
    return getValueFromSource(policy, req.body, paramName, 'bodyParams');
}

function getValueFromSource(policy, paramValuesSource, paramName, paramNamesSource) {
    var value = [];
    if(paramNamesSource && paramName) {
        var field = policy[paramNamesSource][paramName];
        value = deepQuery(paramValuesSource, field);
    }
    return value;
}

function setDisabled(disabled) {
    permissionService.setDisabled(disabled);
}

function RestGuard() {

}

var _modelOwnersFields = [];
var _modelParentingFields = {};
var _policies = new Policies();
var _selectedUri = null;

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
