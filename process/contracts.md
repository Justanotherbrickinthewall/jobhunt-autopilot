# Machine contracts

This file holds the shapes that the tools and the agents agree on. It covers the ledger files, the
vocabularies, the status flow, the session folder, the stage files, the findings and notes.md.
instructions.md says what to do. This file says what each file must look like.

The code is the truth. Every list here is held in `process/constants.ts`, and each section names
the constant. When this file and the code disagree, the code wins and this file is wrong. Change
both in one commit.

Paths below use two short names. `L` is the ledger, `my-sessions/ledger/` at the repo root
(`constants.LEDGER`). `S` is one session folder, `my-sessions/<DDMonYYYY-HHMM>-hunt/`, such as `13Oct2026-1155-hunt`. `R` is one `/outreach` run folder, `my-sessions/<DDMonYYYY-HHMM>[-<serial>]-outreach/`, such as `18Oct2026-0930-outreach`. All three are
gitignored. `node process/engine.ts config` prints every resolved path. The global flags
`--session S` and `--ledger L` come before the subcommand and point every tool at that session or
ledger. `ours` 2026-10-12

## 1. Ledger files

The ledger outlives every session. `engine.ts ledger init` creates it with header-only CSVs and
never overwrites a file. A CSV whose header differs from its column constant fails
`engine.ts validate`.

| File | Column constant | Path constant | Only writer |
|---|---|---|---|
| `L/prospects.csv` | `PROSPECT_COLS` | `PROSPECTS` | `engine.ts ingest` |
| `L/applied.csv` | `APPLIED_COLS` | `APPLIED` | `engine.ts dedupe record`, and ingest as a fallback |
| `L/distinct.csv` | `DISTINCT_COLS` | `DISTINCT` | `engine.ts dedupe distinct` |
| `L/company-careers.csv` | `COMPANY_CAREERS_COLS` | `COMPANY_CAREERS` | `engine.ts findings fold` |
| `L/ats-domains.csv` | `ATS_DOMAINS_COLS` | `ATS_DOMAINS` | `engine.ts findings fold` |
| `L/contacted.csv` | `CONTACTED_COLS` | `CONTACTED` | `engine.ts outreach record` |
| `L/reserved.csv` | `RESERVED_COLS` | `RESERVED` | `engine.ts dedupe reserve`. `dedupe record` and `dedupe unreserve` delete rows |
| `L/suggestions.csv` | `SUGGESTION_COLS` | `SUGGESTIONS` | `engine.ts suggestion` |
| `L/roles/<id>.md` | none | `ROLES` | the matcher, then the resume-tailor |
| `L/artifacts/` | none | `ARTIFACTS` | the resume-tailor |

### prospects.csv

This is the one queue. It holds every role ever seen, from every source, in every state. ingest is
its only writer, and it writes under a lock on `L/.ingest.lock`. An agent never edits it.

| Column | Holds | Set by |
|---|---|---|
| `id` | `<YYYY-MM-DD>-<prefix>-<nnn>`, such as `2026-09-17-LI-002`. The date is the sweep firing's date | ingest sweep |
| `date_found` | The firing's date | ingest sweep |
| `source` | Where the role was found. One of `SOURCES` | ingest sweep |
| `channel` | How it gets applied to. One of `CHANNELS`. Extract replaces an empty or `unknown` value | ingest sweep, ingest extract |
| `company`, `role` | As the posting gives them | ingest sweep |
| `location`, `work_mode` | From the card. Extract fills them when the sweep left them empty | ingest sweep, ingest extract |
| `batch` | The source's batch label, such as a Work at a Startup YC batch. For `remote_boards` it is the board's name: Remote OK, Himalayas, Remotive or We Work Remotely. `ours` 2026-11-10 | ingest sweep |
| `salary_band`, `salary_period` | Pay as published, and whether it is yearly, monthly, `hour` or unmarked | ingest sweep |
| `prelim` | Integer from `engine.ts prelim`. It orders the queue and never drops a row | ingest sweep |
| `match` | Sum of the five components, 0 to 100 | ingest triage |
| `semantic` | 0 to 100: how much of the described work the portfolio shows | ingest triage |
| `fd_30`, `ai_25`, `reach_20`, `level_15`, `stack_10` | The match components (`TRIAGE_COMPONENTS`). Each caps at its `MATCH_WEIGHTS` value | ingest triage |
| `evidence` | The JD's own words behind the score | ingest triage |
| `link` | The posting link. LinkedIn and Work at a Startup links are stored in canonical form | ingest sweep |
| `apply_route` | The external ATS host, taken from extract's `apply_url` | ingest extract |
| `contact` | The founder or recruiter, when the source names one. Extract fills an empty one as `hiring: <name> <url>; poster: <name> <url>`, with either part left out when the page showed nobody | ingest sweep, ingest extract |
| `resume_variant` | A fixed variant id from profile.md `## Resume variants`, `PENDING_MESSAGE`, `PENDING_TAILOR` or a founder message name. Rows before 21 October 2026 may hold `standard` or a built `<id>-<slug>`. See section 5 | ingest triage |
| `status` | One of `STATUSES`. See section 3 | ingest |
| `applied_date` | `YYYY-MM-DD` of the submit | ingest apply |
| `message_file` | Path of the founder message | no tool writes it today |
| `response`, `response_date` | What a human replied, and when | `engine.ts ingest response` |
| `notes` | Reasons and facts, joined with ` \| `. See below | ingest |
| `override` | `yes` puts a closed row back in the queue ahead of everything | the candidate only |
| `reviewed` | Date ingest stamps when an override row changes status | ingest |
| `posted_at` | When the posting went up, as an ISO date or date-time. Every sweep row carries one, as R2 says, and it is empty only when the page showed no age. Only a value with a clock time yields `age_minutes` at apply | ingest sweep |

ingest writes these note fragments, so a reader can search for them:

- `hard filter: <reason>` on a sweep or extract drop.
- `posting closed (extract)` and `closed at apply` on a closed listing. A closed listing is `skipped`, never `dropped`.
- `extract: remote_scope=...; seniority=...; pay=...; stack=...; employment=...; country=...` for the JD facts.
- `triage <decision>: <reason>` on a row triage did not score, and `triage: <reason>` on one it did.
- `resume: <file>` when triage or the tailor names a file.
- `apply failed attempts=<n>` after each failed apply.
- `held: <reasons>` when an apply file holds a row, or `ingest hold` does.
- `unblocked <YYYY-MM-DD>` when `ingest release` moves a held row back to `ready`.
- `candidate skip: <reason>` when `ingest skip` closes a row.
- `sent by hand <YYYY-MM-DD>: <reason>` when `ingest sent` marks a row the candidate sent themselves as `applied`.
- `reopened <YYYY-MM-DD>: <reason>` when `ingest reopen` sends a skipped row back to triage.
- `aged out, never reached` (`AGED_NOTE`) when `ingest age` skips a stale `new` row.
- `declined (Not interested): <reason>` (`DECLINED_PREFIX`) when an apply file with outcome `declined` closes a Naukri invite.

`engine.ts validate` refuses the file when any of these hold:

1. The header differs from `PROSPECT_COLS`, or two rows share an `id`.
2. Two rows share a canonical link, or a row has no link.
3. A LinkedIn or Work at a Startup row has a link that is not a job view. A person's profile link
   is allowed only on an older `channel=outreach` row.
4. `status`, `source` or `channel` is outside its vocabulary.
5. `channel` is empty on a row whose status is not in `CLOSED`, or `prelim` is empty there.
6. `match` is set but the components do not sum to it, or `evidence` is empty.
7. A `scored` row sits under `scores.match_floor` or `scores.semantic_floor` in inputs.toml. A Naukri
   invite row is exempt from this and from checks 8 and 11, because the lane answers every invite.
   `stated` 2026-11-02
8. A `skipped` row sits at or above `scores.match_floor` without `HELD:` (`HELD_PREFIX`), `closed at
   apply`, `posting closed` or `candidate skip:` in its notes.
9. A `dropped` row's notes cite a prelim number as the reason, such as `prelim 40 below the bar`. A
   plain mention of a prelim number in a hard-filter note passes. `ours` 2026-10-12
10. A `dropped`, `skipped`, `wrong_job`, `held` or `blocked_info` row has no notes. Each of these
    needs its reason, or for a held row its reasons or question, in `notes`. `ours` 2026-10-16
11. A `scored`, `ready` or `applied` row sits in the semantic middle band: `semantic`
    under `scores.semantic_proceed` and `match` under `scores.semantic_middle_min_match`. The matcher
    writes `skipped` with a `HELD:` reason for these. `ours` 2026-10-12
12. A `waas_message` row at `scored`, `ready` or `applied` has `match` under `scores.waas_send_match_min`.
    The matcher writes `skipped` with `HELD: below founder send bar`. `ours` 2026-10-12

A LinkedIn search-results link on a row that is not `skipped` gives a `SEARCH LINK` warning and not an
error, because a search link is not a posting. `ours` 2026-10-12 On success `validate` ends with
`ok: <n> checks, 0 errors, <w> warnings`.

### applied.csv

One row per opening actually spent. It is the guard against applying twice. Write it only through
`engine.ts dedupe record`, in the same step as the submit. ingest records a row itself if an
`applied` outcome arrives with no ledger row.

| Column | Holds |
|---|---|
| `key` | The canonical link, or `<source>:<company_norm>\|<role_norm>` when there is no link |
| `source`, `job_id` | The source and its own job id, parsed from the link where the host is known |
| `company`, `company_norm` | The name, and the name with corporate noise words removed |
| `role`, `role_norm` | The title, and the title with mode and region words removed. Grade words stay, so two grades of one role count as two openings |
| `link` | The canonical link |
| `channel` | The channel the application went through |
| `applied_date` | `YYYY-MM-DD` |
| `status` | `applied` unless the caller says otherwise |
| `role_file`, `notes` | Free text from the caller |
| `age_minutes` | Minutes between `posted_at` and the reservation, which is written just before the final submit click. Empty when the row had no posting time |

`engine.ts dedupe check "<company>" "<role>" "<link>"` tries three keys in order, and the first hit
wins. They are the canonical link, then `source:job_id`, then `company_norm|role_norm`. Exit 2
means the opening is already spent, or has an open reservation and prints a `RESERVED` line. `validate` fails when a prospects row in `SPENT` has no ledger
row.
A company named in `search.blocked_companies` is refused under any title: `check` prints `BLOCKED company: on search.blocked_companies` and exits 2, and every caller of `dedupe.check` treats it as spent. `stated` 2026-11-23

