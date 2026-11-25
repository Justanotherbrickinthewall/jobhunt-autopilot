# Dashboard design

This is the design for the whole dashboard. Every screen follows it, including Learn.

## Rules

1. The rail holds two groups. Jobs holds Today, Campaigns, Hunt, Retro and Outreach. Prepare holds Interviews, Interview prep, Profile, Learn and Notebook. The app opens on Today unless the link names another place.
2. A screen never shows two rows of tabs. A second level is either one segmented control in the page bar or one row of tabs under the stat strip.
3. Each page opens with a title that states what is true now, such as "6 roles need you". A title that only names the page has failed. Interview prep keeps its question, "What do you want to prep for today?".
4. A screen has one primary action, at most. Everything occasional goes in a menu.
5. Status appears once. A row shows one status and, if it is held, one reason. No row repeats what its group heading says. In a list grouped by status, the status column shows only the reason, under the header "Reason".
6. The work area is white from the top bar down. Content sits on it with hairlines between rows. A ringed panel is kept for popovers, the rail card, the agent card and board cards. Menus, the drawer and dialogs float on `--float`. There is no card around a table and no zebra striping.
7. Navigation uses Lucide icons at 16px and stroke 1.75. Caps are allowed only at 10.5px with .1em or .12em tracking, for table headers, rail groups, stat labels, state labels and the page bar cap. CSS sets them with `text-transform`, so the source text stays in sentence case. A sub-line may join its parts with a middle dot in `--dot-sep`. There are no arrows in button text and no monospace except for code.
8. Copy is plain and in sentence case. Errors say what happened and what to do. Empty screens say what to do next. No developer text is shown, such as folder names or server restart notes.
9. The one primary button on a screen is `.btn.fill`, in `--harbor` with `--on-accent` text. The default button is white with a `--line-strong` ring and ink text. Ghost buttons are `--text-2` text. Interview prep stays nearly monochrome: inside it the accent maps to ink, so its fill button is ink and its meters are grey. The phone copy keeps its ink fill.
10. Tags, segment tags and state labels use the status tones. Neutral is `--neutral`, active is blue (`--accent` on `--blue-soft`), good is green, wait is amber, bad is red and violet is for Replied. A score is a figure beside the gradient fit bar. Tone sits only in tags, labels, dots and avatars, never as a fill on a row or a panel. A held reason is `--wait` text, and a failure is `--bad` text. A chart or a sparkline draws one series in the accent.
11. Dates read "4 Nov" in the current year and "4 Nov 2025" otherwise, through `shortDate()` and `longDate()` in `src/components/format.ts`. An ISO date never appears on screen.
12. Ledger words never appear raw. `LABELS` in `src/components/format.ts` maps every source, channel and status to a label.
13. Prose sits inside `--measure`, which is 68ch, and a group of prose is centred in its pane (L1 and L2). Reading prose in Geist is 15px on a 24px line at `--w-read`. Text at `--fs-sm` or below in `--muted` uses `--w-small`.
14. The Listen strip starts collapsed to its pill on every screen and opens when playback starts.

## Tokens

All tokens are defined once on `:root` in `src/styles/tokens.css`, each as `light-dark()`. `src/styles.css` only imports the five style files. Learn inherits them and must not redeclare them.

| Token | Light | Use |
|---|---|---|
| `--bg` | `#ffffff` | the work area and the top bar |
| `--sub` | `#f6f8f9` | the rail and board lanes |
| `--sunk` | `#f1f4f5` | the default tag, the segmented track and the fit track |
| `--line` | `#e6ebed` | every hairline |
| `--line-strong` | `#d7dfe2` | button rings and dashed filter chips |
| `--ink` | `#1d303a` | primary text |
| `--body` | `#2b3f4a` | long-form body copy |
| `--nav` | `#3e535f` | rail items |
| `--text-2` | `#5f6f78` | secondary text and icons in buttons |
| `--text-3` | `#8d9aa1` | sub-lines and caps |
| `--label` | `#93a1a8` | table headers and rail group labels |
| `--count` | `#a3afb5` | small counts |
| `--harbor` | `#244b62` | the primary button, the brand, the active icon and the active tab |
| `--accent` | `#2d6c8f` | links, the selected bar, the fit fill and sparklines |
| `--selected` | `#f3f8fb` | a selected row |
| `--good`, `--wait`, `--bad`, `--violet` | `#1c7f55`, `#9a5d07`, `#b13d36`, `#5d4fb0` | status text, each with a `-soft` background |

