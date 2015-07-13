/**
 * Created by rramirez on 7/1/15.
 */
/* global lib */

'use strict';


function toString(ob, field) {
    if (ob && ob[field])
        ob[field] = ob[field] + '';
}
function savePermission($this, permission, callback) {
    toString(permission.resource, 'id');
    toString(permission.resource, 'owner');
    toString(permission.resource, 'parent');
    $this.col.findAndModify(
        {
            $and: [
                {user: permission.user+''},
                {resource: permission.resource},
                {action: permission.action+''}]
        },
        [],
        {
            $set: {
                user: permission.user+'',
                resource: permission.resource, action: permission.action+''
            }
        },
        {upsert: true},
        callback
    );
}

function removePermission($this, permission, callback) {
    var query = _getQuery(permission);
    $this.col.remove(query,
        callback);
}

function arrayToString(arr){
    var res = [];
    if(arr) {
        arr.forEach(function(e){
            if(typeof e !== 'undefined') {
                res.push(e + '');
            }else{
                res.push(e);
            }
        });
    }
    return res;
}

/**
 *
 * @param {type} $this
 * @param {type} permission {user:null, resource:{content:null, owner:null, parents:[], action:null}}
 * @param {type} callback
 * @returns {undefined}
 */
function findPermission($this, permission, callback) {

    var query = _getQuery(permission);

    $this.col.findOne(
        query, [],
        function (err, v) {
            callback(err, v);
        }
    );
}

function _getQuery(permission){
    var resourceConditions = [];
    var resourceContent = permission.resource.content + '';
    var resourceOwner = permission.resource.owner + '';
    var resourceParents = arrayToString(permission.resource.parents);

    if (resourceOwner) {
        resourceConditions.push({"resource.owner": resourceOwner});
    }
    if (resourceContent) {
        resourceConditions.push({"resource.id": resourceContent});
    }
    if (resourceParents) {
        resourceConditions.push({"resource.parent": {"$in": resourceParents}});
    }
    var query = {
        "$and": [
            {"$or": resourceConditions},
            {"user": permission.user},
            {"action": permission.action}
        ]
    };
    var stringQuery = JSON.stringify(query);
    query = JSON.parse(stringQuery);
    return query;
}

function getCollection(db, colName) {
    var collection = db.collection(colName);

    return collection;
}

function objectOrArrayExec($this, permission, fn, callback) {

    if (permission instanceof Array) {
        permission.forEach(function (p) {
            fn($this, p, callback);
        });
    } else {
        fn($this, permission, callback);
    }
}
function MongoDBDataStorage(db, colName) {

    var _colName = colName || 'acl_module_permissions';
    this.col = getCollection(db, _colName);

    /**
     *
     * @param {type} permission
     * @param {type} callback function(err, result)
     * @returns {undefined}
     */
    this.save = function (permission, callback) {
        objectOrArrayExec(this, permission, savePermission, callback);
    };
    /**
     *
     * @param {type} permission
     * @param {type} callback function(err, result)
     * @returns {undefined}
     */
    this.remove = function (permission, callback) {
        objectOrArrayExec(this, permission, removePermission, callback);
    };
    /**
     *
     * @param {type} permission
     * @param {type} callback function(err, result)
     * @returns {undefined}
     */
    this.find = function (permission, callback) {
        findPermission(this, permission, callback);
    };

}

module.exports = MongoDBDataStorage;
