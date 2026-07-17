import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const path = join(process.cwd(), "components", "auth-workspace.tsx");
const before = readFileSync(path, "utf8");
const oldCode = 'const [theme,setTheme]=useState<ThemeMode>("dark"); const [busy,setBusy]=useState(false); const [error,setError]=useState<string>(); const [notice,setNotice]=useState<string>();\n  useEffect(()=>{const saved=window.localStorage.getItem("azez-theme");setTheme(saved==="light"||saved==="dark"?saved:window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")},[]);';
const newCode = 'const [theme,setTheme]=useState<ThemeMode>(()=>{if(typeof window==="undefined")return "dark";const saved=window.localStorage.getItem("azez-theme");return saved==="light"||saved==="dark"?saved:window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}); const [busy,setBusy]=useState(false); const [error,setError]=useState<string>(); const [notice,setNotice]=useState<string>();';

if (before.includes(newCode)) {
  console.log("Auth theme initializer already lint-safe.");
} else if (before.includes(oldCode)) {
  writeFileSync(path, before.replace(oldCode, newCode));
  console.log("Applied lint-safe auth theme initializer.");
} else {
  throw new Error("Auth theme patch target was not found.");
}
