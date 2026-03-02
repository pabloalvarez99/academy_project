import { ipcMain } from 'electron'
import { join } from 'path'
import { readFileSync } from 'fs'
import yaml from 'js-yaml'
import { loadExercise, listExercises, loadVersion, getContentDir } from './content'

// ── Grammar Types ─────────────────────────────────────────────────────────────

interface Token {
  text: string
  lower: string
  position: number
}

interface ValidationError {
  position: number
  length: number
  message: string
  rule: string
  original: string
  suggest: string
}

interface ValidationResult {
  input: string
  errors: ValidationError[]
  score: number
  isValid: boolean
}

// ── Tokenizer ─────────────────────────────────────────────────────────────────

function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  const re = /[a-zA-Z0-9']+/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    tokens.push({
      text: match[0],
      lower: match[0].toLowerCase(),
      position: match.index,
    })
  }
  return tokens
}

function computeScore(tokenCount: number, errorCount: number): number {
  if (tokenCount === 0) return 100
  const raw = 100 - Math.round((errorCount * 100) / tokenCount)
  return Math.max(0, raw)
}

// ── Article Rule (a / an) ─────────────────────────────────────────────────────

const vowelSet = new Set(['a', 'e', 'i', 'o', 'u'])

const aExceptions = new Set(['hour', 'honest', 'honour', 'heir'])

const anExceptions = new Set([
  'unicorn', 'university', 'uniform', 'union', 'unit', 'unique',
  'user', 'use', 'usual', 'used', 'utility',
])

function articleRule(tokens: Token[]): ValidationError[] {
  const errors: ValidationError[] = []
  for (let i = 0; i + 1 < tokens.length; i++) {
    const t = tokens[i]
    const next = tokens[i + 1]
    if (t.lower !== 'a' && t.lower !== 'an') continue
    if (!next.lower.length) continue

    const shouldBeAn = (vowelSet.has(next.lower[0]) || aExceptions.has(next.lower)) && !anExceptions.has(next.lower)
    const isAn = t.lower === 'an'
    if (isAn === shouldBeAn) continue

    const correct = shouldBeAn ? 'an' : 'a'
    errors.push({
      position: t.position,
      length: t.text.length,
      message: `Use "${correct}" before "${next.text}"`,
      rule: 'articles',
      original: t.text,
      suggest: correct,
    })
  }
  return errors
}

// ── Double Word Rule ──────────────────────────────────────────────────────────

function doubleWordRule(tokens: Token[]): ValidationError[] {
  const errors: ValidationError[] = []
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i].lower === tokens[i - 1].lower) {
      errors.push({
        position: tokens[i].position,
        length: tokens[i].text.length,
        message: `Repeated word: "${tokens[i].text}"`,
        rule: 'double_word',
        original: tokens[i].text,
        suggest: '',
      })
    }
  }
  return errors
}

// ── Capitalization Rule ───────────────────────────────────────────────────────

function capitalizationRule(tokens: Token[]): ValidationError[] {
  if (tokens.length === 0) return []
  const first = tokens[0]
  if (/^[a-z]/.test(first.text)) {
    return [{
      position: first.position,
      length: first.text.length,
      message: 'Sentence should start with a capital letter',
      rule: 'capitalization',
      original: first.text,
      suggest: first.text[0].toUpperCase() + first.text.slice(1),
    }]
  }
  return []
}

// ── Contraction Rule ──────────────────────────────────────────────────────────

const contractionMap: Record<string, string> = {
  cant: "can't", dont: "don't", wont: "won't", isnt: "isn't",
  arent: "aren't", wasnt: "wasn't", werent: "weren't", hasnt: "hasn't",
  havent: "haven't", hadnt: "hadn't", didnt: "didn't", doesnt: "doesn't",
  wouldnt: "wouldn't", shouldnt: "shouldn't", couldnt: "couldn't",
  mustnt: "mustn't", neednt: "needn't",
  ive: "I've", id: "I'd", ill: "I'll",
  youre: "you're", youve: "you've", youll: "you'll", youd: "you'd",
  theyre: "they're", theyve: "they've", theyll: "they'll", theyd: "they'd",
  weve: "we've", hes: "he's", shes: "she's",
  thats: "that's", whats: "what's", whos: "who's",
  wheres: "where's", hows: "how's", lets: "let's",
}

function contractionRule(tokens: Token[]): ValidationError[] {
  const errors: ValidationError[] = []
  for (const t of tokens) {
    const correct = contractionMap[t.lower]
    if (!correct) continue
    errors.push({
      position: t.position,
      length: t.text.length,
      message: `Missing apostrophe in "${t.text}" — did you mean "${correct}"?`,
      rule: 'contraction',
      original: t.text,
      suggest: correct,
    })
  }
  return errors
}

// ── Validation engine ─────────────────────────────────────────────────────────

function validateText(text: string): ValidationResult {
  const tokens = tokenize(text)
  const errors: ValidationError[] = [
    ...articleRule(tokens),
    ...doubleWordRule(tokens),
    ...capitalizationRule(tokens),
    ...contractionRule(tokens),
  ]
  return {
    input: text,
    errors,
    score: computeScore(tokens.length, errors.length),
    isValid: errors.length === 0,
  }
}

// ── Curriculum ────────────────────────────────────────────────────────────────

interface CurriculumExerciseDef {
  id: string
}

interface ConceptDef {
  id: string
  name: string
  description: string
  exercises: string[]
}

interface LevelDef {
  level: number
  name: string
  description: string
  concepts: ConceptDef[]
}

interface CurriculumFile {
  levels: LevelDef[]
}

interface ConceptGroup {
  id: string
  name: string
  description: string
  exercises: { id: string; title: string; difficulty: number; category: string }[]
}

interface CurriculumLevel {
  level: number
  name: string
  description: string
  concepts: ConceptGroup[]
}

function loadCurriculum(): CurriculumLevel[] {
  const curriculumPath = join(getContentDir(), 'grammar', 'curriculum.yaml')
  let raw: string
  try {
    raw = readFileSync(curriculumPath, 'utf-8')
  } catch {
    return []
  }
  const parsed = yaml.load(raw) as CurriculumFile
  const result: CurriculumLevel[] = []

  for (const levelDef of parsed.levels || []) {
    const concepts: ConceptGroup[] = []
    for (const conceptDef of levelDef.concepts || []) {
      const exercises = []
      for (const exId of conceptDef.exercises || []) {
        const path = `grammar/exercises/${exId}.yaml`
        try {
          const ex = loadExercise(path)
          exercises.push({ id: path, title: ex.title, difficulty: ex.difficulty, category: ex.metadata.category })
        } catch {
          // skip missing exercise
        }
      }
      concepts.push({ id: conceptDef.id, name: conceptDef.name, description: conceptDef.description, exercises })
    }
    result.push({ level: levelDef.level, name: levelDef.name, description: levelDef.description, concepts })
  }
  return result
}

// ── IPC handlers ─────────────────────────────────────────────────────────────

export function registerGrammarHandlers(): void {
  ipcMain.handle('grammar:validate', (_event, text: string) => {
    return validateText(text)
  })

  ipcMain.handle('grammar:list', () => {
    return listExercises('grammar')
  })

  ipcMain.handle('grammar:get', (_event, id: string) => {
    // id may be just the filename or a full path
    const path = id.startsWith('grammar/') ? id : `grammar/exercises/${id}.yaml`
    return loadExercise(path)
  })

  ipcMain.handle('grammar:curriculum', () => {
    return loadCurriculum()
  })
}
