const { helloFunc } = require('../modules/hello.js');

const { successResponse, errorResponse } = require('../helper.js');

module.exports.getHello = (req, res) => {
  try {
     const response = helloFunc();
     if (response) return successResponse(res, response);

     return errorResponse(res, "Failed to retrieve response", 500);
  } catch (e) {
     console.error(e);
     return errorResponse(res, e.message, 500);
  }
};