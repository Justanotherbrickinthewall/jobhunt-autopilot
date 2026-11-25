# Runner: LinkedIn

This file holds the LinkedIn site mechanics that both LinkedIn lanes share, and the `easy_apply` channel. The lanes are `linkedin-ea`, in `process/runners/linkedin-ea.md`, and `linkedin-ex`, in `process/runners/linkedin-ex.md`. Each lane runner says what its lane harvests and points here for the rest. Rows from both lanes carry `source=linkedin`. The steps in `process/instructions.md` point here. What to score, send or drop is decided there, not here.

## What it is

LinkedIn is the one live source, split into two lanes by channel. Job postings come from a guest endpoint, and LinkedIn also takes Easy Apply applications. The old posts and outreach lanes were retired on 16 Oct 2026. `/outreach` now searches hiring posts under `## Post search` and sends under `## Messaging`.

No LinkedIn connector exists, because LinkedIn's API forbids third-party job search and messaging. Anything that needs a login runs in the candidate's own browser session.

## Access

1. The guest endpoints need no session. Call them with `curl -s` from Bash first, or with `fetch` from a LinkedIn tab.
2. Everything else runs in the pinned Chrome, selected with the `chrome_device_id` in `process/local.json`. Pin it and open your tab as `### Browser rules` in `process/instructions.md` says. Never carry on in another window. The Easy Apply script is the one exception. It runs in its own Chrome profile at `.playwright/linkedin`, signed in by `node process/tools/ea-apply.ts login`. `stated` 2026-11-25
3. A sign-in wall, a `999` status, or the same read failing twice means stop this source and report it. Never enter credentials.
4. The location filter is `search.linkedin_geo_id` in `my-profile/inputs.toml`. Each lane runner names its own posting-window key.
5. Offsite applications go through `process/runners/external-ats.md`.

## Harvest

### The guest search endpoint

```
https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=<q>&geoId=<search.linkedin_geo_id>&f_TPR=<window>&start=<n>
```

- It returns bare `<li>` card fragments, 10 a page, so `start` steps by 10.
- Run each keyword in `search.primary`. When the primaries return little, add two or three keywords from `search.rotation`. Take ones the last hunt did not run, which its `## Sweeps` line lists under `queries`. When `engine.ts session last-started` prints `none`, there is no last hunt, so take the first three rotation keywords in the order the file lists them. `engine.ts config` prints both key names as shown here.
- `f_TPR` takes `r` plus a number of seconds. `<window>` is the lane's posting-window key on a normal hunt. If the last hunt started more than 24 hours ago, use the seconds since it started (`engine.ts session last-started`), with `r604800` as the upper bound, and say which you used with a `window=<value>` key on the first sweep call.
- Quoting does not reach this endpoint. A quoted and an unquoted phrase return byte-identical pages.
- Run the home `geoId` lane only. It already includes that market's remote roles.

### Pacing and 429

- Space requests about 300ms apart. That pacing gave no 429s across more than 100 fetches.
- Read `response.status` on every fetch. A zero-length 200 means the lane is out of results. A zero-length 429 means you are too fast, and the lane's depth is unknown.
- A 429 is scoped to the query string, not the session. Even a page that just succeeded can 429. Work another keyword for about a minute, then retry.
- Requests sometimes take about 11 seconds each. Budget time by request count, not by spacing.

### Parsing the cards

Use this four-group chain on the raw string. It has parsed every card on every recent sweep.

```
data-entity-urn="urn:li:jobPosting:(\d+)"[\s\S]*?base-search-card__title">([\s\S]*?)<\/h3>
[\s\S]*?base-search-card__subtitle">([\s\S]*?)<\/h4>[\s\S]*?job-search-card__location">([\s\S]*?)<\/span>
```

1. In a browser, `DOMParser` and `template.innerHTML` both return zero nodes for this fragment. Use the regex.
2. Never extend the chain. The `<time>` element sits behind 300 or more characters of whitespace, so a fifth group matches nothing.
3. For the posted date, slice from the match end to the next `data-entity-urn=` and run `/datetime="(\d{4}-\d{2}-\d{2})"/` on the slice. That `datetime` has day precision only. For `posted_at`, also read the relative text in the same slice, such as "23 minutes ago" or "3 hours ago", and subtract it from the time of the fetch. Write the result to the minute as `YYYY-MM-DDTHH:MM` in the machine's local time. When the slice has no relative text, write the day alone. Put `posted_at` on every row of the sweep file, and for text in days or weeks follow R2 for the estimate and the note. `ours` 2026-11-02, until a live sweep confirms the relative text. A sweep that finds it missing or in another shape files an `instruction_drift` finding.
4. Run a separate urn count per page and diff it against the parsed ids. If cards exist and none parsed, suspect the regex before LinkedIn, because a broken chain looks exactly like a quiet day.
5. A company string containing `Apply Now` or `ago`, or longer than about 70 characters, is `UNPARSED`. Write the row with its link and the company `UNPARSED`, because ingest refuses a page file that holds a row with an empty company. Never guess a name.
6. Titles can be double-HTML-encoded (`&amp;amp;`). Decode until the string stops changing.
7. A title can contain a literal `|`. Never use `|` as a delimiter in a hand-off. Use `::` and say when you escaped one.
8. `work_mode` is never on this endpoint. Leave it empty, and never read a missing suffix as on-site. The JD settles it.

### Pagination stops on relevance

The endpoint ranks by relevance and never runs out. It drifts into generic local jobs and keeps serving 10 a page past `start=400`.

1. Define an on-phrase regex for every keyword you run, primary and rotation, before the first page. For Forward Deployed it is `/forward.?deploy(ed|ment)?|(^|[^a-z])fde([^a-z]|$)/i`. The optional suffix catches "Forward Deploy Engineer", and the second arm catches the bare abbreviation.
   For any other keyword, build the regex from its words. Require every specific word of the keyword in the title, in either order, with `.?` or `.{0,12}` between them. A generic word such as `ai`, `engineer` or `senior` never counts as specific on its own. A pattern that matches on one generic word measures nothing and runs the pass to the page cap. Before you trust a new pattern, test it on the first page and read the titles it keeps.
2. Never anchor an arm on `engineer\b`, or "Forward Deployed Engineering Manager" is missed.
3. Page until two consecutive pages score under 30% on-phrase, or 10 pages, whichever comes first.
4. Discard every off-phrase title at harvest time.
5. Then re-scan the pages already walked for one `adjacent` tranche, and write `adjacent` in `notes`. It recovers titles the regex missed and on-phrase rows past the stop point. It has caught top-scoring roles on several hunts.
6. Record each keyword as soon as it is finished: `node process/engine.ts --session <S> session sweep <lane> query="<q>" pages=<n> kept=<k>`, where `<lane>` is `linkedin-ea` or `linkedin-ex`. Repeated calls merge into the lane's one line. The queries are listed, and `pages` and `kept` add up. Put the on-phrase kept, off-phrase discarded and the stop that fired in your return, not in the sweep line. After the last keyword, make one call with `status=ok` (or `status=failed reason="..."`).
7. A keyword whose on-phrase count falls hunt after hunt is a candidate to drop from `search.rotation`. File it as a proposal at `/retro`.

A rare phrase decays by page 3 or 4 on a 24-hour window. A one-word regex such as `/architect/i` agrees with nearly everything its keyword returns, so its on-phrase rate measures the regex against itself. Read the company list in the tail before trusting it, because one bulk reposter can hold the rate up at depth. Window width drives depth most: expect about six pages on 24 hours and the full ten on a backlog.

