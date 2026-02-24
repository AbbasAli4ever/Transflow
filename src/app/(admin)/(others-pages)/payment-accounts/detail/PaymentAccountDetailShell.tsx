"use client";

import { useEffect, useState } from "react";
import PaymentAccountDetailClient from "./PaymentAccountDetailClient";

export default function PaymentAccountDetailShell() {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    const paymentAccountId = sessionStorage.getItem("paymentAccountId");
    if (!paymentAccountId) {
      window.location.href = "/payment-accounts";
      return;
    }
    setId(paymentAccountId);
  }, []);

  if (id === null) return null;
  return <PaymentAccountDetailClient id={id} />;
}
