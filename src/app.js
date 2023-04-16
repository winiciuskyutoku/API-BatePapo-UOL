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
    const user = req.headers.user
    const hour = dayjs()

    const newMessage = {
        from: user,
        to,
        text,
        type,
        time: hour.format("HH:mm:ss")
    }

    const userSchema = joi.object({
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.valid("message", "private_message")
    })

    const validation = userSchema.validate(req.body, {abortEarly: false})

    if(type === "message" || type === "private_message"){
        const typeValidation = true
    } else {
        return res.status(422).send("erro na autenticacao")
    }

    if(validation.error){
        const errors = validation.error.details.map(detail => detail.message)
        return res.status(422).send(errors)
    }

    try{
        const participants = await db.collection("participants").findOne({name: to})
        if(!participants) return res.status(422).send("Esse participantes nao esta no chat")

        await db.collection("messages").insertOne(newMessage)
        res.sendStatus(201)
        
    } catch (err){
        res.status(500).send(err.mesasge)
    }
})




const PORT = 5000
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`)) 