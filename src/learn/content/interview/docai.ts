import type { InterviewQuestion } from "../types";

// CHECKED 21 Oct 2026: Document AI processor names, online (15 page) and batch limits https://docs.cloud.google.com/document-ai/limits and https://docs.cloud.google.com/document-ai/docs/processors-list
// CHECKED 21 Oct 2026: custom extractor foundation-model and model-based versions, deploy and default version behaviour https://docs.cloud.google.com/document-ai/docs/workbench/build-custom-processor and https://docs.cloud.google.com/document-ai/docs/manage-processor-versions
// CHECK: the template-based custom extractor version (docai-q03) was taken from the Document AI facts list, not from a page fetched on 21 Oct 2026. Confirm at https://docs.cloud.google.com/document-ai/docs/workbench
// CHECK: docai-q14 uses about a cent a page for the Layout Parser as an illustrative price. Confirm current price at https://cloud.google.com/document-ai/pricing
// CHECKED 9 Nov 2026: docai-q14 region claims, europe-west2 lists Gemini 4 Argon and Gemini 3.5 Flash, and global gives no guarantee https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/data-residency
// CHECK: docai-q14 says gemini-3.5-flash-lite has no europe-west2 endpoint, which rests on facts recorded 20 Oct 2026.

const questions: InterviewQuestion[] = [
  {
    id: "docai-q01",
    course: "docai",
    category: "extraction",
    level: "core",
    chapterId: "docai-01-ocr-vs-understanding",
    source: "practice",
    question: "What is the difference between OCR and document understanding?",
    idealAnswer:
      "OCR recognises text. Document understanding recognises structure and meaning on top of that text. OCR takes pixels and returns words and lines, each with a confidence score and a bounding region that says where it sits on the page. It has no idea which word is the invoice total. Document understanding stacks more layers on it. Layout analysis finds paragraphs, headings and reading order. Table extraction finds rows, columns and cells. Checkboxes detect ticked boxes. Key-value pairs link a label such as Due to the value beside it. Fields name the meaning and give a typed value, such as the invoice total as a currency amount. Each layer takes the one below as input, so errors travel upward. The engineering point I would stress is evidence. Keep the confidence, the page, the bounding region and the raw text with every value, and record which extractor and model version produced it. Validation and review both need to see where a value came from. A typed field looks authoritative, but it is a model's reading of a page. I treat it as a claim to be checked against the rest of the document.",
    keywords: ["OCR", "layout", "tables", "key-value pairs", "checkboxes", "fields", "confidence", "bounding region", "source evidence"],
    followUps: [
      "Which layer would you debug first when a total is wrong?",
      "Why keep the raw string as well as the parsed value?",
      "What does a bounding region let a reviewer do?",
    ],
  },
  {
    id: "docai-q02",
    course: "docai",
    category: "extraction",
    level: "core",
    chapterId: "docai-01-ocr-vs-understanding",
    question: "A customer's PDFs are a mix of born-digital and scanned. How do you handle both?",
    idealAnswer:
      "I classify each file, and each page, then route it to the cheapest path that can be verified. Born-digital pages go to a native text parser, which is exact and free. Scanned pages go to OCR or a document understanding service. The flow starts with a cheap test. Count the words the text layer returns per page. Zero means an image. A high share of control characters means the layer is garbage, so render the page and run OCR. One file can hold both kinds, such as a digital invoice with a scanned signature page, so the decision is per page. For controls, I record which path each page took and keep OCR confidence. I validate the output the same way on every path, with required fields and cross-field rules. For metrics, I track the share of pages on each path, the validation failure rate per path and the review rate. The trade-off is simplicity against cost. One engine for everything is easy to run but pays for OCR on pages that did not need it and adds OCR errors. The fallback is that anything the test cannot decide goes to OCR, and anything that fails validation goes to review.",
    keywords: ["text layer", "per page", "native parser", "OCR", "routing", "garbled layer", "validation", "review"],
    followUps: [
      "How do you test the router itself?",
      "What if the text layer exists but does not match the page image?",
      "When would you use OCR on every page anyway?",
    ],
  },
  {
    id: "docai-q03",
    course: "docai",
    category: "models",
    level: "core",
    chapterId: "docai-02-document-intelligence",
    source: "practice",
    question: "Would you use a prebuilt Document AI processor or a custom one?",
    idealAnswer:
      "I would start with a prebuilt processor and go custom only when field-level results on our own documents say so. Document AI has prebuilt processors for common types, such as the Invoice Parser and the Expense Parser. There is no labelling and no training, so you are productive in an afternoon. The custom route is for fields no prebuilt processor returns, such as a bay number on a goods received note. The decision rests on evidence. Run the prebuilt processor over a labelled, representative sample. Score each field separately, and see which fields fall short and by how much. If one field is missing, a rule or a small custom extractor may be cheaper than replacing everything. A custom extractor comes in three versions. The template-based version suits one fixed layout. The model-based version suits layouts that vary. The Gemini foundation-model version works from a few examples and can be fine-tuned. For mixed document types I would not look for a composed model. I would use a classifier or splitter and one processor per type, routed in my own code. A prebuilt processor also gives me a baseline, because a custom one has nothing to be compared against otherwise. Product names and limits change, so I check the current documentation.",
    keywords: ["prebuilt", "custom", "field-level accuracy", "representative documents", "labelling effort", "template-based", "model-based", "Gemini foundation model", "classifier and splitter", "baseline"],
    followUps: [
      "One field is wrong on a large supplier. What do you do?",
      "How many labelled documents do you need?",
      "How do you route ten document types to the right processor?",
    ],
  },
  {
    id: "docai-q04",
    course: "docai",
    category: "models",
    level: "deep",
    chapterId: "docai-02-document-intelligence",
    source: "practice",
    question: "How would you train and evaluate a custom extraction model?",
    idealAnswer:
      "I would work in order: schema, data, labels, split, train, evaluate, ship, watch. First a written schema with every field, its type and a one-line rule. Two labellers who read the rule differently teach the model to guess. Then representative documents across suppliers, layouts and scan quality. Fifty clean files from one supplier prove nothing. Label consistently, leave absent fields unlabelled and measure disagreement between two labellers on a sample. The split is where people get burned. Documents from one supplier share a layout, so a random split lets the model be tested on layouts it has memorised. Split by whatever varies in production, usually supplier. Train, then score each field on unseen documents, with found rate and accuracy when found. A single accuracy number hides the failing fields. Version the processor and the labelled dataset together. A Document AI processor holds versions, so I deploy the new one beside the default and send shadow traffic by naming it. Then a small share goes live, and only after that do I set it as the default. The old version stays deployed for rollback. Watch per-field accuracy on reviewed samples for drift. Retrain on reviewer corrections, keeping the old test set fixed so models compare fairly. I would not claim a number without saying how it was measured.",
    keywords: ["schema", "representative documents", "consistent labels", "leakage", "split by supplier", "field-level metrics", "shadow rollout", "drift", "retraining"],
    followUps: [
      "Why is a random split a problem here?",
      "How do you know labelling is consistent?",
      "What triggers a retrain?",
    ],
  },
  {
    id: "docai-q05",
    course: "docai",
    category: "alternatives",
    level: "core",
    chapterId: "docai-03-alternatives",
    source: "practice",
    question: "What alternatives to Document AI would you consider?",
    idealAnswer:
      "I would consider native PDF parsing, Tesseract, Docling, other managed services, vision models and a hybrid. Document AI is my default managed service on Google Cloud, so the question is what else earns a place beside it. Native parsing with PyMuPDF or pdfplumber is best for born-digital files, because the characters already exist. It is exact, instant and free, though it gives words and not fields. Tesseract is open source and runs offline. It suits simple pages or sites with no network, but it is weak on tables and layout. Docling is open source too. It runs on your own compute and converts documents with layout and tables. Managed document services on other clouds are real peers. They win when your data already lives on those clouds. Vision models, such as a Gemini model, handle complex layouts and new document types without training. They can invent values, so they need the strictest validation. I choose by hard constraints first: offline use, data residency, languages and what security allows. Then I compare accuracy, structure, privacy, cost, latency and operations on our own documents. In practice, I often end up with a hybrid that routes each document to the cheapest extractor that works.",
    keywords: ["Document AI", "native parsing", "Tesseract", "Docling", "other managed services", "vision model", "data residency", "hybrid", "constraints"],
    followUps: [
      "Which constraint would rule out a cloud service?",
      "How would you compare two extractors fairly?",
      "When is Tesseract good enough?",
    ],
  },
  {
    id: "docai-q06",
    course: "docai",
    category: "alternatives",
    level: "deep",
    chapterId: "docai-03-alternatives",
    question: "Why not send every page to a vision model?",
    idealAnswer:
      "Because it costs more, it is slower, and its mistakes are the hardest to catch. Each page is a heavy input and a slow call, so the bill and the latency scale with volume. Most pages in an invoice stream are easy. A born-digital invoice has an exact text layer, and reading it costs nothing. Second, the model gives no native word confidence or bounding regions, so a reviewer has no evidence to check. Third, it generates. It can return a plausible total that is on no page, fix a typo you wanted preserved, or merge two lines. A weak OCR engine produces garbage you notice. A strong model produces a clean invoice that is wrong. So the more capable the extractor, the stricter the validation after it must be. That means copy-from-page instructions with null for absent values and source quotes checked against the page text. It also means the same cross-field rules as any other path. My design is a hybrid. Cheap exact paths handle the easy majority, and a managed OCR handles clean scans. The vision model takes the hard minority and acts as a bounded fallback when validation fails, with review behind it.",
    keywords: ["cost", "latency", "invented values", "no confidence", "source quote", "validation", "hybrid routing", "fallback"],
    followUps: [
      "How would you check a model's source quote?",
      "Where would the vision model sit in your router?",
      "How would you prove the hybrid is cheaper without losing accuracy?",
    ],
  },
  {
    id: "docai-q07",
    course: "docai",
    category: "validation",
    level: "deep",
    chapterId: "docai-04-validation-and-confidence",
    source: "practice",
    question: "What do you do if OCR confidence is low or the extracted fields contradict each other?",
    idealAnswer:
      "I treat both as signals, run the validation gates, and escalate in a bounded way. First, the cheap gate: are required fields present, do they parse to their types, is the currency accepted. Then cross-field rules: lines sum to net, net plus VAT equals total, due date follows invoice date, one currency. A contradiction tells me something is wrong, and the rule that fired tells me where. Then I inspect the evidence, which is why I store confidence, page and bounding region with each value. A low-confidence digit in the total explains a failed sum. If the cause looks fixable, I allow one alternate attempt: a different extractor, or a vision model on a scan the first one read badly. I run the same gates on the second result, and I never merge fields from two extractors without validating the merged whole. If ambiguity remains, or the stakes are high because the amount is large, the document goes to a reviewer. The reviewer sees the page boxed, the failed rule in plain words and the original beside it. I never invent a value. A missing field stays null. I keep the original, the extraction, the model version and the review decision for audit.",
    keywords: ["required fields", "cross-field rules", "totals", "confidence", "alternate extractor", "review", "never invent", "audit trail"],
    followUps: [
      "How do you choose between retrying and reviewing?",
      "What do you show the reviewer?",
      "How do you tune rule tolerances?",
    ],
  },
  {
    id: "docai-q08",
    course: "docai",
    category: "validation",
    level: "deep",
    chapterId: "docai-04-validation-and-confidence",
    question: "Can you trust the extractor's confidence score as a probability?",
    idealAnswer:
      "No, not until you have calibrated it on your own data. A confidence score usually ranks fields well, so higher is better, but its scale is not promised to match reality. A score of 0.93 does not mean 93 percent are right. To test it, take fields a person has verified, bucket them by score, and compare the observed accuracy in each bucket with the claimed score. That is a reliability table. If the bucket scored 0.93 is right 80 percent of the time, the model is overconfident there, and I set thresholds from the observed rate. Three more points. Scores differ by field, so I set a threshold per field. A model version change shifts the scale, so I redo the table on each release. And confidence describes how sure the engine was of the glyphs or the span. It does not say whether the invoice makes sense, so a confidently misread digit passes. That is why cross-field rules also run after the confidence gate. I would also say the cost of getting it right, which is reviewed data in volume. Ten fields per bucket is only a teaching example.",
    keywords: ["calibration", "reliability table", "buckets", "overconfident", "per-field thresholds", "model version", "cross-field rules"],
    followUps: [
      "How much reviewed data does a reliability table need?",
      "How do you repair a miscalibrated score?",
      "What if the vendor does not expose confidence?",
    ],
  },
  {
    id: "docai-q09",
    course: "docai",
    category: "pipeline",
    level: "senior",
    chapterId: "docai-05-intake-pipeline",
    source: "practice",
    question: "How would you design an end-to-end document-processing pipeline?",
    idealAnswer:
      "I would build an asynchronous, idempotent pipeline that stores the original first and gives every document one outcome. The flow starts with intake from email, a portal or file transfer. File validation checks type, size and readability. The raw file is written to Cloud Storage with a metadata row. A Pub/Sub message carries the document id and a correlation id. A worker on Cloud Run classifies the document and calls Document AI with the right processor. Online calls take up to 15 pages, so longer files go to batch processing. The values are normalised, then validated with cross-field rules and a confidence gate. Good results go to the ledger and the rest go to a review queue. An audit record is written at every transition. Controls: the document id comes from the content checksum, and the ledger write carries an idempotency key. Retries are bounded with backoff. Poison files go to quarantine. Exhausted retries go to a dead-letter topic with an owner. Secrets sit in Secret Manager. Metrics: queue age, turnaround rate, extraction failure rate by type, review rate and validation failures per rule. The trade-off is latency for resilience: the queue adds a hop, but it absorbs bursts and survives crashes. When Document AI is down, I pause the queue so healthy files stay out of the dead-letter queue.",
    keywords: ["asynchronous", "idempotent", "Cloud Storage", "Pub/Sub", "Cloud Run", "correlation id", "validation", "review queue", "audit", "dead-letter"],
    followUps: [
      "What happens if a worker crashes after posting to the ledger?",
      "Where do you put the original file, and why first?",
      "How would you add a new document type?",
    ],
  },
  {
    id: "docai-q10",
    course: "docai",
    category: "pipeline",
    level: "senior",
    chapterId: "docai-05-intake-pipeline",
    source: "practice",
    question: "How do you handle duplicates, transient failures and poison documents?",
    idealAnswer:
      "Each gets its own mechanism, and the rule that ties them together is that a retry must never duplicate a side effect. Duplicates: a stable document id from the content checksum, a recorded state per document, and an idempotency key on the ledger write. That way even a redelivered queue message or a restarted worker cannot pay twice. A second layer on a business key, such as supplier, invoice number and total, catches a re-scan, which has different bytes. Transient failures, such as rate limits, 503s and timeouts, get bounded exponential backoff with jitter. They also get a cap on attempts and a cap on total time. I inject the clock so tests do not wait. Unknown errors count as transient only up to the cap. Poison documents, such as encrypted or corrupt files, fail the same way every time. So they are quarantined at once with a reason and a notification, never retried. Documents that exhaust their retries go to a dead-letter queue. It needs an owner, an alert on depth and age, and a bulk redrive once the cause is fixed. If every document starts failing together, I pause the queue instead.",
    keywords: ["checksum", "idempotency key", "bounded backoff", "jitter", "quarantine", "dead-letter queue", "redrive", "at-least-once"],
    followUps: [
      "How does a re-scanned duplicate get caught?",
      "What is the difference between quarantine and the dead-letter queue?",
      "How do you test this without waiting for real backoff?",
    ],
  },
  {
    id: "docai-q11",
    course: "docai",
    category: "pipeline",
    level: "senior",
    chapterId: "docai-05-intake-pipeline",
    question: "Design invoice intake for 50,000 documents a day with a four-hour turnaround.",
    idealAnswer:
      "I would use a queue-based pipeline with idempotent workers that scale on the age of the oldest message. Start with the arithmetic. Fifty thousand a day is about 2,100 an hour on average. If extraction and validation take ten seconds each, one worker does 360 an hour. That is an assumption I would measure. The average then needs about six workers. Invoices arrive in bursts, for example after month end. I size for a peak of several times that and make sure a backlog drains inside four hours. Flow: intake API stores the raw file and returns an id. A queue holds the work. Workers route each document to the cheapest verified extractor. Validation and the confidence gate send trusted results to the ledger and the rest to review. Controls: checksum ids, idempotent ledger writes, bounded retries, quarantine, dead letters, rate limit awareness for the extraction service. Metrics: queue age, the share finished inside four hours, review rate, cost per document. Trade-off: headroom against cost, and review staffing, since five percent review is 2,500 documents a day. Fallback: if the service degrades, pause and drain, and prioritise large invoices.",
    keywords: ["queue", "autoscaling", "queue age", "peak factor", "idempotent", "service level", "rate limits", "review capacity", "routing"],
    followUps: [
      "What if the extraction service rate-limits you at half your peak?",
      "How would you prioritise urgent invoices?",
      "What does the cost per document look like?",
    ],
  },
  {
    id: "docai-q12",
    course: "docai",
    category: "bundles",
    level: "deep",
    chapterId: "docai-06-long-and-composite-documents",
    source: "practice",
    question: "A customer scans mixed paper into 60-page files. How do you split them before extraction?",
    idealAnswer:
      "I segment first, then extract once per segment. A bundle is several documents in one file, so one extraction call reads it badly. Segmenting gives a list of documents, each with a first page, a last page and a type. Two jobs produce it. Page classification says what each page is. Boundary detection says where a new document starts. I need both, because classification alone cannot tell three back-to-back invoices from one long invoice. For boundaries I compare three strategies. A per-page classifier is cheap but merges same-type neighbours. A first-page detector handles that, at the cost of more labelled classes. A page-pair model is the most accurate on odd layouts. It reads about twice as many pages, 118 reads for a 60-page file against 60. I start with cheap cues, such as page numbers in footers and repeated invoice numbers. Then I run the first-page detector, and send only low-confidence pages to a pair check. I choose on the mis-split rate I measure. Hard pages, such as rotated or handwritten ones, go to review at page level, never the whole file.",
    keywords: ["segmenting", "page classification", "boundary detection", "first-page detector", "page-pair model", "confidence cut-off", "page reads", "page-level review"],
    followUps: [
      "What does the pair model cost against the first-page detector for 20 files a month?",
      "How do you handle two invoices from the same supplier back to back?",
      "What happens downstream when a boundary is missed?",
    ],
  },
  {
    id: "docai-q13",
    course: "docai",
    category: "contracts",
    level: "senior",
    chapterId: "docai-06-long-and-composite-documents",
    source: "practice",
    question: "How would you extract fields from a 48-page contract, and prove the pipeline works?",
    idealAnswer:
      "I pick the extraction unit per field, then I merge, then I measure. The page is often the wrong unit, because clauses cross page breaks. I run layout analysis once, build an outline from the headings, and take each clause as the span from its heading to the next. That reads about 64 pages for eight fields, against 384 if I read the whole contract each time. Tables that continue on the next page without a header get stitched to the first part before extraction. Facts with a known page, such as the parties on page one, use that page. Scattered facts, such as any assignment right, use the whole document. Per-page results merge by rule. Single values come from their home page, and a conflict goes to review. Lists concatenate in page order. Carried-forward figures are checks, never lines. To prove it works I build a golden set of labelled bundles. I report boundary precision and recall, field accuracy, and whole-bundle pass rate, sliced by bundle length and scanner. Pass rates multiply: 97 percent per boundary over three boundaries is 91 percent before any extraction error.",
    keywords: ["layout analysis", "clause by heading", "stitched table", "merge rules", "carried forward", "golden set", "boundary precision", "boundary recall", "bundle pass rate"],
    followUps: [
      "How do you find a clause when the scan has no headings?",
      "Two pages disagree on the contract date. What do you do?",
      "Why can a 97 percent splitter and a 95 percent extractor give a 74 percent system?",
    ],
  },
  {
    id: "docai-q14",
    course: "docai",
    category: "alternatives",
    level: "deep",
    chapterId: "docai-07-vision-models-as-readers",
    source: "practice",
    question: "When would you use a vision model instead of a layout service to extract documents?",
    idealAnswer:
      "I would use a vision model when layouts vary a lot, the volume is low, or the document type is new. I would not use it alone where a wrong value costs money. The reasoning starts with the arithmetic, on illustrative prices. A letter page at 150 dots per inch becomes roughly 1,100 to 2,700 image tokens, depending on the provider. With a short prompt and 400 tokens of JSON back, a page costs between about a seventh of a cent and a cent. Document AI's Layout Parser costs about a cent a page, so token price rarely decides. Volume and review decide. A new type becomes a prompt change with no labelling. That is hard to beat at a few hundred pages a month. A dense table is the opposite case. The model can skip, merge or repeat rows, and every extra page sent to review costs about 50 pence of clerk time. At volume that dwarfs the tokens. Data residency matters too. I would call Gemini on Vertex AI through a regional endpoint inside the contract's jurisdiction, because the global endpoint can process pages in any region. A UK contract needs europe-west2, and the cheapest Gemini model has no endpoint there. For anything audited I would add a hybrid, so a layout processor supplies the boxes.",
    keywords: ["image tokens", "cost per page", "Layout Parser", "dense tables", "review cost", "new document type", "residency", "regional endpoint", "hybrid", "prompt change"],
    followUps: [
      "How many tokens does one page cost, and how would you work it out?",
      "Where does the cost shift from tokens to review?",
      "How would you keep page processing inside one region?",
    ],
  },
  {
    id: "docai-q15",
    course: "docai",
    category: "alternatives",
    level: "senior",
    chapterId: "docai-07-vision-models-as-readers",
    source: "practice",
    question: "A vision model extracts invoices well in a demo. How do you prove it is ready, and how do you ground its answers?",
    idealAnswer:
      "I would score it against the layout path on the same labelled set, split by supplier so no layout appears on both sides. For each field I would measure precision and recall, and then the document pass rate, which is the share of documents with every field right. Pass rate matches what the business sees, because one wrong field sends the document to a person. I would slice by document type, since a vision model can lose overall and still win on odd layouts. I would also run it more than once, because the same page can read differently. The cost metric is total cost per document, with review included. Reading cost alone can favour the wrong reader. Grounding is the second half. A vision model returns no reliable bounding boxes, so I would rebuild evidence. First a quote check against the text layer. Then, for key fields, a crop of the named region and a small confirm question. For audited documents, a hybrid that matches each value to layout words and takes the box from there. An unmatched value goes to review, never to the ledger.",
    keywords: ["golden set", "precision", "recall", "document pass rate", "total cost per document", "slice by type", "grounding", "crop and confirm", "quote check", "hybrid"],
    followUps: [
      "Why is document pass rate more useful than field accuracy here?",
      "What does an unmatched value tell you?",
      "How would you stop a vision model from changing a value you wanted preserved?",
    ],
  },
  {
    id: "docai-q16",
    course: "docai",
    category: "pipeline",
    level: "senior",
    chapterId: "docai-08-one-invoice-through-the-system",
    question: "You shipped a document pipeline. How do you show it paid for itself?",
    idealAnswer:
      "I show the measured net saving a month, then the parts that produce it. On the last system I describe, the plan said a box on the page would save clerks two minutes per review. After 30 days we had timed 200 reviews, and the box had saved 1.9 minutes. Review volume had risen five percent. So the review bill fell from 240 pounds to 92.40. Reading cost rose by 28.80, which is less than the plan assumed, because the expensive model stopped reading every scan. The net saving was 118.80 a month against a plan of 102.40. Labelling paid back in about three and a half months. Those figures are from a worked example, and I would give my own measured ones. I also name the weakest number. Here it is one month of timed reviews, by a team that knew it was being timed, so I would time again at three months. Then I show the review sheet. Every check has a target agreed before go-live, a measured figure, a verdict and an owner. A small miss becomes a recorded decision by the sponsor. I finish with what the plan got wrong and why.",
    keywords: ["measured saving", "review time", "review volume", "reading cost", "payback", "30-day review", "targets", "owners"],
    followUps: [
      "What if the box saved less time than the plan promised?",
      "How would you time reviews without changing how clerks behave?",
      "Which costs would you leave out of the sum, and why?",
    ],
  },
];

export default questions;
