import { Suspense } from "react";
import PaymentAccountDetailShell from "./PaymentAccountDetailShell";

export default function Page() {
  return (
    <Suspense>
      <PaymentAccountDetailShell />
    </Suspense>
  );
}
