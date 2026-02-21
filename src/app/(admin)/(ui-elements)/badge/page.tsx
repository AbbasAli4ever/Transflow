import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Badge from "@/components/ui/badge/Badge";
import { PlusIcon } from "@/icons";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Badges | TransFlow",
  description: "TransFlow Badges",
};

export default function BadgePage() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <h1 className="mb-3 text-4xl font-bold text-gray-800 dark:text-white/90">
          Badges
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400">Coming Soon</p>
      </div>
    </div>
  );
}
