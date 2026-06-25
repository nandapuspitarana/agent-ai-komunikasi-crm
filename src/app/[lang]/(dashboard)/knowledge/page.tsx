'use client';

import { useState, useEffect, useRef } from 'react';
import {
  FileText, Upload, Trash2, RefreshCw, AlertCircle, CheckCircle,
  Search, X, FileSpreadsheet, File, Tag, AlertTriangle,
  Wifi, WifiOff, Plus, Info, Clock
} from 'lucide-react';

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
  {
    id: 'pdf',
    label: 'PDF',
    accept: '.pdf',
    icon: <FileText size={20} />,
    description: 'PDF documents, reports, manuals, policies',
    color: 'text-red-600 bg-red-50 border-red-200',
  },
  {
    id: 'docs',
    label: 'Word / Docs',
    accept: '.docx,.doc',
    icon: <File size={20} />,
    description: 'Word documents (.docx, .doc)',
    color: 'text-brand bg-brand-bg border-brand/20',
  },
  {
    id: 'excel',
    label: 'Excel',
    accept: '.xlsx,.xls',
    icon: <FileSpreadsheet size={20} />,
    description: 'Excel spreadsheets (.xlsx, .xls)',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  {
    id: 'csv',
    label: 'CSV',
    accept: '.csv',
    icon: <FileSpreadsheet size={20} />,
    description: 'Tabular data in CSV format',
    color: 'text-orange-600 bg-orange-50 border-orange-200',
  },
  {
    id: 'txt',
    label: 'Text',
    accept: '.txt,.md',
    icon: <FileText size={20} />,
    description: 'Plain text files (.txt, .md)',
    color: 'text-slate-600 bg-slate-50 border-slate-200',
  },
];

function getFileIcon(filename: string) {
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return <FileText size={18} className="text-red-500" />;
  if (['docx', 'doc'].includes(ext)) return <File size={18} className="text-brand-light" />;
  if (['xlsx', 'xls'].includes(ext)) return <FileSpreadsheet size={18} className="text-emerald-500" />;
  if (ext === 'csv') return <FileSpreadsheet size={18} className="text-orange-500" />;
  return <FileText size={18} className="text-slate-500" />;
}

