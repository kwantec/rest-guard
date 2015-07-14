/**
 * Created by rramirez on 7/7/15.
 */

var _ = require('underscore');
var path = require('path');
var config = require('./config');
var restGuard = require(path.resolve('./lib/rest-guard'));
var request = require('superagent');
var should = require('should');


config.setDBUrl("mongodb://localhost/rest_guard_test");
var start = config.start;
var response = config.response;

var ALL = restGuard.ALL;

function setMiddleware() {


    var result = ['/api1',
        restGuard.middleware
    ];
    config.setMiddleware(result);
}

setMiddleware();

function init(app) {

    //Configuring model data owners, parenting;
    var owners = ['Business.user'];
    var parenting = {'Branch.business': 'Business', 'Promotion.branch': 'Branch'};

    restGuard.setModelOwnerFields(owners);
    restGuard.setModelParentingFields(parenting);

    restGuard.debug(false);

//Configuring REST policies.
    restGuard.
        createPolicy('Business', 'ReadAll', '/Business', 'get').denyAccess().
        createPolicy('Business', 'Read', '/Business/:businessId', 'get').setResourceId('businessId').grantAccess().
        createPolicy('Business', 'Update', '/Business/:businessId', 'post').grantAccess().
        createPolicy('Business', 'ReadByUser', '/User/:userId/Business', 'get').setResourceOwnerId('userId').
        createPolicy('Branch', 'Read', '/Branch/:branchId', 'get').setResourceId('branchId').
        createPolicy('Branch', 'Update', '/Branch/:branchId', 'post').
        createPolicy('Promotion', 'Read', '/Promotion/:promotionId', 'get').setResourceId('promotionId').
        createPolicy('Promotion', 'Update', '/Promotion', 'POST').
        createPolicy('Promotion', 'Delete', '/Promotion/:promotionId', 'DELETE');

    //restGuard.printPolicies();

    //Configuring Roles
    restGuard.
        grantRoles(['admin'], [ALL], 'Business').
        grantRoles(['admin'], [ALL], 'Branch').
        grantRoles(['admin'], [ALL], 'Promotion').
        grantRoles(['guest'], ['Read', 'ReadAll'], 'Business').
        grantRoles(['guest'], ['Read'], 'Branch').
        grantRoles(['guest'], ['Read'], 'Promotion').
        grantRoles(['promoter'], ['Update'], 'Promotion');

    //restGuard.printRoles();

    //Defining a route
    app.route('/api1/Promotion/:promotionId').get(response({get: 'If you see this is because you have access.'}));
    app.route('/api1/Promotion').post(response({post: 'If you see this is because you have access.'}));


}


