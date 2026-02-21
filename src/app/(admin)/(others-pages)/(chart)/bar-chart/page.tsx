import BarChartOne from "@/components/charts/bar/BarChartOne";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Bar Chart | TransFlow",
  description: "TransFlow Bar Chart",
};

export default function page() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <h1 className="mb-3 text-4xl font-bold text-gray-800 dark:text-white/90">
          Bar Chart
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400">Coming Soon</p>
      </div>
    </div>
  );
}
