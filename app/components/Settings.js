'use client';
import { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Key, Check, Eye, EyeOff, Info, 
  ShieldCheck, AlertTriangle, Building2, Save, Trash2, 
  ArrowDownLeft, X, Database, Globe, Lock, Palette, FileText, Monitor, CheckCircle2, Layout, List, MessageCircle, RefreshCw, Download, Zap, Smartphone, QrCode, Copy, Unlink
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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
  
  const [neonConfig, setNeonConfig] = useState({ url: '', useCloud: false });
  const [syncing, setSyncing] = useState(false);
  const [softwarePassword, setSoftwarePassword] = useState('');
  const [hasSoftwarePassword, setHasSoftwarePassword] = useState(false);

  // Mobile Access State
  const [mobileConfig, setMobileConfig] = useState(null);
  const [mobileLoading, setMobileLoading] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);

  
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
    },
    whatsapp_number: '',
    instagram_id: '',
    pan_number: '',
    terms_and_conditions: ''
  });

  const [profileSaved, setProfileSaved] = useState(false);
  const [newTaxRate, setNewTaxRate] = useState('');
  const [newUnit, setNewUnit] = useState('');


  useEffect(() => {
    checkKeyStatus();
    loadProfile();
    loadNeonConfig();
    checkSoftwarePasswordStatus();
    loadMobileConfig();
  }, []);

  const loadMobileConfig = async () => {
    try {
      if (window.electronAPI?.mobile) {
        const config = await window.electronAPI.mobile.getConfig();
        setMobileConfig(config);
      }
    } catch (e) { console.error('Mobile config load error:', e); }
  };

  const handleGenerateMobileAccess = async () => {
    if (!neonConfig.url || !neonConfig.useCloud) {
      toast('Please enable Neon Cloud Sync first (Data & Security tab)', 'error');
      return;
    }
    setMobileLoading(true);
    try {
      const config = await window.electronAPI.mobile.generate();
      setMobileConfig(config);
      toast('Mobile access code generated!', 'success');
    } catch (e) { toast('Failed to generate: ' + e.message, 'error'); }
    setMobileLoading(false);
  };

  const handleRevokeMobileAccess = async () => {
    const ok = await confirm({
      type: 'danger',
      title: 'Revoke Mobile Access?',
      message: 'This will disconnect any mobile device linked to this account. You can generate a new code anytime.',
      confirmText: 'Yes, Revoke',
    });
    if (!ok) return;
    setMobileLoading(true);
    try {
      await window.electronAPI.mobile.revoke();
      setMobileConfig({ mobile_access_code: '', mobile_secret: '' });
      toast('Mobile access revoked', 'success');
    } catch (e) { toast('Failed: ' + e.message, 'error'); }
    setMobileLoading(false);
  };

  const getMobileQRPayload = () => {
    if (!mobileConfig?.mobile_access_code || !neonConfig.url) return '';
    return JSON.stringify({
      app: 'InBill',
      version: 1,
      code: mobileConfig.mobile_access_code,
      secret: mobileConfig.mobile_secret,
      cloud_url: neonConfig.url,
      business: profileForm.business_name || 'My Business',
    });
  };

  const handleCopyCode = () => {
    if (mobileConfig?.mobile_access_code) {
      navigator.clipboard.writeText(mobileConfig.mobile_access_code);
      setQrCopied(true);
      toast('Access code copied!', 'success');
      setTimeout(() => setQrCopied(false), 2000);
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

  const loadNeonConfig = async () => {
    try {
      if (window.electronAPI?.settings) {
        const config = await window.electronAPI.settings.getNeonConfig();
        setNeonConfig(config);
      }
    } catch (e) { /* silent */ }
  };

  const checkSoftwarePasswordStatus = async () => {
    try {
      if (window.electronAPI?.auth) {
        const { hasPassword } = await window.electronAPI.auth.check();
        setHasSoftwarePassword(hasPassword);
      }
    } catch (e) { console.error(e); }
  };

  const handleSaveSoftwarePassword = async () => {
    setSaving(true);
    try {
      if (window.electronAPI?.auth) {
        const res = await window.electronAPI.auth.setPassword(softwarePassword);
        if (res.success) {
          toast(softwarePassword ? 'Password set successfully' : 'Password removed', 'success');
          setSoftwarePassword('');
          checkSoftwarePasswordStatus();
        } else {
          toast(res.error || 'Failed to save password', 'error');
        }
      }
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };

  const handleSaveNeonConfig = async () => {
    setSaving(true);
    try {
      const res = await window.electronAPI.settings.setNeonConfig(neonConfig);
      if (res.success) {
        toast('Cloud configuration saved', 'success');
      } else {
        toast(res.error || 'Failed to save', 'error');
      }
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };

  const handleSyncToCloud = async () => {
    if (!neonConfig.url) {
      toast('Please enter a Neon Connection URL first', 'error');
      return;
    }
    setSyncing(true);
    try {
      const res = await window.electronAPI.settings.syncToCloud();
      if (res.success) {
        toast('Local data synced to Neon Cloud!', 'success');
      } else {
        toast(res.error || 'Sync failed', 'error');
      }
    } catch (e) { toast(e.message, 'error'); }
    setSyncing(false);
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
            <Zap size={16} /> AI Automation
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex-1 h-12 rounded-xl gap-3 font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all text-xs">
            <MessageCircle size={16} /> WhatsApp
          </TabsTrigger>
          <TabsTrigger value="data" className="flex-1 h-12 rounded-xl gap-3 font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all text-xs">
            <Database size={16} /> Data & Security
          </TabsTrigger>
          <TabsTrigger value="mobile" className="flex-1 h-12 rounded-xl gap-3 font-black data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-lg transition-all text-xs">
            <Smartphone size={16} /> Mobile
          </TabsTrigger>
          <TabsTrigger value="safety" className="flex-1 h-12 rounded-xl gap-3 font-black data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-lg transition-all text-xs">
            <AlertTriangle size={16} /> Safety Guide
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
                      setProfileForm({...profileForm, business_name: name});
                    }} 
                    className="form-input" 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Short Code (e.g., IB)</label>
                  <Input 
                    value={profileForm.business_short || ''} 
                    maxLength={3}
                    onChange={(e) => setProfileForm({...profileForm, business_short: e.target.value.toUpperCase()})} 
                    className="form-input font-black uppercase" 
                    placeholder="E.g. IB"
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
                  <label className="form-label">PAN Number</label>
                  <Input value={profileForm.pan_number || ''} onChange={(e) => setProfileForm({...profileForm, pan_number: e.target.value.toUpperCase()})} className="form-input font-mono" placeholder="ABCDE1234F" />
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
                <div className="form-group">
                  <label className="form-label">WhatsApp Number</label>
                  <Input value={profileForm.whatsapp_number || ''} onChange={(e) => setProfileForm({...profileForm, whatsapp_number: e.target.value})} className="form-input" placeholder="e.g. 919876543210" />
                </div>
                <div className="form-group">
                  <label className="form-label">Instagram ID</label>
                  <Input value={profileForm.instagram_id || ''} onChange={(e) => setProfileForm({...profileForm, instagram_id: e.target.value})} className="form-input" placeholder="e.g. your_handle" />
                </div>
                <div className="form-group lg:col-span-3">
                  <label className="form-label">Company Logo</label>
                  <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    {profileForm.logo_path ? (
                      <div className="relative group">
                        <img src={`local-file://asset/?path=${encodeURIComponent(profileForm.logo_path)}&t=${Date.now()}`} className="h-20 w-20 object-contain bg-white p-2 rounded-xl border border-slate-200" />
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
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="font-black rounded-lg gap-2 h-10 px-4 border-slate-200 hover:border-primary transition-colors"
                          onClick={async () => {
                            if (window.electronAPI?.business) {
                              try {
                                const path = await window.electronAPI.business.pickLogo();
                                if (path) {
                                  const newProfile = { ...profileForm, logo_path: path };
                                  setProfileForm(newProfile);
                                  // Immediate save for logo for better UX
                                  const payload = { 
                                    ...newProfile, 
                                    master_data: JSON.stringify(newProfile.master_data) 
                                  };
                                  await window.electronAPI.business.updateProfile(payload);
                                  if (onProfileUpdate) onProfileUpdate();
                                  toast('Logo updated and saved!', 'success');
                                }
                              } catch (e) {
                                toast('Upload failed', 'error');
                              }
                            }
                          }}
                        >
                          <Monitor size={16} /> {profileForm.logo_path ? 'Change Logo' : 'Select File'}
                        </Button>
                        {profileForm.logo_path && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-rose-600 font-black hover:bg-rose-50 rounded-lg h-10"
                            onClick={async () => {
                              const newProfile = { ...profileForm, logo_path: '' };
                              setProfileForm(newProfile);
                              const payload = { ...newProfile, master_data: JSON.stringify(newProfile.master_data) };
                              await window.electronAPI.business.updateProfile(payload);
                              if (onProfileUpdate) onProfileUpdate();
                              toast('Logo removed');
                            }}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
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
                  <div className="form-group lg:col-span-2">
                    <label className="form-label">Terms and Conditions</label>
                    <textarea 
                      value={profileForm.terms_and_conditions || ''} 
                      onChange={(e) => setProfileForm({...profileForm, terms_and_conditions: e.target.value})} 
                      className="form-input min-h-[100px] py-3 text-xs"
                      placeholder="Enter your business terms, return policy, etc."
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
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="secondary" className="h-14 rounded-xl font-bold" onClick={async () => {
                    const res = await window.electronAPI.storage.exportData();
                    if (res.success) toast('Backup saved!', 'success');
                    else if (res.error) toast('Export failed: ' + res.error, 'error');
                  }}>Export Backup (.json)</Button>

                  <Button variant="outline" className="h-14 rounded-xl font-bold border-slate-200" onClick={async () => {
                    const ok = await confirm({
                      type: 'danger',
                      title: 'Overwrite All Data?',
                      message: 'Importing a backup will REPLACE all current data. This action cannot be undone.',
                      confirmText: 'Yes, Import & Replace',
                    });
                    if (!ok) return;
                    
                    const res = await window.electronAPI.storage.importData();
                    if (res.success) {
                      toast('Backup restored successfully!', 'success');
                      setTimeout(() => location.reload(), 1500);
                    } else if (res.error) {
                      toast('Import failed: ' + res.error, 'error');
                    }
                  }}>Import Backup (.json)</Button>

                  <Button variant="ghost" className="h-14 rounded-xl font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 col-span-2 border border-dashed border-rose-100" onClick={async () => {
                    const ok = await confirm({
                      type: 'danger',
                      title: 'HARD RESET SYSTEM?',
                      message: 'This will PERMANENTLY DELETE all products, invoices, and ledgers. The app will restart as a fresh installation.',
                      confirmText: 'YES, WIPE EVERYTHING',
                      requiredPin: profileForm.master_data?.delete_pin
                    });
                    if (!ok) return;
                    
                    const res = await window.electronAPI.storage.resetData();
                    if (res.success) {
                      toast('System wiped! Restarting...', 'success');
                      setTimeout(() => location.reload(), 1500);
                    } else {
                      toast('Reset failed: ' + res.error, 'error');
                    }
                  }}>🔥 Hard Reset System (Wipe All)</Button>
                </div>
                <div className="pt-6 mt-6 border-t border-slate-100 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-black text-slate-900">Neon Cloud Sync</h4>
                      <p className="text-xs font-bold text-slate-500">Enable cloud-based setup and backups</p>
                    </div>
                    <Switch 
                      checked={neonConfig.useCloud} 
                      onCheckedChange={(v) => setNeonConfig({ ...neonConfig, useCloud: v })} 
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Neon Connection URL</label>
                      <Input 
                        type="password"
                        value={neonConfig.url} 
                        onChange={(e) => setNeonConfig({ ...neonConfig, url: e.target.value })} 
                        placeholder="postgresql://user:pass@host/db"
                        className="form-input h-12"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveNeonConfig} disabled={saving} className="flex-1 h-12 rounded-xl font-bold">
                        Save Config
                      </Button>
                      <Button onClick={handleSyncToCloud} disabled={syncing} className="flex-1 h-12 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                        {syncing ? <RefreshCw className="animate-spin" size={16} /> : <Download size={16} />}
                        Sync to Cloud
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold bg-indigo-50 p-4 rounded-2xl border border-indigo-100 leading-relaxed">
                    <b>Why Neon Cloud?</b> Enabling Cloud Sync allows you to access your business data from multiple devices simultaneously and provides an automatic off-site backup. 
                    <br/><br/>
                    <b>Setup:</b> Copy your connection string from the Neon Console (PostgreSQL format). 
                    The app will automatically mirror your local products, sales, and ledgers to the cloud.
                  </p>
                </div>
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
                
                <div className="pt-8 mt-8 border-t border-slate-100 space-y-6">
                  <div>
                    <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <ShieldCheck size={20} className="text-emerald-500" /> Software Open Password
                    </h4>
                    <p className="text-xs font-bold text-slate-500">Ask for a password every time the application is opened</p>
                  </div>

                  <div className={`p-4 rounded-2xl border ${hasSoftwarePassword ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
                    <p className="text-xs font-bold text-slate-700">
                      Status: {hasSoftwarePassword ? '✅ Security Enabled' : '❌ No startup password set'}
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">{hasSoftwarePassword ? 'Change or Remove Password' : 'Set Startup Password'}</label>
                    <Input 
                      type="password"
                      value={softwarePassword} 
                      onChange={(e) => setSoftwarePassword(e.target.value)} 
                      placeholder={hasSoftwarePassword ? "Enter new password (leave blank to remove)" : "Enter startup password"}
                      className="form-input h-12"
                    />
                  </div>
                  <Button 
                    onClick={handleSaveSoftwarePassword} 
                    disabled={saving} 
                    className={`w-full h-12 rounded-xl font-bold ${hasSoftwarePassword && !softwarePassword ? 'bg-rose-600 hover:bg-rose-700' : 'btn-primary'}`}
                  >
                    {saving ? 'Processing...' : (hasSoftwarePassword ? (softwarePassword ? 'Update Password' : 'Remove Security') : 'Enable Startup Security')}
                  </Button>
                </div>
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

        {/* Mobile Access */}
        <TabsContent value="mobile" className="m-0 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* QR Code Card */}
            <Card className="rounded-[2.5rem] border-slate-100 shadow-xl shadow-indigo-200/20 overflow-hidden">
              <CardHeader className="p-10 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white">
                <CardTitle className="text-2xl font-black flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                    <QrCode size={24} />
                  </div>
                  Mobile Access
                </CardTitle>
                <CardDescription className="text-indigo-100 font-bold mt-2">
                  Scan QR code from your phone to connect
                </CardDescription>
              </CardHeader>
              <CardContent className="p-10 flex flex-col items-center">
                {mobileConfig?.mobile_access_code ? (
                  <div className="space-y-8 w-full flex flex-col items-center">
                    {/* QR Code */}
                    <div className="relative p-6 bg-white rounded-[2rem] shadow-xl shadow-indigo-100 border-2 border-indigo-50">
                      <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg">ACTIVE</div>
                      <QRCodeSVG 
                        value={getMobileQRPayload()}
                        size={220}
                        level="H"
                        includeMargin={true}
                        bgColor="#ffffff"
                        fgColor="#1e1b4b"
                        imageSettings={{
                          src: '',
                          height: 0,
                          width: 0,
                          excavate: false,
                        }}
                      />
                    </div>

                    {/* Access Code Display */}
                    <div className="w-full max-w-xs">
                      <p className="text-xs font-bold text-slate-400 text-center mb-2">ACCESS CODE</p>
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                        <code className="flex-1 text-center text-2xl font-black tracking-[0.4em] text-indigo-700">
                          {mobileConfig.mobile_access_code}
                        </code>
                        <button
                          onClick={handleCopyCode}
                          className="p-2 rounded-xl hover:bg-white transition-colors text-slate-400 hover:text-indigo-600"
                          title="Copy code"
                        >
                          {qrCopied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Revoke Button */}
                    <Button
                      variant="outline"
                      onClick={handleRevokeMobileAccess}
                      disabled={mobileLoading}
                      className="w-full max-w-xs h-12 rounded-xl font-bold border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 gap-2"
                    >
                      <Unlink size={16} />
                      {mobileLoading ? 'Revoking...' : 'Revoke Mobile Access'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-8 w-full flex flex-col items-center py-6">
                    {/* Placeholder */}
                    <div className="w-[220px] h-[220px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-4">
                      <Smartphone size={48} className="text-slate-300" />
                      <p className="text-xs font-bold text-slate-400 text-center px-6">Generate a code to connect your mobile device</p>
                    </div>

                    <Button
                      onClick={handleGenerateMobileAccess}
                      disabled={mobileLoading}
                      className="w-full max-w-xs h-14 rounded-2xl font-black text-base gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-200"
                    >
                      <QrCode size={20} />
                      {mobileLoading ? 'Generating...' : 'Generate Mobile Access'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="rounded-[2.5rem] border-slate-100 shadow-xl">
              <CardHeader className="p-10">
                <CardTitle className="text-2xl font-black flex items-center gap-3">
                  <Smartphone size={22} className="text-indigo-600" /> How It Works
                </CardTitle>
                <CardDescription className="text-base font-medium">
                  Connect your phone in 3 steps
                </CardDescription>
              </CardHeader>
              <CardContent className="p-10 pt-0 space-y-6">
                <div className="space-y-4">
                  {[
                    { step: '1', title: 'Enable Cloud Sync', desc: 'Go to Data & Security tab and configure your Neon Cloud URL. This is required for mobile access.' },
                    { step: '2', title: 'Generate QR Code', desc: 'Click "Generate Mobile Access" to create a unique, encrypted pairing code for your device.' },
                    { step: '3', title: 'Scan from Phone', desc: 'Open the InBill Mobile app on your phone and scan the QR code. Your data will sync instantly via Cloud.' },
                  ].map((item) => (
                    <div key={item.step} className="flex gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-black text-sm">
                        {item.step}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-sm mb-1">{item.title}</h4>
                        <p className="text-xs text-slate-500 font-bold leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-6 bg-amber-50 border border-amber-100 rounded-[2rem]">
                  <div className="flex gap-3">
                    <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-black text-amber-900 text-sm mb-2">Security Notice</h4>
                      <ul className="text-xs text-amber-800 font-bold leading-relaxed space-y-2">
                        <li>• The QR code contains your encrypted cloud credentials</li>
                        <li>• Never share the QR screenshot with anyone</li>
                        <li>• If a phone is lost, click <b>"Revoke"</b> immediately</li>
                        <li>• You can regenerate a new code anytime</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-[2rem]">
                  <div className="flex gap-3">
                    <Info size={20} className="text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-black text-indigo-900 text-sm mb-2">How Sync Works</h4>
                      <p className="text-xs text-indigo-800/80 font-bold leading-relaxed">
                        Your phone does <b>NOT</b> connect directly to this computer. Both devices independently sync to your <b>Neon Cloud</b> database. 
                        This means your phone works even when this PC is turned off.
                      </p>
                    </div>
                  </div>
                </div>

                {!neonConfig.useCloud && (
                  <div className="p-6 bg-rose-50 border border-rose-100 rounded-[2rem]">
                    <div className="flex gap-3">
                      <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-black text-rose-900 text-sm mb-1">Cloud Sync Required</h4>
                        <p className="text-xs text-rose-700 font-bold leading-relaxed">
                          Mobile Access requires Neon Cloud Sync to be enabled. Go to the <b>"Data & Security"</b> tab to set it up first.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Safety & Logic Guide */}
        <TabsContent value="safety" className="m-0 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="rounded-[2.5rem] border-rose-100 shadow-xl shadow-rose-200/20 bg-white overflow-hidden">
              <CardHeader className="p-10 bg-rose-50 border-b border-rose-100">
                <CardTitle className="text-2xl font-black text-rose-900 flex items-center gap-4">
                  <AlertTriangle className="text-rose-600" size={28} /> Product & Data Integrity
                </CardTitle>
                <CardDescription className="text-rose-800/70 font-bold mt-2">
                  Critical warnings about changing your master records
                </CardDescription>
              </CardHeader>
              <CardContent className="p-10 space-y-8">
                <div className="space-y-6">
                  <div className="flex gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                      <Zap size={18} className="text-amber-500" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm mb-1">Changing Product Prices</h4>
                      <p className="text-xs text-slate-500 font-bold leading-relaxed">
                        If you update a product's price, it will <b>only apply to new bills</b>. 
                        All old invoices will keep their original price for financial audit stability.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                      <Trash2 size={18} className="text-rose-500" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm mb-1">The "Soft Delete" Rule</h4>
                      <p className="text-xs text-slate-500 font-bold leading-relaxed">
                        Deleting a Customer or Supplier doesn't wipe them from history. They are <b>Archived</b> to protect old invoices. 
                        They disappear from active lists but their name remains on old records.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                      <FileText size={18} className="text-blue-500" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm mb-1">Permanent Records</h4>
                      <p className="text-xs text-slate-500 font-bold leading-relaxed">
                        Sales and Returns are <b>Permanent</b>. There is no "Undo" button in the Reports section to prevent accidental financial leakage. 
                        Correction must be done via a reverse transaction.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-slate-100 shadow-xl bg-white overflow-hidden">
              <CardHeader className="p-10 bg-slate-900 text-white">
                <CardTitle className="text-2xl font-black flex items-center gap-4">
                  <ShieldCheck className="text-emerald-400" size={28} /> Smart Financial Logic
                </CardTitle>
                <CardDescription className="text-slate-400 font-bold mt-2">
                  How InBill manages your money accurately
                </CardDescription>
              </CardHeader>
              <CardContent className="p-10 space-y-8">
                <div className="space-y-6">
                  <div className="p-6 rounded-[2rem] bg-emerald-50 border border-emerald-100">
                    <h4 className="font-black text-emerald-900 text-sm mb-3 flex items-center gap-2">
                      <ArrowDownLeft size={16} /> Debt-First Reconciliation
                    </h4>
                    <p className="text-xs text-emerald-800/80 font-bold leading-relaxed">
                      When a customer returns an item, the system automatically checks if they owe you money (Credit). 
                      <br/><br/>
                      It will <b>Clear their Debt first</b> before allowing a Cash Refund. This prevents scenarios where you pay a customer cash while they still owe you for a bill.
                    </p>
                  </div>

                  <div className="p-6 rounded-[2rem] bg-indigo-50 border border-indigo-100">
                    <h4 className="font-black text-indigo-900 text-sm mb-3 flex items-center gap-2">
                      <Database size={16} /> Stable Reporting
                    </h4>
                    <p className="text-xs text-indigo-800/80 font-bold leading-relaxed">
                      Your Dashboard metrics use <b>Gross Records</b>. Even if a sale is returned, the original transaction count stays the same. 
                      This allows you to track total business volume and net profits separately with 100% precision.
                    </p>
                  </div>

                  <div className="p-6 rounded-[2rem] border border-slate-200">
                    <h4 className="font-black text-slate-900 text-sm mb-3 flex items-center gap-2">
                      <RefreshCw size={16} className="text-primary" /> Multi-Year Performance
                    </h4>
                    <p className="text-xs text-slate-500 font-bold leading-relaxed">
                      The system handles 5+ years of data by indexing every record. Your search speed will remain fast whether you have 100 records or 100,000.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
