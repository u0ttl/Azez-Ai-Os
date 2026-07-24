import {AppSidebar} from "@/components/app-sidebar";
import {OperationsWorkspace} from "@/components/operations-workspace";
export default function Page(){return <main className="app-shell"><AppSidebar active="code"/><OperationsWorkspace mode="code"/></main>}
