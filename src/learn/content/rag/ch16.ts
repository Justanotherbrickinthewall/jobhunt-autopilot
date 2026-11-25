import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "rag-16-system-design",
  course: "rag",
  number: 16,
  title: "RAG system design for interviews",
  tagline: "How do you design a RAG system out loud, against a clock, and defend every choice you make?",
  minutes: 40,
  objectives: [
    "Run the six moves in order, and say what the interviewer tests in each.",
    "Ask the few clarifying questions that change the design, and state the rest as assumptions.",
    "Size load, storage and tokens on the board, and say what the numbers mean.",
    "Sketch both paths of a complete baseline, with permissions in each.",
    "Choose where to go deep by risk, and say each trade-off as a choice with a price.",
    "Finish every design with a measurement plan and a plan for running it.",
    "Design an internal docs assistant for 5,000 employees with access set per document.",
    "Design a support copilot over tickets and a knowledge base, and defend its trade-offs.",
    "Reframe a design for a customer, and rescue a system that gives wrong answers.",
    "Run all six moves alone on a fresh brief, and check your page against a list.",
  ],
  sections: [
    {
      id: "s1-framework",
      title: "A design interview runs on six moves, taken in the same order every time",
      goal: "What is the interviewer testing, and how do you spend the 45 minutes?",
      blocks: [
        {
          kind: "p",
          text: "Chapter fifteen ended with choosing patches out loud and defending their costs. This chapter is where that happens. In a **system design interview**, you get a one-line brief and design the system aloud while the interviewer probes.",
        },
        {
          kind: "p",
          text: "This chapter answers one question. How do you design a RAG system out loud, against a clock, and defend every choice you make? There is no single right answer. The interviewer is watching how you think when the brief is vague, and whether each choice comes with its cost.",
        },
        {
          kind: "p",
          text: "Use six moves in the same order every time: **clarify**, **size**, **sketch**, **deep-dive**, **evaluate** and **operate**. Each move feeds the next, so the order matters. A fixed order also frees your mind for the content. The table gives each move and its trap.",
        },
        {
          kind: "compare",
          caption: "Minutes assume a 45-minute interview and are an illustrative split. Shift time towards the move the interviewer keeps probing.",
          columns: ["Move", "Minutes", "You do", "The interviewer listens for", "The trap"],
          rows: [
            ["Clarify", "5", "Ask about users, data, permissions, the cost of a wrong answer and success", "Whether requirements drive your choices", "Drawing boxes before asking anything"],
            ["Size", "5", "Estimate queries, corpus, vectors and tokens", "Order-of-magnitude sense and what the numbers imply", "Big numbers with no conclusion"],
            ["Sketch", "10", "Draw the indexing path and the query path", "A complete path from document to answer", "Listing every tool you know"],
            ["Deep-dive", "15", "Go into detail on the riskiest part", "Depth, and trade-offs with reasons", "Going deep on whatever you know best, such as the vector database"],
            ["Evaluate", "5", "Say how you will know it works", "A golden set and named metrics", "Saying you will check it by hand"],
            ["Operate", "5", "Cover rollout, monitoring, failure and cost", "That you have run something real", "Stopping at launch"],
          ],
        },
        {
          kind: "p",
          text: "Interviewers notice how a candidate opens, so say the plan in your first minute.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Say the framework out loud in the first minute",
          text: "Tell the interviewer your plan: I will clarify, size, sketch, go deep where the risk is, then cover evaluation and operations. It signals structure and lets them steer you. It also gives you a way back when you lose your place.",
        },
        {
          kind: "p",
          text: "The next five sections take the moves in order, and two full designs then apply them. The first move, clarify, starts before you draw anything.",
        },
      ],
    },
    {
      id: "s2-clarify",
      title: "Clarify first, because the requirements pick the architecture for you",
      goal: "Which questions are worth asking before you draw anything?",
      blocks: [
        {
          kind: "p",
          text: "The brief will be one sentence, such as build an internal assistant for company documents. Call it the docs assistant. That sentence hides a dozen design decisions. A good question is one whose answer would change what you draw.",
        },
        {
          kind: "list",
          items: [
            "Who uses it, how many are there, and how often? This sets scale and latency.",
            "What are the sources, in what formats, and who owns them? This sets ingestion.",
            "Do users see different documents, and where is the record of who may see what? This sets the hardest part of the design.",
            "What does a wrong answer cost, and what does a refusal cost? This sets how cautious generation must be.",
            "How fresh must answers be, and can documents be deleted? This sets the update and delete paths.",
            "What does success look like, and is there a baseline today? This sets evaluation.",
            "What are the budget and the deadline? This decides whether to build or buy, and how big the first release is.",
          ],
        },
        {
          kind: "p",
          text: "When the interviewer shrugs, state an assumption and carry on. Say: I will assume 5,000 users and permission-aware search, and I will flag where that changes things. A stated assumption is a strength. A silent one is the trap.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Do not interrogate",
          text: "Five sharp questions beat fifteen. Asking for everything burns the clock and suggests you cannot prioritise. Ask the questions that fork the design, assume the rest, and move on.",
        },
        {
          kind: "quiz",
          id: "c16-q1",
          question: "Which clarifying question changes the architecture the most for an internal docs assistant?",
          options: [
            "Which colour scheme should the chat window use?",
            "Do different users have different access to documents, and where is that record kept?",
            "Which programming language is the team using?",
            "Will there be a mobile app?",
          ],
          answer: 1,
          explain: "Permissions force metadata on every chunk, a filter inside retrieval, a link to the identity provider and a permission sync. Nothing else on the list reshapes the data path.",
        },
        {
          kind: "p",
          text: "Clarifying gives you assumptions. Sizing turns them into numbers, and the numbers into a priority.",
        },
      ],
    },
    {
      id: "s3-size",
      title: "Sizing is arithmetic with a conclusion, so always say what the numbers mean",
      goal: "How big is the system, and what does that tell you to worry about?",
      blocks: [
        {
          kind: "p",
          text: "Sizing shows you can reason about scale before choosing technology. Make four quick estimates: queries per second, or QPS, corpus size in chunks, vector storage and tokens per day. State each assumption, do the sum on the board, and say what it implies.",
        },
        {
          kind: "code",
          lang: "text",
          code: `ASSUMPTIONS (illustrative, for the exercise)
  employees                 5,000
  daily active              20%        -> 1,000 users
  questions per active user 5          -> 5,000 questions/day
  working window            8 h        -> 28,800 s
  peak vs average           10x

QPS      avg 5,000 / 28,800 = 0.17     peak = about 1.7 QPS

CORPUS   200,000 documents x 10 chunks = 2,000,000 chunks
VECTORS  1,024 dims x 4 bytes = 4,096 B each
         2,000,000 x 4,096 B = about 8.2 GB raw

TOKENS   about 3,000 input tokens per question
         5,000 x 3,000 = 15,000,000 input tokens/day`,
          caption: "Every figure is an assumption you would state aloud. Showing the sum matters more than the exact number.",
        },
        {
          kind: "p",
          text: "Now say the conclusion. Peak load is under two queries per second, which is tiny. One vector database node holds 8 gigabytes easily. So scale is not the hard part of this system. The hard parts are permissions, freshness and answer quality. Say so out loud.",
        },
        {
          kind: "p",
          text: "That conclusion tells the interviewer where you will spend the next twenty minutes. Designing a sharded cluster for 1.7 queries per second would ignore your own numbers.",
        },
        {
          kind: "fold",
          tone: "dyk",
          title: "Quick vector storage maths",
          text: "Bytes per vector equal dimensions times bytes per number. Float32 uses four bytes. Multiply by the vector count for the raw size. Then add overhead for the index and metadata, which is often comparable to the vectors themselves. Quantisation from chapter four can cut the vector part several times over.",
        },
        {
          kind: "quiz",
          id: "c16-q2",
          question: "You estimate peak load at 1.7 queries per second and 8 GB of vectors. What is the right conclusion to say aloud?",
          options: [
            "We need a sharded, multi-region vector cluster.",
            "Scale is modest, so the hard problems are permissions, freshness and quality.",
            "We should skip the reranker to save money.",
            "We should use a long-context model and skip retrieval.",
          ],
          answer: 1,
          explain: "Small numbers move the risk elsewhere. Naming the real hard parts is what the interviewer wants to hear.",
        },
        {
          kind: "p",
          text: "Once the numbers say where the risk lives, draw the whole system before you go deep anywhere.",
        },
      ],
    },
    {
      id: "s4-sketch",
      title: "Sketch both paths, indexing offline and querying online, with permissions in each",
      goal: "What does a complete baseline drawing hold?",
      blocks: [
        {
          kind: "p",
          text: "Draw two flows that meet at an index, as chapter two did. It is AskPEP's design, plus chapter ten's permission and deletion parts. Keep the sketch boring and complete, and save cleverness for the deep-dive. A missing stage invites a hard question.",
        },
        {
          kind: "p",
          text: "Each source needs a **connector**, the code that pulls its documents and their permissions into the indexing path. The sketch then has four parts.",
        },
        {
          kind: "list",
          items: [
            "Indexing path: a connector pulls from each source, and a parser and chunker produce chunks. Each chunk gets metadata, including the users and groups allowed to read it. An embedding model produces vectors, and one store holds the vectors, the keyword index and the metadata.",
            "Permission sync: a separate stream pulls access lists and group changes from the identity provider, and updates chunk metadata.",
            "Query path: sign the user in, look up their group set and rewrite the query if needed. Then run hybrid retrieval with the permission filter, rerank, build the prompt, generate with citations and stream the answer.",
            "Across both paths: a trace for every request, a golden set evaluation job, and a deletion path that reaches caches and logs.",
          ],
        },
        {
          kind: "p",
          text: "Narrate as you draw. Say what flows along each arrow and why each box exists. Aim for ten boxes at most. If you cannot explain a box in one sentence, remove it.",
        },
        {
          kind: "callout",
          tone: "analogy",
          title: "A map before a tour",
          text: "The sketch is a map, and the deep-dive tours the two or three dangerous places on it. Give the whole map first, so each tour has somewhere to sit.",
        },
        {
          kind: "p",
          text: "Interviewers also ask for this sketch on its own: take me through a production RAG architecture. The four parts above, said in order, are the answer.",
        },
        {
          kind: "p",
          text: "The map shows where the danger is, and the next move goes deep there.",
        },
      ],
    },
    {
      id: "s5-deep-dive",
      title: "Deep-dive where the risk is, and say each trade-off as a choice with a price",
      goal: "Where should you go deep, and how do you say a trade-off so it sounds like judgement?",
      blocks: [
        {
          kind: "p",
          text: "The interviewer will rarely tell you where to go deep, so choose by risk. Ask what is most likely to fail, or most expensive to get wrong, and start there. For the docs assistant, that is permissions, then retrieval quality, then freshness.",
        },
        {
          kind: "p",
          text: "Say every trade-off in one shape. I would choose X, because of Y. The cost is Z. I would revisit this if W changes. That shape shows you knew there was an alternative and what you gave up. It also shows when your answer expires.",
        },
        {
          kind: "code",
          lang: "text",
          code: `"I'd use hybrid search with a permission pre-filter, because exact codes
and acronyms matter in internal docs and a leak is worse than a miss.
The cost is a bit more index work and a recall test per group size.
I'd revisit it if the corpus grew past what one node handles."`,
          caption: "The spoken formula in use: the choice, the reason, the cost, and the condition that would change it.",
        },
        {
          kind: "p",
          text: "Four habits keep the formula honest.",
        },
        {
          kind: "list",
          items: [
            "Don't defend a choice you can't cost. Say what it gives up.",
            "Don't name a vendor without a reason, because technology follows requirements.",
            "Welcome pushback. A challenge is the interviewer handing you the next topic.",
            "If you don't know, say how you would find out. That is a real engineering answer.",
          ],
        },
        {
          kind: "quiz",
          id: "c16-q3",
          question: "Which spoken trade-off statement is strongest?",
          options: [
            "Hybrid retrieval is better than embedding search.",
            "I'd use hybrid retrieval because exact codes matter here. The cost is more index work, and I'd revisit if queries become purely conversational.",
            "I always use hybrid retrieval with a reranker.",
            "Vector databases are fast, so either option is fine.",
          ],
          answer: 1,
          explain: "It names the choice, the reason, the cost and the condition that would change the answer. The others are claims without costs.",
        },
        {
          kind: "p",
          text: "Deep-dives eat the clock, which puts the last two moves at risk.",
        },
      ],
    },
    {
      id: "s8-evaluate-operate",
      title: "Evaluate and operate are where candidates run out of time, so protect ten minutes",
      goal: "How do you finish a design so the interviewer believes it would work and keep working?",
      blocks: [
        {
          kind: "p",
          text: "Many candidates spend forty minutes on the architecture and then say they would test it. That fails the interview. Evaluation shows the design works, and operations keeps it working. Protect ten minutes of the clock for the pair.",
        },
        {
          kind: "p",
          text: "A **permission test** has a user ask about a document they must not see, and passes only if nothing from it comes back. A **kill switch** turns a feature off at once, with no deploy, and falls back to something simpler.",
        },
        {
          kind: "list",
          items: [
            "Evaluate: say where the golden set comes from, how large it is, and which metrics you track at retrieval, at generation and end to end.",
            "Evaluate: say how you handle LLM-as-judge bias, such as checking the judge against a small set of answers people have labelled.",
            "Evaluate: add permission tests whenever users see different documents.",
            "Operate: describe a phased rollout, from one team to everyone, with a success threshold before each step.",
            "Operate: name three alerts, such as p95 latency, freshness past its promise and failed permission tests.",
            "Operate: plan for a provider outage, a bad index build and a prompt regression. A kill switch covers the first.",
            "Operate: control cost with caching, routing and a cap on tokens per request.",
          ],
        },
        {
          kind: "p",
          text: "Then close the loop, as chapter ten did. Failing traces become golden-set questions. Every change to the index, prompt or model runs the golden set before release, which is chapter fourteen's gate. That tells the interviewer you have shipped something that lived longer than a demo.",
        },
        {
          kind: "quiz",
          id: "c16-q6",
          question: "What is the strongest closing statement on evaluation in a design interview?",
          options: [
            "We will test it manually before launch.",
            "A golden set built from real questions runs on every index, prompt or model change, with retrieval and generation metrics reported separately.",
            "We will rely on user complaints.",
            "We will use the largest model, so it should be fine.",
          ],
          answer: 1,
          explain: "It names the data source, the trigger and the metrics, and separates retrieval from generation so failures can be located.",
        },
        {
          kind: "p",
          text: "You now have all six moves. The next section runs them end to end on the docs assistant.",
        },
      ],
    },
    {
      id: "s6-docs-assistant",
      title: "Design one: an internal docs assistant lives or dies on permissions and freshness",
      goal: "What does a full answer look like when permissions and freshness are the risk?",
      blocks: [
        {
          kind: "p",
          text: "Here are the requirements, stated as assumptions. There are 5,000 employees, and the sources are a wiki, a file share and a ticketing system. Access is set per document and held in the identity provider. Wrong answers are embarrassing but not dangerous. Edits should appear within an hour.",
        },
        {
          kind: "p",
          text: "The sketch is the standard two paths, so go straight to the deep-dive, in risk order.",
        },
        {
          kind: "list",
          items: [
            "Permissions: copy the allowed users and groups onto every chunk from its document. Filter on the caller's group set inside the search, before the top k is chosen. Sync permission changes on their own, faster stream. Check the top few chunks against the source system, as chapter ten did. Put the group set in every cache key.",
            "Retrieval: hybrid retrieval, because internal documents are full of acronyms and codes. Rerank 50 candidates down to 5. Store each chunk's heading path in its metadata, so the chunk names its section.",
            "Freshness: webhooks from the wiki and file share, polling as a backstop and a nightly reconciliation job. Chunk ids that come out the same on every run make re-indexing idempotent. Tombstones handle deletes.",
            "Generation: answer only from the supplied chunks, cite chunk ids, and refuse when nothing relevant comes back. Stream the answer.",
            "Safety: treat chunks as untrusted data, give the assistant no write tools, and strip images and links from answers, as chapter ten said.",
          ],
        },
        {
          kind: "p",
          text: "For evaluation, build a golden set of 150 to 200 real help-desk questions, each with the chunks that answer it. The size is an assumption. Track recall at k and faithfulness, and add permission tests for every restricted group.",
        },
        {
          kind: "p",
          text: "For operations, launch to one department first, and watch the re-ask rate, citation clicks and thumbs. Alert on failed permission tests and on freshness. A kill switch falls back to keyword search if the model provider is down.",
        },
        {
          kind: "p",
          text: "Now run this design against a mock interviewer.",
        },
        {
          kind: "widget",
          id: "c12-framework-stepper",
          intro: "A mock interviewer takes you through all six moves for the docs assistant. At each move, choose what you would say aloud and read the interviewer's reaction. At the end, see which move was your weakest and whether you kept to the 45-minute clock.",
        },
        {
          kind: "p",
          text: "Interviewers often ask which part of a design is hardest.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "What is the hardest part of this design?",
          text: "Expect this question. Answer that permissions and their freshness are the hardest part, and that scale is not. Then show you mean it. Mention the filter inside the search, the separate permission sync, group sets in cache keys and permission tests that run on every release.",
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "The traps interviewers set on this design",
          text: "One: put the permission check in the prompt. Two: filter after generation. Three: forget that group membership changes. Four: use one shared cache key. Five: ignore deleted documents. If you volunteer the fix to each before you are asked, you have passed the section.",
        },
        {
          kind: "quiz",
          id: "c16-q4",
          question: "A user is removed from a group at 10:00. When must the assistant stop showing them that group's documents?",
          options: [
            "At the next nightly reindex.",
            "Immediately or within a very short, stated window, through the separate permission sync and a check against the source.",
            "Only when their session expires.",
            "Never, because the documents were already indexed.",
          ],
          answer: 1,
          explain: "Permissions change independently of content, so they need their own fast sync. The check against the source at retrieval time closes the remaining gap.",
        },
        {
          kind: "p",
          text: "The second design adds sources of unequal trust, and a customer on the receiving end.",
        },
      ],
    },
    {
      id: "s7-support-copilot",
      title: "Design two: a support copilot trades speed against safety, and the customer sets the weights",
      goal: "How does a design change when sources differ in trust and a wrong reply reaches a customer?",
      blocks: [
        {
          kind: "p",
          text: "Here are the requirements, as assumptions. A team of 200 support agents handles about 25 tickets each a day, with two copilot requests per ticket. That is 10,000 requests a day. The sources are a knowledge base of curated articles and a million past tickets. A wrong answer sent to a customer is costly.",
        },
        {
          kind: "p",
          text: "So the copilot keeps a **human in the loop**, a person who approves each output before it takes effect. Here, the agent approves every draft.",
        },
        {
          kind: "p",
          text: "The two sources deserve different treatment. Knowledge base articles are authoritative and tidy. Tickets are noisy conversations full of personal data. Index them separately, tag each result with its source, and rank articles above tickets when both answer the question.",
        },
        {
          kind: "list",
          items: [
            "Tickets: index only resolved tickets, and scrub personal data before embedding. Store a short generated summary of the problem and the fix, and keep the raw thread for the detail view.",
            "Metadata: product, version, region, date and resolution status. Filter on product and version, because a fix for version 2 can mislead on version 5.",
            "Retrieval: hybrid retrieval with a reranker, and a query built from the new ticket's subject and first message.",
            "Generation: draft a reply for the agent, citing the article or ticket ids. Show the evidence beside the draft. A confidence score the model makes up tells the agent nothing.",
            "Feedback: record how the agent edits the draft. Each edit is a free label of what was wrong.",
          ],
        },
        {
          kind: "p",
          text: "Two more points show seniority. Duplicate tickets will flood the results, so cluster near-duplicates and show one. Old tickets also go stale as the product changes. Lower their rank by age, and retire the ones that name removed features.",
        },
        {
          kind: "p",
          text: "Each choice above trades speed and cost against quality and safety, and the customer decides which side wins.",
        },
        {
          kind: "widget",
          id: "c12-tradeoff-picker",
          intro: "The customer is a regulated insurer, and a wrong reply sent to a customer is far worse than a slow one. Choose an option for each of four design decisions and watch four meters move. Then submit your design and see whether it matches what the customer said they care about.",
        },
        {
          kind: "p",
          text: "Evaluation keeps the same layers, with different metrics.",
        },
        {
          kind: "compare",
          caption: "How the evaluation differs from the docs assistant. The metrics are named here, and you set the thresholds with the customer.",
          columns: ["Layer", "Docs assistant", "Support copilot"],
          rows: [
            ["Retrieval", "Recall at k on help-desk questions", "Recall at k on past tickets with known resolving articles"],
            ["Generation", "Faithfulness and refusal behaviour", "Faithfulness, plus tone and policy compliance"],
            ["Online", "Re-ask rate, citation clicks", "Draft acceptance rate and edit size"],
            ["Risk test", "Permission tests", "Prompts that try to get refunds or personal data out of it"],
          ],
        },
        {
          kind: "quiz",
          id: "c16-q5",
          question: "Why should the copilot draft replies for an agent instead of replying to customers automatically on day one?",
          options: [
            "Because generation is too slow for customers.",
            "Because a wrong answer is costly, and a human in the loop catches errors while edits generate labels.",
            "Because agents are cheaper than models.",
            "Because customers dislike automated messages by law.",
          ],
          answer: 1,
          explain: "The human gate caps the damage while you collect evidence. Automation can expand once acceptance rates earn it.",
        },
        {
          kind: "p",
          text: "Both designs so far were for an interview board. A forward-deployed engineer runs the same moves in a customer's meeting room.",
        },
      ],
    },
    {
      id: "s9-fde-framing",
      title: "As a forward-deployed engineer, frame the same design around the customer's risk",
      goal: "What changes when the person listening is a customer?",
      blocks: [
        {
          kind: "p",
          text: "A **forward-deployed engineer**, or FDE, builds working systems inside a customer's organisation. The six moves still apply, but the audience changes. A customer doesn't want to hear about HNSW. They want to know what will go wrong, who owns what, and when they will see value.",
        },
        {
          kind: "list",
          items: [
            "Clarify becomes discovery. Ask who will use it on Monday, what they do today, and what a wrong answer costs them in money or trust.",
            "Size becomes scoping. Pick one department and one workflow for the first release, and say what you are leaving out.",
            "Sketch becomes a one-page picture with the customer's own systems on it, such as their identity provider and document stores.",
            "Deep-dive becomes risk review. Talk about permissions, data quality and who maintains the sources.",
            "Evaluate becomes a shared definition of done. Agree on twenty real questions, and what a good answer to each looks like, before you build.",
            "Operate becomes a handover plan. Say who watches the dashboard, who updates the prompt and where problems escalate.",
          ],
        },
        {
          kind: "p",
          text: "Often the biggest risk is not technical. The customer's documents are out of date, nobody owns them, or the permissions in the source system are a mess. A RAG system exposes those problems on day one. Raise them early and kindly, and present each one as a finding.",
        },
        {
          kind: "p",
          text: "Sometimes the system exists already, and the customer says it gives wrong answers. Start from evidence. Collect their wrong answers into a small golden set, and trace each one. Run chapter nine's error analysis, sorting failures by first failing stage. Fix the biggest group with the cheapest remedy, and show the customer the number move.",
        },
        {
          kind: "p",
          text: "Interviews for forward-deployed roles often test this change of audience directly.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Design this for a customer who has never used an LLM",
          text: "A strong answer opens with their problem and a small pilot, then shows the same six moves in plain words. It names the data and permission risks before the architecture. It ends with a definition of done the customer wrote.",
        },
        {
          kind: "p",
          text: "One brief is left, and this time you work it alone.",
        },
      ],
    },
    {
      id: "s10-exercise",
      title: "Exercise: design a contract-search assistant on paper, with ethical walls",
      goal: "Can you run all six moves alone on a fresh brief?",
      blocks: [
        {
          kind: "p",
          text: "Here is the brief. A law firm with 300 lawyers wants a search and question-answering assistant over its contracts and memos. A matter is one piece of client work, such as a case or a deal. Some matters carry an **ethical wall**, a rule that certain lawyers must never see that matter's documents.",
        },
        {
          kind: "p",
          text: "Time yourself. Spend about 40 minutes with a pen and a blank page.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Clarify. Write six questions, mark the two whose answers would change the design most, and write your assumptions for the rest.",
            "Size. Estimate queries per day, chunk count and raw vector storage. Write one sentence on what the numbers imply.",
            "Sketch. Draw the indexing path and query path, including where ethical-wall rules are stored and applied.",
            "Deep-dive. Pick the riskiest area and explain it in the choice, reason, cost, revisit form. Then pick a second area.",
            "Evaluate. Write the golden set source, the metrics and the permission tests for the walls.",
            "Operate. Write the rollout phases, three alerts and the plan for a provider outage.",
            "Frame it for the managing partner in five plain sentences, with no jargon.",
          ],
        },
        {
          kind: "p",
          text: "Then check your page against this list.",
        },
        {
          kind: "list",
          items: [
            "Self-check: you asked where the wall rules are held and how fast they change.",
            "Self-check: your sizing ends with a sentence about what is hard, and it is not scale.",
            "Self-check: the wall filter runs inside retrieval, before the top k is chosen, and cache keys carry it.",
            "Self-check: your deep-dive used the choice, reason, cost, revisit form at least twice.",
            "Self-check: your permission tests include lawyers who must not retrieve a walled matter.",
            "Self-check: your operations plan covers a wall added after documents were indexed.",
            "Self-check: your partner summary names a pilot and a definition of done.",
          ],
        },
        {
          kind: "fold",
          tone: "plain",
          title: "A hint on the hardest wall case",
          text: "A wall can be added to a matter that is already indexed. Your permission metadata then has to change on existing chunks quickly, and cached answers that mention the matter must be purged. This is the same separate permission sync from the docs assistant design.",
        },
        {
          kind: "p",
          text: "That is the last exercise in the course. The course opened by asking when a model should look knowledge up instead of remembering it. Every chapter since has answered a smaller question on the way.",
        },
        {
          kind: "p",
          text: "So here is what you can now build. You can get documents in intact and cut them into chunks that carry their context. You can find the right chunks by meaning and by exact name, and turn them into an answer with checkable citations. You built it all as AskPEP and shipped it.",
        },
        {
          kind: "p",
          text: "And here is what you can now defend. You can show whether AskPEP is good, and which stage to fix when it is not. You can say what had to change before 800 engineers could depend on it, and why each tool earned its place. You add an advanced pattern only when a failure calls for it.",
        },
        {
          kind: "p",
          text: "This chapter added the last skill. You can say all of that out loud, with a price on every choice, in an interview room or a customer's meeting room.",
        },
      ],
    },
  ],
  recap: [
    "Run clarify, size, sketch, deep-dive, evaluate and operate in that order, and say the plan aloud first.",
    "Ask only the clarifying questions that would change the design, and state the rest as assumptions.",
    "Size with stated assumptions, then say what the numbers imply and where the real difficulty sits.",
    "Say each trade-off as a choice, a reason, a cost and the condition that would change it.",
    "Protect ten minutes for the golden set, permission tests, alerts and a rollout plan.",
    "Docs assistants hinge on permissions and freshness, and support copilots on source trust and a human in the loop.",
    "As an FDE, run the same moves as discovery, scoping, risk review and handover.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In RAG system design I learned to run clarify, size, sketch, deep-dive, evaluate and operate, and to state each trade-off with its cost. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["rag-q34", "rag-q35", "rag-q36", "rag-q37", "rag-q41"],
};

export default chapter;
