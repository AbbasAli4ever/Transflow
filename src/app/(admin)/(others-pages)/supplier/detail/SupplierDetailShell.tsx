"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import SupplierDetailClient from "./SupplierDetailClient";

export default function SupplierDetailShell() {
  const [id, setId] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const urlId = searchParams.get("id");
    const supplierId = urlId ?? sessionStorage.getItem("supplierId");
    if (!supplierId) {
      window.location.href = "/supplier";
      return;
    }
    if (urlId) sessionStorage.setItem("supplierId", urlId);
    setId(supplierId);
  }, [searchParams]);

  if (id === null) return null;
  return <SupplierDetailClient id={id} />;
}
