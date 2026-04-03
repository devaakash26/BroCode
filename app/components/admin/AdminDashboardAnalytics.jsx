'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const FILTERS = [
  { key: '24h', label: '24 hr', hours: 24 },
  { key: '3d', label: '3 days', hours: 72 },
  { key: '1w', label: '1 week', hours: 24 * 7 },
  { key: '1m', label: '1 month', hours: 24 * 30 },
  { key: '3m', label: '3 months', hours: 24 * 90 },
  { key: '6m', label: '6 months', hours: 24 * 180 },
];

function getFilterConfig(filterKey) {
  return FILTERS.find((f) => f.key === filterKey) || FILTERS[0];
}

function getStepMs(filterKey) {
  if (filterKey === '24h') return 60 * 60 * 1000;
  if (filterKey === '3d') return 3 * 60 * 60 * 1000;
  if (filterKey === '1w') return 24 * 60 * 60 * 1000;
  if (filterKey === '1m') return 24 * 60 * 60 * 1000;
  if (filterKey === '3m') return 7 * 24 * 60 * 60 * 1000;
  return 14 * 24 * 60 * 60 * 1000;
}

function formatAxisLabel(date, filterKey) {
  if (filterKey === '24h' || filterKey === '3d') {
    return date.toLocaleTimeString('en-US', { hour: 'numeric' });
  }

  if (filterKey === '1w' || filterKey === '1m') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function toDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildTimeline({ filterKey, userSignupEvents, groupCreatedEvents, challengeJoinEvents }) {
  const now = Date.now();
  const filter = getFilterConfig(filterKey);
  const rangeStart = now - filter.hours * 60 * 60 * 1000;
  const stepMs = getStepMs(filterKey);

  const bucketCount = Math.max(1, Math.ceil((now - rangeStart) / stepMs));
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = rangeStart + index * stepMs;
    const bucketDate = new Date(bucketStart);
    return {
      label: formatAxisLabel(bucketDate, filterKey),
      signups: 0,
      groups: 0,
      joins: 0,
    };
  });

  const addEvent = (rawDate, metric) => {
    const date = toDate(rawDate);
    if (!date) return;
    const timestamp = date.getTime();
    if (timestamp < rangeStart || timestamp > now) return;

    const rawIndex = Math.floor((timestamp - rangeStart) / stepMs);
    const index = Math.min(bucketCount - 1, Math.max(0, rawIndex));
    buckets[index][metric] += 1;
  };

  userSignupEvents.forEach((date) => addEvent(date, 'signups'));
  groupCreatedEvents.forEach((date) => addEvent(date, 'groups'));
  challengeJoinEvents.forEach((entry) => addEvent(entry.createdAt, 'joins'));

  return buckets;
}

function buildChallengeByName({ filterKey, challengeEvents, challengeJoinEvents }) {
  const now = Date.now();
  const filter = getFilterConfig(filterKey);
  const rangeStart = now - filter.hours * 60 * 60 * 1000;

  const map = new Map();

  challengeEvents.forEach((challenge) => {
    const date = toDate(challenge.createdAt);
    if (!date) return;
    const timestamp = date.getTime();
    if (timestamp < rangeStart || timestamp > now) return;

    const key = challenge.title || 'Untitled';
    if (!map.has(key)) {
      map.set(key, { name: key, created: 0, joined: 0 });
    }
    map.get(key).created += 1;
  });

  challengeJoinEvents.forEach((join) => {
    const date = toDate(join.createdAt);
    if (!date) return;
    const timestamp = date.getTime();
    if (timestamp < rangeStart || timestamp > now) return;

    const key = join.title || 'Untitled';
    if (!map.has(key)) {
      map.set(key, { name: key, created: 0, joined: 0 });
    }
    map.get(key).joined += 1;
  });

  return Array.from(map.values())
    .sort((a, b) => (b.joined + b.created) - (a.joined + a.created))
    .slice(0, 8);
}

export default function AdminDashboardAnalytics({
  userSignupEvents,
  groupCreatedEvents,
  challengeEvents,
  challengeJoinEvents,
}) {
  const [filterKey, setFilterKey] = useState('24h');

  const timelineData = useMemo(
    () => buildTimeline({ filterKey, userSignupEvents, groupCreatedEvents, challengeJoinEvents }),
    [filterKey, userSignupEvents, groupCreatedEvents, challengeJoinEvents]
  );

  const challengeByNameData = useMemo(
    () => buildChallengeByName({ filterKey, challengeEvents, challengeJoinEvents }),
    [filterKey, challengeEvents, challengeJoinEvents]
  );

  const selectedLabel = getFilterConfig(filterKey).label;

  return (
    <section className="space-y-5">
      <Card className="border-gray-200/70 dark:border-gray-700/70 bg-white/80 dark:bg-gray-800/70 backdrop-blur-sm">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl">User Activity Trend</CardTitle>
            <CardDescription>Signups and challenge joins over {selectedLabel.toLowerCase()}</CardDescription>
          </div>
          <Tabs value={filterKey} onValueChange={setFilterKey}>
            <TabsList className="h-auto flex-wrap justify-start gap-1 bg-gray-100 dark:bg-gray-900 p-1">
              {FILTERS.map((filter) => (
                <TabsTrigger
                  key={filter.key}
                  value={filter.key}
                  className="text-xs px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white"
                >
                  {filter.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="pl-2 pr-3 pb-4">
          <div className="h-[310px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ left: 8, right: 12, top: 18, bottom: 8 }}>
                <defs>
                  <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#93c5fd" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="joinGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '0.75rem',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    background: 'rgba(15, 23, 42, 0.95)',
                    color: '#e5e7eb',
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="signups" name="New Users" stroke="#93c5fd" fill="url(#signupGradient)" strokeWidth={2} />
                <Area type="monotone" dataKey="joins" name="Challenge Joins" stroke="#2563eb" fill="url(#joinGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card className="border-gray-200/70 dark:border-gray-700/70 bg-white/80 dark:bg-gray-800/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Challenge Participation</CardTitle>
            <CardDescription>Created vs joined by challenge name ({selectedLabel.toLowerCase()})</CardDescription>
          </CardHeader>
          <CardContent className="pl-2 pr-3 pb-4">
            {challengeByNameData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={challengeByNameData} margin={{ left: 8, right: 8, top: 10, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} angle={-20} height={64} textAnchor="end" />
                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(148, 163, 184, 0.25)',
                        background: 'rgba(15, 23, 42, 0.95)',
                        color: '#e5e7eb',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="created" name="Challenges Created" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="joined" name="Participants Joined" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                No challenge activity in this range.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200/70 dark:border-gray-700/70 bg-white/80 dark:bg-gray-800/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Groups Generated</CardTitle>
            <CardDescription>New groups created over {selectedLabel.toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent className="pl-2 pr-3 pb-4">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timelineData} margin={{ left: 8, right: 8, top: 10, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={20} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '0.75rem',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      background: 'rgba(15, 23, 42, 0.95)',
                      color: '#e5e7eb',
                    }}
                  />
                  <Bar dataKey="groups" name="Groups Created" fill="#8b5cf6" radius={[7, 7, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
