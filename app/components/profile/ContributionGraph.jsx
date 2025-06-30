'use client';

import { useTheme } from 'next-themes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const ContributionGraph = ({ data }) => {
  const { theme } = useTheme();

  const today = new Date();
  const days = Array.from({ length: 365 }, (_, i) => {
    const date = new Date();
    date.setDate(today.getDate() - i);
    const dateString = date.toISOString().slice(0, 10);
    return {
      date: dateString,
      count: data[dateString] || 0,
    };
  }).reverse();

  const getColor = (count) => {
    if (theme === 'dark') {
      if (count === 0) return 'bg-gray-700';
      if (count < 2) return 'bg-green-700';
      if (count < 5) return 'bg-green-600';
      if (count < 10) return 'bg-green-500';
      return 'bg-green-400';
    }
    if (count === 0) return 'bg-gray-100';
    if (count < 2) return 'bg-green-200';
    if (count < 5) return 'bg-green-400';
    if (count < 10) return 'bg-green-500';
    return 'bg-green-600';
  };

  return (
    <TooltipProvider>
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Contribution Calendar</h3>
        <div className="flex flex-wrap gap-1">
          {days.map(day => (
            <Tooltip key={day.date} delayDuration={0}>
              <TooltipTrigger asChild>
                <div
                  className={`w-3 h-3 md:w-4 md:h-4 rounded-sm ${getColor(day.count)}`}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>{day.count} contributions on {day.date}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <div className="flex justify-end items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
          Less
          <div className="w-3 h-3 md:w-4 md:h-4 rounded-sm bg-gray-100 dark:bg-gray-700 mx-1 border border-gray-200 dark:border-gray-700" />
          <div className="w-3 h-3 md:w-4 md:h-4 rounded-sm bg-green-200 dark:bg-green-700 mx-1" />
          <div className="w-3 h-3 md:w-4 md:h-4 rounded-sm bg-green-400 dark:bg-green-600 mx-1" />
          <div className="w-3 h-3 md:w-4 md:h-4 rounded-sm bg-green-500 dark:bg-green-500 mx-1" />
          <div className="w-3 h-3 md:w-4 md:h-4 rounded-sm bg-green-600 dark:bg-green-400 mx-1" />
          More
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ContributionGraph; 
