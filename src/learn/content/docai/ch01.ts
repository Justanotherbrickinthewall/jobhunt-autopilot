import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "docai-01-ocr-vs-understanding",
  course: "docai",
  number: 1,
  title: "OCR reads the words, and document understanding says which word is the total",
  tagline: "Harbour's scanned invoices need a box around every value before review gets cheaper.",
  minutes: 34,
  objectives: [
    "Say what OCR returns and what it can't tell you.",
    "Name the layers that document understanding adds on top of OCR.",
    "Decide per page whether OCR is needed at all.",
    "Store every extracted value with its confidence and its source evidence."
  ],
  sections: [
    {
      id: "s1-ocr",
      title: "OCR turns pixels into text and positions, and nothing more",
      goal: "Why does Harbour need OCR when a model already reads its scans?",
      blocks: [
        {
          kind: "p",
          text: "The LLM engineering course left Harbour Supplies with a model that reads scanned invoices well. Harbour is the fictional distributor from course 8. Its model reads about 2,000 scans a month, and 8 percent of them still go to the review queue."
        },
        {
          kind: "p",
          text: "Each of those 160 reviews takes about 3 minutes and costs 150 pence. The accounts payable lead timed ten of them. Two of the three minutes went on finding the value on the page. The model named a total, and a clerk then hunted for it."
        },
        {
          kind: "p",
          text: "That gives this course its project, **Harbour Reader**. Harbour Reader is a reading layer for scanned and awkward pages. Each value it produces can be drawn as a box on the original page. One record from course 8 set this up. It said to revisit the design if scans passed 10 percent of volume, and they're now 20 percent."
        },
        {
          kind: "p",
          text: "We'll follow one document through the course. It's a scanned invoice from Northgate Pallets, number 20418, with a net amount of 405 pounds, VAT of 81 and a total of 486."
        },
        {
          kind: "p",
          text: "A scan is a picture of a page, so a program sees pixels and no characters. **OCR**, short for optical character recognition, turns those pixels into text. A good OCR result gives pages, then lines, then words."
        },
        {
          kind: "p",
          text: "Each word carries two more things. **Confidence** is a score between zero and one. A **bounding region** is the set of corner points that place the word on the page. Those corners are what Harbour is missing."
        },
        {
          kind: "p",
          text: "OCR stops there. It doesn't know that one number is a total and another is a phone number. Everything that gives a word meaning comes from a later layer."
        },
        {
          kind: "p",
          text: "This course uses **Document AI**, Google Cloud's document processing service, because Harbour already runs on Google Cloud. Document AI calls a word a token and a region a bounding polygon. Here is the word from invoice 20418 that matters most."
        },
        {
          kind: "code",
          lang: "json",
          // CHECK: confirm the processor you use fills tokens[].layout.confidence. https://docs.cloud.google.com/document-ai/docs/reference/rest/v1/Document
          code: "{\n  \"text\": \"Total 486.00\",\n  \"pages\": [{\n    \"pageNumber\": 1,\n    \"tokens\": [{\n      \"layout\": {\n        \"textAnchor\": { \"textSegments\": [{ \"startIndex\": 6, \"endIndex\": 12 }] },\n        \"confidence\": 0.91,\n        \"boundingPoly\": { \"vertices\": [\n          { \"x\": 560, \"y\": 880 }, { \"x\": 650, \"y\": 880 },\n          { \"x\": 650, \"y\": 902 }, { \"x\": 560, \"y\": 902 }\n        ] }\n      }\n    }]\n  }]\n}",
          caption: "A simplified Document AI result, cut down to one token from invoice 20418."
        },
        {
          kind: "p",
          text: "Read it from the inside out. The token holds no characters of its own. Its anchor points at characters 6 to 12 of the text, which spell 486.00. The four vertices give the box, and a reviewer's screen can draw that box on the scan."
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Confidence describes one word and says nothing about the invoice",
          text: "A confidence of 0.91 says how sure the engine was of those character shapes. It says nothing about whether 486.00 is the right total. A clear misread, such as an eight read as a six, can still score high."
        },
        {
          kind: "quiz",
          id: "docai01-q1",
          question: "An OCR engine returns the word 486.00 with a bounding region and confidence 0.91. What can you conclude?",
          options: [
            "That the invoice total is 1,260.00.",
            "That these characters appear at that position, and the engine was fairly sure of them.",
            "That the invoice is valid.",
            "That the value is a currency amount."
          ],
          answer: 1,
          explain: "OCR gives text, position and character-level certainty. Meaning, type and validity come from later layers and from your own checks."
        },
        {
          kind: "p",
          text: "So OCR tells Harbour where 486.00 sits. It can't say that 486.00 is the amount to pay. That needs more layers."
        }
      ]
    },
    {
      id: "s2-understanding",
      title: "Document understanding adds layout, tables, pairs and fields on top of OCR",
      goal: "What does each added layer know that the one below it doesn't?",
      blocks: [
        {
          kind: "p",
          text: "**Document understanding** is OCR plus structure. It stacks layers, and each layer adds one kind of knowledge to the one below. Once you know which layer a question needs, you know what can go wrong."
        },
        {
          kind: "list",
          // CHECKED 21 Oct 2026: https://docs.cloud.google.com/document-ai/docs/processors-list
          items: [
            "**Layout analysis** groups words into paragraphs, headings and regions, and finds the reading order.",
            "Table extraction finds rows, columns and cells, so a quantity stays under its Qty header.",
            "Checkbox detection finds ticked and unticked boxes, such as a paid box.",
            "A **key-value pair** links a printed label such as Due to the value next to it.",
            "A **field** names the meaning and gives a typed value, such as `total_amount`. Document AI calls a field an **entity**."
          ]
        },
        {
          kind: "p",
          text: "Take the due date on invoice 20418. OCR gives the words Due and 14 Nov 2026 with positions. Layout says they sit in one block. A key-value pair links them. A field turns the string into the date 2026-11-14 under the name `due_date`."
        },
        {
          kind: "widget",
          id: "docai-layer-peeler",
          intro: "Step through the five layers on one Harbour Supplies invoice. Then answer four questions by picking the lowest layer that can answer each one. Watch for the question where a key-value pair is not enough."
        },
        {
          kind: "compare",
          caption: "What each layer returns for invoice 20418, and the question it still can't answer.",
          columns: [
            "Layer",
            "Returns",
            "Answers",
            "Can't answer"
          ],
          rows: [
            [
              "OCR",
              "Words, lines, positions, confidence",
              "What does the page say, and where?",
              "Which word is the total?"
            ],
            [
              "Layout and tables",
              "Blocks, reading order, cells",
              "Which value is in row two, column three?",
              "What does that column mean?"
            ],
            [
              "Key-value pairs",
              "Label and value strings",
              "What is printed next to Due?",
              "What type is the value?"
            ],
            [
              "Fields",
              "Named, typed values",
              "What is the total amount?",
              "Is the total correct?"
            ]
          ]
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Fields look authoritative, so people stop checking",
          text: "A typed field with a clean name feels like a fact. It's still a model's reading of a page. A field can be well typed and wrong, so check it against the rest of the document."
        },
        {
          kind: "quiz",
          id: "docai01-q2",
          question: "A table cell reads 12 under the header Qty. Which layer first lets you know that?",
          options: [
            "OCR, because it returns words in order.",
            "Layout and table extraction.",
            "Key-value pairs.",
            "A field model, only."
          ],
          answer: 1,
          explain: "OCR returns 12 as a word in reading order. Knowing it sits in the Qty column is table extraction."
        },
        {
          kind: "p",
          text: "Interviews often open on this difference, so have a short answer ready."
        },
        {
          kind: "callout",
          tone: "interview",
          title: "What is the difference between OCR and document understanding?",
          text: "Answer in one sentence first: OCR recognises text, and understanding recognises structure and meaning. Then go up the layers from words to fields, with the due date as your example. Close on the engineering point: keep confidence and source evidence, because validation needs to see where a value came from."
        },
        {
          kind: "p",
          text: "All of these layers start from words on a page. Some of Harbour's files already have the words, which raises the question of whether they need OCR at all."
        }
      ]
    },
    {
      id: "s3-born-digital",
      title: "Born-digital pages don't need OCR, and their text layers can still lie",
      goal: "How do you decide the reading path for each page of a file?",
      blocks: [
        {
          kind: "p",
          text: "A **born-digital** PDF was exported from software such as an accounting system. It already stores exact characters and where to draw them. This store is the **text layer**. Reading it is faster and cheaper than OCR, and nothing has to be guessed."
        },
        {
          kind: "p",
          text: "A scanned PDF has no text layer, only one image per page. A scan that went through OCR earlier may have a layer added behind the image. That layer is only as good as the OCR that made it."
        },
        {
          kind: "p",
          text: "Layers also fail without warning. A font with a broken character map produces placeholders such as (cid:41) in place of letters. A page can mix a text layer with a pasted screenshot. A layer can be empty on one page and fine on the next."
        },
        {
          kind: "p",
          text: "So the method is one measured decision per page. Count the words in the layer. Measure the share of readable characters. Measure how much of the page is covered by pictures. Then choose the cheapest route that can still be checked."
        },
        {
          kind: "p",
          text: "Harbour's IT lead asked why the decision couldn't be per file. The answer arrived the same week in a three-page PDF from Northgate Pallets. Page one was the scanned invoice 20418. Page two was a clean remittance note. Page three had a text layer full of cid codes."
        },
        {
          kind: "p",
          text: "A per-file rule would have read page three as text and passed garbage to the model. The team set three thresholds and agreed to test them on 200 pages before trusting them. This is the sheet the router wrote for that file."
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's page routing sheet for one file. A worked example, and the thresholds are Harbour's own.",
          code: "PAGE ROUTING SHEET\nFile: northgate-2026-11-03.pdf     Pages: 3\n\nRule: send to OCR if layer words < 20,\n      or readable characters < 80%,\n      or pictures cover > 50% of the page.\n\nPage  Layer words  Readable  Pictures  Route       Reason\n1     0            n/a       98%       OCR         no text layer\n2     212          96%       4%        text layer  passes all three\n3     188          31%       6%        OCR         cid codes in layer\n\nRecorded with the file: route per page, router version 1.\nThresholds checked on: 200 pages, sample drawn by the AP lead."
        },
        {
          kind: "p",
          text: "Read the last row first, because it's the one a simple check misses. Page three has plenty of words, and only the readable share caught it. The sheet also records the route, so a bad extraction later can be traced to the path it took."
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer: copy this and fill in the thresholds.",
          code: "PAGE ROUTING SHEET\nFile:              Pages:\n\nRule: send to OCR if layer words < [your floor],\n      or readable characters < [your floor],\n      or pictures cover > [your ceiling].\n\nPage  Layer words  Readable  Pictures  Route  Reason\n\nRecorded with the file: route per page, router version.\nThresholds checked on: [pages, and who drew the sample]."
        },
        {
          kind: "widget",
          id: "docai-digital-or-scan",
          intro: "Six files land in the inbox. Route each one: read the text layer, run OCR, or decide page by page. Look for the two files where the obvious answer is wrong."
        },
        {
          kind: "p",
          text: "Course 1 showed how parsers damage text, with merged columns and broken hyphens. The same damage applies to a text layer that passes this sheet."
        },
        {
          kind: "quiz",
          id: "docai01-q3",
          question: "A PDF has a text layer, but the extracted words read as cid codes. What do you do?",
          options: [
            "Use the layer anyway, because it is born-digital.",
            "Treat the layer as untrustworthy, render the page and run OCR.",
            "Reject the file as planted to trick the model.",
            "Lower the confidence threshold for this file."
          ],
          answer: 1,
          explain: "The layer exists but carries no usable characters. Rendering the page and running OCR recovers the text. Rejecting it throws away a readable invoice."
        },
        {
          kind: "p",
          text: "A mixed batch of files is a common interview question."
        },
        {
          kind: "callout",
          tone: "interview",
          title: "A mix of born-digital and scanned PDFs",
          text: "State the principle: classify each page, then route it to the cheapest path that can be verified. Say how you detect a scan: zero or low word count, or garbled text. Name the controls: record the path used, keep confidence and send failures to review. Mention that the router needs its own test set."
        },
        {
          kind: "p",
          text: "The router decides how a page gets read. Next comes what Harbour stores once it has been read."
        }
      ]
    },
    {
      id: "s4-evidence",
      title: "Every value keeps its confidence and its source evidence",
      goal: "What must be stored beside a value so that a clerk can check it in seconds?",
      blocks: [
        {
          kind: "p",
          text: "A value on its own is weak. The string 486.00 says nothing about how it was read. Harbour stores four more facts beside it: the raw text, the confidence, the page and region, and the extractor that produced it."
        },
        {
          kind: "p",
          text: "Each fact has a job. Confidence lets a gate send doubtful values to a person. The page and region let a reviewer see the source at a glance. The extractor name lets you compare two versions on the same documents later."
        },
        {
          kind: "code",
          lang: "python",
          code: "from dataclasses import dataclass\n\n\n@dataclass(frozen=True)\nclass Evidence:\n    page: int\n    region: list[tuple[int, int]]  # the corners of the bounding polygon\n    confidence: float\n\n\n@dataclass(frozen=True)\nclass Extracted[T]:\n    value: T | None  # None means not found. Never a guess.\n    raw: str  # what the page said, before normalising\n    evidence: Evidence | None\n    extractor: str  # which engine and model version produced it",
          caption: "The shape every Harbour Reader field takes."
        },
        {
          kind: "p",
          text: "The raw string has a job of its own. If a parser turns 1.260,00 into 1.26, you can see the original and fix the rule. If you stored only the number, the cause is gone."
        },
        {
          kind: "p",
          text: "The IT lead wanted the record for invoice 20418 written down before any engine was chosen. It became the contract between the reader and everything after it. Two fields are enough to show its shape."
        },
        {
          kind: "code",
          lang: "json",
          caption: "Harbour's extraction record for invoice 20418, cut to two fields. The purchase order wasn't on the page.",
          code: "{\n  \"document\": \"northgate-2026-11-03.pdf\",\n  \"page_route\": \"ocr\",\n  \"fields\": {\n    \"total_amount\": {\n      \"value\": \"486.00\",\n      \"raw\": \"486.00\",\n      \"evidence\": {\n        \"page\": 1,\n        \"region\": [[560, 880], [650, 880], [650, 902], [560, 902]],\n        \"confidence\": 0.91\n      },\n      \"extractor\": \"ocr-v1\"\n    },\n    \"purchase_order\": {\n      \"value\": null,\n      \"raw\": \"\",\n      \"evidence\": null,\n      \"extractor\": \"ocr-v1\",\n      \"reason\": \"no label or value found\"\n    }\n  }\n}"
        },
        {
          kind: "p",
          text: "Look at the purchase order. It's null with a reason, and a later stage can send a null to review. A guessed value would pass every type check and reach the ledger. A missing field costs one review, and an invented field costs a wrong payment."
        },
        {
          kind: "code",
          lang: "json",
          caption: "For your next customer: one block like this for each field.",
          code: "{\n  \"document\": \"\",\n  \"page_route\": \"\",\n  \"fields\": {\n    \"<field name>\": {\n      \"value\": null,\n      \"raw\": \"\",\n      \"evidence\": { \"page\": 0, \"region\": [], \"confidence\": 0.0 },\n      \"extractor\": \"\",\n      \"reason\": \"only when value is null\"\n    }\n  }\n}"
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Null beats a guess",
          text: "When no value is found, store null with a reason. The cost of a null is one review. The cost of a guess can be a wrong payment."
        },
        {
          kind: "quiz",
          id: "docai01-q4",
          question: "A reviewer says an invoice total looks wrong. Which stored fact gets them to the source fastest?",
          options: [
            "The model name.",
            "The page number and bounding region.",
            "The customer's name.",
            "The processing time."
          ],
          answer: 1,
          explain: "The page and region point at the exact spot on the original. The other facts help later analysis but do not locate the value."
        },
        {
          kind: "fold",
          tone: "dyk",
          title: "Why store the raw string too",
          text: "Number formats differ by country. The same page can print 1,260.00 or 1.260,00. Normalisation is code you will change. If you keep the raw text, you can replay normalisation over old documents after fixing a bug, without calling the extractor again."
        },
        {
          kind: "p",
          text: "Harbour now knows the shape of what it wants from every page. The next question is which engine can produce that shape inside Harbour's rules."
        }
      ]
    }
  ],
  recap: [
    "OCR returns words, lines, confidence and bounding regions, and nothing about meaning.",
    "Document understanding stacks layout, tables, checkboxes, key-value pairs and fields on top of OCR.",
    "A typed field is a claim to be checked.",
    "Born-digital pages need no OCR, but test the text layer per page because layers can be empty or garbled.",
    "Store confidence, page, region, raw text and extractor version with every value, and store null with a reason in place of a guess."
  ],
  reinforcement: "I am becoming a forward-deployed AI engineer. In OCR against document understanding I learned that extraction is a stack of layers, and that every value must keep its confidence and source evidence so validation can trace it. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: [
    "docai-q01",
    "docai-q02"
  ]
};

export default chapter;
