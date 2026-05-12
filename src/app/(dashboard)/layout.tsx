import Link from 'next/link';
import { MessageSquare, GitMerge, Settings, LayoutDashboard, Bot } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="p-4 bg-slate-950 flex items-center gap-2 text-white">
          <LayoutDashboard size={24} className="text-blue-500" />
          <span className="font-bold text-lg">SaaS CRM</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
            <LayoutDashboard size={20} />
            <span>Overview</span>
          </Link>
          <Link href="/inbox" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
            <MessageSquare size={20} />
            <span>Omni-Inbox</span>
          </Link>
          <Link href="/agent" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
            <Bot size={20} />
            <span>AI Agent</span>
          </Link>
          <Link href="/settings" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
            <Settings size={20} />
            <span>Settings</span>
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 justify-end">
          <div className="flex items-center gap-3">
            <div className="text-sm text-right">
              <p className="font-medium text-slate-700">Admin User</p>
              <p className="text-xs text-slate-500">demo-tenant-1234</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
              A
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
