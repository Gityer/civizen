import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Circle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { runLiveness, type LivenessResult } from '@/lib/face-checks';
import type { LiveChallenge } from '@/lib/identity-live';

export type LiveCapture = { video: Blob; liveness: LivenessResult; descriptor: Float32Array | null };

const MIN_RECORDING_MS = 2_000;

function recorderType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
}

async function openCamera(): Promise<MediaStream> {
  const video = { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } };
  try {
    return await navigator.mediaDevices.getUserMedia({ video, audio: true });
  } catch {
    return navigator.mediaDevices.getUserMedia({ video, audio: false });
  }
}

/**
 * Step 3: the live check. The camera stays on this device; the member reads the server's code aloud, makes the
 * requested head moves and blinks while the clip records. The clip goes to the reviewers with the device's results.
 */
export function LiveStep({ challenge, onDone, onBack }: {
  challenge: LiveChallenge;
  onDone: (capture: LiveCapture) => void;
  onBack: () => void;
}) {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState<'idle' | 'ready' | 'running' | 'failed'>('idle');
  const [cameraError, setCameraError] = useState(false);
  const [progress, setProgress] = useState({ done: 0, blinked: false, faceFound: false });
  const [failed, setFailed] = useState<LiveCapture | null>(null);

  const stopCamera = useCallback(() => {
    abortRef.current?.abort();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);
  useEffect(() => stopCamera, [stopCamera]);

  const start = async () => {
    setCameraError(false);
    try {
      const stream = await openCamera();
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setPhase('ready');
    } catch {
      setCameraError(true);
    }
  };

  const record = async () => {
    const stream = streamRef.current;
    const video = videoRef.current;
    if (!stream || !video) return;
    setPhase('running');
    setFailed(null);
    const chunks: Blob[] = [];
    const type = recorderType();
    const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 1_000_000 });
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });
    const startedAt = Date.now();
    recorder.start(500);
    abortRef.current = new AbortController();
    const { result, descriptor } = await runLiveness(video, challenge.moves, {
      timeoutMs: 30_000, signal: abortRef.current.signal, onProgress: setProgress,
    });
    const remaining = MIN_RECORDING_MS - (Date.now() - startedAt);
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    recorder.stop();
    await stopped;
    const capture = { video: new Blob(chunks, { type: (type ?? 'video/webm').split(';')[0] }), liveness: result, descriptor };
    if (result.passed) {
      stopCamera();
      onDone(capture);
    } else {
      setFailed(capture);
      setPhase('failed');
    }
  };

  const current = challenge.moves[progress.done];

  return (
    <Card className="space-y-4 p-4" data-testid="verify-live-step">
      <h2 className="text-base font-semibold">{t('verify.live.title')}</h2>
      <p className="text-sm text-muted-foreground">{t('verify.live.hint')}</p>

      <div className="rounded-md border bg-muted/40 p-3 text-center">
        <p className="text-xs text-muted-foreground">{t('verify.live.codeLabel')}</p>
        <p className="font-mono text-2xl font-semibold tracking-widest" data-testid="verify-challenge-code">{challenge.code}</p>
      </div>

      <div className="relative mx-auto aspect-[4/3] w-full max-w-sm overflow-hidden rounded-md bg-black">
        {/* Mirrored for the member's comfort; the checks read the unmirrored frames. */}
        <video ref={videoRef} muted playsInline className="h-full w-full -scale-x-100 object-cover" aria-label={t('verify.live.preview')} />
        {phase === 'idle' ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera className="h-10 w-10 text-white/70" aria-hidden />
          </div>
        ) : null}
      </div>

      <ol className="space-y-1 text-sm" aria-live="polite" data-testid="verify-live-moves">
        {challenge.moves.map((move, index) => (
          <li key={`${move}-${index}`} className="flex items-center gap-2">
            {index < progress.done ? <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden /> : <Circle className="h-4 w-4 text-muted-foreground" aria-hidden />}
            <span className={index === progress.done && phase === 'running' ? 'font-semibold' : undefined}>{t(`verify.live.move.${move}`)}</span>
          </li>
        ))}
        <li className="flex items-center gap-2">
          {progress.blinked ? <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden /> : <Circle className="h-4 w-4 text-muted-foreground" aria-hidden />}
          <span>{t('verify.live.blink')}</span>
        </li>
      </ol>
      {phase === 'running' ? (
        <p className="text-sm" aria-live="polite">
          {!progress.faceFound ? t('verify.live.noFace') : current ? t(`verify.live.move.${current}`) : t('verify.live.blink')}
        </p>
      ) : null}

      {cameraError ? <p className="text-sm text-destructive" role="alert">{t('verify.live.cameraError')}</p> : null}
      {phase === 'failed' ? <p className="text-sm text-destructive" role="alert" data-testid="verify-live-failed">{t('verify.live.failed')}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={phase === 'running'} onClick={() => { stopCamera(); onBack(); }}>{t('verify.back')}</Button>
        {phase === 'idle' ? <Button type="button" data-testid="verify-camera-start" onClick={() => void start()}>{t('verify.live.camera')}</Button> : null}
        {phase === 'ready' || phase === 'failed' ? (
          <Button type="button" data-testid="verify-live-record" onClick={() => void record()}>
            {phase === 'failed' ? t('verify.live.retry') : t('verify.live.record')}
          </Button>
        ) : null}
        {phase === 'failed' && failed ? (
          <Button type="button" variant="secondary" onClick={() => { stopCamera(); onDone(failed); }}>{t('verify.live.sendAnyway')}</Button>
        ) : null}
      </div>
    </Card>
  );
}
