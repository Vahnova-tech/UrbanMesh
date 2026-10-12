import { useEffect, useRef, useState } from "react";

interface CameraCaptureProps {
  photoData: string | null;
  onCapture: (dataUrl: string) => void;
  onRetake: () => void;
}

export function CameraCapture({
  photoData,
  onCapture,
  onRetake,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (photoData) return;

    let cancelled = false;

    async function start() {
      setError(null);
      setReady(false);
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This device cannot open a camera.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.setAttribute("playsinline", "true");
          video.setAttribute("webkit-playsinline", "true");
          video.srcObject = stream;
          await video.play();
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setError("Camera permission is needed to photograph this hazard.");
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [photoData]);

  function snap() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    onCapture(canvas.toDataURL("image/jpeg", 0.82));
  }

  if (photoData) {
    return (
      <div>
        <img
          src={photoData}
          alt="Captured hazard evidence"
          className="max-h-44 w-full rounded-card object-cover lg:max-h-80"
        />
        <button
          type="button"
          onClick={onRetake}
          className="mt-3 w-full rounded-card border border-civic-line py-3 text-sm font-semibold"
        >
          Retake photo
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-card bg-civic-mist">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="h-44 w-full object-cover lg:h-80"
        />
        {!ready && !error ? (
          <p className="absolute inset-0 flex items-center justify-center text-sm font-medium text-civic-muted">
            Opening camera…
          </p>
        ) : null}
      </div>
      {error ? (
        <p className="mt-2 text-sm font-semibold text-civic-critical">{error}</p>
      ) : (
        <button
          type="button"
          onClick={snap}
          disabled={!ready}
          className="mt-3 w-full rounded-card bg-civic-ink py-3 text-sm font-semibold text-civic-paper disabled:opacity-50"
        >
          Take photo
        </button>
      )}
    </div>
  );
}
