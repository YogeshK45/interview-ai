const jwt = require("jsonwebtoken")
const tokenBlacklistModel = require("../models/blacklist.model")

async function authUser(req, res, next) {
    const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(" ")[ 1 ])

    if (!token) {
        return res.status(401).json({
            message: "Authentication required. Please log in."
        })
    }

    try {
        const isTokenBlacklisted = await tokenBlacklistModel.findOne({ token }).lean()

        if (isTokenBlacklisted) {
            return res.status(401).json({
                message: "Session expired. Please log in again."
            })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded
        next()
    } catch (err) {
        return res.status(401).json({
            message: "Invalid or expired token. Please log in again."
        })
    }
}

module.exports = { authUser }