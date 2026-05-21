import React, { useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { motion } from "framer-motion"; // For that premium smooth entrance

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ identifier: "", password: "" });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch("https://farm.agasthyanutromilk.com/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

    const clonedResponse = response.clone();
      const rawText = await clonedResponse.text();
      console.log("Login Status:", response.status);
      console.log("Response Body:", rawText);


      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("token", data.token);
        router.replace("/dashboard");
      } else {
        alert(data.message || "Invalid credentials");
      }
    } catch (error) {
      alert("Server connection failed. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F7F6] font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 rounded-[2rem] shadow-[0_20px_50px_rgba(26,35,62,0.1)] w-full max-w-md border border-gray-50"
      >
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative w-40 h-40 mb-2">
            <Image 
              src="/LOGO.png" 
              alt="Agasthya Logo" 
              fill 
              sizes="(max-width: 768px) 100vw, 200px"
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Form Section */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-[#1A233E] uppercase tracking-wider mb-2 ml-1">
              User ID
            </label>
            <input
              type="text"
              required
              className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-200 text-[#1A233E] focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200"
              placeholder="Enter your ID"
              onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1A233E] uppercase tracking-wider mb-2 ml-1">
              Password
            </label>
            <div className="relative">

  <input
    type={showPassword ? "text" : "password"}
    required
    value={formData.password ||  ""}
    className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-200 text-[#1A233E] focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200"
    placeholder="••••••••"
    onChange={(e) =>
      setFormData({
        ...formData,
        password: e.target.value,
      })
    }
  />

  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
  >
    👁
  </button>

</div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#1A233E] hover:bg-[#25335a] text-white font-bold rounded-xl shadow-lg shadow-navy-900/20 transform transition active:scale-[0.98] disabled:opacity-70 mt-4"
          >
            {loading ? "Authenticating..." : "Login to Farm"}
          </button>
        </form>

        <p className="text-center mt-8 text-gray-400 text-xs">
          © 2026 Agasthya Nutro Milk Management System
        </p>
      </motion.div>
    </div>
  );
}