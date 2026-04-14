import { useState } from 'react';
import { Megaphone, Share2, BookOpenCheck, ImagePlus, Lightbulb, FileText, Film } from 'lucide-react';
import AdsTab from './components/AdsTab';
import SocialMediaTab from './components/SocialMediaTab';

type MainTab = 'ads' | 'social-media';

export default function MarketingModule() {
  const [mainTab, setMainTab] = useState<MainTab>('ads');

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Main Tab Switcher: Ads vs Social Media */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setMainTab('ads')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mainTab === 'ads' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Megaphone className="w-4 h-4" /> Ads
          </button>
          <button
            onClick={() => setMainTab('social-media')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mainTab === 'social-media' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Share2 className="w-4 h-4" /> Social Media
          </button>
        </div>
      </div>

      {/* Content */}
      {mainTab === 'ads' && <AdsTab />}
      {mainTab === 'social-media' && <SocialMediaTab />}
    </div>
  );
}
