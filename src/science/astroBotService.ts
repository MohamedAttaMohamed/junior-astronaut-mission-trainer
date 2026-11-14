import { KNOWLEDGE, type KnowledgeDoc } from '../data/knowledge'
import type { Resources } from '../game/types'

export interface BotSource {
  title: string
  dataset?: string
  url: string
  score?: number
}

export interface BotResponse {
  answer: string
  grounded: boolean
  live: boolean
  sources: BotSource[]
  jargon: string[]
  backend: 'live-rag' | 'client-kb'
}

export const SPACE_GLOSSARY: Record<string, string> = {
  sol: 'One Martian day (24 hours and 39 minutes).',
  cme: 'Coronal Mass Ejection: A giant bubble of hot gas shot from the Sun.',
  'solar flare': 'A sudden bright burst of electromagnetic energy on the Sun.',
  radiation: 'High-energy cosmic particles and solar wind that can damage living cells.',
  regolith: 'The powdery dust and broken rock covering the Moon or Mars.',
  moxie: 'Mars Oxygen In-Situ Resource Utilization Experiment that creates oxygen from CO₂.',
  eclss: 'Environmental Control and Life Support System that scrubs air and recycles water.',
  tau: 'Measurement of atmospheric opacity (how thick the dust is in the sky).',
  microgravity: 'The condition of near-weightlessness experienced in orbit.',
  hydroponics: 'Growing plants in mineral-rich water without soil.',
  perchlorates: 'Toxic chemical salts found naturally in Martian soil.',
  radioisotope: 'A heat and power source using decaying space-grade isotopes.',
}

/**
 * Client-side BM25-style keyword search over the 92 exported NASA documents.
 */
function searchClientKnowledge(query: string, maxResults = 3): { doc: KnowledgeDoc; score: number }[] {
  const queryTokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((t) => t.length > 2)

  if (queryTokens.length === 0) return []

  const scored = KNOWLEDGE.map((doc) => {
    let score = 0
    const titleLower = doc.title.toLowerCase()
    const textLower = doc.text.toLowerCase()

    for (const token of queryTokens) {
      if (titleLower.includes(token)) score += 3.5
      const matches = (textLower.match(new RegExp(token, 'g')) || []).length
      score += Math.min(matches, 5) * 0.8
    }

    return { doc, score }
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, maxResults)
}

function extractRelevantJargon(text: string): string[] {
  const lower = text.toLowerCase()
  const found: string[] = []
  for (const [term, def] of Object.entries(SPACE_GLOSSARY)) {
    if (lower.includes(term)) {
      found.push(`${term.toUpperCase()}: ${def}`)
    }
  }
  return found.slice(0, 3)
}

/**
 * Ask AstroBot with seamless fallback:
 * 1. Tries the FastAPI backend at /api/v1/ask-astro-bot
 * 2. If offline, runs in-browser grounded retrieval against the 92 NASA documents
 */
export async function askAstroBot(
  question: string,
  missionContext: string = 'Mars Base Aster Alpha'
): Promise<BotResponse> {
  // 1. Try Live RAG Backend
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2600)

    const res = await fetch('/api/v1/ask-astro-bot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        current_mission_context: missionContext,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      return {
        answer: data.answer || 'AstroBot received telemetry from Aster Base.',
        grounded: Boolean(data.grounded),
        live: Boolean(data.live),
        sources: Array.isArray(data.sources) ? data.sources : [],
        jargon: Array.isArray(data.jargon) ? data.jargon : [],
        backend: 'live-rag',
      }
    }
  } catch {
    // Backend offline or timeout — fall through to client NASA knowledge engine
  }

  // 2. Client-side Grounded RAG Fallback
  const searchResults = searchClientKnowledge(question)

  if (searchResults.length > 0) {
    const top = searchResults[0].doc
    const jargon = extractRelevantJargon(`${question} ${top.text}`)

    // Create a kid-friendly grounded summary
    const cleanSentences = top.text
      .split(/(?<=[.!?])\s+/)
      .slice(0, 3)
      .join(' ')

    return {
      answer: `${cleanSentences} (Cadet Tip: Grounded in official ${top.source} documentation.)`,
      grounded: true,
      live: false,
      sources: searchResults.map((r) => ({
        title: r.doc.title,
        dataset: r.doc.source,
        url: r.doc.url,
        score: Math.min(0.95, 0.5 + r.score * 0.1),
      })),
      jargon,
      backend: 'client-kb',
    }
  }

  // General space guidance if no exact keyword match
  return {
    answer:
      `Cadet, in Mars missions like Aster Base Alpha, life support (oxygen, clean water, power, and habitat pressure) must stay balanced. Every choice has a scientific trade-off! Try asking about "oxygen", "solar power", "radiation", "regolith", or "hydroponics".`,
    grounded: false,
    live: false,
    sources: [
      {
        title: 'NASA Mars Exploration & Human Habitats',
        dataset: 'NASA Artemis & Mars Architecture',
        url: 'https://science.nasa.gov/mars/',
      },
    ],
    jargon: extractRelevantJargon(question),
    backend: 'client-kb',
  }
}

/**
 * Generate a contextual tactical hint for the current in-game crisis/task.
 */
export function generateContextualHint(
  levelTitle: string,
  eventHeadline: string,
  eventPrompt: string,
  targetHotspot: string,
  resources: Resources | Record<string, number>
): string {
  const lowResources = Object.entries(resources as Record<string, number>)
    .filter(([, val]) => typeof val === 'number' && val < 40)
    .map(([key, val]) => `${key} (${val}%)`)

  let resourceWarning = ''
  if (lowResources.length > 0) {
    resourceWarning = ` ⚠️ Note: Base telemetry shows critical levels in: ${lowResources.join(', ')}!`
  }

  return `Mission Context: "${levelTitle} - ${eventHeadline}". Your target is the ${targetHotspot.replace('_', ' ')} system. ${eventPrompt}${resourceWarning} What is the best engineering response to protect the crew?`
}
