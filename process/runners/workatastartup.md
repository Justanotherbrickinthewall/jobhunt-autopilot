# Runner: Work at a Startup

<!-- Runner file for source `waas` and channel `waas_message`. Read by the /hunt steps and their agents. Not a skill. -->

## What it is

`workatastartup.com` is YC's own job board. It has one login and one apply mechanic. Every application is a message to a named founder, so there is no Easy Apply or external split.

The source is dormant: it is not in `search.live_sources`. When it is live, a `sweep-source` agent harvests it in step 2 of `process/instructions.md`. The `matcher` scores its rows, the `resume-tailor` writes the founder message and the `applier` sends it. Every row carries `source=waas` and `channel=waas_message`.

The candidate's site profile is half of every application, because the flow has no resume upload or screening question. Its current state lives in `my-profile/profile.md` under `## Accounts`.

## Access

The site is reached only through the candidate's logged-in Chrome, pinned as `CLAUDE.md` says. There is no public API and no connector. If a login wall appears, stop and report it. Never enter credentials.

| URL | What it is |
|---|---|
| `/companies?...` | The search. Every filter lives in the query string |
| `/jobs/<id>` | The canonical listing. This link goes in the `link` column |
| `/conversations` | The inbox of founder threads, which is the site's own record of applications. It is not `/messages` |
| `/application/<step>` | The seven profile steps |

Confirm the session from the authed nav links (`/conversations`, `/application`) and `props.hnid`. The directory page's props are `profile`, `rawAppliedTo` and `recommendedJobIds`. A probe for the old `props.user` key reports a live session as signed out.

## Harvest

The sweep never messages a founder. It writes one stage JSON per lane batch into the session folder's `.stage/sweep/`.

### Before the first lane

1. Pin Chrome and open your tab as `### Browser rules` in `process/instructions.md` says, and use the `tabId` it gives you.
2. Confirm the session as `## Access` says. Purge every `localStorage` key that starts with `waas`, then namespace your own mirror with the run date, as in `waas<MMDD>_`. Stale keys read back like a clean recovery while serving another day's numbers. Count the keys you purge and put the count in your return. A normal run purges none, because the last run removed its mirror. A non-zero count means the last run did not finish, or something else is writing `waas` keys, so file an `instruction_drift` finding.
3. Read `/conversations`. Run `node process/engine.ts dedupe check` on each founder thread, with the company and role the thread shows and the `/jobs/<id>` link when it has one. List every thread the ledger does not hold in your return, with company, role and job id. Do not record them yourself. The site wins over the ledger, so the parent records each one with `node process/engine.ts dedupe record --source waas --job-id <id> --company "<company>" --role "<role>" --link "<link>" --channel waas_message --notes "found in /conversations"`.

### Lanes

Run one lane per phrase in `search.primary` and `search.rotation` in inputs.toml, with the quotes removed. Always add the bare lanes `AI engineer` and `deployment engineer`. Across the measured sweeps those two found nearly every id that no other lane found. Skip `Member of Technical Staff` on this board. The index matches loose tokens, so the bare word "Staff" floods the lane with clinical listings. It has never returned a real MTS title.

### The Algolia index is the list

Scrolling the list from a background tab under-reports badly and has crashed the renderer. The list is Inertia plus Algolia, index `WaaSPublicCompanyJob_production`, with one record per job. Each hit's `objectID` is the job id.

1. Load one lane at `/companies?query=<keyword>&remote=only&layout=list-compact&sortBy=created_desc`. List each lane's keyword in the `queries` array of the sweep JSON, so a lane can be reproduced.
2. Patch both `XMLHttpRequest.prototype.open`/`send` and `window.fetch` before typing a keyword. The call goes over `XMLHttpRequest`. An empty capture means the wrong transport was patched, not an empty board.
3. Freeze the captured template into a local at once, and restore the original transport before replaying. Otherwise your own replays overwrite the template and every control test confirms itself. The template body is JSON. `requests[0].params` is an `&`-joined string with nine keys: `query, page, filters, attributesToRetrieve, attributesToHighlight, attributesToSnippet, hitsPerPage, clickAnalytics, distinct`.
4. For each lane, substitute `query=` yourself and assert it equals the keyword before sending. Algolia caches client-side, so a per-lane capture silently replays the previous lane.
5. Append, never substitute, these parameters. Algolia honours the last occurrence of a repeated parameter.
   - `&distinct=0`. The template carries the literal `distinct=true`, so a `distinct=\d+` regex misses it and you get one job per company.
   - `&attributesToRetrieve=*`, or an encoded JSON array. The template retrieves only `company_id` and `objectID`, so no title filter is possible without it.
   - `&filters=remote:only` and `&hitsPerPage=1000`, plus `&page=N` if `nbPages` is above 1. The UI's Remote control wedges the main thread when clicked.
