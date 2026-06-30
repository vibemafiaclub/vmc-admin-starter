'use client';

import { useEffect, useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { clsx } from 'clsx';

export function MaskToggle() {
  const [masked, setMasked] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings/masking')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setMasked(Boolean(data.masking_enabled));
      })
      .catch(() => {
        if (!cancelled) setMasked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleToggle() {
    if (masked === null || busy) return;
    setBusy(true);
    try {
      await fetch('/api/settings/masking', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masking_enabled: !masked }),
      });
      window.location.reload();
    } catch {
      setBusy(false);
    }
  }

  // Loading state: render a stable placeholder so layout doesn't jump.
  if (masked === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-gray-700 text-gray-400 px-2 py-1 text-xs">
        <Lock size={12} />
        마스킹
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={busy}
      className={clsx(
        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
        'disabled:opacity-60',
        masked
          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
          : 'bg-green-100 text-green-700 hover:bg-green-200',
      )}
    >
      {masked ? <Lock size={12} /> : <Unlock size={12} />}
      {masked ? '마스킹 ON' : '마스킹 OFF'}
    </button>
  );
}

export default MaskToggle;