`engine.ts dedupe distinct <job_id_a> <job_id_b> --reason <text>` appends a pair to `L/distinct.csv`
(`DISTINCT_COLS`: `job_id_a`, `job_id_b`, `date`, `reason`). Use it only when the candidate has said
two openings differ although key 3 reads them as one. Key 3 then skips that pair in `check` and in
`record`, in either order. Keys 1 and 2 are unchanged. The engine is the only writer. `ours` 2026-10-28

`engine.ts dedupe reserve --id <id> --company C --role R --link L [--channel CH] [--source S]` writes
one row to `L/reserved.csv` just before the final submit click (`RESERVED_COLS`: `key`, `source`,
`job_id`, `company`, `role`, `link`, `id`, `session`, `date`, `ts`, `age_minutes`). `--channel` is
accepted and not stored. `reserve` exits 2 and writes nothing when the opening is spent or already
reserved. `dedupe record` promotes the reservation into an `applied.csv` row with its `age_minutes`
and deletes it. `dedupe unreserve --id <id> --reason <text>` deletes it and adds `unreserved <date>:
<reason>` to the prospects row, and is for a form the employer site shows was not sent. A
reservation that is still open means a run may have sent the form, so its row is held with a reason
that starts `STOPPED:`. `ours` 2026-11-02

`L/suggestions.csv` is the memory of `/retro` suggestions (`SUGGESTION_COLS`: `id`, `fingerprint`,
`date`, `kind`, `text`, `state`, `decided_date`, `outcome`, `session`). `state` is one of
`SUGGESTION_STATES`: `open`, `accepted` or `rejected`. `engine.ts suggestion` is the only writer.
`ours` 2026-11-02

### company-careers.csv

A company's own careers root, used to seed the company-sites runner.

| Column | Holds |
|---|---|
| `company` | The employer |
| `careers_root` | The careers page or ATS board URL |
| `ats_vendor` | The ATS behind it, such as Greenhouse or Workday |
| `sweepable` | `yes`, `no` or `maybe`. The fold writes `maybe` |
| `first_seen` | The finding's date |
| `from_role_id` | The prospects row that revealed it |
| `notes` | The finding's summary |

The fold skips a company or careers root already present. `engine.ts validate` (the `careers` check)
fails a blank or duplicate company and a `sweepable` value outside `yes`, `no` and `maybe`.

### ats-domains.csv

Apply hosts, their vendor, and whether Chrome may act on them.

| Column | Holds |
|---|---|
| `company` | The employer |
| `apply_domain` | The host, lower case |
| `vendor` | The ATS vendor |
| `account_required` | `yes`, `no` or `unknown`. The fold leaves it empty |
| `granted` | `yes` once the Chrome permission is granted. The fold writes `no` |
| `first_seen` | The finding's date |
| `roles_waiting` | Roles held on this host. The fold writes `1` |
| `notes` | Free text |

The fold skips a domain already present. `engine.ts validate` (the `ats_domains` check) fails a blank
`apply_domain`, a duplicate company and domain pair, and a `granted` value outside `yes` and `no`.

### contacted.csv

One row per person whose LinkedIn message or email a `/retro` sitting has read or answered, or whom a
prospecting `/outreach` run found through a hiring post. It answers one question before every send: has this
person already had our message or our invitation? `engine.ts validate` does not
check this file yet. A row is seeded when `outreach record` runs with no `--thread`, from `--post`, `--vanity` or `--name` and `--company`. Its `thread_id` stays empty until a `record` with `--thread` matches it. A `connect` row never gets one, because an invitation opens no thread.

| Column | Holds |
|---|---|
| `thread_id` | The LinkedIn messaging thread id, exact, or a Gmail form: `gmail:<threadId>` for a reply in an existing thread and `email:<address>` for a new message. A Gmail reply replaces an `email:` id with its `gmail:` id once the thread exists. Empty on a seeded row until a thread matches it |
| `vanity` | The `/in/<vanity>` handle, lower case, without slashes |
| `post_url` | The hiring post that led to the row, as `https://www.linkedin.com/feed/update/urn:li:activity:<id>/`. Empty on an inbox row and on a row from before 23 Oct 2026 |
| `name` | The sender's name as LinkedIn shows it |
| `company` | The sender's company as their headline shows it |
| `channel` | One of `CONTACT_CHANNELS`: `message`, `inmail`, `connect` or `email`. `record --channel` sets it and defaults to `message`. An inbound message or InMail is `message`, with the detail in `notes`. `email` is a Gmail thread or message |
| `status` | One of `CONTACT_STATUSES`, below. `sent` is sticky: no `record` moves it back, with one exception for `connect` rows below |
| `first_date` | The first record, `YYYY-MM-DD` |
| `last_date` | The latest record that changed `status`, `YYYY-MM-DD`. A pending follow-up does not move it |
| `session` | The outreach run folder name that last recorded the row. Empty on a seeded row |
| `notes` | Dated lines joined by ` | `, each `<date> <status>: <text>` |
| `pending` | Empty by default. On a `sent` row it holds the follow-up to that person: `drafted` or `declined`. `record --status sent` clears it, and `--status skipped` clears `drafted`. An `accepted` row takes `drafted` there too |
| `replied_date` | The date of the person's first reply to our message, `YYYY-MM-DD`. `outreach replied` sets it and never overwrites it. The yield report reads it |
| `role_id` | The prospects.csv id of the applied or held role a `roles` lane row is about. Empty on every other row, and on rows from before 10 Nov 2026 |

A row is found by five keys in order, and the first hit wins:

1. `thread_id`, exact.
2. `post_url`, exact.
3. `vanity`, after `/in/` and slashes are stripped and the case is lowered.
4. The name and the company together. Each is normalised, and both must be non-empty on both sides.
   The company goes through `dedupe.normaliseCompany`, so "Acme Labs Pvt Ltd" matches "Acme".
5. `role_id`, exact, and only on a row with no vanity and no name. That is the `no contact:` row the `roles` lane records for a role it found nobody for.

`outreach check` and `outreach record` use the same five keys. `check` and `record` take `--role` for key 5. `record` fills an empty `vanity`,
`post_url`, `role_id`, `name` or `company` and never overwrites a filled one. A new thread id replaces an old one, and the
old id is kept in `notes` as `thread was <id>`. `record` refuses a row that has none of the keys.
Both commands normalise a post URL before they compare or store it. A URL with an activity id becomes
`https://www.linkedin.com/feed/update/urn:li:activity:<id>/`, and any other URL loses its query and
fragment. A `--post` that is not a LinkedIn URL exits 2. `record` takes `--thread`, `--post`, `--vanity`, `--name`,
`--company`, `--role`, `--status`, and optionally `--channel`, `--date`, `--notes` and `--by-candidate`. `ours` 2026-10-23

`record --status sent` is the one record an approval gates. It needs the global `--session` flag naming
an outreach, retro or profile run whose `approved.json` has a send item for this person, and it exits 2
without it. `--by-candidate` replaces that check for a message the candidate typed themselves, which no run
sent, and adds the note "sent by the candidate". Every other status needs no approval. `stated` 2026-11-02

`outreach recent-sent` prints the `sent` or `accepted` rows that have a thread id and a `last_date`
inside `outreach.recheck_sent_days`. `/retro` reopens those threads to find replies, and
`outreach replied --thread <id> --date <date>` sets `replied_date` on the row that answers. It exits 2
when no row matches. `outreach unsent` lists the items in the run's `approved.json` whose row is not
at `sent` or `accepted`, which is the queue for the next messenger after a stop, and for the parent's
`mail send` calls. `ours` 2026-11-02

| Status | Means |
|---|---|
| `drafted` | A reply draft, on LinkedIn or in Gmail, is waiting for the candidate's approval in `/retro`, or was held for an unanswered question. A prospect draft is at `drafted` only from O1b until O1c sends it or records it `skipped` |
| `sent` | Our message, InMail or invitation went out. `outreach check` exits 2. On a `connect` row it means the invitation is pending |
| `accepted` | A `connect` row only. LinkedIn shows the invitation as accepted, so the person is a 1st-degree connection |
| `withdrawn` | A `connect` row only. We withdrew the invitation after `withdraw_after_days` |
| `declined` | The candidate refused the item in /retro, recorded with `outreach record --status declined` |
| `skipped` | The thread was not job-related, a kept post could not be drafted, or a prospect draft was not sent in O1c, such as `over budget`. The note gives the reason |

`sent` never moves back. The one exception is a `connect` row, which moves from `sent` to `accepted` or
`withdrawn`, and only through `outreach record --status accepted` or `--status withdrawn`. Those two
exit 2 unless the matching row is a `connect` row at `sent`, or already at that status. On the move,
`last_date` keeps the send date, and the new date goes into `notes`. `stated` 2026-10-23

`accepted` and `withdrawn` are final, so `outreach budget` keeps counting the invitation in its week. A
`withdrawn` row takes no other `record`. An `accepted` row takes replies like a `sent` row and stays `accepted`:
`drafted` sets `pending`, `sent` clears it, and `skipped` clears a pending `drafted`. Its `last_date` keeps the
send date of the invitation, and the date of a reply goes into `notes`. `declined` and any other status on it exit 2.
`outreach check` exits 2 for an `accepted` row as for a `sent` one. `ours` 2026-10-23

A follow-up to a person at `sent` leaves `status` at `sent` and sets `pending` to `drafted` or `declined`.
`outreach drafted` lists both kinds of waiting draft. Sending the follow-up records `sent`, which clears
`pending`. Each `outreach drafted` line carries `post <url>` when the row has a `post_url`, or `role <id>` when the row has a `role_id`, and ends with `session <folder>`
when it has a `session`, so `/retro` finds a draft without reading this file. A `(follow-up)` mark follows the key on a pending row. A line with `post <url>` or `role <id>` and no `(follow-up)` mark is a prospect draft, which O1c settles. A `skipped` record on a `sent` row leaves `status`, `last_date` and `session` alone, and clears `pending` when it is `drafted`. It still fills an empty key column, replaces `thread_id` when a different one is given, and adds its note. `ours` 2026-10-23

`outreach budget` prints the lane's counts from this file and the `[prospect]` table in `inputs.toml`.
It exits 2 naming the first missing or mistyped `[prospect]` key. `ours` 2026-10-23

```
invites today      <sent>/<invites_per_day>
invites this week  <sent>/<invites_per_week>
pending            <n>/<max_pending_invites>
inmail this month  <sent>/<inmail_per_month>
withdraw due       <vanity> <post_url> <sent date>   (one line per row)
withdraw due       none                              (when no row is due)
```

The first line counts invitations sent today. The second counts those sent in the last 7 days. Both
include invitations since accepted or withdrawn, because `last_date` keeps the send date. A `withdraw due`
line prints `-` for a vanity or a post URL the row lacks. `pending` counts `connect` rows still at `sent`. The InMail line counts InMails sent this calendar
month. A `withdraw due` line names a `connect` row that has stayed at `sent` for
`withdraw_after_days` or more.

