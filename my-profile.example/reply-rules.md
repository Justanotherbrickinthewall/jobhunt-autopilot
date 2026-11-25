# Reply rules

These rules decide what a reply says. `inbox-reader` follows them when it drafts a reply to a Gmail or
LinkedIn thread in /retro (R10). `post-reader` follows the ones that `process/instructions.md` R14
names for a prospect first message. Rule numbers are stable, so a reference such as "rule 6" stays
true when a rule is added at the end. Never renumber.

A rule marked `inbox only` applies to a reply in a thread someone else started. It does not apply to a
prospect first message. Anything an outside reader sees also follows R5.

Replace every starter rule with the candidate's own once /profile has asked them. The rules below are
generic and name nobody. Tag each rule `stated` when the candidate said it, `artefact` when it was read
from a message they wrote, and `ours` when it is an inference. `ours`

1. Answer a question about the candidate's work with what it does and decides. Leave out the stack and
   the pipeline steps unless the sender asked for them.
2. Use a technical term only where it is true of the candidate's work. Leave out any term the
   candidate hedged on.
3. Never claim a number, a story or a result that the profile files do not record. Draft what the files
   support, and make an open question only of what they don't.
4. A sentence no profile file records or supports becomes an open question for the candidate. It is
   never written as a fact.
5. `inbox only`. A pay ask gets the quote from `outreach.quote_*` in `inputs.toml` and nothing else. An
   absent key is an open question, never a figure. The figures under `## Private pay` in `profile.md`
   never appear in a draft.
6. After a rejection that closes the door, reply briefly and thank the sender. Ask nothing the
   candidate has not told you to ask.
7. A recruiter who declines and leaves the door open gets a plain thank-you. `stated` 2026-11-02
8. Messages follow R5 with two changes for chat. Contractions are allowed, and replies stay short.
9. A reply carries no link. The sender's name already links to the profile.
10. When two profile lines disagree, the newer `stated` line wins. Draft from it, and list the older
    line in the claims part.
11. Match the depth of the reply to the question. Short notes are for cold messages. Someone weighing
    the candidate gets the full account the files support, as long as it stays readable.
12. Read every profile source before drafting: `profile.md` up to `## Private pay`,
    `work-portfolio.md`, `faq.md`, the files in `resume/` and `interview-prep/` when it exists. A note
    that says a claim is unconfirmed keeps that claim out of the reply, even when a resume states it.
13. Credit the work at its real scope. Say "we" for decisions made with others and never claim a
    colleague's work.
14. Avoid confrontation where you can. State the candidate's own numbers and do not set them against
    what the sender wrote. Correct the sender only when they are plainly wrong and the conversation
    needs it, once, politely and plainly.
15. A message follows the one-resume rule in R5. It says "here is my resume". It never names a
    version, and the choice of file stays in `## Claims`.
16. To send a resume, set `attach:` in the draft's front-matter to a path under `resume/` and add a
    `- resume attached: <path>` claims line.
