"use client";

import { useEffect, useState } from "react";
import CustomerDetailClient from "./CustomerDetailClient";

export default function CustomerDetailShell() {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    const customerId = sessionStorage.getItem("customerId");
    if (!customerId) {
      window.location.href = "/customer";
      return;
    }
    setId(customerId);
  }, []);

  if (id === null) return null;
  return <CustomerDetailClient id={id} />;
}
