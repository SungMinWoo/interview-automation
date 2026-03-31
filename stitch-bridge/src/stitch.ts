/**
 * Google Stitch SDK integration - 2-phase approach
 *
 * Phase 1: Create project + attempt generate (returns projectId immediately)
 * Phase 2: Fetch screens from existing project (user-triggered)
 */

interface GenerationResult {
  project_id: string
  project_url: string
  html_url: string
  screenshot_url: string
  html_content: string
  status: 'completed' | 'processing' | 'created' | 'failed'
  error?: string
}

const USE_REAL_SDK = !!process.env.STITCH_API_KEY && process.env.STITCH_API_KEY !== 'your_stitch_api_key'

// Simple lock
let generating = false
export function isGenerating() { return generating }

/**
 * List available tools (debug endpoint)
 */
export async function listAvailableTools(): Promise<any> {
  if (!USE_REAL_SDK) return { tools: ['mock_only'] }
  const { stitch } = await import('@google/stitch-sdk')
  return stitch.listTools()
}

/**
 * Phase 1: Create project + attempt screen generation
 * Always returns projectId even if generation fails
 */
export async function createAndGenerate(prompt: string, designMd?: string, colors?: { primary?: string; secondary?: string; accent?: string }): Promise<GenerationResult> {
  if (!USE_REAL_SDK) return mockGenerate(prompt)
  if (generating) {
    return { project_id: '', project_url: '', html_url: '', screenshot_url: '', html_content: '', status: 'failed', error: 'Generation already in progress' }
  }

  generating = true
  const { stitch } = await import('@google/stitch-sdk')

  try {
    // Step 0: Discover available tools
    let toolNames: string[] = []
    try {
      const toolsResult = await stitch.listTools()
      toolNames = (toolsResult?.tools || []).map((t: any) => t.name || t)
      console.log(`[Stitch] Available tools: ${toolNames.join(', ')}`)
    } catch (e) {
      console.warn(`[Stitch] listTools failed, continuing without tool discovery`)
    }

    // Step 1: Create project - this always works
    console.log(`[Stitch] Creating project...`)
    const createResult = await stitch.callTool('create_project', {
      title: `Design ${new Date().toISOString().slice(0, 10)}`,
    })

    let projectId = ''
    if (createResult?.name) {
      const match = String(createResult.name).match(/projects\/(\d+)/)
      projectId = match ? match[1] : createResult.name.replace('projects/', '')
    }
    projectId = projectId || createResult?.projectId || createResult?.project_id || String(createResult?.id || '')
    const projectUrl = projectId ? `https://stitch.withgoogle.com/projects/${projectId}` : ''

    console.log(`[Stitch] Project created: ${projectId}`)
    console.log(`[Stitch] Project URL: ${projectUrl}`)

    if (!projectId) {
      return { project_id: '', project_url: '', html_url: '', screenshot_url: '', html_content: '', status: 'failed', error: `No project ID: ${JSON.stringify(createResult)}` }
    }

    // Step 2: Create design system with DESIGN.md if provided
    let designSystemAssetId = ''
    if (designMd) {
      console.log(`[Stitch] Creating design system with DESIGN.md (${designMd.length} chars)...`)
      try {
        const primaryColor = colors?.primary || '#6366f1'
        const theme: Record<string, any> = {
          colorMode: 'LIGHT',
          headlineFont: 'INTER',
          bodyFont: 'INTER',
          roundness: 'ROUND_EIGHT',
          customColor: primaryColor,
          designMd: designMd,
        }
        if (colors?.primary) theme.overridePrimaryColor = colors.primary
        if (colors?.secondary) theme.overrideSecondaryColor = colors.secondary
        if (colors?.accent) theme.overrideTertiaryColor = colors.accent

        const dsResult = await stitch.callTool('create_design_system', {
          projectId: String(projectId),
          designSystem: {
            displayName: 'Brand Design System',
            theme,
          },
        })
        console.log(`[Stitch] Design system created:`, JSON.stringify(dsResult).substring(0, 300))

        // Extract asset ID for apply_design_system later
        if (dsResult?.name) {
          const match = String(dsResult.name).match(/assets\/(\d+)/)
          designSystemAssetId = match ? match[1] : ''
        }
        designSystemAssetId = designSystemAssetId || dsResult?.assetId || dsResult?.id || ''
        console.log(`[Stitch] Design system asset ID: ${designSystemAssetId}`)
      } catch (e: any) {
        console.warn(`[Stitch] create_design_system failed: ${e.message}`)
      }
    }

    // Step 3: Generate screen via callTool (project.generate has SDK bug)
    let htmlUrl = '', imageUrl = '', htmlContent = ''
    let screenId = ''

    try {
      console.log(`[Stitch] Generating screen via callTool (${prompt.length} chars)...`)
      const genResult = await stitch.callTool('generate_screen_from_text', {
        projectId: String(projectId),
        prompt: prompt,
        deviceType: 'DESKTOP',
      })
      console.log(`[Stitch] Screen generated:`, JSON.stringify(genResult).substring(0, 300))

      // Extract screen ID
      if (genResult?.name) {
        const match = String(genResult.name).match(/screens\/(\d+)/)
        screenId = match ? match[1] : ''
      }
      screenId = screenId || genResult?.screenId || genResult?.screen_id || ''
      console.log(`[Stitch] Screen ID: ${screenId}`)

      // Get HTML and image via the project's screen object
      if (screenId) {
        const project = stitch.project(projectId)
        const screen = await project.getScreen(screenId)
        htmlUrl = await screen.getHtml() || ''
        imageUrl = await screen.getImage() || ''
      }

      if (htmlUrl) {
        const resp = await fetch(htmlUrl)
        if (resp.ok) htmlContent = await resp.text()
        console.log(`[Stitch] HTML downloaded: ${htmlContent.length} chars`)
      }
      // Step 4: Apply design system to generated screen if we have both
      if (designSystemAssetId && screenId) {
        try {
          console.log(`[Stitch] Applying design system to screen ${screenId}...`)

          // Get project info to find screen instances
          const projectInfo = await stitch.callTool('get_project', { project_id: String(projectId) })
          const instances = projectInfo?.screenInstances || projectInfo?.screen_instances || []

          let screenInstances: any[] = []
          if (instances.length > 0) {
            screenInstances = instances.map((si: any) => ({
              id: si.id || si.screenInstanceId,
              sourceScreen: si.sourceScreen || `projects/${projectId}/screens/${screenId}`,
            }))
          } else {
            // Fallback: construct from our screen ID
            screenInstances = [{
              id: screenId,
              sourceScreen: `projects/${projectId}/screens/${screenId}`,
            }]
          }

          await stitch.callTool('apply_design_system', {
            projectId: String(projectId),
            assetId: designSystemAssetId,
            selectedScreenInstances: screenInstances,
          })
          console.log(`[Stitch] Design system applied!`)

          // Re-fetch HTML after applying design system
          if (screenId) {
            const project = stitch.project(projectId)
            const screen = await project.getScreen(screenId)
            const newHtmlUrl = await screen.getHtml() || ''
            const newImageUrl = await screen.getImage() || ''
            if (newHtmlUrl) {
              const resp = await fetch(newHtmlUrl)
              if (resp.ok) {
                htmlContent = await resp.text()
                htmlUrl = newHtmlUrl
                imageUrl = newImageUrl
                console.log(`[Stitch] Re-downloaded HTML after design system: ${htmlContent.length} chars`)
              }
            }
          }
        } catch (applyErr: any) {
          console.warn(`[Stitch] apply_design_system failed (non-fatal): ${applyErr.message}`)
        }
      }
    } catch (genErr: any) {
      console.warn(`[Stitch] Screen generation failed (project still created): ${genErr.message}`)
      return { project_id: projectId, project_url: projectUrl, html_url: '', screenshot_url: '', html_content: '', status: 'created', error: genErr.message }
    }

    return {
      project_id: projectId,
      project_url: projectUrl,
      html_url: htmlUrl,
      screenshot_url: imageUrl,
      html_content: htmlContent,
      status: htmlContent ? 'completed' : 'created',
    }
  } catch (err: any) {
    console.error(`[Stitch] Fatal error:`, err)
    return { project_id: '', project_url: '', html_url: '', screenshot_url: '', html_content: '', status: 'failed', error: err.message }
  } finally {
    generating = false
  }
}

