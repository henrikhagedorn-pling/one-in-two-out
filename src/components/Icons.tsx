// Inline-SVG-Icons, Pfade aus design/screens/. Strich 1,6–1,8 px, currentColor.
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number };

function Svg({ size = 24, strokeWidth = 1.6, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={rest['aria-label'] ? undefined : true}
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconScale = (p: P) => (
  <Svg {...p}>
    <path d="M12 4v16M7 20h10M5 7h14M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z" />
  </Svg>
);
export const IconPlus = (p: P) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IconMinus = (p: P) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M5 12h14" />
  </Svg>
);
export const IconUpDown = (p: P) => (
  <Svg {...p}>
    <path d="M8 20V5M4 9l4-4 4 4M16 4v15M12 15l4 4 4-4" />
  </Svg>
);
export const IconArchive = (p: P) => (
  <Svg {...p}>
    <path d="M3 5h18v4H3zM5 9v10h14V9M10 13h4" />
  </Svg>
);
export const IconChevronRight = (p: P) => (
  <Svg strokeWidth={1.8} {...p}>
    <path d="M9 5l7 7-7 7" />
  </Svg>
);
export const IconChevronLeft = (p: P) => (
  <Svg strokeWidth={1.8} {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);
export const IconCalendar = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M4 10h16M9 3v4M15 3v4" />
  </Svg>
);
export const IconCheck = (p: P) => (
  <Svg strokeWidth={2.2} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
export const IconOut = (p: P) => (
  <Svg strokeWidth={1.7} {...p}>
    <path d="M12 14V3M8 7l4-4 4 4M4 14v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" />
  </Svg>
);
export const IconIn = (p: P) => (
  <Svg strokeWidth={1.7} {...p}>
    <path d="M12 3v11M8 10l4 4 4-4M4 14v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" />
  </Svg>
);
export const IconSwap = (p: P) => (
  <Svg strokeWidth={1.7} {...p}>
    <path d="M4 9h14l-3-3M20 15H6l3 3" />
  </Svg>
);
export const IconEdit = (p: P) => (
  <Svg strokeWidth={1.7} {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" />
  </Svg>
);
export const IconTrash = (p: P) => (
  <Svg strokeWidth={1.7} {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Svg>
);
export const IconExport = (p: P) => (
  <Svg strokeWidth={1.8} {...p}>
    <path d="M12 15V3M8 7l4-4 4 4M6 11H5v10h14V11h-1" />
  </Svg>
);
export const IconImport = (p: P) => (
  <Svg strokeWidth={1.8} {...p}>
    <path d="M12 3v12M8 11l4 4 4-4M6 11H5v10h14V11h-1" />
  </Svg>
);
export const IconFile = (p: P) => (
  <Svg {...p}>
    <path d="M14 3H6v18h12V7zM14 3v4h4" />
  </Svg>
);
export const IconWarning = (p: P) => (
  <Svg strokeWidth={1.8} {...p}>
    <path d="M12 4l9 16H3zM12 10v4M12 17v.5" />
  </Svg>
);
