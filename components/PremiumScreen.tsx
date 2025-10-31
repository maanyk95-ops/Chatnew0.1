import React, { useState, useEffect } from 'react';
import type { User, PremiumScreenSettings, PremiumPlan } from '../types';

// Icons
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
const StoriesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CloudIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>;
const X2Icon = () => <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center font-bold text-sm">x2</div>;
const ArrowRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;
const PremiumIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>;
const PrivacyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;

const IconRenderer: React.FC<{ icon: string; className?: string }> = ({ icon, className }) => {
    if (icon.startsWith('http')) {
        return (
            <div className={className}>
                <img src={icon} alt="feature icon" className="w-8 h-8 object-contain" />
            </div>
        );
    }
    const renderIcon = () => {
        switch (icon) {
            case 'stories': return <StoriesIcon />;
            case 'cloud': return <CloudIcon />;
            case 'x2': return <X2Icon />;
            case 'premium': return <PremiumIcon />;
            case 'privacy': return <PrivacyIcon />;
            default: return <PremiumIcon />;
        }
    }
    return <div className={className}>{renderIcon()}</div>;
};

interface PremiumScreenProps {
    currentUser: User;
    onBack: () => void;
    settings: PremiumScreenSettings;
    onNavigate: (view: string, payload?: any) => void;
}

const PremiumScreen: React.FC<PremiumScreenProps> = ({ currentUser, onBack, settings, onNavigate }) => {
    const [planId, setPlanId] = useState(settings.plans[0]?.id || '');

    useEffect(() => {
        if (!planId && settings.plans.length > 0) {
            setPlanId(settings.plans[0].id);
        }
    }, [settings.plans, planId]);
    
    const selectedPlan = settings.plans.find(p => p.id === planId);

    const handleSubscribe = () => {
        if (!selectedPlan) return;
        onNavigate('premium_payment', { plan: selectedPlan });
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-black text-black dark:text-white">
            <header className="flex items-center p-3 flex-shrink-0 z-10">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                    <BackIcon />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4">
                {settings.headerImage?.url && (
                    <div className="flex justify-center" style={{
                        marginTop: settings.headerImage.marginTop ? `${settings.headerImage.marginTop}px` : '32px',
                        marginBottom: settings.headerImage.marginBottom ? `${settings.headerImage.marginBottom}px` : '32px',
                    }}>
                        <img
                            src={settings.headerImage.url}
                            alt="Premium Header"
                            style={{
                                width: settings.headerImage.width ? `${settings.headerImage.width}px` : '128px',
                                height: settings.headerImage.height ? `${settings.headerImage.height}px` : '128px',
                                objectFit: 'contain',
                            }}
                        />
                    </div>
                )}
                <h1 className="text-3xl font-bold text-center">{settings.header}</h1>
                <p className="text-center text-gray-500 dark:text-gray-400 mt-2 mx-4">{settings.subHeader}</p>

                <div className="my-8 space-y-3">
                    {settings.plans.map(plan => (
                        <label key={plan.id} className={`flex items-center p-4 rounded-xl border-2 transition-colors ${planId === plan.id ? 'border-[var(--theme-color-primary)] bg-[var(--theme-color-primary)]/10' : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1e1e1e]'}`}>
                            <input type="radio" name="plan" value={plan.id} checked={planId === plan.id} onChange={() => setPlanId(plan.id)} className="h-6 w-6 shrink-0 appearance-none rounded-full border-2 border-gray-400 dark:border-gray-600 checked:bg-[var(--theme-color-primary)] checked:border-[var(--theme-color-primary)] ring-2 ring-transparent ring-offset-2 ring-offset-white dark:ring-offset-black checked:ring-white" />
                            <div className="ml-4 flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold capitalize">{plan.name}</span>
                                    <span className="font-bold text-lg">{plan.priceCurrency}{plan.priceValue}/{plan.period}</span>
                                </div>
                                {plan.discountText && plan.monthlyEquivalent && (
                                    <div className="flex items-center justify-between text-sm mt-1">
                                        <span className="px-2 py-0.5 bg-yellow-400 text-black font-bold rounded">{plan.discountText}</span>
                                        <span className="text-gray-500 dark:text-gray-400">
                                            {plan.originalPrice && <span className="line-through">{plan.originalPrice}</span>} {plan.monthlyEquivalent}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </label>
                    ))}
                </div>
                
                {currentUser.paymentRequestStatus && (
                    <div className={`text-center my-4 p-3 rounded-lg text-sm
                        ${currentUser.paymentRequestStatus === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300' : ''}
                        ${currentUser.paymentRequestStatus === 'rejected' ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300' : ''}
                        ${currentUser.paymentRequestStatus === 'hold' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300' : ''}
                    `}>
                        {currentUser.paymentRequestStatus === 'pending' && 'Your subscription request is pending approval.'}
                        {currentUser.paymentRequestStatus === 'rejected' && 'Your last request was rejected. You can submit a new one.'}
                        {currentUser.paymentRequestStatus === 'hold' && 'Your request is on hold. Please contact support.'}
                    </div>
                )}
                
                <div className="bg-gray-50 dark:bg-[#1e1e1e] rounded-xl">
                    {settings.features.map((feature, index) => (
                        <div key={feature.id} className={`flex items-center p-4 text-left ${index < settings.features.length - 1 ? 'border-b border-gray-200 dark:border-gray-800' : ''}`}>
                            <IconRenderer icon={feature.icon} className="text-[var(--theme-color-primary)]" />
                            <div className="ml-4 flex-1">
                                <h3 className="font-semibold">{feature.title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{feature.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="h-24"></div> {/* Spacer for the subscribe button */}
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-black/50 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800">
                <button 
                    onClick={handleSubscribe} 
                    disabled={currentUser.paymentRequestStatus === 'pending' || currentUser.paymentRequestStatus === 'hold'}
                    className="w-full bg-blue-600 text-white font-bold py-4 rounded-lg text-lg disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    {currentUser.paymentRequestStatus === 'pending' ? 'Request Pending' : 
                     currentUser.paymentRequestStatus === 'hold' ? 'Request on Hold' :
                    `Subscribe for ${selectedPlan?.priceCurrency}${selectedPlan?.priceValue} per ${selectedPlan?.period}`}
                </button>
            </div>
        </div>
    );
};

export default PremiumScreen;