`outreach approve` counts the `connect` and `inmail` items it sends against the same lines. An item
the lines cannot cover is held at `drafted`, and approve prints `over budget: <line>` for it.
`ours` 2026-10-23

`outreach lanes` prints the live lanes from `prospect.live_lanes`, one per line, in `constants.OUTREACH_LANES` order. `outreach roles` prints the queue of the `roles` lane and reads only. A role is due when its status is in `SPENT` or `HELD_STATUSES`, or is `skipped` with `EA_FLOOR_REASON` in its notes, its `match` is at or above `prospect.roles_match_min`, and no contacted row has worked it. A row works a role when it carries the role's id at any status but `skipped`, or at `skipped` with `no contact:` in its notes. Due roles are ordered by how many of the marks `remote` and `contract` they carry, then by match, then newest. `stated` 2026-11-10 At most `prospect.roles_per_run` print. `ours` 2026-11-10

```text
roles due <n>, listing <k> (prospect.roles_match_min <m>, prospect.roles_per_run <cap>)
id <id>  match <match>  status <applied|held|skipped>  first <marks joined by commas, or ->  company <company>  role <role>  link <link>  contact <contact, or ->
```

### roles/<id>.md

One markdown file per role whose JD was opened, named by the prospects `id`. `engine.ts queue`
prints its path as `role_file`. The matcher creates it. The file keeps no status, because
prospects.csv is the record of status. Its sections, in order:

| Section | Written by | Holds |
|---|---|---|
| `# <Company> - <Role>` and a facts table | matcher at extract | id, source, posting link, location and mode, date found |
| `## The JD in their words` | matcher at extract | Key phrases quoted from the JD |
| `## Score breakdown` | matcher at triage | One row per component: maximum, given, why |
| `## What they clearly care about` | matcher at triage | A short numbered list |
| `## Matching proof points` | matcher at triage | Named projects and numbers from work-portfolio.md |
| `## Missing keywords` | matcher at triage | Each JD term the picked variant lacks, marked `evidence: yes`, `no` or `partial` |
| `## The human` | matcher | Name, title, LinkedIn and route, when known |
| `## Artifacts` | resume-tailor | The founder message it wrote, by path |
| `## History` | any agent | Dated events, one per row |

No command creates the file. The matcher writes it from this skeleton and fills what it knows.
`ours` 2026-10-12

The role file quotes the JD and never holds all of it. The full text lives beside it in
`L/roles/<id>.jd.md` (`constants.JD_SUFFIX`), which the matcher writes. The text is verbatim, and
its first line is `<!-- source: <url>, read <date> -->`. The application filer reads it from there.
`ours` 2026-10-13

```
# <Company> - <Role>

| | |
|---|---|
| Id | <id> |
| Source | <source> |
| Posting | <link> |
| Location and mode | <location>, <work_mode> |
| Found | <date_found> |

## The JD in their words
## Score breakdown
| Part | Max | Given | Why |
|---|---|---|---|
| fd_30 | 30 | | |
| ai_25 | 25 | | |
| reach_20 | 20 | | |
| level_15 | 15 | | |
| stack_10 | 10 | | |
## What they clearly care about
## Matching proof points
## Missing keywords
## The human
## Artifacts
## History
| Date | Event |
|---|---|
```

### artifacts/

Every outside-reader file built for one role lives flat in `L/artifacts/`, named
`<id>-<slug>` with `<slug>` the company and role in lower-case hyphenated form.

| File | What it is |
|---|---|
| `<id>-<slug>-cover-letter.md` | A cover letter, when the form asks for one. The applier writes it |
| `<id>-<slug>-message.md` | A Work at a Startup founder message |

No resume is an artefact. Each fixed variant lives in the profile's `resume/` folder, and profile.md
names it under `## Resume variants`. Older rows may still point at a built `<id>-<slug>.pdf` here.

## 2. Vocabularies

| Vocabulary | Constant | Values |
|---|---|---|
| Statuses | `STATUSES` | `new`, `extracted`, `scored`, `ready`, `queued`, `applied`, `held`, `blocked_info`, `skipped`, `wrong_job`, `dropped` |
| Held statuses | `HELD_STATUSES` | `held`, and the older `blocked_info`. `/retro` lists both |
| Spent statuses | `SPENT` | `applied` |
| Closed statuses | `CLOSED` | `dropped`, `skipped`. These rows may have an empty channel |
| Statuses each stage works | `STAGE_STATUS` | extract `new`; triage `extracted`; apply `ready` and `scored` |
| Override re-entry | `OVERRIDE_REENTRY` | extract also takes `dropped`, `skipped` and `wrong_job` rows with `override=yes` and `reviewed` empty |
| Sources | `SOURCES` | `linkedin`, `waas`, `naukri`, `hirist`, `remote_boards`, `gmail`, `career_page`, `wellfound`, `simplify`, `referral`. `gmail` is kept for older rows only |
| Runner files | `RUNNER_FILE` | The runner in `process/runners/` for each lane that has one. A lane is live when it is in `search.live_sources` and its runner exists |
| Split lanes | `SPLIT_LANES` | `linkedin` is lanes `linkedin-ea` (`easy_apply` rows) and `linkedin-ex` (every other channel). Rows keep `source=linkedin`. Any other source is one lane under its own name |
| Channels | `CHANNELS` | `easy_apply`, `external_ats`, `waas_message`, `outreach`, `direct`, `unknown`. `outreach` is kept for older rows only |
| Id prefixes | `PREFIX`, `OUTREACH_PREFIX` | `LI`, `WA`, `NK`, `HR`, `RB`, `GM`, `CP`, `WF`, `SI`, `RF`, and `OR` on older `channel=outreach` rows |
| Triage decisions | `DECISIONS` | `scored`, `skipped`, `wrong_job`, `dropped` |
| Apply outcomes | `OUTCOMES` | `applied`, `held`, `failed`, `already_applied`, `declined`, and the older `blocked_info` and `stopped_before_submit`. `declined` is a Naukri invite answered with Not interested |
| Held outcomes | `HELD_OUTCOMES` | `held`, `blocked_info`, `stopped_before_submit`. Each sets the row to `held` |
| Board lanes | `LANES` | `swept`, `matching`, `matched`, `tailoring`, `tailored`, `applying`, `sent`, `held`, `dropped`, `blocked` |
| Older lanes | `LEGACY_LANES` | `ready_to_send`, allowed only on a closed session |
| Session phases | `PHASES` | `running`, `closed` |
| Older phases | `LEGACY_PHASES` | `awaiting_approval`, `sending`, `retro`. `validate` fails a session still in one |
| Owner tag letters | `OWNER_TAGS`, `LEGACY_SENDING_TAG` | `m` matching, `t` tailoring, `a` applying, and `x` on older sessions |
| Send list kinds | `session.SEND_KINDS` | `application` |
| Finding kinds | `FINDING_KINDS` | See section 6 |
| Finding states | `FINDING_STATES` | See section 6 |
| Contact statuses | `CONTACT_STATUSES` | `drafted`, `sent`, `accepted`, `withdrawn`, `declined`, `skipped`; `pending` takes `drafted` or `declined`. `accepted` and `withdrawn` apply to `connect` rows only. See `contacted.csv` in section 1 |
| Contact channels | `CONTACT_CHANNELS` | `message`, `inmail`, `connect`, `email` |

The channels mean these things.

| Channel | Means |
|---|---|
| `easy_apply` | LinkedIn's in-page Easy Apply form |
| `external_ats` | The posting leaves the board for an ATS form |
| `waas_message` | A message to a named founder. On Work at a Startup that message is the application |
| `outreach` | Retired 16 Oct 2026. A person, not a posting. Queue and apply both skip these rows |
| `direct` | A company's own careers page, with no board in between. A Naukri recruiter invite also uses it, because the invite is answered in Naukri's own drawer and has no ATS form |
| `unknown` | Not classified yet. Extract sets it on first read |

The statuses mean these things.

| Status | Means |
|---|---|
| `new` | Harvested. Nobody has read the JD |
| `extracted` | The JD facts are recorded. No judgement yet |
| `scored` | Triage cleared it: match and semantic at or above their floors, resume named |
| `ready` | Released from `held` by `/retro`. Apply works these first |
| `queued` | Legacy. Apply still accepts it, and nothing new writes it |
| `applied` | Submitted. `applied_date` is set |
| `held` | The form was not clean, or the candidate must decide. The reasons are in notes. Waits for `/retro` |
| `blocked_info` | The older name for `held`. Nothing new writes it |
| `skipped` | Passed on match, held for review with `HELD:`, or the listing closed |
| `wrong_job` | semantic is under `scores.semantic_floor`: the work is outside the candidate's experience |
| `dropped` | Failed a hard filter, at sweep or in the JD |

An owner tag is `<letter>-<row id>`, such as `m-2026-09-17-LI-002`. Background agents that own no
single row carry their own tags. A sweeper is `s-<source>`. It never sets `owner` on its provisional
board rows, so the tick can claim them once ingest gives them an id. `ours` 2026-10-12 `AGENT` maps
each claiming lane to its agent and model: matcher, resume-tailor and applier all run on Sonnet.

## 3. The status flow

ingest is the only command that changes `status`. Each move happens when ingest reads a stage file.

| From | To | Stage file | When |
|---|---|---|---|
| none | `new` | sweep | A row with no `drop_reason`, whose link is in neither the queue nor applied.csv |
| none | `dropped` | sweep | A row with `drop_reason` set. Only a hard filter may set it |
| `new` | `extracted` | extract | `closed` is false and `hard_fail` is empty |
| `new` | `skipped` | extract | `closed` is true |
| `new` | `dropped` | extract | `hard_fail` is set |
| override row in `dropped`, `skipped` or `wrong_job` | as the three rows above | extract | `override=yes` and `reviewed` empty |
| `extracted` | the `decision` | triage | `scored`, `skipped`, `wrong_job` or `dropped` |
| `scored` | `scored` | triage | The tailor's file names the built resume |
| `ready`, `scored` or `queued` | `applied` | apply | `outcome` is `applied` or `already_applied` |
| `ready`, `scored` or `queued` | `skipped` | apply | The listing is closed (`closed: true`, or closed wording in notes or question) |
| `ready`, `scored` or `queued` | `skipped` | apply | `outcome` is `declined`: the applier pressed Not interested on a Naukri invite. `notes` gives the reason |
| `ready`, `scored` or `queued` | `held` | apply | `outcome` is `held`, `blocked_info` or `stopped_before_submit`, and the listing is open |
| `ready`, `scored` or `queued` | unchanged | apply | `failed` adds `apply failed attempts=<n>` |
| `ready`, `scored` or `queued` | unchanged, with a new `channel` | apply | `failed` with `CHANNEL IS <channel>` in notes. See below |
| an open row | `held` | `engine.ts ingest hold` | The parent or `/retro` holds it for the candidate. Not a stage file |
| `held` or `blocked_info` | `ready`, or `scored` with `--retailor` to pick the variant again | `engine.ts ingest release` | The candidate chose submit or fix in `/retro`. Not a stage file |
| an open row | `skipped` | `engine.ts ingest skip` | The candidate chose drop in `/retro`. Not a stage file |
| `new` | `skipped` | `engine.ts ingest age` | `date_found` is more than `budgets.stale_days` days old and `override` is not `yes` |

