import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, FileImage, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  ensureIdentityVerificationCase,
  type IdentityVerificationBundle,
  submitIdentityVerificationCase,
  uploadIdentityDocument,
  uploadIdentitySelfie,
} from '@/lib/identity-verification';
import {
  getVerificationCaseBadgeClassName,
  getVerificationCaseStatusLabelKey,
} from '@/lib/verification-workflow';

function profileFieldsFromAuth(profile: {
  full_name?: string | null;
  country?: string | null;
  date_of_birth?: string | null;
  username?: string | null;
  phone_e164?: string | null;
  phone_number?: string | null;
}) {
  return {
    full_name: profile.full_name,
    country: profile.country,
    date_of_birth: profile.date_of_birth,
    username: profile.username,
    phone_e164: profile.phone_e164,
    phone_number: profile.phone_number,
  };
}

async function captureSelfieFromCamera(): Promise<File> {
  if (!navigator?.mediaDevices?.getUserMedia) {
    throw new Error('camera_unavailable');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } },
    audio: false,
  });

  try {
    const video = document.createElement('video');
    video.playsInline = true;
    video.muted = true;
    video.srcObject = stream;
    await video.play();

    await new Promise<void>((resolve) => {
      if (video.readyState >= 2) {
        resolve();
        return;
      }
      video.onloadeddata = () => resolve();
    });

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('camera_unavailable');
    }
    context.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((next) => {
        if (next) resolve(next);
        else reject(new Error('camera_unavailable'));
      }, 'image/jpeg', 0.92);
    });

    return new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
  } finally {
    for (const track of stream.getTracks()) {
      track.stop();
    }
  }
}

