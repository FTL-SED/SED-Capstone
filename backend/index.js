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

// Unknown route: return JSON, not Express's default HTML, so the frontend can
// always parse the response. Must come after all real routes.
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.originalUrl}` })
})

// Global error handler (Express recognizes it by its 4 args). Catches both a
// malformed JSON body (express.json throws a SyntaxError with status 400) and
// any error a controller throws, so unhandled failures return JSON instead of
// falling through to Express's default HTML error page. Keep last.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ error: 'Request body is not valid JSON' })
  }
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
