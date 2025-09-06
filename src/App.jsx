import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  CheckCircle2,
  Circle,
  CalendarDays,
  Trash2,
  Settings,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock3,
  X,
  Save,
  User,
  Image as ImageIcon,
} from "lucide-react";

// =====================================================================
// Financial District – Interactive Web Preview (mirrors the RN app UX)
// ---------------------------------------------------------------------
// Update:
// - Logo: nur das vom Nutzer gelieferte Bild oben links (keine Schrift daneben)
//   mit Fallback, damit es sicher lädt.
// - Vollständige i18n (DE/EN) für die gesamte UI.
// - Profilfoto-Upload (PNG/JPG) mit Vorschau, Zurücksetzen & Persistenz.
// - Add-Dialog: Priorität als gut lesbares Dropdown (statt gedrängter Buttons).
// - Spacing/Lesbarkeit in Dialogen verbessert.
// - Zeitzonen: 24 Presets (UTC−12…UTC+11), Standard Europe/Berlin.
// =====================================================================

// -----------------------------
// I18n – Runtime-Lokalisierung
// -----------------------------
const DICT = {
  de: {
    appName: "Financial District",
    day: "Tag", week: "Woche", month: "Monat",
    weekOf: (s: string) => `Woche ab ${s}`,
    searchTasks: "Aufgaben suchen",
    showDone: "✓ zeigen", hideDone: "✓ ausblenden",
    all: "alle", today: "heute", planned: "geplant", done: "erledigt",
    addForDay: "Aufgabe für diesen Tag hinzufügen…",
    noneForDay: "Für diesen Tag keine Aufgaben.",
    complete: "Erledigen",
    profileSettings: "Profil & Einstellungen",
    name: "Name", email: "E‑Mail", avatar: "Avatar‑Initiale",
    profilePhoto: "Profilbild",
    uploadPhoto: "Foto auswählen",
    removePhoto: "Foto entfernen",
    appearance: "Darstellung", theme: "Theme", system: "System", light: "Hell", dark: "Dunkel",
    density: "Dichte", comfortable: "Komfort", compact: "Kompakt",
    language: "Sprache", german: "Deutsch", english: "English",
    timezone: "Zeitzone", defaultView: "Standardansicht", firstDay: "Wochenstart",
    monday: "Montag", sunday: "Sonntag",
    defaultReminder: "Standard‑Erinnerung (Min.)",
    workHours: "Arbeitszeit (Start/Ende)",
    showWeekNumbers: "KW anzeigen", showCompletedByDefault: "Erledigte standardmäßig zeigen",
    close: "Schließen", save: "Speichern",
    newEntry: "Neuer Eintrag", todo: "To‑Do", appointment: "Termin",
    title: "Titel", notes: "Notizen", date: "Datum", time: "Zeit", allDay: "Ganztägig",
    reminder: "Erinnerung", minutesBefore: "Min. vorher",
    location: "Ort", attendees: "Teilnehmer (E‑Mails)", recurrence: "Wiederholung",
    none: "Keine", daily: "Täglich", weekly: "Wöchentlich", monthly: "Monatlich",
    color: "Farbe", priority: "Priorität", low: "Niedrig", med: "Mittel", high: "Hoch",
    tags: "Tags (kommagetrennt)", cancel: "Abbrechen", create: "Anlegen",
    openXdoneY: (o: number, d: number) => `${o} offen · ${d} erledigt`,
    prioritySelectLabel: "Priorität wählen",
  },
  en: {
    appName: "Financial District",
    day: "Day", week: "Week", month: "Month",
    weekOf: (s: string) => `Week of ${s}`,
    searchTasks: "Search tasks",
    showDone: "Show ✓", hideDone: "Hide ✓",
    all: "all", today: "today", planned: "planned", done: "done",
    addForDay: "Add a task for this day…",
    noneForDay: "No tasks for this day.",
    complete: "Complete",
    profileSettings: "Profile & Settings",
    name: "Name", email: "Email", avatar: "Avatar initial",
    profilePhoto: "Profile photo",
    uploadPhoto: "Select photo",
    removePhoto: "Remove photo",
    appearance: "Appearance", theme: "Theme", system: "System", light: "Light", dark: "Dark",
    density: "Density", comfortable: "Comfortable", compact: "Compact",
    language: "Language", german: "Deutsch", english: "English",
    timezone: "Time zone", defaultView: "Default view", firstDay: "Week starts",
    monday: "Monday", sunday: "Sunday",
    defaultReminder: "Default reminder (min)",
    workHours: "Work hours (start/end)",
    showWeekNumbers: "Show week numbers", showCompletedByDefault: "Show completed by default",
    close: "Close", save: "Save",
    newEntry: "New Entry", todo: "To‑Do", appointment: "Appointment",
    title: "Title", notes: "Notes", date: "Date", time: "Time", allDay: "All day",
    reminder: "Reminder", minutesBefore: "min before",
    location: "Location", attendees: "Attendees (emails)", recurrence: "Recurrence",
    none: "None", daily: "Daily", weekly: "Weekly", monthly: "Monthly",
    color: "Color", priority: "Priority", low: "Low", med: "Med", high: "High",
    tags: "Tags (comma‑separated)", cancel: "Cancel", create: "Create",
    openXdoneY: (o: number, d: number) => `${o} open · ${d} done`,
    prioritySelectLabel: "Select priority",
  },
} as const;

type Lang = keyof typeof DICT;
function useI18n(lang: Lang) {
  const d = DICT[lang] ?? DICT.en;
  return {
    t: (k: keyof typeof d, ...a: any[]) => {
      const v: any = d[k];
      return typeof v === "function" ? v(...a) : v;
    },
    locale: lang === "de" ? "de-DE" : "en-US",
  };
}

