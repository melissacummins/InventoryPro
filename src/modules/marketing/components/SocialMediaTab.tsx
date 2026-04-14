import { Share2, Instagram, ArrowRight } from 'lucide-react';

export default function SocialMediaTab() {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-2xl shadow-lg shadow-violet-500/25 mb-6">
        <Share2 className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Social Media</h2>
      <p className="text-slate-500 max-w-md mx-auto mb-8">
        Adapt your ad copy for organic social platforms with algospeak, hashtags, and platform-specific formatting. Connected to your weekly content and social strategy skills.
      </p>
      <div className="bg-slate-50 rounded-2xl p-6 max-w-lg mx-auto border border-slate-200">
        <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2 justify-center">
          Coming Up
        </h3>
        <ul className="text-sm text-slate-600 space-y-2 text-left">
          <li className="flex items-center gap-2">
            <ArrowRight className="w-3 h-3 text-violet-500 shrink-0" />
            Weekly social content planning connected to ad campaigns
          </li>
          <li className="flex items-center gap-2">
            <ArrowRight className="w-3 h-3 text-violet-500 shrink-0" />
            Algospeak auto-adaptation for organic posts
          </li>
          <li className="flex items-center gap-2">
            <ArrowRight className="w-3 h-3 text-violet-500 shrink-0" />
            Platform-specific formatting (Instagram, TikTok, Facebook, Pinterest)
          </li>
          <li className="flex items-center gap-2">
            <ArrowRight className="w-3 h-3 text-violet-500 shrink-0" />
            Hashtag strategy and Content Studio integration
          </li>
          <li className="flex items-center gap-2">
            <ArrowRight className="w-3 h-3 text-violet-500 shrink-0" />
            Scheduling and content calendar
          </li>
          <li className="flex items-center gap-2">
            <ArrowRight className="w-3 h-3 text-violet-500 shrink-0" />
            Ad-to-social pipeline — one click from paid copy to organic adaptation
          </li>
        </ul>
      </div>
      <p className="text-xs text-slate-400 mt-6 max-w-sm mx-auto">
        This will integrate with your Weekly Social Content and Social Media Strategy skills. Ad copy created in the Ads tab flows directly here for organic adaptation.
      </p>
    </div>
  );
}
