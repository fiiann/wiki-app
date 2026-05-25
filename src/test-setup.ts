import { JSDOM } from 'jsdom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'bun:test'

let dom: InstanceType<typeof JSDOM>

beforeEach(() => {
  dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  })

  // Map jsdom window to global
  Object.defineProperty(global, 'window', { value: dom.window, writable: true })
  Object.defineProperty(global, 'document', { value: dom.window.document, writable: true })
  Object.defineProperty(global, 'navigator', { value: dom.window.navigator, writable: true })
  Object.defineProperty(global, 'HTMLElement', { value: dom.window.HTMLElement, writable: true })
  Object.defineProperty(global, 'Element', { value: dom.window.Element, writable: true })
  Object.defineProperty(global, 'Node', { value: dom.window.Node, writable: true })
  Object.defineProperty(global, 'NodeList', { value: dom.window.NodeList, writable: true })
  Object.defineProperty(global, 'Event', { value: dom.window.Event, writable: true })
  Object.defineProperty(global, 'KeyboardEvent', { value: dom.window.KeyboardEvent, writable: true })
})

afterEach(() => {
  cleanup()
  dom.window.close()
  dom = undefined as any
})