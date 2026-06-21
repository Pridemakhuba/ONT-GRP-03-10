import DashboardShell from "../shared/DashboardShell";
import { Icons } from "../shared/icons";
import SupervisorOverview from "./panels/SupervisorOverview";
import MyStudents from "./panels/MyStudents";
import ProgressReports from "./panels/ProgressReports";
import ReviewQueue from "./panels/ReviewQueue";
import SubmitFeedback from "./panels/SubmitFeedback";

const navItems = [
  { key: "overview", label: "Overview",          icon: Icons.overview },
  { key: "students",  label: "My Students",       icon: Icons.students },
  { key: "reports",   label: "Progress Reports",  icon: Icons.reports },
  { key: "queue",     label: "Review Queue",      icon: Icons.reviewQueue },
  { key: "feedback",  label: "Submit Feedback",   icon: Icons.feedback },
];

const moduleLabels = {
  overview: { title: "Overview",          desc: "Snapshot of your supervised candidates" },
  students: { title: "My Students",       desc: "Candidates under your supervision" },
  reports:  { title: "Progress Reports",  desc: "Submit and track academic progress reports" },
  queue:    { title: "Review Queue",      desc: "Proposals from other supervisors' students, assigned to you" },
  feedback: { title: "Submit Feedback",   desc: "Provide structured evaluation feedback" },
};

const panels = {
  overview: SupervisorOverview,
  students: MyStudents,
  reports: ProgressReports,
  queue: ReviewQueue,
  feedback: SubmitFeedback,
};

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
