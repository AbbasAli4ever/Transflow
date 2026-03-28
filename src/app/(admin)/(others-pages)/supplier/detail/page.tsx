import { Suspense } from "react";
import SupplierDetailShell from "./SupplierDetailShell";

export default function Page() {
  return (
    <Suspense>
      <SupplierDetailShell />
    </Suspense>
  );
}
