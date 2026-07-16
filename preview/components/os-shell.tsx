"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  Activity, Bot, Boxes, BrainCircuit, BriefcaseBusiness, ChevronLeft, Cloud, Code2, Command,
  Database, FileText, FlaskConical, FolderKanban, Gauge, Globe2, Home, Languages, LayoutGrid,
  Menu, MessageCircle, Mic, Minimize2, Moon, MoreHorizontal, Network, Plus, Search, Settings,
  ShieldCheck, Sparkles, Sun, TerminalSquare, Workflow, X, Zap,
} from "lucide-react";

const AICoreScene = dynamic(() => import("./ai-core-scene"), { ssr: false });

type AppKey = "assistant" | "agents" | "projects" | "terminal" | "knowledge" | "monitor" | "lab";

type WindowState = {
  id: AppKey;
  title: string;
  icon: React.ReactNode;
  minimized?: boolean;
  maximized?: boolean;
};

const navItems = [
  ["home", "الرئيسية", Home], ["agents", "الوكلاء الذكيون", Bot], ["projects", "المشاريع", FolderKanban],
  ["knowledge", "المعرفة", BrainCircuit], ["crm", "CRM", BriefcaseBusiness], ["workflows", "سير العمل", Workflow],
  ["code", "استوديو الكود", Code2], ["terminal", "الطرفية", TerminalSquare], ["files", "الملفات", FileText],
  ["database", "قواعد البيانات", Database], ["api", "API Manager", Network], ["cloud", "السحابة", Cloud],
  ["analytics", "التحليلات", Activity], ["security", "الأمان", ShieldCheck], ["lab", "AZEZ LAB AI", FlaskConical],
  ["settings", "الإعدادات", Settings],
] as const;

const appMeta: Record<AppKey, { title: string; icon: React.ReactNode }> = {
  assistant: { title: "المساعد الذكي", icon: <MessageCircle size={17} /> },
  agents: { title: "مركز الوكلاء", icon: <Bot size={17} /> },
  projects: { title: "إدارة المشاريع", icon: <FolderKanban size={17} /> },
  terminal: { title: "AZEZ Terminal", icon: <TerminalSquare size={17} /> },
  knowledge: { title: "قاعدة المعرفة", icon: <BrainCircuit size={17} /> },
  monitor: { title: "مراقبة النظام", icon: <Gauge size={17} /> },
  lab: { title: "AZEZ LAB AI", icon: <FlaskConical size={17} /> },
};

const metricCards = [
  { label: "AI Agents", value: "12 نشط", icon: Bot, accent: "cyan" },
  { label: "Projects", value: "24 قيد العمل", icon: FolderKanban, accent: "blue" },
  { label: "Knowledge", value: "8,531 مستند", icon: BrainCircuit, accent: "violet" },
  { label: "Terminal", value: "متصل وآمن", icon: TerminalSquare, accent: "amber" },
];

const statusCards = [
  { label: "System Status", value: "Perfect", percent: 98, icon: Activity },
  { label: "Memory", value: "8.7 / 16 GB", percent: 54, icon: Database },
  { label: "CPU", value: "3.2 GHz", percent: 32, icon: Gauge },
  { label: "GPU", value: "RTX 4090", percent: 45, icon: Zap },
];

function AppWindow({ item, onClose, onMinimize, onMaximize }: {
  item: WindowState;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
}) {
  if (item.minimized) return null;
  return (
    <section className={`os-window ${item.maximized ? "maximized" : ""}`} aria-label={item.title}>
      <header className="window-bar">
        <div className="window-title">{item.icon}<strong>{item.title}</strong><span className="live-dot" /></div>
        <div className="window-actions">
          <button onClick={onMinimize} aria-label="تصغير"><Minimize2 size={14} /></button>
          <button onClick={onMaximize} aria-label="تكبير"><LayoutGrid size={14} /></button>
          <button onClick={onClose} aria-label="إغلاق"><X size={14} /></button>
        </div>
      </header>
      <div className="window-content">
        {item.id === "assistant" && <AssistantWindow />}
        {item.id === "agents" && <AgentsWindow />}
        {item.id === "projects" && <ProjectsWindow />}
        {item.id === "terminal" && <TerminalWindow />}
        {item.id === "knowledge" && <KnowledgeWindow />}
        {item.id === "monitor" && <MonitorWindow />}
        {item.id === "lab" && <LabWindow />}
      </div>
    </section>
  );
}

function AssistantWindow() {
  return <div className="assistant-window"><div className="assistant-orb"><Sparkles size={25} /></div><h3>كيف أساعدك اليوم؟</h3><p>اطلب تحليل مشروع، إنشاء وكيل، كتابة كود أو تشغيل Workflow.</p><div className="prompt-row"><input placeholder="اكتب أمرًا أو اسأل AZEZ AI..."/><button><Command size={15}/></button></div><div className="chips"><button>حلّل المشاريع</button><button>أنشئ وكيلاً</button><button>افتح المختبر</button></div></div>;
}