A triage `skipped` needs match under `scores.match_floor`, or a `reason` that starts `HELD:`. A pay
band below the floor is held with `HELD: pay band below floor`, naming the band, as instructions.md
R1 row 2 says. `ours` 2026-10-12 A `skipped` row with a `HELD:` reason is closed, unlike a `held`
row, and returns only through the candidate's
`override=yes`. A `wrong_job` needs semantic
under `scores.semantic_floor`. `skipped`, `wrong_job` and `dropped` each need a `reason`.

When an override row changes status, ingest stamps `reviewed` with today's date. No tool ever
writes `override`.

The ingest commands outside the stage files are these.

1. `node process/engine.ts ingest hold <id> ... --reason R`, `ingest release <id> ...
   [--retailor]` and `ingest skip <id> ... --reason R` change held rows, as instructions.md R8 says.
   `release` sets each `held` or `blocked_info` row to `ready` and appends `unblocked <YYYY-MM-DD>`,
   or with `--retailor` sets it to `scored` with `PENDING_TAILOR`, so a tailor picks the variant
   again. Each exits 1 and writes nothing if
   an id is missing or at the wrong status. None needs an open session, and each moves the open
   session's board rows to match. `unblock` is the older name for `release`. `ours` 2026-10-16
   `node process/engine.ts ingest reopen <id> ... --reason R` takes `skipped` rows only. It sets each
   to `extracted`, empties `match`, `semantic` and the five `TRIAGE_COMPONENTS`, and appends
   `reopened <YYYY-MM-DD>: <reason>`. `queue triage` then returns the row, so the next hunt's matcher
   scores it again. It keeps `evidence` until triage overwrites it. Same exit code, lock and board
   sync as `release`. `ours` 2026-10-16 `reopen` also takes an `applied` row when `dedupe check` finds no
   applied.csv entry for it by any key (a recorded `dedupe distinct` pair counts). It sets that row to
   `ready`, empties `applied_date` and appends the same note. Otherwise it exits 1. `ours` 2026-10-28
   `node process/engine.ts ingest sent <id> ... --reason R` takes `held`, `blocked_info`, `ready` and
   `scored` rows. It records each opening with `dedupe record` when it is not recorded yet. It then sets
   the row to `applied` with today's `applied_date`, and appends `sent by hand <YYYY-MM-DD>: <reason>`.
   It has the same exit code, lock and board sync as `skip`. `ours` 2026-10-23
2. `node process/engine.ts ingest age [--dry-run]` sets every `new` row older than
   `budgets.stale_days` to `skipped` and appends `aged out, never reached`. It leaves `override=yes`
   rows alone and prints the count. The hunt runs it in step 1 after the session opens.
   `engine.ts status` lists stale `new` rows in their own section. `ours` 2026-10-12

A wrong-channel re-route is not a failure. An apply file with `outcome: failed` whose `notes`
contain `CHANNEL IS <channel>`, where the value is in `CHANNELS`, sets the row's `channel` to that
value. It adds no `apply failed attempts` note, keeps the row's status and returns its board row to
`matched`, so the same hunt can claim it again. `ours` 2026-10-12

Triage has two more rejections. ingest refuses a `scored` decision in the semantic middle band, which
is `semantic` under `scores.semantic_proceed` and `match` under `scores.semantic_middle_min_match`.
It also refuses a `scored` decision on a `waas_message` row whose `match` is under
`scores.waas_send_match_min`. Both rows are written `skipped` with a `HELD:` reason. `ours` 2026-10-12
It also refuses a `scored` decision on an `easy_apply` row whose `match` is under `scores.ea_match_floor`.
That row is written `skipped` with the reason `HELD: easy apply floor, outreach works it`
(`EA_FLOOR_REASON`). `/retro` does not count it under `Skipped under a HELD:`, and `outreach roles`
takes it as a due role. `stated` 2026-11-22

## 4. The session folder

One hunt works in one folder. `engine.ts session open` resumes the newest folder whose phase is not
`closed`, or creates a new one. `JOBHUNT_SESSION` names a folder explicitly, and the global
`--session S` flag sets it.

```
my-sessions/
  ledger/                          L, section 1
  12Oct2026-0900-hunt/             S. A second session in the same minute is <stamp>-2-hunt
    notes.md                       front-matter and body sections, section 7
    board.csv                      one row per role this session touched
    .stage/                        constants.STAGE_DIR
      sweep/    done/
      extract/  done/
      triage/   done/
      apply/    done/
    .state.json                    session.ts's working state
    .lock                          lock file (the folder .lock.d holds the lock)
```

The folder name comes from `SESSION_NAME_FORMAT` in constants.ts, with a zero-padded day and a
three-letter English month. It does not sort by date as text, so a tool orders sessions with
`constants.session_folders()`, which parses the date from the name. The older
`YYYY-MM-DD-HHMM-hunt` form and a name without a time, such as `12Oct2026-restructure`, still parse.
A folder that is not a session name, such as `ledger/`, is skipped. `ours` 2026-10-13

`process/tools/session.ts` is the only writer of notes.md, board.csv and `.state.json`. Every
write takes an exclusive lock on `S/.lock`. Agents write stage files into `.stage/<stage>/` and
call `engine.ts session ...` for everything else.

`.state.json` is internal to session.ts, and no agent reads or writes it. It holds lists of row
ids by event: `harvested`, `dropped_at_sweep`, `decided`, `scored`, `resumes`, `applied`,
and `no_reclaim`. It also holds the settled stage files, claim counts, attempts per row,
peaks per lane, sweep fields and the background tags. Its `lanes` list holds the source lanes a
`--lanes` flag on `session open` or `session new` gave, and is empty when the run works every live lane.

### The outreach, retro and profile run folders

One `/outreach` run, one `/retro` sitting and one `/profile` session each work in their own folder
beside the hunts. `engine.ts outreach open` creates it, with `--kind retro` for `<stamp>-retro` and
`--kind profile` for `<stamp>-profile`, and `engine.ts outreach` is the only writer of its `notes.md`.
Never run `session open`, `session log` or any other `session` subcommand on it, because session.ts
rewrites notes.md into the hunt layout. `/retro` is the one exception, on a closed outreach run that
`retro` lists: `session note` and `session retro-done` add the hunt sections and keep what is there.
`ours` 2026-10-18, `-retro` and `-profile` `stated` 2026-11-02

```
my-sessions/
  18Oct2026-0930-outreach/         one run. A second run in the same minute is <stamp>-2-outreach
    notes.md                       front-matter, ## Approval and ## Log
    tags.json                      tags seen on kept posts, written by outreach tag (section 5)
    .stage/outreach/               constants.STAGE_DIR / constants.OUTREACH_STAGE
      <thread-file>.md             one draft per job thread, LinkedIn or Gmail, written by inbox-reader (section 5)
      <post-file>.md               one draft per kept post, written by post-reader (section 5)
      <role-file>.md               one draft per due role, written by post-reader in roles mode (section 5)
      approval.json                the numbered list, written by outreach list
      approved.json                send (every item approved so far), held and answers, written by outreach approve
      send/<n>.txt                 the exact text for item n, written by outreach approve
    .stage/posts/                  the prospect lane's page files
      <n>.json                     one per search results page, `n` from 1, written by post-reader (section 5)
    .stage/jobs.json               roles found through posts, in the sweep row shape, written by post-reader
    .stage/mail/                   a `-retro` run only. <threadId>.md, one staged Gmail thread each, written by the /retro parent
    .stage/suggestions.md          a `-retro` run only. One line per open suggestion, written by the suggestions reader
    .stage/sweep/                  one sweep file per source per `outreach jobs` call, `<firing>-<source>-<n>.json`
    .lock                          lock file (the folder .lock.d holds the lock)
```

The front-matter holds `session`, `started`, `updated`, `phase` (`running` or `closed`),
`retro_done: yes`, and the counts `replied`, `held`, `declined` and `skipped` that `outreach close`
writes. `close` also logs the `accepted` and `withdrawn` counts in its `outreach closed:` line under `## Log`. `retro_done: yes` keeps the run out of `/retro`, which has nothing to settle in it.
`## Approval` holds each approval reply verbatim under a `### <timestamp>` heading, indented four
spaces. `## Log` holds one timestamped line per event.

A `-retro` run holds the reply drafts of both inboxes in `.stage/outreach/`, numbered by one
`outreach list`. A `-profile` run holds no draft and only records its log and any security stop. All
three kinds and a `-hunt` run take `outreach stop`, and `outreach cooldown` reads the newest stop in any of them.
`outreach close` on a `-retro` run prints `<n> ready, <m> blocked. Settle them in /retro.` for the
drafts still waiting. `stated` 2026-11-02

### board.csv

The columns are `BOARD_COLS`.

| Column | Holds |
|---|---|
| `id` | The prospects id. Empty on a sweeper's provisional row until ingest assigns one |
| `company`, `role`, `link`, `source`, `channel` | Copied from the card or the queue |
| `lane` | One of `LANES` |
| `match` | The match score, once triage has run |
| `resume` | The `resume_variant`, including `PENDING_TAILOR` or `PENDING_MESSAGE` |
| `owner` | The owner tag of the agent holding the row, or empty |
| `updated` | `YYYY-MM-DD HH:MM:SS` IST of the last change |
| `note` | Short reasons, joined with ` \| ` |

A note starting `seeded: ` marks a row that `session seed` put on the board for a run. That covers
/retro's submit path and a dashboard Rerun, Resume or Start now. A session whose board has rows, all
with `seeded: ` notes, is a run, not a hunt. A note starting `backlog: ` marks a row a hunt carried over
from the backlog. Such a row is not one that hunt found. The dashboard reads both prefixes to list only
real hunts in its Hunt sidebar. A change to either prefix must be told to the dashboard session
(Jobhunt-Dashboard). `artefact` 2026-10-24

`engine.ts session board set <id|link> k=v ...` sets fields on one row. A link that matches no row
adds a provisional row. It never moves a lane backwards, for example `matching` to `swept`. It then
prints `kept lane <lane>` and leaves that row's lane and owner alone, and `force=yes` lifts the
rule for a deliberate reset. `board set` ingests nothing. Only `tick` ingests the pending stage
files, sweep files included. `ours` 2026-10-12

