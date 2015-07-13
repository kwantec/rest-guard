'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var path = require('path');
var definitions = require('./definitions.server.model.js');

/**
 *  Schemas
 */
var BusinessSchema = new Schema(definitions.business());
var BranchSchema = new Schema(definitions.branch());
var PromotionSchema = new Schema(definitions.promotion());


mongoose.model('Business', BusinessSchema);
mongoose.model('Branch', BranchSchema);
mongoose.model('Promotion', PromotionSchema);
