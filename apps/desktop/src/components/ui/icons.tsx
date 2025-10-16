/**
 * 简单的 SVG 图标组件
 * 替代 lucide-react
 */

import { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

const createIcon = (path: string | string[]) => {
  return ({ size = 24, className = '', ...props }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icon ${className}`}
      {...props}
    >
      {Array.isArray(path) ? path.map((p, i) => <path key={i} d={p} />) : <path d={path} />}
    </svg>
  );
};

export const Cloud = createIcon('M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z');

export const CloudOff = createIcon([
  'M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3',
  'M1 1l22 22'
]);

export const RefreshCw = createIcon([
  'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8',
  'M21 3v5h-5',
  'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16',
  'M3 21v-5h5'
]);

export const CheckCircle2 = createIcon([
  'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z',
  'M9 12l2 2 4-4'
]);

export const XCircle = createIcon([
  'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z',
  'M15 9l-6 6',
  'M9 9l6 6'
]);

export const AlertCircle = createIcon([
  'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z',
  'M12 8v4',
  'M12 16h.01'
]);

export const LogIn = createIcon([
  'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4',
  'M10 17l5-5-5-5',
  'M15 12H3'
]);

export const LogOut = createIcon([
  'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4',
  'M16 17l5-5-5-5',
  'M21 12H9'
]);

export const Database = createIcon([
  'M12 8c-4.97 0-9-1.343-9-3s4.03-3 9-3 9 1.343 9 3-4.03 3-9 3z',
  'M3 5v7c0 1.657 4.03 3 9 3s9-1.343 9-3V5',
  'M3 12v7c0 1.657 4.03 3 9 3s9-1.343 9-3v-7'
]);

export const HardDrive = createIcon([
  'M22 12H2',
  'M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
  'M6 16h.01',
  'M10 16h.01'
]);

export const Share2 = createIcon([
  'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8',
  'M16 6l-4-4-4 4',
  'M12 2v13'
]);

export const Copy = createIcon([
  'M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z',
  'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'
]);

export const Trash2 = createIcon([
  'M3 6h18',
  'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6',
  'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2',
  'M10 11v6',
  'M14 11v6'
]);

export const Eye = createIcon([
  'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z',
  'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'
]);

export const Download = createIcon([
  'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
  'M7 10l5 5 5-5',
  'M12 15V3'
]);

export const Calendar = createIcon([
  'M8 2v4',
  'M16 2v4',
  'M3 10h18',
  'M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z'
]);

export const ExternalLink = createIcon([
  'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
  'M15 3h6v6',
  'M10 14L21 3'
]);

export const Clock = createIcon([
  'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z',
  'M12 6v6l4 2'
]);

export const Link = createIcon([
  'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
  'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'
]);

export const Shield = createIcon([
  'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'
]);

export const AlertTriangle = createIcon([
  'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
  'M12 9v4',
  'M12 17h.01'
]);

export const Upload = createIcon([
  'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
  'M17 8l-5-5-5 5',
  'M12 3v12'
]);

export const Edit3 = createIcon([
  'M12 20h9',
  'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z'
]);

export const Save = createIcon([
  'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z',
  'M17 21v-8H7v8',
  'M7 3v5h8'
]);