The hosted values come from the Sellbird study in `my-sessions/misc/07nov26-sellbird-research/design-spec.md`, part a. The dark values are ours.

`--page` is `--bg` on the dashboard and `--surface` on the phone copy. The older names stay as aliases, so component and Learn CSS keep working. `--surface` points to `--bg`, `--surface-2` to `--sunk`, `--muted` to `--text-2`, `--amber` to `--wait`, `--rose` to `--bad` and `--teal` to `--good`. The hue names `--gray` and `--slate` point to `--neutral`, `--blue` and `--cyan` to `--accent`, `--orange` to `--wait`, `--green` to `--good`, and `--red` and `--pink` to `--bad`.

Type:

- `--font-body` is Geist Variable, from `@fontsource-variable/geist`. It is used for all interface text, at a 13px base.
- `--font-display` is Newsreader Variable, from `@fontsource-variable/newsreader`. It sets paragraph prose in Learn chapters and in the passages saved from them in Notebook, and nowhere else. Prep, interview reviews and Profile are Geist.
- The page title is 14px at 500 in the page bar, after the area's cap. A heading inside content is 17px at 550. A stat figure is 28px at 400 with -.03em tracking, over a 12px sub-line in `--text-3`.
- The cap style is `.cap`: 10.5px at 500 with .12em tracking, in `--text-3`. Table headers use it at .1em in `--label`.
- The working sizes are 10.5 for caps, 11.5 and 12 for meta, 13 for cells, 13.5 for names, 14 for the page title, 17 for a heading in content and 28 for a stat figure. The `--fs-*` tokens stay for Learn and the reading screens.
- Weights are tokens, because thin text strains the candidate's eyes. `--w-text` is 450 for interface text, `--w-read` is 500 for long serif text and `--w-title` is 550 for headings. There is no 700. Nothing goes lighter than `--w-text`, and nothing sets `-webkit-font-smoothing: antialiased`, which thins text on a Mac.
- `--w-small` is 500 and `--measure` is 68ch. `--rail-w` is 226px and `--topbar-h` is 52px. `--drawer-w` is `min(640px, 100vw)`, and the drawer pushes the list aside at 1360px and above.
- `--font-mono` stays JetBrains Mono, for code only.
- The `--fs-*` scale is `--fs-xs` 12, `--fs-sm` 13, `--fs` 14, `--fs-md` 15, `--fs-lg` 16, `--fs-xl` 18, `--fs-2xl` 22 and `--fs-title` 28, each with a matching line height (16, 18, 20, 22, 24, 28, 30, 36).
- Tabular numerals on every count, score and date.

Space and shape:

- Space is `--s1` 4, `--s2` 8, `--s3` 12, `--s4` 16, `--s5` 24, `--s6` 32, `--s7` 48.
- Radii are `--r-tag` 5 for tags and chips, `--r-sm` 7 for buttons and rail items, `--r` 10 for cards and popovers and `--r-lg` 12 for the drawer. Avatars, segment tags and the waiting count are fully round.
- `--ring` is a 1px edge and a 1px drop, for cards. `--float` adds two deeper drops, for menus, the drawer and dialogs. `--shadow-2` aliases `--float`, and `--shadow-1` is the soft drop alone.
- A table header is 34px and a table row is 54px. `--row` is 40px for single-line rows elsewhere and `--row-2` is 54px. `--ctl` is 30px for buttons, or 32 in the page bar and 26 small.
- The gutter is `--gutter`, 20px. Tables, the stat strip and the filter row run the full width of the work area. A screen uses one of three layouts.

- L1. A desk runs the full width of the work area. Tables, stat strips, filter rows and the Prep room are desks.
- L1. A list and detail is for a collection whose items open one at a time. The list pane is `clamp(340px, 24vw, 480px)`. The detail pane is a size container, and its content is one group at most 1200px wide. The group is a main column at `--measure` with an optional aside of 300 to 360px beside it once the pane is 1100px wide. Below that the aside stacks under the main column.
- L1. A reading page is one long read, centred. It is an optional contents column of 220px, the reading column at `--measure` and an optional aside of 300px.
- L2. Nothing is pinned to the left with empty space beside it. A block with a cap is centred in its pane.
- L3. Geist sets every title, row, tag, button and label outside a Learn chapter's story. A Learn chapter keeps its serif prose and its 720px column.
- L4. There is one accent. Green is only the good tone in a tag or a label. Prep stays ink and grey.
- L5. Every page opens with `PageHeader`. No caps eyebrow sits over a title.
- L6. There is one tag style, the neutral `.tag`, for companies, topics and rounds. The buttons are `.btn`, `.btn.fill` and `.btn.ghost`.
- L7. No list row and no open item sits in a ring or a card. A selected row uses `--selected` and the selected bar. A row or block with a fill keeps at least `--s3` of inline padding, so text never touches the edge of its fill.

