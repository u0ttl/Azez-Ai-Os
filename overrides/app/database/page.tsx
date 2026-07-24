import {AppSidebar} from "@/components/app-sidebar";
import {OperationsWorkspace} from "@/components/operations-workspace";
export default function Page(){return <main className="app-shell"><AppSidebar active="database"/><OperationsWorkspace mode="database"/></main>}
