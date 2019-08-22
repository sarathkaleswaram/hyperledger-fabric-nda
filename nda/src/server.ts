import * as express from "express"
import * as bodyParser from 'body-parser';
import cors = require('cors');

import login from "./api/login"
import enrollAdmin from "./api/enrollAdmin"
import registerUser from "./api/registerUser"
import invoke from "./api/invoke"
import queryAllParties from "./api/queryAllParties"
import getAllNDA from "./api/getAllNDA"
import getNDATxs from "./api/getNDATxs"

const app = express()
const PORT = process.env.PORT || 3000

app.options('*', cors())
app.use(cors())
app.use(bodyParser.json())

app.get("/", (req, res) => {
    res.send("<h1>NDA Running on Hyperledger</h1>")
})

app.post("/login", async (req, res) => {
    console.log("/login")
    let response = await login(req)
    res.json(response)
})

app.post("/enrollAdmin", async (req, res) => {
    console.log("/enrollAdmin")
    let response = await enrollAdmin()
    res.json(response)
})

app.post("/registerUser", async (req, res) => {
    console.log("/registerUser")
    let response = await registerUser(req)
    res.json(response)
})

app.post("/invoke", async (req, res) => {
    console.log("/invoke")
    let response = await invoke(req)
    res.json(response)
})

app.post("/queryAllParties", async (req, res) => {
    console.log("/queryAllParties")
    let response = await queryAllParties(req)
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