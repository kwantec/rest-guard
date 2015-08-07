/**
 * Created by rramirez on 7/7/15.
 */

var _ = require('underscore');
var path = require('path');
var config = require('./config');
var restGuard = require(path.resolve('./lib/rest-guard'));
var request = require('superagent');
var should = require('should');



config.setPermissionCollection('rest_guard_permissions');
config.setDBUrl("mongodb://localhost/rest_guard_test");
var start = config.start;
var response = config.response;

var ALL = restGuard.ALL;

var OWNER = '559806333ec75a390b40771c';
var PROMOTION_ID = '559806333ec75a390b407719';
var PARENT_ID = '559806333ec75a390b40771a';
var ANCESTOR_ID='559806333ec75a390b40771b';

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
        createPolicy('Business', 'Read', '/Business/:businessId', 'get').resourceIdFromUri('businessId').grantAccess().
        createPolicy('Business', 'Update', '/Business/:businessId', 'post').grantAccess().
        createPolicy('Business', 'ReadByUser', '/User/:userId/Business', 'get').resourceOwnerIdFromUri('userId').
        createPolicy('Branch', 'Read', '/Branch/:branchId', 'get').resourceIdFromUri('branchId').
        createPolicy('Branch', 'Update', '/Branch/:branchId', 'post').
        createPolicy('Promotion', 'ReadAll', '/Promotion', 'get').resourceOwnerIdFromBody('query.data.owner').resourceParentIdFromBody('query.business').
        createPolicy('Promotion', 'Read', '/Promotion/:promotionId', 'get').resourceIdFromUri('promotionId').
        createPolicy('Promotion', 'UpdateAll', '/Promotion', 'put').resourceParentIdFromBody('query.data.parent').resourceParentIdFromQuery('query.data.parent').
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
    app.route('/api1/Promotion').get(response({get: 'If you see this is because you have access.'}));
    app.route('/api1/Promotion').put(response({put: 'If you see this is because you have access.'}));


}