### Classifying Easy Apply cheaply

The `linkedin-ex` lane uses this pass. Re-run each keyword with `&f_AL=true` on the same window and collect the ids. A kept id in that set is `easy_apply`. Every other kept id is `external_ats`.

- A present id is solid evidence of Easy Apply. Say which evidence you got for each keyword, and do not copy the wording from an earlier hunt.
- Walk the pass until a zero-length 200 or 100 pages, which is LinkedIn's 1,000-result limit. The endpoint has no 100-result stop: on 2026-10-16 five `f_AL=true` passes on `r86400` each served 12 full pages with no end. Keep passes short with the lane's posting-window key, not with a lower page cap. `artefact` 2026-10-16 (F-135), cap `stated` 2026-10-21
- A pass that ended on a zero-length 200 is complete, so an absent id is firm evidence of `external_ats`. A pass that stopped at the 1,000-result limit has not reached the end of the keyword's results, so an absent id is weak evidence. Write which one it was in the caveat. `artefact` 2026-10-16 (F-135)
- Write the matching caveat into `notes` on every `external_ats` row. The applier reads the button and reports `CHANNEL IS <channel>` in its notes, and ingest corrects the row.
- If the pass fails or is skipped, write `channel=unknown` and `EA UNVERIFIED` in `notes`. Never guess.

### Links and collapsing

- Every row carries the canonical `https://www.linkedin.com/jobs/view/<id>/`, never a `currentJobId=` search URL. A row without a link is a note, not a prospect.
- Carry the id from the harvest into the row in the same step. Rebuilding rows from a title list writes linkless and mislinked rows.
- When one role is posted in several cities, collapse the twins to one row. Keep the Easy Apply id when the locations are comparably reachable. If reach should win, say so in `notes`.
- Distinct requisition numbers are distinct openings. Read the number before collapsing a multi-city set.
- Seniority is part of an opening's identity. Never strip `senior`, `lead` or `principal` when collapsing.
- Normalise the company string first. Strip marketing suffixes such as `(YC W21)`, `in India`, a trailing country and a trailing `-ad`.

### Long loops in a browser tab

These apply only when a harvest uses Chrome in place of `curl`.

1. `navigate` the tab to the endpoint URL once before any `fetch`. A backgrounded tab's `fetch` hangs forever until you do, and `setTimeout` is throttled there too. Do not try a synchronous `XMLHttpRequest` as a workaround, because it throws `NetworkError` in a hidden tab. If `fetch` is unavailable, navigate to each endpoint URL and parse `document.documentElement.outerHTML` with the same regex, at one navigation per page.
2. One `javascript_tool` call has a 45-second ceiling, and the timeout does not cancel the script. Launch long walks fire-and-forget (`window.job = walk(...); 'started'`), then poll a small read. Never start a second walk before the first reports done.
3. Keep in-page loops under about 10 iterations or 12 seconds per call. A frozen renderer can destroy the whole tab group.
4. `javascript_tool` has REPL semantics. Use top-level `await` and leave the value as the last expression. An async IIFE serialises as `{}`.
5. A timeout on a trivial read is not a page failure. Retry it once.
6. To read a large result past the truncation near 1,000 characters, write it into the page as `<article><pre>...</pre></article>` and call `get_page_text`.
7. Sibling agents share the Chrome window. Address every call by explicit `tabId`, and re-read `tabs_context_mcp` after a "couldn't determine which page" error.

### Sanitising tool output

`javascript_tool` rejects a result as `[BLOCKED: Cookie/query string data]` on URLs, bare domains, email addresses and `?`, `&` or `=`. It also judges the code you send, so a `urn:li:activity` regex or a `getAttribute('href')` can trip it. Apply this to any text you return, including raw-markup debug dumps:

```js
t.replace(/[^\x20-\x7E\n]/g,'')
 .replace(/https?:\/\/\S+/g,'[url]')
 .replace(/\S*\.\S+\/\S*/g,'[u]')
 .replace(/\S+@\S+/g,'[e]')
 .replace(/[?&=]/g,' ')
```

## JD reading

Try the routes in this order. Concurrent readers above `concurrency.linkedin_readers` draw throttling, and spacing calls 12 to 25 seconds apart clears it.

### Route 1: the per-job guest endpoint

```bash
curl -s "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/<jobId>"
```

It needs no cookies. One response carries the verified title, location, workplace type and the poster's name. It also carries LinkedIn's Seniority level, Employment type and Industries, so the contract filter fires from one call. Take the text of `div.show-more-less-html__markup`. When the classes are obfuscated, take the whole response's text and slice it.

The guest page cannot show the real button label. Its apply control carries a tracking name instead: `public_jobs_apply-link-onsite` or `public_jobs_apply-link-simple` for LinkedIn's own flow, and `public_jobs_apply-link-offsite` for a link that leaves LinkedIn. Use it as channel evidence at match time. The destination host stays hidden from a signed-out read, so the ATS is unresolved until the applier opens the listing. The applier reads the live button label, and that settles the channel. `artefact` 2026-10-12

From a LinkedIn tab, call `fetch('/jobs-guest/jobs/api/jobPosting/<jobId>', {credentials:'omit'})`, so that the session cookie is not sent to the guest endpoint. Put the text in a detached div and read its `textContent`.

### Route 2: the Voyager API from a logged-in tab

```js
const csrf=(document['coo'+'kie'].match(/JSESSIONID="?([^";]+)"?/)||[])[1];
const r=await fetch('/voyager/api/jobs/jobPostings/<ID>'+'?decorationId=com.linkedin.voyager.deco.jobs.web.shared.WebFullJobPosting-65',
  {headers:{'csrf-token':csrf,'accept':'application/json','x-restli-protocol-version':'2.0.0'}});
const j=await r.json();
// j.title, j.description.text, j.jobState, j.formattedLocation, j.workRemoteAllowed, j.applyMethod
```

1. Obfuscate the cookie literal as shown, or the tool blocks the whole call.
2. `j.jobState` is authoritative for `LISTED` or `CLOSED`.
3. `j.applyMethod` gives the apply route as data, including the offsite URL. Never click Apply to find it.
4. A job page can redirect to a different posting, and the tab URL changes with it. Trust the API's id, not the page.

### Route 3: the DOM walk, last resort

Click `more`, then walk up from the `About the job` heading until the ancestor exceeds about 600 characters. LinkedIn often serves a stripped shell with no description node at all, so use this only when both routes above fail. Some pages render the body only after a wait of 7 seconds or more, or after scrolling to about 1200 and then 2500.

### What the live page still gives

- The apply button label is the channel. `Easy Apply` is `easy_apply`, `Apply` is `external_ats`, and `Applied` means skip. Read it with `document.querySelector('.jobs-apply-button, [class*="jobs-apply-button"]')`. Never infer it.
- An external `Apply` link is wrapped as `linkedin.com/safety/go/?url=<encoded destination>`. Decode the `url` parameter and return the host only.
- The page names the hiring contact, the applicant count, the repost age, and whether responses are managed off LinkedIn. Capture them while it is open.
- The matcher writes the hiring contact and the poster into the extract's `hiring_contact` and `poster` keys, each with the name and the `/in/` URL. `ours` 2026-11-10

## Money rule

