const express = require("express");
const router = express.Router()

const userRouter = require("./user.js")

app.use("/user", userRouter)

router.get("/", (req, res) => {
    res.send("test")
})

module.exports = router;