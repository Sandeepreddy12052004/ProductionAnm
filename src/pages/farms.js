import Sidebar from "@/components/Sidebar";
import FarmsPg from "@/components/farmspg";

export default function FarmsPage() {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <FarmsPg />
      </main>
    </div>
  );
}
