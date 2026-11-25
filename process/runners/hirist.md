# Runner: Hirist

<!-- Runner for source and lane `hirist`. Read by the sweep-source, matcher and applier agents. -->

## What it is

Hirist (`hirist.tech`) is an Indian job board for tech roles. Recruiters and employers post on it, and the candidate applies with the profile Hirist holds. The `hirist` lane searches its job listings with the `[search]` terms and applies with the Apply button. Its rows carry `source` `hirist` and `channel` `direct`. `stated` 2026-11-09

The lane has no invites and no score exemption. A row must clear the same match bar as any other role. The LinkedIn security cooldown does not touch this lane. `stated` 2026-11-09

## Access

The run uses the candidate's pinned Chrome, which is already signed in to Hirist. Search and JD pages are readable signed out too, but Apply needs the session. The profile menu in the page header shows the candidate's name when the session is live. `artefact` 2026-11-09

A sign-in page, an OTP prompt or a CAPTCHA ends the lane. The sweep writes no rows, records `session sweep hirist status=failed reason="login wall"`, and files a `blocked` finding with `stage` `sweep`, `id` `-`, the `reason` and an `action_for_candidate` that tells the candidate to sign in to Hirist in the pinned Chrome themselves. The other lanes carry on. Never enter a password, an OTP or a Google or Apple sign-in. `stated` 2026-11-09

An applier can meet the same wall if the session lapses after the sweep. It presses nothing and types nothing. It writes outcome `held` with the first reason `ACCOUNT: Hirist session lapsed`, which the account wall rule in R6 of `process/instructions.md` settles, and files one `blocked` finding with `stage` `apply`, the row id, the `reason` and the same `action_for_candidate`. `stated` 2026-11-09

## Harvest

1. Pin Chrome and open your own tab. For each query, build this URL. Take the queries from `search.primary` and, when the primaries return little, `search.rotation`. Strip the double quotes from a term, and join its words with `+`. `artefact` 2026-11-09

   `https://www.hirist.tech/search/<words>-jobs?query=<words joined by +>&minexp=0&maxexp=0&loc=&sort=&page=<n>&industry=&posting=7`

2. `page` starts at 0 and each page holds 20 results. The page header carries the total, such as "82 Job Vacancies" for the phrase `forward deployed` with no posting filter. The pager at the foot reads Previous, 1 to 5 and Next. Walk pages until one holds fewer than 20 cards, and stop at 5 pages for a query. `artefact` 2026-11-09
3. The `posting` value is the filter's day count. The site offers 3, 7, 14, 30 and 90 as "< 3 Days", "Last 1 Week", "Last 2 Weeks", "Last 1 Month" and "Last 3 Months". The sweep uses 7, so the filter is the site's, and a role that Hirist shows as "Posted 6 days ago" is still in. A search for `forward deployed` returned 4 results at 7 and none at 3. Dedupe skips every opening already spent, so the wider window costs nothing. `ours` 2026-11-09
4. Results are not sorted by date. Promoted cards, whose link ends `?ref=sp_prm`, come first. Cards with `?ref=sp_br` follow, and between them sit course adverts with a "Know more" button. Skip every card whose link does not start `/j/`. `artefact` 2026-11-09
5. Read the cards with `read_page` and `get_page_text`. The JavaScript tool blocks any read that returns a link or a URL, so count or collect short strings with it, never `href`. A card holds, in order, the title, the experience band such as "5 - 10 yrs", the location, up to six skill tags and "Posted N days ago". A card may also show a pay band such as "30-35 LPA", a rating, and "May work from home". `artefact` 2026-11-09
6. The card's link is `/j/<slug>-<job id>?ref=...&jobPos=<n>`. The job id is the trailing number. Write the row `link` as `https://www.hirist.tech/j/<slug>-<job id>` with no query string. `dedupe` strips a query already, so a link written either way matches, and the `?ref=` part differs on every search. `artefact` 2026-11-09
7. Most titles read `<Company> - <Role>`. Some give the role only, such as "Forward Deployed Engineer - Python". Take the company from the title when it has that prefix. Otherwise open the JD page, and take the name under the title in the page header. A header name may be a staffing or recruiting firm rather than the employer, so when the JD text names the employer, use that and say so in `notes`. When no company can be found, use `Client not named (Hirist)`. `ours` 2026-11-09
8. Run `node process/engine.ts dedupe check "<company>" "<role>" "<link>"` on each card. Exit 2 means the opening is spent, so leave the row out. `stated` 2026-11-09
9. Write the sweep row with `source` `hirist`, `channel` `direct`, the company, the role, the location, the pay band as the card shows it (empty when none) and `salary_period` `yearly` for an LPA figure. Put the experience band and `May work from home` in `notes`. Set `posted_at` from the JD page, which reads `Posted on: DD/MM/YYYY`, as an ISO date. When the JD page is not read, estimate it from the card's age such as "3 days ago", as R2 says. Set `drop_reason` only for a hard filter in R1. `ours` 2026-11-09

The script `node process/tools/hirist.ts` works this lane first, in a hunt and in headless Playwright. Its `hunt-sweep` runs this Harvest, and its `hunt` runs the Apply steps for one row. The agent steps in this file are the fallback, for when the script hands a row or the sweep back. `ours` 2026-11-26

