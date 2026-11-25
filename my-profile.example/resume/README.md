# Resume folder

This folder holds one subfolder per fixed resume variant, and may also hold older flat files and their Overleaf copies.

## Variant folders

Each variant has its own folder, `resume/<variant>/`. It holds `<variant>.md`, `<variant>.tex` and the PDF, for example `resume/<variant>/<Full_Name>_CV_<Variant>.pdf`. `profile.md` names every variant, its PDF, its source and its status under "Resume variants". Both cells hold paths relative to `resume/`. The hunt picks one variant per role and attaches its PDF unchanged. It never builds, edits or renames a resume.

An older variant may still sit flat, with its PDF at the top level of `resume/` and its source in `resume/overleaf/`. Its table row names that path in the same way.

Replace a PDF when its source changes, and review it before it goes live. Never edit a PDF by hand.

## Source of truth

The `<variant>.md` holds the locked text, and it is the source of truth. The `<variant>.tex` follows from the `.md`, and the PDF follows from the `.tex`.

1. To change a variant, edit its `.md`, then make the same change in its `.tex`.
2. Upload the `.tex` to the Overleaf project that `profile.md` names, compile it, and replace the PDF under the path `profile.md` names.
3. To add a variant, add its row as `planned`, then set it to `live` once its PDF is here.

Overleaf only compiles. Never pull from it over a file here. If a file here differs from Overleaf, the file here is right.

`engine.ts validate` warns `STALE RESUME` when a PDF is older than its `.tex`, or a `.tex` is older than its `.md`. It fails when the variant table does not have exactly one default.

The files in `resume/overleaf/` often share one modification time, so never pick a variant by newest. Use the table in `profile.md`.
