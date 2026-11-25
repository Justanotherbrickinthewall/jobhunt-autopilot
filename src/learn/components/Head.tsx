import type { ReactNode } from "react";
import { PageHeader } from "../../components/PageHeader.tsx";

// Every Learn screen opens with the app's page bar. A long title ellipsises in the bar and shows in full on hover.
export function LearnHead({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <PageHeader cap="Learn" title={title} sub={sub && <span title={sub}>{sub}</span>}>
      {children}
    </PageHeader>
  );
}
