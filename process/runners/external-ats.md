# Runner: External ATS

<!-- Runner file for channel `external_ats`. Read by /hunt and its agents. Not a skill. -->

## What it is

This runner covers every role whose apply link lands on an employer's applicant-tracking system. Roles reach it from LinkedIn and company career pages. It holds the vendor facts, the domain step and the form mechanics.

Identify the vendor from the URL you land on. Never infer it from the company's size or reputation, because companies migrate ATS. `my-sessions/ledger/ats-domains.csv` records each employer's apply domain, vendor, `account_required` and `granted`. Its columns are `ATS_DOMAINS_COLS` in `process/constants.ts`.

### Vendors with a proven result

Each row below rests on at least one real application. A vendor not listed here is unproven.

| Vendor | URL tell | `account_required` | Result |
|---|---|---|---|
| Greenhouse | `job-boards.greenhouse.io`, `boards.greenhouse.io` | `no` | Submitted, several times. An invisible reCAPTCHA resolves on its own |
| Lever | `jobs.lever.co/<tenant>` | `no` | Submitted. An invisible hCaptcha has never challenged |
| Ashby | `jobs.ashbyhq.com/<tenant>` | `no` | Submitted. The cover-letter field accepts a file only |
| SmartRecruiters | `jobs.smartrecruiters.com/<tenant>/<id>` | `no` | Submitted. No account, OTP or CAPTCHA anywhere |
| GoHire | `app.gohire.io` | `no` | Submitted. The lightest form met so far |
| Bespoke forms | The employer's own site | `no` | Submitted where the form had no CAPTCHA |
| Eightfold AI | A branded `careers.<employer>.com` | `no` | The full form is reachable without a login |
| Avature | `jobs.<employer>.com`, `/careers/ApplicationMethods` | per employer | Some tenants demand an account and some do not. Read the flow |
| Google Careers | `google.com/about/careers/applications` | `signed_in` | Works in the signed-in Chrome. The profile save is part of the submit |
| Workday | `<tenant>.wd<n>.myworkdayjobs.com` | `yes` | Account creation at step 1. No guest path |
| Darwinbox | `lighthouse.darwinbox.com` | `yes` | Sign-in or sign-up before the form |
| Phenom People | `careers.<employer>.com`, `utm_medium=phenom-feeds` | `yes` or `otp` | Profile creation on one tenant, an emailed one-time code on another |
| TurboHire | `app.turbohire.co` | `otp` | The form stays unrendered until a six-digit code is verified |
| Zoho Recruit | `<tenant>.zohorecruit.<tld>` | `no` | Fills without an account. Some tenants show an image CAPTCHA and some do not, and one submitted on 2026-10-28 |

A branded `careers.<employer>.com` host can front Workday, Eightfold or Phenom. The `R-nnnnnn` requisition format is shared by Phenom and Workday, so it is not a vendor signal. Read the `href` of the job page's Apply anchor with one `javascript_tool` call before any click.

## Access

The applier works in the candidate's pinned Chrome on the Mac. Each employer domain needs a Chrome site grant. An ungranted domain usually allows navigation and `get_page_text`, but it refuses screenshots, clicks and typing. Some domains refuse navigation outright with "Navigation to this domain is not allowed". Never try to grant a domain yourself.

What stops an unattended run is a human-proof gate. `account_required` records four states:

| Gate | `account_required` | Can a run pass it? |
|---|---|---|
| None | `no` | Yes |
| A session the candidate already holds | `signed_in` | Yes. A password prompt means the session lapsed |
| Account creation with a password | `yes` | No. The candidate registers once, then `/retro` releases the held rows (R10, account and domain walls), and the employer becomes `signed_in` |
| Emailed one-time code | `otp` | No, on every application, unless Chrome keeps the session |

A CAPTCHA is a gate that no column records. It sits on vendors marked `no`. Never solve one. A CAPTCHA holds the row, with outcome `held` and the reason `CAPTCHA at <domain>`. Close the tab after the Send list entry is written, which carries every answer, so `/retro` can see the whole form.

## Harvest

This runner does not harvest. LinkedIn and company career pages produce its rows. The domain step under Apply fills `my-sessions/ledger/ats-domains.csv`.

## JD reading

The matcher reads the description on the vendor's job page. Lever pages are server-rendered, so `get_page_text` returns the whole description.

## Apply

### Resolve the domain first

Key the register by company, not by role. ATS choice is stable per employer, so a repeat employer costs nothing.

1. For each `external_ats` row whose company is not yet in `my-sessions/ledger/ats-domains.csv`, open the LinkedIn listing. Work the highest `prelim` first. Batch six to eight listings in one `browser_batch` call: navigate, then run the snippet. For a `career_page` row the link is already the ATS page, so take the host from the link itself and skip the LinkedIn pass. `stated` 2026-10-23 For a `remote_boards` row, open the link, which is the board's job page, and take the host of its Apply link. A Remote OK Apply link goes through `remoteok.com/l/<id>`, so follow it once to read the host. `ours` 2026-11-10
2. Read the button label and the destination with this snippet. LinkedIn wraps offsite links as `linkedin.com/safety/go/?url=<encoded destination>`, so no click is needed.

