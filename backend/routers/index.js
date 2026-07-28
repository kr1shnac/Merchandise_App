const express = require("express");
const router = express.Router()

const app = express()

const userRouter = require("./user.js")
const accountRouter = require("./account.js")

app.use("/user", userRouter)
app.use("/account", accountRouter)

module.exports = router;