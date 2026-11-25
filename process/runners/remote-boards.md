<!-- Runner for source and lane remote_boards. Read by the matcher and applier agents. The harvest is an engine command, so no sweep agent reads it. -->
# Remote boards

## What it is

Four public remote job boards, read as one lane: Remote OK, Himalayas, Remotive and We Work Remotely. The candidate takes fully remote work for an employer in any country, paid in any currency, in any time zone. Hourly contract work counts as much as full-time work. `stated` 2026-11-10

## Access

Each board publishes a free feed that needs no account and no login. The feed URLs are the `[boards]` keys in `inputs.toml`. The applier opens job pages in the pinned Chrome. Remote OK and Remotive ask for a link back and their name as the source. Remotive forbids passing its jobs to third-party sites and advises at most four feed requests a day. This tool is private to one candidate and republishes nothing, and a row's link is the board's own page. `artefact` 2026-11-10

## Harvest

`node process/engine.ts --session <S> boards sweep` fetches the feeds, filters them and writes one sweep file. The parent runs it in step 2. It drops a row at harvest only on a structured field: a location list with no reachable place, or part-time work. It never drops for a time zone. It stages each kept JD at `my-sessions/ledger/roles/board-<hash>.jd.md`. The board's name is in the row's `batch` and in its notes as `feed: <name>`. `ours` 2026-11-10

Himalayas pages stop at an empty page or when the offset reaches `totalCount`. `artefact` 2026-11-10

## JD reading

The matcher reads the staged JD and opens no browser. A board's "Worldwide" or "Anywhere" tag is not proof. Read the JD's own eligibility words. Drop the role under R1 when it hires only in named countries or regions that leave out India, or needs work authorisation outside India. A role that hires contractors anywhere, or hires through an employer of record, passes. A time-zone or working-hours requirement never drops a role and never lowers reach. `stated` 2026-11-10

## Money rule

Compare a band only after turning it into US dollars. Convert another currency at a rate you name in the Score breakdown, with its date. `ours` 2026-11-10

1. An hourly band goes to `pay below hourly <top>`. A day rate is divided by 8 and a weekly rate by 40 first.
2. A monthly band is multiplied by 12, and a yearly band goes to `pay below abroad <top>`.
3. A band in rupees follows the LinkedIn runner's money rule.
4. Pay per task or per word, or a band with no period, is decision row 5.
5. No band is not a drop.
6. When `pay below` exits 2 because a key is missing, hold the row under decision row 5 and name the key in the reason.

`ours` 2026-11-10

## Apply

The applier follows `external-ats.md`. It opens the row's link, the board's job page, and follows the board's Apply link to the employer. The employer's host is the apply route. A Remote OK Apply link passes through `remoteok.com/l/<id>`. Never apply on the board itself unless the board's page is the only form. `ours` 2026-11-10

On Remote OK the feed's `apply_url` equals `url`, so the feed gives no employer link. The applier opens `url` and clicks its Apply button. `artefact` 2026-11-10

"How did you hear about this job?" gets the board's name from the row's `batch`. `stated` 2026-11-10

## Email asks

A job whose only route is an email address writes an `email` finding with the address, the role and the JD path, under standing rule 10. `ours` 2026-11-10

## Known quirks

- Himalayas and We Work Remotely job pages refuse a plain fetch, so the feed's description is the JD. `artefact` 2026-11-10
- We Work Remotely's `region` tag is the eligibility field, and `USA Only` is common. The `state` tag is not reliable: one item named a US state under `Anywhere in the World`. `artefact` 2026-11-10
- Remote OK sometimes carries a salary in the hundreds of millions. The harvest drops a band outside the bounds the engine keeps in code, not in `inputs.toml`. `artefact` 2026-11-10
- Remote OK salaries carry no currency or period. A value of 0 means no salary was given. `artefact` 2026-11-10
- Himalayas `pubDate` is an integer epoch in seconds, not a date string. `artefact` 2026-11-10
- With `worldwide=true`, Himalayas `locationRestrictions` is empty on every job checked. A full `timezoneRestrictions` list means no time-zone limit, and a short list is a real limit. `artefact` 2026-11-10
- Remotive delays its feed by 24 hours. `artefact` 2026-11-10

## Open findings

None yet.
