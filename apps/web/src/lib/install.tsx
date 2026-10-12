import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as { standalone?: boolean }).standalone))
  );
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    function onPrompt(event: Event) {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setDeferred(null);
      setInstalled(true);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  return {
    canInstall: Boolean(deferred) && !installed,
    installed,
    install,
  };
}

export function InstallButton() {
  const { canInstall, install } = useInstallPrompt();
  if (!canInstall) return null;

  return (
    <button
      type="button"
      onClick={() => void install()}
      aria-label="Install UrbanMesh"
      title="Install"
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-civic-line text-civic-slate"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 4v10.5M8.5 11.5 12 15l3.5-3.5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5 18.5h14"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
