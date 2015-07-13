/**
 * Created by rramirez on 7/1/15.
 */
'use strict';

function argumentsToArray(args) {
    var a = [];
    for (var i = 0; args && i < args.length; i++) {
        a.push(args[i]);
    }
    return a;
}

function objectInArray(ob){
    return [ob];
}

function toArray(ob) {
    var result;
    result = (ob instanceof Array) ? ob : (typeof (ob) === 'string' || typeof (ob) === 'number' || ob instanceof Object) ? [ob] : [];
    return result;

}

function injectMethodBeforeCall(obj, methodName, fnToInject, paramsToInject, returnedObject) {
    var fn = obj[methodName];
    var wrapper = function () {
        var args = fnToInject.apply(this, (paramsToInject || []).concat(argumentsToArray(arguments)));
        var result = fn.apply(this, args || arguments);
        if (returnedObject) {
            returnedObject(result);
        }
        return result;
    };
    obj[methodName] = wrapper;
}

function getCallBack(){

    var args = arguments[0] instanceof Array? arguments[0]: argumentsToArray(arguments);
    var c;
    args.reverse().some(function(a){
        return typeof (a) ==='function'?(c=a):false;
    });
    return c;
}

module.exports.getCallBack = getCallBack;
module.exports.injectMethodBeforeCall = injectMethodBeforeCall;
module.exports.toArray = toArray;
module.exports.argumentsToArray = argumentsToArray;
module.exports.objectInArray = objectInArray;