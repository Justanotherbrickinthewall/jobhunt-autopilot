import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "agents-27-capstone-recovery",
  course: "agents",
  number: 27,
  title: "PayDesk 4: keys, a force-close and a nightly sweep let the desk survive a crash",
  tagline: "What happens to a payment when a consumer crashes halfway, and how does the desk recover?",
  minutes: 75,
  objectives: [
    "Name the three ways a payment breaks when a consumer dies, and the safeguard for each.",
    "Show with `--crash` that chapter 25's keys stop a redelivered event from linking or mailing twice.",
    "Write the 5-minute force-close, and explain why it hands a stuck run to a person.",
    "Write the nightly recovery sweep, and explain why it starts from fresh signals.",
    "Wire both into chapter 26's driver, and read a run where the force-close and the sweep both fire.",
    "Map each PayDesk piece to the service that runs it in production.",
    "Name the four gaps the reference leaves, so you don't overclaim.",
    "Tell the whole PayDesk story in 60 seconds, using the seven interview points.",
  ],
  sections: [
    {
      id: "s1-breaks",
      title: "Three things break in production, and each one needs a different safeguard",
      goal: "What can go wrong when a consumer dies halfway through a payment?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 26 ended on a question. What happens when a consumer crashes halfway through a payment? Every run so far finished, and production doesn't promise that. This chapter, PayDesk 4, adds the code for a run that stops and plugs it into the desk. It ends with the deployment and the whole story in 60 seconds.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "A consumer crashes mid-run. The link exists, the mail doesn't, and the run is stuck at `link_generated`.",
            "An event is redelivered. Chapter 25's topic moves its offset only on commit, so a crash before the commit brings the same event back.",
            "A run hangs. A model call or a database lock never returns, and the instalment waits while the customer hears nothing.",
          ],
        },
        {
          kind: "p",
          text: "The second failure isn't a bug in the topic. A topic that never loses an event must sometimes deliver one twice. That is at-least-once delivery from chapter 20. So the desk makes every effect safe to repeat.",
        },
        {
          kind: "compare",
          caption: "The three failures, the safeguard for each and where it lives",
          columns: ["Failure", "Safeguard", "What it does", "Where it lives"],
          rows: [
            ["A redelivered event repeats an effect", "Idempotency key", "A repeat of the same link, mail or refund returns the first result and changes nothing", "`provider.py` and `mailer.py`, chapter 25"],
            ["A run hangs or a consumer stays dead", "5-minute force-close", "A run open for more than 5 simulated minutes goes to the sales queue with the reason timeout", "`recovery.py`, this chapter"],
            ["A run never closed, or sales holds a case that has since changed", "Nightly recovery sweep", "At 00:00 each stuck run is released and runs again, so the graph decides on fresh signals", "`recovery.py`, this chapter"],
          ],
        },
        {
          kind: "quiz",
          id: "agents27-q1",
          question: "The consumer crashes after sending a mail and before it commits the offset. What does the topic do?",
          options: [
            "It drops the event, because the mail went out.",
            "It delivers the event again, because the offset only moves on commit.",
            "It asks the model whether to retry.",
            "It sends the event to sales.",
          ],
          answer: 1,
          explain:
            "The topic can't know the mail went out. It only knows the commit never arrived, so it hands the event out again. That is why the effect, and not the topic, must be safe to repeat.",
        },
        {
          kind: "p",
          text: "The first safeguard is already in your files. The next section crashes the consumer and watches it work.",
        },
      ],
    },
    {
      id: "s2-keys",
      title: "Chapter 25's idempotency keys already make a redelivered event harmless",
      goal: "What do the keys you already wrote do when the consumer crashes?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 25 put chapter 7's idempotency key on every provider and mailer call. The provider and the mailer remember the keys they have seen. The refund key goes into a table that refuses a second row with it. A repeat with a known key returns the first result and changes nothing. Read the three checks again, as the safety net for a crash.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "paydesk/provider.py: the link key is link:<event id>, so a redelivered event asks for the same link",
          code: `    def create_link(self, key: str, iid: str, now: int) -> Link:
        if key in self.links:
            self.dup_blocked += 1
            return self.links[key]
        token = hashlib.sha1(key.encode()).hexdigest()[:8]
        link = Link(f"https://pay.meridian.example/{token}", iid, now + LINK_LIFE)
        self.links[key] = self.latest[iid] = link
        return link`,
        },
        {
          kind: "code",
          lang: "python",
          caption: "paydesk/provider.py: the refund key carries the itinerary and the amount, and the table makes the insert a no-op the second time",
          code: `    def refund_overpayment(self, itinerary_id: str, now: int) -> int:
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
          kind: "code",
          lang: "python",
          caption: "paydesk/mailer.py: the mail key is mail:<event id>, and a repeat is counted and dropped",
          code: `    def send(self, key: str, iid: str, kind: str, day: int, body: str) -> bool:
        if key in self.keys:
            self.dup_blocked += 1
            return False
        self.keys.add(key)
        self.outbox.append(Mail(key, iid, kind, day, body))
        return True`,
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A key comes from the event, never from the clock or a random number",
          text: "A key built from the time or a random ID is new on every retry, so it blocks nothing. `link:payment_due:IT0008-1:1` is built from the event, so the redelivery produces the same key. The key must be a pure function of the work.",
        },
        {
          kind: "p",
          text: "Keys alone aren't enough. A redelivered event would also repeat the calculate and decide nodes. Chapter 25 already stops that. The graph saves its state after every node, so a redelivered event skips the nodes in `done`. Chapter 25 also gave you the crash: `ConsumerCrash`, `maybe_crash` on the desk and `rejoin` on the topic.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "paydesk/jobs.py: the consumer loop from chapter 25. A crash skips the commit, so the event comes back. `sweep` is a hook that does nothing by default",
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
          text: "Your chapter 26 driver already takes `--crash`, which makes the act node die once, after the link and before the mail. Run it twice from `src`, without and with the crash. Leave out `--live`, which needs the course model.",
        },
        {
          kind: "step",
          id: "agents27-s9",
          title: "Run seed 7 with no crash",
          text: "Run two months on seed 7. `head -5` keeps the header, the counts and the outcomes.",
          lang: "bash",
          code: `uv run --offline python -m paydesk.simulate --seed 7 | head -5`,
          expect: `PayDesk, Meridian Tours: two months, 200 itineraries, seed 7, langgraph, scripted model
runs 1508, mails 1467 ({'send_link': 971, 'send_reminder': 496}), links 971, refunds 12, rebalanced 14
sales queue 27, force-closed 0, recovered 0
crash: no, redelivered 0, duplicates blocked: links 0, mails 0
outcomes: cancelled 12, handed_to_sales 15, paid 161, refunded 12`,
        },
        {
          kind: "step",
          id: "agents27-s10",
          title: "Run it again with a crash",
          text: "Add `--crash`. Compare every line with the run above.",
          lang: "bash",
          code: `uv run --offline python -m paydesk.simulate --seed 7 --crash | head -5`,
          expect: `PayDesk, Meridian Tours: two months, 200 itineraries, seed 7, langgraph, scripted model
runs 1508, mails 1467 ({'send_link': 971, 'send_reminder': 496}), links 971, refunds 12, rebalanced 14
sales queue 27, force-closed 0, recovered 0
crash: yes, redelivered 1, duplicates blocked: links 1, mails 0
outcomes: cancelled 12, handed_to_sales 15, paid 161, refunded 12`,
        },
        {
          kind: "p",
          text: "Runs, mails, links, refunds, rebalances, the sales queue and the outcomes are identical. Only the crash line changes. It says `crash: yes, redelivered 1`, and the blocked count shows `links 1`.",
        },
        {
          kind: "p",
          text: "That one blocked link is the proof. The consumer died after creating the link. The event came back, and the act node ran again, because it had never saved as done. It asked for the same link key. The provider returned the first link, counted the repeat and made no second one. The customer got one link and one mail.",
        },
        {
          kind: "widget",
          id: "agents27-crash-replay",
          intro:
            "Move the crash point earlier and later, and switch the keys on and off. Predict the three counts before you read them. Find the crash point where the keys matter and the one where they don't.",
        },
        {
          kind: "p",
          text: "Interviewers ask about this case directly, usually as a double charge or a double mail.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Say at-least-once plus idempotent, never exactly-once",
          text: "An interviewer asks how you stop a customer being charged or mailed twice. Don't say the topic guarantees exactly-once. Say it delivers at least once, and every effect carries a key derived from the event, so a repeat changes nothing.",
        },
        {
          kind: "quiz",
          id: "agents27-q2",
          question: "Which key makes a redelivered refund safe?",
          options: [
            "The time the refund job ran, because it is unique.",
            "A random UUID created inside the refund call.",
            "A key built from the itinerary and the amount, stored in a table with a primary key.",
            "The customer's name.",
          ],
          answer: 2,
          explain:
            "The key must be the same on every retry, and the table must reject a second insert. A time or a random ID is new each time. A name is shared by different refunds.",
        },
        {
          kind: "p",
          text: "The keys worked because the consumer came back within a minute. The next section keeps it down for longer.",
        },
      ],
    },
    {
      id: "s3-force",
      title: "The 5-minute force-close hands a stuck run to sales",
      goal: "What happens to a payment while the consumer stays down, and who takes it over?",
      blocks: [
        {
          kind: "step",
          id: "agents27-s13",
          title: "Keep the consumer down for 10 minutes",
          text: "Run seed 11 with a crash, and keep the dead consumer down for 10 minutes. This is still your chapter 26 driver. The rest of the chapter follows this seed.",
          lang: "bash",
          code: `uv run --offline python -m paydesk.simulate --seed 11 --crash --restart-after 10 | head -5`,
          expect: `PayDesk, Meridian Tours: two months, 200 itineraries, seed 11, langgraph, scripted model
runs 1566, mails 1518 ({'send_link': 972, 'send_reminder': 546}), links 975, refunds 12, rebalanced 20
sales queue 28, force-closed 0, recovered 0
crash: yes, redelivered 1, duplicates blocked: links 1, mails 0
outcomes: cancelled 13, handed_to_sales 13, paid 162, refunded 12`,
        },
        {
          kind: "p",
          text: "The crash line matches seed 7's: one redelivery and one blocked link. The keys did their job again. But for 10 minutes the instalment sat at `link_generated`, and nothing watched it. Here the consumer came back. A consumer stuck on a call that never returns stays away, and the customer hears nothing.",
        },
        {
          kind: "p",
          text: "The second safeguard puts a limit on that wait. A **force-close** moves a run that stays open past `FORCE_CLOSE_AFTER` minutes to the sales queue. PayDesk sets the limit at 5 simulated minutes and records the reason `timeout`. A person takes over from there.",
        },
        {
          kind: "step",
          id: "agents27-s11",
          title: "Write recovery.py",
          text: "Create `src/paydesk/recovery.py`. The first function, `sweep`, is the force-close. It takes its name from the `sweep` hook in `drain`. It finds every run that hasn't closed and compares its age with the limit, on the simulated clock. It hands the old ones to sales and saves them as handed. `recover_stale` is the next section's subject. `sales_queue` lists each instalment with sales and why it landed there.",
          lang: "python",
          file: "src/paydesk/recovery.py",
          code: `"""Safeguards for runs that stop. A run open for more than 5 simulated minutes is force-closed and handed to sales."""

from paydesk.graph import Desk
from paydesk.jobs import event
from paydesk.models import Status

FORCE_CLOSE_AFTER = 5  # minutes


def sweep(d: Desk) -> int:
    closed = 0
    for state, opened_at in d.store.open_runs():
        if d.clock.now - opened_at > FORCE_CLOSE_AFTER:
            d.store.hand_to_sales(state["iid"], state["itinerary_id"], "timeout", d.clock.now)
            d.store.save_run({**state, "status": Status.HANDED, "reason": "timeout"}, d.clock.now)
            closed += 1
    d.force_closed += closed
    return closed


def recover_stale(d: Desk, day: int) -> dict:
    """00:00. Pick up runs that never closed and publish one recover event for each."""
    recovered = 0
    for state in d.store.stale_runs():
        d.store.release(state["iid"])
        d.topic.publish(state["iid"], event("payment_recover", state["iid"], day))
        recovered += 1
    return {"recovered": recovered}


def sales_queue(d: Desk) -> list[tuple[str, str]]:
    """What sales sees: the instalment and why it landed there."""
    return [(r["instalment_id"], r["reason"]) for r in d.store.sales_queue()]`,
        },
        {
          kind: "p",
          text: "Why hand over and not retry? A stuck run may have done half its work. In this run the link already exists. A person with the case in front of them can see that, and a blind retry can't. The force-close ends the wait. It doesn't pretend the run succeeded.",
        },
        {
          kind: "quiz",
          id: "agents27-q3",
          question: "Why does the force-close hand the instalment to sales and not simply rerun it?",
          options: [
            "Rerunning is slower.",
            "The run may have done half its work, so a person should see the case before anything else happens.",
            "The model can't be called twice.",
            "Sales asked for every case.",
          ],
          answer: 1,
          explain:
            "A hung run is in an unknown state. The link may exist and the mail may not. The force-close ends the wait and puts the case where a person can see it. The retry comes later, from the next section's sweep.",
        },
        {
          kind: "p",
          text: "The force-close ends the wait and leaves the case with a person. The next section gets the case moving again on its own.",
        },
      ],
    },
    {
      id: "s4-sweep",
      title: "The nightly recovery sweep takes every stuck run through the graph again",
      goal: "How does a stuck or force-closed run get moving again, and why on fresh signals?",
      blocks: [
        {
          kind: "p",
          text: "The **nightly recovery sweep** is a nightly job that finds stale runs, releases them and puts their events back on the topic. A stale run is one that never closed, or one the force-close handed to sales. In PayDesk the sweep is `recover_stale`, the second function in `recovery.py`. `reconcile_job` runs it at 00:00 through its `sweeps` hook.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "paydesk/store.py: written in chapter 24. A run is stale when its status isn't terminal, or when its sales row has the reason timeout. A case handed over for any other reason is a real decision, and the sweep leaves it alone",
          code: `    def stale_runs(self) -> list[dict]:
        """Runs that never closed, plus runs the 5-minute sweep force-closed."""
        timed_out = {r["instalment_id"] for r in self.sales_queue() if r["reason"] == "timeout"}
        rows = self.q("select state, status from runs").fetchall()
        return [json.loads(r["state"]) for r in rows if r["status"] not in TERMINAL or json.loads(r["state"])["iid"] in timed_out]`,
        },
        {
          kind: "code",
          lang: "python",
          caption: "paydesk/recovery.py: release each stale run and publish it again. The consumer treats the payment_recover event like any other event",
          code: `def recover_stale(d: Desk, day: int) -> dict:
    """00:00. Pick up runs that never closed and publish one recover event for each."""
    recovered = 0
    for state in d.store.stale_runs():
        d.store.release(state["iid"])
        d.topic.publish(state["iid"], event("payment_recover", state["iid"], day))
        recovered += 1
    return {"recovered": recovered}`,
        },
        {
          kind: "p",
          text: "The recovery event has a new event ID, so it isn't a replay of the old run. The graph starts again at calculate and reads today's signals. That is the point. The world has moved since the run stopped, and the decision should follow it.",
        },
        {
          kind: "widget",
          id: "agents27-safeguard-picker",
          intro:
            "Six cases follow. For each one, pick the safeguard that handles it: the key, the force-close or the nightly recovery sweep. Answer before you read the reason, then compare.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Why the sweep releases the sales row before it publishes",
          text: "The sweep frees the sales row first, so the itinerary leaves the sales queue before the recovery event runs. If the row stayed, the due and overdue jobs would skip the itinerary every day, and the case could sit for ever. The recovery event comes next, and its new event ID keeps it out of the old run's key space.",
        },
        {
          kind: "quiz",
          id: "agents27-q4",
          question: "What does the recovery event give the graph that a replay of the old event would not?",
          options: [
            "A faster model.",
            "Fresh signals, because it is a new event that runs calculate again.",
            "More tokens.",
            "A guarantee that the customer paid.",
          ],
          answer: 1,
          explain:
            "A replay of the old event resumes from saved state and repeats old decisions. A new event ID starts the graph again, so calculate reads today's payments and the guard checks today's signals.",
        },
        {
          kind: "p",
          text: "Both functions exist now, and nothing calls them yet. The next section passes them to the driver.",
        },
      ],
    },
    {
      id: "s5-run",
      title: "Five changed lines wire recovery into the driver, and seed 11 shows both safeguards fire",
      goal: "How does recovery plug into chapter 26's driver, and what does the crash look like once it does?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 25 left two hooks for this moment. `reconcile_job` takes a `sweeps` tuple, and `drain` takes a `sweep` function. Chapter 26's driver passes neither, so both do nothing. Wiring recovery in means passing them.",
        },
        {
          kind: "step",
          id: "agents27-s15",
          title: "Wire both sweeps into simulate.py",
          text: "Open the `simulate.py` you wrote in chapter 26. Five lines change. Add `recovery` to the end of the `from paydesk import` line. Pass `(recovery.recover_stale,)` to `reconcile_job`, and `recovery.sweep` to both `drain` calls, as the day loop shows. In `main`, change `desk.store.sales_queue()` to `recovery.sales_queue(desk)` in the sales queue line. `jobs.py` and `graph.py` stay as they are.",
          lang: "python",
          file: "src/paydesk/simulate.py",
          code: `    for day in range(days + 1):
        desk.clock.at(day, 0)
        totals.update(jobs.reconcile_job(desk, day, (recovery.recover_stale,)))
        jobs.drain(desk, restart_after, recovery.sweep)
        desk.clock.at(day, 8)
        data.sales_actions(store, cases, day)
        desk.clock.at(day, 9)
        jobs.due_job(desk, day)
        jobs.overdue_job(desk, day)
        jobs.drain(desk, restart_after, recovery.sweep)`,
        },
        {
          kind: "p",
          text: "`drain` now runs the force-close after every event and after a crash. `reconcile_job` runs the nightly recovery sweep after its refunds and rebalances. Your file now matches the reference `simulate.py`.",
        },
        {
          kind: "step",
          id: "agents27-s12",
          title: "Run seed 11 with a crash and a 10 minute outage again",
          text: "Same command as before. This time the force-close runs while the consumer is down.",
          lang: "bash",
          code: `uv run --offline python -m paydesk.simulate --seed 11 --crash --restart-after 10 | head -5`,
          expect: `PayDesk, Meridian Tours: two months, 200 itineraries, seed 11, langgraph, scripted model
runs 1567, mails 1517 ({'send_link': 971, 'send_reminder': 546}), links 975, refunds 12, rebalanced 20
sales queue 28, force-closed 1, recovered 1
crash: yes, redelivered 1, duplicates blocked: links 0, mails 0
outcomes: cancelled 13, handed_to_sales 13, paid 162, refunded 12`,
        },
        {
          kind: "p",
          text: "Set it beside the earlier run. The sales queue is 28 in both. Force-closed and recovered went from 0 to 1. The blocked link went from 1 to 0, and mails fell from 1518 to 1517. There is one more run, the recovery event's.",
        },
        {
          kind: "p",
          text: "Here is what happened to instalment IT0008-1, the event that crashed. On day 1 at 09:00, the consumer died after creating the link. Ten minutes later, at 09:10, the force-close found a run older than 5 minutes. It handed the run to sales with the reason `timeout`. The mail was never sent.",
        },
        {
          kind: "p",
          text: "When the consumer rejoined, the topic redelivered the event. The saved run was already handed to sales, which is a finished status, so `run_event` returned it untouched. No link was requested, so no duplicate was blocked.",
        },
        {
          kind: "p",
          text: "The customer paid at 17:00 that day anyway. At midnight the nightly recovery sweep released the instalment and published `payment_recover:IT0008-1:2`. The fresh signals showed a delta of zero. The scripted policy still proposed `send_link`. The guard allowed only `close`, so the run closed and no mail went out.",
        },
        {
          kind: "p",
          text: "So the story holds end to end. One run was force-closed and recovered the same night. Sales held it for under 15 hours. Nobody mailed the customer a stale link, and nobody had to remember the case.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Two safeguards fired on one event, and neither knew about the other",
          text: "With the consumer back inside 5 minutes, the key caught the repeat. With a 10 minute outage, the force-close got there first and the key never ran. Each safeguard covers a different gap, so you keep both.",
        },
        {
          kind: "p",
          text: "A run with no stuck instalment doesn't change. Seed 7, with or without `--crash`, prints the same five lines as before the wiring. The code is finished. The next section maps each piece onto a real service.",
        },
      ],
    },
    {
      id: "s6-deploy",
      title: "Deployment is four moving parts, and recovery must run outside the consumers",
      goal: "Where does each part of PayDesk run in production?",
      blocks: [
        {
          kind: "p",
          text: "PayDesk runs on simulated time in one process. In production the same pieces become separate services. There is no new code in this section. It maps each piece you built to the thing that runs it.",
        },
        {
          kind: "p",
          text: "A managed scheduler runs chapter 20's schedules: the 09:00 due and overdue jobs and the 00:00 reconcile job. Each job publishes events and stops. The topic carries them. If the platform already runs one, the desk reuses it, and a managed message queue is the alternative. The 09:00 schedule makes a burst, and the topic absorbs it.",
        },
        {
          kind: "p",
          text: "The consumers are container tasks that run the `drain` loop. You scale them on lag, chapter 20's count of events not yet handled. The database holds every run, every payment and the sales queue, so any consumer can pick up any instalment.",
        },
        {
          kind: "compare",
          caption: "Each PayDesk piece, what runs it in production, and one cloud's names for it",
          columns: ["Piece", "In the lab", "In production", "One cloud's names"],
          rows: [
            ["Scheduler", "`due_job`, `overdue_job` and `reconcile_job`, called by the simulation", "A managed scheduler fires each job at its time, in a UTC zone the team chose", "A managed scheduler such as EventBridge Scheduler"],
            ["Topic", "The in-process `Topic` with consumer groups and commits", "The topic the platform already runs, or a managed message queue, with consumers that pull", "Kafka on the platform, or SQS"],
            ["Consumers", "The `drain` loop", "Container tasks that run the loop, scaled on lag, one consumer per task", "Container tasks on a serverless container service such as ECS on Fargate"],
            ["Database", "SQLite in memory", "Managed Postgres, so state survives a task dying and many consumers share it", "A managed Postgres such as RDS"],
            ["Recovery", "`recovery.sweep` passed to `drain`, and `recover_stale` passed to `reconcile_job`", "Its own small scheduled task, apart from the consumers, so a hung consumer can't hold it", "A second scheduled task on the same scheduler"],
            ["Tracing", "The saved run record and the desk's decision list", "One trace for each instalment run, with a span for each node, the signals and the chosen step", "Any tracing backend that takes spans"],
            ["Evals", "`evals.run_evals` and the release gate", "The same release gate runs in CI on every change to a prompt, a policy or the guard", "A pipeline step that fails the build when the release gate fails"],
          ],
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A hung consumer can't rescue itself",
          text: "In the simulation, `drain` calls the force-close itself, because there is one process. In production the force-close needs its own timer and its own task. If the consumer hangs, a force-close inside it hangs too, and nothing ends the stuck run.",
        },
        {
          kind: "p",
          text: "Tracing and the release gate close the loop. A trace for each run shows which node a stuck instalment reached. The release gate from chapter 26 runs the whole simulation before a change ships. A change that adds an unsafe action or drops a metric below its floor doesn't merge.",
        },
        {
          kind: "fold",
          tone: "industry",
          title: "With a managed message queue the redelivery comes from a timeout, and keys matter just as much",
          text: "A topic redelivers after a crash because the commit never moved. A managed message queue such as SQS hides a message while one consumer works on it. It shows the message again if the consumer doesn't delete it in time. Both deliver at least once. Both need idempotency keys. Consumers pull in both.",
        },
        {
          kind: "quiz",
          id: "agents27-q5",
          question: "Where should the nightly recovery sweep run in production?",
          options: [
            "Inside each consumer, after every event.",
            "As its own scheduled task, separate from the consumers.",
            "Inside the model prompt.",
            "Only when a customer complains.",
          ],
          answer: 1,
          explain:
            "A consumer that hangs can't sweep. A separate task on the scheduler keeps running whatever the consumers do, so it is the one that finds the stuck runs.",
        },
        {
          kind: "p",
          text: "This design still has gaps. The next section names them before an interviewer does.",
        },
      ],
    },
    {
      id: "s7-gaps",
      title: "The reference leaves four gaps that production would close",
      goal: "What doesn't the lab cover, so you don't overclaim in an interview?",
      blocks: [
        {
          kind: "list",
          items: [
            "It crashes once. A poison event that crashes the consumer every time would loop for ever. Production counts attempts and moves the event to chapter 20's dead-letter list after a few.",
            "It has no timeout on a single model or database call. The 5-minute force-close catches the run, and a timeout on each call stops the wait sooner.",
            "SQLite is one writer in one process. Postgres needs a lock or a conditional update, so two consumers can't take the same instalment.",
            "The model is scripted. A real model can choose a different step on a replay, so the chosen step is saved in state and a redelivered event reuses it.",
          ],
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "If sales gets a wave of timeouts, look at the model call first",
          text: "A burst of `timeout` rows right after 09:00 usually means the consumers are too few for the burst, or one call is slow. Read the trace for the node where the runs stopped before you raise the limit. A longer limit hides the cause.",
        },
        {
          kind: "p",
          text: "With the gaps named, you can tell the whole story without overclaiming. The last section puts it in 60 seconds.",
        },
      ],
    },
    {
      id: "s8-interview",
      title: "In an interview, tell the whole system in 60 seconds",
      goal: "How do you describe all of PayDesk in one answer?",
      blocks: [
        {
          kind: "p",
          text: "You have built the whole desk, and interviews ask you to describe it. Give the answer in the order of the flow. These are the seven points, and where you built each one.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "The pattern is a deterministic workflow: code routes, and the model only picks from a fixed set. Chapters 12 and 25.",
            "A handoff passes the instalment ID and the shared state that moves through the statuses. Chapter 25.",
            "There is no free-text-to-SQL step. Calculate is plain code over the store. Chapter 24.",
            "The topic is the one the platform already runs, and the 09:00 schedule makes a burst. Chapter 25.",
            "Consumers pull. Pull versus push is a different axis from point-to-point versus publish-subscribe. Chapters 20 and 25.",
            "Keys block repeats. A run open for more than 5 minutes is force-closed to sales, and a nightly recovery sweep takes stuck runs through again. Chapter 25 and this chapter.",
            "The deployment is a scheduler, the topic, container tasks and a database, with tracing and the release gate in CI. This chapter.",
          ],
        },
        {
          kind: "p",
          text: "The interview question is usually short: walk me through it in a minute. The answer below covers all seven points.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "The 60-second answer",
          text: "PayDesk collects instalments for a travel operator. It's a deterministic workflow: code routes, and the model only picks the next step from a fixed set, which code then checks. A handoff passes the instalment ID and the shared state as it moves through the statuses. There is no free-text-to-SQL. Calculate is plain code over the store, and the model sees signals, never amounts or names. A 09:00 schedule puts one event per instalment on the topic the platform already runs, and that schedule makes a burst. Consumers pull, which is a different question from point-to-point or publish-subscribe. Idempotency keys make a redelivered event harmless. A run open for more than 5 minutes is force-closed to sales, and a nightly sweep runs it again on fresh signals. It deploys as a scheduler, the topic, container tasks and Postgres, with tracing and the release gate in CI.",
        },
        {
          kind: "p",
          text: "Say it aloud twice with a timer. The first draft runs long. Cut the explanation of any one point before you cut a point. The interviewer will pick a point and ask for more, and you have a chapter behind each one.",
        },
        {
          kind: "quiz",
          id: "agents27-q6",
          question: "An interviewer says: \"So the model decides what happens to the money?\" What is the best reply?",
          options: [
            "Yes, it is an agent with tools.",
            "No. The model proposes a step from a fixed set, code checks it against the signals, and anything outside the set goes to sales.",
            "It depends on the prompt.",
            "The topic decides.",
          ],
          answer: 1,
          explain:
            "This is the deterministic workflow from chapter 12. The model never sees an amount, and the guard from chapter 26 blocks any step the signals don't allow. The money moves through code, under keys.",
        },
        {
          kind: "p",
          text: "You can explain PayDesk because you built it. An interview may instead start from a blank whiteboard. How do you explain a design like this when nothing is built yet? Chapter 28 answers it.",
        },
      ],
    },
  ],
  lab: {
    title: "Break the safeguards one at a time and watch what changes",
    goal: "Run PayDesk with a 10 minute outage, then remove each safeguard in turn. Every step runs the simulation offline from your `src` folder. Compare your files with `paydesk/recovery.py` and `paydesk/simulate.py` in the reference. Restore each edit before the next step.",
    minutes: 25,
    files: ["src/paydesk/recovery.py", "src/paydesk/simulate.py"],
    steps: [
      {
        title: "Run the force-close case unchanged",
        text: "Run seed 11 with a crash and a 10 minute outage. You should see `force-closed 1, recovered 1` and `mails 1517`.",
        code: "uv run --offline python -m paydesk.simulate --seed 11 --crash --restart-after 10 | head -5",
      },
      {
        title: "Raise the limit above the outage",
        text: "In `recovery.py`, change `FORCE_CLOSE_AFTER` from 5 to 15 and rerun. Predict the crash line first. The force-close no longer fires, so the redelivered event resumes and the key blocks the repeated link. Expect `force-closed 0, recovered 0` and `links 1` blocked. Then restore the 5.",
        code: "uv run --offline python -m paydesk.simulate --seed 11 --crash --restart-after 10 | head -5",
      },
      {
        title: "Turn off the nightly recovery sweep",
        text: "In `recover_stale` in `recovery.py`, change `for state in d.store.stale_runs():` to `for state in []:` and rerun. The force-closed run now stays with sales. Expect `sales queue 29, force-closed 1, recovered 0`, and one mail fewer. Then restore the line.",
        code: "uv run --offline python -m paydesk.simulate --seed 11 --crash --restart-after 10 | head -5",
      },
      {
        title: "Shorten the outage",
        text: "Restore everything and run with `--restart-after 3`. The outage is shorter than the limit, so nothing is force-closed. Expect `force-closed 0` and one blocked link.",
        code: "uv run --offline python -m paydesk.simulate --seed 11 --crash --restart-after 3 | head -5",
      },
    ],
    verify: "uv run --offline python -m paydesk.simulate --seed 11 --crash --restart-after 10",
  },
  recap: [
    "A topic that never loses an event delivers some twice, so every effect needs an idempotency key built from the event.",
    "Chapter 25's keys already cover a consumer that comes back. With `--crash`, one repeated link is blocked and the customer gets one mail.",
    "A run open for more than 5 simulated minutes is force-closed and handed to sales with the reason timeout.",
    "The nightly recovery sweep releases stale runs and puts their events back on the topic, so the graph decides on fresh signals.",
    "Five changed lines in chapter 26's driver pass both functions through chapter 25's hooks.",
    "In production the scheduler, the topic, the container tasks and the database are separate, and recovery runs as its own task.",
    "The 60-second answer covers the pattern, the handoff, no free-text-to-SQL, the topic, pull consumers, the safeguards and the deployment.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In the PayDesk capstone I learned that a desk survives failure through three layers: idempotency keys for repeats, a 5-minute force-close for hung runs and a nightly recovery sweep for everything left behind. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["agents-c27-q01", "agents-c27-q02", "agents-c27-q03", "agents-c27-q04"],
};

export default chapter;
