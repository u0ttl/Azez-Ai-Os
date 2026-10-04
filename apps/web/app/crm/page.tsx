import { AppSidebar } from "@/components/app-sidebar";
import { CrmWorkspace } from "@/components/crm-workspace";

export default function CrmPage() {
  return <main className="app-shell"><AppSidebar active="crm" /><CrmWorkspace /></main>;
}
