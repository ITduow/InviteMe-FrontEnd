"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";
import { Button } from "@/shared/ui/button";

type DetectedCode = { rawValue: string };
type BarcodeDetectorInstance = {
  detect: (source: HTMLVideoElement) => Promise<DetectedCode[]>;
};
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorInstance;

export function QrCameraScanner({
  disabled = false,
  autoStart = false,
  onDetected,
}: {
  disabled?: boolean;
  autoStart?: boolean;
  onDetected: (value: string) => void;
}) {
  const [active, setActive] = useState(autoStart);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    if (!active) return;
    let disposed = false;
    let stream: MediaStream | undefined;
    let timer: number | undefined;

    const stop = () => {
      disposed = true;
      if (timer !== undefined) window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    async function start() {
      const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
        .BarcodeDetector;
      if (!Detector) {
        setError(
          "Trình duyệt này chưa hỗ trợ quét QR bằng camera. Hãy dán link hoặc dùng máy quét QR.",
        );
        setActive(false);
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Không truy cập được camera trên kết nối này. Hãy dán link thiệp vào ô tra cứu.");
        setActive(false);
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const detector = new Detector({ formats: ["qr_code"] });

        const scan = async () => {
          if (disposed) return;
          try {
            const result = (await detector.detect(video)).find((item) => item.rawValue.trim());
            if (result) {
              setActive(false);
              onDetectedRef.current(result.rawValue);
              return;
            }
          } catch {
            // Camera frames can briefly fail while autofocus is adjusting.
          }
          if (!disposed) timer = window.setTimeout(() => void scan(), 180);
        };
        void scan();
      } catch (cause) {
        if (disposed) return;
        const name = cause instanceof Error ? cause.name : "";
        setError(
          name === "NotAllowedError"
            ? "Chưa được cấp quyền camera. Cho phép camera hoặc dán link thiệp để tiếp tục."
            : "Không mở được camera. Hãy dán link thiệp hoặc thử camera khác.",
        );
        setActive(false);
      }
    }

    void start();
    return stop;
  }, [active]);

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => {
          setError("");
          setActive((value) => !value);
        }}
        aria-pressed={active}
      >
        {active ? <CameraOff aria-hidden="true" /> : <Camera aria-hidden="true" />}
        {active ? "Tắt camera" : "Quét bằng camera"}
      </Button>
      {active && (
        <div className="space-y-2 rounded-xl border bg-black p-2">
          <video
            ref={videoRef}
            className="mx-auto max-h-72 w-full rounded-lg object-cover"
            muted
            playsInline
            aria-label="Hình ảnh camera để quét mã QR thiệp"
          />
          <p className="text-center text-sm text-white">
            Đưa mã QR vào khung hình. Quét chỉ tra cứu, chưa ghi nhận check-in.
          </p>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
        >
          {error}
        </p>
      )}
    </div>
  );
}
