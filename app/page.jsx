import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ArrowRight, Code, Trophy, Users, Zap, BrainCircuit, UsersRound, Star, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export const metadata = {
  title: 'BroCode - Ace Your Coding Interviews',
  description: 'A platform to practice coding problems, compete with friends, and prepare for technical interviews.',
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  const buttonHref = session ? '/dashboard' : '/auth/signup';
  const buttonText = session ? 'Go to Dashboard' : 'Get Started - It\'s Free';

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950">
      <main className="flex-grow bg-white dark:bg-[#0D1117]">
        {/* Hero Section */}
        <section className="relative text-gray-900 dark:text-white">
          <div className="absolute inset-0 bg-grid-gray-200/40 dark:bg-grid-[#30363d]/30 [mask-image:linear-gradient(to_bottom,white_10%,transparent_70%)] dark:[mask-image:linear-gradient(to_bottom,white_10%,transparent_90%)]"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
            <div className="lg:grid lg:grid-cols-12 lg:gap-16 lg:items-center">
              <div className="lg:col-span-7">
                <div className="max-w-xl mx-auto lg:mx-0">
                  <h1 className="text-4xl text-center lg:text-left font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                    <span className="block">Code Your</span>
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-indigo-600 dark:from-indigo-400 dark:to-indigo-500">Dharma.</span>
                  </h1>
                  <p className="mt-6 max-w-md mx-auto lg:mx-0 text-center lg:text-left text-lg text-gray-600 dark:text-gray-400 sm:text-xl md:max-w-3xl">
                    Forge your path in the world of code. Master your craft through dedicated practice and collaborative challenges.
                  </p>
                  <div className="mt-10 max-w-sm mx-auto lg:mx-0 sm:flex sm:justify-center lg:justify-start gap-4">
                    <Button asChild size="lg" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg transform hover:-translate-y-1 transition-all duration-300">
                      <Link href="/problems">Start Solving</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="w-full sm:w-auto mt-4 sm:mt-0 border-indigo-500 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-300 font-bold transition-colors duration-300">
                      <Link href="/groups">Explore Groups</Link>
                    </Button>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-5 mt-20 lg:mt-0">
                <div className="relative w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] lg:w-[450px] lg:h-[450px] mx-auto">
                  <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-3xl"></div>
                  <Image
                    src="/tech-chakra.svg"
                    alt="Tech-inspired Chakra"
                    layout="fill"
                    className="opacity-80 dark:opacity-100"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Section */}
        <section className="py-20 sm:py-32 bg-white dark:bg-[#0D1117] border-t border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
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
        </section>
      </main>
    </div>
  );
}
