'use client';

import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit2, Trash2, Copy, Search, Tag } from 'lucide-react';

/**
 * Canned Responses Component
 * Allows agents to manage and quickly send pre-written responses in the Omni-Inbox
 */

interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  shortcut?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  usage: number;
}

export const CannedResponses = ({
  tenantId,
  agentId,
  onSelect,
}: {
  tenantId: string;
  agentId: string;
  onSelect: (response: CannedResponse) => void;
}) => {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [filteredResponses, setFilteredResponses] = useState<CannedResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState<CannedResponse | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    shortcut: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load canned responses
  useEffect(() => {
    fetchResponses();
  }, [tenantId, agentId]);

  // Filter responses based on search and category
  useEffect(() => {
    let filtered = responses;

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.shortcut?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((r) => r.category === selectedCategory);
    }

    setFilteredResponses(filtered);
  }, [responses, searchTerm, selectedCategory]);

  const fetchResponses = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/canned-responses?tenantId=${tenantId}&agentId=${agentId}`);

      if (!res.ok) throw new Error('Failed to fetch responses');

      const data = await res.json();
      setResponses(data.responses || []);

      // Extract unique categories
      const cats = Array.from(
        new Set(data.responses?.map((r: CannedResponse) => r.category) || [])
      ) as string[];
      setCategories(cats);
    } catch (error) {
      console.error('Error fetching canned responses:', error);
      setMessage({ type: 'error', text: 'Failed to load responses' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingResponse(null);
    setFormData({ title: '', content: '', category: '', shortcut: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (response: CannedResponse) => {
    setEditingResponse(response);
    setFormData({
      title: response.title,
      content: response.content,
      category: response.category,
      shortcut: response.shortcut || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this response?')) return;

    try {
      const res = await fetch(`/api/canned-responses/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete');

      setResponses(responses.filter((r) => r.id !== id));
      setMessage({ type: 'success', text: 'Response deleted' });
    } catch (error) {
      console.error('Error deleting response:', error);
      setMessage({ type: 'error', text: 'Failed to delete response' });
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      setMessage({ type: 'error', text: 'Title and content are required' });
      return;
    }

    try {
      setLoading(true);
      const url = editingResponse
        ? `/api/canned-responses/${editingResponse.id}`
        : '/api/canned-responses';
      const method = editingResponse ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tenantId,
          agentId,
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      setMessage({
        type: 'success',
        text: editingResponse ? 'Response updated' : 'Response created',
      });

      setIsModalOpen(false);
      fetchResponses();
    } catch (error) {
      console.error('Error saving response:', error);
      setMessage({ type: 'error', text: 'Failed to save response' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (response: CannedResponse) => {
    onSelect(response);
    // Update usage count
    fetch(`/api/canned-responses/${response.id}/usage`, { method: 'POST' }).catch(console.error);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    setMessage({ type: 'success', text: 'Copied to clipboard' });
  };

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg border border-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Canned Responses</h3>
          <p className="text-xs text-slate-500">Quick responses for common inquiries</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-1 px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-hover text-sm font-medium transition-colors"
        >
          <PlusCircle size={16} />
          Add
        </button>
      </div>

      {/* Search and Filter */}
      <div className="p-3 border-b border-slate-200 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search responses or shortcuts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                selectedCategory === null
                  ? 'bg-brand text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                  selectedCategory === cat
                    ? 'bg-brand text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Tag size={12} />
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Message Alert */}
      {message && (
        <div
          className={`mx-3 mt-3 p-2 rounded text-sm flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-lg opacity-50 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}

      {/* Responses List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading...</div>
        ) : filteredResponses.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            {responses.length === 0
              ? 'No responses yet. Create one to get started!'
              : 'No responses match your filters.'}
          </div>
        ) : (
          filteredResponses.map((response) => (
            <div
              key={response.id}
              className="p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 transition-all group"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm text-slate-900">{response.title}</h4>
                    {response.shortcut && (
                      <code className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-xs rounded font-mono">
                        {response.shortcut}
                      </code>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{response.category}</p>
                </div>
              </div>

              <p className="text-sm text-slate-700 mb-2 line-clamp-2">{response.content}</p>

              <div className="flex items-center justify-between gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-slate-500">Used {response.usage} times</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleCopy(response.content)}
                    title="Copy to clipboard"
                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                  >
                    <Copy size={14} className="text-slate-600" />
                  </button>
                  <button
                    onClick={() => handleEdit(response)}
                    title="Edit"
                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                  >
                    <Edit2 size={14} className="text-brand" />
                  </button>
                  <button
                    onClick={() => handleDelete(response.id)}
                    title="Delete"
                    className="p-1 hover:bg-red-100 rounded transition-colors"
                  >
                    <Trash2 size={14} className="text-red-600" />
                  </button>
                </div>
              </div>

              <button
                onClick={() => handleSelect(response)}
                className="w-full mt-2 px-3 py-1.5 bg-brand text-white text-sm rounded font-medium hover:bg-brand-hover transition-colors"
              >
                Use Response
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-semibold text-slate-900">
                {editingResponse ? 'Edit Response' : 'New Response'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Thank you for inquiry"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Content *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Type your response here..."
                  rows={5}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Greeting, FAQ, Closing"
                  list="categories"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <datalist id="categories">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Keyboard Shortcut (optional)
                </label>
                <input
                  type="text"
                  value={formData.shortcut}
                  onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                  placeholder="e.g., /thanks"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Type the shortcut followed by space to insert this response
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 flex gap-2 sticky bottom-0 bg-white">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-brand text-white rounded-lg font-medium hover:bg-brand-hover disabled:opacity-50 transition-colors"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CannedResponses;
