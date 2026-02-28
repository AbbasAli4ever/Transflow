"use client";

import { useEffect } from "react";

export default function TransactionDetailRedirect() {
  useEffect(() => {
    const id = sessionStorage.getItem("transactionId");
    if (id) {
      window.location.href = `/transactions/${id}`;
    } else {
      window.location.href = "/transactions";
    }
  }, []);

  return null;
}
