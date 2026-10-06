import { APP_RELEASE_ID, APP_VERSION, ANDROID_VERSION_CODE } from '@/lib/app-release';
import { buildVotingManifestFromRelease, type CivicVerificationCheckKind } from '@/lib/civic-voting';

export type DemoGateState = Record<CivicVerificationCheckKind, boolean>;

export const VOTING_MANIFEST = buildVotingManifestFromRelease({
  appVersion: APP_VERSION,
  appReleaseId: APP_RELEASE_ID,
  androidVersionCode: ANDROID_VERSION_CODE,
  packageFingerprints: ['demo-fingerprint'],
});
