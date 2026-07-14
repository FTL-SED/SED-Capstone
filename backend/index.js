import 'dotenv/config'

import express from 'express'
import cors from 'cors'

import userRoutes from './routes/userRoutes.js'
import itineraryRoutes from './routes/itineraryRoutes.js'
import pinRoutes from './routes/pinRoutes.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'NavQuest API is running' })
})

app.use('/users', userRoutes)
app.use('/itineraries', itineraryRoutes)
app.use('/pins', pinRoutes)

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})
