/**
 * Created by rramirez on 7/21/15.
 */
'use strict';

function deepQuery(data, query) {
    var result = [];
    if(data&&query){
        var fields = query.split('\.');
        result = _evaluate(data, fields);
    }
    return result;
}

function _evaluate(data, fields) {

    var result = undefined;
    var arrResult = [];
    for (var end = 0, start = 0; end < fields.length; end++) {
        var property = [];
        for (var i = start; i <= end; i++) {
            property.push(fields[i]);
        }
        property = property.join('.');
        result = data[property];
        if (result && end < fields.length - 1) {
            try {
                if (typeof result === 'string') {
                    result = JSON.parse(result);
                }
                arrResult = arrResult.concat(_evaluate(result, fields.slice(end + 1)));
            } catch (e) {
                console.error(e.stack);
            }
        }
    }
    result && arrResult.push(result);
    return arrResult;
}

module.exports = deepQuery;