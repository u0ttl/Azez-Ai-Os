import { AppSidebar } from "../../components/app-sidebar";
import { SecurityWorkspace } from "../../components/security-workspace";

export default function SecurityPage() {
  return <div className="app-shell"><AppSidebar active="security" /><SecurityWorkspace /></div>;
}
