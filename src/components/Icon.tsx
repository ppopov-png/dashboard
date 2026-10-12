type IconName = 'home' | 'users' | 'layers' | 'briefcase' | 'chart' | 'settings' | 'calendar' | 'pnl' | 'roi' | 'trade' | 'trophy' | 'search' | 'download' | 'logout'

const paths: Record<IconName, string> = {
  home: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 4a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.9M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  layers: 'm12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5',
  briefcase: 'M9 7V4h6v3M3 7h18v14H3V7Zm0 5 9 3 9-3M10 12h4',
  chart: 'M4 21V12h4v9H4Zm6 0V7h4v14h-4Zm6 0V3h4v18h-4Z',
  settings: 'm9 3-1 3-3 1-2 3 2 2-1 3 2 3h3l2 3 3-1 1-3 3-1 2-3-2-2 1-3-2-3h-3l-2-3-3 1ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  calendar: 'M4 5h16v16H4V5ZM8 3v4M16 3v4M4 10h16M8 14h1M12 14h1M16 14h1M8 18h1M12 18h1',
  pnl: 'M4 21V14h3v7H4Zm6 0V9h3v12h-3Zm6 0V3h3v18h-3Z',
  roi: 'M12 3v9h9M9 3.5a9 9 0 1 0 11.5 11M15 3.5a9 9 0 0 1 5.5 5.5',
  trade: 'M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4',
  trophy: 'M7 3h10v6a5 5 0 0 1-10 0V3ZM7 5H3v3a4 4 0 0 0 4 4M17 5h4v3a4 4 0 0 1-4 4M12 14v6M8 21h8',
  search: 'M17 17l4 4M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  logout: 'M9 4H4v16h5M10 12h11m-4-4 4 4-4 4',
}

export default function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg className={`ui-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
