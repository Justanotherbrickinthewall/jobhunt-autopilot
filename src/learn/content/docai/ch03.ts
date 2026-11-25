import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "docai-03-alternatives",
  course: "docai",
  number: 3,
  title: "Hard constraints pick the reader before accuracy does",
  tagline: "Harbour routes each document to the cheapest reader that its rules allow and its checks can verify.",
  minutes: 34,
  objectives: [
    "Name the realistic alternatives to Document AI and what each is best at.",
    "Apply constraints such as offline use and data residency before comparing accuracy.",
    "Explain why a vision model needs validation more than any other reader.",
    "Write a routing table that sends each class of document to the cheapest reader that works."
  ],
  sections: [
    {
      id: "s1-native",
      title: "Native PDF parsing wins for born-digital files",
      goal: "Which of Harbour's documents should never reach Document AI?",
      blocks: [
        {
          kind: "p",
          text: "Chapter two gave Harbour a trained processor, and a processor has a fee per page. Sending 12,000 documents a month through it would be a waste. Most of them never needed reading in the first place."
        },
        {
          kind: "p",
          text: "If a PDF was exported from software, its characters are already there. A **native parser** reads them directly. The result is exact, instant and free. Harbour's 8,000 born-digital invoices a month already take this path, and they should stay on it."
        },
        {
          kind: "p",
          // CHECKED 17 Oct 2026: https://pypdf.readthedocs.io/ ; https://github.com/jsvine/pdfplumber ; https://pymupdf.readthedocs.io/
          text: "Three Python libraries cover most needs. pypdf is a lightweight reader for text and metadata. pdfplumber adds word positions and table detection. PyMuPDF is fast, returns text blocks with coordinates and can render pages to images."
        },
        {
          kind: "p",
          text: "Native parsing gives you words and positions, and you still need rules or a model to find the total. Its limits are those from chapter one. A missing layer, a garbled layer and a page that's secretly an image all defeat it."
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Native text can feed a model as well",
          text: "A common design reads the text layer natively and sends the text to a language model with a schema. You skip OCR and still get fields. The value strings come from the page, and you pay only for text tokens."
        },
        {
          kind: "quiz",
          id: "docai03-q1",
          question: "Born-digital invoices arrive with a clean text layer. What is the cheapest extractor that is still accurate?",
          options: [
            "A vision model on every page.",
            "A native PDF parser, followed by validation.",
            "Tesseract on rendered pages.",
            "Train a custom extractor."
          ],
          answer: 1,
          explain: "The characters already exist. Reading them avoids OCR error and cost. Validation still applies, because parsing does not give you fields."
        },
        {
          kind: "p",
          text: "Native parsing covers the easy majority. The first hard case at Harbour is a site that can't call any cloud at all."
        }
      ]
    },
    {
      id: "s2-tesseract",
      title: "Tesseract suits plain pages and places with no network",
      goal: "When does a free OCR engine do the job?",
      blocks: [
        {
          kind: "p",
          text: "**Tesseract** is an open source OCR engine. It runs on your own machine, costs nothing per page and needs no network. That makes it the default when a site is offline or data may not leave the building."
        },
        {
          kind: "p",
          text: "It's strong on clean, upright, printed text. It's weak on tables, multi-column pages, handwriting, skewed photos and low-resolution scans. It returns text with positions and knows nothing about layout or fields."
        },
        {
          kind: "list",
          items: [
            "Preprocessing does most of the work: deskew, denoise, raise contrast and render at a sensible resolution.",
            "Tell it the language, because the wrong language pack lowers accuracy.",
            "Keep word confidence, and send low-confidence pages to review.",
            "Expect to write your own table and field logic on top."
          ]
        },
        {
          kind: "p",
          text: "Harbour's bonded warehouse runs on a closed network and scans about 300 plain delivery notes a month. A delivery note lists what a supplier shipped. Tesseract fits those pages, with a simple rule that finds the delivery number. It wouldn't fit a supplier statement full of nested tables."
        },
        {
          kind: "quiz",
          id: "docai03-q2",
          question: "A secure site has no internet and prints plain scanned delivery notes. Which option fits the constraint first?",
          options: [
            "Document AI.",
            "A vision model API.",
            "Tesseract running locally.",
            "Another managed cloud OCR service."
          ],
          answer: 2,
          explain: "Offline rules out every cloud service, Document AI included. Among local options, Tesseract suits plain text."
        },
        {
          kind: "p",
          text: "Tesseract is the cheap end of the range. The other end is the model that already reads Harbour's scans."
        }
      ]
    },
    {
      id: "s3-vlm",
      title: "Vision models read hard layouts and can invent values",
      goal: "What has to surround a vision model before you can trust it?",
      blocks: [
        {
          kind: "p",
          // CHECKED 9 Nov 2026: Gemini endpoint and UK residency, see LLM course chapter five sources.
          text: "A vision model, from course 10, takes a page image and a prompt and answers in text. Harbour already uses Gemini 4 Argon for scans, in London. Stamps, handwriting, odd tables and mixed languages suit it. A new document type becomes a prompt change, with no labelling project."
        },
        {
          kind: "p",
          text: "The weakness is that it generates. A model can return a plausible total that's on no page. It can fix a typo you wanted preserved. It gives no word-level confidence or bounding regions by default. A wrong answer looks the same as a right one."
        },
        {
          kind: "list",
          items: [
            "Ask for values copied from the page, with null when absent, and forbid guessing in the prompt.",
            "Require a source quote for each value, and check that the quote appears in the OCR or text-layer text.",
            "Run the same checks across fields as for any reader.",
            "Send doubtful cases to review, never to the ledger."
          ]
        },
        {
          kind: "p",
          text: "Cost and latency differ too, because each page is a heavy input and a slow call. Chapter seven puts numbers on that. For now the point is that a model is a poor default for a whole batch."
        },
        {
          kind: "callout",
          tone: "warn",
          title: "The more fluent the reader, the stricter the checks",
          text: "The more capable the reader, the more fluent its mistakes. A Tesseract error looks like garbage and gets caught. A model error looks like a valid invoice. Put your strictest checks after the most fluent reader."
        },
        {
          kind: "quiz",
          id: "docai03-q3",
          question: "A vision model returns an invoice total of 1,260.00, but no line items sum to it and the page shows 1,206.00. What went wrong?",
          options: [
            "Nothing, the model is confident.",
            "The model produced a plausible value that the page does not support, which a cross-field check or source quote check should catch.",
            "The page was planted to trick the model.",
            "The currency was wrong."
          ],
          answer: 1,
          explain: "Models can transpose or invent digits fluently. A rule that checks the sum, or a check that the quoted text exists on the page, catches it."
        },
        {
          kind: "p",
          text: "Sending everything to a vision model is a popular suggestion, and interviewers test it."
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Why not send every page to a vision model?",
          text: "Give three reasons in order. First, cost and latency per page. Second, no native confidence or evidence, so validation must do more work. Third, the risk of invented values. Then offer the better design: route easy documents to cheap exact paths, and use the model on the hard minority with strict checks and review."
        },
        {
          kind: "p",
          text: "That covers the paths Harbour will use. An architect also has to know the options Harbour turned down, because the next customer may need one of them."
        }
      ]
    },
    {
      id: "s4-peers",
      title: "Document AI is Harbour's default, and Docling and other clouds are real peers",
      goal: "Where does each alternative win?",
      blocks: [
        {
          kind: "p",
          text: "The tools below are the realistic alternatives when Document AI doesn't fit. None is better in general, and each wins under some constraint."
        },
        {
          kind: "compare",
          // CHECKED 17 and 21 Oct 2026: processors-list; PaddleOCR, Unstructured, Docling repositories; Azure Document Intelligence and Amazon Textract docs.
          caption: "Readers compared. Check current capabilities, regions and pricing for each before you commit.",
          columns: [
            "Tool",
            "Best at",
            "When you switch to it",
            "What it costs you"
          ],
          rows: [
            [
              "Document AI",
              "Managed processors for invoices, forms, layout and your own fields",
              "Harbour's default, because it runs on the cloud Harbour already uses",
              "A fee per page, and which processors you get depends on the region"
            ],
            [
              "Native parser: pypdf, pdfplumber, PyMuPDF",
              "Born-digital files, exact text",
              "Files carry a clean text layer",
              "No OCR and no fields, so you write the rules"
            ],
            [
              "Tesseract",
              "Offline OCR for plain text",
              "No network, or no per-page cost allowed",
              "Weak on tables and layout, and you write everything above text"
            ],
            [
              "Docling",
              "Open source conversion of PDFs to structured documents, on your own compute",
              "You need layout and tables and data must stay in your estate",
              "You host it, size it and keep it updated"
            ],
            [
              "PaddleOCR",
              "Open source OCR with detection, recognition, and a layout and table pipeline, strong on multilingual text",
              "You need free, offline OCR that beats Tesseract on hard scans",
              "You host and tune it, and you write field logic on top"
            ],
            [
              "Unstructured",
              "Open source library that splits PDFs, Word and HTML into typed elements",
              "You're preparing mixed documents for retrieval or a model",
              "No invoice schema, so rules or a model come after it"
            ],
            [
              "Vision model, such as Gemini on Vertex AI",
              "Hard layouts and new document types without training",
              "Layout is too hard for the others, or you're prototyping",
              "Invented values, heavy cost, no native evidence. Use a regional endpoint when data must stay in a region"
            ],
            [
              "Azure Document Intelligence",
              "Managed layout, tables and invoice fields in one call",
              "Your estate and your data already live on Azure",
              "A second cloud for Harbour, plus per-page fees"
            ],
            [
              "Amazon Textract",
              "Managed OCR, forms and tables on AWS",
              "Your estate and your data already live on AWS",
              "A second cloud for Harbour, plus per-page cost"
            ]
          ]
        },
        {
          kind: "p",
          text: "Other clouds sell comparable managed services, with key-value pairs, tables, confidence and bounding boxes. For Harbour they mean a second cloud, a second bill and a data transfer the IT lead must approve."
        },
        {
          kind: "p",
          // CHECKED 17 Oct 2026: https://github.com/docling-project/docling
          text: "**Docling** is an open source toolkit that converts PDFs and office files into a structured document. It runs on your own compute, so data stays in your estate. You pay in hosting and upkeep. It returns structure with no invoice fields, so a rule set or a model follows."
        },
        {
          kind: "widget",
          id: "docai-extractor-picker",
          intro: "Set the constraints: offline, data staying in your Google Cloud project, text layer and layout complexity. Watch the ranking change. Then pick the best fit for four cases, including one that needs a vision model inside the project. Notice how constraints remove options before accuracy is even compared."
        },
        {
          kind: "p",
          text: "Order of decision matters. Apply the hard constraints first: offline use, data residency, language and what security allows. Only then compare accuracy on your own documents. Chapter two showed why: London closed Invoice Parser before anybody measured it."
        },
        {
          kind: "quiz",
          id: "docai03-q4",
          question: "Which constraint do you apply first when choosing between extractors?",
          options: [
            "Accuracy on a public benchmark.",
            "Hard limits such as offline use and data residency.",
            "Which vendor has the nicest dashboard.",
            "Which tool is newest."
          ],
          answer: 1,
          explain: "Hard constraints cut the list. Accuracy then gets measured on your own documents among what remains. Public benchmarks rarely match your invoices."
        },
        {
          kind: "p",
          text: "Interviewers often ask for the alternatives by name."
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Alternatives to Document AI",
          text: "Name them in a sensible order: native parsing for born-digital files, Tesseract for simple or offline cases, vision models for complex layouts, and a hybrid. Then give the decision criteria: accuracy on your documents, structure, languages, privacy, cost, latency, operations and data residency."
        },
        {
          kind: "p",
          text: "Harbour keeps four of these paths. The last job is to say which document takes which."
        }
      ]
    },
    {
      id: "s5-hybrid",
      title: "A routing table sends each class of document to the cheapest reader that works",
      goal: "What does Harbour's routing table say, and what does it cost?",
      blocks: [
        {
          kind: "p",
          text: "A **hybrid** pipeline classifies each document first, then sends it down the cheapest path that can be verified. The common case gets a cheap path and the rare hard case gets a strong one. Routing signals are cheap to compute, such as text layer presence, page count, image quality and file source."
        },
        {
          kind: "p",
          text: "Harbour's working started from the page routing sheet in chapter one, which already splits text from scans. The team then asked one question of each class: what's the cheapest reader whose result we can check?"
        },
        {
          kind: "p",
          text: "Scans raised the argument. The accounts payable lead wanted every scan read twice for safety. The FDE showed that the second read only earns its cost when the first one fails a check. About one scan in five is expected to fail, so the second read became an escalation."
        },
        {
          kind: "widget",
          id: "docai-hybrid-router",
          intro: "A batch of 100 invoices falls into four classes. Choose an extractor for each class and aim for a field accuracy target at the lowest cost. The figures are illustrative. Submit to see the cheapest routing that meets the target."
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's reader routing table. Rates are invented or illustrative, and text and reconcile rates come from the LLM engineering course.",
          code: "READER ROUTING TABLE: Harbour Reader\nMonth: 10,000 invoices, 2,000 statements, 300 delivery notes\n\nClass               Docs    Signal               First reader            If a check fails\nText-layer invoice  8,000   sheet says text      native parser, Flash    Argon once, then review\nScanned invoice     2,000   sheet says OCR       Custom Extractor        Argon once, then review\nStatement           2,000   statement portal     native parser, reconcile review\nDelivery note         300   bonded warehouse     Tesseract, local        review\n\nMonthly cost (pounds)\nText invoices    8,000 at about 0.53p               42.38\nScans            2,400 pages at 72 dollars total    57.60\nEscalations        400 scans at 1.8p                 7.20\nStatements       2,000 at 3.45p                     69.00\nDelivery notes     300 at no fee                     0.00\nTotal                                              176.18"
        },
        {
          kind: "p",
          text: "Compare the scan lines with last month's bill. Argon cost 36 pounds to read every scan. It now costs 7.20 as an escalation, and the Custom Extractor adds 57.60. Reading costs Harbour 28.80 more a month, which is small against the 160 pounds that the boxes should save."
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer: copy this and fill it in.",
          code: "READER ROUTING TABLE: [customer]\nMonth:\n\nClass    Docs    Signal    First reader    If a check fails\n\nMonthly cost\n[one line for each reader and each escalation]\nTotal"
        },
        {
          kind: "p",
          text: "A hybrid has a cost of its own. You maintain several paths, each with its own failures, and the router can be wrong. Test it with a labelled set of mixed documents, and log which path every document took."
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Escalate when a check fails as well as by class",
          text: "Route by class first. Then escalate when validation fails. A scan that fails a check on its totals can retry through the vision model once. Keep the escalation bounded, validate the second result as well and record both attempts."
        },
        {
          kind: "quiz",
          id: "docai03-q5",
          question: "What is the main cost of a hybrid pipeline?",
          options: [
            "Higher accuracy.",
            "More paths to maintain, plus a router that can itself misroute.",
            "Slower throughput on all documents.",
            "A need for GPUs."
          ],
          answer: 1,
          explain: "Each path has its own failure modes and tests. The router needs its own labelled evaluation and logging."
        },
        {
          kind: "p",
          text: "Every line of that table says if a check fails. Chapter four writes those checks."
        }
      ]
    }
  ],
  recap: [
    "Native parsing is exact and free for born-digital files, and it gives words with no fields.",
    "Tesseract is a good offline default for plain pages and weak on tables and layout.",
    "Vision models read hard layouts and can invent values, so the strictest validation goes after them.",
    "Apply hard constraints such as offline use and residency before comparing accuracy on your own documents.",
    "A hybrid routes by class, escalates on failed validation, and needs its own tests and logs."
  ],
  reinforcement: "I am becoming a forward-deployed AI engineer. In alternatives to Document AI I learned to choose a reader by hard constraints first and accuracy on our own documents second, then route each document to the cheapest path that validates. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: [
    "docai-q05",
    "docai-q06"
  ]
};

export default chapter;
