/**
 * Created by rramirez on 7/2/15.
 */
'use strict';
function firstLetterToUpper(str){
    return str?str.substring(0, 1).toUpperCase()+str.substring(1):str;
}

function getGetMethodName(propertyName) {
    var name = null;
    if (propertyName && propertyName.length > 0) {
        name = 'get' + propertyName.substring(0, 1).toUpperCase() + propertyName.substring(1);
    }
    return name;
}

module.exports.firstLetterToUpper = firstLetterToUpper;
module.exports.getGetMethodName = getGetMethodName;
