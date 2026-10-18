import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { FileInfo } from './format.ts'

export type Content =
  | { type: 'pdf'; data: string }
  | {
      type: 'image'
      mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'
      data: string
    }
  | { type: 'text'; text: string }
  | { type: 'none' }

export type Request = {
  fileName: string
  content: Content
  siblings: string[]
}

export type Provider = {
  name: string
  model: string
  extract(req: Request): Promise<FileInfo>
}

const SYSTEM = `You name files: mostly scanned bills and invoices, and sometimes other documents. Extract these fields:

- kind: "bill" if the document states an amount to pay or that was paid (invoice, receipt, premium notice, fine, payment slip, or a statement or policy with an amount due), whatever its title. "document" for everything else (contract, letter, certificate, report, ID, form, informational statement).
- date: for bills, the invoice issue date; for documents, the date the document was issued or signed. YYYY-MM-DD, or null if there is none.
- vendor: the shortest recognizable name of the issuer, usually one or two words: "Helsana" not "Helsana Versicherungen AG", "Mamut" not "Mamut-Center Margariti", "Kanton Zürich" not "Kantonales Steueramt Zürich". Keep diacritics.
- person: first name of the person the document is about or the service is for (patient, student, insured person, child, ID holder), if it names one. Not the account holder or addressee of a household bill such as electricity, rent, taxes or fines. null otherwise.
- description: English words in Title Case.
  - Bills: 1-3 words, only if it adds information beyond vendor and person, e.g. "Electricity", "Car Insurance", "Speeding Fine", "Drawing Lessons". null for routine recurring bills where the vendor says enough.
  - Documents: 1-4 words, always set; the document's title or type, with a year or subject if relevant, e.g. "Tax Assessment 2025", "Car Insurance Policy", "Rental Contract", "School Report".
- amount: bills only, the total amount due or paid, as a number. null for documents.
- currency: ISO code, e.g. CHF, EUR. null if no amount.

Use Latin script for every field; transliterate other scripts. Write the description in English even if the document is in another language.
If the folder already has files from the same vendor or for the same person, use exactly the spelling those file names use.`

function prompt(req: Request): string {
  let text = `Original file name: ${req.fileName}`
  if (req.content.type === 'none')
    text += '\nThe file content is not available; use the file name only.'
  if (req.siblings.length > 0) {
    text +=
      '\n\nOther file names in the same folder. Reuse their spelling of vendors and people when they match, but ignore their format:\n' +
      req.siblings.join('\n')
  }
  return text
}

export function pickProvider(model?: string): Provider {
  const forced = process.env.NAMEIT_PROVIDER
  model ??= process.env.NAMEIT_MODEL
  if (forced === 'anthropic' || (!forced && process.env.ANTHROPIC_API_KEY)) {
    return anthropic(model ?? 'claude-opus-5-5')
  }
  if (forced === 'openai' || (!forced && process.env.OPENAI_API_KEY)) {
    return openai(model ?? 'gpt-5.5')
  }
  throw new Error('Set ANTHROPIC_API_KEY or OPENAI_API_KEY.')
}

function anthropic(model: string): Provider {
  const client = new Anthropic()
  return {
    name: 'anthropic',
    model,
    async extract(req) {
      const content: Anthropic.ContentBlockParam[] = []
      const c = req.content
      if (c.type === 'pdf') {
        content.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: c.data },
        })
      } else if (c.type === 'image') {
        content.push({
          type: 'image',
          source: { type: 'base64', media_type: c.mediaType, data: c.data },
        })
      } else if (c.type === 'text') {
        content.push({ type: 'text', text: c.text })
      }
      content.push({ type: 'text', text: prompt(req) })
      const response = await client.messages.parse({
        model,
        max_tokens: 4096,
        system: SYSTEM,
        output_config: { effort: 'low', format: zodOutputFormat(FileInfo) },
        messages: [{ role: 'user', content }],
      })
      if (response.stop_reason === 'refusal') throw new Error('Model refused to process the file.')
      if (!response.parsed_output) throw new Error('Model returned no result.')
      return response.parsed_output
    },
  }
}

function openai(model: string): Provider {
  const client = new OpenAI()
  return {
    name: 'openai',
    model,
    async extract(req) {
      const content: OpenAI.Responses.ResponseInputContent[] = []
      const c = req.content
      if (c.type === 'pdf') {
        content.push({
          type: 'input_file',
          filename: req.fileName,
          file_data: `data:application/pdf;base64,${c.data}`,
        })
      } else if (c.type === 'image') {
        content.push({
          type: 'input_image',
          detail: 'auto',
          image_url: `data:${c.mediaType};base64,${c.data}`,
        })
      } else if (c.type === 'text') {
        content.push({ type: 'input_text', text: c.text })
      }
      content.push({ type: 'input_text', text: prompt(req) })
      const response = await client.responses.parse({
        model,
        instructions: SYSTEM,
        input: [{ role: 'user', content }],
        text: { format: zodTextFormat(FileInfo, 'file_info') },
      })
      if (!response.output_parsed) throw new Error('Model returned no result.')
      return response.output_parsed
    },
  }
}
