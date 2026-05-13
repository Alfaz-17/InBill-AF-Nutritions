'use client';
import { useState } from 'react';
import { 
  Store, Globe, Share2, QrCode, Phone, MapPin, 
  ExternalLink, Download, Layout, Sparkles, Check, Copy, Smartphone
} from 'lucide-react';

export default function DigitalStore({ profile }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('card');

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://inbill.store/${profile?.business_short || 'my-shop'}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="flex items-center gap-md">
          <div className="metric-icon teal"><Globe size={24} /></div>
          <div>
            <h2>Online Store & Digital Presence</h2>
            <p>Expand your business beyond the physical shop</p>
          </div>
        </div>
      </div>

      <div className="tabs mb-lg">
        <button className={`tab-btn ${activeTab === 'card' ? 'active' : ''}`} onClick={() => setActiveTab('card')}>
          <Sparkles size={16} /> Digital Business Card
        </button>
        <button className={`tab-btn ${activeTab === 'store' ? 'active' : ''}`} onClick={() => setActiveTab('store')}>
          <Store size={16} /> Online Storefront
        </button>
        <button className={`tab-btn ${activeTab === 'qr' ? 'active' : ''}`} onClick={() => setActiveTab('qr')}>
          <QrCode size={16} /> Shop QR Codes
        </button>
      </div>

      {activeTab === 'card' && (
        <div className="grid-2 gap-xl items-start">
          {/* Card Preview */}
          <div className="card p-none overflow-hidden" style={{ maxWidth: 400, borderRadius: 24, boxShadow: 'var(--shadow-premium)' }}>
            <div style={{ height: 120, background: 'linear-gradient(135deg, var(--accent), var(--secondary))', position: 'relative' }}>
              <div style={{ 
                position: 'absolute', bottom: -40, left: 24, 
                width: 80, height: 80, borderRadius: 20, 
                background: 'white', border: '4px solid white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--shadow-lg)'
              }}>
                <Store size={40} className="text-accent" />
              </div>
            </div>
            <div style={{ padding: '60px 24px 24px 24px', background: 'white' }}>
              <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{profile?.business_name || 'My Business'}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>{profile?.tagline || 'Professional ERP Partner'}</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="flex items-center gap-md text-secondary" style={{ fontSize: 14 }}>
                  <Phone size={16} className="text-accent" /> {profile?.phone || '+91 98765 43210'}
                </div>
                <div className="flex items-center gap-md text-secondary" style={{ fontSize: 14 }}>
                  <MapPin size={16} className="text-accent" /> {profile?.city || 'Business City'}, {profile?.state || 'State'}
                </div>
                <div className="flex items-center gap-md text-secondary" style={{ fontSize: 14 }}>
                  <Globe size={16} className="text-accent" /> inbill.store/{profile?.business_short || 'myshop'}
                </div>
              </div>

              <div style={{ marginTop: 32, padding: 20, background: 'var(--bg-secondary)', borderRadius: 16, textAlign: 'center' }}>
                <QrCode size={120} style={{ margin: '0 auto', opacity: 0.8 }} />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>Scan to save contact or visit store</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card p-lg">
              <h3 className="mb-md" style={{ fontSize: 18, fontWeight: 700 }}>Customize Card</h3>
              <p className="text-secondary mb-lg" style={{ fontSize: 14 }}>Your digital business card is automatically generated from your profile details.</p>
              
              <div className="flex flex-col gap-md">
                <button className="btn btn-primary btn-lg justify-center w-full">
                  <Download size={18} /> Download High-Res PDF
                </button>
                <button className="btn btn-secondary btn-lg justify-center w-full">
                  <Share2 size={18} /> Share via WhatsApp
                </button>
              </div>
            </div>

            <div className="card p-lg" style={{ border: '1px dashed var(--border)' }}>
              <div className="flex items-center gap-sm mb-md">
                <Sparkles size={16} className="text-teal" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Pro Feature</span>
              </div>
              <p className="text-secondary" style={{ fontSize: 13 }}>Custom themes and logo uploads for digital cards are coming in the next update.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'store' && (
        <div className="card p-xl text-center">
          <div className="metric-icon teal mx-auto mb-lg" style={{ width: 64, height: 64 }}>
            <Globe size={32} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Your Online Store is Ready!</h2>
          <p className="text-secondary mb-xl mx-auto" style={{ maxWidth: 500 }}>
            We've created a search-optimized storefront for your items. Customers can view your catalog and place orders directly.
          </p>
          
          <div className="flex items-center justify-center gap-md mb-xl">
            <div className="glass p-md" style={{ borderRadius: 12, fontWeight: 700, color: 'var(--accent)', fontSize: 16 }}>
              inbill.store/{profile?.business_short || 'my-shop'}
            </div>
            <button className="btn btn-primary" onClick={handleCopy}>
              {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? 'Copied' : 'Copy Link'}
            </button>
          </div>

          <div className="grid-3 gap-lg text-left">
            <div className="card p-md">
              <div className="metric-icon teal mb-md"><Layout size={20} /></div>
              <h4 className="mb-sm">Full Catalog</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>All your inventory items are automatically listed online with current prices.</p>
            </div>
            <div className="card p-md">
              <div className="metric-icon yellow mb-md"><Smartphone size={20} /></div>
              <h4 className="mb-sm">Mobile Optimized</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Perfect shopping experience for customers on Android and iPhone.</p>
            </div>
            <div className="card p-md">
              <div className="metric-icon red mb-md"><ExternalLink size={20} /></div>
              <h4 className="mb-sm">SEO Ready</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Get discovered on Google when customers search for products in your city.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'qr' && (
        <div className="grid-2 gap-lg">
          <div className="card p-lg text-center">
            <h3 className="mb-md">UPI Payment QR</h3>
            <p className="text-secondary mb-lg">Accept payments directly from customers using any UPI app.</p>
            <div className="glass p-xl mb-lg" style={{ display: 'inline-block', borderRadius: 24 }}>
              <QrCode size={200} />
            </div>
            <button className="btn btn-primary btn-lg w-full">Download Poster</button>
          </div>
          <div className="card p-lg text-center">
            <h3 className="mb-md">Store Visit QR</h3>
            <p className="text-secondary mb-lg">Place this on your counter to let customers browse your menu/catalog.</p>
            <div className="glass p-xl mb-lg" style={{ display: 'inline-block', borderRadius: 24 }}>
              <QrCode size={200} />
            </div>
            <button className="btn btn-primary btn-lg w-full">Download Poster</button>
          </div>
        </div>
      )}
    </div>
  );
}
