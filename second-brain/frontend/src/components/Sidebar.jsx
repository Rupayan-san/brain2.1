import {
  Brain,
  CalendarDays,
  CheckSquare,
  CircleUserRound,
  GitFork,
  LayoutDashboard,
  LogIn,
  MessageCircle,
  Newspaper
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/graph", label: "Graph", icon: GitFork },
  { to: "/timeline", label: "Timeline", icon: CalendarDays },
  { to: "/commitments", label: "Commitments", icon: CheckSquare },
  { to: "/digest", label: "Digest", icon: Newspaper },
  { to: "/login", label: "Login", icon: LogIn }
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark">
          <Brain size={20} />
        </span>
        <div>
          <strong>Second Brain</strong>
          <small>Memory OS</small>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Primary navigation">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"}>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-profile">
        <CircleUserRound size={18} />
        <span>Local session</span>
      </div>
    </aside>
  );
}