export function IdentityVerificationSettingsSection() {
  const { profile, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const [bundle, setBundle] = useState<IdentityVerificationBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<'id' | 'selfie' | 'camera' | 'submit' | null>(null);
  const idInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const profileId = profile?.id ?? null;
  const profileSnapshot = profile
    ? profileFieldsFromAuth(profile)
    : null;

  const reload = useCallback(async () => {
    if (!profileId || !profileSnapshot) {
      setBundle(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const next = await ensureIdentityVerificationCase(profileId, profileSnapshot);
      setBundle(next);
    } catch (error) {
      console.error('Failed to load identity verification case', error);
      toast.error(t('editProfile.identityVerification.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [
    profileId,
    profileSnapshot?.full_name,
    profileSnapshot?.country,
    profileSnapshot?.date_of_birth,
    profileSnapshot?.username,
    profileSnapshot?.phone_e164,
    profileSnapshot?.phone_number,
  ]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!profile?.id) {
    return null;
  }

  const isVerified = Boolean(profile.is_verified) || bundle?.caseRow.status === 'approved';
  const status = bundle?.caseRow.status ?? 'draft';
  const canEditUploads = status === 'draft' || status === 'rejected' || status === 'revoked';

  const handleIdSelected = async (file: File | null) => {
    if (!file || !bundle || !canEditUploads) return;
    setBusyAction('id');
    try {
      await uploadIdentityDocument({
        profileId: profile.id,
        caseId: bundle.caseRow.id,
        file,
      });
      toast.success(t('editProfile.identityVerification.idUploaded'));
      await reload();
    } catch (error) {
      console.error('Failed to upload ID document', error);
      toast.error(t('editProfile.identityVerification.uploadFailed'));
    } finally {
      setBusyAction(null);
      if (idInputRef.current) idInputRef.current.value = '';
    }
  };

  const handleSelfieSelected = async (file: File | null, fromCamera = false) => {
    if (!file || !bundle || !canEditUploads) return;
    setBusyAction(fromCamera ? 'camera' : 'selfie');
    try {
      await uploadIdentitySelfie({
        profileId: profile.id,
        caseId: bundle.caseRow.id,
        file,
      });
      toast.success(t('editProfile.identityVerification.selfieUploaded'));
      await reload();
    } catch (error) {
      console.error('Failed to upload selfie', error);
      toast.error(t('editProfile.identityVerification.uploadFailed'));
    } finally {
      setBusyAction(null);
      if (selfieInputRef.current) selfieInputRef.current.value = '';
    }
  };

  const handleCameraSelfie = async () => {
    if (!bundle || !canEditUploads) return;
    setBusyAction('camera');
    try {
      const file = await captureSelfieFromCamera();
      await handleSelfieSelected(file, true);
    } catch (error) {
      console.error('Camera selfie failed', error);
      toast.error(t('editProfile.identityVerification.cameraFailed'));
      setBusyAction(null);
    }
  };

  const handleSubmit = async () => {
    if (!bundle?.canSubmit) return;
    setBusyAction('submit');
    try {
      await submitIdentityVerificationCase({
        caseId: bundle.caseRow.id,
        profile: profileFieldsFromAuth(profile),
      });
      toast.success(t('editProfile.identityVerification.submitted'));
      await reload();
      await refreshProfile();
    } catch (error) {
      console.error('Failed to submit identity verification', error);
      toast.error(t('editProfile.identityVerification.submitFailed'));
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <Card
      className="space-y-4 rounded-3xl border-border/60 p-5 shadow-sm"
      data-build-key="editProfileIdentityVerification"
      data-build-label="Identity verification"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">
              {t('editProfile.identityVerification.title')}
            </h2>
            <Badge
              variant="outline"
              className={`rounded-full ${getVerificationCaseBadgeClassName(isVerified ? 'approved' : status)}`}
            >
              {t(
                isVerified
                  ? 'governanceHub.identityVerification.badgeVerified'
                  : getVerificationCaseStatusLabelKey(status),
              )}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {t(
              isVerified
                ? 'editProfile.identityVerification.verifiedBody'
                : 'editProfile.identityVerification.body',
            )}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span>{t('common.loading')}</span>
        </div>
      ) : null}

      {!loading && !isVerified ? (
        <div className="space-y-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              {bundle?.personalInfoCompleted ? (
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
              ) : (
                <span className="h-4 w-4 rounded-full border border-border" aria-hidden />
              )}
              {t('editProfile.identityVerification.checklistPersonal')}
            </li>
            <li className="flex items-center gap-2">
              {bundle?.contactInfoCompleted ? (
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
              ) : (
                <span className="h-4 w-4 rounded-full border border-border" aria-hidden />
              )}
              {t('editProfile.identityVerification.checklistContact')}
            </li>
            <li className="flex items-center gap-2">
              {bundle?.hasIdDocument ? (
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
              ) : (
                <span className="h-4 w-4 rounded-full border border-border" aria-hidden />
              )}
              {t('editProfile.identityVerification.checklistId')}
            </li>
            <li className="flex items-center gap-2">
              {bundle?.hasSelfie ? (
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
              ) : (
                <span className="h-4 w-4 rounded-full border border-border" aria-hidden />
              )}
              {t('editProfile.identityVerification.checklistSelfie')}
            </li>
          </ul>

          {canEditUploads ? (
            <div className="flex flex-wrap gap-2">
              <input
                ref={idInputRef}
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                className="hidden"
                onChange={(event) => void handleIdSelected(event.target.files?.[0] ?? null)}
              />
              <input
                ref={selfieInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(event) => void handleSelfieSelected(event.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={busyAction !== null}
                onClick={() => idInputRef.current?.click()}
                aria-label={t('editProfile.identityVerification.uploadId')}
                title={t('editProfile.identityVerification.uploadId')}
              >
                {busyAction === 'id' ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <FileImage className="h-4 w-4" aria-hidden />
                )}
                <span className="sm:inline">{t('editProfile.identityVerification.uploadId')}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={busyAction !== null}
                onClick={() => void handleCameraSelfie()}
                aria-label={t('editProfile.identityVerification.takeSelfie')}
                title={t('editProfile.identityVerification.takeSelfie')}
              >
                {busyAction === 'camera' ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Camera className="h-4 w-4" aria-hidden />
                )}
                <span className="sm:inline">{t('editProfile.identityVerification.takeSelfie')}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={busyAction !== null}
                onClick={() => selfieInputRef.current?.click()}
                aria-label={t('editProfile.identityVerification.uploadSelfie')}
                title={t('editProfile.identityVerification.uploadSelfie')}
              >
                {busyAction === 'selfie' ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Upload className="h-4 w-4" aria-hidden />
                )}
                <span className="sm:inline">{t('editProfile.identityVerification.uploadSelfie')}</span>
              </Button>
            </div>
          ) : null}

          {status === 'submitted' || status === 'in_review' ? (
            <p className="text-sm text-muted-foreground">
              {t('editProfile.identityVerification.underReview')}
            </p>
          ) : null}

          {status === 'rejected' ? (
            <p className="text-sm text-muted-foreground">
              {t('editProfile.identityVerification.rejected')}
            </p>
          ) : null}

          {canEditUploads ? (
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={!bundle?.canSubmit || busyAction !== null}
              onClick={() => void handleSubmit()}
            >
              {busyAction === 'submit' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              {t('editProfile.identityVerification.submit')}
            </Button>
          ) : null}

          {!bundle?.personalInfoCompleted || !bundle?.contactInfoCompleted ? (
            <p className="text-xs text-muted-foreground">
              {t('editProfile.identityVerification.completeProfileHint')}
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
