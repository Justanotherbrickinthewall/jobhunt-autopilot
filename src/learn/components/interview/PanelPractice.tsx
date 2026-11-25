import { useEffect, useState } from "react";
import "../../styles/interview.css";
import type { InterviewQuestion } from "../../content/types.ts";
import { fetchAttempts, toPractice, type Attempt } from "./api.ts";
import { Practice } from "./Practice.tsx";
import { PhonePractice } from "./PhonePractice.tsx";

const PHONE = import.meta.env.VITE_PHONE === "1";
const PRACTICE = PHONE ? PhonePractice : Practice;

export function PanelPractice({ q }: { q: InterviewQuestion }) {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [adhoc, setAdhoc] = useState<string[]>([]);
  useEffect(() => { if (!PHONE) void fetchAttempts().then(setAttempts); }, []);
  const addAttempt = (a: Attempt) => setAttempts((x) => [...x, a]);
  const last = adhoc[adhoc.length - 1];
  return (
    <>
      <PRACTICE q={toPractice(q)} attempts={attempts} onGraded={addAttempt} onFollowUp={(f) => setAdhoc([f])} />
      {!PHONE && last && (
        <div style={{ marginTop: "1.4rem" }}>
          <Practice key={last} q={{ question: last, category: "ad hoc" }} attempts={attempts} onGraded={addAttempt} onFollowUp={(f) => setAdhoc([...adhoc, f])} />
        </div>
      )}
    </>
  );
}
