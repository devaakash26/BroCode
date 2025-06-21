import { BarChart, CheckCircle, Percent } from 'lucide-react';

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex items-center space-x-4">
      <div className="p-3 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

export default function StatsCards({ stats }) {
  const { problemsSolved, submissionsCount, successRate } = stats;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard 
        icon={<CheckCircle className="h-6 w-6 text-green-500" />}
        label="Problems Solved"
        value={problemsSolved}
      />
      <StatCard 
        icon={<BarChart className="h-6 w-6 text-blue-500" />}
        label="Total Submissions"
        value={submissionsCount}
      />
      <StatCard 
        icon={<Percent className="h-6 w-6 text-yellow-500" />}
        label="Success Rate"
        value={`${successRate}%`}
      />
    </div>
  );
} 
