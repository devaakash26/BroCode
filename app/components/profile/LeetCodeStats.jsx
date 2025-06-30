'use client';

const LeetCodeSkeleton = () => (
  <div className="bg-gray-900 text-white p-6 rounded-lg shadow-xl animate-pulse border border-gray-700">
    <div className="h-5 bg-gray-700 rounded w-1/3 mb-6"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
      <div className="flex justify-center items-center">
        <div className="h-40 w-40 bg-gray-700 rounded-full"></div>
      </div>
      <div className="space-y-4">
        <div className="h-16 bg-gray-800 rounded-lg"></div>
        <div className="h-16 bg-gray-800 rounded-lg"></div>
        <div className="h-16 bg-gray-800 rounded-lg"></div>
      </div>
    </div>
  </div>
);

const CircularProgress = ({ easy, medium, hard }) => {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const totalSolved = easy + medium + hard;

  const easyPercent = totalSolved > 0 ? (easy / totalSolved) * 100 : 0;
  const mediumPercent = totalSolved > 0 ? (medium / totalSolved) * 100 : 0;
  const hardPercent = totalSolved > 0 ? (hard / totalSolved) * 100 : 0;

  const mediumRotation = easyPercent * 3.6;
  const hardRotation = (easyPercent + mediumPercent) * 3.6;
  
  const getDashArray = (percent) => {
    const clampedPercent = Math.max(0, Math.min(100, percent));
    return `${(circumference * clampedPercent) / 100} ${circumference}`;
  };

  return (
    <div className="relative flex items-center justify-center">
      <svg className="transform -rotate-90" width="160" height="160" viewBox="0 0 120 120">
        <circle className="text-gray-700" strokeWidth="10" stroke="currentColor" fill="transparent" r={radius} cx="60" cy="60" />
        
        <circle
          className="text-cyan-400"
          strokeWidth="10"
          strokeDasharray={getDashArray(easyPercent)}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius} cx="60" cy="60"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
        <circle
          className="text-yellow-400"
          strokeWidth="10"
          strokeDasharray={getDashArray(mediumPercent)}
          strokeLinecap="round"
          transform={`rotate(${mediumRotation}, 60, 60)`}
          stroke="currentColor"
          fill="transparent"
          r={radius} cx="60" cy="60"
          style={{ transition: 'stroke-dasharray 0.5s ease 0.2s, transform 0.5s ease 0.2s' }}
        />
        <circle
          className="text-red-400"
          strokeWidth="10"
          strokeDasharray={getDashArray(hardPercent)}
          strokeLinecap="round"
          transform={`rotate(${hardRotation}, 60, 60)`}
          stroke="currentColor"
          fill="transparent"
          r={radius} cx="60" cy="60"
          style={{ transition: 'stroke-dasharray 0.5s ease 0.4s, transform 0.5s ease 0.4s' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-white">
          {totalSolved}
        </span>
        <span className="text-sm text-green-400">
          ✓ Solved
        </span>
      </div>
    </div>
  );
};

const DifficultyBar = ({ label, color, solved }) => (
  <div className="bg-gray-800 p-4 rounded-lg flex justify-between items-center">
    <div>
      <p className={`font-semibold ${color}`}>{label}</p>
      <p className="text-white font-mono text-lg">{solved}</p>
    </div>
  </div>
);

export default function LeetCodeStats({ stats, isLoading }) {
  if (isLoading) {
    return <LeetCodeSkeleton />;
  }

  if (!stats || !stats.submitStats) {
    return (
      <div className="bg-gray-900 p-6 rounded-lg text-center text-gray-400 border border-gray-700">
        <p className="font-semibold">Could not load LeetCode stats.</p>
        <p className="text-sm">Please check the username in Account Settings or try again later.</p>
      </div>
    );
  }

  const getStat = (difficulty) => {
    const stat = stats.submitStats.acSubmissionNum.find(s => s.difficulty === difficulty);
    return stat ? stat.count : 0;
  };

  const easySolved = getStat('Easy');
  const mediumSolved = getStat('Medium');
  const hardSolved = getStat('Hard');

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg shadow-xl border border-gray-700">
      <h3 className="text-lg font-bold mb-6">LeetCode Stats for {stats.username}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div className="flex justify-center">
          <CircularProgress
            easy={easySolved}
            medium={mediumSolved}
            hard={hardSolved}
          />
        </div>
        <div className="space-y-4">
          <DifficultyBar label="Easy" color="text-cyan-400" solved={easySolved} />
          <DifficultyBar label="Medium" color="text-yellow-400" solved={mediumSolved} />
          <DifficultyBar label="Hard" color="text-red-400" solved={hardSolved} />
        </div>
      </div>
    </div>
  );
} 
