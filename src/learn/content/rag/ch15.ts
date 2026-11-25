import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "rag-15-advanced",
  course: "rag",
  number: 15,
  title: "Advanced RAG patterns",
  tagline: "Which advanced pattern fixes the failure you have, and is it worth what it costs?",
  minutes: 36,
  objectives: [
    "Find the failure with error analysis before you adopt any advanced pattern.",
    "Tell a multi-hop question from a compound one, and price an agent loop before you build it.",
    "Say what GraphRAG builds, which questions need it and why lookups don't.",
    "Repair chunks that never name their subject, choosing between a heading prefix, contextual retrieval and late chunking.",
    "Choose a multimodal route by what the page holds and what parsing loses.",
    "Decide between long context and RAG using corpus size, cost, latency and permissions.",
    "Route count and filter questions to SQL, and limit a bad query with database controls.",
    "Prescribe a pattern from its symptom, and answer which one you would add first.",
  ],
  sections: [
    {
      id: "s1-patches",
      title: "Every advanced pattern patches one failure, so diagnose before you adopt",
      goal: "How do you decide whether an advanced pattern is worth adding at all?",
      blocks: [
        {
          kind: "p",
          text: "AskPEP is now built, gated, traced and deployed. Call what you built the **plain pipeline**. It chunks and embeds the PEPs once. Then it answers each question with one hybrid retrieval, a reranker and one call to the model. This chapter answers one question. Which advanced pattern fixes the failure you have, and is it worth what it costs?",
        },
        {
          kind: "p",
          text: "Each advanced pattern fixes one kind of failure, and each adds cost, latency and moving parts. If your golden set doesn't show that failure, the pattern is decoration.",
        },
        {
          kind: "p",
          text: "So the order of work is fixed. Run error analysis, which chapter nine defined as reading failed examples, giving each a cause and counting the causes. Name the failure, and pick the cheapest pattern that targets it. Run the evaluation again, and keep the pattern only if the number moved. Anything else is CV-driven development.",
        },
        {
          kind: "p",
          text: "The plain pipeline fails in six recurring shapes. Each of the next six sections takes one, names its patch and prices it.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "The answer needs a second search that depends on the first.",
            "The question covers the whole corpus, so no handful of chunks holds the answer.",
            "A chunk never names its subject, so search can't find it.",
            "The answer sits in a chart or a scan that parsing dropped.",
            "The corpus is small and stable enough to skip retrieval.",
            "The question is a count or a sum over rows.",
          ],
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Fix retrieval basics first",
          text: "Most weak RAG systems need better chunking, hybrid retrieval and a reranker long before they need an agent. Those three are cheaper, faster and easier to debug. Come to this chapter only when they are in place and a named failure remains.",
        },
        {
          kind: "p",
          text: "The first shape is a question that needs more than one search.",
        },
      ],
    },
    {
      id: "s2-agentic",
      title: "Agentic retrieval fixes questions whose second search depends on the first",
      goal: "When does a question need a loop of searches instead of one?",
      blocks: [
        {
          kind: "p",
          text: "Chapter seven called this a multi-hop question, where the second search depends on the first answer. Take this one: find the PEP that proposes an optional GIL, then find the PEPs it references. One search can't know the second query until it has read the first result.",
        },
        {
          kind: "p",
          text: "**Iterative retrieval** fixes it. You search, read what came back, and search again with what you learned. **Agentic RAG** goes one step further. An **agent** is an LLM that chooses its next action in a loop. At each step it decides whether to search, which tool to use, or whether to stop, inside a limit you set.",
        },
        {
          kind: "p",
          text: "A compound question is different. Comparing what PEP 8 and PEP 20 say about readability needs two searches, but neither depends on the other. Chapter seven's decomposition runs them side by side, with no loop.",
        },
        {
          kind: "p",
          text: "The loop has a price, in four parts.",
        },
        {
          kind: "list",
          items: [
            "Each pass through the loop is another LLM call, so latency multiplies.",
            "The path varies between runs, so debugging needs the full traces from chapter ten.",
            "You must cap the steps and tokens, and stop on a repeated query, or a confused agent spins.",
            "A plain pipeline is easy to evaluate. An agent also needs its **trajectory** evaluated, meaning the sequence of searches and tool calls it made, as well as its answer.",
          ],
        },
        {
          kind: "widget",
          id: "c11-agent-decision",
          intro: "Five questions arrive, each over the PEP corpus or a company system. For each, choose the cheapest design that can answer it. Predict before you see what each choice costs.",
        },
        {
          kind: "quiz",
          id: "c11-q1",
          question: "Which question genuinely needs iterative retrieval?",
          options: [
            "What does PEP 8 say about line length?",
            "Compare how PEP 8 and PEP 20 treat readability.",
            "Find the PEP about an optional GIL, then list the PEPs it references.",
            "Summarise PEP 572.",
          ],
          answer: 2,
          explain: "The second search depends on what the first returns. Option two is two independent lookups, which decomposition handles. The others are single lookups.",
        },
        {
          kind: "p",
          text: "Interviewers often ask when you would not use an agent, because the answer shows judgement.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "When would you not use an agent?",
          text: "This question tests judgement. Say that you default to the plain pipeline, and add a loop only for dependent multi-hop questions where evaluation shows a single search failing. Mention step caps, trace logging and the extra latency in the same breath.",
        },
        {
          kind: "p",
          text: "An agent still reads a few chunks at a time. Some questions need the whole corpus.",
        },
      ],
    },
    {
      id: "s3-graphrag",
      title: "GraphRAG answers whole-corpus questions that top-k retrieval cannot",
      goal: "Which questions can no set of top-k chunks answer, and what does GraphRAG build for them?",
      blocks: [
        {
          kind: "p",
          text: "Ask what the main themes are across all eighteen PEPs. Top-k retrieval returns the five chunks closest to the word themes, which tells you almost nothing. Call this a **global question**, one about the corpus as a whole. No five chunks hold its answer. This is the failure GraphRAG targets.",
        },
        {
          kind: "p",
          text: "**GraphRAG** builds a knowledge graph from your documents, then answers from summaries of it. Chapter eleven defined the graph: entities, such as people, services or PEPs, and the relationships between them, called edges. Microsoft's open-source version is the best known, and it runs in five stages.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "An LLM extracts entities and relationships from each chunk.",
            "Duplicates are merged, so PEP 572 and the walrus PEP become one entity.",
            "An algorithm splits the graph into **communities**, which are groups of entities with many edges between them.",
            "An LLM summarises each community, and the summaries are stored as a new index.",
            "At query time, each relevant summary gives a partial answer to the global question, and the partial answers are combined.",
          ],
        },
        {
          kind: "p",
          text: "The strength is real: global questions and questions that span many documents become answerable. The weakness is cost. Every chunk costs an LLM call at indexing, and every document update touches the graph. For lookups, hybrid retrieval wins on cost and speed.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Do not build a graph to answer lookup questions",
          text: "Most enterprise questions are lookups: find the policy, find the ticket, find the clause. GraphRAG adds nothing there. Ask the customer for ten real questions first. If none is global or relational, skip it.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Local versus global queries",
          text: "GraphRAG systems usually offer two modes. Local search starts from the entities named in the question and walks to their neighbours. It suits questions about specific things and how they connect. Global search works from the community summaries. It suits global questions about the corpus as a whole.",
        },
        {
          kind: "quiz",
          id: "c11-q2",
          question: "Which question is the best fit for GraphRAG?",
          options: [
            "What is the maximum line length in PEP 8?",
            "What recurring design concerns appear across the whole PEP collection?",
            "Which PEP number introduced the walrus operator?",
            "Show me the paragraph about the GIL in PEP 703.",
          ],
          answer: 1,
          explain: "It is a global question about the corpus as a whole. The other three are lookups that hybrid retrieval answers faster and far more cheaply.",
        },
        {
          kind: "p",
          text: "The next failure is smaller and far more common: a chunk that never names its subject.",
        },
      ],
    },
    {
      id: "s4-contextual",
      title: "A chunk that never names its subject needs its context put back",
      goal: "How do you repair a chunk that no longer says what it is about?",
      blocks: [
        {
          kind: "p",
          text: "Chunking cuts documents apart, and some chunks lose their subject. A paragraph that says the proposal was accepted after long discussion never names the proposal. Neither embedding search nor keyword search has anything to match on. A question about the walrus operator never finds that chunk.",
        },
        {
          kind: "p",
          text: "AskPEP already has a cheap repair. In chapter three, the `embedding_text` property joins the heading path to the chunk's text, and that string is what gets embedded. So each chunk's vector carries its PEP's title and section names. Chapter three called contextual retrieval a heavier version of this trick.",
        },
        {
          kind: "p",
          text: "The heading prefix costs no model calls, but it has two limits. It can only say where a chunk sits, in the headings the author wrote. And AskPEP's keyword search never sees it, because chapter twelve's tsvector column is built from the chunk's text alone.",
        },
        {
          kind: "p",
          text: "**Contextual retrieval**, published by Anthropic in 2024, is that heavier version. For each chunk, an LLM reads the whole document and writes a sentence or two that places the chunk in it. You prepend that text, then embed the result and index it for keyword search too. The stored chunk now names its own subject.",
        },
        {
          kind: "widget",
          id: "c11-contextual-chunk",
          intro: "Three chunks from different PEPs say nearly the same thing, and none names its PEP. Predict which chunk search ranks first for a question about the walrus operator. Then prepend context and watch the ranking change.",
        },
        {
          kind: "code",
          lang: "text",
          code: `<document>
{WHOLE_DOCUMENT}
</document>

Here is a chunk from that document:
<chunk>
{CHUNK_TEXT}
</chunk>

Write one or two sentences that place this chunk within the document,
to help someone searching for it. Reply with the sentences only.`,
          caption: "The shape of the prompt. The whole document is the same for every chunk of it, so prompt caching makes the repeated calls much cheaper.",
        },
        {
          kind: "p",
          text: "Anthropic reported large drops in failed retrievals, most of all when they added keyword search and a reranker. Their numbers come from their own datasets, so measure on your own golden set with chapter nine's harness.",
        },
        {
          kind: "p",
          text: "The cost is one LLM call per chunk at indexing time, and the work at query time is unchanged.",
        },
        {
          kind: "quiz",
          id: "c11-q3",
          question: "A chunk says only that the change was accepted after discussion. What does contextual retrieval do to it?",
          options: [
            "Splits it into smaller chunks.",
            "Prepends an LLM-written sentence naming the document and topic before embedding and keyword indexing.",
            "Reranks it with a cross-encoder at query time.",
            "Replaces it with a summary of the whole corpus.",
          ],
          answer: 1,
          explain: "The context is generated once at indexing time and stored with the chunk, so both embedding search and keyword search can now match the subject.",
        },
        {
          kind: "p",
          text: "The third repair, **late chunking**, needs no LLM. Normal chunking cuts the text first and embeds each piece alone, so each vector sees only its own piece. Late chunking flips the order. Jina AI published the idea in 2024.",
        },
        {
          kind: "p",
          text: "A **long-context embedding model**, one that accepts thousands of tokens at once, reads the whole document first. It outputs one vector per token. You then average the token vectors inside each chunk's span, which gives one vector per chunk.",
        },
        {
          kind: "p",
          text: "Because the model read the whole document first, each token vector carries information from its neighbours. A pronoun in chunk four carries some meaning from the name it refers to in chunk one.",
        },
        {
          kind: "compare",
          caption: "All three repairs put lost context back. They pay in different places.",
          columns: ["", "Heading prefix", "Contextual retrieval", "Late chunking"],
          rows: [
            ["How context gets in", "The heading path joined to the text", "Written text prepended to the chunk", "Learned into the vector by a long-context model"],
            ["Extra LLM calls", "None", "One per chunk at indexing", "None"],
            ["Helps keyword search", "Only if you index it too. AskPEP doesn't", "Yes, the prefix is searchable text", "No. It changes vectors only"],
            ["Needs", "Headings in the source", "Any LLM and any embedding model", "A long-context embedding model that exposes token vectors"],
          ],
        },
        {
          kind: "p",
          text: "Try the free heading prefix first. If error analysis still shows chunks that never name their subject, add contextual retrieval. You can read what it wrote, and it helps keyword search too. Choose late chunking when the indexing bill matters and your embedding model supports it. Test each on your golden set.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Why the document length limit matters",
          text: "Late chunking needs the entire document inside the embedding model's context window. A document longer than the window must itself be split into large segments first, which brings back a milder version of the original problem.",
        },
        {
          kind: "p",
          text: "All three repairs assume the answer is in the text. Sometimes it never got there.",
        },
      ],
    },
    {
      id: "s6-multimodal",
      title: "Multimodal RAG starts with deciding what the page actually is",
      goal: "What do you do when the answer sits in a chart or a scan?",
      blocks: [
        {
          kind: "p",
          text: "Some answers live in a chart, a scanned form or an architecture diagram. The parsing from chapter two drops them or garbles them. **Multimodal RAG** means retrieving and reasoning over images as well as text. A **vision model** is an LLM that reads images as well as text. There are three routes, and they differ in effort and fidelity.",
        },
        {
          kind: "compare",
          columns: ["Route", "How it works", "Good for", "Weak at"],
          rows: [
            ["Convert to text first", "OCR, table extraction or captions from a vision model, then ordinary text RAG", "Most business documents. Cheapest route", "Layout, charts with subtle values, anything lost in conversion"],
            ["Embed images directly", "A model that maps images and text into one space, so a text query finds an image", "Photo and diagram search", "Fine detail and reading text inside images"],
            ["Retrieve page images", "Embed whole page images, then give the best pages to a vision model", "Slides, scans and layout-heavy PDFs", "Cost, and a newer, less settled toolchain"],
          ],
          caption: "ColPali, published in 2024, is an example of the third route. Check current tooling before committing, because this area moves quickly.",
        },
        {
          kind: "p",
          text: "Start with the cheapest route and look at what it loses. If your users ask about numbers inside charts and your extraction misses them, page-image retrieval earns its keep. If they ask about prose in PDFs, it does not.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Tables are the usual first multimodal problem",
          text: "Before images, fix tables. A table flattened into a line of text loses its rows and columns. Extract it as structured text or as a small data table, and keep its caption in the same chunk.",
        },
        {
          kind: "p",
          text: "The next question is whether you need retrieval at all.",
        },
      ],
    },
    {
      id: "s7-long-context",
      title: "Long context competes with RAG on small, stable corpora, and loses elsewhere",
      goal: "When is pasting the whole corpus into the prompt better than retrieving?",
      blocks: [
        {
          kind: "p",
          text: "Chapter one defined long context as pasting whole source documents into the window. Windows now hold hundreds of thousands of tokens, so why retrieve at all? Because pasting everything means paying for all of it on every request. Retrieval pays once, at indexing, and sends only what matters.",
        },
        {
          kind: "compare",
          caption: "Treat these as the axes of the conversation with a customer, not as fixed numbers.",
          columns: ["Axis", "Long context", "RAG"],
          rows: [
            ["Corpus size", "Must fit the window, with room for the answer", "Effectively unlimited"],
            ["Cost per query", "You pay for the whole corpus each time, less with prompt caching", "You pay for a few chunks"],
            ["Latency", "Prefill grows with every token sent", "Retrieval plus a short prompt"],
            ["Permissions", "Hard. The model sees whatever you paste", "Filter chunks per user"],
            ["Freshness", "Paste the new version", "Needs an ingestion path"],
            ["Citations", "Possible, but you rely on the model to locate", "Chunk ids give exact provenance"],
            ["Build effort", "Very low", "Moderate to high"],
          ],
        },
        {
          kind: "p",
          text: "Long context wins for a small, stable corpus that one audience queries a few times a day. A 60-page handbook for one team is a fine example. Prompt caching softens the cost. Retrieval wins when the corpus is big, changes often, or has per-user permissions.",
        },
        {
          kind: "p",
          text: "Attention is also uneven. Models can miss details buried in a very long prompt, which chapter eight called lost in the middle. A bigger window is a bigger haystack. Retrieval cuts the prompt down to the few chunks that matter before the model reads it.",
        },
        {
          kind: "quiz",
          id: "c11-q4",
          question: "A 5,000-employee company wants one assistant over 200,000 documents with per-team permissions. What is the right base design?",
          options: [
            "Long context, because windows are large now.",
            "RAG with permission filtering at retrieval.",
            "Fine-tune a model on all documents.",
            "Long context for admins and RAG for everyone else.",
          ],
          answer: 1,
          explain: "The corpus is far beyond any window, and permissions need per-user filtering that stuffing cannot give. RAG fits both constraints.",
        },
        {
          kind: "p",
          text: "The last failure is a question that needs arithmetic, which no text search can do.",
        },
      ],
    },
    {
      id: "s8-structured",
      title: "Count and filter questions belong in SQL, behind limits the database enforces",
      goal: "What do you do when the question needs arithmetic over rows?",
      blocks: [
        {
          kind: "p",
          text: "How many support tickets closed last quarter in Europe? This is a count over rows. Embedding rows into a vector store and retrieving five of them cannot count anything. The failure is using similarity search on a question that needs arithmetic.",
        },
        {
          kind: "p",
          text: "**Text-to-SQL** asks an LLM to write a database query from the question, runs it, and has the model explain the result. You give the model the schema, a few example pairs of question and query, and descriptions of the columns. A router, as chapter seven described, decides whether a question goes to SQL, to document RAG, or to both.",
        },
        {
          kind: "p",
          text: "Treat the generated query as untrusted, and let the database limit what it can do.",
        },
        {
          kind: "code",
          lang: "python",
          code: `def ask_data(question: str, user: User) -> str:
    sql = llm.write_sql(question=question, schema=SCHEMA_DOC, examples=EXAMPLES)
    assert_read_only_single_statement(sql)  # reject anything but one SELECT
    role = f"readonly_{user.tenant}"
    rows = db.with_role(role, timeout_ms=3000, max_rows=200).query(sql)  # row-level security applies here
    return llm.explain(question=question, sql=sql, rows=rows)  # cite the query in the answer`,
          caption: "The guardrails matter more than the prompt. They are a read-only role, a single-SELECT check, a timeout, a row cap and row-level security.",
        },
        {
          kind: "list",
          items: [
            "Use a read-only database role, never the application's own credentials.",
            "Let the database enforce row-level security, the Postgres feature from chapter eleven that hides from each user the rows they may not see. Then the generated SQL cannot step outside the user's rows.",
            "Expose a curated view or a **semantic layer**, which is a set of named metrics and tables, instead of the raw schema.",
            "Show the generated SQL to the user, so they can spot a wrong join.",
            "Treat column values as untrusted text, because chapter ten's indirect injection can arrive through data as well as documents.",
          ],
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A plausible query can still be wrong",
          text: "The model may join on the wrong key and return a believable number. Test text-to-SQL with a golden set of questions and known answers, the same way you test retrieval.",
        },
        {
          kind: "quiz",
          id: "c11-q5",
          question: "Which control best limits the damage from a bad generated SQL query?",
          options: [
            "Asking the model nicely to write safe SQL.",
            "A read-only role with row-level security, a timeout and a row cap.",
            "Embedding the table rows too.",
            "Running it on the production write database for speed.",
          ],
          answer: 1,
          explain: "Database-enforced limits hold even when the model is wrong or manipulated. Prompt wording does not.",
        },
        {
          kind: "p",
          text: "That is the sixth patch. The last section checks that you can prescribe each one from its symptom.",
        },
      ],
    },
    {
      id: "s9-matching",
      title: "Pick the patch by the symptom, and keep the plain pipeline as the default",
      goal: "Can you prescribe the right pattern from the symptom alone?",
      blocks: [
        {
          kind: "p",
          text: "Here is the whole chapter in one table. Read the cost column twice, because conference talks skip it.",
        },
        {
          kind: "compare",
          caption: "Seven patterns, each with the failure it fixes and what it costs you.",
          columns: ["Pattern", "The failure it fixes", "What it costs you"],
          rows: [
            ["Iterative or agentic retrieval", "The second search depends on the result of the first", "Extra LLM calls, latency and unpredictable paths"],
            ["GraphRAG", "Global questions about the whole corpus", "Heavy LLM spend at indexing and a graph to maintain"],
            ["Contextual retrieval", "A chunk never names its subject, so search can't find it", "One LLM call per chunk at indexing"],
            ["Late chunking", "Chunk vectors lose the document around them", "A long-context embedding model"],
            ["Multimodal RAG", "The answer lives in a chart, scan or diagram", "A vision step and bigger indexes"],
            ["Long context", "A small, stable corpus that fits in the window", "Cost and latency on every query"],
            ["Text-to-SQL", "The question is a count, sum or filter over rows", "Schema management and strict safety rails"],
          ],
        },
        {
          kind: "p",
          text: "Matching pattern to symptom is the skill this chapter teaches, so test it now.",
        },
        {
          kind: "widget",
          id: "c11-pattern-matcher",
          intro: "Pick a pattern, then pick the failure it fixes. There are seven pairs, and your first-try accuracy is the verdict. Predict before you click, because wrong guesses show what each pattern does not do.",
        },
        {
          kind: "p",
          text: "Interviewers often ask which advanced technique you would add first. It tests whether you diagnose before you prescribe.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Which advanced technique would you add first?",
          text: "A safe senior answer refuses to pick in the abstract. Say you would run error analysis, then choose by the dominant failure. Offer the cheap options first: a heading prefix before contextual retrieval, decomposition before an agent, and SQL for anything that counts.",
        },
        {
          kind: "p",
          text: "So the plain pipeline stays the default, and each pattern here is a patch you add when your golden set names its failure. Chapter sixteen puts this into a design interview, where you choose patches out loud and defend their costs.",
        },
      ],
    },
  ],
  recap: [
    "Adopt an advanced pattern only when error analysis names the failure it fixes.",
    "Agentic retrieval is for multi-hop questions, where the second search depends on the first, and it costs latency and predictability.",
    "GraphRAG answers global questions about the whole corpus, and it is expensive to build and maintain.",
    "A chunk that never names its subject gets the free heading prefix first, then contextual retrieval or late chunking.",
    "Long context suits small, stable corpora, and RAG suits large, changing or permissioned ones.",
    "Count and filter questions belong in SQL, behind a read-only role with row-level security.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In advanced RAG patterns I learned that each pattern fixes one named failure and adds cost. So I diagnose with an evaluation set before adopting any. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["rag-q31", "rag-q32", "rag-q33", "rag-q02"],
};

export default chapter;
