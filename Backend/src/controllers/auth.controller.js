const userModel = require("../models/user.model")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const tokenBlacklistModel = require("../models/blacklist.model")

// Cross-domain cookie configuration for production deployment (Render) vs local development
const COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000 // 1 day
}

/**
 * @name registerUserController
 * @description Register a new user with username, email, and password
 * @access Public
 */
async function registerUserController(req, res) {
    try {
        const { username, email, password } = req.body

        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Please provide username, email, and password."
            })
        }

        const cleanUsername = username.trim()
        const cleanEmail = email.trim().toLowerCase()

        if (cleanUsername.length < 3) {
            return res.status(400).json({
                message: "Username must be at least 3 characters long."
            })
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(cleanEmail)) {
            return res.status(400).json({
                message: "Please provide a valid email address."
            })
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters long."
            })
        }

        const existingUser = await userModel.findOne({
            $or: [ { username: cleanUsername }, { email: cleanEmail } ]
        })

        if (existingUser) {
            return res.status(400).json({
                message: existingUser.email === cleanEmail
                    ? "An account with this email address already exists."
                    : "Username is already taken. Please choose another."
            })
        }

        const hash = await bcrypt.hash(password, 10)

        const user = await userModel.create({
            username: cleanUsername,
            email: cleanEmail,
            password: hash
        })

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        )

        res.cookie("token", token, COOKIE_OPTIONS)

        return res.status(201).json({
            message: "User registered successfully.",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        })
    } catch (err) {
        console.error("Register Error:", err)
        return res.status(500).json({
            message: "Server error during registration. Please try again."
        })
    }
}

/**
 * @name loginUserController
 * @description Login a user with email and password
 * @access Public
 */
async function loginUserController(req, res) {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({
                message: "Please provide email and password."
            })
        }

        const cleanEmail = email.trim().toLowerCase()

        const user = await userModel.findOne({ email: cleanEmail })

        if (!user) {
            return res.status(400).json({
                message: "Invalid email or password."
            })
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(400).json({
                message: "Invalid email or password."
            })
        }

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        )

        res.cookie("token", token, COOKIE_OPTIONS)

        return res.status(200).json({
            message: "Logged in successfully.",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        })
    } catch (err) {
        console.error("Login Error:", err)
        return res.status(500).json({
            message: "Server error during login. Please try again."
        })
    }
}

/**
 * @name logoutUserController
 * @description Clear token from user cookie and add the token to blacklist
 * @access Public
 */
async function logoutUserController(req, res) {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(" ")[ 1 ]

        if (token) {
            await tokenBlacklistModel.create({ token }).catch(() => {})
        }

        res.clearCookie("token", COOKIE_OPTIONS)

        return res.status(200).json({
            message: "Logged out successfully."
        })
    } catch (err) {
        console.error("Logout Error:", err)
        res.clearCookie("token", COOKIE_OPTIONS)
        return res.status(200).json({
            message: "Logged out successfully."
        })
    }
}

/**
 * @name getMeController
 * @description Get the current logged in user details
 * @access Private
 */
async function getMeController(req, res) {
    try {
        const user = await userModel.findById(req.user.id).select("-password").lean()

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            })
        }

        return res.status(200).json({
            message: "User details fetched successfully.",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        })
    } catch (err) {
        console.error("GetMe Error:", err)
        return res.status(500).json({
            message: "Failed to fetch user details."
        })
    }
}

module.exports = {
    registerUserController,
    loginUserController,
    logoutUserController,
    getMeController
}