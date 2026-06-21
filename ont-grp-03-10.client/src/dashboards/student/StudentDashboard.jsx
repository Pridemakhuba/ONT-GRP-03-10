import DashboardShell from "../shared/DashboardShell";
import { Icons } from "../shared/icons";
import MyOverview from "./panels/MyOverview";
import MyProposal from "./panels/MyProposal";
import MyEthics from "./panels/MyEthics";
import MyTimeline from "./panels/MyTimeline";
import MySubmission from "./panels/MySubmission";

const navItems = [
  { key: "overview",   label: "My Overview",  icon: Icons.overview },
  { key: "proposal",   label: "My Proposal",  icon: Icons.proposals },
  { key: "ethics",     label: "My Ethics",    icon: Icons.ethics },
  { key: "timeline",   label: "My Timeline",  icon: Icons.timelines },
  { key: "submission", label: "My Submission",icon: Icons.submissions },
];

const moduleLabels = {
  overview:   { title: "My Overview",   desc: "Your academic journey at a glance" },
  proposal:   { title: "My Proposal",   desc: "Research proposal status and feedback" },
  ethics:     { title: "My Ethics",     desc: "Ethics application and clearance status" },
  timeline:   { title: "My Timeline",   desc: "Milestones and upcoming deadlines" },
  submission: { title: "My Submission", desc: "Final thesis and examination" },
};

const panels = {
  overview: MyOverview,
  proposal: MyProposal,
  ethics: MyEthics,
  timeline: MyTimeline,
  submission: MySubmission,
};

export default function StudentDashboard() {
  return (
    <DashboardShell
      navItems={navItems}
      panels={panels}
      moduleLabels={moduleLabels}
      defaultModule="overview"
      roleTag="Student"
      roleBadgeColor="#0066CC"
    />
  );
}
