import { Suspense } from "react";
import CustomerDetailShell from "./CustomerDetailShell";

export default function Page() {
  return (
    <Suspense>
      <CustomerDetailShell />
    </Suspense>
  );
}
