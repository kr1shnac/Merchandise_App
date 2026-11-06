# Merchandise

A wallet app. You sign up, you get an account with a random amount of money in it,
you search for other users, and you send them money.

That's the entire product scope. No cards, no KYC, no merchant checkout.

The backend is finished and runs. The frontend is a Vite + React 19 scaffold that
currently renders "Hello world" — there's a section down the bottom on exactly where
that stands, because the README that was here before this one was telling stories.

This started out inside a folder called `PayTM`, in a repo called `no_AI_projects`.
It's since been flattened so `backend/` and `frontend/` sit at the root, and this
repo is now called Merchandise. The Mongo database is still `paytm` — I didn't
bother renaming it.

## Stack

- **Backend** — Node, Express 5, CommonJS. No TypeScript.
- **Database** — MongoDB, Mongoose 9 ODM.
- **Auth** — hand-rolled JWT + bcrypt, no auth library.
- **Validation** — Zod (on signup, signin and profile update only).
- **Frontend** — Vite 8, React 19, TypeScript, oxlint.

## Layout

```
backend/
├── index.js          # express app, CORS, mounts /api/v1, listens on 3000
├── db.js             # mongoose connection + the two schemas
├── config.js         # the JWT secret (yes, see "Rough edges")
├── middleware.js     # checks the `token` header
└── routers/
    ├── index.js      # /user and /account
    ├── user.js       # signup, signin, update, find
    └── account.js    # balance, transfer

frontend/
├── index.html
├── vite.config.ts    # react plugin only — tailwind lives in package.json, not here
└── src/
    ├── App.tsx       # Hello world
    ├── main.tsx      # no router, no providers
    ├── components/   # Heading.jsx and SubHeading.jsx; InputBox.jsx is empty
    └── pages/        # Signin, Signup, Dashboard, SendMoney — all four empty
```

## Running it locally

You need Node 18+ and a MongoDB instance. One catch: the transfer endpoint runs
inside a MongoDB transaction, and transactions don't work on a standalone `mongod`.
Run it as a replica set or every transfer will fail with
`Transaction numbers are only allowed on a replica set member or mongos`.

```bash
# one-time: start mongo as a single-node replica set
mkdir -p /tmp/merchandise-mongo
mongod --replSet rs0 --dbpath /tmp/merchandise-mongo
mongosh --eval "rs.initiate()"
```

Then:

```bash
cd backend
npm install
node index.js          # http://localhost:3000

cd frontend
npm install
npm run dev            # http://localhost:5173
```

`node index.js` prints nothing on startup. That's not a bug in your setup, there's
just no log line. If it hangs silently, check that mongod is reachable on
`127.0.0.1:27017` — the connection string is hardcoded in `db.js`, database name
`paytm`.

## API

Base URL `http://localhost:3000/api/v1`.

Auth is a JWT sent in a **`token` header** — not `Authorization: Bearer`. If you're
calling these from Postman, that's the one thing that will trip you up.

| Method | Endpoint                   | Auth  | Body / params                        |
|--------|----------------------------|-------|--------------------------------------|
| POST   | `/user/signup`             | open  | `username`, `firstName`, `lastName`, `password` |
| POST   | `/user/signin`             | open  | `username`, `password`               |
| PUT    | `/user/`                   | JWT   | `firstName`, `lastName`, `password`  |
| GET    | `/user/find?filter=alice`  | open  | query param `filter`                 |
| GET    | `/account/balance`         | JWT   | –                                    |
| POST   | `/account/transfer`        | JWT   | `to` (userId), `amount`              |

What the responses actually look like:

- `signup` returns `{ message }` — and **no token**, so you sign in again immediately
  after registering. I never got around to returning both.
- `signin` returns `{ message, token }`.
- `balance` returns `{ balance }` — a plain number.
- `transfer` returns `{ message: "transaction successful" }` on success. The failure
  paths use real status codes: `400` for malformed input or a self-transfer, `409` for
  insufficient balance, `404` for an unknown sender or recipient, `500` if the
  transaction itself throws.
- `find` returns `{ user: [{ username, firstName, lastName, _id }] }` for everyone
  whose first *or* last name matches, case-insensitively. No pagination.

`amount` must be a **positive number**. Zero, negatives and numeric strings are all
rejected before a transaction session is even opened, so there's no way to credit
yourself by sending a negative amount.

To check the whole thing works end to end:

