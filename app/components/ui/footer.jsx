import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
        <div className="flex justify-center space-x-6 md:order-2">
          <Link href="/about" className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-400">
            About
          </Link>
          <Link href="/contact" className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-400">
            Contact
          </Link>
          <Link href="/privacy" className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-400">
            Privacy
          </Link>
          <Link href="/terms" className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-400">
            Terms
          </Link>
        </div>
        <div className="mt-8 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} BroCode. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
} 
