import { Navigate, Route } from 'react-router-dom';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  DevEconomicsVisual,
  Features,
  FundingAdmin,
  MarketJobsAdmin,
  GovernanceAdmin,
  PermissionsAdmin,
} from '@/app-routes/lazy-pages';

export const appRoutes2 = (
  <>
      <Route
        path="/settings/admin/governance"
        element={
          <ProtectedRoute requiredPermissions={['role.assign', 'settings.manage']}>
            <GovernanceAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/admin/modules"
        element={
          <ProtectedRoute requiredPermissions={['role.assign', 'settings.manage']}>
            <Features />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/admin/permissions"
        element={
          <ProtectedRoute requiredPermissions={['role.assign', 'settings.manage']}>
            <PermissionsAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/admin/funding"
        element={
          <ProtectedRoute
            requiredPermissions={[
              'finance.view',
              'finance.edit',
              'finance.approve',
              'finance.publish',
              'finance.admin',
              'role.assign',
              'settings.manage',
            ]}
          >
            <FundingAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/admin/market-jobs"
        element={<ProtectedRoute requiredPermissions={['market.manage', 'settings.manage', 'role.assign']}><MarketJobsAdmin /></ProtectedRoute>}
      />
      <Route
        path="/settings/admin/funding-interest"
        element={<Navigate to="/settings/admin/funding?section=interest" replace />}
      />
      <Route
        path="/settings/admin/funding-ledger"
        element={<Navigate to="/settings/admin/funding?section=ledger&legacy=1" replace />}
      />
      <Route
        path="/settings/admin/funding-audit"
        element={<Navigate to="/settings/admin/funding?section=audit&legacy=1" replace />}
      />
      <Route
        path="/settings/admin/funding-compliance"
        element={<Navigate to="/settings/admin/funding?section=compliance&legacy=1" replace />}
      />
      <Route
        path="/settings/admin/funding-contributors"
        element={<Navigate to="/settings/admin/funding?section=contributors&legacy=1" replace />}
      />
      <Route path="/settings/market/luma-credits" element={<Navigate to="/settings" replace />} />

      {DevEconomicsVisual ? (
        <Route path="/dev/economics-visual" element={<DevEconomicsVisual />} />
      ) : null}

  </>
);