function AgentsWindow() {
  return <div className="mini-list">{["AI Writer","Code Assistant","Data Analyst","Web Scraper","Medical Lab Agent"].map((name, i)=><article key={name}><span className="app-icon"><Bot size={15}/></span><div><strong>{name}</strong><small>{i === 4 ? "Review required" : "Running"}</small></div><i className={i===4?"warn":"ok"}/><button>فتح</button></article>)}</div>;
}

function ProjectsWindow() {
  return <div className="project-grid">{["AI Medical Center","Web Platform","Mobile App","Data Warehouse"].map((name,i)=><article key={name}><span className="app-icon"><FolderKanban size={16}/></span><strong>{name}</strong><small>{[72,61,90,48][i]}% مكتمل</small><div className="progress"><i style={{width:`${[72,61,90,48][i]}%`}}/></div></article>)}</div>;
}

function TerminalWindow() {
  return <pre className="terminal-body">{`AZEZ AI OS Terminal v1.0.0\nCopyright (c) 2026\nazez@ai-os:~$ system status\nSystem Status: Perfect\nAll services are running\nCPU: 32%   Memory: 54%\nUptime: 12d 4h 22m\nazez@ai-os:~$ _`}</pre>;
}

function KnowledgeWindow() {
  return <div className="knowledge-window"><div className="search-box"><Search size={15}/><input placeholder="ابحث في 8,531 مستندًا"/></div>{["وثائق AZEZ AI OS","قاعدة المعرفة الطبية","مراجع المشاريع","سياسات الأمان"].map((x,i)=><article key={x}><FileText size={16}/><div><strong>{x}</strong><small>{[2410,1830,2941,1350][i]} مستند</small></div><ChevronLeft size={14}/></article>)}</div>;
}

function MonitorWindow() {
  return <div className="monitor-grid">{statusCards.map(x=><article key={x.label}><span>{x.label}</span><strong>{x.percent}%</strong><div className="sparkline"/><small>{x.value}</small></article>)}</div>;
}

function LabWindow() {
  return <div className="lab-window"><FlaskConical size={36}/><h3>AZEZ LAB AI</h3><p>منصة ذكاء مختبري لدعم مراجعة النتائج، الأنماط والقيم الحرجة تحت إشراف مختص.</p><div className="lab-stats"><span>12 تخصصًا</span><span>سلامة مفعّلة</span><span>مراجعة بشرية</span></div><button>فتح مركز المختبر</button></div>;
}

