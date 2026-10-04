import { AppSidebar } from "@/components/app-sidebar";
import { ProjectsWorkspace } from "@/components/projects-workspace";

export default function ProjectsPage() {
  return <main className="app-shell"><AppSidebar active="projects" /><ProjectsWorkspace /></main>;
}
