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

const accountSchema = new Schema ({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    },
    balance: {
        type: Number,
        required: true
    }
})

module.exports = {
    Users: mongoose.model("Users", userSchema),
    Account: mongoose.model("Account", accountSchema)
}