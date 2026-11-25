import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "design-09-recommendation-system",
  course: "design",
  number: 9,
  title: "A recommendation system is a nightly batch pipeline with a two-stage model that must beat counting",
  tagline: "How do you design a classical ML system when the data arrives as clicks and orders? Run it as a nightly batch, serve it in two stages and let a gate decide whether a new model goes live.",
  minutes: 55,
  objectives: [
    "Ask the clarifying questions that change a recommendation diagram, and size the data from the answers.",
    "Draw the event pipeline and the feature store, with one feature definition for training and serving.",
    "Split training data by time, set a baseline the model must beat and gate promotion through a registry.",
    "Size a two-stage serving path against a latency budget that adds up, and say what to precompute.",
    "Score a ranked list with Precision at K, Recall at K and NDCG by hand, and plan an A/B test with a guard metric.",
    "Name four failure modes with a control each, choose a retraining schedule and fill in the design sheet and ledger.",
  ],
  sections: [
    {
      id: "s1-questions",
      title: "Four questions about catalogue, freshness, latency and success decide the diagram",
      goal: "Which questions change the design, and what are the volumes?",
      blocks: [
        {
          kind: "p",
          text: "The prompt is short. Harbour Supplies wants a \"you may also need\" row on the basket page of its trade ordering portal. It also wants a reorder row on the home page. You have built LLM systems. This chapter teaches the batch side of classical machine learning design, using the seven steps from chapter one.",
        },
        {
          kind: "p",
          text: "Ask four questions before you draw anything. Each answer removes a component or adds one. At Harbour Supplies the portal needs a login, so every session names its customer. That removes the anonymous visitor problem.",
        },
        {
          kind: "compare",
          caption: "The four questions, the answers at Harbour Supplies and the change each one makes to the diagram. All figures are illustrative.",
          columns: ["Question", "Answer", "What it changes"],
          rows: [
            ["How big is the catalogue?", "8,000 products", "A table of product pairs fits in memory, so there is no embedding index. At 8 million products you would add one."],
            ["How fresh must it be?", "What sold yesterday is fresh enough. The basket is read live.", "Features are built nightly. Only the basket travels with the request. If the answer were minutes, you would add a streaming path."],
            ["What is the latency budget?", "The row loads in 100 ms at the 95th percentile and never blocks the page", "The serving stages must add up to less than 100 ms, with slack."],
            ["What counts as success?", "A product added to the basket from the row. Order value per session must not fall.", "It sets the training label, the offline metric and the A/B test."],
          ],
        },
        {
          kind: "p",
          text: "A click is cheap and easy to game, since a bright image gets clicked. Revenue is the real aim, but it arrives days late and is noisy. An add to basket sits between them. It is quick, and it needs a customer to mean it.",
        },
        {
          kind: "p",
          text: "Now the volumes. Harbour has 15,000 trade customers, 12,000 sessions a day and about 30 events a session. That is 360,000 events a day. Customers place 3,000 orders a day with 8 lines each, which is 24,000 order lines.",
        },
        {
          kind: "p",
          text: "Say 70 percent of events land in the 8 working hours. That is 252,000 events over 28,800 seconds, or 8.75 events a second at the peak. A single small server handles that. The data is small, and the design should say so.",
        },
        {
          kind: "p",
          text: "Row requests follow the sessions. Every session loads the home page, which is 12,000 requests. Half of them reach the basket, which is 6,000 more. That is 18,000 requests a day. Use the same 70 percent in 8 hours: 12,600 over 28,800 seconds is 0.44 a second.",
        },
        {
          kind: "p",
          text: "Plan for five times the average peak, which is 2.2 requests a second. The sizing in section five uses that figure.",
        },
        {
          kind: "quiz",
          id: "design09-q1",
          question: "Harbour Supplies has 12,000 sessions a day, and 70 percent of 360,000 events land in 8 working hours. What is the peak event rate?",
          options: [
            "4.2 events a second, the daily average.",
            "8.75 events a second.",
            "12.5 events a second.",
            "252,000 events a second.",
          ],
          answer: 1,
          explain: "70 percent of 360,000 is 252,000 events. Divided by 28,800 seconds in 8 hours, that is 8.75 a second. The daily average of 4.2 a second hides the working day.",
        },
        { kind: "p", text: "The questions are answered and the volumes are small. Next, how clicks and orders reach the place where the model learns from them." },
      ],
    },
    {
      id: "s2-pipeline",
      title: "A nightly batch job over a replayable event stream is enough, because nobody needs yesterday's orders by lunch",
      goal: "How do clicks and orders reach the warehouse, and what checks them?",
      blocks: [
        {
          kind: "p",
          text: "Clicks and orders go to an event stream first. A stream is a log that producers append to and readers replay, such as Kafka. Its job is to decouple the portal from everything downstream. If the warehouse load fails, the events are still there.",
        },
        {
          kind: "p",
          text: "A batch job copies each day's events from the stream into a warehouse table, partitioned by date. A warehouse is a store built for large reads, such as BigQuery. Each event carries an id, a customer, a product, a type, a position and a time.",
        },
        {
          kind: "p",
          text: "Size it. An event of 400 bytes gives 144 MB a day, or about 13 GB for a 90-day window. Order lines add 2.16 million rows over the same window, which is 24,000 times 90. None of this needs a cluster. One machine reads it in minutes.",
        },
        {
          kind: "p",
          text: "Validation runs before anything trains on the data. A bad day of data trains a bad model and nobody sees the cause for a week. The checks are cheap, and each has a number.",
        },
        {
          kind: "list",
          items: [
            "Volume: the day's event count must sit within 20 percent of the 7-day mean. With a mean of 360,000, that is 288,000 to 432,000.",
            "Completeness: no more than 1 percent of events may lack a customer or a product id.",
            "Uniqueness: duplicate event ids are dropped and counted.",
            "Reconciliation: order lines from the stream must match the order system's total within 0.5 percent.",
          ],
        },
        {
          kind: "p",
          text: "A day that fails a check is quarantined and the job alerts a person. The model keeps using the last good features. The nightly timetable has four steps: validation takes 10 minutes, feature building 35, precomputing the rows 20 and loading the serving store 10.",
        },
        {
          kind: "p",
          text: "That is 75 minutes. Started at 02:00, the job finishes at 03:15. Trade customers start work at about 06:00, so the slack is 165 minutes. A failed first attempt can be run again before anyone opens the portal.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Batch is enough because the signal changes slowly",
          text: "Which products sell together shifts over weeks. A basket changes in seconds, but the basket arrives with the request. So the only live input is already in the request, and yesterday's counts are fresh enough. Streaming features earn their cost when the signal changes within minutes, which is the case in chapter ten.",
        },
        {
          kind: "quiz",
          id: "design09-q2",
          question: "A nightly job starts at 02:00 and takes 75 minutes in total. Customers start at 06:00. How much slack is there?",
          options: [
            "75 minutes.",
            "285 minutes.",
            "165 minutes.",
            "240 minutes.",
          ],
          answer: 2,
          explain: "02:00 plus 75 minutes is 03:15. From 03:15 to 06:00 is 165 minutes. That is time to run the job again if it fails.",
        },
        { kind: "p", text: "The data now lands clean each night. The model cannot use raw events, so the next section turns them into features." },
      ],
    },
    {
      id: "s3-feature-store",
      title: "A feature store keeps one definition for training and serving, and joins history as it stood before each label",
      goal: "What are the two halves, and how do you stop a feature seeing the future?",
      blocks: [
        {
          kind: "p",
          text: "A feature is a number the model reads, such as how many orders a customer placed in the last 30 days. A **feature store** keeps those numbers in two halves. The offline half holds the whole history, one snapshot a day, for training. The online half holds only the latest value, for serving.",
        },
        {
          kind: "p",
          text: "Both halves come from one definition, written once and run in the nightly job. The job fills the offline table with the day's snapshot, then copies the latest rows to the online store. Feast is a real example of this pattern. The design stands without it.",
        },
        {
          kind: "p",
          text: "Size the online half. Customers: 15,000 rows of 40 features at 8 bytes is 4.8 MB. Products: 8,000 rows of 40 features is 2.56 MB. The co-purchase table keeps 50 neighbours for each product, so 400,000 pairs at 12 bytes, or 4.8 MB.",
        },
        {
          kind: "p",
          text: "The precomputed reorder rows are 15,000 customers times 20 items at 12 bytes, which is 3.6 MB. The total is 15.76 MB. It fits in the memory of the serving process, so the store exists for versioned loading and not for scale.",
        },
        {
          kind: "p",
          text: "Now the rule that catches most candidates. **Point-in-time correctness** means a training row may only see features as they stood before its label. Take customer C-1042, who orders a box of fixings on 14 November. That order is the label.",
        },
        {
          kind: "p",
          text: "The feature \"orders in the last 30 days\" read 3 at the end of 13 November. It reads 4 at the end of 14 November, because it now counts the very order you are predicting. The training row must use 3. Use 4 and the model learns from the answer.",
        },
        {
          kind: "p",
          text: "The fix is an as-of join. For each label dated D, join the snapshot dated D minus one day. At serving time the latest snapshot is also yesterday's, so training and serving see the same kind of number.",
        },
        {
          kind: "p",
          text: "**Training-serving skew** is a gap between what the model saw in training and what it sees live. One plain case: the offline job fills a missing \"days since last order\" with 0. The serving code sends null, which the library reads as -1. The model learnt that 0 means ordered today. Every new customer then looks like a daily buyer.",
        },
        {
          kind: "p",
          text: "The control is the single definition, plus a parity check. Each night, recompute 1,000 random customers' online values from the offline table and compare. Alert if more than 0.1 percent differ.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Why a random check on 1,000 rows is enough",
          text: "If 0.1 percent of rows were wrong, you would expect one wrong row in 1,000. A real definition mismatch, like the 0 and -1 case, hits a whole group, such as every customer with no history. A sample of 1,000 almost surely contains some of that group, so it shows up.",
        },
        {
          kind: "quiz",
          id: "design09-q3",
          question: "A training row labelled on 14 November uses the feature value from the end of 14 November. What is wrong?",
          options: [
            "Nothing, because the snapshot is the most recent one.",
            "The feature is too old to be useful.",
            "The online store would be too large.",
            "The feature includes the label's own order, so the model sees the answer.",
          ],
          answer: 3,
          explain: "The end-of-day count includes the order being predicted. Join the snapshot dated one day earlier, so the row sees only what was known before the label.",
        },
        { kind: "p", text: "The features are defined and joined safely. Next, the model that learns from them, and the gate that decides whether it ships." },
      ],
    },
    {
      id: "s4-training",
      title: "A time split, a counting baseline and a promotion gate stop a worse model going live",
      goal: "How is the model trained, versioned and promoted?",
      blocks: [
        {
          kind: "p",
          text: "Split the 90 days by time. Train on days 1 to 76, validate on days 77 to 83 and test on days 84 to 90. That is 76, 7 and 7 days. A random split would put Thursday's baskets in training and Wednesday's in the test, so the model would learn from the future.",
        },
        {
          kind: "p",
          text: "Build the examples. Training has 24,000 order lines a day over 76 days, which is 1,824,000 positives. Add 4 sampled non-purchases for each, which is 7,296,000. The table has 9,120,000 rows. At 30 features of 4 bytes each, that is 1.09 GB.",
        },
        {
          kind: "p",
          text: "It fits in one machine's memory, and a weekly training run takes about half an hour on it. That figure is an assumption to measure on your own hardware.",
        },
        {
          kind: "p",
          text: "Set the baseline before you train. A **baseline** is the simplest method that does the job, and the model must beat it by a stated margin. Harbour has two. The first is most popular in the last 30 days. The second is bought-together counts, which rank products by how often they share an order with the basket.",
        },
        {
          kind: "compare",
          caption: "Test-week results at K equal to 5, all illustrative. NDCG is defined in section six. The gate asks the model to beat the stronger baseline by 10 percent.",
          columns: ["Method", "Recall at 5", "NDCG at 5", "Passes the gate"],
          rows: [
            ["Most popular, last 30 days", "0.06", "0.05", "No"],
            ["Bought-together counts", "0.21", "0.17", "Is the bar. The gate is 0.187."],
            ["Trained ranker, version 14", "0.25", "0.20", "Yes. 0.20 is 17.6 percent above 0.17."],
          ],
        },
        {
          kind: "p",
          text: "The gate is a short list written before training. NDCG at 5 must be at least 10 percent above the counts baseline, which is 0.17 times 1.1, or 0.187. No slice may fall below the baseline, and the slices are new customers and the five biggest categories.",
        },
        {
          kind: "p",
          text: "Two more checks sit in the gate. The ranker must score 220 candidates in 30 ms at the 95th percentile. The top 20 products must take no more than 25 percent of impressions in the test replay.",
        },
        {
          kind: "p",
          text: "A **model registry** stores each trained model with what is needed to reproduce and judge it. Each entry holds a version, such as v14, and the data snapshot it trained on. It also holds the feature definition version, the code commit, the test metrics and a stage: staging, production or archived.",
        },
        {
          kind: "p",
          text: "Serving loads whichever model holds the production stage. Promotion means changing that one pointer after the gate passes. MLflow is a real registry. A model with no recorded data snapshot cannot be rebuilt, so the registry refuses it.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How do you know the new model is better than the old one?",
          text: "Open with the answer: it beats a counting baseline on a time-split test, and then it wins an A/B test. Name the gate, which is NDCG at 5 above the baseline by 10 percent, no weaker slice and a latency limit. Interviewers push on why the split is by time, and what the baseline is for.",
        },
        {
          kind: "quiz",
          id: "design09-q4",
          question: "The counts baseline scores NDCG at 5 of 0.17. The gate asks for 10 percent more. What must the model score?",
          options: [
            "At least 0.18.",
            "At least 0.27.",
            "At least 0.187.",
            "At least 0.20.",
          ],
          answer: 2,
          explain: "0.17 times 1.1 is 0.187. A threshold of 0.18 is below the gate, and 0.27 adds 0.10 as points, which is not the same as 10 percent.",
        },
        { kind: "p", text: "The model is trained and registered. Now it has to answer a request in less than a tenth of a second." },
      ],
    },
    {
      id: "s5-serving",
      title: "Two stages fit the row inside 75 ms, and a nightly precompute keeps the home page off the live path",
      goal: "How is the row served, and how is it sized?",
      blocks: [
        {
          kind: "p",
          text: "Serving runs in two stages. **Candidate retrieval** cuts 8,000 products to a few hundred cheaply. A **ranker** then scores that short list with the full model. Scoring all 8,000 on every request would cost far more than it earns.",
        },
        {
          kind: "p",
          text: "For the basket row, retrieval reads the co-purchase table. A basket of 6 items has 50 neighbours each, so 300 pairs. After removing duplicates and items already in the basket, about 220 candidates remain. The ranker scores them and the top 5 are shown.",
        },
        {
          kind: "p",
          text: "With a catalogue of 8 million products you would retrieve from an embedding index, a store that finds the nearest vectors fast. At 8,000 products the table is simpler and easier to explain. The stage's job is the same.",
        },
        {
          kind: "compare",
          caption: "The latency budget for the basket row at the 95th percentile. The stages add up to 75 ms, which leaves 25 ms of slack inside the 100 ms limit.",
          columns: ["Stage", "Budget in ms", "Note"],
          rows: [
            ["Gateway and network", "15", "Includes the call from the page"],
            ["Online store lookup", "10", "Customer features and the 220 candidates' features, in one batch"],
            ["Candidate retrieval", "10", "Merge the neighbour lists"],
            ["Ranker", "30", "220 rows of 30 features"],
            ["Business filters", "5", "In stock, not in the basket, at most 2 per category"],
            ["Response", "5", "Serialise 5 products"],
            ["Total", "75", "25 ms of slack to 100 ms"],
          ],
        },
        {
          kind: "p",
          text: "Size it with Little's law from chapter two. The CPU work per request is retrieval, ranking and filters: 10 plus 30 plus 5, or 45 ms. At the 2.2 requests a second peak, 2.2 times 0.045 gives 0.1 of one core busy.",
        },
        {
          kind: "p",
          text: "One core handles about 22 requests a second, which is 1 divided by 0.045. Run 2 instances for availability, and the capacity is 44 a second, twenty times the peak. Say the headroom aloud, so the interviewer sees that you sized it.",
        },
        {
          kind: "p",
          text: "The home page reorder row skips both stages at request time. A job at 02:45 ranks each customer's past products by how due they are. Due means the days since the last purchase divided by the customer's usual gap. It stores 20 items per customer.",
        },
        {
          kind: "p",
          text: "Real time earns nothing here. A reorder date only changes when an order arrives, and the nightly job sees every order. The request becomes one lookup of about 5 ms.",
        },
        {
          kind: "p",
          text: "Cold start is the case with no history. Harbour adds about 40 new products a month, which is 0.5 percent of 8,000. A new product has no co-purchase pairs, so retrieval cannot find it. Give it neighbours from its category and price band, and reserve 1 of the 5 slots for products under 14 days old.",
        },
        {
          kind: "p",
          text: "About 90 new customers a month join, which is 0.6 percent of 15,000. A new customer picks their trade at signup, so the row shows what that trade bought most in the last 30 days. Hide the reorder row until they have ordered. A made-up reorder row would be wrong. The basket row works from the first basket.",
        },
        {
          kind: "quiz",
          id: "design09-q5",
          question: "Each request costs 45 ms of CPU, and the peak is 2.2 requests a second. How many cores are busy at the peak?",
          options: [
            "About 0.1.",
            "About 1.",
            "About 22.",
            "About 99.",
          ],
          answer: 0,
          explain: "Cores busy equals the arrival rate times the time each request takes: 2.2 times 0.045 is 0.099. Two instances are for availability, not capacity.",
        },
        { kind: "p", text: "The row is served. Whether it is any good needs a different kind of number." },
      ],
    },
    {
      id: "s6-evaluation",
      title: "NDCG scores order as well as hits, and an A/B test with a guard metric decides what offline numbers cannot",
      goal: "How do you score a ranked list, and why does the offline win need an online test?",
      blocks: [
        {
          kind: "p",
          text: "Take one customer from the test week. After seeing the basket they went on to add three products: A, C and F. Those are the relevant ones. The model showed five: A, B, C, D, E. Score it at K equal to 5.",
        },
        {
          kind: "p",
          text: "**Precision at K** is the share of the shown items that were relevant. Two of five hit, so 0.4. **Recall at K** is the share of the relevant items that were shown. Two of three, so 0.67. Neither cares about order.",
        },
        {
          kind: "p",
          text: "**NDCG**, normalised discounted cumulative gain, rewards putting hits near the top. A hit at position p scores 1 divided by log base 2 of p plus 1. Position 1 scores 1, position 2 scores 0.631, position 3 scores 0.5, position 4 scores 0.431.",
        },
        {
          kind: "p",
          text: "The list above hits at positions 1 and 3, so its DCG is 1 plus 0.5, or 1.5. The ideal list puts A, C and F at positions 1, 2 and 3 and scores 1 plus 0.631 plus 0.5, which is 2.131. NDCG is 1.5 divided by 2.131, or 0.70.",
        },
        {
          kind: "p",
          text: "Now shuffle the same five items to B, A, D, C, E. The hits fall at positions 2 and 4. Precision is still 0.4 and recall is still 0.67. DCG is 0.631 plus 0.431, which is 1.062, and NDCG is 0.50. The metric sees what the first two cannot.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Why the discount is a logarithm",
          text: "A customer reads a row from the left and the attention drops fast and then slowly. A log discount gives position 2 about 63 percent of position 1, and position 5 about 39 percent. The choice is a convention. It is useful because it is smooth and everyone uses the same one.",
        },
        {
          kind: "p",
          text: "An offline win can still lose online. The test data records what customers did after the old system showed them something. A model that learns to suggest what customers would have bought anyway, such as their usual consumables, scores well offline. It adds nothing, and may crowd out the products that would have lifted the basket.",
        },
        {
          kind: "p",
          text: "So run an A/B test. Assign by customer, so each customer sees one design. The basket row has 6,000 views a day and an add rate of 4 percent. You want to detect a lift to 4.4 percent, which is 10 percent relative.",
        },
        {
          kind: "p",
          text: "A rule of thumb gives the views in each arm for 80 percent power at the 5 percent level. It is 16 times p times (1 minus p), divided by the square of the difference. Here that is 16 times 0.0384, divided by 0.000016, or 38,400. Two arms need 76,800 views, which is 12.8 days. Run 14 days.",
        },
        {
          kind: "p",
          text: "Add a **guard metric**, one that must not get worse while you chase the main one. Order value per session must not fall by more than 1 percent, and the row's 95th percentile latency must stay under 100 ms. A model can win on adds and lose on money, if it fills baskets with cheap items.",
        },
        {
          kind: "p",
          text: "**Position bias** is the pull of the top slot. Say position 1 gets clicked 8 percent of the time and position 5 gets 2 percent, whatever is there. A product logged at position 5 looks four times worse than it is. Log the position of every impression. For 2 percent of views, shuffle the order and measure the pull.",
        },
        {
          kind: "quiz",
          id: "design09-q6",
          question: "A list hits at positions 1 and 3 of 5, with three relevant items in all. A second list holds the same items but hits at positions 2 and 4. Which metrics differ?",
          options: [
            "Precision at 5 only.",
            "Recall at 5 only.",
            "Precision and recall at 5.",
            "NDCG at 5 only.",
          ],
          answer: 3,
          explain: "Both lists hit twice in five and find two of three relevant items, so precision and recall match. NDCG rewards earlier hits, so it falls from 0.70 to 0.50.",
        },
        {
          kind: "quiz",
          id: "design09-q7",
          question: "Why does Harbour's A/B test carry a guard metric on order value per session?",
          options: [
            "Because add-to-basket cannot be measured.",
            "Because a model can raise adds by suggesting cheap items and lower the value of the order.",
            "Because the test would otherwise take more than 14 days.",
            "Because position bias would otherwise be zero.",
          ],
          answer: 1,
          explain: "The main metric is adds. A guard metric catches a win on adds that costs money elsewhere. The model should only go live if the guard holds.",
        },
        { kind: "p", text: "The scoring is settled. The last design work is how the system breaks and how it stays good." },
      ],
    },
    {
      id: "s7-failures-drift",
      title: "Four failure modes each have a control, and a weekly retrain rolls back in one pointer change",
      goal: "How does the system break, and what keeps it current?",
      blocks: [
        {
          kind: "compare",
          caption: "The four failures, what shows, and the control. Thresholds are illustrative.",
          columns: ["Failure", "What you see", "Control"],
          rows: [
            ["Stale features", "The nightly job failed and the store still holds Monday's values on Wednesday", "Every row carries its computed-at time. Alert when the newest is over 26 hours old. Serving refuses rows older than 36 hours and falls back to the counts baseline."],
            ["Feedback loop", "The model shows what sells, so it sells more, and the rest of the catalogue vanishes from the row", "Reserve 1 slot of 5 for exploration, and log the position. Alert when under 60 percent of the catalogue, 4,800 of 8,000 products, is shown in a week."],
            ["Popular-item collapse", "Every customer sees the same few sealants and fixings", "Alert when the top 20 products take over 25 percent of impressions. The normal share is 12 percent. Limit each category to 2 slots."],
            ["Bad model promoted", "Add rate falls after a Sunday release", "The gate, then a canary at 5 percent of customers, then a registry rollback to the previous version."],
          ],
        },
        {
          kind: "p",
          text: "Drift is the world moving away from the training data. Monitor three things. The inputs: a population stability index on the top features, alerting above 0.2. The outputs: the spread of ranker scores. And the outcomes: the add rate of the row against its 28-day band.",
        },
        {
          kind: "p",
          text: "Labels arrive in two speeds. An add to basket comes within the session, so the add rate is the fast alarm. An order comes within a few days, so order-based metrics lag. Watch the fast one daily, and the slow one weekly.",
        },
        {
          kind: "p",
          text: "Choose the retraining schedule from how fast the catalogue changes. Harbour adds 40 products a month, or 0.5 percent. Co-purchase counts and rows refresh nightly, and the ranker retrains weekly on Sunday. A catalogue that turns over 10 percent a week, such as a fashion shop, would retrain daily.",
        },
        {
          kind: "p",
          text: "Retrain early if the add rate sits 15 percent below its 28-day mean for three days. Do the same if the index passes 0.2 on a top feature. The early run goes through the same gate as any other.",
        },
        {
          kind: "p",
          text: "Rollback goes through the registry. Keep the last three versions with their data snapshots. If v14 misbehaves, set the production stage back to v13. Serving reloads the pointer, and the row is back on the old model in under 5 minutes. Nobody retrains under pressure.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Never raise a threshold to quiet an alert",
          text: "If the stale-feature alert fires every Monday because the job runs late, fix the job. Widening the limit from 26 to 50 hours means the first alert arrives after customers have already seen two-day-old rows.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "The recommendations got worse last week. What do you check?",
          text: "Open with the answer: first features, then data, then the model. Check feature age and the parity check, then the validation log for a quarantined day, then the registry for a new version. Interviewers push on how you tell drift from a bug, and on how fast you can roll back.",
        },
        {
          kind: "quiz",
          id: "design09-q8",
          question: "The top 20 products take 31 percent of impressions, up from a normal 12 percent. Which failure is this?",
          options: [
            "Stale features.",
            "Cold start.",
            "Popular-item collapse.",
            "Training-serving skew.",
          ],
          answer: 2,
          explain: "A concentrated share of impressions on a few products means the row has collapsed to the popular items. The control is a share alert and a limit of 2 slots per category.",
        },
        { kind: "p", text: "Every step has an answer now. The last section puts them on one page." },
      ],
    },
    {
      id: "s8-design-sheet",
      title: "The recommendation design fits on one page and adds five rows to the ledger",
      goal: "What does the finished design look like?",
      blocks: [
        {
          kind: "p",
          text: "Fill the sheet in the order of the seven steps. Keep the volumes and the budgets next to the parts they size. The machine cost is illustrative. Two serving instances at £0.10 an hour are £4.80 a day. The nightly job is £1.00, weekly training is about £0.09 a day and storage is £2. That is £7.89 a day.",
        },
        { kind: "code", lang: "text", caption: "The finished recommendation design, as you would leave it on the board.", code: "DESIGN SHEET: recommendations for the Harbour trade portal\nPrompt              Basket row (you may also need) and home reorder row\n\n1 Users and volumes 15,000 customers, 8,000 products, 12,000 sessions a day\n                    360,000 events a day, 3,000 orders, 24,000 order lines\n                    18,000 row requests a day, peak 2.2 a second\n2 Non-functionals   Row in 100 ms at p95 and never blocks the page\n                    Nightly freshness. The basket is read live\n                    Success is an add to basket. Guard is order value per session\n3 Components        Event stream, nightly batch to the warehouse, validation\n                    Feature store, offline and online, one definition\n                    Trainer, registry, retrieval, ranker, precomputed reorder rows\n4 Data flow         Events validated, features snapshotted by date\n                    As-of join on the day before each label\n                    Model v14 promoted by gate. Serving loads the production stage\nSizing              Online store 15.76 MB. Training table 9.12 million rows, 1.09 GB\n                    220 candidates. 45 ms CPU a request, 0.1 core at the peak\n                    Latency 15 + 10 + 10 + 30 + 5 + 5 = 75 ms of 100\nCost                About £7.89 a day, illustrative\n5 Failure modes     Stale features: age alert at 26 hours, refuse at 36\n                    Feedback loop: 1 exploration slot, coverage over 60 percent\n                    Collapse: top 20 under 25 percent of impressions\n                    Bad model: gate, canary, registry rollback\n6 Evals             Time split 76, 7 and 7 days. Gate: NDCG at 5 above 0.187\n                    A/B test 14 days, 38,400 views an arm. Guard: order value\n7 Rollout           Shadow for a week, canary at 5 percent, then 25, 50, 100\n                    Weekly retrain, early on a 15 percent add-rate drop\n\nLedger\nDecision                       Gave up                                      Revisit when\nNightly batch features         Same-day reaction to a sell-out or a promo   Catalogue turns over 5 percent a month, or a same-day lift is worth chasing\nCo-purchase table, no index    Matches for products with few orders         Catalogue passes 100,000 products, or 30 percent of products have under 20 pairs\nWeekly ranker retrain          Fresher models                               Input index passes 0.2, or the add rate drops 15 percent for 3 days\nAdd to basket as success       Direct view of revenue                       Order value per session falls 1 percent in a test\nPrecomputed reorder row        An order placed today shows in tomorrow's row  Customers reorder more than once a day" },
        { kind: "p", text: "Read it out like this. The system recommends from nightly batch features and a live basket. It retrieves about 220 candidates from a co-purchase table, ranks them in 30 ms and answers inside 75 ms of a 100 ms limit." },
        { kind: "p", text: "Then say how it stays honest. A time split and a counting baseline gate every model, and an A/B test with a guard metric decides. Each failure has a control, and a rollback is one pointer in the registry." },
        { kind: "code", lang: "text", caption: "For your next ML system. It adds the lines a classical ML design needs to the blank sheet.", code: "Success metric      ____  (label, offline metric, online metric)\nGuard metric        ____  (what must not get worse)\nFreshness           ____  (batch or stream, and the number that decides)\nOnline store size   ____  (rows x features x bytes)\nSplit               ____  (by time, with the days in each part)\nBaseline            ____  (the simple method and its score)\nPromotion gate      ____  (metric, margin, slices, latency)\nLatency budget      ____  (stages that add up, with slack)\nDrift alarms        ____  (inputs, outputs, outcomes, thresholds)\nRetrain rule        ____  (schedule, early trigger, rollback)" },
        { kind: "p", text: "This design learns from yesterday's data. Chapter ten takes the real-time side, where the answer must arrive inside a payment." },
      ],
    },
  ],
  recap: [
    "Four questions change the diagram: catalogue size, freshness, the latency budget and what counts as success.",
    "A replayable event stream, a nightly batch job and validation are enough. That holds when the signal changes slowly and the live part arrives with the request.",
    "One feature definition feeds both halves of the store. Each training row joins the snapshot from before its label.",
    "Split by time, beat a counting baseline by a stated margin, record the data snapshot with the model version and promote through a gate.",
    "Retrieve about 220 candidates, rank them inside a budget that adds up to 75 ms, and precompute rows where an order is the only change.",
    "Score with Precision at K, Recall at K and NDCG, then decide with an A/B test and a guard metric.",
    "Give stale features, feedback loops, popular-item collapse and a bad model a control each, retrain on a schedule and roll back through the registry.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In the recommendation system I learned that a nightly batch design is enough when the signal changes slowly. One feature definition feeds both halves of the store. Each training row sees only what was known before its label. A gate against a counting baseline decides what ships. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["design-q17", "design-q18"],
};

export default chapter;
