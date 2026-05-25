import { describe, it, expect } from 'bun:test'
import { projectAcronym } from './acronym'

describe('projectAcronym', () => {
  it('derives 3-letter acronym from multi-word name', () => {
    expect(projectAcronym('Expense Tracker')).toBe('ET')
    expect(projectAcronym('Primary Chinese')).toBe('PC')
    expect(projectAcronym('Weight Tracker')).toBe('WT')
    expect(projectAcronym('Todo App')).toBe('TA')
  })

  it('falls back to 3 letters for single-word name', () => {
    expect(projectAcronym('Olympus')).toBe('OLY')
    expect(projectAcronym('Kanban')).toBe('KAN')
  })

  it('skips short/stop words', () => {
    expect(projectAcronym('The Wiki App')).toBe('WA')
    expect(projectAcronym('A Simple App')).toBe('SA')
  })

  it('uppercases all letters', () => {
    expect(projectAcronym('expense tracker')).toBe('ET')
    expect(projectAcronym('Primary Chinese')).toBe('PC')
  })

  it('takes first 3 significant letters for 3+ word names', () => {
    expect(projectAcronym('Mixed Case Name')).toBe('MCN')
    expect(projectAcronym('Todo App With More Words')).toBe('TAM')
  })
})