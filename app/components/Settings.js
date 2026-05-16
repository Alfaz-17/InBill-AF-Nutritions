'use client';
import { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Key, Check, Eye, EyeOff, Info, 
  ShieldCheck, AlertTriangle, Building2, Save, Trash2, 
  ArrowDownLeft, X, Database, Smartphone, Globe, Lock, Palette, FileText, Monitor, CheckCircle2, Layout, List, MessageCircle, RefreshCw, Download
} from 'lucide-react';
import { useToast } from './ToastProvider';

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
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyStatus, setKeyStatus] = useState({ configured: false, maskedKey: '' });
  const [error, setError] = useState('');
  
  const [profileForm, setProfileForm] = useState({
    business_name: '', business_short: '', store_base_url: 'https://inbill.store', tagline: 'Billing & Inventory',
    address_line1: '', address_line2: '', city: '', state: '', pincode: '',
    phone: '', email: '', gstin: '', logo_path: '',
    invoice_prefix: 'INV', invoice_footer: 'Thank you for your business!',
    currency_symbol: '₹', business_type: 'General',
    bank_details: '',
    master_data: { 
      tax_label: 'GST', 
      tax_rates: [0, 5, 12, 18, 28], 
      units: ['pcs', 'box', 'kg', 'g', 'm', 'hrs', 'sqft'],
      gst_enabled: true,
      delete_pin: ''
    },
    whatsapp_settings: {
      enabled: false,
      access_token: '',
      phone_number_id: '',
      business_account_id: ''
    }
  });

  const [profileSaved, setProfileSaved] = useState(false);
  const [newTaxRate, setNewTaxRate] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [updateInfo, setUpdateInfo] = useState({ checked: false, available: false, version: '', loading: false });

  useEffect(() => {
    checkKeyStatus();
    loadProfile();
  }, []);

  const handleCheckUpdate = async (manual = false) => {
    if (updateInfo.loading) return;
    setUpdateInfo(prev => ({ ...prev, loading: true }));
    try {
      if (window.electronAPI?.system) {
        const res = await window.electronAPI.system.checkUpdate();
        if (res.success) {
          const isNew = res.latestVersion !== res.currentVersion;
          setUpdateInfo({ 
            checked: true, 
            available: isNew, 
            version: res.latestVersion, 
            current: res.currentVersion,
            url: res.updateUrl,
            loading: false 
          });
          if (manual) {
            if (isNew) toast(`New version ${res.latestVersion} available!`, 'info');
            else toast('You are on the latest version', 'success');
          }
        } else {
          if (manual) toast('Could not connect to update server', 'error');
          setUpdateInfo(prev => ({ ...prev, loading: false }));
        }
      }
    } catch (e) {
      setUpdateInfo(prev => ({ ...prev, loading: false }));
    }
  };

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
            gst_enabled: true,
            delete_pin: '',
            ...p.master_data
          };
          if (typeof p.whatsapp_settings === 'string') {
            try { p.whatsapp_settings = JSON.parse(p.whatsapp_settings || '{}'); } catch(e) { p.whatsapp_settings = {}; }
          }
          p.whatsapp_settings = {
            enabled: false,
            access_token: '',
            phone_number_id: '',
            business_account_id: '',
            ...p.whatsapp_settings
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
          <TabsTrigger value="core" className="flex-1 h-12 rounded-xl gap-3 font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all text-xs">
            <Layout size={16} /> Standards
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex-1 h-12 rounded-xl gap-3 font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all text-xs">
            <Smartphone size={16} /> AI Automation
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex-1 h-12 rounded-xl gap-3 font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all text-xs">
            <MessageCircle size={16} /> WhatsApp
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
                  <Input 
                    value={profileForm.business_name || ''} 
                    onChange={(e) => {
                      const name = e.target.value;
                      const slug = name.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-');
                      setProfileForm({...profileForm, business_name: name, business_short: slug});
                    }} 
                    className="form-input" 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Business Type</label>
                  <Select value={profileForm.business_type || 'General'} onValueChange={(v) => setProfileForm({...profileForm, business_type: v})}>
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
                  <Input value={profileForm.address_line1 || ''} onChange={(e) => setProfileForm({...profileForm, address_line1: e.target.value})} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">GSTIN</label>
                  <Input value={profileForm.gstin || ''} onChange={(e) => setProfileForm({...profileForm, gstin: e.target.value.toUpperCase()})} className="form-input font-mono" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <Input value={profileForm.phone || ''} onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <Input value={profileForm.email || ''} onChange={(e) => setProfileForm({...profileForm, email: e.target.value})} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Tagline</label>
                  <Input value={profileForm.tagline || ''} onChange={(e) => setProfileForm({...profileForm, tagline: e.target.value})} className="form-input" />
                </div>
                <div className="form-group lg:col-span-3">
                  <label className="form-label">Company Logo</label>
                  <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    {profileForm.logo_path ? (
                      <div className="relative group">
                        <img src={`local-file://${profileForm.logo_path}`} className="h-20 w-20 object-contain bg-white p-2 rounded-xl border border-slate-200" />
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
                      <p className="text-xs font-bold text-slate-400 mb-4">PNG, JPG, WebP or SVG (Max 5mb)</p>
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



        <TabsContent value="core" className="m-0 outline-none">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="rounded-[2.5rem] border-slate-100 shadow-xl">
              <CardHeader className="p-10">
                <CardTitle className="text-2xl font-black">Regional & Tax</CardTitle>
                <CardDescription className="text-base font-medium">Standardize labels and currency</CardDescription>
              </CardHeader>
              <CardContent className="p-10 pt-0 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="form-group flex flex-col gap-4 p-6 bg-slate-50 rounded-2xl border border-slate-100 col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base font-black text-slate-900">Enable GST Billing</Label>
                        <p className="text-xs font-bold text-slate-500">Turn off if your shop doesn't apply tax on invoices</p>
                      </div>
                      <Switch 
                        checked={profileForm.master_data?.gst_enabled} 
                        onCheckedChange={(v) => setProfileForm({
                          ...profileForm, 
                          master_data: { ...profileForm.master_data, gst_enabled: v }
                        })} 
                      />
                    </div>
                  </div>
                  {profileForm.master_data?.gst_enabled && (
                    <div className="form-group lg:col-span-2">
                      <label className="form-label">Tax Label (e.g. GST, VAT, TAX)</label>
                      <Input value={profileForm.master_data?.tax_label} onChange={(e) => setProfileForm({...profileForm, master_data: { ...profileForm.master_data, tax_label: e.target.value }})} className="form-input" />
                    </div>
                  )}
                  {profileForm.master_data?.gst_enabled && (
                    <div className="form-group lg:col-span-2 p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm">
                      <label className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <Palette size={16} className="text-primary" /> Manage Tax Rates (%)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {profileForm.master_data?.tax_rates?.map((rate, idx) => (
                          <Badge key={idx} variant="secondary" className="pl-3 pr-1 py-1 h-9 rounded-full gap-2 bg-slate-100 text-slate-900 border-none font-bold">
                            {rate}%
                            <button 
                              onClick={async () => {
                                const ok = await confirm({
                                  type: 'danger',
                                  title: 'Remove Tax Rate?',
                                  message: `Are you sure you want to remove ${rate}% from your standards?`,
                                  requiredPin: profileForm.master_data?.delete_pin
                                });
                                if (!ok) return;
                                const newRates = profileForm.master_data.tax_rates.filter((_, i) => i !== idx);
                                setProfileForm({...profileForm, master_data: { ...profileForm.master_data, tax_rates: newRates }});
                              }}
                              className="w-6 h-6 rounded-full bg-white flex items-center justify-center hover:bg-rose-100 hover:text-rose-600 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          type="number" 
                          placeholder="Add new rate (e.g. 15)" 
                          className="h-11 rounded-xl font-bold"
                          value={newTaxRate}
                          onChange={(e) => setNewTaxRate(e.target.value)}
                        />
                        <Button 
                          onClick={() => {
                            if (!newTaxRate || isNaN(newTaxRate)) return;
                            const rate = parseFloat(newTaxRate);
                            if (profileForm.master_data.tax_rates.includes(rate)) return;
                            const newRates = [...profileForm.master_data.tax_rates, rate].sort((a,b) => a-b);
                            setProfileForm({...profileForm, master_data: { ...profileForm.master_data, tax_rates: newRates }});
                            setNewTaxRate('');
                          }}
                          className="btn-primary px-6 rounded-xl"
                        >Add</Button>
                      </div>
                    </div>
                  )}
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

                  <div className="form-group lg:col-span-2 p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm">
                    <label className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <List size={16} className="text-primary" /> Manage Measurement Units
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {profileForm.master_data?.units?.map((unit, idx) => (
                        <Badge key={idx} variant="secondary" className="pl-3 pr-1 py-1 h-9 rounded-full gap-2 bg-slate-100 text-slate-900 border-none font-bold uppercase">
                          {unit}
                          <button 
                            onClick={async () => {
                              const ok = await confirm({
                                type: 'danger',
                                title: 'Remove Unit?',
                                message: `Are you sure you want to remove "${unit}" from your standards?`,
                                requiredPin: profileForm.master_data?.delete_pin
                              });
                              if (!ok) return;
                              const newUnits = profileForm.master_data.units.filter((_, i) => i !== idx);
                              setProfileForm({...profileForm, master_data: { ...profileForm.master_data, units: newUnits }});
                            }}
                            className="w-6 h-6 rounded-full bg-white flex items-center justify-center hover:bg-rose-100 hover:text-rose-600 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Add new unit (e.g. litre)" 
                        className="h-11 rounded-xl font-bold"
                        value={newUnit}
                        onChange={(e) => setNewUnit(e.target.value)}
                      />
                      <Button 
                        onClick={() => {
                          if (!newUnit.trim()) return;
                          const unit = newUnit.trim().toLowerCase();
                          if (profileForm.master_data.units.includes(unit)) return;
                          const newUnits = [...profileForm.master_data.units, unit];
                          setProfileForm({...profileForm, master_data: { ...profileForm.master_data, units: newUnits }});
                          setNewUnit('');
                        }}
                        className="btn-primary px-6 rounded-xl"
                      >Add</Button>
                    </div>
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

            <Card className="rounded-[2.5rem] border-slate-100 shadow-xl">
              <CardHeader className="p-10">
                <CardTitle className="text-2xl font-black flex items-center gap-3">
                  <Lock size={22} className="text-primary" /> Operation Security
                </CardTitle>
                <CardDescription className="text-base font-medium">Protect sensitive actions with a PIN</CardDescription>
              </CardHeader>
              <CardContent className="p-10 pt-0 space-y-6">
                <div className="form-group">
                  <label className="form-label">System Deletion PIN</label>
                  <div className="relative">
                    <Input 
                      type={showKey ? "text" : "password"} 
                      value={profileForm.master_data?.delete_pin} 
                      onChange={(e) => setProfileForm({
                        ...profileForm, 
                        master_data: { ...profileForm.master_data, delete_pin: e.target.value }
                      })} 
                      placeholder="e.g. 1234 (Leave blank to disable)"
                      className="form-input h-14 pr-12 font-black text-lg tracking-[0.5em]"
                    />
                    <button onClick={() => setShowKey(!showKey)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors">
                      {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 font-bold mt-3 leading-relaxed">
                    If set, the system will ask for this PIN whenever someone tries to delete a product, sale, or party ledger.
                  </p>
                </div>
                <Button onClick={handleProfileSave} className="btn-primary w-full h-12 rounded-xl font-bold">Save Security PIN</Button>
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

            {/* System Update Status */}
            <Card className="rounded-[2.5rem] border-slate-100 shadow-xl overflow-hidden md:col-span-2">
              <CardHeader className="p-10 bg-slate-900 text-white">
                 <div className="flex items-center justify-between">
                   <div>
                     <CardTitle className="text-2xl font-black">System Status</CardTitle>
                     <CardDescription className="text-slate-400 font-bold">App version and update management</CardDescription>
                   </div>
                   <Badge variant="outline" className="border-slate-700 text-slate-400 font-black px-4 py-1.5 rounded-xl uppercase tracking-widest text-[10px]">
                      Internal Build
                   </Badge>
                 </div>
              </CardHeader>
              <CardContent className="p-10 space-y-8">
                <div className="flex items-center justify-between p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                      updateInfo.available ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-white text-slate-400 shadow-slate-200'
                    }`}>
                      {updateInfo.available ? <Download size={28} /> : <ShieldCheck size={28} />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Version</p>
                      <h4 className="text-2xl font-black text-slate-900">v{updateInfo.current || '2.0.0'}</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {updateInfo.available ? (
                      <Button 
                        onClick={() => window.open(updateInfo.url, '_blank')}
                        className="btn-primary h-14 px-8 rounded-2xl gap-3 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                      >
                        <Download size={20} /> Get v{updateInfo.version} Now
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        onClick={() => handleCheckUpdate(true)} 
                        disabled={updateInfo.loading}
                        className="h-14 px-8 rounded-2xl font-black border-slate-200 gap-3"
                      >
                        <RefreshCw size={20} className={updateInfo.loading ? 'animate-spin' : ''} /> 
                        {updateInfo.loading ? 'Checking...' : 'Check for Updates'}
                      </Button>
                    )}
                  </div>
                </div>

                {updateInfo.available && (
                  <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-4">
                    <Info className="text-emerald-600 mt-1" size={20} />
                    <div>
                      <p className="text-emerald-900 font-black text-sm uppercase tracking-tight">Security & Performance Update</p>
                      <p className="text-emerald-700/80 font-bold text-sm mt-1">Version {updateInfo.version} contains critical optimizations for faster billing and security patches. We recommend updating immediately.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* WhatsApp Integration */}
        <TabsContent value="whatsapp" className="m-0 outline-none">
          <Card className="rounded-[2.5rem] border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
            <CardHeader className="p-10 bg-slate-900 text-white">
              <CardTitle className="text-2xl font-black flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center">
                  <MessageCircle size={24} />
                </div>
                WhatsApp Business API
              </CardTitle>
              <CardDescription className="text-slate-400 font-bold mt-2">
                Configure Meta Graph API to send automated invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="p-10 space-y-8">
              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] flex gap-4">
                <Info size={24} className="text-emerald-600 shrink-0" />
                <div className="text-sm text-emerald-800 font-medium">
                  To use this feature, you must have a <b>Verified Meta Business Account</b>. 
                  Invoices will be sent from your official WhatsApp Business number.
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="space-y-1">
                    <Label className="text-lg font-black text-slate-900">Enable Automated Sending</Label>
                    <p className="text-sm text-slate-500 font-medium text-balance">Automatically send invoice PDF to customer's WhatsApp after generation</p>
                  </div>
                  <Switch 
                    checked={profileForm.whatsapp_settings?.enabled} 
                    onCheckedChange={(v) => setProfileForm({
                      ...profileForm, 
                      whatsapp_settings: { ...profileForm.whatsapp_settings, enabled: v }
                    })} 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="form-group md:col-span-2">
                    <label className="form-label">Permanent Access Token</label>
                    <div className="relative">
                      <Input 
                        type={showKey ? "text" : "password"} 
                        value={profileForm.whatsapp_settings?.access_token} 
                        onChange={(e) => setProfileForm({...profileForm, whatsapp_settings: { ...profileForm.whatsapp_settings, access_token: e.target.value }})} 
                        className="form-input pr-12 font-mono" 
                        placeholder="EAAB..."
                      />
                      <button onClick={() => setShowKey(!showKey)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary">
                        {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number ID</label>
                    <Input 
                      value={profileForm.whatsapp_settings?.phone_number_id} 
                      onChange={(e) => setProfileForm({...profileForm, whatsapp_settings: { ...profileForm.whatsapp_settings, phone_number_id: e.target.value }})} 
                      className="form-input" 
                      placeholder="1234567890..."
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Business Account ID</label>
                    <Input 
                      value={profileForm.whatsapp_settings?.business_account_id} 
                      onChange={(e) => setProfileForm({...profileForm, whatsapp_settings: { ...profileForm.whatsapp_settings, business_account_id: e.target.value }})} 
                      className="form-input" 
                      placeholder="9876543210..."
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-10 pt-0">
              <Button onClick={handleProfileSave} className="btn-primary w-full h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700">Save WhatsApp Configuration</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
