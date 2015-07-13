/**
 * Created by rramirez on 7/2/15.
 */
'use strict';
var _ = require('underscore');
var toArray = require('./function-arguments-utils').toArray;
var firstLetterToUpper = require('./format-utils').firstLetterToUpper;

var ALL = '*';

/**
 *
 * @param role
 * @param policies
 * @returns {{}}
 */
function createRolesPermissionObject(roles,  policies){
    var result = {};
    if(roles instanceof Array){
        roles.forEach(function (r){
            _createRolesPermissionObject(r, policies, result);
        });
    }else{
        result = _createRolesPermissionObject(roles, policies);
    }
    return result;
}

function _createRolesPermissionObject(role,  policies, result) {
    var permissions = [];
    _.keys(policies).forEach(function (uri) {
        var model = policies[uri].model;
        var methods = policies[uri].methods;
        _.keys(methods).forEach(function (m) {
            permissions.push({model: model, methodAlias: methods[m].alias});
        });

    });
    var config = permissionRoles[role];
    var methods;
    var result = !result?{}:result;
    permissions.forEach(function (p) {
        var property = getActionName(p.methodAlias, p.model);
        var has = !!((methods = config[p.model]) && (methods[p.methodAlias] || methods['*']));
        result[property] = has || !!result[property] ;
    });
    return result;
}

function getActionName(methodAlias, model) {
    return firstLetterToUpper(methodAlias) + '_' + firstLetterToUpper(model);
}

/**
 * To grant access roles.
 * @param roles sting or Array of string
 * @param methods Array of string (get, post, put, delete)
 * @param model modelName
 */
function grantRoles(roles, methods, model) {
    _accessRoles(roles, methods, model, true);
}

/**
 * To revoke access roles.
 * @param roles sting or Array of string
 * @param methods Array of string (get, post, put, delete)
 * @param model modelName
 */
function revokeRoles(roles, methods, model) {
    _accessRoles(roles, methods, model, false);
}


/**
 *
 * @param roles sting or Array of string
 * @param methods Array of string (get, post, put, delete)
 * @param model modelName
 * @param access, grant/revoke
 */
function _accessRoles(roles, methods, model, access) {
    if (!roles) return;
    if (!methods || !(methods instanceof Array)) {
        throw  new TypeError('The \'methods\' parameter must be an Array');
    }

    var permissions = permissionRoles;

    var _roles = toArray(roles);
    _roles.forEach(function (role) {
        if (role) {
            var dataRole = permissions[role];
            if (!dataRole) {
                permissions[role] = {};
            }
            var uriMethods;
            uriMethods = permissions[role][model];
            if (!uriMethods) {
                permissions[role][model] = {};
            }
            methods.forEach(function (method) {
                permissions[role][model][method] = 1&access;

            });
        }
    });
}

/**
 *
 * @param role
 * @param policy
 * @returns {boolean}
 */
function hasRolePolicyPermission(role, policy) {
    var has = false;
    var permissionRole = permissionRoles[role];
    if (role && policy && permissionRole) {


        var config = permissionRole[policy.model];

        if (config && policy.method) {
            has = !!(config[policy.method.alias] || config[ALL]);
        }
        if (!has && config && policy.methods) {
            has = (_.keys(policy.methods).some(function (m) {
                return policy.methods[m] ? config[policy.methods[m].alias] : false;
            }) || config[ALL]);
        }
    }
    return has;
}

function printRoles() {
    console.log('Roles', permissionRoles);
}

var permissionRoles = {};
module.exports.getActionName = getActionName;
module.exports.createRolesPermissionObject = createRolesPermissionObject;
module.exports.grantRoles = grantRoles;
module.exports.revokeRoles = revokeRoles;
module.exports.printRoles = printRoles;
module.exports.hasRolePolicyPermission = hasRolePolicyPermission;