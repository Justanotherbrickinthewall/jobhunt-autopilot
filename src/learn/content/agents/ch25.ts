import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "agents-25-capstone-graph",
  course: "agents",
  number: 25,
  title: "PayDesk 2: the agents, the graph and the topic sit around the core and never touch the money",
  tagline: "How do the agents, the graph and the topic sit around the core without touching the money?",
  minutes: 90,
  objectives: [
    "Name PayDesk's pattern, and say where the model picks and where code routes.",
    "Build the provider and the mailer's fill and send, with an idempotency key on every call.",
    "Build the policy that picks a step from signals and drafts a mail with placeholders.",
    "Build the graph that saves its state after every node, and say what a handoff passes.",
    "Build the topic and the 09:00 and 00:00 jobs, and explain why the consumers pull.",
    "Run one instalment through the walk, and read its saves and the 09:00 burst.",
    "Give the 30-second answer, and keep pull versus push apart from point-to-point versus publish-subscribe.",
  ],
  sections: [
    {
      id: "s1-pattern",
      title: "PayDesk is a deterministic workflow, and the model picks only one step from five",
      goal: "Which parts of the desk does the model touch, and which does code own?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 24 built PayDesk's core: the records, the store, calculate, the seeded data and rebalance. None of it calls a model. It ended with a question. How do the agents, the graph and the topic sit around that core without touching the money? This chapter builds them.",
        },
        {
          kind: "p",
          text: "The agents here are one model doing two jobs. It picks the next step for an instalment, and it drafts the customer's mail. Everything else is code. That covers the graph that runs each instalment, the topic that wakes it and the two outside services it calls.",
        },
        {
          kind: "p",
          text: "The pattern is the deterministic workflow from chapter 12: code routes, and the model picks from a fixed set. Chapter 10 placed designs by who picks the next step. In PayDesk, code runs every node in a fixed order. Inside one node, the model chooses one of five steps from a list code wrote. Code then decides what that step does.",
        },
        {
          kind: "p",
          text: "The graph has five nodes. Every run for every instalment goes through the same five, in the same order. Only the step chosen inside them changes.",
        },
        {
          kind: "compare",
          caption: "The five nodes of one run, who decides in each and what it writes",
          columns: ["Node", "Who decides", "What it writes to the state", "Status after it"],
          rows: [
            ["calculate", "Code, over the store", "The signals and the amount due", "calculated"],
            ["decide", "The model, from the signals alone", "The step it proposes", "calculated"],
            ["guard", "Code. Here it passes the proposal on, and PayDesk 3 (chapter 26) plugs in the real check", "The final step, and how often it blocked", "calculated"],
            ["act", "Code, using the provider and the mailer", "The actions taken", "link_generated, then email_sent, or handed_to_sales"],
            ["close", "Code", "The last status", "closed, or handed_to_sales"],
          ],
        },
        {
          kind: "p",
          text: "A run starts as `initialized`, before any node has run. The statuses then move one way. A case that leaves the desk ends as `handed_to_sales` instead of `closed`. Both are terminal, so a finished run is never run again.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "The model sees signals, never amounts or names",
          text: "Calculate turns money into signals, such as the sign of the shortfall and whether the link has expired. The decide node gets only those. The model can't mail a wrong amount, because it never holds one.",
        },
        {
          kind: "widget",
          id: "agents25-run-walker",
          intro:
            "Pick a state for instalment IT0001-2 and run the five nodes one at a time. Watch the saved status after each node. The slip box previews PayDesk 3, whose guard stops a step the signals don't allow.",
        },
        {
          kind: "quiz",
          id: "agents25-q1",
          question: "At the decide node the model returns `send_link`. Which statement about the design is correct?",
          options: [
            "The model now owns the path, because it chose the action.",
            "Code still owns the path. The model picked one step from a set code wrote, and code checks it and acts on it.",
            "The graph is an agent, because a model is inside it.",
            "The guard is unnecessary, because the set is fixed.",
          ],
          answer: 1,
          explain:
            "A fixed set limits what the model can say. It doesn't make every choice safe, because send_link is in the set and still wrong for an overpaid case. That is why a guard node sits between decide and act.",
        },
        {
          kind: "p",
          text: "Only the act node reaches outside the desk. The next section builds the two services it calls.",
        },
      ],
    },
    {
      id: "s2-tools",
      title: "The provider and the mailer are the only outside calls, and each call carries an idempotency key",
      goal: "What do the two outside services do, and how does each one refuse a repeat?",
      blocks: [
        {
          kind: "p",
          text: "The desk calls two outside services. The **provider** is the fake payment service that makes links and takes payments. It also issues refunds. The **mailer** is the fake mail service. Both are fakes with real contracts. A link expires after 28 hours, and a repeated call changes nothing.",
        },
        {
          kind: "p",
          text: "That last contract is chapter 7's idempotency key: a value built from the request that the store accepts only once, so a repeat changes nothing. Chapter 7 put one on a tool call. This chapter puts one on every provider and mailer call. The provider and the mailer remember their own link and mail keys. A refund key goes into chapter 24's refunds table.",
        },
        {
          kind: "p",
          text: "Work in `src/paydesk/` in your repository, and run each command from `src`. The reference copy is `capstone/src/paydesk/` in the my-learn folder. The provider is 48 lines, so it is shown in full.",
        },
        {
          kind: "step",
          id: "agents25-s1",
          title: "Write the provider",
          text: "`create_link` stores the link under its key, so a repeat returns the same link and counts a blocked duplicate. `link_valid` checks the newest link for an instalment. `refund_overpayment` puts the amount in the refund key, so repeating a refund of the same amount does nothing.",
          lang: "python",
          file: "src/paydesk/provider.py",
          code: `"""A fake payment provider. Links expire after 28 hours, and a repeated idempotency key changes nothing."""

import hashlib
from dataclasses import dataclass

from paydesk.store import Store

LINK_LIFE = 28 * 60  # minutes


@dataclass(frozen=True)
class Link:
    url: str
    instalment_id: str
    expires_at: int


class Provider:
    def __init__(self, store: Store) -> None:
        self.store = store
        self.links: dict[str, Link] = {}  # idempotency key -> link
        self.latest: dict[str, Link] = {}  # instalment id -> newest link
        self.dup_blocked = 0
        self.refunded = 0

    def create_link(self, key: str, iid: str, now: int) -> Link:
        if key in self.links:
            self.dup_blocked += 1
            return self.links[key]
        token = hashlib.sha1(key.encode()).hexdigest()[:8]
        link = Link(f"https://pay.meridian.example/{token}", iid, now + LINK_LIFE)
        self.links[key] = self.latest[iid] = link
        return link

    def link_valid(self, iid: str, now: int) -> bool:
        link = self.latest.get(iid)
        return link is not None and link.expires_at > now

    def refund_overpayment(self, itinerary_id: str, now: int) -> int:
        """Refund whatever was paid beyond the value. The key carries the amount, so a repeat is a no-op."""
        over = self.store.net_received(itinerary_id) - self.store.itinerary(itinerary_id).value
        if over <= 0:
            return 0
        if not self.store.add_refund(f"refund:{itinerary_id}:{over}", itinerary_id, over, now):
            self.dup_blocked += 1
            return 0
        self.refunded += 1
        return over`,
        },
        {
          kind: "p",
          text: "The mailer has two halves. This chapter builds the first: the mail record, the outbox, the placeholder fill and the keyed send. The second half is the mail check, which inspects a filled mail before it goes. PayDesk 3 adds it at the end of the class, so leave it out for now.",
        },
        {
          kind: "step",
          id: "agents25-s2",
          title: "Write the mailer's fill and send",
          text: "`fill` replaces each `{name}` style placeholder with a value from code, and leaves a placeholder it doesn't know. `send` refuses a key it has seen, so a redelivered event can't mail twice. The model's draft passes through nothing but `fill`. `first_try` records whether each first draft passed the mail check. It stays empty until PayDesk 3 adds the real mail check, which fills it.",
          lang: "python",
          file: "src/paydesk/mailer.py",
          code: `"""A fake mailer. The model drafts with placeholders and code fills them. PayDesk 3 adds a check before send."""

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Mail:
    key: str
    instalment_id: str
    kind: str
    day: int
    body: str


class Mailer:
    def __init__(self) -> None:
        self.outbox: list[Mail] = []
        self.keys: set[str] = set()
        self.dup_blocked = 0
        self.first_try: list[bool] = []  # did the first draft pass the check

    def fill(self, draft: str, values: dict[str, str]) -> str:
        return re.sub(r"\\{(\\w+)\\}", lambda m: values.get(m.group(1), m.group(0)), draft)

    def send(self, key: str, iid: str, kind: str, day: int, body: str) -> bool:
        if key in self.keys:
            self.dup_blocked += 1
            return False
        self.keys.add(key)
        self.outbox.append(Mail(key, iid, kind, day, body))
        return True

    def last_mail_day(self, iid: str) -> int | None:
        days = [m.day for m in self.outbox if m.instalment_id == iid]
        return max(days) if days else None`,
        },
        {
          kind: "widget",
          id: "agents25-mail-fill",
          intro:
            "Choose what the model drafts, and watch code fill the placeholders. Fill repairs nothing. If the model drops the link or writes its own figure, the filled mail is still wrong.",
        },
        {
          kind: "quiz",
          id: "agents25-q2",
          question: "The model drafts a mail with `{amount}` and code fills it. What does this guarantee, and what does it not?",
          options: [
            "It guarantees the whole mail is right.",
            "It guarantees nothing, because the model wrote the mail.",
            "It guarantees the amount comes from code. It does not stop the model dropping the link or writing a figure of its own.",
            "It guarantees the name is right but not the amount.",
          ],
          answer: 2,
          explain:
            "Filling removes one class of error. The model can still leave out a placeholder or add a number. PayDesk 3 adds a mail check after the fill and before the send.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Why the placeholder is a curly-brace word and not a template engine",
          text: "The pattern is `\\{(\\w+)\\}`. A word with no match is left as it is, and PayDesk 3's mail check rejects any mail that still has a brace. A full template engine would run code the model wrote. A plain substitution runs none.",
        },
        {
          kind: "p",
          text: "Both services take their values from code. The next section builds the one part that asks the model anything.",
        },
      ],
    },
    {
      id: "s3-policy",
      title: "The policy is the model's only seat, and it takes signals and returns a step",
      goal: "How does the model pick a step and draft a mail without seeing any money?",
      blocks: [
        {
          kind: "p",
          text: "The policy is the object that holds the model, and it has two methods. `decide` takes the signals and returns a step. `draft` takes a step and the signals, and returns text with placeholders. The scripted policy computes the right answer, then slips on a seeded share of calls. The live policy sends the same prompts to the course model.",
        },
        {
          kind: "p",
          text: "The seeded slips matter. A guard that never fires proves nothing, and a policy that never errs can't test one. Each slip comes from a random generator seeded by the event, so the same event always errs the same way.",
        },
        {
          kind: "step",
          id: "agents25-s3",
          title: "Write the drafts and the reference step",
          text: "`DRAFTS` holds the two mail bodies with their placeholders. `reference_step` is the right answer for a set of signals, in plain code. The scripted policy starts from it, and PayDesk 3's evals score against it.",
          lang: "python",
          file: "src/paydesk/policy.py",
          code: `"""The decision model. The scripted one is a function from signals to a step, with a seeded error rate.

\`--live\` swaps in LivePolicy, which has the same two methods and calls the course model.
"""

import json
import random
from dataclasses import asdict

from paydesk.calculate import Signals
from paydesk.models import Step

DRAFTS = {
    Step.SEND_LINK: "Dear {name}, your next Meridian Tours instalment of {amount} is due on {due_date}. "
    "Pay here: {link}. The link works for 28 hours.",
    Step.SEND_REMINDER: "Dear {name}, {amount} is still outstanding for your Meridian Tours trip. "
    "Your payment link is {link}.",
}


def reference_step(s: Signals) -> Step:
    """The right answer for these signals. The scripted model starts from it, and the evals score against it."""
    if s.cancelled:
        return Step.CLOSE
    if s.overpaid:
        return Step.REFUND
    if s.delta_sign >= 0 or s.plan_changed:  # on a plan change, wait for tonight's rebalance rather than mail a stale amount
        return Step.CLOSE
    if s.days_overdue >= 21:
        return Step.HAND_TO_SALES
    if s.link_expired:
        return Step.SEND_LINK
    return Step.SEND_REMINDER if s.days_since_mail >= 1 else Step.CLOSE`,
        },
        {
          kind: "step",
          id: "agents25-s4",
          title: "Write the prompts",
          text: "The decide prompt lists the five steps and the signals as JSON. The draft prompt names the four placeholders it may use. Neither prompt holds an amount or a name, because the signals don't.",
          lang: "python",
          file: "src/paydesk/policy.py",
          code: `def decide_prompt(signals: dict) -> str:
    steps = ", ".join(Step)
    return f"You are the Meridian Tours payments desk. Reply with one step from: {steps}.\\nSignals: {json.dumps(signals)}"


def draft_prompt(kind: Step, signals: dict) -> str:
    return (f"Write a short customer email for the step {kind}. Use only the placeholders "
            f"{{name}}, {{amount}}, {{link}} and {{due_date}}.\\nSignals: {json.dumps(signals)}")`,
        },
        {
          kind: "step",
          id: "agents25-s5",
          title: "Write the scripted policy",
          text: "`decide` takes the reference step and, on a seeded share of calls, returns a different one. The seed includes an attempt number, so a second attempt draws a fresh slip. The act node's redraft, later in this chapter, relies on that. `draft` slips in the two ways a real model does: it drops the link, or it adds a figure of its own.",
          lang: "python",
          file: "src/paydesk/policy.py",
          code: `class ScriptedPolicy:
    def __init__(self, seed: int = 0, error_rate: float = 0.03, mail_error_rate: float = 0.04) -> None:
        self.seed, self.error_rate, self.mail_error_rate = seed, error_rate, mail_error_rate
        self.prompts: list[str] = []  # everything the model would have seen

    def decide(self, signals: dict, key: str, attempt: int = 0) -> Step:
        self.prompts.append(decide_prompt(signals))
        step = reference_step(Signals(**signals))
        rng = random.Random(f"{self.seed}:{key}:{attempt}")
        return rng.choice([s for s in Step if s != step]) if rng.random() < self.error_rate else step

    def draft(self, kind: Step, signals: dict, key: str, attempt: int = 0) -> str:
        self.prompts.append(draft_prompt(kind, signals))
        text = DRAFTS[kind]
        if signals["position"] == "last":
            text += " This is your final instalment."
        rng = random.Random(f"{self.seed}:draft:{key}:{attempt}")
        if rng.random() < self.mail_error_rate:  # the two slips a real model makes
            text = text.replace("{link}", "") if rng.random() < 0.5 else text + " Pay £99.00 now."
        return text`,
        },
        {
          kind: "step",
          id: "agents25-s6",
          title: "Write the live policy",
          text: "`LivePolicy` has the same two methods. `decide` returns the first step name it finds in the reply, and falls back to `hand_to_sales` when it finds none. A reply that names no step is a case for a person. It needs credentials, so the chapter never runs it.",
          lang: "python",
          file: "src/paydesk/policy.py",
          code: `class LivePolicy:
    """Untested without credentials. It sends only the same prompts the scripted model records."""

    def __init__(self) -> None:
        from askpep.config import get_settings
        from askpep.providers import make_chat_model

        self.model = make_chat_model(get_settings(), "triage")
        self.prompts: list[str] = []

    def _ask(self, prompt: str) -> str:
        self.prompts.append(prompt)
        return str(self.model.invoke(prompt).content)

    def decide(self, signals: dict, key: str, attempt: int = 0) -> Step:
        text = self._ask(decide_prompt(signals)).lower()
        return next((s for s in Step if s in text), Step.HAND_TO_SALES)

    def draft(self, kind: Step, signals: dict, key: str, attempt: int = 0) -> str:
        return self._ask(draft_prompt(kind, signals))`,
        },
        {
          kind: "p",
          text: "Notice the fallback in `LivePolicy.decide`. A model that answers in prose doesn't crash the run. It sends the case to sales. Chapter 12 made the same choice. When the model's output isn't in the set, code falls back to a safe default.",
        },
        {
          kind: "quiz",
          id: "agents25-q3",
          question: "Why does the scripted policy seed its slips with the event ID and an attempt number?",
          options: [
            "So the model gets cheaper.",
            "So the same event always slips the same way, and a retry gets a fresh draw, which keeps every run repeatable.",
            "So every event slips once.",
            "So the guard never fires.",
          ],
          answer: 1,
          explain:
            "A repeatable error lets you rerun a failing case and get the same failure. The attempt number gives the retry its own draw, so a retry can succeed where the first try failed.",
        },
        {
          kind: "p",
          text: "The policy answers one call at a time. The next section builds the graph that calls it and saves what it decides.",
        },
      ],
    },
    {
      id: "s4-graph",
      title: "The graph saves its state after every node, and that state is what a handoff passes",
      goal: "What does one run carry from node to node, and what survives a crash?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 18 said a handoff passes the task ID and the shared state. Here the task ID is the instalment ID, such as `IT0005-1`. The shared state is one record for that ID. Each node reads it and returns only the keys it changed.",
        },
        {
          kind: "p",
          text: "The graph saves the record to the store after every node. No node keeps anything in memory. If a worker dies, another loads the record by ID and sees which nodes are done. That is the board idea from chapter 19, with one writer at a time.",
        },
        {
          kind: "step",
          id: "agents25-s7",
          title: "Write the imports, the node list and the state",
          text: "`NODES` fixes the order. `State` lists every key a run can hold. The `done` list records which nodes have finished, so a redelivered event resumes instead of repeating. `ConsumerCrash` stands for a consumer that died. Nothing in this chapter raises it, and PayDesk 4 (chapter 27) uses it to rehearse a crash.",
          lang: "python",
          file: "src/paydesk/graph.py",
          code: `"""The run for one instalment ID: calculate, decide, guard, act, close. Code routes, the model only picks a step."""

from dataclasses import asdict, dataclass, field
from typing import Callable, TypedDict

from paydesk.calculate import Signals, calculate
from paydesk.clock import Clock
from paydesk.mailer import Mailer
from paydesk.models import TERMINAL, Status, Step, money
from paydesk.policy import reference_step
from paydesk.provider import Provider
from paydesk.store import Store
from paydesk.topic import Topic

try:
    from langgraph.graph import END, START, StateGraph

    USES_LANGGRAPH = True
except ImportError:  # the same nodes run in a plain loop
    USES_LANGGRAPH = False

NODES = ["calculate", "decide", "guard", "act", "close"]


class ConsumerCrash(Exception):
    """The consumer process died. Whatever was saved so far is all that survives."""


class State(TypedDict, total=False):
    event_id: str
    iid: str
    itinerary_id: str
    day: int
    status: str
    done: list[str]  # nodes already finished, so a redelivered event resumes instead of repeating
    signals: dict
    amount_due: int
    proposed: str
    step: str
    blocked: int
    reason: str
    actions: list[str]`,
        },
        {
          kind: "step",
          id: "agents25-s8",
          title: "Write the desk",
          text: "`Desk` bundles the store, the provider, the mailer, the topic, the clock and the policy, so a node needs only the desk and the state. Its `guard` and `mail_check` fields hold functions. `trust_model` is a placeholder guard that takes the model's first pick, and PayDesk 3 replaces it with the real guard. `no_mail_check` is a placeholder that passes every mail, and PayDesk 3 replaces it with the real mail check. The crash fields and `force_closed` wait for PayDesk 4.",
          lang: "python",
          file: "src/paydesk/graph.py",
          code: `def trust_model(policy, signals: dict, key: str) -> tuple[Step, Step, int]:
    """The default guard: no check. The model's first choice is the final step, and nothing is blocked."""
    step = policy.decide(signals, key, 0)
    return step, step, 0


def no_mail_check(text: str, values: dict, first: bool = True) -> list[str]:
    """The default mail check: no problems found, so every mail goes."""
    return []


@dataclass
class Desk:
    store: Store
    provider: Provider
    mailer: Mailer
    topic: Topic
    clock: Clock
    policy: object
    crash_point: str | None = None
    crashed: bool = False
    decisions: list[dict] = field(default_factory=list)
    force_closed: int = 0
    graph: object = None
    guard: Callable = trust_model  # PayDesk 3 plugs in the real guard
    mail_check: Callable = no_mail_check  # PayDesk 3 plugs in the mail check

    def maybe_crash(self, point: str) -> None:
        if self.crash_point == point and not self.crashed:
            self.crashed = True
            raise ConsumerCrash(point)`,
        },
        {
          kind: "p",
          text: "The desk calls its guard between deciding and acting. With `trust_model`, the model's pick goes straight to the act node. With `no_mail_check`, every filled mail goes. This chapter runs unguarded on purpose, so you can see what a guard will have to stop.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Where the guard sits",
          text: "The guard node is where chapter 23's action guard goes, between decide and act. It takes the model's proposal and the signals, and returns the final step and a count of blocks. The model proposes, and code decides whether to go ahead. In this chapter the node only passes the proposal on.",
        },
        {
          kind: "step",
          id: "agents25-s9",
          title: "Write the calculate, decide and guard nodes",
          text: "Each node takes the desk and the state, and returns only what it changed. `calculate_node` calls chapter 24's `calculate`, passing the last mail day from the mailer and the link check from the provider. `decide_node` asks the policy once. `guard_node` asks again through `d.guard`. It appends one row to `decisions`, which PayDesk 3's evals read.",
          lang: "python",
          file: "src/paydesk/graph.py",
          code: `# --- nodes: each takes the state and returns only what it changed ---

def calculate_node(d: Desk, s: State) -> dict:
    signals, due = calculate(d.store, s["iid"], d.clock.now, d.mailer.last_mail_day(s["iid"]), d.provider.link_valid(s["iid"], d.clock.now))
    return {"signals": asdict(signals), "amount_due": due, "status": Status.CALCULATED}


def decide_node(d: Desk, s: State) -> dict:
    return {"proposed": d.policy.decide(s["signals"], s["event_id"], 0)}


def guard_node(d: Desk, s: State) -> dict:
    # Re-asks rather than looping back: the retry has its own key, so a redelivered event decides the same way.
    proposed, step, blocked = d.guard(d.policy, s["signals"], s["event_id"])
    d.decisions.append({"event_id": s["event_id"], "itinerary_id": s["itinerary_id"], "signals": s["signals"],
                        "proposed": proposed, "final": step, "blocked": blocked,
                        "reference": reference_step(Signals(**s["signals"]))})
    return {"step": step, "blocked": blocked}`,
        },
        {
          kind: "step",
          id: "agents25-s10",
          title: "Write the act node",
          text: "`act_node` is the only node that touches the provider or the mailer. For a mail it creates the link, saves `link_generated`, then drafts, fills and sends. The link key and the mail key are both built from the event ID, so a redelivered event reuses them. If `d.mail_check` finds a problem, the model redrafts once, and then the case goes to sales. A reminder with no link to resend returns early, so an unguarded model can't crash the run.",
          lang: "python",
          file: "src/paydesk/graph.py",
          code: `def act_node(d: Desk, s: State) -> dict:
    step, iid, now = Step(s["step"]), s["iid"], d.clock.now
    key = f"{s['event_id']}"
    if step is Step.REFUND:
        d.provider.refund_overpayment(s["itinerary_id"], now)
    elif step is Step.HAND_TO_SALES:
        d.store.hand_to_sales(iid, s["itinerary_id"], "guard" if s["blocked"] else "policy", now)
        return {"status": Status.HANDED, "actions": s["actions"] + [step]}
    elif step in (Step.SEND_LINK, Step.SEND_REMINDER):
        link = d.provider.create_link(f"link:{key}", iid, now) if step is Step.SEND_LINK else d.provider.latest.get(iid)
        if link is None:  # an unguarded model asked for a reminder before any link existed: nothing to send
            return {"actions": s["actions"] + [step]}
        d.store.save_run({**s, "status": Status.LINK_GENERATED}, now)
        d.maybe_crash("link")  # worst place to die: the link exists and the mail does not
        values = {"name": d.store.itinerary(s["itinerary_id"]).name, "amount": money(s["amount_due"]),
                  "link": link.url, "due_date": f"day {d.store.instalment(iid).due_day}"}
        for attempt in (0, 1):  # one redraft, then the case goes to sales
            body = d.mailer.fill(d.policy.draft(step, s["signals"], key, attempt), values)
            if not d.mail_check(body, values, first=attempt == 0):
                d.mailer.send(f"mail:{key}", iid, step, s["day"], body)
                return {"status": Status.EMAIL_SENT, "actions": s["actions"] + [step]}
        d.store.hand_to_sales(iid, s["itinerary_id"], "mail_check", now)
        return {"status": Status.HANDED, "actions": s["actions"] + [step]}
    return {"actions": s["actions"] + [step]}`,
        },
        {
          kind: "p",
          text: "The act node saves twice. It saves `link_generated` once the link exists, then returns `email_sent` after the send. The `maybe_crash` call between them marks the worst place to die: the link exists and the mail doesn't. PayDesk 4 crashes the consumer there on purpose.",
        },
        {
          kind: "step",
          id: "agents25-s11",
          title: "Write the close node and the node table",
          text: "`close_node` keeps `handed_to_sales` and turns everything else into `closed`. `FUNCS` maps each name to its function.",
          lang: "python",
          file: "src/paydesk/graph.py",
          code: `def close_node(d: Desk, s: State) -> dict:
    return {"status": s["status"] if s["status"] == Status.HANDED else Status.CLOSED}


FUNCS = {"calculate": calculate_node, "decide": decide_node, "guard": guard_node, "act": act_node, "close": close_node}`,
        },
        {
          kind: "step",
          id: "agents25-s12",
          title: "Wrap each node, and build the graph",
          text: "`_wrap` is the whole persistence story. It skips a node already in `done`, runs the node, adds it to `done`, saves the record, and only then checks for a crash. `build` wires the five wrapped nodes into a LangGraph chain. Without LangGraph, `_Chain` runs the same nodes in a plain loop.",
          lang: "python",
          file: "src/paydesk/graph.py",
          code: `def _wrap(d: Desk, name: str):
    def run(s: State) -> dict:
        if name in s["done"]:
            return {}
        update = FUNCS[name](d, s)
        update["done"] = s["done"] + [name]
        d.store.save_run({**s, **update}, d.clock.now)  # saved after every node
        d.maybe_crash(name)
        return update

    return run


class _Chain:
    def __init__(self, d: Desk) -> None:
        self.nodes = [_wrap(d, n) for n in NODES]

    def invoke(self, s: State) -> State:
        for node in self.nodes:
            s = {**s, **node(s)}
        return s


def build(d: Desk):
    if not USES_LANGGRAPH:
        return _Chain(d)
    g = StateGraph(State)
    for n in NODES:
        g.add_node(n, _wrap(d, n))
    g.add_edge(START, NODES[0])
    for a, b in zip(NODES, NODES[1:]):
        g.add_edge(a, b)
    g.add_edge(NODES[-1], END)
    return g.compile()`,
        },
        {
          kind: "step",
          id: "agents25-s13",
          title: "Write the runner for one event",
          text: "`run_event` loads the saved record for the instalment. A record for the same event that has finished is returned as it is, because only the commit was lost. A record for the same event that hasn't finished is resumed. Anything else starts a fresh run.",
          lang: "python",
          file: "src/paydesk/graph.py",
          code: `def run_event(d: Desk, event: dict) -> State:
    """Run one payment_due event. A redelivered event finds its saved state and carries on from there."""
    d.graph = d.graph or build(d)
    prev = d.store.load_run(event["iid"])
    if prev and prev["event_id"] == event["event_id"]:
        if prev["status"] in TERMINAL:
            return prev  # already finished, and only the commit was lost
        state = prev
    else:
        inst = d.store.instalment(event["iid"])
        state = State(event_id=event["event_id"], iid=event["iid"], itinerary_id=inst.itinerary_id, day=event["day"],
                      status=Status.INITIALIZED, done=[], actions=[], blocked=0)
        d.store.start_run(state, d.clock.now)
    return d.graph.invoke(state)`,
        },
        {
          kind: "p",
          text: "Interviewers often ask what a handoff actually carries. The answer is short, and the run you just wrote is the evidence.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "What a handoff passes",
          text: "Say it plainly. A handoff passes the instalment ID and the shared state. The state is one saved record that moves through the statuses initialized, calculated, link_generated, email_sent and closed. It carries no chat history, so any worker can load it by ID and carry on.",
        },
        {
          kind: "quiz",
          id: "agents25-q4",
          question: "The consumer dies after the `act` node and before `close`. A new consumer gets the same event. What does `run_event` do?",
          options: [
            "Loads the saved record, sees the nodes in `done`, and runs only `close`.",
            "Starts again from calculate and mails a second time.",
            "Drops the event.",
            "Asks the model what to do.",
          ],
          answer: 0,
          explain:
            "The record for that event exists and is not terminal. So run_event resumes it. _wrap skips every node already listed in done, so the mail is not sent again.",
        },
        {
          kind: "p",
          text: "The graph runs one event. The next section builds the topic and the schedules that put events there.",
        },
      ],
    },
    {
      id: "s5-queue",
      title: "A topic and two schedules turn each morning's due dates into one event per instalment",
      goal: "How does a due date become an event, and why do the consumers pull?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 20 showed back-office agents that wake on a schedule and pull work from a topic. PayDesk works the same way. At 09:00 the **due job** puts one `payment_due` event on the topic for each instalment due that day. The **overdue job** does the same for past-due instalments, with `payment_overdue`.",
        },
        {
          kind: "p",
          text: "The topic is a log. Each event has an offset, a key and a value. A consumer group tracks two offsets: the next one it will read, and the one it has committed. The code below runs in memory, but it keeps the behaviour that matters.",
        },
        {
          kind: "step",
          id: "agents25-s14",
          title: "Write the topic",
          text: "`publish` appends an event. `poll` hands a group its next event, and moves only the group's read position. `commit` records that an event is done. `rejoin` models a consumer that came back: everything after the last commit is delivered again.",
          lang: "python",
          file: "src/paydesk/topic.py",
          code: `"""An in-process topic with consumer groups. Consumers pull, and the offset only moves on commit."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Record:
    offset: int
    key: str
    value: dict


class Topic:
    def __init__(self) -> None:
        self.log: list[Record] = []
        self.committed: dict[str, int] = {}  # group -> next offset to read after a restart
        self.position: dict[str, int] = {}  # group -> next offset to hand out
        self.redelivered = 0

    def publish(self, key: str, value: dict) -> int:
        self.log.append(Record(len(self.log), key, value))
        return len(self.log) - 1

    def poll(self, group: str, max_records: int = 1) -> list[Record]:
        start = self.position.get(group, self.committed.get(group, 0))
        batch = self.log[start : start + max_records]
        self.position[group] = start + len(batch)
        return batch

    def commit(self, group: str, offset: int) -> None:
        self.committed[group] = max(self.committed.get(group, 0), offset + 1)

    def rejoin(self, group: str) -> None:
        """A consumer came back after dying. Everything after the last commit is delivered again."""
        back = self.committed.get(group, 0)
        self.redelivered += self.position.get(group, 0) - back
        self.position[group] = back`,
        },
        {
          kind: "p",
          text: "Read `poll` and `commit` together. Polling doesn't move the committed offset. Only a commit does. So a consumer that dies after the poll and before the commit gets that event again. That is at-least-once delivery from chapter 20, and it is why the graph must be safe to repeat.",
        },
        {
          kind: "p",
          text: "Why a topic at all is a common interview question. The answer has two reasons.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Why a topic",
          text: "Two reasons. The platform already runs topics, so the desk adds one topic and no new system. And a schedule makes a burst: at 09:00 every instalment due that day appears together. A topic lets a few consumers drain it at their own pace, and a restart loses nothing.",
        },
        {
          kind: "step",
          id: "agents25-s15",
          title: "Write the event and the two morning jobs",
          text: "`event` builds the value. Its ID joins the kind, the instalment and the day, so the same instalment on the same day always gets the same event ID. The act node builds its link and mail keys from it. `_active` skips cancelled itineraries and those already with sales. Each job publishes with the instalment ID as the key.",
          lang: "python",
          file: "src/paydesk/jobs.py",
          code: `"""The schedules, and the consumer that drains the topic."""

from typing import Callable

from paydesk.calculate import first_unpaid
from paydesk.graph import ConsumerCrash, Desk, run_event
from paydesk.rebalance import rebalance

GROUP = "payments"


def event(kind: str, iid: str, day: int) -> dict:
    return {"kind": kind, "iid": iid, "day": day, "event_id": f"{kind}:{iid}:{day}"}


def _active(d: Desk):
    for it in d.store.itineraries():
        if not it.cancelled and not d.store.in_sales(it.id):
            yield it, first_unpaid(d.store, it.id)


def due_job(d: Desk, day: int) -> None:
    """09:00. One event for each instalment that falls due today."""
    for _, inst in _active(d):
        if inst and inst.due_day == day:
            d.topic.publish(inst.id, event("payment_due", inst.id, day))


def overdue_job(d: Desk, day: int) -> None:
    """09:00. One reminder event a day for the earliest unpaid instalment that is past due, until it is paid."""
    for _, inst in _active(d):
        if inst and inst.due_day < day:
            d.topic.publish(inst.id, event("payment_overdue", inst.id, day))`,
        },
        {
          kind: "p",
          text: "Only the earliest unpaid instalment gets an event. Three overdue instalments don't produce three mails a day. The customer gets one reminder, for the one that is next to be paid.",
        },
        {
          kind: "step",
          id: "agents25-s16",
          title: "Write the midnight reconciliation job",
          text: "At 00:00 it visits each live itinerary. It refunds any overpayment. If the instalment amounts no longer add up to the value, it rebalances the unpaid ones in their original proportions. It then runs any extra sweeps it is given. The `sweeps` argument is a hook. This chapter passes nothing, and PayDesk 4 passes the recovery sweeps here.",
          lang: "python",
          file: "src/paydesk/jobs.py",
          code: `def reconcile_job(d: Desk, day: int, sweeps: tuple[Callable[[Desk, int], dict], ...] = ()) -> dict:
    """00:00. Refund overpayments and rebalance after a value change, then run any extra sweeps."""
    done = {"refunds": 0, "rebalanced": 0}
    for it in d.store.itineraries():
        if it.cancelled:
            continue
        done["refunds"] += d.provider.refund_overpayment(it.id, d.clock.now) > 0
        amounts = [p.amount for p in d.store.instalments(it.id)]
        if sum(amounts) != it.value:
            d.store.set_amounts(it.id, rebalance(amounts, d.store.net_received(it.id), it.value))
            done["rebalanced"] += 1
    for sweep in sweeps:  # PayDesk 4 passes the recovery sweep here
        done.update(sweep(d, day))
    return done`,
        },
        {
          kind: "p",
          text: "The two midnight tasks catch what the morning flow can't. A customer who overpays at 17:00 has no due event, so nothing else would refund them. An add-on changes the value, and the instalments must be rebalanced before the next mail. The refund key carries the amount, so running the job twice refunds once.",
        },
        {
          kind: "step",
          id: "agents25-s17",
          title: "Write the consumer loop",
          text: "`drain` pulls one event, runs the graph and commits. A crash skips the commit, so the event comes back after `rejoin`. The `sweep` argument is a second hook: a function that runs after every event and does nothing by default. PayDesk 4 passes the recovery sweeps here too.",
          lang: "python",
          file: "src/paydesk/jobs.py",
          code: `def drain(d: Desk, restart_after: int = 1, sweep: Callable[[Desk], object] = lambda d: 0) -> None:
    """The consumer loop: pull, run, commit. A crash skips the commit, so the event comes back.

    \`sweep\` runs on its own timer, whatever the consumer is doing. PayDesk 4 passes the force-close sweep."""
    while records := d.topic.poll(GROUP):
        rec = records[0]
        try:
            run_event(d, rec.value)
            d.topic.commit(GROUP, rec.offset)
        except ConsumerCrash:
            d.clock.advance(restart_after)
            sweep(d)
            d.topic.rejoin(GROUP)
        d.clock.advance(1)
        sweep(d)`,
        },
        {
          kind: "p",
          text: "Consumers pull. A consumer asks the topic for its next event when it's ready. The topic never pushes an event at a busy consumer. A slow consumer just reads less often, and the log holds the rest.",
        },
        {
          kind: "compare",
          caption: "Pull versus push is a different axis from point-to-point versus publish-subscribe",
          columns: ["Design", "Who moves the message", "How many receivers get it", "Example"],
          rows: [
            ["Consumer group on a log topic", "The consumer pulls", "One in the group, and every group gets its own copy", "PayDesk: the payments group pulls each event once, and another group could read the same topic"],
            ["Job runner with idle workers", "The runner pushes to a free worker", "One worker", "A build server that sends each job to the next idle machine"],
            ["Webhook to every subscriber", "The sender pushes", "All subscribers", "An event that posts to three services at once"],
            ["Polling a shared inbox", "The reader pulls", "One reader per message", "A script that checks a mailbox every minute"],
          ],
        },
        {
          kind: "p",
          text: "Interviewers often blur these two axes, so keep them apart. Pull and push say who moves the message. Point-to-point and publish-subscribe say how many receivers get it. A consumer group is point-to-point inside the group and publish-subscribe across groups. It pulls in both cases.",
        },
        {
          kind: "fold",
          tone: "dyk",
          title: "Pull gives back-pressure for free",
          text: "A pushed message arrives whether or not the consumer has room. A pulled message is read when the consumer is ready, so a burst waits in the log and no consumer is overrun. The cost is a little delay and a read loop that must keep running.",
        },
        {
          kind: "quiz",
          id: "agents25-q5",
          question: "A consumer polls an event, runs the graph, and dies before the commit. What happens after it rejoins?",
          options: [
            "The event is lost.",
            "The topic pushes it to another group.",
            "The event waits until midnight.",
            "The event is delivered again, because the committed offset did not move, and the saved state stops it being repeated.",
          ],
          answer: 3,
          explain:
            "Only a commit moves the committed offset. rejoin resets the read position to it, so the event is delivered again. The saved record and the idempotency keys stop the second run mailing or refunding twice.",
        },
        {
          kind: "p",
          text: "Every file is now written. The next section runs one instalment through them, then two months of mornings.",
        },
      ],
    },
    {
      id: "s6-run",
      title: "One instalment runs in six saves, and two months show the burst a schedule makes",
      goal: "What does one run look like from the inside, and how big is a 09:00 burst?",
      blocks: [
        {
          kind: "p",
          text: "The last file is a demo. `walk` runs one event on day 1 and prints every save. `burst` runs days 0 to 60 and counts the events each 09:00 puts on the topic. Both run offline with the scripted policy and seed 7.",
        },
        {
          kind: "step",
          id: "agents25-s18",
          title: "Write the walk",
          text: "Create `walk.py`. `new_desk` builds a desk on seed 7 with the scripted policy, which makes no mistakes unless you pass an error rate. The desk has no guard and no recovery sweep. `walk` prints each save by wrapping `save_run`. `burst` runs the jobs and the consumer for every day.",
          lang: "python",
          file: "src/paydesk/walk.py",
          code: `"""Walk one instalment through the graph, then run 60 days and look at the burst each 09:00 makes."""

from collections import Counter

from paydesk import data, jobs
from paydesk.clock import Clock
from paydesk.graph import Desk, run_event
from paydesk.mailer import Mailer
from paydesk.policy import ScriptedPolicy
from paydesk.provider import Provider
from paydesk.store import Store
from paydesk.topic import Topic


def new_desk(error_rate: float = 0.0) -> tuple[Desk, list[data.Case]]:
    store = Store()
    desk = Desk(store, Provider(store), Mailer(), Topic(), Clock(), ScriptedPolicy(7, error_rate))
    cases = data.generate(7, 200)
    data.load(store, cases)
    return desk, cases


def walk(day: int = 1) -> None:
    desk, _ = new_desk()
    store = desk.store
    desk.clock.at(day, 9)
    jobs.due_job(desk, day)
    print(f"09:00 due job: {len(desk.topic.log)} events on the topic, first {desk.topic.log[0].key}")
    save = store.save_run
    store.save_run = lambda s, now: (print(f"  saved {s['status']:<15} done={s['done']}"), save(s, now))[1]
    rec = desk.topic.poll(jobs.GROUP)[0]
    print(f"consumer pulled offset {rec.offset}: {rec.value['event_id']}")
    end = run_event(desk, rec.value)
    desk.topic.commit(jobs.GROUP, rec.offset)
    print(f"committed offset {rec.offset}, next read starts at {desk.topic.committed[jobs.GROUP]}")
    print(f"signals {end['signals']}")
    print(f"model proposed {end['proposed']}, final step {end['step']}, actions {[str(a) for a in end['actions']]}")
    print(f"mail: {desk.mailer.outbox[0].body}")


def burst(days: int = 2 * 30) -> None:
    desk, cases = new_desk()
    per_day, totals = Counter(), Counter()
    for day in range(days + 1):
        desk.clock.at(day, 0)
        totals.update(jobs.reconcile_job(desk, day))
        jobs.drain(desk)
        desk.clock.at(day, 8)
        data.sales_actions(desk.store, cases, day)
        desk.clock.at(day, 9)
        before = len(desk.topic.log)
        jobs.due_job(desk, day)
        jobs.overdue_job(desk, day)
        per_day[day] = len(desk.topic.log) - before
        jobs.drain(desk)
        desk.clock.at(day, 17)
        data.customer_payments(desk.store, cases, day, desk.clock.now)
    peak = max(per_day, key=per_day.get)
    print(f"{len(desk.topic.log)} events, {sum(1 for n in per_day.values() if n)} days with any")
    print(f"busiest 09:00 was day {peak} with {per_day[peak]} events, the quietest busy day had {min(n for n in per_day.values() if n)}")
    print(f"midnight jobs: {totals['refunds']} refunds, {totals['rebalanced']} rebalances")


if __name__ == "__main__":
    walk()
    print()
    burst()
`,
        },
        {
          kind: "step",
          id: "agents25-s19",
          title: "Run the walk and read the saves",
          text: "Read the saves in order. The first three nodes each save `calculated`. The act node saves twice. Close saves `closed`, and the commit comes last. Then read the burst. Events arrive on 56 of the 61 days, and the busiest 09:00 puts 69 on the topic. This desk has no guard, no mail check and no recovery, and its model makes no mistakes.",
          lang: "bash",
          code: "uv run --offline python -m paydesk.walk",
          expect: `09:00 due job: 22 events on the topic, first IT0005-1
consumer pulled offset 0: payment_due:IT0005-1:1
  saved calculated      done=['calculate']
  saved calculated      done=['calculate', 'decide']
  saved calculated      done=['calculate', 'decide', 'guard']
  saved link_generated  done=['calculate', 'decide', 'guard']
  saved email_sent      done=['calculate', 'decide', 'guard', 'act']
  saved closed          done=['calculate', 'decide', 'guard', 'act', 'close']
committed offset 0, next read starts at 1
signals {'delta_sign': -1, 'overpaid': False, 'link_expired': True, 'days_since_mail': 99, 'plan_changed': False, 'position': 'first', 'days_overdue': 0, 'cancelled': False}
model proposed send_link, final step send_link, actions ['send_link']
mail: Dear Isla Okafor, your next Meridian Tours instalment of £560.00 is due on day 1. Pay here: https://pay.meridian.example/28a5f763. The link works for 28 hours.

1656 events, 56 days with any
busiest 09:00 was day 12 with 69 events, the quietest busy day had 1
midnight jobs: 12 refunds, 14 rebalances`,
        },
        {
          kind: "p",
          text: "Day 1 has 22 events, and the consumer takes the first. The six saves show the state moving through its statuses. The signals line is all the model saw. The mail line is what code built from them.",
        },
        {
          kind: "p",
          text: "The burst lines show why the desk sits on a topic. The quietest busy morning brings one event, and day 12 brings 69. The consumers drain either at their own pace.",
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "Import errors until the last file lands",
          text: "Nothing runs until every file in this chapter is in place. If Python reports `ModuleNotFoundError`, a file is missing or misnamed. Check `provider.py`, `mailer.py`, `topic.py`, `policy.py`, `graph.py`, `jobs.py` and `walk.py` in `src/paydesk/`.",
        },
        {
          kind: "p",
          text: "The walk ran cleanly, but only because the scripted model made no slips. The last section puts the design into words.",
        },
      ],
    },
    {
      id: "s7-interview",
      title: "In an interview, name the pattern first and then say what each part is for",
      goal: "How do you describe this desk in 30 seconds?",
      blocks: [
        {
          kind: "p",
          text: "Interviewers often ask for this design in brief before they probe it. Lead with the pattern, then the handoff, then the topic. Give each one sentence and a reason.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "The 30-second answer",
          text: "It's a deterministic workflow. Code routes through five nodes. The model picks one step from a fixed set, given signals and no amounts, and code checks the pick. A handoff passes the instalment ID and one shared state. A 09:00 schedule puts one event per instalment on a topic the platform already runs. Consumers pull, process and commit, and every outside call carries an idempotency key.",
        },
        {
          kind: "p",
          text: "Expect one follow-up on pull and push. Keep the two axes apart. Who moves the message is one question. How many receivers get it is another.",
        },
        {
          kind: "p",
          text: "This desk runs unguarded, and its model never slipped. A real model will. That raises the next question. How do I know this desk is safe enough to move money? PayDesk 3 (chapter 26) answers it.",
        },
      ],
    },
  ],
  lab: {
    title: "Change the desk and watch the saves",
    goal: "Run the walk, then change it three ways and read what each change tells you. Every step runs offline against your own files, from `src`. Compare them with `capstone/src/paydesk/` in the my-learn folder.",
    minutes: 25,
    files: [
      "src/paydesk/provider.py",
      "src/paydesk/mailer.py",
      "src/paydesk/topic.py",
      "src/paydesk/policy.py",
      "src/paydesk/graph.py",
      "src/paydesk/jobs.py",
      "src/paydesk/walk.py",
    ],
    steps: [
      {
        title: "Run it unchanged",
        text: "Run the walk and compare every line with the output in the chapter. The statuses and the 69 must match.",
        code: "uv run --offline python -m paydesk.walk",
      },
      {
        title: "Make the model always wrong",
        text: "In `walk`, change `new_desk()` to `new_desk(1.0)`. Predict what runs, then run it. The model proposes `refund` for a customer who still owes money, and with no guard the desk acts on it. The provider finds nothing to refund, so no money moves. No mail goes either, so `outbox[0]` raises `IndexError`. PayDesk 3 adds the guard that stops this. Then restore the call.",
        code: "uv run --offline python -m paydesk.walk",
      },
      {
        title: "Poll without committing",
        text: "In `walk`, directly after the line that polls, add `print(desk.topic.poll(jobs.GROUP)[0].offset)`. Predict the number. It is 1, because poll moves the read position and not the commit. Then add `desk.topic.rejoin(jobs.GROUP)` and print a second poll the same way. The offset goes back to 0. That is a redelivery. Remove the lines.",
        code: "uv run --offline python -m paydesk.walk",
      },
      {
        title: "Move the day",
        text: "This command walks day 12 instead of day 1, then runs the burst. Predict the due job's count first. It publishes 14 events, and the burst line still says 69 on day 12. The gap has two causes. `walk` runs only the due job, while the burst adds the overdue reminders. `walk` also starts from a fresh store where nobody has paid, so only first instalments can fall due.",
        code: "uv run --offline python -c 'from paydesk import walk; walk.walk(day=12); print(); walk.burst()'",
      },
    ],
    verify: "uv run --offline python -m paydesk.walk",
  },
  recap: [
    "PayDesk is a deterministic workflow: five nodes in a fixed order, and the model picks one step from five.",
    "The model sees signals and never an amount or a name. Code fills the amounts into the mail afterwards.",
    "Every provider and mailer call carries an idempotency key, so a repeated event can't mail or refund twice.",
    "A handoff passes the instalment ID and one shared state, saved after every node.",
    "The guard sits between decide and act. Here it passes the proposal on, and PayDesk 3 builds the real guard and mail check.",
    "A schedule makes a burst, and the desk reuses the topics the platform already runs.",
    "Consumers pull, process and commit. Pull versus push is a different axis from point-to-point versus publish-subscribe.",
    "A midnight job refunds overpayments and rebalances after an add-on.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In the PayDesk graph I learned that code routes through five nodes and the model only picks one step from a fixed set, that a handoff passes the instalment ID and a saved shared state, and that consumers pull from a topic the platform already runs. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["agents-c25-q01", "agents-c25-q02", "agents-c25-q03", "agents-c25-q04"],
};

export default chapter;
