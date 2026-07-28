const mongoose = require ("mongoose")
const { Schema } = mongoose
// const Schema = mongoose.Schema()

mongoose.connect("mongodb://127.0.0.1:27017/paytm")

const userSchema = new Schema ({
    username: {type: String, required: true, unique: true, lowercase: true},
    firstName: { type: String, required: true },
    lastName: {type: String, required: true},
    password: {type: String, required: true},
})

module.exports = mongoose.model("User", userSchema)
//