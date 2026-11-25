import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "fde-craft-05-telling-project-stories",
  course: "fde-craft",
  number: 14,
  title: "Telling the story of what you shipped",
  tagline: "How do you tell the story so it survives follow-ups? Use a fixed frame, numbers you can prove and a clear line around your own work.",
  minutes: 20,
  objectives: [
    "Tell a project in the six-part frame, in spoken prose, in about two minutes.",
    "Say where each number came from, and mark it as measured or estimated.",
    "Separate what you built, what your team built and what you would design, using an ownership table.",
    "Answer the five follow-ups that every project story invites, and the question actually asked.",
  ],
  sections: [
    {
      id: "s1-six-part-frame",
      title: "The six-part answer frame works for every scenario question",
      goal: "How do I answer a scenario question so it holds together?",
      blocks: [
        {
          kind: "p",
          text: "How do you tell the story so it survives follow-ups? Chapters one to thirteen built Harbour Intake, a fictional engagement, from first call to phase two. This chapter turns it into a two-minute answer. Project stories and scenario questions come up in interviews.",
        },
        {
          kind: "p",
          text: "Scenario questions sound open, and they are not. The interviewer is checking whether you can reason from the problem to a working design, then say what could go wrong. A fixed frame stops you rambling.",
        },
        {
          kind: "p",
          text: "The frame has six parts, always in this order.",
        },
        {
          kind: "list",
          items: [
            "The **direct answer** is one sentence that answers the question.",
            "The **flow** is what happens, in the order things execute.",
            "The **controls** are the safeguards: validation, security, retries, idempotency and logging. Idempotency is from chapter seven.",
            "The **metrics** are the measures that show it works.",
            "The **trade-off** is one choice you made, and what it cost.",
            "The **fallback** is what happens when it fails.",
          ],
        },
        {
          kind: "p",
          text: "Here is Harbour Intake in the frame. The next section sorts its numbers into measured and estimated.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour Intake in the six-part frame. Harbour is fictional, and this is a worked example.",
          code: "Answer:    A fixed pipeline reads each invoice, checks it twice and approves only what passes. A person decides the rest.\nFlow:      Poll the shared inbox, store the PDF, queue it, make one model call, run the checks, then approve or send to review.\nControls:  Reply schema, sum check, ledger check, low confidence under 0.6, a unique index on live invoices, an audit event for every change.\nMetrics:   Baseline 74.0 percent right first time. Run 2 scored 95.5 percent on 200 invoices. Zero wrong amounts approved. Review share 34 percent.\nTrade-off: A fixed pipeline over an agent. It is less flexible, but code routes and the score attaches to one step.\nFallback:  A failed check sends the invoice to the review queue with its reasons. A person posts until the release window.",
        },
        {
          kind: "p",
          text: "Listen to the key points. The answer is one sentence. The controls are two checks, a score line and a unique index. The metrics are four numbers. The trade-off is a fixed pipeline over an agent, and the fallback is the review queue.",
        },
        {
          kind: "p",
          text: "Speak it as prose, without the labels. If you run short of time, give the answer, the controls and the trade-off. Those three show the most judgement.",
        },
        {
          kind: "p",
          text: "Said aloud, the labels vanish and the order stays. I would run a fixed pipeline that approves only what passes its checks. A person decides the rest. Before the pilot, 74 percent of invoices were right first time. Run two scored 95.5 percent, and no wrong amount was approved.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer. The same frame with blank values, to fill from your own project.",
          code: "Answer:    (one sentence that answers the question)\nFlow:      (the steps, in the order they run)\nControls:  (validation, security, retries, logging)\nMetrics:   (what you measured, on how many items)\nTrade-off: (one choice, and what it cost)\nFallback:  (what happens when it fails)",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "If an interviewer asks for STAR, the six parts already cover it",
          text: "STAR means situation, task, action and result. Your first line of flow gives the situation. The direct answer states the task. Flow, controls and trade-off are the action. Metrics are the result, and the fallback is what you learned.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Say the answer first",
          text: "Open with the one-sentence answer. Interviewers decide quickly whether you know the topic. Everything after that sentence is support, and they can stop you whenever they have heard enough.",
        },
        {
          kind: "quiz",
          id: "fde-craft05-q1",
          question: "You have ninety seconds left. Which parts of the frame do you keep?",
          options: [
            "The flow only.",
            "The direct answer, the controls and the trade-off.",
            "The metrics only.",
            "The fallback only.",
          ],
          answer: 1,
          explain: "The answer gives the position, the controls show care, and the trade-off shows judgement. The rest can be added if asked.",
        },
        {
          kind: "p",
          text: "The frame is only as strong as its metrics part. So the next question is which numbers you are allowed to say.",
        },
      ],
    },
    {
      id: "s2-verified-numbers",
      title: "Use only numbers you can prove, and say so when you do not have one",
      goal: "Which numbers can I say out loud, and how do I say them?",
      blocks: [
        {
          kind: "p",
          text: "A number you cannot source is a liability. Interviewers ask where the figure came from. If your answer wobbles, they doubt the rest.",
        },
        {
          kind: "p",
          text: "For each number, know four things. For each number, know what was measured, on what data, how many items and who checked it. If you cannot answer all four, do not say the number as a fact.",
        },
        {
          kind: "list",
          items: [
            "Say it with its source: on an eval set of 200 invoices, invoice accuracy was this.",
            "Say it as an estimate when it is one: about, from a sample, from the customer's own count.",
            "Say you did not measure it when you did not: we did not have a baseline, so I cannot give a percentage.",
            "Replace an unproven number with what you saw: reviewers stopped complaining about dates.",
          ],
        },
        {
          kind: "p",
          text: "Harbour has both kinds. Chapter five measured the baseline of 74 percent from the PDFs, and chapter eleven measured 95.5 percent on run two. The six minutes an invoice and the payback of 5.4 months are estimates.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's numbers sorted into measured and estimated.",
          code: "Measured\n  Baseline            74.0 percent right first time, 148 of 200\n  Run 2, week 8       95.5 percent, 191 of 200, on the eval set\n  Wrong amounts       0 approved, in both runs\n  Review share        34 percent, at 3 minutes a review\nEstimated\n  Time per invoice    six minutes, the customer's estimate, roughly checked by a one-week time log\n  Payback             5.4 months, on a two-supplier sample",
        },
        {
          kind: "p",
          text: "The first four were measured. The six minutes and the payback are estimates, and the payback rests on two suppliers.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer. One line for each number you plan to say.",
          code: "Measured\n  (name)    (value), (items), (who checked it)\nEstimated\n  (name)    (value), (where it came from)\nNot measured\n  (name)    say so, and what you would measure next time",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Tell your own project and never claim Harbour's numbers",
          text: "Harbour is a worked example. Its 74 percent, 95.5 percent and 5.4 months belong to a fictional engagement. Do not quote them as your own results. Tell a project you did, with numbers you can prove.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Never claim a tool or a result you did not have",
          text: "Do not say you used a service in production if you only read about it. If you have limited experience, describe the design you would use.",
        },
        {
          kind: "quiz",
          id: "fde-craft05-q2",
          question: "You ran a prototype but never measured accuracy. What do you say?",
          options: [
            "Make up a figure that sounds plausible.",
            "Say it was around 90 percent, since that is typical.",
            "Say you did not measure it, describe what you observed, and say how you would measure it next time.",
            "Avoid mentioning accuracy.",
          ],
          answer: 2,
          explain: "An honest gap with a plan is more convincing than an invented number that the next question exposes.",
        },
        {
          kind: "p",
          text: "Numbers settle what happened. The next question is who made it happen.",
        },
      ],
    },
    {
      id: "s3-ownership-boundary",
      title: "Separate what you built, what your team built and what you would design",
      goal: "Which part of the system can I claim as mine?",
      blocks: [
        {
          kind: "p",
          text: "Most real systems are team work. Interviewers expect that. They test whether you can say which part was yours and speak about it in depth. Claiming the whole system invites a question about a part you did not touch.",
        },
        {
          kind: "p",
          text: "Use four labels in your head. **I built** means you wrote it and could take someone through the code. **My team built** means others did it, and you can explain it but not claim it. **I would design** means a plan that never ran. **Unverified** means a claim you cannot support.",
        },
        {
          kind: "p",
          text: "Use the first person only for the first label. Use we, with a name or a role, for the second. Say if I did it again, or at larger scale I would, for the third. Cut the fourth, or turn it into something you can support.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's ownership table. Each part of the engagement gets one label and one sentence you could say.",
          code: "Part                                   Label               What you say\nProblem statement, charter, plan       I built it          I wrote them with the sponsor.\nReply schema, sum check, ledger check  I built it          I wrote the checks and can take you through the code.\nLines check for AC-05                  I built it          An assistant drafted it. I reviewed it and replaced a float tolerance with Decimal.\nLabelling of the 200 invoices          My team built it    The clerks labelled them. I wrote the labelling rule and ran the evaluation.\nMailbox access, release window         My team built it    Harbour's IT lead set up access and runs the system afterwards.\nOther suppliers' formats               I would design it   Untested. I would build a new eval set before adding one.\nIt would work for every supplier       Unverified          Cut it. Only two suppliers were tested.",
        },
        {
          kind: "p",
          text: "Read it aloud. The checks are mine. The assistant drafted the lines check, and I own the review. The clerks labelled the invoices, so that is the team's work. The claim for every supplier goes.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer. One row for each part of your own project.",
          code: "Part    Label    What you say\n(part)  (I built it, My team built it, I would design it, or Unverified)  (one sentence, in the right voice)",
        },
        {
          kind: "p",
          text: "Interviewers test this boundary directly, so the next card sorts eight statements.",
        },
        {
          kind: "widget",
          id: "fde-craft-claim-sorter",
          intro: "Eight statements from a sample project story by a fictional candidate. Sort each one into the honest category.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Which part did you build yourself?",
          text: "This question tests the ownership line. A strong answer names a specific component, says what was hard about it, and gives a decision you made. It then names what the team did without minimising it. A weak answer repeats the project summary.",
        },
        {
          kind: "quiz",
          id: "fde-craft05-q3",
          question: "Which sentence is honest about a deployment your team did?",
          options: [
            "I deployed it on Google Cloud.",
            "The team deployed it on Google Cloud. I wrote the validation step and read the deploy scripts.",
            "It was deployed on Google Cloud with great results.",
            "We built everything from scratch.",
          ],
          answer: 1,
          explain: "It credits the team, claims only your own part, and shows you understood the rest.",
        },
        {
          kind: "p",
          text: "A clear line around your work makes the next questions easy to predict. They are the follow-ups.",
        },
      ],
    },
    {
      id: "s4-follow-ups",
      title: "Practise the five follow-ups, and answer the question you were asked first",
      goal: "Which follow-ups come next, and how do I answer each one?",
      blocks: [
        {
          kind: "p",
          text: "Any project story draws the same follow-ups. This list is a judgement from how interviews tend to go, not a study. Prepare each one in advance, and practise saying it aloud.",
        },
        {
          kind: "list",
          items: [
            "How did you measure that? Have the eval set, the metric and the size ready, or say that you did not.",
            "What went wrong, or what would you change? Have one real mistake and what you learned from it.",
            "What was your part? Have a component, a decision and its reason.",
            "Where were you, and who else was on it? Say whether you worked on site with the customer or remotely, how many people were involved and what each one did.",
            "Where does the AI stop? Say which steps the model decided, which were plain rules, and where a person took over.",
          ],
        },
        {
          kind: "p",
          text: "Harbour has an answer for each. It measured on 200 invoices. The real mistake was one supplier printing a tax point beside the invoice date, fixed with one labelling rule and one prompt change. The model made one call, and code made every other decision.",
        },
        {
          kind: "p",
          text: "One rule covers all five. Answer the question that was asked before you add anything else. If they ask where the AI stops, name the boundary first, then give the story around it.",
        },
        {
          kind: "p",
          text: "Use your own project here. Fill each part of the frame with one sentence, and tick each number you can prove. Nothing you type is saved.",
        },
        {
          kind: "widget",
          id: "fde-craft-story-builder",
          intro: "Fill your own project into the six-part frame. The check shows missing parts and numbers you have not marked as provable.",
        },
        {
          kind: "p",
          text: "Say your story aloud twice, with a timer. Aim for two minutes for the full frame and ninety seconds for the short version.",
        },
        {
          kind: "quiz",
          id: "fde-craft05-q4",
          question: "An interviewer asks: what went wrong? What is the strongest reply?",
          options: [
            "Nothing went wrong.",
            "A real problem, what caused it, what you changed and how you checked the fix.",
            "A problem that was clearly someone else's fault.",
            "A long list of minor issues.",
          ],
          answer: 1,
          explain: "A concrete mistake with a cause, a change and a check shows judgement. Claiming nothing went wrong sounds untrue.",
        },
        {
          kind: "p",
          text: "A story looks back. So what do you do when someone hands you a new vague problem? Chapter fifteen takes that on.",
        },
      ],
    },
  ],
  recap: [
    "Answer in six parts: answer, flow, controls, metrics, trade-off, fallback.",
    "Put the one-sentence answer first.",
    "Know the source of every number, and say whether it was measured or estimated.",
    "Use the first person only for what you built.",
    "Prepare five follow-ups: how you measured, what went wrong, what was your part, where you were and where the AI stops.",
    "Tell your own project, and never claim Harbour's numbers.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In telling project stories I learned to answer in the six-part frame and use only numbers I can prove. I separate what I built from what my team built and what I would design. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["fde-craft-q09", "fde-craft-q10"],
};

export default chapter;
