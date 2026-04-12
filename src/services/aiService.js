import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, Output } from 'ai'
import { z } from 'zod'

const google = createGoogleGenerativeAI({
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
})

const COACH_PERSONA =
  'You narrate a career simulation game. College Scorecard pop-ups and the on-screen HUD already show exact salary, debt, and net worth from the simulation. ' +
  'Do not contradict those figures or invent new dollar amounts beyond what appears in the prompt. ' +
  'If you reference money, keep it qualitative (e.g. tight, comfortable) or reuse only numbers supplied to you. ' +
  'Stay grounded to the industry, slightly witty, never preachy.'

const scenarioSchema = z.object({
  title: z.string().describe('A punchy 4-7 word title for this career moment'),
  story: z.string().describe('2 sentences of vivid, grounded narrative for this moment'),
})

const retroSchema = z.object({
  title: z.string().describe('A LinkedIn-style headline for their career (10-12 words)'),
  story: z.string().describe('3-4 sentences: what they gained, what they sacrificed, and a final verdict'),
})

/**
 * Generate structured scenario narrative for a decision node.
 * Stats update happens BEFORE this is called — AI only handles flavor text.
 * Returns { title, story } or null on failure.
 */
export async function generateScenarioText({ major, year, phase, nodeContext, stats, chosenLabel = null }) {
  const userPrompt = `Context Packet:
- Major: ${major}
- Year: ${year} (Phase: ${phase})
- Current salary: $${Math.round(stats.salary).toLocaleString()}
- Happiness: ${stats.happiness}/100
- Situation: ${nodeContext}
${chosenLabel ? `- Player just chose: "${chosenLabel}"` : ''}

Write a scenario title and 2-sentence story for this career moment.`

  try {
    const result = await generateText({
      model: google('gemini-2.5-flash'),
      output: Output.object({ schema: scenarioSchema }),
      system: COACH_PERSONA,
      prompt: userPrompt,
    })
    return result.output
  } catch (err) {
    console.error('AI scenario generation failed:', err)
    return null
  }
}

/**
 * Generate the final "LinkedIn Retrospective" once all nodes are complete.
 * Returns { title, story } or fallback object on failure.
 */
export async function generateCareerRetrospective({ major, finalStats, choiceHistory }) {
  const choicesSummary = choiceHistory
    .map((c) => `Year ${c.year}: chose "${c.label}" (${c.impact})`)
    .join('\n')

  const userPrompt = `Player finished a "${major}" career simulation.

10-year journey:
${choicesSummary}

Final stats:
- Salary: $${Math.round(finalStats.salary).toLocaleString()}
- Net worth: $${Math.round(finalStats.bank - finalStats.debt).toLocaleString()}
- Happiness: ${finalStats.happiness}/100

Write their LinkedIn Retrospective headline and story.`

  try {
    const result = await generateText({
      model: google('gemini-2.5-flash'),
      output: Output.object({ schema: retroSchema }),
      system: COACH_PERSONA,
      prompt: userPrompt,
    })
    return result.output
  } catch (err) {
    console.error('AI retrospective generation failed:', err)
    return {
      title: 'A decade in the books.',
      story: 'Your career unfolded in ways even the data cannot fully capture. Was it worth it? Only you know.',
    }
  }
}
