import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ActivityIcon = ({ type, status }) => {
  if (type === 'submission') {
    if (status === 'ACCEPTED') return <CheckCircle className="h-5 w-5 text-green-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  }
  return <Clock className="h-5 w-5 text-gray-500" />;
};

export default function RecentActivity({ activity }) {
  if (!activity || activity.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Activity</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity found.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Activity</h3>
      <ul className="space-y-4">
        {activity.map((item, index) => (
          <li key={index} className="flex items-start space-x-4">
            <div className="flex-shrink-0 pt-1">
              <ActivityIcon type={item.type} status={item.status} />
            </div>
            <div>
              <p className="text-sm text-gray-800 dark:text-gray-200">
                {item.type === 'submission' ? `Submitted to ` : `Commented on `}
                <span className="font-medium">{item.problem}</span>
                {item.status && (
                  <span className={`font-semibold ${item.status === 'ACCEPTED' ? 'text-green-500' : 'text-red-500'}`}>
                    {' '}({item.status.replace(/_/g, ' ')})
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
} 
