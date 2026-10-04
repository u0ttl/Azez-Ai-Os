import { AppSidebar } from "@/components/app-sidebar";
import { WorkflowsWorkspace } from "@/components/workflows-workspace";

export default function WorkflowsPage() { return <main className="app-shell"><AppSidebar active="workflows"/><WorkflowsWorkspace/></main>; }
