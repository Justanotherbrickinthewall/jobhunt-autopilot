import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "rag-04-embeddings",
  course: "rag",
  number: 4,
  title: "Embeddings",
  tagline: "When does a nearby vector really mean a matching chunk, and what must you hold steady to keep it that way?",
  minutes: 45,
  objectives: [
    "Explain what an embedding is, why nearness between two vectors suggests a match, and where that stops being true.",
    "Pick a way to score nearness, and say when the three common scores give the same ranking.",
    "Embed questions and chunks with the right setting for each, and name the quiet bug when you don't.",
    "Choose an embedding model by testing it on your own questions, and estimate what its vectors cost.",
    "Change the embedding model as a migration, with a second index, a test and a way back.",
    "Decide between a hosted embedding service and an open model you run yourself.",
    "Build AskPEP's embedding client, which batches, retries and keeps the two sides apart, and make it pass its tests.",
  ],
  sections: [
    {
      id: "s1-position",
      title: "An embedding is a position, and nearness stands in for meaning",
      goal: "What is an embedding, and what does it mean for two of them to be near?",
      blocks: [
        {
          kind: "p",
          text: "Every section of this chapter answers part of one question. When does a nearby vector really mean a matching chunk, and what must you hold steady to keep it that way? Chapter three's chunker ended with several hundred chunks, each still only text. This section turns a chunk into a vector, and says what nearness means.",
        },
        {
          kind: "p",
          text: "Chapter two defined a **vector** as a list of numbers that stands for a passage's meaning. The **embedding model** makes it. The vector the model returns for one piece of text is that text's **embedding**. The length of the list is the number of **dimensions**. Common sizes are 768 and 1024, and some models go higher.",
        },
        {
          kind: "p",
          text: "Treat the vector as coordinates. Each text becomes one point in a space with that many axes. Chapter two called this space the model's map of meaning. Texts with similar meanings land close together. Text about the GIL, Python's global interpreter lock, lands near text about threads and locks. Text about line length lands somewhere else.",
        },
        {
          kind: "p",
          text: "Search works by position. The question is embedded with the same model, and its vector is the **query vector**. Search returns the k chunks whose vectors sit nearest to the query vector. That k is the top k from chapter three.",
        },
        {
          kind: "p",
          text: "Nearness means something because of how the model is trained. The method is **contrastive learning**. The model sees pairs that belong together, such as a question and the passage that answers it. It learns to pull each pair closer and push unrelated texts apart. After enough pairs, nearness comes to mean a good match.",
        },
        {
          kind: "p",
          text: "That has a consequence people forget. Nearness measures whatever the training pairs rewarded, which is mostly a shared topic. It does not measure truth, and it does not measure freshness. A passage that contradicts your question can sit right beside it, because it talks about the same thing.",
        },
        {
          kind: "p",
          text: "Embeddings are also weak on negation. A sentence and its opposite share almost every word and the same topic, so they can land close together. That is why retrieval is always followed by a model that actually reads the text.",
        },
        {
          kind: "callout",
          tone: "analogy",
          title: "A library shelved by topic",
          text: "Picture a library where books are shelved by subject alone. You walk to the spot where your question belongs and take the nearest books. That is retrieval by embedding. The flaw carries over too: a book arguing the opposite view sits on the same shelf.",
        },
        {
          kind: "widget",
          id: "c04-embedding-map",
          intro: "Each dot is a short PEP snippet on a flat cartoon of an embedding space. Predict which snippet lands closest to a question. Then drag the query and watch the nearest three change. Real vectors have hundreds of dimensions, so treat the map as a picture. Watch what happens when the query sits between two topics.",
        },
        {
          kind: "quiz",
          id: "rag-04-q1",
          question: "Two passages sit very close together in embedding space. What can you safely conclude?",
          options: [
            "They say the same thing.",
            "They are about similar topics, but one may contradict the other.",
            "They were written by the same author.",
            "They share most of their words.",
          ],
          answer: 1,
          explain: "Embeddings capture topical and semantic closeness. They are known to be weak on negation and on opposite claims about the same subject. That is why retrieval is followed by a model that actually reads the text.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Why a two dimensional map can mislead",
          text: "Squashing 1024 dimensions into two, with PCA, t-SNE or UMAP, throws information away. Each method keeps different things, and on a t-SNE plot the distances between far-apart clusters are not reliable. Use these maps to spot clusters and outliers. Never use one to judge retrieval quality. That is a job for a golden set, which chapter nine builds.",
        },
        {
          kind: "p",
          text: "Search needs a number for nearness before it can rank anything. The next section compares the three common ways to compute one.",
        },
      ],
    },
    {
      id: "s2-metrics",
      title: "Cosine, dot product and Euclidean distance agree once vectors have length one",
      goal: "How should you score the nearness of two vectors?",
      blocks: [
        {
          kind: "p",
          text: "A **similarity metric** is the formula that turns two vectors into one number saying how close they are. Three are in common use. They differ less than the documentation makes them sound.",
        },
        {
          kind: "list",
          items: [
            "The **dot product** multiplies matching numbers and adds them up. It rewards both direction and length.",
            "**Cosine similarity** is the dot product divided by both lengths. It measures only the angle between the two vectors.",
            "**Euclidean distance** is the length of the straight line between the two points. Smaller means closer.",
          ],
        },
        {
          kind: "p",
          text: "Embedding models are trained so that a vector's direction carries the meaning. Its length is mostly noise. That makes cosine the natural choice, because it ignores length.",
        },
        {
          kind: "p",
          text: "**Normalising** a vector means scaling it to length one, which makes it a **unit vector**. For unit vectors, the dot product equals the cosine. Squared Euclidean distance equals two minus two times the cosine. So all three metrics produce the same ranking.",
        },
        {
          kind: "p",
          text: "That is why many vendors return unit vectors. Voyage AI, the embedding vendor AskPEP uses, documents its vectors that way.",
        },
        {
          kind: "widget",
          id: "c04-metric-calc",
          intro: "Two arrows start at the origin. Move them and read the three metrics. Predict what happens when you stretch one arrow, then test it. Finally, normalise both arrows and watch the three numbers fall into line.",
        },
        {
          kind: "p",
          text: "The practical rule is short. Check your model's documentation for whether it normalises. If it does, use the dot product, because it is the cheapest to compute. If it does not, normalise each vector once, when you create it. Then the dot product works again.",
        },
        {
          kind: "compare",
          caption: "The three metrics side by side. The last column says when each one is the right pick.",
          columns: ["Metric", "Changes with vector length", "Range", "Pick it when"],
          rows: [
            ["Dot product", "Yes", "Unbounded", "Vectors are already unit length, or length carries meaning."],
            ["Cosine similarity", "No", "Minus one to one", "Vectors may not be normalised, or you are unsure."],
            ["Euclidean distance", "Yes", "Zero upward, smaller is closer", "You group vectors into clusters, as one index type in chapter five does."],
          ],
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Unit length is a property of the model, so check it",
          text: "If you switch models and the new one does not normalise, a dot product search will quietly rank long vectors first. Nothing crashes. Add a test that samples a hundred vectors and asserts their lengths are close to one.",
        },
        {
          kind: "quiz",
          id: "rag-04-q2",
          question: "You stretch one vector to twice its length without rotating it. Which metric stays exactly the same?",
          options: ["Dot product", "Cosine similarity", "Euclidean distance", "All three change"],
          answer: 1,
          explain: "Cosine divides out both lengths, so only the angle is left. The dot product doubles and the Euclidean distance changes because the tip of the vector has moved.",
        },
        {
          kind: "quiz",
          id: "rag-04-q3",
          question: "Your model returns unit length vectors. Your store offers dot product, cosine and Euclidean. Which should you choose?",
          options: [
            "Cosine, because it is the only correct metric for text.",
            "Euclidean, because distance is more intuitive.",
            "They rank identically, so choose the cheapest one, which is the dot product.",
            "Whichever has the highest scores, because they are more discriminating.",
          ],
          answer: 2,
          explain: "For unit vectors the three metrics are monotonic transforms of one another. The ranking cannot differ. The raw scores differ in scale, which matters only if you set a threshold.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Why the three metrics collapse into one",
          text: "For unit vectors a and b, the squared distance is the dot product of a minus b with itself. That expands to one plus one minus two times the dot product, which is two minus two times the cosine. So ranking by smallest distance matches ranking by largest cosine. The dot product of unit vectors is the cosine.",
        },
        {
          kind: "fold",
          tone: "dyk",
          title: "Cosine scores bunch together, so thresholds do not travel",
          text: "Many models place most text inside a fairly narrow cone, so most similarity scores sit in a narrow band. A cosine of 0.8 means different things in different models and even in different versions of one model. If you set a cutoff to drop weak matches, calibrate it per model on your own data and recalibrate when the model changes.",
        },
        {
          kind: "p",
          text: "The metric is settled. The next question is what goes into the model. A question and the chunk that answers it are different kinds of text, and many models treat them differently.",
        },
      ],
    },
    {
      id: "s3-asymmetry",
      title: "Questions and chunks are different kinds of text, so many models embed them differently",
      goal: "Why do many models embed questions and chunks differently, and what breaks if you ignore it?",
      blocks: [
        {
          kind: "p",
          text: "A question and its answer rarely look alike. Take the question, why was the walrus operator controversial? The passage that answers it describes a debate, and shares few of the question's words. A question is short and asks. A chunk is long and states.",
        },
        {
          kind: "p",
          text: "So many modern models are trained **asymmetrically**. They embed the two kinds of text differently, so a question lands near the chunks that answer it, instead of near other questions. Vendors call the two sides query and document. Here a document means any text you store in the index, which for AskPEP is a chunk.",
        },
        {
          kind: "p",
          text: "How you pick the side depends on the model family. Each family's **model card**, the documentation published with the model, says what it expects. Voyage has an input type parameter that takes query or document. Its documentation says it adds a different instruction to the start of your text for each side.",
        },
        {
          kind: "p",
          text: "Other families expect you to add a text prefix yourself, and some make no distinction at all.",
        },
        {
          kind: "compare",
          caption: "Four model families and how each marks the query side and the document side. Read the model card, because this changes between versions.",
          columns: ["Family", "How you mark the side", "Where it happens"],
          rows: [
            ["Voyage", "Input type of query or document", "An API parameter. The service adds the instruction."],
            ["E5 models", "The prefixes query colon and passage colon", "You add the text yourself before embedding."],
            ["BGE models", "An optional instruction on queries only", "You add the text yourself before embedding."],
            ["OpenAI embedding models", "No query or document distinction", "One call for both sides."],
          ],
        },
        {
          kind: "p",
          text: "The classic mistake is embedding your chunks with the query type, or with no type at all. Nothing throws an error. Retrieval simply gets a little worse, and reading the code will not show why. Only a test against your golden set will.",
        },
        {
          kind: "p",
          text: "The cure is boring. Wrap the embedding call in two functions, one for chunks and one for questions. Each function sets the type itself, so no caller ever chooses it. Section seven builds exactly these two.",
        },
        {
          kind: "p",
          text: "Interviewers like to ask why retrieval got worse after a change, because the answer shows whether you know these quiet bugs.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "The retrieval quality dropped after a refactor",
          text: "Your corpus was embedded last month, and quality fell after a change. A strong answer checks the input type on both sides, the model name and version, and normalisation. It checks for long chunks cut off at the input limit. Then it uses the golden set to prove which one it was.",
        },
        {
          kind: "quiz",
          id: "rag-04-q4",
          question: "By mistake you embed every document with the query input type. What happens?",
          options: [
            "The API rejects the request.",
            "Retrieval still works but is quietly worse, and only an evaluation will show it.",
            "Every similarity score becomes exactly zero.",
            "Queries can no longer be embedded.",
          ],
          answer: 1,
          explain: "The vectors are valid points in the same space, just placed slightly wrong for the matching task. That makes it a silent quality bug rather than a crash.",
        },
        {
          kind: "p",
          text: "The side must match on both paths, and so must the model. The next section asks how to choose that model in the first place.",
        },
      ],
    },
    {
      id: "s4-model-choice",
      title: "Pick the model by testing it on your own questions, because leaderboards average over tasks you do not have",
      goal: "How do you choose an embedding model, and what will its vectors cost?",
      blocks: [
        {
          kind: "p",
          text: "**MTEB**, the Massive Text Embedding Benchmark, is a public **leaderboard**, a ranked table of models. It scores each model on many tasks, from classification to retrieval. It is a fair first filter. It is a poor final decision, for four reasons.",
        },
        {
          kind: "list",
          items: [
            "The headline number averages tasks you may not care about. Read the retrieval column, not the overall mean.",
            "Public test sets can leak into training data, and vendors tune for the board. A high score may not carry over to your documents.",
            "Most tasks are in English and on general text. Python enhancement proposals, legal clauses and support tickets are different text.",
            "The board does not know your limits on latency, price, input length, dimensions or where the data may be sent.",
          ],
        },
        {
          kind: "p",
          text: "The better procedure takes an afternoon. Collect thirty to fifty real questions, each with the chunk that answers it, as a small golden set. Embed your corpus with two or three candidate models. For each one, measure recall at five, the share of questions whose answer sits in the top five chunks. Chapter nine turns this into a proper harness.",
        },
        {
          kind: "p",
          text: "Two limits catch teams out. The first is the input limit from chapter three, the most tokens a model accepts at once. Some services cut off longer text without warning, so the tail of a long chunk is never embedded.",
        },
        {
          kind: "p",
          text: "The second is language. If your users write in several languages, you need a **multilingual** model, one trained on many languages. Test it in each language you serve, because coverage varies.",
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "Easy questions work, long chunks fail",
          text: "Symptom: retrieval is good on short chunks and poor on long ones. Check the chunk token length against the model's maximum input. If the service truncates silently, the end of each long chunk was never embedded, so questions about its last paragraphs find nothing. Fix it at chunking time, not at query time.",
        },
        {
          kind: "p",
          text: "The model also sets your storage bill. Each number in a vector is stored as a **float32**, a decimal number that takes four bytes. So the raw vectors need chunks times dimensions times bytes per number. AskPEP's roughly seven hundred chunks at 1024 dimensions need about 2.9 megabytes. Chapter five's index adds more on top.",
        },
        {
          kind: "p",
          text: "Smaller numbers shrink that. Storing each number in fewer bits is called **quantisation**. A **float16** takes two bytes. An **int8** stores a whole number from minus 128 to 127 in one byte. **Binary** keeps one bit per number, just its sign. Each step saves space and loses some detail.",
        },
        {
          kind: "p",
          text: "Fewer dimensions shrink it too. Some models are trained so that the first part of a vector is itself a usable, smaller embedding. This is **Matryoshka** training, named after the nesting dolls. OpenAI's text-embedding-3 family and some Voyage models support it. Only shorten a model that was trained for it, and check your vendor for the supported sizes.",
        },
        {
          kind: "widget",
          id: "c04-storage-calc",
          intro: "Before you touch any slider, predict how much memory one million chunks need. Then change the dimensions, the number precision and the chunk size, and see what each decision costs. The price box is yours to fill, because vendors change prices.",
        },
        {
          kind: "p",
          text: "Two more bills follow from the model. You pay once to embed the corpus, and again every time you re-embed it. You also pay a little for every question, because each one is embedded when it arrives. That call adds latency too.",
        },
        {
          kind: "compare",
          caption: "The knobs that trade quality against cost. Test each on your golden set before you commit.",
          columns: ["Knob", "Effect on storage and speed", "Effect on quality", "Watch for"],
          rows: [
            ["Fewer dimensions", "Smaller and faster in proportion", "Small loss if the model was trained for it", "Shortening a model that was not."],
            ["int8 numbers", "Four times smaller than float32", "Usually small", "Check your store supports it."],
            ["Binary numbers", "Thirty two times smaller than float32", "Larger loss", "Plan to rescore the top matches with the full vectors."],
            ["Bigger model", "Larger vectors and slower calls", "Often better, not always", "Price per token and latency."],
          ],
        },
        {
          kind: "quiz",
          id: "rag-04-q5",
          question: "You store 2 million chunks as 768 dimensional float32 vectors. Roughly how much memory do the raw vectors need?",
          options: ["1.5 GB", "6.1 GB", "12.3 GB", "61 GB"],
          answer: 1,
          explain: "2,000,000 times 768 times 4 bytes is 6,144,000,000 bytes, about 6.1 GB. Index structures such as HNSW, which chapter five covers, add overhead on top.",
        },
        {
          kind: "quiz",
          id: "rag-04-q6",
          question: "A new embedding model tops the MTEB retrieval column. What is the best next step?",
          options: [
            "Switch immediately, since the benchmark is public.",
            "Run it against your own golden set and compare recall at five with your current model.",
            "Ask the vendor for a discount.",
            "Increase the chunk size.",
          ],
          answer: 1,
          explain: "Your documents and questions are the only distribution that matters. A model that wins on average can lose on yours, and the test costs an afternoon.",
        },
        {
          kind: "p",
          text: "Picking a model is the cheap decision. Changing it later is the expensive one, because every stored vector must be made again. The next section treats that change as a migration.",
        },
      ],
    },
    {
      id: "s5-changing-model",
      title: "Changing the embedding model is a migration: build a second index, prove it, then cut over",
      goal: "How do you change the embedding model without breaking search?",
      blocks: [
        {
          kind: "p",
          text: "A new embedding model makes every stored vector obsolete. Chapter two said each model draws its own map of meaning. Two models place the same text at unrelated positions, even when their vectors have the same length. A new query vector, searched against old vectors, returns confident nonsense. It never throws an error.",
        },
        {
          kind: "p",
          text: "So treat the change as a **migration**, a planned move with a way back. Search keeps using the old index until the new one has proved itself. Five steps get you there.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Prove the model. Its recall at five on your golden set must beat the current model by a margin you chose in advance.",
            "Build a second index beside the live one, and **re-embed** every chunk into it. Estimate the cost first. Embed in batches, with **checkpoints** that let a crashed job resume where it stopped. Write the model name and version beside every vector.",
            "Keep both indexes current during the build. A **dual write** sends every changed document to both indexes, so the new one does not start out stale.",
            "Test the new index on the golden set. Then replay a sample of real questions against both indexes, and compare the chunks returned, the latency and the answers.",
            "**Cut over** by moving an **alias**, a stable name that points at the live index. Move it one **tenant** at a time if you can, where a tenant is one customer of a shared system. Keep the old index for a **rollback** window, then delete it.",
          ],
        },
        {
          kind: "p",
          text: "One rule holds the whole design together. Never mix **embedding spaces**, the maps of two different models, in one search path. A query uses one model, and it searches only an index built by that same model. The query code should read the model name from the index and refuse to run on a mismatch.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Rollback is only real while the old index exists",
          text: "Deleting the old index on cutover day turns a one-line rollback into another full re-embed. Keep it for a fixed window, say two weeks. Write the deletion date in the team's runbook, the written procedure for running the system. The storage bill for that window is cheap insurance.",
        },
        {
          kind: "p",
          text: "Interviewers often ask what happens when you change the embedding model. They listen for whether you treat it as a migration or as a config change.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "What happens if you change the embedding model",
          text: "A strong answer says re-embed into a parallel index, evaluate it, cut over under control, keep a rollback path and never mix spaces. Add the cost estimate, and the dual write during the build. For a large index, mention replaying live questions against both indexes before the switch.",
        },
        {
          kind: "quiz",
          id: "rag-04-q8",
          question: "You swap the query embedding model but leave the old index in place. Both models give 1024 dimensions. What happens?",
          options: [
            "The search throws a dimension mismatch error.",
            "It works, with slightly lower recall.",
            "It runs without errors and returns poor matches, because the two vector spaces are unrelated.",
            "The index rebuilds itself on the first query.",
          ],
          answer: 2,
          explain: "Equal dimensions mean the database accepts the query. The positions mean different things, so the distances are meaningless. This is why the model name must be stored with the index and checked on every query.",
        },
        {
          kind: "quiz",
          id: "rag-04-q9",
          question: "The new index passed evaluation and you have flipped the alias. What should you do with the old index?",
          options: [
            "Delete it at once to save storage.",
            "Keep it for a rollback window, then delete it on a date you set in advance.",
            "Merge its vectors into the new index.",
            "Keep it forever as a fallback for failed queries.",
          ],
          answer: 1,
          explain: "Rollback needs the old index to exist and to be current enough. Merging vectors would mix two spaces. Keeping it forever costs money and invites someone to query it by mistake.",
        },
        {
          kind: "quiz",
          id: "rag-04-q10",
          question: "During a 10 hour re-embedding job, 3,000 documents change in the source. What protects the new index from going stale?",
          options: [
            "Nothing. You will re-run the job afterwards.",
            "Write every change to both indexes while the build runs.",
            "Pause all ingestion until the cutover.",
            "Embed the changed documents with the old model.",
          ],
          answer: 1,
          explain: "Dual writes keep the new index current from the first minute. Pausing ingestion breaks freshness promises, and embedding with the old model would put two spaces into one index.",
        },
        {
          kind: "p",
          text: "Every step above assumes you already chose a vendor. The next section compares Voyage, which AskPEP uses, with the other hosted and self-run options.",
        },
      ],
    },
    {
      id: "s-alternatives",
      title: "Voyage is AskPEP's default, and the real choice is hosted or self-run",
      goal: "Should you call a hosted embedding service or run an open model yourself?",
      blocks: [
        {
          kind: "p",
          text: "AskPEP embeds with Voyage AI through a **hosted API**, a service you call over the network. It gives strong retrieval models, with no GPU of your own to run. Everything in this chapter applies to any other choice too. That includes the two sides, the dimension that sets storage cost, and re-embedding when the model changes.",
        },
        {
          kind: "p",
          text: "OpenAI embeddings and Cohere Embed are the other big hosted choices. Both offer models that handle many languages. Check each model's current dimensions, its input limit and whether it wants a separate input type for each side.",
        },
        {
          kind: "p",
          text: "An **open model** has published weights, so you can run it on your own hardware. **sentence-transformers** is a Python library that runs such models. **Ollama** is a tool that serves them on your own machine. BGE, E5 and nomic run on both. You keep your data and pay no per-call fee. You take on serving, batching and upgrades.",
        },
        {
          kind: "p",
          text: "Start hosted, and move only when privacy or volume forces it. Whatever you pick, pin the model name and version beside every vector. Run your golden set on two candidates before you decide. AskPEP keeps Voyage through the build in chapters twelve to fourteen, and chapter eleven teaches how to choose a whole stack.",
        },
        {
          kind: "p",
          text: "The table below mentions a **reranker** twice. That is the slower, sharper model from chapter two, which reorders the candidates and keeps the best few. Chapter seven builds one.",
        },
        {
          kind: "compare",
          caption: "Five embedding options. The model changes, the checklist does not.",
          columns: ["Tool", "Best at", "Switch to it when", "What it costs you"],
          rows: [
            [
              "Voyage AI",
              "Retrieval focused hosted models and a matching reranker.",
              "You want one vendor for embeddings and reranking.",
              "Per token cost and a network call at ingestion and query time.",
            ],
            [
              "OpenAI embeddings",
              "Easy start when you already use the platform.",
              "Your stack and billing already sit with OpenAI.",
              "Vendor lock to the vector space. Check dimension options.",
            ],
            [
              "Cohere Embed",
              "Multilingual text and a matching reranker.",
              "You serve several languages or want Cohere's rerank pairing.",
              "Another vendor, and input type settings to get right.",
            ],
            [
              "BGE, E5 or nomic via sentence-transformers",
              "Self-hosted models with no per call fee.",
              "Data cannot leave your network, or volume makes hosted cost hurt.",
              "You run the serving, and quality needs your own measurement.",
            ],
            [
              "Ollama",
              "Local models for development and small deployments.",
              "You want to prototype offline with no keys.",
              "Not built for high throughput. Check model support.",
            ],
          ],
        },
        {
          kind: "quiz",
          id: "rag-04-alt-q1",
          question: "You swap the embedding model and keep the old vectors in the index. What breaks?",
          options: [
            "Nothing, because cosine similarity is universal.",
            "Query vectors and stored vectors live in different spaces, so scores become meaningless.",
            "Only the reranker.",
            "Only the keyword index.",
          ],
          answer: 1,
          explain: "Each model defines its own vector space. Similarity is only meaningful between vectors from the same model, so a swap means re-embedding the corpus.",
        },
        {
          kind: "fold",
          tone: "industry",
          title: "Why vendors pair embeddings with rerankers",
          text: "Some providers sell an embedding model and a reranker together. The pairing is convenient. It is not a technical requirement, because a reranker reads text and never touches your vectors.",
        },
        {
          kind: "p",
          text: "The vendor is settled. The last section builds the client that calls it.",
        },
      ],
    },
    {
      id: "s7-client",
      title: "AskPEP's embedding client batches, retries and never lets a caller pick the wrong side",
      goal: "How does AskPEP's embedding client work, and how do you build it?",
      blocks: [
        {
          kind: "p",
          text: "AskPEP's embedding client sends text to Voyage and returns vectors. It uses `httpx`, a Python library for HTTP requests. Embedding a corpus takes many calls, and some will fail the first time. A client that treats calls as free and instant works in the demo. It fails on the first real corpus.",
        },
        {
          kind: "p",
          text: "The client starts from three settings in the environment: the API key, the model name and the dimension. `EMBED_DIM` sets the vector size, which matters for the Matryoshka models from section four. Its default is 1024. A missing key or model name stops the client at start-up, with an error that names the missing setting.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Model names are configuration",
          text: "Vendors rename and retire embedding models. Keep the name in an environment variable called `EMBED_MODEL`, and write it next to your vectors. Then a renamed model needs no code change, and a mismatch between the index and the query can be caught. AskPEP's code holds no model name.",
        },
        {
          kind: "p",
          text: "Callers never depend on Voyage directly. They depend on a small `Embedder` **protocol**, a list of methods an object must have. Any object with a matching `embed` method counts as an Embedder. So a test can pass in a fake, and another vendor could stand in without changing the callers.",
        },
        {
          kind: "p",
          text: "Three habits make the calls reliable.",
        },
        {
          kind: "list",
          items: [
            "Batch. Send many texts in one request. Limits on texts and tokens per request vary by vendor and model, so make the batch size a parameter. AskPEP's default is 64.",
            "Retry the right errors. A 429 means too many requests, and a status in the 500s means the server had a problem. Both deserve another try after a growing wait. A 400 means your request is wrong, and retrying it a hundred times will not help.",
            "Cache by content. Key each vector by a hash of the model, the input type and the text, so an unchanged chunk is never embedded twice.",
          ],
        },
        {
          kind: "p",
          text: "AskPEP's client leaves the cache out. Chapter two's design already skips any document whose content hash has not changed, so its chunks are not embedded again.",
        },
        {
          kind: "p",
          text: "Each batch comes back as a list of vectors. Each vector carries its position in the batch, in a field called `index`. Sort by that field before you trust the order. If the number of vectors differs from the number of texts, raise an error. Otherwise a vector could be paired with the wrong chunk.",
        },
        {
          kind: "p",
          text: "Two small functions keep the sides apart, as section three advised. `embed_query` embeds one question with the query type. `embed_chunks` embeds each chunk's `embedding_text`, the heading path joined to the chunk's text from chapter three, with the document type. It returns each chunk paired with its vector.",
        },
        {
          kind: "p",
          text: "Retries follow a fixed order. When a retry is due, look for a `Retry-After` header first, which is the server saying how many seconds to wait. If it is absent, double the wait after each failed try, which is called **exponential backoff**.",
        },
        {
          kind: "p",
          text: "A network error, where no response arrives at all, is retried the same way. A 400 or any other client error fails at once. When the last try fails, the client raises `ProviderError` with the status.",
        },
        {
          kind: "p",
          text: "Real systems also add **jitter**, a small random change to each wait, so that many workers do not retry in lockstep. AskPEP's client leaves jitter out, so its tests stay deterministic.",
        },
        {
          kind: "p",
          text: "The retry code takes the HTTP client and `sleep` as arguments. Passing a dependency in like this is called **injecting** it. A test injects a fake client and a fake `sleep`, so it runs at once and never touches the network.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "The retry decision, reduced to its core. The HTTP client and `sleep` are injected. The wait comes from the server when it says so.",
          code: "response = client.post(url, json=payload)  # client and sleep are arguments, so tests inject fakes\n# The lines below run only when the response is an error.\nstatus = response.status_code\nretryable = status == 429 or status >= 500\nif not retryable or attempt >= attempts:\n    raise ProviderError(f\"embedding request failed with status {status}\", status=status)\nretry_after = _retry_after_s(response)  # the Retry-After header in seconds, or None\nsleep(base_delay_s * 2 ** (attempt - 1) if retry_after is None else retry_after)  # Retry-After wins",
        },
        {
          kind: "p",
          text: "Interviewers often ask how you would embed ten million chunks reliably. It is a common warm-up for a system design round.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Embed ten million chunks reliably",
          text: "A strong answer covers batching, a cap on parallel calls under the rate limit, and retries with backoff. Checkpoints let a crash resume instead of restarting. Add a content hash cache, idempotent writes into the index and a cost estimate before you start. Mention that you would embed a sample first to check quality.",
        },
        {
          kind: "quiz",
          id: "rag-04-q7",
          question: "Which response should the embedding client retry?",
          options: [
            "400, the request body is invalid.",
            "401, the key is wrong.",
            "429, you are being rate limited.",
            "404, the endpoint does not exist.",
          ],
          answer: 2,
          explain: "A 429 is temporary by definition. The other three describe a request that will fail the same way every time, so retrying only wastes quota and time.",
        },
        {
          kind: "p",
          text: "You build this client in the chapter's lab, in the AskPEP repo you set up in chapter two. Its stub and tests are already there. Every step has tests, and they swap in a fake server, so nothing touches the network. Only the optional last step calls Voyage, with your own API key.",
        },
        {
          kind: "p",
          text: "The client hands chapter five a vector for every chunk, each made by one named model. A few hundred vectors are quick to search one by one. Chapter five asks what changes when there are millions.",
        },
      ],
    },
  ],
  lab: {
    title: "Write the embedding client",
    goal: "Fill in `src/askpep/providers.py`, in the AskPEP repo from chapter two. Chapter two's setup already copied in its stub and the tests in `tests/rag/test_providers.py`. The embedder batches, sets the input type and retries the right errors. Each stub raises `NotImplementedError(\"rag-04 step N\")`. A fake `httpx` client plays a script, so only the optional last step touches the network.",
    minutes: 40,
    files: ["src/askpep/providers.py", "tests/rag/test_providers.py"],
    steps: [
      {
        title: "Read the config and fail early",
        text: "Write `embedder_from_env`, which raises `rag-04 step 1`. It reads `VOYAGE_API_KEY`, `EMBED_MODEL` and `EMBED_DIM` (default 1024), and returns a `VoyageEmbedder`. Vendors rename models, so the name lives in config. A missing key or model raises `ValueError` naming it. Add a guard so `embed([])` returns `[]` with no request, above the step 3 raise.",
        code: `# src/askpep/providers.py
import os
from collections.abc import Mapping
from typing import Literal, Protocol

InputType = Literal["document", "query"]


# A Protocol lists the methods an object must have. Anything with a matching embed()
# counts as an Embedder, so a test fake can stand in for Voyage. Already in your stub.
class Embedder(Protocol):
    def embed(self, texts: list[str], input_type: InputType) -> list[list[float]]: ...


class VoyageEmbedder:
    # The stub's __init__ stores api_key, model and dim for now. Step 3 finishes it.
    def embed(self, texts: list[str], input_type: InputType) -> list[list[float]]:
        # your turn: return [] at once when texts is empty, before any request.
        # Leave the stub's raise below that guard. Step 3 replaces it.
        ...


def embedder_from_env(env: Mapping[str, str] = os.environ) -> VoyageEmbedder:
    # env is an argument, so a test can pass a plain dict instead of the real environment.
    # your turn:
    # 1. Read VOYAGE_API_KEY and EMBED_MODEL from env, and EMBED_DIM with a default of 1024.
    # 2. If the key or the model is missing or empty, raise ValueError naming it.
    # 3. Return VoyageEmbedder(api_key, model, dim).
    ...`,
        test: "uv run pytest tests/rag/test_providers.py -k ch04_s1",
      },
      {
        title: "Split the work into batches",
        text: "Write `batched(items, size)`, a generator that yields lists of at most `size` items, in order. A `size` below 1 raises `ValueError`. Its stub raises `rag-04 step 2`. Python 3.12 has `itertools.batched`, but it yields tuples, so write your own.",
        test: "uv run pytest tests/rag/test_providers.py -k ch04_s2",
      },
      {
        title: "Send the request",
        text: "Finish `VoyageEmbedder.__init__` and `embed`. Send each batch through `post_with_retry`, which POSTs JSON and returns the parsed reply, to `VOYAGE_EMBED_URL`. The reply's `data` lists objects with `embedding` and `index`. Sort by `index` before you trust the order. Raise `ProviderError` when the vector count is wrong. Its stub raises `rag-04 step 3`. Check Voyage's docs for field names.",
        code: `# src/askpep/providers.py
import httpx


class VoyageEmbedder:
    def __init__(
        self, api_key: str, model: str, dim: int, *, client: httpx.Client | None = None, batch_size: int = 64
    ):
        # your turn:
        # 1. Store batch_size too.
        # 2. If client is None, build httpx.Client(timeout=60). A test injects its own fake instead.
        # 3. Put the key on the client as the header "Authorization: Bearer <key>".
        ...

    def embed(self, texts: list[str], input_type: InputType) -> list[list[float]]:
        # your turn:
        # 1. Keep the empty-input guard from step 1.
        # 2. For each batch from batched(texts, self.batch_size), call
        #    post_with_retry(self.client, VOYAGE_EMBED_URL, payload).
        #    Until step 5 it sends one plain request.
        # 3. The payload holds input, model, input_type and output_dimension (self.dim).
        # 4. Sort data by "index", then add each item["embedding"] to the result.
        # 5. Raise ProviderError when the number of vectors differs from the batch size.
        ...`,
        test: "uv run pytest tests/rag/test_providers.py -k ch04_s3",
      },
      {
        title: "Wrap it so the side is never forgotten",
        text: "Write `embed_query(embedder, text)`, which returns one vector with the query type. Write `embed_chunks(embedder, chunks)`, which embeds each chunk's `embedding_text`, the heading path plus the text, with the document type. Return one `EmbeddedChunk` per chunk, in order. It pairs a `chunk` with its `vector`. Callers never pick the type. Both stubs raise `rag-04 step 4`.",
        test: "uv run pytest tests/rag/test_providers.py -k ch04_s4",
      },
      {
        title: "Retry the right errors",
        text: "Replace `post_with_retry(client, url, payload, attempts=5, base_delay_s=1.0, sleep=time.sleep)`, which raises `rag-04 step 5`. It tries up to five times, retrying 429, 5xx or `httpx.TransportError`. It waits `Retry-After` seconds, else `base_delay_s` doubled after each failure. Any other 4xx raises `ProviderError` at once, with its status. So does the last failure, with status 0 if none came. Tests pass their own `sleep`.",
        test: "uv run pytest tests/rag/test_providers.py -k ch04_s5",
      },
      {
        title: "Try it on the real API, then compare",
        text: "This live test sends two texts and a query to Voyage. Copy `.env.example` to `.env` and set `VOYAGE_API_KEY`. A plain run skips live tests, and `-m live` selects them. Add `-s` to see the printed scores. The test checks the vector size, and that the matching text scores higher. Then compare your file with `capstone/src/askpep/providers.py` in the my-learn folder.",
        test: "uv run pytest tests/rag/test_providers.py -m live -k ch04_s6",
      },
    ],
    verify: "uv run pytest tests/rag/test_providers.py -k ch04",
  },
  recap: [
    "An embedding places text at a point where nearness suggests a match. It measures shared topic, never truth.",
    "Cosine, dot product and Euclidean distance rank unit vectors identically, so use the dot product when your model normalises.",
    "Embed questions and chunks with the matching input type. Getting it wrong never crashes and always costs quality.",
    "Choose a model by recall at k on your own golden set. Raw storage is chunks times dimensions times bytes per number.",
    "Changing the model is a migration to a second index, with a test, an alias cutover and a rollback window. Never mix two models in one search path.",
    "A production client batches, retries 429s, 500s and network errors with backoff, and reads the model name from configuration.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In embeddings I learned that nearness means a match only while one model serves both sides. So I test models on my golden set and treat a model change as a migration. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["rag-q09", "rag-q10", "rag-q11", "rag-q12", "rag-q44"],
};

export default chapter;
