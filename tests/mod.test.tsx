import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const BAND = {
  plugin: 'rtl-mode',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 9 },
    view: {},
  },
} as const

const COMPOSE = {
  model: 'claude-opus-5-5',
  promptModel: 'claude-opus-5-5',
  surfaces: ['terminal'],
  tools: [],
  outputStyle: null,
  traits: [],
} as const

function setUp(on: On, stored: Record<string, unknown> = {}) {
  mock.store(on, stored)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
}

const start = ($: Engine) =>
  $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

test('/rtl on, /rtl off and /rtl toggle the mode', async ($, on) => {
  setUp(on)
  on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'You are Claude.', scope: 'shared' }] }))
  await start($)
  const rtl = (args: string) =>
    $.command.run({
      command: 'rtl',
      args,
      origin: { kind: 'composer' },
      presentation: { isFullscreen: false, columns: 80 },
    })
  const ids = async () => (await $.prompt.compose(COMPOSE)).sections.map(s => s.id)

  expect(await ids()).toEqual(['intro'])
  expect((await rtl('on')).text).toBe('RTL mode ON')
  expect(await ids()).toEqual(['intro', 'rtl-mode:rules'])
  expect((await rtl('')).text).toBe('RTL mode OFF')
  expect(await ids()).toEqual(['intro'])
  expect((await rtl(' ')).text).toBe('RTL mode ON')
  expect((await rtl('OFF')).text).toBe('RTL mode OFF')
  expect((await rtl('maybe')).text).toContain('Usage')
})

test('the mode is read back from the store when a session starts', async ($, on) => {
  setUp(on, { isOn: true })
  await start($)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ key: 'rtl' }))?.text).toContain('ON')
    await ui.unmount()
  }
})

test('the band shows OFF, and a press turns it ON and the message rewrite with it', async ($, on) => {
  setUp(on)
  const drawn: string[] = []
  on('ui.render', { component: 'AssistantMessage' }, ($, e) => {
    drawn.push(e.props.text)
    const { Text } = $.ui.resolve(e)
    return <Text>{e.props.text}</Text>
  })
  await start($)
  const reply = () =>
    $.ui.render({
      surface: 'terminal',
      component: 'AssistantMessage',
      requestId: 'm1',
      props: { text: 'שלום לכולם world', isFirstOfReply: true },
    })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ key: 'rtl' }))?.text).toContain('OFF')
  await reply()
  expect(drawn.at(-1)).toBe('שלום לכולם world')

  await ui.press({ key: 'rtl' })
  expect((await ui.find({ key: 'rtl' }))?.text).toContain('ON')
  await reply()
  expect(drawn.at(-1)).toBe('\u200F\u202Bשלום לכולם world')
  await ui.unmount()
})

test('a user prompt is rewritten for display while the mode is on', async ($, on) => {
  setUp(on, { isOn: true })
  const drawn: string[] = []
  on('ui.render', { component: 'UserMessage' }, ($, e) => {
    drawn.push(e.props.text)
    const { Text } = $.ui.resolve(e)
    return <Text>{e.props.text}</Text>
  })
  await start($)
  await $.ui.render({
    surface: 'terminal',
    component: 'UserMessage',
    requestId: 'u1',
    props: { text: 'fix the "כפתור של Save" label', origin: { kind: 'composer' }, isExpanded: false },
  })
  expect(drawn).toEqual(['‎‪fix the "‫כפתור של Save‬" label'])
})
