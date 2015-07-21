/**
 * Created by rramirez on 7/3/15.
 */
(function () {
    'use strict';
    var _ = require('underscore');

    var httpUtils = require('./http-custom-utils');
    var objectUtils = require('./object-utils');
    var forEach = require('async-foreach').forEach;
    var getElement = objectUtils.getElement;
    var isValidId = objectUtils.isValidId;

    var _mongoose; //loaded mongoose;



    function __log() {
        if (_debug) {
            console.log.apply(console, arguments);
        }
    }

    function getModelField(modelField) {
        var e = {model: null, field: null};

        if (modelField) {
            var split = modelField.split('\.');
            e.model = split[0];
            e.field = split[1];

        }
        return e;
    }

    function getOwnerField(modelName, modelOwners) {
        return modelName && modelOwners ? modelOwners.filter(function (o) {
            return o.split('\.')[0] === modelName;
        })[0] : null;

    }

    function getSearchOwnerPath(modelName, modelOwners, modelParenting) {
        var element = null;
        var _name = modelName;
        var _path = [];
        var go = true;
        do {
            element = getOwnerField(_name, modelOwners);

            if (!element) {
                element = getElement(_name, modelParenting);
                if (element) {
                    _name = modelParenting[element];
                }
            } else {
                go = false;
            }
            if (element) {
                _path.push(element);
            } else {
                go = false;
            }
        } while (go);
        return _path;
    }

    function getSearchParentPath(modelName, modelParenting) {
        var element = null;
        var _name = modelName;
        var _path = [];
        do {
            element = getElement(_name, modelParenting);
            if (element) {
                _path.push(element);
                _name = modelParenting[element];
            } else {
                _name = null;
            }
        } while (element);
        return _path;
    }

    function getFieldValueFromStorage(modelName, model, field, callback, avoidGetFromValue) {
        if (avoidGetFromValue || !getFieldValueFromObject(model, field, callback)) {
            var id = model;
            var Model = _mongoose.model(modelName);
            if (isValidId(id)) {
                var condition = {_id: id};
                var projection = {};
                projection[field] = 1;
                __log(arguments, condition, projection, typeof id);
                    Model.findOne(condition, projection, function (err, result) {
                        __log('RESULT');
                        var value;
                        if (!err && result) {
                            value = result[field];
                        }
                        callback(err, value);
                    });

            } else {
                callback(new Error('No owner id found for ' + modelName));
            }
        }
    }

    function getFieldValueFromObject(model, field, callback) {
        var pass;
        var hasCallback = !!callback;
        var value = null;
        pass = (model && model[field]);
        if (pass) {
            value = model[field];
            if (callback)
                callback(null, value);
        }
        return !hasCallback ? value : pass;
    }

    function _getParents(modelName, model, modelParenting, callback) {
        var path = getSearchParentPath(modelName, modelParenting);

        getIds(path, model, callback);

    }

    function _getFieldValue(model, fieldName) {
        var value;
        if (typeof (model) === 'object') {
            value = getFieldValueFromObject(model, fieldName);
        } else {
            value = model;
        }
        return value;
    }

    function _getOwner(modelName, model, modelOwners, modelParenting, callback) {
        var path = getSearchOwnerPath(modelName, modelOwners, modelParenting);

        __log('path', path);
        //First level is trying to get owner id from request.
        getIds(path, model, callback);
    }

    function getIds(path, model, callback) {
        var id;
        if (path.length >= 1) {
            var field = getModelField(path[0]).field;
            id = _getFieldValue(model, field);
            id = id ? id + '' : id;
        }


        if (path.length <= 1 && id) {
            callback(null, [id]);
        } else {
            var _id =id?id:model._id;
            var _path = id?_.rest(path):path;
            getIDsBySearchPath(_id, _path, callback);
        }
    }

    function getIDsBySearchPath(id, path, callback) {
        var ids = [];
        var _id = id + '';
        var storage = getFieldValueFromStorage;

        if (id && path && callback) {
            ids.push(id + '');
            forEach(path, function (p) {
                var modelField = getModelField(p);
                __log('path', p);
                var next = this.async();
                storage(modelField.model, _id, modelField.field, function (err, id) {
                    if(id){
                        id = id+'';
                        ids.push(id);
                    }
                    _id = id;
                    if (!err && id) {
                        next();
                    } else {
                        next(false);
                    }
                });

            }, function () {
                callback(null, ids);
            });
        }else{
            callback(null, ids);
        }
    }

    function getModelFromReq(id, req) {
        var query = httpUtils.getRequestQuery(req);
        var body = httpUtils.getRequestBody(req);
        var object = _.extend(query, body);
        if (!('_id' in object) || typeof id !== 'undefined') {
            object['_id'] = id;
        }
        return object;
    }

    function getIdFromReq( req) {
        var query = httpUtils.getRequestQuery(req);
        var body = httpUtils.getRequestBody(req);
        var object = _.extend(query, body);

        return object?object._id:undefined;
    }

    function setMongoose(mongoose){
        _mongoose = mongoose;
    }

    var _debug = false;
    module.exports.debug = function(debug){ _debug = debug;};
    module.exports.getModelFromReq = getModelFromReq;
    module.exports.getIdFromReq = getIdFromReq;
    module.exports.getOwner = _getOwner;
    module.exports.getParents = _getParents;
    module.exports.getFieldValueFromStorage = getFieldValueFromStorage;
    module.exports.setMongoose = setMongoose;


})();