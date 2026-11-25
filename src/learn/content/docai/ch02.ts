import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "docai-02-document-intelligence",
  course: "docai",
  number: 2,
  title: "Check the region first, then let field-level evidence choose the processor",
  tagline: "Prebuilt comes first where the region allows it, and custom earns its place field by field.",
  minutes: 42,
  objectives: [
    "Check which processors a customer's data rule allows before comparing their quality.",
    "Choose between prebuilt and custom extractors, and write the choice down.",
    "Split labelled documents so supplier leakage can't inflate a score.",
    "Read a per-field evaluation and turn it into a document pass rate.",
    "Describe a safe path from a trained version to production."
  ],
  sections: [
    {
      id: "s1-prebuilt",
      title: "Prebuilt processors need no labelling, and Harbour's region rules out the best one",
      goal: "Which of Document AI's ready-made processors can Harbour use at all?",
      blocks: [
        {
          kind: "p",
          text: "Chapter one ended with a record Harbour wants for every page. This chapter finds the engine to fill it. In Document AI you create a **processor**, send it a file and get back a Document holding the layers from chapter one."
        },
        {
          kind: "p",
          text: "A **prebuilt processor** comes trained by Google for a common document type, and Google's documentation calls these pretrained. You do no labelling and no training. These are the ones that matter to Harbour."
        },
        {
          kind: "list",
          items: [
            "**Enterprise Document OCR** reads text, including handwriting, and returns positions. It returns no fields.",
            "**Form Parser** adds key-value pairs, tables and checkboxes.",
            "**Layout Parser** returns text, tables and lists, and builds chunks for search and generative AI.",
            "**Invoice Parser** returns named fields such as supplier, invoice number, dates, line items and totals.",
            "Expense Parser reads receipts and returns the supplier, date, total and currency."
          ]
        },
        {
          kind: "p",
          text: "Invoice Parser looks like the obvious answer, and on most engagements it would be. You'd run it over a labelled sample of the customer's invoices that same afternoon. The per-field result would show which fields need work."
        },
        {
          kind: "p",
          text: "Harbour has a rule that comes first. Its contract keeps data in the UK, so every processor must run in `europe-west2`, the London region. The FDE opened Google's regions page before comparing anything, and that took ten minutes."
        },
        {
          kind: "compare",
          // CHECKED 9 Nov 2026: https://docs.cloud.google.com/document-ai/docs/regions and https://docs.cloud.google.com/document-ai/docs/processors-list
          caption: "What Google listed for London on 9 November 2026. Regions change, so read the page again before you rely on this.",
          columns: [
            "Processor",
            "In `europe-west2`?",
            "What that means for Harbour"
          ],
          rows: [
            [
              "Invoice Parser",
              "Not listed",
              "Out, because the invoice would leave the UK"
            ],
            [
              "Layout Parser",
              "Not listed",
              "Out"
            ],
            [
              "Form Parser",
              "Listed, versions 1.0 to 2.1",
              "Available as a baseline"
            ],
            [
              "Enterprise Document OCR",
              "Listed, version 2.1.1 preview only",
              "Available, and it's a preview"
            ],
            [
              "Custom Extractor",
              "Listed",
              "Available, and the next section compares its kinds"
            ]
          ]
        },
        {
          kind: "p",
          text: "That table changed the engagement in one read. The cheap route was closed, and no amount of accuracy could open it. Check the data rule first on any customer, because it removes options before quality matters."
        },
        {
          kind: "code",
          lang: "python",
          // CHECKED 21 Oct 2026: https://docs.cloud.google.com/document-ai/docs/process-documents-client-libraries and handle-response
          code: "from google.api_core.client_options import ClientOptions\nfrom google.cloud import documentai\n\nlocation = \"europe-west2\"  # Harbour's contract: UK only\nclient = documentai.DocumentProcessorServiceClient(\n    client_options=ClientOptions(api_endpoint=f\"{location}-documentai.googleapis.com\")\n)\nname = client.processor_path(project_id, location, processor_id)\nraw = documentai.RawDocument(content=pdf_bytes, mime_type=\"application/pdf\")\nresult = client.process_document(request=documentai.ProcessRequest(name=name, raw_document=raw))\nfor entity in result.document.entities:\n    if entity.type_ == \"total_amount\":\n        print(entity.mention_text, entity.confidence)",
          caption: "The call shape. Make a client for the processor's location, send the file and read the fields from the Document."
        },
        {
          kind: "p",
          // CHECKED 9 Nov 2026: https://docs.cloud.google.com/document-ai/limits
          text: "Online processing is synchronous, takes up to 15 pages and returns the Document in its response. Batch processing is asynchronous, so you start an operation and poll it. Chapter five needs that difference when it runs extraction from a queue."
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Prebuilt is a baseline, even if you will go custom",
          text: "Run the best prebuilt processor you're allowed over your labelled test set first. Without it, any custom version you train has nothing to be compared with. At Harbour that baseline is Form Parser."
        },
        {
          kind: "widget",
          id: "docai-prebuilt-or-custom",
          intro: "Six document scenarios. Choose a prebuilt processor or one of two custom extractor kinds. A template-based extractor learns positions on one fixed layout. A model-based extractor learns from text and context, and so does the Gemini foundation-model kind, which the next section covers. Then read the reason. Watch the scenario where only one field is missing."
        },
        {
          kind: "quiz",
          id: "docai02-q1",
          question: "You need supplier name, invoice number and total from invoices of 300 different vendors. What do you try first?",
          options: [
            "Train a model-based custom extractor on 300 layouts.",
            "The Invoice Parser, scored on a labelled sample of your own invoices.",
            "Enterprise Document OCR, then regular expressions.",
            "A vision model with no validation."
          ],
          answer: 1,
          explain: "The Invoice Parser covers these standard fields across varied layouts. You measure it on your documents. Only a shortfall on specific fields justifies the labelling cost of custom."
        },
        {
          kind: "p",
          text: "Interviewers often ask how you'd choose between prebuilt and custom."
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Prebuilt against custom",
          text: "Lead with the default: a prebuilt processor for supported document types, because there's no labelling or training. Say you'd check the region first. Use custom when the layouts or fields aren't supported, or the region closes the prebuilt route. Name the evidence: field-level accuracy on representative documents, plus training effort, maintenance, latency and cost."
        },
        {
          kind: "p",
          text: "With the prebuilt route closed, Harbour needs a processor it builds itself. There are three kinds."
        }
      ]
    },
    {
      id: "s2-custom",
      title: "A custom extractor comes in three kinds, and Harbour's layouts and region pick one",
      goal: "Which kind of custom extractor suits twelve layouts in London?",
      blocks: [
        {
          kind: "p",
          text: "A **custom extractor** is a processor you build in Document AI Workbench for fields you define. You write a schema, then supply examples. Each training run gives you a **processor version**. The kinds differ in what they learn from."
        },
        {
          kind: "compare",
          // CHECKED 9 Nov 2026: https://docs.cloud.google.com/document-ai/docs/custom-extractor-overview and ce-with-genai
          caption: "Custom options on Document AI. Names and capabilities change, so check the current documentation.",
          columns: [
            "Kind",
            "Learns from",
            "Best for",
            "Weakness"
          ],
          rows: [
            [
              "Template-based extractor",
              "Positions on a fixed layout",
              "One stable form, such as a customs sheet",
              "Breaks when the layout shifts"
            ],
            [
              "Model-based extractor",
              "Text and context in your labelled documents",
              "Varied layouts of one document type",
              "Needs at least 10 training and 10 test instances of each field, and hours to train"
            ],
            [
              "Gemini foundation-model extractor",
              "A Gemini model guided by your schema, with no examples, a few or a fine-tune",
              "Varied layouts with few labelled documents",
              "It can invent a value, so it needs the same field-level scoring"
            ],
            [
              "Custom classifier or splitter, plus one processor per type",
              "Example documents of each type, or a pretrained version with none",
              "Several document types in one intake stream",
              "A wrong class sends a document to the wrong processor"
            ]
          ]
        },
        {
          kind: "p",
          text: "A **custom classifier** labels each document with a type. A **custom splitter** cuts a file of several documents into single documents. Your own code then sends each one to the right processor. Chapter six deals with files like that at Harbour."
        },
        {
          kind: "p",
          text: "For Harbour, the method is to remove what the facts rule out. Harbour has about 12 common layouts, so a template per layout would break on the first redesign. That leaves the Gemini kind and the model-based kind."
        },
        {
          kind: "p",
          text: "The Gemini kind needs the fewest labels, so the team wanted it. Then the FDE found that two of Google's own pages disagree. The regions page lists Gemini version 1.5 for London without fine-tuning. The processors page limits generative extraction to other locations."
        },
        {
          kind: "p",
          text: "The IT lead wouldn't build a contract rule on a contradiction, and the FDE agreed. A raised support ticket could settle it later. The model-based kind is listed for London on both pages, so it won. This is the record that came out."
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's processor decision record. Regions were read on 9 November 2026. Prices are illustrative, because Google's price page couldn't be confirmed.",
          code: "PROCESSOR DECISION RECORD: Harbour Reader, scanned invoices\nOwner: FDE, with the IT lead       Sponsor told: yes\n\nNeed       10 fields with positions on about 2,000 scans a month\n           (about 2,400 pages).\nRule       UK only, so every processor runs in europe-west2.\n\nOption                         London?        Result\nA  Invoice Parser              not listed     out, breaks the contract\nB  Form Parser                 listed         keep as the baseline\nC  Custom Extractor, Gemini    pages disagree out until Google's pages agree\nD  Custom Extractor, model     listed         chosen\n\nGives up   Invoice Parser's no-label start, and one more thing to maintain.\nCost       Labelling, once: 420 pounds.\n           Running: 2,400 pages at 30 dollars per 1,000 = 72 dollars\n           a month (57.60 pounds at 1.25 dollars to the pound).\nSaving     160 scan reviews a month, 2 of 3 minutes saved, 100 pence\n           each = 160 pounds a month. Net about 102 pounds a month.\nPayback    About 4 months on labelling.\nRevisit    If Google lists Invoice Parser in London, or the contract changes."
        },
        {
          kind: "p",
          text: "Read the Gives up line first, since that's what the sponsor will question. Next read the sum. The saving depends on the box actually saving two minutes, and chapter eight checks that. Harbour's own costs are in pounds in this course. Vendor price lists stay in dollars."
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer: copy this and fill it in.",
          code: "PROCESSOR DECISION RECORD: [customer, document type]\nOwner:             Sponsor told:\n\nNeed\nRule       [data location or other rule that removes options]\n\nOption                         Allowed?       Result\n\nGives up\nCost\nSaving\nPayback\nRevisit    [the fact that would reopen this decision]"
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Custom for one missing field is often too much",
          // CHECK: confirm uptraining the Invoice Parser is generally available. https://docs.cloud.google.com/document-ai/docs/uptrain-pretrained-processor
          text: "If a prebuilt processor gets nine fields right and misses the purchase order number, keep it for the nine. A small custom extractor or a targeted rule covers the tenth. Retraining everything to fix one field multiplies your maintenance."
        },
        {
          kind: "quiz",
          id: "docai02-q2",
          question: "Harbour Supplies files one customs form with an identical printed layout every time. Which custom kind fits best?",
          options: [
            "Model-based, because it is newer.",
            "Template-based, because position is a reliable signal on a fixed layout.",
            "A custom classifier with a processor per type, because there is one form.",
            "Enterprise Document OCR, which returns fields."
          ],
          answer: 1,
          explain: "When the layout never changes, position is a strong cue, and a template-based version needs only a few labelled documents. Enterprise Document OCR returns text and layout but no entities."
        },
        {
          kind: "p",
          text: "The record commits Harbour to labelling. Labelling is where most custom extractors go wrong."
        }
      ]
    },
    {
      id: "s3-training",
      title: "Training starts with a schema and consistent labels, and ends with a split by supplier",
      goal: "How do you prepare labels that let a score mean something?",
      blocks: [
        {
          kind: "p",
          text: "The method has four steps. Write a one-line rule for each field. Collect documents that look like production. Label them the same way each time. Split them so that the test set holds what production will bring."
        },
        {
          kind: "p",
          text: "The rule comes first. Is the invoice date the issue date, or the tax point date when VAT falls due? Two labellers who read that differently will teach the model to guess. Harbour's accounts payable lead wrote the rules, and they took a morning."
        },
        {
          kind: "p",
          text: "Representative means suppliers, layouts, scan quality and languages. Fifty clean invoices from your best supplier train a model that fails on the rest. Harbour drew its first set from the post room's real scans."
        },
        {
          kind: "list",
          items: [
            "Label every instance of a field the same way, including when it appears twice.",
            "Leave an absent field unlabelled, and never label a guess.",
            "Have a second person check a sample of the labels.",
            "Keep the labelling rules beside the data, and version them together."
          ]
        },
        {
          kind: "p",
          // CHECKED 21 Oct 2026: https://docs.cloud.google.com/document-ai/docs/label-documents, ce-template-based, custom-based-extraction, ce-with-genai
          text: "Document AI Workbench is the labelling tool, and it can suggest labels for you to review. A template-based version needs three training and three test documents. A model-based version needs at least 10 of each for every field. Google's advice for a strong model is about 50 and 50."
        },
        {
          kind: "p",
          // CHECKED 21 Oct 2026: https://docs.cloud.google.com/document-ai/docs/create-dataset and ce-mechanisms
          text: "Now the split. A random split looks fair and isn't. Invoices from one supplier share a layout, so a random split tests the model on layouts it has already seen. Document AI's auto-split is random, so assign test documents by supplier yourself."
        },
        {
          kind: "p",
          text: "Harbour's plan keeps eight whole suppliers out of training. Each of the 12 common layouts gets five training invoices, which makes 60. The test set holds 100 invoices from those eight suppliers. Labelling takes four minutes an invoice at an assumed 30 pounds an hour."
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's labelling plan, with assumed times and rates.",
          code: "LABELLING PLAN: Harbour Reader custom extractor\nRules owner: accounts payable lead\n\nSet        Documents   Time at 4 min     Cost at 30 pounds/hour\nTraining   60          4 h               120.00\nCheck 1/3  20          1 h 20 min         40.00\nTest       100         6 h 40 min        200.00\nCheck      30          2 h                60.00\nTotal                                    420.00\n\nSplit      By supplier. 8 suppliers appear only in test.\nFields     invoice_id, invoice_date, due_date, supplier_name,\n           purchase_order, net_amount, total_tax_amount,\n           total_amount, currency, line_item\nVersioned  labels, rules and split list, together."
        },
        {
          kind: "p",
          text: "Follow the sum down the last column, because 420 pounds is the figure in the decision record. More than half of it pays for the test set. That's correct, since the test set is what every later version gets judged against."
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer: copy this and fill it in.",
          code: "LABELLING PLAN: [customer]\nRules owner:\n\nSet        Documents   Time     Cost\nTraining\nCheck\nTest\nCheck\nTotal\n\nSplit      [whatever varies in production]\nFields\nVersioned  "
        },
        {
          kind: "widget",
          id: "docai-label-split",
          intro: "Twelve labelled invoices from four suppliers, a toy set far smaller than a real one. Train on a random split, then on a supplier split, and compare the scores. Then predict what score the next new supplier will get."
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Split by whatever varies in production",
          text: "Production brings new suppliers, so split by supplier. If it brings new months, split by date. If it brings new scanners, split by scan source. Keep the same unit out of both sides of the split."
        },
        {
          kind: "quiz",
          id: "docai02-q3",
          question: "Test invoices come from the same suppliers as the training invoices. The test score is 96 percent. What is the risk?",
          options: [
            "None, because the test set is separate.",
            "The score measures memorised layouts, so it overstates accuracy on new suppliers.",
            "The model is too small.",
            "The labels are wrong."
          ],
          answer: 1,
          explain: "Layout is shared within a supplier. The model has effectively seen the test layouts, so the score does not predict behaviour on a supplier it has never seen."
        },
        {
          kind: "p",
          text: "The labels are ready and the version has trained. Next comes reading its result."
        }
      ]
    },
    {
      id: "s4-evaluate",
      title: "A field score flatters, so report the document pass rate beside it",
      goal: "What does a per-field result tell you to do next?",
      blocks: [
        {
          kind: "p",
          text: "A single accuracy number hides the failures that matter. Score each field with two questions. How often is it found? That is recall, from course 1. How often is it right when found? That is precision, from the same course."
        },
        {
          kind: "compare",
          // CHECKED 21 Oct 2026: https://docs.cloud.google.com/document-ai/docs/evaluate
          caption: "Harbour's first version on the 100 test invoices, each carrying all four fields. Illustrative figures. Workbench reports precision, recall and F1 for each label and offers no accuracy number.",
          columns: [
            "Field",
            "Found (recall)",
            "Right when found (precision)",
            "What it tells you"
          ],
          rows: [
            [
              "Invoice number",
              "99",
              "98",
              "Safe to automate"
            ],
            [
              "Total",
              "97",
              "96",
              "Automate behind checks against other fields"
            ],
            [
              "Due date",
              "88",
              "90",
              "Many missing, so send to review when absent"
            ],
            [
              "Purchase order",
              "61",
              "93",
              "Rarely found, so labels or layouts need work"
            ]
          ]
        },
        {
          kind: "p",
          text: "Read the purchase order row. When found it's nearly always right, yet it's missing on four invoices in ten. The fix is more labelled examples of the layouts where it hides."
        },
        {
          kind: "p",
          text: "Now take the number the sponsor cares about. A document passes only when every required field is right. Multiply found by right when found, and the four fields give about 97, 93, 79 and 57 correct values out of 100."
        },
        {
          kind: "p",
          text: "If the failures all overlap, 57 documents pass. If they never overlap, add the four shortfalls of 3, 7, 21 and 43, which is 74, and 26 pass. Real data lands between 26 and 57. Report that range beside the field scores, because field scores always look kinder."
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer: the same sheet, ready to fill in.",
          code: "EVALUATION SHEET: [processor version], [test set version]\nTest documents:      Split by:\n\nField   Found   Right when found   Correct (found x right)   Action\n\nDocument pass rate: best case [lowest correct], worst case [100 minus shortfalls]"
        },
        {
          kind: "widget",
          id: "docai-field-scorer",
          intro: "Two fields, scored on the same ten invoices. Count what was found, count what was right, then choose the fix. Notice that the same low score can call for different work depending on which half is low."
        },
        {
          kind: "quiz",
          id: "docai02-q6",
          question: "A field is found on 60 invoices in 100 and is right on all 60. What is the main fix?",
          options: [
            "Add rules and review, because precision is the problem.",
            "Label more examples of the layouts where it is missed, because recall is the problem.",
            "Raise the confidence threshold.",
            "Switch to a vision model for every invoice."
          ],
          answer: 1,
          explain: "Precision is 100 percent and recall is 60 percent. The model reads the field well when it finds it, so give it more labelled examples of the layouts where it does not."
        },
        {
          kind: "p",
          text: "Models also drift. New suppliers, a redesigned template or a new scanner changes the inputs. Watch the per-field results on a rolling sample of reviewed documents. A steady fall in one field is your signal."
        },
        {
          kind: "p",
          text: "Retrain on evidence. Add the documents reviewers corrected to the labelled set, split properly and retrain. Keep the old test set unchanged, so old and new versions compare fairly."
        },
        {
          kind: "p",
          text: "This whole sequence is a common interview question."
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Train and evaluate a custom model",
          text: "Give the sequence in order: schema, representative documents, consistent labels, a split without leakage, training, field-level metrics, a test on unseen documents. Then add the lifecycle: version the extractor and its data, roll out gradually, watch drift and retrain on reviewed corrections. Mention leakage by name."
        },
        {
          kind: "quiz",
          id: "docai02-q4",
          question: "One field's score falls steadily over three months while the rest hold. What do you do first?",
          options: [
            "Retrain the whole model immediately.",
            "Find the new suppliers or layouts behind the drop, using the reviewed corrections for that field.",
            "Lower the confidence threshold.",
            "Switch the field off."
          ],
          answer: 1,
          explain: "Diagnose first. The corrections show what changed. Then add those examples to the labelled set and retrain with a proper split."
        },
        {
          kind: "p",
          text: "A better score only helps once it's live. Getting it live safely is the last job here."
        }
      ]
    },
    {
      id: "s5-versioning",
      title: "Version processors and data together, and keep the old version as the default",
      goal: "How does Harbour ship a new version and keep a way back?",
      blocks: [
        {
          kind: "p",
          // CHECKED 21 Oct 2026: https://docs.cloud.google.com/document-ai/docs/manage-processor-versions
          text: "A processor holds versions. You create one, evaluate it, deploy it and set it as the default. Treat each version id as a release, and store it with every extraction, next to the labelled set that trained it."
        },
        {
          kind: "p",
          text: "Roll out in steps. A request that names no version uses the default. Run the new version in shadow first, by naming it on real documents and comparing the output with the default's. Then name it on a small share of live requests and widen."
        },
        {
          kind: "p",
          text: "Harbour's first retrain added 40 corrected invoices. The team wrote one record and kept it beside the config, so anyone could see what was running and why."
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's version record. Version ids and scores are illustrative.",
          code: "VERSION RECORD: Harbour Reader custom extractor\n\nField               Current default     Candidate\nProcessor version   hr-extract-v1       hr-extract-v2\nLabelled set        labels-v1 (60)      labels-v2 (100)\nTest set            test-v1 (100)       test-v1 (100, unchanged)\nDocument pass       26 to 57            40 to 66\n\nShadow      2 weeks, all scanned invoices\nSmall share 10 percent for 1 week\nRollback    change PROCESSOR_VERSION in config to hr-extract-v1\nPromote     after one full month-end run with no increase in review rate"
        },
        {
          kind: "p",
          text: "The two lines that matter are Test set and Rollback. The test set stayed the same, so the scores can be compared. Rollback is a config change, and the old version stays deployed until month-end has passed clean."
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer: copy this and fill it in.",
          code: "VERSION RECORD: [processor]\n\nField               Current default     Candidate\nProcessor version\nLabelled set\nTest set            [must not change]\nDocument pass\n\nShadow\nSmall share\nRollback\nPromote"
        },
        {
          kind: "p",
          text: "Prompt and model versioning in general belongs to chapter six of the LLM engineering course. The document-specific point is that your labelled set is part of the release."
        },
        {
          kind: "p",
          // CHECKED 9 Nov 2026: https://docs.cloud.google.com/document-ai/limits and manage-processor-versions
          text: "Document AI sets hard limits, and they change. Online requests take 15 pages and 40 MB. Batch requests take 1 GB and 5,000 files. A custom version stops returning predictions when the Google version it builds on is deprecated."
        },
        {
          kind: "quiz",
          id: "docai02-q5",
          question: "A new custom version scores better on the test set. What is the safest rollout?",
          options: [
            "Set it as the default in one step.",
            "Shadow it on live traffic, then route a small share, keeping the old version as the default for rollback.",
            "Run it only on weekends.",
            "Delete the old version to save cost."
          ],
          answer: 1,
          explain: "A test set is a sample. Live traffic shows what it missed. A kept old version turns rollback into a config change."
        },
        {
          kind: "fold",
          tone: "industry",
          title: "Google Cloud plumbing around the service",
          text: "Credentials come from a service account attached to the worker, with no key files. Secrets live in Secret Manager. Calls come from Cloud Run workers, and results are traced in Cloud Logging and Cloud Trace. Course 7 covers all of these."
        },
        {
          kind: "p",
          text: "Harbour now has one trained processor. Not every Harbour document should go through it, and the next chapter asks which ones shouldn't."
        }
      ]
    }
  ],
  recap: [
    "Check the customer's data rule against the regions page before comparing processors.",
    "Prebuilt processors need no labelling, so use the best one you're allowed as a baseline.",
    "A custom extractor can be template-based, model-based or Gemini-based, and two of Google's pages disagree on Gemini in London.",
    "Training needs a written schema, consistent labels and a split by whatever varies in production.",
    "Report the document pass rate beside the field scores, because field scores look kinder.",
    "Record the version id on every extraction, shadow before rollout, and keep the old version as the default until the new one runs clean."
  ],
  reinforcement: "I am becoming a forward-deployed AI engineer. In Google Document AI I learned to check the data rule against the region before comparing processors, then let field-level results on unseen documents decide. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: [
    "docai-q03",
    "docai-q04"
  ]
};

export default chapter;
