import { AppSidebar } from "@/components/app-sidebar";
import { KnowledgeWorkspace } from "@/components/knowledge-workspace";

export default function KnowledgePage() { return <main className="app-shell"><AppSidebar active="knowledge"/><KnowledgeWorkspace/></main>; }