`tick --returned <tag>` clears `owner` on every board row that tag holds, whatever its lane. `tick`
never claims a row for tailoring or applying while that row's matcher tag is still in flight.
`ours` 2026-10-12 `tick` and ingest move the lanes as follows.

| Event | Lane |
|---|---|
| A sweep row ingested as `new` | `swept` |
| A sweep row ingested as `dropped` | `dropped` |
| A provisional row whose link is already queued | The lane for its status (`LANE_FOR_STATUS`) |
| Claimed by `tick` | `matching`, `tailoring` or `applying`, with an owner tag |
| Extract closed or hard-failed | `dropped` |
| Triage `scored` | `matched` |
| Triage not scored | `dropped` |
| Tailor's file replaces a `PENDING` variant | `tailored` |
| Apply `held`, `blocked_info` or `stopped_before_submit` | `held`, never claimed again this session |
| Apply `applied` or `already_applied` | `sent` |
| Apply on a closed listing | `dropped`, never claimed again this session |
| Apply `declined` | `dropped`, never claimed again this session |
| Apply `failed` | `blocked`, never claimed again this session |
| Agent returned with no stage file | Back one lane (`FALLBACK`), or `blocked` after `concurrency.max_attempts` |

`tick` also caps what it claims in one hunt. It claims at most `budgets.extract` rows still at `new`
for the matching lane, inside the `budgets.triage` limit. It claims at most `budgets.waas_messages`
`waas_message` rows for tailoring, counting founder messages and not roles worked, and it keeps
claiming other channels past that cap. Rows over the cap stay `scored` with the board note
`founder cap` and lead the next hunt. `ours` 2026-10-12

`FALLBACK` sends `matching` back to `swept`, and `tailoring` and `applying` back to `matched`. An
applying row whose `PENDING` variant a tailor replaced goes back to `tailored` instead.

`tick` claims for applying only when the front-matter `go_ahead` is set, and every applier item
carries `mode=submit` and the `go_ahead` text. Without it, applying rows are counted in
`waiting_for_go_ahead` and wait for the next hunt. Seeding and every claim take only rows whose
source is live. The matching lane claims rows swept in this session first, then the backlog, each by
prelim. When the lanes drain, `held_back` counts the rows still eligible that a budget kept out, and
the tick writes it to the front-matter and the Log. Before then, `eligible_left` counts rows waiting
for a slot. `ours` 2026-10-16

## 5. Stage files

Each agent writes one JSON file per unit of work, into `S/.stage/<stage>/`. ingest folds the
pending files of a stage one at a time and validates the rows after each. A file that is malformed,
or that would leave the rows invalid, is moved alone to `S/.stage/<stage>/rejected/` with a
`<file>.reason` beside it, and ingest prints `REJECTED <stage>/<file>: <reasons>`. The other files
settle and move to `S/.stage/<stage>/done/`. A clash in `done/` gets an `HHMMSS-` prefix, so both
files are kept. If the ledger is already invalid before any file is applied, ingest writes nothing,
moves nothing and exits 1. A sweep row with a bad link is rejected alone too, to
`S/.stage/sweep/rejected/<file>` with a `reject_reason`, with one `BAD LINK` line, and the rest of the
file is ingested. The parent notes each rejection under Flags, and files a `blocked` finding for each
`BAD LINK` line. `ours` 2026-10-16

| Stage | File name | One per | Required keys (`STAGE_REQUIRED`) |
|---|---|---|---|
| sweep | `<YYYY-MM-DD>-<HH>-<source>-<n>.json`, `n` from 1 | Results page | `source`, `firing`, `rows` |
| extract | `<id>.json` | Role | `id`, `role_file`, `closed`, `channel` |
| triage | `<id>.json` | Role, and once more from the tailor | `id`, the five components, `match`, `semantic`, `evidence`, `decision` |
| apply | `<id>.json` | Role, per attempt | `id`, `outcome` |

`engine.ts validate` checks every pending file in an open session against these rules.

### sweep

`source` must be in `SOURCES`, so a split source's lane writes the source, such as `linkedin`, and
never the lane. The file name carries the lane. `firing` must look like `YYYY-MM-DD-HH` in IST, and its date becomes
the id date. Every row needs a non-empty `source`, `channel`, `company`, `role` and `link`
(`SWEEP_ROW_REQUIRED`), and `channel` must be in `CHANNELS`. A row may also carry `location`,
`work_mode`, `batch`, `salary_band`, `salary_period`, `contact`, `notes`, `drop_reason` and
`posted_at`. `posted_at` is an ISO date or date-time, such as `2026-11-02T09:41`, and R2 of `process/instructions.md` says how a sweep sets it on every row. ingest stores it in
the prospects row when it parses and otherwise leaves the column empty. The file may carry a
`queries` list. A LinkedIn card whose company will not parse is written with the
company `UNPARSED`, never empty, because ingest refuses a page file that holds an empty company. `ours` 2026-10-12

```json
{"source": "linkedin", "firing": "2026-10-12-09", "queries": ["forward deployed engineer"],
 "rows": [{"source": "linkedin", "channel": "easy_apply", "company": "Acme AI",
           "role": "Forward Deployed Engineer", "location": "Remote, India", "work_mode": "remote",
           "link": "https://www.linkedin.com/jobs/view/4400000000/", "drop_reason": null}]}
```

A Naukri invite row has `source` `naukri`, `channel` `direct` and no `drop_reason`, because the lane answers every
invite. Its `link` is `https://www.naukri.com/mnjuser/inbox#<invite key>`, where the invite key is the first 12 hex
characters of the SHA-256 of the card's `data-inviteid`, computed in the page, so the raw id never reaches the
ledger. The fragment is part of the canonical link, and `dedupe` reads the key as the `job_id`.
An agency invite that hides its client has the company `Client not named (<agency>)`, and `dedupe` skips key 3 for
it. The sweep also writes the invite's full JD to `my-sessions/ledger/roles/naukri-<invite key>.jd.md`. `stated` 2026-11-02 The `remote_boards` lane is written by `engine.ts boards sweep`, not by an agent. It writes one file, `<firing>-remote_boards-1.json`, and stages each JD at `my-sessions/ledger/roles/board-<first 12 hex of sha256 of link>.jd.md`, with `<!-- source: <link>, read <date> -->` on the first line. It reads `L/boards-fetched.json` and writes it after a real run. `--dry-run` writes nothing. `ours` 2026-11-10 The `hirist` lane's script writes `<firing>-hirist-1.json` and stages each JD at `my-sessions/ledger/roles/hirist-<job id>.jd.md`, where the job id is the trailing number of the row's link `https://www.hirist.tech/j/<slug>-<job id>`. `ours` 2026-11-26

`drop_reason` is for a hard filter only, never a score. ingest assigns the id and runs prelim. It
skips a link already in the queue or in applied.csv. It stores LinkedIn and Work at a Startup links
in canonical form. A LinkedIn job link may be `/jobs/view/<id>`, `/jobs/view/<slug>-<id>` or
`/comm/jobs/view/<id>`, with or without a query string, and is stored as
`https://www.linkedin.com/jobs/view/<id>/`. `ours` 2026-10-12

### extract

`closed` must be true or false, `id` must be non-empty and `channel` must be in `CHANNELS`.
`role_file` is the path `engine.ts queue` printed. Optional keys are `apply_url`,
`location_wording`, `remote_scope` (`anywhere`, `country:<X>` or `none`), `work_mode`, `pay`,
`seniority`, `stack` (a list), `hard_fail`, `employment_type`, `country`, `poster` and `hiring_contact`. Extract records facts and makes no judgement. A listing
marked closed is written `closed: true`, and the row becomes `skipped` with the reason
`posting closed`. It is never `dropped`. `work_mode` is left empty when neither the JD nor LinkedIn's workplace type states one.
`hard_fail` is one sentence naming the fact that failed, in the JD's terms, with no prelim number.
`ours` 2026-10-12
`poster` and `hiring_contact` are each `null` or `{"name": ..., "url": ...}`, and ingest writes them into an empty `contact`. Every one of these keys is optional, so an older extract file stays valid. `ours` 2026-11-10

```json
{"id": "2026-10-12-LI-004", "role_file": "my-sessions/ledger/roles/2026-10-12-LI-004.md",
 "closed": false, "channel": "external_ats", "apply_url": "https://boards.greenhouse.io/acme/jobs/123",
 "location_wording": "Remote (India)", "remote_scope": "country:India", "work_mode": "remote",
 "pay": "", "seniority": "senior", "stack": ["Python", "LangGraph"], "hard_fail": null,
 "employment_type": "Full-time", "country": "India", "poster": null, "hiring_contact": null}
```

ingest copies `channel` over an empty or `unknown` one and fills an empty `location` or
`work_mode`. It sets `apply_route` from the `apply_url` host on an `external_ats` row. It writes
`remote_scope`, `seniority`, `pay`, `stack`, `employment_type` and `country` into notes.

### triage

The five components, `match` and `semantic` must be integers. Each component lies between 0 and
its `MATCH_WEIGHTS` cap, and the components sum to `match`. `decision` is one of `DECISIONS`, and
section 3 gives the score rules for each. Optional keys are `reason`, `resume_variant` and
`resume_file`.

```json
{"id": "2026-10-12-LI-004", "fd_30": 24, "ai_25": 20, "reach_20": 20, "level_15": 12,
 "stack_10": 7, "match": 83, "semantic": 72, "evidence": "\"embed with customer teams\"",
 "decision": "scored", "reason": "", "resume_variant": "fde",
 "resume_file": "my-profile/resume/<variant>/<Full_Name>_CV_<Variant>.pdf"}
```

A Naukri invite id (`-NK-` in the row id) is never refused for its score. Its `scored` file passes at any
`match` and `semantic`, and the collapse, middle-band and send-bar checks do not apply. A plainly wrong invite is
written `scored` with a `reason` that starts `NOT INTERESTED:`, so the row reaches the applier, which presses
Not interested. A closed invite is written `closed: true` in its extract file, which ends the row as `skipped` with the reason
`posting closed`, and it gets no triage file. `stated` 2026-11-02

`resume_variant` follows the channel. `easy_apply`, `external_ats` and `direct` use the fixed
variant id that instructions.md R4 picks, with `resume_file` set to that variant's PDF at
`my-profile/resume/` plus the PDF cell, which may hold a subfolder. `waas_message` uses `PENDING_MESSAGE`. A board row whose resume starts with
`PENDING` is what `tick` hands to the resume-tailor, and any other non-empty value goes straight to
applying. Any decision other than `scored` writes `resume_variant` `""` and `resume_file` null, and
ingest ignores both. `resume_file` is repo-relative, starting `my-profile/` or
`my-sessions/ledger/artifacts/`. `ours` 2026-10-21

