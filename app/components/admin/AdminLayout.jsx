"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Settings,
  BookOpen,
  Folder,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ThemeToggle from "@/app/components/theme-toggle";

const sidebarLinks = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Problems", href: "/admin/problems", icon: BookOpen },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Groups", href: "/admin/groups", icon: Folder },
  { name: "Help Queries", href: "/admin/queries", icon: MessageSquare },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

const PAGE_TITLES = {
  "/admin": null, // handled separately (greeting)
  "/admin/problems": "Problems",
  "/admin/users": "Users",
  "/admin/groups": "Groups",
  "/admin/queries": "Help Queries",
  "/admin/settings": "Maintenance Control Center",
};

export default function AdminLayout({ children, user }) {
  const pathname = usePathname();
  const firstName = user?.name?.split(" ")[0] || "Admin";

  const pageTitle =
    pathname === "/admin"
      ? `Hi, ${firstName} 👋`
      : (PAGE_TITLES[pathname] ?? "Admin Console");
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("admin-sidebar-collapsed");
    if (stored !== null) {
      setCollapsed(stored === "true");
    }
    setMounted(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("admin-sidebar-collapsed", String(next));
      return next;
    });
  };

  const isActive = (href) => {
    if (href === "/admin" && pathname === "/admin") return true;
    return pathname.startsWith(href) && href !== "/admin";
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside
        className={`${
          mounted ? (collapsed ? "w-16" : "w-64") : "w-64"
        } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col transition-all duration-300 ease-in-out flex-shrink-0`}
      >
        {/* Sidebar header */}
        <div className="h-14 px-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          {!collapsed && (
            <h2 className="text-xl font-bold text-orange-600 dark:text-orange-400 truncate">
              BroCode
            </h2>
          )}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`${
              collapsed ? "mx-auto" : "ml-auto"
            } h-7 w-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0`}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {sidebarLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              title={collapsed ? link.name : undefined}
              className={`flex items-center ${
                collapsed ? "justify-center px-2" : "px-4"
              } py-3 rounded-md transition-colors ${
                isActive(link.href)
                  ? "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
            >
              {link.icon && (
                <link.icon
                  className={`h-5 w-5 flex-shrink-0 ${!collapsed ? "mr-3" : ""}`}
                />
              )}
              {!collapsed && <span className="truncate">{link.name}</span>}
            </Link>
          ))}
        </nav>

        {/* User info */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div
            className={`flex items-center ${collapsed ? "justify-center" : ""}`}
          >
            <div className="h-8 w-8 flex-shrink-0 bg-orange-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {user?.name?.charAt(0) || "A"}
            </div>
            {!collapsed && (
              <div className="ml-3 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.name || "Admin"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user?.role === "TEMP_ADMIN"
                    ? "Temp Admin"
                    : "Platform Admin"}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Top header bar */}
        <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
              Admin Console
            </p>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight mt-0.5">
              {pageTitle}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === "TEMP_ADMIN" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                View Only
              </span>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </main>
    </div>
  );
}
