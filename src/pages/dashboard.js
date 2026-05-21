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
    <div className="p-4 md:p-10">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-[#272E52] opacity-80">
          Farm Dashboard
        </h1>
        <p className="text-sm text-gray-500">
          Agasthya Management System
        </p>
      </header>

      <div className="max-w-7xl">
        <DashboardContent />
      </div>
    </div>
  );
}