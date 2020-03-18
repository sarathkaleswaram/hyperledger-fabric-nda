import * as express from "express"
import * as bodyParser from 'body-parser';
import * as mongoose from "mongoose";
import cors = require('cors');

import login from "./api/login"
import enrollAdmin from "./api/enrollAdmin"
import registerParty from "./api/registerParty"
import submitNDA from "./api/submitNDA"
import initNDA from "./api/initNDA"
import getAllNDA from "./api/getAllNDA"
import getNDATxs from "./api/getNDATxs"

const app = express()
const PORT = process.env.PORT || 3000
const MONGO_URL = process.env.MONGO_URL || '127.0.0.1:27017'

let mongoConnectionString = `mongodb://${MONGO_URL}/nda`;

mongoose.connect(mongoConnectionString, { useCreateIndex: true, useNewUrlParser: true, useFindAndModify: false });
let db = mongoose.connection;
db.once('open', () => console.log('MongoDB Successfully Connected!'));
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

app.options('*', cors())
app.use(cors())
app.use(bodyParser.json())

app.get("/", (req, res) => {
    res.send("<h1>NDA Running on Hyperledger</h1>")
})

app.post("/enrollAdmin", async (req, res) => {
    console.log("/enrollAdmin")
    let response = await enrollAdmin()
    res.json(response)
})

app.post("/registerParty", async (req, res) => {
    console.log("/registerParty")
    let response = await registerParty(req)
    res.json(response)
})

app.post("/login", async (req, res) => {
    console.log("/login")
    let response = await login(req)
    res.json(response)
})

app.post("/initNDA", async (req, res) => {
    console.log("/initNDA")
    initNDA(req, function (response) {
        res.json(response)        
    })
})

app.post("/submitNDA", async (req, res) => {
    console.log("/submitNDA")
    let response = await submitNDA(req)
    res.json(response)
})

app.post("/getAllNDA", async (req, res) => {
    console.log("/getAllNDA")
    let response = await getAllNDA(req)
    res.json(response)
})

app.post("/getNDATxs", async (req, res) => {
    console.log("/getNDATxs")
    let response = await getNDATxs(req)
    res.json(response)
})

app.listen(PORT, () => {
    console.log(`Server is running in http://localhost:${PORT}`)
})