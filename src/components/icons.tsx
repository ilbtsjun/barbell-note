// 앱 전체에서 같은 선 굵기(1.9)와 둥근 끝을 쓰는 아이콘 모음
const paths = {
  today: <path d="M2 12h20M6 7v10M18 7v10M4 9v6M20 9v6" />,
  plan: (
    <>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
      <path d="M3.5 9.5h17M8 2.5v4M16 2.5v4M8 14h3M8 17h6" />
    </>
  ),
  log: (
    <>
      <path d="M6 3.5h9l3.5 3.5v13.5H6z" />
      <path d="M9 11h6M9 14.5h6M9 18h3.5" />
    </>
  ),
  stats: (
    <>
      <path d="M3 17l5.5-5.5 4 3.5L21 6.5" />
      <path d="M15.5 6.5H21V12" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </>
  ),
  me: (
    <>
      <circle cx="12" cy="8.5" r="4" />
      <path d="M4.5 20.5c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 21, stroke = 1.9 }: { name: IconName; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
