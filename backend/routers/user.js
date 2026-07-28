const express = require("express")
const zod = require("zod")
const jwt = require("jsonwebtoken")
const JWT_SECRET = require("../config.js")
const db = require("../db.js")
const bcrypt = require("bcrypt")
const { authMiddleware } = require("../middleware.js")

const router = express.Router()

const signupSchema = zod.object({
    username: zod.string(),
    firstName: zod.string(),
    lastName: zod.string(),
    password: zod.string()
})

router.post("/signup", authMiddleware, async (req, res) => {
    const username = req.body.username;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const password = req.body.password;

    const result = signupSchema.safeParse(req.body);

    if(!result.success) {
        return res.json({
            message: "invalid input"
        })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const userExist = await db.Users.findOne({ username: username })

    if(userExist) {
        return res.json({
            message: "username already in use"
        })
    }

    await db.Users.insertOne({
        username: username,
        firstName: firstName,
        lastName: lastName,
        password: hashedPassword
    })

    res.json({
        message: username + " user created"
    })
})

const signinSchema = zod.object({
    username: zod.string(),
    password: zod.string()
})

router.post("/signin", authMiddleware, async (req, res) => {

    
    const username = req.body.username;
    const password = req.body.password;

    const result = signinSchema.safeParse(req.body)

    if(!result.success) {
        return res.json({
            message: "invalid input"
        })
    }

    const valid = await bcrypt.compare(password, hashedPassword)

    if(!valid) {
        return res.json({
            message: "invalid password"
        })
    }

    const user = await db.users.findOne({
        username: username,
        password: password
    })

    if(!user) {
        return res.status(411).json({
            message: username + " user doesn't exist"
        })
    }

    const token = jwt.sign({
        userId: user._id
    }, JWT_SECRET)

    res.status(200).json({
        message: "user logged in successfully",
        token
    })
})

const updateBody = zod.object({
    password: zod.string().opional(),
    firstName: zod.string().optional(),
    lastName: zod.string().optional()
})

router.put("/", authMiddleware, async (req, res) => {
    const result = updateBody.safePrase(req.body)

    if(!result.success) {
        return res.json({
            message: "invalid input"
        })
    }

    await db.Users.updateOne({
        id: req.userId
    })


    res.json({
        message: "info updated"
    })

})

module.exports = router