## Shell

```
+--------------------------------------------------------------------+
| Job hunt      [J] Jobs > Hunt              66/72  Live  bell search |
+--------------+-----------------------------------------------------+
| 66 applied   | HUNT | 6 roles need you   Retro has 7...   [List]   |
| [bar] [spark]+-----------------------------------------------------+
| Retro open   | ROLES 81  [Every hunt] [Sources]       [Search    ] |
|              +-----------------------------------------------------+
| JOBS         | ROLE              LOCATION   MATCH  STATUS  APPLIED |
| Today        | [G] Role title    Bengaluru  91 --  APPLIED 3 Nov   |
| Campaigns    |     Company                                         |
| Hunt      81 |                                                     |
| Retro     (7)|                                                     |
| Outreach  54 |                                                     |
| PREPARE      |                                                     |
| Interviews 3 |                                                     |
| ...          |                                                     |
| [Claude]     |                                                     |
+--------------+-----------------------------------------------------+
```

- The top bar is 52px and spans the window. It holds the brand, then the rail group as a harbor square with its initial, a chevron and the page. On the right sit the run mark, Live, Idle or Offline. There is no applied meter, because Sellbird's counts sent against a daily cap and we have no such cap. Icon buttons follow: Retro, with a red badge while questions are open, then search, the keyboard shortcuts and the theme.
- The rail is 226px on `--sub` with a 1px right line. Group labels use the cap style. An item is 32px with a 16px icon and `--nav` text at 450. The current item is white with `--ring`, its text at 500 and its icon in harbor.
- The rail card sits at the top and links to Campaigns. It shows the applied figure and the held count, a 4px bar of applied against applied plus held, and a 14-day sparkline. Its foot holds the run dot and the open run's title, or "Runs unavailable", and the LinkedIn pause time while the cooldown runs.
- A plain count is `--count` at 11px: Hunt's roles, Outreach's people, Interviews and Learn's reviews due. A count that needs the candidate is a harbor pill: Retro's open questions and the conversations that wait on him. A failure to read a ledger file shows a 6px `--alert` dot on Hunt. Campaigns shows a send icon while a run is live and an hourglass while the cooldown runs. A zero shows nothing.
- The agent card sits at the rail foot. It shows an icon tile with the run dot, the run's title or "Claude", and its last log line, or "Server not answering".
- Below 1060px the rail is a 58px icon strip and the card text hides. At 900px and below the top bar sticks, its crumb, meter and run mark hide, and the rail becomes a row that scrolls sideways.
- `PageHeader` is the 56px page bar: `cap`, a separator, `title`, an optional one-line `sub`, and `children` for the controls on the right.
- The work area's shared parts are in `src/components/ui.tsx`: `StatStrip`, `FilterRow`, `DataTable`, `Spark` and `EmptyState`. The cells are in `src/components/Chip.tsx`: `Avatar`, `Tile`, `Chip`, `SegTag`, `StateLabel`, `FitBar`, `Fraction` and `WarnMark`. Interview prep takes the frame, the rail, the icons and the type, and none of the toned cells.

## Navigation state

- `TabKey` is `today | campaigns | jobs | interviews | prep | profile | learn | notebook`. A new `JobsView` is `hunt | retro | outreach`.
- Prefs move to `hunt-board:prefs:v3`, migrating from v2: `hunt` and `retro` become `jobs` with that view. A link with no hash opens Today.
- Every saved link keeps working. `#hunt/...` and `#retro/...` open Jobs with that view. `#prep`, `#profile`, `#notebook` and `/learn/...` are unchanged. `#interviews/<folder>` is new, so interview bookmarks stop being dead links. Notebook's link pattern accepts all of them, including `#retro`.
- `/learn/interview` opens the Interview prep tab on the question bank.

## Today