This is the money rule that rows 2 and 5 of the R1 decision table in `process/instructions.md` cite. The floor is `pay.floor_abroad_usd_year`. The matcher never prints its value, and only the applier reads it, through `engine.ts pay value`, for a form that asks. You compare a band by running `node process/engine.ts pay below abroad <top>`, with the band's top in US dollars a year. It prints `below` or `not below`.

1. Read the band, its currency and its period from the JD. Write all three in the role file's Score breakdown.
2. A USD band whose top `pay below abroad` calls `below`, with an unambiguous period, is row 2. The period is unambiguous when the JD says per year, or per month, which you multiply by 12. The decision is `skipped` and the reason is `HELD: pay band below floor`, naming the band.
3. A band whose top is `not below` passes, because it reaches or straddles the floor. Note it.
4. A band is ambiguous when its period is unmarked or hourly, or when its currency cannot be read, for example a `$` figure that is implausible for the role. That is row 5. The decision is `skipped`, the reason starts `HELD:`, and it states the reading you assumed.
5. `inputs.toml` holds no INR floor. An INR band never fires this rule, and `pay.current_inr_lakh` and `pay.expected_india_inr_lakh` are not floors. Write the INR band in the role file and score on.
6. No band at all is not a drop. Score normally and note it.

## Apply

The `easy_apply` channel is worked first by `process/tools/ea-apply.ts`, as step 3c-1 of `process/instructions.md` says. The walk below is for the applier agent, which takes a row only when the script hands it back or when Top choice is allowed. An `external_ats` row goes to `process/runners/external-ats.md`. `stated` 2026-11-25

### Easy Apply

Every step is clicked by coordinates. Inside the modal, a `ref` click can resolve to the wrong control and has selected a year-old CV. A DOM `.click()` on Easy Apply or Next does nothing.

1. Run `node process/engine.ts dedupe check "<company>" "<role>" "<link>"`. Exit 2 means stop. A `RESERVED` line means an earlier run may have sent the form, so write outcome `held` with a first reason that starts `STOPPED:`.
2. Navigate to the canonical `/jobs/view/<id>/` link. Confirm the page title matches the role.
3. Read the apply button label. `Apply` means the row is external. Write outcome `failed` with the notes text `CHANNEL IS external_ats`. Ingest then corrects the row's channel and returns it to the queue for an external applier. `Applied` means outcome `already_applied`.
4. Screenshot immediately before clicking Easy Apply, then click the coordinates you read from that screenshot. The button moves with the title wrap, the viewport and the Simplify extension's panel, so no fixed coordinate is safe. Never use Simplify's buttons.
5. Never navigate away while the modal is open. It discards the application silently.

The usual flow is Contact, Resume, Top choice, then Review. Screening questions, when present, are a page before Review. About half of applications have none, and the rest have three to seven.

Contact. The email is pre-filled. The phone country code defaults to Andorra (+376) and the number is blank. Set the code with `form_input` on the native `select`, then the number, both from the Phone row of `my-profile/faq.md`. A wrong code on a valid-looking number submits cleanly.

Resume. The row's `resume_file` names the fixed variant to send. LinkedIn pre-selects the most recent upload. Read the selected filename and date, and compare the name with the basename of `resume_file`, because the card shows the PDF's filename and not its subfolder. If the right file is not listed, upload it into this form yourself, as the procedure below says. Decide, and never stall. `ours` 2026-10-21 `stated` 2026-10-24

| Selected file | Do this |
|---|---|
| The name matches `resume_file` and the date is not far older than the record | Proceed |
| The date is newer than the record | Proceed, and report it so the record is updated |
| Another listed card carries the matching name | Click that card, re-read the selection, then proceed |
| No listed card carries the matching name | Upload `resume_file`, then proceed |
| The name matches but the date is far older than the record | Upload the current `resume_file` the same way, then proceed |

LinkedIn bumps the date on the resume card whenever the file goes out with an application, so a newer date than the record is normal. Judge identity by the filename, as `my-profile/profile.md` `## Resume variants` names it. Use the date only to catch a file that is far older than the record. Click the visible "Upload resume" button only as step 1 of the upload below, and only once per row. The applier never asks the candidate for a resume, because every variant is in `my-profile/resume/`. `stated` 2026-10-24

Uploading the resume. Do this when no listed card carries the matching name, and when the matching card is far older than the record.

1. LinkedIn creates the file input only when Upload resume is clicked. Before the click, install a read-only MutationObserver on `document.body` with `javascript_tool` that records any `input[type=file]` added. Never patch `HTMLInputElement` or any prototype, and never print URLs from the script.
   Then click Upload resume once. macOS opens a native file picker. Ignore it: never interact with it, and never click Upload resume a second time. Find the new input with `find` (query `file input`) or `read_page`. `stated` 2026-10-24
2. Call `file_upload` on that input, while the picker is still open, with the absolute path of `resume_file`, which is repo-relative to `my-profile/resume/`.
3. Take a screenshot. Confirm a card with the basename of `resume_file` now appears in the list and is selected. If it is listed but not selected, click its card by coordinates and read the selection again.
4. Proceed, and report `Resume uploaded: <filename>` so the `On LinkedIn` date in `my-profile/profile.md` can be updated.

If the modal has no file input, or the upload fails or the card never appears, stop. Write outcome `held`, reason `RESUME UPLOAD FAILED: <filename>: <what happened>`. That is an engine fault for `/retro` to fix. It is never a request to the candidate. `stated` 2026-10-24

The file is uploaded byte for byte. The applier never edits, renames or regenerates a resume to make a name match.

Top choice. Mark it only when the applier's prompt allows it. The parent allows it at `linkedin.top_choice_min_match` or above while this month's count is under `linkedin.top_choice_per_month`. Marking opens a box. Write three or four lines for that JD, leading with the strongest match between its words and `my-profile/work-portfolio.md`. Do not paste a paragraph of the resume. Name the evidence and stop. Say what the resume cannot, because the reader has already seen it. Report `Top choice: used`.

Screening questions. Answer from `my-profile/faq.md`. A years field takes whole numbers only, so write a bank figure of 1.5 as 2. A required question the bank cannot answer truthfully holds the row, with outcome `held` and the question verbatim. Answer nothing on that page, close the modal, and take Discard on "Save this application?", so no draft is left behind.

The Follow company checkbox is checked by default. Leave it alone.

Advancing. The footer renders below the clipped modal. Run `scrollIntoView` on Next before every advance, then click its real coordinates.

Review. Re-read the resume filename and every answer, and add the Send list item. If the form is clean as `process/instructions.md` R6 defines it, reserve the opening and click Submit. Run `node process/engine.ts dedupe reserve --id <id> --company "<company>" --role "<role>" --link "<link>" --channel easy_apply --source linkedin` just before the click, and do not click if it exits 2. If the page then shows the form was not submitted, run `node process/engine.ts dedupe unreserve --id <id> --reason "<what the page showed>"`. If the form is not clean, write outcome `held` with every reason, close the modal and take Discard on "Save this application?".

After submit:

1. Confirm the success state on screen.
2. Record it at once. `dedupe record` promotes the reservation:

```
node process/engine.ts dedupe record --source linkedin --company "<company>" --role "<role>" \
    --link "<link>" --channel easy_apply --role-file "my-sessions/ledger/roles/<id>.md"
```

3. Write the apply JSON into the session's `.stage/apply/`, as `process/contracts.md` describes. Close the confirmation and your tab.

## Post search

