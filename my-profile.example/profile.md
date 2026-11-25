# Profile — <Full Name>

The operating facts about one candidate. Every hunt reads this before it does anything. Replace each placeholder and delete the guidance lines when the section is filled.

Facts carry the authority tag they were established with. `stated` means the candidate said it directly. `artefact` means it was read from a repository, a website or a file. `ours` means it is an inference that can be challenged. Tag anything you add.

## Identity

Name, home city, contact details and links. Applications take these fields from here.

Example: `Name: <Full Name>. Location: <City, Region, Country>. Email: <address>. Phone: <+cc number>. LinkedIn: <url>. GitHub: <url>.` `stated`

Add a `Reply sign-off` field. Any message the candidate sends ends with it, so no agent invents one.

Example: `Reply sign-off: Regards, then <Full Name>, <+cc number> and <LinkedIn url>, each on its own line.` `stated`

## Targets

Say in prose which role the candidate wants most, which roles are also in scope, and which titles usually mean the same job. The values live in the `[targets]` table of inputs.toml (`targets.primary`, `targets.secondary`, `targets.equivalent_titles`, `targets.employment`). This section gives the reason behind them.

Example: "The main target is <role>. Also in scope: <role>, on the same rubric." `stated`

## Career and education

Employers, dates and titles, newest first, then degrees. The portfolio holds the evidence. This section holds the dates that every form asks for.

Example: `<Employer>, <City>, <MM/YYYY> to <MM/YYYY>, <title>. <Degree>, <institution>, <year>.` `stated`

## Positioning and "say this precisely"

How to describe the candidate in two or three sentences, and the exact wording for claims that are easy to overstate. Add a line for each claim that must always be phrased the same way.

Example: "Say '<precise claim>'. Never say '<inflated version>'." `ours`

## Gaps

What the candidate does not have: tools, years, domains, credentials. Writers and answer-givers use this list to avoid overclaiming.

Example: `<Skill>: none in production. Say "learning", never "experienced".` `stated`

## Engagement structure

How past work was contracted: full-time, consulting, through an agency, or on a client's behalf. Forms that ask for "employer" or "full-time months" need this.

Example: `<Engagement>, <dates>: consulting through <agency>, not full-time employment.` `stated`

## Employer figures

Checked numbers about the longest or most senior employment that may be quoted, such as revenue, team size or users. Each figure needs a source. Put figures here only if `work-portfolio.md` also lists them under "Numbers that may be quoted".

Example: `<Figure> at <Employer>, source <document or person>, checked <date>.` `artefact`

## Reachability

A table of the markets the candidate can work in. This is a hard filter. A role that fails it is dropped whatever else it scores. Keep it in step with the `[reach]` table in inputs.toml (`reach.home_tokens`, `reach.anywhere_tokens`, `reach.near_tokens`, `reach.unstated_points`, `reach.waas_foreign_remote_cap`), because the sweep scores from the keys and a reader checks the table.

| Question | Answer |
|---|---|
| Work authorisation | <countries where the candidate can work without sponsorship> |
| Will relocate | <where, and where not> |
| Fully remote, anywhere | <in scope or not, and any time-zone limit> |
| On-site or hybrid at home | <in scope or not> |
| On-site or hybrid elsewhere | <in scope or not> |

## Pay and notice

The figures are in the `[pay]` table of inputs.toml (`pay.current_inr_lakh`, `pay.expected_india_inr_lakh`, `pay.floor_abroad_usd_year`, `pay.waas_ask_usd_year`, `pay.contract_floor_usd_hour`, `pay.notice_days_max`). This section holds the public statement of expected pay, in the words an outside reader may see, and the notice position.

Example: "Expected pay depends on the employer's country. Notice is <duration>." `stated`

## Private pay

The reasoning behind the pay figures: the lowest acceptable offer, trade-offs, and what to say if pressed. Nothing here is ever quoted to an outside reader. The answer bank in `faq.md` and every form-filling agent must not read this section.

Example: `Walk-away figure: <figure>. Reason: <reason>.` `stated`

## Resume

The Overleaf project id, which compiles the variants and holds no source of truth. The `.md` of each variant in `resume/<variant>/` is the source, and `resume/README.md` explains the folder. The Default column of `## Resume variants` names the default resume, so no other section names its file.

Example: `Overleaf project id: <id>.` `artefact`

## Resume variants

The hunt never builds a resume. The matcher picks one row from this table per role, and the applier
attaches that row's PDF byte for byte. `stated` <date>

1. Status is `live`, `planned` or `retired after <YYYY-MM-DD>`. Only `live` rows, and retired rows
   before their date, are sent. A `planned` row turns `live` once its PDF is in `resume/`. A PDF cell holds a path relative to `resume/`, such as `<variant-id>/<file>.pdf`. An older variant may stay flat, with its PDF at the top level of `resume/`.
2. Exactly one row has `yes` under Default. The matcher sends it when the best fit cannot be sent.
3. On LinkedIn is the date the PDF was last on LinkedIn under the PDF's basename, or `no`. It is a note
   and not a gate. When LinkedIn does not list the file, the applier uploads it into the Easy Apply form.
4. The Source cell names the `.tex`. The `.md` beside it is the source of truth, and `validate` warns
   when the PDF is older than the `.tex`, or the `.tex` is older than the `.md`.

| Variant | PDF in `resume/` | Source in `resume/` | Targets | Status | Default | On LinkedIn | Tag |
|---|---|---|---|---|---|---|---|
| `<variant-id>` | `<variant-id>/<Full_Name>_CV_<Variant>.pdf` | `<variant-id>/<variant-id>.tex` | <role titles or title signals> | live | yes | <YYYY-MM-DD> | `stated` <date> |
| `<variant-id>` | `<variant-id>/<Full_Name>_CV_<Variant>.pdf` | `<variant-id>/<variant-id>.tex` | <role titles or title signals> | planned | | no | `stated` <date> |

## Accounts

One line for each source: whether the candidate holds an account, and how a run reaches it. List current facts only. No run enters a credential. Every source is reached through a browser session already open or a connector already authorised.

| Source | Account | Reached how |
|---|---|---|
| LinkedIn | <yes or no, handle> | <the signed-in Chrome profile> |
| Work at a Startup | <yes or no> | <the signed-in Chrome profile> |
| Gmail | <address> | `engine.ts mail`, signed in once with `mail login` |

## Sync surfaces

The places where the resume or story is copied: LinkedIn profile, Work at a Startup profile, Naukri, Simplify. Record the current state of each, and any open item such as a saved alert that still needs setting up.

Example: `LinkedIn headline matches the default resume as of <date>. Open: saved alert for <role>.` `ours`

Naukri last changed: <YYYY-MM-DD>

`/profile` reads the line above at the start of every run. It offers a small Naukri change when the date is older than `budgets.naukri_refresh_days`, and it sets the line to the day of any Naukri write.