// -----------------------------
// Typen & Utilities
// -----------------------------
export type EntryKind = "todo" | "appointment";
export type Recurrence = "none" | "daily" | "weekly" | "monthly";
export type Task = {
  id: string;
  kind: EntryKind;
  title: string;
  notes?: string;
  due?: string; // ISO
  allDay?: boolean;
  reminder?: number;
  location?: string;
  attendees?: string[];
  color?: string;
  recurrence?: Recurrence;
  priority: "low" | "med" | "high";
  tags: string[];
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

type ViewMode = "day" | "week" | "month";

type Profile = {
  name: string;
  email?: string;
  avatar?: string; // Initialen
  avatarImage?: string; // DataURL
  theme: "system" | "light" | "dark";
  defaultView: ViewMode;
  firstDay: "monday" | "sunday";
  timezone: string; // IANA from presets
  defaultReminder: number;
  workStart: string; // HH:MM
  workEnd: string;   // HH:MM
  density: "comfortable" | "compact";
  language: Lang;
  showWeekNumbers: boolean;
  showCompletedByDefault: boolean;
};

const defaultProfile: Profile = {
  name: "User",
  email: "",
  avatar: "FD",
  avatarImage: undefined,
  theme: "system",
  defaultView: "day",
  firstDay: "monday",
  timezone: "Europe/Berlin",
  defaultReminder: 30,
  workStart: "09:00",
  workEnd: "17:00",
  density: "comfortable",
  language: "de",
  showWeekNumbers: false,
  showCompletedByDefault: true,
};

type DateLike = Date | string | undefined;

const priorityDot = { low: "bg-emerald-500", med: "bg-amber-500", high: "bg-rose-600" } as const;

// ------------------
// Datumshilfsfunktionen
// ------------------
function toDate(x: DateLike): Date | undefined { if (!x) return undefined; const d = new Date(x); return isNaN(d.getTime()) ? undefined : d; }
function stripTime(d: Date): Date { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; }
function isSameDay(a?: DateLike, b?: DateLike): boolean { const da = toDate(a); const db = toDate(b); if (!da || !db) return false; return stripTime(da).getTime() === stripTime(db).getTime(); }
function addDays(d: Date, n: number): Date { const c = new Date(d); c.setDate(c.getDate() + n); return c; }
function startOfWeekX(d: Date, firstDay: "monday" | "sunday"): Date { const c = stripTime(d); const day = c.getDay(); const diff = firstDay === "monday" ? (day + 6) % 7 : day; return addDays(c, -diff); }
function startOfMonth(d: Date): Date { const c = stripTime(d); c.setDate(1); return c; }
function endOfMonth(d: Date): Date { const c = startOfMonth(d); c.setMonth(c.getMonth() + 1); c.setDate(0); return stripTime(c); }
function fmtDayLabel(d: Date, locale: string) { return d.toLocaleDateString(locale, { weekday: "short", day: "2-digit", month: "short" }); }
function fmtDateTime(iso: string | undefined, tz: string, allDay: boolean | undefined, locale: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (allDay) return d.toLocaleDateString(locale, { timeZone: tz, dateStyle: "medium" });
  return d.toLocaleString(locale, { timeZone: tz, dateStyle: "medium", timeStyle: "short" });
}

// ------------------------------------------------
// Logo – versucht zuerst das Nutzer-Bild, sonst Fallback
// ------------------------------------------------
function BrandLogo({ isLight }: { isLight: boolean }) {
  const [ok, setOk] = useState(true);
  return (
    <div className="h-[22px] w-auto flex items-center">
      {ok ? (
        <img
          src="/mnt/data/Element 2FD Logo.png"
          alt="Financial District Logo"
          className="h-[22px] w-auto object-contain"
          style={{ filter: isLight ? "invert(1)" : "none" }}
          onError={() => setOk(false)}
        />
      ) : (
        <div className="h-[22px] px-2 rounded bg-neutral-700 text-white text-xs flex items-center">FD</div>
      )}
    </div>
  );
}

// ------------------------------
// Avatar-Komponente (Profilbild)
// ------------------------------
function Avatar({ profile, size = 24 }: { profile: Profile; size?: number }) {
  return profile.avatarImage ? (
    <img src={profile.avatarImage} alt="avatar" className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full flex items-center justify-center" style={{ width: size, height: size, background: "var(--card2)", color: "var(--muted)" }}>
      {(profile.avatar || profile.name || "").slice(0, 2).toUpperCase()}
    </div>
  );
}

// ----------------------------------
// System-Theme Hook & Frame
// ----------------------------------
function usePrefersLight() {
  const [light, setLight] = useState<boolean>(() => typeof matchMedia !== 'undefined' ? matchMedia("(prefers-color-scheme: light)").matches : false);
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const m = matchMedia("(prefers-color-scheme: light)");
    const h = (e: MediaQueryListEvent) => setLight(e.matches);
    m.addEventListener("change", h);
    return () => m.removeEventListener("change", h);
  }, []);
  return light;
}

function MobileFrame({ children, isLight }: { children: React.ReactNode; isLight: boolean }) {
  const vars = isLight
    ? { "--bg": "#f7f8fa", "--card": "#ffffff", "--card2": "#f1f5f9", "--border": "#e5e7eb", "--text": "#0b0b0c", "--muted": "#6b7280" }
    : { "--bg": "#0b0b0c", "--card": "#17181b", "--card2": "#1f2937", "--border": "#2a2b2f", "--text": "#f6f6f7", "--muted": "#a1a1aa" };
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="w-full min-h-[70vh] flex items-start justify-center py-6" style={vars as React.CSSProperties}>
      <div className={`relative w-[380px] h-[760px] rounded-[28px] shadow-2xl border overflow-hidden`} style={{ background: "var(--bg)", color: "var(--text)", borderColor: "var(--border)" }}>
        {/* Statusbar */}
        <div className="absolute top-0 inset-x-0 h-8" style={{ background: isLight ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.7)" }} />
        <div className="absolute top-0 left-0 right-0 px-4 py-1 text-xs flex items-center justify-between" style={{ color: "var(--muted)" }}>
          <span>{time}</span>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--muted)" }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--muted)" }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--muted)" }} />
          </div>
        </div>
        <div className="absolute inset-0 top-6">{children}</div>
      </div>
    </div>
  );
}

