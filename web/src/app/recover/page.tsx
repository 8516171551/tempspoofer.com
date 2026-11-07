// Magic-link landing: user arrives with ?token=xxx. We POST to consume,
// get back the new master code, and show the same "save it" confirm UI
// as the first-run gate.

import { Suspense } from "react";
import { RecoverClient } from "./RecoverClient";

export const dynamic = "force-dynamic";

export default function Recover() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <RecoverClient />
    </Suspense>
  );
}
