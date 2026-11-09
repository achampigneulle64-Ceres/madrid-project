import { registerSW } from 'virtual:pwa-register';

/**
 * Mises à jour de l'app installée.
 * Sur iPhone, une web app reste souvent en mémoire : on vérifie donc s'il existe
 * une nouvelle version à chaque retour dans l'app, puis toutes les 30 minutes.
 * La nouvelle version s'applique tout de suite, sauf pendant une mission ou une
 * révision : elle attend alors le retour à l'accueil, pour ne rien interrompre.
 */
let busy = false;
let pending = false;
let apply: ((reload?: boolean) => Promise<void>) | null = null;

export function setBusy(b: boolean) {
  busy = b;
  if (!busy && pending) apply?.(true);
}

export function startUpdates() {
  if (!('serviceWorker' in navigator)) return;
  apply = registerSW({
    immediate: true,
    onNeedRefresh() {
      pending = true;
      if (!busy) apply?.(true);
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      const check = () => {
        if (navigator.onLine) reg.update().catch(() => {});
      };
      setInterval(check, 30 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
  });
}
