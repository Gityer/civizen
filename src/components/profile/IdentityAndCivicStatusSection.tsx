import { CivicStatusCard } from '@/components/profile/CivicStatusCard';
import { IdentityVerificationSettingsSection } from '@/components/profile/IdentityVerificationSettingsSection';

/** Identity verification followed by the civic status layers it unlocks (Phase 3 step 3.1). */
export function IdentityAndCivicStatusSection() {
  return (
    <div className="space-y-4">
      <IdentityVerificationSettingsSection />
      <CivicStatusCard />
    </div>
  );
}
