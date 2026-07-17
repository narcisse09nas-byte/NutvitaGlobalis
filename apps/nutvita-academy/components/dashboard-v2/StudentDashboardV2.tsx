"use client";

import { useStudentDashboard } from "@/hooks/use-student-dashboard";

import { RecommendedResources } from "@/components/resources/RecommendedResources";

import { CurrentLearningCard } from "@/components/dashboard-v2/CurrentLearningCard";
import { DashboardActivity } from "@/components/dashboard-v2/DashboardActivity";
import { DashboardMetrics } from "@/components/dashboard-v2/DashboardMetrics";
import { DashboardRecommendations } from "@/components/dashboard-v2/DashboardRecommendations";
import { DashboardWelcome } from "@/components/dashboard-v2/DashboardWelcome";
import { PerformanceOverview } from "@/components/dashboard-v2/PerformanceOverview";

export function StudentDashboardV2() {
  const dashboard = useStudentDashboard();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <DashboardWelcome />

      <div className="mt-8">
        <DashboardMetrics metrics={dashboard.metrics} />
      </div>

      <div className="mt-8 grid min-w-0 gap-7 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <CurrentLearningCard learning={dashboard.currentLearning} />

        <PerformanceOverview performance={dashboard.performance} />
      </div>

      <div className="mt-12">
        <DashboardRecommendations recommendations={dashboard.recommendations} />
      </div>

      <div className="mt-12 grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <RecommendedResources
          courseSlug={dashboard.currentLearning?.courseSlug}
          limit={2}
        />

        <DashboardActivity notifications={dashboard.importantNotifications} />
      </div>
    </div>
  );
}