Today answers what needs the candidate now. Its title counts the open Retro questions and the conversations that wait on him, as in "11 questions and 8 conversations need you", or "Nothing needs you today". The sub line is the last hunt in one sentence. The page bar's cap is Today, and its one default action is Open Retro while questions are open. Below it is the flush stat strip with four cells: Applied, with a 14-day sparkline and the count for the last 7 days; Held, with how many wait on an answer; Replies, with how many wait on the candidate; and Prep ready, with how many questions were seen. Prep ready is left out when there is no prep. Three sections follow, each a filter row and a table of up to five rows. Questions shows a company tile, the question, the first blocked role with its match bar, a kind tag and a Waiting column, and a row opens it in Retro. Conversations shows an avatar, the person, the latest note cut to one line, a channel tag, the status and the last touch, and a row opens Outreach. Prepare shows an icon tile, the last interview review, the prep quick check, the Learn reviews due and the chapter to continue, each with its next step. A section with nothing to say is left out. Today only reads and has no primary button. It adds no status: its questions are reasons under held.

## Campaigns

Campaigns is a view over the run folders. It writes nothing, and a run still starts in chat. Eight campaigns show: Full hunt, Naukri invites, Hirist, Remote boards, LinkedIn Easy Apply, LinkedIn external, Role contacts and Hiring posts. A hunt that swept two or more lanes is the Full hunt, a hunt that swept one lane is that lane's campaign, and an outreach run counts under Role contacts for its `roles` lane and under Hiring posts for its `posts` lane, so a run that worked both shows in both. Runs that fit none, such as a rerun of one held role or an inbox-only outreach run, are counted in a note under the table.

- The title counts campaigns and paused ones, as in "8 campaigns, 1 paused". Under it is the stat strip with Found, Applied, Replies and Held for the last 14 days, then a filter row and a table with one row per campaign. Each row shows a tile and two lines: the name and then the blurb, or the reason when it is paused. Its last column is a 14-day sparkline of runs started. Role contacts and Hiring posts count people drafted and messages sent in the Found and Applied columns.
- A status is Ready, Running or Paused, as a state label: Ready is neutral, Running is blue and Paused is amber. Never run is a reason under Ready. Paused is the LinkedIn security cooldown, with its end time. Running means the engine's open run belongs to the campaign.
- A campaign page has All campaigns as a ghost button in its page bar, the stat strip for its last run, and a row of tabs: Runs, Results and Settings. Runs lists each run with its start, lanes, counts, time taken and the go-ahead that started it. Results reuses Retro's funnel, sources, scores and keyword sections, cut to the rows on the campaign's boards. Settings shows the lanes, the command to start it in chat and the `inputs.toml` keys it reads, never their values.
- The list and page add no status, tag or colour beyond the tones in rule 10.

## Jobs

Hunt:

- Title is the count of held roles, as in "6 roles need you", or "Nothing needs you" at zero. The sub line is one sentence about the last hunt. This replaces `StatRow`.
- The page bar holds the List and Board control and a `Display` menu holding grouping, dropped roles and sort. Under it the filter row shows the Roles cap and count, then four dashed filter chips: the hunt, sources, statuses and match. Each chip is a menu, and an active one turns accent. Clear appears while any filter is set. Search sits on the right, and `/` focuses it.
- A board card holds a company tile, the title, the company, the lane tag and the fit bar. A held card adds its one reason. Nothing else. The board's columns are lanes on `--sub` with a state label and a count at the top, and its cards are ringed panels. A selected card has a 2px accent ring.
- The drawer is 640px wide. It covers the list below 1360px and pushes it aside above. Its head is three rows: the title with bookmark and close, then company, status, score and the posting link, then the fix buttons with the Overview, JD and Resume control. Overview opens with the status and reason. Score bars, evidence, keywords and history are collapsed sections below.
- The list is the shared table, flush on the work area. Its columns are Role, Location, Match, Status, Applied and Found. The role cell holds a company tile, the title, the lane as a segment tag and any warning dot, over the company and work mode. Status is a state label with the held reason beside it. Sort by company stays in the Display menu. As the list narrows, Applied goes first, then Location, then Found and Match.
- A selected row has `--selected` and a 2px accent bar on its left. There is no checkbox column, because no bulk action exists.
- Dropped roles are hidden until Display shows them.

Retro:

