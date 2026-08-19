export type Role = 'ADMIN' | 'RECEPTION';

export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SafeUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface Hammam {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface PriceRow {
  id: number;
  hammam_id: number;
  category_id: number;
  price: number;
  created_at: Date;
  updated_at: Date;
}

export interface PriceWithNames extends PriceRow {
  hammam_name: string;
  category_name: string;
}

export interface Entry {
  id: number;
  hammam_id: number;
  category_id: number;
  price: number;
  user_id: number;
  created_at: Date;
}

export interface EntryWithNames extends Entry {
  hammam_name: string;
  category_name: string;
  user_name: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  rows: T[];
  pagination: Pagination;
}

export interface PeriodRange {
  start: Date;
  end: Date;
  period: string;
  fromLabel: string;
  toLabel: string;
}

export interface DashboardSummary {
  menAdults: number;
  menChildren: number;
  womenAdults: number;
  womenChildren: number;
  total: number;
  revenue: number;
}

export interface DayPoint {
  day: string;
  entries: number;
  revenue: number;
}

export interface AgentPoint {
  user_id: number;
  name: string;
  entries: number;
  revenue: number;
}

export interface DashboardData {
  entries: DashboardSummary;
  revenue: number;
  daily: DayPoint[];
  byAgent: AgentPoint[];
  range: { from: string; to: string };
}
