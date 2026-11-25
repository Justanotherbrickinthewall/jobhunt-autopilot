import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "rag-05-vector-stores",
  course: "rag",
  number: 5,
  title: "Vector stores and indexes",
  tagline: "How do you find the nearest vectors quickly once there are millions, and what does each shortcut cost you?",
  minutes: 45,
  objectives: [
    "Work out when checking every stored vector is fast enough, and when you need an index.",
    "Explain how HNSW walks a layered graph, and pick the setting to change when recall drops.",
    "Explain what IVF and product quantisation save, and what each one gives up.",
    "Combine a metadata filter with vector search without silently losing results.",
    "Choose the kind of store, from a flat file to a dedicated database, with reasons you could defend.",
    "Say why AskPEP uses pgvector, and name the measured problem that would justify each alternative.",
    "Build AskPEP's local store, which searches by brute force and filters first, and make it pass its tests.",
  ],
  sections: [
    {
      id: "s1-brute-force",
      title: "Checking every vector is exact, and fast enough for more data than you expect",
      goal: "When is checking every stored vector fast enough, and when do you need an index?",
      blocks: [
        {
          kind: "p",
          text: "Every section of this chapter answers part of one question. How do you find the nearest vectors quickly once there are millions, and what does each shortcut cost you? Chapter four ended with a vector for every chunk, each made by one named model. This section asks when the simplest search is enough.",
        },
        {
          kind: "p",
          text: "A **vector store** is a database that holds those vectors beside their chunks and metadata. Its main job is **nearest neighbour search**, which finds the stored vectors nearest to the query vector. You usually ask for the top k from chapter three, the k nearest chunks.",
        },
        {
          kind: "p",
          text: "The simplest answer compares the query vector with every stored vector and keeps the best k. This is **brute force** search, also called flat search. It is exact, because it never skips a vector. It needs no tuning and no build step.",
        },
        {
          kind: "p",
          text: "Its cost is easy to work out. One dot product between two 1024 dimensional vectors takes 1024 multiplications and additions. A million chunks means just over a billion operations per query, and the cost grows in a straight line with the corpus.",
        },
        {
          kind: "p",
          text: "**Vectorised** code hands the whole table of vectors to a fast numeric library such as NumPy, instead of looping in Python. With vectorised code, a fair rule of thumb holds. Below about a hundred thousand chunks, anything beyond brute force needs a reason. Plain Python loops slow down far sooner, so measure on your own hardware.",
        },
        {
          kind: "p",
          text: "AskPEP sits far below that line, with about seven hundred chunks from its 18 PEPs. An index would add build time, settings and a way to be wrong, and save almost nothing.",
        },
        {
          kind: "p",
          text: "Above that line, you need an index. Chapter one called the whole store an index. Inside a vector store, the word also names the structure that lets search skip most vectors. These are **approximate nearest neighbour** indexes, or **ANN** indexes. They sometimes miss a true neighbour, in exchange for looking at far fewer vectors.",
        },
        {
          kind: "p",
          text: "**Index recall** measures those misses. It is the share of the exact top k that the approximate index returned. You measure it by comparing the index with brute force on a sample of queries. So brute force stays useful at every scale, as the ground truth.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Two different things are both called recall",
          text: "Chapter three defined recall as the share of what you needed that you actually retrieved. Call that retrieval recall. A perfect index can still fail it, because the wrong chunks were nearest. Say which recall you mean, or a meeting will argue past itself.",
        },
        {
          kind: "quiz",
          id: "rag-05-q1",
          question: "Brute force search runs over 2 million vectors of 768 dimensions. About how many multiply and add operations does one query need?",
          options: ["1.5 million", "1.5 billion", "15 billion", "150 million"],
          answer: 1,
          explain: "2,000,000 times 768 is 1,536,000,000, about 1.5 billion. Optimised, vectorised code does this quickly, but the work still grows linearly with the corpus.",
        },
        {
          kind: "p",
          text: "Brute force is the standard every index is measured against. The next section covers the most common index, which walks a graph.",
        },
      ],
    },
    {
      id: "s2-hnsw",
      title: "HNSW finds neighbours by walking a layered graph, and efSearch sets how wide it looks",
      goal: "How does HNSW find neighbours, and which setting do you change when recall drops?",
      blocks: [
        {
          kind: "p",
          text: "**HNSW** stands for hierarchical navigable small world. It is the default index in most vector stores. It builds a **graph**, a set of points joined by links. Each stored vector becomes one point, linked to a few vectors near it.",
        },
        {
          kind: "p",
          text: "Search on the graph is **greedy search**. It starts at one point and keeps hopping to whichever linked point is closer to the query. It stops when no linked point is closer. On a single flat graph, that needs many short hops to cross a long distance.",
        },
        {
          kind: "p",
          text: "HNSW fixes that with layers. The idea comes from a **skip list**, a sorted list with extra layers of shortcuts on top. The top layer holds a few points with long links. Each lower layer holds more points. The bottom layer, layer zero, holds every point.",
        },
        {
          kind: "p",
          text: "Search enters at the top layer and hops greedily to the point nearest the query. Then it drops a layer and repeats from that point. Long jumps come first and fine steps last. Each point's top layer is drawn at random when it is inserted, so few points reach the top.",
        },
        {
          kind: "p",
          text: "Greedy search can stop at a **local minimum**. That is a point closer to the query than its linked points, but not the nearest overall. So on layer zero, HNSW keeps a **beam**, the best few candidates so far, and expands them all. The **beam width** is how many it keeps.",
        },
        {
          kind: "p",
          text: "A wider beam can escape a local minimum. The upper layers use a beam of one, which is plain greedy search. Three settings control the graph and the beam.",
        },
        {
          kind: "list",
          items: [
            "**M** is the number of links each point keeps on each layer, with twice as many allowed on layer zero. Higher M gives better recall on hard data, and costs memory and build time. A common default is 16.",
            "**efConstruction** is the beam width used while building. Higher builds a better graph more slowly. It is fixed once the index is built.",
            "**efSearch** is the beam width on layer zero at query time. It must be at least k. Higher gives better recall and slower queries, and it can change on every query.",
          ],
        },
        {
          kind: "widget",
          id: "c05-hnsw-walk",
          intro: "This is a tiny, simplified HNSW over forty four points. Pick a query and an ef value, then predict whether the walk ends on the true nearest point. Step through it and watch the layers change. The Trap preset at ef 1 stops at a local minimum, which is the failure efSearch exists to fix.",
        },
        {
          kind: "p",
          text: "Now the costs. The graph, and usually the vectors, live in memory. With four byte ids and M of 16, the layer zero links take about 128 bytes per point. A 1024 dimensional float32 vector takes 4096 bytes, so the vectors dominate.",
        },
        {
          kind: "p",
          text: "Inserts are incremental and cheap. Deletes are awkward, because removing a point breaks the paths through it. When recall drops on a live index, raise efSearch first. Changing M or efConstruction means a rebuild.",
        },
        {
          kind: "p",
          text: "Interviewers often ask how HNSW works, because the answer shows whether you could tune it on a live system.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Explain HNSW in two minutes",
          text: "Start with the skip list picture: layers, greedy descent, a beam on the bottom layer. Name the three parameters and say which ones are fixed at build time. State the trade: recall against latency against memory. Add one weakness, such as deletes or filtering. Finish by saying you would measure recall against brute force on your own data.",
        },
        {
          kind: "quiz",
          id: "rag-05-q2",
          question: "Production recall is too low on a live HNSW index, and rebuilding is expensive. Which setting do you try first?",
          options: [
            "M, the links per point.",
            "efConstruction, the build beam.",
            "efSearch, the query beam.",
            "The embedding dimension.",
          ],
          answer: 2,
          explain: "efSearch is a query-time setting, so you can raise it immediately and pay in latency. M and efConstruction shape the graph and need a rebuild.",
        },
        {
          kind: "quiz",
          id: "rag-05-q3",
          question: "You raise M from 16 to 64 on a large index. What grows?",
          options: [
            "Only query latency.",
            "Memory for the links and the build time, usually with better recall on hard data.",
            "Nothing, because M only affects the top layer.",
            "The embedding dimension.",
          ],
          answer: 1,
          explain: "Each point keeps more links on every layer, so the graph is larger and slower to build. Search also touches more neighbours per hop.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Why layers help",
          text: "The HNSW paper by Malkov and Yashunin reports search cost that scales roughly with the logarithm of the corpus size. The upper layers let the search cross the space in a few long hops. That behaviour is empirical and depends on the data. Very high dimensional data with no cluster structure is the hard case for every graph index.",
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "Recall slowly drops after months of churn",
          text: "Symptom: the same efSearch gives worse recall than it did at launch, after many updates and deletes. Many implementations mark deleted points instead of removing them, and heavy churn leaves the graph with weak paths. Measure recall against brute force on a sample on a schedule, and rebuild or compact the index when it slips.",
        },
        {
          kind: "p",
          text: "HNSW keeps every full vector in memory. When memory is the bill that matters, the next section's two techniques scan less and store less.",
        },
      ],
    },
    {
      id: "s3-ivf-pq",
      title: "IVF scans a few cells, and product quantisation shrinks every vector",
      goal: "What do IVF and product quantisation save, and what does each give up?",
      blocks: [
        {
          kind: "p",
          text: "An **IVF** index, short for inverted file, groups the vectors before any query arrives. It uses **k-means**, a clustering method that splits points into a chosen number of groups, here called cells. The number of cells is a setting called **nlist**. Each cell has a centre, its **centroid**, and every vector joins its nearest centroid's list.",
        },
        {
          kind: "p",
          text: "This clustering step is called **training**. It runs on a sample of your vectors before the index is filled. At query time, search compares the query with the centroids only. It picks the **nprobe** nearest cells and scans just their lists. So it scans roughly nprobe divided by nlist of the data.",
        },
        {
          kind: "p",
          text: "The risk is a cell border. A true neighbour can sit just across it, in a list the search never opened. Raising nprobe buys recall and costs latency. At nprobe equal to nlist, search scans everything, which is brute force plus overhead.",
        },
        {
          kind: "widget",
          id: "c05-ivf-probes",
          intro: "Ninety points are split into six cells. Predict how many of the true five nearest neighbours the search finds when it probes one cell. Then raise nprobe to the smallest value that finds all five, and compare the cost. Try the other presets to see where borders hurt.",
        },
        {
          kind: "p",
          text: "Take nlist from your library's guidance. A common start is a small multiple of the square root of the vector count. Cells also go stale. If new data drifts from the old centroids, the lists become unbalanced and you retrain.",
        },
        {
          kind: "p",
          text: "**Product quantisation**, or PQ, saves memory instead of time. Chapter four's quantisation stored each number in fewer bits. PQ goes further, and replaces whole pieces of a vector with a one-byte code.",
        },
        {
          kind: "p",
          text: "It cuts each vector into equal pieces. For each piece position, k-means learns a **codebook** of 256 representative pieces. Each piece is then stored as the byte that names its nearest representative.",
        },
        {
          kind: "p",
          text: "Do the sum. A 1024 dimensional float32 vector takes 4096 bytes. Cut into 64 pieces of one byte each, it takes 64 bytes. That is 64 times smaller. Distances are now estimated from lookup tables, so they are approximate. The usual fix is to rescore the best candidates with their full vectors.",
        },
        {
          kind: "compare",
          caption: "The main index families. None is best, and each answers a different pressure.",
          columns: ["Index", "Memory", "Recall control", "Operational catch", "Pick it when"],
          rows: [
            ["Flat, brute force", "Full vectors", "Exact, nothing to tune", "Linear cost per query", "Small corpora, and as the ground truth for measuring other indexes."],
            ["HNSW", "Full vectors plus the graph, in memory", "efSearch at query time", "Deletes are awkward, builds are slow", "The corpus fits in memory and you want low latency with little tuning."],
            ["IVF flat", "Full vectors plus centroids", "nprobe at query time", "Needs training, and retraining when data drifts", "Large corpora where a simple scheme is enough."],
            ["IVF with PQ", "Tiny compressed codes", "nprobe, plus rescoring", "Lossy, so you rescore with full vectors", "Memory is the bill that matters, at very large scale."],
          ],
        },
        {
          kind: "callout",
          tone: "insight",
          title: "A sensible order of preference",
          text: "Start with flat search, because it is exact and free. Move to HNSW when the corpus outgrows it but still fits in memory, because HNSW is the easiest index to live with. Use IVF with PQ only when the memory bill forces you. Starting with the most compressed index loses recall for nothing.",
        },
        {
          kind: "quiz",
          id: "rag-05-q4",
          question: "An IVF index misses true neighbours at nprobe 8, and your latency budget has room. What do you try first?",
          options: [
            "Raise nprobe.",
            "Lower nlist to one.",
            "Switch the metric to Euclidean.",
            "Re-embed the corpus.",
          ],
          answer: 0,
          explain: "More probes means more cells scanned, which finds neighbours across borders. It is the query-time recall knob, like efSearch for HNSW.",
        },
        {
          kind: "quiz",
          id: "rag-05-q5",
          question: "A 1024 dimensional float32 vector is compressed to 64 one-byte PQ codes. What is the compression ratio?",
          options: ["4 times", "16 times", "64 times", "1024 times"],
          answer: 2,
          explain: "The original takes 1024 times 4, which is 4096 bytes. The compressed form takes 64 bytes. 4096 divided by 64 is 64.",
        },
        {
          kind: "fold",
          tone: "industry",
          title: "Cheaper numbers, and graphs on disk",
          text: "Scalar quantisation stores each number as an 8 bit integer for a four times saving over float32. Binary quantisation keeps one bit per dimension for thirty two times. Both usually pair with rescoring from full vectors. DiskANN, from Microsoft Research, keeps a graph index on SSD so memory is no longer the limit. Support varies by store, so check yours.",
        },
        {
          kind: "p",
          text: "Every index so far searches the whole corpus. Real queries often want only part of it, and that is where approximate search breaks.",
        },
      ],
    },
    {
      id: "s4-filtering",
      title: "Filtering is where approximate search quietly breaks",
      goal: "How do you combine a metadata filter with vector search without losing results?",
      blocks: [
        {
          kind: "p",
          text: "Real queries come with conditions. A question may be about PEP 572 alone. A tenant, one customer of a shared system, may see only its own documents. A **metadata filter** turns such a condition into a test on each chunk's metadata. Metadata is the facts about the text, such as its title, source and date.",
        },
        {
          kind: "p",
          text: "A filter is **selective** when it keeps only a small share of the documents. There are three ways to combine a filter with vector search, and selectivity decides which one works.",
        },
        {
          kind: "list",
          items: [
            "**Post-filtering** runs the vector search first, then drops results that fail the filter. It is simple, and it can return fewer than k results, even none.",
            "**Pre-filtering** applies the filter first and searches only what passes. In a graph index, the points that pass may no longer be linked, so the walk can stall.",
            "**Filtering during search** walks the graph as usual, but counts only matching points as results. Good stores do this, and scan the matches directly when the filter is very selective.",
          ],
        },
        {
          kind: "p",
          text: "Post-filtering's shortfall is easy to calculate. The index first fetches a **candidate pool**, the candidates from chapter two: the records whose vectors sit closest to the query vector. Then the filter runs. To expect k survivors, the pool must hold about k divided by the share that matches.",
        },
        {
          kind: "p",
          text: "Five results at ten percent needs about fifty candidates. At one percent it needs five hundred, and the speed you bought the index for is gone.",
        },
        {
          kind: "widget",
          id: "c05-filter-trap",
          intro: "A hundred and twenty documents sit on a plane, and only some match the filter. Predict how many of five results post-filtering returns. Then raise the candidate pool until it returns five, and try the other two strategies. Watch how many documents each one has to look at.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Permissions are filters",
          text: "Chapter one's filtering by permission is a metadata filter too. Post-filtered, it returns empty answers for small tenants and good ones for large tenants. The usual patch, a bigger pool, slows everyone down. A bug that skips the filter leaks documents. Chapter ten treats access control properly.",
        },
        {
          kind: "quiz",
          id: "rag-05-q6",
          question: "You ask for 5 results. One percent of documents match your filter. The index fetches 50 candidates and then filters. How many results do you expect on average?",
          options: ["Five", "About two", "Fewer than one", "Exactly fifty"],
          answer: 2,
          explain: "One percent of 50 candidates is half a document on average. Often you get none. The pool would need to be about 500 to expect five.",
        },
        {
          kind: "quiz",
          id: "rag-05-q7",
          question: "Retrieval works well for large tenants and returns nothing for small ones. What is the most likely cause?",
          options: [
            "The embeddings are too short.",
            "Post-filtering over a candidate pool that rarely contains small tenants' documents.",
            "The metric is cosine instead of dot product.",
            "The corpus is too small for an index.",
          ],
          answer: 1,
          explain: "A selective filter removes almost every candidate when the pool is chosen before filtering. Pre-filtering or in-search filtering fixes it.",
        },
        {
          kind: "p",
          text: "Interviewers often ask how you filter by metadata in vector search. A good answer names the shortfall before anyone asks.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How do you filter by metadata in vector search",
          text: "Name the three strategies and the failure of each. Post-filtering can return too few results. Pre-filtering can break graph connectivity. Filtering during search needs a planner that adapts to selectivity. Then tie it to a real requirement, such as tenant isolation, and say what you would log to catch a shortfall.",
        },
        {
          kind: "fold",
          tone: "industry",
          title: "What pgvector does about it",
          text: "pgvector's approximate indexes return candidates first, then the WHERE clause removes rows, so a selective filter can give fewer rows than your LIMIT. Release 0.8 added iterative index scans that keep scanning until enough rows pass. Settings and defaults change between versions, so read the current documentation. Qdrant documents a planner that picks a strategy from the estimated match count.",
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "Results fewer than k, only sometimes",
          text: "Symptom: the answer prompt sometimes has two chunks instead of five. Log the number of results returned next to k, per filter value. If the count dips for specific tenants or categories, you have a post-filter shortfall. Alert on it, then choose a store that filters during search.",
        },
        {
          kind: "p",
          text: "You have seen what each index and filter strategy costs. The next section asks which kind of store should carry those costs.",
        },
      ],
    },
    {
      id: "s5-choosing",
      title: "Start with the boring store and move only when a measurement forces you",
      goal: "Which kind of store should hold your vectors?",
      blocks: [
        {
          kind: "p",
          text: "Four kinds of store are realistic, and each suits a different situation.",
        },
        {
          kind: "list",
          items: [
            "A flat file searched by brute force needs no infrastructure and gives exact results. It suits a lab, a prototype or a corpus under about a hundred thousand chunks. It has no answer for several writers at once.",
            "**pgvector** is an extension that adds vector columns and vector indexes to **Postgres**, the widely used open-source relational database. You keep transactions, joins, access rules and backups in one place. It suits a team that already runs Postgres, with a modest corpus.",
            "A dedicated vector database is built for heavy filtering, compression, data spread across machines and high query rates. The price is another system to run or buy.",
            "A search engine with vectors, such as Elasticsearch or OpenSearch, does keyword and vector search in one place. It is heavier to run, and it suits teams that need strong keyword search too, as chapter six argues you should.",
          ],
        },
        {
          kind: "p",
          text: "Five questions decide it. How many vectors will you hold in a year? How selective are your filters, and do you filter by permission? How often do documents change or get deleted? Do you need keyword search alongside? And who will run it at three in the morning?",
        },
        {
          kind: "p",
          text: "Most teams should start with a flat file or pgvector. Move when you can show a measured problem in recall, latency or cost. A new store rarely fixes poor retrieval. If a chunk was cut badly, or never ranks near the top, no index will find it.",
        },
        {
          kind: "p",
          text: "Whatever you pick, write the model name and the vector dimension next to the data. Then refuse to query an index built by a different model. That one check enforces chapter four's rule: never mix embedding spaces in one search path.",
        },
        {
          kind: "quiz",
          id: "rag-05-q8",
          question: "A team of 40 has 300,000 chunks, already runs Postgres, and needs strict per-user permissions. What is the sensible first choice?",
          options: [
            "A new sharded vector cluster, for headroom.",
            "pgvector in the existing database, with permission filters in SQL.",
            "A flat file on each laptop.",
            "Binary quantised vectors with no metadata.",
          ],
          answer: 1,
          explain: "The corpus is modest, the permissions live in relational data, and operating one more system has a real cost. Measure first, and move to something dedicated if a number forces you.",
        },
        {
          kind: "fold",
          tone: "industry",
          title: "Libraries versus databases",
          text: "FAISS, hnswlib and ScaNN are libraries. They give you an in-memory index, and durable storage, filtering and updates are mostly your problem. pgvector, Qdrant, Weaviate, Milvus and Pinecone are databases or database extensions. They wrap similar algorithms with storage, metadata filters, replication and an API. When someone says they use FAISS, ask what handles the filtering and the deletes.",
        },
        {
          kind: "p",
          text: "That settles the kind of store. The next section names the products, and says why AskPEP's build uses pgvector.",
        },
      ],
    },
    {
      id: "s-alternatives",
      title: "pgvector is the default until filtering or scale says otherwise",
      goal: "Which product should you pick, and what measured problem would justify leaving pgvector?",
      blocks: [
        {
          kind: "p",
          text: "The AskPEP build in chapters twelve to fourteen stores vectors in Postgres, with pgvector and an HNSW index. In production that database is Cloud SQL for PostgreSQL. It is **managed**, so Google runs the servers. The index sits beside the chunks, their metadata and their permissions, so there is one system to back up.",
        },
        {
          kind: "p",
          text: "Qdrant, Weaviate and Milvus are dedicated vector databases you can run yourself. Qdrant is known for filtering, and calls metadata its payload. Weaviate bundles hybrid search, keyword plus vector, which chapter six covers. Milvus targets very large collections. Pinecone is managed only, with no version you run yourself.",
        },
        {
          kind: "p",
          text:
            // CHECK: confirm current Vector Search index types, filter limits and pricing model. The Google docs overview names no index types.
            "Google Cloud's hosted option is Vector Search on the Gemini Enterprise Agent Platform, formerly Vertex AI Vector Search. It handles vector search, keyword-style search and a mix of the two, with filtering. Pick it when the customer builds on Google Cloud. " +
            // CHECK: confirm current Azure AI Search vector index types, semantic ranker availability and tier limits.
            "Azure AI Search is the Azure equivalent. Pick it when the customer builds on Azure.",
        },
        {
          kind: "p",
          text: "Switch for a measured reason. Filtered queries that lose recall are a good reason. So is an index that no longer fits in memory, or a write rate Postgres cannot absorb. A feature list is not. Chapter eleven teaches how to choose a whole stack.",
        },
        {
          kind: "compare",
          caption: "Nine stores. Start in the first row and leave only for a measured reason.",
          columns: ["Tool", "Best at", "Switch to it when", "What it costs you"],
          rows: [
            ["pgvector on Cloud SQL for PostgreSQL", "One database for vectors, metadata, joins and access rules.", "Never, until filtering recall or scale forces a move.", "Your Postgres sets the ceiling. Filter behaviour needs care."],
            ["Vector Search on Gemini Enterprise Agent Platform", "A hosted service for vector, keyword-style and hybrid search, with filtering.", "The customer is already on Google Cloud and wants a managed service.", "Google Cloud only, and priced by usage."],
            ["Qdrant", "Filtered search and quantisation, self-hosted or managed.", "Heavy metadata filters hurt pgvector recall.", "A second system to run and keep in sync."],
            ["Weaviate", "Built-in hybrid search and modular vectorisers.", "You want hybrid retrieval inside the vector store.", "Its own schema and operations model."],
            ["Pinecone", "Managed service with no servers to run.", "You want a hosted store and accept the bill.", "Managed only. Keeping data in your own cloud account needs its enterprise plan."],
            ["Milvus", "Very large collections and several index types.", "Your corpus reaches a scale one Postgres cannot hold.", "The most operational complexity of the group."],
            ["Elasticsearch or OpenSearch", "Keyword and vector search in one engine.", "You already run it and want one search stack.", "Cluster operations, and vector features vary by version."],
            ["Chroma", "Fast local prototypes.", "You are exploring, not shipping.", "Not the first choice for production load."],
            ["Neo4j", "Graph traversal combined with vector search.", "Relationships between entities drive your questions.", "A graph model to design and maintain."],
          ],
        },
        {
          kind: "quiz",
          id: "rag-05-alt-q1",
          question: "Your filtered queries return too few results from pgvector. What is the most likely reason to evaluate a dedicated store?",
          options: [
            "The embeddings are too long.",
            "Filtering after the approximate search discards candidates, and a store with filter-aware search may recover them.",
            "Postgres cannot store floats.",
            "HNSW only works in memory.",
          ],
          answer: 1,
          explain: "This is the filtering trap from this chapter. If the filter runs after the nearest neighbour search, many candidates fail it. Check how your version of pgvector handles filtered search before you switch.",
        },
        {
          kind: "fold",
          tone: "industry",
          title: "Vector database versus vector feature",
          text: "Many databases now include vector search. The question is whether it is a feature added to a general database or the core of the product. Run your own filtered queries against each and measure recall.",
        },
        {
          kind: "p",
          text: "Those are the stores you will meet on client work. AskPEP's labs start with the simplest of them, which the last section builds.",
        },
      ],
    },
    {
      id: "s7-local-store",
      title: "AskPEP's first store is a flat file, searched by brute force with the filter first",
      goal: "How does AskPEP's local store work, and how do you build it?",
      blocks: [
        {
          kind: "p",
          text: "AskPEP's labs keep their vectors in a flat file. About seven hundred chunks sit far below the line where an index pays off. So the local store is one JSON file of chunks and vectors, searched by brute force.",
        },
        {
          kind: "p",
          text: "It stays useful after this chapter. Chapter six adds keyword search to it, and the build in chapters twelve to fourteen keeps it for runs with no database. Three rules shape it.",
        },
        {
          kind: "list",
          items: [
            "Loading checks that every vector has the same length, because failing at load time is cheaper than failing at query time.",
            "Search scores with cosine similarity from chapter four. A zero vector has no direction, so it scores zero instead of crashing the search.",
            "The filter runs before scoring. That is pre-filtering, and with brute force it costs nothing, so the post-filter shortfall never shows.",
          ],
        },
        {
          kind: "p",
          text: "You build this store in the chapter's lab, in the AskPEP repo from chapter two. Its stub and tests are already there, and none of them needs an API key. An optional step times the search on your own machine.",
        },
        {
          kind: "p",
          text: "Every search in this chapter compares meaning. It can still miss a question that names an exact string, such as PEP 572 or a function name. Chapter six adds a second search for exact words, and combines the two.",
        },
      ],
    },
  ],
  lab: {
    title: "Build the vector store",
    goal: "Fill in `src/askpep/local_store.py`, in the AskPEP repo from chapter two. Chapter two's setup already copied in its stub and the tests in `tests/rag/test_local_store.py`. Its stubs raise `NotImplementedError(\"rag-05 step N\")` until you replace them. You save and load embedded chunks as JSON, and search them by brute force cosine with an optional metadata filter. The last step runs your loader, chunker and embedding code from chapters two to four, so finish those labs first. Each test command runs `uv run pytest`, and `-k` keeps only the tests whose names contain that text.",
    minutes: 35,
    files: ["src/askpep/local_store.py", "tests/rag/test_local_store.py"],
    steps: [
      {
        title: "Save and load",
        text: "Replace `save_store` and `load_store`. Both raise `rag-05 step 1`. Each entry is an `EmbeddedChunk`: a chunk plus its vector. Failing at load time is cheaper than failing at query time. So load raises `ValueError` when the vectors disagree on length, or differ from `dim` when you pass one. The tests check a save then load round-trip.",
        code: `# src/askpep/local_store.py
import json
from dataclasses import asdict
from pathlib import Path

from askpep.types import Chunk, EmbeddedChunk


def save_store(path: Path, entries: list[EmbeddedChunk]) -> None:
    # your turn:
    # 1. create the parent folders if they are missing
    # 2. write the whole list as JSON, using asdict(entry) for each entry
    ...


def load_store(path: Path, *, dim: int | None = None) -> list[EmbeddedChunk]:
    # your turn:
    # 1. parse the file, and raise ValueError unless it holds a list
    # 2. rebuild each entry: Chunk(**data["chunk"]), then EmbeddedChunk(chunk, data["vector"])
    # 3. raise ValueError if the vectors differ in length, or differ from dim when you pass one
    ...`,
        test: "uv run pytest tests/rag/test_local_store.py -k ch05_s1",
      },
      {
        title: "Dot product and cosine",
        text: "Write `dot(a, b)` and `cosine(a, b)`. Both stubs raise `rag-05 step 2`. Both raise `ValueError` on mismatched lengths. The cosine of a zero vector must be 0. Dividing by its zero length would raise `ZeroDivisionError` and break the whole search. The tests check known vectors, the zero vector and mismatched lengths.",
        code: `# src/askpep/local_store.py
import math


def dot(a: list[float], b: list[float]) -> float:
    # your turn: raise ValueError if the lengths differ, else sum the pairwise products
    ...


def cosine(a: list[float], b: list[float]) -> float:
    # your turn:
    # 1. denominator = math.sqrt(dot(a, a)) * math.sqrt(dot(b, b))
    # 2. return 0.0 when the denominator is 0, else dot(a, b) / denominator
    ...`,
        test: "uv run pytest tests/rag/test_local_store.py -k ch05_s2",
      },
      {
        title: "Top k by brute force",
        text: "Start `cosine_search(entries, query_vector, k=5, filter=None)`, which raises `rag-05 step 3`. It returns the best `k` hits, best first. A `Hit` holds a chunk, its score and `via`, which names the search that found it. Here `via` is `\"dense\"`, chapter six's name for embedding search. Build each from `entry.chunk`, without the vector. Ties keep store order, because `sorted` is stable. A `k` of 0 or less returns nothing. Leave `filter` for step 4.",
        test: "uv run pytest tests/rag/test_local_store.py -k ch05_s3",
      },
      {
        title: "Filter before you cut",
        text: "Add `filter` to `cosine_search`. It is a mapping such as `{\"doc_id\": 572}`, or a function from `Chunk` to `bool`. Keys are `doc_id`, `title` and `source`, and a list value means any of. Any other key raises `ValueError`. Apply it before scoring, so you still get `k` results. Pre-filtering is free here, so section four's shortfall never shows.",
        test: "uv run pytest tests/rag/test_local_store.py -k ch05_s4",
      },
      {
        title: "Optional: find where brute force stops being fine",
        test: "uv run pytest tests/rag/test_local_store.py -k ch05_s5 -s",
        text: "The `-s` flag stops pytest hiding printed output, so you see the timings. The test times `cosine_search` on random vectors at 250, 500, 1000 and 2000 chunks. The snippet below measures larger sizes. Plot the numbers on paper. They tell you when the HNSW section of this chapter starts to matter for you.",
        code: `# scratch/time_search.py, run it with: uv run python scratch/time_search.py
import random
import time

from askpep.local_store import cosine_search
from askpep.types import Chunk, EmbeddedChunk

DIM = 1024
query = [random.random() - 0.5 for _ in range(DIM)]
for n in (1_000, 5_000, 10_000):  # lists of floats use a lot of memory, so grow slowly
    entries = [
        EmbeddedChunk(
            Chunk(1, i, "PEP 1", "https://peps.python.org/pep-0001/", ["PEP 1"], "", 0, 0, 0),
            [random.random() - 0.5 for _ in range(DIM)],
        )
        for i in range(n)
    ]
    start = time.perf_counter()
    cosine_search(entries, query, k=5)
    print(f"{n:>6} entries: {(time.perf_counter() - start) * 1000:.0f} ms")`,
      },
      {
        title: "Compare against your reference",
        test: "uv run pytest tests/rag/test_local_store.py -k ch05_s6 -s",
        text: "The test searches the fixture corpus, five ready-made PEPs. `FakeEmbedder` hashes words into vectors and needs no key. The test prints the top three hits for four queries and checks the best comes from the right PEP. It runs your `load_documents`, `chunk_all` and `embed_chunks`. Then read `capstone/src/askpep/local_store.py` in the my-learn folder, and see why the filter runs before scoring.",
      },
    ],
    verify: "uv run pytest tests/rag/test_local_store.py -k ch05",
  },
  recap: [
    "Brute force is exact and costs chunks times dimensions per query. With vectorised code it is usually enough below about a hundred thousand chunks.",
    "HNSW is a layered graph. Upper layers make long jumps, and layer zero uses a beam of efSearch. M and efConstruction need a rebuild, and efSearch does not.",
    "IVF scans the nprobe nearest cells and can miss neighbours across borders. Product quantisation shrinks vectors to codebook ids, so you rescore the best candidates with full vectors.",
    "Post-filtering needs a candidate pool of about k divided by the matching share, or it returns too few results. Permissions are filters.",
    "Start with a flat file or pgvector, and move only when a measurement of recall, latency or cost forces you.",
    "AskPEP's local store filters before it scores, which costs nothing with brute force and always fills k when k chunks match.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In vector stores I learned that fast nearest neighbour search is approximate. So every index trades recall against latency and memory, and a metadata filter can silently empty the results. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["rag-q13", "rag-q14"],
};

export default chapter;
