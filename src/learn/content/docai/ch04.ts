import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "docai-04-validation-and-confidence",
  course: "docai",
  number: 4,
  title: "A confident field can be wrong, so check it against the rest of the document",
  tagline: "Rules catch what confidence misses, and a reliability table says what confidence is worth.",
  minutes: 40,
  objectives: [
    "Write the first-gate checks for required fields, types and currency.",
    "Use cross-field rules to catch errors that confidence scores miss.",
    "Show with a reliability table that a confidence score isn't yet a probability.",
    "Escalate to a second reader only for a likely cause, with nothing invented.",
    "Build a review item that lets a clerk decide in seconds and teaches the next version."
  ],
  sections: [
    {
      id: "s1-first-gate",
      title: "Required fields and types are the first gate",
      goal: "What is the cheapest check that stops malformed output?",
      blocks: [
        {
          kind: "p",
          text: "Chapter three's routing table says what happens if a check fails. This chapter writes the checks. The first gate is dull and catches a lot. Every Harbour invoice needs a supplier, an invoice number, a date, a currency and a total, and each value must parse to its type."
        },
        {
          kind: "list",
          items: [
            "A required field is null or empty. Don't fill it in.",
            "A value is malformed, such as an invoice date that isn't a real date.",
            "The currency is outside the list the business accepts.",
            "A value is out of range, such as a total of zero or a date in the far future."
          ]
        },
        {
          kind: "p",
          text: "Parse before you judge. A total printed as 1.260,00 in one country and 1,260.00 in another is the same amount. Normalise with the raw string kept, as chapter one set out, then check the parsed value."
        },
        {
          kind: "code",
          lang: "python",
          code: "from dataclasses import dataclass\n\nACCEPTED = {\"GBP\", \"EUR\", \"USD\"}\nREQUIRED = (\"supplier_name\", \"invoice_id\", \"invoice_date\", \"currency\", \"total_amount\")\n\n\n@dataclass(frozen=True)\nclass Problem:\n    rule: str\n    field: str\n    detail: str\n\n\ndef first_gate(inv: dict[str, Extracted]) -> list[Problem]:\n    out: list[Problem] = []\n    for name in REQUIRED:\n        if inv[name].value is None:\n            out.append(Problem(\"required\", name, \"missing\"))\n    currency = inv[\"currency\"].value\n    if currency and currency not in ACCEPTED:\n        out.append(Problem(\"currency\", \"currency\", currency))\n    return out",
          caption: "Return a list of problems in place of a boolean, because the reviewer and the metrics both need the reasons."
        },
        {
          kind: "p",
          text: "Returning reasons pays off later. You can count which rule fires most, and that tells you whether to fix the reader, the prompt or the supplier."
        },
        {
          kind: "quiz",
          id: "docai04-q1",
          question: "The extractor returns null for the invoice number. What should the pipeline do?",
          options: [
            "Fill in the filename as the number.",
            "Record the missing field with a reason and route the document on, to review or an alternate extractor.",
            "Post it to the ledger with a blank number.",
            "Retry the same extractor until it returns something."
          ],
          answer: 1,
          explain: "A null is information. An invented number passes type checks and corrupts the ledger. Repeating the same call rarely changes the answer."
        },
        {
          kind: "p",
          text: "A value can pass this gate and still be wrong. The next gate uses the rest of the page to find out."
        }
      ]
    },
    {
      id: "s2-cross-field",
      title: "Cross-field rules catch what confidence misses",
      goal: "How can one field expose a mistake in another?",
      blocks: [
        {
          kind: "p",
          text: "An invoice is full of redundancy. Lines add up to the net amount. Net plus VAT equals the total. A due date follows an invoice date. A **cross-field rule** ties two such fields together, so a wrong one gives itself away."
        },
        {
          kind: "p",
          text: "Rules need tolerance. Prices can be rounded per line or on the total, and tax may be worked out before or after discounts. Set tolerances from invoices you know are correct. Too tight floods the review queue, and too loose lets errors pass."
        },
        {
          kind: "p",
          text: "Harbour's rules met invoice 20418 on their first day. The two lines read 300.00 and 150.00, which sum to 450.00. The net amount read 405.00, the VAT 81.00 and the total 486.00. Net plus VAT passed. The sum rule failed, because 450 isn't 405."
        },
        {
          kind: "p",
          text: "The team assumed a misread net. The accounts payable lead looked at the scan and laughed. Northgate gives Harbour a 45 pound trade discount, printed in small type under the lines. The reader was right, and the rule was wrong."
        },
        {
          kind: "p",
          text: "So the rule changed to lines minus discount equals net, and the next version of the extractor gained a discount field. This is the sheet the team wrote after that week. Tolerances came from 500 invoices known to be correct."
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's validation rule sheet. Tolerances are Harbour's own.",
          code: "VALIDATION RULE SHEET: Harbour Reader, invoices\n\nRule           Check                                  Tolerance    On fail\nsum_lines      lines - discount = net_amount          2p per line  review\nsum_total      net_amount + total_tax = total_amount  1p           review\nvat_rate       tax / net in {0, 5, 20 percent}        0.5 point    review\nline_math      quantity x unit_price = line amount    1p per line  review\ndates          due_date >= invoice_date, under 120 d  none         review\ncurrency       one currency, matches supplier master  none         review\nduplicate_key  supplier + invoice_id + total unseen   none         hold\n\nFires reported weekly, by rule and by supplier.\nOwner: accounts payable lead."
        },
        {
          kind: "p",
          text: "Read the Tolerance column, because each value there was measured. Also read the On fail column. Nothing is corrected automatically. A failed rule sends the document to a person or to one more reader, and the sheet says which."
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer: copy this and fill it in.",
          code: "VALIDATION RULE SHEET: [customer, document type]\n\nRule    Check    Tolerance [measured on correct documents]    On fail\n\nFires reported:\nOwner:"
        },
        {
          kind: "widget",
          id: "docai-cross-field-check",
          intro: "Five extracted invoices, each read with high confidence. Tick which rules each one breaks, then check. Notice the invoice where one rule passes and another fails on the same numbers."
        },
        {
          kind: "callout",
          tone: "insight",
          title: "A rule is a free labelled check",
          text: "Each rule needs no model, no cost and no training data. It also measures the reader on unlabelled documents. A rising rate of failed rules warns you before reviewers complain."
        },
        {
          kind: "quiz",
          id: "docai04-q2",
          question: "Lines sum to 450.00, net reads 405.00, VAT reads 81.00 and total reads 486.00. Which single rule catches the error?",
          options: [
            "Net plus VAT equals total.",
            "Line items sum to net.",
            "Due date follows invoice date.",
            "Required fields are present."
          ],
          answer: 1,
          explain: "Net plus VAT is 486.00, so the totals rule passes. Only the sum of the lines, 450.00, disagrees with the net, 405.00."
        },
        {
          kind: "quiz",
          id: "docai04-q3",
          question: "You set the sum tolerance to ten pounds to stop review noise. What is the main risk?",
          options: [
            "None, because small errors do not matter.",
            "Real transposition errors under ten pounds now pass unnoticed.",
            "The extractor will slow down.",
            "Dates will fail more often."
          ],
          answer: 1,
          explain: "A loose tolerance turns off the rule for small wrong amounts. Set it from observed rounding on correct invoices."
        },
        {
          kind: "p",
          text: "A contradiction between fields is a favourite interview scenario."
        },
        {
          kind: "callout",
          tone: "interview",
          title: "What if fields contradict?",
          text: "Say the contradiction is the signal. Validate required fields, types and cross-field rules, such as totals. Inspect the source layout and field confidence to find which field is wrong. Then decide: a second reader, or review. Never pick the version that looks right and carry on."
        },
        {
          kind: "p",
          text: "Rules cover money and dates well. Some fields have nothing to be checked against, and for those Harbour must lean on the confidence score. The score needs testing first."
        }
      ]
    },
    {
      id: "s3-calibration",
      title: "A confidence score isn't a probability until you calibrate it",
      goal: "How does Harbour decide which score is high enough?",
      blocks: [
        {
          kind: "p",
          text: "A score of 0.9 sounds like a ninety percent chance of being right. It isn't. It's a number the model emits. It tends to rank fields correctly, so higher is better, but its scale needn't match reality."
        },
        {
          kind: "p",
          text: "A score is **calibrated** when fields scored 0.9 are right nine times in ten. You can test this. Collect fields a person has verified, group them into buckets by score and count how many in each were right. That is a **reliability table**."
        },
        {
          kind: "widget",
          id: "docai-confidence-calibration",
          intro: "Fifty reviewed fields in five buckets. First predict how many of ten were right in the 0.90 to 0.95 bucket. Then choose an auto-accept rule that keeps errors to one in ten, and see how little it automates."
        },
        {
          kind: "p",
          text: "Harbour took 50 reviewed fields from the first version of its extractor. The AP lead wanted auto-accepted fields to be right nine times in ten. Ten fields sit in each bucket."
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's first reliability table. Fifty fields is thin, and the note says so.",
          code: "RELIABILITY TABLE: hr-extract-v1, 50 reviewed fields\n\nScore bucket    Fields   Right   Observed   Store as\nbelow 0.50      10       2       20%        0.20\n0.50 to 0.70    10       4       40%        0.40\n0.70 to 0.90    10       6       60%        0.60\n0.90 to 0.95    10       8       80%        0.80\n0.95 and above  10       9       90%        0.90\n\nTarget    Auto-accept fields observed at 0.90 or above.\nResult    Scores of 0.95 and above: 10 of 50 fields (20%).\n          The other 40 need a passing cross-field rule, or review.\nWarning   One more wrong field in the top bucket makes it 80%.\n          Collect a few hundred per bucket before trusting this."
        },
        {
          kind: "p",
          text: "Read the last two columns together. The word 486.00 from chapter one scored 0.91, which sounds strong. It's stored as 0.80, so the total on invoice 20418 can only pass if its sum rules pass. Scores also differ by field, so a real table is one per field."
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer: one table per field.",
          code: "RELIABILITY TABLE: [processor version], [field], [fields reviewed]\n\nScore bucket    Fields   Right   Observed   Store as\n\nTarget\nResult\nWarning  [the sample size this rests on]"
        },
        {
          kind: "p",
          text: "Redo the table when the version changes, because a new model shifts the scale. Course 4 applies the same idea to judges."
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Confidence misses confident errors",
          text: "A model can read a clear eight as a six with high confidence. Confidence describes the shape of the characters and says nothing about whether the invoice makes sense. So cross-field rules run as well as the confidence gate."
        },
        {
          kind: "quiz",
          id: "docai04-q4",
          question: "Fields scored 0.93 are right 80 percent of the time on reviewed data. What do you conclude?",
          options: [
            "The reviewers are wrong.",
            "The score is overconfident in that range, so set the threshold from the observed rate.",
            "The extractor is perfect.",
            "Lower the threshold to 0.5."
          ],
          answer: 1,
          explain: "A bucket whose observed accuracy sits below its claimed score is overconfident. Use the observed rate to choose where to auto-accept."
        },
        {
          kind: "p",
          text: "Interviewers often test whether you take the score at face value."
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Can you trust the confidence score as a probability?",
          text: "Answer no, then show how you'd test it. Bucket verified fields by score, compare observed accuracy to the claim and set thresholds per field from that table. Add that scores rank well but are scaled arbitrarily, that a version change resets calibration, and that confident errors need cross-field rules."
        },
        {
          kind: "p",
          text: "When a document fails both kinds of gate, Harbour's routing table offers one more reader. The danger lies in how you use it."
        }
      ]
    },
    {
      id: "s4-alternate",
      title: "A second reader is justified by a likely cause, and it gets the same checks",
      goal: "When is a second read worth it, and what must it never do?",
      blocks: [
        {
          kind: "p",
          text: "A scan that the Custom Extractor read poorly may read better through Gemini 4 Argon. A text layer that failed a rule may need OCR. Justify each retry by its likely cause. A missing field on a scan is a fair case, and a failed sum on a clean text layer isn't."
        },
        {
          kind: "list",
          items: [
            "Allow one extra attempt per document, so cost and latency stay bounded.",
            "Run the same gates on the second result.",
            "Never merge fields from two readers without validating the merged result as a whole.",
            "Record both attempts, with the reader and its version."
          ]
        },
        {
          kind: "p",
          text: "The merge deserves care. The first reader gets the total right and the second gets the lines right. Combining them can produce an invoice that nobody read and no page supports. Validate the combination, or send it to review."
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Never invent",
          text: "If both readers fail, the answer is a null and a review. Don't work out a missing total by adding the lines and present it as extracted. You may compute a check value, but it must be labelled as computed."
        },
        {
          kind: "quiz",
          id: "docai04-q5",
          question: "The total is missing. The lines sum to 450.00 and VAT is 90.00. What should the pipeline store as the total?",
          options: [
            "540.00, marked as extracted.",
            "Null with a reason, plus a computed check value of 540.00 labelled as computed, and a review.",
            "450.00.",
            "Zero."
          ],
          answer: 1,
          explain: "The printed total was not read. A derived number can help the reviewer, but it must be labelled as derived and never posted as if it were extracted."
        },
        {
          kind: "p",
          text: "Whatever is left goes to a clerk, and this is where the boxes from chapter one finally pay."
        }
      ]
    },
    {
      id: "s5-review",
      title: "Doubtful documents reach a clerk with the page, the reason and a way to teach",
      goal: "What does a clerk need so that a review takes seconds?",
      blocks: [
        {
          kind: "p",
          text: "Some documents stay doubtful after validation and one retry. Others are high stakes by size, such as a very large invoice. Both go to a person, and the aim is a fast, informed decision."
        },
        {
          kind: "p",
          text: "The method is one screen. The page image sits on the left, with the extracted fields on the right, so a clerk never scrolls between a value and its source. Clicking a field draws its box on the page, and the focus starts on the first failed field."
        },
        {
          kind: "p",
          text: "Keep four things for every reviewed document: the original file, the extraction with evidence, the reader versions and the decision. Together they let you audit a payment and learn from corrections. Here's the review item for invoice 20418 on its first day."
        },
        {
          kind: "code",
          lang: "json",
          caption: "One Harbour Reader review item, with the fields not under review cut. The clerk's decision has been filled in.",
          code: "{\n  \"doc_id\": \"doc-3fa94c1e0b77\",\n  \"file\": \"northgate-2026-11-03.pdf\",\n  \"failed_rules\": [\n    { \"rule\": \"sum_lines\", \"says\": \"Lines add up to 450.00 but the net amount is 405.00.\" }\n  ],\n  \"fields\": {\n    \"net_amount\": {\n      \"value\": \"405.00\", \"stored_confidence\": 0.80,\n      \"page\": 1, \"region\": [[560, 820], [650, 820], [650, 842], [560, 842]]\n    }\n  },\n  \"versions\": { \"extractor\": \"hr-extract-v1\", \"rules\": \"2026-11-01\" },\n  \"decision\": {\n    \"by\": \"clerk-7\", \"at\": \"2026-11-04T10:12:00Z\", \"seconds\": 41,\n    \"action\": \"accepted\", \"note\": \"45.00 trade discount printed under the lines.\"\n  }\n}"
        },
        {
          kind: "p",
          text: "The rule says what's wrong in a sentence. The box goes straight to the net amount, so the clerk needed 41 seconds rather than 3 minutes. The note matters as much as the decision, because that note is how the team found the discount."
        },
        {
          kind: "code",
          lang: "json",
          caption: "For your next customer: the fields a review item needs.",
          code: "{\n  \"doc_id\": \"\",\n  \"file\": \"\",\n  \"failed_rules\": [{ \"rule\": \"\", \"says\": \"one plain sentence\" }],\n  \"fields\": { \"<field>\": { \"value\": \"\", \"stored_confidence\": 0.0, \"page\": 0, \"region\": [] } },\n  \"versions\": { \"extractor\": \"\", \"rules\": \"\" },\n  \"decision\": { \"by\": \"\", \"at\": \"\", \"seconds\": 0, \"action\": \"\", \"note\": \"\" }\n}"
        },
        {
          kind: "p",
          text: "Each edit also writes a correction record. The record feeds the audit trail, the drift watch from chapter two and the golden set from course 1. A weekly job turns these into new labelled cases, split by supplier."
        },
        {
          kind: "code",
          lang: "python",
          code: "from dataclasses import dataclass\n\n\n@dataclass(frozen=True)\nclass Correction:\n    doc_id: str\n    field: str\n    extracted: str | None\n    corrected: str | None  # None means \"not on the page\"\n    page: int\n    polygon: list[tuple[int, int]]  # the region the reviewer looked at\n    failed_rule: str | None\n    model_version: str\n    reviewer: str\n    at: str",
          caption: "A correction record, written for every edit a clerk makes."
        },
        {
          kind: "p",
          text: "Course 3 covers the thresholds for human approval and the cost of false accepts and false rejects. This chapter supplies the signals those policies use. Track how many documents reach review, why and how long they wait, because a growing queue is a cost and an alarm."
        },
        {
          kind: "quiz",
          id: "docai04-q6",
          question: "Which stored item most helps a later audit of a wrongly paid invoice?",
          options: [
            "Only the final posted values.",
            "The original file, the extraction with evidence, the model versions and the review decision.",
            "The reviewer's email address.",
            "The server logs from that hour."
          ],
          answer: 1,
          explain: "An audit must reconstruct what was read, by what, and who approved it. The four items together make that possible."
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Why corrections are the best training data",
          text: "A reviewer correction marks a document the model got wrong, with the right answer attached. That is the most useful labelled example you can get, because it targets real weaknesses. Keep corrections in a versioned set and split them by supplier, as in chapter two."
        },
        {
          kind: "p",
          text: "Harbour now has readers, checks and a review screen. It has no way yet to get a document from an inbox to any of them without losing one or paying it twice."
        }
      ]
    }
  ],
  recap: [
    "The first gate checks required fields, types and currency, and returns reasons.",
    "Cross-field rules catch errors that confidence misses, and a failed rule can reveal a wrong rule.",
    "A confidence score ranks fields, and it's a probability only once a reliability table on verified data says so.",
    "Set thresholds per field from observed accuracy, and recalibrate when the version changes.",
    "Try one extra reader only for a likely cause, validate it, and never invent a missing value.",
    "A review item carries the page, the box, the failed rule in plain words and the decision, and each edit becomes a labelled example."
  ],
  reinforcement: "I am becoming a forward-deployed AI engineer. In confidence gates and cross-field validation I learned that a confident field can still be wrong, that every extraction is checked against the redundancy in the document, and that thresholds come from a reliability table. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: [
    "docai-q07",
    "docai-q08"
  ]
};

export default chapter;
