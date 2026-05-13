'use client';
import { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Key, Check, Eye, EyeOff, Info, 
  ShieldCheck, AlertTriangle, Building2, Save, Trash2, 
  ArrowDownLeft, X, Database, Smartphone, Globe, Lock, Palette, FileText, Monitor, CheckCircle2, Layout, List
} from 'lucide-react';
import { useToast } from './ToastProvider';
import InvoiceSettings from './InvoiceSettings';

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SettingsPage({ profile, onProfileUpdate }) {
  const { toast, confirm } = useToast();
  const [showDesigner, setShowDesigner] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyStatus, setKeyStatus] = useState({ configured: false, maskedKey: '' });
  const [error, setError] = useState('');
  
  const [profileForm, setProfileForm] = useState({
    business_name: '', business_short: '', tagline: 'Billing & Inventory',
    address_line1: '', address_line2: '', city: '', state: '', pincode: '',
    phone: '', email: '', gstin: '', logo_path: '',
    invoice_prefix: 'INV', invoice_footer: 'Thank you for your business!',
    currency_symbol: '₹', business_type: 'General',
    bank_details: '',
    master_data: { 
      tax_label: 'GST', 
      tax_rates: [0, 5, 12, 18, 28], 
      units: ['pcs', 'box', 'kg', 'g', 'm', 'hrs', 'sqft'] 
    }
  });

  const [profileSaved, setProfileSaved] = useState(false);
  const [newTaxRate, setNewTaxRate] = useState('');
  const [newUnit, setNewUnit] = useState('');

  useEffect(() => {
    checkKeyStatus();
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      if (window.electronAPI?.business) {
        const p = await window.electronAPI.business.getProfile();
        if (p) {
          if (typeof p.master_data === 'string') {
            try { p.master_data = JSON.parse(p.master_data || '{}'); } catch(e) { p.master_data = {}; }
          }
          p.master_data = {
            tax_label: 'GST',
            tax_rates: [0, 5, 12, 18, 28],
            units: ['pcs', 'box', 'kg', 'g', 'm', 'hrs', 'sqft'],
            ...p.master_data
          };
          setProfileForm(p);
        }
      }
    } catch (e) { console.error(e); }
  };

  const checkKeyStatus = async () => {
    try {
      if (window.electronAPI?.settings) {
        const status = await window.electronAPI.settings.getGeminiKey();
        setKeyStatus(status);
      }
    } catch (e) { /* silent */ }
  };

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    setError('');
    try {
      if (window.electronAPI?.settings) {
        const result = await window.electronAPI.settings.setGeminiKey(apiKey.trim());
        if (result.success) {
          setSaved(true);
          setApiKey('');
          await checkKeyStatus();
          toast('API Key saved successfully', 'success');
          setTimeout(() => setSaved(false), 3000);
        } else {
          setError(result.error || 'Failed to save key');
        }
      }
    } catch (e) {
      setError('Error saving key: ' + e.message);
    }
    setSaving(false);
  };

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      const payload = { 
        ...profileForm, 
        master_data: JSON.stringify(profileForm.master_data) 
      };
      await window.electronAPI.business.updateProfile(payload);
      setProfileSaved(true);
      if (onProfileUpdate) onProfileUpdate();
      toast('Settings updated successfully', 'success');
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (e) { toast('Failed to save: ' + e.message, 'error'); }
    setSaving(false);
  };

  const handleReset = async () => {
    const ok = await confirm({
      type: 'danger',
      title: 'Reset All Application Data?',
      message: 'This will permanently DELETE all products, sales, expenses, and parties. This action cannot be undone.',
      confirmText: 'Yes, Delete Everything',
    });
    if (!ok) return;
    setSaving(true);
    try {
      const res = await window.electronAPI.settings.resetData();
      if (res.success) {
        toast('Application data has been reset', 'success');
        setTimeout(() => location.reload(), 1000);
      }
    } catch (e) { toast('Reset failed: ' + e.message, 'error'); }
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-8 md:p-2 lg:p-4 animate-in">
      <header className="page-header">
        <div>
          <h2>Settings</h2>
          <p>Configure your application standards and preferences</p>
        </div>
      </header>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full h-16 p-2 bg-slate-100 rounded-2xl mb-12 border border-slate-200/50 shadow-inner">
          <TabsTrigger value="profile" className="flex-1 h-12 rounded-xl gap-3 font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all text-xs">
            <Building2 size={16} /> Profile
          </TabsTrigger>
          <TabsTrigger value="invoice" className="flex-1 h-12 rounded-xl gap-3 font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all text-xs">
            <Palette size={16} /> Invoice Architect
          </TabsTrigger>
          <TabsTrigger value="core" className="flex-1 h-12 rounded-xl gap-3 font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all text-xs">
            <Layout size={16} /> Standards
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex-1 h-12 rounded-xl gap-3 font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all text-xs">
            <Smartphone size={16} /> AI Automation
          </TabsTrigger>
          <TabsTrigger value="data" className="flex-1 h-12 rounded-xl gap-3 font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all text-xs">
            <Database size={16} /> Data & Security
          </TabsTrigger>
        </TabsList>

        {/* Business Profile */}
        <TabsContent value="profile" className="m-0 outline-none">
          <Card className="rounded-[2.5rem] border-slate-100 shadow-xl shadow-slate-200/40">
            <CardHeader className="p-10 pb-6">
              <CardTitle className="text-2xl font-black">Business Identity</CardTitle>
              <CardDescription className="text-base font-medium">Your identity on invoices and branding</CardDescription>
            </CardHeader>
            <CardContent className="p-10 pt-0 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="form-group">
                  <label className="form-label">Business Name</label>
                  <Input value={profileForm.business_name} onChange={(e) => setProfileForm({...profileForm, business_name: e.target.value})} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Short Name</label>
                  <Input value={profileForm.business_short} onChange={(e) => setProfileForm({...profileForm, business_short: e.target.value})} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Business Type</label>
                  <Select value={profileForm.business_type} onValueChange={(v) => setProfileForm({...profileForm, business_type: v})}>
                    <SelectTrigger className="form-input">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {['General', 'Retail', 'Wholesale', 'Industrial', 'Services'].map(t => (
                        <SelectItem key={t} value={t} className="font-bold">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="form-group lg:col-span-2">
                  <label className="form-label">Address</label>
                  <Input value={profileForm.address_line1} onChange={(e) => setProfileForm({...profileForm, address_line1: e.target.value})} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">GSTIN</label>
                  <Input value={profileForm.gstin} onChange={(e) => setProfileForm({...profileForm, gstin: e.target.value.toUpperCase()})} className="form-input font-mono" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <Input value={profileForm.phone} onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <Input value={profileForm.email} onChange={(e) => setProfileForm({...profileForm, email: e.target.value})} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Tagline</label>
                  <Input value={profileForm.tagline} onChange={(e) => setProfileForm({...profileForm, tagline: e.target.value})} className="form-input" />
                </div>
                <div className="form-group lg:col-span-3">
                  <label className="form-label">Company Logo</label>
                  <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    {profileForm.logo_path ? (
                      <div className="relative group">
                        <img src={`file://${profileForm.logo_path}`} className="h-20 w-20 object-contain bg-white p-2 rounded-xl border border-slate-200" />
                        <button 
                          onClick={() => setProfileForm({...profileForm, logo_path: ''})}
                          className="absolute -top-2 -right-2 bg-rose-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="h-20 w-20 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-300">
                        <Monitor size={32} />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-900 mb-1">Upload Brand Logo</p>
                      <p className="text-xs font-bold text-slate-400 mb-4">PNG, JPG or SVG (Max 500kb)</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="font-black rounded-lg gap-2"
                        onClick={async () => {
                          if (window.electronAPI?.business) {
                            const path = await window.electronAPI.business.pickLogo();
                            if (path) setProfileForm({...profileForm, logo_path: path});
                          }
                        }}
                      >
                        Choose File...
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-10 bg-slate-50/50 border-t border-slate-100 flex justify-end">
              <Button onClick={handleProfileSave} disabled={saving} size="lg" className="btn-primary h-14 px-10 rounded-2xl gap-3">
                {profileSaved ? <><Check size={20} /> Saved</> : <><Save size={20} /> Update Profile</>}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Invoice Architect - The NEW Big Feature */}
        <TabsContent value="invoice" className="m-0 outline-none">
          <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden">
            <div className="grid md:grid-cols-2">
              <div className="p-12 space-y-8 bg-white">
                <div>
                  <Badge className="bg-blue-600/10 text-blue-600 border-none font-black text-[10px] tracking-widest px-4 py-1.5 mb-4">PREMIUM TOOL</Badge>
                  <h3 className="text-4xl font-black text-slate-900 tracking-tight">Invoice Architect</h3>
                  <p className="text-slate-500 font-bold text-lg mt-4 leading-relaxed">Design professional A4 and Thermal invoices with our high-fidelity visual workspace.</p>
                </div>

                <div className="space-y-6 pt-4">
                  <div className="flex items-center gap-5 text-slate-700">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm"><Monitor size={24} /></div>
                    <div>
                      <p className="font-black text-sm">Live Visual Canvas</p>
                      <p className="text-xs font-bold text-slate-400 mt-0.5">Real-time preview of your designs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5 text-slate-700">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm"><Palette size={24} /></div>
                    <div>
                      <p className="font-black text-sm">Brand Customization</p>
                      <p className="text-xs font-bold text-slate-400 mt-0.5">Colors, Typography, and Logos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5 text-slate-700">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm"><List size={24} /></div>
                    <div>
                      <p className="font-black text-sm">Field Manager</p>
                      <p className="text-xs font-bold text-slate-400 mt-0.5">Toggle HSN, SKU, and Custom Attributes</p>
                    </div>
                  </div>
                </div>

                <Button onClick={() => setShowDesigner(true)} className="w-full h-20 rounded-[2.5rem] text-xl font-black gap-4 btn-primary shadow-2xl shadow-blue-600/30 hover:scale-[1.02] transition-transform">
                  Open Layout Manager <Monitor size={28} />
                </Button>
              </div>
              <div className="bg-slate-50 p-12 flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_2px,transparent_2px)] [background-size:30px_30px] opacity-40" />
                <div className="relative w-full max-w-[320px] aspect-[1/1.4] bg-white rounded-2xl shadow-2xl border border-slate-200 transform -rotate-2 group-hover:rotate-0 transition-transform duration-700 p-8 space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="h-6 w-16 bg-blue-600 rounded-lg" />
                    <div className="h-4 w-24 bg-slate-100 rounded-full" />
                  </div>
                  <div className="h-2 w-full bg-slate-50 rounded-full" />
                  <div className="h-2 w-3/4 bg-slate-50 rounded-full" />
                  <div className="pt-10 space-y-3">
                    <div className="h-12 w-full bg-slate-50 rounded-xl" />
                    <div className="h-12 w-full bg-slate-50 rounded-xl" />
                    <div className="h-12 w-full bg-slate-50 rounded-xl" />
                  </div>
                  <div className="pt-16 border-t border-slate-50 flex justify-end">
                    <div className="h-10 w-1/2 bg-blue-50 rounded-xl border border-blue-100" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="core" className="m-0 outline-none">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="rounded-[2.5rem] border-slate-100 shadow-xl">
              <CardHeader className="p-10">
                <CardTitle className="text-2xl font-black">Regional & Tax</CardTitle>
                <CardDescription className="text-base font-medium">Standardize labels and currency</CardDescription>
              </CardHeader>
              <CardContent className="p-10 pt-0 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="form-group">
                    <label className="form-label">Tax Label</label>
                    <Input value={profileForm.master_data?.tax_label} onChange={(e) => setProfileForm({...profileForm, master_data: { ...profileForm.master_data, tax_label: e.target.value }})} className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Currency Symbol</label>
                    <Input value={profileForm.currency_symbol} onChange={(e) => setProfileForm({...profileForm, currency_symbol: e.target.value})} className="form-input font-bold" />
                  </div>
                  <div className="form-group lg:col-span-2">
                    <label className="form-label">Bank Details / Payment Info</label>
                    <textarea 
                      value={profileForm.bank_details || ''} 
                      onChange={(e) => setProfileForm({...profileForm, bank_details: e.target.value})} 
                      className="form-input min-h-[100px] py-3"
                      placeholder="Enter Bank Name, A/c No, IFSC, etc."
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-10 pt-0">
                <Button onClick={handleProfileSave} className="btn-primary w-full h-12 rounded-xl font-bold">Update Standards</Button>
              </CardFooter>
            </Card>
           </div>
        </TabsContent>

        {/* AI & Automation */}
        <TabsContent value="ai" className="m-0 outline-none">
          <Card className="rounded-[2.5rem] border-slate-100 shadow-xl">
            <CardHeader className="p-10">
               <CardTitle className="text-2xl font-black">Google Gemini AI</CardTitle>
               <CardDescription className="text-base font-medium">Enable intelligent invoice parsing</CardDescription>
            </CardHeader>
            <CardContent className="p-10 pt-0 space-y-6">
              <div className={`p-6 rounded-2xl border ${keyStatus.configured ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                <p className="font-bold">{keyStatus.configured ? `AI Active: ${keyStatus.maskedKey}` : 'AI Service Disabled'}</p>
              </div>
              <div className="form-group">
                <label className="form-label">Gemini API Key</label>
                <Input 
                  type="password" 
                  value={apiKey} 
                  onChange={(e) => setApiKey(e.target.value)} 
                  placeholder="Paste AIza... key here"
                  className="form-input h-12"
                />
              </div>
            </CardContent>
            <CardFooter className="p-10 pt-0 flex justify-end">
              <Button onClick={handleSaveKey} disabled={saving || !apiKey} className="btn-primary h-12 px-10 rounded-xl font-bold">
                {saving ? 'Validating...' : 'Save AI Key'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Data & Security */}
        <TabsContent value="data" className="m-0 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="rounded-[2.5rem] border-slate-100 shadow-xl">
              <CardHeader className="p-10">
                <CardTitle className="text-2xl font-black">Portability</CardTitle>
                <CardDescription className="text-base font-medium">Export and Restore your data</CardDescription>
              </CardHeader>
              <CardContent className="p-10 pt-0 space-y-4">
                <Button variant="secondary" className="w-full h-14 rounded-xl font-bold" onClick={async () => {
                  const res = await window.electronAPI.storage.exportData();
                  if (res.success) toast('Backup saved!', 'success');
                }}>Export Backup (.json)</Button>
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-rose-100 bg-rose-50/10 shadow-xl shadow-rose-200/10">
              <CardHeader className="p-10">
                <CardTitle className="text-2xl font-black text-rose-900">Danger Zone</CardTitle>
                <CardDescription className="text-base font-medium">Operations that cannot be undone</CardDescription>
              </CardHeader>
              <CardContent className="p-10 pt-0">
                <Button className="btn-danger w-full h-14 rounded-xl font-bold" onClick={handleReset}>Wipe All App Data</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {showDesigner && (
        <InvoiceSettings 
          profile={profile} 
          onClose={() => {
            setShowDesigner(false);
            if (onProfileUpdate) onProfileUpdate();
          }} 
          onProfileUpdate={onProfileUpdate}
        />
      )}
    </div>
  );
}
