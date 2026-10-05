export type PeriodType = 'snapshot' | 'month'

export interface Period {
  key: string
  label: string
  type: PeriodType
}

export interface TraderRow {
  name: string
  pnl: number
  roi: number
  bybit: number
  mexc: number
  lmax: number
  spot: number | null
  capitalAfter: number | null
  capitalStart: number
  openTrades?: number | null
}

export interface InvestHistoryItem {
  realized: number
  allocation: number
  note: string
}

export interface Interval {
  label: string
  from: string | null
  to: string
  note: string
}

export interface CapitalEvent {
  date: string
  text: string
}

export interface InvestIdea {
  name: string
  status: 'open' | 'closed'
  detail: string
}

export interface InvestTeam {
  team: string
  allocation: number
  pnl: number
  roi: number
  open: number
  closed: number
  ideas: InvestIdea[]
}

export interface DataQualityNote {
  title: string
  text: string
}

export interface InvestTimelineItem {
  date: string
  text: string
}

export interface InvestMeta {
  asOf: string
  totalIdeas: number
  openIdeas: number
  closedIdeas: number
  realizedPnl: number
  realizedBase: number
  unrealizedPnl: number
  activeAllocation: number
}

export interface DashboardData {
  updatedAt: string
  traders: string[]
  periods: Period[]
  investHistory: Record<string, InvestHistoryItem>
  data: Record<string, TraderRow[]>
  intervals: Interval[]
  capitalEvents: Record<string, CapitalEvent[]>
  investTeams: Record<string, InvestTeam>
  dataQualityNotes: DataQualityNote[]
  investMeta: InvestMeta
  investTimeline: InvestTimelineItem[]
}