/**
 * Phase 2: Fetch screens from an existing project
 * Called later by user to retrieve HTML/screenshot
 */
export async function fetchProjectScreens(projectId: string): Promise<GenerationResult> {
  const projectUrl = `https://stitch.withgoogle.com/projects/${projectId}`

  if (!USE_REAL_SDK) {
    return { project_id: projectId, project_url: projectUrl, html_url: '', screenshot_url: '', html_content: '', status: 'failed', error: 'SDK not configured' }
  }

  const { stitch } = await import('@google/stitch-sdk')

  try {
    console.log(`[Stitch] Fetching screens for project ${projectId}...`)
    const project = stitch.project(projectId)
    const screens = await project.screens()
    console.log(`[Stitch] Found ${screens.length} screens`)

    if (screens.length === 0) {
      return { project_id: projectId, project_url: projectUrl, html_url: '', screenshot_url: '', html_content: '', status: 'created' }
    }

    const screen = screens[screens.length - 1]
    const htmlUrl = await screen.getHtml() || ''
    const imageUrl = await screen.getImage() || ''

    let htmlContent = ''
    if (htmlUrl) {
      const resp = await fetch(htmlUrl)
      if (resp.ok) htmlContent = await resp.text()
      console.log(`[Stitch] Fetched HTML: ${htmlContent.length} chars`)
    }

    return {
      project_id: projectId,
      project_url: projectUrl,
      html_url: htmlUrl,
      screenshot_url: imageUrl,
      html_content: htmlContent,
      status: htmlContent ? 'completed' : 'created',
    }
  } catch (err: any) {
    console.error(`[Stitch] Fetch failed:`, err.message)
    return { project_id: projectId, project_url: projectUrl, html_url: '', screenshot_url: '', html_content: '', status: 'failed', error: err.message }
  }
}

/**
 * Mock for development
 */
async function mockGenerate(prompt: string): Promise<GenerationResult> {
  const id = `mock_${Date.now()}`
  await new Promise(r => setTimeout(r, 2000))

  return {
    project_id: id,
    project_url: `https://stitch.withgoogle.com/projects/${id}`,
    html_url: '',
    screenshot_url: '',
    html_content: `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Mock</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif}.hero{min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:2rem;text-align:center}.hero h1{font-size:3rem;margin-bottom:1rem}.hero p{font-size:1.2rem;opacity:.9;max-width:600px;line-height:1.6}</style>
</head><body><section class="hero"><h1>Mock Design</h1><p>STITCH_API_KEY 설정 시 실제 디자인이 생성됩니다.</p></section></body></html>`,
    status: 'completed',
  }
}
