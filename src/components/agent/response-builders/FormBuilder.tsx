'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export interface FormFieldRow {
  label: string;
  placeholder: string;
  type: string;
  required: boolean;
}

interface FormBuilderProps {
  activeIntentData: any;
  onUpdate: (field: string, value: any) => void;
  formFieldRows: FormFieldRow[];
  setFormFieldRows: React.Dispatch<React.SetStateAction<FormFieldRow[]>>;
}

export const FormBuilder: React.FC<FormBuilderProps> = ({
  activeIntentData,
  onUpdate,
  formFieldRows,
  setFormFieldRows,
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-brand-bg/60 p-4 rounded-xl border border-brand/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <p className="text-xs font-bold text-brand uppercase tracking-wider">Form Builder</p>
          </div>
          <button
            onClick={() => setFormFieldRows([...formFieldRows, { label: '', placeholder: '', type: 'text', required: false }])}
            className="flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-hover px-2 py-1 rounded-lg hover:bg-brand-bg/80 border border-brand/30 transition-colors"
          >
            <Plus size={13} /> Add Field
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Intro Message</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-brand/20 rounded-lg focus:ring-2 focus:ring-brand-light outline-none text-sm bg-white"
              placeholder="e.g. Please fill in the form below:"
              id="formBuilderIntro"
            />
          </div>

          {/* Field rows */}
          <div className="space-y-2">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_1fr_100px_auto_auto] gap-2 items-center">
              <span className="text-[10px] font-bold text-brand/70 uppercase tracking-wider">Label</span>
              <span className="text-[10px] font-bold text-brand/70 uppercase tracking-wider">Placeholder</span>
              <span className="text-[10px] font-bold text-brand/70 uppercase tracking-wider">Type</span>
              <span className="text-[10px] font-bold text-brand/70 uppercase tracking-wider">Req</span>
              <span />
            </div>
            {formFieldRows.map((field, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_100px_auto_auto] gap-2 items-center">
                <input
                  type="text"
                  className="px-2.5 py-1.5 border border-brand/20 rounded-lg focus:ring-2 focus:ring-brand-light outline-none text-sm bg-white w-full"
                  value={field.label}
                  onChange={(e) =>
                    setFormFieldRows(formFieldRows.map((f, j) => (j === i ? { ...f, label: e.target.value } : f)))
                  }
                  placeholder="Name"
                />
                <input
                  type="text"
                  className="px-2.5 py-1.5 border border-brand/20 rounded-lg focus:ring-2 focus:ring-brand-light outline-none text-sm bg-white w-full"
                  value={field.placeholder}
                  onChange={(e) =>
                    setFormFieldRows(formFieldRows.map((f, j) => (j === i ? { ...f, placeholder: e.target.value } : f)))
                  }
                  placeholder="e.g. John Doe"
                />
                <select
                  className="px-2 py-1.5 border border-brand/20 rounded-lg focus:ring-2 focus:ring-brand-light outline-none text-sm bg-white w-full"
                  value={field.type}
                  onChange={(e) =>
                    setFormFieldRows(formFieldRows.map((f, j) => (j === i ? { ...f, type: e.target.value } : f)))
                  }
                >
                  <option value="text">Text</option>
                  <option value="email">Email</option>
                  <option value="tel">Phone</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="textarea">Textarea</option>
                </select>
                <label className="flex items-center justify-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-brand/30 text-brand focus:ring-brand-light"
                    checked={field.required}
                    onChange={(e) =>
                      setFormFieldRows(formFieldRows.map((f, j) => (j === i ? { ...f, required: e.target.checked } : f)))
                    }
                  />
                </label>
                <button
                  onClick={() => {
                    const next = formFieldRows.filter((_, j) => j !== i);
                    setFormFieldRows(next.length > 0 ? next : [{ label: '', placeholder: '', type: 'text', required: false }]);
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Remove field"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Webhook POST URL <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-brand/20 rounded-lg focus:ring-2 focus:ring-brand-light outline-none text-sm bg-white"
              placeholder="https://n8n.example.com/webhook/..."
              id="formBuilderWebhook"
            />
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              const intro = (document.getElementById('formBuilderIntro') as HTMLInputElement).value.trim();
              const webhookUrl = (document.getElementById('formBuilderWebhook') as HTMLInputElement).value.trim();
              const validFields = formFieldRows.filter((f) => f.label.trim());
              if (!validFields.length) {
                alert('Please add at least one field.');
                return;
              }
              let onSubmitCode = 'event.preventDefault();';
              if (webhookUrl) {
                onSubmitCode += ` var btn=this.querySelector('button[type=submit]'); if(btn){btn.disabled=true;btn.textContent='Sending...';} var fd=new FormData(this); var d=Object.fromEntries(fd); fetch('${webhookUrl}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}).then(()=>{alert('Data berhasil dikirim!'); this.reset(); if(btn){btn.disabled=false;btn.textContent='Submit';}}).catch(e=>{console.error(e); alert('Gagal mengirim data'); if(btn){btn.disabled=false;btn.textContent='Submit';}});`;
              }
              let html = `<form class='form-card' onsubmit="${onSubmitCode}">`;
              validFields.forEach((field) => {
                const nameAttr = field.label.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
                const req = field.required ? 'required' : '';
                const ph = field.placeholder || `Enter ${field.label}`;
                html += `<label class='form-card_label'>${field.label}${field.required ? ' <span class="required">*</span>' : ''}</label>`;
                if (field.type === 'tel') {
                  html += `<input type='tel' name='${nameAttr}' placeholder='${ph}' class='form-card_input' pattern='[0-9]+' title='Please enter only numbers' oninput='this.value = this.value.replace(/[^0-9]/g, "")' ${req}/>`;
                } else if (field.type === 'textarea') {
                  html += `<textarea name='${nameAttr}' placeholder='${ph}' class='form-card_input' ${req}></textarea>`;
                } else {
                  html += `<input type='${field.type}' name='${nameAttr}' placeholder='${ph}' class='form-card_input' ${req}/>`;
                }
              });
              html += `<button type='submit' class='submit-btn'>Submit</button></form>`;
              onUpdate('answer', (intro || 'Silakan lengkapi form berikut:') + html);
            }}
            className="w-full py-2 bg-brand hover:bg-brand-hover text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
          >
            <span>📋</span> Generate Form HTML
          </button>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
          Generated HTML <span className="text-slate-400 font-normal normal-case">(editable)</span>
        </label>
        <textarea
          rows={4}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-light outline-none text-xs bg-slate-800 text-green-300 font-mono resize-none"
          value={activeIntentData?.answer ?? ''}
          onChange={(e) => onUpdate('answer', e.target.value)}
          placeholder="HTML will appear here after clicking Generate..."
        />
      </div>
    </div>
  );
};

export default FormBuilder;