// ----------------------
// Seed + Persistence (Preview)
// ----------------------
function randomId() { return Math.random().toString(36).slice(2); }
function seedTasks(baseDate: Date): Task[] {
  const tasks: Task[] = [];
  const titles = [
    ["Budget Review", "Align roadmap", "high", "appointment"],
    ["Write unit tests", "Zustand selectors", "med", "todo"],
    ["Design Onboarding", "Empty & Loading states", "high", "todo"],
    ["Email inbox zero", "Snooze low-priority", "low", "todo"],
    ["Client standup", "Share updates", "low", "appointment"],
    ["Refactor store", "Improve perf", "med", "todo"],
  ] as const;
  for (let i = -2; i <= 7; i++) {
    const day = addDays(baseDate, i);
    const count = Math.max(1, ((day.getDate() + i) % 3));
    for (let j = 0; j < count; j++) {
      const pick = titles[(day.getDate() + j) % titles.length] as any;
      const due = new Date(day);
      due.setHours(9 + (j % 6), 0, 0, 0);
      tasks.push({
        id: randomId(),
        kind: pick[3],
        title: pick[0],
        notes: pick[1],
        due: due.toISOString(),
        allDay: false,
        reminder: 30,
        location: pick[3] === "appointment" ? "Office" : undefined,
        attendees: pick[3] === "appointment" ? ["you@example.com"] : undefined,
        color: pick[3] === "appointment" ? "#0ea5e9" : "#10b981",
        recurrence: "none",
        priority: pick[2],
        tags: j % 2 ? ["work"] : ["personal"],
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }
  return tasks;
}
function loadLocal<T>(key: string, fallback: T): T { try { const raw = localStorage.getItem(key); if (!raw) return fallback; return JSON.parse(raw) as T; } catch { return fallback; } }
function saveLocal<T>(key: string, value: T) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }

// ------------------
// Zeitzonen-Presets (24 Offsets −12…+11)
// ------------------
const TZ_PRESETS: { id: string; label: { de: string; en: string }; iana: string }[] = [
  { id: "UTC-12", label: { de: "UTC−12", en: "UTC−12" }, iana: "Etc/GMT+12" },
  { id: "UTC-11", label: { de: "UTC−11", en: "UTC−11" }, iana: "Pacific/Pago_Pago" },
  { id: "UTC-10", label: { de: "UTC−10 (Honolulu)", en: "UTC−10 (Honolulu)" }, iana: "Pacific/Honolulu" },
  { id: "UTC-9", label: { de: "UTC−9 (Anchorage)", en: "UTC−9 (Anchorage)" }, iana: "America/Anchorage" },
  { id: "UTC-8", label: { de: "UTC−8 (Los Angeles)", en: "UTC−8 (Los Angeles)" }, iana: "America/Los_Angeles" },
  { id: "UTC-7", label: { de: "UTC−7 (Denver)", en: "UTC−7 (Denver)" }, iana: "America/Denver" },
  { id: "UTC-6", label: { de: "UTC−6 (Chicago)", en: "UTC−6 (Chicago)" }, iana: "America/Chicago" },
  { id: "UTC-5", label: { de: "UTC−5 (New York)", en: "UTC−5 (New York)" }, iana: "America/New_York" },
  { id: "UTC-4", label: { de: "UTC−4 (Halifax)", en: "UTC−4 (Halifax)" }, iana: "America/Halifax" },
  { id: "UTC-3", label: { de: "UTC−3 (São Paulo)", en: "UTC−3 (São Paulo)" }, iana: "America/Sao_Paulo" },
  { id: "UTC-2", label: { de: "UTC−2", en: "UTC−2" }, iana: "Etc/GMT+2" },
  { id: "UTC-1", label: { de: "UTC−1 (Azoren)", en: "UTC−1 (Azores)" }, iana: "Atlantic/Azores" },
  { id: "UTC±0", label: { de: "UTC±0 (UTC)", en: "UTC±0 (UTC)" }, iana: "UTC" },
  { id: "UTC+1", label: { de: "UTC+1 (Berlin)", en: "UTC+1 (Berlin)" }, iana: "Europe/Berlin" },
  { id: "UTC+2", label: { de: "UTC+2 (Athen)", en: "UTC+2 (Athens)" }, iana: "Europe/Athens" },
  { id: "UTC+3", label: { de: "UTC+3 (Moskau)", en: "UTC+3 (Moscow)" }, iana: "Europe/Moscow" },
  { id: "UTC+4", label: { de: "UTC+4 (Dubai)", en: "UTC+4 (Dubai)" }, iana: "Asia/Dubai" },
  { id: "UTC+5", label: { de: "UTC+5 (Karachi)", en: "UTC+5 (Karachi)" }, iana: "Asia/Karachi" },
  { id: "UTC+6", label: { de: "UTC+6 (Dhaka)", en: "UTC+6 (Dhaka)" }, iana: "Asia/Dhaka" },
  { id: "UTC+7", label: { de: "UTC+7 (Bangkok)", en: "UTC+7 (Bangkok)" }, iana: "Asia/Bangkok" },
  { id: "UTC+8", label: { de: "UTC+8 (Shanghai)", en: "UTC+8 (Shanghai)" }, iana: "Asia/Shanghai" },
  { id: "UTC+9", label: { de: "UTC+9 (Tokio)", en: "UTC+9 (Tokyo)" }, iana: "Asia/Tokyo" },
  { id: "UTC+10", label: { de: "UTC+10 (Sydney)", en: "UTC+10 (Sydney)" }, iana: "Australia/Sydney" },
  { id: "UTC+11", label: { de: "UTC+11 (Nouméa)", en: "UTC+11 (Nouméa)" }, iana: "Pacific/Noumea" },
];

// --------------------------------------
// Einzelne Task‑Zeile mit Swipe‑to‑Done
// --------------------------------------
function TaskRow({ task, tz, locale, t, onToggle, onDelete, onCyclePriority, onPlanQuick }: {
  task: Task; tz: string; locale: string; t: (k: any, ...a: any[]) => string; onToggle: () => void; onDelete: () => void; onCyclePriority: () => void; onPlanQuick: (when: "today" | "tomorrow" | "nextweek" | "none") => void;
}) {
  const THRESH = 100;
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="relative">
      <div className="absolute inset-0 rounded-2xl border pointer-events-none flex items-center pl-4" style={{ background: "rgba(16,185,129,0.15)", borderColor: "var(--border)" }}>
        <CheckCircle2 className="w-5 h-5" style={{ color: "#10b981" }} />
        <span className="ml-2 text-xs" style={{ color: "#34d399" }}>{t('complete')}</span>
      </div>
      <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.04} dragMomentum={false} onDragEnd={(_, info) => { if (info.offset.x > THRESH) onToggle(); }} whileTap={{ scale: 0.98 }} className="relative rounded-2xl p-3 border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="flex items-start gap-3">
          <button onClick={onToggle} className="mt-0.5" title="toggle">
            {task.completed ? <CheckCircle2 className="w-5 h-5" style={{ color: "#10b981" }} /> : <Circle className="w-5 h-5" style={{ color: "var(--muted)" }} />}
          </button>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className={`text-sm ${task.completed ? "line-through" : ""}`}>{task.kind === "appointment" ? "📅 " : ""}{task.title}</p>
              <div className="flex items-center gap-1 text-[10px]">
                <span className={`inline-block w-2 h-2 rounded-full ${priorityDot[task.priority]}`} />
                <span className="uppercase tracking-wide" style={{ color: "var(--muted)" }}>{t(task.priority)}</span>
              </div>
            </div>
            {task.notes && <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{task.notes}</p>}
            <div className="mt-2 flex items-center justify-between text-xs" style={{ color: "var(--muted)" }}>
              <div className="flex items-center gap-2">
                {task.due && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: "var(--card2)" }}>
                    <CalendarDays className="w-3 h-3" />
                    {fmtDateTime(task.due, tz, task.allDay, locale)}
                  </span>
                )}
                {task.location && <span className="px-2 py-1 rounded-full" style={{ background: "var(--card2)" }}>{task.location}</span>}
                {task.tags.map((tag) => (<span key={tag} className="px-2 py-1 rounded-full" style={{ background: "var(--card2)" }}>#{tag}</span>))}
              </div>
              <div className="flex items-center gap-1 opacity-90">
                <button onClick={onCyclePriority} className="px-2 py-1 rounded-lg" style={{ background: "var(--card2)" }} title="prio">prio</button>
                <button onClick={() => onPlanQuick("tomorrow")} className="px-2 py-1 rounded-lg" style={{ background: "var(--card2)" }} title="plan"><Calendar className="w-4 h-4" /></button>
                <button onClick={onDelete} className="px-2 py-1 rounded-lg" style={{ background: "var(--card2)" }} title="delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// -----------------------------------------
// Tagesliste + Eingabe (für ausgewählten Tag)
// -----------------------------------------
function DayList({ tasks, selectedDate, tz, locale, t, onAdd, onToggle, onDelete, onCyclePriority, onPlanQuick, query, setQuery, showDone, setShowDone, filter, setFilter, density, }: {
  tasks: Task[]; selectedDate: Date; tz: string; locale: string; t: (k: any, ...a: any[]) => string;
  onAdd: (title: string) => void; onToggle: (id: string) => void; onDelete: (id: string) => void; onCyclePriority: (id: string) => void; onPlanQuick: (id: string, when: "today" | "tomorrow" | "nextweek" | "none") => void;
  query: string; setQuery: (v: string) => void; showDone: boolean; setShowDone: (v: boolean) => void; filter: "all" | "today" | "planned" | "done"; setFilter: (f: "all" | "today" | "planned" | "done") => void; density: Profile["density"]; }) {
  const [newTitle, setNewTitle] = useState("");
  const pad = density === "compact" ? "py-1.5" : "py-2.5";

  const filtered = useMemo(() => {
    const todayStr = selectedDate.toDateString();
    const q = query.trim().toLowerCase();
    const list = tasks.filter((t) => {
      const isForDay = t.due ? new Date(t.due).toDateString() === todayStr : filter !== "today";
      if (!isForDay) return false;
      if (!showDone && t.completed) return false;
      if (filter === "today" && (!t.due || new Date(t.due).toDateString() !== todayStr)) return false;
      if (filter === "planned" && !t.due) return false;
      if (filter === "done" && !t.completed) return false;
      if (!q) return true;
      return t.title.toLowerCase().includes(q) || (t.notes || "").toLowerCase().includes(q) || t.tags.some((tag) => tag.toLowerCase().includes(q));
    });
    const pr = { high: 0, med: 1, low: 2 } as const;
    list.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (pr[a.priority] !== pr[b.priority]) return pr[a.priority] - pr[b.priority];
      const ad = a.due ? new Date(a.due).getTime() : Infinity;
      const bd = b.due ? new Date(b.due).getTime() : Infinity;
      return ad - bd;
    });
    return list;
  }, [tasks, selectedDate, query, showDone, filter]);

  return (
    <>
      {/* Suche + Sichtbarkeit */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('searchTasks') as string} className={`w-full border rounded-2xl ${pad} pl-9 pr-3 text-sm outline-none focus:ring-2`} style={{ background: "var(--card)", borderColor: "var(--border)" }} />
        </div>
        <button onClick={() => setShowDone(!showDone)} className={`px-3 ${pad} rounded-2xl text-xs border`} style={{ borderColor: "var(--border)", background: showDone ? "rgba(16,185,129,0.12)" : "transparent" }} title="toggle-done">{showDone ? t('showDone') : t('hideDone')}</button>
      </div>

      {/* Filter */}
      <div className="mt-3 flex items-center gap-2 text-sm">
        {(["all", "today", "planned", "done"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full border`} style={{ borderColor: "var(--border)", background: filter === f ? "var(--card2)" : "transparent" }}>
            <div className="flex items-center gap-1.5">{f === "today" && <CalendarDays className="w-4 h-4" />} {f === "planned" && <Filter className="w-4 h-4" />}<span className="capitalize">{t(f as any) as string}</span></div>
          </button>
        ))}
      </div>

      {/* Quick Add */}
      <div className="mt-3 flex gap-2">
        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newTitle.trim()) { onAdd(newTitle.trim()); setNewTitle(""); } }} placeholder={t('addForDay') as string} className={`flex-1 border rounded-2xl ${pad} px-3 text-sm outline-none focus:ring-2`} style={{ background: "var(--card)", borderColor: "var(--border)" }} />
        <button onClick={() => { if (!newTitle.trim()) return; onAdd(newTitle.trim()); setNewTitle(""); }} className="p-3 rounded-2xl text-white" style={{ background: "#10b981" }} aria-label="Add task"><Plus className="w-5 h-5" /></button>
      </div>

      {/* Liste */}
      <div className="mt-3 space-y-3 h-[calc(100%-260px)] overflow-y-auto">
        <AnimatePresence initial={false}>
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="text-center text-sm py-12" style={{ color: "var(--muted)" }}>{t('noneForDay') as string}</motion.div>
          ) : (
            filtered.map((tTask) => (
              <TaskRow key={tTask.id} task={tTask} tz={tz} locale={locale} t={t} onToggle={() => onToggle(tTask.id)} onDelete={() => onDelete(tTask.id)} onCyclePriority={() => onCyclePriority(tTask.id)} onPlanQuick={(when) => onPlanQuick(tTask.id, when)} />
            ))
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// -------------------
// Wochen-Header
// -------------------
function WeekStrip({ baseDate, selected, onSelect, firstDay, locale }: { baseDate: Date; selected: Date; onSelect: (d: Date) => void; firstDay: Profile["firstDay"]; locale: string; }) {
  const start = startOfWeekX(baseDate, firstDay);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid grid-cols-7 gap-1 mt-2">
      {days.map((d) => (
        <button key={d.toISOString()} onClick={() => onSelect(d)} className="px-2 py-2 rounded-xl border text-center" style={{ borderColor: "var(--border)", background: isSameDay(d, selected) ? "var(--card2)" : "transparent" }}>
          <div className="text-[10px]" style={{ color: "var(--muted)" }}>{d.toLocaleDateString(locale, { weekday: "short" })}</div>
          <div className="text-sm">{d.getDate()}</div>
        </button>
      ))}
    </div>
  );
}

// -----------------
// Monatskalender UI
// -----------------
function MonthGrid({ monthDate, selected, counts, onSelect, firstDay, locale }: { monthDate: Date; selected: Date; counts: Record<string, number>; onSelect: (d: Date) => void; firstDay: Profile["firstDay"]; locale: string; }) {
  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);
  const startWeek = startOfWeekX(start, firstDay);
  const afterEnd = addDays(end, 7);
  const days: Date[] = [];
  for (let d = new Date(startWeek); d < afterEnd; d = addDays(d, 1)) days.push(new Date(d));
  return (
    <div className="grid grid-cols-7 gap-2 mt-2">
      {days.map((d) => {
        const dimmed = d.getMonth() !== monthDate.getMonth();
        const key = d.toISOString().slice(0, 10);
        const count = counts[key] || 0;
        return (
          <button key={d.toISOString()} onClick={() => onSelect(d)} className="px-2 py-3 rounded-xl border text-left" style={{ borderColor: "var(--border)", background: isSameDay(d, selected) ? "var(--card2)" : "transparent", opacity: dimmed ? 0.55 : 1 }}>
            <div className="text-[10px]" style={{ color: "var(--muted)" }}>{d.toLocaleDateString(locale, { weekday: "short" })}</div>
            <div className="text-sm font-medium">{d.getDate()}</div>
            {count > 0 && <div className="mt-1 text-[10px]" style={{ color: "var(--muted)" }}>{count} open</div>}
          </button>
        );
      })}
    </div>
  );
}

// -----------------------------
// Add‑Dialog (übersichtlich, mit Sektionen)
// -----------------------------
function AddModal({ defaultDate, defaults, onClose, onCreate, t }: { defaultDate: Date; defaults: { reminder: number; tz: string; workStart: string; }; onClose: () => void; onCreate: (payload: { title: string; notes?: string; date?: string; time?: string; allDay?: boolean; reminder?: number; location?: string; attendees?: string[]; color?: string; recurrence?: Recurrence; priority: Task["priority"]; tags: string[]; kind: EntryKind; }) => void; t: (k: any, ...a: any[]) => string; }) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<EntryKind>("todo");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState<string>(defaultDate.toISOString().slice(0, 10));
  const [time, setTime] = useState<string>(defaults.workStart);
  const [allDay, setAllDay] = useState<boolean>(false);
  const [reminder, setReminder] = useState<number>(defaults.reminder);
  const [location, setLocation] = useState<string>("");
  const [attendees, setAttendees] = useState<string>("");
  const [color, setColor] = useState<string>("#10b981");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [priority, setPriority] = useState<Task["priority"]>("med");
  const [tags, setTags] = useState<string>("");

  function handleCreate() {
    if (!title.trim()) return;
    onCreate({ title: title.trim(), notes: notes.trim() || undefined, date, time: allDay ? undefined : time, allDay, reminder, location: location.trim() || undefined, attendees: attendees ? attendees.split(",").map((s) => s.trim()).filter(Boolean) : undefined, color, recurrence, priority, tags: tags.split(",").map((t) => t.trim()).filter(Boolean), kind });
    onClose();
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
        <motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} transition={{ type: "spring", stiffness: 300, damping: 28 }} className="m-auto w-[92%] max-w-[380px] rounded-2xl p-4 border space-y-3" style={{ background: "var(--card)", borderColor: "var(--border)" }} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('newEntry') as string}</h2>
            <button onClick={onClose} title={t('close') as string} className="opacity-70 hover:opacity-100"><X className="w-5 h-5"/></button>
          </div>

          {/* Typwahl */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setKind("todo" )} className="px-3 py-2 rounded-xl border text-sm" style={{ borderColor: "var(--border)", background: kind==='todo' ? "var(--card2)":"transparent" }}>{t('todo') as string}</button>
            <button onClick={() => setKind("appointment")} className="px-3 py-2 rounded-xl border text-sm" style={{ borderColor: "var(--border)", background: kind==='appointment' ? "var(--card2)":"transparent" }}>{t('appointment') as string}</button>
          </div>

          {/* Grunddaten */}
          <section className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <div className="grid gap-2">
              <label className="text-xs" style={{ color: "var(--muted)" }}>{t('title') as string}</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded-xl py-2 px-3 text-sm outline-none" style={{ borderColor: "var(--border)", background: "var(--card)" }} />
            </div>
            <div className="grid gap-2">
              <label className="text-xs" style={{ color: "var(--muted)" }}>{t('notes') as string}</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full border rounded-xl py-2 px-3 text-sm outline-none" style={{ borderColor: "var(--border)", background: "var(--card)" }} />
            </div>
          </section>

          {/* Zeit & Erinnerung */}
          <section className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs" style={{ color: "var(--muted)" }}>{t('date') as string}</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border rounded-xl py-2 px-3 text-sm mt-1" style={{ borderColor: "var(--border)", background: "var(--card)" }} />
              </div>
              <div>
                <label className="text-xs" style={{ color: "var(--muted)" }}>{t('time') as string}</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={allDay} className="w-full border rounded-xl py-2 px-3 text-sm mt-1" style={{ borderColor: "var(--border)", background: allDay ? "var(--card2)" : "var(--card)" }} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> {t('allDay') as string}</label>
              <div className="flex items-center gap-2 text-sm">
                <span>{t('reminder') as string}</span>
                <input type="number" min={0} max={1440} value={reminder} onChange={(e) => setReminder(parseInt(e.target.value||"0"))} className="w-20 border rounded-lg py-1.5 px-2" style={{ borderColor: "var(--border)", background: "var(--card)" }} />
                <span>{t('minutesBefore') as string}</span>
              </div>
            </div>
          </section>

          {/* Weitere Angaben */}
          <section className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs" style={{ color: "var(--muted)" }}>{t('location') as string}</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full border rounded-xl py-2 px-3 text-sm mt-1" style={{ borderColor: "var(--border)", background: "var(--card)" }} />
              </div>
              <div>
                <label className="text-xs" style={{ color: "var(--muted)" }}>{t('attendees') as string}</label>
                <input value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="a@b.com, c@d.com" className="w-full border rounded-xl py-2 px-3 text-sm mt-1" style={{ borderColor: "var(--border)", background: "var(--card)" }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs" style={{ color: "var(--muted)" }}>{t('recurrence') as string}</label>
                <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)} className="w-full border rounded-xl py-2 px-3 text-sm mt-1" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                  <option value="none">{t('none') as string}</option>
                  <option value="daily">{t('daily') as string}</option>
                  <option value="weekly">{t('weekly') as string}</option>
                  <option value="monthly">{t('monthly') as string}</option>
                </select>
              </div>
              <div>
                <label className="text-xs" style={{ color: "var(--muted)" }}>{t('color') as string}</label>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full border rounded-xl py-2 px-3 text-sm mt-1" style={{ borderColor: "var(--border)", background: "var(--card)" }} />
              </div>
              <div>
                <label className="text-xs" style={{ color: "var(--muted)" }}>{t('priority') as string}</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value as Task['priority'])} aria-label={t('prioritySelectLabel') as string} className="w-full border rounded-xl py-2 px-3 text-sm mt-1" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                  <option value="low">{t('low') as string}</option>
                  <option value="med">{t('med') as string}</option>
                  <option value="high">{t('high') as string}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs" style={{ color: "var(--muted)" }}>{t('tags') as string}</label>
              <input value={tags} onChange={(e) => setTags(e.target.value)} className="w-full border rounded-xl py-2 px-3 text-sm mt-1" style={{ borderColor: "var(--border)", background: "var(--card)" }} />
            </div>
          </section>

          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="px-3 py-2 rounded-xl border text-sm" style={{ borderColor: "var(--border)" }}>{t('cancel') as string}</button>
            <button onClick={handleCreate} className="px-3 py-2 rounded-xl text-white text-sm inline-flex items-center gap-1" style={{ background: "#10b981" }}><Save className="w-4 h-4"/>{t('create') as string}</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// -----------------------------
// Settings/Profil Drawer (erweitert)
// -----------------------------
function SettingsDrawer({ profile, onChange, onClose, t, lang }: { profile: Profile; onChange: (p: Profile) => void; onClose: () => void; t: (k: any, ...a: any[]) => string; lang: Lang; }) {
  const [edit, setEdit] = useState<Profile>(profile);
  useEffect(() => setEdit(profile), [profile]);

  // Hilfsfunktion: Datei → DataURL
  function fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await fileToDataURL(file);
    setEdit({ ...edit, avatarImage: data });
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
        <motion.div initial={{ x: 40 }} animate={{ x: 0 }} exit={{ x: 40 }} transition={{ type: "spring", stiffness: 300, damping: 28 }} className="ml-auto h-full w-[88%] max-w-[380px] p-4 border-l" style={{ background: "var(--card)", borderColor: "var(--border)" }} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--card2)" }}><User className="w-4 h-4"/></div>
              <h2 className="text-lg font-semibold">{t('profileSettings') as string}</h2>
            </div>
            <button onClick={onClose} className="opacity-70 hover:opacity-100"><X className="w-5 h-5"/></button>
          </div>

          <div className="space-y-3 overflow-y-auto h-[calc(100%-88px)] pr-1">
            {/* Profil */}
            <section className="rounded-xl border p-3 space-y-3" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-3">
                <Avatar profile={edit} size={48} />
                <div className="flex items-center gap-2">
                  <label className="px-3 py-2 rounded-xl border text-sm cursor-pointer inline-flex items-center gap-2" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                    <ImageIcon className="w-4 h-4" /> {t('uploadPhoto') as string}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  </label>
                  {edit.avatarImage && (
                    <button onClick={() => setEdit({ ...edit, avatarImage: undefined })} className="px-3 py-2 rounded-xl border text-sm" style={{ borderColor: "var(--border)" }}>{t('removePhoto') as string}</button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs" style={{ color: "var(--muted)" }}>{t('name') as string}</label>
                  <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="w-full border rounded-xl py-2 px-3 text-sm mt-1" style={{ borderColor: "var(--border)", background: "var(--card)" }} />
                </div>
                <div>
                  <label className="text-xs" style={{ color: "var(--muted)" }}>{t('email') as string}</label>
                  <input value={edit.email || ""} onChange={(e) => setEdit({ ...edit, email: e.target.value })} className="w-full border rounded-xl py-2 px-3 text-sm mt-1" style={{ borderColor: "var(--border)", background: "var(--card)" }} />
                </div>
                <div>
                  <label className="text-xs" style={{ color: "var(--muted)" }}>{t('avatar') as string}</label>
                  <input value={edit.avatar || ""} maxLength={2} onChange={(e) => setEdit({ ...edit, avatar: e.target.value.toUpperCase() })} className="w-full border rounded-xl py-2 px-3 text-sm mt-1" style={{ borderColor: "var(--border)", background: "var(--card)" }} />
                </div>
              </div>
            </section>

            {/* Darstellung */}
            <section className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="mb-2 text-xs" style={{ color: "var(--muted)" }}>{t('appearance') as string}</div>
              <div className="grid grid-cols-3 gap-2">
                {(["system", "light", "dark"] as const).map((m) => (
                  <button key={m} onClick={() => setEdit({ ...edit, theme: m })} className="px-3 py-2 rounded-xl border text-sm" style={{ borderColor: "var(--border)", background: edit.theme===m ? "var(--card2)" : "transparent" }}>{t(m as any) as string}</button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div>
                  <label className="text-xs" style={{ color: "var(--muted)" }}>{t('density') as string}</label>
                  <select value={edit.density} onChange={(e) => setEdit({ ...edit, density: e.target.value as any })} className="w-full border rounded-xl py-2 px-3 text-sm mt-1" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                    <option value="comfortable">{t('comfortable') as string}</option>
                    <option value="compact">{t('compact') as string}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs" style={{ color: "var(--muted)" }}>{t('language') as string}</label>
                  <select value={edit.language} onChange={(e) => setEdit({ ...edit, language: e.target.value as Lang })} className="w-full border rounded-xl py-2 px-3 text-sm mt-1" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                    <option value="de">{t('german') as string}</option>
                    <option value="en">{t('english') as string}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs" style={{ color: "var(--muted)" }}>{t('timezone') as string}</label>
                  <select value={edit.timezone} onChange={(e) => setEdit({ ...edit, timezone: e.target.value })} className="w-full border rounded-xl py-2 px-3 text-sm mt-1" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                    {TZ_PRESETS.map((z) => (<option key={z.iana} value={z.iana}>{z.label[lang]}</option>))}
                  </select>
                </div>
              </div>
            </section>

            {/* Kalender & Defaults */}
            <section className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="mb-2 text-xs" style={{ color: "var(--muted)" }}>Kalender & Defaults</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs" style={{ color: "var(--muted)" }}>{t('defaultView') as string}</label>
                  <select value={edit.defaultView} onChange={(e) => setEdit({ ...edit, defaultView: e.target.value as ViewMode })} className="w-full border rounded-xl py-2 px-3 text-sm mt-1" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                    <option value="day">{t('day') as string}</option>
                    <option value="week">{t('week') as string}</option>
                    <option value="month">{t('month') as string}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs" style={{ color: "var(--muted)" }}>{t('firstDay') as string}</label>
                  <select value={edit.firstDay} onChange={(e) => setEdit({ ...edit, firstDay: e.target.value as any })} className="w-full border rounded-xl py-2 px-3 text-sm mt-1" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                    <option value="monday">{t('monday') as string}</option>
                    <option value="sunday">{t('sunday') as string}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs" style={{ color: "var(--muted)" }}>{t('defaultReminder') as string}</label>
                  <input type="number" min={0} max={1440} value={edit.defaultReminder} onChange={(e) => setEdit({ ...edit, defaultReminder: parseInt(e.target.value||"0") })} className="w-full border rounded-xl py-2 px-3 text-sm mt-1" style={{ borderColor: "var(--border)", background: "var(--card)" }} />
                </div>
                <div>
                  <label className="text-xs" style={{ color: "var(--muted)" }}>{t('workHours') as string}</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <input type="time" value={edit.workStart} onChange={(e) => setEdit({ ...edit, workStart: e.target.value })} className="w-full border rounded-xl py-2 px-3 text-sm" style={{ borderColor: "var(--border)", background: "var(--card)" }} />
                    <input type="time" value={edit.workEnd} onChange={(e) => setEdit({ ...edit, workEnd: e.target.value })} className="w-full border rounded-xl py-2 px-3 text-sm" style={{ borderColor: "var(--border)", background: "var(--card)" }} />
                  </div>
                </div>
                <div className="col-span-2 flex items-center gap-4 mt-1">
                  <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.showWeekNumbers} onChange={(e) => setEdit({ ...edit, showWeekNumbers: e.target.checked })}/>{t('showWeekNumbers') as string}</label>
                  <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.showCompletedByDefault} onChange={(e) => setEdit({ ...edit, showCompletedByDefault: e.target.checked })}/>{t('showCompletedByDefault') as string}</label>
                </div>
              </div>
            </section>
          </div>

          <div className="flex items-center justify-end gap-2 mt-3">
            <button onClick={onClose} className="px-3 py-2 rounded-xl border text-sm" style={{ borderColor: "var(--border)" }}>{t('close') as string}</button>
            <button onClick={() => { onChange(edit); onClose(); }} className="px-3 py-2 rounded-xl text-white text-sm inline-flex items-center gap-1" style={{ background: "#10b981" }}><Save className="w-4 h-4"/>{t('save') as string}</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// -------------------------------
// Hauptkomponente – App‑Vorschau
// -------------------------------
export default function App() {
  // Profile zuerst laden, um Standardansicht/Theme/Sprache zu übernehmen
  const [profile, setProfile] = useState<Profile>(() => loadLocal("fd_profile", defaultProfile));
  const prefersLight = usePrefersLight();
  const isLight = profile.theme === "light" || (profile.theme === "system" && prefersLight);
  const { t, locale } = useI18n(profile.language);

  const [view, setView] = useState<ViewMode>(() => profile.defaultView || "day");
  const [selectedDate, setSelectedDate] = useState<Date>(stripTime(new Date()));
  const [tasks, setTasks] = useState<Task[]>(() => loadLocal("fd_tasks", seedTasks(new Date())));

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "today" | "planned" | "done">("all");
  const [showDone, setShowDone] = useState<boolean>(profile.showCompletedByDefault);

  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Persistenz
  useEffect(() => saveLocal("fd_tasks", tasks), [tasks]);
  useEffect(() => saveLocal("fd_profile", profile), [profile]);

  // Statistiken pro Tag
  const taskCountByDay = useMemo(() => {
    const m: Record<string, number> = {};
    for (const tsk of tasks) {
      const d = tsk.due ? tsk.due.slice(0, 10) : "";
      if (!d) continue;
      m[d] = (m[d] || 0) + (tsk.completed ? 0 : 1);
    }
    return m;
  }, [tasks]);

  // Helper: Task hinzufügen (Day QuickAdd)
  function addTaskForSelected(title: string) {
    const now = new Date();
    const due = new Date(selectedDate);
    const [hh, mm] = profile.workStart.split(":");
    due.setHours(parseInt(hh || "9"), parseInt(mm || "0"), 0, 0);
    const tsk: Task = { id: randomId(), kind: "todo", title, notes: "", due: due.toISOString(), allDay: false, reminder: profile.defaultReminder, priority: "med", tags: [], completed: false, createdAt: now.toISOString(), updatedAt: now.toISOString() };
    setTasks((prev) => [tsk, ...prev]);
  }

  // Helper: Task hinzufügen (AddModal)
  function createFromModal(p: { title: string; notes?: string; date?: string; time?: string; allDay?: boolean; reminder?: number; location?: string; attendees?: string[]; color?: string; recurrence?: Recurrence; priority: Task["priority"]; tags: string[]; kind: EntryKind; }) {
    const now = new Date();
    let due: string | undefined = undefined;
    if (p.date) {
      const [hh = "09", mm = "00"] = (p.time || profile.workStart || "09:00").split(":");
      const d = new Date(`${p.date}T${(p.allDay ? "00" : hh).padStart(2, "0")}:${(p.allDay ? "00" : mm).padStart(2, "0")}:00`);
      due = isNaN(d.getTime()) ? undefined : d.toISOString();
    } else {
      const d = new Date(selectedDate);
      const [hh, mm] = (p.time || profile.workStart).split(":");
      d.setHours(parseInt(hh || "9"), parseInt(mm || "0"), 0, 0);
      due = d.toISOString();
    }
    const tsk: Task = { id: randomId(), kind: p.kind, title: p.title, notes: p.notes, due, allDay: p.allDay, reminder: p.reminder ?? profile.defaultReminder, location: p.location, attendees: p.attendees, color: p.color, recurrence: p.recurrence, priority: p.priority, tags: p.tags, completed: false, createdAt: now.toISOString(), updatedAt: now.toISOString() };
    setTasks((prev) => [tsk, ...prev]);
  }

  // Mutationen
  function toggleTask(id: string) { setTasks((prev) => prev.map((tsk) => (tsk.id === id ? { ...tsk, completed: !tsk.completed, updatedAt: new Date().toISOString() } : tsk))); }
  function deleteTask(id: string) { setTasks((prev) => prev.filter((tsk) => tsk.id !== id)); }
  function cyclePriority(id: string) { setTasks((prev) => prev.map((tsk) => { if (tsk.id !== id) return tsk; const order: Task["priority"][] = ["low", "med", "high"]; const next = order[(order.indexOf(tsk.priority) + 1) % order.length]; return { ...tsk, priority: next, updatedAt: new Date().toISOString() }; })); }
  function planQuick(id: string, when: "today" | "tomorrow" | "nextweek" | "none") { setTasks((prev) => prev.map((tsk) => { if (tsk.id !== id) return tsk; const base = stripTime(new Date()); let d: Date | undefined; if (when === "today") d = base; else if (when === "tomorrow") d = addDays(base, 1); else if (when === "nextweek") d = addDays(base, 7); return { ...tsk, due: when === "none" ? undefined : new Date(d!.setHours(9, 0, 0, 0)).toISOString(), updatedAt: new Date().toISOString() }; })); }

  function navigate(offset: number) {
    if (view === "day") setSelectedDate(addDays(selectedDate, offset));
    else if (view === "week") setSelectedDate(addDays(selectedDate, offset * 7));
    else if (view === "month") { const d = new Date(selectedDate); d.setMonth(d.getMonth() + offset); setSelectedDate(stripTime(d)); }
  }

  const openCount = tasks.filter((tsk) => !tsk.completed).length;
  const doneCount = tasks.length - openCount;

  return (
    <MobileFrame isLight={isLight}>
      <div className="h-full w-full flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
        {/* Header */}
        <header className="px-4 pt-6 pb-3" style={{ borderBottom: `1px solid var(--border)` }}>
          <div className="flex items-center justify-between gap-2">
            {/* Nur Logo – keine Schrift neben dem Logo */}
            <div className="flex items-center gap-2">
              <BrandLogo isLight={isLight} />
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:opacity-80" title="Prev"><ChevronLeft className="w-5 h-5" /></button>
              <div className="px-3 py-1 rounded-xl border text-sm" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                {view === "day" && fmtDayLabel(selectedDate, locale)}
                {view === "week" && (t('weekOf', fmtDayLabel(startOfWeekX(selectedDate, profile.firstDay), locale)) as string)}
                {view === "month" && selectedDate.toLocaleDateString(locale, { month: "long", year: "numeric" })}
              </div>
              <button onClick={() => navigate(1)} className="p-2 rounded-xl hover:opacity-80" title="Next"><ChevronRight className="w-5 h-5" /></button>
            </div>
            <button className="p-1.5 rounded-full hover:opacity-90" onClick={() => setShowSettings(true)} title={t('profileSettings') as string}>
              {/* Avatar als Settings-Trigger */}
              <Avatar profile={profile} size={28} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {(["day", "week", "month"] as const).map((m) => (
              <button key={m} onClick={() => setView(m)} className="px-3 py-1.5 rounded-xl border text-sm" style={{ borderColor: "var(--border)", background: view === m ? "var(--card2)" : "transparent" }}>
                {m === "day" && <span className="inline-flex items-center gap-1"><Clock3 className="w-4 h-4"/>{t('day') as string}</span>}
                {m === "week" && <span>{t('week') as string}</span>}
                {m === "month" && <span>{t('month') as string}</span>}
              </button>
            ))}
          </div>

          <WeekStrip baseDate={selectedDate} selected={selectedDate} onSelect={(d) => setSelectedDate(stripTime(d))} firstDay={profile.firstDay} locale={locale} />
        </header>

        <main className="flex-1 p-4 overflow-y-auto relative">
          {(view === "day" || view === "week") && (
            <DayList tasks={tasks} selectedDate={selectedDate} tz={profile.timezone} locale={locale} t={t} onAdd={addTaskForSelected} onToggle={toggleTask} onDelete={deleteTask} onCyclePriority={cyclePriority} onPlanQuick={(id, when) => planQuick(id, when)} query={query} setQuery={setQuery} showDone={showDone} setShowDone={setShowDone} filter={filter} setFilter={setFilter} density={profile.density} />
          )}
          {view === "month" && (
            <div className="space-y-3">
              <MonthGrid monthDate={selectedDate} selected={selectedDate} counts={taskCountByDay} onSelect={(d) => setSelectedDate(stripTime(d))} firstDay={profile.firstDay} locale={locale} />
              <div className="pt-2" style={{ borderTop: `1px solid var(--border)` }}>
                <div className="text-sm mb-2" style={{ color: "var(--muted)" }}>{fmtDayLabel(selectedDate, locale)}</div>
                <DayList tasks={tasks} selectedDate={selectedDate} tz={profile.timezone} locale={locale} t={t} onAdd={addTaskForSelected} onToggle={toggleTask} onDelete={deleteTask} onCyclePriority={cyclePriority} onPlanQuick={(id, when) => planQuick(id, when)} query={query} setQuery={setQuery} showDone={showDone} setShowDone={setShowDone} filter={filter} setFilter={setFilter} density={profile.density} />
              </div>
            </div>
          )}

          {/* Floating Action Button */}
          <button onClick={() => setShowAdd(true)} className="absolute bottom-4 right-4 p-4 rounded-full shadow-xl" style={{ background: "#10b981" }} title="New">
            <Plus className="w-6 h-6 text-white" />
          </button>
        </main>

        <footer className="px-6 py-3" style={{ borderTop: `1px solid var(--border)` }}>
          <div className="text-[11px] flex items-center justify-between" style={{ color: "var(--muted)" }}>
            <span>{t('openXdoneY', openCount, doneCount) as string}</span>
            <span className="inline-flex items-center gap-2">
              <Avatar profile={profile} size={16} />
              <span>{profile.name || "User"}</span>
            </span>
          </div>
        </footer>

        {/* Modals */}
        {showAdd && (
          <AddModal defaultDate={selectedDate} defaults={{ reminder: profile.defaultReminder, tz: profile.timezone, workStart: profile.workStart }} onClose={() => setShowAdd(false)} onCreate={createFromModal} t={t} />
        )}
        {showSettings && (
          <SettingsDrawer profile={profile} onChange={(p) => { setProfile(p); }} onClose={() => setShowSettings(false)} t={t} lang={profile.language} />
        )}
      </div>
    </MobileFrame>
  );
}
