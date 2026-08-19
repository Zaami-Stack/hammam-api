import { byAgent, dailySeries, summaryByCombo } from '../repositories/dashboard.repo';
import { referenceMaps } from '../repositories/meta.repo';
import { DashboardData, DashboardSummary } from '../types/entities';
import { getUtcOffsetMinutes, resolveRange } from '../utils/time';

export async function getDashboard(
  period: string,
  from?: string,
  to?: string
): Promise<DashboardData> {
  const range = resolveRange(period, from, to);
  const [comboRows, daily, agents, refs] = await Promise.all([
    summaryByCombo(range.start, range.end),
    dailySeries(range.start, range.end, getUtcOffsetMinutes(range.start.getTime())),
    byAgent(range.start, range.end),
    referenceMaps(),
  ]);

  const summary: DashboardSummary = {
    menAdults: 0,
    menChildren: 0,
    womenAdults: 0,
    womenChildren: 0,
    total: 0,
    revenue: 0,
  };

  for (const row of comboRows) {
    const hammam = refs.hammamName.get(row.hammam_id);
    const category = refs.categoryName.get(row.category_id);
    summary.total += row.count;
    summary.revenue += row.revenue;
    if (hammam === 'Men' && category === 'Adult') summary.menAdults = row.count;
    if (hammam === 'Men' && category === 'Child') summary.menChildren = row.count;
    if (hammam === 'Women' && category === 'Adult') summary.womenAdults = row.count;
    if (hammam === 'Women' && category === 'Child') summary.womenChildren = row.count;
  }

  return {
    entries: summary,
    revenue: summary.revenue,
    daily,
    byAgent: agents,
    range: { from: range.fromLabel, to: range.toLabel },
  };
}