describe('Policy tests', function () {
    this.timeout(30000);
    var _app;
    before(function (done) {
        config.start(function (app) {
            _app = app;
            init(_app);
            done();
        });
    });

    after(function (done) {
        config.stop(function () {
            console.log('Testing end');
            done();
        });
    });

    it('Policy count', function () {
        var count = restGuard.policiesCount();
        should(count).be.equal(9);
    });

    it('Granted resource access by user admin role, Promotion Read', function (done) {

        //defining the function that returns the user credentials
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['admin'];
            callback(null, userCredentials);
        });
        restGuard.defaultAccess('Promotion', 'Read');
        var x = request.
            get('http://localhost:3001/api1/Promotion/559806333ec75a390b407719').
            set('Content-Type', 'application/json').
            end(function (err, res) {
                should(res.status).be.equal(200);
                should(res.forbidden).be.false();
                done();
            });
    });

    it('Denied resource access by user guest role, Promotion Update', function (done) {

        //defining the function that returns the user credentials
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['guest'];
            callback(null, userCredentials);
        });
        restGuard.defaultAccess('Promotion', 'Update');
        var x = request.
            post('http://localhost:3001/api1/Promotion/').
            send({_id:'559806333ec75a390b407719'}).
            set('Content-Type', 'application/json').
            end(function (err, res) {
                should(res.status).be.equal(403);
                should(res.forbidden).be.true();
                done();
            });
    });

    it('Granted resource access because user is owner, Promotion Read', function (done) {

        //defining the function that returns the user credentials
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['559806333ec75a390b40771c'];
            callback(null, userCredentials);
        });
        restGuard.defaultAccess('Promotion', 'Read');
        var x = request.
            get('http://localhost:3001/api1/Promotion/559806333ec75a390b407719').
            set('Content-Type', 'application/json').
            end(function (err, res) {
                should(res.status).be.equal(200);
                should(res.forbidden).be.false();
                done();
            });
    });

    it('Granted resource access because user is owner, Promotion Update', function (done) {

        //defining the function that returns the user credentials
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['559806333ec75a390b40771c'];
            callback(null, userCredentials);
        });
        restGuard.defaultAccess('Promotion', 'Update');
        var x = request.
            post('http://localhost:3001/api1/Promotion').
            send({_id:'559806333ec75a390b407719'}).
            set('Content-Type', 'application/json').
            end(function (err, res) {
                should(res.status).be.equal(200);
                should(res.forbidden).be.false();
                done();
            });
    });

    it('Denied resource access; user has not permission, Promotion Read', function (done) {

        //defining the function that returns the user credentials
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['kwantec'];
            callback(null, userCredentials);
        });

        restGuard.defaultAccess('Promotion', 'Read');
        var x = request.
            get('http://localhost:3001/api1/Promotion/559806333ec75a390b407719').
            set('Content-Type', 'application/json').
            end(function (err, res) {
                should(res.status).be.equal(403);
                should(res.forbidden).be.true();
                done();
            });
    });

    it('Granted resource access by resource id permission, Promotion Read', function (done) {

        //defining the function that returns the user credentials
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['kwantec'];
            callback(null, userCredentials);
        });
        var permissions = [
            {user: 'kwantec', resource: {id: '559806333ec75a390b407719'}, action: 'Read_Promotion'}
        ];

        restGuard.grantPermission(permissions);
        restGuard.defaultAccess('Promotion', 'Read');
        var x = request.
            get('http://localhost:3001/api1/Promotion/559806333ec75a390b407719').
            set('Content-Type', 'application/json').
            end(function (err, res) {
                should(res.status).be.equal(200);
                should(res.forbidden).be.false();
                restGuard.revokePermission(permissions);
                done();
            });
    });

    it('Granted resource access by resource owner permission, Promotion Read', function (done) {

        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['kwantec'];
            callback(null, userCredentials);
        });
        var permissions = [
            {user: 'kwantec', resource: {owner: '559806333ec75a390b40771c'}, action: 'Read_Promotion'}
        ];

        restGuard.grantPermission(permissions);
        restGuard.defaultAccess('Promotion', 'Read');
        var x = request.
            get('http://localhost:3001/api1/Promotion/559806333ec75a390b407719').
            set('Content-Type', 'application/json').
            end(function (err, res) {
                should(res.status).be.equal(200);
                should(res.forbidden).be.false();
                restGuard.revokePermission(permissions);
                done();
            });
    });

    it('Granted resource access by resource parent permission, Promotion Read', function (done) {
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['kwantec'];
            callback(null, userCredentials);
        });
        var permissions = [
            {user: 'kwantec', resource: {parent: '559806333ec75a390b40771a'}, action: 'Read_Promotion'}
        ];

        restGuard.grantPermission(permissions);
        restGuard.defaultAccess('Promotion', 'Read');
        var x = request.
            get('http://localhost:3001/api1/Promotion/559806333ec75a390b407719').
            set('Content-Type', 'application/json').
            end(function (err, res) {
                should(res.status).be.equal(200);
                should(res.forbidden).be.false();
                restGuard.revokePermission(permissions);
                done();
            });
    });

    it('Granted resource access by ancestor, Promotion Read', function (done) {
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['kwantec'];
            callback(null, userCredentials);
        });
        var permissions = [
            {user: 'kwantec', resource: {parent: '559806333ec75a390b40771b'}, action: 'Read_Promotion'}
        ];

        restGuard.grantPermission(permissions);
        restGuard.defaultAccess('Promotion', 'Read');
        var x = request.
            get('http://localhost:3001/api1/Promotion/559806333ec75a390b407719').
            set('Content-Type', 'application/json').
            end(function (err, res) {
                should(res.status).be.equal(200);
                should(res.forbidden).be.false();
                restGuard.revokePermission(permissions);
                done();
            });
    });

    it('Denied resource access (unknown resource id), Promotion Read', function (done) {
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['kwantec'];
            callback(null, userCredentials);
        });
        restGuard.defaultAccess('Promotion', 'Read');
        var x = request.
            get('http://localhost:3001/api1/Promotion/559806333ec75a390b407718').
            set('Content-Type', 'application/json').
            end(function (err, res) {
                should(res.status).be.equal(403);
                should(res.forbidden).be.true();
                done();
            });
    });

    it('Grant resource access by policy grant access, Promotion Read', function (done) {
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['unkown_user'];
            callback(null, userCredentials);
        });

        restGuard.grantAccess('Promotion', 'Read');

        var x = request.
            get('http://localhost:3001/api1/Promotion/559806333ec75a390b407719').
            set('Content-Type', 'application/json').
            end(function (err, res) {
                should(res.status).be.equal(200);
                should(res.forbidden).be.false();
                done();
            });
    });

    it('Denied resource access by policy deny access, Promotion Update', function (done) {
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['admin'];
            callback(null, userCredentials);
        });

        restGuard.denyAccess('Promotion', 'Update');

        var x = request.
            post('http://localhost:3001/api1/Promotion').
            set('Content-Type', 'application/json').
            end(function (err, res) {
                should(res.status).be.equal(403);
                should(res.forbidden).be.true();
                done();
            });
    });

    it('Denied resource access by policy default access, Promotion Read', function (done) {
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['kwantec'];
            callback(null, userCredentials);
        });

        restGuard.defaultAccess('Promotion', 'Read');

        var x = request.
            get('http://localhost:3001/api1/Promotion/559806333ec75a390b407719').
            set('Content-Type', 'application/json').
            end(function (err, res) {
                should(res.status).be.equal(403);
                should(res.forbidden).be.true();
                done();
            });
    });

    it('Denied access; policy not found, Unknown task', function (done) {
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['kwantec'];
            callback(null, userCredentials);
        });

        restGuard.defaultAccess('Promotion', 'Read');

        var x = request.
            get('http://localhost:3001/api1/Unknown/559806333ec75a390b407718').
            set('Content-Type', 'application/json').
            end(function (err, res) {
                should(res.status).be.equal(403);
                should(res.forbidden).be.true();
                done();
            });
    });

    it('Checking guest permissions', function (done) {

        var permissions = restGuard.getRolesPermissions('guest');

        var expected = {
            ReadAll_Business: true,
            Read_Business: true,
            Update_Business: false,
            ReadByUser_Business: false,
            Read_Branch: true,
            Update_Branch: false,
            Read_Promotion: true,
            Update_Promotion: false,
            Delete_Promotion: false
        };
        _.keys(permissions).forEach(function (p) {
            permissions[p].should.be.equal(expected[p], 'invalid ' + p);
        });
        done();
    });

    it('Checking admin permissions', function (done) {

        var permissions = restGuard.getRolesPermissions('admin');

        var expected = {
            ReadAll_Business: true,
            Read_Business: true,
            Update_Business: true,
            ReadByUser_Business: true,
            Read_Branch: true,
            Update_Branch: true,
            Read_Promotion: true,
            Update_Promotion: true,
            Delete_Promotion: true
        };
        _.keys(permissions).forEach(function (p) {
            permissions[p].should.be.equal(expected[p], 'invalid ' + p);
        });
        done();
    });

    it('Checking resource id from req.body, user is owner', function (done) {
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['559806333ec75a390b40771c'];
            callback(null, userCredentials);
        });
        restGuard.defaultAccess('Promotion', 'Update');
        var x = request.
            post('http://localhost:3001/api1/Promotion').
            set('Content-Type', 'application/json').
            send({_id:'559806333ec75a390b407719'}).
            end(function (err, res) {

                should(res.status).be.equal(200);
                should(res.forbidden).be.false();
                done();
            });

    });

    it('Checking resource id from req.query, user is owner', function (done) {
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['559806333ec75a390b40771c'];
            callback(null, userCredentials);
        });
        restGuard.defaultAccess('Promotion', 'Update');
        var x = request.
            post('http://localhost:3001/api1/Promotion?_id=559806333ec75a390b407719').
            set('Content-Type', 'application/json').

            end(function (err, res) {

                should(res.status).be.equal(200);
                should(res.forbidden).be.false();
                done();
            });

    });

    it('Checking resource id from req.body, user has permission', function (done) {
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['kwantec'];
            callback(null, userCredentials);
        });

        var permission = [
            {user: 'kwantec', resource: {id: '559806333ec75a390b407719'}, action: 'Update_Promotion'}
        ];

        restGuard.grantPermission(permission);
        restGuard.defaultAccess('Promotion', 'Update');
        var x = request.
            post('http://localhost:3001/api1/Promotion').
            set('Content-Type', 'application/json').
            send({_id:'559806333ec75a390b407719'}).
            end(function (err, res) {
                restGuard.revokePermission(permission);
                should(res.status).be.equal(200);
                should(res.forbidden).be.false();
                done();
            });

    });

    it('Checking resource id from req.query, user has permission', function (done) {
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['kwantec'];
            callback(null, userCredentials);
        });

        var permission = [
            {user: 'kwantec', resource: {id: '559806333ec75a390b407719'}, action: 'Update_Promotion'}
        ];

        restGuard.grantPermission(permission);
        restGuard.defaultAccess('Promotion', 'Update');
        var x = request.
            post('http://localhost:3001/api1/Promotion?_id=559806333ec75a390b407719').
            set('Content-Type', 'application/json').

            end(function (err, res) {
                restGuard.revokePermission(permission);
                should(res.status).be.equal(200);
                should(res.forbidden).be.false();
                done();
            });

    });



});