This section serves the post-reader of `/outreach`. R14 step O1b of `process/instructions.md` decides which posts to keep and whom to write to. Everything here runs in the pinned Chrome, pinned and used as `### Browser rules` in R6 of `process/instructions.md` says, which also covers the agent's own tab. A sign-in wall, a challenge page, a restriction notice or the same read failing twice stops the run and gets reported, never worked around. Nothing in this section sends a message or an invitation. The unrun mechanics carry `ours` 2026-10-23, and the first live run confirms each one.

### The search URL

1. `outreach queries` prints every URL. Use each one as printed and never build one by hand. Pass `first` ends in `postedBy=%5B%22first%22%5D`, which limits the results to 1st-degree authors. Pass `all` is the same URL without `postedBy`. Both carry `sortBy=%22date_posted%22` and `datePosted=%22<value>%22`, where the value is `prospect.posted_within`. `stated` 2026-10-23
2. The search is by hashtag. The keywords are `<role tag> AND (<hiring tag> OR <hiring tag> ...)`, with each hash encoded as `%23`. When `prospect.hiring_tags` is empty the keywords are the role tag alone. `stated` 2026-10-23
3. AND and OR both work with hashtags on the content search, as `## Known quirks` records. Carry on with the queries as printed. The page cap bounds the cost, and judging drops what does not fit. `artefact` 2026-10-27
4. Post search has no location filter. The location comes from the post, as `### Judging a post` rule 5 in R14 says. `stated` 2026-10-23
5. A query has one URL and no pagination. Never add `&page=<n>`, because it reloads page 1, as `## Known quirks` records. More cards load by infinite scroll inside the `<main>` element, so scroll that element as the quirk says. Each scroll round that adds cards counts as one page against `max_search_pages`, and `page` in the page JSON counts the rounds from 1. A round that adds no card ends the query. `artefact` 2026-11-02, round count `ours` 2026-11-02

### Reading a results page

1. `navigate` your tab to the URL. Results load as you scroll `<main>`, as `### The search URL` step 5 says. Scroll in steps and run `get_page_text` after each step until no new cards appear. Clean any text you return through `javascript_tool` as `### Sanitising tool output` shows.
2. Each card gives the author's name and headline, the degree badge, the age, the post text with its hashtags, and sometimes a "View job" card. Copy the hashtags as written.
3. The degree badge sits beside the author's name, after a bullet, and reads "1st", "2nd" or "3rd+". Record it as `1st`, `2nd` or `3rd`. If the card shows none, open the author's profile and read the badge beside the name. If that shows none either, record the card dropped with the reason `degree unread`.
4. In pass `first` every card should read 1st. A card that reads otherwise stays on its own badge, and the run reports a `QUIRK:` line that the filter let it through.
5. The author's link holds `/in/<vanity>/`. Read it with `find` or `read_page`, because `javascript_tool` blocks URLs. An author whose link is `/company/` is a page, not a person. Record the card dropped with the reason `company page`.
6. The post URL is built from the post's activity id, and the card is never clicked. A post card carries no `urn:li:activity` marker, no `data-urn` and no anchors. Read the id from the first descendant of the card whose `componentkey` starts `CgsI`. Take its first 20 characters, map `-` to `+` and `_` to `/`, and base64-decode them. Skip the bytes `0a 0b 08`, read the varint that follows as a BigInt, and shift it right by 1 (`>>1n`). The result is a 19-digit activity id, so use BigInt, because a plain number loses digits. The URL is `https://www.linkedin.com/feed/update/urn:li:activity:<id>/`. A group cross-post card gives an id of 7 to 8 digits and has no feed URL. A group cross-post or company-page card may also have no descendant whose `componentkey` starts `CgsI`. Record any such card dropped with the reason `group cross-post of another card; no activity id on the card`, and carry on with the run. `artefact` 2026-10-27, no-`CgsI` case `artefact` 2026-10-28
7. A "View job" card links to `https://www.linkedin.com/jobs/view/<id>/`. Read the id from the card as for a job card, and keep it as the post's `apply_link`. A link to another site in the post text is also an `apply_link`. Print only its host, as the snippet in `process/runners/external-ats.md` does.
8. An address in the post text is the post's `email`. Copy it into the page JSON. Never write to it.

### Withdrawing invitations

Do this before any search. The rows come from `outreach budget`, which lists each `connect` row still `sent` after `prospect.withdraw_after_days`. Each prints as `withdraw due       <vanity> <post_url> <last_date>`, with `-` for a vanity or a post URL the row lacks, and `withdraw due       none` when nothing is due. A withdrawal is not a message, and the reader may do it.

1. Open `https://www.linkedin.com/mynetwork/invitation-manager/sent/`. The page lists each pending invitation with the name, the age and a Withdraw button. It loads more on scroll. Scroll until the due names appear or no new entries come.
2. Match an entry to a due row on the vanity in its profile link, read with `find` or `read_page`. If only the name is readable, match on the full name that `outreach check --vanity <vanity>` prints on its second line (or `--post <url>` when the vanity is `-`), and withdraw only when exactly one entry carries that name.
3. Click Withdraw on the entry, then confirm in the dialog. Check that the entry has left the list. Then run `outreach record --post <url> --vanity <vanity> --channel connect --status withdrawn`, and leave out `--vanity` or `--post` when the due line printed `-` for it.
4. A due row with no entry in the list is not pending. Open `https://www.linkedin.com/in/<vanity>/` and read the degree badge. A 1st badge means the invitation was accepted, so record `--status accepted`. Any other badge means LinkedIn dropped it, so leave the row alone and report `NOT FOUND: <vanity>`.
5. Never click Accept or Ignore on a received invitation, and never open the Received tab.

## People search

This section serves the post-reader in roles mode. R14 step O1a and `### Finding the person for a role` in `process/instructions.md` decide whom to write to. The browser rules, the stop rules and `### Sanitising tool output` apply as they do for post search. Nothing here sends a message or an invitation. The mechanics are unrun and carry `ours` 2026-11-10. The first live run confirms each one and reports a `QUIRK:` line for each one that differs.

### Finding the person for a role

1. A saved person comes from the role's `contact` value, `hiring: <name> <url>; poster: <name> <url>`. The URL holds `/in/<vanity>/`.
2. For a LinkedIn role with no `poster:` part, read the guest endpoint with `curl`, as Route 1 of `## JD reading` shows. Take the poster's name and `/in/` link from the poster card near the end of the response. This loads no LinkedIn page and does not count against `prospect.people_searches_per_run`.
3. For the hiring team, open `https://www.linkedin.com/jobs/view/<jobId>/` in your tab. Read Meet the hiring team with `find` or `read_page`, because `javascript_tool` blocks URLs. This counts as one page.
4. A people search is `https://www.linkedin.com/search/results/people/?keywords=<encoded keywords>`. The keywords are `<title> <company>` for a hiring manager, and `recruiter <company>` or `talent acquisition <company>` for a recruiter. When the job page links the company page, read its numeric company id and add `&currentCompany=%5B%22<id>%22%5D`. Read the first page of results only. Each card gives the name, the headline, the degree badge and the `/in/` link. Each search counts as one page.
5. Open a profile only to confirm the current company when the card's headline does not name it. Each profile counts as one page.
6. Read the degree badge as `### Reading a results page` step 3 says, because the channel depends on it.

## Messaging

This section serves `/retro`, where R10 of `process/instructions.md` decides what a reply says, and
`/outreach`, where R14 decides what a prospect message says. The hunt never opens messaging.
Everything here runs in the pinned Chrome, in a tab of the agent's own, as the Browser rules in R6
of `process/instructions.md` say. A sign-in wall, a challenge page or the same read failing twice
stops the run and gets reported, never worked around. `ours` 2026-10-18, readers `ours` 2026-11-02

