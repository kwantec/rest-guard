/**
 * Created by rramirez on 7/3/15.
 */
'use strict';

var path = require('path');

var ObjectID = require('mongodb').ObjectID;
var mongoose = require('mongoose');
var promisify = require(path.resolve('./lib/all-promise')).promisify;

//--------------------------------testing.


function createModelsData(dbUrl, done) {

    var db = mongoose.connection;


    mongoose.connect(dbUrl
        , function (err) {
            require('./main.server.model.js');


            if (!err) {

                var promotionId = new ObjectID.createFromHexString('559806333ec75a390b407719');
                var branchId = new ObjectID.createFromHexString('559806333ec75a390b40771a');
                var businessId = new ObjectID.createFromHexString('559806333ec75a390b40771b');
                var userId = new ObjectID.createFromHexString('559806333ec75a390b40771c');

                var Business = mongoose.model('Business');
                var Branch = mongoose.model('Branch');
                var Promotion = mongoose.model('Promotion');

                var updateBusiness = promisify(Business, Business.update);
                var updateBranch = promisify(Branch, Branch.update);
                var updatePromotion = promisify(Promotion, Promotion.update);
                updateBusiness(
                    {user: userId, name: 'KwanTech'},
                    {_id: businessId, user: userId, name: 'KwanTech'},
                    {upsert: true})
                    .then(function () {
                        console.log('business.then');
                        return updateBranch({
                                business: businessId,
                                name: 'Branch KwanTech'
                            }, {
                                _id: branchId,
                                business: businessId,
                                name: 'Branch KwanTech'
                            },
                            {upsert: true});
                    }).then(function () {
                        console.log('branch.then');
                        return updatePromotion({
                            branch: branchId,
                            name: 'Promotion KwanTech'
                        }, {
                            _id: promotionId,
                            branch: branchId,
                            name: 'Promotion KwanTech'
                        }, {upsert: true});
                    }).then(function () {
                        console.log('models data saving done');
                        done(db);
                    }).fail(function () {
                        console.log('Something fails', arguments);
                    });
            } else {
                console.error('on createData:', err, 'you must have mongod running at', dbUrl);
                mongoose.disconnect(function () {
                    console.log('DB disconnected');
                });
                done(null);
            }
        });
}

function deleteModelsData(done) {
    var Business = mongoose.model('Business');
    var Branch = mongoose.model('Branch');
    var Promotion = mongoose.model('Promotion');
    var removeBusiness = promisify(Business, Business.remove);
    var removeBranch = promisify(Branch, Branch.remove);
    var removePromotion = promisify(Promotion, Promotion.remove);

    removePromotion({}).then(function () {
        return removeBranch({});
    }).then(function () {
        return removeBusiness({});
    }).then(done).fail(function (err) {
        console.error('Deleting models, something fails', err);
    });

}
module.exports.createData = createModelsData;
module.exports.deleteData = deleteModelsData;
