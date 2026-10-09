import { Navigate, useLocation } from 'react-router-dom';

/** The old member address `/governance/workspace` keeps working, tab and all (step 2.3). */
export function GovernanceWorkspaceRedirect() {
  const location = useLocation();
  return <Navigate to={{ pathname: '/governance', search: location.search }} replace />;
}
