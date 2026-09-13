import { Toaster } from "@/components/ui/sonner";
import React, { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useTheme } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import { AppLayout } from "./components/AppLayout";
import { BrandLogo } from "./components/BrandLogo";
import { PageTransition } from "./components/PageTransition";
import { PublicAutoTheme } from "./components/PublicAutoTheme";
import { getLoginUrl } from "./const";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import EquipmentManage from "./pages/EquipmentManage";
import EquipmentBrowse from "./pages/EquipmentBrowse";
import BorrowRequests from "./pages/BorrowRequests";
import BorrowRecords from "./pages/BorrowRecords";
import MyRequests from "./pages/MyRequests";
import MyRecords from "./pages/MyRecords";
import UserManage from "./pages/UserManage";
import LoginAudit from "./pages/LoginAudit";
import Profile from "./pages/Profile";
import OperationLogs from "./pages/OperationLogs";
import QrCodeBorrowReturn from "./pages/QrCodeBorrowReturn";
import QrCodePrintList from "./pages/QrCodePrintList";
import BrandLogoMonitoring from "./pages/BrandLogoMonitoring";
import AuditCenter from "./pages/AuditCenter";
import ProtectedAccountSecurity from "./pages/ProtectedAccountSecurity";
import SystemAlertEmailRecipients from "./pages/SystemAlertEmailRecipients";
import DatabaseMaintenance from "./pages/DatabaseMaintenance";
import SystemReports from "./pages/SystemReports";
import SystemReportStatistics from "./pages/SystemReportStatistics";
import SystemReportCreated from "./pages/SystemReportCreated";
import UrgentAnnouncementStatus from "./pages/UrgentAnnouncementStatus";
import CertificateVerify from "./pages/CertificateVerify";
import ActivationCertificateExports from "./pages/ActivationCertificateExports";
import LocationAuditReport from "./pages/LocationAuditReport";
import ReminderHistory from "./pages/ReminderHistory";
import Reimbursements from "./pages/Reimbursements";
import ReimbursementReview from "./pages/ReimbursementReview";
import SystemMaintenance from "./pages/SystemMaintenance";
import SystemManagementOverview from "./pages/SystemManagementOverview";
import MediaCalendar from "./pages/MediaCalendar";
import MediaProjectProposals from "./pages/MediaProjectProposals";
import PodcastHosting from "./pages/PodcastHosting";

const profileSecuritySections = ["password", "two-factor", "passkeys", "devices"] as const;
type ProfileSecuritySection = (typeof profileSecuritySections)[number];

function isProfileSecuritySection(section: string): section is ProfileSecuritySection {
  return (profileSecuritySections as readonly string[]).includes(section);
}

function RedirectToLogin() {
  useEffect(() => {
    window.location.href = "/login";
  }, []);

  return null;
}

