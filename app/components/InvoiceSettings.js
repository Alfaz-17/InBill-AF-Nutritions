'use client';
import { useState, useEffect } from 'react';
import { 
  X, Check, Layout, Eye, Settings2, FileText, 
  Palette, Grid, List, CheckCircle2, Monitor, Printer 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const TEMPLATES = [
  { id: 'classic', name: 'Business Blue', color: '#1e40af', description: 'Clean, industrial blue layout for corporate billing.' },
  { id: 'modern', name: 'Simple Orange', color: '#ea580c', description: 'Contemporary design with bold orange highlights.' },
  { id: 'minimal', name: 'Landscaping Green', color: '#15803d', description: 'Nature-inspired green theme for professional services.' }
];

const DEFAULT_SETTINGS = {
  template: 'classic',
  showSNo: true,
  showHsn: true,
  showUnit: true,
  showBrand: true,
  showSku: true,
  showGstDetail: true,
  showDiscount: true,
  showLogo: true,
  showSignature: true,
  accentColor: '#2563eb',
  fontSize: '12px',
  density: 'standard', // compact, standard, relaxed
  letterheadMode: false,
  topMargin: '150px'
};
export default function InvoiceSettings({ profile, onClose, onProfileUpdate }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [attributes, setAttributes] = useState([]);

  const COLOR_PRESETS = [
    { id: 'blue', color: '#2563eb' },
    { id: 'emerald', color: '#059669' },
    { id: 'rose', color: '#e11d48' },
    { id: 'slate', color: '#0f172a' },
    { id: 'indigo', color: '#4f46e5' }
  ];

  useEffect(() => {
    loadAttributes();
  }, []);

  const loadAttributes = async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.attributes) {
      try {
        const data = await window.electronAPI.attributes.getAll();
        setAttributes(data || []);
        
        // If NO visible attributes are defined yet, default to ALL selected
        setSettings(prev => {
          if (!prev.visibleAttributes || prev.visibleAttributes.length === 0) {
            return { ...prev, visibleAttributes: (data || []).map(a => a.name) };
          }
          return prev;
        });
      } catch (e) { console.error(e); }
    }
  };

  useEffect(() => {
    if (profile?.invoice_settings) {
      try {
        const saved = typeof profile.invoice_settings === 'string' 
          ? JSON.parse(profile.invoice_settings) 
          : profile.invoice_settings;
        const finalSaved = { ...saved };
        if (!Array.isArray(finalSaved.visibleAttributes)) {
          finalSaved.visibleAttributes = [];
        }
        setSettings({ 
          ...DEFAULT_SETTINGS, 
          fontFamily: 'Inter',
          ...finalSaved 
        });
      } catch (e) { console.error('Failed to parse settings', e); }
    }
  }, [profile]);

  const toggleAttribute = (attrName) => {
    const current = settings.visibleAttributes || [];
    if (current.includes(attrName)) {
      setSettings({ ...settings, visibleAttributes: current.filter(a => a !== attrName) });
    } else {
      setSettings({ ...settings, visibleAttributes: [...current, attrName] });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (window.electronAPI?.business) {
        await window.electronAPI.business.updateProfile({
          ...profile,
          invoice_settings: settings
        });
        if (onProfileUpdate) onProfileUpdate();
        toast.success("Invoice settings saved successfully!");
        setTimeout(() => onClose(), 800);
      }
    } catch (e) { toast.error("Failed to save settings"); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-lg animate-in fade-in duration-300">
      <Card className="w-full max-w-[1200px] h-[90vh] overflow-hidden border-none shadow-2xl rounded-3xl bg-white flex flex-col">
        {/* Simple Header */}
        <header className="px-8 py-6 border-b flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Invoice Designer</h2>
            <p className="text-sm font-bold text-slate-500">Choose your template and customize visible fields</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-200">
            <X size={24} />
          </Button>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Settings Column - Easy to scroll */}
          <div className="w-full md:w-[400px] border-r overflow-y-auto p-8 space-y-10 scrollbar-hide">
            
            {/* 1. Template Selection */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">1. Choose Template</h4>
              <div className="grid grid-cols-1 gap-3">
                {TEMPLATES.concat([{id: 'thermal', name: 'Thermal Receipt', color: '#1e293b'}]).map(t => (
                  <div 
                    key={t.id} 
                    onClick={() => setSettings({ 
                      ...settings, 
                      template: t.id,
                      accentColor: t.color || settings.accentColor 
                    })}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all hover:scale-[1.02] ${
                      settings.template === t.id 
                        ? 'border-blue-600 bg-blue-50/50 shadow-lg' 
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex gap-4">
                      {/* Mini Mockup Preview */}
                      <div className="w-16 h-20 bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden flex flex-col p-1.5 shrink-0">
                        {t.id === 'thermal' ? (
                          <div className="flex flex-col gap-1 items-center">
                            <div className="h-1 w-full bg-slate-100 rounded-full" />
                            <div className="h-1 w-3/4 bg-slate-100 rounded-full" />
                            <div className="mt-2 h-0.5 w-full bg-slate-50" />
                            <div className="h-0.5 w-full bg-slate-50" />
                          </div>
                        ) : (
                          <>
                            <div className="h-4 w-full rounded-[2px]" style={{ backgroundColor: t.color || '#1e293b' }} />
                            <div className="mt-2 space-y-1">
                              <div className="h-1 w-full bg-slate-50 rounded-full" />
                              <div className="h-1 w-full bg-slate-50 rounded-full" />
                              <div className="h-1 w-full bg-slate-50 rounded-full" />
                            </div>
                            <div className="mt-auto flex justify-between">
                              <div className="h-2 w-4 bg-slate-100 rounded-full" />
                              <div className="h-2 w-6 rounded-full" style={{ backgroundColor: t.color || '#1e293b' }} />
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex-1 pt-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-black text-slate-900 text-sm tracking-tight">{t.name}</span>
                          {settings.template === t.id && <CheckCircle2 size={16} className="text-blue-600" />}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 leading-relaxed">{t.description || 'Professional receipt layout'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Color Theme */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">2. Brand Color</h4>
              <div className="flex gap-3">
                {COLOR_PRESETS.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => setSettings({ ...settings, accentColor: c.color })}
                    className={`w-10 h-10 rounded-full cursor-pointer border-4 transition-transform hover:scale-110 ${
                      settings.accentColor === c.color ? 'border-white ring-2 ring-blue-600' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c.color }}
                  />
                ))}
              </div>
            </div>

            {/* 3. Column Toggles */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">3. Visible Columns</h4>
              <div className="space-y-3 bg-slate-50 p-6 rounded-2xl">
                {[
                  { id: 'showSNo', label: 'Serial Number' },
                  { id: 'showHsn', label: 'HSN/SAC Code' },
                  { id: 'showBrand', label: 'Brand Name' },
                  { id: 'showSku', label: 'SKU / Barcode' },
                  { id: 'showUnit', label: 'Unit (PCS/KG)' },
                  { id: 'showGstDetail', label: 'Tax Breakdown' },
                ].map(field => (
                  <div key={field.id} className="flex items-center justify-between">
                    <Label className="font-bold text-slate-600 text-sm">{field.label}</Label>
                    <Switch 
                      checked={settings[field.id]} 
                      onCheckedChange={(v) => setSettings({ ...settings, [field.id]: v })} 
                    />
                  </div>
                ))}
                
                {settings.showGstDetail && (
                  <div className="pt-4 mt-4 border-t border-slate-200">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Breakdown Style</Label>
                    <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                      <button 
                        onClick={() => setSettings({ ...settings, gstStyle: 'single' })}
                        className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${settings.gstStyle !== 'split' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}
                      >
                        SINGLE GST
                      </button>
                      <button 
                        onClick={() => setSettings({ ...settings, gstStyle: 'split' })}
                        className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${settings.gstStyle === 'split' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}
                      >
                        CGST / SGST
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Product Attributes */}
            {attributes.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">4. Product Attributes</h4>
                  <div className="flex gap-4">
                    <button onClick={() => setSettings({...settings, visibleAttributes: attributes.map(a => a.name)})} className="text-[10px] font-black text-blue-600 hover:underline">SELECT ALL</button>
                    <button onClick={() => setSettings({...settings, visibleAttributes: []})} className="text-[10px] font-black text-slate-400 hover:underline">CLEAR ALL</button>
                  </div>
                </div>
                <div className="space-y-3 bg-slate-50 p-6 rounded-2xl">
                  {attributes.map(attr => (
                    <div key={attr.id} className="flex items-center justify-between">
                      <Label className="font-bold text-slate-600 text-sm">{attr.name}</Label>
                      <Switch 
                        checked={settings.visibleAttributes?.includes(attr.name)} 
                        onCheckedChange={() => toggleAttribute(attr.name)} 
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Payments & Logo */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">5. More Options</h4>
              <div className="space-y-4 bg-slate-50 p-6 rounded-2xl">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-slate-600 text-sm">Show UPI QR</Label>
                  <Switch 
                    checked={settings.showUpi} 
                    onCheckedChange={(v) => setSettings({ ...settings, showUpi: v })} 
                  />
                </div>
                {settings.showUpi && (
                  <Input 
                    placeholder="Enter UPI ID" 
                    value={settings.upiId || ''} 
                    onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
                    className="h-10 text-sm font-bold"
                  />
                )}
                <div className="flex items-center justify-between pt-2">
                  <Label className="font-bold text-slate-600 text-sm">Show Logo</Label>
                  <Switch checked={settings.showLogo} onCheckedChange={(v) => setSettings({ ...settings, showLogo: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-slate-600 text-sm">Authorized Signature</Label>
                  <Switch checked={settings.showSignature} onCheckedChange={(v) => setSettings({ ...settings, showSignature: v })} />
                </div>

                <div className="pt-4 mt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                  <Label className="font-bold text-slate-600 text-sm">I already have invoice template</Label>
                    <Switch 
                      checked={settings.letterheadMode} 
                      onCheckedChange={(v) => setSettings({ ...settings, letterheadMode: v })} 
                    />
                  </div>
                  {settings.letterheadMode && (
                    <div className="mt-4 space-y-2">
                      <Label className="text-[10px] font-black text-slate-400">Blank top space before products (px)</Label>
                      <Input 
                        type="number"
                        value={parseInt(settings.topMargin)}
                        onChange={(e) => setSettings({ ...settings, topMargin: e.target.value + 'px' })}
                        className="h-10 text-sm font-bold"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Vertical Spacing (Y-Axis)</Label>
                  <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                    {['compact', 'standard', 'relaxed'].map(d => (
                      <button 
                        key={d}
                        onClick={() => setSettings({ ...settings, density: d })}
                        className={`flex-1 py-2 text-[9px] font-black rounded-lg transition-all uppercase ${settings.density === d ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Area - Clean and simple */}
          <div className="flex-1 bg-slate-200/50 p-6 md:p-12 flex flex-col items-center overflow-hidden">
            <div className="w-full flex justify-between items-center mb-6">
              <Badge className="bg-white text-slate-900 border-slate-200 shadow-sm px-4 py-2 rounded-xl gap-2">
                <Monitor size={14} className="text-blue-600" /> LIVE PREVIEW CANVAS
              </Badge>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auto-Scaling for Viewport</p>
            </div>

            <div className="flex-1 w-full overflow-y-auto pr-4 scrollbar-hide flex justify-center items-start pt-4">
              <div className="scale-[0.75] xl:scale-[0.85] origin-top transition-transform duration-500">
                <div 
                  className="bg-white w-[800px] shadow-2xl rounded-sm overflow-hidden flex flex-col min-h-[1100px]"
                  style={{ fontFamily: settings.fontFamily || 'Inter' }}
                >
                  {/* Real-time Mockup Content */}
                  <div className="p-12 pb-0 flex-1 border-[12px] border-slate-50">
                    <div className="flex justify-between items-start mb-12 pb-10 border-b-2 border-slate-100">
                      <div>
                        {settings.showLogo && <div className="w-14 h-14 bg-slate-900 rounded-xl mb-6 shadow-xl flex items-center justify-center text-white font-black text-xl">L</div>}
                        <h3 className="text-2xl font-black tracking-tight" style={{ color: settings.accentColor }}>{profile?.business_name || 'Business Name'}</h3>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Professional Billing Partner</p>
                      </div>
                      <div className="text-right">
                        <h2 className="text-3xl font-black text-slate-200 tracking-[0.2em] leading-none mb-6">INVOICE</h2>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-right">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Inv No:</span>
                          <span className="text-[10px] font-black text-slate-900">#INV-001</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase">Date:</span>
                          <span className="text-[10px] font-black text-slate-900">12/05/2024</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-10 mb-12">
                      <div className="p-6 bg-slate-50 rounded-2xl border-l-4 border-slate-200" style={{ borderLeftColor: settings.accentColor }}>
                        <h5 className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-3">Billed To</h5>
                        <p className="text-sm font-black text-slate-900">Johnathan Customer</p>
                        <p className="text-[11px] font-bold text-slate-500 mt-1">+91 98765 00000</p>
                      </div>
                      <div className="text-right p-4">
                        <h5 className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-3">Payment Info</h5>
                        <p className="text-[11px] font-black text-slate-900">Mode: <b>CASH</b></p>
                        <p className="text-[11px] font-bold text-slate-500 mt-1">GSTIN: {profile?.gstin || '27AAACG...1Z5'}</p>
                      </div>
                    </div>

                    <div className="min-h-[350px]">
                      <table className="w-full text-left border-collapse border border-slate-100">
                        <thead>
                          <tr className="bg-slate-900 text-white">
                            {settings.showSNo && <th className="py-3 px-3 font-black text-[9px] uppercase border border-slate-800 w-10 text-center">#</th>}
                            <th className="py-3 px-3 font-black text-[9px] uppercase border border-slate-800">Item Description</th>
                            {settings.showHsn && <th className="py-3 px-3 text-center font-black text-[9px] uppercase border border-slate-800 w-20">HSN</th>}
                            <th className="py-3 px-3 text-center font-black text-[9px] uppercase border border-slate-800 w-20">Qty</th>
                            <th className="py-3 px-3 text-right font-black text-[9px] uppercase border border-slate-800 w-24">Rate</th>
                            <th className="py-3 px-3 text-right font-black text-[9px] uppercase border border-slate-800 w-28">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[1, 2].map(i => (
                            <tr key={i} className="text-[11px] font-bold border border-slate-100">
                              {settings.showSNo && <td className="py-4 px-3 text-slate-400 text-center border border-slate-100">0{i}</td>}
                              <td className="py-4 px-3 border border-slate-100">
                                <p className="font-black text-slate-900">Industrial Premium Item</p>
                                {settings.showBrand && <p className="text-[8px] text-blue-500 font-black mt-0.5 uppercase">DEWALT PRO</p>}
                                
                                {(settings.visibleAttributes || []).length > 0 && (
                                  <div className="mt-3 grid grid-cols-2 gap-1 p-2 bg-slate-50 rounded-lg">
                                    {(settings.visibleAttributes || []).map(attr => (
                                      <div key={attr} className="text-[8px]">
                                        <span className="text-slate-400 font-black uppercase">{attr}:</span>
                                        <span className="text-slate-900 font-black ml-1">VALUE</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                              {settings.showHsn && <td className="py-4 px-3 text-center text-slate-500 border border-slate-100">8481</td>}
                              <td className="py-4 px-3 text-center text-slate-900 font-black border border-slate-100">1 PCS</td>
                              <td className="py-4 px-3 text-right text-slate-900 border border-slate-100">12,499.00</td>
                              <td className="py-4 px-3 text-right font-black text-slate-900 border border-slate-100">12,499.00</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid grid-cols-2 gap-10 mt-12 py-10 border-t border-slate-100">
                      <div className="text-[10px] space-y-6">
                        {profile.bank_details && (
                          <div>
                            <p className="font-black text-slate-900 mb-1">Payment Information:</p>
                            <p className="text-slate-500 font-bold leading-relaxed whitespace-pre-line">{profile.bank_details}</p>
                          </div>
                        )}
                        {settings.showUpi && (
                          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 w-fit">
                            <div className="w-10 h-10 bg-white rounded-lg shadow-sm border border-slate-100 flex items-center justify-center"><Grid size={16} className="text-slate-200" /></div>
                            <div>
                              <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Digital Payment</p>
                              <p className="text-[9px] font-black text-slate-900 uppercase">SCAN TO PAY</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3 bg-slate-50 p-8 rounded-2xl border border-slate-100">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase"><span>Subtotal</span><span>24,998.00</span></div>
                        {settings.showGstDetail && (
                          settings.gstStyle === 'split' ? (
                            <>
                              <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase">
                                <span>CGST (9%)</span>
                                <span className="text-slate-900">2,249.82</span>
                              </div>
                              <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase">
                                <span>SGST (9%)</span>
                                <span className="text-slate-900">2,249.82</span>
                              </div>
                            </>
                          ) : (
                            <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase">
                              <span>GST (18%)</span>
                              <span className="text-slate-900">4,499.64</span>
                            </div>
                          )
                        )}
                        <div 
                          className="flex justify-between p-5 rounded-xl text-white mt-4"
                          style={{ backgroundColor: settings.accentColor }}
                        >
                          <span className="text-[10px] font-black uppercase opacity-70">Total Payable</span>
                          <span className="text-lg font-black tracking-tight">₹29,497.64</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-10 flex justify-end pb-10">
                      <div className="text-center w-40 pt-10 border-t border-slate-900">
                        <p className="text-[8px] font-black text-slate-900 uppercase">Authorized Signatory</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="px-8 py-4 border-t flex justify-end gap-3 bg-white">
          <Button variant="outline" onClick={onClose} className="rounded-xl font-bold">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="btn-primary rounded-xl px-10 font-bold">
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </footer>
      </Card>
    </div>
  );
}
