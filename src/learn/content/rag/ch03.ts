import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "rag-03-chunking",
  course: "rag",
  number: 3,
  title: "Chunking",
  tagline: "Where should you cut a document into chunks, and what must each chunk carry with it?",
  minutes: 45,
  objectives: [
    "Explain why retrieval works on pieces of documents, and what a badly placed cut costs an answer.",
    "Choose a chunk size by testing it on real questions, and say when repeating text across a cut is worth its cost.",
    "Pick where to cut each kind of document, from plain prose to code, contracts and transcripts.",
    "Give every chunk the metadata it needs for citations, filters, updates and tests.",
    "Decide whether to write your own chunking code or use a framework's, and say what each choice costs.",
    "Build AskPEP's chunker, which cuts each PEP at headings, then paragraphs, then sentences, and make it pass its tests.",
  ],
  sections: [
    {
      id: "s1-why-chunks",
      title: "Retrieval returns chunks, so where you cut decides what an answer can contain",
      goal: "Why does retrieval work on chunks instead of whole documents?",
      blocks: [
        {
          kind: "p",
          text: "Every section of this chapter answers part of one question. Where should you cut a document into chunks, and what must each chunk carry with it? Chapter two's loader ended with 18 clean Documents, each still a whole PEP. This section shows why they must be cut up at all.",
        },
        {
          kind: "p",
          text: "Chapter two defined **chunks** as passages a few hundred tokens long, each labelled with the headings above it. A chunk is the unit you embed, store and retrieve. Each chunk that search returns is a **hit**. Retrieval never returns a whole document, so a chunk's text is the most the model can learn from one hit.",
        },
        {
          kind: "p",
          text: "Why not embed whole documents? Chapter two said a vector stands for a passage's meaning. A whole PEP holds dozens of ideas, and one vector cannot point at all of them. It lands somewhere between its topics, close to none of them. A question about one detail then matches it weakly.",
        },
        {
          kind: "p",
          text: "Embedding models also have an input limit, the most tokens they accept at once. Text past the limit is usually cut off without any warning. So a whole PEP can lose its second half before it is even embedded.",
        },
        {
          kind: "p",
          text: "Take the question, what does PEP 8 say about line length? The answer is two sentences: 79 characters for code, and 72 for docstrings and comments. A chunk holding PEP 8's Maximum Line Length section serves it well. A chunk holding the whole PEP buries it. A chunk cut mid-sentence can lose the number 72.",
        },
        {
          kind: "quiz",
          id: "rag-03-q1",
          question: "Why not embed each whole PEP as a single chunk?",
          options: [
            "Vectors have a fixed length.",
            "The vector averages many topics, so specific questions match it weakly.",
            "Databases refuse long text.",
            "Whole documents cannot carry metadata.",
          ],
          answer: 1,
          explain: "A single vector can only point in one direction. A long document covers many topics, so its vector sits between them and matches none of them sharply.",
        },
        {
          kind: "p",
          text: "The code that does the cutting is a **chunker**. Every chunker makes two choices: how big each chunk is, and where the cuts fall. The next section takes size first.",
        },
      ],
    },
    {
      id: "s2-size",
      title: "Chunk size trades precision against recall, and only your own questions can settle it",
      goal: "How big should a chunk be, and what does overlap buy?",
      blocks: [
        {
          kind: "p",
          text: "Two measures from search show what size costs. **Precision** is the share of what you retrieved that is relevant. **Recall** is the share of what you needed that you actually retrieved. Chunk size pulls the two in opposite directions.",
        },
        {
          kind: "list",
          items: [
            "Small chunks are precise, because each vector says one thing. But a small chunk can lose the context that gives it meaning, such as the name that a word like it refers to.",
            "Large chunks keep their context. But each vector blurs several ideas, and the prompt fills with text the question never needed.",
          ],
        },
        {
          kind: "p",
          text: "Length matters for a second reason. A question is short, perhaps a dozen words. A chunk is long, perhaps three hundred. Search compares their vectors directly. So a chunk that mixes several topics loses to a smaller chunk that sticks to what the question asks.",
        },
        {
          kind: "p",
          text: "Size also sets the prompt budget. **Top k** is the number of chunks that end up in the prompt, where k is a number you choose. Five chunks of 400 tokens spend 2,000 tokens on every question. Halve the chunk size and you can send ten chunks for the same price, with different recall.",
        },
        {
          kind: "p",
          text: "So chunk size and top k are one decision, and no universal best setting exists. A common start is a few hundred tokens. Treat that as a guess to test. The test is a **golden set**, a list of questions with known good answers that every change is tested against. Chapter nine builds one.",
        },
        {
          kind: "p",
          text: "For each size you try, measure **recall at k**: the share of each golden question's right chunks that land in the top k. With one right chunk per question, that is the share of questions whose answer sits in the top k. Then compare the quality of the answers too. Keep the size that wins on your own questions.",
        },
        {
          kind: "p",
          text: "Size is not the only thing that decides where cuts land. The crudest chunker cuts a **fixed-size** window, say every 400 tokens, wherever the count runs out. That cuts sentences in half. Cutting only at sentence ends is the cheapest improvement.",
        },
        {
          kind: "p",
          text: "Even then, an idea can straddle a cut. **Overlap** repeats the end of one chunk at the start of the next. If an idea crosses a cut, one of the two chunks still holds it whole. The price is a bigger index. With 400 token chunks and 50 tokens of overlap, you store about 14 percent more.",
        },
        {
          kind: "widget",
          id: "c03-chunk-slider",
          intro: "Predict first how many ideas fixed-size windows cut in a passage of PEP 8. Then find settings that keep every idea whole, with no chunk over 90 tokens. Notice how fragile your answer is.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Overlap only patches a bad cut",
          text: "Overlap is insurance against cuts in the wrong place. Cutting on the document's own structure, such as its headings and paragraphs, removes most bad cuts in the first place. So reach for structure first, then add a small overlap on top.",
        },
        {
          kind: "quiz",
          id: "rag-03-q2",
          question: "You raise chunk size from 200 to 1000 tokens. What most likely happens to precision?",
          options: [
            "It rises, because chunks hold more context.",
            "It falls, because each chunk contains more text the question did not need.",
            "It stays the same.",
            "It changes only if overlap changes.",
          ],
          answer: 1,
          explain: "Bigger chunks carry more off-topic text per hit, and their vectors blur. Recall may rise because fewer ideas are cut, which is the trade.",
        },
        {
          kind: "p",
          text: "Interviewers often ask how you would choose a chunk size, because the answer shows whether you test or guess.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How do you choose a chunk size?",
          text: "Don't guess. Build a golden set of real questions with known answers, which chapter nine covers. Sweep sizes and overlaps, and compare recall at k and answer quality. Saying that out loud separates practitioners from people who read one tutorial. Mention that the best size also depends on your embedding model's input limit.",
        },
        {
          kind: "p",
          text: "Size alone cannot stop a cut landing mid-idea. Where the cuts fall matters as much, and the right place depends on the shape of the document. That is the next section.",
        },
      ],
    },
    {
      id: "s3-strategies",
      title: "Match the splitting strategy to the shape of the document",
      goal: "Where should the cuts fall in each kind of document?",
      blocks: [
        {
          kind: "p",
          text: "A **splitting strategy** is the rule a chunker uses to choose its cut points. Strategies run from cheap and blind to clever and costly. The rule of thumb is to use the cheapest one that respects the structure your documents already have.",
        },
        {
          kind: "p",
          text: "The PEPs have plenty of structure. Chapter two said they are written in RST, a plain text format with light markup for headings and lists. A chunker that cuts at those headings can give each chunk its **heading path**, the trail of section titles above it. That is the label in chapter two's definition of a chunk.",
        },
        {
          kind: "compare",
          caption: "Six splitting strategies compared by how they cut, what they are good at, where they fail and when to reach for them.",
          columns: ["Strategy", "How it cuts", "Strength", "Weakness", "Reach for it when"],
          rows: [
            ["Fixed size", "Every N tokens or characters", "Trivial and predictable", "Cuts mid-sentence and mid-idea", "Throwaway prototypes"],
            ["Recursive", "Tries sections, then paragraphs, then sentences, then words, until pieces fit", "Respects natural breaks, needs no model", "Blind to meaning across breaks", "Prose, as the default"],
            ["Structure-aware", "Uses the format: headings, tables, code blocks, or the functions and classes in code", "Chunks match how the author organised ideas, and headings become metadata", "Needs a parser per format", "RST, Markdown, HTML, source code"],
            ["Semantic", "Embeds sentences and cuts where neighbouring sentences stop being similar", "Follows topic shifts", "Costs embeddings at index time, and gains over recursive are inconsistent", "Transcripts and other unstructured text"],
            ["Sentence window", "Embeds single sentences, and returns the neighbours too", "Sharp matching with context", "Many more vectors", "Dense prose with precise questions"],
            ["Parent-child", "Searches small pieces, and returns the larger section around the match", "Precise match and rich context", "Two levels to store and manage", "Contracts, manuals, long reports"],
          ],
        },
        {
          kind: "p",
          text: "Recursive splitting is the workhorse. It tries the biggest natural break first, such as a section. It falls back to paragraphs, then sentences, then words, only when a piece is still too big. It needs no model, and the idea fits in one function. Section six builds one for the PEPs.",
        },
        {
          kind: "p",
          text: "**Parent-child** retrieval, also called small-to-big, keeps two sizes. Search runs over small chunks, the children. The model receives the larger section around the match, the parent. Matching stays precise, and the model still gets context. It is the cleanest answer to the size trade-off.",
        },
        {
          kind: "p",
          text: "**Sentence window** retrieval is the same idea at a finer grain. Each sentence is its own child. On a hit, the model receives that sentence and a few sentences on either side.",
        },
        {
          kind: "widget",
          id: "c03-parent-child",
          intro: "Search matches a single sentence from PEP 572, the walrus operator proposal. You can judge each case without knowing Python. For three questions, decide whether that sentence is enough or whether the model needs the whole section around it.",
        },
        {
          kind: "p",
          text: "**Semantic** chunking embeds each sentence and cuts where neighbouring sentences stop being similar. It sounds clever, and it is overhyped as a default. It adds embedding cost at index time and a threshold to tune, and its gains over recursive splitting are inconsistent. Beat the recursive baseline on your own golden set before you adopt it.",
        },
        {
          kind: "p",
          text: "Tables need care in any strategy. Keep a table whole with its header row when it fits. When it does not, split by rows and repeat the header on every chunk, so no chunk holds numbers without their column names.",
        },
        {
          kind: "p",
          text: "Code needs care too. Cut at functions and classes, so a signature stays with its body and docstring. A parser for the language returns its **syntax tree**, the nesting of classes, functions and statements, so those cut points are exact. A fixed-size window cuts straight through them.",
        },
        {
          kind: "quiz",
          id: "rag-03-q3",
          question: "Which strategy suits a Python source file best?",
          options: [
            "Fixed windows of 500 characters.",
            "Splitting on functions and classes using the syntax tree.",
            "Semantic splitting.",
            "A sentence window.",
          ],
          answer: 1,
          explain: "Code has exact structure. Cutting at function and class boundaries keeps a signature with its body. A fixed window cuts through the middle of them.",
        },
        {
          kind: "p",
          text: "Some corpora need no splitting at all. A support FAQ is a list of short question and answer pairs, and each pair is already one idea. Make each pair one chunk, so an answer never loses its question.",
        },
        {
          kind: "widget",
          id: "c03-strategy-matcher",
          intro: "Seven very different documents arrive. Pick the splitting strategy you would start with for each, then see how well you matched strategy to shape.",
        },
        {
          kind: "p",
          text: "Whichever strategy you pick, the cuts only produce text. A chunk also needs labels that say where it came from. The next section designs them.",
        },
      ],
    },
    {
      id: "s4-metadata",
      title: "Metadata on every chunk decides what you can cite, filter and debug",
      goal: "What must a chunk carry besides its text?",
      blocks: [
        {
          kind: "p",
          text: "A chunk is its text plus metadata, the facts about the text such as its title, source and date. Chapter two stored each parsed PEP in a Document dataclass. AskPEP stores each chunk in a `Chunk` dataclass in the same way.",
        },
        {
          kind: "p",
          text: "A `Chunk` copies its document's id, title and source from the Document. It adds its own position in the document, its heading path and a token count. Two **offsets**, `start` and `end`, give the character positions where it begins and ends in the document's text.",
        },
        {
          kind: "code",
          lang: "python",
          code: `Chunk(
    doc_id=8,
    idx=6,
    title="PEP 8 – Style Guide for Python Code",
    source="https://peps.python.org/pep-0008/",
    heading_path=["PEP 8 – Style Guide for Python Code", "Code Lay-out", "Maximum Line Length"],
    text="Maximum Line Length\\n-------------------\\n\\nLimit all lines to ...",
    token_count=371,
    start=6164,
    end=7646,
)`,
          caption: "One chunk from the Maximum Line Length section. The numbers are illustrative. The offsets count characters into the document body, so they will differ in your copy.",
        },
        {
          kind: "p",
          text: "The heading path earns its place three times. It gives a readable citation. It gives a filter, such as only chunks under a heading called Specification. And it gives context for the embedding. Its first entry is always the document title.",
        },
        {
          kind: "p",
          text: "That third use is a cheap trick worth knowing. The `embedding_text` property joins the heading path to the chunk's text, and that string is what gets embedded. A short chunk then carries its PEP's title and section names into its vector. Chapter fifteen covers a heavier version called contextual retrieval.",
        },
        {
          kind: "p",
          text: "The offsets are provenance. They let a viewer highlight the exact passage in the source. They also give the chunker a precise rule to test. Every chunk's text must equal the slice of the document between its start and end.",
        },
        {
          kind: "p",
          text: "So test a chunker like any other code. Assert that every chunk is an exact slice of the source, that none exceeds the size limit, and that no text goes missing. These checks catch more bugs than reading sample chunks by eye.",
        },
        {
          kind: "quiz",
          id: "rag-03-q4",
          question: "What is the best reason to store start and end offsets on each chunk?",
          options: [
            "They make vectors smaller.",
            "They map a hit back to the exact source passage, and let tests verify nothing was lost.",
            "They replace the need for ids.",
            "They speed up vector search.",
          ],
          answer: 1,
          explain: "Offsets are provenance. They support highlighting in a viewer and give your chunker tests a precise invariant to assert.",
        },
        {
          kind: "p",
          text: "Chunk ids tie back to chapter two. The `id` property joins the document id and the chunk's position, as in `8#6`, the seventh chunk of PEP 8. An edit near the top of a document shifts every cut after it, so every later position changes.",
        },
        {
          kind: "p",
          text: "That is why chapter two's design replaces every record of an edited document together. Patching one chunk in place is tempting and almost always wrong, because the chunks after the edit no longer match what is stored.",
        },
        {
          kind: "p",
          text: "You now know where to cut and what each chunk carries. Frameworks ship chunkers that make the same choices. The next section compares them with writing your own.",
        },
      ],
    },
    {
      id: "s-alternatives",
      title: "A hand-written splitter is the default until you maintain more than a few formats",
      goal: "Should you write your own chunker or use a framework's splitter?",
      blocks: [
        {
          kind: "p",
          text: "AskPEP uses a hand-written, structure-aware chunker. It cuts on headings first, then paragraphs, then sentences, and it attaches the heading path to every chunk. That is the strategy from section three, in one file you fully control. Frameworks call the same thing a **splitter**.",
        },
        {
          kind: "p",
          text: "LangChain, a popular framework for building LLM apps, ships text splitters. Its recursive character splitter tries a list of separators in order, which is the same fallback idea. It also has splitters that cut on Markdown or HTML headings and carry the headings into metadata. Check the current package layout before you import.",
        },
        {
          kind: "p",
          text: "LlamaIndex, the RAG framework from chapter two, calls its splitters node parsers. A **node** is its name for a chunk. It has a sentence splitter, a hierarchical parser that builds parent and child nodes, and a semantic splitter. The hierarchical parser is parent-child retrieval under another name.",
        },
        {
          kind: "p",
          text: "A semantic splitter brings the costs section three named: embedding calls at index time, a threshold to tune and uneven chunk sizes. Measure one against plain structure splitting on your own questions. AskPEP keeps its own chunker through the build in chapters twelve to fourteen. Chapter eleven teaches how to choose a whole stack.",
        },
        {
          kind: "compare",
          caption: "Four chunking options and what each one costs.",
          columns: ["Tool", "Best at", "Switch to it when", "What it costs you"],
          rows: [
            [
              "Hand-written splitter",
              "Exact control over headings, metadata and chunk ids.",
              "Your formats are few and you want no framework in the ingestion path.",
              "You own the code and every edge case.",
            ],
            [
              "LangChain text splitters",
              "Quick, configurable splitting with common separators and header splitters.",
              "You already use LangChain, or you need a splitter this week.",
              "Defaults split by characters. Another dependency to track.",
            ],
            [
              "LlamaIndex node parsers",
              "Parent and child nodes, and sentence windows, built in.",
              "You use LlamaIndex retrievers that expect nodes.",
              "Nodes tie your data model to that framework.",
            ],
            [
              "Semantic chunkers",
              "Boundaries that follow topic shifts in unstructured prose.",
              "Documents have no headings and fixed sizes cut ideas in half.",
              "Extra embedding cost at ingestion, a threshold to tune and unpredictable chunk sizes.",
            ],
          ],
        },
        {
          kind: "quiz",
          id: "rag-03-alt-q1",
          question: "LlamaIndex offers a hierarchical node parser. Which idea from this chapter does it implement?",
          options: [
            "Overlap between chunks.",
            "Parent and child chunks, where small chunks match and larger ones feed the model.",
            "Token counting.",
            "Embedding normalisation.",
          ],
          answer: 1,
          explain: "A hierarchical parser builds small child nodes linked to larger parents. That is the parent and child retrieval pattern.",
        },
        {
          kind: "fold",
          tone: "industry",
          title: "Frameworks hide the same decisions",
          text: "A framework splitter still has a size, an overlap and a separator list. Switching tools does not remove those choices. It moves them into configuration, so read the defaults before you trust them.",
        },
        {
          kind: "p",
          text: "The PEPs come in one format, and a chunker for it is short. So AskPEP writes its own. The last section shows how that chunker works.",
        },
      ],
    },
    {
      id: "s6-chunker",
      title: "AskPEP's chunker cuts each PEP at headings, then paragraphs, then sentences",
      goal: "How does AskPEP's chunker work, and how do you build it?",
      blocks: [
        {
          kind: "p",
          text: "AskPEP's chunker takes one Document and returns its chunks in three passes. It finds the sections, cuts each section into pieces that fit the limit, then packs the pieces into chunks. Each pass returns offsets into the document's text, never new strings. So every chunk stays an exact slice.",
        },
        {
          kind: "p",
          text: "RST marks a heading with an underline. The title sits on its own unindented line, after a blank line. The next line repeats one punctuation character, at least as long as the title. In PEP 8, Code Lay-out is underlined with equals signs, and Maximum Line Length with hyphens.",
        },
        {
          kind: "p",
          text: "RST fixes no character for each level. The first underline character to appear marks level one, the next new one marks level two, and so on. So in PEP 8, equals signs mark sections and hyphens mark the subsections inside them. The heading path of Maximum Line Length is the title, then Code Lay-out, then Maximum Line Length.",
        },
        {
          kind: "p",
          text: "Each section is then cut at blank lines into paragraphs. One kind of paragraph needs care. In RST, a paragraph that ends in a double colon introduces a **literal block**, the indented lines after it, which usually hold code. The chunker keeps the paragraph and its literal block together as one piece.",
        },
        {
          kind: "p",
          text: "A piece that is still over the limit falls back to smaller boundaries, in order: sentences, then lines, then words, then raw characters. That is recursive splitting from section three. A literal block skips the sentence step and starts at lines, so code is cut at line ends.",
        },
        {
          kind: "p",
          text: "Packing joins the pieces back up. It is **greedy**: it adds pieces to the current chunk while the chunk still fits the limit, then starts a new one. Overlap repeats the last sentences of the closed chunk at the start of the next. Packing runs one section at a time, so overlap never carries text across a heading.",
        },
        {
          kind: "p",
          text: "One more rule removes tiny chunks. A heading with no text under it joins the chunk of the section that follows, so no chunk holds a heading alone.",
        },
        {
          kind: "p",
          text: "Sizes are counted in tokens, estimated as one token per four characters, rounded up. That is chapter one's rule of thumb. It is crude, and it is deterministic, which the tests need.",
        },
        {
          kind: "fold",
          tone: "dyk",
          title: "Tokens are not characters",
          text: "The lab estimates one token as four characters, a rule of thumb that provider documentation quotes for English. Real tokenisers, the code that splits text into a model's tokens, differ by model. Code, numbers and non-English text usually need more tokens per character. For budgeting at scale, count with the tokeniser your embedding model uses.",
        },
        {
          kind: "p",
          text: "You build this chunker in the chapter's lab, in the AskPEP repo you set up in chapter two. Its stub and tests are already there, because chapter two copied in the whole course. Every step has tests, and a step is done when its tests pass. They check sizes, offsets, heading paths and lost text.",
        },
        {
          kind: "p",
          text: "The chunker hands chapter four several hundred chunks, each an exact slice of one PEP with its heading path attached. Each one is still only text. Chapter four turns each chunk into a vector, and asks what nearness between two vectors really means.",
        },
      ],
    },
  ],
  lab: {
    title: "Build a structure-aware chunker",
    goal: "Fill in `src/askpep/chunking.py`, in the AskPEP repo from chapter two. Chapter two's setup already copied in its stub and the tests in `tests/rag/test_chunking.py`. Finish chapter two's loader first, because the last step chunks the real corpus. The chunker splits RST on headings, then paragraphs, then sentences. Each chunk stays under a token limit, overlaps its neighbour and carries a heading path. The tests check behaviour, never wording.",
    minutes: 50,
    files: ["src/askpep/chunking.py", "tests/rag/test_chunking.py"],
    steps: [
      {
        title: "Skeleton and the token estimate",
        text: "Open `src/askpep/chunking.py`. Each stub raises `NotImplementedError` with the step that fills it in, such as `\"rag-03 step 1\"`. Write `estimate_tokens` as one token per four characters, rounded up, and add the option checks to `chunk_document`. As in chapter two, `-k ch03_s1` runs only the tests whose names contain that text.",
        code: `# src/askpep/chunking.py
from askpep.types import Chunk, Document

# types.py ships complete. Document is the record you built in chapter two.


def estimate_tokens(text: str) -> int:
    # your turn: one token per four characters, rounded up. Crude, and deterministic, which tests need.
    ...


def chunk_document(doc: Document, *, max_tokens: int = 400, overlap_tokens: int = 50) -> list[Chunk]:
    # your turn, across steps 1 to 5:
    # 1. Raise ValueError if max_tokens is below 1, or overlap_tokens is negative or not below max_tokens.
    # 2. Split doc.text into sections (step 2).
    # 3. Cut each section into pieces that fit (step 3).
    # 4. Pack the pieces into (start, end) offset pairs (steps 4 and 5).
    # 5. Build one Chunk per pair. idx counts from 0 across the document.
    #    heading_path is [doc.title, *the section's path]. text is doc.text[start:end].
    #    token_count is estimate_tokens(text). Copy title and source from doc.
    ...


def chunk_all(docs: list[Document], **opts: int) -> list[Chunk]:
    # your turn: chunk each document in order and join the lists.
    ...`,
        test: "uv run pytest tests/rag/test_chunking.py -k ch03_s1",
      },
      {
        title: "Find headings and build the heading path",
        text: "Fill in `split_sections`. The stub raises `NotImplementedError(\"rag-03 step 2\")`. A heading is an unindented line over an underline of one repeated punctuation character, at least as long as the title. A section runs from its heading to the next one. Text before the first heading is a section with an empty path.",
        code: `# src/askpep/chunking.py
import re
from dataclasses import dataclass

# UNDERLINE and Section are already in your stub. They are shown here so you can read them.
UNDERLINE = re.compile(r"""^([=\\-~^"'\`#*+:._])\\1{2,}\\s*$""")


@dataclass(frozen=True)  # frozen makes the fields read-only
class Section:
    heading_path: list[str]
    start: int
    end: int


def split_sections(text: str) -> list[Section]:
    # your turn:
    # 1. Walk the lines, keeping each line's character offset.
    # 2. A heading is a non-blank, unindented title line that follows a blank line or the start of the text.
    #    The next line must match UNDERLINE and be at least as long as the title.
    # 3. The level of a heading is the order in which its underline character first appears in the text.
    # 4. Keep a stack of titles. For a heading at depth d, cut the stack to d - 1 entries, then push.
    # 5. A section runs from its title line to the next heading, or to the end of the text.
    # 6. Text before the first heading is a section with an empty heading_path. The title is added later.
    ...`,
        test: "uv run pytest tests/rag/test_chunking.py -k ch03_s2",
      },
      {
        title: "Cut a section into pieces that fit",
        text: "In `chunk_document`, split each section on blank lines. A paragraph ending in a double colon owns the indented block after it, a literal block, and so does a paragraph that starts with `.. `. Then fill in `split_long` for any piece over the limit. The stub raises `NotImplementedError(\"rag-03 step 3\")`. It returns offset pairs, never new strings, so the exact slice rule holds.",
        code: `# src/askpep/chunking.py
def split_long(text: str, start: int, end: int, max_tokens: int, level: int = 0) -> list[tuple[int, int]]:
    # your turn:
    # 1. If text[start:end] fits in max_tokens, return [(start, end)].
    # 2. Level 0 cuts at sentence ends, level 1 at line ends and level 2 at words.
    # 3. Past level 2, cut raw slices of max_tokens * 4 characters.
    # 4. Trim each piece, then recurse with level + 1 on any piece that is still too big.
    # 5. If a level finds no boundary, move straight to the next level.
    # chunk_document calls this with level=1 for a literal block, so code is cut at line ends before words.
    ...`,
        test: "uv run pytest tests/rag/test_chunking.py -k ch03_s3",
      },
      {
        title: "Pack pieces into chunks",
        text: "Fill in `pack`, which raises `rag-03 step 4`. Grow the chunk while its slice, whitespace included, fits `max_tokens`. On overflow, close it as `prev`. With `overlap_tokens` above 0, start the next chunk at `overlap_start(text, prev, next_end, overlap_tokens, max_tokens)`, or at the piece's start on `None`. This step's tests use no overlap, so `overlap_start` can wait for step 5. Then replace the step 1 error at the end of `chunk_document`, and build one `Chunk` per pair.",
        test: "uv run pytest tests/rag/test_chunking.py -k ch03_s4",
      },
      {
        title: "Add overlap without crossing headings",
        text: "Fill in `overlap_start`. The stub raises `NotImplementedError(\"rag-03 step 5\")`. It returns where the next chunk starts, so the repeated tail fits the overlap budget and the new chunk fits the limit. It never starts before the previous chunk's start. `pack` runs on one section's pieces, so overlap never crosses a heading.",
        code: `# src/askpep/chunking.py
def overlap_start(
    text: str, prev: tuple[int, int], next_end: int, budget: int, max_tokens: int
) -> int | None:
    # your turn:
    # 1. Return None when budget is 0 or less.
    # 2. Candidates are sentence starts, then word starts, strictly inside prev.
    # 3. Take the earliest candidate b where text[b:prev[1]] is within budget tokens
    #    and text[b:next_end] is within max_tokens.
    # 4. Return None when no candidate qualifies. pack then starts at the piece's own start.
    ...`,
        test: "uv run pytest tests/rag/test_chunking.py -k ch03_s5",
      },
      {
        title: "Edge cases and the full suite",
        text: "Handle empty and whitespace-only documents, and headings with no body. A heading-only section should join the next section's chunk, so no chunk holds a heading alone. Check that a limit below 1, or an overlap that is negative or not below the limit, raises `ValueError`. Then run the whole test file.",
        test: "uv run pytest tests/rag/test_chunking.py",
      },
      {
        title: "Run it on the real corpus",
        // CHECK: P1 chunk count
        test: "uv run python -m askpep.chunking",
        text: "Run the module. It chunks the corpus with the defaults and prints the count. In a Python shell, chunk them again with `max_tokens=100` and `overlap_tokens=20`, and compare. When this lab was written, the defaults gave 704 chunks, and the PEPs change, so expect a number near that. Read the chunks of PEP 8 under Maximum Line Length. Would you be happy to see each as a citation?",
      },
    ],
    verify: "uv run pytest tests/rag/test_chunking.py",
  },
  recap: [
    "Retrieval returns chunks, so a chunk's text is the most the model can learn from one hit.",
    "Small chunks give precision and lose context, while large chunks keep context and blur the vector. Choose size and top k together, against a golden set.",
    "Overlap insures against bad cuts and costs index size. Cutting on the document's own structure prevents most of them.",
    "Match the strategy to the document: structure-aware where structure exists, recursive as the prose default, parent-child when matching and context pull apart.",
    "Every chunk carries its document id, source, offsets and heading path, and the chunker is tested for exact slices, size limits and lost text.",
    "A framework splitter makes the same choices in its configuration, so read its defaults before you trust it.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In chunking I learned that chunk boundaries cap answer quality. So I split on the document's real structure and tune size and overlap against a golden set. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["rag-q05", "rag-q06", "rag-q07", "rag-q08"],
};

export default chapter;