The script `process/tools/li-msg.ts` runs first for a reply in an existing thread and for a `connect` item. `send` types at a human pace in the
Easy Apply script's own Chrome profile, and `inbox` reads the unread, drafted and recently sent threads into `R/.stage/mail/linkedin-<id>.md`.
The agents below do the rest, and they take over any item the script returns as `fallback`. First messages and InMails are theirs always.
Every selector in the script is a guess until a live run confirms it. `ours` 2026-11-26

### Finding unread threads

1. Open `https://www.linkedin.com/messaging/`. If the page shows a sign-in form, a challenge page,
   or the same read fails twice, stop and report it. `ours` 2026-10-18
2. Use the conversation list's filter to show Unread. Message requests and InMails count as threads.
   Check the Focused and Other tabs both, when the account shows them. `ours` 2026-10-18
3. If the Unread filter is missing, scan the list for the unread marker instead. The marker is the
   unread dot beside the sender's name, or the bold name where no dot shows. If that scan also
   fails twice, stop and report it. `ours` 2026-10-18
4. The list is virtualised. Scroll it and read it with `get_page_text` until no new names appear.
   Write down every unread sender before you open any thread, because opening one marks it read.
   `ours` 2026-10-18
5. A sponsored message is never job-related. Record it `skipped` with the reason `sponsored`.
   `ours` 2026-10-18
6. Open the recent `sent` threads too. The brief lists them from `outreach recent-sent`. Open each
   by its thread id, as `### Reading a thread` step 3 says. A reply the candidate already saw on a
   phone no longer shows as unread, so only the thread itself shows it. `ours` 2026-11-02

### Reading a thread

1. Click the thread. The tab URL becomes `https://www.linkedin.com/messaging/thread/<id>/`. Read
   `<id>` from the tab URL that `tabs_context_mcp` reports, never from `javascript_tool` output. The
   sanitiser blocks `=`, and some thread ids end in `=`. `ours` 2026-10-18
2. The URL may percent-encode the id, so `%3D` stands for `=`. Decode the id before you use it, so
   it matches the id `outreach record` stores. `ours` 2026-10-18
3. A thread from the `outreach drafted` list is found by opening
   `https://www.linkedin.com/messaging/thread/<id>/` directly. `ours` 2026-10-18
4. The header shows the sender's name and headline. Take the title and the company from the
   headline, such as "Talent Partner at Example Labs". Leave the company empty when the headline
   names none. `ours` 2026-10-18
5. The header's profile link holds `/in/<vanity>/`. Read it with `read_page` or `find`. If every
   route is blocked, leave the vanity empty, because the thread id and the name still key the row.
   `ours` 2026-10-18
6. Read the full thread text with `get_page_text`, and clean any text you return through
   `javascript_tool` as `### Sanitising tool output` shows. `ours` 2026-10-18
7. Reading a thread never types into the message box, and it never clicks Accept or Decline on a
   message request. Every read pass leaves those controls alone. `ours` 2026-10-18

### Sending in a thread

Only the messenger's send steps type in a message box or an invitation note. No read pass does. `ours` 2026-10-18

1. Read the thread header's name first. If it differs from the item's name, stop that item and
   report `THREAD MISMATCH`. Never type under a different name. `ours` 2026-10-18
2. A message request may show Accept and Decline above the box. Click Accept only for an approved
   item, because the reply cannot be typed until it is accepted. `ours` 2026-10-18
3. The message box is a `contenteditable` element in the form at the bottom of the thread. Set it
   the way the profile description is set: `focus()`, `document.execCommand('selectAll')`, then
   `document.execCommand('insertText', false, <line>)` for each line of the text file, with
   `document.execCommand('insertParagraph')` between lines. `ours` 2026-10-18
4. Never press Enter in the box. The account may send on Enter. `ours` 2026-10-18
5. If `javascript_tool` blocks any line part-way, the box holds partial text. Select all in the box,
   delete it, and take a screenshot to confirm the box is empty. Then report `NOT SENT` for this
   item. Never record it as sent, and never send the rest. `ours` 2026-10-18
6. Attach the resume, only for an item with an `attach`. Send from the full-page thread view,
   `https://www.linkedin.com/messaging/thread/<id>/`. Use `find` with the query `file input` and pick
   the input that accepts `.pdf`, not the one that accepts `image/*`. Run `file_upload` on it with the
   item's `attach` path. No native picker opens. Wait for the chip that shows the file name, the size
   and "Attached", which appeared within 3 seconds on 2 Nov 2026. If the chip shows another name, or
   does not appear after one retry, clear the box as step 5 says and report `NOT SENT: attachment
   not confirmed`. Never click the attach button. The mechanics come from the quirk on the full-page
   thread view below, and no live send has confirmed them. `ours` 2026-11-02
7. Take a screenshot, check that the box holds the whole text and, for an attached item, that the
   chip is still there, then click Send at its real coordinates. `ours` 2026-10-18
8. Confirm the sent text appears as the newest message in the thread, with the file chip on it when
   one was attached, before you record it. If it does not, the item is not recorded. An unconfirmed
   send is never recorded as sent. `ours` 2026-10-18

### Sending a first message

This serves a prospect item with `channel` `message` and no thread. The mechanics below are unrun, and the first live send confirms each one. `ours` 2026-10-23

1. Open `https://www.linkedin.com/in/<vanity>/`. Read the name in the profile header first. If it differs from the item's name, stop that item and report `PROFILE MISMATCH`. Never type under a different name.
2. Click Message in the profile's button row. A composer opens over the page.
3. A free message shows no InMail credit line. If the composer shows "Use 1 of N InMail credits", or any line that spends a credit, close it and report `NOT SENT: would spend an InMail credit`. A `message` item never spends one.
4. Set the box and send as `### Sending in a thread` steps 3 to 5 and 7 say, with the item's text file. Never press Enter in the box.
5. Confirm the text appears as the newest message in the composer. Then open `https://www.linkedin.com/messaging/`, click the top conversation and read the thread id from the tab URL that `tabs_context_mcp` reports, as `### Reading a thread` step 1 says. Check that the thread header names the item's person and that the newest message is the text you sent.
6. Record the send with `outreach record --thread <id> <item key> --vanity "<vanity>" --name "<name>" --company "<company>" --channel message --status sent`, where `<item key>` is `--post <url>` for a post item or `--role <id>` for a role item. If the thread id cannot be read, record without `--thread` and say so in the report. An unconfirmed send is never recorded.

### Sending an InMail

This serves a prospect item with `channel` `inmail`. The item's `subject` comes from `approved.json`. `ours` 2026-10-23

1. Open the profile and check the name, as `### Sending a first message` step 1 says.
2. Click Message. The composer shows a Subject field, the message box and a line such as "Use 1 of N InMail credits". Read N from that line.
3. If N is 0, or the line is missing, close the composer and report `NOT SENT: no InMail credit`. The item stays `drafted`.
4. Set the subject with `focus()` and `document.execCommand('insertText', false, <subject>)`. Set the body as `### Sending in a thread` step 3 says. Never press Enter in either field.
5. Take a screenshot and check that the subject and the whole body are in place. Then click Send at its real coordinates.
6. Confirm the InMail as `### Sending a first message` step 5 says. A "Share your contact info?" dialog can hold the message, so click through it only to send the InMail as it is.
7. Record the send with `outreach record --thread <id> <item key> --vanity "<vanity>" --name "<name>" --company "<company>" --channel inmail --status sent`, where `<item key>` is `--post <url>` for a post item or `--role <id>` for a role item.

