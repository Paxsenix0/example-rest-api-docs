const rateLimit = require('express-rate-limit');
const { getIpFromRequest } = require("../helper.js");

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: false,
  legacyHeaders: false,
  message: {
    ok: false,
    creator: "@PaxSenix",
    message: `Rate limit exceeded for YOU. Try again in a minute. or buy subscription to increase your rate limit!`,
    type: "rate_limit_error",
    code: "rate_limit_exceeded",
    param: "general"
  },
  keyGenerator: (req, res) => {
    return getIpFromRequest(req);
  }
});

class RateLimiter {
  constructor() {
    logger.info('rateLimiter initialized.');
  }

  middleware() {
    return async (req, res, next) => {
      return limiter(req, res, next);
    };
  }
}

module.exports = new RateLimiter();