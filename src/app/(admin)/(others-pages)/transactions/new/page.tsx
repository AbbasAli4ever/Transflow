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

    if (type === "SUPPLIER_PAYMENT") {
      router.replace("/transactions/supplier-payment");
      return;
    }

    if (type === "CUSTOMER_PAYMENT") {
      router.replace("/transactions/customer-payment");
      return;
    }

    if (type === "SUPPLIER_RETURN") {
      router.replace("/transactions/supplier-return");
      return;
    }

    if (type === "CUSTOMER_RETURN") {
      router.replace("/transactions/customer-return");
      return;
    }

    if (type === "INTERNAL_TRANSFER") {
      router.replace("/transactions/internal-transfer");
      return;
    }

    if (type === "ADJUSTMENT") {
      router.replace("/transactions/stock-adjustment");
      return;
    }

    router.replace("/transactions/purchase");
  }, [router, searchParams]);

  return null;
}