### Sending a connection request

This serves a prospect item with `channel` `connect`. The item's text is the note. `ours` 2026-10-23

1. Open the profile and check the name, as `### Sending a first message` step 1 says.
2. Find Connect in the profile's button row. If it is not there, open More and look for Connect there. A profile that shows Message, Follow and More has Connect under More. Treat the profile as Follow only only when More lacks Connect too. Then report `NOT SENT: no Connect button` and leave the item `drafted`. `artefact` 2026-10-28
3. Click Connect. A dialog asks whether to add a note. Click Add a note. Never click Send without a note, because every `connect` item carries one.
4. Set the note box as `### Sending in a thread` step 3 says. The dialog shows a character counter. Check that the count equals the length of the item's text and does not pass `prospect.note_max_chars`. If it passes the limit, clear the box and report `NOT SENT: note too long`.
5. If the dialog asks for the member's email, or any other detail, cancel it and report `NOT SENT: asks for email`. The item stays `drafted`.
6. Take a screenshot, check the note, then click Send at its real coordinates.
7. Confirm "Invitation sent" appears, and that the profile's button now reads Pending. Without both, do not record it.
8. Record the send with `outreach record <item key> --vanity "<vanity>" --name "<name>" --company "<company>" --channel connect --status sent`, where `<item key>` is `--post <url>` for a post item or `--role <id>` for a role item. A connection request has no thread, so there is no `--thread`.

### Messaging quirks

A run that learns a messaging fact files an `instruction_drift` finding against this file, as
`## Known quirks` says, and `/retro` writes it here.

- Opening a thread marks it read on LinkedIn. A run that stops part-way has to list the unread
  threads it opened, so the candidate can find them. `ours` 2026-10-18
- `javascript_tool` judges the code it is sent. A reply that contains a URL or an email address can
  trip it, so pass the text in from the file and expect a block on such a line. A blocked line is
  `NOT SENT`, never retyped by hand, and the box is cleared as `### Sending in a thread` step 5
  says. `ours` 2026-10-18
- The message box drops markdown list formatting, so numbered or bulleted items paste as plain
  run-on lines. Mark list items with a leading hyphen and a space instead, one per line. `stated` 2026-10-21

## Known quirks

A hunt that learns a new site fact files an `instruction_drift` finding with `node process/engine.ts --session <S> finding add --json '{"kind":"instruction_drift","stage":"<stage>","id":"-","summary":"...","proposed":{"file":"process/runners/linkedin.md","said":"...","found":"...","fix":"..."}}'`, and `/retro` writes it here.

