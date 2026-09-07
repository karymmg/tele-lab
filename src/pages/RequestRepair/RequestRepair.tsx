import { RepairRequestForm } from "@/components/forms/RepairRequestForm";

export function RequestRepair() {
  return (
    <main style={{ 
      paddingBlock: "40px", 
      minHeight: "calc(100vh - 64px)", 
      background: "var(--color-bg)",
      backgroundImage: "radial-gradient(circle at 15% 10%, rgba(0, 140, 255, 0.03) 0%, transparent 40%), radial-gradient(circle at 85% 90%, rgba(0, 163, 255, 0.03) 0%, transparent 40%)"
    }}>
      <RepairRequestForm />
    </main>
  );
}
