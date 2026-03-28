"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import CustomerDetailClient from "./CustomerDetailClient";

export default function CustomerDetailShell() {
  const [id, setId] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const urlId = searchParams.get("id");
    const customerId = urlId ?? sessionStorage.getItem("customerId");
    if (!customerId) {
      window.location.href = "/customer";
      return;
    }
    if (urlId) sessionStorage.setItem("customerId", urlId);
    setId(customerId);
  }, [searchParams]);

  if (id === null) return null;
  return <CustomerDetailClient id={id} />;
}
