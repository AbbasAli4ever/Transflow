"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import PaymentAccountDetailClient from "./PaymentAccountDetailClient";

export default function PaymentAccountDetailShell() {
  const [id, setId] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const urlId = searchParams.get("id");
    const paymentAccountId = urlId ?? sessionStorage.getItem("paymentAccountId");
    if (!paymentAccountId) {
      window.location.href = "/payment-accounts";
      return;
    }
    if (urlId) sessionStorage.setItem("paymentAccountId", urlId);
    setId(paymentAccountId);
  }, [searchParams]);

  if (id === null) return null;
  return <PaymentAccountDetailClient id={id} />;
}
