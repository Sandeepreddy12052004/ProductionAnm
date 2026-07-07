import React, { useEffect } from "react";
import { useRouter } from "next/router";
import DashboardContent from "../components/DashboardContent";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");

    if (isLoggedIn !== "true") {
      router.replace("/login"); // ✅ FIXED
    } else {
      window.scrollTo(0, 0);
    }
  }, [router]);

  return (
    <div className="w-full">
      <DashboardContent />
    </div>
  );
}