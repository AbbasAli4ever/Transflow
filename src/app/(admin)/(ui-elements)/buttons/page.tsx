import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { BoxIcon } from "@/icons";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Buttons | TransFlow",
  description: "TransFlow Buttons",
};

export default function Buttons() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <h1 className="mb-3 text-4xl font-bold text-gray-800 dark:text-white/90">
          Buttons
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400">Coming Soon</p>
      </div>
    </div>
  );
}