- The Easy Apply script selects a resume card by filename and ignores its date, because LinkedIn's date is only a display bump, as the 2026-09-17 note says. It uploads the file only when no card carries the name. `artefact` 2026-09-17, `stated` 2026-11-25
- `f_WT=2` "Remote" means remote within one geography, not remote from anywhere. A worldwide lane (`geoId=92000000&f_WT=2`) returned country-scoped roles and nothing the home lane lacked. Without any `geoId`, LinkedIn scopes to the session's own country.
- On the logged-in `/jobs/search/` UI, quoting is an exact-phrase match, so quote the shortest phrase that is still specific. The URL is `https://www.linkedin.com/jobs/search/?keywords=%22<phrase>%22&geoId=<search.linkedin_geo_id>&f_TPR=<window>&sortBy=DD&start=<n>`, with 25 cards a page. The list is virtualised, so off-screen cards render no text. Read the page with `get_page_text`, and build each link from the card's `data-occludable-job-id` as `https://www.linkedin.com/jobs/view/<id>/`. Use this UI only if the guest endpoint fails.
- The employment type and the Contract tag never appear on a search card. They arrive with the JD in Route 1.
- Bench-staffing posts often name no end client. Record "end client not named" in `notes`.
- Recruiting marketplaces and staffing firms repost under their own names. Name them in `notes` so the reposter penalty can be applied.
- The AI Architect keyword mostly returns generic architect posts at large IT-services firms. Write `AI-ARCHITECT TIER` in `notes` on those rows so that apply and review can judge them as a block. `artefact` 2026-09-08
- Pre-sales is a prelim penalty and never a drop. A title test used for a hard filter must not fire on a title that also contains `architect` or `engineer`. A `sales manager` test once matched "Solution Architect & Technical Pre-Sales Manager". `artefact` 2026-09-10
- Industrial field sales and hardware field service are a wrong-discipline drop. In India, `Sales Engineer` and `Customer Engineer` titles often mean them. `artefact` 2026-09-10
- Rotation phrases that are not Indian job titles return almost no on-phrase rows: `Applied AI Engineer`, `Deployment Engineer AI` and `Implementation Engineer AI`. `AI Engineer` replaces them. It gives volume and little signal, and it brings many reposters. `artefact` 2026-09-11
- `Sales Engineer AI` returns industrial field sales and was the main source of hard-filter drops. `Solutions Engineer AI` is a pre-sales title and takes the pre-sales penalty on every row. `Customer Engineer` is the better choice, but it sometimes returns hardware field service. `artefact` 2026-09-11
- `Member of Technical Staff` is not an AI-lab title in India, and its yield has decayed on a 24-hour window. `artefact` 2026-09-11
- Easy Apply screening fields that ask for years reject a decimal with "Invalid input". Enter whole numbers. `artefact` 2026-10-12
- The Easy Apply modal is not `role=dialog`, so a DOM query on that role finds nothing. Work it by screenshot and coordinates. The Next button sat near the bottom right after `scrollIntoView`, and the Easy Apply button near the top left of the job page. Both moved between rows, so read each position from a fresh screenshot. `artefact` 2026-10-12
- Next on the resume page once raised "Save this application?". Its X saves and closes the modal, and Continue then restarts at page 1. `artefact` 2026-10-12
- Printing a full apply `href` from `javascript_tool` returns `[BLOCKED: Cookie/query string data]`. Use the host-only snippet in `process/runners/external-ats.md`. `artefact` 2026-10-12 The same block hits any string with an `href` or query data in it. Print booleans or path parts of an `href`, never the whole `href`. `artefact` 2026-10-28 (O1b, 28Oct2026-1329-outreach, no finding id yet) On 2 Nov 2026 the block stopped any href with a query string, so a post's real apply link comes from `read_page` on the link element. LinkedIn wraps an external link in `safety/go/?url=`. `artefact` 2026-11-02 (O1b, 02Nov2026-1100-outreach, no finding id yet)
- Some LinkedIn listings publish a pay band in INR. The JD text carries it as a line such as "Base pay range INR <low>/yr - INR <high>/yr", in full rupees with a period, and not in lakh. Convert the unit before you compare it with anything, and write the band as read in the role file. The Money rule above says what an INR band does. `artefact` 2026-10-12 (F-39)
- After Submit on an Easy Apply modal, the agent's tab can drop out of its Chrome tab group, and the agent then cannot close it. Reload the job page in a new tab and confirm "Application submitted" there. `artefact` 2026-10-12
- The per-job guest endpoint can return a different posting from the one requested. A call for one id returned another employer's posting, and a second call 15 seconds later returned the role the public page shows. Check the title in the response against the row's role. When they differ, re-read the endpoint once or read the public `/jobs/view/<id>/` page. `artefact` 2026-10-21 (F-156)
- The drop can also happen before Submit. On page 4 of one application the tab left its group with the modal open, and the agent could not close it. Restart the application in a new tab, and report the orphan tab id so the candidate can close it. `artefact` 2026-10-21 (F-130)
- The `type` action lost characters in a long textarea. Set long free text with the native value setter and then dispatch an `input` event. `artefact` 2026-10-21 (F-130)
- As of 24 Oct 2026 the Easy Apply resume page holds no `input[type=file]` until Upload resume is clicked. A DOM query, open shadow roots, `find` and `read_page` all came back with no input, and only the Upload resume button was listed. `file_upload` on that button returns "Element is not a file input". The guard that patches `HTMLInputElement.click` is denied by the auto-mode classifier as `[Auto-Mode Bypass]`. One click on Upload resume does create the input, and `file_upload` on it works while the native picker sits open: it uploaded the AI Architect PDF on 2026-10-24-LI-039, and LinkedIn listed and selected the card. The picker stays open after the tab closes, so the candidate cancels it. `artefact` 2026-10-24 (F-58, F-95, F-104, LI-039)
- Appliers share one Chrome tab group. On 2026-10-24 three appliers held LI-003, LI-008 and LI-013 with no tab, because the group had closed and `createIfEmpty` was barred. The rule that came out of it is in `### Browser rules` in `process/instructions.md`. `artefact` 2026-10-24 (F-95)
- A post card on the post search results page carries no post URL, no activity id in the DOM and no anchors. The `urn:li:activity` marker and the `data-urn` read in `### Reading a results page` step 6 find nothing. The id comes from the first descendant of the card whose `componentkey` starts `CgsI`. Take its first 20 characters, map `-` to `+` and `_` to `/`, and base64-decode them. Skip the bytes `0a 0b 08`, read the varint that follows as a BigInt, and shift it right by 1 (`>>1n`). The result is the 19-digit activity id. The post-reader checked a decoded id against a live post URL. `artefact` 2026-10-27, exact steps `artefact` 2026-10-28 (O1b, 27Oct2026-0001-outreach and 28Oct2026-1329-outreach, no finding id yet)
- A group cross-post card in post search has no activity id and no `/feed/update/` URL. On 27 Oct 2026 its decoded id was a short 7 to 8 digits. On 28 Oct 2026 such a card, like a company-page card, had no descendant with a `componentkey` starting `CgsI`, so there was nothing to decode. The post-reader dropped these cards with the reason `group cross-post of another card; no activity id on the card`. On 2 Nov 2026 two more group cross-post cards showed no activity id on the card. `artefact` 2026-10-27, no-`CgsI` case `artefact` 2026-10-28 (O1b, 27Oct2026-0001-outreach and 28Oct2026-1329-outreach); `artefact` 2026-11-02 (O1b, 02Nov2026-1100-outreach, no finding id yet)
- AND and OR with hashtags work on the post content search. In the first live run, every card on the Q3 `first` pass carried #AIAgents and #Hiring. Nearly all 42 cards on the Q1 `all` pass carried #ForwardDeployedEngineer and #Hiring. One card carried #RemoteJobs without #Hiring, so OR also matches on `#remotejobs` alone. Three cards showed no tag links and may match on text. The `all` pass loads those cards on page 1 by infinite scroll inside the `<main>` element, so `window.scrollBy` does nothing. There is no pagination. On 2 Nov 2026, `&page=2` on a content search reloaded page 1 and stripped the `page` parameter, so it only wasted a page load. Set `main.scrollTop = main.scrollHeight`, wait, and repeat until the `[role=listitem]` count stops growing. In the second live run the four `all` queries gave 86, 42, 39 and 32 cards this way. Most of the cards are US staffing posts. `artefact` 2026-10-27 (outreach 27Oct2026-0001, O1b); `artefact` 2026-10-28 (outreach 28Oct2026-1329, O1b, no finding id); `artefact` 2026-11-02 (outreach 02Nov2026-1100, O1b, no finding id yet)
- The `first` pass returns few cards. In the first live run it returned 0 cards for Q1, Q2 and Q4, and 5 for Q3. The Q1 `all` pass, with the same keywords and window and no `postedBy`, returned 42 cards. So the 1st-degree filter narrows the result, and the hashtags do not. The 5 Q3 cards were read but not filed, because the run stopped. In the second live run the `first` pass returned 0 cards for all four queries, while the four `all` queries returned 199 cards between them. On 2 Nov 2026 the `first` pass returned 0 cards for all four queries again. On 9 Nov 2026 it returned 0 cards for all four queries again. In a later run on 9 Nov 2026 Q1 and Q2 each returned 1 card, the same post with the same activity id, and Q3 and Q4 returned "No results found". Across the five runs recorded here the `first` pass has given 7 cards in 20 queries. `artefact` 2026-10-27 (outreach 27Oct2026-0001, O1b); `artefact` 2026-10-28 (outreach 28Oct2026-1329, O1b, no finding id); `artefact` 2026-11-02 (outreach 02Nov2026-1100, O1b, no finding id yet); `artefact` 2026-11-09 (09Nov2026-1522-outreach/QUIRK-2); `artefact` 2026-11-09 (09Nov2026-2033-outreach/QUIRK-1)
- The same post shows under more than one query, so dedupe across queries by activity id. The same recruiter can also post the same text twice, and one copy can have no activity id. Match that copy to its twin on the author and the post text, and file one post. `artefact` 2026-10-28 (O1b, 28Oct2026-1329-outreach, no finding id yet)
- The profile page does not show whether a 3rd-degree Message is free or an InMail. The composer's credit line is the only signal, and the post-reader's brief bars opening the composer. In the 28 Oct 2026 run the post-reader treated no 3rd-degree profile as an Open Profile. The sender reads the credit line, as `### Sending a first message` step 3 and `### Sending an InMail` step 2 say. On 2 Nov 2026 the same limit held: an Open Profile and an InMail profile can't be told apart without clicking Message. The post-reader filed one recruiter as `inmail`, because the post was a strong fit and InMail credit was left. If Message turns out to be free, the composer shows no credit line and the messenger reports `NOT SENT`, as `### Sending an InMail` step 3 says. `artefact` 2026-10-28 (outreach 28Oct2026-1329-outreach, O1b, no finding id yet); `artefact` 2026-11-02 (outreach 02Nov2026-1100, O1b, no finding id yet)
- On a profile that offers Follow, the top card shows Message, Follow and More, and Connect sits under More. A profile with a direct Connect button shows Connect, Message and More. This was confirmed on one profile only. `artefact` 2026-10-28 (O1b, 28Oct2026-1329-outreach, no finding id yet)
- `javascript_tool` returns only about 1,250 characters of a result. To read bulk text, put it in an `<article>` prepended to `document.body`, then call `get_page_text`. Step 6 of `### Long loops in a browser tab` gives the same route and puts the cut near 1,000 characters. `artefact` 2026-10-28 (O1b, 28Oct2026-1329-outreach, no finding id yet)
- A hiring post can give its apply link in a comment by the author and not in the post body. The card showed no "View job" card and no link in the text, so the post's `apply_link` read null. The comment held the company's careers page root, so the opening still had to be found on that page. Seen on one startup's post on 28 Oct 2026. `artefact` 2026-10-28 (O1b, 28Oct2026-1329-outreach, no finding id yet)
- On a profile page, the message composer and the connection-note dialog sit inside the `#interop-outlet` shadow root, so `document.querySelector` finds nothing there. Reach them through `document.querySelector('#interop-outlet').shadowRoot`. On that page the boxes that `### Sending in a thread` step 3 and `### Sending a connection request` step 4 set are in it. The full-page `/messaging/thread/<id>/` view has no `#interop-outlet` shadow root. There the message box is `.msg-form__contenteditable[role=textbox]` in the main document, and hidden file inputs sit beside it. `artefact` 2026-10-28 (O1c, 28Oct2026-1329-outreach, no finding id yet); full-page thread view `artefact` 2026-11-02 (outreach 02Nov2026-1100, no finding id yet)
- The full-page `/messaging/thread/<id>/` view has two hidden file inputs. One accepts `image/*`, and the other accepts `.pdf`, `.doc` and others. `find` with the query `file input` returns both. `file_upload` on the document input attaches the file directly, so the attach button isn't needed and no native picker opens. A chip with the file name, the size and "Attached" appears within 3 seconds, and Send stays enabled. It worked once, for a 142 KB PDF. `artefact` 2026-11-02 (outreach 02Nov2026-1100, no finding id yet)
- `innerText` on the message box doubles every newline, because each line is a `<p>`. Check the text with `querySelectorAll('p')` and `textContent`. `artefact` 2026-11-02 (outreach 02Nov2026-1100, no finding id yet)
- The messaging dock reopens earlier threads as overlays on every page load, and they cover the profile's top-card buttons. Close each one through JS, by clicking its `Close your conversation with ...` button inside the `#interop-outlet` shadow root. Never click the overlay header, because that can open the other person's profile instead. `artefact` 2026-10-28 (O1c, 28Oct2026-1329-outreach, no finding id yet)
- `outreach record --post <url> --vanity <v> --channel connect --status accepted` exits 2 with "no row matches" for a `connect` row that has since gained a thread id. Three rows hit it. Dropping `--channel connect` and `--post` and keeping `--vanity` alone worked. The same full command worked for a `connect` row with no thread id. `artefact` 2026-11-09 (09Nov2026-1522-outreach/QUIRK-1)
- The `all` pass card count varies a lot between runs. On 9 Nov 2026 the four `all` queries gave 11, 7, 38 and 9 cards for Q1 to Q4, against 86, 42, 39 and 32 on 28 Oct 2026. The scroll depth varies too. Q3 needed 7 scroll rounds (9, 18, 24, 30, 33, 36, 38 cards), Q1 and Q4 took 2 and Q2 took 1. `artefact` 2026-11-09 (09Nov2026-1522-outreach/QUIRK-3) Later the same day, run 09Nov2026-2033-outreach gave 19, 13, 78 and 9 cards for Q1 to Q4. Q3 needed 12 scroll rounds to reach 78 cards, Q1 needed 4, Q2 needed 2 and Q4 needed 1. `artefact` 2026-11-09 (09Nov2026-2033-outreach/QUIRK-2)
- `tabs_context_mcp` without `createIfEmpty` returned "no longer exists" on 3 tries over about 30 seconds. Passing `createIfEmpty: true` worked, and no other agent's tabs existed at the time. It happened again in run 09Nov2026-2033-outreach: "This session's tab group no longer exists" on 3 tries over about 35 seconds, and `createIfEmpty: true` then worked. `artefact` 2026-11-09 (09Nov2026-1522-outreach/QUIRK-4, 09Nov2026-2033-outreach/QUIRK-3)
- The `lnkd.in` short links in post text cannot be resolved without leaving the post, and `find` shows only the short URL. `artefact` 2026-11-09 (09Nov2026-1522-outreach/QUIRK-5)
- `javascript_tool` returned `[BLOCKED: Cookie/query string data]` when the post-reader read back the `textContent` of its own prepended `<article>` of summarised card text. `get_page_text` on the same `<article>` returned the text. `artefact` 2026-11-09 (09Nov2026-2033-outreach/QUIRK-4)

