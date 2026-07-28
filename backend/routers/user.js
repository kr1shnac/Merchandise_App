const express = require("express")
const zod = require("zod")
const jwt = require("jsonwebtoken")
const JWT_SECRET = require("./config.js")

const router = express.Router()

const signupSchema = zod.object({
    username = zod.string(),
    firstName = zod.string(),
    lastName = zod.string(),
    password = zod.string()
})

router.post("/signup", async (req, res) => {
    const username = req.body.username;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const password = req.body.password;

    const success = signupSchema.safeParse(req.body);

    if(!success) {
        return res.json({
            message: "invalid input"
        })
    }

    const userExist = await db.users.find({ username: username })

    if(userExist) {
        return res.json({
            message: "username already in use"
        })
    }

    await db.user.insertOne({
        username: username,
        firstName: firstName,
        lastName: lastName,
        password: password
    })

    const user = jwt.sign({
        userId: user._id
    }, JWT_SECRET)

    res.json({
        message: username + " user created"
    })
})

const signinSchema = zod.object({
    username = zod.string(),
    password = zod.string()
})

router.post("/signin", async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    const success = signinSchema.safeParse(req.body)

    if(!success) {
        return res.json({
            message: "invalid input"
        })
    }

    const userExist = await db.users.findOne({
        username: username,
        password: password
    })

    if(!userExist) {
        return res.status(411).json({
            message: username + " user doesn't exist"
        })
    }

    res.status(200).json({
        message: "user logged in successfully"
    })
})

module.exports = router