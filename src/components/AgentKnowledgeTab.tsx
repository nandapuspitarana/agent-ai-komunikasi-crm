'use client';

import { useState, useEffect, useRef } from 'react';
import {
  FileText, Upload, Trash2, RefreshCw, AlertCircle, CheckCircle,
  X, FileSpreadsheet, File, Tag, AlertTriangle,
  Wifi, WifiOff, Plus, Clock, Search, Library, Globe
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/I18nContext';

type DocType = 'pdf' | 'docs' | 'excel' | 'csv' | 'txt' | 'all';

interface UploadTab {
  id: DocType;
  label: string;
  accept: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const UPLOAD_TABS: UploadTab[] = [
  { id: 'pdf', label: 'PDF', accept: '.pdf', icon: <FileText size={20} />, description: 'Dokumen PDF, laporan, manual', color: 'text-red-600 bg-red-50 border-red-200' },
  { id: 'docs', label: 'Word', accept: '.docx,.doc', icon: <File size={20} />, description: 'Dokumen Word (.docx)', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'excel', label: 'Excel', accept: '.xlsx,.xls', icon: <FileSpreadsheet size={20} />, description: 'Spreadsheet Excel', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'csv', label: 'CSV/Data', accept: '.csv,.tsv,*/*', icon: <FileSpreadsheet size={20} />, description: 'Data tabular (CSV, TSV)', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { id: 'txt', label: 'Teks Biasa', accept: '.txt,.md,.json,*/*', icon: <FileText size={20} />, description: 'File teks biasa (TXT, MD, dll)', color: 'text-slate-600 bg-slate-50 border-slate-200' },
];

function getFileIcon(filename: string) {
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return <FileText size={16} className="text-red-500" />;
  if (['docx', 'doc'].includes(ext)) return <File size={16} className="text-blue-500" />;
  if (['xlsx', 'xls'].includes(ext)) return <FileSpreadsheet size={16} className="text-emerald-500" />;
  if (['csv', 'tsv'].includes(ext)) return <FileSpreadsheet size={16} className="text-orange-500" />;
  return <FileText size={16} className="text-slate-500" />;
}

export default function AgentKnowledgeTab({ flowId }: { flowId: string | null }) {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Library Modal
  const [showLibrary, setShowLibrary] = useState(false);
  const [tenantDocs, setTenantDocs] = useState<any[]>([]);
  const [linking, setLinking] = useState(false);

  // Upload Modal
  const [showModal, setShowModal] = useState(false);
  const [activeUploadTab, setActiveUploadTab] = useState<DocType>('pdf');
  const [metaName, setMetaName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    if (!flowId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/flows/${flowId}/knowledge`);
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err) {
      setError('Gagal memuat dokumen.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTenantDocs = async () => {
    try {
      const res = await fetch('/api/agent/documents/tenant');
      const data = await res.json();
      setTenantDocs(data.documents || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLinkDocument = async (sourceDocumentId: string) => {
    if (!flowId) return;
    setLinking(true);
    try {
      const res = await fetch('/api/agent/documents/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceDocumentId, flowId })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menautkan dokumen');
      }
      setShowLibrary(false);
      fetchDocuments();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLinking(false);
    }
  };

  useEffect(() => {
    if (flowId) fetchDocuments();
  }, [flowId]);

  const handleFile = (file: File) => {
    setSelectedFile(file);
    if (!metaName) {
      setMetaName(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      // Basic validation for accepted type
      const currentTab = UPLOAD_TABS.find(t => t.id === activeUploadTab)!;
      const acceptList = currentTab.accept.split(',');
      const hasExtension = file.name.includes('.');
      const fileExt = hasExtension ? '.' + file.name.split('.').pop()?.toLowerCase() : '';
      
      // Allow if accept list includes '*/*' OR matches the extension, OR the file has no extension (and tab supports generic like CSV/Txt)
      if (acceptList.includes('*/*') || (hasExtension && acceptList.includes(fileExt)) || !hasExtension) {
         handleFile(file);
      } else {
         setError(`File tidak didukung. Harap upload format: ${currentTab.accept}`);
      }
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flowId) return;
    if (!selectedFile || !metaName) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('meta_name', metaName);
    if (description) formData.append('description', description);

    try {
      const res = await fetch(`/api/flows/${flowId}/knowledge`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload gagal');
      }

      setShowModal(false);
      setSelectedFile(null);
      setMetaName('');
      setDescription('');
      fetchDocuments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string, name: string) => {
    if (!confirm(`Hapus dokumen "${name}" dari agent ini?`)) return;
    try {
      const res = await fetch(`/api/flows/${flowId}/knowledge/${docId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Hapus gagal');
      fetchDocuments();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!flowId) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center py-20 animate-in fade-in">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-500">
          <Globe size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">{t('agentBuilder', 'saveAgentFirst')}</h2>
        <p className="text-slate-500">{t('agentBuilder', 'saveAgentFirstDesc')}</p>
      </div>
    );
  }

  const currentTab = UPLOAD_TABS.find(t => t.id === activeUploadTab)!;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10 w-full h-full flex flex-col">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col flex-1 relative min-h-[600px]">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-800">{t('agentBuilder', 'knowledgeBase')}</h2>
            <p className="text-sm text-slate-500">{t('agentBuilder', 'knowledgeBaseDesc')}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchDocuments} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => { fetchTenantDocs(); setShowLibrary(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm"
            >
              <Library size={16} /> {t('agentBuilder', 'chooseFromLibrary')}
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm"
            >
              <Upload size={16} /> {t('agentBuilder', 'uploadDocument')}
            </button>
          </div>
        </div>

        {error && !showModal && (
          <div className="p-3 mb-4 bg-red-50 text-red-700 rounded-lg border border-red-100 flex items-center gap-2 text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* List */}
        <div className="flex-1 border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
          {loading && documents.length === 0 ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : documents.length === 0 ? (
            <div className="text-center py-16 px-4">
              <FileText size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 text-sm">{t('agentBuilder', 'noDocuments')}</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-white border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t('agentBuilder', 'documentName')}</th>
                  <th className="px-4 py-3 font-semibold">{t('agentBuilder', 'status')}</th>
                  <th className="px-4 py-3 font-semibold text-center">{t('agentBuilder', 'chunks')}</th>
                  <th className="px-4 py-3 font-semibold text-right">{t('agentBuilder', 'actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5">{getFileIcon(doc.filename)}</div>
                        <div>
                          <p className="font-semibold text-slate-800">{doc.metaName}</p>
                          <p className="text-xs text-slate-400">{doc.filename}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {doc.status === 'ready' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">
                          <CheckCircle size={10} /> {t('agentBuilder', 'ready')}
                        </span>
                      ) : doc.status === 'failed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700" title={doc.errorMsg}>
                          <AlertTriangle size={10} /> {t('agentBuilder', 'failed')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700">
                          <Clock size={10} className="animate-pulse" /> {t('agentBuilder', 'processing')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600 font-medium">{doc.chunkCount}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(doc.id, doc.metaName)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">{t('agentBuilder', 'uploadSpecific')}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <div className="px-5 pt-3">
              <div className="flex gap-1 flex-wrap mb-3">
                {UPLOAD_TABS.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => { setActiveUploadTab(tab.id); setSelectedFile(null); setError(null); setIsDragging(false); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${activeUploadTab === tab.id ? tab.color + ' ring-2 ring-blue-400' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleFileUpload} className="p-5 overflow-y-auto space-y-4">
              {error && showModal && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 flex items-center gap-2 text-sm">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${isDragging ? 'border-blue-500 bg-blue-100 scale-[1.02]' : selectedFile ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input type="file" ref={fileInputRef} className="sr-only" accept={currentTab.accept} onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }} />
                {selectedFile ? (
                  <p className="font-semibold text-blue-700 text-sm">{selectedFile.name}</p>
                ) : (
                  <>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 transition-transform ${isDragging ? 'scale-110 ' + currentTab.color : currentTab.color}`}>{currentTab.icon}</div>
                    <p className="text-sm font-medium text-slate-700">
                      {isDragging ? t('agentBuilder', 'dropFile') : `${t('agentBuilder', 'chooseOrDrop')} ${currentTab.label}`}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{t('agentBuilder', 'maxSize')} ({currentTab.accept})</p>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('agentBuilder', 'docNameReq')}</label>
                <input type="text" value={metaName} onChange={e => setMetaName(e.target.value)} required className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('agentBuilder', 'shortDesc')}</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm bg-slate-100 text-slate-600 rounded-lg font-medium">{t('common', 'cancel')}</button>
                <button type="submit" disabled={uploading || !selectedFile} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50">
                  {uploading ? t('agentBuilder', 'uploading') : t('agentBuilder', 'uploadDocument')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Library Modal */}
      {showLibrary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800">{t('agentBuilder', 'documentLibrary')}</h3>
                <p className="text-xs text-slate-500">{t('agentBuilder', 'documentLibraryDesc')}</p>
              </div>
              <button onClick={() => setShowLibrary(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 bg-slate-50/50">
              {tenantDocs.length === 0 ? (
                <div className="text-center py-10">
                  <Library size={32} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 text-sm">{t('agentBuilder', 'noDocsInLibrary')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tenantDocs.map(doc => {
                    const isAlreadyAdded = documents.some(d => d.proxyDocId === doc.proxyDocId);
                    return (
                      <div key={doc.id} className={`p-4 rounded-xl border flex flex-col justify-between ${isAlreadyAdded ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'}`}>
                        <div className="flex items-start gap-3 mb-3">
                          <div className="mt-1">{getFileIcon(doc.filename)}</div>
                          <div>
                            <h4 className="font-semibold text-slate-800 text-sm line-clamp-1">{doc.metaName}</h4>
                            <p className="text-xs text-slate-500 line-clamp-1">{doc.filename}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                          <span className="text-xs font-medium text-slate-500">{doc.chunkCount} chunks</span>
                          <button
                            onClick={() => handleLinkDocument(doc.id)}
                            disabled={isAlreadyAdded || linking}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg ${isAlreadyAdded ? 'bg-slate-200 text-slate-500' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                          >
                            {isAlreadyAdded ? t('agentBuilder', 'alreadyAdded') : linking ? t('agentBuilder', 'linking') : t('agentBuilder', 'selectDocument')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button onClick={() => setShowLibrary(false)} className="px-4 py-2 text-sm bg-slate-100 text-slate-600 rounded-lg font-medium">{t('common', 'close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
