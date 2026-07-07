import React from "react";
import { useRouter } from "next/router";
import FarmDashboard from "@/components/tkpfarmpg";

export default function DynamicFarmPage() {
  const router = useRouter();
  const { code } = router.query;

  if (!code) return null;

  return (
    <div className="w-full">
      <FarmDashboard farmCode={typeof code === 'string' ? code.toUpperCase() : ''} />
    </div>
  );
}
