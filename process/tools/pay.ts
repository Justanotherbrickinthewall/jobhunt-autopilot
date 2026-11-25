// Compares a pay band with the private [pay] figures, so no agent has to read them.
//
//     node process/engine.ts pay below abroad <top>   <top> is the top of the band in US dollars a year
//     node process/engine.ts pay below india <top>    <top> is the top of the band in lakh rupees a year
//     node process/engine.ts pay below hourly <top>  <top> is the top of the band in US dollars an hour
//     node process/engine.ts pay ask                  prints the one figure meant for a founder
//     node process/engine.ts pay value <key>          prints one allow-listed figure for a form that asks for it
import { cfg } from '../constants.ts'
import type { Out } from './io.ts'

const USAGE = `usage: engine.ts pay below abroad <top>
       engine.ts pay below india <top>
       engine.ts pay below hourly <top>
       engine.ts pay ask
       engine.ts pay value <key>

below prints "below" when the top of the band is under the floor, otherwise "not below".
abroad takes US dollars a year, india takes lakh rupees a year and hourly takes US dollars an hour.
ask prints the founder ask.
value prints one key of an allow-list, for an application form that asks for it. Any other key exits 2.
No other [pay] value is ever printed.
`

// The pay keys faq.md names for the applier. notice_days_max is a day count and config prints it.
const FORM_KEYS = ['current_inr_lakh', 'expected_india_inr_lakh', 'floor_abroad_usd_year', 'contract_floor_usd_hour', 'contract_ideal_usd_hour']

class PayError extends Error {}

function figure(key: string): number {
  const v = cfg().pay[key]
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new PayError(`pay.${key} is missing or not a number in inputs.toml`)
  return v
}

export function main(argv: string[], out: Out = (s) => { process.stdout.write(s) }): number {
  if (argv.some((a) => a === '-h' || a === '--help')) { out(USAGE); return 0 }
  try {
    if (argv.length === 1 && argv[0] === 'ask') { out(`${figure('waas_ask_usd_year')}\n`); return 0 }
    if (argv.length === 2 && argv[0] === 'value') {
      if (!FORM_KEYS.includes(argv[1])) throw new PayError(`pay.${argv[1].slice(0, 60)} is not a key that pay value prints`)
      out(`${figure(argv[1])}\n`); return 0
    }
    if (argv.length === 3 && argv[0] === 'below' && (argv[1] === 'abroad' || argv[1] === 'india' || argv[1] === 'hourly')) {
      const top = /^\s*\d+(?:\.\d+)?\s*$/u.test(argv[2]) ? Number(argv[2]) : NaN
      if (!Number.isFinite(top) || top <= 0) throw new PayError('<top> must be a number above 0')
      const floor = figure(argv[1] === 'abroad' ? 'floor_abroad_usd_year' : argv[1] === 'hourly' ? 'contract_floor_usd_hour' : 'expected_india_inr_lakh')
      out(top < floor ? 'below\n' : 'not below\n')
      return 0
    }
    throw new PayError('expected "below abroad <top>", "below india <top>", "below hourly <top>", "ask" or "value <key>"')
  } catch (e) {
    if (!(e instanceof PayError)) throw e
    process.stderr.write(`${USAGE}engine.ts pay: error: ${e.message}\n`)
    return 2
  }
}
