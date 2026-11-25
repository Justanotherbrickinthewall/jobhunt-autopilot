import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "rag-02-pipeline-and-loading",
  course: "rag",
  number: 2,
  title: "Two pipelines, and loading",
  tagline: "What does a RAG system look like inside, and how do documents get into it intact and up to date?",
  minutes: 45,
  objectives: [
    "Draw the two pipelines inside a RAG system, name their stages and say what passes between them.",
    "Trace a wrong answer back to the stage that caused it, checking the earliest stage first.",
    "Spot the ways a parser damages text, and catch the worst of it with cheap checks.",
    "Pick a parser for PDFs, scans or web pages, and say what each choice costs.",
    "Load documents so that running the loader twice changes nothing, while edits and deletions still reach the index.",
    "Set up your AskPEP repo and write a loader for the 18 PEPs that passes its tests.",
  ],
  sections: [
    {
      id: "s1-two-pipelines",
      title: "A RAG system is two pipelines that meet at an index",
      goal: "What are the stages of a RAG system, and where does each one run?",
      blocks: [
        {
          kind: "p",
          text: "Every section of this chapter answers part of one question. What does a RAG system look like inside, and how do documents get into it intact and up to date? Chapter one ended by placing three of its four failures in the pipeline. This section draws that pipeline, stage by stage.",
        },
        {
          kind: "p",
          text: "A **pipeline** is a fixed chain of steps, where each step's output feeds the next. A RAG system holds two of them. The **indexing pipeline** runs ahead of time and prepares your documents for search. The **query pipeline** runs once per question, and uses that preparation to find passages and write an answer.",
        },
        {
          kind: "p",
          text: "The two meet at the **index**, the store built for fast search that chapter one introduced. The indexing pipeline writes into it, and the query pipeline reads from it. Running the indexing pipeline over your documents is called **ingestion**. It has five stages.",
        },
        {
          kind: "list",
          items: [
            "Load reads each raw file from wherever it lives, such as a folder, a cloud bucket or a wiki.",
            "Parse turns each file into clean text plus **metadata**, the facts about the text such as its title, source and date.",
            "Chunk cuts the text into **chunks**, passages a few hundred tokens long, each labelled with the headings above it. Chapter three covers it.",
            "Embed turns each chunk into a **vector**, a list of numbers that stands for its meaning. Chunks with similar meanings get vectors that sit close together. The model that does this is the **embedding model**, and chapter four covers it.",
            "Store writes each chunk, its vector and its metadata into the index as one **record**. Chapter five covers it.",
          ],
        },
        {
          kind: "p",
          text: "The query pipeline has six stages, and every one of them runs while a user waits.",
        },
        {
          kind: "list",
          items: [
            "Rewrite turns the question into one or more search queries, for example by expanding GIL to global interpreter lock.",
            "Embed turns each search query into a vector, using the same embedding model as the index.",
            "Search finds the records whose vectors sit closest to the query vector. These are the **candidates**, perhaps fifty of them.",
            "Rerank reorders the candidates with a slower, sharper model, and keeps the best few.",
            "Pack lays the best chunks out in the prompt, each labelled with its source, inside the token budget.",
            "Answer asks the model to reply from those chunks and to cite the ones it used.",
          ],
        },
        {
          kind: "compare",
          caption: "Indexing and querying differ in timing, cost, how failures show up and what you must keep consistent.",
          columns: ["", "Indexing", "Querying"],
          rows: [
            ["When it runs", "Ahead of time, in batches, and again when documents change", "Once per question, while a user waits"],
            ["Speed pressure", "Low. Minutes or hours are fine", "High. Every stage spends the user's patience"],
            ["Cost shape", "Paid once per document", "Paid again on every question"],
            ["Failures look like", "Silently missing or mangled content", "A visibly bad answer"],
            ["Must stay consistent", "Parser, chunk settings, embedding model", "The same embedding model as the index"],
          ],
        },
        {
          kind: "quiz",
          id: "rag-02-q1",
          question: "Which task belongs to the indexing pipeline?",
          options: [
            "Rewriting the user's question.",
            "Reranking the candidates.",
            "Splitting documents into chunks.",
            "Writing the final answer.",
          ],
          answer: 2,
          explain: "Chunking happens ahead of time, once per document version. The other three run for each question.",
        },
        {
          kind: "p",
          text: "Indexing is like cataloguing a library, and querying is like a librarian answering a visitor. Work done while the visitor waits costs their patience, however clever it is. So the design rule is to push every piece of work you can into indexing, where nobody is waiting.",
        },
        {
          kind: "fold",
          tone: "plain",
          title: "Why not skip the index?",
          text: "You could embed every document for each question. For ten short documents that works. Beyond that, every question pays to embed the whole corpus. The index is a cache of that work, a stored copy of results you would otherwise recompute. A cache must be updated when its source changes, which is where ingestion gets hard.",
        },
        {
          kind: "p",
          text: "Only records pass between the two pipelines, so the record is the agreement between them. Both sides must read a record the same way. One part of that agreement breaks easily, and it breaks silently: the embedding model.",
        },
        {
          kind: "p",
          text: "Each embedding model draws its own map of meaning. A vector is a position on that map, and search looks for chunk vectors near the query vector. A query vector from a different model is a position on a different map. Its distance to your chunks means nothing, so search returns junk.",
        },
        {
          kind: "p",
          text: "So switching embedding models means re-embedding the whole corpus. Pin the model name in your settings, and store it beside the index, so that a mismatch can be caught.",
        },
        {
          kind: "quiz",
          id: "rag-02-q2",
          question: "You switch the embedding model for incoming queries only. Search results turn to junk. Why?",
          options: [
            "The index is now too small.",
            "Query vectors and index vectors come from different models, so their distances are meaningless.",
            "Queries are always slower with a new model.",
            "The chunks need more overlap.",
          ],
          answer: 1,
          explain: "Similarity only means something between vectors from the same model. Mixing models compares positions on two different maps.",
        },
        {
          kind: "p",
          text: "That is the whole system: five stages ahead of time, six per question, and records in between. Each of chapter one's failures starts at one of these eleven stages. The next section shows which, and where to look first.",
        },
      ],
    },
    {
      id: "s2-tracing",
      title: "A wrong answer starts at one stage, so check the earliest stage first",
      goal: "Where in the pipeline does each kind of wrong answer start?",
      blocks: [
        {
          kind: "p",
          text: "Chapter one sorted wrong answers into four kinds with one question: where was the right text? The pipeline lets you ask that question at each stage in turn. Three of the four kinds map onto stages, and the fourth maps onto none.",
        },
        {
          kind: "list",
          items: [
            "A retrieval miss starts in rewrite, chunk, embed, search or rerank. The right text was in your documents, and no chunk that reached the prompt held it.",
            "Context misuse starts in pack or answer. The right chunk reached the prompt, and the model ignored or misread it.",
            "Stale or poisoned data starts in load or store. The loader missed an edit or let in a planted instruction. Or the store kept an old record beside the new one.",
            "A corpus gap has no stage, because the text was never in your documents. Rule out a load fault first, though. A file the loader skipped looks exactly like a corpus gap.",
          ],
        },
        {
          kind: "p",
          text: "Stale data has a common cause. If record ids change between runs, the store cannot find the old record, so it adds the new version beside it. The cure is an **upsert**, a write that replaces the record with the same id, or inserts it if there is none. Section five builds on this.",
        },
        {
          kind: "p",
          text: "Parse is missing from that list, and that is the trap. A parse fault never shows up as a kind of its own. A table that lost its headers looks like a retrieval miss, because no chunk holds the answer in readable form.",
        },
        {
          kind: "p",
          text: "Here is a second case. Answers quote a PEP's Author line as if it were part of the guidance. That looks like context misuse. The real fault is that the parser never split the header from the body.",
        },
        {
          kind: "p",
          text: "Faults also flow downstream, because each stage works only with what the stage before it handed over. No prompt can fix text that was never indexed. No reranker can promote a chunk that search never found. So debug from the top of the pipeline down, and ask four questions in order.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Read the text that was indexed for the right document. If it is missing or mangled, the fault is in load or parse.",
            "Check whether search returned the right chunk among its candidates. If not, look at rewrite, chunk, embed and search.",
            "Check whether that chunk survived the rerank and reached the prompt. If not, look at rerank and pack.",
            "Check whether the answer used it. If not, the fault is in the answer stage, which is context misuse.",
          ],
        },
        {
          kind: "p",
          text: "Teams usually start at the other end. They rewrite prompts and swap models, because the model is the part they can see. The early stages are cheaper to check, and they fail more often than most teams expect.",
        },
        {
          kind: "widget",
          id: "c02-pipeline-stepper",
          intro: "Follow one question through all eleven stages: what does PEP 8 say about line length? Read what each stage takes in, makes and breaks. Then trace four bugs back to the stage that caused each one.",
        },
        {
          kind: "p",
          text: "Load and parse sit at the top of every trace. Load mostly fails loudly, with a missing file or an encoding error. Parse fails quietly, and damaged text looks fine until an answer goes wrong. So parsing comes next.",
        },
      ],
    },
    {
      id: "s3-parsing",
      title: "Parsing is where retrieval quality is quietly lost",
      goal: "How does a parser damage text, and how do you catch the damage before it is embedded?",
      blocks: [
        {
          kind: "p",
          text: "**Loading** reads the bytes of a file. **Parsing** turns a format such as PDF or HTML into clean text, keeping its structure, such as headings, lists and tables. If parsing mangles the text, no later stage can repair it. The chunker and the embedding model see only what the parser hands over.",
        },
        {
          kind: "p",
          text: "Our PEPs are the easy case. They are written in reStructuredText, or **RST**, a plain text format with light markup for headings and lists. Real company corpora are mostly PDFs, web pages, slide decks and spreadsheets. Each format breaks in its own way.",
        },
        {
          kind: "p",
          text: "PDFs cause the most damage. A PDF records where each character, or **glyph**, is drawn on the page, and little else. The extractor must work out paragraphs and reading order from those positions. A PDF made from a document has a **text layer**, the characters themselves. A scanned PDF holds only a picture of each page.",
        },
        {
          kind: "p",
          text: "A **layout-aware parser** reads the page's geometry, such as columns, blocks and tables, to recover the reading order. **OCR**, short for optical character recognition, turns a picture of text into characters. A **ligature** is one glyph that joins two letters, such as fi. Extracted as a single character, it hides the word first from a keyword search.",
        },
        {
          kind: "compare",
          caption: "Common formats, how each one damages text, and the usual repair.",
          columns: ["Format", "What goes wrong", "What to do"],
          rows: [
            ["PDF", "The extractor guesses the reading order. It can merge columns, repeat page headers, keep line-end hyphens and leave ligatures as single glyphs.", "Use a layout-aware parser, strip repeated headers, rejoin hyphenated words and normalise Unicode."],
            ["Scanned PDF or image", "There is no text layer at all.", "Run OCR. Expect errors, and keep the score that says how sure it was of each word."],
            ["HTML", "Menus, cookie banners and footers drown the content.", "Extract the main content and keep headings and links."],
            ["Tables", "Flattening loses which value belongs under which header.", "Keep rows together with their headers, or render each row as a sentence."],
            ["Slides and spreadsheets", "Text is scattered across boxes and cells.", "Treat each slide or sheet as a unit and keep its title."],
          ],
        },
        {
          kind: "p",
          text: "Parsing is the least glamorous and most underfunded part of RAG. Teams spend weeks comparing embedding models and ten minutes on the PDF extractor. Reverse that ratio.",
        },
        {
          kind: "p",
          text: "You need no special tooling to catch most parser faults. A handful of cheap checks, run over every document at load time, flags the worst of them before anything is embedded.",
        },
        {
          kind: "list",
          items: [
            "Compare extracted length to file size. A 5 megabyte PDF that yields 200 characters is a scan.",
            "Count pages with no text. Any such page needs OCR or a human look.",
            "Measure the share of non-letter characters. A high share means garbage or a table dump.",
            "Look for lines that repeat on many pages. Those are headers and footers.",
          ],
        },
        {
          kind: "p",
          text: "Cleaning comes next. Strip boilerplate, such as navigation menus and legal footers, and normalise whitespace. Normalise Unicode too, which turns a ligature back into its two letters. Then drop near-duplicate documents. If one policy exists in five versions, retrieval happily returns all five, and the model must guess which is current.",
        },
        {
          kind: "widget",
          id: "c02-parse-damage",
          intro: "Read a simulated PDF extract like a sceptic, and mark every span the parser damaged. Some hyphens and numbers are decoys, so check before you flag.",
        },
        {
          kind: "quiz",
          id: "rag-02-q3",
          question: "An extractor reads a two-column PDF straight across each line. What is the main consequence?",
          options: [
            "Indexing takes longer.",
            "Sentences from the two columns interleave, so the chunk text means nothing.",
            "The vectors get larger.",
            "Metadata is lost.",
          ],
          answer: 1,
          explain: "Text order is the parser's job. Interleaved columns produce chunks that read like nonsense, and an embedding of nonsense points nowhere useful.",
        },
        {
          kind: "p",
          text: "The best check of all is to read raw parser output yourself, a few documents from each source. Interviewers often ask for a RAG failure that was not the model's fault, and a parsing story is the strongest answer.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Tell me about a RAG failure that was not the model's fault",
          text: "Strong candidates reach for parsing. A table lost its headers, a scanned page had no text, or a repeated footer polluted every chunk. Have one concrete story ready, and say how you found it by reading raw parser output.",
        },
        {
          kind: "p",
          text: "The PEPs need almost none of this, because RST is already clean text. A customer's corpus rarely is. The next section names the parsers you reach for when the corpus is messy.",
        },
      ],
    },
    {
      id: "s-alternatives",
      title: "Plain Python parsing is the default until your formats outgrow it",
      goal: "Which parser do you reach for when the corpus is not clean text?",
      blocks: [
        {
          kind: "p",
          text: "AskPEP parses with plain Python. The PEPs are RST, so a few small functions read each header and body, and section six shows them. That works because the corpus is clean. For PDFs, a library such as `pypdf` extracts the text layer. It does not understand layout, and it does not run OCR.",
        },
        {
          kind: "p",
          text: "Unstructured is the most common library for mixed formats. It splits a file into typed elements, such as titles, paragraphs and tables. That maps straight onto the structure a parser must keep. It runs as open source code or as a hosted service.",
        },
        {
          kind: "p",
          text: "LlamaParse and Docling target hard PDFs. LlamaParse is a hosted service from the team behind LlamaIndex, a popular framework for building RAG systems. Docling is an open source converter that analyses page layout and tables. Both aim at the reading order and table damage from the last section.",
        },
        {
          kind: "p",
          // CHECK: confirm the current names of AWS Textract and Azure Document Intelligence.
          text: "Apache Tika covers breadth. It extracts text from many file types, and it runs on Java. For scans and forms, cloud OCR such as Google's Document AI returns text, tables and key value pairs. AWS Textract and Azure Document Intelligence do the same. You pay per page, and documents leave your network.",
        },
        {
          kind: "compare",
          caption: "Six parsing options. Run each on your ten ugliest documents before you pick.",
          columns: ["Tool", "Best at", "Switch to it when", "What it costs you"],
          rows: [
            [
              "Plain Python with pypdf",
              "Clean text sources and PDFs that have a text layer.",
              "The text comes out with columns merged, tables flattened or no text at all.",
              "You write and maintain every format handler yourself.",
            ],
            [
              "Unstructured",
              "Many formats through one interface, with typed elements.",
              "You have mixed office formats and want titles and tables as separate elements.",
              "Heavy dependencies, and quality varies by format. Check which features sit behind the hosted service.",
            ],
            [
              "LlamaParse",
              "Complex PDFs with tables and unusual layouts.",
              "Open source extraction keeps scrambling your reading order.",
              "Documents leave your network, and you pay per page. Check current terms.",
            ],
            [
              "Docling",
              "Layout and table understanding that you can run yourself.",
              "You want better PDF structure without sending files to a vendor.",
              "Model downloads and compute. Slower than a text extractor.",
            ],
            [
              "Apache Tika",
              "The widest range of file types in one server.",
              "You must ingest legacy or unusual formats at volume.",
              "A Java service to run, and plain text output with little layout.",
            ],
            [
              "Google Document AI",
              "OCR for scans, forms and tables.",
              "Your documents are images with no text layer.",
              "Per page cost, a cloud dependency and OCR errors you still have to measure.",
            ],
          ],
        },
        {
          kind: "quiz",
          id: "rag-02-alt-q1",
          question: "Your corpus is mostly scanned contracts with no text layer. Which tool class do you need first?",
          options: [
            "A better chunker.",
            "An OCR step, such as a cloud OCR service or an open source engine.",
            "A larger embedding model.",
            "A reranker.",
          ],
          answer: 1,
          explain: "With no text layer, a text extractor returns nothing. OCR must turn the pixels into characters before any later stage has input.",
        },
        {
          kind: "fold",
          tone: "industry",
          title: "Confidence scores from OCR",
          text: "Most OCR services return a confidence value per word or line. Store it as metadata. It lets you route low confidence pages to a human, and it lets you explain a wrong answer that traces back to a misread character.",
        },
        {
          kind: "p",
          text: "Clean text is half of the job. The other half is keeping the index in step with the documents as they change. That is the next section.",
        },
      ],
    },
    {
      id: "s5-provenance",
      title: "Stable ids and provenance make citations, updates and deletes possible",
      goal: "How do you keep the index in step with documents that change?",
      blocks: [
        {
          kind: "p",
          text: "Ingestion is never a one-off. You will run it again after a crash, after a parser fix and after every document edit. Each run must leave the index matching the documents, with nothing duplicated, nothing stale and nothing left over from a deleted file.",
        },
        {
          kind: "p",
          text: "An operation is **idempotent** if running it twice gives the same result as running it once. Ingestion must be idempotent, and two kinds of metadata make that possible. The first is a stable id for every document. The second is provenance on every record.",
        },
        {
          kind: "p",
          text: "Chapter one defined **provenance** as knowing which document a claim came from. In the index, it means storing the document id, title, source and version on every record. Without it you cannot cite a passage, delete a document's records or debug a bad answer.",
        },
        {
          kind: "p",
          text: "Metadata also carries the fields you will filter on later: language, product, date and, above all, who may read the document. Store permissions on every record from day one. Retrofitting access control onto an index that never recorded it means ingesting everything again. Chapter ten returns to this.",
        },
        {
          kind: "p",
          text: "The id is the hard part, because a run finds the old record by its id. Two more terms help here. An **orphan** is a record whose source file has gone. A **content hash** is a short fingerprint computed from a document's text. It changes whenever the text changes, so it shows whether a document was edited.",
        },
        {
          kind: "compare",
          caption: "Four ways to build ids, and what each does when you run ingestion again.",
          columns: ["Id strategy", "On a re-run", "Weakness"],
          rows: [
            ["Random id per chunk", "Duplicates everything", "You cannot find the old copy to replace it"],
            ["Id from the file path", "Replaces in place", "Deleted files leave orphans, and a rename looks like a new file"],
            ["Id from the content hash", "Identical content collapses to one record", "Any edit creates a new id, so the old one lingers"],
            ["Path id plus a stored content hash", "Skips unchanged files and replaces edited ones", "Needs a separate pass to delete what vanished"],
          ],
        },
        {
          kind: "p",
          text: "The last row is the design to copy. Store each document's content hash beside its id. On each run, hash the incoming text and compare it with the stored hash. Each document then falls into one of three cases.",
        },
        {
          kind: "list",
          items: [
            "The hashes match, so skip the document. Nothing is chunked or embedded again.",
            "The hashes differ, so chunk and embed the document again, and replace every record of that document.",
            "The id is in the index but gone from the source, so delete every record with that document id. That removes the orphans.",
          ],
        },
        {
          kind: "p",
          text: "The job is a diff between two sets of ids. AskPEP's `ingest` function does exactly this. It comes finished in your repo, and chapter twelve walks through it. Rebuilding the whole index on every run is also idempotent, and it suits a small corpus. The hash design pays off once embedding everything gets slow or expensive.",
        },
        {
          kind: "widget",
          id: "c02-idempotent-ingest",
          intro: "Three ingestion designs face the same three runs. Predict how many records each one leaves in the index, then watch the bars to see the damage.",
        },
        {
          kind: "quiz",
          id: "rag-02-q4",
          question: "Nightly ingestion adds the full corpus size to the index every night. What is the most likely cause?",
          options: [
            "The chunks are too small.",
            "Ids are generated fresh on each run, so nothing gets replaced.",
            "The embedding model changed.",
            "OCR errors are accumulating.",
          ],
          answer: 1,
          explain: "A growing count with no new documents means inserts without replacement. Make ids deterministic and upsert by id.",
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "My index keeps growing",
          text: "If the record count rises on every run, ids are unstable. Check whether an id includes a timestamp, a random value, or a chunk position that shifts when the document is edited. Chunk ids should derive from the document id plus something stable about the chunk.",
        },
        {
          kind: "p",
          text: "Keeping an index in sync is a common interview question, because the answer shows whether you have run ingestion for real.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How do you keep the index in sync with documents that change?",
          text: "A good answer names stable ids, a stored content hash, upserts instead of inserts, and a delete pass for vanished documents. A great answer adds that deletions may be legal obligations, so you need to prove they happened.",
        },
        {
          kind: "p",
          text: "You now have the whole design: clean text, stable ids and provenance on every record. The last section turns the first part of it, clean text with stable ids, into code for the 18 PEPs.",
        },
      ],
    },
    {
      id: "s6-loader",
      title: "AskPEP's loader turns 18 PEP files into 18 clean Documents with stable ids",
      goal: "What does AskPEP's loader produce, and how do you build it?",
      blocks: [
        {
          kind: "p",
          text: "AskPEP's loader covers the first two stages, load and parse. It reads the 18 PEP files and returns one **Document** for each. A Document holds one parsed PEP, and every later stage starts from it. Chapter three's chunks copy its id, title and source.",
        },
        {
          kind: "p",
          text: "Python stores a Document in a **dataclass**, a class that writes its own constructor from a list of typed fields. The `frozen` option makes it read-only, so no later stage can change a Document by accident. It has five fields.",
        },
        {
          kind: "code",
          lang: "python",
          code: "from dataclasses import dataclass, field\n\n\n@dataclass(frozen=True)\nclass Document:\n    doc_id: int  # stable key, the PEP number, for example 8\n    title: str  # shown in citations\n    source: str  # where the text came from\n    text: str  # body only, header removed\n    headers: dict[str, str] = field(default_factory=dict)  # the parsed header fields",
          caption: "The shared Document type. Production systems add a content hash, an updated-at time and access control fields.",
        },
        {
          kind: "p",
          text: "A PEP starts with a header of fields such as PEP, Title and Author, and the header ends at the first blank line. The loader keeps the parsed header in `headers` and only the body in `text`. That way the author list never turns up in a chunk as if it were part of PEP 8's guidance.",
        },
        {
          kind: "p",
          text: "The stable id is the PEP number, so PEP 8 is always document 8. The loader also reads the files in sorted order. Two runs then give the same Documents in the same order, which is idempotent ingestion at its smallest.",
        },
        {
          kind: "p",
          text: "You build this loader in the chapter's lab, in your own git repo outside this app. The lab's first step sets that repo up, so nothing needs installing before you open it. Every step has tests, and a step is done when its tests pass. The tests run offline, so the lab needs no API keys.",
        },
        {
          kind: "p",
          text: "The loader hands chapter three 18 clean Documents. Each one is still a whole PEP, often thousands of words long. Chapter three cuts each one into chunks, and the chunk boundaries decide what retrieval can find.",
        },
      ],
    },
  ],
  lab: {
    title: "Load the PEP corpus and harden the loader",
    goal: "You build one project, AskPEP, in your own git repo outside this app. It starts as a copy of the course template, which holds the settings, the tests and **stubs**. Stubs are functions that raise an error until you fill them in. You need git and **uv**, the Python project manager, and Docker waits until chapter twelve. In this lab you create the repo, fetch 18 PEPs and write the loader.",
    minutes: 30,
    files: ["scripts/fetch_corpus.py", "src/askpep/ingest.py", "tests/rag/test_ingest.py"],
    steps: [
      {
        title: "Create your repo and fetch the corpus",
        text: "Install uv first if you have not, with `brew install uv` on a Mac. Make an empty folder, start a git repo in it and copy the template in with `pull-course.sh`. `uv sync` installs Python and the pinned packages, and `uv run` runs any command inside the project. Commit, so later diffs show only your work. Then run the command in the Test row. It saves the 18 PEPs listed in `PEP_IDS` to `data/raw`, and prints 18 saved lines.",
        code: `# shell: run each line in a terminal. uv comes from https://docs.astral.sh/uv/ (brew install uv on a Mac).
mkdir ~/Documents/Projects/askpep
cd ~/Documents/Projects/askpep
git init
# copy the template, the stubs and the tests in. The script never overwrites a file.
my-learn/labs/askpep/template/scripts/pull-course.sh rag
# install the Python version and the packages that uv.lock pins
uv sync
git add .
git commit -m "Start AskPEP from the course template"`,
        test: "uv run python scripts/fetch_corpus.py",
      },
      {
        title: "Parse the header",
        text: "Open `src/askpep/ingest.py` and find the stub `parse_header`. Skip the functions after `load_documents` for now. They ship finished, and chapter twelve covers them. The tests live in `tests/rag/test_ingest.py`. **pytest**, Python's test runner, runs them, and `-k ch02_s2` picks only this step's tests. A PEP header is `Key: value` lines up to the first blank line. A line that starts with a space continues the previous value. If a key repeats, keep its first value. Your stub lists these rules as numbered hints, and the code below is a start on the loop.",
        code: `# src/askpep/ingest.py
def parse_header(rst: str) -> tuple[dict[str, str], str]:
    """Split the header from the body. Returns (fields, body)."""
    head, _, body = rst.partition("\\n\\n")
    fields: dict[str, str] = {}
    key = ""
    for line in head.splitlines():
        # your turn:
        # 1. A line that starts with a space continues the previous value.
        #    Join it on with a single space.
        # 2. Otherwise HEADER_LINE.match(line) splits it at the first colon into a key and a value.
        #    HEADER_LINE is a regular expression that is already in your stub.
        # 3. If the key is already in fields, ignore it and its continuation lines.
        ...
    return fields, body`,
        test: "uv run pytest tests/rag/test_ingest.py -k ch02_s2",
      },
      {
        title: "Turn one file into a Document",
        text: "Write `parse_pep`. Turn Windows line endings into `\\n` first. Call `parse_header`, then build the title as `PEP 8 – Style Guide for Python Code`, with an en dash. With no title, use `PEP 8`. Strip the body and keep the header fields in `headers`. Citations print this title, so it has to read well.",
        code: `# src/askpep/ingest.py
def parse_pep(doc_id: int, raw: str) -> Document:
    """Turn the text of one pep-NNNN.rst file into a Document."""
    # your turn:
    # 1. Replace "\\r\\n" with "\\n", so Windows files behave.
    # 2. fields, body = parse_header(raw)
    # 3. title: f"PEP {doc_id} – {fields['Title']}", or f"PEP {doc_id}" when there is no Title.
    # 4. source: pep_url(doc_id), which is already written.
    # 5. Return a Document with the body stripped and the header fields in headers.
    raise NotImplementedError("rag-02 step 3")`,
        test: "uv run pytest tests/rag/test_ingest.py -k ch02_s3",
      },
      {
        title: "Load a whole folder",
        text: "Write `load_documents`. Read the `pep-NNNN.rst` files from the folder and ignore everything else. Sort them by name and call `parse_pep` on each. The sort matters. Two runs must give the same documents in the same order, or later stages produce different chunk ids. This is idempotent ingestion at its smallest.",
        code: `# src/askpep/ingest.py
def load_documents(directory: Path = CORPUS_DIR) -> list[Document]:
    """Parse every pep-NNNN.rst file in the directory, sorted by name."""
    # your turn: CORPUS_DIR is data/raw, where step 1 saved the files.
    # List the folder, keep the names that match PEP_FILE (a regular expression already in your stub),
    # sort them, read each file and call parse_pep.
    # The PEP number is the digits in the file name.
    raise NotImplementedError("rag-02 step 4")`,
        test: "uv run pytest tests/rag/test_ingest.py -k ch02_s4",
      },
      {
        title: "Look at what you loaded",
        text: "Add a `__main__` block that prints one line per document and a total. Run it, and write down the token estimate. That is your real corpus size. Set the corpus size slider in chapter one's context budget widget close to that number. The PEPs change, so expect a total near 160 thousand tokens.",
        code: `# src/askpep/ingest.py
if __name__ == "__main__":
    docs = load_documents()
    for d in docs:
        print(f"pep-{d.doc_id:04d}  {len(d.text):>7} chars  {d.title}")
    total = sum(len(d.text) for d in docs)
    print(f"\\n{len(docs)} documents, {total} chars, ~{round(total / 4)} tokens")`,
        test: "uv run python -m askpep.ingest",
      },
    ],
    verify: "uv run pytest tests/rag/test_ingest.py",
  },
  recap: [
    "A RAG system is an indexing pipeline and a query pipeline, and only records pass between them, through the index.",
    "The embedding model used at index time must match the one used at query time.",
    "A wrong answer starts at one stage, so debug from the top of the pipeline down, starting with the text that was indexed.",
    "Parsers damage text through merged columns, page headers, hyphens, ligatures and flattened tables, and no later stage repairs it.",
    "Ingestion must be idempotent: stable ids, stored content hashes, replaced records and a delete pass for orphans.",
    "Every record carries its provenance, so you can cite, filter and delete.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In RAG pipelines and loading I learned that indexing and querying are separate pipelines joined by an index. I also learned that parsing and stable ids decide quality before retrieval starts. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["rag-q03", "rag-q04"],
};

export default chapter;
