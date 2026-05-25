
import DepartmentPg from "@/components/Departmentpg";

export default function DepartmentPage() {

  const config = {
    id: "department",
    name: "Department"
  };

  return (
    <div className="w-full">
      <DepartmentPg moduleConfig={config} />
    </div>
  );
}