import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ArrowRight, Code, Trophy, Users, Zap, BrainCircuit, UsersRound, Star } from 'lucide-react';
import { Analytics } from "@vercel/analytics/next"
export const metadata = {
  title: 'NeetCode - Ace Your Coding Interviews',
  description: 'The ultimate platform to prepare for technical interviews with curated problems, group challenges, and live leaderboards.',
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  const buttonHref = session ? '/dashboard' : '/auth/signup';
  const buttonText = session ? 'Go to Dashboard' : 'Get Started - It\'s Free';

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950">
      <main className="flex-1">
        <div className="relative isolate overflow-hidden">
          {/* Background Grid */}
          <div
            className="absolute -top-80 left-1/2 -z-10 -translate-x-1/2 transform-gpu blur-3xl"
            aria-hidden="true"
          >
            <div
              className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-[#8085ff] to-[#4c51bf] opacity-30 dark:opacity-20"
              style={{
                clipPath:
                  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
              }}
            />
          </div>
          
          <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
            <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
              <h1 className="mt-10 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
                The New Way to Prepare for&nbsp;
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
                  Coding Interviews
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
                Stop grinding aimlessly. NeetCode offers a structured path with curated problems, real-time collaboration, and competitive challenges to help you land your dream job.
              </p>
              <div className="mt-10 flex items-center gap-x-6">
                <Link
                  href={buttonHref}
                  className="rounded-md bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors duration-200"
                >
                  {buttonText} <ArrowRight className="inline-block ml-1 h-4 w-4" />
                </Link>
                <Link href="/problems" className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100">
                  Explore Problems <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
            <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none lg:flex-none xl:ml-32">
              <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
                <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
                  <img
                    src="https://images.unsplash.com/photo-1587620962725-abab7fe55159?q=80&w=2831&auto=format&fit=crop"
                    alt="A developer sitting at a desk, focused on coding"
                    width={2432}
                    height={1442}
                    className="w-[76rem] rounded-md shadow-2xl ring-1 ring-gray-900/10"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white dark:bg-gray-950 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:text-center">
              <h2 className="text-base font-semibold leading-7 text-indigo-600 dark:text-indigo-400">Practice Smarter</h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                Everything you need to succeed
              </p>
              <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
                From structured learning paths to competitive group challenges, our platform is designed to make you a better engineer.
              </p>
            </div>
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
                <div className="relative pl-16">
                  <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                      <BrainCircuit className="h-6 w-6 text-white" />
                    </div>
                    Curated Problem Sets
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-400">Master essential patterns with problems hand-picked from real interviews at top tech companies.</dd>
                </div>
                <div className="relative pl-16">
                  <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                      <UsersRound className="h-6 w-6 text-white" />
                    </div>
                    Collaborative Groups
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-400">Create or join private groups to practice with friends, track progress, and stay motivated together.</dd>
                </div>
                <div className="relative pl-16">
                  <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                      <Trophy className="h-6 w-6 text-white" />
                    </div>
                    Live Challenges & Leaderboards
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-400">Test your skills under pressure in timed challenges and see how you rank against the community.</dd>
                </div>
                <div className="relative pl-16">
                  <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                      <Star className="h-6 w-6 text-white" />
                    </div>
                    Advanced Code Editor
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-400">A powerful in-browser IDE with support for multiple languages, custom test cases, and detailed feedback.</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}