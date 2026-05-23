'use client';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Upload, ScanLine, Check, X, AlertTriangle, FileImage,
  Plus, Trash2, Edit3, ShieldCheck, ShieldAlert, Package,
  IndianRupee, Hash, Calendar, Building2, ClipboardList, Sparkles, Tag
} from 'lucide-react';
import { useToast } from './ToastProvider';

/* ── Step indicators ── */
const STEPS = [
  { key: 'upload',  label: '1. Upload',  icon: Upload },
  { key: 'review',  label: '2. Review',  icon: ClipboardList },
  { key: 'confirm', label: '3. Confirm', icon: ShieldCheck },
];

export default function AIUpload({ onBack, profile }) {
  const { toast } = useToast();
  /* ── State ── */
  const [step, setStep] = useState('upload'); // upload | review | confirm
  const [file, setFile] = useState(null);       // { base64, mimeType, fileName } from dialog  OR  File object
  const [preview, setPreview] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI);
  }, []);

  /* invoice-level metadata from Gemini AI */
  const [invoiceMeta, setInvoiceMeta] = useState({ vendor: '', invoice_number: '', date: '', invoice_total: 0, other_charges: 0 });
  const [items, setItems] = useState([]);
  const [detectedFields, setDetectedFields] = useState([]);
  const [detectedCategories, setDetectedCategories] = useState([]);

  /* ── Derived ── */
  const computedTotal = useMemo(
    () => {
      const itemsSum = items.reduce((sum, i) => sum + (parseFloat(i.quantity) || 0) * (parseFloat(i.price) || 0), 0);
      return itemsSum + (parseFloat(invoiceMeta.other_charges) || 0);
    },
    [items, invoiceMeta.other_charges]
  );

  const validationIssues = useMemo(() => {
    const issues = [];
    if (!items || items.length === 0) {
      issues.push({ type: 'error', msg: 'No line items — nothing to save.' });
      return issues;
    }
    items.forEach((item, idx) => {
      if (!item.description || !item.description.trim()) issues.push({ type: 'error', msg: `Row ${idx + 1}: Product name is empty.` });
      if (!item.quantity || parseFloat(item.quantity) <= 0) issues.push({ type: 'warning', msg: `Row ${idx + 1}: Quantity is 0 or missing.` });
      if (!item.price || parseFloat(item.price) <= 0) issues.push({ type: 'warning', msg: `Row ${idx + 1}: Price is 0 or missing.` });
    });
    if (invoiceMeta.invoice_total > 0 && Math.abs(computedTotal - invoiceMeta.invoice_total) > 1) {
      issues.push({
        type: 'warning',
        msg: `Total mismatch — Invoice says ₹${invoiceMeta.invoice_total.toLocaleString('en-IN')} but items sum to ₹${computedTotal.toLocaleString('en-IN')}. Please verify.`,
      });
    }
    return issues;
  }, [items, invoiceMeta, computedTotal]);

  const hasMismatch = useMemo(() => validationIssues.some(i => i.msg.includes('Total mismatch')), [validationIssues]);

  const hasErrors = validationIssues.some(i => i.type === 'error');

  /* ── File selection — Electron native dialog OR html file input ── */
  const handleSelectFile = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.ai.selectFile();
      if (result) {
        setFile(result); // { base64, mimeType, fileName }
        setPreview(`data:${result.mimeType};base64,${result.base64}`);
        resetParsedState();
      }
    }
  };

  const handleFileInput = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    resetParsedState();
  };

  const resetParsedState = () => {
    setItems([]);
    setError('');
    setSaved(false);
    setStep('upload');
    setInvoiceMeta({ vendor: '', invoice_number: '', date: '', invoice_total: 0, other_charges: 0 });
  };

  /* ── Parse via IPC (Electron Main Process) ── */
  const handleParse = async () => {
    if (!file) { setError('No file selected'); return; }

    setParsing(true);
    setError('');
    setItems([]);

    try {
      let payload = null;

      if (file.base64) {
        // Already have base64 from Electron dialog
        payload = { base64: file.base64, mimeType: file.mimeType };
      } else {
        // Standard File object (from drag-drop or input) - convert to base64
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        const b64 = await base64Promise;
        payload = { base64: b64, mimeType: file.type };
      }

      const result = await window.electronAPI.ai.parseInvoice(payload);

      if (result.success) {
        if (!result.items || result.items.length === 0) {
          setError('No items were detected in this invoice. Try a clearer photo.');
        } else {
          setInvoiceMeta({
            vendor: result.vendor || '',
            invoice_number: result.invoice_number || '',
            date: result.date || '',
            invoice_total: result.invoice_total || 0,
            other_charges: result.other_charges || 0,
          });
          setItems(result.items);
          setDetectedFields(result.detected_new_fields || []);
          setDetectedCategories(result.detected_categories || []);
          setStep('review');
          if ((result.detected_new_fields || []).length > 0) {
            toast(`AI discovered ${result.detected_new_fields.length} custom fields: ${result.detected_new_fields.join(', ')}`, 'info', 5000);
          }
        }
      } else {
        setError(result.error || 'Failed to parse invoice');
      }
    } catch (e) {
      setError(e?.message || 'Invoice parsing failed. Please try again.');
    }

    setParsing(false);
  };

  /* ── Item editing ── */
  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const removeItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const addItem = () => {
    setItems(prev => [...prev, { 
      description: '', category: '', product_size: '', quantity: 1, 
      price: 0, amount: 0, batch_number: '', expiry_date: '', 
      hsn_code: '', gst_rate: 0, custom_fields: {} 
    }]);
  };

  /* ── AI Discovery Management ── */
  const removeDetectedField = (fieldName) => {
    // 1. Remove from the global discovery list
    setDetectedFields(prev => prev.filter(f => f !== fieldName));
    
    // 2. IMPORTANT: Remove this specific field from all detected items
    setItems(prev => prev.map(item => {
      if (item.custom_fields && item.custom_fields[fieldName]) {
        const updated = { ...item.custom_fields };
        delete updated[fieldName];
        return { ...item, custom_fields: updated };
      }
      return item;
    }));
  };

  const removeDetectedCategory = (catName) => {
    setDetectedCategories(prev => prev.filter(c => c !== catName));
    // Also clear from items that have this category assigned
    setItems(prev => prev.map(item => item.category === catName ? { ...item, category: '' } : item));
  };

  /* ── Save to inventory (Electron DB) ── */
  const handleConfirm = async () => {
    if (hasErrors) return;
    setSaving(true);
    try {
      const payload = {
        supplier_name: invoiceMeta.vendor || 'AI Upload',
        other_charges: parseFloat(invoiceMeta.other_charges) || 0,
        items: items.map(i => ({
          product_name: i.description,
          category: i.category || '',
          product_size: i.product_size || '',
          quantity: parseInt(i.quantity) || 0,
          price: parseFloat(i.price) || 0,
          batch_number: i.batch_number || '',
          expiry_date: i.expiry_date || '',
          custom_fields: i.custom_fields || {}
        })),
      };

      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.purchases.create(payload);
        
        let msg = `${items.length} items processed`;
        if (result.createdCount > 0) {
          msg = `Created ${result.createdCount} new products & updated ${result.updatedCount} stock`;
        } else if (result.updatedCount > 0) {
          msg = `Stock updated for all ${result.updatedCount} products`;
        }
        if (detectedFields.length > 0) {
          msg += ` • ${detectedFields.length} fields auto-registered`;
        }

        toast(msg, 'success', 5000);
      }

      setSaved(true);
      setStep('confirm');
    } catch (e) {
      toast('Error: ' + e.message, 'error');
    }
    setSaving(false);
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setItems([]);
    setError('');
    setSaved(false);
    setSaving(false);
    setStep('upload');
    setDetectedFields([]);
    setDetectedCategories([]);
    setInvoiceMeta({ vendor: '', invoice_number: '', date: '', invoice_total: 0, other_charges: 0 });
  };

  /* All custom field keys across items */
  const allCustomFieldKeys = useMemo(() => {
    const keys = new Set();
    items.forEach(item => {
      Object.keys(item.custom_fields || {}).forEach(k => keys.add(k));
    });
    return [...keys];
  }, [items]);

  /* ══════════ RENDER ══════════ */
  return (
    <div className="animate-in">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 30 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 4 }}>
            <ScanLine size={24} style={{ marginRight: 8, verticalAlign: 'text-bottom', color: 'var(--accent)' }} />
            AI Smart Receipt
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>
            Intelligent extraction powered by Google Gemini AI
          </p>
        </div>
        {onBack && (
          <button className="btn btn-secondary btn-sm" style={{ height: 36 }} onClick={onBack}>
            ← Exit to Purchases
          </button>
        )}
      </div>

      {/* Premium Step Navigation */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          const isActive = step === s.key;
          const isDone = (step === 'review' && s.key === 'upload') || (step === 'confirm');
          return (
            <div key={s.key} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, opacity: isActive || isDone ? 1 : 0.4 }}>
              <div style={{ 
                width: 32, height: 32, borderRadius: 10, 
                background: isDone ? 'var(--success)' : isActive ? 'var(--accent)' : 'var(--bg-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isDone || isActive ? '#fff' : 'var(--text-muted)',
                boxShadow: isActive ? '0 0 15px var(--accent-glow)' : 'none',
                transition: 'all 0.3s ease'
              }}>
                {isDone ? <Check size={16} strokeWidth={3} /> : <Icon size={16} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>Step {idx + 1}</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{s.label.split('. ')[1]}</div>
              </div>
              {idx < STEPS.length - 1 && <div style={{ width: 40, height: 2, background: 'var(--border)', borderRadius: 2 }} />}
            </div>
          );
        })}
      </div>

      {/* ═══ STEP 1: UPLOAD ═══ */}
      {step === 'upload' && (
        <div className="animate-in" style={{ display: 'grid', gridTemplateColumns: file ? '1fr 1fr' : '1fr', gap: 24 }}>
          {!file ? (
            <div
              className={`dropzone ${dragOver ? 'drag-over' : ''}`}
              style={{ 
                height: 400, border: '2px dashed var(--accent)', background: 'var(--bg-secondary)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                borderRadius: 'var(--radius-lg)', cursor: 'pointer', transition: 'all 0.3s ease'
              }}
              onClick={isElectron ? handleSelectFile : undefined}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleSelectFile(); }}
            >
              <div style={{ 
                width: 80, height: 80, borderRadius: '50%', background: 'var(--accent-glow)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20
              }}>
                <Upload size={32} style={{ color: 'var(--accent)' }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Drop your invoice here</h3>
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: 300, fontSize: 14 }}>
                We'll automatically extract items, taxes, and vendor details using AI.
              </p>
              {!isElectron && (
                <input type="file" accept="image/*" onChange={handleFileInput} style={{ marginTop: 20 }} />
              )}
            </div>
          ) : (
            <>
              <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="flex items-center gap-sm">
                    <FileImage size={18} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{file.fileName || file.name}</span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={reset}><X size={14} /> Clear</button>
                </div>
                <div style={{ padding: 20, background: 'var(--bg-secondary)', position: 'relative' }}>
                  <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: 500, objectFit: 'contain', borderRadius: 'var(--radius-md)' }} />
                  {parsing && (
                    <div className="scanning-line" style={{
                      position: 'absolute', top: 20, left: 20, right: 20,
                      height: 4, background: 'var(--accent)',
                      boxShadow: '0 0 15px var(--accent), 0 0 30px var(--accent)',
                      zIndex: 10, borderRadius: 2,
                      animation: 'scan 2s linear infinite'
                    }} />
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="card" style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent)' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Ready for Analysis</h3>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: 20 }}>
                    Our AI will now read the image and extract structured data for your inventory. This takes about 3-5 seconds.
                  </p>
                  <button className="btn btn-primary w-full btn-lg" onClick={handleParse} disabled={parsing} style={{ height: 54 }}>
                    {parsing
                      ? <><div className="spinner" style={{ width: 18, height: 18 }}></div> Digitizing Receipt...</>
                      : <><ScanLine size={20} /> Start AI Extraction</>
                    }
                  </button>
                </div>
                {error && (
                  <div className="card" style={{ 
                    borderColor: 'var(--danger)', 
                    background: 'rgba(239, 68, 68, 0.05)',
                    padding: '16px 20px',
                    borderLeft: '4px solid var(--danger)'
                  }}>
                    <div className="flex items-start gap-sm">
                      <AlertTriangle size={20} style={{ color: 'var(--danger)', marginTop: 2 }} />
                      <div>
                        <div style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 800, marginBottom: 4 }}>AI EXTRACTION ERROR</div>
                        <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{error}</div>
                        {error.includes("demand") && (
                          <div style={{ 
                            marginTop: 12, fontSize: 11, fontWeight: 700, 
                            color: 'var(--text-muted)', background: 'var(--bg-secondary)', 
                            padding: '6px 10px', borderRadius: 6, display: 'inline-block' 
                          }}>
                            💡 Recommendation: Wait 60 seconds and try again.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ STEP 2: REVIEW (Bento Dashboard) ═══ */}
      {step === 'review' && (
        <div className="animate-in">
          {/* Header Dashboard Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div className="card" style={{ background: 'var(--bg-primary)' }}>
              <div className="flex items-center gap-sm mb-md">
                <Building2 size={16} style={{ color: 'var(--accent)' }} />
                <span style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vendor Identity</span>
              </div>
              <input className="form-input" style={{ fontSize: 18, fontWeight: 800, padding: 0, border: 'none', background: 'none' }} 
                value={invoiceMeta.vendor} onChange={(e) => setInvoiceMeta(m => ({ ...m, vendor: e.target.value }))} placeholder="Extracting vendor..." />
              <div className="divider" style={{ margin: '12px 0' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>INVOICE NUMBER</label>
                  <input className="form-input" style={{ height: 32, fontSize: 13, background: 'var(--bg-secondary)', border: 'none' }} value={invoiceMeta.invoice_number} onChange={(e) => setInvoiceMeta(m => ({ ...m, invoice_number: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>BILLING DATE</label>
                  <input className="form-input" style={{ height: 32, fontSize: 13, background: 'var(--bg-secondary)', border: 'none' }} type="date" value={invoiceMeta.date} onChange={(e) => setInvoiceMeta(m => ({ ...m, date: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="card" style={{ background: hasMismatch ? 'var(--warning-bg)' : 'var(--bg-primary)' }}>
              <div className="flex items-center gap-sm mb-md">
                <IndianRupee size={16} style={{ color: hasMismatch ? 'var(--warning)' : 'var(--accent)' }} />
                <span style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase' }}>Financial Totals</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: hasMismatch ? 'var(--warning)' : 'var(--text-primary)' }}>₹{computedTotal.toLocaleString()}</div>
              {invoiceMeta.invoice_total > 0 && (
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginTop: 4 }}>Invoice says: ₹{invoiceMeta.invoice_total.toLocaleString()}</div>
              )}
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>SHIPPING / OTHER</label>
                <input className="form-input" style={{ height: 32, background: 'var(--bg-secondary)', border: 'none' }} value={invoiceMeta.other_charges} onChange={(e) => setInvoiceMeta(m => ({ ...m, other_charges: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="flex items-center gap-sm">
                <ShieldCheck size={16} style={{ color: 'var(--success)' }} />
                <span style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase' }}>Validation</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {validationIssues.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>✅ Everything looks perfect</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {validationIssues.slice(0, 3).map((issue, idx) => (
                      <div key={idx} style={{ fontSize: 11, color: issue.type === 'error' ? 'var(--danger)' : 'var(--warning)', fontWeight: 600 }}>
                        • {issue.msg.length > 40 ? issue.msg.substring(0, 40) + '...' : issue.msg}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button className="btn btn-primary w-full" onClick={handleConfirm} disabled={saving || hasErrors}>
                {saving ? 'Saving...' : 'Finalize Invoice'}
              </button>
            </div>
          </div>

          {/* AI Discovery Panel — show detected categories + custom fields */}
          {(detectedFields.length > 0 || detectedCategories.length > 0) && (
            <div className="card animate-in" style={{ 
              background: 'linear-gradient(135deg, rgba(79,70,229,0.04), rgba(16,185,129,0.04))',
              border: '1px dashed var(--accent)', 
              padding: '16px 20px', marginBottom: 24 
            }}>
              <div className="flex items-center gap-sm mb-md">
                <Sparkles size={18} style={{ color: 'var(--accent)' }} />
                <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--accent)' }}>AI Auto-Discovery</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                  — These will be auto-registered when you finalize
                </span>
              </div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {detectedCategories.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>New Categories</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {detectedCategories.map(c => (
                        <span key={c} style={{ 
                          padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 700,
                          background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)',
                          display: 'flex', alignItems: 'center', gap: 6
                        }}>
                          <Tag size={10} style={{ color: 'var(--success)' }} />
                          {c}
                          <button onClick={() => removeDetectedCategory(c)} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: 'var(--success)', opacity: 0.6, display: 'flex' }} className="hover:opacity-100">
                            <X size={12} strokeWidth={3} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {detectedFields.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>New Product Fields</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {detectedFields.map(f => (
                        <span key={f} style={{ 
                          padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 700,
                          background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid rgba(79,70,229,0.2)',
                          display: 'flex', alignItems: 'center', gap: 6
                        }}>
                          <Hash size={10} style={{ color: 'var(--accent)' }} />
                          {f}
                          <button onClick={() => removeDetectedField(f)} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: 'var(--accent)', opacity: 0.6, display: 'flex' }} className="hover:opacity-100">
                            <X size={12} strokeWidth={3} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Items Table Modernization */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>Detected Line Items ({items.length})</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setStep('upload')}>Re-scan</button>
                <button className="btn btn-primary btn-sm" onClick={addItem}><Plus size={14} /> Add Row</button>
              </div>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)' }}>#</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)' }}>PRODUCT NAME</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', width: 140 }}>CATEGORY</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', width: 100 }}>SIZE</th>
                    <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', width: 80 }}>QTY</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', width: 120 }}>UNIT PRICE</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', width: 140 }}>TOTAL</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', width: 150 }}>BATCH / EXPIRY</th>
                    <th style={{ padding: '12px 20px', textAlign: 'center', width: 60 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <React.Fragment key={idx}>
                    <tr style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <input style={{ width: '100%', background: 'none', border: 'none', padding: '0 4px', fontWeight: 700, fontSize: 14, height: 44, color: 'var(--text-primary)', outline: 'none' }} 
                          value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <input style={{ width: '100%', background: 'var(--bg-secondary)', height: 36, fontSize: 12, border: '1px solid var(--border)', borderRadius: 4, padding: '0 8px' }} 
                          placeholder="Category..."
                          value={item.category || ''} onChange={(e) => updateItem(idx, 'category', e.target.value)} />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <input style={{ width: '100%', background: 'var(--bg-primary)', height: 40, fontWeight: 700, border: '1px dashed var(--accent)', color: 'var(--accent)', padding: '0 10px', borderRadius: 6, outline: 'none' }} 
                          placeholder="e.g. 1kg"
                          value={item.product_size || ''} onChange={(e) => updateItem(idx, 'product_size', e.target.value)} />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <input type="number" style={{ width: '100%', background: 'var(--bg-primary)', height: 40, textAlign: 'center', fontWeight: 800, padding: '0 4px', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', outline: 'none' }} 
                          value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div className="flex items-center justify-end gap-xs">
                          <span style={{ fontSize: 12, fontWeight: 800 }}>₹</span>
                          <input style={{ width: 80, height: 40, background: 'var(--bg-primary)', textAlign: 'right', fontWeight: 800, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', outline: 'none' }} 
                            value={item.price} onChange={(e) => updateItem(idx, 'price', e.target.value)} />
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 900, color: 'var(--accent)', fontSize: 15 }}>
                        ₹{(item.quantity * item.price).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div className="flex gap-sm">
                          <input style={{ width: 80, height: 40, fontSize: 12, padding: '0 8px', border: '1px solid var(--border)', borderRadius: 6, background: 'white', color: 'var(--text-primary)', outline: 'none' }} placeholder="Batch" value={item.batch_number} onChange={(e) => updateItem(idx, 'batch_number', e.target.value)} />
                          <input type="date" style={{ width: 110, height: 40, fontSize: 12, padding: '0 8px', border: '1px solid var(--border)', borderRadius: 6, background: 'white', color: 'var(--text-primary)', outline: 'none' }} value={item.expiry_date} onChange={(e) => updateItem(idx, 'expiry_date', e.target.value)} />
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)', opacity: 0.4 }} onClick={() => removeItem(idx)}><Trash2 size={16} /></button>
                      </td>
                    </tr>
                    {/* Custom Fields Sub-Row */}
                    {Object.keys(item.custom_fields || {}).length > 0 && (
                      <tr style={{ background: 'rgba(79,70,229,0.03)' }}>
                        <td></td>
                        <td colSpan={8} style={{ padding: '6px 10px 10px' }}>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Sparkles size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                            {Object.entries(item.custom_fields).map(([key, val]) => (
                              <div key={key} className="group/field" style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative' }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>{key}:</span>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                  <input
                                    style={{ width: Math.max(80, String(val).length * 8 + 20), height: 26, fontSize: 12, fontWeight: 600, padding: '0 24px 0 6px', border: '1px solid rgba(79,70,229,0.2)', borderRadius: 4, background: 'white', color: 'var(--text-primary)', outline: 'none' }}
                                    value={val}
                                    onChange={(e) => {
                                      const updated = { ...item.custom_fields, [key]: e.target.value };
                                      updateItem(idx, 'custom_fields', updated);
                                    }}
                                  />
                                  <button 
                                    onClick={() => {
                                      const updated = { ...item.custom_fields };
                                      delete updated[key];
                                      updateItem(idx, 'custom_fields', updated);
                                    }}
                                    style={{ 
                                      position: 'absolute', right: 4, background: 'none', border: 'none', 
                                      color: 'var(--danger)', padding: 0, cursor: 'pointer', opacity: 0.5,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                    className="hover:opacity-100"
                                  >
                                    <X size={12} strokeWidth={3} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STEP 3: SUCCESS ═══ */}
      {step === 'confirm' && saved && (
        <div className="animate-in" style={{ maxWidth: 500, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 24 }}>
            <div style={{ 
              width: 100, height: 100, background: 'var(--success-bg)', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
              <Check size={48} style={{ color: 'var(--success)' }} strokeWidth={3} />
            </div>
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>Extraction Successful!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.6, marginBottom: 16 }}>
            <strong>{items.length} products</strong> have been successfully updated or added to your inventory from <strong>{invoiceMeta.vendor}</strong>.
          </p>
          {(detectedFields.length > 0 || detectedCategories.length > 0) && (
            <div style={{ marginBottom: 24, padding: '12px 20px', background: 'var(--accent-glow)', borderRadius: 12, textAlign: 'left' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>🧠 AI Auto-Registered</div>
              {detectedCategories.length > 0 && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Categories: <strong>{detectedCategories.join(', ')}</strong></div>}
              {detectedFields.length > 0 && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Product Fields: <strong>{detectedFields.join(', ')}</strong></div>}
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-primary btn-lg" onClick={reset}><Plus size={18} /> New Upload</button>
            <button className="btn btn-secondary btn-lg" onClick={onBack}>View Purchases</button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(460px); }
        }
        @keyframes pop {
          0% { transform: scale(0); }
          100% { transform: scale(1); }
        }
      `}</style>


    </div>
  );
}
