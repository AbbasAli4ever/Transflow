import { Suspense } from "react";
import ProductDetailShell from "./ProductDetailShell";

export default function Page() {
  return (
    <Suspense>
      <ProductDetailShell />
    </Suspense>
  );
}
