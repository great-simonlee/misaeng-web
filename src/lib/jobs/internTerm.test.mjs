// node --test src/lib/jobs/internTerm.test.mjs  (Node 22.18+/24 strips the .ts types)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { internTermFor, internTermOrder, normalizeInternTerm, parseInternTerm } from './internTerm.ts'

test('parses English season + year in either order', () => {
  const cases = {
    'Software Engineering Intern, Summer 2026': '2026-summer',
    '2027 Summer Analyst Program': '2027-summer',
    'Winter 2027 Co-op - Hardware': '2027-winter',
    'Fall 2026 Co-op': '2026-fall',
    'Autumn 2026 Research Intern': '2026-fall',
    'Spring 2027 Intern': '2027-spring',
    "Summer '26 Marketing Intern": '2026-summer',
    'Intern (Summer, 2026)': '2026-summer',
    'Summer-2026 Intern': '2026-summer',
    'Summer Analyst 2026': '2026-summer',
    'Summer Analyst Program 2027 - New York': '2027-summer',
    '2026 Global Markets Summer Analyst': '2026-summer',
    'SUMMER 2026 INTERNSHIP': '2026-summer',
  }
  for (const [title, expected] of Object.entries(cases)) assert.equal(parseInternTerm(title), expected, title)
})

test('parses Korean season + year', () => {
  assert.equal(parseInternTerm('2026 여름 인턴'), '2026-summer')
  assert.equal(parseInternTerm('2027년 겨울 인턴십 (12주)'), '2027-winter')
  assert.equal(parseInternTerm('26년 가을 인턴'), '2026-fall')
  assert.equal(parseInternTerm('여름 2026 인턴 (10주)'), '2026-summer')
  assert.equal(parseInternTerm('2027년 봄 학기 인턴'), '2027-spring')
})

test('returns null without a clear season + year', () => {
  for (const title of [
    'Summer Intern',
    'Software Engineering Intern',
    'Intern 2026',
    'Summer Analyst - Class of 2027',
    'Fallback Engineer 2026',
    'Summertime 2026',
    '',
    null,
    undefined,
  ]) {
    assert.equal(parseInternTerm(title), null, String(title))
  }
})

test('earliest season wins', () => {
  assert.equal(parseInternTerm('Winter 2027 or Summer 2027 Co-op'), '2027-winter')
})

test('normalizeInternTerm only accepts the contract format', () => {
  assert.equal(normalizeInternTerm('2026-summer'), '2026-summer')
  assert.equal(normalizeInternTerm(' 2026-Summer '), '2026-summer')
  assert.equal(normalizeInternTerm('2026-autumn'), null)
  assert.equal(normalizeInternTerm('1999-summer'), null)
  assert.equal(normalizeInternTerm('summer 2026'), null)
  assert.equal(normalizeInternTerm(null), null)
  assert.equal(normalizeInternTerm(2026), null)
})

test('internTermFor: intern only, column first, then title, then work type', () => {
  assert.equal(internTermFor({ level: 'new_grad', column: '2026-summer', title: 'Summer 2026' }), null)
  assert.equal(internTermFor({ level: 'intern', column: '2027-winter', title: 'Summer 2026 Intern' }), '2027-winter')
  assert.equal(internTermFor({ level: 'intern', column: 'bad', title: 'Summer 2026 Intern' }), '2026-summer')
  assert.equal(internTermFor({ level: 'intern', column: null, title: 'Data Intern', workType: '2026년 여름 인턴 (10주)' }), '2026-summer')
  assert.equal(internTermFor({ level: 'intern', title: 'Data Intern', workType: '인턴 (12주)' }), null)
})

test('internTermOrder sorts chronologically', () => {
  const terms = ['2027-summer', '2026-winter', '2026-summer', '2027-spring']
  assert.deepEqual([...terms].sort((a, b) => internTermOrder(a) - internTermOrder(b)), [
    '2026-summer',
    '2026-winter',
    '2027-spring',
    '2027-summer',
  ])
})
