import { describe, expect, test } from 'claude-code/testing'

import { LRE, LRM, PDF, RLE, RLM, rtlText } from '../hooks/bidi'

const RTL = RLM + RLE
const LTR = LRM + LRE

describe('rtlText', () => {
  test('leaves lines without Hebrew alone', () => {
    expect(rtlText('Run `npm test` now.\n# Title')).toBe('Run `npm test` now.\n# Title')
  })

  test('a mostly Hebrew line opens RTL and wraps English code spans outside the backticks', () => {
    expect(rtlText('הרץ את `npm test` עכשיו')).toBe(`${RTL}הרץ את ${LRE}\`npm test\`${PDF} עכשיו`)
  })

  test('the marks go after markdown markers', () => {
    expect(rtlText('## כותרת\n- פריט\n> ציטוט\n12. שלב\n- [ ] משימה')).toBe(
      `## ${RTL}כותרת\n- ${RTL}פריט\n> ${RTL}ציטוט\n12. ${RTL}שלב\n- [ ] ${RTL}משימה`,
    )
  })

  test('an English line wraps a mostly Hebrew quote inside its marks, English word included', () => {
    expect(rtlText('The button says "לחץ על Save עכשיו" in the app')).toBe(
      `${LTR}The button says "${RLE}לחץ על Save עכשיו${PDF}" in the app`,
    )
  })

  test('an English line wraps a bare Hebrew stretch with its closing punctuation', () => {
    expect(rtlText('Say שלום עולם, then leave.')).toBe(`${LTR}Say ${RLE}שלום עולם,${PDF} then leave.`)
  })

  test('quotes, code spans and links do not count toward the direction', () => {
    // Outside them: "Use" and "here" (7 Latin letters) against nothing Hebrew.
    expect(rtlText('Use "שלום לכולם וברוכים הבאים" here')).toBe(
      `${LTR}Use "${RLE}שלום לכולם וברוכים הבאים${PDF}" here`,
    )
    // Outside them: Hebrew only, so RTL even with a long English link.
    expect(rtlText('ראה [the full documentation](https://example.com)')).toBe(
      `${RTL}ראה [the full documentation](https://example.com)`,
    )
  })

  test('gershayim inside a Hebrew word is not a quote', () => {
    expect(rtlText('Ask צה"ל today')).toBe(`${LTR}Ask ${RLE}צה"ל${PDF} today`)
  })

  test('never touches a code block', () => {
    const block = '```\nשלום `x`\n```'
    expect(rtlText(`${block}\nשלום`)).toBe(`${block}\n${RTL}שלום`)
  })

  test('a table row is handled cell by cell', () => {
    expect(rtlText('| שם | Name |\n|---|---|\n| `ls` רשימה | list of files שלום |')).toBe(
      `| ${RTL}שם | Name |\n|---|---|\n| ${RTL}${LRE}\`ls\`${PDF} רשימה | ${LTR}list of files ${RLE}שלום${PDF} |`,
    )
  })

  test('no closing mark is added at the end of a line', () => {
    expect(rtlText('שלום').endsWith(PDF)).toBe(false)
  })
})
