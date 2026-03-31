import express from 'express'
import cors from 'cors'
import { createAndGenerate, fetchProjectScreens, listAvailableTools, isGenerating } from './stitch.js'

const app = express()
const PORT = parseInt(process.env.PORT || '3001', 10)

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', generating: isGenerating() })
})

app.get('/tools', async (_req, res) => {
  try {
    const tools = await listAvailableTools()
    res.json(tools)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

// Phase 1: Create project + try generate
app.post('/generate', async (req, res) => {
  try {
    const { prompt, reference_images, design_md, colors } = req.body
    if (!prompt) {
      res.status(400).json({ error: 'prompt is required' })
      return
    }

    const result = await createAndGenerate(prompt, design_md || undefined, colors || undefined)

    // Always return 200 even for partial success (project created but no screen)
    res.json(result)
  } catch (error) {
    console.error('Generation error:', error)
    res.status(500).json({
      error: 'Generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Phase 2: Fetch screens from existing project
app.get('/project/:projectId/screens', async (req, res) => {
  try {
    const { projectId } = req.params
    const result = await fetchProjectScreens(projectId)
    res.json(result)
  } catch (error) {
    console.error('Fetch error:', error)
    res.status(500).json({
      error: 'Fetch failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Stitch Bridge running on port ${PORT}`)
})
