const { getHello } = require('../controllers/testController.js');
const express = require('express');

const testRouter = express.Router();

testRouter.get('/hello', getHello);

module.exports = testRouter;