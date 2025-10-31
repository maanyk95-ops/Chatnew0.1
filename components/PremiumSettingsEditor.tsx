import React, { useState, useRef } from 'react';
import type { PremiumScreenSettings, PremiumPlan, PremiumFeature, PremiumHeaderImageSettings, PaymentSettings, PaymentDetailField } from '../types';
import { uploadImage } from '../services/imageUploader';

interface PremiumSettingsEditorProps {
    initialSettings: { premiumScreen: PremiumScreenSettings, paymentSettings: PaymentSettings };
    onSave: (newSettings: { premiumScreen: PremiumScreenSettings, paymentSettings: PaymentSettings }) => Promise<void>;
    onBack: () => void;
}

const ImageUploaderInput: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
}> = ({ label, value, onChange }) => {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const url = await uploadImage(file);
            onChange(url);
        } catch (err) {
            console.error(err);
            alert('Image upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div>
            <label className="text-sm font-semibold">{label}</label>
            <div className="flex items-center space-x-2 mt-1">
                <input
                    type="text"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder="Icon name or URL"
                    className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded text-sm"
                />
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-3 py-2 bg-blue-500 text-white rounded text-sm font-semibold disabled:bg-gray-400"
                >
                    {uploading ? '...' : 'Upload'}
                </button>
            </div>
        </div>
    );
};

const StyleInput: React.FC<{ label: string; value: number | undefined; onChange: (value: string) => void; placeholder?: string; }> = ({ label, value, onChange, placeholder = 'auto' }) => (
    <div>
        <label className="text-xs font-semibold capitalize">{label}</label>
        <input type="number" placeholder={placeholder} value={value || ''} onChange={e => onChange(e.target.value)} className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded mt-1 text-sm" />
    </div>
);


