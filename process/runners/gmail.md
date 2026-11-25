# Runner: Gmail

<!-- Runner file for sending email from /retro. Read by the messenger and the /retro parent. Not a skill, and not a hunt source. -->

## What it is

This runner sends an email the candidate approved in `/retro`: a reply in a Gmail thread, or a new
message to an address. The candidate never opens Gmail to send, because once they say send in the
sitting, Claude sends. There are two routes, and the item's `attach` picks one. `stated` 2026-11-02

1. An item with no `attach` goes through the engine's `mail send`, which calls Google's Gmail API.
   The `/retro` parent runs it, as `## Sending through the engine` says.
2. An item with an `attach` goes through the messenger in the pinned Chrome, which clicks Send itself,
   as the sections after `## Access` say.

Reading mail is a different job. `/retro` reads through the engine (`mail search`, `mail thread`)
and stages the threads, and `inbox-reader` drafts from those files. `mail attachment <messageId> --out <dir>` saves a message's attachments into `<dir>`. `ours` 2026-11-22. Every step below is `ours`
2026-11-02, and the first live send confirms or corrects each one.

No route uses a Gmail connector, because a session may start without its tools. `stated` 2026-11-22

## The engine's sign-in

The engine keeps one Google sign-in in the macOS Keychain, and `node process/engine.ts mail status`
prints its address. When a `mail` command exits 2 and names the sign-in, tell the candidate in one line
to run `node process/engine.ts mail login <client.json>` in a terminal, with the OAuth client file they
downloaded from Google. Carry on with every step that needs no mail. Never run `mail login` yourself
and never open the client file. `ours` 2026-11-22

## Sending through the engine

The parent runs these commands itself, in the sitting, once for each approved email item with an empty
`attach`. The messenger never gets such an item. Every item is a `channel: email` item whose text file
`outreach approve` wrote.

1. Run `node process/engine.ts --session <R> outreach check --thread <thread_id>`. Skip the item as
   `already sent` only when check exits 2, its `session` is the folder name of `<R>` and it prints
   `follow-up none`. In every other exit-2 case, and on exit 0, send the item. On any other exit, stop
   and send nothing further.
2. Look for a copy that already went out, because a crash can fall between the send and the record. For
   a `gmail:<threadId>` item, run `mail thread <threadId>`. For an `email:<address>` item, run
   `mail search 'in:sent to:<address> subject:"<subject>"'`, then `mail thread` for each hit. If
   a message from the candidate already holds the item's text, send nothing, run the record in step 5
   and report `SENT, NOT RECORDED: <n>`.
3. Run `node process/engine.ts --session <R> mail send --item <n>`. It takes `to`, `subject`, the text
   and the thread from the approved item, unchanged, so pass nothing else. A `gmail:<threadId>` item
   goes out as a reply in that thread. For such an item, `mail send` sends nothing and prints
   `THREAD MISMATCH` when the item's `to` wrote no message in the thread, or the subject does not match
   once `Re: ` is ignored. Report that for the item.
4. It prints `sent id <id> thread <threadId>`. Read the id. A reply that comes back with a `threadId`
   other than the item's went out as a new thread. Record it as sent all the same and say so in the report.
5. In the same step, record the send: `node process/engine.ts --session <R> outreach record --thread
   <thread_id> --name "<name>" --company "<company>" --channel email --status sent --notes "email sent,
   Gmail message id <id>"`. If the message went out and the record failed, never send it again. Report
   `SENT, NOT RECORDED: <n>` with the printed output, and run the record again.
6. An exit 2 from `mail send` means nothing went out. Put the exact text in the report. When it names
   the sign-in, the item may go again once the candidate has run `mail login`. A denied call, or any
   other failure, is never repeated in the sitting, and no other tool stands in for it. The item stays
   approved and unsent. `outreach unsent`
   lists the item while this run is open, and the next sitting runs step 2 before it sends. After the
   run closes, the row stays at `drafted`, and the item comes back as a new draft.

## Access

Pin Chrome and open your own tab as the Browser rules in R6 of `process/instructions.md` say. Open
`https://mail.google.com/`. A sign-in form, a "verify it's you" page, a CAPTCHA or the same step failing
twice stops the run and gets reported as `STOPPED: <reason>`, with the items not yet sent. Never enter
credentials.

## Sending a reply with an attachment

This serves an item with `channel: email`, a `thread_id` of the form `gmail:<threadId>` and an `attach`.
A dashboard send uses this route for every email and skips the attach step when `attach` is empty.

1. Open `https://mail.google.com/mail/u/0/#all/<threadId>`. Read the subject and the sender of the
   newest message. If the sender is not the item's `to`, or the subject does not match its `subject`
   once `Re: ` is ignored, stop that item and report `THREAD MISMATCH`.
2. Click Reply on the newest message. An inline composer opens. Check that the To chip shows the
   item's `to` and nobody else. Reply all is never used.
3. Set the body. It is the `div[role=textbox]` with the aria-label `Message Body`. Set it as
   `### Sending in a thread` step 3 in `process/runners/linkedin.md` does, from the item's `text_file`,
   line by line. Never send with a keyboard shortcut.
4. Attach the resume. Use `find` with the query `file input` and
   pick the `input[type=file]` in the composer. Run `file_upload` on it with the item's `attach` path.
   Never click the paperclip, because that opens a native picker the browser tools cannot drive. Wait
   for the attachment chip, and check that it shows the file name of `attach`. If the chip shows
   another name, or does not appear after one retry, send nothing for the item and report
   `NOT SENT: attachment not confirmed`.
5. Take a screenshot. Check the To chip, the whole body and the attachment chip. Then click Send at
   its real coordinates.
6. Confirm the "Message sent" notice, and that the thread shows your text as its newest message, with
   the file on it. Without both, the item is not recorded.
7. Open Sent, open the top message and read its id from the tab URL that `tabs_context_mcp` reports.
   Record it in `--notes`, as the messenger's `Email items` step 4 says. No command parses it.

## Sending a new email with an attachment

This serves an item with `channel: email`, a `thread_id` of the form `email:<address>` and an `attach`.

First open `https://mail.google.com/mail/u/0/#search/in%3Asent+to%3A<address>`. A message there with
the item's subject and text went out before a crash, so send nothing and report
`SENT, NOT RECORDED: <n>`.

1. Open `https://mail.google.com/mail/u/0/#inbox?compose=new`. A compose window opens.
2. Type the item's `to` in the To field and confirm it as a chip. Check that the chip shows that
   address. Set the Subject to the item's `subject`.
3. Set the body, attach the resume and send as `## Sending a reply with an attachment` steps 3 to 6 say.
4. Confirm the message as step 7 says, from the top of Sent.

## Stops

A wrong recipient chip is `THREAD MISMATCH`. An unconfirmed attachment is `NOT SENT: attachment not
confirmed`. A body that `javascript_tool` blocks part-way is cleared and reported `NOT SENT`, as
`### Sending in a thread` step 5 says. Leave an unsent compose in Gmail's Drafts, report the item as
`NOT SENT`, and the next messenger run sends it again. An unconfirmed send is never recorded as sent.

## Known quirks

A run that learns a Gmail fact files an `instruction_drift` finding against this file, and `/retro`
writes it here. None is recorded yet, because no live send has run.
