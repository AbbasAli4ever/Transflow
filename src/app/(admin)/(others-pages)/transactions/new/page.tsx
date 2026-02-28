"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function NewTransactionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const type = (searchParams.get("type") ?? "").toUpperCase();

    if (type === "SALE") {
      router.replace("/transactions/sale");
      return;
    }

    router.replace("/transactions/purchase");
  }, [router, searchParams]);

  return null;
}
