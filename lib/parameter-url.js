/**
 * Created by rramirez on 7/1/15.
 */

var regexp = /:[^\/]+/gi;
//var regexpUriParts = /((?:\/?)[^\/\? ]+(?=\/?))|((?!\/)[^\/\? ]+(?=\/))/gi;


var regexpUriParts = /((?=(\/?))[^\/ ]+(?=(\/|\?|$)))/gi;
var regexpStartParam = /^\:/ig;
var regexpQuery = /(?:\?).+/gi;

function getRegexpPart(part){

    var exp = part?new RegExp('^' + part + '$', 'ig'):null;
    return exp;
}

function urlMatch(template, uri){
    if (!template || !uri) return false;

    var templateParts = getGroups(regexpUriParts, template);
    var uriParts = getGroups(regexpUriParts, uri);
    var match = !!(sameLength(templateParts, uriParts));
    for (var i = 0; i < templateParts.length && match; i++) {
        var part = templateParts[i];
        var uriPart = uriParts[i];
        if (!part.match(regexpStartParam) && (!uriPart || !uriPart.match(getRegexpPart(part)))) {
            match = false;
            break;
        }
    }
    return match;
}

function sameLength(templateParts, uriParts){
    return !!(templateParts&&uriParts&&templateParts.length>0&&templateParts.length===uriParts.length);
}

function getParameters(template, uri) {
    if (!template || !uri) return [];

    var templateParts = getGroups(regexpUriParts, template);
    var uriParts = getGroups(regexpUriParts, uri);

    var match = !!(sameLength(templateParts, uriParts));
    var params = {};
    for (var i = 0; match && i < templateParts.length; i++) {
        var part = templateParts[i];
        var uriPart = uriParts[i];
        if (part.match(regexpStartParam)) {
            var ob = {};
            //ob[part.replace(regexpStartParam, '')] = uriParts[i];
            params[part.replace(regexpStartParam, '')] = uriParts[i];
        } else if (!uriPart || !uriPart.match(getRegexpPart(part))) {
            params = [];
            break;
        }
    }
    return params;
}

function getGroups(regexp, str) {
    var data = [];
    if (regexp && str) {
        do {
            var r = regexp.exec(str);
            if (r) {
                data.push(r[0].replace(regexpQuery, ''));
            }
        } while (r);
    }
    //console.log(data);
    return data;
}

module.exports.urlMatch = urlMatch;
module.exports.getParameters = getParameters;
