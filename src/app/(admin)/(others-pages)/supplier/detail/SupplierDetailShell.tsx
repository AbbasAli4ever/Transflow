"use client";

import { useEffect, useState } from "react";
import SupplierDetailClient from "./SupplierDetailClient";

export default function SupplierDetailShell() {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    const supplierId = sessionStorage.getItem("supplierId");
    if (!supplierId) {
      window.location.href = "/supplier";
      return;
    }
    setId(supplierId);
  }, []);

  if (id === null) return null;
  return <SupplierDetailClient id={id} />;
}