The script stages each JD at `my-sessions/ledger/roles/hirist-<job id>.jd.md`, where the job id is the trailing number of the row's link. The first line is `<!-- source: <link>, read <date> -->`. An agent sweep stages no JD files, and the matcher reads the JD from the page. `ours` 2026-11-26

## JD reading

The matcher opens the row's link in the pinned Chrome and reads the page text. The JD page holds, under the title: the company or poster name, the experience band, the location, the skill tags and `Posted on: DD/MM/YYYY`. Then it holds `Job Description` and the full text. After the text come the poster's name and title, `Last Active`, and counts for job views, applications and recruiter actions. Ignore the poster's name, and do not copy it into the row. `Similar Jobs` follows, and it is not part of the JD. `artefact` 2026-11-09

An unpublished posting says so ("This job was unpublished on <date>") on the Applied Jobs page, and probably on its own page. Treat an unpublished or removed posting as closed. `ours` 2026-11-09

## Apply

What the apply button does: pressing Apply on a job page sends the application with no form. Hirist then shows "Your application has been submitted successfully." The press takes the resume stored on the candidate's Hirist profile. It offers no resume choice and does not let the applier attach the row's `resume_file`. `stated` 2026-11-09

The Apply button on the JD page is a plain `button`, with a second one below the description. The page may also show Save. Never press Save. `artefact` 2026-11-09

The stored resume is the file under "Attach Resume" on `https://www.hirist.tech/registration/addPersonalDetails`, shown with its name and an upload date. The applier reads that line once per run, without editing the page, and puts it in every outcome's notes as `hirist resume: <file name>, uploaded <date>`. Never press "Upload new resume", never type on that page and never save it. Changing the stored resume is a profile change, and the candidate makes it. `artefact` 2026-11-09

Each row names a `resume_file`, the variant marked default, so the application folder records the resume the matcher picked. On Hirist that file does not go out. The applier says so plainly in the outcome notes: `Hirist sent its stored resume, not <resume_file>`. If the stored file's name differs from the default variant's file name, the applier still applies, and files no finding for it. The report names the difference for the candidate. `stated` 2026-11-09

1. Run `node process/engine.ts dedupe check "<company>" "<role>" "<link>"`. Exit 2 means outcome `already_applied`, and you click nothing. A `RESERVED` line means outcome `held` with a first reason that starts `STOPPED:`, as the applier's one pass says.
2. Open the row's link. If the page shows a sign-in prompt, an OTP or a CAPTCHA, stop as Access says. If the posting is unpublished or gone, write outcome `failed` with `closed: true` and the notes `posting no longer on Hirist`.
3. Check `https://www.hirist.tech/applied-jobs` for the title and company. The page lists each application with its date and the status `Applied/Sent`, newest first. If the role is there, write outcome `already_applied`. The JD page's own button state for an applied role is unconfirmed. `ours` 2026-11-09
4. Read the JD for an email ask, as the section below says.
5. The form is clean under the applier's four rules. Rule 1 holds in full: the match must reach `scores.match_floor`.
6. Read the stored resume line as above. Reserve the opening with `dedupe reserve ... --channel direct --source hirist`, screenshot the page, and click the top Apply button by the coordinates in that screenshot. Straight after the page shows "Your application has been submitted successfully.", run `dedupe record ... --channel direct --source hirist --role-file <role_file>`, and write outcome `applied`. If the message does not appear, reload the Applied Jobs page and look for the role. If it is not there, run `dedupe unreserve --id <id> --reason "<what the page showed>"` and write outcome `failed`. `stated` 2026-11-09
7. If the press opens anything else, such as a screening-question step, a resume choice, a pay or notice-period form, an upgrade or Premium offer, or a redirect to another host, treat it as a form. Fill it only when every answer comes from `faq.md` or `profile.md`, and attach the row's `resume_file` if it asks for one. Never buy or start anything. Otherwise close it without submitting, run `dedupe unreserve --id <id> --reason "<what the page showed>"`, and write outcome `held` with every reason, each question quoted verbatim, and an `answer_gap` finding. A redirect to another host is a hold: name the host in the reasons and file an `instruction_drift` finding. `ours` 2026-11-09

## Email asks

A JD that asks for a CV or details by email still gets Apply. The hunt never sends email, so the applier also files one `email` finding, and `/retro` sends it with the resume once the candidate says send. Use the same rules as `## Email asks` in `process/runners/naukri.md`, and ignore addresses in Hirist's own footer. `stated` 2026-11-09

## Known quirks

- The JavaScript tool returns `[BLOCKED: Cookie/query string data]` on anything that reads a link. Counts and short strings work. `artefact` 2026-11-09
- The posted age on a card is whole days, or "N weeks ago" and "N month ago" past a week. `artefact` 2026-11-09
- A search for a phrase with no match in the window shows "Sorry, No result found". That is an empty page, not a failure. `artefact` 2026-11-09
- The JD page can name a different employer from its header. Read the text before you name the company. `artefact` 2026-11-09
- A `/j/` page lists five similar jobs below the JD. Never harvest from them. `artefact` 2026-11-09
- Hirist also runs a `diversity.hirist.tech` site and a `hirist.com` recruiter site. Neither carries jobs for this lane. `artefact` 2026-11-09

## Open findings

None yet.
