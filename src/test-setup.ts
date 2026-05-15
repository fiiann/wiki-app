import { JSDOM } from 'jsdom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'bun:test'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')

Object.defineProperty(global, 'window', {
  value: dom.window,
  writable: true
})

Object.defineProperty(global, 'document', {
  value: dom.window.document,
  writable: true
})

Object.defineProperty(global, 'navigator', {
  value: dom.window.navigator,
  writable: true
})

Object.defineProperty(global, 'HTMLElement', {
  value: dom.window.HTMLElement,
  writable: true
})

afterEach(() => {
  cleanup()
})
