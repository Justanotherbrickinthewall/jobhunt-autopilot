import type { Chapter } from "../types";

const chapter: Chapter = {
  "id": "agents-16-voting-and-debate",
  "course": "agents",
  "number": 16,
  "title": "Voting and debate buy accuracy with extra model calls",
  "tagline": "Can asking several times, or letting agents argue, give a more accurate answer? It can, when the answer is short or a source can settle the argument. Price the extra calls first.",
  "minutes": 55,
  "objectives": [
    "Say when asking again can make one answer more accurate, and what each extra answer costs.",
    "Tell voting and debate from reflection and fan-out by who decides and what state each keeps.",
    "Build self-consistency from a normaliser, a tally and a tie rule written in code.",
    "Build a debate whose debate judge returns a verdict that code checks, and read the cost of each run.",
    "Name four ways voting and debate fail, and the guard for each.",
    "Choose between voting, debate and neither, sketch voting in LangGraph and give the 30-second answer."
  ],
  "sections": [
    {
      "id": "s1-problem",
      "title": "A short answer can be checked by counting, so extra calls can buy accuracy",
      "goal": "When can extra model calls make a single answer more accurate?",
      "blocks": [
        {
          "kind": "p",
          "text": "Chapter 15 ran the independent parts of one question at the same time. Each part still got one answer. This chapter asks whether more than one answer helps. Can asking several times, or letting agents argue, give a more accurate answer?"
        },
        {
          "kind": "p",
          "text": "Ask the PEP desk which Python version added the walrus operator. Most of the time the model says 3.8. Now and then it says 3.9. One call can't tell you which kind of answer you got. The answer is short, though, so you can ask again and compare."
        },
        {
          "kind": "p",
          "text": "There are two ways to use the extra answers. **Self-consistency** means asking the same question several times and taking the most common answer. Each call casts one vote, and code counts the votes."
        },
        {
          "kind": "p",
          "text": "The second way reads arguments instead of counting answers. In a **debate**, two agents argue for a set number of rounds, then a debate judge gives a verdict. The **debate judge** is the model that reads a debate and returns a verdict and a reason."
        },
        {
          "kind": "p",
          "text": "The price is plain. Every extra answer is an extra model call. Chapter 14's reflection spent its extra calls on one critic in a loop. This chapter spends them on many answers to the same question."
        },
        {
          "kind": "callout",
          "tone": "insight",
          "title": "Code picks, and a rule decides",
          "text": "The model never picks the next step here. Code collects the answers, and a rule picks one. The rule is the majority, or a debate judge's verdict that code checks. On chapter 10's map, that puts both patterns on the code side. The cost is that calls multiply with every extra answer."
        },
        {
          "kind": "p",
          "text": "Reflection and fan-out also spend extra calls on one job, and they are easy to confuse with these two. The next section sets all four side by side."
        }
      ]
    },
    {
      "id": "s2-how",
      "title": "Voting counts answers and debate reads arguments, so they suit different outputs",
      "goal": "How do voting and debate differ from reflection and fan-out?",
      "blocks": [
        {
          "kind": "p",
          "text": "Voting keeps one list of answers, each cut down to a form you can compare. Code owns the list, and code picks the winner. Debate keeps a transcript of every argument, and code owns the rounds and the transcript. One more model call, the debate judge, reads it and returns a verdict and a reason."
        },
        {
          "kind": "compare",
          "caption": "Voting and debate against the two patterns they are most often confused with",
          "columns": [
            "Pattern",
            "Who decides",
            "State and its owner",
            "Best for",
            "Cost"
          ],
          "rows": [
            [
              "Voting",
              "A rule in code counts the answers",
              "A list of answers, owned by code",
              "Short answers that can be compared, such as a version number",
              "n calls, about n times the tokens"
            ],
            [
              "Debate",
              "A debate judge reads the transcript, and code checks the verdict",
              "A transcript, owned by code",
              "Answers too long to count, where evidence can be cited",
              "Two calls a round plus one for the debate judge, and the transcript grows every round"
            ],
            [
              "Reflection, chapter 14",
              "A critic returns pass or revise inside a loop",
              "The draft, owned by the writer",
              "One draft improved against a written standard",
              "At least two calls for every attempt"
            ],
            [
              "Fan-out, chapter 15",
              "Code splits the work and merges the results",
              "One result for each part",
              "Independent parts of one job",
              "The same calls, run at the same time"
            ]
          ]
        },
        {
          "kind": "p",
          "text": "So reflection is one critic in a loop, over time. Voting and debate gather many answers at once. Fan-out is the plumbing that can run those answers in parallel, so n votes take about as long as one."
        },
        {
          "kind": "quiz",
          "id": "agents16-q1",
          "question": "You run five votes with fan-out from chapter 15. What changes against five votes in a plain loop?",
          "options": [
            "The answer gets more accurate.",
            "The wall-clock time drops toward one call, and the cost stays at five calls.",
            "The cost drops to one call.",
            "The votes stop sharing the same mistakes."
          ],
          "answer": 1,
          "explain": "Fan-out changes when the calls run, not how many there are. You still pay for five. Votes stop sharing mistakes only through sampling, different prompts or different models, not by running at once."
        },
        {
          "kind": "p",
          "text": "Voting is the simpler of the two, so you build it first."
        }
      ]
    },
    {
      "id": "s3-vote",
      "title": "Self-consistency is a loop, a normaliser and a tally with a tie rule",
      "goal": "How does code make one answer out of n?",
      "blocks": [
        {
          "kind": "p",
          "text": "Work in your AskPEP repository. The file is `src/askpep/patterns/debate.py`, and the reference copy is `capstone/src/askpep/patterns/debate.py` in the my-learn folder. Start with the part that decides: how to make answers equal, and how to count them."
        },
        {
          "kind": "step",
          "id": "agents16-s1",
          "title": "Write the normaliser and the tally",
          "text": "`normalise` cuts an answer down to the part you can compare. For a version question that is the first number with a dot, so `Python 3.8` and `3.8.` both become `3.8`. `tally` returns the winner, the counts and a flag for a tie. On a tie the answer seen first wins, because `Counter` keeps first-seen order.",
          "lang": "python",
          "file": "src/askpep/patterns/debate.py",
          "code": "\"\"\"Voting and debate: spend extra model calls to buy accuracy on a short answer.\n\nStandard library plus the kit. Run it offline with: uv run --no-sync python -m askpep.patterns.debate\n\"\"\"\n\nimport re\nfrom collections import Counter\n\nfrom askpep.patterns.kit import Run, make_model, trace\n\nQUESTION = \"Which Python version added the walrus operator?\"\n\n\ndef normalise(text: str) -> str:\n    \"\"\"Reduce an answer to the part you can compare. Here that is a version number.\"\"\"\n    match = re.search(r\"\\d+\\.\\d+\", text)\n    return match.group(0) if match else text.strip().lower()\n\n\ndef tally(answers: list[str]) -> tuple[str, Counter, bool]:\n    \"\"\"Majority wins. On a tie, the answer seen first wins, and the flag says it was a tie.\"\"\"\n    counts = Counter(answers)\n    best = max(counts.values())\n    leaders = [a for a in counts if counts[a] == best]  # Counter keeps first-seen order\n    return leaders[0], counts, len(leaders) > 1"
        },
        {
          "kind": "p",
          "text": "Keep versions as strings. The string `3.10` is not the string `3.1`, and a float would merge them. The tie rule is arbitrary, and that is fine. It only has to be repeatable. A stronger rule asks for one more vote, or sends the question to the review queue from chapter 12."
        },
        {
          "kind": "widget",
          "id": "agents16-vote-counter",
          "intro": "Four questions follow, each with the raw answers of several voters. Predict what normalising and counting give before you check. Watch the tie, and watch the case where nothing can be counted."
        },
        {
          "kind": "step",
          "id": "agents16-s2",
          "title": "Write the vote",
          "text": "`vote` is self-consistency. It calls the model n times with the same messages, normalises each answer and records a `vote` step. Then it tallies, notes any tie in the trace and returns the run. With a real model the votes only differ if you sample with some randomness.",
          "lang": "python",
          "file": "src/askpep/patterns/debate.py",
          "code": "def vote(question: str, model, n: int) -> Run:\n    \"\"\"Self-consistency: ask the same question n times, normalise, take the majority.\"\"\"\n    run = Run(question, model=model)\n    messages = [{\"role\": \"user\", \"content\": question}]\n    answers = []\n    for _ in range(n):\n        raw = model(messages)[\"answer\"]\n        answers.append(normalise(raw))\n        run.add(\"vote\", f\"{raw!r} -> {answers[-1]}\")\n    run.answer, counts, tied = tally(answers)\n    run.add(\"tally\", \", \".join(f\"{a} x{c}\" for a, c in counts.most_common()) + (\"  (tie, first seen wins)\" if tied else \"\"))\n    run.add(\"answer\", run.answer)\n    return run"
        },
        {
          "kind": "quiz",
          "id": "agents16-q2",
          "question": "Four voters split two to two between 3.8 and 3.9. What does the tally above do, and what would be a better rule?",
          "options": [
            "It raises an error, and the better rule is to ignore ties.",
            "It returns 3.8 because it was seen first. A better rule asks for one more vote.",
            "It returns both answers.",
            "It returns the larger version number."
          ],
          "answer": 1,
          "explain": "The first answer seen wins, and the trace says it was a tie. That is repeatable but weak. An odd number of voters avoids most ties. A tie can also trigger one extra vote, or go to the review queue."
        },
        {
          "kind": "p",
          "text": "A vote works only when answers can be made equal. When the answers are arguments, nothing can be counted, so a debate reads them instead."
        }
      ]
    },
    {
      "id": "s4-debate",
      "title": "A debate costs five calls here and about four times the tokens of five votes",
      "goal": "How does a debate reach a verdict, and what does each run cost?",
      "blocks": [
        {
          "kind": "p",
          "text": "A debate gives each agent one answer to defend. In each round both sides speak, and each sees the transcript so far. After the last round, the debate judge reads the whole transcript. It returns a dict with a `verdict` and a `reason`."
        },
        {
          "kind": "step",
          "id": "agents16-s3",
          "title": "Write the debate",
          "text": "`debate` takes the sides as pairs of a name and a position. It loops over the rounds and the sides, and every message carries the transcript so far. Code checks the debate judge's dict. If the verdict names neither side, the result is `undecided`. The model suggests, and code checks.",
          "lang": "python",
          "file": "src/askpep/patterns/debate.py",
          "code": "def debate(question: str, sides: list[tuple[str, str]], model, rounds: int = 2) -> Run:\n    \"\"\"Two agents argue opposite answers for a set number of rounds. A judge reads the transcript.\"\"\"\n    run = Run(question, model=model)\n    transcript: list[str] = []\n    for rnd in range(1, rounds + 1):\n        for name, position in sides:\n            messages = [\n                {\"role\": \"system\", \"content\": f\"You argue that the answer is {position}. Rebut the other side.\"},\n                {\"role\": \"user\", \"content\": question + \"\\n\" + \"\\n\".join(transcript)},\n            ]\n            line = f\"{name} (round {rnd}): {model(messages)['argument']}\"\n            transcript.append(line)\n            run.add(\"argue\", line)\n    judge = [\n        {\"role\": \"system\", \"content\": \"You are the judge. Return a verdict and a reason.\"},\n        {\"role\": \"user\", \"content\": question + \"\\n\" + \"\\n\".join(transcript)},\n    ]\n    verdict = model(judge)\n    if verdict.get(\"verdict\") not in [position for _, position in sides]:\n        verdict = {\"verdict\": \"undecided\", \"reason\": \"the judge named neither side\"}\n    run.answer = verdict[\"verdict\"]\n    run.add(\"judge\", f\"{verdict['verdict']}: {verdict['reason']}\")\n    run.add(\"answer\", run.answer)\n    return run"
        },
        {
          "kind": "step",
          "id": "agents16-s4",
          "title": "Run all five cases and compare the cost",
          "text": "`demo` runs one question five ways. They are a single call, a clear vote, a tie, five votes that agree on a wrong answer and a two-round debate. Append it with the entry point, then run the module. Every number below is real output.",
          "lang": "python",
          "file": "src/askpep/patterns/debate.py",
          "code": "def demo(live: bool = False) -> list[tuple[str, Run]]:\n    \"\"\"Five runs on one question: one call, a clear vote, a tie, a wrong unanimous vote and a debate.\"\"\"\n    runs = [\n        (\"one call\", vote(QUESTION, make_model([{\"answer\": \"Python 3.8\"}], live), 1)),\n        (\n            \"5 votes\",\n            vote(QUESTION, make_model([{\"answer\": a} for a in [\"3.8\", \"Python 3.8\", \"3.9\", \"3.8.\", \"version 3.8\"]], live), 5),\n        ),\n        (\"4 votes, tied\", vote(QUESTION, make_model([{\"answer\": a} for a in [\"3.8\", \"3.9\", \"Python 3.9\", \"3.8\"]], live), 4)),\n        (\"5 votes, wrong\", vote(QUESTION, make_model([{\"answer\": \"Python 3.9\"}] * 5, live), 5)),\n    ]\n    arguments = [\n        {\"argument\": \"PEP 572 was accepted for 3.8, and the history section says so.\"},\n        {\"argument\": \"The 3.9 release notes mention the operator, so it landed there.\"},\n        {\"argument\": \"Those notes only describe a later fix. The PEP names 3.8.\"},\n        {\"argument\": \"The fix shows the operator was already in use by 3.9.\"},\n    ]\n    judge = {\"verdict\": \"3.8\", \"reason\": \"Only the 3.8 side cites the PEP. The other side cites a later note.\"}\n    model = make_model(arguments + [judge], live)\n    runs.append((\"debate, 2 rounds\", debate(QUESTION, [(\"Side A\", \"3.8\"), (\"Side B\", \"3.9\")], model, rounds=2)))\n    return runs\n\n\nif __name__ == \"__main__\":\n    import sys\n\n    results = demo(live=\"--live\" in sys.argv)\n    for name, run in results:\n        print(f\"== {name}\")\n        trace(run)\n    print(\"\\ncost for one question\")\n    for name, run in results:\n        print(f\"{name:<18} calls {run.model.n_calls:>2}  tokens {run.model.tokens:>4}  answer {run.answer}\")",
          "expect": "== one call\nQ: Which Python version added the walrus operator?\n 1. vote    'Python 3.8' -> 3.8\n 2. tally   3.8 x1\n 3. answer  3.8\nmodel calls: 1, rough tokens: 26\n== 5 votes\nQ: Which Python version added the walrus operator?\n 1. vote    '3.8' -> 3.8\n 2. vote    'Python 3.8' -> 3.8\n 3. vote    '3.9' -> 3.9\n 4. vote    '3.8.' -> 3.8\n 5. vote    'version 3.8' -> 3.8\n 6. tally   3.8 x4, 3.9 x1\n 7. answer  3.8\nmodel calls: 5, rough tokens: 124\n== 4 votes, tied\nQ: Which Python version added the walrus operator?\n 1. vote    '3.8' -> 3.8\n 2. vote    '3.9' -> 3.9\n 3. vote    'Python 3.9' -> 3.9\n 4. vote    '3.8' -> 3.8\n 5. tally   3.8 x2, 3.9 x2  (tie, first seen wins)\n 6. answer  3.8\nmodel calls: 4, rough tokens: 98\n== 5 votes, wrong\nQ: Which Python version added the walrus operator?\n 1. vote    'Python 3.9' -> 3.9\n 2. vote    'Python 3.9' -> 3.9\n 3. vote    'Python 3.9' -> 3.9\n 4. vote    'Python 3.9' -> 3.9\n 5. vote    'Python 3.9' -> 3.9\n 6. tally   3.9 x5\n 7. answer  3.9\nmodel calls: 5, rough tokens: 130\n== debate, 2 rounds\nQ: Which Python version added the walrus operator?\n 1. argue   Side A (round 1): PEP 572 was accepted for 3.8, and the history section says so.\n 2. argue   Side B (round 1): The 3.9 release notes mention the operator, so it landed there.\n 3. argue   Side A (round 2): Those notes only describe a later fix. The PEP names 3.8.\n 4. argue   Side B (round 2): The fix shows the operator was already in use by 3.9.\n 5. judge   3.8: Only the 3.8 side cites the PEP. The other side cites a later note.\n 6. answer  3.8\nmodel calls: 5, rough tokens: 508\n\ncost for one question\none call           calls  1  tokens   26  answer 3.8\n5 votes            calls  5  tokens  124  answer 3.8\n4 votes, tied      calls  4  tokens   98  answer 3.8\n5 votes, wrong     calls  5  tokens  130  answer 3.9\ndebate, 2 rounds   calls  5  tokens  508  answer 3.8"
        },
        {
          "kind": "p",
          "text": "Read the cost table at the end. One call is 26 rough tokens. Five votes are 5 calls and 124 tokens, close to five times as many. The debate is also 5 calls, yet it uses 508 tokens. Each round re-sends the growing transcript, so tokens grow faster than calls."
        },
        {
          "kind": "p",
          "text": "Now read the fourth run. All five votes said 3.9, the tally was unanimous and the answer is wrong. Nothing in the vote can notice."
        },
        {
          "kind": "widget",
          "id": "agents16-vote-value",
          "intro": "Predict what nine fully correlated votes give, then move the three sliders. Find the setting where voting pays most, and the setting where it pays nothing. Watch the cost line as you add voters."
        },
        {
          "kind": "fold",
          "tone": "hood",
          "title": "At temperature zero, n votes are close to one vote",
          "text": "At temperature zero a model gives the same answer to the same prompt, or very nearly the same. Five calls then return five copies, and the vote is wasted. To get different votes, sample with some temperature, vary the prompt or use different models. The kit's scripted model sidesteps this, so a live run is where you check it."
        },
        {
          "kind": "quiz",
          "id": "agents16-q3",
          "question": "A two-round debate uses five calls. Why does it use far more tokens than five votes?",
          "options": [
            "The debate judge writes a very long reply.",
            "Each round re-sends the growing transcript as input, so input tokens grow every call.",
            "Debaters use a larger model.",
            "Votes are cached and debates are not."
          ],
          "answer": 1,
          "explain": "A vote sends the same short question five times. A debate call carries the question plus every earlier line. The last call, to the debate judge, carries the lot. More rounds make it worse."
        },
        {
          "kind": "p",
          "text": "That wrong, unanimous vote is the main failure of this pattern. The next section names it, along with three more."
        }
      ]
    },
    {
      "id": "s5-breaks",
      "title": "Votes fail together when errors are correlated, and debate judges can be swayed",
      "goal": "How do votes and debates fail, and what guards each failure?",
      "blocks": [
        {
          "kind": "p",
          "text": "The maths of a vote assumes the voters' mistakes are uncorrelated, so one voter's error says nothing about another's. Copies of one model given one prompt break that. Their errors are correlated: when one is wrong, the others tend to be wrong the same way. If the model has learned the wrong version, all five copies say it."
        },
        {
          "kind": "p",
          "text": "You then pay five times for one opinion, held with more confidence. That failure and three others each have a guard."
        },
        {
          "kind": "list",
          "items": [
            "Correlated errors: n copies of one model agree on the same wrong answer. Guard: vary the prompt, the model or the evidence, and measure the gain against a single call on a golden set.",
            "A debate judge swayed by length or confidence: the longer or surer argument wins, whatever it cites. Guard: make the debate judge name its evidence, and swap which side speaks first in a second run.",
            "A debate that follows the louder side: a model tends to give way to a confident opponent. The debate then agrees on the louder answer. Guard: fix each side's position, and check the verdict against a source.",
            "Open prose: no two answers are equal, so there is nothing to count. Guard: use a critic with a written standard, as in chapter 14."
          ]
        },
        {
          "kind": "p",
          "text": "Cost and latency are the last limit. Votes in a loop take n times as long as one call. Fan-out fixes the time, not the bill. A budget, as in chapter 6, should cap n and the rounds before any run starts."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Agreement is not evidence",
          "text": "A unanimous vote tells you the voters agree, and nothing about whether they are right. Where a source exists, check the answer against it. On the PEP desk, a vote on a version should end with a lookup in the PEP."
        },
        {
          "kind": "fold",
          "tone": "industry",
          "title": "The name comes from a 2022 paper",
          "text": "Self-consistency was named in the 2022 paper Self-Consistency Improves Chain of Thought Reasoning in Language Models. It samples several reasoning paths and keeps the most common final answer. The paper tested it on arithmetic and commonsense questions, where final answers can be compared. That is the same limit as above: it needs an answer you can count."
        },
        {
          "kind": "quiz",
          "id": "agents16-q4",
          "question": "In a debate, the debate judge picks the side with the longer, more confident argument. The shorter side cited the PEP. Which fix is best?",
          "options": [
            "Add a third debater.",
            "Raise the number of rounds.",
            "Require the debate judge to cite the evidence for its verdict, and check that evidence against the source.",
            "Use a longer transcript."
          ],
          "answer": 2,
          "explain": "The failure is that style beats evidence. More voices or more rounds feed the same bias. A debate judge that must cite evidence, checked against the source, puts the decision back on facts."
        },
        {
          "kind": "p",
          "text": "Each failure tells you when to leave these patterns out. That judgement is what an interviewer wants to hear, and the last section puts it into words."
        }
      ]
    },
    {
      "id": "s6-interview",
      "title": "In an interview, price the extra calls and say what you measured",
      "goal": "When would you choose voting, debate or neither, and how do you say it in 30 seconds?",
      "blocks": [
        {
          "kind": "p",
          "text": "This topic comes up in interviews as a question about cost. The interviewer wants to know whether you would pay for extra calls, and how you would know they helped."
        },
        {
          "kind": "p",
          "text": "Choose voting when the answer is short and comparable, and one call is wrong often enough to cost you. Choose a debate when answers are long and a source can settle them. Choose neither for open prose. Skip both, too, when a better prompt or better retrieval is cheaper, or when the extra calls break the budget."
        },
        {
          "kind": "p",
          "text": "In LangGraph, voting is chapter 15's fan-out with a reducer. `Send` starts one copy of the voter node for each vote. The voters append to a list key through the `operator.add` reducer from chapter 3, and a last node counts. The tally and the tie rule stay plain Python."
        },
        {
          "kind": "code",
          "lang": "python",
          "caption": "Self-consistency in LangGraph: n voters in parallel, then a tally",
          "code": "class S(TypedDict):\n    question: str\n    votes: Annotated[list[str], operator.add]   # reducer merges parallel writes\n    answer: str\n\ndef fan_out(s: S):\n    return [Send(\"voter\", {\"question\": s[\"question\"]}) for _ in range(5)]\n\nbuilder = StateGraph(S)\nbuilder.add_node(\"voter\", lambda s: {\"votes\": [normalise(ask(s[\"question\"]))]})\nbuilder.add_node(\"tally\", lambda s: {\"answer\": tally(s[\"votes\"])[0]})\nbuilder.add_conditional_edges(START, fan_out, [\"voter\"])\nbuilder.add_edge(\"voter\", \"tally\")"
        },
        {
          "kind": "callout",
          "tone": "interview",
          "title": "The 30-second answer",
          "text": "Voting asks the same question n times, normalises the answers and takes the majority. It suits short answers such as a version number, and it costs n times the calls."
        },
        {
          "kind": "callout",
          "tone": "interview",
          "title": "Debate and the limits",
          "text": "Debate has two agents argue opposite answers and a debate judge decide, and its tokens grow with every round. Both fail when errors are correlated, because copies of one model share a blind spot. I run the votes with fan-out so latency stays near one call. I keep them only if they beat a single call on a golden set."
        },
        {
          "kind": "p",
          "text": "In both patterns, code decided which call ran next, and a rule picked the answer. Chapter 17 hands that choice to a model. What if a model, not code, should decide which agent works next?"
        }
      ]
    }
  ],
  "lab": {
    "title": "Change the vote and the debate and watch the cost",
    "goal": "Run the module, then break each assumption one at a time. Every step runs offline. Compare your file with `capstone/src/askpep/patterns/debate.py` in the my-learn folder.",
    "minutes": 20,
    "files": [
      "src/askpep/patterns/debate.py"
    ],
    "steps": [
      {
        "title": "Run it unchanged",
        "text": "Run the module and compare each trace and the cost table with the chapter. The numbers must match: 26 rough tokens for one call, 124 for five votes and 508 for the debate.",
        "code": "uv run --no-sync python -m askpep.patterns.debate"
      },
      {
        "title": "Change the normaliser",
        "text": "In the `5 votes` run of `demo`, replace `3.8.` with `3.8 or so`. Predict the tally, then run it. The tally is still `3.8 x4, 3.9 x1`, because the regex finds `3.8` inside the longer answer. Now change that run's `3.9` to `eight` and run again. The tally reads `3.8 x4, eight x1`. With no number to find, `normalise` keeps the whole word, so it stands as its own answer.",
        "code": "uv run --no-sync python -m askpep.patterns.debate"
      },
      {
        "title": "Break the tie two ways",
        "text": "In the `4 votes, tied` run, add a fifth reply, `3.9`, and pass `5` instead of `4` to `vote`. Predict the winner, then run it. The tally reads `3.9 x3, 3.8 x2`, so 3.9 wins on a plain majority. Undo both changes. Next, in `tally`, change `leaders[0]` to `max(leaders)`, so the larger version wins a tie. In `vote`, change the note `(tie, first seen wins)` to `(tie, larger version wins)`, or the trace will still describe the old rule. Run it. Only the tied run changes, and it now answers 3.9. One catch: `max` compares strings, so it would rank `3.9` above `3.10`.",
        "code": "uv run --no-sync python -m askpep.patterns.debate"
      },
      {
        "title": "Add a round to the debate",
        "text": "Change `rounds=2` to `rounds=3`, and the run's name to `debate, 3 rounds`. After the fourth argument, queue two more replies: `{\"argument\": \"Python 3.8 shipped with the operator a year before 3.9.\"}` and `{\"argument\": \"Most users first met the operator in 3.9 code.\"}`. Predict the call count, and whether tokens grow faster than calls. Then run it. The debate makes 7 calls and uses 837 rough tokens. Calls rose by 40 per cent and tokens by about 65 per cent, because every new line is re-sent in every later call.",
        "code": "uv run --no-sync python -m askpep.patterns.debate"
      }
    ],
    "verify": "uv run --no-sync python -m askpep.patterns.debate"
  },
  "recap": [
    "Self-consistency asks the same question several times, normalises the answers and takes the most common one.",
    "A tie needs a rule written in code, such as the answer seen first or one more vote.",
    "A debate has two sides, a set number of rounds and a debate judge whose verdict code checks.",
    "Votes cost n times the calls, and a debate's tokens grow every round because the transcript is re-sent.",
    "Voting helps on short answers that can be compared, and it can't work on open prose.",
    "Correlated errors, a swayed debate judge, a debate that follows the louder side and open prose are the four ways it fails."
  ],
  "reinforcement": "I am becoming a forward-deployed AI engineer. In voting and debate I learned that extra model calls buy accuracy only when the answer is short enough to count and the voters' mistakes are uncorrelated. Price the multiplier and measure against one call. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  "interviewIds": [
    "agents-c16-q01",
    "agents-c16-q02",
    "agents-c16-q03"
  ]
};

export default chapter;
