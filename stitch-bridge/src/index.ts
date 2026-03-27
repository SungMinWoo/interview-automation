import express from 'express'
import cors from 'cors'
import { generateDesign, getGenerationStatus } from './stitch.js'

const app = express()
const PORT = parseInt(process.env.PORT || '3001', 10)

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.post('/generate', async (req, res) => {
  try {
    const { prompt, reference_images } = req.body

    if (!prompt) {
      res.status(400).json({ error: 'prompt is required' })
      return
    }

    const result = await generateDesign(prompt, reference_images || [])
    res.json(result)
  } catch (error) {
    console.error('Generation error:', error)
    res.status(500).json({
      error: 'Generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

app.get('/status/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params
    const result = await getGenerationStatus(projectId)
    res.json(result)
  } catch (error) {
    console.error('Status check error:', error)
    res.status(500).json({
      error: 'Status check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Stitch Bridge running on port ${PORT}`)
})
