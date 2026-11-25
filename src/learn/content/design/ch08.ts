import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "design-08-one-full-round",
  course: "design",
  number: 8,
  title: "One prompt, answered in full inside 45 minutes",
  tagline: "Can you do all of this, in order, inside 45 minutes? This chapter answers chapter one's prompt on the clock, with the review queue priced.",
  minutes: 45,
  objectives: ["Turn a one-sentence prompt into numbers and a contract in five minutes.", "Draw the full assistant, sized for month end and priced with its reviewers.", "Name four failures, each with a control the model cannot override.", "Answer three follow-ups with numbers, including one that falls short.", "Read the finished sheet aloud in under a minute and rehearse against a timer."],
  sections: [
    {
      id: "s1-open",
      title: "The first five minutes turn one sentence into numbers and a contract",
      goal: "What do you settle before you draw anything?",
      blocks: [
        { kind: "p", text: "Can you do all of this, in order, inside 45 minutes? This chapter does it once, with the clock running. The prompt is the one from chapter one: design an assistant that answers supplier questions about invoice status and payment." },
        { kind: "p", text: "Chapter one gave that prompt a first pass and left the review queue unpriced. Since then you have learned to size for a peak, tier actions, isolate readers and defend a decision. All of it applies here." },
        { kind: "compare", caption: "Minute 0 to 5. Each answer changes what you draw.", columns: ["You ask", "The interviewer says", "What it decides"], rows: [["How many emails, and what is the busiest period?", "3,000 a day. 6,000 at month end, with half in the three hours from 09:00", "The sizing"], ["How much of that is status questions?", "40 percent", "1,200 drafts a day, 2,400 at month end"], ["How fast must a reply go?", "Within four hours", "A queue is allowed"], ["What may it do?", "Reply about status and payment dates, and change nothing", "One outside action, the email"], ["What must never happen?", "A wrong payment date, or one supplier seeing another's invoices", "The evals and the isolation design"], ["Does a person approve replies?", "At first, every one", "Reviewers are on the bill"]] },
        { kind: "p", text: "Now say the contract back in one breath. The assistant reads the ledger and sends one kind of email, and a person approves each email. It replies within four hours, even at month end. It never states a date that the ledger doesn't hold." },
        { kind: "p", text: "That took five minutes, and you have drawn nothing yet. The next twenty minutes go on the drawing and the bill." },
        { kind: "quiz", id: "design08-q1", question: "You have five minutes and six possible questions. Which question should you drop?", options: ["What share of the emails are status questions?", "Which programming language does the team prefer?", "What must never happen?", "What is the busiest period?"], answer: 1, explain: "A different language would not change the drawing. The other three each change the sizing, the review load or the evals." },
      ],
    },
    {
      id: "s2-draw",
      title: "The drawing reuses five earlier patterns, and the reviewers set the size",
      goal: "What do you draw, how big is it and what does it cost?",
      blocks: [
        { kind: "p", text: "Draw one request from left to right, and name the pattern each box comes from. You have met every box already. The interviewer sees a design that was assembled from reasons." },
        { kind: "code", lang: "text", caption: "Minute 5 to 15. The one drawing you leave on the board.", code: "Email\n  [Queue]\n  [Classifier: small model]\n     +-- anything else: [Human inbox]\n     +-- status question:\n  [Supplier match: sender domain against the supplier file]\n     +-- no match: [Human inbox]\n     +-- match, supplier id set by code:\n  [Ledger lookup: fixed queries, no model]\n  [Drafter: large model, reads the lookup result]\n  [Date check: code]\n     +-- a date not in the lookup: [Human inbox]\n  [Review queue: a person approves the exact text]\n  [Send: recipient taken from the supplier file]\n  [Audit log]" },
        { kind: "compare", caption: "Each box comes from a chapter you have finished.", columns: ["Box", "Pattern", "From"], rows: [["Queue before each stage", "Absorb the peak and keep the work", "Chapter two"], ["Review of the exact text", "An irreversible action is Tier 2", "Chapter three"], ["Supplier id set by code", "Identity comes from a trusted record", "Chapter four"], ["Fixed ledger queries", "The database decides what runs", "Chapter five"]] },
        { kind: "p", text: "Notice what is missing. This design has no text to SQL. A status question has only a few shapes, so a handful of parameterised queries covers them. A model that writes queries would add risk and buy nothing." },
        { kind: "p", text: "Now size it from the deadline, as chapter two taught. At month end, 3,000 emails arrive in three hours, and 40 percent need a draft. That makes 1,200 drafts in the peak. The last of them arrives at hour 3 and must be answered by hour 7." },
        { kind: "p", text: "So 1,200 drafts over 7 hours is 171 an hour. Add 25 percent headroom to reach 214 an hour, which is 0.0595 a second. At 8 seconds a draft that is 0.48 of a worker. One worker is enough, and you run two for redundancy." },
        { kind: "p", text: "The machines are easy. The people are the design. A reviewer spends one minute a draft. At month end, 2,400 drafts take 40 hours, so you need 6 reviewers on 7.5 hour days. On a normal day, 1,200 drafts take 20 hours and need 3." },
        { kind: "code", lang: "text", caption: "Minute 15 to 25. The bill on a normal day.", code: "Classifier      3,000 x 0.00034 pounds        1.02\nDrafter         1,200 x 0.015 pounds         18.00\nModel total                                  19.02 pounds a day\n\nReview          1,200 x 1 minute at 18 pounds an hour\n                1,200 x 0.30 pounds         360.00\n\nTotal                                       379.02 pounds a day\nReview share    360.00 / 379.02             95 percent\nMonthly         379.02 x 22 working days    about 8,340 pounds" },
        { kind: "p", text: "Chapter one's first pass said the drafter was the biggest cost. That was true of the model bill. On the whole bill the biggest cost is the reviewer, at 95 percent. This is the sentence that earns the most credit in the round." },
        { kind: "quiz", id: "design08-q2", question: "Chapter one found the drafter was 95 percent of the model bill. What does the full bill show?", options: ["The drafter is still the biggest cost.", "Review is 95 percent of the whole bill, so the review rate is the lever.", "The classifier should move to the large model.", "Model cost and review cost are about equal."], answer: 1, explain: "Review is 360 pounds of 379.02. Halving the model bill saves about 9.50 pounds. Halving the reviews saves 180." },
        { kind: "p", text: "You have a drawing and a bill at minute 25. The next ten minutes go on what can go wrong." },
      ],
    },
    {
      id: "s3-failures",
      title: "Four failures get a control that the model cannot override",
      goal: "What fails, what stops it and how do you prove it?",
      blocks: [
        { kind: "compare", caption: "Minute 25 to 33. Each control sits outside the model.", columns: ["Failure", "What happens", "Control"], rows: [["The ledger is down", "No lookup, so no facts to draft from", "The queue holds the email, and nothing is guessed"], ["A wrong or spoofed supplier", "Another supplier's data goes out", "Sender domain must match the file, the reply goes only to the address on file, and unknown senders go to the human inbox"], ["A draft invents a date", "A supplier plans on a false date", "Code compares every date in the draft with the lookup"], ["An injection in the email body", "The body tries to steer the assistant", "The body never chooses a tool, and the recipient comes from the file"]] },
        { kind: "p", text: "The date check deserves a sentence aloud. A prompt that says never invent a date is only a request. Code that rejects any date not in the lookup result is a control. That is the same reasoning as the database role in chapter five." },
        { kind: "p", text: "Reply emails are Tier 2 from chapter three, because a sent email can't be recalled. So the approver reads the exact text, the approval binds to its hash and it expires. A time-out never sends." },
        { kind: "p", text: "Each failure needs a number that proves the control works. Date accuracy runs on a golden set of past emails, and the target is 100 percent. A supplier-isolation test set tries to read across suppliers, and the target is zero leaks. The unedited share of drafts shows whether review is still earning its cost." },
        { kind: "p", text: "Roll out in three steps. Run in shadow mode for two weeks, drafting replies that nobody sends. Then serve 10 percent of suppliers, and then all of them. Any leak or wrong date stops the rollout." },
        { kind: "quiz", id: "design08-q3", question: "Which control stops a draft stating a payment date that the ledger does not hold?", options: ["A sentence in the prompt saying never to invent dates.", "A larger model for the drafter.", "Code that compares every date in the draft with the lookup result.", "A reviewer guideline asking for extra care."], answer: 2, explain: "The code check holds whatever the model writes. A prompt or a guideline depends on the behaviour it is trying to control." },
        { kind: "p", text: "At minute 33 the design is complete. The interviewer now uses the last twelve minutes to change it." },
      ],
    },
    {
      id: "s4-followups",
      title: "Three follow-ups test the design, and one of them falls short by 51 pence",
      goal: "How do you answer when the interviewer changes a fact?",
      blocks: [
        { kind: "p", text: "The first follow-up is ten times the volume. That means 30,000 emails and 12,000 drafts a day. The model bill rises to 190.20 pounds, which is easy. Review rises to 200 hours, or 27 reviewers. Review breaks first, as chapter seven predicted." },
        { kind: "p", text: "The lever is a templated class. After shadow mode has proved it, code can fill the plainest 50 percent of status replies from a fixed sentence. Those go out without review. Code copies the date, so the date can't be invented. Review falls to 6,000 drafts a day and 14 reviewers." },
        { kind: "p", text: "The queue, the date check and the supplier match all stay. You would measure the complaint rate on templated replies, and any wrong date stops the class." },
        { kind: "p", text: "The second follow-up is a provider outage of one hour at the month-end peak. The queue holds the work, and nothing is lost. Clearing 1,200 drafts at 214 an hour takes 5.6 hours, and the outage adds one. So the last peak arrival waits 3.6 hours, which is inside the four-hour target." },
        { kind: "p", text: "The third follow-up is half the cost, which means a target of 189.51 pounds a day. Template 600 of the 1,200 drafts. That saves 180 pounds of review and 9 pounds of drafting." },
        { kind: "p", text: "The new bill is 1.02 for the classifier, 9 for the drafter and 180 for review, which is 190.02 pounds. You are 51 pence short. Say so plainly, then name the next lever, such as templating a few more drafts." },
        { kind: "callout", tone: "interview", title: "You are 51 pence short of the target. What do you say?", text: "This comes up in interviews whenever the arithmetic is close. Give the number, name the next lever and state its risk. Rounding it away costs you more than the gap does." },
        { kind: "quiz", id: "design08-q4", question: "An outage of one hour hits the month-end peak. Why is the four-hour target still met?", options: ["The provider refunds the hour.", "The queue holds the work, and drafts clear in 5.6 hours, so the last arrival waits 3.6 hours with the outage.", "Reviewers work through the outage.", "The classifier answers while the drafter is down."], answer: 1, explain: "The peak ends at hour 3. Drafting ends at 5.6 hours plus one hour of outage, which is 6.6 hours. That is 3.6 hours after the last arrival." },
        { kind: "p", text: "The clock has run out. The last section shows what is on the board at minute 45." },
      ],
    },
    {
      id: "s5-sheet",
      title: "The finished sheet answers the prompt, and a timed rehearsal makes it yours",
      goal: "What is on the board at minute 45, and how do you practise?",
      blocks: [
        { kind: "p", text: "This is chapter one's first pass with every blank filled. Compare the two, and notice that the review queue now has a price. The ledger gains its last row, on the decision that drives the bill." },
        { kind: "code", lang: "text", caption: "The finished answer to chapter one's prompt.", code: "DESIGN SHEET: supplier invoice assistant, finished\nPrompt              Answer supplier questions about invoice status and payment\n\n1 Users and volumes 3,000 emails a day, 6,000 at month end\n                    Half of month end in the three hours from 09:00\n                    40 percent are status questions: 1,200 drafts, 2,400 at month end\n2 Non-functionals   Reply within four hours\n                    Under 2 pence of model cost a reply\n                    No wrong payment dates\n                    Supplier A never sees supplier B's invoices\n3 Components        Queue, classifier on the small model, supplier match\n                    Ledger lookup with fixed queries, drafter on the large model\n                    Date check in code, review queue, send, audit log\n4 Data flow         Email, classify, match the sender, look up, draft\n                    Check dates, approve the exact text, send to the address on file\nSizing              171 drafts an hour, 214 with headroom, 0.48 of a worker\n                    Run 2 workers. 3 reviewers, 6 at month end\nCost                Model 19.02 pounds a day, review 360.00, total 379.02\n                    Review is 95 percent. About 8,340 pounds a month\n5 Failure modes     Ledger down: the queue holds the email, nothing is guessed\n                    Wrong supplier: domain match, reply to the address on file\n                    Invented date: code checks every date against the lookup\n                    Injection: the body never chooses a tool\n6 Evals             Date accuracy on a golden set, target 100 percent\n                    Supplier-isolation test set, target zero leaks\n                    Unedited share of drafts\n7 Rollout           Shadow two weeks, then 10 percent of suppliers, then all\n                    Any leak or wrong date stops the rollout\n\nLedger, new row\nDecision                     Gave up                       Revisit when\nReview every draft at launch Cost: 360 pounds a day,       Unedited share passes\n                             95 percent of the bill        95 percent" },
        { kind: "p", text: "Read it out like this. It is a queued assistant that replies within four hours, with code reading the ledger and a person approving every email. It costs about 379 pounds a day. Review is 95 percent of that, so review rate is the lever I would work on." },
        { kind: "p", text: "Then give the risk. The failure that worries me most is an invented date, so code checks every date against the lookup. Shadow mode comes first, and any leak or wrong date stops the rollout." },
        { kind: "code", lang: "text", caption: "For your next rehearsal. Copy it, set a timer and use a prompt you have not seen.", code: "Prompt       ____  (one you have not practised)\nMinute 0     ____  (questions, written with their answers)\nMinute 5     ____  (one drawing, with the model calls marked)\nMinute 15    ____  (sizing, then the bill, with people on it)\nMinute 25    ____  (three failures, each with a control)\nMinute 33    ____  (the follow-ups you took, and each number)\nMinute 45    ____  (the read-out, under one minute)\nLost time    ____  (where the clock went, one line)" },
        { kind: "p", text: "Reading this chapter does not prepare you for the round. Rehearsing does. Set a timer for 45 minutes, take a prompt you have not seen and fill in the sheet. Afterwards, write down where the clock went, and practise that part next." },
        { kind: "p", text: "Two more prompts wait in chapters nine and ten, and both are classical machine learning. One recommends products from a nightly batch. The other scores card payments inside 200 milliseconds. You use the same seven steps and the same sheet. Only the model, and the way it learns, change." },
      ],
    },
  ],
  recap: ["The first five minutes settle the numbers and say the contract back.", "Size from the deadline, then price the reviewers, because they were 95 percent of this bill.", "Each failure gets a control outside the model.", "Give the follow-up's number, and say so when it falls short.", "Rehearse against a timer on a prompt you have not seen."],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In one full round I learned that a design earns credit when the bill includes the people, each failure has a control outside the model, and a shortfall is stated. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["design-q15", "design-q16"],
};

export default chapter;