```js
const b = [...document.querySelectorAll('a,button')].find(e => /apply/i.test(e.innerText || ''));
let out = b ? b.innerText.trim() : 'NONE';
if (b && b.tagName === 'A') {
  const m = (b.getAttribute('href') || '').match(/[?&]url=([^&]+)/);
  if (m) out += ' | ' + new URL(decodeURIComponent(m[1])).host;
}
out
```

2a. Full `href` values do not come back from `javascript_tool`. A call that prints one returns `[BLOCKED: Cookie/query string data]`, so return the host only, as the snippet above does. `artefact` 2026-10-12
3. A label of `Easy Apply` means the row is misfiled. Keep its id, and say so in the stage file's `notes` so the parent corrects `channel`.
4. For `Apply`, record the host as `apply_domain` and take the vendor from the table above. File an `ats_domain` finding through `node process/engine.ts --session <S> finding add --json '{"kind":"ats_domain","stage":"apply","id":"<row id>","summary":"...","proposed":{"domain":"...","vendor":"...","company":"..."}}'`. `/retro` folds it into the register with `granted=no`.
5. Never click Apply in this pass, because it opens a real application.

If the apply run lands on a different host than the register records, trust the host and file a new `ats_domain` finding.

### Decide by `account_required`

| Value | Do this |
|---|---|
| `no` | Fill the form, and submit it when it is clean as `process/instructions.md` R6 defines it |
| `signed_in` | Fill and submit as for `no`. On a password prompt, it is an account wall with the reason `ACCOUNT: session lapsed at <host>` |
| `yes` | Do not attempt. It is an account wall with the reason `ACCOUNT: <vendor> at <host>` |
| `otp` | Do not attempt. It is an account wall with the reason `ACCOUNT: otp at <host>` |
| `unknown` | Open the flow only far enough to see whether it demands an account. Then act as that value and file the finding |

An ungranted domain returns `held` with the reason `DOMAIN: <domain> not granted`. The candidate grants domains in one sitting, ranked by `roles_waiting`. `/retro` then asks once per domain and releases the rows. An account wall is written and settled as the account wall rule in R6 of `process/instructions.md` says.

### Upload the resume

1. Use the file the row names in `resume_file`, the fixed variant the matcher picked. Upload it exactly as it is. Never edit, rebuild, rename, convert or regenerate it. If `resume_file` is empty, the file is missing or `resume_variant` still starts `PENDING`, return `failed` with `NO RESUME FILE`.
2. Pass `file_upload` the absolute path of `resume_file`, which is repo-relative. If it is refused, return `failed` with the exact error text.
3. If the form shows no file input that `find` can target, inject a proxy. Add a light-DOM `<input type="file" id="proxyUpload">` to `document.body`, then `find` it and `file_upload` to it.
4. Copy the file to the real input with `new DataTransfer()`. In a separate JS call, dispatch `input` and `change` with `{bubbles: true, composed: true}`. Doing both in one call leaves `files.length === 0`.
5. Remove the proxy input.

### Fill the form

1. Every resume parser met so far writes the end client as the employer. Reopen the first Experience entry and re-read Company, Country and City against `my-profile/work-portfolio.md`. The Company field must name the vendor as employer of record and the end client as the engagement, written `<end client> via <vendor>`. Take the exact wording, country and city from `my-profile/work-portfolio.md`.
2. Parsers also substitute real but wrong values from autocomplete databases, such as a similarly named company or a wrong country. Re-read every parsed field.
3. When the form requires a cover letter, write it as `.claude/agents/applier.md` says and paste it where the form has a text field. Where it takes a file only, hold the row with the reason `COVER LETTER: file upload required`. Leave an optional cover letter empty.
4. Controlled React inputs, as on Ashby, TurboHire and Eightfold, ignore programmatic values. Click and type for real.
5. Never fill a honeypot field. Workday's `input[name=website]` is labelled "This input is for robots only".
6. Tick the employer's standard consent to process the application data, because the go-ahead in the brief covers it. Leave every marketing opt-in unticked. Any other consent, such as an account's terms of service, holds the row with the reason `CONSENT: <text>`.
7. Write the employer's careers root and the vendor as a `career_page` finding (`proposed` needs `company`, `url` and `ats`).
8. Some forms animate their fields in for about 8 seconds after load, as one employer's form did. Wait for it to settle before you read coordinates or type. `artefact` 2026-10-12

### After submit

Confirm the URL changed to the vendor's success path before recording anything. Then run this at once, before writing the stage file:

