import type { Chapter } from "../types";

// CHECK: every product name in this chapter was read on 22 October 2026. Google renamed Vertex AI to Gemini Enterprise Agent Platform on 22 April 2026, and some pages call the search product Agent Search. The code still imports vertexai, and the lab and the tests still say Vertex AI.

const chapter: Chapter = {
  id: "architecture-03-retrieval-stack",
  course: "architecture",
  number: 3,
  title: "Corpus size, filters and freshness pick the retrieval stack",
  tagline: "AskPEP's stack holds at five times the traffic. The two packaging failures turn out to be about chunks.",
  minutes: 60,
  objectives: [
    "Name the four inputs that pick a retrieval stack, and measure your own corpus.",
    "Compare the Google Cloud options, and name the signals that would take AskPEP off Cloud SQL.",
    "List the four things an embedding swap changes.",
    "Explain why a reranker swap needs the refusal threshold checked.",
    "Compare two stacks with `compare_stacks`, and treat a small gap as a tie.",
    "Write the retrieval stack row and an ADR that cites only numbers you measured.",
    "Read AskPEP's own retrieval ADR and reuse its shape on your next stack decision.",
  ],
  sections: [
    {
      id: "s1-four-inputs",
      title: "Four numbers pick a retrieval stack, and AskPEP's are small",
      goal: "Which numbers pick a retrieval stack, and what are AskPEP's?",
      blocks: [
        {
          kind: "p",
          text: "The stack isn't the reason, and it will carry 1,000 requests a day. Traffic multiplies requests and adds no chunks, so the first check is the corpus. So far AskPEP has run on one retrieval stack. Voyage turns text into vectors, Postgres with pgvector stores them, and Voyage rerank orders the candidates.",
        },
        {
          kind: "p",
          text: "A **retrieval stack** is the embedding model, the vector store and the reranker, taken together. This chapter fills the retrieval stack row of section 3 and writes one ADR for it.",
        },
        {
          kind: "p",
          text: "Four inputs pick a stack. They are the five questions of RAG chapter 5, less the one about keyword search, which AskPEP already answers inside Postgres.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Corpus size is the number of chunks and the tokens they hold. It sets the memory a store needs and the time a search takes.",
            "Filters are the conditions a chunk must meet before a search may return it, such as a tenant or a document id.",
            "Freshness is how soon a changed document must be searchable.",
            "The operator is the person who runs the store at three in the morning, and the skills that person has.",
          ],
        },
        {
          kind: "p",
          text: "The live desk holds 23 PEPs and 612 chunks. Your lab corpus keeps the 18. RAG chapter 5 gave a rule of thumb: below roughly a hundred thousand chunks, anything beyond brute force needs a reason. AskPEP already runs an HNSW index, so another store needs a better reason still.",
        },
        {
          kind: "p",
          text: "The store has one filter, a list of document ids, and no route in the request path sets it. A changed PEP reaches the index when you run `askpep ingest`. The operator is you, and from course 7 it is Cloud SQL.",
        },
        {
          kind: "step",
          id: "architecture03-s01",
          title: "Count your chunks and tokens",
          text: "Ask Postgres how big your corpus is. The command counts the documents and the chunks, and adds up the tokens. Write the three numbers down, because the ADR at the end of this chapter cites them.",
          lang: "bash",
          code: `docker compose exec db psql -U askpep -c "select (select count(*) from documents) as documents, count(*) as chunks, sum(token_count) as tokens from chunks"`,
          expect:
            "One row. documents is 18 and chunks is a few hundred. tokens is at most 400 times chunks, because a chunk holds 400 tokens at most.",
        },
        {
          kind: "p",
          text: "Filters deserve a second look, because they cause the quiet failures. HNSW returns its nearest candidates first, and the filter then removes some. RAG chapter 5 turned that into a rule. The candidate pool must be about k divided by the share of chunks that pass the filter.",
        },
        {
          kind: "quiz",
          id: "architecture03-q1",
          question: "A filter keeps 1 percent of the chunks. You want 5 results from post-filtering. About how many candidates must the search fetch?",
          options: ["5", "50", "500", "5,000"],
          answer: 2,
          explain:
            "The pool is k divided by the share that passes. Five divided by 0.01 is 500. At that size the speed the index bought you is gone.",
        },
        {
          kind: "p",
          text: "AskPEP's four values are small. Which store on Google Cloud is the cheapest one that holds them?",
        },
      ],
    },
    {
      id: "s2-cheapest-fit",
      title: "Cloud SQL with pgvector stays the default until a measured number says otherwise",
      goal: "Which store is the cheapest fit, and what signal would change that?",
      blocks: [
        {
          kind: "p",
          text: "RAG chapter 11 gave a method for any stack choice. List the constraints, pick the cheapest option that fits, and write down the signal that would make you switch. Apply it here. The options are the stores that Google Cloud offers.",
        },
        {
          // CHECK: names read on 22 October 2026. Vertex AI became Gemini Enterprise Agent Platform on 22 April 2026 (FACTS L334). That the search product is called Agent Search on some pages is not in FACTS.
          kind: "p",
          text: "A note on names. Google renamed Vertex AI to Gemini Enterprise Agent Platform on 22 April 2026, and some pages call its search product Agent Search. The code, the API paths and the lab still say Vertex AI, so this chapter does too. These product names were checked on 22 October 2026.",
        },
        {
          kind: "compare",
          caption: "Six stores on Google Cloud. Product features change quickly, so check each row against the current documentation before you quote it to a client.",
          columns: ["Option", "What it is", "Pick it when", "What AskPEP rewrites", "Cost of leaving"],
          rows: [
            [
              "Cloud SQL for PostgreSQL with pgvector",
              "Postgres with the pgvector extension and an HNSW index. Course 7 deploys it.",
              "The corpus is modest, SQL joins matter and the team already runs Postgres.",
              "Nothing. This is the default.",
              "Low. The schema, the SQL and the RRF code are plain Postgres.",
            ],
            // CHECK: AlloyDB's vector index types (its own ScaNN index, and pgvector's HNSW and IVF), how it filters during a vector search, and which pgvector version it ships. None of this is in FACTS.
            [
              "AlloyDB for PostgreSQL",
              "A Postgres compatible database from Google, with its own vector index types besides HNSW.",
              "The corpus holds millions of chunks, queries join to other tables and filter a lot, and the team wants to keep SQL.",
              "The connection string, and perhaps the index statement. The retrieval SQL stays.",
              "Low to medium. It is still Postgres underneath.",
            ],
            // CHECK: Vector Search's index types, its filtering, its streaming updates and its regions. None of this is in FACTS.
            [
              "Vertex AI Vector Search",
              "A managed nearest neighbour service. You send vectors and get ids back. It has no SQL.",
              "The corpus holds tens of millions of vectors, queries are many, and new text must be searchable in seconds.",
              "`PgStore` becomes a client class. The documents, the sparse search and the joins stay in Postgres or move elsewhere.",
              "High. The data model, the ingest path and the fusion inputs all change.",
            ],
            // CHECK: BigQuery's vector index types, whether a filter applies before or after the index search, and its query latency for one request at a time. None of this is in FACTS.
            [
              "BigQuery vector search",
              "A SQL function over vectors held in a BigQuery table, with an optional vector index.",
              "The work is a batch job next to warehouse data, such as finding similar past tickets.",
              "The dense step becomes a batch query. A request path would pay BigQuery's query latency.",
              "Medium. The vectors move, and the model and the chunks stay the same.",
            ],
            // CHECK: RAG Engine's vector store choices, its chunking controls and its regions. None of this is in FACTS.
            [
              "Vertex AI RAG Engine",
              "A managed service that ingests, chunks, embeds and retrieves, over a vector store you choose.",
              "The team has files in a bucket and no ingest pipeline.",
              "Chunking, ingest, the embedder and the store all become its API.",
              "High. You lose the chunk sizes and the content hash that AskPEP controls.",
            ],
            // CHECK: the current name of this product, its ingest options and its pricing. None of this is in FACTS.
            [
              "Vertex AI Search, now Agent Search",
              "A managed search app. You point it at documents and call its API. It can rank and answer.",
              "The customer wants document or site search and no pipeline code.",
              "The whole retrieval layer, and often the ranking.",
              "High. None of AskPEP's retrieval code carries over.",
            ],
          ],
        },
        {
          kind: "p",
          text: "The last two columns carry the decision. A better fit has to repay what it rewrites. For AskPEP the first row costs nothing and every other row costs a rewrite, so the default stays until a signal says otherwise.",
        },
        {
          kind: "p",
          text: "Four signals would move AskPEP off Cloud SQL. Each one is a number you can read.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "The dense stage p95 from your traces is above the latency requirement in section 1 of `docs/design.md`. The stage query from RAG chapter 14 reads it.",
            "A new requirement adds a filter that keeps about 1 percent of the chunks. The shortfall check from RAG chapter 5 then shows fewer than k results.",
            "The vectors are larger than the memory of the database instance, and the dense stage slows down. The next section shows how to work out their size.",
            "New text must be searchable within seconds, and a scheduled `askpep ingest` cannot deliver that.",
          ],
        },
        {
          kind: "p",
          text: "The operator input is a fact about the team. Write it in section 2 of `docs/design.md`, the constraints.",
        },
        {
          kind: "widget",
          id: "architecture03-stack-picker",
          intro: "Five customers, each with four numbers. Pick the cheapest store that fits them, then check your pick. The numbers after the first customer are illustrative figures, and the answers follow the table above.",
        },
        {
          kind: "quiz",
          id: "architecture03-q2",
          question: "A customer keeps 4 million chunks in a Postgres on AlloyDB, beside an orders table. Every query joins chunks to orders and filters on the customer. Which store is the cheapest fit?",
          options: [
            "Vertex AI Vector Search, because 4 million is a large corpus",
            "AlloyDB, because the joins and the data already live there",
            "BigQuery vector search, because it is SQL too",
            "Vertex AI RAG Engine, because it needs no pipeline",
          ],
          answer: 1,
          explain:
            "The joins are SQL and the data already sits in AlloyDB, so staying there rewrites the least. The other three each move the data or the pipeline. Millions of chunks do not force a move on their own.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Pick a vector store for a customer on Google Cloud",
          text: "Ask four questions first: how many chunks, which filters, how fresh, and who operates it. Then name the cheapest store that fits, such as Cloud SQL with pgvector for a modest corpus. Finish with the signal that would make you move.",
        },
        {
          kind: "p",
          text: "The store can stay. Could a better embedding model still be worth its cost?",
        },
      ],
    },
    {
      id: "s3-embedding-swap",
      title: "A new embedding model changes the column, the index and every stored vector",
      goal: "What does a new embedding model change beyond its setting?",
      blocks: [
        {
          kind: "p",
          text: "Vectors from two models don't share a space, so one model's query vector can't search another model's index. RAG chapter 4 showed the failure, and RAG chapter 10 gave the rule. Build a second index beside the first, evaluate it, and only then switch. Never mix models in one index.",
        },
        {
          kind: "p",
          text: "Here are the two embedders this chapter compares. The first is AskPEP's default. The second is the one the optional lab adds.",
        },
        {
          kind: "compare",
          caption: "Two embedders side by side. Replace each price with the current one before you use it in an ADR.",
          columns: ["Property", "Voyage voyage-3.5", "Gemini gemini-embedding-001"],
          rows: [
            ["Default size", "1,024 numbers", "3,072 numbers"],
            ["Size AskPEP uses", "1,024", "1,536, asked for with `output_dimensionality`"],
            ["Column in `chunks`", "`vector(1024)`", "`vector(1536)`"],
            // CHECK: that langchain-google-genai passes task_type through embed_documents, and the RETRIEVAL_QUERY and RETRIEVAL_DOCUMENT names. Read in the lab's stack.py, not on Google's page.
            ["Query or document hint", "`input_type`", "`task_type`, which is `RETRIEVAL_QUERY` or `RETRIEVAL_DOCUMENT`"],
            // CHECK: that Voyage returns unit-length vectors, and that gemini-embedding-001 does not normalise a vector it truncates. FACTS says only that gemini-embedding-2 normalises truncated output.
            ["Vector length", "Unit length from the service", "Not unit length after truncation, so the lab scales each vector to unit length"],
            // CHECK: that gemini-embedding-001 is served from the global location.
            ["Where it runs", "Voyage's API, with `VOYAGE_API_KEY`", "Vertex AI in your Google Cloud project, from the `global` location, with application default credentials"],
            // CHECK: Voyage's price of $0.06 per million tokens for voyage-3.5 and voyage-4 was read on 22 October 2026 and is not in FACTS. It also lists free tokens, which this table leaves out. Google's price for gemini-embedding-001 was not read, because the pricing page returned no text.
            ["Price for a million tokens", "$0.06, read on 22 October 2026", "Not read. Check Google's pricing page."],
          ],
        },
        {
          kind: "p",
          text: "Voyage has a newer model too. Its documentation lists `voyage-4` as current and `voyage-3.5` as the previous generation. The 4 series keeps 1,024 dimensions, so that swap needs no new column. It still needs a re-ingest, because a new model gives new vectors.",
        },
        {
          // CHECK: pgvector 0.8.7 limits are in FACTS L341. Cloud SQL ships 0.8.5, and that it has the same limits is not in FACTS. A halfvec holding each number in 2 bytes is pgvector's documented type but was not read for this chapter.
          kind: "p",
          text: "Size has a ceiling. pgvector can index a `vector` column up to 2,000 dimensions with HNSW, and a `halfvec` column up to 4,000. A `halfvec` holds each number in 2 bytes where a `vector` holds 4. Gemini's default of 3,072 would need `halfvec`, and AskPEP's schema has a `vector` column. So the lab asks for 1,536.",
        },
        {
          kind: "p",
          text: "AskPEP guards that ceiling in code. A function called `index_column` returns `vector` or `halfvec` for a given size. `build_providers`, which builds the embedder, calls it and refuses a size that needs `halfvec`. The lab writes both pieces.",
        },
        {
          // CHECK: that pgvector stores 4 bytes for each dimension of a vector, and that the HNSW index is extra to the table.
          kind: "p",
          text: "Size also costs memory. A `vector` holds each number in 4 bytes. One million chunks at 1,536 dimensions is about 6.1 gigabytes of vectors, and at 1,024 dimensions it is about 4.1. The index comes on top. AskPEP's 612 chunks need about 2.5 megabytes at 1,024 dimensions, so size is no reason to change.",
        },
        {
          kind: "p",
          text: "A swap changes four things beyond the setting `EMBED_PROVIDER=gemini`. Name all four before you try one.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "`EMBED_MODEL` must name the Gemini model, because the default names a Voyage model.",
            "`EMBED_DIM` must be 2,000 or less. AskPEP refuses a larger size.",
            "A new migration must change the column and the index to the new size.",
            "A re-ingest must embed every chunk again, because old vectors can't be searched with the new model.",
          ],
        },
        {
          kind: "p",
          text: "The re-ingest needs no extra flag. The content hash of a document includes the model name, the dimension and the chunk sizes. A changed model makes every document look changed, so `askpep ingest` embeds all of them again.",
        },
        {
          kind: "code",
          lang: "sql",
          code: `-- src/askpep/migrations/007_gemini_embeddings.sql
DROP INDEX IF EXISTS chunks_embedding_hnsw;
TRUNCATE chunks;
ALTER TABLE chunks ALTER COLUMN embedding TYPE vector({{EMBED_DIM}});
CREATE INDEX chunks_embedding_hnsw ON chunks USING hnsw (embedding vector_cosine_ops);`,
          caption: "The migration you would write for a Gemini swap. Read it now. The last section says when to save it.",
        },
        {
          kind: "p",
          text: "Read the file line by line. It drops the index first, because an index is built for one size. It empties `chunks`, because Postgres can't convert vectors of one size into another. `migrate` fills `{{EMBED_DIM}}` from your settings.",
        },
        {
          kind: "p",
          text: "`migrate` also records the version, so a migration runs once. Run it with `EMBED_DIM` unset and the column keeps the old size. You then need a second migration to fix it. Going back to Voyage is another migration with `EMBED_DIM` set to 1024, and another re-ingest.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Don't save the migration into the migrations folder yet",
          text: "`askpep migrate` applies every file it hasn't run. Saved early, this one would empty `chunks` the next time anyone runs `migrate` with the default settings. The TRUNCATE is a shortcut for a development database. A production swap builds a second index beside the first, as RAG chapter 10 said.",
        },
        {
          kind: "quiz",
          id: "architecture03-q3",
          question: "You set `EMBED_PROVIDER=gemini` and `EMBED_DIM=3072`, and change nothing else. What happens when AskPEP builds its providers?",
          options: [
            "It builds the embedder, and the first insert fails",
            "`build_providers` raises a `ValueError` that names `halfvec`",
            "It truncates each vector to 2,000 numbers",
            "It switches the column to `halfvec` by itself",
          ],
          answer: 1,
          explain:
            "`build_providers` asks `index_column` first. A size of 3,072 needs a `halfvec` column and the schema has a `vector` column, so it refuses before any call to Google.",
        },
        {
          kind: "quiz",
          id: "architecture03-q4",
          question: "One million chunks at 1,536 dimensions, with 4 bytes for each number. About how large are the vectors alone?",
          options: ["1.5 GB", "6 GB", "24 GB", "150 GB"],
          answer: 1,
          explain:
            "One million times 1,536 times 4 bytes is 6.144 billion bytes, about 6.1 GB. The HNSW index comes on top of that. At 1,024 dimensions the same corpus is about 4.1 GB.",
        },
        {
          kind: "p",
          text: "The embedder has a swap cost you can list. Does the reranker have one too?",
        },
      ],
    },
    {
      id: "s4-reranker",
      title: "A reranker's scores are not portable, so a new reranker needs a new refusal threshold",
      goal: "Why does a new reranker need its refusal threshold checked?",
      blocks: [
        {
          kind: "p",
          text: "RAG chapter 7 said to retrieve many and rerank few. AskPEP sends 30 candidates to the reranker, which keeps 6. The reranker also decides when to refuse. `is_thin` is true when there are no hits, or when the best rerank score is below `min_rerank_score`, which is 0.2.",
        },
        {
          kind: "compare",
          caption: "Two rerankers side by side. The ranking API needs setup that Voyage does not, and both need current prices before an ADR uses them.",
          columns: ["Property", "Voyage rerank-2.5", "Vertex AI ranking API"],
          rows: [
            // CHECK: the model alias semantic-ranker-default@latest and the rankingConfigs.rank request and reply fields were read on 22 October 2026 (STEPS note 11).
            ["Model", "`rerank-2.5`", "`semantic-ranker-default@latest`"],
            ["How AskPEP calls it", "Voyage's API, with `VOYAGE_API_KEY`", "A REST call to `rankingConfigs.rank` on the Discovery Engine API, with a bearer token from application default credentials"],
            // CHECK: the permission discoveryengine.rankingConfigs.rank, that roles/discoveryengine.viewer holds it, and that the Discovery Engine API (discoveryengine.googleapis.com) must be enabled in the project. None of this is in FACTS.
            ["Setup", "An API key", "Enable the Discovery Engine API in the project, and hold a role with `discoveryengine.rankingConfigs.rank`, such as `roles/discoveryengine.viewer`"],
            // CHECK: 1,000 records in one request, and an input limit of 512 tokens for models up to 003 and 1,024 tokens from 004, were read on 22 October 2026. Not in FACTS.
            ["Records in one request", "AskPEP sends 30", "Up to 1,000. AskPEP sends 30."],
            ["Longest input", "Not read here", "512 tokens for older models and 1,024 from model 004. AskPEP's chunks hold 400 tokens at most."],
            // CHECK: Voyage's price of $0.05 per million tokens for rerank-2.5 and rerank-3 was read on 22 October 2026 and is not in FACTS. Google's ranking price was not read, because the pricing page returned no text.
            ["Price", "$0.05 for a million tokens, read on 22 October 2026", "Not read. Check Google's pricing page."],
            ["Score", "A relevance score on Voyage's scale", "A score from 0 to 1 on Google's own scale"],
          ],
        },
        {
          kind: "p",
          text: "`RERANK_PROVIDER=vertex` selects the ranking API. Set `RERANK_MODEL` too, because its default names a Voyage model. Voyage now lists `rerank-3` as current and `rerank-2.5` as an older model. AskPEP still uses `rerank-2.5`.",
        },
        {
          kind: "p",
          text: "Two rerankers score on their own scales. The same question and chunk can score differently from each, so a threshold tuned for one means something else on the other. AskPEP set 0.2 while Voyage was the only reranker. Nothing in the code ties that number to Voyage.",
        },
        {
          kind: "p",
          text: "After a reranker swap the threshold can refuse good answers, or answer questions it should refuse. No error appears either way. So the swap carries a second job. Re-run the evals and tune `MIN_RERANK_SCORE` until they hold.",
        },
        {
          kind: "list",
          items: [
            "Run `uv run askpep eval` and read `refusal_rate_unanswerable`. A healthy value is 1.0, because the golden set has two questions that AskPEP should refuse.",
            "Run `uv run askpep eval run --slice retrieval` and read `rate`. This is the `recall@6` of the gate, and its floor is 0.80 from evals chapter 8.",
            "Add `STORE=local` and a `LOCAL_STORE_PATH` to either command to run it against a local store file. The database stays as it is.",
          ],
        },
        {
          kind: "widget",
          id: "architecture03-swap-breaks",
          intro: "Four swaps, each with one step missing. Predict what happens, then check. The cases use the settings from this section and the one before it.",
        },
        {
          kind: "quiz",
          id: "architecture03-q5",
          question: "You swap in the Vertex AI ranking API and leave `min_rerank_score` at 0.2. What is the right next step?",
          options: [
            "Nothing, because every reranker scores on one scale",
            "Run the evals again, and tune the threshold if the refusal of the unanswerable questions or the retrieval rate moved",
            "Set the threshold to 0.5, because a bigger number is safer",
            "Turn the threshold off for good, since the new reranker is better",
          ],
          answer: 1,
          explain:
            "Two rerankers score on their own scales, so 0.2 means something different after the swap. The evals show whether the threshold now refuses too much or too little.",
        },
        {
          kind: "p",
          text: "Both swaps have a cost. How do you tell whether a candidate stack earns it?",
        },
      ],
    },
    {
      id: "s5-compare",
      title: "Two stacks are compared on one golden set, and a one-item gap is a tie",
      goal: "How do you compare two stacks, and when is a gap really a tie?",
      blocks: [
        {
          kind: "callout",
          tone: "warn",
          title: "Do the lab before the steps of this section",
          text: "Both steps run code that you write in the lab at the end of the chapter. If you skip the lab, read this section for the ideas and go on to the last section. You lose the measured comparison, and your ADR rests on the numbers you already hold.",
        },
        {
          kind: "p",
          text: "`compare_stacks` scores each stack on the same golden set. A stack is a function from a question and a count to a list of hits. For each stack it returns the name, recall at `k`, MRR and the median time of one call, best first.",
        },
        {
          kind: "p",
          text: "MRR is the mean of one divided by the rank of the first right document. A right answer at rank 1 scores 1, and at rank 4 it scores 0.25. The script below sets `k` to 5.",
        },
        {
          kind: "p",
          text: "Its `recall` is not the gate's `recall@6`. The gate counts the share of questions that found every expected document in the top 6. `compare_stacks` gives partial credit to each question. Use it to compare two stacks with each other, and never against the gate floor.",
        },
        {
          kind: "p",
          text: "The golden set holds 22 questions. Twenty have answers and are scored, so one question changes recall by at most 0.05. Evals chapter 8 showed how wide that is: 16 passes out of 20 gives an interval of 0.60 to 0.95.",
        },
        {
          kind: "p",
          text: "Treat a gap of two questions or fewer, which is 0.10, as a tie. This is a rule of thumb and no statistical test. It stops you from rebuilding an index for one lucky question.",
        },
        {
          kind: "step",
          id: "architecture03-s02",
          title: "Build one local store for each stack",
          text: "Write one JSON store file for each stack. The first run uses your default settings and writes `data/store-voyage.json`. The second sets the Gemini embedder and writes `data/store-google.json`. Neither run touches Postgres. Both runs call a paid embedding service.",
          lang: "bash",
          code: `LOCAL_STORE_PATH=data/store-voyage.json uv run askpep ingest --store local
EMBED_PROVIDER=gemini EMBED_MODEL=gemini-embedding-001 EMBED_DIM=1536 \\
GOOGLE_CLOUD_PROJECT=your-project LOCAL_STORE_PATH=data/store-google.json \\
uv run askpep ingest --store local`,
          expect: "Each run ends with one line shaped like `wrote N chunks from 18 documents`. N is your chunk count from step 1, and it is the same in both lines.",
        },
        {
          kind: "step",
          id: "architecture03-s03",
          title: "Compare the two stacks on the golden set",
          text: "Write `scripts/compare_stacks.py`. It builds each stack from your settings, wraps it in a function of a question and a count, and prints one line per stack. Run it from the project root, because the golden set and the store files use relative paths.",
          lang: "python",
          code: `# scripts/compare_stacks.py
from askpep.config import get_settings
from askpep.evals.retrieval import load_golden
from askpep.retrieval import retrieve
from askpep.services import build_services
from askpep.stack import compare_stacks
from askpep.tracing import Trace


def stack_of(**changes):
    svc = build_services(get_settings().model_copy(update={"store": "local", **changes}))

    def run(question: str, n: int):
        return retrieve(svc, question, Trace("compare", question), n)

    return run


stacks = {
    "voyage": stack_of(local_store_path="data/store-voyage.json"),
    "google": stack_of(
        local_store_path="data/store-google.json",
        embed_provider="gemini",
        embed_model="gemini-embedding-001",
        embed_dim=1536,
        rerank_provider="vertex",
        rerank_model="semantic-ranker-default@latest",
    ),
}

for row in compare_stacks(load_golden(), stacks, k=5):
    print(f"{row['name']:8} recall {row['recall']:.3f}  mrr {row['mrr']:.3f}  p50 {row['p50_ms']:.0f} ms")`,
          expect:
            "Two lines, the better stack first. Each shows the name, recall, MRR and the median time in milliseconds. The numbers are your own. Write them down with today's date for the ADR.",
        },
        {
          kind: "p",
          text: "The median time is the middle of 20 calls on your machine. It includes the network trip to Voyage or to Google, so it says nothing about Cloud Run. The run makes 20 embedding calls and 20 rerank calls for each stack, and both services bill by use.",
        },
        {
          // CHECK: how to run the two live lab tests and what they cost. The command comes from the lab's pytest config (addopts holds -m 'not live'). Google's embedding and ranking prices were not read, and the ranking test needs the Discovery Engine API enabled in the project.
          kind: "callout",
          tone: "warn",
          title: "Two lab tests call Google and cost money",
          text: "Lab steps 2 and 3 each have a live test. Pytest skips both by default, because they call Google. Run them only when you want proof against the real services, with the command below. They need application default credentials and a project.",
        },
        {
          kind: "code",
          lang: "bash",
          code: `GOOGLE_CLOUD_PROJECT=your-project uv run pytest tests/architecture -k "architecture03_s2 or architecture03_s3" -m live`,
          caption: "Run from the project root. Without GOOGLE_CLOUD_PROJECT, both tests skip.",
        },
        {
          kind: "p",
          text: "The embedding test sends three short texts. The ranking test sends one request with three records. Both should cost very little. Google's prices for them are unread, so check both pricing pages before you run them. The ranking call also needs the Discovery Engine API enabled in your project.",
        },
        {
          kind: "widget",
          id: "architecture03-tie-or-win",
          intro: "Four comparisons on a golden set of 20 scored questions. Each one sets the default stack against a candidate stack that you are testing. Predict whether the gap is a tie, a lead or a reason to stay. All the numbers are illustrative figures.",
        },
        {
          kind: "quiz",
          id: "architecture03-q6",
          question: "On 20 scored questions, the default stack has recall 0.80 and the candidate has 0.85. What should the ADR say?",
          options: [
            "The candidate wins, because 0.85 is higher",
            "It is a tie, so cost, latency and who operates it decide",
            "The default wins, because it is cheaper to run",
            "Run the comparison again until the candidate wins clearly",
          ],
          answer: 1,
          explain:
            "The gap is 0.05, which is one question. That sits inside the noise of a 20 question set. Quality gives no reason either way, so the other inputs decide.",
        },
        {
          kind: "p",
          text: "You now hold four sources of numbers. What may the decision cite?",
        },
      ],
    },
    {
      id: "s6-adr",
      title: "The retrieval stack row and its ADR cite the numbers you measured",
      goal: "What goes in the stack row and its ADR, and which numbers may they cite?",
      blocks: [
        {
          kind: "p",
          text: "An ADR argues from numbers, and you already hold four sources of them. Use these four and no others.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "The corpus size from step 1 of this chapter: documents, chunks and tokens.",
            "The retrieval rate from `askpep eval run --slice retrieval`, read against the gate floor of 0.80 from evals chapter 8.",
            "The dense stage p95 from the stage query in RAG chapter 14, set against the latency number in section 1 of `docs/design.md`.",
            "The `compare_stacks` table from the step 'Compare the two stacks on the golden set', if you did the lab.",
          ],
        },
        {
          kind: "p",
          text: "Cost needs care. `askpep cost-model` prices the chat models only. It does not price embeddings or reranking. So a cost line in your ADR is a worked example. You do it by hand, with a price you checked and the date you checked it.",
        },
        {
          // CHECK: Voyage's price of $0.06 per million tokens for voyage-3.5 was read on 22 October 2026 and is not in FACTS. The 500 chunks are a round figure above the few hundred of RAG chapter 5, not a measurement.
          kind: "callout",
          tone: "insight",
          title: "Illustrative figures",
          text: "A worked example of the embedding cost. 500 chunks of 400 tokens make 200,000 tokens. At $0.06 for a million tokens, Voyage's price on 22 October 2026, that is 1.2 cents. Use your own chunk count and today's price.",
        },
        {
          kind: "step",
          id: "architecture03-s04",
          title: "Fill the retrieval stack row of section 3",
          text: "Open `docs/design.md` and fill the retrieval stack row. Name the embedder, the store and the reranker with their sizes. Name the ADR you are about to write, and list the options you rejected. The example below keeps the default. If your numbers said to switch, write the stack you chose.",
          lang: "markdown",
          code: `| Retrieval stack | Voyage voyage-3.5 at 1,024 dimensions, pgvector with HNSW in Cloud SQL, Voyage rerank-2.5 | \`adr/0002-retrieval-stack.md\` | AlloyDB, Vertex AI Vector Search, Gemini embeddings with the Vertex AI ranking API |`,
          file: "docs/design.md",
          expect: "The row has four cells. The third names an ADR file that you create in the next step.",
        },
        {
          kind: "step",
          id: "architecture03-s05",
          title: "Write the ADR and its row in section 10",
          text: "Copy `docs/adr/0000-template.md` to `docs/adr/0002-retrieval-stack.md`. Chapter 2 wrote 0001, so this is the next number. Fill every section from your numbers. Replace each three dots with a number and where it came from. Then add a row to section 10 with the number, the decision and the status.",
          lang: "markdown",
          code: `# 0002. We keep Voyage and pgvector for retrieval

- Status: proposed
- Date: 22 October 2026

## Context

Requirement R... needs an answer in ... ms (design.md section 1). The corpus holds ... chunks and ... tokens, counted in step 1. The dense stage p95 is ... ms, read with the RAG chapter 14 query. No route sets a filter, and a re-ingest handles every change.

## Options

1. Keep Voyage embeddings, pgvector and Voyage rerank. The cost to leave is low.
2. Gemini embeddings at 1,536 dimensions with the Vertex AI ranking API. It needs a migration, a re-ingest and a new refusal threshold.
3. AlloyDB or Vertex AI Vector Search. It rewrites the store.

## Decision

We will ... because ... and ... .

## Consequences

Easier: ... Harder: ... The number that would show this was wrong: ... . Then I would ... .

## Evidence

- ... ran on ... and gave ... .
- The compare_stacks run on ... gave recall ..., MRR ... and p50 ... ms for each stack.`,
          file: "docs/adr/0002-retrieval-stack.md",
          expect: "A one page ADR with no three dots left. Every number names its command and its date, and no number comes from memory.",
        },
        {
          kind: "p",
          text: "Skip the next two steps if your ADR says to stay on the default. They need the lab code, because `build_providers` must accept `gemini`.",
        },
        {
          kind: "step",
          id: "architecture03-s06",
          title: "Save the migration, only if the ADR says switch",
          text: "Save the migration from the embedding swap section under the next free number. That is 007 unless you added a migration of your own. Check the file name and the four statements against that section before you move on, because the next step runs it.",
          lang: "sql",
          code: `-- src/askpep/migrations/007_gemini_embeddings.sql
DROP INDEX IF EXISTS chunks_embedding_hnsw;
TRUNCATE chunks;
ALTER TABLE chunks ALTER COLUMN embedding TYPE vector({{EMBED_DIM}});
CREATE INDEX chunks_embedding_hnsw ON chunks USING hnsw (embedding vector_cosine_ops);`,
          file: "src/askpep/migrations/007_gemini_embeddings.sql",
        },
        {
          kind: "step",
          id: "architecture03-s07",
          title: "Run the migration and the re-ingest, only if the ADR says switch",
          text: "Run the migration with the Gemini settings, then re-ingest. Together they cover the four things from the embedding swap section. Then move the Gemini settings into `.env`, so the whole service uses one model. If the ADR chose the Vertex ranker, set `RERANK_PROVIDER` and `RERANK_MODEL`, and re-check the threshold as the reranker section says.",
          lang: "bash",
          code: `EMBED_PROVIDER=gemini EMBED_MODEL=gemini-embedding-001 EMBED_DIM=1536 \\
GOOGLE_CLOUD_PROJECT=your-project uv run askpep migrate
EMBED_PROVIDER=gemini EMBED_MODEL=gemini-embedding-001 EMBED_DIM=1536 \\
GOOGLE_CLOUD_PROJECT=your-project uv run askpep ingest`,
          expect: "The first command prints `applied: 007_gemini_embeddings`. The second prints `added 0, updated 18, skipped 0, deleted 0`, because the documents exist and every one is re-embedded.",
        },
        {
          kind: "quiz",
          id: "architecture03-q7",
          question: "Your ADR says the Google stack is 20 ms faster per question. Which source may it cite?",
          options: [
            "A vendor's blog post about its own latency",
            "The p50 column of your own compare_stacks run, with its command and date",
            "A figure you remember from an earlier project",
            "A colleague's estimate, since colleagues know the system",
          ],
          answer: 1,
          explain:
            "An ADR cites numbers measured on AskPEP, with the command and the date, so a reviewer can run them again. The other three sources can't be rerun.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Justify a retrieval stack change",
          text: "Give the measured inputs first: chunks, filters and freshness. Show a comparison on your own golden set, and call a gap of one or two questions a tie. Name the cost of the move: the re-ingest and the new threshold. Close with the number that would make you reverse it.",
        },
        {
          kind: "p",
          text: "Those are your numbers. What did AskPEP's own numbers say, and what happened to the packaging items?",
        },
      ],
    },
    {
      id: "s7-retrieval-adr",
      title: "AskPEP keeps its stack and raises the chunk limit to fix the packaging refusals",
      goal: "What did AskPEP decide about retrieval, and why did the packaging items fail?",
      blocks: [
        {
          kind: "p",
          text: "The packaging refusals came from chunks, and no store or model would have fixed them. On Thursday 3 December you open the two failing items. Each one asks about a table inside a packaging PEP. The method is to read what retrieval returned before you blame it.",
        },
        {
          kind: "p",
          text: "The right PEP is in the top six both times. The 400-token limit has cut each table in two, so each half reads as a fragment. The best rerank scores are 0.17 and 0.12, both under 0.2, so `is_thin` refuses. Lowering the threshold would rescue one item and open the door for the wrong answers.",
        },
        {
          kind: "p",
          text: "The second team's lead wants the threshold lowered today, because it is one setting. The security reviewer refuses a threshold tuned to one failing item. You raise the chunk limit to 512 tokens instead and rebuild on staging, as the release rule says. The gate gives 21 of 23 on the answer slice, and both packaging items pass.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# 0002. We keep Voyage and pgvector, and raise the chunk limit to 512 tokens

- Status: accepted
- Date: 3 December 2026

## Context
R2 needs 0.80 and reads 0.89. R7 needs 0.95 and reads 0.8715.
Corpus: 23 PEPs, 612 chunks, 198,000 tokens. Vectors about 2.5 MB.
Filters: none in the request path.
Freshness: a re-ingest, through the gate on a staging store.
Wednesday p95: embed 270 ms, dense 64, sparse 41, fuse 3, rerank 380.
Those add to 758 ms against R3's 10 seconds.
Design traffic adds requests and adds no chunks.
Two packaging items refuse: rerank scores 0.17 and 0.12, threshold 0.2.
Cause: the 400-token limit cuts each table in two.

## Options
1. Do nothing. The two items keep refusing.
2. MIN_RERANK_SCORE 0.15. Rescues one item. Tuned to one failure.
3. Chunk limit 512. Re-embeds all 23 PEPs, about 1.2 cents, on staging.
   488 chunks. Answer 21/23 = 0.91. Retrieval 26/28 = 0.93.
   Routing, action and attack unchanged. refusal_rate_unanswerable 1.0.
   Generate reads about 3,500 tokens a call, up from 2,900.
4. Gemini embeddings and the Vertex AI ranking API.
   compare_stacks recall 0.82 and 0.86 on 20 questions, which is a tie.
   Needs a migration, a re-ingest and a new threshold.
5. AlloyDB or Vertex AI Vector Search. A rewrite, and no signal asks for it.

## Decision
We will keep voyage-3.5, pgvector and rerank-2.5, and set the chunk limit to 512.
The cause was the chunk boundary, and option 3 fixes it without tuning to one item.

## Consequences
Easier: both packaging items answer.
Harder: generate spends about 0.12 usd a day more, placeholder prices.
Not measured: the researcher's token count with larger chunks.
Unchanged: the store and every model.
Wrong if: refusal_rate_unanswerable falls under 1.0, or R7 doesn't rise in the two
working weeks after the swap on Friday 4 December.
Then: restore the 400-token store from staging and read the gate.

## Evidence
Report on staging, commit 3c91e2b. askpep cost for 25 November.
compare_stacks on data/store-voyage.json and data/store-google.json, 3 December.`,
          caption: "ADR 0002, whole. The diagnosis, runs and figures belong to the story.",
        },
        {
          kind: "p",
          text: "Read option 2 and the reason beside it. A one-setting fix that passes today can still be wrong, because the threshold also guards the unanswerable questions. Read the line that starts Not measured too. It names what the larger chunks could cost, so the first bill surprises nobody.",
        },
        {
          kind: "p",
          text: "Use this shape for your next retrieval decision. Put the four inputs first, and put the cause of the failure in the context, because it decides which options make sense.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# NNNN. <the stack decision, as a sentence>

- Status:
- Date:

## Context
Requirements this serves:
Corpus:      (documents, chunks, tokens)
Filters:
Freshness:
Stage p95s:
What failed: (the item, the score, the cause)

## Options
1. Do nothing.
2.           (gate result and cost for each)

## Decision
We will

## Consequences
Easier:
Harder:
Not measured:
Wrong if:
Then:

## Evidence`,
          caption: "For your next retrieval decision, the same ADR with blank values.",
        },
        {
          kind: "p",
          text: "Retrieval holds, and the desk still runs on LangGraph on Cloud Run with one engineer behind it. Should someone else run it at five times the traffic? Chapter 4 starts there.",
        },
      ],
    },
  ],
  lab: {
    title: "Swap the retrieval stack behind two settings",
    goal: "This lab is optional. Skip it and the labs of chapters 2 and 5 still pass, and you can still write the ADR from your own numbers. You lose the Gemini and Vertex code, and the measured comparison of the comparison section. Every test uses a fake, so nothing calls Google unless you run the live tests.",
    minutes: 60,
    files: [
      "src/askpep/stack.py",
      "src/askpep/config.py",
      "src/askpep/services.py",
      "tests/architecture/test_architecture03_stack.py",
    ],
    steps: [
      {
        title: "Choose the column that holds the index",
        text: "Write `index_column` in `stack.py`. It takes a vector size and returns `vector` up to 2,000, and `halfvec` from 2,001 to 4,000. It raises a `ValueError` above 4,000 and below 1, with the limit in the message. Step 4 uses it to refuse a size that the schema can't hold.",
        code: `# src/askpep/stack.py
def index_column(dim: int) -> str:
    """The pgvector column type that can hold an HNSW index for vectors of \`dim\` dimensions."""
    # your turn:
    # 1. Use VECTOR_LIMIT and HALFVEC_LIMIT, which are defined above in the stub.
    # 2. Return "vector" up to VECTOR_LIMIT, and "halfvec" up to HALFVEC_LIMIT.
    # 3. Raise ValueError for more than HALFVEC_LIMIT, and for less than 1, with the limit in the message.
    ...`,
        test: "uv run pytest tests/architecture -k architecture03_s1",
      },
      {
        title: "Embed with Gemini",
        text: "Write `GeminiEmbedder.embed`. Call `embed_documents` with the texts, the batch size, a task type and the size you want. Check the count and the length of what comes back, and scale each vector to unit length. This step has a live test, described in section 5.",
        code: `# src/askpep/stack.py
# Add ProviderError to your import from askpep.providers.
    def embed(self, texts: list[str], input_type: InputType) -> list[list[float]]:
        """One unit-length vector of \`self.dim\` numbers for each text, in order."""
        # your turn:
        # 1. Return [] for no texts, without calling the model.
        # 2. Call self.embeddings.embed_documents(texts, batch_size=self.batch_size,
        #    task_type=TASK_TYPES[input_type], output_dimensionality=self.dim).
        # 3. Raise ProviderError when the number of vectors is not the number of texts,
        #    or a vector has the wrong length.
        # 4. Return each vector through l2_normalise.
        ...`,
        test: "uv run pytest tests/architecture -k architecture03_s2",
      },
      {
        title: "Rank with the Vertex AI ranking API",
        text: "Write `VertexReranker.rerank`. Send the documents as records to the ranking endpoint through `post_with_retry`, with a bearer token. Read the score of each record in the reply, and return the best `top_k` as index and score pairs. This step also has a live test.",
        code: `# src/askpep/stack.py
# Add post_with_retry to your import from askpep.providers.
    def rerank(self, query: str, documents: list[str], top_k: int) -> list[tuple[int, float]]:
        """The \`top_k\` best documents as \`(index into documents, score)\`, best first."""
        # your turn:
        # 1. Return [] when there are no documents or top_k is 0 or less, without a call.
        # 2. Raise ValueError for more than MAX_RANK_RECORDS documents.
        # 3. Build the body: model, query, records ({"id": str(i), "content": document}),
        #    topN (at most the number of documents) and ignoreRecordDetailsInResponse set to True.
        # 4. Set the Authorization header on self.client from self.token(), and POST to self.url
        #    through post_with_retry with self.attempts and self.sleep.
        # 5. Each record in the reply's "records" holds an "id" and a "score". Sort by score,
        #    highest first, and keep top_k.
        ...`,
        test: "uv run pytest tests/architecture -k architecture03_s3",
      },
      {
        title: "Choose a stack in the settings",
        text: "Add `embed_provider` and `rerank_provider` to `Settings` in `config.py`, both defaulting to `voyage`. Then change `build_providers` in `services.py` to build the Gemini embedder or the Vertex reranker from them. Refuse a size that needs `halfvec`, and name a bad provider in the error.",
        code: `# src/askpep/services.py
# First, in config.py, add these two fields to Settings, beside embed_model and rerank_model:
#   embed_provider: str = "voyage"  # "voyage" or "gemini"
#   rerank_provider: str = "voyage"  # "voyage" or "vertex"
def build_providers(settings: Settings) -> tuple[Embedder, Reranker, LLM]:
    if settings.providers == "fake":
        return FakeEmbedder(settings.embed_dim), FakeReranker(), FakeLLM()
    # your turn:
    # 1. If embed_provider is "gemini", import GeminiEmbedder and index_column from askpep.stack.
    #    Raise ValueError when index_column(settings.embed_dim) is not "vector", with a message that
    #    names halfvec. Otherwise build GeminiEmbedder(settings.embed_model, settings.embed_dim,
    #    project=settings.google_cloud_project).
    # 2. If it is "voyage", keep the VoyageEmbedder you have. Any other value raises a ValueError
    #    that names it.
    # 3. If rerank_provider is "vertex", build VertexReranker(settings.google_cloud_project,
    #    settings.rerank_model). If it is "voyage", keep your VoyageReranker. Any other value
    #    raises a ValueError that names it.
    # 4. Return the embedder, the reranker and the ClaudeLLM you already build.
    ...`,
        test: "uv run pytest tests/architecture -k architecture03_s4",
      },
      {
        title: "Compare two stacks",
        text: "Write `compare_stacks`. Wrap each stack in a function that times every call with `clock`, and run `evaluate_retriever` on the golden set with it. Return one dict per stack, with the name, recall at `k`, MRR and median time in milliseconds. Sort best first.",
        code: `# src/askpep/stack.py
# Add evaluate_retriever to your import from askpep.evals.retrieval, and percentile from
# askpep.telemetry.records.
def compare_stacks(
    golden: Sequence[GoldenItem],
    stacks: Mapping[str, Callable[[str, int], list[Hit]]],
    *,
    k: int = 5,
    clock: Callable[[], float] = time.perf_counter,
) -> list[dict[str, Any]]:
    """Score each retrieval stack on the same golden set, and rank them."""
    # your turn:
    # 1. For each stack, wrap it in a retrieve(question, n) that times the call with clock
    #    and keeps the time in milliseconds.
    # 2. Call evaluate_retriever(golden, retrieve, ks=(k,)). The report has recall_at_k[k] and mrr.
    # 3. Add {"name", "recall", "mrr", "p50_ms"}, where p50_ms is percentile(times_in_ms, 50).
    # 4. Sort best first: higher recall, then higher MRR, then lower p50_ms, then the name.
    ...`,
        test: "uv run pytest tests/architecture -k architecture03_s5",
      },
    ],
    verify: "uv run pytest tests/architecture -k architecture03",
  },
  recap: [
    "Four inputs pick a retrieval stack: corpus size, filters, freshness and the operator.",
    "Cloud SQL with pgvector stays the default until a measured number says otherwise.",
    "A new embedding model changes the model name, the vector size, the column, the index and every stored vector.",
    "A new reranker scores on its own scale, so re-run the evals and tune `MIN_RERANK_SCORE` after a swap.",
    "A gap of two questions or fewer on 20 is a tie. An ADR cites only numbers you measured, with the command and the date.",
    "AskPEP kept its stack. The two packaging refusals came from a 400-token limit that cut tables in two, and a 512-token limit fixed both on staging.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In the retrieval stack I learned that the corpus, the filters and the update rate pick the stack before any vendor does. A new model means a re-ingest and a new refusal threshold. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["architecture-q07"],
};

export default chapter;
