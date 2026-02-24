"use client";

import { useEffect, useState } from "react";
import ProductDetailClient from "./ProductDetailClient";

export default function ProductDetailShell() {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    const productId = sessionStorage.getItem("productId");
    if (!productId) {
      window.location.href = "/product";
      return;
    }
    setId(productId);
  }, []);

  if (id === null) return null;
  return <ProductDetailClient id={id} />;
}
