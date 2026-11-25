import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "docai-06-long-and-composite-documents",
  course: "docai",
  number: 6,
  title: "Split the file into documents first, then pick the right unit to read",
  tagline: "A scanned tray is several documents, and a contract is read by clause.",
  minutes: 44,
  objectives: [
    "Explain why a scan holding several documents needs both page classification and boundary detection.",
    "Compare three splitting strategies by page reads and by the way each one fails.",
    "Choose the reading unit for a contract field, and merge page results without double counting.",
    "Route hard pages to a fix or a person at page level.",
    "Score a splitter with boundary precision and recall, and a file with its whole-file pass rate."
  ],
  sections: [
    {
      id: "s1-bundles",
      title: "A bundle is several documents in one file, and one extraction call can't read it",
      goal: "What does a bundle break, and what fixes it?",
      blocks: [
        {
          kind: "p",
          text: "Chapter five assumed one file is one document. Harbour's post room breaks that assumption. A clerk scans a whole tray of paper into a single file, and about 20 such files arrive each month. Last Monday's ran to 60 pages, with three supplier invoices and a supply contract."
        },
        {
          kind: "p",
          text: "A file like that is a **bundle**. The Custom Extractor from chapter two expects one invoice. Given the bundle, it reads page one well, then hunts for a total on page 13, which is the first page of a contract. The result is one confused record, and nothing flags it."
        },
        {
          kind: "p",
          // CHECKED 9 Nov 2026: https://docs.cloud.google.com/document-ai/limits
          text: "The page count is a second problem. Online processing takes 15 pages, so a 60-page file goes to batch. The Custom Extractor's batch limit is 200 pages. Batch would accept the file and still return one confused record, so the split comes first."
        },
        {
          kind: "p",
          text: "The fix is a step before extraction. **Segmenting** turns one file into a list of documents, each with a first page, a last page and a type. Extraction then runs once per entry, with the reader that fits the type."
        },
        {
          kind: "code",
          lang: "python",
          code: "from dataclasses import dataclass\nfrom typing import Literal\n\n\n@dataclass(frozen=True)\nclass Segment:\n    type: Literal[\"invoice\", \"contract\", \"other\"]\n    first_page: int\n    last_page: int\n\n\n# Monday's file, 60 pages\nsegments = [\n    Segment(\"invoice\", 1, 4),\n    Segment(\"invoice\", 5, 6),\n    Segment(\"invoice\", 7, 12),\n    Segment(\"contract\", 13, 60),\n]",
          caption: "The output of segmenting. Three invoices of 4, 2 and 6 pages make 12 pages, and the contract takes the other 48."
        },
        {
          kind: "p",
          text: "Two questions produce that list. What type is each page? Where does a new document start? **Page classification** answers the first, and **boundary detection** answers the second. You need both."
        },
        {
          kind: "p",
          text: "Classification alone labels pages 1 to 12 as invoice, and that could be one long invoice or twelve short ones. Boundary detection alone finds the splits but gives no type, so page 13 starts something unnamed."
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Give every segment its own id from the file checksum and page range",
          text: "A segment id adds the page range to the file checksum from chapter five. A rescan of identical bytes then yields the same segment ids, and the idempotent ledger write still stops a double post."
        },
        {
          kind: "quiz",
          id: "docai06-q1",
          question: "A page classifier labels pages 1 to 12 as invoice and pages 13 to 60 as contract. What does it tell you about the invoices?",
          options: [
            "That there are three, because it saw three invoice numbers.",
            "That there is one run of 12 invoice pages, with no way to say how many invoices it holds.",
            "That there are 12 invoices, one per page.",
            "That there are two, split at the contract."
          ],
          answer: 1,
          explain: "A type per page says what each page is, not where one document ends. Boundary detection supplies the cuts at pages 5 and 7."
        },
        {
          kind: "p",
          text: "Google sells a product for this job. Harbour can't use it, which makes the next section more useful."
        }
      ]
    },
    {
      id: "s2-strategies",
      title: "Three splitting strategies trade labelled data, accuracy and page reads",
      goal: "Which splitter should Harbour build, given that London has no ready-made one?",
      blocks: [
        {
          kind: "p",
          // CHECKED 9 Nov 2026: https://docs.cloud.google.com/document-ai/docs/regions and custom-splitter
          text: "Document AI's Custom Splitter returns page ranges and types in one call. Its pretrained versions aren't listed for London, so Harbour must build its own from Gemini 3.5 Flash, which is. Any splitter is judged by how it fails, and three strategies show the range."
        },
        {
          kind: "p",
          text: "The **per-page classifier** labels each page by type and merges runs of the same type. It's cheap and simple. It fails when two documents of one type sit side by side, as the three invoices do."
        },
        {
          kind: "p",
          text: "The **first-page detector** splits each type into two classes: first page and continuation. A new document starts at every first page, so it handles back-to-back invoices. It needs twice the classes, and so twice the labelling."
        },
        {
          kind: "p",
          text: "The **page-pair model** sees a page and the next page together and answers one question: are these the same document? It can compare invoice numbers, repeated headers and page counts. It's the most accurate on odd layouts, and it reads most pages twice."
        },
        {
          kind: "p",
          text: "Count the reads for Monday's file. A pair model makes 59 pair calls, one for each gap in 60 pages, and each call reads two pages. That is 118 page reads, against 60 for the other two."
        },
        {
          kind: "compare",
          // CHECK: Custom Splitter's list price was about 5 dollars per 1,000 pages from third-party summaries. https://cloud.google.com/document-ai/pricing
          caption: "Assumed cost of half a cent a page read, in dollars because vendor lists are. The failure modes differ more than the costs do.",
          columns: [
            "Strategy",
            "Page reads for 60 pages",
            "Cost",
            "Fails when"
          ],
          rows: [
            [
              "Per-page classifier",
              "60",
              "30 cents",
              "Two documents of one type sit side by side"
            ],
            [
              "First-page detector",
              "60",
              "30 cents",
              "A first page lacks its usual header, or a continuation looks like a first page"
            ],
            [
              "Page-pair model",
              "118",
              "59 cents",
              "Both pages look alike, such as two near-identical forms"
            ]
          ]
        },
        {
          kind: "p",
          text: "Scale it to Harbour's 20 files a month, which is 1,200 pages. The first-page detector costs 6 dollars and the pair model costs 11.80. The gap is 5.80 dollars a month, so cost shouldn't decide this. A mis-split costs a clerk a whole file."
        },
        {
          kind: "p",
          text: "Harbour took a hybrid path. Free cues come first: a footer such as page 2 of 4, a repeated invoice number and a matching supplier settle most gaps. The first-page detector runs on every page. Only pages below 0.8 confidence go to a pair check."
        },
        {
          kind: "p",
          text: "On Monday's file, 6 of 60 pages were uncertain, which added 12 reads. The total was 72 reads, or 36 cents."
        },
        {
          kind: "widget",
          id: "docai-bundle-splitter",
          intro: "Twelve pages, three invoices and a contract. Mark each gap as a split or keep it together. Watch the two traps: a second invoice from the same supplier, and a table that continues without a header."
        },
        {
          kind: "p",
          text: "Splitting mixed files is a realistic interview question."
        },
        {
          kind: "callout",
          tone: "interview",
          title: "A customer scans mixed paper into 60-page files. How do you split them before extraction?",
          text: "Open with the answer: segment first, then extract once per segment. Name the two jobs, page type and boundary. Compare per-page, first-page and page-pair strategies by reads and by failure. Then give the hybrid with a confidence cut-off. Interviewers push on the cost of pairs and on what happens to a mis-split."
        },
        {
          kind: "quiz",
          id: "docai06-q2",
          question: "A 60-page file is split with a page-pair model that checks every adjacent pair. How many page reads does that make?",
          options: [
            "59",
            "60",
            "118",
            "120"
          ],
          answer: 2,
          explain: "There are 59 gaps in 60 pages. Each pair call reads two pages, so 59 times 2 is 118 reads."
        },
        {
          kind: "p",
          text: "The split leaves Harbour with three invoices and a 48-page contract. An invoice works as one unit. A contract doesn't."
        }
      ]
    },
    {
      id: "s3-contracts",
      title: "A contract is read by clause and merged by rule",
      goal: "What is the right unit for a contract field, and how do page results become one record?",
      blocks: [
        {
          kind: "p",
          text: "A 48-page contract isn't an invoice with more pages. Fields hide in clauses, and clauses ignore page breaks. The page is often the wrong unit, and the whole document is usually too much."
        },
        {
          kind: "p",
          text: "Take eight fields. Reading the whole contract for each field costs 8 times 48, which is 384 page reads. Reading the contract once with a layout processor costs 48. Each field then needs only its clause, about 2 pages, so 16 more. The total is 64 reads."
        },
        {
          kind: "p",
          text: "For most customers, Layout Parser would return headings, paragraphs and tables as a tree. It isn't listed for London either. So Harbour runs Form Parser through batch, which takes up to 100 pages, and builds an outline from numbered headings such as 6.2. A clause is the span from its heading to the next of the same level."
        },
        {
          kind: "p",
          text: "Tables need a join. Schedule 1 starts on page 31 with a header row and runs onto page 32 with none. Treat page 32's table as a continuation if it opens at the top of the page and has the same column count. Append its rows before extracting."
        },
        {
          kind: "p",
          text: "Merging comes next. Invoice C in Monday's file has 6 pages. Page 1 holds the supplier, number and date. Pages 2 to 5 hold the lines. Page 6 holds the totals. Harbour reads per page, then merges by rule."
        },
        {
          kind: "p",
          text: "A running figure such as carried forward nearly caught the team out. The first merge added them to the lines. The line sums on pages 2 to 5 are 1,100, 1,100, 1,100 and 1,050, which make 4,350. Adding carried-forward figures would have given 10,950."
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's merge sheet for invoice C in Monday's file. Page sums are the worked example.",
          code: "MERGE SHEET: Monday's file, invoice C (pages 7 to 12)\n\nRule                                       Applied to\nSingle value: from the page it belongs     supplier, invoice_id, date, totals\nTwo pages disagree: review, never choose   none today\nList: join in page order, key = line no.   line items on inv pages 2 to 5\nRunning figure: check only, never a line   carried forward\nKeep page and region on every value        all\n\nInv page  Line sum   Carried forward   Running sum   Check\n2         1,100      1,100             1,100         ok\n3         1,100      2,200             2,200         ok\n4         1,100      3,300             3,300         ok\n5         1,050      4,350             4,350         ok\n6         totals     net 4,350                       ok, equals running sum"
        },
        {
          kind: "p",
          text: "Look at the Check column. The carried-forward figures are worth keeping, because each one is a free cross-field rule from chapter four. The last matches the net amount on the final page. They just must never be added up."
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer: copy this and fill it in.",
          code: "MERGE SHEET: [file], [document] (pages)\n\nRule    Applied to\n\nPage    Line sum    Running figure    Running sum    Check"
        },
        {
          kind: "widget",
          id: "docai-clause-finder",
          intro: "Five fields from one 48-page contract. Pick the unit to extract from: a page, a clause, a stitched table or the whole document. Look for the fact that crosses a page break."
        },
        {
          kind: "quiz",
          id: "docai06-q3",
          question: "Pages 2 to 5 of an invoice end with carried-forward figures of 1,100, 2,200, 3,300 and 4,350. The net on page 6 is 4,350. What do you do with the carried-forward figures?",
          options: [
            "Add them to the lines, for a safer total.",
            "Use them to check the running sum of lines, and never add them as lines.",
            "Ignore them, because they are repeats.",
            "Use the first one as the net."
          ],
          answer: 1,
          explain: "They are running totals, so they duplicate lines already counted. The last one agreeing with the net on page 6 is a free cross-field check."
        },
        {
          kind: "p",
          text: "Merging assumes each page could be read. Some pages can't be, at least first time."
        }
      ]
    },
    {
      id: "s4-hard-pages",
      title: "Hard pages need a different tool or a person, and only that page goes to review",
      goal: "Which tool handles which hard page, and how much should a clerk see?",
      blocks: [
        {
          kind: "p",
          text: "Five kinds of page defeat the default reader in scans of real paper. Each fails in its own way and has its own fix. Naming the failure tells you which tool to reach for."
        },
        {
          kind: "compare",
          // CHECKED 9 Nov 2026: Enterprise Document OCR rotation correction and handwriting; Layout Parser and regions pages. No Document AI signature detection found.
          caption: "Five hard page types, what breaks and the route. Capabilities vary by product and version, so check them before you promise anything.",
          columns: [
            "Page problem",
            "What goes wrong",
            "What handles it",
            "Route"
          ],
          rows: [
            [
              "Rotation",
              "Text comes back empty or as garbage",
              "Rotate the page and run it again, or use the rotation correction in Enterprise Document OCR",
              "Automatic retry"
            ],
            [
              "Handwriting",
              "Low word confidence, misread digits",
              "Enterprise Document OCR, which flags handwriting, or a Gemini model",
              "Review when confidence is low"
            ],
            [
              "Stamps",
              "Ink over print lowers confidence, and a received date isn't an invoice date",
              "Read the stamp as its own field",
              "Extract separately"
            ],
            [
              "Signatures",
              "Nothing to read, and the question is whether one exists",
              "A Gemini model asked whether the page is signed",
              "Presence flag, then review"
            ],
            [
              "Multi-column",
              "Lines read across the columns and sentences interleave",
              "A layout processor, or a crop per column",
              "Use layout, not raw lines"
            ]
          ]
        },
        {
          kind: "p",
          text: "Detect these from signals the pipeline already has. A rotated page returns almost no words. Mean word confidence below the threshold from chapter four marks handwriting or heavy stamps. A classifier label marks a signature page."
        },
        {
          kind: "p",
          text: "Review should be at page level. Three pages in Monday's file were hard. Page 9 was upside down. A margin on page 23 had handwritten initials. Page 60 was a stamped signature page. That's 3 of 60, or 5 percent."
        },
        {
          kind: "p",
          text: "Page 9 retried after rotating, with no person involved. The initials on page 23 carried no field, so they were ignored. Only page 60 needed a look, and the clerk saw that one page."
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Sending the whole file to review wastes the reviewer",
          text: "A file-level flag for one bad page makes a person scan 60 pages to find it. Store the hard-page flag on the page record, show that page with its boxes and let the other 59 flow through."
        },
        {
          kind: "quiz",
          id: "docai06-q4",
          question: "Page 9 returns almost no words, and the OCR result reports the page as upside down. What is the first action?",
          options: [
            "Send the whole file to review.",
            "Rotate the page and run OCR again.",
            "Lower the confidence threshold.",
            "Skip the page."
          ],
          answer: 1,
          explain: "An upside-down page is a known, mechanical fault. Rotating and retrying fixes it with no person. Review is for pages that still fail after a retry."
        },
        {
          kind: "p",
          text: "Harbour now handles the file end to end. It still has to prove the split works."
        }
      ]
    },
    {
      id: "s5-evaluating",
      title: "A splitter is judged by boundary precision and recall, and a bundle by its pass rate",
      goal: "How does Harbour know whether its splitter is good enough?",
      blocks: [
        {
          kind: "p",
          text: "Build a golden set of labelled bundles, and split it by supplier and scanner. A **boundary** is a page where a new document starts. **Boundary precision** is the share of predicted boundaries that are real. **Boundary recall** is the share of real boundaries you found."
        },
        {
          kind: "p",
          text: "Monday's file has real boundaries before pages 5, 7 and 13. Suppose the splitter predicts 5, 13, 30 and 41. Two are real, so precision is 2 of 4, or 50 percent. Recall is 2 of 3, or 67 percent."
        },
        {
          kind: "p",
          text: "Each error has a cost. The missed boundary at page 7 merges invoices B and C into one 8-page invoice. The false cuts at 30 and 41 split the contract into three pieces, and a clause that crosses a cut is lost."
        },
        {
          kind: "p",
          text: "Those two numbers score the splitter and say nothing about the file. A bundle passes only when every segment is right and every document extracts correctly. This is the document pass rate from chapter two, taken over the whole file."
        },
        {
          kind: "p",
          text: "Say each boundary is right 97 percent of the time. All three are right 0.97 cubed, which is 91.3 percent. Four documents extracting at 95 percent all pass at 0.95 to the fourth, which is 81.5 percent. Together that's about 74 percent, assuming independent errors."
        },
        {
          kind: "p",
          text: "So a 97 percent splitter and a 95 percent extractor leave about one bundle in four needing a person. Long bundles do worse. Nine boundaries pass only 0.97 to the ninth, or 76 percent of the time."
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's splitter evaluation sheet, with illustrative results from 30 labelled bundles.",
          code: "SPLITTER EVALUATION: Harbour hybrid splitter v1\nGolden set: 30 bundles, split by supplier and scanner\n\nSlice             Bundles  Boundary precision  Boundary recall  Bundle pass\nAll               30       94%                 91%              70%\nUnder 30 pages    18       97%                 95%              78%\nOver 30 pages     12       89%                 85%              58%\nPost room scanner 16       96%                 93%              75%\nWarehouse scanner 14       91%                 88%              64%\n\nDecision   Ship for bundles under 30 pages.\n           Over 30 pages: send the split to a clerk for a yes or no."
        },
        {
          kind: "p",
          text: "The All row would have shipped this. The Over 30 pages row wouldn't, and that's the row a single average hides. Harbour's decision uses a clerk's quick check on the long files, which is cheaper than unpicking a mis-split later."
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer: copy this and fill it in.",
          code: "SPLITTER EVALUATION: [splitter version]\nGolden set:\n\nSlice    Bundles    Boundary precision    Boundary recall    Bundle pass\n\nDecision"
        },
        {
          kind: "p",
          text: "Long-document questions test both the reading unit and the evidence."
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How would you extract fields from a 48-page contract, and prove the pipeline works?",
          text: "Open with the unit: a layout processor, then clause by heading, with stitched tables and a merge step. Then evidence: a golden set of labelled bundles, boundary precision and recall, field accuracy and whole-bundle pass rate, sliced by length and scanner. Interviewers push on how errors compound across boundaries."
        },
        {
          kind: "quiz",
          id: "docai06-q5",
          question: "The real boundaries are before pages 5, 7 and 13. The splitter predicts 5, 13, 30 and 41. What are boundary precision and recall?",
          options: [
            "Precision 50 percent, recall 67 percent.",
            "Precision 67 percent, recall 50 percent.",
            "Both 67 percent.",
            "Both 50 percent."
          ],
          answer: 0,
          explain: "Two of the four predictions are real, so precision is 2 of 4. Two of the three real boundaries were found, so recall is 2 of 3."
        },
        {
          kind: "fold",
          tone: "dyk",
          title: "Why bundle pass rate drops faster than either component",
          text: "Pass rates multiply. A 97 percent boundary rate over 3 boundaries is 91.3 percent. Add 4 extractions at 95 percent and it falls to about 74 percent. Each extra document in a bundle lowers the whole-bundle figure."
        },
        {
          kind: "p",
          text: "Throughout this chapter, Gemini has filled the gaps that London left. The next chapter looks properly at when a vision model should be the reader."
        }
      ]
    }
  ],
  recap: [
    "A bundle needs both page classification and boundary detection, and the output is a list of typed segments.",
    "A page-pair model reads about twice as many pages as a first-page detector, so choose on measured mis-splits.",
    "Contract fields use the clause as the unit, with stitched tables for continued rows.",
    "Merge page results by rule, and treat carried-forward figures as a check and never a line.",
    "Route hard pages to a fix or a person at page level, never the whole file.",
    "Score the splitter on boundary precision and recall, and the system on whole-bundle pass rate by slice."
  ],
  reinforcement: "I am becoming a forward-deployed AI engineer. In long and composite documents I learned to segment a bundle before extraction, read contracts by clause and merge page results by rule, and to score the split on boundary precision and recall and the bundle on pass rate. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: [
    "docai-q12",
    "docai-q13"
  ]
};

export default chapter;