```bash
node process/engine.ts dedupe record --source <source> --company "<company>" --role "<role>" \
    --link "<link>" --channel <external_ats|direct> --role-file "<role file>"
```

## Known quirks

- Simplify: its sidebar overlays ATS pages and shifts click coordinates. Screenshot immediately before each coordinate click, and never use its buttons.
- Greenhouse: an embedded board redirects to the employer's site, where the form sits in a cross-origin iframe. Go straight to `https://job-boards.greenhouse.io/embed/job_app?for=<company>&token=<jobid>`.
- Greenhouse: dropdowns are custom comboboxes, and the chosen text does not appear in `input.value`. Click, type to filter, click the option, then verify visually.
- Greenhouse: school and degree pickers are strict-match with a debounce of about two seconds. Search a short, distinctive token of the name. The city autocomplete reflows, so screenshot right after picking a city. The degree-discipline list has no metallurgy or materials entry, so use "Engineering".
- Greenhouse: some employers make the demographic-data consent checkbox mandatory, even when the answers decline.
- Lever: `read_page` and `find` sometimes return "Page script returned empty result", so drive forms with `javascript_tool`.
- Lever: the board lists every posting in one read of `a.posting-title`. The apply URL is the posting URL plus `/apply`.
- Lever: employer questions are named `cards[<uuid>][field0..N]` with no label text. Read labels from the page and match them by position.
- Lever: the fixed fields are named `resume`, `name`, `email`, `phone`, `location`, `org`, `urls[LinkedIn]`, `urls[Portfolio]` and `urls[GitHub / Other]`. `find` with `filter:interactive` can omit the file input, so locate it by name.
- Lever: do not retype `location`. A hidden `selectedLocation` field written by the typeahead goes stale.
- Lever: the submit button is `#btn-submit` with `type="button"`, so a `ref` click reports success and does nothing. Click by viewport coordinate and check for `/thanks`.
- Lever: `.error-message` is a hidden template with `offsetHeight` 0. Check the height before reporting a validation failure.
- Ashby: programmatic values fail with "Your form needs corrections". Yes/No toggles clear when the selected option is clicked again.
- SmartRecruiters: the form is a shadow-DOM Lit component (`spl-*`), so use the proxy upload above. Walk the shadow roots from `SPL-DROPZONE` to reach the real `#file-input`, and set its files there. `find` cannot see it, and the only input it does show is the profile-image input, which is the wrong target.
- SmartRecruiters: Company and Country revert on blur. Click the suggestion row to commit. `ctrl+a` does not select inside these inputs, so use `End` and repeated `Backspace`.
- SmartRecruiters: nothing is saved until Submit. A fresh empty form means nothing was sent, so check for `/success`.
- GoHire: the modal form is a cross-origin iframe, and `form_input` reports false success on the parent page. Navigate to `app.gohire.io/widget/<boardId>/<jobId>`.
- Eightfold: a consent modal follows the upload. Address fields render only after Country of Residence is set. Commit combobox values through the element's `onChange` with a `persist()` stub.
- Avature: click the From Device button, neutralise `input#resumeFile`'s `click()`, then set that input directly.
- Workday: dismiss the cookie banner before computing coordinates, because it shifts content by about 150px. Once an account exists, "Use My Last Application" pre-fills the form.
- Google Careers: the Careers profile step recurs with most fields blank. Saving it is a commit, so save it only on a clean form you are about to submit.
- Google Careers: there is no file input. Use the proxy upload, then dispatch `dragenter`, `dragover` and `drop` on the drop zone.
- Google Careers: Material selects misfire. Open, wait, screenshot with no JS call in between, then click from that screenshot. Typeahead drops the first keystrokes, so pick the highlighted row with Enter. Scroll with `window.scrollTo`, and avoid `await setTimeout` in injected scripts.
- Google Careers: Google allows three applications per 30 days. Spend them on the highest `match` rows.
- One startup careers page: the "Make your case" modal took about 40 seconds to animate in, and the first Apply click showed an empty modal. The form gives no success URL, and the only confirmation is the on-page text "TRANSMISSION LOGGED". It saves no draft. `artefact` 2026-10-12
- Zoho Recruit: a branded careers host submitted with no CAPTCHA. City, State, Zip, Country and Skill Set are autocompletes that ignore typing. `form_input` sets them, and the typed text persists after Escape, so no suggestion needs picking. The Duration year pickers filter on typing and accept a year only. `artefact` 2026-10-28 (F-2, 28Oct2026-1257-hunt)

## Open findings

- SuccessFactors and the two Oracle recruiting products have register rows read from JDs, not from an application. Taleo and iCIMS have none. All four are unproven. Until one is proven, treat them as `yes`.
- Three runs raised the Simplify sidebar as noise. Whether to disable the extension during a hunt is undecided.
