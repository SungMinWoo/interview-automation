/**
 * Google Stitch SDK integration.
 *
 * NOTE: The @google/stitch-sdk package is still in early access.
 * This module provides a wrapper that can be swapped between:
 *   1. Real Stitch SDK (when available and API key is set)
 *   2. Mock implementation (for development/testing)
 *
 * To use the real SDK, install it:
 *   npm install @google/stitch-sdk
 *
 * Then uncomment the real implementation below and comment out the mock.
 */

interface GenerationResult {
  project_id: string
  html_url: string
  screenshot_url: string
  html_content: string
  status: 'completed' | 'processing' | 'failed'
}

interface StatusResult {
  status: 'completed' | 'processing' | 'failed'
  html_url: string
  screenshot_url: string
  error?: string
}

// In-memory store for mock generations
const generations = new Map<string, GenerationResult>()

/**
 * Generate a design using Google Stitch.
 *
 * Real implementation (uncomment when SDK is available):
 *
 * ```typescript
 * import { Stitch } from '@google/stitch-sdk'
 *
 * const stitch = new Stitch({ apiKey: process.env.STITCH_API_KEY })
 *
 * export async function generateDesign(prompt: string, referenceImages: string[]): Promise<GenerationResult> {
 *   const project = await stitch.projects.create({ name: 'Design Generation' })
 *   const screen = await project.screens.generate({
 *     prompt,
 *     referenceImages: referenceImages.map(url => ({ url })),
 *   })
 *
 *   const html = await screen.export({ format: 'html' })
 *   const screenshot = await screen.export({ format: 'png' })
 *
 *   return {
 *     project_id: project.id,
 *     html_url: html.url,
 *     screenshot_url: screenshot.url,
 *     html_content: await html.text(),
 *     status: 'completed',
 *   }
 * }
 * ```
 */
export async function generateDesign(
  prompt: string,
  _referenceImages: string[]
): Promise<GenerationResult> {
  // Mock implementation for development
  const projectId = `stitch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  console.log(`[Mock Stitch] Generating design for project ${projectId}`)
  console.log(`[Mock Stitch] Prompt: ${prompt.substring(0, 100)}...`)

  // Simulate generation delay
  await new Promise((resolve) => setTimeout(resolve, 2000))

  const mockHtml = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated Design</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Pretendard', sans-serif; color: #1a1a2e; }
    .hero {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      text-align: center;
    }
    .hero h1 { font-size: 3rem; margin-bottom: 1rem; }
    .hero p { font-size: 1.2rem; opacity: 0.9; max-width: 600px; line-height: 1.6; }
    .hero .cta {
      margin-top: 2rem;
      padding: 1rem 2.5rem;
      background: white;
      color: #764ba2;
      border: none;
      border-radius: 50px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
    }
    .note {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.8rem;
    }
  </style>
</head>
<body>
  <section class="hero">
    <h1>AI Generated Design</h1>
    <p>이 디자인은 Google Stitch AI를 통해 생성되었습니다. 실제 SDK가 연동되면 프롬프트 기반의 맞춤 디자인이 생성됩니다.</p>
    <button class="cta">자세히 보기</button>
  </section>
  <div class="note">Mock Design - Stitch SDK 연동 시 실제 디자인 생성</div>
</body>
</html>`

  const result: GenerationResult = {
    project_id: projectId,
    html_url: '', // Would be a real URL from Stitch
    screenshot_url: '', // Would be a real URL from Stitch
    html_content: mockHtml,
    status: 'completed',
  }

  generations.set(projectId, result)

  return result
}

/**
 * Check the status of a generation.
 */
export async function getGenerationStatus(
  projectId: string
): Promise<StatusResult> {
  const generation = generations.get(projectId)

  if (!generation) {
    return {
      status: 'failed',
      html_url: '',
      screenshot_url: '',
      error: 'Generation not found',
    }
  }

  return {
    status: generation.status,
    html_url: generation.html_url,
    screenshot_url: generation.screenshot_url,
  }
}
