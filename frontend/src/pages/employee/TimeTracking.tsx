import { useState, useEffect, useRef, useCallback } from "react";
import "../../styles/employeeStyling/TimeTracking.css";
import { api } from "../../lib/api";
import {
  loadActiveTimer,
  saveActiveTimer,
  clearActiveTimer,
  elapsedFromStored,
} from "../../lib/activeTimerStorage";

export interface TimeTrackerTimerUpdate {
  isRunning: boolean;
  elapsed: number;
}

/* ── Types ──────────────────────────────────────────────── */
interface TimeEntry {
  id: string;
  project: string;
  task: string;
  start: Date;
  end: Date;
  duration: number;
  tag: string;
}

interface Project {
  id: string;
  name: string;
  color: string;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  leaving?: boolean;
}

/* ── Constants ──────────────────────────────────────────── */
const PROJECT_PALETTE = ["#EC4899", "#a855f7", "#8B5CF6", "#c084fc", "#06b6d4", "#10b981"];

const TAGS = ["Development", "Design", "Meeting", "Research", "Review", "Testing"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAILY_GOAL_HOURS = 8;

export interface TimeTrackingAssignment {
  assignmentId: string;
  assignmentStatus: string;
  name: string;
}

function isAcceptedStatus(status: string | undefined): boolean {
  return (status ?? "").trim().toLowerCase() === "accepted";
}

function projectColor(name: string, projects: Project[]): string {
  return projects.find((p) => p.name === name)?.color ?? "#a855f7";
}

function buildAcceptedProjects(
  items: { id?: string; assignmentId?: string; assignmentStatus?: string; status?: string; name?: string; project_name?: string }[]
): Project[] {
  return items
    .filter((a) => isAcceptedStatus(a.assignmentStatus ?? a.status))
    .map((a, i) => ({
      id: String(a.assignmentId ?? a.id),
      name: (a.name ?? a.project_name ?? "").trim(),
    }))
    .filter((a) => a.name.length > 0)
    .map((a, i) => ({
      ...a,
      color: PROJECT_PALETTE[i % PROJECT_PALETTE.length],
    }));
}

function mapApiAssignments(data: { id: string; status: string; project_name: string }[]): Project[] {
  return buildAcceptedProjects(
    data.map((a) => ({
      assignmentId: a.id,
      assignmentStatus: a.status,
      name: a.project_name,
    }))
  );
}

/* ── Helpers ─────────────────────────────────────────────── */
function fmtTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
function fmtDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
function fmtDate(d: Date): string { return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function fmtClock(d: Date): string { return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }); }

function getWeekTotals(entries: TimeEntry[]): number[] {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const totals = new Array(7).fill(0);
  entries.forEach((e) => {
    const diff = Math.floor((e.start.getTime() - monday.getTime()) / 86400000);
    if (diff >= 0 && diff < 7) totals[diff] += e.duration;
  });
  return totals;
}
function todayTotal(entries: TimeEntry[]): number {
  const now = new Date();
  return entries.filter((e) => e.start.getDate() === now.getDate() && e.start.getMonth() === now.getMonth()).reduce((s, e) => s + e.duration, 0);
}
function weekTotal(entries: TimeEntry[]): number { return getWeekTotals(entries).reduce((a, b) => a + b, 0); }

/* ── Modal ───────────────────────────────────────────────── */
interface ManualModalProps {
  onClose: () => void;
  onSave: (entry: Omit<TimeEntry, "id">) => void;
  projects: Project[];
}

