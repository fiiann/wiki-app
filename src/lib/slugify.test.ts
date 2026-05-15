import { describe, it, expect } from 'bun:test'
import { slugify } from './slugify'

describe('slugify', () => {
  it('converts title to lowercase slug', () => {
    expect(slugify('Fix Login Bug')).toBe('fix-login-bug')
  })

  it('collapses multiple non-alphanumeric chars to single hyphen', () => {
    expect(slugify('Hello  World!!')).toBe('hello-world')
  })

  it('strips leading and trailing hyphens', () => {
    expect(slugify(' hello ')).toBe('hello')
  })

  it('keeps numbers in slug', () => {
    expect(slugify('Task 42')).toBe('task-42')
  })

  it('truncates to 60 characters', () => {
    const longTitle = 'a'.repeat(70)
    const result = slugify(longTitle)
    expect(result.length).toBe(60)
    expect(result).toBe('a'.repeat(60))
  })
})
