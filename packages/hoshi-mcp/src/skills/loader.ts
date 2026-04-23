import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

export interface Skill {
  id: string
  name: string
  version: string
  category: string
  risk: 'low' | 'elevated' | 'critical'
  description: string
  whenToUse: string[]
  tools: Array<{
    name: string
    purpose: string
    args: string
    category: string
  }>
  systemPrompt: string
  examples: Array<{
    input: string
    action: string
    response: string
  }>
  guardrails: string[]
  raw: string
}

/**
 * Parse a markdown skill file into structured data.
 * This is a best-effort parser — skills follow a conventional format.
 */
export function parseSkill(markdown: string): Skill {
  
  // Extract name from first h1
  const nameMatch = markdown.match(/^# Skill: (.+)$/m)
  const name = nameMatch?.[1]?.trim() || 'Unknown'
  
  // Extract metadata
  const idMatch = markdown.match(/\*\*id:\*\* `([^`]+)`/)
  const versionMatch = markdown.match(/\*\*version:\*\* `([^`]+)`/)
  const categoryMatch = markdown.match(/\*\*category:\*\* `?(.+?)`?  /)
  const riskMatch = markdown.match(/\*\*risk:\*\* `?(.+?)`?  /)
  
  // Extract sections
  const descMatch = markdown.match(/## Description\n+([\s\S]+?)(?=\n## |$)/)
  const whenToUseMatch = markdown.match(/## When to Use\n+([\s\S]+?)(?=\n## |$)/)
  const toolsMatch = markdown.match(/## MCP Tools\n+([\s\S]+?)(?=\n## |$)/)
  const promptMatch = markdown.match(/## System Prompt\n+([\s\S]+?)(?=\n## |$)/)
  const examplesMatch = markdown.match(/## Examples\n+([\s\S]+?)(?=\n## |$)/)
  const guardrailsMatch = markdown.match(/## Guardrails\n+([\s\S]+?)(?=\n## |$)/)
  
  // Parse tools table
  const tools: Skill['tools'] = []
  if (toolsMatch) {
    const tableLines = toolsMatch[1].split('\n').filter(l => l.startsWith('|') && !l.includes('---'))
    for (const line of tableLines.slice(1)) {
      const cols = line.split('|').map(c => c.trim()).filter(Boolean)
      if (cols.length >= 4) {
        tools.push({
          name: cols[0].replace(/`/g, ''),
          purpose: cols[1],
          args: cols[2],
          category: cols[3]
        })
      }
    }
  }
  
  // Parse examples
  const examples: Skill['examples'] = []
  if (examplesMatch) {
    const exampleBlocks = examplesMatch[1].split(/### Example \d+:/g).filter(Boolean)
    for (const block of exampleBlocks) {
      const inputMatch = block.match(/\*\*User:\*\* "(.+?)"/s)
      const actionMatch = block.match(/\*\*Action:\*\*\n?([\s\S]+?)(?=\*\*Response:|$)/)
      const responseMatch = block.match(/\*\*Response:\*\*\n?([\s\S]+?)(?=### |$)/)
      
      if (inputMatch) {
        examples.push({
          input: inputMatch[1].trim(),
          action: actionMatch?.[1]?.trim() || '',
          response: responseMatch?.[1]?.trim() || ''
        })
      }
    }
  }
  
  // Parse guardrails
  const guardrails: string[] = []
  if (guardrailsMatch) {
    const lines = guardrailsMatch[1].split('\n').filter(l => l.trim().startsWith('-'))
    for (const line of lines) {
      guardrails.push(line.trim().replace(/^- /, ''))
    }
  }
  
  // Parse when to use triggers
  const whenToUse: string[] = []
  if (whenToUseMatch) {
    const lines = whenToUseMatch[1].split('\n').filter(l => l.trim().startsWith('-'))
    for (const line of lines) {
      whenToUse.push(line.trim().replace(/^- /, ''))
    }
  }
  
  return {
    id: idMatch?.[1] || '',
    name,
    version: versionMatch?.[1] || '0.0.0',
    category: categoryMatch?.[1] || 'unknown',
    risk: (riskMatch?.[1] as any) || 'low',
    description: descMatch?.[1]?.trim() || '',
    whenToUse,
    tools,
    systemPrompt: promptMatch?.[1]?.trim() || '',
    examples,
    guardrails,
    raw: markdown
  }
}

/**
 * Load all skills from a directory.
 */
export function loadSkills(dir: string): Map<string, Skill> {
  const skills = new Map<string, Skill>()
  
  try {
    const files = readdirSync(dir)
      .filter(f => f.endsWith('.md') && f !== 'README.md')
    
    for (const file of files) {
      const path = join(dir, file)
      const markdown = readFileSync(path, 'utf-8')
      const skill = parseSkill(markdown)
      if (skill.id) {
        skills.set(skill.id, skill)
      }
    }
  } catch (err) {
    console.warn(`Failed to load skills from ${dir}:`, err)
  }
  
  return skills
}

/**
 * Get a skill by ID.
 */
export function getSkill(skills: Map<string, Skill>, id: string): Skill | undefined {
  return skills.get(id)
}

/**
 * Find skills that match a user query based on triggers.
 */
export function matchSkills(skills: Map<string, Skill>, query: string): Skill[] {
  const query_lower = query.toLowerCase()
  const matched: Skill[] = []
  
  for (const skill of skills.values()) {
    // Match by triggers
    for (const trigger of skill.whenToUse) {
      if (query_lower.includes(trigger.toLowerCase())) {
        matched.push(skill)
        break
      }
    }
    
    // Match by skill name
    if (query_lower.includes(skill.name.toLowerCase())) {
      if (!matched.includes(skill)) matched.push(skill)
    }
  }
  
  return matched
}
