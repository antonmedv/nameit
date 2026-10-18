import { expect, test } from 'vitest'
import { greet } from './greet.ts'

test('greet', () => {
  expect(greet('world')).toBe('Hello, world!')
})
