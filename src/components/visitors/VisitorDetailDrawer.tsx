import React from 'react';
import { X, User, MapPin, Globe, Clock, MessageSquare, ExternalLink } from 'lucide-react';
import ClassificationBadge from './ClassificationBadge';
import LeadScoreBadge from './LeadScoreBadge';
import { useTranslation } from '@/lib/i18n/I18nContext';

interface VisitorDetailDrawerProps {
  visitorId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function VisitorDetailDrawer({ visitorId, isOpen, onClose }: VisitorDetailDrawerProps) {
  const { t } = useTranslation();
  const [visitor, setVisitor] = React.useState<any>(null);
  const [sessions, setSessions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && visitorId) {
      fetchVisitorDetail(visitorId);
    }
  }, [isOpen, visitorId]);

  const fetchVisitorDetail = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/visitors/${id}`);
      if (res.ok) {
        const data = await res.json();
        setVisitor(data.visitor);
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to fetch visitor details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" onClick={onClose} />
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <User size={20} className="text-brand" />
            {t('visitors', 'visitorDetails')}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {loading || !visitor ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-brand rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* Top Stats Profile */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{visitor.name || t('visitors', 'anonymous')}</h3>
                  {visitor.email && <p className="text-sm text-slate-600">{visitor.email}</p>}
                  {visitor.phone && <p className="text-sm text-slate-600">{visitor.phone}</p>}
                  <p className="text-xs text-slate-400 font-mono mt-1">ID: {visitor.contactId}</p>
                </div>
                <div className="text-right">
                  <ClassificationBadge classification={visitor.leadClassification} />
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('visitors', 'leadScore')}</p>
                <LeadScoreBadge score={visitor.leadScore} />
              </div>
            </div>

            {/* Topics Discussed */}
            {visitor.topicsDiscussed && visitor.topicsDiscussed.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <MessageSquare size={16} className="text-slate-500" /> {t('visitors', 'topicsDiscussed')}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {visitor.topicsDiscussed.map((topic: string, i: number) => (
                    <span key={i} className="px-2.5 py-1 bg-brand-bg text-brand text-xs font-medium rounded-md border border-brand/20">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Location & Tech */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MapPin size={14} /> {t('visitors', 'location')}
                </h4>
                {visitor.latitude && visitor.longitude ? (
                  <a 
                    href={`https://maps.google.com/?q=${visitor.latitude},${visitor.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-brand hover:underline flex items-center gap-1"
                  >
                    {visitor.city ? `${visitor.city}, ${visitor.country}` : t('visitors', 'viewOnMaps')} <ExternalLink size={12} />
                  </a>
                ) : (
                  <p className="text-sm text-slate-600 font-medium">{t('visitors', 'unknown')}</p>
                )}
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Globe size={14} /> {t('visitors', 'technology')}
                </h4>
                <p className="text-sm font-medium text-slate-700">{visitor.browserName} on {visitor.os}</p>
                <p className="text-xs text-slate-500 capitalize">{visitor.deviceType}</p>
              </div>
            </div>

            {/* Traffic Source */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Globe size={16} className="text-slate-500" /> {t('visitors', 'trafficSource')}
              </h4>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div>
                  <p className="text-xs text-slate-500">{t('visitors', 'referrerUrl')}</p>
                  <p className="text-sm font-medium text-slate-700 truncate" title={visitor.referrerUrl}>
                    {visitor.referrerUrl || t('visitors', 'directNone')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t('visitors', 'landingPage')}</p>
                  <p className="text-sm font-medium text-slate-700 truncate" title={visitor.pageUrl}>
                    {visitor.pageUrl || t('visitors', 'unknown')}
                  </p>
                </div>
                {(visitor.utmSource || visitor.utmMedium || visitor.utmCampaign) && (
                  <div className="pt-2 border-t border-slate-200 flex gap-2 flex-wrap">
                    {visitor.utmSource && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded border border-yellow-200">src: {visitor.utmSource}</span>}
                    {visitor.utmMedium && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded border border-blue-200">med: {visitor.utmMedium}</span>}
                    {visitor.utmCampaign && <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded border border-purple-200">cmp: {visitor.utmCampaign}</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Session History */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Clock size={16} className="text-slate-500" /> {t('visitors', 'chatSessions')} ({sessions.length})
              </h4>
              <div className="space-y-3">
                {sessions.map((session: any) => (
                  <div key={session.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">{new Date(session.createdAt).toLocaleString()}</p>
                      <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5 mt-1">
                        <span className={`w-2 h-2 rounded-full ${
                          session.status === 'bot' ? 'bg-purple-500' :
                          session.status === 'queue' ? 'bg-amber-500' : 'bg-green-500'
                        }`} />
                        {t('visitors', 'status')}: <span className="capitalize">{session.status}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-brand bg-brand-bg px-2 py-1 rounded">
                        {session._count?.messages || 0} {t('visitors', 'msgs')}
                      </span>
                    </div>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-2">{t('visitors', 'noChatSessions')}</p>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}