```bash
curl -X POST localhost:3000/api/v1/user/signup \
  -H 'content-type: application/json' \
  -d '{"username":"alice","firstName":"Alice","lastName":"A","password":"pw123456"}'

TOKEN=$(curl -s -X POST localhost:3000/api/v1/user/signin \
  -H 'content-type: application/json' \
  -d '{"username":"alice","password":"pw123456"}' | jq -r .token)

curl localhost:3000/api/v1/account/balance -H "token: $TOKEN"
```

## How a transfer works

`POST /account/transfer` is the only route with real logic in it, and it's the reason
this project exists.

First, before any session is opened, the body is validated with Zod (`to` a
non-empty string, `amount` a positive number) and a transfer to yourself is rejected.
That keeps the transaction path short and means bad input never gets near a database
session at all.

Then it opens a Mongoose session and does everything inside it:

1. look up the sender's account
2. check the sender has enough money
3. look up the recipient's account
4. debit the sender with `$inc`
5. credit the recipient with `$inc`
6. commit

If any step throws, or any check fails, the session is aborted and rolled back, so
money is never half-moved. Steps 1–3 call `abortTransaction()` and return directly;
an unexpected error in 4–5 lands in the `catch` block, which aborts and returns a
`500`. Either way `finally` ends the session.

Notably *not* recorded: anything about the transfer itself. There is no Transaction
collection and no history endpoint. Only the two balance numbers change.

## Data model

Two schemas, both in `backend/db.js`.

```js
Users {
  username:  String, required, unique, lowercase
  firstName: String, required
  lastName:  String, required
  password:  String, required   // bcrypt hash, 10 rounds
}

Account {
  userId:   ObjectId -> Users, required
  balance:  Number, required
}
```

One user has exactly one account, created at signup with a random starting balance
between 1 and 10001. It's a fun number to log in and see; I never turned it into a
fixed value or a signup parameter.

## Rough edges

Fixed since the first version of this list: negative `amount` values, self-transfers,
the unhashed password on `PUT /user/`, and the all-HTTP-200 error handling on
`balance` / `transfer` / update.

Still here:

- `JWT_SECRET` is the string `"krishna"`, hardcoded in `backend/config.js`. Fine for
  localhost, an actual problem the moment this is deployed. Moving it to an env var
  means deciding how the app behaves with no secret set, which I didn't want to
  decide for you.
- The Mongo URI is hardcoded in `db.js`. There is no `.env` file and no `dotenv`.
- CORS is pinned to `http://localhost:5173`, so the deployed frontend (if any) can't
  talk to it.
- `signup` doesn't return a token, so the client has to sign in again right after
  registering.
- `GET /user/find` is public, unauthenticated, and hands out usernames + ids to
  anyone who asks. It's also a user-supplied regex, so it's open to ReDoS.
- `signin` returns `411` for both "no such user" and "wrong password", which leaks
  which usernames exist.
- Validation failures on `signup`, `signin` and `find` still answer with HTTP 200 and
  a `message` field, unlike the routes above.
- The `500` path on `transfer` returns `err.message` straight to the client, which
  leaks internal detail.
- Starting balance is `1 + Math.random() * 10000`, not a fixed value or a parameter.
- `mongoose.connect()` isn't awaited and has no error handler, so a missing mongod
  surfaces as an unhandled rejection rather than a clear message.

## Frontend status

Being precise, since this is where the work is unfinished:

- `Heading.jsx` and `SubHeading.jsx` are written. `InputBox.jsx` is a zero-byte file.
- `Signin.tsx`, `Signup.tsx`, `Dashboard.tsx`, `SendMoney.tsx` are zero-byte files.
  They were created, never filled in.
- `react-router-dom` and `tailwindcss` are in `package.json` (added after the initial
  commit) but nothing imports them: no route definitions in `main.tsx`, no
  `@tailwindcss/vite` plugin in `vite.config.ts`, no `@import "tailwindcss"` in
  `index.css`. `App.css` is leftover Vite template styling.
- `App.tsx` renders `Hello world`. The signup and signin UI that the first commit's
  message promised never made it into the repo — the backend went in first and the
  UI got skipped.

So: the API is testable today with curl or Postman, and the UI has to be built.

## Notes

- No tests, no CI, no Docker, no rate limiting, and no LICENSE file — so as it stands
  it's all-rights-reserved rather than open source.
- Both `.gitignore`s now cover `.env` (with a `.env.example` exemption), so the day
  someone moves the secret out of `config.js` into one, the secret itself won't get
  committed.
