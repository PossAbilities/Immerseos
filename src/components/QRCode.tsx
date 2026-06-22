import { useEffect, useState } from 'react';
import QR from 'qrcode';

/** Renders a value as a crisp QR code data-URL image. */
export function QRCode({ value, size = 192 }: { value: string; size?: number }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancelled = false;
    QR.toDataURL(value, {
      width: size * 2,
      margin: 1,
      color: { dark: '#0c0e12', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        /* ignore — value may be empty during first paint */
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  return src ? (
    <img
      src={src}
      width={size}
      height={size}
      alt="Scan to open the ImmerseOS remote"
      className="h-full w-full object-contain"
    />
  ) : (
    <div className="h-full w-full animate-pulse rounded bg-surface-container" />
  );
}

/**
 * Resolves the URL a phone should open to reach the remote. In Electron the
 * preload bridge exposes the real LAN address; in the browser we fall back to
 * the current origin's remote route so QR scanning still works on the same Wi-Fi.
 */
export function useRemoteUrl(): string {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const bridge = (window as unknown as { immerse?: { remoteUrl?: () => Promise<string> } })
      .immerse;
    if (bridge?.remoteUrl) {
      bridge.remoteUrl().then(setUrl).catch(() => setUrl(fallback()));
    } else {
      setUrl(fallback());
    }
  }, []);
  return url;
}

function fallback(): string {
  const base = location.origin + location.pathname.replace(/[^/]*$/, '');
  return base + 'remote.html';
}
