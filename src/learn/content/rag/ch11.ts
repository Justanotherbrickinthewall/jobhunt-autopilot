import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "rag-11-choosing-the-stack",
  course: "rag",
  number: 11,
  title: "Choosing the stack",
  tagline: "How do you choose each tool in the stack, and defend the choice to a customer?",
  minutes: 50,
  objectives: [
    "Choose any tool in three steps: write the constraints, pick the cheapest option that meets them, and name the signal that would make you switch.",
    "Give the default, the alternatives, the switch signal and the cost of switching for each layer of AskPEP, and say which layers are expensive to change.",
    "Choose a vector store by comparing pgvector, the cloud services, Qdrant, Pinecone, Weaviate, Milvus, Elasticsearch or OpenSearch and Chroma on running cost, filtering, hybrid retrieval, scale and tenancy.",
    "Say which questions justify a graph database such as Neo4j, and which ordinary search answers more cheaply.",
    "Decide how much of the pipeline to hand to a framework, judged by what the framework hides.",
    "Decide between a managed RAG service and your own build, and defend any tool choice in an interview.",
  ],
  sections: [
    {
      id: "s1-method",
      title: "Choose a tool in three fixed steps: constraints, cheapest fit, switch signal",
      goal: "How do you choose a tool so that anyone running the method gets the same answer?",
      blocks: [
        {
          kind: "p",
          text: "Chapter ten ended with a sheet of paper. Every answer on it assumed some tool: a vector store, a cache, a tracing backend, a platform. This chapter answers one question. How do you choose each tool in the stack, and defend the choice to a customer?",
        },
        {
          kind: "p",
          text: "Most tool arguments are taste in disguise. Someone read a blog post, and someone else used a tool at their last job. A forward-deployed engineer can't afford that, because the customer lives with the choice for years. You need a method that gives the same answer whoever runs it.",
        },
        {
          kind: "p",
          text: "This section builds the method. The next five apply it. Section two walks every layer of AskPEP. Section three takes the vector store, where the options differ most. Section four asks when a graph database earns its place. Section five weighs frameworks against your own code, and section six weighs a managed service against a build.",
        },
        {
          kind: "p",
          text: "The method has three steps, in this order. First, write down the constraints. Second, pick the cheapest option that meets them. Third, name the signal that would make you switch. A **switch signal** is a measured number that shows the choice has stopped working. Without one, nobody can say when the choice has failed, so nobody revisits it.",
        },
        {
          kind: "p",
          text: "Step one is where most of the work is. A **constraint** is a fact about the customer that any choice must respect. It is not a preference about the tool. This checklist covers almost every RAG decision.",
        },
        {
          kind: "list",
          items: [
            "Data size and growth: how many chunks today, and how many in a year.",
            "Latency target: the latency budget from chapter ten, and the share that retrieval gets.",
            "Filtering and permissions: how many filters, how selective they are, and whether search enforces each user's access.",
            "Update rate: documents that change hourly need a different store from documents that change quarterly.",
            "Team skills and existing systems: what the customer already runs and knows how to operate.",
            "Compliance and data residency: where data may live, and which vendors are already approved.",
            "Budget and vendor risk: the bill at ten times today's volume, and what happens if the vendor changes its terms.",
          ],
        },
        {
          kind: "p",
          text: "Step two is the discipline. List the options that meet every constraint. Then pick the one that is cheapest to run, cheapest to learn and cheapest to leave. Cheapest rarely means the lowest price. It means the fewest new systems, the fewest new skills and the least **lock-in**, which is the cost of moving to another vendor later.",
        },
        {
          kind: "p",
          text: "Step three turns a decision into a plan. A good switch signal is a number you can measure. One example is recall at 10 under the customer's real filters falling below its target. Another is the nightly index build no longer fitting its window. Write the signal down on the day you choose.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "The system the customer already runs is usually the cheapest fit",
          text: "A new database brings backups, upgrades, access control, monitoring and someone on call. Those costs are real, and they arrive after the demo. So spend novelty only where it buys something you can measure.",
        },
        {
          kind: "quiz",
          id: "c11s-q1",
          question: "A team wants to adopt a new vector database because it topped a benchmark blog post. Which step of the method did they skip?",
          options: [
            "Picking the cheapest option that meets the constraints, because they never wrote the constraints down.",
            "Naming the switch signal, because they chose a database at all.",
            "Measuring latency, because blog posts never report it.",
            "Choosing a managed service, because self-hosting always fails.",
          ],
          answer: 0,
          explain: "A benchmark is an answer to someone else's constraints. Without your own data size, filters, latency target and existing systems written down, you cannot say what 'meets them' means. So you cannot pick the cheapest fit.",
        },
        {
          kind: "fold",
          tone: "industry",
          title: "A one-page decision record",
          text: "Write each choice as a short record: the constraints, the options considered, the pick, the switch signal and the cost of switching. Keep it in the repository beside the code. When the customer asks in six months why you chose this, you have the answer. When the switch signal fires, you have the evidence.",
        },
        {
          kind: "p",
          text: "The method is the same at every layer. The stakes are not, because some choices are far harder to undo than others. Section two shows which.",
        },
      ],
    },
    {
      id: "s2-layers",
      title: "Layers whose output is stored are the expensive ones to change",
      goal: "Which layers of AskPEP deserve the most care when you choose?",
      blocks: [
        {
          kind: "p",
          text: "Here is the AskPEP stack, layer by layer. The default is the tool that chapters twelve to fourteen build with. The alternatives are the tools you will meet at customers. Many of them are managed, so the vendor runs the servers, as chapter five said.",
        },
        {
          kind: "compare",
          caption: "The AskPEP default and its alternatives at each layer. The vector store and the framework have their own sections.",
          columns: ["Layer", "Default", "Alternatives"],
          rows: [
            ["Parsing", "Plain Python, because the PEPs are reStructuredText", "`pypdf`, Unstructured, LlamaParse, Docling, Apache Tika, or cloud OCR such as Document AI or Textract"],
            ["Chunking", "A hand-written structure-aware splitter", "LangChain text splitters, LlamaIndex node parsers, semantic chunkers"],
            ["Embeddings", "Voyage AI, a hosted model", "Gemini, OpenAI or Cohere embeddings, or open models such as BGE and E5 run locally"],
            ["Sparse retrieval", "Postgres full text search with `ts_rank_cd`", "BM25 in Elasticsearch or OpenSearch, `pg_search` from ParadeDB, Azure AI Search, Vertex AI Search, `rank_bm25`"],
            ["Rerank", "Voyage rerank", "Cohere Rerank, the Vertex AI ranking API, or an open cross-encoder such as bge-reranker"],
            ["Generation", "Claude through the Anthropic SDK", "Gemini on Vertex AI, OpenAI, or open models served with vLLM or Ollama"],
            ["Evals", "pytest and a hand-written harness", "Ragas, DeepEval, promptfoo, TruLens, Arize Phoenix"],
            ["Observability", "Structured logs and a `traces` table", "Cloud Trace and Cloud Logging, Langfuse, Arize Phoenix, LangSmith"],
            ["Serving", "FastAPI with server-sent events", "Flask, Node with Hono, or a managed RAG service from section six"],
            ["Agent access", "An MCP server, built in chapter thirteen. MCP is the Model Context Protocol, a standard way for AI agents to call tools", "Plain tool calling, OpenAPI actions"],
            ["Deployment", "Cloud Run with Cloud SQL", "GKE or another Kubernetes cluster, Fly.io, Render, AWS ECS or Lambda with RDS"],
          ],
        },
        {
          kind: "p",
          text: "A default is only half a decision. The other half is when you would leave it, and what leaving would cost. The second table puts the layers in order of that cost, most expensive first.",
        },
        {
          kind: "compare",
          caption: "When to leave each default, and what leaving costs.",
          columns: ["Layer", "Switch when", "Cost of switching"],
          rows: [
            ["Embeddings", "Data may not leave the network, tokens cost too much, or your domain needs another model", "Highest. Every vector is recomputed and the index rebuilt, because query and chunk vectors must come from one model"],
            ["Chunking", "The golden set shows answers cut across chunk boundaries", "High. A full re-index, and chunk ids change, so citations and caches break unless you version them"],
            ["Parsing", "PDFs, scanned pages or complex tables arrive", "High for those documents. Re-parse and re-chunk them, and pay per page for hosted parsers"],
            ["Sparse retrieval", "Exact-term questions rank poorly on the golden set, or you need BM25 and analysers", "Medium. A second index to keep in sync, unless it lives in the same engine as your vectors"],
            ["Deployment", "The customer's cloud, security review or scale demands it", "Medium. The container moves easily. The networking, secrets and database do not"],
            ["Serving", "The customer's platform team standardises on another stack", "Medium. The retrieval code stays, and the wrapper and streaming layer are rewritten"],
            ["Generation", "Residency rules, cost per answer, or a measured quality gap on your eval", "Low to medium. Prompts need re-tuning, and citations and refusals must be tested again"],
            ["Rerank", "Latency, cost or data residency rules out a hosted reranker", "Low. It sits behind one function, so re-run the eval and re-check the latency budget"],
            ["Evals", "The team wants dashboards, shared datasets or built-in judge metrics", "Low if the golden set is plain data. High if it lives in a vendor's format"],
            ["Observability", "More than one service or team, or you need to search traces", "Low. Instrument once with OpenTelemetry, the open standard for traces, and the backend can change"],
            ["Agent access", "The client can't speak MCP", "Low. The tool is one function with a schema"],
          ],
        },
        {
          kind: "p",
          text: "Notice the pattern down the last column. Layers that sit behind one function are cheap to swap. Layers whose output is stored are expensive, because everything after them reads that stored data. Parsing, chunking and embeddings all sit before the index, so changing any of them means processing the corpus again.",
        },
        {
          kind: "p",
          text: "Embeddings top the list. You can swap a reranker in an afternoon. You cannot swap an embedding model without re-embedding the whole corpus. So the embedding model gets the most careful evaluation of any layer, and you put your effort where the exit is hardest.",
        },
        {
          kind: "quiz",
          id: "c11s-q2",
          question: "Which change is the most expensive to undo after launch?",
          options: [
            "Swapping the reranker for another hosted reranker.",
            "Changing the embedding model.",
            "Changing the observability backend when you use OpenTelemetry.",
            "Replacing the MCP wrapper with plain tool calling.",
          ],
          answer: 1,
          explain: "Embeddings are stored. A new model means re-embedding the whole corpus and rebuilding the index, and the old and new vectors cannot be mixed. The other three sit behind one function or one interface.",
        },
        {
          kind: "p",
          text: "Two layers were left out of these tables: the vector store and the framework. The vector store comes first, because its options differ most and a wrong pick hurts.",
        },
      ],
    },
    {
      id: "s3-vector-stores",
      title: "pgvector is the default vector store until filtering, scale or isolation says otherwise",
      goal: "When does pgvector stop being enough, and what do you move to?",
      blocks: [
        {
          kind: "p",
          text: "Chapter five taught how vector indexes work inside. This section is about choosing between the products that wrap them. Their data is stored, so the move away is costly, as section two showed.",
        },
        {
          kind: "p",
          text: "AskPEP's default is pgvector, the extension from chapter five that adds vector columns and vector indexes to Postgres. It earns the default for one reason. Your vectors sit beside your rows. So a permission check is a join, a delete is one transaction, and the customer probably runs Postgres already.",
        },
        {
          kind: "p",
          text: "Every other store is a candidate for when a specific constraint breaks that default. The tables compare them, and they need four terms first.",
        },
        {
          kind: "list",
          items: [
            "**Sharding** splits one index across several machines, so it can grow past one machine's memory.",
            "**Partitioning** splits one table into smaller tables, for example one per tenant, so each search scans less.",
            "**Multi-tenancy** means serving many tenants from one system. A tenant is one customer of a shared system, as chapter four said.",
            "**Row-level security** is a Postgres feature that hides from each user the rows they may not see.",
          ],
        },
        {
          kind: "p",
          text: "Features and prices change between releases. So check anything in these tables against current documentation before you promise it to a customer.",
        },
        {
          kind: "compare",
          caption: "How each store runs, scales and charges.",
          columns: ["Store", "Running it", "Scale", "Cost model"],
          rows: [
            ["pgvector", "Low if Postgres already runs. You own tuning and index builds", "One node's memory, stretched by partitions", "The Postgres you already pay for"],
            // CHECK: confirm the current product name and features of Vertex AI Vector Search. The documentation now files it under Gemini Enterprise Agent Platform.
            ["Vertex AI Vector Search", "Low. Google runs the servers", "Managed, on Google's ScaNN library", "The machines that serve the index, plus builds"],
            ["Qdrant", "Moderate to run yourself. A managed cloud exists", "Sharding and replication in distributed mode", "Your own servers, or managed cloud usage"],
            ["Pinecone", "Lowest. Fully managed, with no servers to run", "Managed scaling", "Usage-based, so price reads, writes and storage"],
            ["Weaviate", "Moderate to run yourself. A managed cloud exists", "Sharding and replication", "Your own servers, or managed cloud usage"],
            ["Milvus", "Highest when self-hosted, because a cluster has several parts. Zilliz, the company behind Milvus, sells a managed service", "Built to distribute very large collections", "A cluster, or managed usage"],
            // CHECK: confirm Azure AI Search tier limits, vector index options and semantic ranker availability against current Azure documentation.
            ["Azure AI Search", "Low. Microsoft runs it, and you choose a tier", "Set by tier, partitions and replicas", "Priced by tier and capacity"],
            ["Elasticsearch or OpenSearch", "Low if the customer runs it already. Moderate to high if it is new", "Proven at large scale, with sharding", "A cluster, or a managed service. Their licences differ, so check"],
            ["Chroma", "Lowest, since it can run inside your program", "Small to medium collections", "Free to run locally. A hosted option exists"],
          ],
        },
        {
          kind: "compare",
          caption: "How each store filters, mixes keyword and vector search, and keeps tenants apart.",
          columns: ["Store", "Filtering", "Hybrid retrieval", "Tenancy"],
          rows: [
            ["pgvector", "Full SQL. Iterative index scans ease the post-filtering trap", "Full text search in the same query", "Row-level security, partitions or schemas"],
            ["Vertex AI Vector Search", "Restricts. These are rules on text and numeric fields", "Dense and sparse, fused", "A tenant restrict, or one index per tenant"],
            ["Qdrant", "Filtering during search, on payload fields. Payload is Qdrant's word for metadata", "Dense and sparse, fused in one query", "A tenant field with its own index"],
            ["Pinecone", "Metadata filters at query time", "Dense and sparse vectors", "Namespaces, one per tenant"],
            ["Weaviate", "Filters combined with vector search", "Built-in BM25 and vector hybrid queries", "Built-in, with each tenant kept apart"],
            ["Milvus", "Filters on ordinary fields", "Dense and sparse fields in one search", "Databases, collections or a partition key"],
            ["Azure AI Search", "Filters on indexed fields", "Built in, with a semantic reranker", "A tenant field, or one index per tenant"],
            ["Elasticsearch or OpenSearch", "Strong. A mature query language", "BM25 and vector search in one mature engine", "An index per tenant, or a tenant filter"],
            ["Chroma", "Basic metadata filters", "Limited", "Collections, not built for many tenants"],
          ],
        },
        {
          kind: "p",
          text: "Here is how the decisions usually fall. If the customer runs Postgres and has a few million vectors, start with pgvector and write down the switch signal. If they run Elasticsearch or OpenSearch, use its vector search first.",
        },
        {
          kind: "p",
          text: "On Google Cloud, pgvector on Cloud SQL or AlloyDB comes first. Both are Google's managed Postgres services. Vertex AI Vector Search is the managed step up. On Azure, Azure AI Search gives hybrid retrieval as a managed service. If the customer runs neither and nobody wants to operate anything, a managed store such as Pinecone is the honest answer.",
        },
        {
          kind: "p",
          text: "The switch signals come down to three. Filtered queries lose recall or miss the latency budget. The index no longer fits in one machine's memory. Or tenants need a hard boundary that row filters can't give. Each has a cheaper fix inside pgvector to try first.",
        },
        {
          kind: "p",
          text: "For lost recall under filters, try chapter five's iterative index scans, which keep scanning until enough rows pass the filter. For memory, try partitioning or quantisation. For isolation, try a schema or a database per tenant. Move only when the measured number still misses.",
        },
        {
          kind: "widget",
          id: "c11s-store-recommender",
          intro: "Set the constraints for an imaginary customer, then predict which store you would reach for first before you reveal the answer. Change one constraint at a time and watch which one flips the pick. The systems the customer already runs usually matter more than you expect.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Chroma is for prototypes, whatever the tutorials show",
          text: "Chroma is excellent in a notebook. It is the wrong place to discover your permission model or your backup plan. Use it to prove an idea in an afternoon, then move the data to a store you can operate. Plan that move on day one.",
        },
        {
          kind: "quiz",
          id: "c11s-q3",
          question: "A customer has 2 million chunks, runs Postgres, filters on 3 simple fields and needs exact-term search on error codes. What is the sensible first design?",
          options: [
            "Pinecone for vectors and Elasticsearch for exact terms, for the best of each.",
            "Milvus, because it scales furthest.",
            "pgvector for vectors and Postgres full text search for terms, with the switch signals written down.",
            "Chroma, because it is simplest.",
          ],
          answer: 2,
          explain: "Every constraint is met by the system they already run, so it is the cheapest fit. The scale is far inside pgvector's comfort zone. Write down the signals, such as recall under filters, and move only if one fires.",
        },
        {
          kind: "quiz",
          id: "c11s-q4",
          question: "Which constraint most clearly pushes you off pgvector toward a different store?",
          options: [
            "The corpus has 800,000 chunks.",
            "The team already runs Postgres.",
            "Measured recall drops sharply under your real per-user filters, even after tuning the index and the query.",
            "A colleague prefers a dedicated vector database.",
          ],
          answer: 2,
          explain: "A measured failure under your own workload is a signal. A preference or a modest corpus size is not. Try the cheaper fixes first, such as tuning, partitioning and iterative index scans, and move only when the number still misses.",
        },
        {
          kind: "p",
          text: "Every store in this section finds chunks that look like the question. Some questions need something else: a chain of facts spread across many documents. Section four asks when that justifies a graph database.",
        },
      ],
    },
    {
      id: "s4-graph",
      title: "A graph database wins on multi-hop relationships and is overkill for most lookups",
      goal: "Which questions justify a graph database, and which does ordinary search answer more cheaply?",
      blocks: [
        {
          kind: "p",
          text: "A **knowledge graph** stores entities, such as people, services or PEPs, and the relationships between them. The relationships are called **edges**. A **graph database** stores that graph and answers queries by walking along the edges. Neo4j is the best-known one.",
        },
        {
          kind: "p",
          text: "Neo4j can also hold embeddings in a vector index, and text in a full-text index. So one query can combine a graph walk with a search. That combination is why it keeps coming up in RAG conversations.",
        },
        {
          kind: "p",
          text: "Here is the test. Does the answer depend on following two or more relationships and combining what you find? Chapter seven called this a multi-hop question, where the second search depends on the first answer. Vector search finds chunks that look like the question. No single chunk holds the whole chain, so search alone can't walk it.",
        },
        {
          kind: "p",
          text: "Take AskPEP. PEP headers can carry fields such as Requires and Superseded-By, which point to other PEPs. Load those links as edges. Then a question like \"which PEPs depend on PEP 484, directly or through other PEPs\" becomes a walk along them.",
        },
        {
          kind: "code",
          lang: "cypher",
          code: "MATCH (p:PEP)-[:REQUIRES*1..3]->(:PEP {number: 484})\nRETURN DISTINCT p.number, p.title\nORDER BY p.number",
          caption: "One query in Cypher, Neo4j's query language, follows Requires links up to three hops deep. In SQL this is a recursive common table expression, a query that refers to itself. It works, but it is clumsier to read and to extend.",
        },
        {
          kind: "p",
          text: "Customer questions of this kind are easy to name. Which services break if this one fails? Who owns the supplier of our supplier? Which accounts share a device, an address and a payee? Each is a question about relationships first and text second.",
        },
        {
          kind: "p",
          text: "Now the other side. Most enterprise questions are lookups: what is the refund policy, how do I reset this, what changed in version four. AskPEP's own questions, such as what PEP 8 says about line length, are lookups too.",
        },
        {
          kind: "p",
          text: "Good chunking, hybrid retrieval and a reranker answer lookups. A graph built for them adds a pipeline, a schema and upkeep, and gives no better answers. The costs are concrete.",
        },
        {
          kind: "list",
          items: [
            "Extracting a graph with a language model is expensive on a large corpus, and the extracted entities and edges contain errors you must evaluate.",
            "The graph needs a schema and a plan for updates and deletes, just as the vector index does.",
            "Many modest graphs fit in Postgres with a recursive query. Try that before adding a second database.",
            "GraphRAG, which chapter fifteen covers, builds a graph to answer summary questions about a whole corpus. That is a different job from multi-hop lookup.",
          ],
        },
        {
          kind: "p",
          text: "Interviewers often ask when a graph database is worth it. A strong answer names the test, gives an example and states the cost.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "When would you use a graph database for RAG",
          text: "Name the test: the answer needs two or more relationship hops and an aggregation. Give an example such as a dependency chain or an ownership structure. Then give the cost: extraction, schema and upkeep. Close by saying you would try a recursive query in the existing database first, and add a graph only when the traversal outgrows it.",
        },
        {
          kind: "quiz",
          id: "c11s-q5",
          question: "Which question is the strongest case for a graph database?",
          options: [
            "What is the notice period in the standard contract?",
            "Which of our suppliers share a parent company with a sanctioned entity, up to four ownership levels up?",
            "Summarise last quarter's support themes.",
            "Find the chunk that mentions the GIL.",
          ],
          answer: 1,
          explain: "Following ownership edges several levels deep and comparing the results is a graph walk. The other three are lookup, summarisation and keyword search, which hybrid retrieval and an LLM handle without a graph.",
        },
        {
          kind: "p",
          text: "So far every choice has been about where data lives. The code that joins the pieces together is a choice too. Section five asks whether a framework should write it.",
        },
      ],
    },
    {
      id: "s5-frameworks",
      title: "A framework is worth it only when it hides work you never need to debug",
      goal: "How much of the pipeline should you hand to a framework?",
      blocks: [
        {
          kind: "p",
          text: "A **framework** is a library that supplies the shape of your application as well as the parts. You call a library, while a framework calls you. For RAG, the question is what the framework hides. Hidden behaviour is where production bugs live, because you can't see it when an answer goes wrong.",
        },
        {
          kind: "p",
          text: "AskPEP hand-rolls its pipeline on purpose. Hand-rolled RAG is a few hundred lines of ordinary code, and you can read every prompt and every query. Chapter fourteen builds the same retrieval path in LlamaIndex, so you can compare the two yourself.",
        },
        {
          kind: "p",
          text: "Five frameworks come up most often, and each is built for a different job.",
        },
        {
          kind: "list",
          items: [
            "LlamaIndex loads, indexes and queries your own data. It has many data connectors and a hosted parser called LlamaParse.",
            "LangChain is a broad toolkit for chaining model calls, tools and retrievers, with a very large catalogue of integrations.",
            "LangGraph runs stateful workflows with branches, loops, saved progress and human approval. Its graph is a flowchart of steps, not a graph database.",
            "Haystack, from deepset, builds pipelines of typed components, aimed at production search.",
            "DSPy lets you declare what a step should do and how to score it. An optimiser then writes and tunes the prompts.",
          ],
        },
        {
          kind: "compare",
          caption: "What each framework hides. These projects change their abstractions often, so check the current version.",
          columns: ["Framework", "Hides", "Worth it when", "Cost"],
          rows: [
            ["LlamaIndex", "Chunking, prompts and retrieval settings", "You need many connectors fast", "Defaults you must read first. APIs change between versions"],
            ["LangChain", "Prompt assembly, callbacks and retries", "You need many integrations", "Long stack traces and frequent reorganisation, so pin versions"],
            ["LangGraph", "Little. You write the control flow as a graph", "The workflow pauses, loops or resumes", "A new model to learn. It sits at the centre of your code"],
            ["Haystack", "Component wiring and some defaults", "You want explicit, inspectable pipelines", "A smaller ecosystem than LangChain"],
            ["DSPy", "The prompt itself. An optimiser writes and tunes it", "You have a solid metric and labelled examples", "The eval must exist first. You lose direct control of the wording"],
          ],
        },
        {
          kind: "p",
          text: "Read the Hides column for the real trade. LlamaIndex hides retrieval settings. LangChain hides prompt assembly. DSPy hides the prompt itself. LangGraph hides the least, which makes it the easiest to defend when you need state.",
        },
        {
          kind: "widget",
          id: "c11s-framework-cost",
          intro: "Move the slider from fully hand-rolled to fully inside a framework, and watch what you gain and what you lose. Then pick a level for each of the three customer scenarios and check it. The right level changes with the customer, not with your taste.",
        },
        {
          kind: "p",
          text: "A framework pays for itself in four situations. You are building a throwaway prototype. You need many connectors and don't want to write them. The workflow has real state, so you would otherwise write your own state machine. Or the customer's team already uses it and will maintain it.",
        },
        {
          kind: "p",
          text: "It costs you when you can't see what ran. If you can't print the final prompt and the retrieved chunks for any query, you can't debug a wrong answer. Any framework you adopt must pass that test. Add tracing on day one, and keep your eval separate from the framework.",
        },
        {
          kind: "p",
          text: "One pattern works at most customers. Write your own **retrieve interface**: one thin function, with a plain signature, that every caller uses to search. Call framework parts behind it. The application and the evals depend on your function, so you can swap the parts without touching them.",
        },
        {
          kind: "quiz",
          id: "c11s-q6",
          question: "A customer's workflow retrieves documents, drafts a reply, waits days for a manager's approval, then resumes or loops. Which choice is the best fit?",
          options: [
            "A single hand-written script with the approval state kept in a global variable.",
            "A stateful graph framework such as LangGraph, or your own explicit state machine, with simple retrieval beneath it.",
            "DSPy, because it optimises prompts.",
            "A fully framework-managed retrieval engine with no tracing.",
          ],
          answer: 1,
          explain: "The hard part is durable state and branching, which graph-shaped orchestration handles well. Keep retrieval simple and visible underneath. DSPy tunes prompts, which is a different problem, and a global variable does not survive a restart.",
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "The silent upgrade",
          text: "Frameworks change defaults between versions. A different chunk size or a rewritten prompt template can change answers without raising an error. Pin versions, keep a golden set in CI, and treat a framework upgrade like a model change: run the eval before you merge.",
        },
        {
          kind: "p",
          text: "A framework still leaves you running the pipeline. A managed RAG service runs all of it for you. Section six asks when that beats your own build.",
        },
      ],
    },
    {
      id: "s6-managed",
      title: "Managed RAG usually wins or loses on what the customer already runs",
      goal: "When does a managed RAG service beat your own build, and how do you defend either choice?",
      blocks: [
        {
          kind: "p",
          text: "**Managed RAG** is a cloud service that does ingestion, chunking, embedding, indexing and retrieval for you, and often generation too. You will meet three most often: Google's Vertex AI Search and RAG Engine, Amazon Bedrock Knowledge Bases, and Azure AI Search.",
        },
        {
          kind: "compare",
          caption: "Managed RAG options. All three change quickly, so check features and regions before you propose one.",
          columns: ["Service", "Includes", "Best fit", "You give up"],
          rows: [
            ["Vertex AI Search and RAG Engine", "Managed search over company data. It has ready-made connectors", "Customers on Google Cloud or Workspace", "Fine retrieval control and portability"],
            ["Amazon Bedrock Knowledge Bases", "Ingestion from S3 and other sources, with chunking options and a choice of vector store. It has retrieve and retrieve-and-generate APIs", "AWS customers with data in S3", "Fine control of chunking, and portability"],
            ["Azure AI Search", "Keyword, vector and hybrid queries. It adds a semantic reranker and built-in embedding", "Azure and Microsoft 365 customers", "Model choice and portability"],
          ],
        },
        {
          kind: "p",
          text: "From the customer's side, the decision looks different. They have a cloud contract, a security team that has approved some vendors, and engineers who know one platform. A custom build on a new vendor means a new security review. A managed service inside their cloud often skips it.",
        },
        {
          kind: "list",
          items: [
            "Managed wins when speed matters, the platform team is small, security approval is the slow step, and the questions are ordinary lookups.",
            "A build wins when you need custom parsing, tight control of ranking, document-level permissions the service cannot express, or portability.",
            "Evaluation is the hidden cost of managed services. You still need a golden set, and you may not see the retrieved chunks the way you can in your own code.",
            "The bill at scale deserves a calculation. Per-query and per-document pricing can overtake the cost of running your own store.",
          ],
        },
        {
          kind: "p",
          text: "For a first engagement, the safest plan is to start with what the customer already runs. Prove the use case and build the golden set. Put your own retrieve interface in front of the service. If the evaluation shows the service caps quality, you swap what sits behind the interface, and the application doesn't change.",
        },
        {
          kind: "p",
          text: "Interviewers test the whole method with one question: why did you pick X over Y? A strong answer walks the three steps aloud, then adds what a wrong call would cost.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Why did you pick X over Y",
          text: "Answer in five steps. State the constraints that mattered. Name the options you considered. Say why X was the cheapest option that met the constraints. Name the signal that would make you switch to Y. Finish with what a wrong call would cost. Never say it was the industry standard, and never claim a benchmark you did not run.",
        },
        {
          kind: "quiz",
          id: "c11s-q7",
          question: "A customer is entirely on Google Cloud, uses Cloud Identity for sign-in and has one platform engineer. Their security review for new vendors takes four months. What do you propose first?",
          options: [
            "A self-hosted Milvus cluster for maximum scale.",
            "Vertex AI Search, with your own retrieve interface in front and a golden set to prove quality.",
            "Chroma on a developer laptop.",
            "A new third-party managed vector database, to avoid lock-in.",
          ],
          answer: 1,
          explain: "The constraints are staffing and vendor approval. Using the service already inside their cloud meets both. The retrieve interface and golden set keep the exit open if the evaluation says quality is capped.",
        },
        {
          kind: "quiz",
          id: "c11s-q8",
          question: "Which answer to 'why did you pick X over Y' is strongest in an interview?",
          options: [
            "X is the most popular choice, so it was the safe one.",
            "X topped a benchmark I read about.",
            "Given the customer's constraints, X was the cheapest option that met them. If recall under their filters fell below target, I would move to Y, and I wrote that signal down.",
            "I have used X before and I like it.",
          ],
          answer: 2,
          explain: "It names constraints, the cheapest fit, a measurable switch signal and a documented exit. The other answers rest on popularity, a number from someone else's workload, or taste.",
        },
        {
          kind: "p",
          text: "Every section of this chapter ran the same three steps. The hard part is telling a switch signal from a feeling, so practise on cases from every layer.",
        },
        {
          kind: "widget",
          id: "c11s-switch-signals",
          intro: "Eight situations from across this chapter are in front of you. For each, decide whether to stay put, measure first, or switch now, before the reasoning appears. Watch for the cases where the right move is to measure. Those are the ones that separate a signal from a feeling.",
        },
        {
          kind: "p",
          text: "Now it is time to build. Chapter twelve starts the searchable half of AskPEP with the defaults chosen here: Postgres with pgvector, Postgres full text search and your own ingestion code.",
        },
      ],
    },
  ],
  recap: [
    "Choose a tool in three steps: write the constraints, pick the cheapest option that meets them, and name the signal that would make you switch.",
    "Layers whose output is stored, above all embeddings, are the expensive ones to change, so evaluate them most carefully.",
    "pgvector is the default store when Postgres is already there. Leave it for a measured reason: filtered recall, memory or hard tenant isolation.",
    "A graph database earns its place on multi-hop questions about relationships, and is overkill for ordinary lookups.",
    "A framework is worth it when it hides work you never need to debug, so insist on seeing the prompt and the retrieved chunks.",
    "For managed RAG, the cloud the customer already runs usually decides, and your own retrieve interface keeps the exit open.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In choosing the stack I learned that a tool choice is a method, not a taste. The method is to write the constraints, pick the cheapest option that meets them, and name the signal that would make me switch. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["rag-q38", "rag-q39", "rag-q40", "rag-q47", "rag-q48"],
};

export default chapter;
