const express = require ("express")
const Router = require ("./routers/index.js")
const cors = require ("cors")
const bodyParser = require ("body-parser")

const app = express()

app.use(cors({
    origin: "http://localhost:5173"
}))

app.use(bodyParser.json())
//app.use(express.json())

app.use("/api/v1", Router)



app.listen(3000)