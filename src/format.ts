import { z } from 'zod'

export const FileInfo = z.object({
  date: z.string().nullable(),
  vendor: z.string().nullable(),
  person: z.string().nullable(),
  description: z.string().nullable(),
  amount: z.number().nullable(),
  currency: z.string().nullable(),
})

export type FileInfo = z.infer<typeof FileInfo>

// Builds "YYYY-MM-DD Vendor - Person - Description - 12.34 CHF".
export function formatName(info: FileInfo): string | null {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(info.date ?? '') ? info.date : null
  const money =
    info.amount == null
      ? null
      : [info.amount.toFixed(2), info.currency?.toUpperCase()].filter(Boolean).join(' ')
  const person = info.person?.trim().split(/\s+/)[0]
  const main = [info.vendor, person, info.description, money]
    .map((s) => sanitize(s ?? ''))
    .filter(Boolean)
    .join(' - ')
  if (!main) return null
  return [date, main].filter(Boolean).join(' ')
}

export function sanitize(s: string): string {
  return (
    s
      // oxlint-disable-next-line no-control-regex
      .replace(/[/\\:*?"<>|\x00-\x1f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120)
      .trim()
  )
}

// Returns "name.ext", or "name (2).ext" etc. if taken.
export function uniqueName(base: string, ext: string, taken: (name: string) => boolean): string {
  let name = base + ext
  for (let i = 2; taken(name); i++) name = `${base} (${i})${ext}`
  return name
}