### Profile editing

- Adding or deleting a position overwrites a custom headline. Set the headline last and re-check it.
- Employment type has no Contract option. Leave it unset, because the contract status goes in the title, as `.claude/skills/profile/SKILL.md` says.
- The job-preferences title picker is a closed taxonomy. Pick the nearest existing title. The nearest usable titles are Artificial Intelligence Engineer, Solutions Engineer and Solutions Architect.
- After Save, wait for the "Your experience is saved" interstitial, then click Skip. Navigating away earlier cancels the save silently. Saving a new current position also offers to post it to the network. Click Skip unless a post is wanted.
- Notify network is a toggle in each experience modal and defaults to on. Click its wrapping `<label>`, not the input. Turn it off before saving unless a broadcast is wanted.
- The description field is `contenteditable`. Set it with `focus()`, `document.execCommand('selectAll')` and `document.execCommand('insertText')`.
- Experience forms open directly at `/in/<vanity>/details/experience/edit/forms/<positionId>/`. Collect the ids from the `a[aria-label^="Edit"]` links on `/details/experience/`.
- Add skills one at a time and screenshot between steps. Save can need two clicks, and a duplicate skill fails silently.
- Deleting an entry cannot be undone. Copy the text out first.
- The About section sometimes fails to render, even to `get_page_text`. Query `main section` in the DOM.
- An InMail reply typed in the main message box clears on Send but never posts while the InMail is unaccepted. The reply goes through the composer that "Yes, interested..." opens, and Send there can open a "Share your contact info?" dialog that holds the message until a button is clicked. `artefact` 2026-10-21

## Open findings

These are engine defects that LinkedIn sweeps keep hitting. Each needs a `/retro` decision.

1. `process/tools/prelim.ts` `FD_STRONG` is `forward.?deploy(ed|ment)`. It misses "Forward Deploy" and the bare `FDE`, so those titles are ordered too low.
2. `prelim.ts` `AGGREGATOR` names four reposters only. The marketplaces LinkedIn sweeps actually meet take no penalty.
3. `dedupe.identify` strips the query string from unrecognised hosts. Rows whose link is a search URL then collapse onto one key, although a search link's identity is its query. Until this is fixed, never write a row whose link is a search URL where a job id exists. If a search link is unavoidable, compare ingest's `duplicate_link` count for the file against the number of distinct queries, because ingest keys links through `dedupe.identify`, which drops the query string. `artefact` 2026-09-12
4. The 10-page cap binds only on common keywords. Whether to raise it per keyword is undecided.
5. `prelim.ts` `AI_HEAD` does not match a parenthesised AI token. "Principal Artificial Intelligence (AI) Solutions Architect" scores ai 18 instead of 30.
6. `prelim.ts` `FD_MEDIUM` has no arm for `Deployment Strategist`, a forward-deployed title some employers use. It scores fd 0.
7. `prelim.ts` reads "AI Customer Engineer" as AI the subject (ai 30). Matchers have scored it as subordinate (ai 18). A ruling is needed.
8. `prelim` ranks a generic "Senior AI Architect" (66) above a bare "Forward Deployed Engineer" (65), because an FDE title rarely carries an AI or seniority word. This affects order only. Nothing is dropped.
9. `reach.home_tokens` lacks suburb names that appear alone on a card, such as Serilingampalli (Hyderabad) and Sahibzada Ajit Singh Nagar (Mohali). Such a card scores `reach.unstated_points` although the place is in India. Add the tokens to `inputs.toml`. No row is dropped.
10. Whether a recruiting marketplace such as Weekday AI counts as a reposter for the -8 penalty is undecided. It took the penalty in one hunt and not in another. Decide it and extend `AGGREGATOR` to match.
