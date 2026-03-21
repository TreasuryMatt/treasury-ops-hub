import React from 'react';

export type SortDir = 'asc' | 'desc';

interface SortIconProps {
  field: string;
  active: boolean;
  dir: SortDir;
}

export function SortIcon({ active, dir }: SortIconProps) {
  if (!active) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
  return <span style={{ marginLeft: 4 }}>{dir === 'asc' ? '↑' : '↓'}</span>;
}