6. Send index requests with `XMLHttpRequest`, never `fetch`. Under the extension, `fetch` to `*.algolia.net` hangs forever and looks like a frozen renderer.
7. Mirror each lane's result, and each fetched job record, into `localStorage` as it completes. Remove your own mirror at the end, because it holds the Algolia key.
8. Run one lane per `javascript_tool` call. Calls past about 40 seconds of in-page work hit the 45-second CDP timeout, but the action usually completes. Re-read state before any retry.
9. If the index cannot be captured or replayed after you have patched both transports, stop. Run `node process/engine.ts --session <S> session sweep waas status=failed reason="index unreachable"` and file an `instruction_drift` finding. Never fall back to scrolling the list, because it under-reports badly and has crashed the renderer. `artefact` 2026-09-09. Never bring your tab to the front to make it scroll, because that steals focus from a sibling agent.

The hit carries `id`, `title`, `company_name`, `min_experience`, `job_type`, `locations_for_search`, `skills` and team size. Filter titles off the index and fetch job pages only for the survivors.

### Checks on every harvest

- The canary is a pair. Run one keyword with `distinct=true` and with `distinct=0` on the same template. The second count must be clearly higher, which proves the append works.
- Anti-replay compares sorted `objectID` sets across every lane pair. Equal `nbHits` is not evidence of a replay. Equal id sets are.
- Verify a zero lane by relaxing its filter and reading what it rejected. A whole-board zero is normal here. Report it by name, and never widen a lane to manufacture volume.
- To trim a lane, count the ids that no other lane returned and retire on that count, never on title relevance. A lane with no unique ids is covered, not broken. Keep `forward deployed` for its best rows, and keep `deployment engineer`, which has contributed unique ids on repeated sweeps. `artefact` 2026-09-11

### Title filter

The board searches companies, not jobs, so a lane returns every job at a matched company. Off-title rows are not written at all, not even as drops. Use one global relevance predicate over the union of lanes. Keep each lane's own phrase only as a lane-health metric, because a healthy lane often scores zero on its own phrase.

- Forward-deployed titles come in four shapes. `/forward.?deploy(ed|ment)?|(^|[^a-z])fde([^a-z]|$)/i` covers them all. Also include `machine\s+learning` and bare `implementation`, because narrower forms miss real titles.
- Reject `/nurse|psychiatr|therapist|clinician|physician|counselor|social worker|dentist|veterinar/i`.
- Never reject pre-sales or internship at the title stage. Pre-sales is a scoring penalty and internship is a hard filter read from the job page.
- A forward-deployed prefix does not make a role engineering. Forward-deployed PM, TAM and implementation-ops titles are common here and fail the engineering filter.

### Sweep order

For each title survivor, read the job page as `## JD reading` says, then:

1. Run `node process/engine.ts dedupe check "<company>" "<role>" "<link>" --source waas --job-id <id>`. Exit 2 means the opening is spent through some source. Do not add the row. The check is fuzzy on company and role by design, so it can block a genuinely different role at the same company. Do not override a block that looks wrong. Note it with `node process/engine.ts --session <S> session note Flags "- dedupe block looks wrong: <company>, <role>"` for the candidate to review.
2. Check `props.appliedJobIds` as the second guard.
3. Apply the hard filters in `process/instructions.md` R1, with this board's exceptions in `## Apply`.
4. Collapse within the harvest on normalised company and title. Duplicate postings carry distinct job ids. Keep the twin that carries the band, never the newer id.
5. Write every title-relevant row, drops included with a reason, at `status=new`. `prelim` orders the queue and never drops. Capture `batch`, `salary_band` and `salary_period` into the row while you are there. Write `locationEligible=true` or `locationEligible=false` in `notes`, because the sweep row has no column for it.

## JD reading

Never navigate to each listing. Request `/jobs/<id>` with `XMLHttpRequest` from the logged-in tab, with `Accept: text/html`. Without that header the server answers 406 with an empty body, which looks like zero data. Parse the `[data-page]` attribute:

```js
const doc   = new DOMParser().parseFromString(xhr.responseText, 'text/html');
const props = JSON.parse(doc.querySelector('[data-page]').getAttribute('data-page')).props;
```

