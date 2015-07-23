/**
 * Created by rramirez on 7/23/15.
 */

var should = require('should');
var path = require('path');
var deepQuery = require(path.resolve('./lib/deep-query'));

//console.error = function(){};
describe('Testing deep-query module', function () {
    var logErrorTemp;
    before(function(){
        logErrorTemp = console.error;
        console.error = function(){};
    });
    after(function(){
        console.error = logErrorTemp;
    });

    var query =[ "foo.bar.deep", "foo.bar.deep.Foo", "foo", "foo.bar"];
    it('query '+query[0]+' must return 3 elements (1)', function () {
        var _query = query[0];
        var result = deepQuery(
            {
                foo: {bar: {deep: 'Foo Bar'}},
                'foo.bar': '{"deep": {"Foo": "Bar"}}',
                'foo.bar.deep': 'deep'
            },
            _query);
        should(result).containDeep(['deep', 'Foo Bar', {Foo: 'Bar'}]);
    });

    it('query '+query[0]+' must return 3 elements (2)', function () {
        var _query = query[0];
        var result = deepQuery(
            {
                foo: {'bar.deep': 'Foo Bar'},
                'foo.bar': '{"deep": {"Foo": "Bar"}}',
                'foo.bar.deep': 'deep'
            },
            _query);
        should(result).containDeep(['deep', 'Foo Bar', {Foo: 'Bar'}]);
    });

    it('query '+query[0]+' must return 3 elements (1), stringified foo value', function () {
        var _query = query[0];
        var result = deepQuery(
            {
                foo: '{"bar": {"deep": "Foo Bar"}}',
                'foo.bar': '{"deep": {"Foo": "Bar"}}',
                'foo.bar.deep': 'deep'
            },
            _query);
        should(result).containDeep(['deep', 'Foo Bar', {Foo: 'Bar'}]);
    });

    it('query '+query[0]+' must return 2 elements, JSON.parse error', function () {
        var _query = query[0];
        var result = deepQuery(
            {
                foo: {'bar.deep': 'Foo Bar'},
                'foo.bar': '{\'deep\': {"Foo": "Bar"}}',
                'foo.bar.deep': 'deep'
            },
            _query);
        should(result).containDeep(['deep', 'Foo Bar']);
    });

    it('query '+query[0]+' must return 2 elements', function () {
        var _query = query[0];
        var result = deepQuery(
            {
                foo: {'bar.deep': 'Foo Bar'},
                'foo.bar': {'deep.Foo': "Bar"},
                'foo.bar.deep': 'deep'
            },
            _query);
        should(result).containDeep(['deep', 'Foo Bar']);
    });

    it('query '+query[1]+' must return 1 element', function () {
        var _query = query[1];
        var result = deepQuery(
            {
                foo: {'bar.deep': 'Foo Bar'},
                'foo.bar': {'deep.Foo': "Bar"},
                'foo.bar.deep': 'deep'
            },
            _query);
        should(result).containDeep([ 'Bar']);
    });

    it('query '+query[2]+' must return 1 element', function () {
        var _query = query[2];
        var result = deepQuery(
            {
                foo: {'bar.deep': 'Foo Bar'},
                'foo.bar': {'deep.Foo': "Bar"},
                'foo.bar.deep': 'deep'
            },
            _query);
        should(result).containDeep([ {'bar.deep': 'Foo Bar'}]);
    });
    it('query '+query[3]+' must return 1 element', function () {
        var _query = query[3];
        var result = deepQuery(
            {
                foo: {'bar.deep': 'Foo Bar'},
                'foo.bar': {'deep.Foo': "Bar"},
                'foo.bar.deep': 'deep'
            },
            _query);
        should(result).containDeep([ {'deep.Foo': "Bar"}]);
    });

    it('query on null data must return 0 element', function () {
        var _query = query[3];
        var result = deepQuery(
            null,
            _query);
        should(result.length).equal(0);
    });
    it('null query on data must return 0 element', function () {
        var _query = null;
        var result = deepQuery(
            {foo: {bar: {deep: 'Foo Bar'}}},
            _query);
        should(result.length).equal(0);
    });
    it('null query on null data must return 0 element', function () {
        var _query = null;
        var result = deepQuery(
            null,
            _query);
        should(result.length).equal(0);
    });
});