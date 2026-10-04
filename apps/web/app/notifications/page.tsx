import { AppSidebar } from "../../components/app-sidebar";
import { NotificationsWorkspace } from "../../components/notifications-workspace";

export default function NotificationsPage() { return <div className="app-shell"><AppSidebar active="notifications" /><NotificationsWorkspace /></div>; }
