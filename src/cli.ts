#!/usr/bin/env node
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { parseArgs, styleText } from 'node:util'
import { formatName, uniqueName } from './format.ts'
import { pickProvider, type Content, type Provider } from './llm.ts'

const HELP = `Usage: nameit [options] <file...>

Renames files (mostly PDF bills) to "YYYY-MM-DD Vendor - Person - 12.34 CHF.pdf"
using Anthropic or OpenAI, whichever API key is set.

Options:
  -n, --dry-run      Print new names without renaming
  -m, --model <id>   Model to use (or NAMEIT_MODEL)
  -h, --help         Show this help
  -v, --version      Show version

Environment:
  ANTHROPIC_API_KEY  Use Anthropic (preferred when both are set)
  OPENAI_API_KEY     Use OpenAI
  NAMEIT_PROVIDER    Force "anthropic" or "openai"
`

const IMAGE_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
} as const

const MAX_TEXT = 50_000
const CONCURRENCY = 4

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      'dry-run': { type: 'boolean', short: 'n' },
      model: { type: 'string', short: 'm' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  })
  if (values.version) {
    const pkg = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8'))
    console.log(pkg.version)
    return
  }

  if (values.help || positionals.length === 0) {
    process.stdout.write(HELP)
    return
  }
  const provider = pickProvider(values.model)
  const dryRun = values['dry-run'] ?? false
  const files: string[] = []
  for (const arg of positionals) {
    const file = path.resolve(arg)
    const stat = await fs.stat(file).catch(() => null)
    if (stat?.isFile()) files.push(file)
    else if (!stat) fail(arg, 'no such file')
  }

  // Renames run one at a time so two files can't claim the same name.
  let renames = Promise.resolve()
  const queue = [...files]
  const worker = async () => {
    for (let file; (file = queue.shift());) {
      try {
        const base = await suggest(provider, file)
        if (!base) {
          fail(file, 'could not determine a name')
          continue
        }
        renames = renames
          .then(() => rename(file, base, dryRun))
          .catch((err) => fail(file, err.message))
      } catch (err) {
        fail(file, (err as Error).message)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  await renames
}

async function suggest(provider: Provider, file: string): Promise<string | null> {
  const dir = path.dirname(file)
  const fileName = path.basename(file)
  const info = await provider.extract({
    fileName,
    content: await readContent(file),
    siblings: await siblings(dir, fileName),
  })
  return formatName(info)
}

async function readContent(file: string): Promise<Content> {
  const ext = path.extname(file).toLowerCase()
  const buf = await fs.readFile(file)
  if (ext === '.pdf') return { type: 'pdf', data: buf.toString('base64') }
  if (ext in IMAGE_TYPES) {
    return {
      type: 'image',
      mediaType: IMAGE_TYPES[ext as keyof typeof IMAGE_TYPES],
      data: buf.toString('base64'),
    }
  }
  if (!buf.subarray(0, 8192).includes(0)) {
    return { type: 'text', text: buf.toString('utf8', 0, MAX_TEXT) }
  }
  return { type: 'none' }
}

const siblingCache = new Map<string, Promise<string[]>>()

async function siblings(dir: string, exclude: string): Promise<string[]> {
  if (!siblingCache.has(dir)) {
    siblingCache.set(
      dir,
      fs.readdir(dir, { withFileTypes: true }).then((entries) =>
        entries
          .filter((e) => e.isFile() && !e.name.startsWith('.'))
          .map((e) => e.name)
          .sort()
          .slice(0, 500),
      ),
    )
  }
  return (await siblingCache.get(dir)!).filter((name) => name !== exclude)
}

const reserved = new Set<string>()

async function rename(file: string, base: string, dryRun: boolean) {
  const dir = path.dirname(file)
  const oldName = path.basename(file)
  const ext = path.extname(file).toLowerCase()
  if (base + ext === oldName) {
    console.log(styleText('dim', `${oldName} (unchanged)`))
    return
  }
  const taken = (name: string) =>
    // Allow case-only renames of the file itself on case-insensitive file systems.
    name.toLowerCase() !== oldName.toLowerCase() &&
    (reserved.has(path.join(dir, name)) || existsSync(path.join(dir, name)))
  const newName = uniqueName(base, ext, taken)
  reserved.add(path.join(dir, newName))
  if (!dryRun) await fs.rename(file, path.join(dir, newName))
  console.log(`${styleText('dim', oldName)} → ${newName}`)
}

function fail(file: string, message: string) {
  process.exitCode = 1
  console.error(styleText('red', `${path.basename(file)}: ${message}`))
}

main().catch((err) => {
  console.error(styleText('red', err.message))
  process.exit(1)
})
