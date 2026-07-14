import 'dotenv/config'

import express from 'express'
import cors from 'cors'

import userRoutes from './routes/userRoutes.js'
import recommendationRoutes from './routes/recommendationRoutes.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'NavQuest API is running' })
})

app.use('/users', userRoutes)
app.use('/recommendations', recommendationRoutes)

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})
