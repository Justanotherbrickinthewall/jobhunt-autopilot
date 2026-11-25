import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "rag-06-hybrid-retrieval",
  course: "rag",
  number: 6,
  title: "Hybrid retrieval",
  tagline: "How do you catch the exact names that embedding search misses, and merge two ranked lists into one?",
  minutes: 40,
  objectives: [
    "Name the questions where embedding search misses and keyword search wins, and the reverse.",
    "Compute a BM25 score by hand, and say what its two settings, k1 and b, change.",
    "Merge two ranked lists with reciprocal rank fusion, and explain why it ignores their scores.",
    "Set candidate depth and fusion weights by measuring them on a golden set.",
    "Say why AskPEP's build uses Postgres full-text search, and name what would justify a real BM25 engine.",
    "Build BM25 and fusion into AskPEP's local store, and make them pass their tests.",
  ],
  sections: [
    {
      id: "s1-where-dense-fails",
      title: "Embedding search blurs exact strings, so names and codes need a second search",
      goal: "Which questions does embedding search miss, and what kind of search catches them?",
      blocks: [
        {
          kind: "p",
          text: "Every section of this chapter answers part of one question. How do you catch the exact names that embedding search misses, and merge two ranked lists into one? Chapter five ended with a warning. Search by meaning can miss a question that names an exact string, such as PEP 572.",
        },
        {
          kind: "p",
          text: "**Dense retrieval** is the embedding search from chapters four and five. It compares meaning, which is its strength and its weakness. An embedding squeezes a chunk into one vector. A rare string such as PEP 572 or a function name gives that vector only a small push. So two PEPs on similar topics land close together, whatever their numbers.",
        },
        {
          kind: "p",
          text: "**Sparse retrieval** is the older family, often called keyword search. It scores a chunk by which of the question's words it contains, and how rare those words are. It cannot understand a paraphrase. It never confuses PEP 572 with PEP 573.",
        },
        {
          kind: "fold",
          tone: "dyk",
          title: "Where the names dense and sparse come from",
          text: "The names come from the vectors. An embedding is dense, because almost none of its numbers are zero. A keyword vector has one slot for each word in the vocabulary. Almost every slot is zero, so it is sparse.",
        },
        {
          kind: "list",
          items: [
            "Dense wins on paraphrase and vague wording. A question about running Python threads in parallel should find PEP 703, though it shares few of its words.",
            "Sparse wins on identifiers, such as PEP numbers, error codes, function names, product codes and rare surnames.",
            "Both can fail. A short, generic question such as what changed matches everything weakly in both.",
          ],
        },
        {
          kind: "p",
          text: "Dense search's win has a name. **Vocabulary mismatch** is when the question and the chunk use different words for the same thing. **Hybrid retrieval** runs both searches and merges their two ranked lists. Each search is one **leg** of the hybrid.",
        },
        {
          kind: "widget",
          id: "c06-dense-vs-sparse",
          intro: "Two searches run the same four questions over fourteen short PEP chunks. The sparse side is live BM25, which the next section explains. The dense scores are hand-set toy values, labelled as such, to show the shape of the failure. Predict which side puts the right chunk first, then check.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Do not claim a dense model fails on names without testing yours",
          text: "How badly a dense model handles rare strings depends on the model and your data. Write twenty questions that name an identifier, run both searches, and count the hits. That count is your evidence for a sparse leg.",
        },
        {
          kind: "quiz",
          id: "rag-06-q1",
          question: "A user asks for the text of PEP 572 by number. Which retriever is most likely to rank it first reliably?",
          options: [
            "Dense, because numbers carry meaning.",
            "Sparse, because the exact token appears in the chunk.",
            "Neither can handle digits.",
            "Both always agree on this.",
          ],
          answer: 1,
          explain: "An exact token match is what sparse scoring rewards. A dense model may place PEP 572 near other PEPs on assignment expressions without ranking it first.",
        },
        {
          kind: "p",
          text: "Sparse search needs a scoring rule. The standard one is BM25, which the next section works through.",
        },
      ],
    },
    {
      id: "s2-bm25",
      title: "BM25 rewards rare words, caps repeated ones and punishes long chunks",
      goal: "How does BM25 score a chunk, and what do its two settings change?",
      blocks: [
        {
          kind: "p",
          text: "**BM25** is the standard sparse scoring function. It dates from the 1990s. It is still the default in Lucene, the search library under Elasticsearch and OpenSearch.",
        },
        {
          kind: "p",
          text: "BM25 works on **terms**, the words left after tokenising. **Tokenising** here means lowercasing the text and splitting it into words. These terms are whole words. Chapter one's model tokens are pieces of about four characters, which is a different thing.",
        },
        {
          kind: "p",
          text: "For each query term, BM25 adds up three ideas. These are how rare the term is, how often it appears in the chunk, and how long the chunk is.",
        },
        {
          kind: "p",
          text: "The first idea is **inverse document frequency**, or IDF. A term's document frequency is the number of chunks that contain it. BM25 came before chunking, so its names say document where AskPEP means chunk.",
        },
        {
          kind: "p",
          text: "A term in almost every chunk tells you nothing, so its IDF is low. A term in two chunks out of a thousand gets a high IDF.",
        },
        {
          kind: "p",
          text: "The second idea is **term frequency saturation**. Term frequency is how often the term appears in the chunk. The tenth mention should not count ten times as much as the first. The setting **k1** controls how fast the gain flattens. A common default is 1.2. At k1 of zero, a term counts the same however often it appears.",
        },
        {
          kind: "p",
          text: "The third idea is **length normalisation**. A long chunk contains more words by chance, so a match inside it is weaker evidence. The setting **b** sets how hard length is punished. At 0, length is ignored, and at 1 it counts in full. A common default is 0.75.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "BM25 for one chunk, in the form Lucene uses. Each distinct query term the chunk holds adds one part.",
          code: `idf(term)  = ln(1 + (N - n + 0.5) / (n + 0.5))
part(term) = idf(term) * tf * (k1 + 1) / (tf + k1 * (1 - b + b * length / avg_length))
score      = the sum of part(term) over the distinct query terms the chunk holds

N: chunks in the index         n: chunks that hold the term
tf: times the term appears     length: terms in this chunk, avg_length: the average`,
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Why the Lucene IDF has a one inside the log",
          text: "The classic Robertson form, ln((N - n + 0.5) / (n + 0.5)), goes negative when a term is in more than half the chunks. A negative weight would make a match count against a chunk. Lucene adds one inside the log so the weight stays positive. Libraries differ here, so confirm which form yours uses before comparing scores.",
        },
        {
          kind: "widget",
          id: "c06-bm25-tuner",
          intro: "Five chunks of different lengths compete for the query GIL. Move k1 and b, and predict the winner before you drag. The defaults favour one chunk, and b at zero favours another. Watching the ranking flip is the point of the exercise.",
        },
        {
          kind: "quiz",
          id: "rag-06-q2",
          question: "In BM25, what does setting b to 0 do?",
          options: [
            "It removes IDF weighting.",
            "It turns off length normalisation, so long chunks are not penalised.",
            "It makes every term count only once.",
            "It lowercases the query.",
          ],
          answer: 1,
          explain: "b scales the length penalty. At 0 the chunk length drops out of the formula entirely.",
        },
        {
          kind: "quiz",
          id: "rag-06-q3",
          question: "A chunk repeats the query word 30 times. Why does BM25 refuse to rank it 30 times higher than a chunk with one mention?",
          options: [
            "Because of IDF.",
            "Because of term frequency saturation, controlled by k1.",
            "Because of length normalisation only.",
            "It does rank it 30 times higher.",
          ],
          answer: 1,
          explain: "The tf term is tf times (k1 + 1) over tf + k1 (adjusted for length). It approaches k1 + 1 as tf grows, so extra mentions give diminishing returns.",
        },
        {
          kind: "p",
          text: "Tokenising choices matter as much as the formula. Splitting on anything that is not a letter or a digit turns `list.sort` into list and sort. That helps recall and loses the exact name. **Stemming**, cutting running down to run, helps English prose and hurts code. Whatever you choose, apply it the same way to chunks and questions.",
        },
        {
          kind: "p",
          text: "BM25 is also simple to run. It needs a tokeniser and term counts, with no model to train or re-embed. You can see which terms matched, while a dense score is only a distance. And it is cheap. An **inverted index** maps each term to the chunks that contain it, like the index at the back of a book.",
        },
        {
          kind: "fold",
          tone: "industry",
          title: "Learned sparse models",
          text: "SPLADE and similar models learn which terms to add to a chunk and how to weight them. They produce sparse vectors that live in an inverted index. They narrow the vocabulary mismatch gap while keeping exact matching. They are worth a look if BM25 plus dense is not enough. Check support in your store before planning around them.",
        },
        {
          kind: "p",
          text: "You now have two ranked lists for every question, one from each leg. The next section merges them into one.",
        },
      ],
    },
    {
      id: "s3-rrf",
      title: "Reciprocal rank fusion merges two rankings without comparing their scores",
      goal: "How do you merge two ranked lists whose scores cannot be compared?",
      blocks: [
        {
          kind: "p",
          text: "The two lists' scores are not comparable. A cosine similarity near 0.8 and a BM25 score of 14 live on different scales. BM25 scores also shift whenever the corpus changes. Adding or averaging them directly is a bug waiting to happen.",
        },
        {
          kind: "p",
          text: "**Reciprocal rank fusion**, or RRF, avoids the problem by ignoring scores and using only ranks. Rank counts from 1 at the top of each list. Each list gives a chunk 1 divided by the sum of k and its rank. Add these up across the lists, then sort by the total.",
        },
        {
          kind: "p",
          text: "Here k is a constant, and it has nothing to do with chapter three's top k. Cormack, Clarke and Buettcher proposed RRF in 2009, with k equal to 60. In the weighted form, each list's share is multiplied by a **weight**. With no reason to favour either leg, both weights are 1.",
        },
        {
          kind: "p",
          text: "Work one through. Chunk P is first in dense and fifth in sparse. With k at 60, it scores 1 over 61 plus 1 over 65, about 0.0318. Chunk Q is second in both lists. It scores 1 over 62 twice, about 0.0323. Q wins, because agreement beats one strong vote.",
        },
        {
          kind: "widget",
          id: "c06-rrf-calc",
          intro: "Two ranked lists feed the calculator, and you set k and a weight for each list. Predict the fused order before you look. Then move k down to 1, and watch a lone first place overtake agreement.",
        },
        {
          kind: "p",
          text: "The constant k sets how much the top of each list matters. A small k makes rank one count far more than rank five. A large k flattens the curve and lets agreement across lists decide. Sixty is a sensible default, and it is the last setting to tune.",
        },
        {
          kind: "p",
          text: "A chunk missing from a list gets nothing from that list. With k at 60, a chunk ranked first in one list only scores 1 over 61. Any chunk in the top sixty of both lists scores more. So when dense misses an identifier completely, fusion can push the exact match down.",
        },
        {
          kind: "p",
          text: "A higher sparse weight lifts it back. So does sending a deep fused list to the reranker, which reads each chunk's text.",
        },
        {
          kind: "p",
          text: "Interviewers often ask how you would combine keyword and vector search. A good answer shows you know why the two scores cannot be added.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How do you combine BM25 and vector search",
          text: "Say that the scores are on different scales, so you fuse ranks and not scores. Give the RRF formula, with k at 60 and the 2009 source. Mention weights as an option, and say that you would evaluate on a golden set before touching them. Name the alternative of normalising scores, and why it is more fragile.",
        },
        {
          kind: "quiz",
          id: "rag-06-q4",
          question: "With k at 60, chunk X is first in one list only. Chunk Y is third in both lists. Which has the higher RRF score?",
          options: [
            "X, because first place is worth most.",
            "Y, because it appears in both lists.",
            "They tie.",
            "It depends on the raw scores.",
          ],
          answer: 1,
          explain: "X scores 1/61, about 0.01639. Y scores 2/63, about 0.03175. Appearing in both lists wins unless k is very small.",
        },
        {
          kind: "quiz",
          id: "rag-06-q5",
          question: "Why is RRF popular as a default for hybrid retrieval?",
          options: [
            "It needs a trained model.",
            "It needs no score normalisation and has almost no parameters to tune.",
            "It always beats every other method.",
            "It works only with BM25.",
          ],
          answer: 1,
          explain: "It works on ranks alone, so any two retrievers can be fused. That is its appeal. It does not always beat a tuned score-based blend.",
        },
        {
          kind: "p",
          text: "RRF settles how to merge. Two numbers are still open: how deep each leg searches, and how much each leg counts.",
        },
      ],
    },
    {
      id: "s4-weighting",
      title: "Candidate depth and weights are tuned on a golden set, never by feel",
      goal: "How many candidates should each leg return, and should one leg count for more?",
      blocks: [
        {
          kind: "p",
          text: "Two decisions remain, and the first is depth. **Candidate depth** is how many candidates each leg returns before fusion. Fusion merges them, and you keep a shorter list for the next stage. If each leg returns only as many as you keep, a chunk ranked sixth in both lists never gets a chance.",
        },
        {
          kind: "p",
          text: "So fetch more per leg than you finally keep. Fifty per leg for ten kept is a reasonable start, and a figure to test. AskPEP's build in chapter twelve fetches 30 per leg and keeps 6.",
        },
        {
          kind: "p",
          text: "Weights come next. If your users type many identifiers, weight sparse up. If they ask vague questions, weight dense up. Without evidence, keep both weights at 1.",
        },
        {
          kind: "list",
          items: [
            "Start with equal weights, k at 60 and 50 candidates per leg.",
            "Build a golden set of 30 to 50 real questions, each listing the chunks that should be found.",
            "Change one setting at a time and rerun. Keep a change only if it helps on questions you did not tune on.",
            "Look at the questions that got worse, as well as the average.",
          ],
        },
        {
          kind: "p",
          text: "Chapter nine builds AskPEP's golden set properly, and measures each change with it.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Hybrid search widens the net, and the reranker sets the order",
          text: "Fusion makes sure the right chunk is somewhere in the top fifty. The reranker, the slower, sharper model from chapter two, then decides the final order. Chapter seven builds it. So do not agonise over the fused order of positions four to nine, because the reranker reshuffles them anyway.",
        },
        {
          kind: "quiz",
          id: "rag-06-q6",
          question: "You keep the top 5 after fusion and each leg also returns exactly 5. What is the main risk?",
          options: [
            "Duplicates will crash the sort.",
            "A chunk ranked 6th in both lists, which fusion would have lifted, is never seen.",
            "RRF requires more than 5 items.",
            "BM25 stops working below 10.",
          ],
          answer: 1,
          explain: "Fusion can only reorder what the legs hand it. Deeper legs give agreement a chance to surface good chunks.",
        },
        {
          kind: "quiz",
          id: "rag-06-q7",
          question: "Your hybrid system underperforms on identifier queries. What is the first sensible move?",
          options: [
            "Retrain the embedding model.",
            "Check the tokeniser keeps identifiers intact, then test a higher sparse weight on a golden set.",
            "Drop BM25.",
            "Set k to 0.",
          ],
          answer: 1,
          explain: "A tokeniser that splits PEP-572 badly will hurt sparse matching. After that, the weight is a one-line change that you can evaluate quickly.",
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "A good result vanishes after fusion",
          text: "Symptom: a chunk ranked first by BM25 is missing from the final list. Print both input lists and the fused scores with sources. One cause is different chunk ids for the same text in the two indexes, which stops them merging. Another is a metadata filter applied to only one leg. Give both legs the same ids and filter. A third is the arithmetic itself: a chunk found by one leg alone loses to chunks found by both.",
        },
        {
          kind: "p",
          text: "That completes the method. The next section asks where the sparse leg runs in a real system.",
        },
      ],
    },
    {
      id: "s-alternatives",
      title: "Postgres full-text search is the default until you need true BM25 ranking",
      goal: "Where does the sparse leg run in each tool, and what does the built-in option give up?",
      blocks: [
        {
          kind: "p",
          text: "The AskPEP build in chapters twelve to fourteen runs its sparse leg in Postgres full-text search, on Cloud SQL for PostgreSQL. Each chunk stores a `tsvector`, Postgres's searchable list of that chunk's terms. The built-in function `ts_rank_cd` ranks the matches. Both legs query the same table, and Python code fuses the two lists with RRF.",
        },
        {
          kind: "p",
          text: "The cost is that `ts_rank_cd` is not BM25. It has no k1 and no b, only a few fixed options for chunk length.",
        },
        {
          kind: "p",
          text: "Three routes give you real BM25. Elasticsearch and OpenSearch score with it by default, and add **analysers**, configurable tokenisers that handle stemming and synonyms. `pg_search` from ParadeDB brings BM25 into Postgres. `rank_bm25` is a small Python library that scores in memory.",
        },
        {
          kind: "p",
          text:
            // CHECK: confirm which fusion method and ranking options Vector Search offers for hybrid queries, and that the service does the fusion itself.
            "Vector Search on Google's Gemini Enterprise Agent Platform, formerly Vertex AI Vector Search, hosts dense, sparse and hybrid search. " +
            "Pick it when a Google Cloud customer would rather rent hybrid search than run it. " +
            // CHECK: confirm how Azure AI Search currently fuses keyword and vector results and which ranker options each tier offers.
            "Pick Azure AI Search, the Azure equivalent, when the customer builds on Azure.",
        },
        {
          kind: "p",
          text: "Whichever you pick, keep the fusion simple and test it on a golden set. Chapter eleven teaches how to choose a whole stack.",
        },
        {
          kind: "compare",
          caption: "Five sparse and hybrid options. Keep keywords and vectors where one system can search both.",
          columns: ["Tool", "Best at", "Switch to it when", "What it costs you"],
          rows: [
            [
              "Postgres full-text search",
              "Keyword search beside your vectors, in one database.",
              "Rare identifiers or long documents rank poorly.",
              "Ranking differs from BM25, so tuning has fewer knobs.",
            ],
            [
              "Vector Search on Gemini Enterprise Agent Platform",
              "Hosted dense, sparse and hybrid search, so fusion happens in the service.",
              "The customer is on Google Cloud and wants it managed.",
              "Google Cloud only. Fusion and ranking options are the service's, so you tune fewer knobs.",
            ],
            [
              "Elasticsearch or OpenSearch",
              "Mature BM25, analysers and filters at scale.",
              "Search is a major feature and corpus size is large.",
              "A cluster to run and a second copy of your data.",
            ],
            [
              "pg_search (ParadeDB)",
              "BM25 scoring inside Postgres.",
              "You want BM25 without leaving Postgres.",
              "An extension to install. Check hosting support.",
            ],
            [
              "rank_bm25",
              "A few lines of in-memory BM25.",
              "You are teaching, prototyping or testing.",
              "No persistence, and memory grows with the corpus.",
            ],
          ],
        },
        {
          kind: "quiz",
          id: "rag-06-alt-q1",
          question: "Why might a team move from Postgres full-text search to a BM25 engine?",
          options: [
            "Because full-text search cannot index text.",
            "To get BM25 scoring with tunable saturation and length normalisation, plus richer analysers.",
            "Because vectors need a separate database.",
            "Because reciprocal rank fusion needs Elasticsearch.",
          ],
          answer: 1,
          explain: "Built-in ranking exists in Postgres but it is not BM25. If term weighting and length normalisation matter, an engine or extension with real BM25 helps.",
        },
        {
          kind: "fold",
          tone: "industry",
          title: "Hybrid built into the store",
          text: "Several engines and vector databases offer hybrid queries with RRF built in, which saves a fusion step in your own code. Some offer a weighted score blend instead. Names, defaults and k values differ between products and versions, so read the docs for yours. Check whether the fusion runs before or after your metadata filter. Make sure you can still see both lists, because debugging a bad fusion needs them.",
        },
        {
          kind: "p",
          text: "AskPEP's labs have no database yet. The last section builds the same two legs inside chapter five's local store.",
        },
      ],
    },
    {
      id: "s6-local-hybrid",
      title: "AskPEP's local store gains a BM25 index, and one function fuses the two legs",
      goal: "How does AskPEP's local hybrid search work, and how do you build it?",
      blocks: [
        {
          kind: "p",
          text: "Chapter five's local store searches by brute-force cosine. This chapter gives it a sparse leg, a BM25 index over the same chunks. The store then answers dense and sparse searches with no database. Four rules shape the new code.",
        },
        {
          kind: "list",
          items: [
            "The tokeniser lowercases the text and keeps runs of letters and digits. So PEP 572 becomes pep and 572. A dot or an underscore splits a term, so identifiers are the first casualty.",
            "IDF uses the Lucene form, so a term in every chunk still scores above zero. The defaults are k1 of 1.2 and b of 0.75.",
            "Search drops chunks that score zero, and ties keep chunk order. Each hit's `via` field, which names the search that found it, says sparse.",
            "Fusion is one function, `rrf`, in `retrieval.py`. It matches chunks by id, counts a chunk once per list at its best rank, and marks each result hybrid.",
          ],
        },
        {
          kind: "p",
          text: "You build both halves in the chapter's lab, in the AskPEP repo from chapter two. Finish chapter five's lab first, because the store's dense leg is your cosine search. No step needs a database or an API key.",
        },
        {
          kind: "p",
          text: "Hybrid search widens the net, and it still has two weak spots. A badly phrased question defeats both legs, and the order near the top is rough. Chapter seven fixes the question before search, then fixes the ranking after it.",
        },
      ],
    },
  ],
  lab: {
    title: "Build BM25 and fusion",
    goal: "Fill in two stubs in your AskPEP repo from chapter two. `local_store.py` holds BM25, and `retrieval.py` holds fusion. Chapter two's setup already copied both in, with their tests. Each stub has its final signature. It raises `NotImplementedError(\"rag-06 step N\")` until you replace it. Finish chapter five's lab first, because steps 4 and 6 use your cosine search. In each test command, `-k` runs only the tests whose names contain that text. The flag `-s` lets a test print to your terminal.",
    minutes: 40,
    files: ["src/askpep/local_store.py", "src/askpep/retrieval.py", "tests/rag/test_local_store.py", "tests/rag/test_retrieval.py"],
    steps: [
      {
        title: "Tokenise",
        text: "Replace the `tokenize(text)` stub in `src/askpep/local_store.py`. It raises `rag-06 step 1`. Lowercase the text with `casefold()` and return every run of Unicode letters and digits, so accented words survive. The tests check case folding, punctuation splits, digits, accents, the empty string and the underscore. Write down what you lose by splitting on punctuation, because identifiers are the first casualty.",
        code: `# src/askpep/local_store.py
import re


def tokenize(text: str) -> list[str]:
    # your turn:
    # 1. Lowercase the text with casefold().
    # 2. Find every run of Unicode letters and digits with re.findall.
    # 3. A regex word character includes the underscore, so leave the underscore out.
    ...`,
        test: "uv run pytest tests/rag/test_local_store.py -k ch06_s1",
      },
      {
        title: "Build the index",
        text: "Fill in `BM25Index.__init__(self, chunks, *, k1=1.2, b=0.75, tokenize=tokenize)`, which raises `rag-06 step 2`. Keep the chunks as a list in `self.chunks`, because `LocalStore` reads it. Store each chunk's term counts and length, the average length, and a document frequency for each term. The tests check the defaults, the custom tokeniser and an empty index.",
        test: "uv run pytest tests/rag/test_local_store.py -k ch06_s2",
      },
      {
        title: "Score one chunk",
        text: "Write `BM25Index.score(query, doc_index)`, which raises `rag-06 step 3`. `doc_index` is a chunk's position. For each distinct query term the chunk holds, add its BM25 score once. Use the Lucene IDF, `ln(1 + (N - n + 0.5) / (n + 0.5))`. N counts chunks, n counts those holding the term. Tests check a hand-computed score and edge cases.",
        test: "uv run pytest tests/rag/test_local_store.py -k ch06_s3",
      },
      {
        title: "Search",
        text: "Write `BM25Index.search(query, k=10)`, which raises `rag-06 step 4`. Score every chunk and drop those that score 0. Sort descending and return `Hit` objects with `via=\"sparse\"`, or `[]` when `k` is 0 or less. Break ties by chunk order so results repeat. `LocalStore`, already in your stub, calls this method from `sparse_search`.",
        test: "uv run pytest tests/rag/test_local_store.py -k ch06_s4",
      },
      {
        title: "Fuse with RRF",
        text: "In `src/askpep/retrieval.py`, replace the `rrf` stub. It raises `rag-06 step 5`. Rank starts at 1. Dedupe by `chunk.id`, add weight divided by (k + rank) per list, sort by the total and return hits with `via=\"hybrid\"`. A chunk repeated inside one list counts once, at its best rank. The tests check hand-computed fusion, weights, `top_k`, ties and unchanged inputs.",
        code: `# src/askpep/retrieval.py
def rrf(rankings: Sequence[Sequence[Hit]], *, k=60, weights=None, top_k=None) -> list[Hit]:
    # your turn:
    # 1. Give each list a weight of 1.0 unless weights supplies one.
    # 2. Loop over each list with enumerate(hits, start=1).
    # 3. Add weight / (k + rank) to the total for hit.chunk.id, once per list. A chunk repeated
    #    inside one list counts once, at its best rank.
    # 4. Keep the first Hit you see for each id. sorted is stable, so ties keep that order.
    # 5. Return new Hit(chunk, score, "hybrid") objects, best first, cut to top_k when it is set.
    ...`,
        test: "uv run pytest tests/rag/test_retrieval.py -k ch06_s5",
      },
      {
        title: "Optional: combine and compare",
        test: "uv run pytest tests/rag/test_retrieval.py -k ch06_s6 -s",
        text: "The test builds a `LocalStore` from the PEPs in `tests/fixtures/`, and prints dense, sparse and hybrid rankings for four queries. Dense uses `FakeEmbedder`, a hashing stand-in for a real model. It runs your `load_documents`, `chunk_all` and `embed_chunks`. Find a query where hybrid beats both legs and one where it does not. Cite that pair in an interview.",
      },
    ],
    verify: "uv run pytest tests/rag/test_local_store.py tests/rag/test_retrieval.py -k ch06",
  },
  recap: [
    "Dense retrieval matches meaning and blurs exact strings. Sparse retrieval matches terms and misses paraphrase. Hybrid retrieval runs both.",
    "BM25 multiplies a rarity weight by a saturating term count, adjusted for chunk length. k1 sets the saturation and b sets the length penalty.",
    "RRF scores each chunk as the sum of weight over (k + rank), with k at 60. It uses ranks only, so no score calibration is needed.",
    "Agreement beats one strong vote, so a chunk found by one leg alone can sink. A higher sparse weight or a deep list for the reranker lifts it.",
    "Fetch more candidates per leg than you keep, start with equal weights, and tune on a golden set.",
    "AskPEP's build ranks its sparse leg with Postgres full-text search, which is not BM25. The labs build real BM25 into the local store.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In hybrid retrieval I learned that dense finds meaning and BM25 finds exact names, and that reciprocal rank fusion merges them using ranks alone. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["rag-q15", "rag-q42"],
};

export default chapter;
