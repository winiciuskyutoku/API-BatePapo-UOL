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
        type: joi.string().required()
    })

    const validation = userSchema.validate(req.body, {abortEarly: false})

    const typeValidation = type === "message" || type === "private_message"

    if(typeValidation === false) return res.status(422).send("Tipo de mensagem nao permitido")

    if(validation.error){
        const errors = validation.error.details.map(detail => detail.message)
        return res.status(422).send(errors)
    }

    try{
        const participants = await db.collection("participants").findOne({name: user})
        if(!participants) return res.status(422).send("Esse participantes nao esta no chat")

        await db.collection("messages").insertOne(newMessage)
        res.sendStatus(201)
        
    } catch (err){
        res.status(500).send(err.mesasge)
    }
})

app.get("/messages", async (req, res) => {
    const limit = Number(req.query.limit)
    const {user} = req.headers
    
    /* console.log(req.headers)
    console.log(user)
    console.log(limit) */
    console.log(user)
    console.log(typeof(limit))

    if(typeof(limit) !== "number" || limit < 1){
        return res.status(422).send("Limite errado")
    }

    try{
        const allMessages = await db.collection("messages").find().toArray()

        const messagesValidation = allMessages.filter(m => {
            if(m.from === user || m.to === user || m.to === "Todos"){
                return true
            }
        })
        
        res.send(messagesValidation)

    } catch (err) {
        res.status(500).send(err.message)
    }
})

app.post("/status", async (req, res) => {
    const user = req.headers.user
    if(!user) return res.status(404).send("Usuario nao encontrado")

    try {

        const onlineParticipant = await db.collection("participants").findOne({name: user})
        if(!onlineParticipant) return res.status(404).send("Essa pessoa nao esta no chat")

        await db.collection("participants").updateOne({name: user}, {$set: {lastStatus: Date.now()}})

        res.sendStatus(200)

    } catch (err){
        res.status(err).send(err.message)
    }

})

setInterval(async () => {
    let hour = dayjs()

    try {

        const onlineParticipants = await db.collection("participants").find().toArray()
        onlineParticipants.forEach(async p => {

            const currentTime = Date.now() - p.lastStatus

            if(currentTime > 10000){
                await db.collection("participants").deleteOne({name: p.name})
                await db.collection("messages").insertOne({
                    from: p.name,
                    to: "Todos",
                    text: "sai da sala...",
                    type: "status",
                    time: hour.format("HH:mm:ss")
                })
            }
        })
    } catch (err) {
        res.status(500).send(err.mesasge)

    }
}, 15000)

const PORT = 5000
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`)) 