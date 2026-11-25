# Interview prep

This folder is optional. The dashboard's Prep tab reads it. The engine does not.

## Files

- `meta.json` sets the tab order, the categories inside each tab and the list of batch files.
- `glossary.json` holds the glossary terms.
- Each file named in `meta.json` under `files` holds questions for one or more tabs.

The shapes are the types in `src/data/prepTypes.ts`. That file is the contract.

## How to generate it

Follow section R13 of `process/instructions.md`. It builds every file from `profile.md`,
`work-portfolio.md`, `faq.md` and `resume/`. Nothing may come from anywhere else.

## Rules

1. Every claim cites its source file and keeps its authority tag.
2. Numbers come only from the table of numbers that may be quoted in `work-portfolio.md`.
3. Nothing from the `## Private pay` section of `profile.md` goes in any file here.
4. Where the profile has no evidence, the answer says "No evidence yet". Never invent a story.