export function ProtectedRoute({
  component: Component,
  roles,
  founderOnly = false,
}: {
  component: React.ComponentType;
  roles?: string[];
  founderOnly?: boolean;
}) {
  const { user, loading, error, refresh } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <BrandLogo className="app-loading-logo mx-auto mb-4 h-14 w-14 object-cover" aria-hidden="true" alt="" />
          <p className="label-caps">載入中</p>
        </div>
      </div>
    );
  }

  if (!user && error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <section className="max-w-md rounded-2xl border border-sky-400/35 bg-card p-6 text-card-foreground shadow-xl" role="alert" data-testid="auth-connection-error">
          <h1 className="text-lg font-bold">登入狀態暫時無法確認</h1>
          <p className="mt-2 text-sm text-muted-foreground">系統會保留您目前的頁面，不會自動返回首頁請確認網路連線後再重新確認登入狀態</p>
          <button type="button" className="btn-primary mt-5" onClick={() => void refresh()}>重新確認</button>
        </section>
      </div>
    );
  }

  if (!user) {
    return <RedirectToLogin />;
  }

  if (user.isTemporaryPassword) {
    return <RedirectToLogin />;
  }

  if ((roles && !roles.includes(user.role)) || (founderOnly && !user.isFounder)) {
    return (
      <AppLayout>
        <div className="empty-state">
          <p className="text-4xl mb-4">⛔</p>
          <p className="text-white font-bold text-lg mb-2">無存取權限</p>
          <p className="label-caps">您的帳號角色無法存取此頁面</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">{() => <PublicAutoTheme><Home /></PublicAutoTheme>}</Route>
      <Route path="/login">{() => <PublicAutoTheme><Login /></PublicAutoTheme>}</Route>
      <Route path="/certificate-verify" component={CertificateVerify} />
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/equipment">
        {() => <ProtectedRoute component={EquipmentManage} roles={["admin", "teacher"]} />}
      </Route>
      <Route path="/location-audit-report">
        {() => <ProtectedRoute component={LocationAuditReport} roles={["admin", "teacher"]} />}
      </Route>
      <Route path="/reminder-history">
        {() => <ProtectedRoute component={ReminderHistory} roles={["admin"]} />}
      </Route>
      <Route path="/reimbursements">
        {() => <ProtectedRoute component={Reimbursements} />}
      </Route>
      <Route path="/reimbursement-review">
        {() => <ProtectedRoute component={ReimbursementReview} roles={["admin", "teacher"]} />}
      </Route>
      <Route path="/media-calendar">
        {() => <ProtectedRoute component={MediaCalendar} />}
      </Route>
      <Route path="/media-project-proposals">
        {() => <ProtectedRoute component={MediaProjectProposals} />}
      </Route>
      <Route path="/podcasts">
        {() => <ProtectedRoute component={PodcastHosting} />}
      </Route>
      <Route path="/browse">
        {() => <ProtectedRoute component={EquipmentBrowse} roles={["student"]} />}
      </Route>
      <Route path="/requests">
        {() => <ProtectedRoute component={BorrowRequests} roles={["admin", "teacher"]} />}
      </Route>
      <Route path="/records">
        {() => <ProtectedRoute component={BorrowRecords} roles={["admin", "teacher"]} />}
      </Route>
      <Route path="/my-requests">
        {() => <ProtectedRoute component={MyRequests} roles={["student"]} />}
      </Route>
      <Route path="/my-records">
        {() => <ProtectedRoute component={MyRecords} roles={["student"]} />}
      </Route>
      <Route path="/users">
        {() => <ProtectedRoute component={UserManage} roles={["admin"]} />}
      </Route>
      <Route path="/login-audit">
        {() => <ProtectedRoute component={LoginAudit} roles={["admin"]} />}
      </Route>
      <Route path="/operation-logs">
        {() => <ProtectedRoute component={OperationLogs} roles={["admin"]} />}
      </Route>
      <Route path="/audit-center/:view">
        {() => <ProtectedRoute component={AuditCenter} roles={["admin"]} founderOnly />}
      </Route>
      <Route path="/protected-account-security">
        {() => <ProtectedRoute component={ProtectedAccountSecurity} roles={["admin"]} founderOnly />}
      </Route>
      <Route path="/brand-logo-monitoring">
        {() => <ProtectedRoute component={BrandLogoMonitoring} roles={["admin"]} founderOnly />}
      </Route>
      <Route path="/system-alert-email">
        {() => <ProtectedRoute component={SystemAlertEmailRecipients} roles={["admin"]} founderOnly />}
      </Route>
      <Route path="/database-maintenance">
        {() => <ProtectedRoute component={DatabaseMaintenance} roles={["admin"]} founderOnly />}
      </Route>
      <Route path="/system-maintenance">
        {() => <ProtectedRoute component={SystemMaintenance} roles={["admin"]} founderOnly />}
      </Route>
      <Route path="/system-management">
        {() => <ProtectedRoute component={SystemManagementOverview} roles={["admin"]} />}
      </Route>
      <Route path="/profile/security">
        {() => <ProtectedRoute component={() => <Profile initialTab="security" />} />}
      </Route>
      <Route path="/profile/security/:section">
        {(params) => {
          const securitySection = params.section;
          if (!isProfileSecuritySection(securitySection)) return <NotFound />;
          return <ProtectedRoute component={() => <Profile initialTab="security" securitySection={securitySection} />} />;
        }}
      </Route>
      <Route path="/profile">
        {() => <ProtectedRoute component={Profile} />}
      </Route>
      <Route path="/404" component={NotFound} />
      <Route path="/qrcode-borrow-return">
        {() => <ProtectedRoute component={QrCodeBorrowReturn} roles={["admin", "teacher"]} />}
      </Route>
      <Route path="/qrcode-print-list">
        {() => <ProtectedRoute component={QrCodePrintList} roles={["admin", "teacher"]} />}
      </Route>
      <Route path="/system-reports/reading-statistics">
        {() => <ProtectedRoute component={SystemReportStatistics} roles={["admin"]} />}
      </Route>
      <Route path="/system-reports/created-reports">
        {() => <ProtectedRoute component={SystemReportCreated} roles={["admin", "teacher"]} />}
      </Route>
      <Route path="/system-reports">
        {() => <ProtectedRoute component={SystemReports} roles={["admin", "teacher"]} />}
      </Route>
      <Route path="/urgent-announcement-status">
        {() => <ProtectedRoute component={UrgentAnnouncementStatus} roles={["admin"]} />}
      </Route>
      <Route path="/activation-certificate-exports">
        {() => <ProtectedRoute component={ActivationCertificateExports} roles={["admin"]} founderOnly />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { theme } = useTheme();

  return (
    <TooltipProvider>
      <Toaster
        theme={theme}
        toastOptions={{
          style: theme === "dark"
            ? { background: "oklch(0.14 0.03 220)", border: "1px solid oklch(0.38 0.07 210)", color: "oklch(0.96 0.02 210)", borderRadius: "1rem", fontFamily: "Space Grotesk, sans-serif" }
            : { background: "oklch(0.98 0.01 220)", border: "1px solid oklch(0.58 0.09 210)", color: "oklch(0.20 0.03 220)", borderRadius: "1rem", fontFamily: "Space Grotesk, sans-serif" },
        }}
      />
      <PageTransition><Router /></PageTransition>
    </TooltipProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
