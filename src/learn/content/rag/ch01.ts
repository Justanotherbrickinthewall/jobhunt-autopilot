import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "rag-01-why-rag",
  course: "rag",
  number: 1,
  title: "Why RAG exists",
  tagline: "When should a model look knowledge up instead of remembering it, and what breaks when it does?",
  minutes: 35,
  objectives: [
    "Name the four gaps in a model's memory, and say how looking things up closes them.",
    "Work out with simple sums when pasting every document into every request stops paying.",
    "Choose where a piece of knowledge should live, out of five options, and give the reason.",
    "Tell four kinds of wrong answer apart, so that you fix the part that failed.",
  ],
  sections: [
    {
      id: "s1-gaps",
      title: "A model's memory is frozen, public and lossy, so some knowledge must be looked up",
      goal: "What can a model not know from training alone?",
      blocks: [
        {
          kind: "p",
          text: "Every section of this chapter answers part of one question. When should a model look knowledge up instead of remembering it, and what breaks when it does? This first section starts with what a model remembers, and where that memory runs out.",
        },
        {
          kind: "p",
          text: "A large language model, or **LLM**, answers from its **weights**. Weights are the billions of numbers that training sets and then freezes. Together they hold a blurry compression of the text the model saw. That memory is frozen, public and lossy, and those three properties cause four gaps.",
        },
        {
          kind: "list",
          items: [
            "Frozen, so there is a **knowledge cutoff**. The model knows nothing that happened after its training data ended.",
            "Public, so your private data is missing. Your wiki, tickets and contracts were never in the training set.",
            "Lossy, so there is **hallucination**. When the model lacks a fact, it still writes fluent text, and fluent text sounds right.",
            "Lossy again, so there is no **provenance**. Provenance is the record of which document a claim came from, and weights keep none.",
          ],
        },
        {
          kind: "p",
          text: "Hallucination deserves a closer look. A model is trained to predict plausible next words. Plausible and true usually coincide, which is why models are so useful. When the fact is missing, plausible text still comes out, with the same confident tone and no warning label.",
        },
        {
          kind: "p",
          text: "Looking things up closes three of these gaps and shrinks the fourth. **Retrieval-augmented generation**, or **RAG**, works at question time. It searches your own documents, a step called **retrieval**. It pastes the best **passages**, a few paragraphs each, into the **prompt**, which is the text sent to the model. Then it tells the model to answer from those passages.",
        },
        {
          kind: "fold",
          tone: "dyk",
          title: "Where the name comes from",
          text: "The term comes from a 2020 paper, Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks, by Patrick Lewis and colleagues. It paired a text generator with a retriever, a search model that found Wikipedia passages by meaning. The paper called the model's weights parametric memory and the retrieved text non-parametric memory. Those two terms still turn up in interviews.",
        },
        {
          kind: "p",
          text: "The model now reads instead of remembering, like a student whose closed-book exam has turned open book. That student can still open the wrong page, or misread the right one. So most of this course is about finding the right passage, and the rest is about reading it well.",
        },
        {
          kind: "p",
          text: "The set of documents a system searches is its **corpus**. This course uses one corpus throughout: 18 Python Enhancement Proposals, or **PEPs**. A PEP is a public design document that proposes a change to Python. PEP 8, for example, is Python's style guide.",
        },
        {
          kind: "p",
          text: "Over the course you build AskPEP, a system that answers questions about these 18 PEPs and cites them. You download the PEPs in chapter two, so nothing needs setting up yet. The table below says what each PEP covers, so you need no knowledge of Python's history.",
        },
        {
          kind: "compare",
          caption: "The 18 PEPs in the corpus. Later chapters name a few of them, so come back here when one is unfamiliar.",
          columns: ["PEP", "What it covers"],
          rows: [
            ["PEP 1", "How the PEP process itself works"],
            ["PEP 8", "Python's style guide, including the line length rule"],
            ["PEP 20", "The Zen of Python, a short list of design principles"],
            ["PEP 257", "How to write docstrings, the documentation text at the top of a function or module"],
            ["PEP 343", "The `with` statement, which opens a resource and always closes it"],
            ["PEP 484", "Type hints"],
            ["PEP 498", "f-strings, Python's formatted string literals"],
            ["PEP 526", "Type annotations on variables"],
            ["PEP 572", "Assignment expressions, the `:=` operator nicknamed the walrus"],
            ["PEP 584", "Merging dictionaries with the `|` operator"],
            ["PEP 604", "Writing union types as `X | Y`"],
            ["PEP 612", "Typing for functions that wrap other functions"],
            ["PEP 634 and PEP 636", "Pattern matching with `match`: the rules, then a tutorial"],
            ["PEP 695", "A shorter syntax for generic types"],
            ["PEP 701", "A stricter grammar for f-strings"],
            ["PEP 703", "Making the global interpreter lock, or GIL, optional. The GIL lets only one thread run Python code at once."],
            ["PEP 723", "Declaring a script's dependencies inside the script"],
          ],
        },
        {
          kind: "p",
          text: "All four gaps show up in this corpus. A model probably knows what PEP 8 says about line length. It cannot know the final wording of a PEP revised after its cutoff. It has never seen your team's private additions to PEP 8. Asked about them, it may invent an answer and cite nothing.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "RAG reduces hallucination and does not remove it",
          text: "The model can still ignore the passages, misread them or fill a gap with invention. An answer is **grounded** when every claim comes from the supplied passages. Grounding takes a prompt that demands a citation for each claim. That prompt must also let the model say that the documents do not cover the question. Chapter eight builds it.",
        },
        {
          kind: "quiz",
          id: "rag-01-q1",
          question: "A model's training data ends last year. A user asks about a policy your company published last month. What is the most direct fix?",
          options: [
            "Raise the temperature so the model guesses more creatively.",
            "Retrieve the policy at question time and put it in the prompt.",
            "Ask the model to think step by step.",
            "Ask for a shorter answer.",
          ],
          answer: 1,
          explain: "The model cannot know a document it never saw. Reasoning harder or sampling more widely cannot create the missing fact. Putting the policy text in the prompt can.",
        },
        {
          kind: "p",
          text: "So the first part of the answer is this. Look up anything the model cannot have seen, cannot check or must cite. That raises an obvious objection. Models now read a lot of text at once, so why not paste every document into every request? The next section does the sums.",
        },
      ],
    },
    {
      id: "s2-budget",
      title: "The context window is a budget, so pasting the whole corpus rarely pays",
      goal: "Why not paste every document into every request?",
      blocks: [
        {
          kind: "p",
          text: "Pasting everything works only while the corpus fits and traffic stays low. The limit is the **context window**, the most text a model can read in one request. It is counted in **tokens**, pieces of text of about four characters each in English. Your instructions, the pasted documents, the question and the answer all share that one window.",
        },
        {
          kind: "p",
          text: "The window is a hard limit. A corpus larger than the window cannot be pasted at all, so each request must carry a selected part of it. Choosing that part for each question is exactly the job retrieval does.",
        },
        {
          kind: "quiz",
          id: "rag-01-q2",
          question: "Your corpus is 3 million tokens and the model's window is 1 million tokens. What follows?",
          options: [
            "It fits, with room left for the answer.",
            "It cannot fit, so you must send a selected subset.",
            "The provider compresses it automatically.",
            "Only the question has to fit.",
          ],
          answer: 1,
          explain: "The window is a hard limit on everything in one request. Selecting the right subset per question is exactly what retrieval does.",
        },
        {
          kind: "p",
          text: "Even below the limit, pasting loses to retrieval in four ways.",
        },
        {
          kind: "list",
          items: [
            "Cost grows. Every pasted token is billed, on every request.",
            "**Latency** grows. Latency is the wait before the answer starts, and the model must read the whole prompt before it writes the first word.",
            "Attention thins. A model is more likely to miss a fact buried in the middle of a long prompt.",
            "Access is all or nothing. Retrieval can leave out documents a user may not see, which is called **filtering by permission**. A pasted handbook goes to everyone in full.",
          ],
        },
        {
          kind: "p",
          text: "The cost sum is short: tokens pasted, times price per token, times questions per day. Take a 150 thousand token handbook and 5,000 questions a day. Pasting it every time sends 750 million input tokens daily. Retrieving five passages of 500 tokens each sends 12.5 million. That is 60 times fewer tokens for the same questions.",
        },
        {
          kind: "p",
          text: "The attention cost has a name. A 2023 paper called Lost in the Middle measured how well models use facts at different places in a long prompt. They used facts at the start and end better than facts in the middle. So a bigger window holds more text, yet the model does not read all of it equally well.",
        },
        {
          kind: "widget",
          id: "c01-context-budget",
          intro: "Push the corpus size past the window and watch what changes. Then make three calls on realistic cases, and see what each choice costs per day.",
        },
        {
          kind: "p",
          text: "Pasting does win sometimes. Our 18 PEPs come to about 160 thousand tokens, which fits in many windows. One person asking a few questions could simply paste them. So paste when the corpus fits, traffic is low and you want no search system to run. Interviewers test this trade-off often, usually by asking whether huge windows make RAG pointless.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Is RAG dead now that windows are huge?",
          text: "Interviewers ask this a lot. Answer with arithmetic, not opinion. Cost and latency grow with every token you send, many corpora exceed any window, and retrieval lets you filter by permission and cite a source. Then concede the real case: a small, static document at low volume should just be pasted.",
        },
        {
          kind: "fold",
          tone: "industry",
          title: "Prompt caching changes the sums",
          text: "Providers now let you cache a long, repeated prompt prefix, so later requests reuse it at a discount and with less delay. That makes pasting a fixed handbook much cheaper than it used to be. It does not help when the corpus exceeds the window, or when each user may see a different subset of the documents.",
        },
        {
          kind: "p",
          text: "This course builds retrieval anyway, because real corpora are rarely this small and real traffic is rarely this low. Pasting and retrieving are also only two of the ways to give a model knowledge. The next section lays out all five and shows how to choose between them.",
        },
      ],
    },
    {
      id: "s3-options",
      title: "Knowledge can live in five places, and three questions pick the right one",
      goal: "Where should each kind of knowledge live?",
      blocks: [
        {
          kind: "p",
          text: "Retrieval is one of five ways to give a model knowledge, and each way wins somewhere. Choosing badly can cost months, so it pays to know where the boundaries sit. Here are all five, including the two you just compared.",
        },
        {
          kind: "list",
          items: [
            "**Prompting** means writing rules, instructions and examples into the request. It is free, instant and underrated.",
            "**RAG** searches your documents at question time. The documents sit in an **index**, a store built for fast search. When a document changes, you **re-index** it, which means loading the new version into the index.",
            "**Fine-tuning** means training the model further on your examples, which changes its weights. It suits behaviour, style and format.",
            "**Long context** means pasting whole source documents into the window, as the last section did. It differs from prompting in what goes in: prompting sends rules, and long context sends source material. It suits small, one-off, low-volume jobs.",
            "**Tool calls** let the model ask a program for live data, such as a database query or an API. They suit exact, current, structured facts.",
          ],
        },
        {
          kind: "compare",
          caption: "The five approaches compared on when they win, when they lose, whether they stay fresh and whether they can cite.",
          columns: ["Approach", "Wins when", "Loses when", "Stays fresh?", "Can cite?"],
          rows: [
            ["Prompting", "The rules and format fit on a page", "The knowledge is larger than a page", "Yes, edit the prompt", "No"],
            ["RAG", "The knowledge is large, textual and changing", "The answer needs exact live numbers, or facts spread across many documents", "Yes, re-index", "Yes"],
            ["Fine-tuning", "You need consistent behaviour, tone or a label set", "You need facts that change, or sources", "No, retrain", "No"],
            ["Long context", "One document, low volume", "The corpus is huge or volume is high", "Yes, paste the new version", "Partly"],
            ["Tool call", "The data is live, structured and exact", "The answer lives in prose", "Yes, by definition", "Yes, the call is the source"],
          ],
        },
        {
          kind: "p",
          text: "The most common mistake is fine-tuning to teach facts. Training nudges weights towards patterns, so a fact stored there is blurry, slow to change and impossible to cite. Fine-tune for behaviour. Retrieve for knowledge. Interviewers test this early, usually by asking whether to use RAG or fine-tuning.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "RAG or fine-tuning?",
          text: "Expect this in the first five minutes. Answer with a rule rather than a preference. Knowledge goes into retrieval because it changes and needs citations. Behaviour goes into prompts or training. Then name one case where you would combine them.",
        },
        {
          kind: "p",
          text: "The options also combine, and real systems are usually mixtures. A RAG system is itself a **pipeline**, a fixed chain of steps in which each step's output feeds the next. A fine-tuned model might sort questions before that pipeline runs. One step of the pipeline might call a tool for live numbers.",
        },
        {
          kind: "p",
          text: "The whole section comes down to one rule. Retrieve for knowledge, fine-tune for behaviour, call tools for live data and prompt for rules. When a case is unclear, answer three questions in order, and the choice usually falls out.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "How often does the knowledge change? If daily, weights are out. Use retrieval or a tool.",
            "Is it prose or exact structured data? Prose suits retrieval. Exact data suits a tool call such as a SQL query.",
            "Must the answer show its source? If yes, you need retrieval or a tool, because weights cannot cite.",
          ],
        },
        {
          kind: "widget",
          id: "c01-knowledge-sorter",
          intro: "Sort eight pieces of knowledge into the place they should live. Watch for the card that tempts you to build a pipeline when a prompt will do.",
        },
        {
          kind: "quiz",
          id: "rag-01-q3",
          question: "Which job is the worst fit for fine-tuning?",
          options: [
            "Teaching the model today's count of open issues in a repository.",
            "Making a small model emit one of 40 fixed labels.",
            "Matching a house writing style across thousands of examples.",
            "Sticking to a strict JSON output format.",
          ],
          answer: 0,
          explain: "A live number changes constantly, and weights cannot be edited per fact. That belongs in a tool call. The other three are behaviour, which is what training is good at.",
        },
        {
          kind: "p",
          text: "Suppose the three questions point to retrieval. That closes most of the gaps from the first section, but it also adds new ways to be wrong. The next section maps those new failures, so that you know where to look first.",
        },
      ],
    },
    {
      id: "s4-failures",
      title: "A RAG system can fail in four places, so name the place before you fix it",
      goal: "What can go wrong once a model answers from retrieved text?",
      blocks: [
        {
          kind: "p",
          text: "A bare model fails in one place, the model itself. A RAG system can fail in four, and each failure looks the same to a user: a wrong answer. So debugging starts by naming which one you hit.",
        },
        {
          kind: "list",
          items: [
            "Retrieval miss: the right passage never reaches the prompt.",
            "Context misuse: the right passage is present, and the model ignores or misreads it.",
            "Corpus gap: the answer is not in your documents at all.",
            "Stale or poisoned data: the passage is out of date, or carries instructions an attacker planted.",
          ],
        },
        {
          kind: "p",
          text: "One question separates the first three: where was the right text? If it was never in your documents, the failure is a corpus gap. If it was in your documents but never reached the prompt, it is a retrieval miss. If it reached the prompt and the answer ignored it, it is context misuse.",
        },
        {
          kind: "p",
          text: "Take the question, why was the walrus operator controversial? The walrus is the `:=` operator, and PEP 572 gives its syntax and rationale. Most of the heated argument happened on mailing lists, which are not among your 18 PEPs. So the text that would answer the question was never in your documents.",
        },
        {
          kind: "p",
          text: "That is a corpus gap. No retrieval trick or better model fixes it. The right behaviour is for the system to say that its documents do not cover the question.",
        },
        {
          kind: "p",
          text: "RAG also has a built-in blind spot. Retrieval returns only the few passages that score best for a question, never every relevant one. Ask how many of the 18 PEPs mention the global interpreter lock, and the count comes from those few passages. Counting, comparing many documents and summarising a whole corpus need other patterns, which chapter fifteen covers.",
        },
        {
          kind: "p",
          text: "Name the failure before you change anything. It is easy to spend a week rewriting prompts when the real fault is a missing document. Each later chapter adds a tool for diagnosing one of these failures.",
        },
        {
          kind: "quiz",
          id: "rag-01-q4",
          question: "Retrieval returns the PEP 572 rationale section. The answer ignores it and invents some history. Which failure is this?",
          options: ["Retrieval miss", "Context misuse", "Corpus gap", "Stale data"],
          answer: 1,
          explain: "The right text was in the prompt, and the model did not use it. That is context misuse. The fixes live in the prompt and in how the passages are laid out in it, which chapter eight covers.",
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "Why the demo always works",
          text: "A demo with five hand-picked questions hides all four failures. Real users ask vague, misspelt, multi-part questions about documents nobody indexed. So collect twenty awkward questions early, and keep the ones that fail. Chapter nine turns a list like that into a golden set, a list of questions with known good answers that every change is tested against.",
        },
        {
          kind: "p",
          text: "Three of these failures have a home in the pipeline. A retrieval miss comes from how documents are cut, stored and searched. Context misuse comes from how passages are laid out in the prompt. Stale data comes from how documents are loaded. Chapter two draws the pipeline and builds its first step, a loader for the 18 PEPs.",
        },
      ],
    },
  ],
  recap: [
    "RAG gives a model your documents at question time, so it reads instead of remembering.",
    "A model's memory is frozen, public and lossy, which causes the cutoff, private data, hallucination and provenance gaps.",
    "A context window is a budget, so paste only when the corpus fits, traffic is low and you want no search system to run.",
    "Retrieve for knowledge, fine-tune for behaviour, call tools for live data and prompt for rules.",
    "Every RAG failure is a retrieval miss, context misuse, a corpus gap or stale data, and asking where the right text was tells you which.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In why RAG exists I learned that knowledge belongs in retrieval, behaviour belongs in prompts or training, and live facts belong in tool calls. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["rag-q01", "rag-q02"],
};

export default chapter;
