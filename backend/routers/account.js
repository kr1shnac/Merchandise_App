const express = require("express");
const authMiddleware = require("../middleware.js")
const router = express.Router();
const db = require("../db.js")
const mongoose = require("mongoose")
const zod = require("zod")

const transferSchema = zod.object({
    to: zod.string().min(1),
    amount: zod.number().positive()
})

router.get("/balance", authMiddleware, async (req, res) => {
    const userId = req.userId

    const account = await db.Account.findOne({
        userId: userId
    })

    if(!account) {
        return res.status(404).json({
            message: "invalid account"
        })
    }

    res.json({
        balance: account.balance
    })
})

router.post("/transfer", authMiddleware, async (req, res) => {

    const result = transferSchema.safeParse(req.body)

    if(!result.success) {
        return res.status(400).json({
            message: "invalid input",
            error: result.error.issues.map(issue => issue.message).join(", ")
        })
    }

    const amount = result.data.amount
    const to = result.data.to

    // the JWT payload carries userId as a string, so compare like-for-like
    if(String(to) === String(req.userId)) {
        return res.status(400).json({
            message: "cannot transfer to yourself"
        })
    }

    const session = await mongoose.startSession();

    try {
        await session.startTransaction();

        const account = await db.Account.findOne({
            userId: req.userId
        }).session(session)

        if(!account) {
            await session.abortTransaction();
            return res.status(404).json({
                message: "invalid account"
            })
        }

        if(account.balance < amount) {
            await session.abortTransaction();
            return res.status(409).json({
                message: "insufficient balance"
            })
        }

        const toAccount = await db.Account.findOne({
            userId: to
        }).session(session)

        if(!toAccount) {
            await session.abortTransaction();
            return res.status(404).json({
                message: "invalid to-account"
            })
        }

        await db.Account.updateOne(
            {
                userId: req.userId
            }, {
                $inc: {
                    balance: -amount
                }
            }
        ).session(session)

        await db.Account.updateOne(
            {
                userId: to
            }, {
                $inc: {
                    balance: amount
                }
            }
        ).session(session)

        await session.commitTransaction();

        res.status(200).json({
            message: "transaction successful"
        })

    } catch (err) {
        await session.abortTransaction();
        return res.status(500).json({
            message: "transaction failed",
            error: err.message
        })
    } finally {
        await session.endSession();
    }
})

module.exports = router;