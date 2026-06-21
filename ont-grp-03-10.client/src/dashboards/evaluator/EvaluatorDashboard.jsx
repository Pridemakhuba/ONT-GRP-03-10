import DashboardShell from "../shared/DashboardShell";
import { Icons } from "../shared/icons";
import EvaluatorOverview from "./panels/EvaluatorOverview";
import ReviewQueue from "./panels/ReviewQueue";
import SubmitFeedback from "./panels/SubmitFeedback";

const navItems = [
  { key: "overview", label: "Overview",       icon: Icons.overview },
  { key: "queue",     label: "Review Queue",  icon: Icons.reviewQueue },
  { key: "feedback",  label: "Submit Feedback", icon: Icons.feedback },
];

const moduleLabels = {
  overview: { title: "Overview",        desc: "Your review activity at a glance" },
  queue:    { title: "Review Queue",    desc: "Proposals awaiting your evaluation" },
  feedback: { title: "Submit Feedback", desc: "Provide structured evaluation feedback" },
};

const panels = { overview: EvaluatorOverview, queue: ReviewQueue, feedback: SubmitFeedback };

export default function EvaluatorDashboard() {
  return (
    <DashboardShell
      navItems={navItems}
      panels={panels}
      moduleLabels={moduleLabels}
      defaultModule="overview"
      roleTag="Evaluator"
      roleBadgeColor="#DC2626"
    />
  );
}
