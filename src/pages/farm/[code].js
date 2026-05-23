import React from "react";
import { useRouter } from "next/router";
import Sidebar from "@/components/Sidebar";
import FarmDashboard from "@/components/tkpfarmpg";

export default function DynamicFarmPage() {
  const router = useRouter();
  const { code } = router.query;

  if (!code) return null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-3 w-full">
          <FarmDashboard farmCode={code.toUpperCase()} />
        </div>
      </main>
    </div>
  );
}
