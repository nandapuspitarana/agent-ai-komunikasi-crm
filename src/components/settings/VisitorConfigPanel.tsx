'use client';

import React from 'react';
import { VisitorConfig, CustomExtractor, ExtractorMatchType } from '@/lib/visitor-config';
import { UserSearch, Plus, Trash2, Info } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/I18nContext';

interface VisitorConfigPanelProps {
  config: VisitorConfig;
  onChange: (newConfig: VisitorConfig) => void;
}

const MATCH_TYPE_OPTIONS: { value: ExtractorMatchType; label: string; desc: string; hasStore: boolean; hasEnd: boolean }[] = [
  {
    value: 'contains_keyword',
    label: '🔍 Mengandung Kata (Contains)',
    desc: 'Jika pesan MENGANDUNG kata kunci, simpan nilai tetap. Cocok untuk mendeteksi topik.',
    hasStore: true,
    hasEnd: false,
  },
  {
    value: 'exact_match',
    label: '✅ Sama Persis (Exact Match)',
    desc: 'Jika pesan SAMA PERSIS dengan kata kunci, simpan nilai tetap.',
    hasStore: true,
    hasEnd: false,
  },
  {
    value: 'extract_after',
    label: '➡️ Ambil Kata Setelah (Extract After)',
    desc: 'Ambil semua teks SETELAH kata kunci. Contoh: "budget saya" → mengambil "5 juta".',
    hasStore: false,
    hasEnd: false,
  },
  {
    value: 'extract_before',
    label: '⬅️ Ambil Kata Sebelum (Extract Before)',
    desc: 'Ambil semua teks SEBELUM kata kunci.',
    hasStore: false,
    hasEnd: false,
  },
  {
    value: 'extract_between',
    label: '↔️ Ambil Kata Antara (Extract Between)',
    desc: 'Ambil teks ANTARA dua kata kunci. Perlu isi kata awal dan kata akhir.',
    hasStore: false,
    hasEnd: true,
  },
  {
    value: 'regex',
    label: '🔬 Regex Lanjutan (Advanced)',
    desc: 'Gunakan ekspresi reguler (Regex). Grup pertama (grup 1) akan disimpan.',
    hasStore: false,
    hasEnd: false,
  },
];

