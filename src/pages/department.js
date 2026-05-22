import Sidebar from "@/components/Sidebar";
import DepartmentPg from "@/components/Departmentpg";

export default function DepartmentPage() {

  const config = {
    id: "department",
    name: "Department"
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      <Sidebar />

      <main className="flex-1 overflow-auto">

        <DepartmentPg moduleConfig={config} />

      </main>

    </div>
  );
}