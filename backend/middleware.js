const jwt = require("jsonwebtoken")
const JWT_SECRET = require("./config.js")

function authMiddleware (req, res, next) {
    const token = req.header.token;

    if(!token) {
        return res.json({
            message: "token not provided"
        })
    }

    const decoded = jwt.verify(token, JWT_SECRET)
    const userId = decoded.userId

    req.userId = userId

    next();
}

module.exports = authMiddleware;