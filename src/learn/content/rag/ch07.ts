import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "rag-07-query-and-rerank",
  course: "rag",
  number: 7,
  title: "Query transformation and reranking",
  tagline: "How do you fix a badly phrased question before search, and a rough ranking after it?",
  minutes: 40,
  objectives: [
    "Name the four ways a raw question defeats search.",
    "Pick the query transformation that fixes each failure, and say what it costs.",
    "Explain why a cross-encoder judges relevance better than embedding search, and why it cannot search a corpus.",
    "Design a retrieve-many, rerank-few pipeline, and say what the reranker cannot repair.",
    "Choose which stage to add first, and prove that each one earns its latency on a golden set.",
    "Say why AskPEP reranks with Voyage, and when another reranker or a framework helper fits better.",
    "Build AskPEP's reranker and its retrieve-then-rerank step, and make them pass their tests.",
  ],
  sections: [
    {
      id: "s1-question-first",
      title: "Many retrieval failures start with the question, and each failure has a name",
      goal: "What goes wrong when a raw question goes straight to search?",
      blocks: [
        {
          kind: "p",
          text: "Every section of this chapter answers part of one question. How do you fix a badly phrased question before search, and a rough ranking after it? Chapter six ended on these two weak spots.",
        },
        {
          kind: "p",
          text: "Two words must stay apart in this chapter. The question is what the user typed. A **query** is the text you send to search. With no rewrite, the query is the question.",
        },
        {
          kind: "p",
          text: "**Query transformation** uses a model to rewrite or expand the question into one or more queries. It runs before search, and it can fix problems that no index tuning reaches.",
        },
        {
          kind: "p",
          text: "Users type fragments, pronouns and slang, while the index was built from careful prose. A raw question defeats search in four ways.",
        },
        {
          kind: "list",
          items: [
            "Vocabulary mismatch is when the question and the chunk use different words for the same thing. The user says switch statement, and the PEPs say structural pattern matching.",
            "Missing context is when the question leans on earlier turns of a chat, as in what about its scope rules.",
            "A compound question asks about several things at once, such as three PEPs in one sentence. One query vector cannot sit near three chunks.",
            "A wrong destination is when the answer is not in this index at all. Search still returns its closest chunks, which look relevant.",
          ],
        },
        {
          kind: "p",
          text: "The dense leg softens vocabulary mismatch, as chapter six showed. The other three failures defeat both legs. So name the failure first, then pick the fix.",
        },
        {
          kind: "quiz",
          id: "rag-07-q1",
          question: "A user asks \"and what about its scope rules?\" after a question on PEP 572. Search returns random chunks about scope. What is the failure?",
          options: [
            "Vocabulary mismatch, so add synonyms.",
            "Missing context, so rewrite the question using the chat history first.",
            "Compound question, so decompose it.",
            "Wrong destination, so route it elsewhere.",
          ],
          answer: 1,
          explain: "The pronoun points at earlier turns, which search never sees. A rewrite that folds the chat history into one standalone query fixes it.",
        },
        {
          kind: "p",
          text: "Each failure has a transformation that fixes it. The next section matches them up, with what each one costs.",
        },
      ],
    },
    {
      id: "s2-techniques",
      title: "Each query transformation fixes one failure and costs at least one model call",
      goal: "Which transformation fixes which failure, and what does each one cost?",
      blocks: [
        {
          kind: "p",
          text: "**Rewriting** turns a messy question into one clean, standalone query. It resolves pronouns from the chat history and swaps slang for the words the PEPs use. It is the cheapest transformation, and usually the first worth trying.",
        },
        {
          kind: "p",
          text: "**Multi-query** asks a model for several phrasings of the question. You search with each one, then merge the lists with reciprocal rank fusion from chapter six. It helps when you cannot guess which words the PEPs use.",
        },
        {
          kind: "p",
          text: "**HyDE**, short for hypothetical document embeddings, asks a model to write a plausible answer. You embed that hypothetical answer instead of the question. It reads like a chunk, so its vector lands nearer the real chunks. Gao and colleagues proposed it in 2022.",
        },
        {
          kind: "p",
          text: "**Decomposition** splits a compound question into sub-questions, searches for each, and lets the answer step combine the results. It suits parts that do not depend on each other.",
        },
        {
          kind: "p",
          text: "It cannot plan a **multi-hop question**, where the second search depends on the first answer. Chapter fifteen covers that loop.",
        },
        {
          kind: "p",
          text: "**Routing** decides where to search, or whether to search at all. A router might pick between a PEP index and a team wiki, or skip search for small talk.",
        },
        {
          kind: "compare",
          caption: "Five transformations, what each fixes, what it costs and how it breaks.",
          columns: ["Transformation", "Fixes", "Extra cost", "Breaks when"],
          rows: [
            ["Rewriting", "Missing context, vocabulary mismatch", "One short model call", "The rewriter drops a rare name the user typed"],
            ["Multi-query", "Vocabulary mismatch in broad questions", "One call, plus a search per phrasing", "The phrasings are near-duplicates"],
            ["HyDE", "Vocabulary mismatch in short questions", "One longer generation call", "The model invents a misleading answer"],
            ["Decomposition", "Compound questions with independent parts", "One call, plus a search per part", "The question was simple, so splitting adds noise"],
            ["Routing", "A wrong destination, or no search needed", "One small classification call", "The router picks wrongly, and nothing later recovers"],
          ],
        },
        {
          kind: "widget",
          id: "c07-query-playground",
          intro: "Five questions wait, each with a different failure. Pick the transformation you would try first for each one, then read what it sends to search. Watch for the question where every transformation returns something plausible and only one is right.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Do not stack all five",
          text: "It is tempting to chain rewriting, multi-query, HyDE and decomposition on every request. Each adds a model call before search even starts, and the user waits for all of them. Add a transformation only when you can point at a failing question it fixes.",
        },
        {
          kind: "quiz",
          id: "rag-07-q2",
          question: "In HyDE, what do you embed and search with?",
          options: [
            "The original question only.",
            "A hypothetical answer written by a model.",
            "The top chunk from search, rewritten.",
            "A keyword list extracted from the question.",
          ],
          answer: 1,
          explain: "You embed the hypothetical answer. It reads like a chunk, so its vector sits nearer the chunks that answer the question than a short question does. It can be wrong in fact and still work, because search uses only where its vector lands.",
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "Keep the original question in the mix",
          text: "A rewriter sometimes drops the one word that mattered, such as a PEP number or an error code. A safe pattern is to always search with the original question as well, and fuse its list with the others. You pay for one extra search and remove a whole class of silent regressions.",
        },
        {
          kind: "fold",
          tone: "industry",
          title: "Step-back and other cousins",
          text: "Step-back prompting asks the model first for a more general question, then searches with both. It suits narrow questions whose answer needs background. Query expansion with keywords is the older cousin of multi-query, and it needs no model. All of these change what you search with. None changes what you search in.",
        },
        {
          kind: "p",
          text: "Interviewers often ask which transformation you would reach for, given a symptom.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Query transformation in interviews",
          text: "Name the failure first, such as vocabulary mismatch or a compound question. Then give the transformation, its extra latency and how you would measure it. An answer that lists every transformation with no trade-off sounds like a blog summary.",
        },
        {
          kind: "p",
          text: "Every transformation changes what you search with, and none fixes the order of what comes back. The next section explains the model that does.",
        },
      ],
    },
    {
      id: "s3-bi-vs-cross",
      title: "A cross-encoder reads the query and chunk together, so it judges better but cannot search",
      goal: "Why does a reranker judge relevance better than embedding search, and why can it not replace search?",
      blocks: [
        {
          kind: "p",
          text: "The reranker is the slower, sharper model from chapter two, which reorders the candidates and keeps the best few. Comparing it with embedding search shows why it is sharper.",
        },
        {
          kind: "p",
          text: "A **bi-encoder** is how chapter four's embedding search scores. It encodes the query and each chunk separately into vectors, then compares the vectors. The chunks never see the query, so you encode them once, ahead of time, and store them.",
        },
        {
          kind: "p",
          text: "A **cross-encoder** feeds the query and one chunk into the model together. It outputs one relevance score for the pair. Inside the model, **attention**, the step where each word weighs every other word, now runs across both texts. That joint reading is why it judges relevance better.",
        },
        {
          kind: "p",
          text: "The price is that nothing can be computed ahead of time. A score exists only for one query and one chunk. Searching one million chunks with a cross-encoder means one million model passes per question.",
        },
        {
          kind: "p",
          text: "For a typical rerank, search returns 50 candidates and the cross-encoder runs 50 passes. The cost follows the candidate count, and corpus size stops mattering.",
        },
        {
          kind: "compare",
          caption: "Bi-encoder against cross-encoder.",
          columns: ["", "Bi-encoder", "Cross-encoder"],
          rows: [
            ["Input", "Each text alone", "The query and one chunk together"],
            ["Chunks computed ahead of time?", "Yes, once", "No, every score needs the query"],
            ["Work per search", "One query embedding plus an index lookup", "One model pass per candidate"],
            ["Grows with", "Corpus size, slowly, thanks to ANN", "The number of candidates you send it"],
            ["Quality", "Good but coarse", "Better, from reading both texts together"],
            ["Role in RAG", "Find candidates fast", "Reorder a short list"],
          ],
        },
        {
          kind: "callout",
          tone: "analogy",
          title: "Screening versus interviewing",
          text: "A bi-encoder is a CV screen. It scores every CV against the job description separately, in bulk. A cross-encoder is an interview, with one applicant and the role in the same room. You screen thousands and interview ten. Search likewise scores each chunk alone, and the cross-encoder reads a short list beside the query.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Late interaction sits between the two",
          text: "ColBERT-style models keep one vector per token, instead of one per chunk. They score a pair by matching each query token to its closest chunk token. Chunk vectors can be computed ahead of time, so this is cheaper than a cross-encoder. The index is much larger, with many vectors per chunk. It is a real option. AskPEP keeps one vector per chunk plus a cross-encoder.",
        },
        {
          kind: "quiz",
          id: "rag-07-q3",
          question: "Why can you not use a cross-encoder to search 1 million chunks directly?",
          options: [
            "It cannot read text longer than a sentence.",
            "Its scores depend on the query, so you would run it once per chunk for every question.",
            "It produces vectors that are too large to store.",
            "It only works in English.",
          ],
          answer: 1,
          explain: "A cross-encoder scores one query and chunk pair. Nothing can be stored ahead of time, so the cost of each question grows with the corpus.",
        },
        {
          kind: "p",
          text: "The cross-encoder is too slow for a corpus and fast enough for a short list. The next section builds on that.",
        },
      ],
    },
    {
      id: "s4-retrieve-many-rerank-few",
      title: "Retrieve many, rerank few: stage one buys recall, stage two buys precision",
      goal: "How do the two models work together, and what can the reranker never fix?",
      blocks: [
        {
          kind: "p",
          text: "The pattern has two stages. **Stage one** is cheap and wide. It takes the top 50 to 100 candidates from hybrid search. **Stage two** is expensive and narrow. The cross-encoder reorders those candidates, and you keep the top 5 to 10 for the prompt.",
        },
        {
          kind: "p",
          text: "Tune those sizes against your own recall at k. AskPEP's build in chapter twelve reranks 30 fused candidates and keeps 6.",
        },
        {
          kind: "p",
          text: "The two stages have different jobs. Stage one only has to get the right chunk somewhere in the list, which is recall. Stage two moves it to the top, which is precision. Ask one stage to do both, and you either lose recall or pay for expensive scoring on everything.",
        },
        {
          kind: "widget",
          id: "c07-rerank-before-after",
          intro: "A bi-encoder has ranked eight candidates for the query, why was the walrus operator controversial. Pick the three you think the cross-encoder will rank highest, then rerank. Watch which chunk jumps furthest, and why the bi-encoder's first choice falls.",
        },
        {
          kind: "p",
          text: "The reranker has five limits.",
        },
        {
          kind: "list",
          items: [
            "A reranker only reorders. If the right chunk is not among the candidates, no reranker can bring it back.",
            "Every reranker caps its input length, and a long chunk may be cut off without warning.",
            "A rerank score means little outside its own query, so set any cut-off from your golden set.",
            "Each rerank adds latency and a cost to every request. Measure both before you promise anything.",
            "A reranker trained on general web text may misjudge a niche domain. Test it on your golden set.",
          ],
        },
        {
          kind: "quiz",
          id: "rag-07-q4",
          question: "The right chunk sits at rank 120 in stage one. You send the top 50 to the reranker. What happens?",
          options: [
            "The reranker finds it and puts it first.",
            "It is never scored, so it cannot appear in the final list.",
            "The reranker fetches more candidates automatically.",
            "It appears, but with a low score.",
          ],
          answer: 1,
          explain: "A reranker only sees the candidates you send it. Rank 120 is outside the 50, so it is never scored. Send more candidates, or fix stage one.",
        },
        {
          kind: "fold",
          tone: "plain",
          title: "Using an LLM as the reranker",
          text: "You can ask a general model to score or order the candidates, one at a time or as a whole list. It needs no special reranking model, and it follows custom criteria well, such as prefer the newest PEP. It is slower and costs more per candidate than a cross-encoder, and its output needs parsing. Reach for it when you need custom criteria.",
        },
        {
          kind: "p",
          text: "In a hybrid system the reranker runs after fusion, on the merged list. The code below shows the whole order.",
        },
        {
          kind: "fold",
          tone: "dyk",
          title: "Rerank after fusion, before packing",
          text: "In a hybrid system the reranker belongs after reciprocal rank fusion. Fusion merges the dense and sparse lists on rank alone. The reranker then reads the actual text of the merged candidates. Put it before fusion and you waste it, because fusion would reorder its work.",
        },
        {
          kind: "code",
          lang: "python",
          code: "# The whole pattern in a few lines\ncandidates = hybrid_search(query, 50)  # recall\ntop = rerank_hits(reranker, query, candidates, top_n=5)  # precision\ncontext = build_context(top, budget_tokens=3000)",
          caption: "Hybrid search feeds the reranker, which feeds chapter eight's context builder. The last section shows how AskPEP builds `rerank_hits`.",
        },
        {
          kind: "p",
          text: "Interviewers often ask why you would not use the cross-encoder for everything.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Reranking in interviews",
          text: "Answer with the cost arithmetic, then the two-stage design, then what a reranker cannot fix. Add that you would measure recall at 50 to prove stage one is wide enough. Then compare recall at 5 with and without the reranker.",
        },
        {
          kind: "p",
          text: "A reranker costs time on every question, and so does every transformation. The next section decides which to add first, and how to prove each one pays.",
        },
      ],
    },
    {
      id: "s5-measure",
      title: "Transformations and rerankers can make answers worse, so add each one alone and measure it",
      goal: "Which stage should you add first, and how do you prove it earns its latency?",
      blocks: [
        {
          kind: "p",
          text: "A transformation and a reranker both run while the user waits. A sloppy one of either kind can make answers worse.",
        },
        {
          kind: "p",
          text: "A sensible order is this. Add a reranker first, because it needs no prompt and cannot change what the user asked. Add rewriting next if users ask follow-up questions in a chat. Add routing when you have more than one source. Keep multi-query, HyDE and decomposition for failures you can name.",
        },
        {
          kind: "p",
          text: "Prove each stage with an **ablation**, which changes one stage at a time. Run your golden set with the stage off, then on, and compare recall at k and **mean reciprocal rank**, or MRR.",
        },
        {
          kind: "p",
          text: "MRR takes the rank of the first relevant chunk for each question, inverts it and averages. A first hit at rank two scores one half. If neither number moves, remove the stage. Chapter nine builds this harness.",
        },
        {
          kind: "quiz",
          id: "rag-07-q5",
          question: "Which evidence would justify keeping a HyDE step in production?",
          options: [
            "It is described in a well-known paper.",
            "Recall at k on your golden set rises enough to pay for the added latency.",
            "It makes the prompt look more sophisticated.",
            "Another team in the company uses it.",
          ],
          answer: 1,
          explain: "A stage earns its place by moving your own metrics on your own corpus. A paper tells you where to look. Your metrics tell you what to keep.",
        },
        {
          kind: "p",
          text: "The next section names the products that do this work.",
        },
      ],
    },
    {
      id: "s-alternatives",
      title: "Voyage rerank is AskPEP's reranker, and frameworks only wrap the same query transformations",
      goal: "Which rerankers and query helpers could you use, and what does each cost you?",
      blocks: [
        {
          kind: "p",
          text: "AskPEP reranks with Voyage rerank, from the same vendor as its embeddings. You send the query and the candidate chunks, and it returns a relevance score for each. That is this chapter's cross-encoder pattern, sold as a hosted API.",
        },
        {
          kind: "p",
          text: "Cohere Rerank is another hosted reranker with the same request and reply. Open cross-encoders, such as the bge-reranker models, run through sentence-transformers on your own hardware. You trade a vendor bill for latency and serving work.",
        },
        {
          kind: "p",
          text: "Frameworks wrap the query transformations from section two. LlamaIndex has query transform helpers, including one for HyDE. LangChain has a multi-query retriever that writes several phrasings and merges the results. Names and packages shift between releases, so check the current documentation.",
        },
        {
          kind: "p",
          text: "These wrappers save little code. The value is in the prompts and the evaluation, which stay yours. AskPEP's build in chapters twelve to fourteen sends the question to search as typed, with no transformation. Chapter eleven teaches how to choose a whole stack.",
        },
        {
          kind: "compare",
          caption: "Five options across reranking and query helpers.",
          columns: ["Tool", "Best at", "Switch to it when", "What it costs you"],
          rows: [
            ["Voyage rerank", "Hosted reranking with a short integration.", "You already embed with Voyage.", "A cost on every request, and added latency."],
            ["Cohere Rerank", "Hosted reranking with multilingual support.", "You already use Cohere.", "Another vendor and another network hop."],
            ["Open cross-encoders such as bge-reranker", "Self-hosted reranking with no fee per call.", "Data must stay in your network.", "Serving it yourself, and slow scoring on CPU."],
            ["LlamaIndex query transforms", "Ready-made HyDE and decomposition steps.", "Your pipeline already runs on LlamaIndex.", "Framework coupling and version drift."],
            ["LangChain multi-query retriever", "Quick multi-query search with merging.", "You prototype in LangChain.", "Hidden prompts you must still read and test."],
          ],
        },
        {
          kind: "quiz",
          id: "rag-07-alt-q1",
          question: "Why does a hosted reranker score more precisely than your embedding search?",
          options: [
            "It reads the query and the chunk together, instead of comparing two separate vectors.",
            "It searches the whole corpus.",
            "It uses a larger vector index.",
            "It skips tokenisation.",
          ],
          answer: 0,
          explain: "A cross-encoder reads the query and the chunk together, so it can weigh how they relate. That costs too much to run over the whole corpus, so it reorders a short list.",
        },
        {
          kind: "fold",
          tone: "industry",
          title: "Rerank with the same text you generate from",
          text: "Score the exact chunk text the model will see, including any heading you add in front. A reranker that scores a different string from the one you send to generation can promote the wrong chunk.",
        },
        {
          kind: "p",
          text: "AskPEP's labs still have no reranker. The last section builds one, with the function that wraps the whole pattern.",
        },
      ],
    },
    {
      id: "s7-askpep-rerank",
      title: "AskPEP gains a Voyage reranker, and one function wraps retrieve many, rerank few",
      goal: "How does AskPEP's reranker work, and how do you build it?",
      blocks: [
        {
          kind: "p",
          text: "Chapter six left AskPEP's local store with dense and sparse search, fused by `rrf`. This chapter adds stage two. Four rules shape the new code.",
        },
        {
          kind: "list",
          items: [
            "`VoyageReranker` lives in `providers.py`, beside chapter four's `VoyageEmbedder`. Its model name comes from `RERANK_MODEL` in `.env`, because vendors rename models.",
            "Its `rerank` method sends the query and the chunk texts to Voyage. It returns pairs of a list position and a score, best first.",
            "`rerank_hits`, in `retrieval.py`, turns those pairs back into hits. Each hit keeps its chunk, takes the new score and sets its `via` field to rerank.",
            "`retrieve_then_rerank` takes any search function, so dense, sparse and hybrid search all work. It asks for 50 candidates and keeps 5.",
          ],
        },
        {
          kind: "p",
          text: "You build all four in the chapter's lab, in the AskPEP repo from chapter two. Finish chapter six's lab first, because one test runs your hybrid search. Only the last step calls Voyage, and it is optional.",
        },
        {
          kind: "p",
          text: "AskPEP's retrieval now ends with a short, well-ranked list of chunks. The model has not read them yet. Chapter eight decides how that list goes into the prompt, and how the answer cites it.",
        },
      ],
    },
  ],
  lab: {
    title: "Add a reranker to the pipeline",
    goal: "Fill in four stubs in your AskPEP repo from chapter two. `VoyageReranker` in `src/askpep/providers.py` calls Voyage, and `src/askpep/retrieval.py` holds `rerank_hits` and `retrieve_then_rerank`. Chapter two's setup already copied both files in, with their tests. Each stub raises `NotImplementedError(\"rag-07 step N\")` until you replace it. Finish chapter six's lab first, because step 4 runs your hybrid search. In each test command, `-k` runs only the tests whose names contain that text. Step 5 is optional and calls Voyage, so it needs `VOYAGE_API_KEY` in `.env`.",
    minutes: 40,
    files: ["src/askpep/providers.py", "src/askpep/retrieval.py", "tests/rag/test_providers.py", "tests/rag/test_retrieval.py"],
    steps: [
      // CHECK: rerank-2.5 is the Voyage default in .env.example, and Voyage's docs now list rerank-3 as current (FACTS.md, 20 October 2026)
      {
        title: "Define the options and the empty case",
        text: "Replace `NotImplementedError(\"rag-07 step 1\")` in `VoyageReranker.__init__`. It takes a key, a model name and an optional `httpx.Client`, as `VoyageEmbedder` does from chapter four. The model name comes from `RERANK_MODEL` in `.env`, because vendors rename models. `.env.example` sets it to `rerank-2.5`. A missing key or model raises a `ValueError` that names its setting, `VOYAGE_API_KEY` or `RERANK_MODEL`. Then add the empty guard to the top of `rerank`.",
        code: `# src/askpep/providers.py
class VoyageReranker:
    def __init__(self, api_key: str, model: str, *, client: httpx.Client | None = None):
        # your turn:
        # 1. raise ValueError when api_key or model is empty
        # 2. keep client, or build the default one as VoyageEmbedder does
        # 3. whichever client you hold must send the key as a Bearer token
        ...

    def rerank(self, query: str, documents: list[str], top_k: int) -> list[tuple[int, float]]:
        # your turn: return [] for an empty documents list, before any request
        ...`,
        test: "uv run pytest tests/rag/test_providers.py -k ch07_s1",
      },
      {
        title: "Send the request",
        text: "Replace `NotImplementedError(\"rag-07 step 2\")` in `rerank`. It posts the query, the chunk texts in input order, the model and `top_k` to `VOYAGE_RERANK_URL`, using `post_with_retry` from chapter four. The key goes in a Bearer header, even on a client the test passes in. The tests use `httpx.MockTransport`, a fake network that records your request. They check the body, the key and a failed status.",
        code: `# src/askpep/providers.py
class VoyageReranker:
    def rerank(self, query: str, documents: list[str], top_k: int) -> list[tuple[int, float]]:
        # your turn:
        # 1. keep the empty-list check from step 1
        # 2. POST query, documents, model and top_k to VOYAGE_RERANK_URL with post_with_retry on self.client
        # 3. each reply item has an index and a relevance_score
        # 4. return the (index, score) pairs best first, at most top_k of them
        ...`,
        test: "uv run pytest tests/rag/test_providers.py -k ch07_s2",
      },
      {
        title: "Map scores back to hits",
        text: "In `src/askpep/retrieval.py`, replace `NotImplementedError(\"rag-07 step 3\")` in `rerank_hits(reranker, query, hits, top_n)`. Return `[]` for no hits or a `top_n` of 0 or less, without calling the reranker. Otherwise send it the chunk texts and build a new `Hit` for each returned index. Each keeps its chunk, takes the new score and sets `via` to `\"rerank\"`. Keep `top_n`, best first.",
        test: "uv run pytest tests/rag/test_retrieval.py -k ch07_s3",
      },
      {
        title: "Retrieve many, rerank few",
        text: "Replace `NotImplementedError(\"rag-07 step 4\")` in `retrieve_then_rerank(query, retrieve, reranker, *, fetch_k=50, final_k=5)`. The `retrieve` argument is any function that takes a query and a count and returns hits. Ask it for `fetch_k` candidates, then return `final_k` hits from `rerank_hits`. Because `retrieve` is passed in, dense, sparse and hybrid search all work. One test builds a hybrid search from your local store and `rrf`.",
        test: "uv run pytest tests/rag/test_retrieval.py -k ch07_s4",
      },
      {
        title: "Compare against your reference",
        text: "This live test ranks the fixture corpus by dense search, then reranks the top six with your `VoyageReranker`. It prints the top three chunk ids before and after, for two queries. It needs `VOYAGE_API_KEY` in your `.env`. A plain run skips live tests, and `-m live` selects them. The `-s` flag shows the rankings. Write down why the order changes.",
        test: "uv run pytest tests/rag/test_retrieval.py -m live -k ch07_s5 -s",
      },
    ],
    verify: "uv run pytest tests/rag/test_providers.py tests/rag/test_retrieval.py -k ch07",
  },
  recap: [
    "Name the failure first: vocabulary mismatch, missing context, a compound question or a wrong destination. Then pick the transformation.",
    "Every transformation adds a model call before search, so add one only for a failure you can point at.",
    "Decomposition splits a question into independent parts. A multi-hop question, where the second search depends on the first answer, needs chapter fifteen's loop.",
    "A bi-encoder computes chunk vectors ahead of time. A cross-encoder scores each query and chunk pair together, so it cannot search a corpus.",
    "Retrieve many for recall, rerank few for precision. A reranker only reorders the candidates it is given.",
    "Prove each stage with an ablation on your golden set, and remove any stage that does not move the numbers.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In query transformation and reranking I learned that every stage before and after search must earn its latency. It does so by fixing a named failure and moving a measured metric. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["rag-q16", "rag-q17", "rag-q43"],
};

export default chapter;
