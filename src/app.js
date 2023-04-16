import express from "express"
import cors from "cors"
import {MongoClient, ObjectId} from "mongodb"
import dotenv from "dotenv"
import joi from "joi"
import dayjs from "dayjs"

const app = express()
app.use(express.json())
app.use(cors())
dotenv.config()


const mongoClient = new MongoClient(process.env.DATABASE_URL)
try {
    await mongoClient.connect()
    console.log("MongoDB conectado!")
} catch (err) {
    console.log(err)
}
const db = mongoClient.db()

app.post("/participants", async (req, res) =>{
    const {name} = req.body
    let hour = dayjs()

    const userSchema = joi.object({
        name: joi.string().required()
    })
    const validation = userSchema.validate(req.body, {abortEarly: false})

    if(validation.error){
        const errors = validation.error.details.map(detail => detail.message)
        return res.status(422).send(errors)
    }

    

    try {
        const participants = await db.collection("participants").findOne({name: name})
        console.log(participants)
        if (participants) return res.status(409).send("Esse usuario ja existe")

        await db.collection("participants").insertOne({name: name, lastStatus: Date.now()})
        await db.collection("messages").insertOne({
            from: name,
            to: "Todos",
            text: "entra na sala...",
            type: "status",
            time: hour.format("HH:mm:ss")
        })
        res.sendStatus(201)
    } catch (err){
        res.status(500).send(err.message)
    }
})

app.get("/participants", async (req, res) => {
    try{
        const participants = await db.collection("participants").find().toArray()
        if(!participants) return res.status(404).send([])

        res.send(participants)
    } catch(err){
        res.status(500).send(err.message)
    }
})

app.post("/messages", async (req, res) => {
    const {to, text, type} = req.body
    const {from} = req.User
    const hour = dayjs()

    console.log(req)
    console.log(from)

    const userSchema = joi.object({
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.valid("message", "private_message")
    })

    const validation = userSchema.validate(req.body, {abortEarly: false})

    if(validation.error){
        const errors = validation.error.details.map(detail => detail.message)
        return res.status(422).send(errors)
    }

    try{
        const participants = await db.collection("participants").findOne({from: from})
        if(!participants) return res.status(422).send("Esse participantes nao esta no chat")

        await db.colletion("messages").updateOne({from: from,})
        
    } catch (err){
        res.status(500).send(err.mesasge)
    }
})


const PORT = 5000
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`)) 