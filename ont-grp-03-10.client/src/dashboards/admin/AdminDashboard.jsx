import DashboardShell from "../shared/DashboardShell";
import { Icons } from "../shared/icons";
import AdminOverview from "./panels/AdminOverview";
import AllStudents from "./panels/AllStudents";
import AllProposals from "./panels/AllProposals";
import AllTimelines from "./panels/AllTimelines";
import AllSubmissions from "./panels/AllSubmissions";
import Reports from "./panels/Reports";

const navItems = [
  { key: "overview",     label: "Overview",     icon: Icons.overview },
  { key: "registration", label: "Registration", icon: Icons.registration },
  { key: "proposals",    label: "Proposals",    icon: Icons.proposals },
  { key: "timelines",    label: "Timelines",    icon: Icons.timelines },
  { key: "submissions",  label: "Submissions",  icon: Icons.submissions },
  { key: "reports",      label: "Reports",      icon: Icons.reports },
];

const moduleLabels = {
  overview:     { title: "Overview",     desc: "System-wide snapshot and recent activity" },
  registration: { title: "Registration", desc: "Student enrollment and profile management" },
  proposals:    { title: "Proposals",    desc: "Research proposals and evaluation workflow" },
  timelines:    { title: "Timelines",    desc: "Milestones, deadlines, and progress tracking" },
  submissions:  { title: "Submissions",  desc: "Final thesis and examination submissions" },
  reports:      { title: "Reports",      desc: "Generate status reports across the system" },
};

const panels = {
  overview: AdminOverview,
  registration: AllStudents,
  proposals: AllProposals,
  timelines: AllTimelines,
  submissions: AllSubmissions,
  reports: Reports,
};

export default function AdminDashboard() {
  return (
    <DashboardShell
      navItems={navItems}
      panels={panels}
      moduleLabels={moduleLabels}
      defaultModule="overview"
      roleTag="Administrative"
      roleBadgeColor="#7C3AED"
    />
  );
}
