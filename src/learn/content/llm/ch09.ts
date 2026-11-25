import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "llm-08-fine-tuning-and-distillation",
  course: "llm",
  number: 9,
  title: "Tune last, and only when a narrow task has the data and the volume",
  tagline: "Should Harbour train its own model for ledger coding? Try the prompt and then retrieval first, and tune only when the sums say so.",
  minutes: 50,
  objectives: [
    "Choose between a prompt, retrieval and tuning from the question a failure raises.",
    "Say what tuning changes and what it cannot, and count the labelled data a narrow classifier needs.",
    "Describe LoRA, provider fine-tuning and open-weight tuning, and size a LoRA adapter.",
    "Work out whether distilling a large model into a small one pays back at a given volume.",
    "Evaluate a tuned model on a held-out set and a general regression set, and price its hosting.",
    "Write a tune-or-not decision with a twelve-month cost sheet.",
  ],
  sections: [
    {
      id: "s1-order",
      title: "Prompt first, retrieve second, tune last, because each step costs more and undoes less",
      goal: "Which step should a weak answer go to first?",
      blocks: [
        { kind: "p", text: "Chapter eight showed where a model should think harder. This chapter asks whether Harbour should change the model itself, and its candidate is the ledger coding job." },
        {
          kind: "p",
          text: "Harbour Supplies has three ways to improve a weak answer. It can change the prompt. It can retrieve the facts the model lacks. It can tune the model on examples. Try them in that order, because each one costs more and is harder to undo.",
        },
        {
          kind: "p",
          text: "A prompt edit takes minutes, and one commit reverts it. Retrieval needs an index and a pipeline, and you can switch it off. Tuning needs labelled data, a training run and a new model to host. When the base model changes, you train again.",
        },
        {
          kind: "p",
          text: "Each step answers one question. Ask what the model is missing. If it has the ability but misreads the task, change the prompt. If it lacks facts, or the facts change, retrieve. If it does the right work but not reliably, or at too high a cost per call, consider tuning.",
        },
        {
          kind: "compare",
          caption: "The step you pick follows what the model is missing, and each step costs more to try than the last.",
          columns: ["Step", "The question that sends you here", "What it costs to try", "Harbour example"],
          rows: [
            ["Prompt", "Does the model misread the task?", "One edit and one eval run", "Dates come back as March 3rd, not ISO."],
            ["Retrieve", "Does it lack facts, or do the facts change?", "An index, a pipeline and a freshness plan", "Quote this month's payment terms."],
            ["Tune", "Is it right in kind but inconsistent, or too costly at volume, with labelled data in hand?", "Labelled examples, a training run and a model to host", "Code lines to 40 ledger codes, at a forecast 2 million a month."],
          ],
        },
        {
          kind: "p",
          text: "Skipping ahead is the common mistake. Teams tune because tuning feels serious. Then the eval shows the failures were a missing rule in the prompt. Chapter five gave this order from the failure pattern. This chapter adds the mechanics and the numbers for the last step.",
        },
        {
          kind: "quiz",
          id: "llm08-q1",
          question: "Harbour's chat assistant, which answers staff questions, quotes last year's payment terms. Finance rewrote them yesterday. What is the first fix?",
          options: [
            "Fine-tune the model on the new terms.",
            "Retrieve the current terms at query time.",
            "Switch to a larger model.",
            "Lower the temperature.",
          ],
          answer: 1,
          explain: "The model lacks a fact that changes. Retrieval reads the current text on every call, while tuning would freeze yesterday's version and need a new run for each edit.",
        },
        { kind: "p", text: "Tuning is last in the order. The next section says what it can and can't change when you do get there." },
      ],
    },
    {
      id: "s2-what-tuning-changes",
      title: "Tuning changes format, style and narrow classifiers, and it cannot add knowledge or freshness",
      goal: "Which failures can tuning fix, and how much labelled data does it need?",
      blocks: [
        {
          kind: "p",
          text: "Tuning changes how a model behaves. It does not teach the model what is true today. That split decides most requests you will get.",
        },
        {
          kind: "list",
          items: [
            "Format: a fixed JSON shape or report layout, produced every time without a long prompt.",
            "Style: Harbour's short, formal reply tone, held steady across thousands of replies.",
            "A narrow classifier: one input type, one label set and a stable definition of right.",
            "Cost: a small tuned model can replace a large prompted one on a narrow task.",
          ],
        },
        {
          kind: "p",
          text: "Tuning does badly at knowledge and freshness. A model trained on last quarter's price list will quote it with confidence next quarter. Facts that change belong in retrieval, where you update them without training. Facts that need a citation belong there too.",
        },
        {
          kind: "p",
          text: "Data decides whether tuning is possible. Take the ledger-coding task, where each invoice line gets one of Harbour's ledger codes, its accounting categories. Harbour has 40 of them.",
        },
        {
          kind: "p",
          text: "As a working rule, aim for about 50 examples per code, so the model sees each label often enough. That is 40 times 50, or 2,000 training examples. The 50 is a rule of thumb. No provider sets it.",
        },
        // CHECKED 17 Oct 2026: https://developers.openai.com/api/docs/guides/supervised-fine-tuning
        {
          kind: "p",
          text: "Now hold out a fifth of everything for testing. If 2,000 is four fifths, the total is 2,500, so 500 are held out. At 30 seconds to check each label, 2,500 labels take 75,000 seconds. That is about 21 hours of careful work. Rare codes need extra examples, so treat the figure as a floor.",
        },
        {
          kind: "quiz",
          id: "llm08-q2",
          question: "Harbour has 30 ledger codes and wants 40 training examples per code. A fifth of all labelled data is held out. How many labelled examples does it need in total?",
          options: ["1,200", "1,500", "1,440", "1,800"],
          answer: 1,
          explain: "Training needs 30 times 40, which is 1,200. That is four fifths of the total, so the total is 1,200 divided by 0.8, which is 1,500. Of those, 300 are held out.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "When would you fine-tune a model, and when would you not?",
          text: "Open with the order: prompt, then retrieval, then tuning. Say tuning changes format, style and narrow classification, and cannot add current facts. Name the conditions for tuning: a stable task, a few thousand labelled examples, a held-out set, and a cost or consistency gain you can measure. Interviewers push on data volume and on what you check after training.",
        },
        {
          kind: "widget",
          id: "llm-tune-or-not",
          intro: "Eight requests arrive from Harbour teams. For each one, pick the first step you would try. Ask what the model is missing before you choose. If some answers are wrong, you get a second attempt, and the explanations show after that.",
        },
        { kind: "p", text: "If the job suits tuning and the data exists, the question becomes how the training happens." },
      ],
    },
    {
      id: "s3-mechanics",
      title: "Every route to a tuned model is the same loop, and the routes differ in who trains and who hosts",
      goal: "How do LoRA, provider fine-tuning and open weights differ?",
      blocks: [
        {
          kind: "p",
          text: "Every route follows one loop. You prepare examples, train, test on a held-out set and deploy. The routes differ in who runs the training and who hosts the result.",
        },
        {
          kind: "p",
          text: "Full tuning updates every weight, which needs a lot of memory. **LoRA** freezes the base weights and trains two small matrices beside each large one. Their product is added to the frozen weights. The adapter is small, so training is cheaper, and one base model can carry many adapters.",
        },
        {
          kind: "p",
          text: "Take one weight matrix of 4,096 by 4,096. It holds 16,777,216 values. A rank 8 adapter trains a 4,096 by 8 matrix and an 8 by 4,096 matrix. That is 32,768 plus 32,768, or 65,536 values. It is 0.39 percent of the original matrix.",
        },
        {
          kind: "p",
          text: "Provider fine-tuning hides the training. You upload examples as lines of JSON, the provider trains, and you receive a model or an endpoint to call. Harbour's ledger example looks like this in the format Gemini uses.",
        },
        // CHECKED 21 Oct 2026: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini-supervised-tuning-prepare
        {
          kind: "code",
          lang: "json",
          code: "{\"systemInstruction\":{\"parts\":[{\"text\":\"Code this invoice line to one Harbour ledger code.\"}]},\"contents\":[{\"role\":\"user\",\"parts\":[{\"text\":\"Pallet wrap, 20 rolls, supplier Brightpack\"}]},{\"role\":\"model\",\"parts\":[{\"text\":\"5120\"}]}]}",
          caption: "One training example, which is one line of the file. The model turn is the answer you want.",
        },
        {
          kind: "p",
          text: "On Google Cloud, you run supervised fine-tuning of a Gemini model on Vertex AI. The table lists the other providers. Open weights are a different route. You train with the Hugging Face libraries and host the model yourself.",
        },
        // CHECKED 21 Oct 2026: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini-supervised-tuning
        // CHECKED 21 Oct 2026: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini-use-supervised-tuning
        // CHECK: confirm whether a tuned Gemini endpoint bills per token or by the hour; the tuning pages say only that inference costs still apply https://cloud.google.com/vertex-ai/generative-ai/pricing
        // CHECKED 17 Oct 2026: https://developers.openai.com/api/docs/deprecations
        // CHECKED 17 Oct 2026: https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/fine-tuning
        // CHECKED 17 Oct 2026: https://docs.aws.amazon.com/bedrock/latest/userguide/custom-models.html
        // CHECKED 17 Oct 2026: https://huggingface.co/docs/trl/sft_trainer
        {
          kind: "compare",
          caption: "The routes differ in who trains, who hosts and what the bill looks like after training.",
          columns: ["Route", "You supply", "Who trains and hosts", "What to check"],
          rows: [
            ["Gemini on Vertex AI", "JSONL examples", "Vertex AI trains, and the tuned model gets its own endpoint", "Which Gemini models allow tuning today, and whether serving bills per token or by the hour."],
            ["OpenAI", "JSONL examples", "The provider trains and hosts", "Which base models allow tuning, since OpenAI is winding down self-serve fine-tuning, and the per-token price of the tuned model."],
            ["Azure OpenAI", "JSONL examples", "Azure trains, and you create a deployment", "Whether the tuned deployment bills by the hour, and your region and quota."],
            ["Amazon Bedrock", "Examples in S3", "Bedrock trains, and you buy capacity to serve", "Which models allow it, and whether serving needs provisioned throughput."],
            ["Open weights", "Examples and GPUs", "You train and host", "Licence terms, GPU cost and the serving stack you now own."],
          ],
        },
        {
          kind: "quiz",
          id: "llm08-q3",
          question: "A rank 4 adapter is added to a 1,000 by 1,000 weight matrix. How many values does the adapter train?",
          options: ["4,000", "8,000", "1,000,000", "4,000,000"],
          answer: 1,
          explain: "The adapter has a 1,000 by 4 matrix and a 4 by 1,000 matrix. That is 4,000 plus 4,000, or 8,000 values, which is 0.8 percent of the 1,000,000 in the original matrix.",
        },
        { kind: "p", text: "All of those routes train on data you already hold. The next section looks at a cheaper way to get the labels." },
      ],
    },
    {
      id: "s4-distillation",
      title: "Distillation pays only when volume is high enough to cover the one-off cost and the fixed hosting",
      goal: "When does a small student model beat the large teacher over twelve months?",
      blocks: [
        {
          kind: "p",
          text: "Distillation uses a large model to teach a small one. The large model is the teacher. It labels a pile of real inputs. You check a sample of those labels, then train a small model on them. The small model is the student.",
        },
        {
          kind: "p",
          text: "The point is cost. The teacher is accurate but dear. The student runs one task for a fraction of the price. The student cannot beat the teacher, and it inherits the teacher's errors. So review the labels before you train.",
        },
        {
          kind: "p",
          text: "Here are illustrative figures for the ledger task. A line is 500 input tokens and 20 output tokens. The large model charges 3 pounds per million input tokens and 15 per million output tokens. One line costs 0.0015 plus 0.0003, which is 0.0018 pounds.",
        },
        {
          kind: "p",
          text: "The small model charges 0.30 and 1.20 pounds per million. One line costs 0.00015 plus 0.000024, which is 0.000174 pounds. The saving is 0.001626 pounds a line. At 100,000 lines a month that saves 162.60 pounds.",
        },
        {
          kind: "p",
          text: "Now the one-off cost. The teacher labels 5,000 lines at 0.0018 pounds each, which is 9 pounds. A person reviews 500 labels at 30 seconds each. That is 15,000 seconds, or 4.2 hours, and at 40 pounds an hour it costs 167 pounds. Three training runs at 50 pounds add 150. The total is about 326 pounds.",
        },
        {
          kind: "p",
          text: "Serving is the catch. Suppose the tuned model sits on a deployment that bills 0.50 pounds an hour. Over 730 hours that is 365 pounds a month, or 4,380 pounds over twelve months. Hosting costs more than the training did.",
        },
        {
          kind: "p",
          text: "Compare twelve months at V lines a month. The large model costs V times 12 times 0.0018. The student costs 326, plus V times 12 times 0.000174, plus 4,380. They are equal near 241,000 lines a month. Below that, keep the large model. Above it, distil.",
        },
        // CHECKED 17 Oct 2026: https://www.anthropic.com/legal/commercial-terms
        {
          kind: "callout",
          tone: "interview",
          title: "What is distillation, and when does it pay for itself?",
          text: "Open with the definition: a large teacher labels data and a small student learns from it. Then give the break-even sum: one-off labelling and training cost, plus fixed hosting, against the saving per call at your volume. Interviewers push on label quality, the terms that govern training on a model's outputs, and what happens when the teacher is upgraded.",
        },
        {
          kind: "quiz",
          id: "llm08-q4",
          question: "The one-off cost is 326 pounds. The student saves 162.60 pounds a month and hosting adds no fixed fee. How long until it pays back?",
          options: ["About two months", "About five months", "About twelve months", "It never pays back"],
          answer: 0,
          explain: "326 divided by 162.60 is about 2.0 months. With a fixed hosting fee of 365 pounds a month, the saving of 162.60 would not cover the fee, and it would never pay back.",
        },
        {
          kind: "widget",
          id: "llm-distil-cost",
          intro: "Four Harbour cases give a monthly volume and a hosting model. For each, decide whether to keep the large model or distil. Work out twelve months on both sides before you pick. Watch what changes when the hourly hosting fee disappears.",
        },
        { kind: "p", text: "A cheaper model is only worth having if it's safe to ship. The next section says how to check." },
      ],
    },
    {
      id: "s5-evaluating",
      title: "A tuned model needs a held-out set, a regression check and a hosting bill that outlives training",
      goal: "What must a tuned model pass, and what will it keep costing?",
      blocks: [
        {
          kind: "p",
          text: "A tuned model is a new model, so it faces the same eval as any candidate from chapter five. Compare it with your best prompted baseline on the same cases. Then add two checks that prompting never needed.",
        },
        {
          kind: "p",
          text: "First, the held-out set. The 500 held-out lines from the ledger task never appear in training. Check that no invoice appears in both sets, including near duplicates from the same supplier.",
        },
        {
          kind: "p",
          text: "Suppose the tuned model scores 94 percent and the prompted large model scores 92. The sampling error on 500 cases is about 1.1 points. A two-point gap is barely clear of noise, so report it that way.",
        },
        {
          kind: "p",
          text: "Second, a regression check on general tasks. Tuning can erode abilities you did not train. Keep 50 general prompts that the base model handled, such as summarising an email or reading a table.",
        },
        {
          kind: "p",
          text: "Suppose the base passes 46, which is 92 percent. The tuned model passes 41, which is 82 percent. That drop of 10 points blocks the release if your gate allows 3.",
        },
        {
          kind: "p",
          text: "Course 4 taught release gates and their thresholds. Treat the general regression set as one more slice in that gate.",
        },
        {
          kind: "p",
          text: "Then price what outlives training. Training happens once. Hosting recurs every month. The 4,380 pounds from the last section is twelve months of an hourly fee, even if the model serves little traffic. A new base model or a new ledger code means another training run and another eval.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A tuned model is pinned to its base model and its data",
          text: "When the provider retires the base model, the tuned model goes with it. Keep the training file, the eval sets and the training settings in version control, as chapter six describes. Then retraining is a rerun.",
        },
        {
          kind: "quiz",
          id: "llm08-q5",
          question: "The tuned model beats the baseline by 4 points on the held-out set but drops 10 points on 50 general prompts. The gate allows a 3 point drop. What now?",
          options: [
            "Ship it, because the held-out gain is a real improvement.",
            "Block the release and widen the training mix with general examples.",
            "Remove the general prompts from the gate.",
            "Average the two results and ship if the mean is positive.",
          ],
          answer: 1,
          explain: "The regression gate is a blocking check. A 10 point drop breaks the 3 point limit, so the release stops. Widening the training mix is the usual first repair, and then you rerun both sets.",
        },
        { kind: "p", text: "Harbour has the method and the numbers. The last section uses them on ledger coding and gets a clear answer." },
      ],
    },
    {
      id: "s6-tune-decision",
      title: "Harbour won't distil ledger coding at 100,000 lines a month, and it knows when that changes",
      goal: "How do you write down a decision to tune or not?",
      blocks: [
        { kind: "p", text: "The method starts with the order. Then cost twelve months on both sides at today's volume. Then name the volume where the answer flips." },
        { kind: "p", text: "Ledger coding is a narrow task with a stable label set, so it's the right kind of job. The prompt is already tight and the labels don't need facts that change. Data is possible, at 2,500 labels and about 21 hours of checking." },
        { kind: "p", text: "At 100,000 lines a month, the large model costs 12 times 180 pounds, which is 2,160 pounds a year. The student costs 326 once, 208.80 in tokens and 4,380 in hosting. That is 4,914.80 pounds. The student loses by 2,754.80 pounds." },
        { kind: "p", text: "The fixed hosting fee decides this, so it's worth checking first. If the tuned model billed per token with no hourly fee, the student would cost 534.80 pounds a year and would win. The docs Harbour could read didn't settle how a tuned Gemini endpoint bills. So that is the first question on the record." },
        { kind: "code", lang: "text", caption: "Harbour's tune-or-not decision for ledger coding. Worked example, invented prices.", code: "TUNE OR NOT: ledger coding (code job)\nStatus: do not distil now    Owner: Harbour platform team\n\nORDER CHECK\nPrompt      tight already, failures are not misreadings\nRetrieval   not relevant, the 40 codes do not change\nTuning      candidate: narrow, stable label set\n\nDATA\nCodes 40 x 50 examples      2,000 training\nHeld out, one fifth           500\nTotal labels                2,500\nChecking at 30 s each       about 21 hours\n\nTWELVE MONTHS AT 100,000 LINES A MONTH (pounds)\n                        Large model     Distilled student\nOne-off (9 + 167 + 150)       0            326.00\nTokens                     2,160.00        208.80\nHosting (0.50 x 730 x 12)     0          4,380.00\nTotal                      2,160.00      4,914.80\n\nWHERE IT FLIPS\nBreak-even volume       about 241,000 lines a month\nAt the forecast of 2 million lines:\n                       43,200.00         8,882.00\nWith per-token serving and no hourly fee, at 100,000 lines:\n                        2,160.00          534.80\n\nDECISION                Keep the large model, gemini-4-argon\n\nREOPEN WHEN\nLines reach 241,000 a month\nGoogle's price page confirms tuned endpoints have no hourly fee\nThe base model's retirement date is within 90 days\n\nIF IT SHIPS, IT MUST PASS\nHeld-out set of 500, scored against the prompted baseline\nGeneral regression set of 50, with at most a 3 point drop" },
        { kind: "p", text: "The right kind of task isn't enough, because volume decides. Hosting is 89 percent of the student's yearly cost, so one unknown price carries the whole answer. Harbour's forecast would flip it easily, and the record says so. Nothing is trained until a trigger fires." },
        { kind: "code", lang: "text", caption: "For your next customer: copy this and fill it in.", code: "TUNE OR NOT: [job]\nStatus:      Owner:\n\nORDER CHECK\nPrompt:\nRetrieval:\nTuning:\n\nDATA\nLabels x examples per label:\nHeld out:\nTotal labels:\nHours to check:\n\nTWELVE MONTHS AT [current volume]\n                Current model   Tuned or distilled\nOne-off:\nTokens:\nHosting:\nTotal:\n\nWHERE IT FLIPS\nBreak-even volume:\n\nDECISION:\n\nREOPEN WHEN:\n\nIF IT SHIPS, IT MUST PASS:" },
        { kind: "p", text: "Harbour now has a decision for every part of the model layer. Chapter ten follows one invoice through all of them." },
      ],
    },
  ],
  recap: [
    "Try the prompt, then retrieval, then tuning, because each step costs more and is harder to undo.",
    "Tuning changes format, style and narrow classification. Facts that change belong in retrieval.",
    "A 40-code classifier at 50 examples per code needs 2,000 training examples and 2,500 labels once a fifth is held out.",
    "A LoRA adapter trains a tiny share of the weights, 0.39 percent for a rank 8 adapter on a 4,096 square matrix.",
    "Distilling pays back only above the break-even volume, and fixed hosting often decides it.",
    "A tuned model ships only after a held-out set, a general regression check and a twelve-month hosting estimate.",
    "A tune-or-not record costs twelve months on both sides and names the volume where the answer flips.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In fine-tuning and distillation I learned to try the prompt, then retrieval, and to tune only a narrow, stable task with labelled data. I price twelve months of hosting before I distil, and I check a held-out set and general tasks before I ship. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["llm-q15", "llm-q16"],
};

export default chapter;
