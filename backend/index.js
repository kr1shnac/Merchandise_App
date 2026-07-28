const express = require ("express")
const Router = require ("./routers/index.js")
const cors = require ("cors")
const bodyParse = require ("body-parser")

const app = express()

const json = require ("body-parser/json")

app.use("/api/v1", Router)

app.use(cors({
    origin: "http://localhost:5173/"
}))

app.listen(3000)