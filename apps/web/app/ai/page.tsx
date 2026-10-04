import { AppSidebar } from "@/components/app-sidebar";
import { AIWorkspace } from "@/components/ai-workspace";

export default function AIPage() { return <main className="app-shell"><AppSidebar active="ai"/><AIWorkspace/></main>; }
