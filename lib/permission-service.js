/**
 * Created by rramirez on 7/1/15.
 */
/* global lib */

'use strict';

var httpUtils = require('./http-custom-utils');
var _ = require('underscore');
var utils = require('./function-arguments-utils');
var Q = require('q');
var PermissionStorage = require('./permission-mongo');
var forEach = require('async-foreach').forEach;


var __log = function () {
    if (_debug) {
        console.log.apply(console, arguments);
    }
}


function PermissionService(dataStorage) {
    this._dataStorage = dataStorage;
}

//To set PermissionMemory or PermissionMongoDB, or custom.
PermissionService.prototype.setDataStorage = function (dataStorage) {
    this._dataStorage = dataStorage;
};

PermissionService.prototype.configureStorage = function (db, collectionName) {

    var dataStorage = new PermissionStorage(db, collectionName);
    this.setDataStorage(dataStorage);

}

/**
 *
 * @param permissions {user, resource:{id, owner, parent}, action}
 * @param callback
 */
//{user, resource, actions}
PermissionService.prototype.save = function (permissions, callback) {
    permissions = utils.toArray(permissions);

    assertPermissions(permissions);
    this._dataStorage.save(permissions, callback);
};

function assertPermissions(permissions) {
    var _e;
    permissions.some(function (p) {
        _e = assertPermission(p);
        return !!_e;
    });
    if (_e) throw _e;
}

function assertPermission(permission) {
    var resource = permission.resource;
    var err;

    if (!permission) {
        err = new Error('Permission null is not valid');
    }
    if (!permission.user) {
        err = new Error('Permission.user is not valid');
    }
    if (!permission.action) {
        err = new Error('Permission.action is not valid');
    }
    if (!resource) {
        err = new Error('Permission.resource is not valid');
    }
    if ('id' in resource && !resource.id) {
        err = new Error('Permission.resource.id is not valid');
    }
    if ('onwer' in resource && !resource.owner) {
        err = new Error('Permission.resource.owner is not valid');
    }
    if ('parent' in resource && !resource.parent) {
        err = new Error('Permission.resource.parent is not valid');
    }

    var ignoredProperties = [];
    //Searching invalid properties to delete
    _.keys(resource).forEach(function (property) {
        var ignore = (property != 'id' && property != 'owner' && property != 'parent');
        if (ignore) {
            (delete resource[property]);
            ignoredProperties.push(property);
        }
    });
    if (ignoredProperties.length > 0) {
        console.warn('Before save permission; ignored permission.resource\'s properties:', ignoredProperties);
    }

    return err;
}

PermissionService.prototype.remove = function (permissions, callback) {
    permissions = utils.toArray(permissions);
    assertPermissions(permissions);
    this._dataStorage.remove(permissions, callback);
};

PermissionService.prototype.hasPermission = function (user, resource, owner, parents, action, callback) {

    var permission;
    this._dataStorage.find({user: user, resource: {content: resource, owner: owner, parents: parents}, action: action},
        function (err, doc) {
            var has = !!doc && !err;
            callback(null, has);
        });
    return;
};

var fnUserIds;
/**
 *  Function to get the User Credentials.
 * @param fn, a function with err, array params:
 * function(err, array){}. Array must have the ids of user (ie. id, role, sharelink)
 */
PermissionService.prototype.userCredentialsFn = function (fn) {
    fnUserIds = fn;
};

PermissionService.prototype.getUserIdCollectionFn = function () {
    return fnUserIds;
};

