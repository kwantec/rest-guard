'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

exports.business = function () {

    var retValue = {
        created: {
            type: Date,
            default: Date.now
        },
        name: {
            type: String,
            default: '',
            trim: true,
            required: 'Business name cannot be blank'
        },
        user: {
            type: Schema.ObjectId,
            ref: 'User'
        },
        categoryIds: []
    };
    return retValue;
};

exports.branch = function () {

    var retValue = {
        created: {
            type: Date,
            default: Date.now
        },

        name: {
            type: String,
            default: '',
            trim: true,
            required: 'Branch name cannot be blank'
        },

        business: {
            type: Schema.ObjectId,
            ref: 'Business'
        },

    };
    return retValue;
};

exports.promotion = function () {

    var retValue = {
        name: {
            type: String,
            default: '',
            trim: true,
            required: 'Promotion name cannot be blank'
        },
        branch: {
            type: Schema.ObjectId,
            ref: 'Branch'
        }
    };
    return retValue;
};

