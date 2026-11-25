// Chrome pin. MODE=post records the device chosen by select_browser; MODE=pre denies any
// Chrome call until select_browser has picked chrome_device_id from process/local.json.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

type HookInput = { session_id?: unknown; tool_name?: string; tool_input?: Record<string, unknown> }

function deny(reason: string): never {
  console.log(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  }))
  process.exit(0)
}

let d: HookInput = {}
try { d = JSON.parse(process.env.HOOK_INPUT || '{}') } catch { process.exit(0) }
const proj = process.env.PROJ ?? process.cwd()
const sid = String(d.session_id || 'nosession').replace(/[^A-Za-z0-9_-]/gu, '_')
const marker = join(process.env.TMPDIR || '/tmp', `jobhunt-chrome-pin-${sid}`)
const tool = d.tool_name || ''
const local = join(proj, 'process', 'local.json')

if (process.env.MODE === 'post') {
  if (tool.endsWith('select_browser')) {
    const ti = d.tool_input || {}
    const dev = ti.deviceId || ti.device_id || ti.browser_id || ''
    try { writeFileSync(marker, String(dev)) } catch { /* the marker is best effort */ }
  }
  process.exit(0)
}

if (tool.endsWith('select_browser')) process.exit(0)
let want = ''
try { want = JSON.parse(readFileSync(local, 'utf8')).chrome_device_id || '' } catch {
  deny('process/local.json is unreadable, so the Chrome pin cannot be checked.')
}
// A blank chrome_device_id means no browser is pinned yet, so /setup may list the browsers to choose one.
if (tool.endsWith('list_connected_browsers')) {
  if (want) deny('list_connected_browsers is never called here. Use select_browser with chrome_device_id from process/local.json.')
  process.exit(0)
}
let have = ''
try { have = readFileSync(marker, 'utf8').trim() } catch { have = '' }
if (!want) deny('process/local.json has no chrome_device_id. Stop and report.')
if (have !== want) deny('Run select_browser with the chrome_device_id from process/local.json before any other Chrome call.')
process.exit(0)
