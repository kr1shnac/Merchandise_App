const express = require("express")
const zod = require("zod")
const jwt = require("jsonwebtoken")
const JWT_SECRET = require("../config.js")
const db = require("../db.js")
const bcrypt = require("bcrypt")
const authMiddleware = require("../middleware.js")

const router = express.Router()

const signupSchema = zod.object({
    username: zod.string(),
    firstName: zod.string(),
    lastName: zod.string(),
    password: zod.string()
})

router.post("/signup", async (req, res) => {
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

    const user = await db.Users.create({
        username: username,
        firstName: firstName,
        lastName: lastName,
        password: hashedPassword
    })

    await db.Account.create({
        userId: user._id,
        balance: 1 + Math.random() * 10000
    })

    res.json({
        message: username + " user created"
    })
})

const signinSchema = zod.object({
    username: zod.string(),
    password: zod.string()
})

//login
router.post("/signin", async (req, res) => {

    
    const username = req.body.username;
    const password = req.body.password;

    const result = signinSchema.safeParse(req.body)

    if(!result.success) {
        return res.json({
            message: "invalid input"
        })
    }

    const user = await db.Users.findOne({
        username: username
    })

    if(!user) {
        return res.status(411).json({
            message: username + "user doesn't exist"
        })
    }

    const valid = await bcrypt.compare(password, user.password)

    if(!valid) {
        return res.status(411).json({
            message: "password is invalid"
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
    password: zod.string().optional(),
    firstName: zod.string().optional(),
    lastName: zod.string().optional()
})

router.put("/", authMiddleware, async (req, res) => {
    const result = updateBody.safeParse(req.body)

    if(!result.success) {
        return res.status(400).json({
            message: "invalid input"
        })
    }

    // build the $set from what was actually sent, otherwise Mongoose will
    // happily write undefined over a field the user never touched
    const updates = {}

    if(req.body.firstName) {
        updates.firstName = req.body.firstName
    }
    if(req.body.lastName) {
        updates.lastName = req.body.lastName
    }
    if(req.body.password) {
        updates.password = await bcrypt.hash(req.body.password, 10)
    }

    if(Object.keys(updates).length === 0) {
        return res.status(400).json({
            message: "nothing to update"
        })
    }

    await db.Users.updateOne({
        _id: req.userId
    }, {
        $set: updates
    })


    res.status(200).json({
        message: "info updated"
    })

})

//search query 
router.get("/find", async (req, res) => {
    const filter = req.query.filter

    const user = await db.Users.find({
        $or: [{
            firstName: {
                "$regex": filter, "$options" : "i"
            }
        }, {
            lastName: {
                "$regex": filter, "$options" : "i" //even to search lowercase
            }
        }]
    })

    res.json({
        user: user.map(user => ({
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            _id: user._id
        }))
    })
})

module.exports = router