var disabled = false;
PermissionService.prototype.setDisabled = function (on) {
    disabled = on;
};
function isOwner(userIds, ownerId) {
    var is = undefined;
    is = userIds.some(function (id) {
        var b = id == ownerId;
        return b;
    });

    return is;
}
PermissionService.prototype.evaluate = function (policy, userIds, owner, parents, resource, systemAction, callback) {

    function onResult(allowed, cancelError) {
        var err = null;

        if (!cancelError) {
            err = httpUtils.getResultError(systemAction, allowed, policy, userIds, parents, resource);
        }
        callback(err, allowed);
    }

    if (!disabled) {
        if (!policy) {
            onResult(false);
        } else {
            var evaluateThis = this;

            var access = undefined;

            access = policy ? policy.access : access;

            if (access || access === false) {
                __log('Permission access for', systemAction, ':', access);
                onResult(access, access);
            } else {
                var _isOwner = isOwner(userIds, owner);

                if (_isOwner) {
                    __log('User ', userIds, 'is owner: ', owner);
                }
                var allowed = _isOwner;

                if (!allowed && policy && userIds && userIds.length) {

                    var _resource = resource;
                    allowed = userIds.some(function (id) {
                        var has = policyService.hasRolePolicyPermission(id, policy);
                        return has;
                    });
                    if (allowed) {
                        __log('Grant access by role');
                    }
                    if (!allowed) {
                        forEach(userIds, function (id) {
                            var done = this.async();
                            evaluateThis.hasPermission(id, _resource, owner, parents, policy.id,
                                function (err, allow) {
                                    allowed = allow;
                                    if (!allowed) {
                                        done(true);
                                    } else {
                                        done(false);
                                    }
                                });
                        }, function (isDone) {
                            onResult(allowed);
                        });
                    } else {
                        onResult(allowed);
                    }

                } else {
                    onResult(allowed);
                }
            }
        }
    } else {
        __log('Permission service disabled');
        onResult(disabled, true);
    }

};
var policyService;

PermissionService.prototype.setPolicyService = function (service) {
    policyService = service;
}

var _evaluateEndpoint = function ($this, req, res, callback) {

    var systemAction = httpUtils.getSystemAction(req);

    var policy = policyService.findPolicyByHttpCall(req.url, req.method);

    var userIds = [];
    var _owner = null;
    var _parents = null;
    var dataResource = undefined;
    __log('_evaluateEndpoint, policy:', policy);
    if (policy) {
        var getUserIds = Q.nbind($this.getUserIdCollectionFn());
        var getResource = policy.getResource ? Q.nbind(policy.getResource) : null;
        var getOwner = policy.getResourceOwner ? Q.nbind(policy.getResourceOwner) : null;
        var getParents = policy.getResourceParents ? Q.nbind(policy.getResourceParents) : null;

        getUserIds(req).then(function (ids) {
            userIds = ids;
            return getResource ? getResource(req) : null;
        }).then(function (resource) {
            dataResource = resource;
            return getParents ? getParents(dataResource, req) : null;
        }).then(function (parents) {
            _parents = parents;
            __log('parents found', parents);
            return getOwner ? getOwner(dataResource, _parents, req) : null;
        }).then(function (owner) {
            _owner = owner;

        }).fail(function (err) {
            __log('an error in evaluateEndpoint', err.stack);
            return null;
        }).done(function () {
            __log('evaluate with', 'user', userIds, 'onwer', _owner, 'resource', dataResource);
            $this.evaluate(policy, userIds, _owner, _parents, dataResource, systemAction, callback);
        });
    } else {
        $this.evaluate(policy, userIds, _owner, _parents, dataResource, systemAction, callback);
    }
};

PermissionService.prototype.evaluateEndpoint = function (req, res, next) {
    var promise = Q.nbind(function (cb) {
        cb && cb();
    })();
    if (!disabled) {
        var fn = Q.nbind(_evaluateEndpoint, this);
        fn(this, req, res).then(function () {
            __log('Access granted');
            next();
        }).fail(function (err) {
            __log('Access denied', err);
            res.status(403).end();
        });
    } else {
        next();
    }
    return null;
};
var _debug;
PermissionService.prototype.debug = function (debug) {
    _debug = debug;
};
exports = module.exports = new PermissionService();
