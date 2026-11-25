import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "docai-07-vision-models-as-readers",
  course: "docai",
  number: 7,
  title: "Choose a vision model by the review it causes, and rebuild the box it drops",
  tagline: "A vision model is cheap to run and expensive to check. Price both before you route a page to it.",
  minutes: 46,
  objectives: [
    "Trace one page from file to JSON and find where the tokens come from.",
    "Work the tokens, cost and delay of one page for Claude, GPT and Gemini.",
    "Choose between a vision model, a layout model and a hybrid from the document and the volume.",
    "Recover evidence for vision-model values with a quote check, a crop or a hybrid.",
    "Compare two readers on one golden set, then decide on cost including review."
  ],
  sections: [
    {
      id: "s1-path",
      title: "A vision model reads a page as pixels, so resolution is the first cost lever",
      goal: "Where do a page's tokens come from?",
      blocks: [
        {
          kind: "p",
          text: "Chapter six leaned on Gemini wherever London had no ready-made processor. Harbour's sponsor then read the routing table from chapter three and raised a fair point. Argon reads a scan for 1.8 pence. The Custom Extractor costs 2.4 pence a page. Why pay for both?"
        },
        {
          kind: "p",
          text: "This chapter answers that question with numbers. The other reader in the comparison is a **layout model**. In this chapter the term covers any Document AI processor that returns boxes, such as Form Parser or Harbour's Custom Extractor."
        },
        {
          kind: "p",
          text: "A vision model's path has three steps. You render the page to pixels at a resolution you choose. The provider turns those pixels into tokens. You send the tokens with a prompt and a schema, and read JSON back."
        },
        {
          kind: "p",
          text: "Resolution is the first lever. A US letter page is 8.5 by 11 inches. At 150 dots per inch it's 1,275 by 1,650 pixels, about 2.1 million in all. At 72 dots per inch it's 612 by 792, under half a million."
        },
        {
          kind: "code",
          lang: "python",
          // CHECKED 17 Oct 2026: https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools and https://platform.claude.com/docs/en/build-with-claude/vision
          code: "import base64\nimport fitz  # PyMuPDF\nfrom anthropic import Anthropic\n\nclient = Anthropic()\n\ndef render(pdf_path: str, page_no: int, dpi: int = 150) -> str:\n    page = fitz.open(pdf_path)[page_no]\n    return base64.b64encode(page.get_pixmap(dpi=dpi).tobytes(\"png\")).decode()\n\ndef read_page(pdf_path: str, page_no: int, dpi: int = 150) -> dict | None:\n    reply = client.messages.create(\n        model=MODEL,  # from config, never hard-coded\n        max_tokens=1024,\n        tools=[{\"name\": \"record_invoice\", \"strict\": True, \"input_schema\": INVOICE_SCHEMA}],\n        tool_choice={\"type\": \"auto\"},  # a forced tool_choice returns a 400 on Sonnet 5.5\n        messages=[{\"role\": \"user\", \"content\": [\n            {\"type\": \"image\", \"source\": {\"type\": \"base64\", \"media_type\": \"image/png\", \"data\": render(pdf_path, page_no, dpi)}},\n            {\"type\": \"text\", \"text\": \"Record the invoice fields from this page with the record_invoice tool. Use null for any field you cannot see.\"},\n        ]}],\n    )\n    return next((b.input for b in reply.content if b.type == \"tool_use\"), None)",
          caption: "Render, send with a strict schema and read the structured reply. This version calls Claude, for a customer with no region rule. The prompt names the tool, because a forced tool choice returns an error on Sonnet 5.5."
        },
        {
          kind: "p",
          text: "The schema does the same job as in chapter three of the LLM engineering course. It fixes field names and types, so the reply can be validated. The render and schema steps are the same when the reader is a Gemini model. Size limits and batch calls belong to chapter seven of the LLM engineering course."
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Small print sets the floor for resolution",
          text: "Render too low and the model guesses digits it can't see. Render too high and you pay for pixels the provider throws away. Find the lowest resolution at which your smallest print is still legible, then test that setting on real pages."
        },
        {
          kind: "quiz",
          id: "docai07-q1",
          question: "A letter page, 8.5 by 11 inches, is rendered at 100 dots per inch. What size is the image?",
          options: [
            "612 by 792 pixels",
            "850 by 1,100 pixels",
            "1,275 by 1,650 pixels",
            "2,550 by 3,300 pixels"
          ],
          answer: 1,
          explain: "Multiply each side in inches by the dots per inch. 8.5 times 100 is 850, and 11 times 100 is 1,100. The first option is 72 dots per inch."
        },
        {
          kind: "p",
          text: "Pixels are only the input to a price. Each provider converts them by its own rule."
        }
      ]
    },
    {
      id: "s2-cost",
      title: "Cost per page is tokens times price, and each provider counts tokens differently",
      goal: "What does one page cost and how long does it take on each provider?",
      blocks: [
        {
          kind: "p",
          text: "The rules change between model versions, so treat these figures as a method. Rework them from the current documentation before you quote a bill. The sums use a letter page, as the providers' examples do. Harbour's A4 pages come out about 5 percent higher on the models that count patches."
        },
        {
          kind: "p",
          // CHECKED 9 Nov 2026: https://platform.claude.com/docs/en/build-with-claude/vision
          text: "Claude cuts the image into 28-pixel patches and charges one token per patch. Sonnet 5.5 caps an image at a 2,576-pixel long edge and 4,784 tokens. The letter page at 150 dots per inch is 46 by 59 patches, which is 2,714 tokens. At 200 dots per inch the cap bites, and the page costs 4,758."
        },
        {
          kind: "p",
          // CHECKED 9 Nov 2026: https://developers.openai.com/api/docs/guides/images-vision
          text: "GPT-5.6 in high detail mode cuts the image into 32-pixel patches and keeps it under 2,500 patches. It then multiplies the count by 1.2. The letter page is 40 by 52 patches, which is 2,080, so 2,496 tokens. At 200 dots per inch it's scaled to 2,408 patches, or 2,890 tokens."
        },
        {
          kind: "p",
          // CHECKED 9 Nov 2026: https://aistudio.google.com/docs/media-resolution (table headed Gemini 4 and Gemini 3 models; Gemini 3.5 isn't named)
          text: "Gemini charges by its media resolution setting, whatever the pixel size. The default costs 1,120 tokens for one image. The low setting costs 280, and the ultra high setting costs 2,240. So raising the dots per inch costs nothing extra here."
        },
        {
          kind: "compare",
          // CHECKED 17 Oct 2026: Claude and GPT list prices. CHECK: Gemini API list prices and the Vertex token default https://cloud.google.com/vertex-ai/generative-ai/pricing ; Layout Parser price https://cloud.google.com/document-ai/pricing
          caption: "List prices in dollars on 17 October 2026, for one letter page at 150 dots per inch. Each call has a 300-token prompt and 400 tokens of JSON back. The Layout Parser price is illustrative.",
          columns: [
            "Reader",
            "Image tokens",
            "Input, dollars per million",
            "Output, dollars per million",
            "Dollars per page"
          ],
          rows: [
            [
              "Claude Sonnet 5.5",
              "2,714",
              "2.00",
              "10.00",
              "0.0100"
            ],
            [
              "GPT-5.6 terra",
              "2,496",
              "2.00",
              "12.00",
              "0.0104"
            ],
            [
              "Gemini 3.5 Flash-Lite",
              "1,120",
              "0.30",
              "2.50",
              "0.0014"
            ],
            [
              "Layout Parser (illustrative)",
              "none",
              "none",
              "none",
              "0.0100"
            ]
          ]
        },
        {
          kind: "p",
          text: "Work one row. Claude takes 2,714 plus 300, so 3,014 input tokens. At 2 dollars per million that's 0.6 of a cent. The 400 output tokens at 10 dollars per million add 0.4 of a cent. The page costs one cent."
        },
        {
          kind: "p",
          text: "Output tokens also set the delay. At an assumed 60 tokens a second, 400 tokens take about 6.7 seconds. Add 1.5 seconds of overhead and a page takes about 8.2 seconds."
        },
        {
          kind: "p",
          text: "Harbour's 2,400 scan pages, with eight in flight, would take about 41 minutes. A customer with 60,000 pages would wait about 17 hours. Asking for only the fields you need cuts the bill and the wait together."
        },
        {
          kind: "widget",
          id: "docai-page-cost",
          intro: "Two jobs, each with a budget and a deadline. Pick a model and a resolution, then work out the totals from the per-page cost before you check. Watch how the image tokens change as you raise the resolution for each model."
        },
        {
          kind: "quiz",
          id: "docai07-q2",
          question: "A letter page at 150 dots per inch is 1,275 by 1,650 pixels. GPT-5.6 covers it with 32-pixel patches and multiplies the count by 1.2. How many image tokens is that?",
          options: [
            "2,080",
            "2,496",
            "2,714",
            "3,000"
          ],
          answer: 1,
          explain: "The page is 40 patches wide and 52 tall, so 2,080 patches. That is under the 2,500 budget, so there is no resize. Multiply by 1.2 to get 2,496. The first option forgets the multiplier."
        },
        {
          kind: "quiz",
          id: "docai07-q3",
          question: "A page costs $0.0100 to read. What do 60,000 pages cost?",
          options: [
            "$60",
            "$120",
            "$600",
            "$6,000"
          ],
          answer: 2,
          explain: "Multiply 60,000 by 0.01. That is 600 dollars. Check your decimal point first, because an error here is a factor of ten."
        },
        {
          kind: "p",
          text: "None of this settles the sponsor's point, because Argon really is cheaper to run. The choice depends on what happens after the read."
        }
      ]
    },
    {
      id: "s3-choice",
      title: "A vision model wins on odd layouts and low volume, and loses on dense tables and traceability",
      goal: "Which reader should each kind of document get?",
      blocks: [
        {
          kind: "p",
          text: "Start with where it wins. A new document type becomes a prompt, with no labelling. Mixed languages, stamps and handwriting need no separate model. Harbour had a live case. The accounts payable lead wanted about 200 pages of supplier credit notes a month read as well."
        },
        {
          kind: "p",
          text: "A Custom Extractor for those pages would need the same labelling project as chapter two, at 420 pounds. Argon reads them for 1.8 pence each, or 3.60 pounds a month. Reading them with a trained extractor would cost 4.80 a month, so the labelling would never pay back."
        },
        {
          kind: "p",
          text: "Now where it loses. A statement with a 200-row table is a long, repetitive read. A model can skip a row, merge two or repeat one, and then the totals fail. That's why chapter three parses Harbour's statements and never sends them as images."
        },
        {
          kind: "p",
          text: "Volume works against it in a less obvious way. A boxed review costs Harbour 50 pence, at one minute of a clerk's time. Suppose the vision path sends 5 more pages in 100 to a person. That adds 2.5 pence a page, which is more than Argon's whole reading cost."
        },
        {
          kind: "compare",
          // CHECK: confirm Document AI keeps processing in the location you pick for the processor; the locations page says only that you must choose one https://docs.cloud.google.com/document-ai/docs/regions
          caption: "The property of the work picks the reader.",
          columns: [
            "Property of the work",
            "Vision model",
            "Layout model"
          ],
          rows: [
            [
              "Layout changes page to page",
              "Strong",
              "Weak without custom training"
            ],
            [
              "New document type, few pages",
              "A prompt change",
              "Labelling and training"
            ],
            [
              "Tables over 50 rows",
              "Drops or repeats rows",
              "Returns the cells"
            ],
            [
              "High volume of one layout",
              "Review cost grows",
              "Cheap and steady"
            ],
            [
              "Evidence for each value",
              "Lost by default",
              "Boxes in the result"
            ],
            [
              "Pages must stay in one location",
              "Needs a regional endpoint",
              "Runs in the location you pick for the processor"
            ]
          ]
        },
        {
          kind: "p",
          // CHECKED 9 Nov 2026: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/data-residency (UK endpoint europe-west2 lists Gemini 4 Argon and Gemini 3.5 Flash; eu excludes the UK; global gives no guarantee)
          text: "Residency narrows the list before anything else. Harbour's contract keeps data in the UK, and it calls Gemini on Vertex AI. The `global` endpoint may process a request in any region. The `eu` endpoint excludes the UK. Only `europe-west2` fits, and it lists Argon and Gemini 3.5 Flash."
        },
        {
          kind: "p",
          // CHECK: gemini-3.5-flash-lite serves global, us and eu only (FACTS, 20 Oct 2026). CHECK: where implicit caching is stored on a regional endpoint.
          text: "That rules out the cheapest row in the price table, because `gemini-3.5-flash-lite` has no London endpoint. It also rules out Claude and GPT, unless a UK route is confirmed. Check the endpoint with one test call before you put a model in a plan."
        },
        {
          kind: "p",
          text: "The team put the choice for each document type on one sheet. The sheet keeps Harbour's routes from chapter three and adds the credit notes."
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's reader choice sheet. Worked example.",
          code: "READER CHOICE: Harbour Reader\n\nDocument        A month    Layouts     Long tables  Reader\nScanned invoice 2,000      some vary   few          Custom Extractor, Argon if a check fails\nStatement       2,000      one family  200 rows     Native parser, then reconcile\nDelivery note     300      one         no           Tesseract, on the closed network\nCredit note       200 pp   vary        no           Argon, with Form Parser for boxes\n\nCredit notes\nArgon            200 pages at 1.8p     3.60 pounds a month\nForm Parser      200 pages at 2.4p     4.80 pounds a month\nTotal                                  8.40 pounds a month\nLabelling not spent                    420 pounds"
        },
        {
          kind: "p",
          text: "Read the Credit notes block. Harbour pays for two readers on these pages because a value with no box is slow to check. The pair costs 3.60 pounds a month more than a trained extractor. At that rate, 420 pounds of labelling would take more than nine years to pay back."
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer: copy this and fill it in.",
          code: "READER CHOICE: [project]\n\nDocument    A month    Layouts    Long tables    Reader\n\n[New type]\nReader 1    pages at\nReader 2    pages at\nLabelling not spent"
        },
        {
          kind: "widget",
          id: "docai-vlm-or-layout",
          intro: "Eight Harbour Supplies documents. Choose the vision model, the layout model or the hybrid for each one. You get a second try on a miss. Watch for the cases where the sticker price is not the deciding factor."
        },
        {
          kind: "p",
          text: "This choice is a common interview question."
        },
        {
          kind: "callout",
          tone: "interview",
          title: "When would you use a vision model instead of a layout service?",
          text: "Open with the answer: when layouts vary, volume is low or the document type is new, and never alone where a wrong value costs money. Then give the arithmetic: tokens per page, price, delay and review cost. Interviewers push on dense tables, residency and how you would prove the choice."
        },
        {
          kind: "quiz",
          id: "docai07-q4",
          question: "The vision path sends 3 more pages in 100 to review than the layout path. A review costs 50 pence. What extra cost does that add per page read?",
          options: [
            "0.3 pence",
            "1.5 pence",
            "15 pence",
            "1.50 pounds"
          ],
          answer: 1,
          explain: "Three in 100 is 0.03 of a review. Multiply by 50 pence to get 1.5 pence a page. That is close to the whole reading cost of a page on Argon."
        },
        {
          kind: "p",
          text: "The credit notes needed Form Parser only for its boxes. That raises the question of what a box is worth, and how to get one back."
        }
      ]
    },
    {
      id: "s4-grounding",
      title: "A vision model returns no reliable box, so rebuild the evidence yourself",
      goal: "How do you tie each vision-model value to a place on the page?",
      blocks: [
        {
          kind: "p",
          // CHECKED 17 Oct 2026: https://platform.claude.com/docs/en/build-with-claude/vision-coordinates ; images-vision guide
          text: "An OCR processor returns a box for every word it reads. Layout Parser returns boxes for blocks such as tables, and whether it boxes words is still open. A vision model returns text. Some models can be asked for coordinates, but a coordinate is generated like any other token. It can drift off the value it claims to mark."
        },
        {
          kind: "p",
          text: "Without a box, a clerk scans a whole page to check one total. That's the two minutes chapter two set out to save. An auditor can't see what was read either. There are three ways to get the evidence back, and they cost different amounts."
        },
        {
          kind: "p",
          text: "The first is a **quote check**. You ask for the source text of each value, and require that text to appear in the page's text layer or OCR output. It's the rule chapter three set for any vision model."
        },
        {
          kind: "p",
          text: "The second is **crop and confirm**. The model names a region, such as the bottom right quarter. You cut that crop at higher resolution and ask one small question. Does this crop show 1,260.00 as the total?"
        },
        {
          kind: "p",
          text: "On Claude a 400 by 200 pixel crop is 15 by 8 patches, which is 120 tokens. That comes to about 0.04 of a cent a field. On Gemini the crop still costs the setting's flat rate, which is 280 tokens at the low setting. Crops are a bargain only on models that count patches."
        },
        {
          kind: "p",
          text: "The third is a **hybrid**. The layout model runs first and gives text with boxes. The vision model reads the same page. You match each quote from the vision model to words in the layout output, and take the box from there."
        },
        {
          kind: "p",
          text: "Harbour already had what the hybrid needs. A scan reaches Argon only after a check fails, so the Custom Extractor has already read it. Those 400 escalations a month carry boxes at no extra cost. Only the matching step was missing."
        },
        {
          kind: "code",
          lang: "python",
          code: "def ground(quote: str, words: list[Word]) -> Box | None:\n    \"\"\"Return the box of the layout words that spell the quote, or None.\"\"\"\n    target = normalise(quote)  # strip spaces, commas and case\n    for i in range(len(words)):\n        run = \"\"\n        for j in range(i, min(i + 6, len(words))):\n            run += normalise(words[j].text)\n            if run == target:\n                return union_box(words[i : j + 1])\n            if len(run) >= len(target):\n                break\n    return None",
          caption: "Match a vision-model quote to a run of layout words. A result of None sends the value to review."
        },
        {
          kind: "p",
          text: "Harbour matches the quote and never the value. On invoice 20418 Argon returned the due date as 2026-11-14, and the page says 14 Nov 2026. Only the quote can match the page."
        },
        {
          kind: "code",
          lang: "text",
          caption: "Grounding Argon's re-read of invoice 20418, cut to six fields. Worked example, invented coordinates.",
          code: "GROUNDING: doc-3fa94c1e0b77, page 1, Argon re-read\n\nField            Value        Quote         Box (x, y, normalised)    Result\nsupplier_name    Northgate    Northgate     0.08 0.06 to 0.41 0.09    grounded\n                 Pallets      Pallets\ninvoice_id       20418        20418         0.72 0.11 to 0.81 0.13    grounded\ndue_date         2026-11-14   14 Nov 2026   0.72 0.15 to 0.88 0.17    grounded\nnet_amount       405.00       405.00        0.78 0.71 to 0.88 0.73    grounded\ntotal_amount     486.00       486.00        0.78 0.79 to 0.88 0.81    grounded\npurchase_order   PO 20418     PO 20418      none                      review"
        },
        {
          kind: "p",
          text: "Read the last row. The page has no purchase order. Argon built one from the invoice number and returned a quote to match. Nothing on the page spelt it, so the value went to review and never reached the ledger. The unmatched value is the most useful line on the sheet."
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer: copy this and fill it in.",
          code: "GROUNDING: [document, page, reader]\n\nField    Value    Quote    Box    Result"
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Pay for the hybrid only where someone will open the box",
          text: "A hybrid means paying two readers on a page. It earns that where a clerk or an auditor will look at the evidence. Elsewhere, use a single reader and keep the quote check."
        },
        {
          kind: "quiz",
          id: "docai07-q5",
          question: "The vision model returns a total of 1,260.00. No layout word matches it, and the page shows 1,206.00. What should the pipeline do?",
          options: [
            "Accept it, because the model was confident.",
            "Send it to review with the page region of the nearest total, and do not post it.",
            "Retry the vision call until the value matches.",
            "Replace it with the layout model's value without a check."
          ],
          answer: 1,
          explain: "An unmatched value has no evidence. Retrying may reproduce the error, and silently swapping values hides it. A reviewer sees the page and settles it."
        },
        {
          kind: "p",
          text: "The grounding step closes the evidence gap. The sponsor's question still needs measured results."
        }
      ]
    },
    {
      id: "s5-evaluate",
      title: "Judge both readers on the same documents, then count the review they cause",
      goal: "How does Harbour compare two readers fairly, and what decides between them?",
      blocks: [
        {
          kind: "p",
          text: "Score both paths on one golden set, as chapter two did for extractors. Split by supplier, so no layout sits on both sides. Mix easy and odd documents, because the vision model's advantage shows only on the odd ones."
        },
        {
          kind: "p",
          text: "Use **field precision** and **field recall**, which apply the measures from course 1 to one field at a time. Precision is the share of returned values that are right. Recall is the share of expected values returned right. Then add the document pass rate from chapter two."
        },
        {
          kind: "p",
          text: "Harbour built a set of 100 awkward scans, with the five fields the ledger needs most. It over-samples hard layouts, so these failure rates sit well above the 8 percent Harbour sees in production."
        },
        {
          kind: "compare",
          caption: "Illustrative results on 100 scans with 5 labelled fields each, so 500 expected values.",
          columns: [
            "Path",
            "Returned",
            "Correct",
            "Precision",
            "Recall",
            "Documents fully right"
          ],
          rows: [
            [
              "Custom Extractor",
              "470",
              "455",
              "96.8%",
              "91.0%",
              "78"
            ],
            [
              "Argon",
              "495",
              "465",
              "93.9%",
              "93.0%",
              "71"
            ]
          ]
        },
        {
          kind: "p",
          text: "Argon returns more, so its recall is higher. It also invents more, so its precision is lower. Its 30 wrong values include some that the page never held."
        },
        {
          kind: "p",
          text: "Per passing document, the sponsor was right. The Custom Extractor reads 100 scans for 240 pence and passes 78, which is 3.08 pence each. Argon reads them for 180 pence and passes 71, which is 2.54 pence each. Reading cost alone favours Argon."
        },
        {
          kind: "p",
          text: "Review reverses that. A failed document goes to a clerk, and it costs 50 pence with a box or 150 pence without one. The team set out all three options side by side and put the result in a record for the sponsor."
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's reader decision record for scanned invoices. Results and rates are worked examples.",
          code: "READER DECISION RECORD: scanned invoices\nOwner: Harbour platform team    Status: accepted\nQuestion: Argon reads for less, so why pay for the Custom Extractor?\n\nPer 100 scans (pence)     Custom Extractor  Argon, no boxes  Argon, boxes rebuilt\nReading                   240               180              420\nDocuments to review       22                29               29\nCost of one review        50                150              50\nReview                    1,100             4,350            1,450\nTotal                     1,340             4,530            1,870\nPer document              13.40             45.30            18.70\n\nDecision   Keep the Custom Extractor first and Argon when a check fails.\nWhy        Clerk time is 82 percent of the cost on the winning path.\nGives up   The cheaper reading line.\nRevisit    If a vision model passes 82 or more of these 100 with boxes rebuilt."
        },
        {
          kind: "p",
          text: "Read the Review row before the Reading row. Clerk time is 1,100 of the winning path's 1,340 pence. Argon with no boxes is cheapest to read and more than three times the total cost. The Revisit line is a sum as well. At 18 failures, the rebuilt path costs 1,320 pence, just under 1,340."
        },
        {
          kind: "p",
          text: "Slice the result by document type before routing. A path can lose overall and still win on odd layouts, which is why Argon keeps the escalations. Run the vision path more than once as well, since the same page can read differently, and score each run."
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer: copy this and fill it in.",
          code: "READER DECISION RECORD: [document type]\nOwner:     Status:\nQuestion:\n\nPer 100 documents    Reader A    Reader B    Reader B with evidence\nReading\nDocuments to review\nCost of one review\nReview\nTotal\nPer document\n\nDecision\nWhy\nGives up\nRevisit"
        },
        {
          kind: "p",
          text: "Proving a vision model is ready comes up in interviews too."
        },
        {
          kind: "callout",
          tone: "interview",
          title: "A vision model works well in a demo. How do you prove it is ready for invoices?",
          text: "Open with the answer: score it against the layout path on the same labelled set, by field and by document. Give precision, recall and pass rate, sliced by document type. Then add how you ground values, since a vision model returns no boxes. Interviewers push on invented values and cost per passing document."
        },
        {
          kind: "quiz",
          id: "docai07-q6",
          question: "A path returns 200 values and 180 are right. There were 220 expected values. What is its recall?",
          options: [
            "90.0%",
            "81.8%",
            "78.0%",
            "100%"
          ],
          answer: 1,
          explain: "Recall is correct over expected, so 180 over 220, which is 81.8 percent. The 90 percent figure is precision, which is correct over returned."
        },
        {
          kind: "quiz",
          id: "docai07-q7",
          question: "The vision path has higher recall but fewer documents fully right. Which figure should drive the routing decision?",
          options: [
            "Recall, because it finds more values.",
            "Document pass rate and cost per passing document, sliced by document type.",
            "Whichever path is cheaper per page.",
            "The vision model's own confidence."
          ],
          answer: 1,
          explain: "A document either posts cleanly or goes to a person. Pass rate and cost per passing document measure that outcome. The slice shows where each reader earns its place."
        },
        {
          kind: "p",
          text: "Every reader, rule and queue in Harbour Reader now has a reason on paper. One question remains from chapter two: did the box save the two minutes it promised? The last chapter follows invoice 20418 through the finished system and checks."
        }
      ]
    }
  ],
  recap: [
    "A page becomes tokens by a provider rule, so render at the lowest resolution that keeps the small print legible.",
    "Cost per page is input tokens times the input price plus output tokens times the output price, and output also sets the delay.",
    "A vision model suits odd layouts, new types and low volume, and a layout model suits dense tables and steady volume.",
    "Region can settle the shortlist first, and review cost usually settles the rest.",
    "Rebuild evidence with a quote check, a crop or a hybrid, and send unmatched values to review.",
    "Score both readers on one golden set, then compare total cost per document with review included."
  ],
  reinforcement: "I am becoming a forward-deployed AI engineer. In vision models as readers I learned to price a page as tokens times price and to score it against a layout model on the same set, with review included. Odd layouts and low volume go to the vision model. I rebuild evidence by quote, crop or hybrid. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: [
    "docai-q14",
    "docai-q15"
  ]
};

export default chapter;