function ManualModal({ onClose, onSave, projects }: ManualModalProps) {
  const [project, setProject] = useState(projects[0]?.name ?? "");
  const [task, setTask] = useState("");
  const [tag, setTag] = useState(TAGS[0]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!project) { setError("Select a project first."); return; }
    if (!task.trim()) { setError("Task description is required."); return; }
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);
    if (end <= start) { setError("End time must be after start time."); return; }
    onSave({ project, task: task.trim(), start, end, duration: Math.round((end.getTime() - start.getTime()) / 1000), tag });
    onClose();
  };

  return (
    <div className="tt-modal-backdrop" style={S.backdrop}>
      <div className="tt-modal" style={S.modal}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <span style={{ fontSize:17, fontWeight:700, color:"#f1eeff", letterSpacing:"-0.3px" }}>Log Time Manually</span>
          <button style={S.iconBtn} onClick={onClose}>✕</button>
        </div>
        {error && <div style={S.errorBox}>{error}</div>}
        <div style={S.field}>
          <label style={S.label}>Project</label>
          <select className="tt-select tt-input" style={S.input} value={project} onChange={(e) => setProject(e.target.value)}>
            {projects.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </div>
        <div style={S.field}>
          <label style={S.label}>Task Description</label>
          <input className="tt-input" style={S.input} type="text" placeholder="What did you work on?" value={task} onChange={(e) => setTask(e.target.value)} />
        </div>
        <div style={S.field}>
          <label style={S.label}>Tag</label>
          <select className="tt-select tt-input" style={S.input} value={tag} onChange={(e) => setTag(e.target.value)}>
            {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          <div style={S.field}><label style={S.label}>Date</label><input className="tt-input" style={S.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div style={S.field}><label style={S.label}>Start</label><input className="tt-input" style={S.input} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
          <div style={S.field}><label style={S.label}>End</label><input className="tt-input" style={S.input} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <button style={S.btnGhost} onClick={onClose}>Cancel</button>
          <button style={S.btnPrimary} onClick={handleSave}>Save Entry</button>
        </div>
      </div>
    </div>
  );
}

/* ── Toast ───────────────────────────────────────────────── */
function ToastItem({ toast }: { toast: Toast }) {
  const bg = toast.type === "success" ? "#10B981" : toast.type === "error" ? "#EF4444" : "#8B5CF6";
  return (
    <div className={`tt-toast${toast.leaving ? " is-leaving" : ""}`} style={{ ...S.toast, background: bg }}>
      {toast.message}
    </div>
  );
}

/* ── Weekly Bar Chart ───────────────────────────────────── */
function WeeklyChart({ entries }: { entries: TimeEntry[] }) {
  const totals = getWeekTotals(entries);
  const max = Math.max(...totals, DAILY_GOAL_HOURS * 3600);
  const todayIdx = (new Date().getDay() + 6) % 7;
  return (
    <div style={S.chartWrap}>
      <div style={S.chartBars}>
        {DAYS.map((day, i) => {
          const pct = max > 0 ? (totals[i] / max) * 100 : 0;
          const isToday = i === todayIdx;
          return (
            <div key={day} className={`tt-day-col${isToday ? " is-today" : ""}`} style={S.dayCol}>
              <div style={S.barTrack}>
                <div className="tt-day-bar" style={{ ...S.bar, height:`${pct}%`, background: isToday ? "linear-gradient(180deg,#EC4899,#a855f7)" : "rgba(168,85,247,0.4)", boxShadow: isToday ? "0 0 16px rgba(236,72,153,0.4)" : "none" }} />
              </div>
              <span style={{ ...S.dayLabel, color: isToday ? "#EC4899" : "rgba(255,255,255,0.35)", fontWeight: isToday ? 700 : 400 }}>{day}</span>
              {totals[i] > 0 && <span style={S.dayHours}>{fmtDuration(totals[i])}</span>}
            </div>
          );
        })}
      </div>
      <div style={{ ...S.goalLine, bottom:`${((DAILY_GOAL_HOURS * 3600) / max) * 80}%` }}>
        <span style={S.goalLabel}>{DAILY_GOAL_HOURS}h goal</span>
      </div>
    </div>
  );
}

/* ── Project Breakdown ──────────────────────────────────── */
function ProjectBreakdown({ entries, projects }: { entries: TimeEntry[]; projects: Project[] }) {
  const byProject: Record<string, number> = {};
  entries.forEach((e) => { byProject[e.project] = (byProject[e.project] || 0) + e.duration; });
  const total = Object.values(byProject).reduce((a, b) => a + b, 0) || 1;
  return (
    <div style={{ padding:"4px 0" }}>
      {Object.entries(byProject).sort((a,b) => b[1]-a[1]).map(([proj, secs]) => {
        const pct = Math.round((secs / total) * 100);
        const color = projectColor(proj, projects);
        return (
          <div key={proj} style={{ marginBottom:18 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ fontSize:13, fontWeight:600, color:"#f1eeff" }}>{proj}</span>
              <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>{fmtDuration(secs)} · {pct}%</span>
            </div>
            <div style={S.progTrack}>
              <div className="tt-progress-fill" style={{ ...S.progFill, width:`${pct}%`, background:`linear-gradient(90deg, ${color}, #EC4899)` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────── */
interface TimeTrackerProps {
  onTimerUpdate?: (state: TimeTrackerTimerUpdate) => void;
  /** Accepted assignments from dashboard (same data as Projects page) */
  assignments?: TimeTrackingAssignment[];
  /** When false, dashboard is still loading project assignments */
  assignmentsReady?: boolean;
}

export default function TimeTracker({ onTimerUpdate, assignments, assignmentsReady = true }: TimeTrackerProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [workProjects, setWorkProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [activeProject, setActiveProject] = useState("");
  const [activeTask, setActiveTask] = useState("");
  const [activeTag, setActiveTag] = useState(TAGS[0]);
  const [tab, setTab] = useState<"log"|"weekly"|"breakdown">("log");
  const [showModal, setShowModal] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [filterProject, setFilterProject] = useState("All");
  const startRef = useRef<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRestoredRef = useRef(false);

  const applyWorkProjects = useCallback((list: Project[]) => {
    setWorkProjects(list);
    setActiveProject((prev) => {
      if (prev && list.some((p) => p.name === prev)) return prev;
      return list[0]?.name ?? "";
    });
  }, []);

  // Prefer dashboard assignments (updates immediately after accept)
  useEffect(() => {
    if (assignments === undefined) return;
    if (!assignmentsReady) {
      setProjectsLoading(true);
      return;
    }
    const fromDashboard = buildAcceptedProjects(
      assignments.map((a) => ({
        assignmentId: a.assignmentId,
        assignmentStatus: a.assignmentStatus,
        name: a.name,
      }))
    );
    applyWorkProjects(fromDashboard);
    setProjectsLoading(false);
  }, [assignments, assignmentsReady, applyWorkProjects]);

  // Fallback fetch when not passed from parent
  useEffect(() => {
    if (assignments !== undefined) return;
    setProjectsLoading(true);
    api
      .get<{ id: string; status: string; project_name: string }[]>("/employee-projects/my")
      .then((data) => applyWorkProjects(mapApiAssignments(data)))
      .catch(() => applyWorkProjects([]))
      .finally(() => setProjectsLoading(false));
  }, [assignments, applyWorkProjects]);

  // Load logs from backend on mount
  useEffect(() => {
    api.get<any[]>('/time-tracking/my').then(data => {
      setEntries(data.map(e => ({
        id: e.id,
        project: e.project,
        task: e.task,
        tag: e.tag ?? '',
        start: new Date(e.start_time),
        end: new Date(e.end_time),
        duration: e.duration,
      })));
    }).catch(() => {});
  }, []);

  // Restore running timer after navigation or page refresh
  useEffect(() => {
    if (timerRestoredRef.current || projectsLoading) return;
    const stored = loadActiveTimer();
    if (!stored) {
      timerRestoredRef.current = true;
      return;
    }
    const start = new Date(stored.startTime);
    if (Number.isNaN(start.getTime())) {
      clearActiveTimer();
      timerRestoredRef.current = true;
      return;
    }
    startRef.current = start;
    const name = stored.activeProject;
    if (workProjects.some((p) => p.name === name)) {
      setActiveProject(name);
    }
    setActiveTask(stored.activeTask);
    setActiveTag(stored.activeTag);
    setElapsed(elapsedFromStored(stored.startTime));
    setIsRunning(true);
    timerRestoredRef.current = true;
  }, [workProjects, projectsLoading]);

  useEffect(() => {
    onTimerUpdate?.({ isRunning, elapsed });
  }, [isRunning, elapsed, onTimerUpdate]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (startRef.current) {
          setElapsed(elapsedFromStored(startRef.current.toISOString()));
        } else {
          setElapsed((s) => s + 1);
        }
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  const addToast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Date.now().toString();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.map((x) => x.id === id ? { ...x, leaving: true } : x));
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 350);
    }, 3000);
  }, []);

  const handleStartStop = () => {
    if (!isRunning) {
      if (!activeProject) {
        addToast("Select an accepted project before starting the timer.", "error");
        return;
      }
      const start = new Date();
      startRef.current = start;
      setElapsed(0);
      setIsRunning(true);
      saveActiveTimer({
        startTime: start.toISOString(),
        activeProject,
        activeTask,
        activeTag,
      });
      addToast("Timer started", "info");
    } else {
      setIsRunning(false);
      clearActiveTimer();
      const duration = startRef.current
        ? elapsedFromStored(startRef.current.toISOString())
        : elapsed;
      if (duration < 5) {
        addToast("Entry too short — discarded.", "error");
        setElapsed(0);
        startRef.current = null;
        return;
      }
      const start = startRef.current!;
      const end = new Date();
      const entry: Omit<TimeEntry, "id"> = {
        project: activeProject,
        task: activeTask || "Untitled task",
        start,
        end,
        duration,
        tag: activeTag,
      };
      saveEntry(entry);
      setElapsed(0);
      startRef.current = null;
    }
  };

  const saveEntry = async (entry: Omit<TimeEntry, "id">) => {
    try {
      const saved = await api.post<any>('/time-tracking/', {
        project: entry.project,
        task: entry.task,
        tag: entry.tag,
        start_time: entry.start.toISOString(),
        end_time: entry.end.toISOString(),
        duration: entry.duration,
      });
      setEntries(prev => [{ ...entry, id: saved.id }, ...prev]);
      addToast(`Logged ${fmtDuration(entry.duration)} to ${entry.project}`, "success");
    } catch {
      addToast("Failed to save entry", "error");
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      await api.delete(`/time-tracking/${id}`);
      setEntries(prev => prev.filter(e => e.id !== id));
      addToast("Entry deleted", "error");
    } catch {
      addToast("Failed to delete entry", "error");
    }
  };

  const addManual = (entry: Omit<TimeEntry, "id">) => saveEntry(entry);

  const todaySecs = todayTotal(entries) + (isRunning ? elapsed : 0);
  const weekSecs  = weekTotal(entries)  + (isRunning ? elapsed : 0);
  const goalPct   = Math.min(Math.round((todaySecs / (DAILY_GOAL_HOURS * 3600)) * 100), 100);
  const filteredEntries = filterProject === "All" ? entries : entries.filter((e) => e.project === filterProject);

  const statCards = [
    { label:"Today",      value: fmtDuration(todaySecs), icon:"⏱", color:"#EC4899" },
    { label:"This Week",  value: fmtDuration(weekSecs),  icon:"📅", color:"#a855f7" },
    { label:"Daily Goal", value: `${goalPct}%`,           icon:"🎯", color:"#c084fc" },
    { label:"Entries",    value: entries.length.toString(),icon:"📋", color:"#8B5CF6" },
  ];

  return (
    <div className="tt-root" style={S.root}>

      {/* ── Header ── */}
      <div className="tt-page-header" style={S.header}>
        <div>
          <h1 style={S.h1}>Time Tracker</h1>
          <p style={S.subtitle}>
            {isRunning && <span className="tt-live-dot" />}
            {isRunning ? "Recording session…" : new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" })}
          </p>
        </div>
        <button
          className="tt-btn tt-icon-btn"
          style={S.ghostBtn}
          onClick={() => setShowModal(true)}
          disabled={workProjects.length === 0}
          title={workProjects.length === 0 ? "Accept a project first" : undefined}
        >
          + Manual Log
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div style={S.statGrid}>
        {statCards.map((c, i) => (
          <div key={i} className="tt-stat-card" style={{ ...S.statCard, borderColor:`${c.color}33` }}>
            <div style={{ ...S.statIconWrap, background:`${c.color}18` }}>
              <span style={S.statIcon}>{c.icon}</span>
            </div>
            <div>
              <div style={S.statLabel}>{c.label}</div>
              <div style={{ ...S.statValue, color: c.color }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Daily Goal Progress ── */}
      <div style={S.goalBar}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <span style={S.smallLabel}>Daily Progress</span>
          <span style={{ ...S.smallLabel, color:"#EC4899", fontWeight:600 }}>{fmtDuration(todaySecs)} / {DAILY_GOAL_HOURS}h</span>
        </div>
        <div style={S.progTrack}>
          <div className="tt-progress-fill" style={{ ...S.progFill, width:`${goalPct}%`, background: goalPct >= 100 ? "#10B981" : "linear-gradient(90deg,#EC4899,#a855f7)" }} />
        </div>
        <div style={{ textAlign:"right", marginTop:4, fontSize:10, color:"rgba(255,255,255,0.25)" }}>{goalPct}% complete</div>
      </div>

      {/* ── Project selection (accepted assignments + Development) ── */}
      <div className="tt-project-section" style={S.projectSection}>
        <div style={S.projectSectionHead}>
          <span style={S.projectSectionTitle}>Project you&apos;re working on</span>
          <span style={S.projectSectionHint}>
            {projectsLoading
              ? "Loading your projects…"
              : "Only projects you have accepted under My Projects"}
          </span>
        </div>
        {projectsLoading ? (
          <div style={S.projectLoading}>Loading projects…</div>
        ) : workProjects.length === 0 ? (
          <p style={S.projectEmptyHint}>
            No accepted projects yet. Go to <strong>Projects</strong>, accept an assignment from your manager, then return here to track time.
          </p>
        ) : (
          <div className="tt-project-grid" style={S.projectGrid}>
            {workProjects.map((p) => {
              const selected = activeProject === p.name;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`tt-project-chip${selected ? " is-selected" : ""}`}
                  style={{
                    ...S.projectChip,
                    borderColor: selected ? p.color : "rgba(196,132,252,0.25)",
                    background: selected ? `${p.color}28` : "rgba(255,255,255,0.05)",
                    boxShadow: selected ? `0 0 20px ${p.color}40` : "none",
                  }}
                  onClick={() => !isRunning && setActiveProject(p.name)}
                  disabled={isRunning}
                  title={p.name}
                >
                  <span className="tt-project-chip-dot" style={{ background: p.color }} />
                  <span style={{ color: selected ? "#f1eeff" : "rgba(233,213,255,0.75)" }}>{p.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Timer Card ── */}
      <div className={`tt-timer-card${isRunning ? " is-running" : ""}`} style={{ ...S.timerCard, borderColor: isRunning ? "rgba(236,72,153,0.5)" : "rgba(168,85,247,0.2)" }}>
        {/* Top accent line */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,#EC4899,#a855f7)", borderRadius:"14px 14px 0 0" }} />
        <div style={S.timerTop}>
          <div style={{ flex:1 }}>
            {activeProject ? (
              <div style={S.activeProjectBanner}>
                <span style={S.smallLabel}>Tracking on</span>
                <span style={{ ...S.activeProjectName, color: projectColor(activeProject, workProjects) }}>
                  {activeProject}
                </span>
              </div>
            ) : (
              <p style={{ ...S.projectEmptyHint, margin: "0 0 10px" }}>Select a project above to start tracking.</p>
            )}
            <input className="tt-input" style={S.taskInput} placeholder="What are you working on?" value={activeTask} onChange={(e) => setActiveTask(e.target.value)} disabled={isRunning} />
            <div style={{ display:"flex", gap:8, marginTop:10 }}>
              <select className="tt-select tt-input" style={S.smallSelect} value={activeTag} onChange={(e) => setActiveTag(e.target.value)} disabled={isRunning}>
                {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={S.timerRight}>
            <div className={`tt-timer-display${isRunning ? " is-running" : ""}`} style={{ ...S.timerDisplay, color: isRunning ? "#EC4899" : "#f1eeff" }}>
              {fmtTime(elapsed)}
            </div>
            <button className={`tt-btn tt-btn-start${isRunning ? " is-running" : ""}`} style={{ ...S.startBtn, background: isRunning ? "linear-gradient(135deg,#EF4444,#dc2626)" : "linear-gradient(135deg,#EC4899,#a855f7)" }} onClick={handleStartStop}>
              {isRunning ? "■ Stop" : "▶ Start"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={S.tabBar}>
        {(["log","weekly","breakdown"] as const).map((t) => (
          <button key={t} className={`tt-tab${tab === t ? " active" : ""}`}
            style={{ ...S.tab, color: tab === t ? "#EC4899" : "rgba(255,255,255,0.4)", borderBottom: tab === t ? "2px solid #EC4899" : "2px solid transparent", fontWeight: tab === t ? 700 : 500 }}
            onClick={() => setTab(t)}>
            {t === "log" ? "Time Log" : t === "weekly" ? "Weekly View" : "Breakdown"}
          </button>
        ))}
      </div>

      {/* ── Tab Panels ── */}
      {tab === "log" && (
        <div className="tt-tab-panel" style={S.panel}>
          <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
            {["All", ...workProjects.map((p) => p.name)].map((p) => (
              <button key={p} className="tt-badge"
                style={{ ...S.filterChip, background: filterProject === p ? "rgba(236,72,153,0.2)" : "rgba(168,85,247,0.08)", borderColor: filterProject === p ? "rgba(236,72,153,0.5)" : "rgba(168,85,247,0.2)", color: filterProject === p ? "#EC4899" : "rgba(255,255,255,0.45)" }}
                onClick={() => setFilterProject(p)}>{p}
              </button>
            ))}
          </div>
          {filteredEntries.length === 0 ? (
            <div style={S.empty}>No entries yet. Start the timer or log manually.</div>
          ) : (
            <div style={S.table}>
              <div style={S.tableHeader}>
                <span style={{ flex:2 }}>Task</span><span style={{ flex:1 }}>Project</span>
                <span style={{ flex:1 }}>Tag</span><span style={{ flex:1 }}>Date</span>
                <span style={{ flex:0.7, textAlign:"right" }}>Duration</span><span style={{ width:32 }} />
              </div>
              {filteredEntries.map((e, i) => (
                <div key={e.id} className="tt-log-row" style={{ ...S.tableRow, animationDelay:`${i * 0.05}s` }}>
                  <span style={{ flex:2, color:"#f1eeff", fontSize:13, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.task}</span>
                  <span style={{ flex:1 }}>
                    <span style={{ ...S.projBadge, background:`${projectColor(e.project, workProjects)}22`, color: projectColor(e.project, workProjects) }}>{e.project}</span>
                  </span>
                  <span style={{ flex:1, fontSize:12, color:"rgba(255,255,255,0.4)" }}>{e.tag}</span>
                  <span style={{ flex:1, fontSize:12, color:"rgba(255,255,255,0.3)" }}>{fmtDate(e.start)} {fmtClock(e.start)}</span>
                  <span style={{ flex:0.7, textAlign:"right" }}>
                    <span className="tt-duration-badge" style={S.durationBadge}>{fmtDuration(e.duration)}</span>
                  </span>
                  <button className="tt-delete-btn tt-icon-btn" style={S.deleteBtn} onClick={() => deleteEntry(e.id)}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "weekly"    && <div className="tt-tab-panel" style={S.panel}><WeeklyChart entries={entries} /></div>}
      {tab === "breakdown" && <div className="tt-tab-panel" style={S.panel}><ProjectBreakdown entries={entries} projects={workProjects} /></div>}

      {showModal && <ManualModal onClose={() => setShowModal(false)} onSave={addManual} projects={workProjects} />}

      <div style={S.toastContainer}>
        {toasts.map((t) => <ToastItem key={t.id} toast={t} />)}
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────── */
const S: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100%",
    background: "transparent",
    color: "#f1eeff",
    fontFamily: "'Poppins', 'Segoe UI', sans-serif",
    padding: "28px 32px",
    position: "relative",
  },

  /* Header */
  header: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28 },
  h1: {
    fontSize: 34,
    fontWeight: 800,
    letterSpacing: "-1px",
    margin: 0,
    background: "linear-gradient(135deg, #ffffff 0%, #e9d5ff 40%, #EC4899 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  subtitle: { fontSize:13, color:"rgba(233,213,255,0.5)", display:"flex", alignItems:"center", gap:6, margin:"6px 0 0" },

  /* Stat Grid */
  statGrid: { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:16 },
  statCard: {
    background: "linear-gradient(135deg, rgba(168,85,247,0.25) 0%, rgba(236,72,153,0.15) 100%)",
    border: "1px solid rgba(196,132,252,0.35)",
    borderRadius: 16,
    padding: "16px 18px",
    display: "flex",
    alignItems: "center",
    gap: 14,
    backdropFilter: "blur(16px)",
    boxShadow: "0 4px 24px rgba(168,85,247,0.2), inset 0 1px 0 rgba(255,255,255,0.08)",
    position: "relative",
    overflow: "hidden",
  },
  statIconWrap: { width:44, height:44, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, background:"rgba(255,255,255,0.1)" },
  statIcon:  { fontSize:22 },
  statLabel: { fontSize:10, color:"rgba(233,213,255,0.5)", textTransform:"uppercase", letterSpacing:"1px", fontWeight:600, marginBottom:4 },
  statValue: { fontSize:24, fontWeight:800, letterSpacing:"-0.5px" },

  /* Goal bar */
  projectSection: {
    marginBottom: 18,
    background: "linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(168,85,247,0.12) 100%)",
    border: "1px solid rgba(196,132,252,0.3)",
    borderRadius: 16,
    padding: "18px 20px",
    backdropFilter: "blur(12px)",
  },
  projectSectionHead: { marginBottom: 14 },
  projectSectionTitle: { display: "block", fontSize: 13, fontWeight: 700, color: "#f1eeff", marginBottom: 4 },
  projectSectionHint: { fontSize: 11, color: "rgba(233,213,255,0.45)", lineHeight: 1.4 },
  projectGrid: { display: "flex", flexWrap: "wrap", gap: 10 },
  projectChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    borderRadius: 12,
    border: "1px solid",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  projectChipTag: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    padding: "2px 6px",
    borderRadius: 6,
    background: "rgba(59,130,246,0.25)",
    color: "#93c5fd",
    fontWeight: 700,
  },
  projectLoading: { fontSize: 12, color: "rgba(233,213,255,0.4)", padding: "8px 0" },
  projectEmptyHint: { margin: "12px 0 0", fontSize: 12, color: "rgba(233,213,255,0.45)", lineHeight: 1.5 },
  activeProjectBanner: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  activeProjectName: { fontSize: 14, fontWeight: 800 },

  goalBar: {
    marginBottom: 18,
    background: "linear-gradient(135deg, rgba(168,85,247,0.2) 0%, rgba(236,72,153,0.12) 100%)",
    border: "1px solid rgba(196,132,252,0.3)",
    borderRadius: 14,
    padding: "16px 20px",
    backdropFilter: "blur(12px)",
    boxShadow: "0 4px 20px rgba(168,85,247,0.15)",
  },
  smallLabel: { fontSize:11, color:"rgba(233,213,255,0.5)", fontWeight:500 },
  progTrack: { height:7, background:"rgba(255,255,255,0.08)", borderRadius:99, overflow:"hidden" },
  progFill:  { height:"100%", borderRadius:99, transition:"width 0.4s ease" },

  /* Timer card */
  timerCard: {
    background: "linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(168,85,247,0.15) 50%, rgba(236,72,153,0.1) 100%)",
    border: "1px solid rgba(196,132,252,0.3)",
    borderRadius: 18,
    padding: "22px 24px",
    marginBottom: 20,
    backdropFilter: "blur(16px)",
    boxShadow: "0 8px 32px rgba(168,85,247,0.2), inset 0 1px 0 rgba(255,255,255,0.08)",
    position: "relative",
    overflow: "hidden",
  },
  timerTop:    { display:"flex", gap:20, alignItems:"flex-start" },
  taskInput:   { width:"100%", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(196,132,252,0.25)", borderRadius:10, padding:"11px 14px", fontSize:14, color:"#f1eeff", boxSizing:"border-box" },
  smallSelect: { background:"rgba(255,255,255,0.08)", border:"1px solid rgba(196,132,252,0.25)", borderRadius:8, padding:"7px 10px", fontSize:12, color:"rgba(233,213,255,0.8)", cursor:"pointer" },
  timerRight:  { display:"flex", flexDirection:"column", alignItems:"center", gap:12, minWidth:160 },
  timerDisplay:{ fontSize:38, fontWeight:800, fontVariantNumeric:"tabular-nums", letterSpacing:3 },
  startBtn:    { padding:"11px 28px", borderRadius:99, border:"none", fontSize:13, fontWeight:700, color:"#fff", cursor:"pointer", minWidth:120, letterSpacing:"0.3px", boxShadow:"0 4px 20px rgba(236,72,153,0.4)" },
  ghostBtn:    { background:"rgba(196,132,252,0.15)", border:"1px solid rgba(196,132,252,0.4)", borderRadius:10, padding:"9px 18px", fontSize:12, fontWeight:600, color:"#e9d5ff", cursor:"pointer" },

  /* Tabs */
  tabBar: { display:"flex", gap:4, borderBottom:"1px solid rgba(196,132,252,0.15)", marginBottom:16 },
  tab:    { background:"none", border:"none", padding:"10px 18px", fontSize:12, cursor:"pointer", letterSpacing:"0.3px", transition:"all 0.15s ease" },
  panel:  { minHeight:180 },

  /* Table */
  table:        { display:"flex", flexDirection:"column", gap:4 },
  tableHeader:  { display:"flex", alignItems:"center", gap:10, padding:"8px 14px", fontSize:10, color:"rgba(233,213,255,0.3)", textTransform:"uppercase", letterSpacing:"0.9px" },
  tableRow:     { display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:10, background:"rgba(168,85,247,0.1)", border:"1px solid rgba(196,132,252,0.15)", transition:"background 0.12s ease", boxShadow:"inset 0 1px 0 rgba(255,255,255,0.04)" },
  projBadge:    { fontSize:10, padding:"3px 9px", borderRadius:99, fontWeight:700, letterSpacing:"0.2px", whiteSpace:"nowrap" },
  durationBadge:{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:99, background:"rgba(236,72,153,0.22)", color:"#f9a8d4", letterSpacing:"0.3px" },
  deleteBtn:    { background:"none", border:"none", color:"#f87171", cursor:"pointer", fontSize:12, width:24, textAlign:"center", opacity:0 },
  filterChip:   { border:"1px solid", borderRadius:99, padding:"4px 13px", fontSize:11, cursor:"pointer", fontWeight:600, transition:"all .15s ease" },
  empty:        { textAlign:"center", color:"rgba(233,213,255,0.25)", padding:"48px 0", fontSize:13 },

  /* Chart */
  chartWrap: { position:"relative", height:220, padding:"0 6px" },
  chartBars: { display:"flex", gap:10, height:"80%", alignItems:"flex-end", justifyContent:"space-between", paddingBottom:28 },
  dayCol:    { flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, height:"100%", position:"relative" },
  barTrack:  { flex:1, width:"100%", display:"flex", alignItems:"flex-end", background:"rgba(255,255,255,0.05)", borderRadius:6, overflow:"hidden" },
  bar:       { width:"100%", borderRadius:"6px 6px 0 0", minHeight:4, transition:"filter .15s ease" },
  dayLabel:  { fontSize:10, letterSpacing:"0.5px" },
  dayHours:  { fontSize:9, color:"rgba(233,213,255,0.3)", position:"absolute", bottom:-18 },
  goalLine:  { position:"absolute", left:0, right:0, borderTop:"1px dashed rgba(236,72,153,0.45)" },
  goalLabel: { position:"absolute", right:0, top:-14, fontSize:9, color:"rgba(236,72,153,0.7)", letterSpacing:"0.5px" },

  /* Modal */
  backdrop:    { position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 },
  modal:       { background:"linear-gradient(135deg,#1e0640,#2a0a50)", border:"1px solid rgba(196,132,252,0.35)", borderRadius:18, padding:28, width:460, maxWidth:"90vw", boxShadow:"0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)" },
  iconBtn:     { background:"none", border:"none", color:"rgba(233,213,255,0.4)", cursor:"pointer", fontSize:16 },
  field:       { marginBottom:14 },
  label:       { display:"block", fontSize:10, color:"rgba(233,213,255,0.4)", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.9px", fontWeight:600 },
  input:       { width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(196,132,252,0.25)", borderRadius:9, padding:"9px 13px", fontSize:12, color:"#f1eeff", boxSizing:"border-box" },
  btnGhost:    { flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(196,132,252,0.2)", borderRadius:9, padding:"10px 0", fontSize:12, color:"rgba(233,213,255,0.7)", cursor:"pointer" },
  btnPrimary:  { flex:2, background:"linear-gradient(135deg,#EC4899,#a855f7)", border:"none", borderRadius:9, padding:"10px 0", fontSize:13, fontWeight:700, color:"#fff", cursor:"pointer", boxShadow:"0 4px 16px rgba(236,72,153,0.35)" },
  errorBox:    { background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:9, padding:"10px 13px", fontSize:12, color:"#fca5a5", marginBottom:14 },

  /* Toasts */
  toastContainer: { position:"fixed", bottom:20, right:20, display:"flex", flexDirection:"column", gap:8, zIndex:200 },
  toast:          { padding:"12px 18px", borderRadius:10, fontSize:12, fontWeight:600, color:"#fff", boxShadow:"0 4px 24px rgba(0,0,0,0.5)", maxWidth:280 },
};