The tailor writes a second `<id>.json` for the same row, fresh in `S/.stage/triage/`. It copies the
matcher's file from `done/`, which it never edits. For `PENDING_MESSAGE` it sets `resume_variant` to
`<id>-<slug>` and `resume_file` to the message path. For `PENDING_TAILOR` it sets the re-picked
variant id and its PDF. ingest
reads a `scored` file for a row already `scored` as a resume update. It changes only
`resume_variant` and the `resume:` note.

### apply

`outcome` is one of `OUTCOMES`. `applied` needs `applied_date`. `held` needs `reasons`, a list
with one line for each clean-form rule that failed, or `question` when the bank cannot answer one.
The older `blocked_info` needs `question`. A reason for an account wall has the shape `ACCOUNT: <vendor or site> at <host>`. It is written
with outcome `held`, and R6 of `process/instructions.md` says the row is then skipped, because `OUTCOMES` has no skip outcome for it. A reason that needs a site permission is
`DOMAIN: <domain> not granted`. `declined` is for a Naukri invite whose Not interested button the applier
pressed, and it needs `notes` giving the reason. ingest settles it as `skipped` and refuses it on any other source.
Optional keys are `ledger_key`, `notes` and `closed` (true when the listing is gone). On a `waas_message` row the applier starts `notes` with `contact: <first
name>`, because the founder's name appears nowhere else. On an Easy Apply row whose button says
Apply, the applier writes `outcome: failed` with the notes `CHANNEL IS external_ats`, and ingest
re-routes the row.

```json
{"id": "2026-10-12-LI-004", "outcome": "held", "applied_date": null, "ledger_key": "",
 "reasons": ["resume claim denied by the work-portfolio.md caveats", "DOMAIN: jobs.example.com"],
 "question": null, "closed": false, "notes": "filled to review; 9 fields; not submitted"}
```

The Easy Apply, Naukri and Hirist scripts write extra keys, such as `route`, `dry_run` and `answers`, and ingest ignores them. The Naukri script adds `plan`, `drawer_buttons`, `questions` and `llm_calls`. The Hirist script adds `plan` only, and its result is `applied` or a hand-back, never `declined`. Each stages only its own real results into `.stage/apply/`, never a dry run or a hand-back.

The applier works in one pass, as instructions.md R6 says. It runs `engine.ts dedupe check` before
it opens a form, and `engine.ts dedupe reserve` just before the final submit click. After a submit
succeeds it runs `engine.ts dedupe record`, which promotes the reservation. If the page shows the
form did not go, it runs `engine.ts dedupe unreserve`. Those three are the only ledger writes an
agent makes. A `RESERVED` line from `check` gives outcome `held` with a first reason that starts
`STOPPED:`. A held form is closed without a submit and leaves no draft.

### outreach

`inbox-reader` writes one draft per job-related thread, on LinkedIn or in Gmail, to
`R/.stage/outreach/<thread-file>.md`. `<thread-file>` is the thread id with every character outside
`A-Z`, `a-z`, `0-9`, `_` and `-` replaced by `_`. The front-matter carries the exact id.

```markdown
---
thread_id: <the exact thread id; gmail:<threadId> for a Gmail reply, email:<address> for a new email>
vanity: <the /in/ handle, or empty>
name: <the sender's name>
title: <their title, or empty>
company: <their company>
asked: <one line: what they asked for>
channel: <optional; message, the default, or email for a Gmail draft>
subject: <an email draft only: the subject>
to: <an email draft only: the address to send to>
attach: <optional: a path relative to P/resume/ for the file to attach>
---

## Reply

<the reply, in the paragraphs it will be sent in>

[Q1]

<more of the reply>

## Open questions

- Q1: <a question the profile files cannot answer>

## Claims

- <each claim in the reply>: <source file>, <authority tag>
```

A second kind of line, `- held: <claim>: <source file>, <reason>`, records a claim the draft left out under the rule in `P/reply-rules.md` on reading every source, or the rule that the newer `stated` line wins. A draft with `attach` carries a `- resume attached: <path>` claims line.

`thread_id`, `name`, `company` and `asked` are required, except that `thread_id` is required only when `post_url` is absent (see Prospect drafts below). A draft with `channel: email` also needs `to` and `subject`, and a `thread_id` that starts `gmail:` or `email:`. `attach` must name a file under `P/resume/`. `## Reply` must not be empty, and
`## Claims` must be present. Write `none` under `## Open questions` when there are none. Each open
question `Q<n>` has a line `[Q<n>]` on its own in `## Reply`, where the candidate's answer
will go word for word. readDraft checks that each question has a slot and each slot has a question. It does not reject a repeated slot. `outreach list` prints `MALFORMED
<file>: <reasons>` for a draft that breaks this shape and leaves it off the list.

`outreach list` prints each item's reply and open questions, then one `Inferred: <claim>; <claim>` line holding every `## Claims` line tagged `ours`, and omits that line when there are none. It then prints one `Left out: <claim> (<reason>); <claim> (<reason>)` line holding every `held` claim line, and omits that too when there are none.

For a prospect draft, `outreach list` also prints `Channel:` and `Post:` lines under the item's first
line, and a `Subject:` line when the draft has a subject.

`outreach list` numbers the valid drafts and writes `approval.json` as `{session, items: [{n, file,
thread_id, vanity, post_url, channel, subject, name, company, to, attach, questions}]}`. Every item
carries all of those keys. A LinkedIn reply has an empty `post_url`, `subject`, `to` and `attach`, and
the channel `message`. A draft keeps the number an earlier list in the run gave it, and a new draft takes
the highest number ever given plus one, so a number never changes and never repeats. The cap
`outreach.max_replies_per_run` counts LinkedIn reply drafts only, in file-name order, with numbered
drafts first. Every valid email draft and every valid prospect draft is listed. LinkedIn drafts past the
cap stay `drafted` for the next run. When no draft is valid it prints `no drafts to approve`. `ours`
2026-11-02

`outreach approve` writes `approved.json` on each call. `/outreach` calls it once in O1c, with the prospect items' numbers. `/retro` calls it once for each approval of a reply, after it has rewritten the draft file. Either call needs only the decision line, such as `send 2`. `send` is cumulative over the run. `held` and `answers` hold this call's entries only. A call refuses an item already in `send`, and an item whose person is already sent with no follow-up pending. Items the decision does not choose are left alone, and nothing is recorded `declined`. `/retro` finds a reply draft by the `session` column of its `contacted.csv` row, which names the run folder, and then by the `thread_id` in the draft's front-matter.

`outreach close` prints the closing counts, then `<n> ready, <m> blocked. Settle them in /retro.` A draft is ready when it has no `[Q]` line and blocked when it has one or fails to read. Both stay at status `drafted`. A draft whose person has been sent to, with no follow-up pending, is in neither count, so a prospect draft that O1c sent is not counted.

```json
{
  "session": "<run>",
  "send": [{"n": 1, "thread_id": "...", "vanity": "...", "post_url": "...", "channel": "message", "subject": "", "name": "...", "company": "...", "to": "", "attach": "my-profile/resume/<file>.pdf", "text_file": "my-sessions/<run>/.stage/outreach/send/1.txt"}],
  "held": [{"n": 2, "thread_id": "...", "missing": ["Q1"]}, {"n": 3, "thread_id": "", "missing": [], "over": "over budget: invites today 11/10"}],
  "answers": [{"n": 1, "q": "Q1", "question": "...", "answer": "..."}]
}
```

`send` lists the items to send, each with the file that holds its exact text. `attach` is the repo-relative path of the file to attach, or empty, and `to` is an email item's recipient. An email item with an empty `attach` is sent by the `/retro` parent through `engine.ts mail send`, and every other item goes to the messenger (R10). Both routes run `outreach check` before the send and `outreach record` after it. `stated` 2026-11-02 `held` lists chosen
items with an open question left unanswered, chosen items whose draft no longer reads as valid, and chosen `connect` or `inmail` items the budget cannot cover. Their rows stay `drafted`, and O1c records an item over budget `skipped`. For a draft that no longer reads as valid, `missing` holds its shape errors in place of question numbers. For an item over budget, `missing` is empty and `over` holds the `over budget: <line>` text. `answers` lists every inline
answer except `drop`, including answers on held items.

The approval reply splits on line breaks only, and blank lines are dropped. A line that starts `<n>: ` answers the item's only open question, or `<n>.<k>: ` when it has more than one. The answer runs to the end of its line, semicolons included, and `<n>: drop` removes the `[Q]` line. Exactly one other line is the decision: `send all`, `send 1,3`, `all except 2` or `none`. A reply with no decision, or with two, is refused, and the reply is still logged under `## Approval`.

#### Prospect drafts

`post-reader` writes one draft per kept post to `R/.stage/outreach/<post-file>.md`. `<post-file>` is
`post-` plus the numeric id in the post's activity URN. The body is the inbox draft's body. The
front-matter changes as below. `ours` 2026-10-23

```markdown
---
post_url: https://www.linkedin.com/feed/update/urn:li:activity:<id>/
thread_id: <empty, or the exact id once a thread exists>
vanity: <the author's /in/ handle>
name: <the author's name>
title: <their title, or empty>
company: <the company the post names>
asked: <one line: the role the post announces>
channel: <message, inmail or connect>
degree: <1st, 2nd or 3rd>
fit: <strong or fit>
subject: <an inmail only, at most 200 characters>
---
```

`## Reply` holds the message, the InMail body or the connection note, exactly as it will be sent.
`## Open questions` says `none`, because a prospect draft asks the candidate nothing. A post that gives an
address does not change the draft. The post-reader files an `email` finding instead (section 6).

`readDraft` prints `MALFORMED <file>: <reasons>` for a prospect draft when:

1. It has no `post_url`, no `role_id` and no `thread_id`, or it has a `post_url` or a `role_id` and no `channel`.
2. `name`, `company` or `asked` is empty.
3. `channel` is not in `CONTACT_CHANNELS`.
4. The `channel` is `inmail` and `subject` is empty or longer than 200 characters.
5. The `channel` is `connect` and `## Reply` is longer than `prospect.note_max_chars` characters.
6. The lint finds a standalone number, a URL, an email address, an em or en dash or a pay word in the
   `subject` or `## Reply`, or finds no claim line in `## Claims`. In any draft it also finds a figure
   from the private pay or a resume version name. A private figure of one or two digits counts only
   beside a currency sign or a pay word, and the `outreach.quote_*` figures never count. The message
   names the category and never the text it matched. `outreach list` and `outreach approve` both run the lint. `ours` 2026-11-02