export default function OSShell() {
  const [booting, setBooting] = useState(true);
  const [bootStep, setBootStep] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lowPower, setLowPower] = useState(false);
  const [dayMode, setDayMode] = useState(false);
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [query, setQuery] = useState("");
  const bootMessages = useMemo(() => ["Initializing Neural Core...","Loading AI Agents...","Connecting Memory...","Verifying Security...","Loading 3D Environment...","AZEZ AI OS Ready."], []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setBooting(false); return; }
    const id = window.setInterval(() => setBootStep((current) => {
      if (current >= bootMessages.length - 1) {
        window.clearInterval(id);
        window.setTimeout(() => setBooting(false), 450);
        return current;
      }
      return current + 1;
    }), 430);
    return () => window.clearInterval(id);
  }, [bootMessages]);

  const openApp = (id: AppKey) => {
    setWindows((items) => {
      const found = items.find((item) => item.id === id);
      if (found) return items.map((item) => item.id === id ? { ...item, minimized: false } : item);
      return [...items, { id, ...appMeta[id] }].slice(-3);
    });
  };

  const navClick = (key: string) => {
    const map: Record<string, AppKey> = { agents:"agents", projects:"projects", knowledge:"knowledge", terminal:"terminal", analytics:"monitor", lab:"lab" };
    if (map[key]) openApp(map[key]);
    setSidebarOpen(false);
  };

  return (
    <main className={`os-root ${dayMode ? "day-mode" : ""}`} dir="rtl">
      {booting && <div className="boot-screen"><div className="boot-logo">A</div><h1>AZEZ AI OS</h1><p>{bootMessages[bootStep]}</p><div className="boot-progress"><i style={{width:`${((bootStep+1)/bootMessages.length)*100}%`}}/></div><button onClick={()=>setBooting(false)}>تخطي المقدمة</button></div>}

      <div className="scene-layer"><AICoreScene lowPower={lowPower}/><div className="scene-vignette"/></div>
      <button className="mobile-menu" onClick={()=>setSidebarOpen(!sidebarOpen)} aria-label="القائمة"><Menu size={20}/></button>

      <aside className={`os-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="os-brand"><span className="logo-shape">A</span><div><strong>AZEZ AI OS</strong><small>Artificial Intelligence OS</small></div></div>
        <nav>{navItems.map(([key,label,Icon])=><button key={key} className={key === "home" ? "active" : ""} onClick={()=>navClick(key)}><Icon size={17}/><span>{label}</span></button>)}</nav>
        <div className="profile-card"><div className="avatar-ring">ع</div><div><strong>AZEZ</strong><small>Super Owner</small></div><i/></div>
      </aside>

      <header className="os-topbar">
        <div className="global-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث في النظام أو اكتب أمرًا..."/><kbd>Ctrl K</kbd></div>
        <div className="clock"><strong>12:45 PM</strong><span>Friday, 16 May 2026</span></div>
        <div className="top-tools"><button onClick={()=>setDayMode(!dayMode)} aria-label="الوضع">{dayMode?<Moon size={18}/>:<Sun size={18}/>}</button><button onClick={()=>setLowPower(!lowPower)} className={lowPower?"active":""} title="وضع الأداء"><Gauge size={18}/></button><button><Globe2 size={18}/></button><button><Activity size={18}/></button></div>
      </header>

      <section className="floating-left">
        {metricCards.map(({label,value,icon:Icon,accent})=><button key={label} className={`glass-card metric ${accent}`} onClick={()=>openApp(label === "AI Agents"?"agents":label === "Projects"?"projects":label === "Knowledge"?"knowledge":"terminal")}><span className="app-icon"><Icon size={18}/></span><div><strong>{label}</strong><small>{value}</small></div><span className="mini-wave"/></button>)}
      </section>

      <section className="floating-right">
        {statusCards.map(({label,value,percent,icon:Icon})=><button key={label} className="glass-card status-card" onClick={()=>openApp("monitor")}><span className="app-icon"><Icon size={18}/></span><div><strong>{label}</strong><small>{value}</small></div><span className="ring-meter" style={{"--meter":`${percent*3.6}deg`} as React.CSSProperties}><b>{percent}%</b></span></button>)}
      </section>

      <section className="core-label"><span className="logo-shape">A</span><h1>AZEZ AI OS</h1><p>AI Operating System · v1.0.0</p></section>

      <aside className="quick-panel">
        <section><header><strong>الأنظمة الذكية</strong><Boxes size={16}/></header><div className="quick-grid"><button onClick={()=>openApp("assistant")}><BrainCircuit/><span>نواة الذكاء</span></button><button onClick={()=>openApp("agents")}><Bot/><span>إدارة الوكلاء</span></button><button onClick={()=>openApp("projects")}><FolderKanban/><span>المشاريع</span></button><button onClick={()=>openApp("knowledge")}><ShieldCheck/><span>المعرفة</span></button></div></section>
        <section><header><strong>الأدوات السريعة</strong><Zap size={16}/></header><div className="tool-row"><button onClick={()=>openApp("projects")}><Plus/><span>مشروع</span></button><button onClick={()=>openApp("assistant")}><MessageCircle/><span>AI Chat</span></button><button><FileText/><span>Notes</span></button><button><LayoutGrid/><span>Apps</span></button><button><MoreHorizontal/><span>More</span></button></div></section>
        <section><header><strong>المساعد الذكي</strong><Sparkles size={16}/></header><div className="assistant-tools"><button><Mic/></button><button><Globe2/></button><button onClick={()=>openApp("assistant")}><MessageCircle/></button><button><Languages/></button><button><Sparkles/></button></div></section>
      </aside>

      <section className="window-layer">{windows.map((item)=><AppWindow key={item.id} item={item} onClose={()=>setWindows(x=>x.filter(w=>w.id!==item.id))} onMinimize={()=>setWindows(x=>x.map(w=>w.id===item.id?{...w,minimized:true}:w))} onMaximize={()=>setWindows(x=>x.map(w=>w.id===item.id?{...w,maximized:!w.maximized}:w))}/>)}</section>

      <section className="bottom-widgets">
        <article className="dashboard-widget"><header><strong>محطة الأوامر الذكية</strong><TerminalSquare size={15}/></header><TerminalWindow/></article>
        <article className="dashboard-widget"><header><strong>إدارة الوكلاء</strong><Bot size={15}/></header><AgentsWindow/></article>
        <article className="dashboard-widget"><header><strong>المشاريع النشطة</strong><FolderKanban size={15}/></header><ProjectsWindow/></article>
        <article className="dashboard-widget"><header><strong>مراقبة النظام</strong><Activity size={15}/></header><MonitorWindow/></article>
        <article className="dashboard-widget database-widget"><header><strong>قواعد البيانات</strong><Database size={15}/></header>{["Main Database","Analytics DB","Logs Database","Backup DB"].map(x=><div className="db-row" key={x}><Database size={13}/><span>{x}</span><b>Connected</b></div>)}</article>
      </section>

      <nav className="os-dock" aria-label="تطبيقات سريعة">
        {([ ["home",Home], ["agents",Bot], ["projects",FolderKanban], ["assistant",MessageCircle], ["knowledge",BrainCircuit], ["terminal",TerminalSquare], ["monitor",Activity], ["lab",FlaskConical] ] as const).map(([id,Icon],index)=><button key={id} className={index===0?"active":""} onClick={()=>id!=="home"&&openApp(id as AppKey)}><Icon size={22}/></button>)}
      </nav>

      <div className="command-footer"><Command size={15}/><input placeholder="Type a command or ask AI..."/><button><Mic size={17}/></button><button onClick={()=>openApp("assistant")} className="core-button"><Sparkles size={18}/></button></div>
    </main>
  );
}
