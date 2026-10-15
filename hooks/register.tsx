import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { rtlText } from './bidi'

const isOn = atom({ plugin: 'rtl-mode', key: 'isOn' } as const, false)
const GREEN = '#17DD95'

const RULES = `RTL mode is on: the person reads this session in a right-to-left display.
- When you answer in Hebrew: begin every line (after any markdown marker such as #, - or 1.) with a Hebrew word, never with an English word, a number, a command or a path. Put a space on both sides of every English word. Never join English to Hebrew with a hyphen: write "ה API", not "ה-API". Put every command, file path and code identifier in backticks.
- When you answer in English: write as usual, and put any Hebrew word or phrase in double quotation marks.`

// $.store keeps the mode across sessions; $.state mirrors it so every drawing that reads it redraws on a change.
async function setMode($: EngineInterface, change: (value: boolean) => boolean) {
  const value = await update($, isOn, change)
  await $.store.set('isOn', value)
  return value
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'rtl',
      description: 'Toggle the RTL display of Hebrew lines',
      argumentHint: '[on|off]',
    })
    const stored = (await $.store.get('isOn')) === true
    await update($, isOn, () => stored)

    return next(e)
  })

  on('command.run', { command: 'rtl' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg !== '' && arg !== 'on' && arg !== 'off') {
      return { text: 'Usage: /rtl, /rtl on or /rtl off' }
    }
    const value = await setMode($, now => (arg === '' ? !now : arg === 'on'))

    return { text: `RTL mode ${value ? 'ON' : 'OFF'}` }
  })

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) =>
    (await read($, isOn)) ? next({ ...e, props: { ...e.props, text: rtlText(e.props.text) } }) : next(e),
  )

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) =>
    (await read($, isOn)) ? next({ ...e, props: { ...e.props, text: rtlText(e.props.text) } }) : next(e),
  )

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }
    const { Button, Text } = $.ui.resolve(e)
    const isOnNow = await read($, isOn)

    return (
      <Button key="rtl" plain onPress={() => setMode($, now => !now)}>
        RTL{' '}
        {isOnNow ? <Text color={GREEN} bold>ON</Text> : <Text dimColor>OFF</Text>}
      </Button>
    )
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    if (!(await read($, isOn))) {
      return composed
    }

    return { sections: [...composed.sections, { id: 'rtl-mode:rules', text: RULES, scope: 'session' }] }
  })
}