const PremiumSettingsEditor: React.FC<PremiumSettingsEditorProps> = ({ initialSettings, onSave, onBack }) => {
    const [settings, setSettings] = useState(initialSettings);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const handleSave = async () => {
        setSaving(true);
        setMessage('Saving...');
        try {
            await onSave(settings);
            setMessage('Settings saved successfully!');
        } catch (error) {
            setMessage('Error saving settings.');
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handlePremiumChange = (field: keyof PremiumScreenSettings, value: any) => {
        setSettings(s => ({ ...s, premiumScreen: { ...s.premiumScreen, [field]: value } }));
    };
    
    const handleHeaderImageChange = (field: keyof PremiumHeaderImageSettings, value: string | number) => {
        setSettings(s => ({ ...s, premiumScreen: { ...s.premiumScreen, headerImage: { ...s.premiumScreen.headerImage!, [field]: value } } }));
    };

    const handlePlanChange = (planId: string, field: keyof PremiumPlan, value: string) => {
        const plans = settings.premiumScreen.plans.map(p => 
            p.id === planId ? { ...p, [field]: (field === 'durationDays' || field === 'priceValue') ? Number(value) : value } : p
        );
        handlePremiumChange('plans', plans);
    };

    const handleAddPlan = () => {
        const newPlan: PremiumPlan = { id: `plan_${Date.now()}`, name: 'New Plan', priceCurrency: '₹', priceValue: 0.00, period: 'month', durationDays: 30 };
        handlePremiumChange('plans', [...(settings.premiumScreen.plans || []), newPlan]);
    };

    const handleRemovePlan = (planId: string) => {
        handlePremiumChange('plans', settings.premiumScreen.plans.filter(p => p.id !== planId));
    };

    const handleFeatureChange = (featureId: string, field: keyof PremiumFeature, value: string) => {
        const features = settings.premiumScreen.features.map(f => f.id === featureId ? { ...f, [field]: value } : f);
        handlePremiumChange('features', features);
    };

    const handleAddFeature = () => {
        const newFeature: PremiumFeature = { id: `feat-${Date.now()}`, icon: 'premium', title: 'New Feature', description: 'Description' };
        handlePremiumChange('features', [...(settings.premiumScreen.features || []), newFeature]);
    };

    const handleRemoveFeature = (featureId: string) => {
        handlePremiumChange('features', settings.premiumScreen.features.filter(f => f.id !== featureId));
    };

    const handlePaymentChange = (field: keyof PaymentSettings, value: any) => {
        setSettings(s => ({ ...s, paymentSettings: { ...s.paymentSettings, [field]: value } }));
    };

    const handlePaymentFieldChange = (fieldId: string, prop: keyof PaymentDetailField, value: string) => {
        const fields = settings.paymentSettings.fields.map(f => f.id === fieldId ? { ...f, [prop]: value } : f);
        handlePaymentChange('fields', fields);
    };

    const handleAddPaymentField = () => {
        const newField: PaymentDetailField = { id: `field_${Date.now()}`, label: 'New Field', value: '' };
        handlePaymentChange('fields', [...(settings.paymentSettings.fields || []), newField]);
    };
    
    const handleRemovePaymentField = (fieldId: string) => {
        handlePaymentChange('fields', settings.paymentSettings.fields.filter(f => f.id !== fieldId));
    };

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between sticky top-[73px] bg-gray-100 dark:bg-[#1e1e1e] py-2 z-10 -mt-4 -mx-4 px-4 border-b border-gray-200 dark:border-gray-800">
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:bg-gray-500">
                    {saving ? 'Saving...' : 'Save All Settings'}
                </button>
                {message && <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>}
            </div>

            {/* Premium Page Settings */}
            <div className="bg-white dark:bg-[#2f2f2f] p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">Premium Page Content</h3>
                <div className="space-y-4">
                    <ImageUploaderInput label="Star Icon" value={settings.premiumScreen.starIcon} onChange={val => handlePremiumChange('starIcon', val)} />
                    <ImageUploaderInput label="Header Image URL" value={settings.premiumScreen.headerImage?.url || ''} onChange={val => handleHeaderImageChange('url', val)} />
                    <div className="grid grid-cols-2 gap-2">
                        <StyleInput label="Img Width (px)" value={settings.premiumScreen.headerImage?.width} onChange={v => handleHeaderImageChange('width', v)} placeholder="128" />
                        <StyleInput label="Img Height (px)" value={settings.premiumScreen.headerImage?.height} onChange={v => handleHeaderImageChange('height', v)} placeholder="128" />
                        <StyleInput label="Img Margin Top (px)" value={settings.premiumScreen.headerImage?.marginTop} onChange={v => handleHeaderImageChange('marginTop', v)} placeholder="32" />
                        <StyleInput label="Img Margin Bottom (px)" value={settings.premiumScreen.headerImage?.marginBottom} onChange={v => handleHeaderImageChange('marginBottom', v)} placeholder="32" />
                    </div>
                    <div><label>Header</label><input value={settings.premiumScreen.header} onChange={e => handlePremiumChange('header', e.target.value)} className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded mt-1"/></div>
                    <div><label>Sub-Header</label><textarea value={settings.premiumScreen.subHeader} onChange={e => handlePremiumChange('subHeader', e.target.value)} rows={2} className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded mt-1"/></div>
                    
                    <div>
                        <h4 className="font-semibold mt-4 mb-2">Plans</h4>
                        <div className="space-y-2">
                            {settings.premiumScreen.plans.map(p => (
                                <div key={p.id} className="p-3 bg-gray-100 dark:bg-black/20 rounded-md space-y-2 relative">
                                    <button onClick={() => handleRemovePlan(p.id)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs">Remove</button>
                                    <input value={p.name} onChange={e => handlePlanChange(p.id, 'name', e.target.value)} className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded text-sm font-bold"/>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="number" value={p.durationDays} onChange={e => handlePlanChange(p.id, 'durationDays', e.target.value)} placeholder="Days" className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded text-sm"/>
                                        <input value={p.period} onChange={e => handlePlanChange(p.id, 'period', e.target.value)} placeholder="e.g. month" className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded text-sm"/>
                                        <div className="col-span-2 flex items-center space-x-2"><input value={p.priceCurrency} onChange={e => handlePlanChange(p.id, 'priceCurrency', e.target.value)} className="w-1/4 bg-gray-200 dark:bg-gray-700 p-2 rounded text-sm"/><input type="number" step="0.01" value={p.priceValue} onChange={e => handlePlanChange(p.id, 'priceValue', e.target.value)} className="w-3/4 bg-gray-200 dark:bg-gray-700 p-2 rounded text-sm"/></div>
                                        <input value={p.discountText || ''} onChange={e => handlePlanChange(p.id, 'discountText', e.target.value)} placeholder="Discount (e.g. -37%)" className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded text-sm"/>
                                        <input value={p.monthlyEquivalent || ''} onChange={e => handlePlanChange(p.id, 'monthlyEquivalent', e.target.value)} placeholder="e.g. ₹199/month" className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded text-sm"/>
                                        <input value={p.originalPrice || ''} onChange={e => handlePlanChange(p.id, 'originalPrice', e.target.value)} placeholder="Original Price (e.g. ₹3,828)" className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded text-sm"/>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleAddPlan} className="mt-2 w-full p-2 bg-blue-500/20 text-blue-500 dark:text-blue-300 rounded text-sm font-semibold">Add Plan</button>
                    </div>

                    <div>
                        <h4 className="font-semibold mt-4 mb-2">Features</h4>
                        <div className="space-y-2">
                            {settings.premiumScreen.features.map(f => (
                                <div key={f.id} className="p-3 bg-gray-100 dark:bg-black/20 rounded-md space-y-2 relative">
                                    <button onClick={() => handleRemoveFeature(f.id)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs">Remove</button>
                                    <ImageUploaderInput label="Icon" value={f.icon} onChange={val => handleFeatureChange(f.id, 'icon', val)} />
                                    <input value={f.title} onChange={e => handleFeatureChange(f.id, 'title', e.target.value)} className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded text-sm font-bold"/>
                                    <textarea value={f.description} onChange={e => handleFeatureChange(f.id, 'description', e.target.value)} rows={2} className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded text-sm"/>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleAddFeature} className="mt-2 w-full p-2 bg-blue-500/20 text-blue-500 dark:text-blue-300 rounded text-sm font-semibold">Add Feature</button>
                    </div>
                </div>
            </div>

            {/* Payment Settings */}
            <div className="bg-white dark:bg-[#2f2f2f] p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">Manual Payment Settings</h3>
                <div className="space-y-4">
                    <div><label>Instructions</label><textarea value={settings.paymentSettings.instructions} onChange={e => handlePaymentChange('instructions', e.target.value)} rows={3} className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded mt-1"/></div>
                    <ImageUploaderInput label="QR Code Image URL" value={settings.paymentSettings.qrCodeUrl} onChange={val => handlePaymentChange('qrCodeUrl', val)} />
                    <div>
                        <h4 className="font-semibold mt-4 mb-2">Payment Fields</h4>
                        <div className="space-y-2">
                            {settings.paymentSettings.fields.map(f => (
                                <div key={f.id} className="p-3 bg-gray-100 dark:bg-black/20 rounded-md space-y-2 relative">
                                    <button onClick={() => handleRemovePaymentField(f.id)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs">Remove</button>
                                    <input value={f.label} onChange={e => handlePaymentFieldChange(f.id, 'label', e.target.value)} placeholder="Label (e.g. UPI ID)" className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded text-sm"/>
                                    <input value={f.value} onChange={e => handlePaymentFieldChange(f.id, 'value', e.target.value)} placeholder="Value (e.g. example@upi)" className="w-full bg-gray-200 dark:bg-gray-700 p-2 rounded text-sm"/>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleAddPaymentField} className="mt-2 w-full p-2 bg-blue-500/20 text-blue-500 dark:text-blue-300 rounded text-sm font-semibold">Add Field</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PremiumSettingsEditor;