function getFileTypeBadge(filename: string) {
  const ext = filename?.split('.').pop()?.toUpperCase() || 'FILE';
  const colorMap: Record<string, string> = {
    PDF: 'bg-red-100 text-red-700',
    DOCX: 'bg-brand-bg text-brand-hover',
    DOC: 'bg-brand-bg text-brand-hover',
    XLSX: 'bg-emerald-100 text-emerald-700',
    XLS: 'bg-emerald-100 text-emerald-700',
    CSV: 'bg-orange-100 text-orange-700',
    TXT: 'bg-slate-100 text-slate-700',
    MD: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${colorMap[ext] || 'bg-slate-100 text-slate-600'}`}>
      {ext}
    </span>
  );
}

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proxyStatus, setProxyStatus] = useState<'ok' | 'offline' | 'error' | 'loading'>('loading');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<DocType>('all');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [activeUploadTab, setActiveUploadTab] = useState<DocType>('pdf');
  const [metaName, setMetaName] = useState('');
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagList, setTagList] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{current: number, total: number} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/agent/documents');
      const data = await res.json();
      setDocuments(data.documents || []);
      setProxyStatus(data.proxyStatus || 'ok');
      if (data.error) setError(data.error);
    } catch (err: any) {
      setError('Failed to connect to the server. Try refreshing this page.');
      setProxyStatus('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const currentTab = UPLOAD_TABS.find(t => t.id === activeUploadTab)!;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
      if (!metaName && files.length === 1) {
        setMetaName(files[0].name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tagList.includes(trimmed)) {
      setTagList(prev => [...prev, trimmed]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTagList(prev => prev.filter(t => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;
    
    if (selectedFiles.length === 1 && !metaName.trim()) {
      setError('Meta Name is required');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress({ current: 0, total: selectedFiles.length });

    let successCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setUploadProgress({ current: i + 1, total: selectedFiles.length });

      const formData = new FormData();
      formData.append('file', file);
      
      const nameToUse = selectedFiles.length === 1 ? metaName : file.name.replace(/\.[^/.]+$/, '');
      formData.append('meta_name', nameToUse);
      
      if (tagList.length > 0) formData.append('tags', tagList.join(','));
      if (description.trim()) formData.append('description', description);
      if (category.trim()) formData.append('category', category);

      try {
        const res = await fetch('/api/agent/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          console.error(`Failed to upload ${file.name}:`, data.error);
        } else {
          successCount++;
        }
      } catch (err: any) {
        console.error(`Error uploading ${file.name}:`, err);
      }
    }

    setUploading(false);
    setUploadProgress(null);
    
    if (successCount === 0) {
      setError('Failed to upload all documents');
    } else {
      closeModal();
      await fetchDocuments();
      if (successCount < selectedFiles.length) {
         alert(`Uploaded ${successCount} of ${selectedFiles.length} files successfully.`);
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedFiles([]);
    setMetaName('');
    setTags('');
    setDescription('');
    setCategory('');
    setTagList([]);
    setTagInput('');
    setError(null);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete document "${name}"? All knowledge learned from this document will be removed from the AI.`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/agent/documents/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete document');
      await fetchDocuments();
    } catch (err: any) {
      setError(err.message || 'An error occurred while deleting the document');
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const nameMatch = (doc.metadata?.name || doc.filename || '').toLowerCase().includes(searchQuery.toLowerCase());
    const tagsMatch = Array.isArray(doc.metadata?.tags)
      ? doc.metadata.tags.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      : false;
    const matchSearch = !searchQuery || nameMatch || tagsMatch;

    const ext = (doc.filename || '').split('.').pop()?.toLowerCase() || '';
    const typeMatch =
      filterType === 'all' ||
      (filterType === 'pdf' && ext === 'pdf') ||
      (filterType === 'docs' && ['docx', 'doc'].includes(ext)) ||
      (filterType === 'excel' && ['xlsx', 'xls'].includes(ext)) ||
      (filterType === 'csv' && ext === 'csv') ||
      (filterType === 'txt' && ['txt', 'md'].includes(ext));

    return matchSearch && typeMatch;
  });

  const statusCounts = {
    ready: documents.filter(d => d.status === 'ready').length,
    failed: documents.filter(d => d.status === 'failed').length,
    processing: documents.filter(d => !['ready', 'failed'].includes(d.status)).length,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Base Knowledge</h1>
            {/* Proxy status indicator */}
            {proxyStatus === 'ok' ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                <Wifi size={12} /> AI Engine Online
              </span>
            ) : proxyStatus === 'offline' ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                <WifiOff size={12} /> AI Engine Offline
              </span>
            ) : proxyStatus === 'loading' ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> Checking...
              </span>
            ) : null}
          </div>
          <p className="text-slate-500 mt-1 text-sm">Upload documents for the AI to use when answering customer questions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDocuments}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin text-brand-light' : ''} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand to-brand-hover text-white font-medium rounded-lg hover:opacity-90 transition-opacity shadow-sm text-sm"
          >
            <Upload size={16} />
            Upload Document
          </button>
        </div>
      </div>

      {/* Stats */}
      {documents.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-bg rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-brand" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{documents.length}</div>
              <div className="text-xs text-slate-500">Total Documents</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <CheckCircle size={20} className="text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{statusCounts.ready}</div>
              <div className="text-xs text-slate-500">Ready to Use</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center">
              <Info size={20} className="text-slate-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {documents.reduce((acc, d) => acc + (d.chunk_count || 0), 0)}
              </div>
              <div className="text-xs text-slate-500">Total Chunks</div>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && !showModal && (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-start gap-3">
          {proxyStatus === 'offline' ? <WifiOff size={20} className="mt-0.5 flex-shrink-0" /> : <AlertTriangle size={20} className="mt-0.5 flex-shrink-0" />}
          <div>
            <p className="font-semibold text-sm">
              {proxyStatus === 'offline' ? 'AI Engine is Offline' : 'An Error Occurred'}
            </p>
            <p className="text-sm mt-0.5">{error}</p>
            {proxyStatus === 'offline' && (
              <code className="text-xs bg-amber-100 px-2 py-0.5 rounded mt-2 inline-block">
                uvicorn main:app --host 0.0.0.0 --port 8000
              </code>
            )}
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search name or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand outline-none text-sm"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'pdf', 'docs', 'excel', 'csv', 'txt'] as DocType[]).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterType === type
                  ? 'bg-brand text-white'
                  : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {type === 'all' ? 'All' : type.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-brand rounded-full animate-spin mb-4" />
            <p className="text-slate-500 text-sm">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-bg to-brand-light rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText size={32} className="text-brand-light" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No documents yet</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
              Upload PDF, Word, Excel, CSV, or TXT documents to teach the AI about your business.
              The AI will use these documents to answer customer questions accurately.
            </p>
            {proxyStatus === 'offline' ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                <WifiOff size={16} /> Turn on the AI Engine first
              </div>
            ) : (
              <button
                onClick={() => setShowModal(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-brand to-brand-hover text-white font-medium rounded-lg hover:opacity-90 text-sm shadow-sm"
              >
                Upload First Document
              </button>
            )}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No documents match the filter "{searchQuery || filterType}"
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Document</th>
                <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Tags</th>
                <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide text-center">Chunks</th>
                <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Date</th>
                <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getFileIcon(doc.filename)}</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 truncate max-w-[160px]" title={doc.metadata?.name || doc.filename}>
                            {doc.metadata?.name || doc.filename}
                          </span>
                          {getFileTypeBadge(doc.filename)}
                        </div>
                        <span className="text-xs text-slate-400 truncate max-w-[200px] block" title={doc.filename}>
                          {doc.filename}
                        </span>
                        {doc.metadata?.description && (
                          <span className="text-xs text-slate-400 italic truncate max-w-[200px] block">
                            {doc.metadata.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {doc.metadata?.category && (
                      <span className="inline-block mb-1.5 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded font-medium">
                        {doc.metadata.category}
                      </span>
                    )}
                    {doc.metadata?.tags && doc.metadata.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {doc.metadata.tags.map((tag: string, idx: number) => (
                          <span key={idx} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                            <Tag size={10} />{tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-300 text-xs italic">-</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {doc.status === 'ready' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                        <CheckCircle size={12} /> Ready
                      </span>
                    ) : doc.status === 'failed' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700" title={doc.error_message}>
                        <AlertCircle size={12} /> Failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        <Clock size={12} className="animate-pulse" /> Processing
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center text-slate-600 font-medium">
                    {doc.chunk_count ?? '-'}
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">
                    {doc.created_at ? new Date(doc.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    }) : '-'}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleDelete(doc.id, doc.metadata?.name || doc.filename)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete document"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Upload to Base Knowledge</h3>
                <p className="text-xs text-slate-500 mt-0.5">Select file type and fill in document metadata</p>
              </div>
              <button onClick={closeModal} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                <X size={20} />
              </button>
            </div>

            {/* File Type Tabs */}
            <div className="px-6 pt-4">
              <div className="flex gap-1.5 flex-wrap mb-4">
                {UPLOAD_TABS.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveUploadTab(tab.id);
                      setSelectedFiles([]);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      activeUploadTab === tab.id ? tab.color + ' ring-2 ring-offset-1 ring-brand-light' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleFileUpload} className="px-6 pb-6 overflow-y-auto space-y-4 flex-1">
              {error && showModal && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                  <AlertCircle size={16} />{error}
                </div>
              )}

              {/* File Drop Area */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
                  selectedFiles.length > 0
                    ? 'border-brand/40 bg-brand-bg'
                    : 'border-slate-300 bg-slate-50 hover:border-brand/40 hover:bg-brand-bg/50'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="sr-only"
                  accept={currentTab.accept}
                />
                {selectedFiles.length > 0 ? (
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto w-full">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 p-2 bg-white rounded border border-slate-200">
                        <div className="flex items-center gap-3">
                           {getFileIcon(file.name)}
                           <div className="text-left">
                             <p className="font-semibold text-slate-700 text-sm truncate max-w-[200px]" title={file.name}>{file.name}</p>
                             <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                           </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            const newFiles = [...selectedFiles];
                            newFiles.splice(idx, 1);
                            setSelectedFiles(newFiles); 
                            if (fileInputRef.current) fileInputRef.current.value=''; 
                          }}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${currentTab.color}`}>
                      {currentTab.icon}
                    </div>
                    <p className="text-sm font-medium text-slate-700">Click to select {currentTab.label} file(s)</p>
                    <p className="text-xs text-slate-400 mt-1">{currentTab.description}</p>
                    <p className="text-xs text-slate-400">Max 10MB | Format: {currentTab.accept}</p>
                  </>
                )}
              </div>

              {/* Meta Name */}
              {selectedFiles.length <= 1 && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Document Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={metaName}
                    onChange={(e) => setMetaName(e.target.value)}
                    placeholder="e.g. Employee Leave Policy 2026"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand text-sm"
                    required={selectedFiles.length === 1}
                  />
                  <p className="text-xs text-slate-400 mt-1">The name recognized by the AI when answering questions</p>
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand text-sm bg-white"
                >
                  <option value="">-- Select category --</option>
                  <option value="HR">HR / Human Resources</option>
                  <option value="Product">Products & Services</option>
                  <option value="Finance">Finance</option>
                  <option value="Legal">Legal & Compliance</option>
                  <option value="Technical">Technical / IT</option>
                  <option value="SOP">SOP & Procedures</option>
                  <option value="FAQ">FAQ</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Short Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe the contents of this document..."
                  rows={2}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand text-sm resize-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Add tag, press Enter"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand text-sm"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {tagList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tagList.map((tag, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-bg text-brand-hover text-xs rounded-full font-medium">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-brand">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-1">Tags help the AI select the right documents for specific questions</p>
              </div>

              {/* Footer */}
              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || selectedFiles.length === 0}
                  className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand to-brand-hover rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {uploading ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {uploadProgress ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...` : 'Processing...'}</>
                  ) : (
                    <><Upload size={16} /> Upload & Process</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