- Title is the unresolved count, as in "4 questions need you". The screen is a list and a detail desk. The list holds the unresolved items first, and the detail shows the selected item with its actions. A row's actions show only while it is selected.
- Resolved items sit in the list below the open ones. A switch in the page bar picks Questions or Numbers. The hunt numbers are behind Numbers, under a sentence heading that states the main finding.

Outreach is the Outbox. It reads `my-sessions/ledger/contacted.csv` and `outreach.csv`, and sends one approved reply per click. The title is, for example, "34 of 54 people on the list contacted, 4 replied". A switch in the page bar picks Outbox or Closed. Outbox groups people by whether they wait on the candidate or on the other person, and Closed holds the finished conversations. A list row has four lines: the name with its age, the company or the channel, the latest note, and the status. The detail is the thread, with an About card under it for the company, the channel with its last touch, and the week's invitations against the cap.

Outbox has two groups, Waiting for you and Sent, and a Closed view. Each outcome keeps one status, and a queued, running, failed or unknown send shows as one reason line in the pane, never as a new status. The conversation is plain text: mail they sent is never linked or rendered as markup. A conversation with saved copies missing says so in a plain note above the timeline.

## Interviews

The title is the count, as in "3 interviews reviewed". Under it sits the shared table, flush on the work area, with no filter row above it. A row opens the review.

- The columns are Interview, Round, Date and Result. The interview cell holds a company tile, the company and the role.
- Round is a plain tag. Result is a tag with the score out of 10: green from 7, amber from 5 and red below 5. An interview with no score says "Not scored".
- The detail has a page bar with the interview as its title, the date as its sub-line and an All interviews button.
- Under the page bar sit a stat strip and a row of tabs, both full width. The strip shows Score, Questions, Strong and To work on. The tabs are Questions, Review and Transcript.
- Questions is a list and detail. A list row is the question and its tag. The detail holds what was said, the better answer and the notes, and the aside holds the links to Prep and Learn.
- Review and Transcript are reading pages, centred, in Geist.
- The empty state tells the candidate to run `/interview` in chat.

## Interview prep

- The room stays as it is, with stronger meters: the percentage is large enough to compare down the list at a glance.
- The last row of the list is the question bank: "243 questions from your courses, with browse, drill and mock". It opens Learn's bank inside this tab, and Back returns to the room.
- All questions is a list and detail. The top of the list pane holds search, the section menu and a `More` menu with reset and print. Print still prints every question. Below them the questions are grouped by section, and a row shows the number, the title and a grey tick once practised.
- The detail shows the title and the answer. The aside holds the companies as `.tag`s, the project and tool tags, the follow-ups, one Tips section with the facts to confirm, and the practised checkbox. The open question has no ring. A follow-up opens as one plain paragraph.
- The drill is the same pattern. The list holds the drill's questions in order, with the current one selected and the rated ones ticked in grey, and a click jumps to that question. The detail holds the question, Show the answer, the answer and the rating. The aside holds the follow-ups and Tips once the answer shows.
- The question bank is a list and detail on Browse, with its filters as neutral tags above it. Random drill and Mock interview are centred reading pages.
- Listen docks at the foot of the rail, as it does in Learn. It replaces the Claude card while it is shown.
- Everything in Prep is Geist.

## Profile

The name is Profile. Its title gives the time to re-read, as in "About 12 minutes to re-read". The file switch is one segmented control. Reading text uses `--font` at 14px. Progress stays as one quiet line, and a four-cell stat strip sits above the text.

## Learn

Learn has no header of its own. The word Learn in the rail is the way home.

- Home has a title stating the next step, "Continue with chapter {n}", with one Continue button. A sentence offers the due review if any cards are due. The course list is below. There is no hero and no stat row.
- Course and chapter pages use one plain back link instead of navigation.
- Review stays in Learn, reached from that sentence and from the rail count. It reviews what chapters taught, so it belongs with them.
- Interview leaves Learn and moves to Interview prep as the question bank.

## Notebook

Title is the count, as in "84 saved passages". Collections are filter chips in a row above the list. A saved item shows the passage, its note and its source. Edit, move, tag and delete sit behind one `Edit` control on the item. "Polish with Claude" says how long it takes. The folder footer goes, and the empty state names every place that can save.

## Left out on purpose

- A booked interview on Today, because nothing writes one.
- Merging Prep's recall scale with Learn's review deck. They stay separate systems.
- Merging the two narration engines.
- Tab URLs for browser back and forward.
