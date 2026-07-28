const jwt = require("jsonwebtoken")
const JWT_SECRET = require("./config.js")

function authMiddleware (req, res, next) {
    const token = req.headers.token;

    if(!token) {
        return res.json({
            message: "token not provided"
        })
    }

    try{
        const decoded = jwt.sign(token, JWT_SECRET)
        req.userId = decoded.userId
        next();
    } catch (err) {
        return res.json(err)
    }
    
}

module.exports = authMiddleware;