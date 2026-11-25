import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "docai-08-one-invoice-through-the-system",
  course: "docai",
  number: 8,
  title: "Follow one invoice through the finished system, then check the promise it was built on",
  tagline: "Invoice 20418 touches every decision in the course, and the 30-day review tests whether they paid off.",
  minutes: 30,
  objectives: [
    "Trace one document through every decision in a document pipeline.",
    "Check a promised saving against measured clerk time and the real bill.",
    "Run a 30-day review with a target, a measured figure and an owner for each check.",
    "Reuse the course's artefacts in order on a new customer engagement."
  ],
  sections: [
    {
      id: "s1-trace",
      title: "Invoice 20418 passed through every decision, and it cost 38 pence instead of 152",
      goal: "What happens to one awkward invoice in the finished system?",
      blocks: [
        {
          kind: "p",
          text: "Chapter seven left one question open. Chapter two justified Harbour Reader by saying a box on the page would save a clerk two minutes. The system has now been live for 30 days, so that claim can be tested. Start with the one document that has run through the whole course."
        },
        {
          kind: "p",
          text: "Invoice 20418 from Northgate Pallets arrived in a three-page PDF. Chapter one sorted its pages. Chapter two's extractor read them. Chapter four's sum rule failed it on the first day, because the rule ignored Northgate's 45 pound trade discount."
        },
        {
          kind: "p",
          text: "The team kept a trace for that invoice and added a line each time a decision touched it. Here is the whole record, with the chapter that made each decision."
        },
        {
          kind: "code",
          lang: "text",
          caption: "One invoice, traced against the chapter that decided each step. Worked example, invented rates.",
          code: "TRACE: northgate-2026-11-03.pdf    doc-3fa94c1e0b77\n\nCh  Step          What happened                                      Cost\n1   Sort pages    p1 scan, p2 clean text, p3 cid codes so OCR\n                  Invoice is p1. Remittance p2 is filed.\n2   Extract       hr-extract-v1 reads 10 fields with boxes            2.4p\n3   Route         Sheet says OCR, so Custom Extractor first\n4   Check         Net plus VAT passes: 405 + 81 = 486\n                  Sum rule fails: lines 450, net 405\n3   Escalate      Argon reads once, gets the same figures             1.8p\n7   Ground        Quotes match the extractor's boxes\n                  Invented purchase order has no match: to review\n4   Review        Clerk sees the box, finds the 45 discount in 41 s  34.2p\n4   Fix           Rule becomes lines minus discount\n2   Retrain       hr-extract-v2 gains a discount field\n5   Post          Idempotent write, one ledger entry\n5   Paper copy    Posted copy arrives, different checksum\n6   Split         Post room tray: the copy becomes its own segment\n5   Guard         duplicate_key matches supplier and number: held\n\nTotal for the first read                                             38.4p\nSame invoice under the old model layer: 1.8p + 150p                 151.8p"
        },
        {
          kind: "p",
          text: "Read the Cost column first. The two reads cost 4.2 pence. The clerk's 41 seconds cost 34.2 pence at 30 pounds an hour. Even in the improved system, a person is the largest line, so everything before review exists to shorten it."
        },
        {
          kind: "p",
          text: "Now read the two Guard lines. The email and the paper copy had different bytes, so the checksum saw two documents. The split gave the copy a fresh segment id. Only the business key from chapter five connected them. That's the check that stopped a second payment of 486 pounds."
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Keep one trace per awkward document",
          text: "A trace costs a few lines and shows which decision touched which value. It's the quickest way to explain a system to a new sponsor, and it finds rules that have never fired."
        },
        {
          kind: "quiz",
          id: "docai08-q1",
          question: "The email and the posted copy of one invoice have different checksums. What stops the second one being paid?",
          options: [
            "The file checksum.",
            "The segment id.",
            "The business key of supplier and invoice number.",
            "The confidence threshold."
          ],
          answer: 2,
          explain: "Different bytes give a different checksum and segment id. The business key is built from what the document says, so it matches across both copies."
        },
        {
          kind: "p",
          text: "One invoice shows the mechanism. The monthly figures show whether it paid."
        }
      ]
    },
    {
      id: "s2-bill",
      title: "The box saved 1.9 minutes and the net saving beat the plan, because Argon's bill fell",
      goal: "Did the promised saving arrive?",
      blocks: [
        {
          kind: "p",
          text: "Chapter two promised 160 pounds a month in saved clerk time. It set that against 57.60 pounds of new reading cost, for about 102 pounds net. The labelling bill was 420 pounds, so payback was about four months. The sponsor asked for the same sum with measured figures."
        },
        {
          kind: "p",
          text: "The accounts payable lead timed 200 boxed reviews across the month. The mean was 66 seconds. A review used to take 180 seconds, so the box saved 114 seconds, or 1.9 minutes. That's slightly short of the promise. Invoice 20418's 41 seconds was faster than most."
        },
        {
          kind: "p",
          text: "Review volume also came in higher than planned. Scans sent to review rose from 160 to 168 a month, because the Custom Extractor reads a little worse than Argon on Harbour's odd layouts. The plan had missed one thing in Harbour's favour. Argon's bill fell when it stopped reading every scan."
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's before and after for scanned invoices, in pounds a month. Worked example. Clerk time at 30 pounds an hour.",
          code: "SAVING CHECK: scanned invoices, 30 days after go-live\n\n                         Before            After\nReviews                  160               168\nTime per review          180 s             66 s\nCost per review          150p              55p\nReview bill              240.00            92.40\nReading                  Argon 36.00       Extractor 57.60\n                                           Argon 7.20\nReading bill             36.00             64.80\n\nSaved on review                                147.60\nExtra reading                                   28.80\nNet saving a month                             118.80\nPlan                                           102.40\nLabelling paid back in                         3.5 months (plan: about 4)\n\nNew work, outside the comparison\nCredit notes                                     8.40\nBundle splitting, 1,440 reads at half a cent     5.76\nReader bill, all document types                190.34"
        },
        {
          kind: "p",
          text: "Read the three lines under After. The review bill fell by 147.60 pounds and the reading bill rose by 28.80. The plan had counted the whole 57.60 as new money, and that was too pessimistic. Being wrong in your favour is still being wrong, so the team recorded why."
        },
        {
          kind: "p",
          text: "The last block is new work that the first plan didn't include. The reader bill went from 176.18 pounds in chapter three to 190.34. Credit notes and bundle splitting added 14.16, and both replaced work done by hand."
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A timed sample is the weakest number on this sheet",
          text: "The saving rests on 200 timed reviews from one month, in a team that knew it was being timed. Time another sample after three months before you quote this figure to anyone new."
        },
        {
          kind: "quiz",
          id: "docai08-q2",
          question: "A box cuts a review from 180 seconds to 90 seconds. Clerks cost 30 pounds an hour, and there are 200 reviews a month. What does the box save each month?",
          options: [
            "50 pounds",
            "75 pounds",
            "150 pounds",
            "300 pounds"
          ],
          answer: 2,
          explain: "Thirty pounds an hour is 50 pence a minute. Ninety seconds is 75 pence a review. Across 200 reviews that's 150 pounds."
        },
        {
          kind: "p",
          text: "A positive sum doesn't mean the system is healthy. The sponsor's other question was what might still go wrong."
        }
      ]
    },
    {
      id: "s3-go-live",
      title: "A 30-day review puts a target, a measured figure and an owner on every check",
      goal: "How does Harbour decide the system is safe to keep running?",
      blocks: [
        {
          kind: "p",
          text: "Harbour's review took one meeting with the sponsor, the accounts payable lead, the IT lead and the FDE. Each check came from an earlier chapter and had a target agreed before go-live. Each figure on the sheet is a measured one, and each has a named role beside it."
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour Reader's 30-day review. Worked example.",
          code: "30-DAY REVIEW: Harbour Reader\n\nCheck                       Ch  Target     Measured   Verdict  Owner\nDocument pass on test-v1     2  60         66         pass     FDE\nBoxed review, mean time      2  60 s       66 s       accept   AP lead\nScans to review              4  8%         8.4%       accept   AP lead\nAudit of auto-accepted       4  1 in 50    1 in 50    pass     AP lead\nDocuments lost               5  0          0          pass     IT lead\nDuplicates paid              5  0          0 (2 held) pass     AP lead\nBundles over 30 pages        6  clerk ok   all seen   pass     AP lead\nCalls outside europe-west2   7  0          0          pass     IT lead\n\nDecision   Keep running. Widen auto-accept only after a second clean audit.\nOpen       1. Retime the boxed reviews at three months. Owner: AP lead.\n           2. Recheck London's processor list each quarter. Owner: FDE.\n           3. Google's pages disagree on the generative Custom Extractor\n              in London. Stay on the trained model. Owner: FDE."
        },
        {
          kind: "p",
          text: "Two rows say accept where the others say pass. The boxed review and the review share each missed their targets by a small margin. The sponsor accepted both, with the sums above as the reason. That's the purpose of an agreed target: a miss becomes a recorded decision, and nobody has to argue from memory."
        },
        {
          kind: "p",
          text: "The Open list holds what this course couldn't settle. A processor that isn't in London today may be there next quarter, and that would change chapter six's route. Writing the recheck down with an owner stops it being forgotten."
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer: copy this and fill it in.",
          code: "30-DAY REVIEW: [system]\n\nCheck    Target    Measured    Verdict    Owner\n\nDecision\nOpen"
        },
        {
          kind: "p",
          text: "Proving that a system paid for itself is a strong interview topic."
        },
        {
          kind: "callout",
          tone: "interview",
          title: "You shipped a document pipeline. How do you show it paid for itself?",
          text: "Open with the measured net saving, then its parts: review time before and after, review volume and the change in reading cost. Name the assumption that was weakest and how you measured it. Then give the checks a sponsor signed, with owners. Interviewers push on what the plan got wrong."
        },
        {
          kind: "quiz",
          id: "docai08-q3",
          question: "A 30-day review shows one figure slightly short of its agreed target. What should happen?",
          options: [
            "Change the target to match.",
            "Record it, recompute the saving and let the sponsor decide.",
            "Leave it off the sheet.",
            "Roll the system back at once."
          ],
          answer: 1,
          explain: "A small miss needs a visible decision from the person who owns the outcome. Moving the target or hiding the line removes the reason for having one."
        },
        {
          kind: "p",
          text: "Harbour's system is finished. What travels with you is the order in which it was built."
        }
      ]
    },
    {
      id: "s4-kit",
      title: "The course's artefacts form a kit that works in order on your next customer",
      goal: "What do you reuse on the next document project?",
      blocks: [
        {
          kind: "p",
          text: "Every chapter left one or more sheets with a template. Their order matters. Each sheet answers a question that the next one depends on. You can't price readers before you've sorted pages. You can't set a confidence cut-off before you have a reader."
        },
        {
          kind: "compare",
          caption: "The kit, in the order you'd use it on a new engagement.",
          columns: [
            "Chapter",
            "Question",
            "Sheet to fill in"
          ],
          rows: [
            [
              "One",
              "What is on each page?",
              "Page routing sheet and extraction record"
            ],
            [
              "Two",
              "Buy or train, and how good is it?",
              "Processor decision record, labelling plan and version record"
            ],
            [
              "Three",
              "Which reader gets which document?",
              "Reader routing table"
            ],
            [
              "Four",
              "When can a value be trusted?",
              "Validation rule sheet, reliability table and review item"
            ],
            [
              "Five",
              "Will it survive the volume?",
              "State table and capacity sheet"
            ],
            [
              "Six",
              "Is this file really one document?",
              "Merge sheet and splitter evaluation"
            ],
            [
              "Seven",
              "Is a vision model the right reader?",
              "Reader choice, grounding and reader decision record"
            ],
            [
              "Eight",
              "Did it pay, and is it safe?",
              "Saving check and 30-day review"
            ]
          ]
        },
        {
          kind: "p",
          text: "Three of Harbour's answers won't transfer, so don't copy them. London's missing processors shaped the bundle route. The 1.8 pence and 2.4 pence prices are this course's working figures, and Google's Document AI price list must be read fresh. The 30 pound clerk is Harbour's."
        },
        {
          kind: "p",
          text: "The method does transfer. Measure what a person spends on the work today. Find the part of that time a reader can remove. Spend on evidence only where somebody will look at it. Then come back after 30 days and check the number you promised."
        }
      ]
    }
  ],
  recap: [
    "One traced document shows which decision touched which value, and finds rules that have never fired.",
    "Checksums catch identical bytes, and only a business key catches two copies with different bytes.",
    "Check a promised saving with measured time, measured volume and the real change in reading cost.",
    "A 30-day review gives every check a target, a measured figure, a verdict and an owner.",
    "The course's sheets work in order on a new customer, and the prices and regions must be read fresh."
  ],
  reinforcement: "I am becoming a forward-deployed AI engineer. In following one invoice through the system I learned to trace a document against each decision, to check a promised saving with measured clerk time and to run a 30-day review with owners. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: [
    "docai-q16"
  ]
};

export default chapter;
