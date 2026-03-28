"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import ProductDetailClient from "./ProductDetailClient";

export default function ProductDetailShell() {
  const [id, setId] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const urlId = searchParams.get("id");
    const productId = urlId ?? sessionStorage.getItem("productId");
    if (!productId) {
      window.location.href = "/products";
      return;
    }
    if (urlId) sessionStorage.setItem("productId", urlId);
    setId(productId);
  }, [searchParams]);

  if (id === null) return null;
  return <ProductDetailClient id={id} />;
}
