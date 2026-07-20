import React, { useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { motion } from "framer-motion"; // For that premium smooth entrance
import { swalError } from "@/utils/swal";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://farm.agasthyanutromilk.com/';
const cleanBaseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;


export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ identifier: "", password: "" });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`${cleanBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      let data = null;
      try {
        data = await response.json();
      } catch (jsonErr) {
        console.error("Response parsing failed:", jsonErr);
      }

      console.log("Login Status:", response.status);
      console.log("Response Data:", data);

      if (response.ok && data) {
        const token = data.token || 
                      (data.data && data.data.token) || 
                      data.accessToken || 
                      (data.data && data.data.accessToken) || 
                      (data.data && data.data.tokens && data.data.tokens.accessToken) ||
                      (data.tokens && data.tokens.accessToken);
        if (!token) {
          console.error("Login successful but no token found in response", data);
          swalError("Error", "Authentication succeeded, but the security token was not found in the server response.");
          setLoading(false);
          return;
        }
        const userObj = data.user || (data.data && data.data.user);
        if (userObj) {
          if (userObj.status === false || userObj.status === 'Inactive' || userObj.status === 'INACTIVE') {
            swalError("Access Denied", "Your User ID is inactive. Please contact the administrator.");
            setLoading(false);
            return;
          }
          localStorage.setItem("user", JSON.stringify(userObj));
          
          let activeFarmId = 'ALL';
          const rawFarmId = userObj.farmId && typeof userObj.farmId === 'object'
            ? (userObj.farmId._id || userObj.farmId.id)
            : userObj.farmId;
          if (rawFarmId && rawFarmId !== 'ALL') {
            activeFarmId = String(rawFarmId).trim();
          }
          localStorage.setItem("__active_farm_id__", activeFarmId);
        } else {
          // Fallback if production API doesn't return user object clearly
          localStorage.setItem("user", JSON.stringify({ role: 'SUPER_ADMIN' }));
          localStorage.setItem("__active_farm_id__", 'ALL');
        }
        
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("token", token);

        // Set cookies so that Next.js Edge Middleware can inspect route permissions
        try {
          document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`;
          document.cookie = `user=${encodeURIComponent(JSON.stringify(userObj || { role: 'SUPER_ADMIN' }))}; path=/; max-age=86400; SameSite=Lax`;
        } catch (cookieErr) {
          console.error("Failed to set authentication cookies:", cookieErr);
        }

        // Dynamic Post-Login Landing Page Redirection
        const handlePostLoginRedirect = (user, routerInstance) => {
          if (!user) {
            return routerInstance.replace("/login");
          }

          const userRole = user.role || '';
          if (userRole.trim().toUpperCase() === 'SUPER_ADMIN') {
            return routerInstance.replace("/dashboard");
          }

          const permissions = user.permissions;
          if (!Array.isArray(permissions)) {
            return routerInstance.replace("/login");
          }

          const hasAllAccess = permissions.some(p => typeof p === 'string' && p.trim().toUpperCase() === 'ALL');
          if (hasAllAccess) {
            return routerInstance.replace("/dashboard");
          }

          const hasAccess = (moduleKey, exact = false) => {
            const permission = permissions.find((p) => {
              if (!p) return false;
              if (typeof p === 'object') {
                return String(p.module_key || '').trim().toLowerCase() === moduleKey.trim().toLowerCase();
              }
              if (typeof p === 'string') {
                const lowerP = p.trim().toLowerCase();
                const lowerModKey = moduleKey.trim().toLowerCase();
                if (exact) {
                  return lowerP === lowerModKey;
                }
                return lowerP === lowerModKey || lowerP.startsWith(lowerModKey + '_') || lowerP.includes(lowerModKey);
              }
              return false;
            });

            if (!permission) return false;
            if (typeof permission === 'object') return !!permission.can_view;
            return true;
          };

          if (hasAccess('dashboard')) {
            return routerInstance.replace("/dashboard");
          }

          const checkAccess = (r) => hasAccess(r.key) || (r.baseKey && hasAccess(r.baseKey, true));

          const routeMappings = [
            { key: 'USER_MANAGEMENT', path: '/users' },
            { key: 'DEPARTMENT', path: '/department' },
            { key: 'ROLES', path: '/roles' },
            { key: 'FARM_MANAGEMENT', path: '/farms' },
            { key: 'SHED_MANAGEMENT', baseKey: 'SHEDS', path: '/shed-management' },
            { key: 'LINE_MANAGEMENT', baseKey: 'SHEDS', path: '/line-management' },
            { key: 'CATTLE_MANAGEMENT', baseKey: 'CATTLE', path: '/cattle-management' },
            { key: 'HEALTH_MANAGEMENT', baseKey: 'HEALTH', path: '/health-management' },
            { key: 'FEED_ITEMS', baseKey: 'INVENTORY', path: '/feed-items' },
            { key: 'TAG_MANAGEMENT', baseKey: 'CATTLE', path: '/tag-management' },
            { key: 'BREED_MANAGEMENT', baseKey: 'CATTLE', path: '/breed-management' },
            { key: 'ANIMAL_MANAGEMENT', baseKey: 'CATTLE', path: '/animal-management' },
            { key: 'LIVESTOCK', baseKey: 'CATTLE', path: '/animals' },
            { key: 'SHED_LOG', path: '/shed' },
            { key: 'CROSSING_LOG', path: '/crossing' },
            { key: 'PURCHASE_LOG', path: '/purchase' },
            { key: 'SALE_LOG', path: '/sale' },
            { key: 'TREATMENT_LOG', baseKey: 'HEALTH', path: '/treatment' },
            { key: 'VACCINATION_LOG', baseKey: 'HEALTH', path: '/vaccination' },
            { key: 'FEED_INVENTORY', baseKey: 'INVENTORY', path: '/feed-inventory' },
            { key: 'MEDICINE_INVENTORY', baseKey: 'INVENTORY', path: '/medicine-inventory' },
            { key: 'GRASS', path: '/grass' },
            { key: 'FEEDING', path: '/farm/tkp?tab=feeding' },
            { key: 'MILK_COLLECTION', baseKey: 'MILK', path: '/farm/tkp?tab=milk_prod' },
            { key: 'MILK_QA', baseKey: 'MILK', path: '/farm/tkp?tab=components' },
            { key: 'MILK_PROCUREMENT', baseKey: 'MILK', path: '/milk-procurement' },
            { key: 'MILK_PERFORMANCE', baseKey: 'MILK_PRODUCTION', path: '/milking-performance' },
            { key: 'CROSSING_LOG', path: '/insemination' },
            { key: 'LAND_MANAGEMENT', path: '/land-management' },
            { key: 'BMC_MANAGEMENT', path: '/bmc-management' }
          ];

          const firstAllowed = routeMappings.find(r => checkAccess(r));
          if (firstAllowed) {
            return routerInstance.replace(firstAllowed.path);
          }

          return routerInstance.replace("/login");
        };

        handlePostLoginRedirect(userObj, router);
      } else {
        const errorMsg = (data && (data.message || data.error || data.message)) || "Invalid credentials";
        swalError("Error", errorMsg);
      }
    } catch (error) {
      swalError("Error", "Server connection failed. Please try again later.");
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
            <label className="block text-xs font-bold text-[#16223F] uppercase tracking-wider mb-2 ml-1">
              User ID
            </label>
            <input
              type="text"
              required
              className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-200 text-[#16223F] focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200"
              placeholder="Enter your ID"
              onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#16223F] uppercase tracking-wider mb-2 ml-1">
              Password
            </label>
            <div className="relative">

  <input
    type={showPassword ? "text" : "password"}
    required
    value={formData.password ||  ""}
    className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-200 text-[#16223F] focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200"
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
            className="w-full py-4 bg-[#16223F] hover:bg-[#16223F]/90 text-white font-bold rounded-xl shadow-lg shadow-[#16223F]/20 transform transition active:scale-[0.98] disabled:opacity-70 mt-4"
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