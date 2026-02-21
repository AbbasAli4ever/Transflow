import type { Metadata } from "next";
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import React from "react";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import RecentOrders from "@/components/ecommerce/RecentOrders";
import DemographicCard from "@/components/ecommerce/DemographicCard";

export const metadata: Metadata = {
  title: "Dashboard | TransFlow",
  description: "TransFlow Dashboard",
};

export default function Ecommerce() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <h1 className="mb-3 text-4xl font-bold text-gray-800 dark:text-white/90">
          Dashboard
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400">Coming Soon</p>
      </div>
    </div>
  );
}
