const express = require("express");
const { authMiddleware } = require("../middleware.js")
const router = express.Router();

router.get("/balance", authMiddleware, async (req, res) => {
    userId = req.userId

    const account = await db.Account.findOne({
        userId: userId
    })

    if(!account) {
        return res.json({
            message: "invalid account"
        })
    }

    res.json({
        balance: account.balance
    })
})

router.post("/transfer", authMiddleware, async (req, res) => {

    const session = await mongoose.startSession();

    await session.startTransaction();

    const amount = req.body.amount;
    const to = req.body.to;

    const account = await db.Account.findOne({
        userId: req.userId
    }).session(session)

    if(!account) {
        await session.abortTransaction();
        return res.json({
            message: "invalid account"
        })
    }

    if(account.balance < amount) {
        await session.abortTransaction();
        return res.json({
            message: "insufficient balance"
        })
    }

    const toAccount = await db.Account.findOne({
        userId: to
    }).session(session)

    if(!toAccount) {
        await session.abortTransaction();
        return res.json({
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

    res.json({
        message: "transaction successful"
    })
})



module.exports = router;