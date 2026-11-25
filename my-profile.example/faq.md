# Answer bank — <Full Name>

Standing answers for screening questions on application forms and for recruiter emails. Matchers and appliers answer from this file without asking. Do not put the contents of `profile.md` under "Private pay" here.

Numbers that live in inputs.toml are not repeated in this file. A row that needs one names the key, for example "`pay.notice_days_max` in inputs.toml". Read `pay.notice_days_max` from `node process/engine.ts config`. Read any other `pay.` key from `node process/engine.ts pay value <key>`.

## Answer bank

| Question pattern | Answer | Source tag |
|---|---|---|
| Work authorisation | <countries authorised, and that sponsorship is needed elsewhere> | `stated` <date> |
| Relocation | <where, and where not> | `stated` <date> |
| Notice period | <answer, naming `pay.notice_days_max`> | `stated` <date> |
| Total experience | <years, with the start date> | `stated` <date> |
| Current location | <city, region, country> | `stated` <date> |
| Phone country code | <code, and any form default to override> | `stated` <date> |
| Employer city | <city for each employer> | `stated` <date> |
| Years with a specific skill | <see "Years rule" below> | `ours` <date> |

## Years rule

Answer a years-of-experience question from `work-portfolio.md`, in this order.

1. With direct evidence, count from the earliest project that clearly uses the skill.
2. With adjacent evidence, where the skill sits inside work the candidate clearly did, count the parent skill.
3. With no evidence, answer 1 and add the question to the gap rules below.

Never inflate a number to clear a filter. A low honest answer that screens the candidate out is the system working.

## Gap rules

1. An unknown question holds the row. If a form asks something this bank does not cover, the applier submits nothing, records the outcome `held` with the exact question, and moves on. `/retro` later asks the candidate and adds the answer to the table above. It then runs `node process/engine.ts ingest release <id>`, which sets the row to `ready`.
2. Never invent a number. A figure that is in neither this bank nor `work-portfolio.md` under "Numbers that may be quoted" is not entered. This covers years, salary, headcount, percentages and dates.

The candidate may prefer not to answer a question at all. Record that decision in the table above. "Decline, leave blank if optional, skip role if mandatory" is a valid answer, and it stops the question being raised again every run.

Some answers are never entered by any run, whatever the form requires. Examples are government tax or identity numbers and a full street address that is not in the bank. A role that requires one is `held`, and the candidate finishes it personally.
