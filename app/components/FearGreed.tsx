'use client';
import { useEffect, useState } from 'react';

export default function FearGreed() {
  const [value, setValue] = useState<number | null>(null);
  const [label, setLabel] = useState('Loading...');

  useEffect(() => {
    fetch('/api/fear-greed')
      .then((res) => res.json())
      .then((data) => {
        setValue(data.value);
        setLabel(data.label);
      })
      .catch(() => setLabel('Error'));
  }, []);

  const getColor = (val: number) => {
    if (val < 25) return '#FF3B5C';
    if (val < 45) return '#FFB020';
    if (val < 55) return '#8B7FFF';
    return '#00FF9C';
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
      <h2 className="text-xs text-slate-400 uppercase mb-4 font-mono">Fear &amp; Greed</h2>
      <div className="text-5xl font-bold font-mono mb-2" style={{ color: value ? getColor(value) : '#9ca3af' }}>
        {value || '--'}
      </div>
      <p className="text-sm font-mono" style={{ color: value ? getColor(value) : '#9ca3af' }}>
        {label}
      </p>
    </div>
  );
}
