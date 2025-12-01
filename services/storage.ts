import { TranslationRecord, AnalyticsData, LANGUAGES } from '../types';

const STORAGE_KEY = 'linguistai_history';

export const saveTranslation = (record: Omit<TranslationRecord, 'id' | 'timestamp'>) => {
  const history = getHistory();
  const newRecord: TranslationRecord = {
    ...record,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  history.unshift(newRecord);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return newRecord;
};

export const getHistory = (): TranslationRecord[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const clearHistory = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const getAnalytics = (): AnalyticsData => {
  const history = getHistory();
  const totalTranslations = history.length;

  // Language Distribution
  const langCounts: Record<string, number> = {};
  history.forEach(rec => {
    const key = LANGUAGES.find(l => l.code === rec.targetLang)?.name || rec.targetLang;
    langCounts[key] = (langCounts[key] || 0) + 1;
  });

  const languageDistribution = Object.entries(langCounts).map(([name, value]) => ({
    name,
    value,
  }));

  // Daily Activity (Last 7 days)
  const days: Record<string, number> = {};
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days[d.toISOString().split('T')[0]] = 0;
  }

  history.forEach(rec => {
    const date = new Date(rec.timestamp).toISOString().split('T')[0];
    if (days[date] !== undefined) {
      days[date]++;
    }
  });

  const dailyActivity = Object.entries(days).map(([date, count]) => ({
    date,
    count,
  }));

  return {
    totalTranslations,
    languageDistribution,
    dailyActivity,
  };
};