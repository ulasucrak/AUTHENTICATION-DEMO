const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const mongoose = require('mongoose')

dotenv.config() //loads environment variables from .env file

const app = express() //creates an express application
app.use(cors())
app.use(express.json())

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connection successful'))
    .catch((err) => console.log('MongoDB connection error:', err))

const userModel = require('./models/User') 
const authRouter = require('./routes/auth')
app.use('/api/auth', authRouter)//imports the user model

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})

