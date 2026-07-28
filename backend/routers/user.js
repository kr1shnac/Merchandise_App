const express = require("express")

const router = express.Router()

router.post("/signup", (req, res) => {
    const username = req.body.username;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const password = req.body.password;

    const userExist = db.users.find({ username: username })

    if(userExist) {
        return res.json({
            message: "username already in use"
        })
    }

    db.user.insertOne({
        username: username,
        firstName: firstName,
        lastName: lastName,
        password: password
    })

    res.json({
        message: username + " user created"
    })
})

router.post("/signin", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    const userExist = db.users.findOne({
        username: username,
        password: password
    })

    if(!userExist) {
        return res.json({
            message: username + " user doesn't exist"
        })
    }

    res.status(200).json({
        message: "user logged in successfully"
    })
})

module.exports = router