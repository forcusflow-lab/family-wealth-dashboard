import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import { ProtectedAppRoute } from "@/components/ProtectedAppRoute";
import { useAuth } from "@/_core/hooks/useAuth";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { lazy, Suspense } from "react";

const Home = lazy(() => import("./pages/Home"));
const CommandCenter = lazy(() => import("./pages/CommandCenter"));
const Recommendation = lazy(() => import("./pages/Recommendation"));
const AnnualPlan = lazy(() => import("./pages/AnnualPlan"));
const PortfolioAudit = lazy(() => import("./pages/PortfolioAudit"));
const FundingPlan = lazy(() => import("./pages/FundingPlan"));
const DecisionEvidence = lazy(() => import("./pages/DecisionEvidence"));
const IdecoUniverse = lazy(() => import("./pages/IdecoUniverse"));
const TaxDocuments = lazy(() => import("./pages/TaxDocuments"));
const BacktestComparison = lazy(() => import("./pages/BacktestComparison"));
const EvidenceWorkspace = lazy(() => import("./pages/EvidenceWorkspace"));
const NisaUniverse = lazy(() => import("./pages/NisaUniverse"));
const HouseholdOpportunity = lazy(() => import("./pages/HouseholdOpportunity"));
const AssetProjection = lazy(() => import("./pages/AssetProjection"));
const GoalTimeline = lazy(() => import("./pages/GoalTimeline"));
const AccountLedger = lazy(() => import("./pages/AccountLedger"));

function Router() {
  const { user } = useAuth();
  return (
    <ProtectedAppRoute user={user} fallback={<DashboardLayout><div /></DashboardLayout>} renderProtected={() => <>
    <Suspense fallback={<DashboardLayout><main className="grid min-h-[60vh] place-items-center"><p className="text-sm text-[#60746A]">画面を読み込んでいます</p></main></DashboardLayout>}><Switch>
      <Route path={"/"} component={CommandCenter} />
      <Route path={"/buckets"} component={AccountLedger} />
      <Route path={"/mortgage"} component={FundingPlan} />
      <Route path={"/goals"} component={GoalTimeline} />
      <Route path={"/analysis"} component={EvidenceWorkspace} />
      <Route path={"/report"} component={DecisionEvidence} />
      <Route path={"/settings"} component={Home} />
      <Route path={"/recommendation"} component={Recommendation} />
      <Route path={"/annual-plan"} component={AnnualPlan} />
      <Route path={"/portfolio-audit"} component={PortfolioAudit} />
      <Route path={"/funding-plan"} component={FundingPlan} />
      <Route path={"/decision-evidence"} component={DecisionEvidence} />
      <Route path={"/ideco-universe"} component={IdecoUniverse} />
      <Route path={"/tax-documents"} component={TaxDocuments} />
      <Route path={"/backtest-comparison"} component={BacktestComparison} />
      <Route path={"/evidence-workspace"} component={EvidenceWorkspace} />
      <Route path={"/nisa-universe"} component={NisaUniverse} />
      <Route path={"/household-opportunity"} component={HouseholdOpportunity} />
      <Route path={"/asset-projection"} component={AssetProjection} />
      <Route path={"/goal-timeline"} component={GoalTimeline} />
      <Route path={"/accounts"} component={AccountLedger} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch></Suspense>
    </>} />
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