Fetch at a concurrency of 8 at most. One request returns the full JD and every card fact.

| Path | Holds |
|---|---|
| `props.job` | `id`, `title`, `salaryRange`, `equityRange`, `location`, `jobType`, `sponsorsVisa`, `minExperience`, `skills`, `descriptionHtml`, `interviewProcessHtml` |
| `props.company` | `name`, `slug`, `batch`, `description`, `teamSize`, `industry`, `founders`, `jobs` |
| `props.locationEligible` | The site's own verdict on the candidate's location against the listing |
| `props.appliedJobIds` | The site's record of applied job ids |
| `props.customQuestions` | Screening questions, if the company set any |

- Read `props.job.location`, never the title. They often contradict each other.
- `props.job.remote` is an empty string. Take the work mode from the location string.
- Branch on `props.appliedJobIds` only. `props.appliedToCompany` changes shape between runs and is falsy when it should not be.
- `salaryRange` is a display string. Parse a period marker such as `/ monthly` when present. With no marker, write `unmarked` in `salary_period`, put `annual by board default` in `notes`, and treat the band as annual. Check the period against the experience tag. A band of 1M to 1.3M rupees with a 1+ years tag reads as 10 to 13 lakh a year, which is coherent. The same band monthly would be a founder package, and the listing would say so.
- Read the currency suffix as well as the symbol, because a `$` band can be CAD. Never screen on a band's bottom alone, because some bottoms are placeholders, as in `$1K - $100K`.
- `Any (new grads ok)` is not the fresher filter. Full-time senior seats carry it too.
- Founders' names are in `props.company.founders`. Every row's link is `https://www.workatastartup.com/jobs/<id>`.

## Apply

The `matcher` applies the decision table in `process/instructions.md` R1. This board supplies its money rule (rows 2 and 5), its send bar (row 6) and one reach exception.

### Reach: `locationEligible` is a penalty, not a drop

A remote role with `locationEligible: false` stays in the queue. Its `reach_20` is capped at `reach.waas_foreign_remote_cap`, and eligible roles get first claim on the apply budget. Write `locationEligible=false` in `notes`. The boolean often contradicts the listing's stated scope, so treat it as a weak signal.

A role that is not remote at all, and sits outside a reachable market, is still a hard drop. Remote scoped elsewhere is still a drop on every other source.

### Money rule

- Compare a USD band through `node process/engine.ts pay below abroad <top>`. Compare an INR band through `node process/engine.ts pay below india <top>`.
- Run `pay below` on the bottom of the band too. `below` on the bottom with `not below` on the top is a straddle.
- A band wholly below the floor, with an explicit period, is row 2: `skipped`, with the reason `HELD: pay band below floor`, naming the band.
- A band that straddles the floor is kept and flagged, and the message negotiates. An India-scoped title with a USD band is ambiguous by construction, so keep and flag it too.
- A band that reads plausibly both ways on period is row 5: `skipped` with `HELD:` and the reading you assumed.
- No band at all is not a drop, so score normally and note it. Contract and hourly rows are a hard drop on this board.

### Send bar and cap

Row 6 holds any role below `scores.waas_send_match_min`. The reason is `HELD: below founder send bar`. A founder reads every message, so the bar sits above LinkedIn's. Card triage overstates `match` on this board, which is why the bar is not higher.

Draft at most `budgets.waas_messages` founder messages in one hunt. The cap applies to the whole hunt and not to the channel. It counts messages drafted, not roles worked. It stops only the founder branch, so founder messages never starve the other channels. `session tick` enforces it, and ingest rejects a `scored` founder row under the send bar. Past the cap, the rows stay `scored` with the board note `founder cap` and lead the next hunt. Only so many messages can be written for their JD in one sitting, and past that they read like a mail merge. `stated`

### The founder message

The message is the whole application. The `resume-tailor` writes it to `my-sessions/ledger/artifacts/<id>-<slug>-message.md` and names it in `resume_file` in its triage JSON. Follow `process/instructions.md` R5 and the founder example in `my-profile/profile.md` under `## A founder message on Work at a Startup`. Keep the direct first-person voice. Where pay comes up, the ask is `pay.waas_ask_usd_year`, which `node process/engine.ts pay ask` prints. It is the one pay figure meant for a founder.

1. Open with `Hi {founder},`. The applier fills in the first name the modal shows.
2. Say who the candidate is, in the JD's own words.
3. Give the closest proof point from `my-profile/work-portfolio.md`, with its number. Never claim work its caveats list.
4. Say why this company, from something specific in the listing.
5. State the location constraint plainly. With `locationEligible=false`, it goes in the first or second line: name the listing's scope, say where the candidate is, and invite a quick no.

