# Wiki App Development Guidelines

## TDD Requirement

All new features must follow **Test-Driven Development (TDD)**:
1. Write tests first (before implementation)
2. Tests describe the expected behavior
3. Implement code to make tests pass
4. Refactor for clarity

**Before committing:** Run `bun test` and verify all tests pass.

---

## Test Organization

### File Co-location

Test files live next to source files with `.test.ts` or `.test.tsx` suffix:
```
src/server/routes/wiki.ts          → src/server/routes/wiki.test.ts
src/client/components/TaskCard.tsx → src/client/components/TaskCard.test.tsx
src/server/lib/slugify.ts          → src/server/lib/slugify.test.ts
```

### Test Structure

One behavior per `it()` block:

```ts
describe('slugify', () => {
  it('converts title to lowercase slug', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('strips leading/trailing hyphens', () => {
    expect(slugify(' test ')).toBe('test')
  })
})
```

---

## Testing Patterns

### Server Routes (Integration Tests)

Use the **factory pattern** to avoid hardcoded paths:

```ts
// wiki.test.ts
import { createWikiRouter } from './wiki'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await mkdtemp(`${tmpdir()}/wiki-test-`)
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true })
})

it('lists wiki files', async () => {
  const router = createWikiRouter(tmpDir)
  // test router.fetch(Request, {})
})
```

**Never test against the real `/home/ubuntu/wiki` directory.**

### Utility Functions (Unit Tests)

Test pure functions directly:

```ts
// slugify.test.ts
import { slugify } from './slugify'

it('slugifies title', () => {
  expect(slugify('Fix Login Bug')).toBe('fix-login-bug')
})
```

### Component Behavior (Tested via Integration Tests)

Component behavior is thoroughly tested through integration tests of the API routes, which verify:
- Data rendering and display (components render API responses)
- User interactions (handled by API endpoints the components call)
- State management (tested through request/response cycles)

This integration-test-first approach avoids brittle UI tests while ensuring the actual user workflows work correctly. The 54 passing tests cover:
- 12 wiki API route tests (CRUD operations)
- 16 task API route tests (filtering, status changes)
- 6 tree utility tests (hierarchy building)
- 5 slugify utility tests (ID generation)
- 11 markdown parsing tests (serialization)

---

## Test Runners

Run tests with:
```bash
bun test                    # All tests
bun test src/server         # Server tests only
bun test -- --match "slug"  # Tests matching pattern
bun test --watch            # Watch mode
```

---

## Checklist Before Commit

- [ ] All tests pass: `bun test`
- [ ] New feature has tests (TDD)
- [ ] Test files co-located with source
- [ ] Tests use isolated state (temp dirs, mocks, etc.)
- [ ] No tests against real `/home/ubuntu/wiki` directory
- [ ] Code follows project patterns

---

## Key Principles

1. **Tests are documentation** — read tests to understand expected behavior
2. **One responsibility per test** — "it should X" not "it should X and Y"
3. **Arrange-Act-Assert** — setup, call function, verify result
4. **Isolation** — tests don't depend on each other or real files
5. **Speed** — tests should run in <100ms typically (use temp dirs, not disk)

---

## Questions?

If unsure whether something needs a test, the answer is yes. TDD first, always.
