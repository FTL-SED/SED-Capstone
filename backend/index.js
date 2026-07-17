import 'dotenv/config'

import express from 'express'
import cors from 'cors'
import morgan from 'morgan'

import userRoutes from './routes/userRoutes.js'
import itineraryRoutes from './routes/itineraryRoutes.js'
import pinRoutes from './routes/pinRoutes.js'
import recommendationRoutes from './routes/recommendationRoutes.js'
import aiRoutes from './routes/aiRoutes.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'NavQuest API is running' })
})

app.use('/users', userRoutes)
app.use('/itineraries', itineraryRoutes)
app.use('/pins', pinRoutes)
app.use('/recommendations', recommendationRoutes)
app.use('/ai-agent', aiRoutes)

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})
