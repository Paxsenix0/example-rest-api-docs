const errorResponse = (res, message, code, additional = {}) => res.status(code).json({
    creator: "@PaxSenix",
    ok: false,
    message,
    ...additional
});

const successResponse = (res, message, additional = {}) => res.status(200).json({
    creator: "@PaxSenix",
    ok: true,
    message,
    ...additional
});

function getIpFromRequest(request) {
    let ip = request.headers["cf-connecting-ip"] ?? request.headers["x-real-ip"] ?? request.ip;
    if (!ip || ip === '127.0.0.1') {
      const forwardedFor = request.headers["x-forwarded-for"];
      ip = forwardedFor.split(",").at(0) ?? null;
    }
    return ip;
}

module.exports = {
    getIpFromRequest,
    successResponse,
    errorResponse
};