The engine does not check the form of `post_url`, or `degree` and `fit`. It normalises `post_url`
when it stores it, and `post-reader` writes `degree` and `fit` for the record.

The inbox rules for `## Reply` and `## Claims` apply to a prospect draft as well.

`post-reader` in roles mode writes one draft per role to `R/.stage/outreach/role-<id>.md`, where `<id>` is the prospects.csv id. Its front-matter holds `role_id` in place of `post_url`. It also holds `contact_type` (`hiring_manager`, `poster` or `recruiter`) and `applied` (`yes` when the role's status is `applied`, else `no`). Every other key and every lint rule is the post draft's. `outreach list` prints `Role: <id>` in place of `Post:`. `approval.json` and `approved.json` items carry `role_id`, empty on every other item. The engine does not check `contact_type` or `applied`. `ours` 2026-11-10

A `MALFORMED` prospect draft is left off the list and is never sent. O1c records it `skipped`. For a prospect draft, an
`approval.json` item has an empty `thread_id` until a thread exists. An `approved.json` `send` item
carries `channel`, `post_url` and `vanity`, and `subject` for an InMail. The messenger reads the
subject from there. `ours` 2026-10-23

#### Page files

`post-reader` writes one file per search results page to `R/.stage/posts/<n>.json`. `n` counts the
files in the run from 1, across both passes. A page that loads no cards is still written, with an
empty `cards` list. Every card the reader sees goes in, kept or dropped. `ours` 2026-10-23

```json
{"n": 1, "pass": "first", "page": 1, "query": "<the search URL, as outreach queries printed it>",
 "cards": [{"post_url": "https://www.linkedin.com/feed/update/urn:li:activity:<id>/",
            "author": "<name>", "vanity": "<the /in/ handle, or empty>", "headline": "<their headline>",
            "degree": "1st", "posted": "<the age the card shows>", "company": "<named in the post, or empty>",
            "role": "<announced in the post, or empty>", "location": "<as the post states it, or empty>",
            "tags": ["#hiring", "#fde"], "kept": true, "fit": "strong", "reason": "<one line>",
            "apply_link": null, "email": null}]}
```

`pass` is `first` or `all`. `page` counts from 1 within the query. These keys are required on every
card: `post_url`, `vanity`, `degree`, `tags`, `kept`, `fit` and `reason`. `degree` is the badge the
card shows, `1st`, `2nd` or `3rd`, and is empty when the card shows none. `tags` holds every hashtag
in the post as written. `fit` is `strong` or `fit` on a kept card and `null` on a dropped one.
`reason` names the failed judging rule on a dropped card. On a kept card it gives the line that
decided `fit`, and it adds any flag, such as `location unstated`.

`outreach tag --tag "#X" --post <url>` appends one entry to `R/tags.json`, a list of
`{"tag": "#X", "post_url": "<url>"}` objects. It holds the tags of kept posts that none of the four
`[prospect]` tag lists contain, with the post that carried each. The command ignores a tag that any of
the four lists already holds, and prints `known <tag>: in prospect.<list>`. It compares
case-insensitively. A tag already on that post prints `already recorded`, and a new one prints
`recorded <tag> on <post_url>`. Only `outreach tag` writes the file.
`outreach tags` reads that file from every run and lists each tag with the number of kept posts that
carried it. It prints `no unknown tags` when there are none.

#### jobs.json

A kept post that gives an apply link is also a role for the hunt. `post-reader` writes the link to
`R/.stage/jobs.json` in the sweep shape of the `sweep` stage above. The file may also be a bare list of
rows. `outreach jobs` reads the rows and the file's `firing`. It groups the rows by their own `source`. A row
that has no known source gets `source` `linkedin` written into it. A `linkedin` row with no `channel` gets
`unknown`. It writes each group to `.stage/sweep/<firing>-<source>-<n>.json` under that `source`. `firing` is
the file's own when it looks like `YYYY-MM-DD-HH`, else the date and hour in IST when it runs. It then runs the existing ingest on those files. It prints `no <path>` when the file is missing and `jobs: no rows` when it holds none. A rerun skips rows
already ingested. `ours` 2026-10-23

```json
{"source": "linkedin", "firing": "2026-10-23-09",
 "rows": [{"source": "linkedin", "channel": "unknown", "company": "Acme AI", "role": "<the title>",
           "location": "<as the post states it>", "link": "https://www.linkedin.com/jobs/view/<id>/",
           "notes": "EA UNVERIFIED; from post https://www.linkedin.com/feed/update/urn:li:activity:<id>/"}]}
```

A "View job" card gives a LinkedIn job link, so the row has source `linkedin`. A post never shows whether
the job takes Easy Apply, so the row has channel `unknown` and `EA UNVERIFIED` in `notes`, as
`process/runners/linkedin.md` says for an unverified job. `constants.laneOf` puts that row in lane
`linkedin-ex`. Never write a lane name such as `linkedin-ex` as a `source`, because ingest has no id prefix
for it. An ATS link gives source `career_page` and channel `external_ats`, because ingest rejects a
non-LinkedIn link under source `linkedin`. `career_page` is live (R9 of `instructions.md`), so the hunt claims that row
like any other. `stated` 2026-10-23 Never point `ingest --session` at `R`: `syncAfterIngest` would rewrite
`R/notes.md` into the hunt layout. `outreach jobs` hands the file to the ingest path instead.

## 6. Findings

A finding records something the engine should keep. A worker adds one with
`node process/engine.ts --session <S> finding add --json '<obj>'`, alongside its stage file and
never instead of it. session.ts appends it under `## Findings` in notes.md:

```
### F-3 · ats_domain · apply · 2026-10-12-LI-004 · open
Acme applies through a Workday host not in ats-domains.csv.
<!-- finding {"kind": "ats_domain", "stage": "apply", "id": "2026-10-12-LI-004", "source": "linkedin", "date": "2026-10-12", "summary": "Acme applies through a Workday host not in ats-domains.csv.", "evidence": "https://acme.wd5.myworkdayjobs.com/...", "proposed": {"domain": "acme.wd5.myworkdayjobs.com", "vendor": "Workday", "company": "Acme"}, "state": "open"} -->
```

The heading is `### F-<n> · <kind> · <stage> · <row id or -> · <state>`. The heading's last token
is the state. The JSON comment is the machine copy, and it carries `state` too. Only session.ts and
findings.ts edit either.

The object's keys are `FINDING_KEYS`: `kind`, `stage`, `id`, `source`, `date`, `summary`, `evidence`
and `proposed`. `kind`, `stage`, `summary` and `proposed` are required. `date` defaults to today.
Extra keys are kept. `proposed` is an object, and each kind needs these keys in it, non-empty
(`FINDING_PROPOSED`).

| Kind | When | Required in `proposed` | What the fold does |
|---|---|---|---|
| `answer_gap` | One screening question faq.md does not answer. A self-identification item is its own question | `question` | Adds `- [ ] Q-n` under `## Questions for the candidate`, then `asked` |
| `blocked` | A role that could not be applied to, or a LinkedIn security stop | `reason`, `action_for_candidate` | Adds `- [ ] Q-n BLOCKED <id>: <reason> Action: <action> (from F-m)` under `## Questions for the candidate`, then `asked`. It writes nothing under `## Flags`. `/retro` asks it in Phase 1. `stated` 2026-11-02 |
| `instruction_drift` | A file said one thing and reality was another | `file`, `said`, `found`, `fix` | Stays `open` and is printed for the parent |
| `keyword_gap` | A JD term the resume lacks | `keyword`, `jd_quote` | Adds or increments its `## Keyword gaps` line, then `folded` |
| `career_page` | A company's own careers root | `company`, `url`, `ats` | Appends to company-careers.csv when new, then `folded` |
| `ats_domain` | An apply host not yet recorded | `domain`, `vendor`, `company` | Appends to ats-domains.csv when new, then `folded` |
| `new_source` | A board that carried roles the live sources missed | `name`, `url`, `access`, `evidence_roles` | Adds a `## Proposals` entry targeting instructions.md R9, then `proposed` |
| `email` | A step decided an email is needed: an apply route that asks for a CV by email, or a hiring post that gives an address. The candidate may add one in chat | `link`, `reason`, `to`, `subject`, `body`, `attach_resume` | Adds an `## Emails` entry, then `asked`. `stated` 2026-10-24 |

A `keyword_gap` may also carry `in_portfolio` inside `proposed`, as `yes`, `no` or `partial`. The
fold writes `in portfolio: yes` only for `yes`, and `no` for anything else. `ours` 2026-10-12

```json
{"kind": "instruction_drift", "stage": "triage", "id": "2026-10-12-LI-004",
 "summary": "The runner names a filter LinkedIn no longer offers.",
 "proposed": {"file": "process/runners/linkedin.md", "said": "<what the file says>",
              "found": "<what happened>", "fix": "<the change>"}}
```

The states are `FINDING_STATES`: `open`, `folded`, `proposed`, `asked`, `applied` and `declined`.
`engine.ts findings fold` moves open findings as the table says. It exits 1 when any finding is
malformed, after printing its JSON, and `engine.ts findings list` exits 1 when any row has an error. `engine.ts finding set F-n <state>`
makes every other move. An `instruction_drift` that is a site fact becomes `applied` once a
retro-editor writes it into the runner's `## Known quirks`. One that is a rule becomes `proposed`
once its diff is under `## Proposals`. A proposal the candidate approves is applied and marked
`applied`. One the candidate refuses is marked `declined`.

An `email` finding's `id` is the row id, or `-` when no row applies. `link` is the role or post
URL. `reason` says why an email is needed and quotes the page or post. `to` is the address. `subject`
and `body` are the draft, in the R5 register. `attach_resume` is `no`, or `yes` with the resume file
(`yes: <path>`). Nothing in a hunt or an `/outreach` run reads the mailbox or sends the email. `/retro`
refines and sends it (R10, Phase 2), then closes it: `engine.ts finding set F-n applied` for a
sent email and `declined` for a dropped one. The close also moves the `EM-n` heading to `sent` or
`declined`. The send record goes in with `session note Emails "EM-n sent <IST time>, Gmail message id
<id>, approval: <the candidate's reply verbatim>"`. `stated` 2026-10-24

## 7. The notes.md schema

notes.md is flat front-matter, a `# Hunt <YYYY-MM-DD HH:MM> IST` title, then the body sections.
session.ts writes it with its own small serialiser and parser, and no YAML library.

### Front-matter

The front-matter sits between two `---` lines. Each line is `key: value`. A value is a string, an
integer, `yes` or `no`, or an inline list such as `[linkedin, waas]`. Nothing nests. A string with
unusual characters is written as a JSON string. The keys are `FRONT_MATTER_KEYS`, written in that
order. `validate` fails a session with an unknown key, or with `session`, `started`, `phase` or
`retro_done` missing. The older keys `ready_to_send`, `approved`, `outreach_sent` and
`replies_drafted` (`LEGACY_FRONT_MATTER_KEYS`) are allowed, and the next write drops them.

| Key | Type | Written by | Meaning |
|---|---|---|---|
| `session` | string | `session new` | The folder name. `validate` checks it matches |
| `started` | ISO datetime, IST | `session new` | When the hunt opened |
| `updated` | ISO datetime, IST | every write | The last write |
| `phase` | one of `PHASES` | `session phase` | Where the hunt is |
| `retro_done` | `yes` or `no` | `session retro-done` | Whether the `/retro` fold finished for this session |
| `go_ahead` | string | `session log "go-ahead: <message>"`, or `session new --go-ahead <message>` | The message that started this run, verbatim. Empty means no applier is dispatched. A resume clears it |
| `browser` | string | `session new` | `pinned <deviceId>` from `--browser` or `process/local.json`, else `none` |
| `sources_swept` | list | `session sweep` | Sources whose status is `ok`, `done`, `finished` or `complete` |
| `sources_failed` | list | `session sweep` | Sources with any other status. The reason is in `## Sweeps` |
| `roles_harvested` | int | every write | Rows ingest added from sweep files this session |
| `roles_dropped_at_sweep` | int | every write | Of those, rows dropped by a hard filter |
| `roles_matched` | int | every write | Rows triage decided |
| `scored` | int | every write | Rows triage decided `scored` |
| `resumes_built` | int | every write | Rows whose `PENDING` variant the tailor replaced |
| `applied` | int | every write | Rows whose apply outcome was `applied` |
| `held` | int | every write | Board rows in the `held` lane |
| `blocked` | int | every write | Board rows in the `blocked` lane |
| `held_back` | int | `session tick` | Rows still eligible when the lanes drained, kept out by a budget. 0 until then |
| `new_keywords` | int | every write | Distinct keywords in `## Keyword gaps` |
| `new_portals` | int | every write | Lines in `## New portals` |
| `findings_open` | int | every write | Findings in state `open` |
| `questions_open` | int | every write | Unticked lines in `## Questions for the candidate` |
| `proposals_open` | int | every write | Proposals not `applied` or `declined` |
| `background_agents` | list | every write | Background tags still in flight |
| `match_peak`, `tailor_peak`, `apply_peak` | int | every write | The most rows held at once in each claiming lane |
| `fan_out` | string | `session phase closed` | `match=<match_peak> tailor=<tailor_peak> apply=<apply_peak>`, then `; serial: <reason>` when `--serial` was given |
| `security_stop` | ISO datetime, IST | `outreach stop` | When an agent in this hunt met a LinkedIn security check. Absent until then. `outreach cooldown` reads it |

Every counter is recomputed from board.csv, the body and `.state.json` on each write. No command
sets a counter by hand.

`validate` fails a closed session whose `fan_out` is empty. It also fails one where a lane worked two or
more rows with a peak of one agent, unless `fan_out` contains `serial:`. The lane counts are
`roles_matched` for match, `resumes_built` for tailor, and `applied` plus `held` for apply. An older
session's `ready_to_send` count still counts for apply.
A serial run can close, but only by saying so. `ours` 2026-10-12

### Body sections

The sections are `NOTES_SECTIONS`, in this order. An unknown section is kept, and placed after the
known ones and before `## Log`. `engine.ts session note <section> "<text>"` appends to any section
except the engine-managed ones, which are Resume here, Send list, Findings and Log
(`MANAGED_SECTIONS`). A heading not yet in notes.md is created before `## Log`. A one-line note
becomes a `- ` bullet, and `note` prints `noted: <section>`. `session log "<text>"` prints
`logged: <text>`. `ours` 2026-10-12

| Section | Written by | Line format |
|---|---|---|
| `## Resume here` | session.ts, on every write | One to three lines: phase and lane counts, tags in flight, the next step |
| `## Sweeps` | `session sweep <source> k=v ...` | `- <source>: queries "<q>"; "<q>", <k> <v>, <status> (<reason>)`, one line per source. Repeated calls merge: each `query=` joins `queries`, `pages` and `kept` add up, other keys replace |
| `## Send list` | `session send add` | `### <n>. <title>`, then `<!-- id:<row id> kind:application -->`, then the body. One entry for every form submitted or held, and the body starts `submitted` or `held` |
| `## Decisions` | `session note` | One line per decision the candidate might question |
| `## Flags` | `session note` | NEEDS YOU items, one line each. The fold writes nothing here, because a `blocked` finding becomes a `Q-n BLOCKED` question |
| `## Findings` | `finding add`, `finding set`, the fold | The entries in section 6 |
| `## Keyword gaps` | the fold | `- <keyword> · <count> · "<JD quote>" · in portfolio: yes\|no` |
| `## New portals` | `session note` | `- <name> · <url> · found via <source> · roles <n> · access <open\|account\|captcha>` |
| `## Questions for the candidate` | the fold | `- [ ] Q-<n> <question> (from F-<m>)`, or `- [ ] Q-<n> BLOCKED <id>: <reason> Action: <action> (from F-<m>)` for a `blocked` finding. Ticked when answered, by `findings question-tick` |
| `## Proposals` | the fold, retro-editor | `### PR-<n> · <file> <section> · open\|approved\|declined\|applied`, a reason line, then a fenced diff |
| `## Emails` | the fold, `finding set` | `### EM-<n> · <to> · open\|sent\|declined`, then `- finding: F-<m>`, `- row:`, `- link:`, `- reason:`, `- subject:`, `- attach_resume:`, `- body:` and the body in a fenced `text` block. `session note Emails` adds the send record. `stated` 2026-10-24 |
| `## Carry forward` | `session note` | What the next hunt must pick up |
| `## Instruction gaps` | `session note` | One line per place a document left the agent guessing. `ours` 2026-10-12 |
| `## Log` | session.ts, on every event | `- <YYYY-MM-DD HH:MM:SS> IST  <text>`. Always last, append only |

A Send list body line that starts with `#` is stored with a leading backslash, so it cannot break
the section. Older sessions may carry `outreach` and `reply` entries and an ` approved` marker.

## 8. Application folders

`my-applications/` (`constants.APPLICATIONS`, gitignored) holds one folder for each application sent,
so the candidate has the JD, the resume and the notes in one place when a company replies. A scratch
`JOBHUNT_SESSIONS_ROOT` moves it to `<root>/my-applications/`. `engine.ts application file <id>
[--session S]` builds or refreshes one folder, and `engine.ts application list` prints the index.
Every `session tick` calls `file` for each apply stage JSON in the session, pending or in `done/`, that
has outcome `applied` and no folder yet, whether or not its agent tag has just returned. A failed
filing prints a warning, logs it and adds a `blocked` finding for `/retro`, and the tick succeeds.
`ours` 2026-11-02

```
my-applications/
  index.json                       a JSON array, one object per application, oldest first
  <applied_date>-<company>-<role>/ slugs, under 70 characters (APPLICATION_FOLDER_MAX)
    jd.md                          company, role, location, link, apply_url, then ## Job description
    <resume file>                  a copy of the resume sent, byte for byte
    <cover letter or message>      a copy of each one sent, when there was one
    notes.md                       a generated block, then ## Replies and ## Prep roadmap
```

`index.json` keys are `APPLICATION_KEYS`, in this order:

| Key | Holds |
|---|---|
| `id` | The prospects id, such as `2026-10-12-LI-021` |
| `applied_date` | `YYYY-MM-DD`, from the apply stage JSON |
| `company`, `role` | As the applied ledger holds them, else the prospects row |
| `channel`, `source` | From the prospects row |
| `match` | The match score, an integer |
| `link` | The listing |
| `apply_url` | The external form, or null for Easy Apply and when none is known |
| `folder` | The folder name, relative to `my-applications/` |
| `resume` | The file name inside the folder, or null |
| `resume_tailored` | `true` when the resume was built for this role (`<id>-<slug>`, before 21 October 2026), `false` for a fixed variant or the older `standard` |
| `status` | `applied` on creation. The candidate sets `replied`, `interview`, `rejected`, `offer` or `closed` (`APPLICATION_STATUSES`) |
| `last_update` | When the filer last ran, as an IST timestamp |

`file` is idempotent. It rebuilds `jd.md`, rewrites only the text between `<!-- generated:start -->`
and `<!-- generated:end -->` in `notes.md`, and leaves everything outside those markers alone. It
copies a resume or message only when the folder does not hold that file yet, because the copy is the
one that was sent. It keeps the `status` already in the index. When `L/roles/<id>.jd.md` is missing,
`jd.md` says so, and a JD pasted into `jd.md` by hand survives the next run.

`file` is strict: it needs the row's apply stage JSON. A row with no stage JSON, such as one sent by
hand or filed late, is filed in degraded mode instead. `engine.ts application backfill [--dry-run]`
does this for every `applied.csv` row whose id is not in the index, and `engine.ts ingest sent <id>`
does it for the row it marks. `--dry-run` prints what each row would recover and writes nothing.
Degraded mode takes only what the ledger, the role file and the other sessions still hold, and it
invents no file. `ours` 2026-11-02

1. The JD is the stored `L/roles/<id>.jd.md` when it exists. Otherwise it is the passages the
   matcher quoted in the role file, under a line that says so, and otherwise a notice that no JD was
   kept.
2. The resume copy is made only when the variant's PDF is no newer than the end of `applied_date`.
   A variant rebuilt since then is not the file that was sent. In that case `notes.md` names the
   variant and says the file that went is not recoverable.
3. The generated block in `notes.md` says the folder was backfilled and lists what is missing.

A row that names no role file and has no prospects row with its link is reported as `NOT FILED`, and
the rest still file.

The generated block holds the match and semantic scores, the triage reasoning, what the JD asks for
and where the candidate falls short (from the role file), the Send list entry as drafted, the changes
made after it (the submit run's notes and the session log's go-ahead or approval lines), and any follow-up still
owed, such as a portal registration. `Replies` and `Prep roadmap` are the candidate's.

## 9. Interview prep

`my-profile/interview-prep/` is optional. The dashboard's Prep tab reads it. The engine never
reads it and `engine.ts validate` does not check it. The shapes are the types in
`src/data/prepTypes.ts`, which is the contract.

| File | Holds |
|---|---|
| `meta.json` | `PrepMeta`: title, tab order, categories and the list of batch files in `files` |
| `glossary.json` | `GlossaryFile` |
| each name listed in `meta.json` `files` | `PrepBatchFile`: questions that merge into meta's categories |

A file that is missing or malformed shows as a problem on the Prep tab. It never stops the
dashboard. The folder in `my-profile.example/` is not loaded.
