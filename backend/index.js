const express = require ("express")
const Router = require ("./routers/index.js")
const cors = require ("cors")
const bodyParse = require ("body-parse")

const app = express()

const json = require ("body-parse/json")

app.use("/api/v1", Router)

app.use(cors({
    origin: "http://localhost:5173/"
}))

app.listen(3000)