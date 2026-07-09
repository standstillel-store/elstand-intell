'use client';
import { useEffect, useState } from 'react';

export default function FearGreed() {
  const [value, setValue] = useState<number | null>(null);
  const [label, setLabel] = useState('Loading...');

  useEffect(() => {
    fetch('/api/fear-greed')
      .then((res) => res.json())
      .then((data) => {
        if (data.value !== undefined) {
          setValue(data.value);
          setLabel(data.label);
        } else {
          setLabel('Gagal memuat');
        }
      })
      .catch(() => setLabel('Gagal memuat'));
  }, []);

  const getColor = (val: number) => {
    if (val < 25) return '#FF3B5C';
    if (val < 45) return '#FFB020';
    if (val < 55) return '#8B7FFF';
    return '#00FF9C';
  };

  const color = value !== null ? getColor(value) : '#6B7386';

  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
      <h2 className="text-xs text-slate-400 uppercase tracking-wider mb-4 font-mono">
        Fear &amp; Greed Index
      </h2>

      <div className="text-5xl font-bold mb-2 font-mono" style={{ color }}>
        {value !== null ? value : '--'}
      </div>

      <p className="text-sm font-mono uppercase tracking-wide" style={{ color }}>
        {label}
      </p>
    </div>
  );
}
