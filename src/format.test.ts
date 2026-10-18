import { expect, test } from 'vitest'
import { formatName, sanitize, uniqueName, type FileInfo } from './format.ts'

const bill: FileInfo = {
  date: '2026-05-01',
  vendor: 'Helsana',
  person: 'Anton',
  description: null,
  amount: 209,
  currency: 'chf',
}

test('formats a bill', () => {
  expect(formatName(bill)).toBe('2026-05-01 Helsana - Anton - 209.00 CHF')
})

test('formats a bill with description and no person', () => {
  expect(formatName({ ...bill, person: null, description: 'Car Insurance', amount: 840.5 })).toBe(
    '2026-05-01 Helsana - Car Insurance - 840.50 CHF',
  )
})

test('skips missing parts', () => {
  expect(formatName({ ...bill, date: null, amount: null })).toBe('Helsana - Anton')
  expect(formatName({ ...bill, date: '01.05.2026' })).toBe('Helsana - Anton - 209.00 CHF')
})

test('returns null when nothing to name', () => {
  expect(
    formatName({
      date: '2026-05-01',
      vendor: null,
      person: null,
      description: ' ',
      amount: null,
      currency: null,
    }),
  ).toBeNull()
})

test('sanitize strips path separators and control characters', () => {
  expect(sanitize(' a/b\\c:\nd  e ')).toBe('a b c d e')
})

test('uniqueName appends a counter', () => {
  const taken = new Set(['a.pdf', 'a (2).pdf'])
  expect(uniqueName('a', '.pdf', (n) => taken.has(n))).toBe('a (3).pdf')
  expect(uniqueName('b', '.pdf', (n) => taken.has(n))).toBe('b.pdf')
})