describe('Policy tests', function () {
    this.timeout(3000);
    //restGuard.setDisabled(true);
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
        should(count).be.equal(11);
    });

    it('Granted resource access by user admin role, Promotion Read', function (done) {

        //defining the function that returns the user credentials
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['admin'];
            callback(null, userCredentials);
        });
        restGuard.defaultAccess('Promotion', 'Read');
        request.
            get('http://localhost:3001/api1/Promotion/'+PROMOTION_ID).
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
        request.
            post('http://localhost:3001/api1/Promotion/').
            send({_id:PROMOTION_ID}).
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
            var userCredentials = [OWNER];
            callback(null, userCredentials);
        });
        restGuard.defaultAccess('Promotion', 'Read');
        request.
            get('http://localhost:3001/api1/Promotion/'+PROMOTION_ID).
            set('Content-Type', 'application/json').
            end(function (err, res) {
                should(res.status).be.equal(200);
                should(res.forbidden).be.false();
                done();
            });
    });

    it('Granted resources access by parent because user is owner of parent, Promotions Read', function (done) {

        //defining the function that returns the user credentials
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = [OWNER];
            callback(null, userCredentials);
        });
        restGuard.defaultAccess('Promotion', 'Read');
        request.
            get('http://localhost:3001/api1/Promotion/').
            set('Content-Type', 'application/json').
            send({'query.data.parent': PARENT_ID}).
            end(function (err, res) {
                should(res.status).be.equal(200);
                should(res.forbidden).be.false();
                done();
            });
    });

    it('Granted resources access by ancestor because user is owner of ancestor, Promotions Read', function (done) {

        //defining the function that returns the user credentials
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = [OWNER];
            callback(null, userCredentials);
        });
        restGuard.defaultAccess('Promotion', 'Read');
        request.
            get('http://localhost:3001/api1/Promotion/').
            set('Content-Type', 'application/json').
            send({'query.data.parent': ANCESTOR_ID}).
            end(function (err, res) {
                should(res.status).be.equal(200);
                should(res.forbidden).be.false();
                done();
            });
    });

    it('Granted resource access because user is owner, Promotion Update', function (done) {

        //defining the function that returns the user credentials
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = [OWNER];
            callback(null, userCredentials);
        });
        restGuard.defaultAccess('Promotion', 'Update');
        request.
            post('http://localhost:3001/api1/Promotion').
            send({_id:PROMOTION_ID}).
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
        request.
            get('http://localhost:3001/api1/Promotion/'+PROMOTION_ID).
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
            {user: 'kwantec', resource: {id: PROMOTION_ID}, action: 'Read_Promotion'}
        ];

        restGuard.grantPermission(permissions);
        restGuard.defaultAccess('Promotion', 'Read');
        request.
            get('http://localhost:3001/api1/Promotion/'+PROMOTION_ID).
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
            {user: 'kwantec', resource: {owner: OWNER}, action: 'Read_Promotion'}
        ];

        restGuard.grantPermission(permissions);
        restGuard.defaultAccess('Promotion', 'Read');
        request.
            get('http://localhost:3001/api1/Promotion/'+PROMOTION_ID).
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
            {user: 'kwantec', resource: {parent: PARENT_ID}, action: 'Read_Promotion'}
        ];

        restGuard.grantPermission(permissions);
        restGuard.defaultAccess('Promotion', 'Read');
        request.
            get('http://localhost:3001/api1/Promotion/'+PROMOTION_ID).
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
            {user: 'kwantec', resource: {parent: ANCESTOR_ID}, action: 'Read_Promotion'}
        ];

        restGuard.grantPermission(permissions);
        restGuard.defaultAccess('Promotion', 'Read');
        request.
            get('http://localhost:3001/api1/Promotion/'+PROMOTION_ID).
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
        request.
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
            var userCredentials = ['unknown_user'];
            callback(null, userCredentials);
        });

        restGuard.grantAccess('Promotion', 'Read');

        request.
            get('http://localhost:3001/api1/Promotion/'+PROMOTION_ID).
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

        request.
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

        request.
            get('http://localhost:3001/api1/Promotion/'+PROMOTION_ID).
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

        request.
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
            Delete_Promotion: false,
            ReadAll_Promotion:false,
            UpdateAll_Promotion:false
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
            Delete_Promotion: true,
            ReadAll_Promotion:true,
            UpdateAll_Promotion:true
        };
        _.keys(permissions).forEach(function (p) {
            permissions[p].should.be.equal(expected[p], 'invalid ' + p);
        });
        done();
    });

    it('Checking resource id from req.body, user is owner', function (done) {
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = [OWNER];
            callback(null, userCredentials);
        });
        restGuard.defaultAccess('Promotion', 'Update');
        request.
            post('http://localhost:3001/api1/Promotion').
            set('Content-Type', 'application/json').
            send({_id:PROMOTION_ID}).
            end(function (err, res) {

                should(res.status).be.equal(200);
                should(res.forbidden).be.false();
                done();
            });

    });

    it('Checking resource id from req.query, user is owner', function (done) {
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = [OWNER];
            callback(null, userCredentials);
        });
        restGuard.defaultAccess('Promotion', 'Update');
        request.
            post('http://localhost:3001/api1/Promotion?_id='+PROMOTION_ID).
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
            {user: 'kwantec', resource: {id: PROMOTION_ID}, action: 'Update_Promotion'}
        ];

        restGuard.grantPermission(permission);
        restGuard.defaultAccess('Promotion', 'Update');
        request.
            post('http://localhost:3001/api1/Promotion').
            set('Content-Type', 'application/json').
            send({_id:PROMOTION_ID}).
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
            {user: 'kwantec', resource: {id: PROMOTION_ID}, action: 'Update_Promotion'}
        ];

        restGuard.grantPermission(permission);
        restGuard.defaultAccess('Promotion', 'Update');
        request.
            post('http://localhost:3001/api1/Promotion?_id='+PROMOTION_ID).
            set('Content-Type', 'application/json').

            end(function (err, res) {
                restGuard.revokePermission(permission);
                should(res.status).be.equal(200);
                should(res.forbidden).be.false();
                done();
            });

    });


    it('Checking resource id from req.body, user has not permission', function (done) {
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['kwantec'];
            callback(null, userCredentials);
        });

        //var permission = [
        //    {user: 'kwantec', resource: {id: PROMOTION_ID}, action: 'Update_Promotion'}
        //];

        //restGuard.grantPermission(permission);
        restGuard.defaultAccess('Promotion', 'Update');
        request.
            post('http://localhost:3001/api1/Promotion').
            set('Content-Type', 'application/json').
            send({_id:PROMOTION_ID}).
            end(function (err, res) {
                //restGuard.revokePermission(permission);
                should(res.status).be.equal(403);
                should(res.forbidden).be.true();
                done();
            });

    });

    it('Checking resource id from req.query, user has not permission', function (done) {
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['kwantec'];
            callback(null, userCredentials);
        });

        //var permission = [
        //    {user: 'kwantec', resource: {id: PROMOTION_ID}, action: 'Update_Promotion'}
        //];

        //restGuard.grantPermission(permission);
        restGuard.defaultAccess('Promotion', 'Update');
        request.
            post('http://localhost:3001/api1/Promotion?_id='+PROMOTION_ID).
            set('Content-Type', 'application/json').

            end(function (err, res) {
                //restGuard.revokePermission(permission);
                should(res.status).be.equal(403);
                should(res.forbidden).be.true();
                done();
            });

    });

    it('Checking resource owner id from req.body (defined in policy), user has  permission {query:{data: {owner:OWNER}}}', function (done) {
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['kwantec'];
            callback(null, userCredentials);
        });

        var permission = [
            {user: 'kwantec', resource: {owner: OWNER}, action: 'ReadAll_Promotion'}
        ];

        restGuard.grantPermission(permission);
        restGuard.defaultAccess('Promotion', 'ReadAll');
        request.
            get('http://localhost:3001/api1/Promotion').
            set('Content-Type', 'application/json').
            send({query:{data: {owner:OWNER}}}).
            end(function (err, res) {
                restGuard.revokePermission(permission);
                should(res.status).be.equal(200);
                should(res.forbidden).be.false();
                done();
            });

    });

    it('Checking resource owner id from req.body (defined in policy), user has  permission {query:{\'data.owner\':OWNER}}', function (done) {
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['kwantec'];
            callback(null, userCredentials);
        });

        var permission = [
            {user: 'kwantec', resource: {owner: OWNER}, action: 'ReadAll_Promotion'}
        ];

        restGuard.grantPermission(permission);
        restGuard.defaultAccess('Promotion', 'ReadAll');
        request.
            get('http://localhost:3001/api1/Promotion').
            set('Content-Type', 'application/json').
            send({query:{'data.owner':OWNER}}).
            end(function (err, res) {
                restGuard.revokePermission(permission);
                should(res.status).be.equal(200);
                should(res.forbidden).be.false();
                done();
            });

    });

    it('Checking resource owner id from req.body (defined in policy), user has  permission {query:\'{"data.owner":"OWNER"}\'}', function (done) {
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['kwantec'];
            callback(null, userCredentials);
        });

        var permission = [
            {user: 'kwantec', resource: {owner: OWNER}, action: 'ReadAll_Promotion'}
        ];

        restGuard.grantPermission(permission);
        restGuard.defaultAccess('Promotion', 'ReadAll');
        request.
            get('http://localhost:3001/api1/Promotion').
            set('Content-Type', 'application/json').
            send({query:'{"data.owner":"'+OWNER+'"}'}).
            end(function (err, res) {
                restGuard.revokePermission(permission);
                should(res.status).be.equal(200);
                should(res.forbidden).be.false();
                done();
            });

    });

    it('Checking resource parent id from req.body (defined in policy), user has permission over parent', function (done) {
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['kwantec'];
            callback(null, userCredentials);
        });

        var permission = [
            {user: 'kwantec', resource: {parent: PARENT_ID}, action: 'UpdateAll_Promotion'}
        ];

        restGuard.grantPermission(permission);
        restGuard.defaultAccess('Promotion', 'UpdateAll_Promotion');
        request.
            put('http://localhost:3001/api1/Promotion').
            set('Content-Type', 'application/json').
            send({query:'{"data.parent":"'+PARENT_ID+'"}'}).
            end(function (err, res) {
                restGuard.revokePermission(permission);
                should(res.status).be.equal(200);
                should(res.forbidden).be.false();
                done();
            });

    });

    it('Checking resource parent id from req.body (defined in policy), user has permission over ancestor', function (done) {
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['kwantec'];
            callback(null, userCredentials);
        });

        var permission = [
            {user: 'kwantec', resource: {parent: ANCESTOR_ID}, action: 'UpdateAll_Promotion'}
        ];

        restGuard.grantPermission(permission);
        restGuard.defaultAccess('Promotion', 'UpdateAll_Promotion');
        request.
            put('http://localhost:3001/api1/Promotion').
            set('Content-Type', 'application/json').
            send({query:'{"data.parent":"'+PARENT_ID+'"}'}).
            end(function (err, res) {
                restGuard.revokePermission(permission);
                should(res.status).be.equal(200);
                should(res.forbidden).be.false();
                done();
            });

    });

    it('Checking resource parent id from req.query (defined in policy), user has permission over ancestor', function (done) {
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['kwantec'];
            callback(null, userCredentials);
        });

        var permission = [
            {user: 'kwantec', resource: {parent: ANCESTOR_ID}, action: 'UpdateAll_Promotion'}
        ];

        var query = 'query={"data.parent":"'+PARENT_ID+'"}';
        restGuard.grantPermission(permission);
        restGuard.defaultAccess('Promotion', 'UpdateAll_Promotion');
        request.
            put('http://localhost:3001/api1/Promotion?'+query).
            set('Content-Type', 'application/json').

            end(function (err, res) {
                restGuard.revokePermission(permission);
                should(res.status).be.equal(200);
                should(res.forbidden).be.false();
                done();
            });

    });

    it('Checking resource parent id from req.query (defined in policy), user has permission over ancestor', function (done) {
        restGuard.userCredentialsFn(function (req, callback) {
            var userCredentials = ['kwantec'];
            callback(null, userCredentials);
        });

        var permission = [
            {user: 'kwantec', resource: {parent: ANCESTOR_ID}, action: 'UpdateAll_Promotion'}
        ];

        var query = 'query={"data.parent":"'+ANCESTOR_ID+'"}';
        restGuard.grantPermission(permission);
        restGuard.defaultAccess('Promotion', 'UpdateAll_Promotion');
        request.
            put('http://localhost:3001/api1/Promotion?'+query).
            set('Content-Type', 'application/json').

            end(function (err, res) {
                restGuard.revokePermission(permission);
                should(res.status).be.equal(200);
                should(res.forbidden).be.false();
                done();
            });

    });


});
