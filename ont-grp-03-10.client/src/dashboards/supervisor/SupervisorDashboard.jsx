import DashboardShell from "../shared/DashboardShell";
import { Icons } from "../shared/icons";
import SupervisorOverview from "./panels/SupervisorOverview";
import MyStudents from "./panels/MyStudents";
import ProgressReports from "./panels/ProgressReports";

const navItems = [
  { key: "overview", label: "Overview",         icon: Icons.overview },
  { key: "students",  label: "My Students",      icon: Icons.students },
  { key: "reports",   label: "Progress Reports", icon: Icons.reports },
];

const moduleLabels = {
  overview: { title: "Overview",         desc: "Snapshot of your supervised candidates" },
  students: { title: "My Students",      desc: "Candidates under your supervision" },
  reports:  { title: "Progress Reports", desc: "Submit and track academic progress reports" },
};

const panels = { overview: SupervisorOverview, students: MyStudents, reports: ProgressReports };

export default function SupervisorDashboard() {
  return (
    <DashboardShell
      navItems={navItems}
      panels={panels}
      moduleLabels={moduleLabels}
      defaultModule="overview"
      roleTag="Supervisor"
      roleBadgeColor="#0D9488"
    />
  );
}
