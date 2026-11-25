import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "design-10-real-time-fraud-detection",
  course: "design",
  number: 10,
  title: "A 200 millisecond budget and a team of three set where a fraud score becomes a decision",
  tagline: "How do you decide on every card payment in the time it takes to click Pay? Budget the milliseconds, price each mistake and set two thresholds from the costs and the size of the review team.",
  minutes: 60,
  objectives: [
    "Ask the five questions that change a fraud design, and turn the answers into numbers.",
    "Split a 200 millisecond budget across five hops, and choose a default for a timeout.",
    "Compute a streaming feature over a sliding window, and say how training-serving skew breaks it.",
    "Show why accuracy fails at a 0.4 percent fraud rate, and fill a confusion matrix by hand.",
    "Set the review and block thresholds from three costs and a review team, and check the queue fits.",
    "Plan for chargebacks that arrive 75 days late, for drift, and for five named failures.",
  ],
  sections: [
    {
      id: "s1-requirements",
      title: "Five answers from the interviewer turn fraud detection into a 200 millisecond decision with a price on every mistake",
      goal: "Which questions do you ask first, and which answers change the diagram?",
      blocks: [
        {
          kind: "p",
          text: "The prompt is short. Harbour Supplies takes card payments on its trade ordering portal. It must decide allow, review or block on each payment before the card is charged. This chapter runs the seven steps from chapter one on that prompt.",
        },
        {
          kind: "p",
          text: "This design differs from the LLM designs in chapters one to eight. You train the model yourself, from labelled payments, instead of calling one. It answers in milliseconds. Its labels arrive months late. Those two facts shape almost every choice below.",
        },
        {
          kind: "p",
          text: "Ask five questions before you draw anything. Each answer changes the diagram. The 12,000 payments a day are card charges of every kind, including deposits, part-payments and top-ups. They are not the 3,000 orders of chapter nine, so the two chapters share the company and not the volume.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "How long may the decision take? The portal gives it 200 milliseconds. So the check runs inside the payment request, and everything on the path must be fast.",
            "Who pays for a chargeback? A chargeback is the card holder's bank taking the money back after a disputed payment. Harbour pays it, plus a £15 fee. So a missed fraud costs the order and the fee.",
            "How many people review? Three reviewers, each clearing 20 payments an hour for 7.5 hours a day. That caps the review queue at 450 a day.",
            "What does a false block cost? A false block turns away a genuine customer. Harbour puts it at £100 in lost margin and goodwill. So a block must be nearly certain.",
            "How late do the labels arrive? Nine in ten chargebacks arrive within 75 days, and a few take 120. So the newest payments have no verdict yet.",
          ],
        },
        {
          kind: "compare",
          caption: "The requirements, all illustrative, and the design decision each one drives.",
          columns: ["Requirement", "Number", "What it drives"],
          rows: [
            ["Volume", "12,000 payments a day, average payment £400", "Cost of a missed fraud and the size of every table below"],
            ["Peak", "40 percent in the two busiest hours, bursts of 5 a second", "Scoring service capacity and the review queue at peak"],
            ["Fraud rate", "0.4 percent, which is 48 fraudulent payments a day", "Class imbalance, and every metric in this chapter"],
            ["Latency", "200 milliseconds from the portal's call to its answer", "The synchronous path and the timeout default"],
            ["Review team", "3 reviewers, 20 reviews an hour each, 7.5 hours a day", "The review threshold"],
            ["Costs", "Missed fraud £415. False block £100. Review £3", "Both thresholds"],
            ["Label delay", "90 percent of chargebacks arrive within 75 days", "Training windows and monitoring"],
          ],
        },
        {
          kind: "p",
          text: "Do the first sum aloud. With no model, every payment is allowed. 48 frauds at £400 plus a £15 fee is £415 each. That loses £19,920 a day. Every design choice from here is measured against that figure.",
        },
        {
          kind: "quiz",
          id: "design10-q1",
          question: "With no fraud check, 0.4 percent of 12,000 payments are fraudulent. Each costs the £400 payment and a £15 fee. What is the daily loss?",
          options: [
            "£19,200, which is 48 frauds at £400.",
            "£19,920, which is 48 frauds at £415.",
            "£4,455, which is the loss with a model.",
            "£1,992, which is one tenth of the loss.",
          ],
          answer: 1,
          explain: "0.4 percent of 12,000 is 48 payments. Each costs £400 plus the £15 chargeback fee, which is £415. 48 times 415 is £19,920. The first option forgets the fee.",
        },
        { kind: "p", text: "The numbers are on the board. Next comes the path a payment takes through them." },
      ],
    },
    {
      id: "s2-scoring-path",
      title: "Five hops share a 200 millisecond budget, and a timeout defaults to allow",
      goal: "How many milliseconds does each hop get, and what happens when time runs out?",
      blocks: [
        {
          kind: "p",
          text: "The portal calls a scoring service before it charges the card. The service checks that it has not seen this payment before. It reads features, applies rules, runs the model and returns a decision. It writes the decision to a log and answers.",
        },
        {
          kind: "p",
          text: "Budget each hop at the p99, which is the time that 99 payments in 100 beat. The mean hides the slow ones. At 12,000 payments a day, 1 percent is 120 payments, and each of those could hit the timeout.",
        },
        {
          kind: "compare",
          caption: "The latency budget, all illustrative. The five hops and the network add up to 135 milliseconds, which leaves 65 for jitter inside the 200.",
          columns: ["Hop", "Job", "p99 budget"],
          rows: [
            ["Network", "Portal to service and back", "20 ms"],
            ["Ingress", "Parse the request, check the idempotency key", "10 ms"],
            ["Feature lookup", "One batched read of card, account and device features", "40 ms"],
            ["Rules", "Hard blocks and today's patterns", "10 ms"],
            ["Model", "A gradient-boosted tree model, a few hundred trees", "40 ms"],
            ["Decision", "Combine rule and model, write the decision log", "15 ms"],
            ["Total", "20 + 10 + 40 + 10 + 40 + 15", "135 ms"],
            ["Spare", "200 minus 135, kept for jitter and retries", "65 ms"],
          ],
        },
        {
          kind: "p",
          text: "Load is small. Chapter two used Little's law, which says work in progress equals arrival rate times time in the system. A burst of 5 a second at 0.135 seconds each is 0.68 requests in flight. Run three instances anyway, so one can fail.",
        },
        {
          kind: "p",
          text: "Now the timeout. At 200 milliseconds the portal stops waiting and needs an answer anyway. Assume 0.5 percent of payments time out, which is 60 a day. Compare three defaults.",
        },
        {
          kind: "compare",
          caption: "The cost of 60 timeouts a day under each default. Fraud among them is assumed to be the usual 0.4 percent.",
          columns: ["Default", "Working", "Cost a day"],
          rows: [
            ["Allow", "60 times 0.4 percent is 0.24 frauds. 0.24 times £415", "£100"],
            ["Block", "59.76 genuine payments times £100", "£5,976"],
            ["Review", "60 reviews times £3, using 60 of the 105 spare review slots", "£180"],
          ],
        },
        {
          kind: "p",
          text: "Allow wins. A timeout is almost never a fraudster's doing, so blocking punishes genuine customers. Harbour ships the next day, so the payment is scored again within minutes. A high score sends it to review before dispatch.",
        },
        {
          kind: "p",
          text: "Add one guard. If more than 2 percent of the last 500 payments time out, which is 10, the default for accounts under 30 days old becomes review. A slow service then cannot become a free pass for new accounts.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Say the default, and say why",
          text: "Interviewers ask what happens when the model is slow. 'It fails open' is half an answer. The full answer names the default, prices the alternatives and says what catches the payments that slipped through.",
        },
        {
          kind: "quiz",
          id: "design10-q2",
          question: "The hops take 20, 10, 40, 10, 40 and 15 ms at the p99. The limit is 200 ms. How much is spare?",
          options: [
            "55 ms.",
            "65 ms.",
            "135 ms.",
            "200 ms.",
          ],
          answer: 1,
          explain: "20 plus 10 plus 40 plus 10 plus 40 plus 15 is 135. 200 minus 135 is 65. The spare time absorbs jitter, so you never plan to use all 200.",
        },
        {
          kind: "quiz",
          id: "design10-q3",
          question: "Why is block the worst default for a timeout?",
          options: [
            "Blocking is slower than allowing.",
            "Nearly all timed-out payments are genuine, so blocking costs about £5,976 a day against £100 for allow.",
            "Card networks forbid blocking after a timeout.",
            "Blocking fills the review queue.",
          ],
          answer: 1,
          explain: "Of 60 timeouts, about 59.76 are genuine. Each false block costs £100. Allowing costs only the 0.24 frauds expected, which is about £100.",
        },
        { kind: "p", text: "The path has a budget and a default. The feature lookup inside it needs its own section, because that is where this design goes wrong most often." },
      ],
    },
    {
      id: "s3-features",
      title: "Streaming features catch a card-testing attack in seconds, but only if training counts them the way serving does",
      goal: "Which features come from a stream, which from a batch, and how do they drift apart?",
      blocks: [
        {
          kind: "p",
          text: "Some signals only exist as a recent history. A thief tests a stolen card with eight small orders in ten minutes. A normal card makes one payment in a week. The signal is a count, and the count must be fresh.",
        },
        {
          kind: "p",
          text: "A **streaming feature** is a count or sum over a sliding window, kept up to date by a stream processor that reads each payment event. A batch feature is computed on a schedule from stored history. Both sit in an online store, a key-value database read by key in a few milliseconds. Chapter nine builds this store in full.",
        },
        {
          kind: "compare",
          caption: "Six features for Harbour Supplies. The first three are streaming. The last three are batch.",
          columns: ["Feature", "Meaning", "Computed by", "Fresh to within"],
          rows: [
            ["card_payments_10m", "Payments by this card in the last 10 minutes", "Stream processor", "5 seconds"],
            ["account_spend_1h", "Total spend by this account in the last hour", "Stream processor", "5 seconds"],
            ["device_cards_24h", "Distinct cards used on this device in 24 hours", "Stream processor", "5 seconds"],
            ["account_age_days", "Days since the account opened", "Nightly batch", "1 day"],
            ["avg_order_90d", "Average order value over 90 days", "Nightly batch", "1 day"],
            ["past_chargebacks", "Chargebacks on this account, ever", "Nightly batch", "1 day"],
          ],
        },
        {
          kind: "p",
          text: "Work one window by hand. A card paid at 09:03, 09:05, 09:08 and 09:12. A new payment arrives at 09:12:30. The window runs from 09:02:30, so it holds four earlier payments. The serving value of card_payments_10m is 4.",
        },
        {
          kind: "p",
          text: "The processor keeps one counter per minute for each card. It sums the last ten counters on read. That makes the window accurate to one minute. It also makes the memory trivial.",
        },
        {
          kind: "p",
          text: "At 12,000 payments a day you do not need a large cluster. A small consumer and a key-value store carry this load. Say so in the interview. The design stands without the product names.",
        },
        {
          kind: "p",
          text: "Staleness is the hazard. If the consumer falls 15 minutes behind, card_payments_10m reads 0 for every card, and the card-testing attack looks like normal trade. Store the event time with each value. At read time, treat a value older than 60 seconds as missing.",
        },
        {
          kind: "p",
          text: "Now the quieter hazard. Training-serving skew is a difference between how a feature is computed for training and how it is computed live. It usually appears when two teams write the two computations.",
        },
        {
          kind: "p",
          text: "Here is the Harbour case. The training query counts payments in the window, including the current one, so it returns 5 for the example above. The live code counts the window before the current payment is written, so it returns 4. Every count is off by one.",
        },
        {
          kind: "p",
          text: "The model learned that 5 means trouble. Live, it sees 4. Offline recall was 83 percent, which is 40 of 48 frauds. Measured on live traffic after a month, it was 71 percent, which is 34 of 48. Nothing crashed. The numbers were just wrong.",
        },
        {
          kind: "list",
          items: [
            "Share one definition. The same feature code runs in the stream and in the training job.",
            "Log the feature vector at decision time, and train on the logged values for streaming features. This removes the difference by construction.",
            "Replay a day of logged vectors through the training pipeline, and alert if any feature differs by more than 1 percent.",
          ],
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Why log-and-train costs a month",
          text: "Training on logged vectors means a new streaming feature has no history until it has been logged. A feature added today has 30 days of data in 30 days. Batch features can be rebuilt from stored history at any time, as chapter nine shows. That gap is the price of removing skew.",
        },
        {
          kind: "quiz",
          id: "design10-q4",
          question: "A card paid at 09:03, 09:05, 09:08 and 09:12. A new payment arrives at 09:12:30. What does card_payments_10m return at serving time, before the new payment is counted?",
          options: [
            "3.",
            "4.",
            "5.",
            "8.",
          ],
          answer: 1,
          explain: "The window starts at 09:02:30, so all four earlier payments are inside it. Counting the current payment would give 5, and that off-by-one is exactly the skew between a training query and live code.",
        },
        {
          kind: "quiz",
          id: "design10-q5",
          question: "Which control removes training-serving skew for a streaming feature?",
          options: [
            "Train on logged feature vectors from decision time.",
            "Retrain more often.",
            "Raise the model's tree count.",
            "Cache the feature for an hour.",
          ],
          answer: 0,
          explain: "A logged vector is what the model actually saw. Training on it means the two computations cannot disagree. More retraining, bigger models and caching do not touch the cause.",
        },
        { kind: "p", text: "Features feed two things on the path. The next section covers the first, which is the rules that sit beside the model." },
      ],
    },
    {
      id: "s4-rules-model",
      title: "Rules answer today's attack and the hard limits, and the model finds the patterns nobody wrote down",
      goal: "What are rules for, what is the model for, and how do their answers combine?",
      blocks: [
        {
          kind: "p",
          text: "A model needs labelled examples, and labels take about 75 days. A rule needs ten minutes. When a ring of fraudsters starts shipping to one new address this morning, only a rule answers by lunchtime.",
        },
        {
          kind: "compare",
          caption: "What each part of the decision is for.",
          columns: ["", "Rules", "Model"],
          rows: [
            ["Built from", "A person's judgement or a policy", "Labelled past payments"],
            ["Time to change", "Minutes", "Weeks, because of label delay"],
            ["Good at", "Hard limits and a pattern seen today", "Weak signals combined across 40 features"],
            ["Weak at", "Combining many small signals", "Anything new since the last training"],
            ["Example", "Card on the Harbour blocklist, or a sanctioned name", "A new account, a night-time order and a fresh device, together"],
          ],
        },
        {
          kind: "p",
          text: "Order them by cost. Hard rules run first. A blocklisted card is blocked at once, and the model is skipped, which saves 40 milliseconds. The model scores everything else. The final decision is the more severe of the rule's answer and the model's, in the order block, review, allow.",
        },
        {
          kind: "p",
          text: "Hard rules account for some of the 17 payments blocked a day, and the model's top band for the rest. The rules also catch things the model cannot yet know. They are the same-day answer. The model is the answer for the weak signals nobody writes a rule for.",
        },
        {
          kind: "p",
          text: "Rules rot if nobody owns them. Give each rule an owner, an action and an expiry of 30 days. A rule written in a hurry starts as review, not block. Count how often each rule fires, and how often its hits are confirmed.",
        },
        {
          kind: "quiz",
          id: "design10-q6",
          question: "A ring ships to one new address this morning. Which part of the design stops it today?",
          options: [
            "Retraining the model tonight.",
            "A rule, started as review and live within minutes.",
            "A larger feature store.",
            "Nothing, until chargebacks arrive.",
          ],
          answer: 1,
          explain: "Chargebacks take about 75 days, so the model cannot learn the pattern yet. A rule can be live in minutes. Start it as review so a typo cannot block a whole segment.",
        },
        { kind: "p", text: "Both parts now produce an answer. To judge the model's share, you first need metrics that do not lie at this fraud rate." },
      ],
    },
    {
      id: "s5-imbalance",
      title: "At a 0.4 percent fraud rate accuracy is useless, and precision and recall give the honest picture",
      goal: "Which metrics work when fraud is rare, and what do they say about this model?",
      blocks: [
        {
          kind: "p",
          text: "A model that allows every payment is right 11,952 times in 12,000. That is 99.6 percent accuracy and it catches nothing. Rare positives make accuracy a measure of how many legitimate payments there are.",
        },
        {
          kind: "p",
          text: "Use a confusion matrix, which counts payments by truth and by decision. Count a payment as flagged if the decision is review or block. These counts come from last quarter's held-out payments, scaled to a day.",
        },
        {
          kind: "compare",
          caption: "One day at the chosen thresholds. Rows add to 48 and 11,952. Columns add to 362 and 11,638. The grand total is 12,000.",
          columns: ["", "Flagged", "Allowed", "Total"],
          rows: [
            ["Fraud", "40", "8", "48"],
            ["Genuine", "322", "11,630", "11,952"],
            ["Total", "362", "11,638", "12,000"],
          ],
        },
        {
          kind: "list",
          items: [
            "Precision is the share of flagged payments that are fraud. 40 of 362 is 11.05 percent.",
            "Recall is the share of fraud that is flagged. 40 of 48 is 83.3 percent.",
            "Accuracy is 40 plus 11,630 over 12,000, which is 97.25 percent. That is below the 99.6 percent of allowing everything.",
          ],
        },
        {
          kind: "p",
          text: "Precision of 11 percent sounds poor. Random flagging would give 0.4 percent, so the model is 27.6 times better. Reviewers also correct the false flags for £3 each. Precision tells you about queue load. It does not say the model is bad.",
        },
        {
          kind: "p",
          text: "Plot precision against recall as the threshold changes, and you have the precision-recall curve. Prefer it to the ROC curve here. ROC plots the true positive rate against the false positive rate, which is false flags over all genuine payments. That denominator is 11,952, so it hides the damage.",
        },
        {
          kind: "p",
          text: "Take the matrix above. The false positive rate is 322 of 11,952, which is 2.7 percent. It looks excellent. Now suppose a bad model doubles the false flags to 644. The rate only reaches 5.4 percent, a small shift on the ROC curve.",
        },
        {
          kind: "p",
          text: "Precision drops from 11.05 percent to 40 of 684, which is 5.85 percent. The review queue would grow to over 600 a day against a capacity of 450. The precision-recall curve shows that at once, and ROC does not.",
        },
        {
          kind: "quiz",
          id: "design10-q7",
          question: "In the matrix, 40 frauds are flagged, 322 genuine payments are flagged and 8 frauds are allowed. What is the precision?",
          options: [
            "83.3 percent.",
            "11.05 percent.",
            "97.25 percent.",
            "2.7 percent.",
          ],
          answer: 1,
          explain: "Precision is true flags over all flags. 40 divided by 362 is 11.05 percent. 83.3 percent is the recall, and 97.25 percent is the accuracy.",
        },
        {
          kind: "quiz",
          id: "design10-q8",
          question: "Why prefer the precision-recall curve to ROC for this problem?",
          options: [
            "ROC cannot be drawn for a binary label.",
            "ROC's false positive rate divides by the 11,952 genuine payments, so doubling the false flags barely changes it.",
            "Precision-recall curves are always higher.",
            "ROC ignores the fraud rate and so cannot rank models.",
          ],
          answer: 1,
          explain: "Doubling false flags from 322 to 644 shifts the false positive rate only from 2.7 to 5.4 percent, but it halves precision. The queue feels precision, not that rate.",
        },
        { kind: "p", text: "The matrix depends on where you cut the scores. The next section sets the cuts." },
      ],
    },
    {
      id: "s6-thresholds",
      title: "Three costs and a team of three put the thresholds at 0.10 and 0.97",
      goal: "How do costs and review capacity decide the two thresholds?",
      blocks: [
        {
          kind: "p",
          text: "A threshold is a cost decision. Harbour's three costs are: £415 for a missed fraud, £100 for a false block, and £3 for a review. The review figure is £1.20 of a reviewer's time, because 3 minutes at £24 an hour is £1.20, plus £1.80 for the customer's wait.",
        },
        {
          kind: "p",
          text: "Assume the scores are calibrated, so a score of 0.10 means 10 payments in 100 like it are fraud. Assume the reviewer is right. For a payment with score p, allowing costs 415 times p, reviewing costs 3, and blocking costs 100 times 1 minus p.",
        },
        {
          kind: "list",
          items: [
            "Review beats allow when 415p is more than 3. That gives p above 0.0072.",
            "Block beats review when 100 times 1 minus p is less than 3. That gives p above 0.97.",
          ],
        },
        {
          kind: "p",
          text: "Cost alone would review every payment above 0.0072. About 1,100 payments a day score that high. The team clears 450, so cost alone overruns the queue 2.4 times. Capacity sets the review line, and the block line comes from cost.",
        },
        {
          kind: "p",
          text: "Plan to use 80 percent of capacity, which is 360 reviews. Cutting at 0.10 gives 345 reviews. Cutting at 0.97 gives 17 blocks. On the held-out data, here is the day.",
        },
        {
          kind: "compare",
          caption: "One day at thresholds 0.10 and 0.97. Payments add to 12,000. Fraud adds to 48. Cost is the cost of each action's mistakes.",
          columns: ["Action", "Score", "Payments", "Fraud", "Genuine", "Cost"],
          rows: [
            ["Block", "0.97 and above", "17", "16", "1", "1 false block, £100"],
            ["Review", "0.10 to 0.97", "345", "24", "321", "345 reviews at £3, £1,035"],
            ["Allow", "Below 0.10", "11,638", "8", "11,630", "8 missed frauds at £415, £3,320"],
            ["Total", "", "12,000", "48", "11,952", "£4,455"],
          ],
        },
        {
          kind: "p",
          text: "The total is £4,455 a day against £19,920 with no model. The model saves £15,465 a day. Of the 48 frauds, 16 are blocked, 24 are caught in review and 8 are missed.",
        },
        {
          kind: "p",
          text: "Now check the queue. Three reviewers at 20 an hour for 7.5 hours clear 450 a day. 345 is 76.7 percent of that, under the 80 percent target. At peak, 40 percent of reviews arrive in two hours, which is 138, or 69 an hour. The team clears 60 an hour.",
        },
        {
          kind: "p",
          text: "The queue grows by 18 over the two hours. The last payment waits 18 minutes, since 18 at 60 an hour is 18 minutes. Add the 3-minute review. That is inside a 30-minute target for holding an order.",
        },
        {
          kind: "p",
          text: "Why not review more? The 738 allowed payments scoring between 0.0072 and 0.10 hold 6 frauds. Reviewing them costs 738 times £3, which is £2,214. It saves 6 times £415, which is £2,490. The gain is £276 a day, and it needs about five more reviewers.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How would you set the threshold?",
          text: "Open with the answer: from three costs and the size of the review team. Then show the two lines, 0.0072 and 0.97, and say capacity lifts the review line to 0.10. Interviewers push on what you would change with a fourth reviewer, and how you know the scores are calibrated.",
        },
        {
          kind: "quiz",
          id: "design10-q9",
          question: "A review costs £3 and a false block costs £100. At what fraud probability does block become cheaper than review?",
          options: [
            "0.03.",
            "0.0072.",
            "0.97.",
            "0.50.",
          ],
          answer: 2,
          explain: "Block costs 100 times 1 minus p. Review costs 3. They are equal when 1 minus p is 0.03, so p is 0.97. Above that, blocking is cheaper than paying for a review.",
        },
        {
          kind: "quiz",
          id: "design10-q10",
          question: "Three reviewers clear 20 an hour each for 7.5 hours. The model sends 345 payments a day to review. What share of capacity is that?",
          options: [
            "52 percent.",
            "76.7 percent.",
            "100 percent.",
            "115 percent.",
          ],
          answer: 1,
          explain: "3 times 20 times 7.5 is 450. 345 divided by 450 is 0.767. That leaves slack for a bad hour, and the target is to stay under 80 percent.",
        },
        { kind: "p", text: "The thresholds rest on labels. The next section asks how good those labels are." },
      ],
    },
    {
      id: "s7-late-labels",
      title: "Chargebacks arrive about 75 days late, so the newest payments have no verdict and training must wait",
      goal: "What does label delay do to training and to monitoring, and what fills the gap?",
      blocks: [
        {
          kind: "p",
          text: "A payment is marked fraud when its chargeback arrives. The median chargeback arrives at day 45. 90 percent have arrived by day 75, and a few take 120 days. A payment with no chargeback yet is not known to be genuine. It is unlabelled.",
        },
        {
          kind: "compare",
          caption: "How much of the true fraud rate of 0.4 percent a payment shows, by its age. Figures are illustrative.",
          columns: ["Age of payment", "Share of chargebacks arrived", "Fraud rate it appears to have"],
          rows: [
            ["7 days", "5 percent", "0.02 percent"],
            ["30 days", "30 percent", "0.12 percent"],
            ["45 days", "50 percent", "0.20 percent"],
            ["75 days", "90 percent", "0.36 percent"],
            ["120 days", "99 percent", "0.40 percent"],
          ],
        },
        {
          kind: "p",
          text: "Train on last week's payments and the model learns that fraud has nearly vanished. The newest attack looks clean, because its chargebacks have not landed. So train only on payments at least 75 days old. Use a 180-day window of them, which spans ages 75 to 255 days.",
        },
        {
          kind: "p",
          text: "The cost is staleness. The model never sees the last 75 days of attack patterns. That is the second job of the rules from the last section. Rules cover what the model has not yet learned.",
        },
        {
          kind: "p",
          text: "Blocked payments add a second problem. They never get charged, so they never get a chargeback. Their true label is unknown. Label them from the rule or reviewer verdict that blocked them, and say in the design that this biases the data.",
        },
        {
          kind: "p",
          text: "Monitoring suffers the same way. You cannot compute recall in real time. The recall for payments from today is known in 75 days. So watch proxy signals, which are early evidence that arrives in hours or days.",
        },
        {
          kind: "list",
          items: [
            "Reviewer verdicts arrive within a day. They cover the 345 reviewed payments only, so they say how good the flags are, not how much was missed.",
            "Customer reports of an order they did not make arrive within days. Assume they cover half of the 8 missed frauds, which is 4.",
            "Early fraud warnings from the card network arrive within about 10 days. Harbour's payment processor is assumed to pass these on, so check before relying on them.",
            "Overturned blocks, where a person reverses a block after a customer calls, give a same-day count of false blocks.",
          ],
        },
        {
          kind: "p",
          text: "Each week, backfill the recall for the payments that turned 75 days old. That figure is the truth, 75 days late. The proxies are the dashboard you watch in between.",
        },
        {
          kind: "quiz",
          id: "design10-q11",
          question: "A payment is 7 days old. 5 percent of chargebacks have arrived at that age. The true fraud rate is 0.4 percent. What rate does a model trained on it see?",
          options: [
            "0.4 percent.",
            "0.02 percent.",
            "0.2 percent.",
            "0 percent.",
          ],
          answer: 1,
          explain: "0.4 percent times 0.05 is 0.02 percent. The model would conclude fraud is twenty times rarer than it is, which is why training stops at payments 75 days old.",
        },
        {
          kind: "quiz",
          id: "design10-q12",
          question: "Which proxy can tell you about missed frauds, rather than only about flagged ones?",
          options: [
            "Reviewer verdicts.",
            "The review hit rate.",
            "Customer reports and early fraud warnings.",
            "The block rate.",
          ],
          answer: 2,
          explain: "Reviewers only see payments the model flagged. A missed fraud is allowed, so only the customer or the card network reports it, and later than a reviewer would.",
        },
        { kind: "p", text: "Late labels hide a change for months. The next section is about changes that are made on purpose." },
      ],
    },
    {
      id: "s8-drift",
      title: "Fraudsters adapt on purpose, so you watch five monitors and retrain every fortnight",
      goal: "What do you monitor, how often do you retrain, and what triggers action?",
      blocks: [
        {
          kind: "p",
          text: "Drift is a change in the data that makes a trained model worse. In most systems it is an accident. Here someone is trying. When you block one pattern, the attacker tries another, so assume the model is always ageing.",
        },
        {
          kind: "compare",
          caption: "The monitors, each with a baseline from this chapter and the alert. Baselines are per day.",
          columns: ["Monitor", "Baseline", "Alert when"],
          rows: [
            ["Score distribution", "Last month's scores in 10 bins", "Population stability index above 0.2. This index compares two distributions, and 0.2 is a common rule of thumb."],
            ["Feature distribution", "Missing share under 1 percent for every feature", "Any feature missing over 1 percent, or its mean twice its usual"],
            ["Block rate", "17 of 12,000, which is 0.14 percent", "Above 0.3 percent over 24 hours, which is 36 payments"],
            ["Review rate", "345 of 12,000, which is 2.9 percent", "Above 3.5 percent, which is 420 payments"],
            ["Review hit rate", "24 of 345, which is 7.0 percent", "Below 4 percent over three days"],
          ],
        },
        {
          kind: "p",
          text: "The review hit rate is the one to watch. It is the share of reviewed payments confirmed as fraud, and it is known within a day. If it falls, the flags are getting worse. If the review rate rises while it holds, you face more traffic, not worse flags.",
        },
        {
          kind: "p",
          text: "Retrain every 14 days on the latest 180 days of mature payments. Retrain early if the score distribution shifts. Between retrains, rules carry the new patterns. A model refresh without matured labels cannot learn this morning's attack, so do not expect it to.",
        },
        {
          kind: "p",
          text: "Release a new model in two stages. In **shadow mode**, the challenger scores every live payment and its answer is logged, not acted on. In a **champion-challenger** rollout, the current model, the champion, decides for most cards, and the challenger decides for the rest.",
        },
        {
          kind: "p",
          text: "Pick the challenger's cards by a hash of the card id, not by payment. A card then gets one model's treatment every time. Otherwise a customer sees a block, retries and is allowed.",
        },
        {
          kind: "quiz",
          id: "design10-q13",
          question: "The review hit rate falls from 7.0 percent to 3.5 percent over three days, and the review rate holds at 2.9 percent. What does that suggest?",
          options: [
            "Traffic grew.",
            "The model is flagging worse. Half as many reviews now confirm fraud.",
            "Reviewers got faster.",
            "Recall rose.",
          ],
          answer: 1,
          explain: "The same number of reviews are catching half as much fraud, so the flags are less precise. Retrain, and check whether a new pattern is hiding in the allowed band.",
        },
        { kind: "p", text: "Monitoring tells you a model has aged. The next section covers how to prove a new one is better before it takes over." },
      ],
    },
    {
      id: "s9-evals-rollout",
      title: "A time-split eval and a 10 percent card slice gate a new model with numbers written first",
      goal: "How do you evaluate a model offline, and what gates its rollout?",
      blocks: [
        {
          kind: "p",
          text: "Split by time, never at random. Train on older payments and test on a later month of mature labels. A random split puts the same attack in both sets, and the model looks better than it will be.",
        },
        {
          kind: "list",
          items: [
            "Headline metric: recall at a fixed number of daily flags. The champion's is 83.3 percent at 362 flags.",
            "Second metric: expected cost a day on the replay, using the three costs. The champion's is £4,455.",
            "Slices: new accounts under 30 days, order value bands, customer segments and device types. One overall figure hides a failing segment.",
            "Skew check: replay a day of logged vectors, and require every feature within 1 percent.",
          ],
        },
        {
          kind: "p",
          text: "Before any live traffic, run a replay diff. Replay the last 7 days, which is 84,000 payments, through the challenger. List every payment it would block that the champion would not. A person reads the whole list. Release only if there are 20 or fewer.",
        },
        {
          kind: "p",
          text: "Reading that list is how you catch the false-block risk. Harbour has about one false block a day. A release that doubles it adds one block a day, and no chart will show that. You can only see it by reading the blocks.",
        },
        {
          kind: "list",
          items: [
            "Shadow gate: for 14 days the challenger scores everything and decides nothing. Send 20 payments a day where it and the champion disagree to review. Its hit rate on those must be at least the champion's.",
            "Slice gate: the challenger decides for 10 percent of cards, which is about 1,200 payments a day. After 14 days that is 16,800 payments and about 67 frauds.",
            "Slice limits: review rate under 3.5 percent and block rate under 0.2 percent. Review hit rate at least 6 percent, and no more than 3 overturned blocks.",
            "Widen to 50 percent for 7 days, then to 100 percent. Keep the champion loaded for 14 days after, as a one-switch rollback.",
          ],
        },
        {
          kind: "p",
          text: "Be honest about power. 67 frauds cannot prove a gain of two points of recall. These gates are a safety check. The real verdict arrives 75 days later, when the matured recall is backfilled.",
        },
        {
          kind: "p",
          text: "Write the gates before the stage starts. A gate set after seeing the results will always be passed. In an interview, say which number would make you stop, and who you would tell.",
        },
        {
          kind: "quiz",
          id: "design10-q14",
          question: "Why split the evaluation data by time instead of at random?",
          options: [
            "Random splits are slower.",
            "A random split puts the same attack in training and test, so it overstates how well the model handles a new one.",
            "Time splits give more fraud.",
            "Labels arrive in time order.",
          ],
          answer: 1,
          explain: "Fraud patterns change. Training on the past and testing on a later month copies what the live model faces. A random split lets the test set share patterns with training.",
        },
        { kind: "p", text: "A tested model can still fail in production. The next section lists five ways, and the control for each." },
      ],
    },
    {
      id: "s10-failures",
      title: "Five failures each have a control that keeps payments flowing and leaves a record",
      goal: "Which control answers each of five named failures?",
      blocks: [
        {
          kind: "p",
          text: "Take the failures one at a time. Each has a trigger you can measure and a control that does not need a person at 3 a.m.",
        },
        {
          kind: "compare",
          caption: "Five failures at Harbour Supplies. Money figures are per day and illustrative.",
          columns: ["Failure", "What happens", "Control", "Number"],
          rows: [
            ["The online store is down", "No features can be read", "40 ms read deadline, then a fallback model on request-only features and the rules", "Recall falls from 83 to about 60 percent. 11 more missed frauds cost £4,565 a day."],
            ["A feature goes stale", "The stream falls behind and counts read as zero", "Event time on each value. Older than 60 seconds counts as missing. Alert on lag", "Alert when stream lag passes 30 seconds"],
            ["A rule blocks a whole segment", "One typo blocks a customer's every order", "Rules start as review. A rule firing on over 1 percent of payments in an hour is downgraded and pages", "1 percent of an hour at peak is about 24 payments"],
            ["A release doubles false blocks", "Genuine customers are turned away", "Replay diff before release. A person reads every new block. Slice gate on overturned blocks", "From 1 a day to 2 is invisible on a chart"],
            ["A payment event is replayed", "Counts double and the decision runs twice", "Idempotency key on the decision. Event ids deduplicated in the stream", "A card with 3 real payments reads 6"],
          ],
        },
        {
          kind: "p",
          text: "The fallback model deserves a number. With the store down, the fallback keeps the review rate near 3 percent but recalls about 60 percent of fraud. 48 frauds at 60 percent leaves 19 missed. That is 11 more than the usual 8, and 11 times £415 is £4,565.",
        },
        {
          kind: "p",
          text: "The stale feature has a sibling. A slow stream does not crash. It quietly blinds the model to card testing. That is why every value carries its event time, and why the lag alert sits at 30 seconds, well under the 60-second cut-off.",
        },
        {
          kind: "p",
          text: "The segment-blocking rule is a rule-governance failure. At peak, the portal handles 2,400 payments in an hour. 1 percent is 24. A rule that fires that often is almost certainly wrong, so it downgrades itself and pages the rule's owner.",
        },
        {
          kind: "p",
          text: "Now the replay. The portal retries a payment after a network error, or the stream reprocesses an hour of events. A card with 3 real payments in 10 minutes reads 6, which crosses a rule that blocks at 5 or more. A genuine bulk order is blocked.",
        },
        {
          kind: "p",
          text: "Make the decision idempotent. The portal issues an id for each payment attempt. The decision table holds a unique constraint on that id. A repeat call returns the stored decision without scoring again. It does not update any counter.",
        },
        {
          kind: "p",
          text: "Returning the stored answer matters for a second reason. Without it, an attacker retries until the model, or a changed feature, says allow. Deduplicate the stream the same way, by event id, so a reprocessed hour counts each payment once.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Never fix a queue by raising the review threshold",
          text: "If the review queue overruns, raising the line lets fraud through unseen. Add reviewers, extend hours, or tighten rules. Track what the queue costs in missed fraud before you accept it.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "The feature store is down at the morning peak. What happens?",
          text: "Open with the answer: the read hits its 40 millisecond deadline, and the fallback model and the rules decide. Then give the cost, about £4,565 a day in extra missed fraud, and who is told. Interviewers push on how you know the fallback is good enough, and when you would stop trading.",
        },
        {
          kind: "quiz",
          id: "design10-q15",
          question: "The portal retries a payment after a network error. What stops a second, different decision?",
          options: [
            "A faster model.",
            "A unique constraint on the payment attempt id, so a repeat call returns the stored decision.",
            "A longer timeout.",
            "A nightly job that removes duplicates.",
          ],
          answer: 1,
          explain: "The first decision is stored under the attempt id. A repeat call finds it and returns it. It does not score again or update counts, so retrying cannot buy a different answer.",
        },
        { kind: "p", text: "Every part now has an answer. The last section puts them on one page." },
      ],
    },
    {
      id: "s11-design-sheet",
      title: "The fraud design fits on one page and writes six rows of the ledger",
      goal: "What does the finished fraud design look like, and what reopens each decision?",
      blocks: [
        { kind: "p", text: "Fill the sheet from the sections above, one step at a time. Keep the latency budget and the cost next to the components they price. Then write the ledger, one row for each decision that gave something up." },
        { kind: "code", lang: "text", caption: "The finished fraud design, as you would leave it on the board.", code: "DESIGN SHEET: real-time payment fraud at Harbour Supplies\nPrompt              Decide allow, review or block on each card payment before charge\n\n1 Users and volumes 12,000 payments a day, average payment 400 pounds\n                    40 percent in the two busiest hours, bursts of 5 a second\n                    0.4 percent fraud, so 48 frauds a day\n2 Non-functionals   Decision inside 200 ms. Harbour bears the chargeback\n                    Missed fraud 415 pounds. False block 100. Review 3\n                    3 reviewers, 450 reviews a day. Labels about 75 days late\n3 Components        Scoring service, three instances. Online store\n                    Stream processor. Rules. Tree model. Review queue\n                    Decision table keyed by payment attempt id\n4 Data flow         Request, idempotency check, features, rules, model\n                    Decision logged with the feature vector. Stream updates counts\nBudget              20 + 10 + 40 + 10 + 40 + 15 = 135 ms, 65 spare\n                    Timeout default is allow, then a re-score before dispatch\nThresholds          Review from 0.10, block from 0.97\n                    17 blocks, 345 reviews (77 percent of 450), 11,638 allowed\n                    Cost 4,455 pounds a day against 19,920 with no model\n5 Failure modes     Store down: fallback model, 4,565 pounds a day extra\n                    Stale feature: event time, 60 second cut-off\n                    Rule blocks a segment: starts as review, self-downgrades\n                    Release doubles false blocks: replay diff, read every block\n                    Replay: idempotent decision, stream deduplicated\n6 Evals             Time split. Recall 83.3 percent at 362 flags\n                    Precision 11.05 percent. Slices by account age and value\n                    Proxies daily, matured recall backfilled at 75 days\n7 Rollout           Replay diff, 14 days shadow, 10 percent of cards\n                    Then 50 and 100 percent. Champion kept loaded for 14 days\n\nLedger\nDecision                         Gave up                                    Revisit when\nTimeout defaults to allow        100 pounds a day of fraud on 60 timeouts   Timeouts pass 2 percent of payments\nReview line at 0.10              738 payments holding 6 frauds a day        A fourth reviewer, or queue over 400\nBlock only from 0.97             Hold time on 345 reviewed orders           Review wait passes 30 minutes\nTrain on payments 75 days old    The newest 75 days of patterns             Review hit rate under 4 percent\nTrain on logged vectors          New streaming features wait 30 days        A feature is needed in under 30 days\nRules expire after 30 days       Memory of old attack patterns              A dead rule's pattern returns" },
        { kind: "p", text: "Read it out like this. The service decides inside 200 milliseconds on 12,000 payments a day. It loses £4,455 a day to fraud and review, where doing nothing loses £19,920. It is built from three costs and a team of three." },
        { kind: "p", text: "Then say what is weak. Labels are 75 days late, so the model is always behind, and rules cover the gap. A fourth reviewer is the first thing I would test. Each decision on the ledger has a number that reopens it." },
        { kind: "code", lang: "text", caption: "For your next real-time classifier. It adds the lines this design needed to the blank sheet.", code: "Decision limit      ____  (milliseconds, and the hop budget that adds up)\nTimeout default     ____  (the action, priced against the others)\nCosts               ____  (missed, false action, review)\nReview capacity     ____  (people x rate x hours, and the share used)\nThresholds          ____  (cost line, capacity line, the day's counts)\nLabel delay         ____  (days until 90 percent of labels arrive)\nProxies             ____  (what arrives in hours, and what it cannot see)\nFeatures            ____  (stream or batch, and how skew is removed)\nRollout gates       ____  (replay, shadow, slice, each as a number)" },
        { kind: "p", text: "This chapter closes the classical machine learning designs. Chapter nine built the batch side with a feature store and a registry. This one added the real-time side. Both end with a ledger, so the follow-ups of chapter seven apply to them too." },
      ],
    },
  ],
  recap: [
    "Ask five questions: decision time, who bears a chargeback, review headcount, false block cost and label delay.",
    "Budget 200 ms across hops that add up: 20, 10, 40, 10, 40 and 15 is 135, with 65 spare.",
    "Default a timeout to allow, because blocking costs about £5,976 a day against £100, then re-score before dispatch.",
    "Compute streaming features from the same code as training, or train on logged vectors, to avoid skew.",
    "Use rules for hard limits and today's attack, and the model for weak signals combined.",
    "At 0.4 percent fraud, use precision and recall. Allowing everything has 99.6 percent accuracy.",
    "Set the thresholds from costs and capacity: 0.10 and 0.97 give 345 reviews of 450, and £4,455 a day.",
    "Train on payments 75 days old, watch five monitors, and gate a challenger on 10 percent of cards.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In real-time fraud detection I learned to budget the milliseconds, price each mistake and set thresholds from costs and review capacity. I deal with late labels using proxies and a 75-day training cutoff. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["design-q19", "design-q20"],
};

export default chapter;
