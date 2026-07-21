/**
 * A股交易日历：基于 chinese-days 节假日数据，严格判断某日期是否为交易日
 * 交易日 = 周一至周五 且 不在法定节假日
 * 调休补班日（周末变工作日）A股仍休市，故不视为交易日
 */

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/chinese-days@1/dist/years';
const YEAR_CACHE = new Map(); // year -> Set<dateStr> (holidays)
/** chinese-days@1 包已发布的最新年份，超过此年份的数据尚未发布，跳过请求 */
const MAX_PUBLISHED_YEAR = 2026;

/**
 * 加载某年的节假日数据
 * @param {number} year
 * @returns {Promise<Set<string>>} 节假日日期集合，格式 YYYY-MM-DD
 */
export async function loadHolidaysForYear(year) {
  if (YEAR_CACHE.has(year)) {
    return YEAR_CACHE.get(year);
  }
  // 未来年份数据尚未发布，直接返回空集，不发起网络请求
  if (year > MAX_PUBLISHED_YEAR) {
    YEAR_CACHE.set(year, new Set());
    return YEAR_CACHE.get(year);
  }
  try {
    const res = await fetch(`${CDN_BASE}/${year}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const holidays = new Set(Object.keys(data?.holidays ?? {}));
    YEAR_CACHE.set(year, holidays);
    return holidays;
  } catch (e) {
    // 404 = 未来年份数据尚未发布，静默处理；其他异常（网络/解析）才告警
    if (!e?.message?.includes('HTTP 404')) {
      console.warn(`[tradingCalendar] 加载 ${year} 年节假日失败:`, e);
    }
    YEAR_CACHE.set(year, new Set());
    return YEAR_CACHE.get(year);
  }
}

/**
 * 加载多个年份的节假日数据
 * @param {number[]} years
 */
export async function loadHolidaysForYears(years) {
  await Promise.all([...new Set(years)].map(loadHolidaysForYear));
}

/**
 * 判断某日期是否为 A股交易日
 * @param {dayjs.Dayjs} date - dayjs 对象
 * @param {Map<number, Set<string>>} [cache] - 可选，已加载的年份缓存，默认使用内部 YEAR_CACHE
 * @returns {boolean}
 */
export function isTradingDay(date, cache = YEAR_CACHE) {
  const dayOfWeek = date.day(); // 0=周日, 6=周六
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;

  const dateStr = date.format('YYYY-MM-DD');
  const year = date.year();
  const holidays = cache.get(year);
  if (!holidays) return true; // 未加载该年数据时，仅排除周末
  return !holidays.has(dateStr);
}
