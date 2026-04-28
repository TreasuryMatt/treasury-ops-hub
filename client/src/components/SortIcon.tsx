import React from 'react';
import { Icon } from './Icon';

export type SortDir = 'asc' | 'desc';

interface SortIconProps {
  field: string;
  active: boolean;
  dir: SortDir;
}

export function SortIcon({ active, dir }: SortIconProps) {
  if (!active) return <Icon name="arrow_updown" size={16} color="#fff" style={{ opacity: 0.4, marginLeft: 4, verticalAlign: 'middle' }} />;
  return <Icon name={dir === 'asc' ? 'arrow_up' : 'arrow_down'} size={16} color="#fff" style={{ marginLeft: 4, verticalAlign: 'middle' }} />;
}
