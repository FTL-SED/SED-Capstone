require('dotenv').config()

const express = require('express')
const cors = require('cors')

const userRoutes = require('./routes/userRoutes')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'NavQuest API is running' })
})

app.use('/users', userRoutes)

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})
