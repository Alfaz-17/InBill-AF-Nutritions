'use client';
import { useState } from 'react';
import { 
  Building2, MapPin, Phone, Mail, FileText, 
  ChevronRight, Check, Rocket, Store, Factory, 
  Wrench, Coffee, Briefcase, Laptop, HeartPulse, 
  Smartphone, Hammer, ShoppingBag, Utensils, Construction
} from 'lucide-react';
import { useToast } from './ToastProvider';

const businessTypes = [
  { 
    id: 'Retail', label: 'General Retail / Kirana', icon: Store, 
    categories: ['Grocery', 'Daily Needs', 'FMCG', 'Beverages', 'Other'],
    fields: [] 
  },
  { 
    id: 'Wholesale', label: 'Wholesale / Trading', icon: Briefcase, 
    categories: ['Bulk Stock', 'Packaging', 'Raw Material', 'Distribution'],
    fields: [] 
  },
  { 
    id: 'Mobile', label: 'Mobile & Electronics', icon: Smartphone, 
    categories: ['Smartphones', 'Accessories', 'Laptops', 'Repairing', 'Second Hand'],
    fields: [
      { name: 'IMEI / Serial', type: 'text', required: 1 },
      { name: 'Warranty (Months)', type: 'number', required: 0 },
      { name: 'Condition', type: 'text', required: 0 }
    ] 
  },
  { 
    id: 'Pharma', label: 'Pharmacy / Medical', icon: HeartPulse, 
    categories: ['Medicines', 'Surgical', 'Cosmetics', 'OTC Products'],
    fields: [
      { name: 'Batch No', type: 'text', required: 1 },
      { name: 'Expiry Date', type: 'date', required: 1 },
      { name: 'HSN Code', type: 'text', required: 0 }
    ]
  },
  { 
    id: 'Hardware', label: 'Hardware & Tools', icon: Hammer, 
    categories: ['Electrical', 'Plumbing', 'Paints', 'Tools', 'Construction'],
    fields: [
      { name: 'Weight / Size', type: 'text', required: 0 },
      { name: 'Material Grade', type: 'text', required: 0 }
    ]
  },
  { 
    id: 'Automobile', label: 'Automobile / Spare Parts', icon: Wrench, 
    categories: ['Spare Parts', 'Lubricants', 'Tyres', 'Accessories', 'Service Items'],
    fields: [
      { name: 'Engine No', type: 'text', required: 0 },
      { name: 'Chassis No', type: 'text', required: 0 },
      { name: 'Vehicle Model', type: 'text', required: 0 }
    ] 
  },
  { 
    id: 'Garments', label: 'Textile & Garments', icon: ShoppingBag, 
    categories: ['Mens Wear', 'Womens Wear', 'Kids Wear', 'Fabrics', 'Accessories'],
    fields: [
      { name: 'Size', type: 'text', required: 1 },
      { name: 'Color', type: 'text', required: 0 },
      { name: 'Brand', type: 'text', required: 0 }
    ]
  },
  { 
    id: 'Jewellery', label: 'Jewellery Showroom', icon: HeartPulse, 
    categories: ['Gold', 'Silver', 'Diamond', 'Precious Stones', 'Making Charges'],
    fields: [
      { name: 'Purity (Carat)', type: 'text', required: 1 },
      { name: 'Gross Weight (gm)', type: 'number', required: 1 },
      { name: 'Net Weight (gm)', type: 'number', required: 1 }
    ]
  },
  { 
    id: 'Restaurant', label: 'Restaurant / Cafe', icon: Utensils, 
    categories: ['Food', 'Beverages', 'Bakery Items', 'Raw Materials', 'Desserts'],
    fields: [
      { name: 'Portion Size', type: 'text', required: 0 },
      { name: 'Kitchen Instruction', type: 'text', required: 0 }
    ]
  },
  { 
    id: 'Footwear', label: 'Footwear / Shoes', icon: ShoppingBag, 
    categories: ['Sports', 'Formal', 'Casual', 'Slippers', 'Accessories'],
    fields: [
      { name: 'Size (UK/IND)', type: 'text', required: 1 },
      { name: 'Color', type: 'text', required: 0 },
      { name: 'Material', type: 'text', required: 0 }
    ]
  },
  { 
    id: 'Electronics', label: 'Home Appliances', icon: Laptop, 
    categories: ['TV', 'AC', 'Washing Machine', 'Kitchen Appliances', 'Spares'],
    fields: [
      { name: 'Serial Number', type: 'text', required: 1 },
      { name: 'Model Number', type: 'text', required: 0 },
      { name: 'Warranty (Years)', type: 'number', required: 0 }
    ]
  },
  { 
    id: 'Stationery', label: 'Books & Stationery', icon: FileText, 
    categories: ['Books', 'Notebooks', 'Pens/Pencils', 'Office Supplies', 'Gifts'],
    fields: [
      { name: 'Publisher', type: 'text', required: 0 },
      { name: 'Class / Standard', type: 'text', required: 0 }
    ]
  },
  { 
    id: 'Service', label: 'Service & Repairing', icon: Wrench, 
    categories: ['Mobile Repair', 'Laptop Service', 'Electrical Work', 'General Service'],
    fields: [
      { name: 'Promised Date', type: 'date', required: 0 },
      { name: 'Device Condition', type: 'text', required: 0 },
      { name: 'Issue Reported', type: 'text', required: 0 }
    ]
  },
  { 
    id: 'Industrial', label: 'Industrial / Marine', icon: Factory, 
    categories: ['Engine Parts', 'Heavy Tools', 'Safety Gear', 'Marine Parts'],
    fields: [
      { name: 'OEM Number', type: 'text', required: 0 },
      { name: 'Compatible Model', type: 'text', required: 0 },
      { name: 'Part Number', type: 'text', required: 0 }
    ]
  },
  { 
    id: 'Services', label: 'Service / Repairing', icon: Wrench, 
    categories: ['Consulting', 'Maintenance', 'Labor', 'Subscription'],
    fields: [
      { name: 'Service Type', type: 'text', required: 1 },
      { name: 'Duration', type: 'text', required: 0 }
    ] 
  },
  { 
    id: 'Supplements', label: 'Supplement Store', icon: Store, 
    categories: ['Protein', 'BCAA', 'Creatine', 'Vitamins', 'Fat Burners'],
    fields: [
      { name: 'Flavor', type: 'text', required: 0 },
      { name: 'Servings', type: 'number', required: 0 }
    ] 
  },
  { 
    id: 'Optical', label: 'Optical / Eyewear', icon: ShoppingBag, 
    categories: ['Frames', 'Lenses', 'Sunglasses', 'Contact Lenses', 'Solutions'],
    fields: [
      { name: 'Power (Left)', type: 'text', required: 0 },
      { name: 'Power (Right)', type: 'text', required: 0 },
      { name: 'Frame Material', type: 'text', required: 0 }
    ] 
  },
  { 
    id: 'Dairy', label: 'Dairy / Fruits & Veg', icon: Store, 
    categories: ['Milk Products', 'Fruits', 'Vegetables', 'Organic', 'Frozen'],
    fields: [
      { name: 'Grade / Quality', type: 'text', required: 0 },
      { name: 'Farm Source', type: 'text', required: 0 }
    ] 
  },
  { 
    id: 'Salon', label: 'Salon / Spa', icon: HeartPulse, 
    categories: ['Hair Cut', 'Facial', 'Massage', 'Products', 'Packages'],
    fields: [
      { name: 'Stylist Name', type: 'text', required: 0 },
      { name: 'Appointment Time', type: 'text', required: 0 }
    ] 
  },
  {
    id: 'Other', label: 'Other / Custom Business', icon: Briefcase,
    categories: ['General', 'Services', 'Miscellaneous'],
    fields: []
  }
];

