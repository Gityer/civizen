import { Route } from 'react-router-dom';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  EndorseSelect,
  HelpSupport,
  NotificationsSettings,
  ReportContent,
  SafetySettings,
} from '@/app-routes/lazy-pages';

/** Member support routes: help, notifications, safety, reporting and choosing whom to endorse. */
export const appRoutesSupport = (
  <>
    <Route path="/settings/notifications" element={<ProtectedRoute><NotificationsSettings /></ProtectedRoute>} />
    <Route path="/settings/safety" element={<ProtectedRoute><SafetySettings /></ProtectedRoute>} />
    <Route path="/settings/help" element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
    <Route
      path="/report/user/:targetId"
      element={
        <ProtectedRoute requiredPermissions={['report.create']}>
          <ReportContent kind="user" />
        </ProtectedRoute>
      }
    />
    <Route
      path="/report/post/:targetId"
      element={
        <ProtectedRoute requiredPermissions={['report.create']}>
          <ReportContent kind="post" />
        </ProtectedRoute>
      }
    />
    <Route
      path="/endorse/select"
      element={
        <ProtectedRoute requiredPermissions={['endorsement.create']}>
          <EndorseSelect />
        </ProtectedRoute>
      }
    />
  </>
);
