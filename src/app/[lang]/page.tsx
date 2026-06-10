import Link from 'next/link';
import { ArrowRight, MessageSquare, Workflow, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-white/10 bg-slate-900/50 backdrop-blur-md">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-lg flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            ZetaCRM
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/login" className="text-sm font-medium bg-white text-slate-900 px-4 py-2 rounded-full hover:bg-slate-200 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="pt-32 pb-20 md:pt-48 md:pb-32 px-6">
          <div className="container mx-auto text-center max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium mb-8 border border-blue-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              v1.0 is now live
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
              The Omni-Channel CRM <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
                Powered by AI
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Seamlessly integrate WhatsApp, web widgets, and AI-driven workflows into one powerful, embeddable CRM engine. Built for modern SaaS.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login" className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2">
                Start for free <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>

        {/* Features Preview */}
        <section id="features" className="py-20 px-6 bg-slate-950/50 border-t border-white/5">
          <div className="container mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-8 rounded-3xl bg-slate-900 border border-white/10 hover:border-blue-500/50 transition-colors">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mb-6">
                  <MessageSquare size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">Omni-Inbox</h3>
                <p className="text-slate-400 leading-relaxed">
                  Manage conversations from WhatsApp, Web Widgets, and social media in one unified interface.
                </p>
              </div>
              <div className="p-8 rounded-3xl bg-slate-900 border border-white/10 hover:border-purple-500/50 transition-colors">
                <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center mb-6">
                  <Workflow size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">Visual Flow Builder</h3>
                <p className="text-slate-400 leading-relaxed">
                  Drag and drop to create complex conversational AI workflows without writing a single line of code.
                </p>
              </div>
              <div className="p-8 rounded-3xl bg-slate-900 border border-white/10 hover:border-indigo-500/50 transition-colors">
                <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mb-6">
                  <Zap size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">AI Agent Proxy</h3>
                <p className="text-slate-400 leading-relaxed">
                  Decoupled AI engine integration allows you to swap or upgrade your LLM providers seamlessly.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