export default function SetupWizard({ onComplete }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    business_name: '',
    business_short: '',
    tagline: 'Billing & Inventory Management',
    address_line1: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    gstin: '',
    business_type: 'Retail'
  });
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (step === 1 && !formData.business_name) return;
    setStep(step + 1);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      if (!window.electronAPI?.business) {
        throw new Error('Desktop API not available');
      }
      // 1. Update Business Profile
      await window.electronAPI.business.updateProfile({
        ...formData,
        business_short: formData.business_short || formData.business_name.substring(0, 2).toUpperCase(),
        invoice_prefix: 'INV',
        invoice_footer: 'Thank you for your business!',
        currency_symbol: '₹',
        master_data: JSON.stringify({
          tax_label: 'GST',
          tax_rates: [0, 5, 12, 18, 28],
          units: ['pcs', 'box', 'kg', 'g', 'm', 'hrs', 'sqft']
        })
      });

      // 2. Add Default Categories & Attributes based on business type
      const selectedType = businessTypes.find(t => t.id === formData.business_type);
      if (selectedType) {
        // Add Categories
        for (const cat of selectedType.categories) {
          await window.electronAPI.categories.add(cat);
        }
        // Add Dynamic Attribute Definitions
        for (const field of (selectedType.fields || [])) {
          await window.electronAPI.attributes.add(field);
        }
      }

      // 3. Add Default Expense Categories
      const expCats = ['Rent', 'Electricity', 'Water', 'Staff Salary', 'Marketing', 'Maintenance', 'Other'];
      for (const cat of expCats) {
        await window.electronAPI.expenseCategories.add(cat);
      }

      onComplete();
    } catch (e) {
      console.error(e);
      toast('Setup failed: ' + e.message, 'error');
    }
    setLoading(false);
  };

  return (
    <div className="setup-wizard-container">
      <div className="setup-card">
        {/* Progress Bar */}
        <div className="setup-progress">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`progress-step ${step >= i ? 'active' : ''} ${step > i ? 'completed' : ''}`}>
              {step > i ? <Check size={14} /> : i}
            </div>
          ))}
          <div className="progress-line">
            <div className="progress-line-fill" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
          </div>
        </div>

        {step === 1 && (
          <div className="setup-step animate-in">
            <div className="setup-header">
              <div className="setup-icon-bg">
                <Building2 size={32} className="setup-icon" />
              </div>
              <h2>Business Identity</h2>
              <p>Let&apos;s start with your business name and tagline</p>
            </div>

            <div className="setup-form">
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Business Name *</label>
                  <input 
                    className="form-input" 
                    placeholder="e.g. My Shop" 
                    autoFocus
                    value={formData.business_name}
                    onChange={e => setFormData({...formData, business_name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Short Code (e.g. MS)</label>
                  <input 
                    className="form-input font-black uppercase" 
                    placeholder="Short ID"
                    maxLength={3}
                    value={formData.business_short}
                    onChange={e => setFormData({...formData, business_short: e.target.value.toUpperCase()})}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tagline (Optional)</label>
                <input 
                  className="form-input" 
                  placeholder="e.g. Quality Since 1995" 
                  value={formData.tagline}
                  onChange={e => setFormData({...formData, tagline: e.target.value})}
                />
              </div>
            </div>

            <button className="btn btn-primary btn-xl w-full mt-lg" onClick={handleNext} disabled={!formData.business_name}>
              Continue <ChevronRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="setup-step animate-in">
            <div className="setup-header">
              <div className="setup-icon-bg">
                <MapPin size={32} className="setup-icon" />
              </div>
              <h2>Location & Contact</h2>
              <p>Help your customers reach you easily</p>
            </div>

            <div className="setup-form" style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '8px' }}>
              <div className="form-group">
                <label className="form-label">Street Address</label>
                <input 
                  className="form-input" 
                  placeholder="Shop No, Area, Landmark" 
                  value={formData.address_line1}
                  onChange={e => setFormData({...formData, address_line1: e.target.value})}
                />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-input" placeholder="City" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input className="form-input" placeholder="6-digit PIN" value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" placeholder="10-digit mobile" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">GSTIN (Optional)</label>
                  <input 
                    className="form-input font-mono" 
                    placeholder="GSTIN Number" 
                    value={formData.gstin}
                    onChange={e => setFormData({...formData, gstin: e.target.value.toUpperCase()})}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" placeholder="business@example.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>

            <div className="flex gap-md mt-lg">
              <button className="btn btn-secondary btn-xl" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-primary btn-xl flex-1" onClick={handleNext}>
                Almost There <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="setup-step animate-in">
            <div className="setup-header">
              <div className="setup-icon-bg">
                <Rocket size={32} className="setup-icon" />
              </div>
              <h2>Select Business Type</h2>
              <p>We&apos;ll auto-configure your categories & fields</p>
            </div>

            <div className="business-type-grid" style={{ maxHeight: 280, overflowY: 'auto', padding: 4 }}>
              {businessTypes.map(type => {
                const Icon = type.icon;
                return (
                  <div 
                    key={type.id} 
                    className={`type-card ${formData.business_type === type.id ? 'active' : ''}`}
                    onClick={() => setFormData({...formData, business_type: type.id})}
                    style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '16px', textAlign: 'left' }}
                  >
                    <div className="flex justify-between w-full mb-xs">
                      <Icon size={24} className={formData.business_type === type.id ? 'text-white' : 'text-accent'} />
                      {formData.business_type === type.id && <Check size={16} />}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{type.label}</div>
                    <div style={{ fontSize: 10, opacity: 0.7, lineHeight: 1.2 }}>
                      {type.categories.slice(0, 3).join(', ')}...
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-md mt-lg">
              <button className="btn btn-secondary btn-xl" onClick={() => setStep(2)}>Back</button>
              <button className="btn btn-primary btn-xl flex-1" onClick={handleNext}>
                Review <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="setup-step animate-in">
            <div className="setup-header">
              <div className="setup-icon-bg">
                <Check size={32} className="setup-icon" />
              </div>
              <h2>Ready to Launch!</h2>
              <p>Check the details before we finalize your setup</p>
            </div>

            <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '16px' }}>
              <div className="review-item">
                <span className="label">Business</span>
                <span className="value">{formData.business_name}</span>
              </div>
              <div className="review-item">
                <span className="label">Type</span>
                <span className="value">{businessTypes.find(t => t.id === formData.business_type)?.label}</span>
              </div>
              <div className="review-item">
                <span className="label">Location</span>
                <span className="value">{formData.city || 'Not set'}, {formData.state || ''}</span>
              </div>
              <div className="review-item">
                <span className="label">Categories</span>
                <span className="value" style={{ fontSize: '11px' }}>
                  {businessTypes.find(t => t.id === formData.business_type)?.categories.join(', ')}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 24, padding: 12, background: 'var(--accent-glow)', borderRadius: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
              <Rocket size={20} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                Everything is set for your {businessTypes.find(t => t.id === formData.business_type)?.label}!
              </div>
            </div>

            <div className="flex gap-md mt-lg">
              <button className="btn btn-secondary btn-xl" onClick={() => setStep(3)}>Back</button>
              <button className="btn btn-primary btn-xl flex-1" onClick={handleFinish} disabled={loading}>
                {loading ? <div className="spinner sm"></div> : <><Rocket size={18} /> Get Started</>}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .setup-wizard-container {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }
        .setup-card {
          background: white;
          width: 100%;
          max-width: 520px;
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          position: relative;
          overflow: hidden;
        }
        .setup-progress {
          display: flex;
          justify-content: space-between;
          position: relative;
          margin-bottom: 40px;
          padding: 0 10px;
        }
        .progress-step {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
          color: #94a3b8;
          z-index: 2;
          border: 2px solid white;
          transition: all 0.3s ease;
        }
        .progress-step.active {
          background: var(--accent);
          color: white;
          box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.15);
        }
        .progress-step.completed {
          background: #10b981;
          color: white;
        }
        .progress-line {
          position: absolute;
          top: 16px; left: 20px; right: 20px;
          height: 2px;
          background: #f1f5f9;
          z-index: 1;
        }
        .progress-line-fill {
          height: 100%;
          background: var(--accent);
          transition: width 0.3s ease;
        }
        .setup-header {
          text-align: center;
          margin-bottom: 32px;
        }
        .setup-icon-bg {
          width: 64px; height: 64px;
          background: var(--accent-glow);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          color: var(--accent);
        }
        .setup-header h2 { font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
        .setup-header p { color: #64748b; font-size: 15px; }
        
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-input.lg { height: 56px; font-size: 20px; font-weight: 600; text-align: center; border-color: var(--accent); }
        
        .business-type-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .type-card {
          border: 1.5px solid #e2e8f0;
          border-radius: 16px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          text-align: center;
        }
        .type-card:hover { border-color: var(--accent); background: #f8fafc; transform: translateY(-2px); }
        .type-card.active { border-color: var(--accent); background: var(--accent-glow); box-shadow: 0 4px 12px rgba(20, 184, 166, 0.1); }
        .type-card span { font-weight: 600; font-size: 12px; color: #475569; }
        .type-card.active span { color: var(--accent); }
        .active-dot {
          position: absolute; top: 10px; right: 10px;
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--accent);
        }
        
        .review-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .review-item:last-child { border-bottom: none; }
        .review-item .label { font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; }
        .review-item .value { font-size: 14px; color: #1e293b; font-weight: 700; }

        .btn-xl { height: 56px; font-size: 16px; font-weight: 700; border-radius: 16px; }
        .mt-lg { margin-top: 24px; }
        .mt-xl { margin-top: 32px; }
        .flex-1 { flex: 1; }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}
