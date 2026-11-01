/**
 * Liveness and face match, on the member's own device: open-source face models (@vladmandic/face-api, MIT) bundled
 * with the app under /models/face-api, run in the browser. No image leaves the device for these checks; only the
 * results go with the case, as signals for the human reviewer (a modified device could report anything, so they
 * never decide on their own).
 */
export type Move = 'left' | 'right' | 'up' | 'down';

export type LivenessResult = {
  passed: boolean;
  moves_requested: Move[];
  moves_seen: Move[];
  blinks: number;
  frames: number;
  duration_ms: number;
};

export type FaceMatchResult = { passed: boolean; distance: number | null; reason?: string };

type Point = { x: number; y: number };
type FaceApi = typeof import('@vladmandic/face-api');

/** Faces closer than this (euclidean distance between 128-d descriptors) count as the same person. */
export const FACE_MATCH_THRESHOLD = 0.55;
const MODEL_URL = '/models/face-api';
let loading: Promise<FaceApi> | null = null;

export function loadFaceApi(): Promise<FaceApi> {
  loading ??= import('@vladmandic/face-api').then(async (faceapi) => {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    return faceapi;
  });
  return loading;
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Where the nose sits between the face edges (0..1, 0.5 when facing the camera). */
export function yawRatio(points: Point[]): number {
  const left = points[0];
  const right = points[16];
  return (points[30].x - left.x) / Math.max(1, right.x - left.x);
}

/** Where the nose sits between the eyes and the chin (smaller when looking up). */
export function pitchRatio(points: Point[]): number {
  const eyeY = (points[36].y + points[45].y) / 2;
  return (points[30].y - eyeY) / Math.max(1, points[8].y - eyeY);
}

/** Eye aspect ratio, averaged over both eyes: drops sharply when the eyes close. */
export function eyeAspectRatio(points: Point[]): number {
  const ear = (p: Point[]) => (dist(p[1], p[5]) + dist(p[2], p[4])) / (2 * Math.max(1, dist(p[0], p[3])));
  return (ear(points.slice(36, 42)) + ear(points.slice(42, 48))) / 2;
}

/**
 * Which move a face shows against its neutral pose. The raw camera image is not mirrored: when a person turns to
 * their left, their nose moves towards the right of the image.
 */
export function classifyMove(points: Point[], baseline: { yaw: number; pitch: number }): Move | null {
  const yaw = yawRatio(points) - baseline.yaw;
  const pitch = pitchRatio(points) - baseline.pitch;
  if (yaw > 0.12) return 'left';
  if (yaw < -0.12) return 'right';
  if (pitch < -0.08) return 'up';
  if (pitch > 0.08) return 'down';
  return null;
}

/** Follows the moves in order: a move counts once the face returned to neutral after the previous one. */
export function nextLivenessState(state: { done: number; neutral: boolean }, requested: Move[], move: Move | null): { done: number; neutral: boolean } {
  if (state.done >= requested.length) return state;
  if (move === null) return { ...state, neutral: true };
  if (state.neutral && move === requested[state.done]) return { done: state.done + 1, neutral: false };
  return state;
}

export function averageDescriptor(descriptors: Float32Array[]): Float32Array | null {
  if (!descriptors.length) return null;
  const out = new Float32Array(descriptors[0].length);
  for (const d of descriptors) for (let i = 0; i < out.length; i += 1) out[i] += d[i] / descriptors.length;
  return out;
}

export function descriptorDistance(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

/** Tests only: under browser automation a stored flag replaces the camera checks (a webdriver-driven browser has no face to show). */
function e2eStub(): 'pass' | null {
  try {
    return typeof navigator !== 'undefined' && navigator.webdriver && window.localStorage.getItem('civizen.e2e.faceChecks') === 'pass' ? 'pass' : null;
  } catch {
    return null;
  }
}

/**
 * Runs the liveness test on the live video: establishes the neutral pose, then waits for each requested move in order
 * and at least one blink, up to `timeoutMs`. Reports progress for the on-screen guidance. Collects face descriptors of
 * frontal frames for the face match.
 */
export async function runLiveness(video: HTMLVideoElement, requested: Move[], options: {
  timeoutMs?: number;
  onProgress?: (state: { done: number; blinked: boolean; faceFound: boolean }) => void;
  signal?: AbortSignal;
} = {}): Promise<{ result: LivenessResult; descriptor: Float32Array | null }> {
  const started = performance.now();
  if (e2eStub()) {
    options.onProgress?.({ done: requested.length, blinked: true, faceFound: true });
    return {
      result: { passed: true, moves_requested: requested, moves_seen: requested, blinks: 1, frames: 1, duration_ms: 0 },
      descriptor: new Float32Array(128).fill(0.1),
    };
  }
  const faceapi = await loadFaceApi();
  const detector = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
  const timeoutMs = options.timeoutMs ?? 30_000;
  const baselineSamples: { yaw: number; pitch: number; ear: number }[] = [];
  const frontal: Float32Array[] = [];
  const seen: Move[] = [];
  let state = { done: 0, neutral: false };
  let blinks = 0;
  let eyesClosed = false;
  let frames = 0;
  while (performance.now() - started < timeoutMs && !options.signal?.aborted) {
    const found = await faceapi.detectSingleFace(video, detector).withFaceLandmarks().withFaceDescriptor();
    frames += 1;
    if (!found) {
      options.onProgress?.({ done: state.done, blinked: blinks > 0, faceFound: false });
      await new Promise((resolve) => setTimeout(resolve, 120));
      continue;
    }
    const points = found.landmarks.positions;
    if (baselineSamples.length < 5) {
      baselineSamples.push({ yaw: yawRatio(points), pitch: pitchRatio(points), ear: eyeAspectRatio(points) });
      frontal.push(found.descriptor);
      options.onProgress?.({ done: 0, blinked: false, faceFound: true });
      continue;
    }
    const baseline = {
      yaw: baselineSamples.reduce((s, b) => s + b.yaw, 0) / baselineSamples.length,
      pitch: baselineSamples.reduce((s, b) => s + b.pitch, 0) / baselineSamples.length,
    };
    const openEar = baselineSamples.reduce((s, b) => s + b.ear, 0) / baselineSamples.length;
    const move = classifyMove(points, baseline);
    if (move === null && frontal.length < 15) frontal.push(found.descriptor);
    const next = nextLivenessState(state, requested, move);
    if (next.done > state.done) seen.push(requested[state.done]);
    state = next;
    const ear = eyeAspectRatio(points);
    if (!eyesClosed && ear < openEar * 0.7) eyesClosed = true;
    else if (eyesClosed && ear > openEar * 0.85) {
      eyesClosed = false;
      blinks += 1;
    }
    options.onProgress?.({ done: state.done, blinked: blinks > 0, faceFound: true });
    if (state.done >= requested.length && blinks > 0) break;
  }
  return {
    result: {
      passed: state.done >= requested.length && blinks > 0,
      moves_requested: requested, moves_seen: seen, blinks, frames, duration_ms: Math.round(performance.now() - started),
    },
    descriptor: averageDescriptor(frontal),
  };
}

/** Compares the live face with the face on the document photo. */
export async function matchDocumentFace(documentImage: HTMLImageElement, liveDescriptor: Float32Array | null): Promise<FaceMatchResult> {
  if (e2eStub()) return { passed: true, distance: 0.3 };
  if (!liveDescriptor) return { passed: false, distance: null, reason: 'no_live_face' };
  const faceapi = await loadFaceApi();
  const found = await faceapi.detectSingleFace(documentImage, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 }))
    .withFaceLandmarks().withFaceDescriptor();
  if (!found) return { passed: false, distance: null, reason: 'no_document_face' };
  const distance = Math.round(descriptorDistance(found.descriptor, liveDescriptor) * 1000) / 1000;
  return { passed: distance < FACE_MATCH_THRESHOLD, distance };
}
