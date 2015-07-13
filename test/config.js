/**
 * Created by rramirez on 7/4/15.
 */
var path = require('path');
var bodyParser = require('body-parser');

var app = require('express')();

var policyService = require(path.resolve('./lib/rest-guard'));

var modelsData = require(path.resolve('./test/models/models-config'));

var dbUrl = "mongodb://localhost/rest_guard_test";
var _db = null;
var _server;

module.exports.setDBUrl = function (url) {
    dbUrl = url;
};

function callResponse(response) {
    return function (req, res) {
        res.json(response);
    }
}


function connectMongo(example) {
    modelsData.createData(dbUrl, function (db) {

        if (db) {
            _db = db;

            //configuring REST handlers
            configureExpress(app);

            //configuring permissions storage
            configurePermissionStorage(db);

            //example(app);
            initServer(example);
        } else {
            console.error('No database connection');
        }
    });
}
function configureExpress(app) {

    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(bodyParser.json());

    if (_middleware) {
        app.use.apply(app, _middleware);
    }
}

function configurePermissionStorage(db) {
    policyService.configureStorage(db, 'rest_guard_permissions');
}

function initServer(onConnect) {
    var server;
    server = app.listen(3001, function () {
        _server = server;
        var host = server.address().address;
        var port = server.address().port;
        onConnect ? onConnect(app) : null;

        console.log('listening at http://%s:%s', host, port);
    });
}

var _middleware;
function setMiddleware(middleware) {
    _middleware = middleware;
}

function start(example) {
    connectMongo(example);
}

function stop(fn) {

    var shutdown = function () {
        if (_db) {
            //_db.on('close', fn);
            _db.close();
        }
        if (_server) {
            _server.close();
        }
        fn();
    };
    modelsData.deleteData(shutdown);
}
module.exports.start = start;
module.exports.stop = stop;
module.exports.response = callResponse;
module.exports.setMiddleware = setMiddleware;
