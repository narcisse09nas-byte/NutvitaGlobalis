import type { ReactNode } from "react";
import { LocalAuthProvider } from "@/components/auth/LocalAuthProvider";
import { LocalAuthGuard } from "@/components/auth/LocalAuthGuard";
import { WorkspaceSelectionGuard } from "@/components/auth/WorkspaceSelectionGuard";
import { ProgressProvider } from "@/components/progress/ProgressProvider";
import { QuizProvider } from "@/components/quizzes/QuizProvider";
import { ExamProvider } from "@/components/exams/ExamProvider";
import { CertificateProvider } from "@/components/certification/CertificateProvider";
import { AiInstructorProvider } from "@/components/ai/AiInstructorProvider";
import { GamificationProvider } from "@/components/gamification/GamificationProvider";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import { ResourceProvider } from "@/components/resources/ResourceProvider";
import { AdminProvider } from "@/components/admin/AdminProvider";
import { InstructorStudioProvider } from "@/components/instructor/InstructorStudioProvider";
import { BillingProvider } from "@/components/billing/BillingProvider";
import { TenantProvider } from "@/components/tenancy/TenantProvider";
import { LiveSessionProvider } from "@/components/live/LiveSessionProvider";
import { MarketplaceProvider } from "@/components/marketplace/MarketplaceProvider";
import { ProctoringProvider } from "@/components/proctoring/ProctoringProvider";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <LocalAuthProvider>
      <LocalAuthGuard>
        <WorkspaceSelectionGuard>
          <TenantProvider>
            <ProgressProvider>
              <QuizProvider>
                <ExamProvider>
                  <CertificateProvider>
                    <AiInstructorProvider>
                      <GamificationProvider>
                        <NotificationProvider>
                          <ResourceProvider>
                            <AdminProvider>
                              <InstructorStudioProvider>
                                <BillingProvider>
                                  <LiveSessionProvider>
                                    <MarketplaceProvider>
                                      <ProctoringProvider>
                                        <DashboardShell>
                                          {children}
                                        </DashboardShell>
                                      </ProctoringProvider>
                                    </MarketplaceProvider>
                                  </LiveSessionProvider>
                                </BillingProvider>
                              </InstructorStudioProvider>
                            </AdminProvider>
                          </ResourceProvider>
                        </NotificationProvider>
                      </GamificationProvider>
                    </AiInstructorProvider>
                  </CertificateProvider>
                </ExamProvider>
              </QuizProvider>
            </ProgressProvider>
          </TenantProvider>
        </WorkspaceSelectionGuard>
      </LocalAuthGuard>
    </LocalAuthProvider>
  );
}
