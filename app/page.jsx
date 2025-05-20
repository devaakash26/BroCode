import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Code, Trophy, Users, ChevronRight, ArrowRight, Zap, BookOpen, Clock, Server } from 'lucide-react';

export const metadata = {
  title: 'NeetCode - Master Data Structures and Algorithms',
  description: 'A platform for mastering data structures and algorithms through collaborative challenges',
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-900 dark:to-purple-900">
        <div className="container mx-auto px-4 py-20 sm:py-24 flex flex-col items-center text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
            Master DSA with <span className="text-yellow-300">Collaborative Challenges</span>
          </h1>
          <p className="max-w-2xl text-lg sm:text-xl text-indigo-100 mb-10">
            Join a community of developers solving algorithmic problems together. Create groups, participate in challenges, and track your progress.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-md bg-white px-5 py-3 text-base font-medium text-indigo-700 shadow-sm hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600"
                >
                  Go to Dashboard
                </Link>
                <Link
                  href="/problems"
                  className="rounded-md bg-indigo-500 px-5 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600"
                >
                  Explore Problems
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth/signup"
                  className="rounded-md bg-white px-5 py-3 text-base font-medium text-indigo-700 shadow-sm hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600"
                >
                  Sign Up Free
                </Link>
                <Link
                  href="/auth/signin"
                  className="rounded-md bg-indigo-500 px-5 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose NeetCode?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              A complete platform to practice, collaborate, and master data structures and algorithms
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-lg w-fit mb-6">
                <Code className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Curated Problems</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 flex-grow">
                Handpicked problems categorized by difficulty, topics, and companies. Master the most commonly asked patterns.
              </p>
              <Link
                href="/problems"
                className="inline-flex items-center font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
              >
                Browse problems <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg w-fit mb-6">
                <Users className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Group Challenges</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 flex-grow">
                Create private groups, invite friends or colleagues, and compete in timed challenges together.
              </p>
              <Link
                href="/groups"
                className="inline-flex items-center font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
              >
                Join a group <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg w-fit mb-6">
                <Trophy className="h-7 w-7 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Track Progress</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 flex-grow">
                Monitor your problem-solving journey with detailed statistics, visualizations, and performance metrics.
              </p>
              <Link
                href="/leaderboard"
                className="inline-flex items-center font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
              >
                View leaderboard <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Simple steps to get started with NeetCode
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="mx-auto p-4 rounded-full bg-indigo-100 dark:bg-indigo-900 w-16 h-16 flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">1. Create an Account</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Sign up for free and set up your profile to begin your DSA journey.
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto p-4 rounded-full bg-indigo-100 dark:bg-indigo-900 w-16 h-16 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">2. Join or Create Groups</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Connect with others or form your own coding community.
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto p-4 rounded-full bg-indigo-100 dark:bg-indigo-900 w-16 h-16 flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">3. Participate in Challenges</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Join timed competitions or practice at your own pace.
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto p-4 rounded-full bg-indigo-100 dark:bg-indigo-900 w-16 h-16 flex items-center justify-center mb-4">
                <Zap className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">4. Track Your Growth</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Monitor your progress and see how you stack up against others.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-indigo-600 dark:bg-indigo-900">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Start Your DSA Journey?
          </h2>
          <p className="text-xl text-indigo-100 mb-10 max-w-3xl mx-auto">
            Join thousands of developers who are mastering algorithms and preparing for tech interviews together.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {session ? (
              <Link
                href="/problems"
                className="rounded-md bg-white px-6 py-3 text-lg font-medium text-indigo-700 shadow-md hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600"
              >
                Start Solving Now <ArrowRight className="inline-block ml-2 h-5 w-5" />
              </Link>
            ) : (
              <Link
                href="/auth/signup"
                className="rounded-md bg-white px-6 py-3 text-lg font-medium text-indigo-700 shadow-md hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600"
              >
                Get Started For Free <ArrowRight className="inline-block ml-2 h-5 w-5" />
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
} 