### The modal

1. Run `node process/engine.ts dedupe check` again, then check `props.appliedJobIds`. If either says applied, write outcome `already_applied` and record it with `engine.ts dedupe record`. The site wins over the ledger.
2. If the row's `resume_file` is missing or the file is empty, write outcome `failed` with `NO SAVED MESSAGE`. Never send a message that is not saved.
3. Open `/jobs/<id>` and click Apply. The modal reads "Reach out to <first name> at <company>". The heading must name the row's company.
4. Start the `notes` field of your apply JSON with `contact: <first name>`. Ingest keeps notes on the row, and the name appears nowhere else on the site.
5. Replace `{founder}` with that name and change nothing else. Type the message into the one box. The minimum is 50 characters.
6. Add the full text with `node process/engine.ts --session <S> session send add --id <id> --kind application`. If the row is not clean as `process/instructions.md` R6 defines it, click Close and write outcome `held` with every reason.
7. If it is clean, click Send and confirm the thread appears at `/conversations`.
8. After a send, in the same step, run `node process/engine.ts dedupe record --source waas --job-id <id> --company "<company>" --role "<role>" --link "<link>" --channel waas_message --role-file my-sessions/ledger/roles/<id>.md`.

## Known quirks

- A react-select picker that filters to nothing swallows Enter and hits the form's Back button. Type, confirm an option shows, then click it. Match option text exactly, because "React" also matches "React Native".
- Set a react-select by targeting the field's placeholder, never its index. The inputs reorder as the component re-renders.
- On the Share step the native value setter and `execCommand('insertText')` both fail on save. Click into the field, press `cmd+a`, then type. Focus the unscrollable `short_phrase` input with `element.focus()` first.
- The search header counts companies, not jobs, because the UI sends `distinct=1`. The keyword also matches `company_description`.
- `POST /companies/fetch` takes company ids and returns `jobs: []`. With wrong parameters it answers `200 {"companies":[],"recommendedJobIds":[]}`, a successful-looking empty result.
- The Algolia key is scoped to the session and time-limited, so replay the captured request from the page's own session.
- The lanes do not enumerate the whole board. A live job can be missing from every lane.
- A renderer crash destroys the whole MCP tab group, including sibling agents' tabs. Open a new tab as `### Browser rules` in `process/instructions.md` says, read your dated `waas<MMDD>_` keys, and carry on from the lanes they hold. Job page fetches are same-origin, so a fully mirrored run needs no new template. Run any lane that was not mirrored again from scratch, after you repatch `XMLHttpRequest` and capture the template once more. Flag the cross-agent damage for the parent to judge.
- `javascript_tool` truncates returns near 700 characters. It blocks a whole return that looks like query-string data, including any `key=value` shape. Sanitise to `[A-Za-z0-9 &$.,+-]` and use colons in structured hand-offs. An async return that did network I/O comes back as `{}`, so run the work in a fire-and-forget IIFE that writes to `window`, then read it synchronously on the next call. Return the band's currency as a code such as USD, INR or CAD, worked out in the page, because the sanitised string loses the `₹` sign.
- A site profile with `isRestrictedRegion: true` gets `locationEligible: false` on most listings.
- If a person reads the list by scrolling, the nearest company anchor to a job link is the "See all N jobs" link. Take the company name from an anchor whose text does not start with "See all". Wait for `location.search` to contain the new `query=` before reading, or the page returns the previous lane. `artefact` 2026-09-09
- A company can appear under two names on this board. The name differs by source or by posting, and `dedupe check` does not join the two names. When a role's company is either name, run `dedupe check` with each name and treat a hit on either as spent. `artefact` 2026-09-10
- Every lane uses `filters=remote:only`, which is a company-level facet. It leaves out on-site and hybrid roles in India, which `## Reachability` in `profile.md` allows, and a returned job can still be scoped to one country. Do not relax the filter to find more volume. Adding on-site and hybrid India roles from this board needs the candidate's decision and a separate lane. `artefact` 2026-09-09

## Open findings

None yet. A run files a new site fact as an `instruction_drift` finding with `node process/engine.ts --session <S> finding add --json '{"kind":"instruction_drift","stage":"<stage>","id":"-","summary":"...","proposed":{"file":"...","said":"...","found":"...","fix":"..."}}'`, and `/retro` moves it here or into `## Known quirks`.
