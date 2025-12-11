'use client';

import { DatabaseOperationsPanel } from '@/components/management/database-operations';
import { ObservabilityPanel } from '@/components/management/observability-panel';
import { MaintenancePanel } from '@/components/management/maintenance-panel';
import { AnalyticsPanel } from '@/components/management/analytics-panel';

export default function ManagementPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Management</h1>
        <p className="text-muted-foreground">
          Database operations, maintenance utilities, and system observability
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <DatabaseOperationsPanel />
          <MaintenancePanel />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <ObservabilityPanel />
          <AnalyticsPanel />
        </div>
      </div>
    </div>
  );
}

