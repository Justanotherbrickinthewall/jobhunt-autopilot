import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "fde-craft-data-structure",
  course: "fde-craft",
  number: 7,
  title: "Data structure",
  tagline: "What exactly does the system store? Nine tables, seven statuses and five sample rows answer it before any model runs.",
  minutes: 10,
  objectives: [
  "Name the nine tables of an invoice system and what each one holds.",
  "Explain why the invoice table stores printed values apart from resolved ones, and why money is numeric.",
  "Define the seven statuses, their transitions and the closed list of review reasons.",
  "Read verified output from sample rows and reproduce the pilot metric with one query.",
  "Write sample rows and a schema for a new customer."
],
  sections: [
{
  "id": "data-entities",
  "title": "Nine tables hold everything the flow touches",
  "goal": "What does Harbour's system need to remember, and where?",
  "blocks": [
    {
      "kind": "p",
      "text": "Chapter six drew the flow. Now the system needs somewhere to keep what the flow touches. A **schema** here means the tables. Each table answers one question, and nine of them cover the whole flow."
    },
    {
      "kind": "list",
      "ordered": true,
      "items": [
        "The `supplier` table holds Harbour's supplier codes, names and payment terms.",
        "The `supplier_alias` table maps a printed name, such as TIDEWAY PACKAGING, to one supplier code.",
        "The `document` table holds each file that arrived, with a hash of its bytes.",
        "The `invoice` table holds what was printed and what it resolved to.",
        "The `invoice_line` table holds one row for each line on an invoice.",
        "The `review_item` table holds one open question for a clerk, with its reasons.",
        "The `correction` table holds each field a person changed, with both values.",
        "The `audit_event` table holds every status change and who made it.",
        "The `posting` table holds the ledger write, and arrives when posting is automated."
      ]
    },
    {
      "kind": "p",
      "text": "The first six tables hold the work. The last three hold the evidence. Without them, nobody could prove what the system did, or measure the pilot. The record of the file in chapter six's flow is the `document` table. The invoice table is the centre, so it comes next."
    }
  ]
},
{
  "id": "data-schema",
  "title": "The invoice table keeps what was printed and what it resolved to",
  "goal": "How does the invoice table keep both the printed value and the resolved one?",
  "blocks": [
    {
      "kind": "p",
      "text": "Here is the whole schema. It ran clean on PostgreSQL 14, and it is Harbour's complete data structure."
    },
    {
      "kind": "code",
      "lang": "sql",
      "code": "create type document_kind as enum ('born_digital', 'scan');\ncreate type invoice_status as enum\n  ('received', 'extracted', 'needs_review', 'approved', 'posted', 'rejected', 'duplicate');\n\ncreate table supplier (\n  id                 text primary key,          -- the ledger's supplier code\n  name               text not null,\n  payment_terms_days int  not null default 30\n);\n\ncreate table supplier_alias (\n  alias_norm  text primary key,                 -- lower case, punctuation and company suffix removed\n  supplier_id text not null references supplier(id)\n);\n\ncreate table document (\n  id          uuid primary key default gen_random_uuid(),\n  message_id  text not null,                    -- the Outlook message it arrived in\n  file_name   text not null,\n  sha256      char(64) not null unique,         -- the same bytes twice are one document\n  storage_uri text not null,                    -- the raw PDF in Cloud Storage\n  kind        document_kind not null,\n  received_at timestamptz not null default now()\n);\n\ncreate table invoice (\n  id            uuid primary key default gen_random_uuid(),\n  document_id   uuid not null references document(id),\n  status        invoice_status not null default 'received',\n  supplier_raw  text,                           -- exactly as printed\n  supplier_id   text references supplier(id),   -- null until the alias lookup succeeds\n  invoice_no    text,\n  invoice_date  date,\n  due_date      date,\n  po_number     text,\n  net_amount    numeric(12,2),\n  vat_amount    numeric(12,2),\n  total_amount  numeric(12,2),\n  currency      char(3) check (currency in ('GBP', 'EUR', 'USD')),\n  model_version text,                           -- which model and prompt read these fields\n  confidence    numeric(3,2) check (confidence between 0 and 1),\n  duplicate_of  uuid references invoice(id),\n  created_at    timestamptz not null default now(),\n  updated_at    timestamptz not null default now()\n);\n\ncreate unique index invoice_one_live_copy\n  on invoice (supplier_id, upper(invoice_no), currency, total_amount)\n  where status not in ('rejected', 'duplicate');\n\ncreate table invoice_line (\n  invoice_id  uuid not null references invoice(id) on delete cascade,\n  line_no     int  not null,\n  description text not null,\n  quantity    numeric(12,3),\n  net_amount  numeric(12,2) not null,\n  ledger_code text,                             -- empty until milestone 5\n  primary key (invoice_id, line_no)\n);\n\ncreate table review_item (\n  id         uuid primary key default gen_random_uuid(),\n  invoice_id uuid not null references invoice(id),\n  reasons    text[] not null check (cardinality(reasons) > 0),\n  opened_at  timestamptz not null default now(),\n  claimed_by text,\n  closed_at  timestamptz,\n  outcome    text check (outcome in ('approved', 'rejected'))\n);\n\ncreate table correction (\n  id              bigserial primary key,\n  invoice_id      uuid not null references invoice(id),\n  field           text not null,\n  model_value     text,\n  corrected_value text,\n  corrected_by    text not null,\n  corrected_at    timestamptz not null default now()\n);\n\ncreate table audit_event (\n  id          bigserial primary key,\n  invoice_id  uuid references invoice(id),\n  actor       text not null,                    -- a person's account, or 'system'\n  action      text not null,\n  from_status invoice_status,\n  to_status   invoice_status,\n  detail      jsonb not null default '{}',\n  at          timestamptz not null default now()\n);\n\n-- Added in milestone 5, when posting is automated.\ncreate table posting (\n  invoice_id      uuid primary key references invoice(id),\n  idempotency_key text not null unique,         -- supplier code plus upper-cased invoice number\n  ledger_ref      text,\n  posted_by       text not null,\n  posted_at       timestamptz\n);",
      "caption": "The whole schema, as it ran on PostgreSQL 14. The unique index and the numeric columns are the parts that do the work."
    },
    {
      "kind": "p",
      "text": "Four choices matter here. First, the `invoice` table stores `supplier_raw` exactly as printed, next to `supplier_id`, which stays empty until the alias lookup succeeds. Nothing the model read is ever overwritten."
    },
    {
      "kind": "p",
      "text": "Second, money columns use `numeric(12,2)`, an exact decimal type. A float drifts by fractions of a penny, and a check that the lines add up to the total needs exact pennies."
    },
    {
      "kind": "p",
      "text": "Third, a **unique index** stops two rows sharing the same key values. This one covers supplier, upper-cased invoice number, currency and total. It is also a **partial index**, because it applies only where the status is not `rejected` or `duplicate`. A resend must still be stored, as a duplicate, and a rejected invoice may legitimately come back."
    },
    {
      "kind": "p",
      "text": "Fourth, `model_version` and `confidence` record which model and prompt read the fields, so any wrong row can be traced. The `posting` table's `idempotency_key` is a supplier code plus the upper-cased invoice number. Idempotent is from course 1. It means a second post of the same invoice changes nothing."
    },
    {
      "kind": "quiz",
      "id": "fde-craft-data-q1",
      "question": "Why does the unique index on the invoice table exclude the statuses rejected and duplicate?",
      "options": [
        "Those rows are deleted after a day, so they need no index.",
        "A resend must be stored as a duplicate, and a rejected invoice may come back later.",
        "The index would otherwise be too large to build.",
        "Duplicates have no supplier, so the index cannot hold them."
      ],
      "answer": 1,
      "explain": "The index guards live copies only. A resend has the same key as the original, so it must be allowed in as a duplicate row. A rejected invoice is out of play, so a corrected copy may return."
    },
    {
      "kind": "quiz",
      "id": "fde-craft-data-q2",
      "question": "Why are the money columns numeric(12,2) and not float?",
      "options": [
        "Floats cannot store more than two digits.",
        "Postgres rejects floats in a primary key.",
        "The lines must add up to the total, and that needs exact pennies.",
        "numeric is faster to index than float."
      ],
      "answer": 2,
      "explain": "A float stores an approximation, so lines that add up on paper can differ by a fraction of a penny. numeric(12,2) keeps exact pennies, so a total either matches or it does not."
    },
    {
      "kind": "p",
      "text": "The table holds the data. The next question is how an invoice changes status."
    }
  ]
},
{
  "id": "data-states",
  "title": "Seven statuses and a closed list of reasons route every invoice",
  "goal": "Which statuses can an invoice hold, and why does it leave one?",
  "blocks": [
    {
      "kind": "p",
      "text": "A **status** is the single word that says where an invoice stands. Harbour has seven: `received`, `extracted`, `needs_review`, `approved`, `posted`, `rejected` and `duplicate`. A **transition** is a permitted change from one status to another. Step eight of chapter six's flow, approved or sent for review, is the choice between `approved` and `needs_review`."
    },
    {
      "kind": "list",
      "ordered": true,
      "items": [
        "From `received`, an invoice goes to `extracted`, `needs_review` or `duplicate`.",
        "From `extracted`, it goes to `approved`, `needs_review` or `duplicate`.",
        "From `needs_review`, it goes to `approved` or `rejected`.",
        "From `approved`, it goes to `posted`."
      ]
    },
    {
      "kind": "p",
      "text": "Any other change of status is a bug. The reason for a trip to review lives on the review item, never in the status. Reasons are a closed list: `blank_supplier`, `bad_date`, `bad_total`, `total_mismatch`, `lines_mismatch`, `unknown_supplier`, `extract_failed`, `low_confidence` and `scan_out_of_scope`. Phase two adds `high_value`."
    },
    {
      "kind": "p",
      "text": "Each transition writes one **audit event**, a row that records who made the change and the old and new status. Each fix a clerk makes writes one **correction**, with the model's value and the corrected one. Corrections are what the pilot metric reads."
    },
    {
      "kind": "quiz",
      "id": "fde-craft-data-q3",
      "question": "How do you reproduce the pilot metric from the database?",
      "options": [
        "Count the rows in the invoice table with status posted.",
        "Average the confidence column over all invoices.",
        "Count approved or posted invoices that have no correction on a header field.",
        "Count the audit events whose action is approve."
      ],
      "answer": 2,
      "explain": "An invoice is right first time if nobody corrected a header field. One query over invoice and correction counts it, so anyone can rerun the number."
    },
    {
      "kind": "p",
      "text": "Rules on paper are not enough. Here they are, run on real rows."
    }
  ]
},
{
  "id": "data-samples",
  "title": "Five sample rows show a duplicate, a review and the metric",
  "goal": "What do the rules do when real rows hit them?",
  "blocks": [
    {
      "kind": "p",
      "text": "Harbour loaded five sample invoices into those tables. The output below is real. The first block is the database refusing a resend that tried to go in as approved."
    },
    {
      "kind": "code",
      "lang": "text",
      "code": "ERROR:  duplicate key value violates unique constraint \"invoice_one_live_copy\"\nDETAIL:  Key (supplier_id, upper(invoice_no), currency, total_amount)=(TP02, TP10407, GBP, 3141.90) already exists.\n\n   supplier_as_printed   | code | invoice_no | invoice_date |  total  | cur |    status    | dup_of\n Northgate Pallets Ltd   | NP01 | NP10405    | 2026-01-05   | 1271.35 | GBP | approved     |\n Tideway Packaging       | TP02 | TP10407    | 2026-01-08   | 3141.90 | GBP | approved     |\n TIDEWAY PACKAGING       | TP02 | TP10407    | 2026-01-08   | 3141.90 | GBP | duplicate    | 0002\n Marlow Safety Equipment | MS05 | MS10429    | 2026-01-18   | 1762.22 | GBP | needs_review |\n                         |      | RF10450    | 2026-01-27   | 3722.24 | GBP | needs_review |\n MS10429 {total_mismatch}; RF10450 {blank_supplier}",
      "caption": "Verified output from the schema above, with five sample invoices. The first block is the unique index refusing a resend."
    },
    {
      "kind": "p",
      "text": "The Tideway Packaging invoice TP10407 is in twice. The second copy, printed in capitals, arrives as a duplicate that points at the first, and nothing is lost. Marlow's invoice goes to review for a total mismatch. The invoice with no supplier goes to review for a blank supplier."
    },
    {
      "kind": "p",
      "text": "The pilot metric is one query, shown next. On these five rows it returns two invoices and one right first time. A clerk corrected the date on NP10405 from 2026-05-01 to 2026-01-05, so that invoice does not count."
    },
    {
      "kind": "code",
      "lang": "sql",
      "code": "select count(*) as invoices,\n       count(*) filter (where not exists (\n         select 1 from correction c\n         where c.invoice_id = i.id\n           and c.field in ('supplier', 'invoice_no', 'invoice_date', 'due_date', 'po_number',\n                           'net_amount', 'vat_amount', 'total_amount', 'currency'))) as right_first_time\nfrom invoice i\nwhere i.status in ('approved', 'posted');",
      "caption": "The pilot metric. It counts approved or posted invoices with no correction on a header field."
    },
    {
      "kind": "p",
      "text": "Sample rows tested the partial index before any model ran. Your own customer needs the same exercise."
    }
  ]
},
{
  "id": "data-repeat",
  "title": "Write sample rows first for your next customer",
  "goal": "How do you repeat this for a new customer?",
  "blocks": [
    {
      "kind": "p",
      "text": "Start with the sample rows, then write the tables that hold them. Include one clean row, one duplicate, one that goes to review and one a person corrected. If the tables cannot hold all four, the design is wrong."
    },
    {
      "kind": "code",
      "lang": "text",
      "code": "supplier         id: ____   name: ____   payment_terms_days: ____\nsupplier_alias   alias_norm: ____ (how you normalise)   supplier_id: ____\ndocument         message_id: ____   sha256: ____ (unique)   storage_uri: ____   kind: ____\ninvoice          status: ____   supplier_raw: ____   supplier_id: ____ (null until matched)\n                 invoice_no: ____   net_amount / vat_amount / total_amount: ____ (numeric)\n                 model_version: ____   confidence: ____   duplicate_of: ____\n                 unique index on: ____ where status not in (____)\ninvoice_line     invoice_id: ____   line_no: ____   net_amount: ____\nreview_item      invoice_id: ____   reasons: ____ (closed list)   outcome: ____\ncorrection       invoice_id: ____   field: ____   model_value: ____   corrected_value: ____\naudit_event      actor: ____   action: ____   from_status: ____   to_status: ____\nposting          idempotency_key: ____ (unique)   ledger_ref: ____\nStatuses:        ____ ; transitions: ____ goes to ____\nReasons:         ____ (one line each: what it means, who clears it)\nSample rows:     one clean, one duplicate, one review, one wrong date a clerk fixed\nMetric query:    ____",
      "caption": "For your next customer. Fill every blank before you write any extraction code."
    },
    {
      "kind": "p",
      "text": "The tables say what the system stores. They do not yet say what it must do, or how anyone will know it is done. What must the system do, and how will anyone know it's done? That is the next chapter's question."
    }
  ]
}
  ],
  recap: [
  "Nine tables hold the flow: the work in six, the evidence in three.",
  "Store what was printed beside what it resolved to, and keep money in numeric.",
  "A partial unique index catches a live duplicate and still lets a resend in.",
  "Seven statuses, four transitions and a closed list of reasons route every invoice.",
  "Audit events and corrections give the pilot metric, in one query.",
  "Write sample rows first, and the tables follow."
],
  reinforcement: "I am becoming a forward-deployed AI engineer. In data structure I learned to write sample rows first, then the tables that hold them, with a partial unique index for duplicates and a closed list of review reasons. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["fde-craft-q22"],
};

export default chapter;