export default function VisitorConfigPanel({ config, onChange }: VisitorConfigPanelProps) {
  const { t } = useTranslation();

  const updateConfig = (updates: Partial<VisitorConfig>) => {
    onChange({ ...config, ...updates });
  };

  const toggleField = (field: 'name' | 'email' | 'phone') => {
    const fields = config.leadFormFields || [];
    if (fields.includes(field)) {
      updateConfig({ leadFormFields: fields.filter(f => f !== field) as any });
    } else {
      updateConfig({ leadFormFields: [...fields, field] as any });
    }
  };

  const addExtractor = () => {
    const newExtractor: CustomExtractor = {
      field: '',
      label: '',
      matchType: 'contains_keyword',
      pattern: '',
      storeValue: 'yes',
    };
    updateConfig({ customExtractors: [...(config.customExtractors || []), newExtractor] });
  };

  const removeExtractor = (index: number) => {
    const updated = [...(config.customExtractors || [])];
    updated.splice(index, 1);
    updateConfig({ customExtractors: updated });
  };

  const updateExtractor = (index: number, updates: Partial<CustomExtractor>) => {
    const updated = [...(config.customExtractors || [])];
    updated[index] = { ...updated[index], ...updates };
    updateConfig({ customExtractors: updated });
  };

  const getMatchTypeInfo = (matchType: ExtractorMatchType) =>
    MATCH_TYPE_OPTIONS.find(o => o.value === matchType);

  return (
    <div className="space-y-6">
      {/* Master Switch */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <UserSearch className="text-brand" /> {t('visitors', 'configTitle')}
          </h3>
          <p className="text-sm text-slate-500 mt-1">{t('visitors', 'configSubtitle')}</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => updateConfig({ enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
        </label>
      </div>

      <div className={`space-y-6 transition-opacity duration-200 ${!config.enabled ? 'opacity-50 pointer-events-none' : ''}`}>

        {/* Layer 1: Passive Collection */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h4 className="text-md font-bold text-slate-800 mb-1">{t('visitors', 'layer1')}</h4>
          <p className="text-xs text-slate-500 mb-4">Data yang dikumpulkan secara pasif dari browser pengunjung tanpa bertanya.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.layer1_passive}
                onChange={(e) => updateConfig({ layer1_passive: e.target.checked })}
                className="mt-1 w-4 h-4 text-brand rounded focus:ring-brand border-slate-300"
              />
              <div>
                <p className="text-sm font-medium text-slate-900">{t('visitors', 'enableTracking')}</p>
                <p className="text-xs text-slate-500">{t('visitors', 'enableTrackingDesc')}</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.layer1_geolocation}
                onChange={(e) => updateConfig({ layer1_geolocation: e.target.checked })}
                className="mt-1 w-4 h-4 text-brand rounded focus:ring-brand border-slate-300"
              />
              <div>
                <p className="text-sm font-medium text-slate-900">{t('visitors', 'enableGeo')}</p>
                <p className="text-xs text-slate-500">{t('visitors', 'enableGeoDesc')}</p>
              </div>
            </label>
          </div>
        </div>

        {/* Layer 2: NLP Extraction */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h4 className="text-md font-bold text-slate-800 mb-1">{t('visitors', 'layer2')}</h4>
          <p className="text-xs text-slate-500 mb-4">Otomatis membaca pesan chat untuk mengambil data identitas pengunjung.</p>
          <label className="flex items-start gap-3 cursor-pointer mb-5">
            <input
              type="checkbox"
              checked={config.layer2_nlp}
              onChange={(e) => updateConfig({ layer2_nlp: e.target.checked })}
              className="mt-1 w-4 h-4 text-brand rounded focus:ring-brand border-slate-300"
            />
            <div>
              <span className="block text-sm font-medium text-slate-700">{t('visitors', 'enableNlp')}</span>
              <span className="block text-xs text-slate-500">{t('visitors', 'enableNlpDesc')}</span>
            </div>
          </label>

          {config.layer2_nlp && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2 pl-7">
              {(['layer2_nlp_name', 'layer2_nlp_email', 'layer2_nlp_phone'] as const).map((key) => {
                const label = key === 'layer2_nlp_name' ? 'Nama' : key === 'layer2_nlp_email' ? 'Email' : 'Nomor HP';
                const desc = key === 'layer2_nlp_name' ? 'Deteksi dari "nama saya..."' : key === 'layer2_nlp_email' ? 'Deteksi format @domain' : 'Deteksi format +62/08...';
                return (
                  <label key={key} className="flex items-start gap-2 cursor-pointer bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={config[key]}
                      onChange={(e) => updateConfig({ [key]: e.target.checked } as any)}
                      className="mt-0.5 w-4 h-4 text-brand rounded focus:ring-brand border-slate-300"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{label}</p>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Custom Data Extractors — No-Code Rule Builder */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="text-md font-bold text-slate-800">🧠 Data Ekstraksi Kustom</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Buat aturan untuk menyimpan data spesifik dari percakapan. Tidak perlu bisa coding!
              </p>
            </div>
            <button
              type="button"
              onClick={addExtractor}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white text-xs font-semibold rounded-lg hover:bg-brand-hover transition-colors"
            >
              <Plus size={14} /> Tambah Aturan
            </button>
          </div>

          {/* Example tip */}
          <div className="flex gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <Info size={15} className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700">
              <strong>Contoh:</strong> Untuk menyimpan budget pelanggan dari pesan "budget saya 5 juta", pilih <em>Ambil Kata Setelah</em> lalu isi Kata Kunci dengan <code className="bg-blue-100 px-1 rounded">budget saya</code>. Hasilnya akan tersimpan sebagai <code className="bg-blue-100 px-1 rounded">5 juta</code>.
            </p>
          </div>

          {(!config.customExtractors || config.customExtractors.length === 0) && (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
              <p className="text-sm text-slate-400">Belum ada aturan ekstraksi. Klik "+ Tambah Aturan" untuk mulai.</p>
            </div>
          )}

          <div className="space-y-4">
            {(config.customExtractors || []).map((extractor, idx) => {
              const matchInfo = getMatchTypeInfo(extractor.matchType);
              return (
                <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aturan #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeExtractor(idx)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Field name + label */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Field (ID)*</label>
                      <input
                        type="text"
                        value={extractor.field}
                        onChange={(e) => updateExtractor(idx, { field: e.target.value.replace(/\s/g, '_').toLowerCase() })}
                        placeholder="budget, company_size, interest"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand outline-none bg-white font-mono"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Hanya huruf kecil dan underscore. Ini nama kolom datanya.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Label Tampilan</label>
                      <input
                        type="text"
                        value={extractor.label}
                        onChange={(e) => updateExtractor(idx, { label: e.target.value })}
                        placeholder="Budget Pelanggan, Ukuran Perusahaan"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand outline-none bg-white"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Nama yang muncul di panel agen.</p>
                    </div>
                  </div>

                  {/* Match Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tipe Aturan*</label>
                    <select
                      value={extractor.matchType}
                      onChange={(e) => updateExtractor(idx, { matchType: e.target.value as ExtractorMatchType, storeValue: 'yes' })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand outline-none bg-white"
                    >
                      {MATCH_TYPE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {matchInfo && (
                      <p className="text-[10px] text-slate-500 mt-1 bg-white border border-slate-200 px-2 py-1 rounded-md">
                        ℹ️ {matchInfo.desc}
                      </p>
                    )}
                  </div>

                  {/* Pattern + optional end pattern */}
                  <div className={`grid gap-3 ${matchInfo?.hasEnd ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        {extractor.matchType === 'extract_between' ? 'Kata Kunci Awal*' : 'Kata Kunci / Pola*'}
                      </label>
                      <input
                        type="text"
                        value={extractor.pattern}
                        onChange={(e) => updateExtractor(idx, { pattern: e.target.value })}
                        placeholder={
                          extractor.matchType === 'contains_keyword' ? 'contoh: kpr, renovasi, cicilan'
                          : extractor.matchType === 'exact_match' ? 'contoh: ya, ok, setuju'
                          : extractor.matchType === 'extract_after' ? 'contoh: budget saya, harga sekitar'
                          : extractor.matchType === 'extract_before' ? 'contoh: per bulan, rupiah'
                          : extractor.matchType === 'extract_between' ? 'kata awal, contoh: antara'
                          : 'contoh: budget saya (\\d+)'
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand outline-none bg-white font-mono"
                      />
                    </div>
                    {matchInfo?.hasEnd && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Kata Kunci Akhir*</label>
                        <input
                          type="text"
                          value={extractor.patternEnd || ''}
                          onChange={(e) => updateExtractor(idx, { patternEnd: e.target.value })}
                          placeholder="contoh: juta, ribu"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand outline-none bg-white font-mono"
                        />
                      </div>
                    )}
                  </div>

                  {/* Store Value (only for contains/exact) */}
                  {matchInfo?.hasStore && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Nilai yang Disimpan*</label>
                      <input
                        type="text"
                        value={extractor.storeValue || ''}
                        onChange={(e) => updateExtractor(idx, { storeValue: e.target.value })}
                        placeholder='contoh: ya, tertarik, KPR Subsidi'
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand outline-none bg-white"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Nilai ini yang akan tersimpan ke database jika kondisi terpenuhi.</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Layer 4: AI Classification */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h4 className="text-md font-bold text-slate-800 mb-1">{t('visitors', 'layer34')}</h4>
          <p className="text-xs text-slate-500 mb-4">AI mengklasifikasikan percakapan dan memberi skor untuk mengukur kualitas prospek (lead).</p>
          <label className="flex items-start gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={config.layer4_classification}
              onChange={(e) => updateConfig({ layer4_classification: e.target.checked })}
              className="mt-1 w-4 h-4 text-brand rounded focus:ring-brand border-slate-300"
            />
            <div>
              <span className="block text-sm font-medium text-slate-700">{t('visitors', 'enableClassification')}</span>
              <span className="block text-xs text-slate-500">{t('visitors', 'enableClassificationDesc')}</span>
            </div>
          </label>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <label className="block text-sm font-medium text-slate-700 mb-3">Bobot Skor per Intensi</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: 'cold', label: '🧊 Cold', desc: 'Sekadar browsing' },
                { key: 'warm', label: '🌤️ Warm', desc: 'Mulai tertarik' },
                { key: 'hot_lead', label: '🔥 Hot Lead', desc: 'Sangat tertarik' },
                { key: 'booking', label: '💰 Booking', desc: 'Siap membeli' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="block text-sm font-semibold text-slate-700 mb-0.5">{label}</span>
                  <span className="block text-[10px] text-slate-400 mb-2">{desc}</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={config.scoreWeights?.[key as keyof typeof config.scoreWeights] || 0}
                      onChange={(e) => updateConfig({
                        scoreWeights: { ...config.scoreWeights, [key]: parseInt(e.target.value) || 0 } as any
                      })}
                      className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-brand text-sm text-center"
                    />
                    <span className="text-xs text-slate-500 shrink-0">pts</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Pengunjung dengan total skor ≥ <strong>{config.hotLeadThreshold || 50}</strong> pts akan ditandai sebagai prospek matang (Hot Lead).
            </p>
            <div className="mt-2 flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600">Hot Lead Threshold:</label>
              <input
                type="number"
                min={1}
                max={100}
                value={config.hotLeadThreshold || 50}
                onChange={(e) => updateConfig({ hotLeadThreshold: parseInt(e.target.value) || 50 })}
                className="w-20 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <span className="text-xs text-slate-500">pts</span>
            </div>
          </div>
        </div>

        {/* Layer 3: Contextual Lead Form */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h4 className="text-md font-bold text-slate-800 mb-1">Layer 3: Form Prospek Kontekstual</h4>
          <p className="text-xs text-slate-500 mb-4">Form data pengunjung akan muncul otomatis di chat saat AI mendeteksi intensi tertentu.</p>
          <label className="flex items-start gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={config.layer3_leadform}
              onChange={(e) => updateConfig({ layer3_leadform: e.target.checked })}
              className="mt-1 w-4 h-4 text-brand rounded focus:ring-brand border-slate-300"
            />
            <div>
              <span className="block text-sm font-medium text-slate-700">{t('visitors', 'enableLeadForm')}</span>
              <span className="block text-xs text-slate-500">{t('visitors', 'enableLeadFormDesc')}</span>
            </div>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('visitors', 'triggerClassification')}</label>
              <select
                value={config.leadFormTrigger || 'booking'}
                onChange={(e) => updateConfig({ leadFormTrigger: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand outline-none"
              >
                <option value="hot_lead">🔥 Hot Lead — Sangat tertarik</option>
                <option value="booking">💰 Booking — Siap membeli</option>
                <option value="warm">🌤️ Warm — Mulai bertanya</option>
                <option value="support">🛠️ Support — Butuh bantuan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Judul Form</label>
              <input
                type="text"
                value={config.leadFormTitle || ''}
                onChange={(e) => updateConfig({ leadFormTitle: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand text-sm"
                placeholder="Boleh kami tahu sedikit tentang Anda?"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">{t('visitors', 'fieldsToAsk')}</label>
            <div className="flex gap-4">
              {['name', 'email', 'phone'].map((field) => (
                <label key={field} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.leadFormFields?.includes(field as any)}
                    onChange={() => toggleField(field as any)}
                    className="w-4 h-4 text-brand rounded focus:ring-brand border-slate-300"
                  />
                  <span className="text-sm text-slate-700 capitalize">{field === 'name' ? 'Nama' : field === 'email' ? 'Email' : 'No. HP'}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer mt-4">
            <input
              type="checkbox"
              checked={config.leadFormSkippable}
              onChange={(e) => updateConfig({ leadFormSkippable: e.target.checked })}
              className="w-4 h-4 text-brand rounded focus:ring-brand border-slate-300"
            />
            <span className="text-sm font-medium text-slate-700">Izinkan pengunjung melewati form (skippable)</span>
          </label>
        </div>

      </div>
    </div>
  );
}
