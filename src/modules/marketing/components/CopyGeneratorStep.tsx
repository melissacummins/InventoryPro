import { useState } from 'react';
import { FileText, Plus, X, Copy, Check, ChevronRight, ChevronDown, Sparkles } from 'lucide-react';

interface Props {
  onComplete: () => void;
}

interface Variation {
  id: string;
  avatarName: string;
  framework: string;
  hookText: string;
  expansion: string;
}

interface HeadlineEntry {
  id: string;
  text: string;
  purpose: 'genre_signal' | 'heroine_power' | 'hero_devotion' | 'scene_tension' | 'trope_signal';
}

const PURPOSE_LABELS: Record<string, { label: string; color: string }> = {
  genre_signal: { label: 'Genre Signal', color: 'bg-blue-100 text-blue-700' },
  heroine_power: { label: 'Heroine Power', color: 'bg-purple-100 text-purple-700' },
  hero_devotion: { label: 'Hero Devotion', color: 'bg-red-100 text-red-700' },
  scene_tension: { label: 'Scene Tension', color: 'bg-amber-100 text-amber-700' },
  trope_signal: { label: 'Trope Signal', color: 'bg-green-100 text-green-700' },
};

const FRAMEWORKS = [
  "Main Character: Hero's POV",
  "Main Character: Heroine's POV",
  'BookTok Friend: Unhinged Recommendation',
  'BookTok Friend: Tension and Dynamic',
  'Primal/Kink-Curious Reader',
  'Author Invite',
  'Avatar-Specific',
];

export default function CopyGeneratorStep({ onComplete }: Props) {
  // Primary Text Variations
  const [variations, setVariations] = useState<Variation[]>([]);
  const [showVariationForm, setShowVariationForm] = useState(false);
  const [varAvatarName, setVarAvatarName] = useState('');
  const [varFramework, setVarFramework] = useState('');
  const [varHook, setVarHook] = useState('');
  const [varExpansion, setVarExpansion] = useState('');
  const [editingVarId, setEditingVarId] = useState<string | null>(null);

  // Headlines
  const [headlines, setHeadlines] = useState<HeadlineEntry[]>([]);
  const [showHeadlineForm, setShowHeadlineForm] = useState(false);
  const [hlText, setHlText] = useState('');
  const [hlPurpose, setHlPurpose] = useState<HeadlineEntry['purpose']>('genre_signal');

  // Static Blocks
  const [tropeList, setTropeList] = useState('');
  const [socialProof, setSocialProof] = useState('');
  const [cta, setCta] = useState('');

  // SEO Description
  const [seoPayload, setSeoPayload] = useState('');
  const [seoComps, setSeoComps] = useState('');
  const [seoVibeStack, setSeoVibeStack] = useState('');
  const [seoKeywordSink, setSeoKeywordSink] = useState('');

  // UI
  const [expandedSection, setExpandedSection] = useState<string>('variations');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPairingGuide, setShowPairingGuide] = useState(false);
  const [pairingGuide, setPairingGuide] = useState('');

  function toggleSection(section: string) {
    setExpandedSection(prev => prev === section ? '' : section);
  }

  // Variation CRUD
  function saveVariation() {
    if (!varAvatarName.trim() || !varHook.trim()) return;
    if (editingVarId) {
      setVariations(prev => prev.map(v => v.id === editingVarId ? {
        ...v, avatarName: varAvatarName.trim(), framework: varFramework,
        hookText: varHook.trim(), expansion: varExpansion.trim(),
      } : v));
    } else {
      setVariations(prev => [...prev, {
        id: crypto.randomUUID(), avatarName: varAvatarName.trim(),
        framework: varFramework, hookText: varHook.trim(), expansion: varExpansion.trim(),
      }]);
    }
    resetVariationForm();
  }

  function resetVariationForm() {
    setVarAvatarName(''); setVarFramework(''); setVarHook(''); setVarExpansion('');
    setShowVariationForm(false); setEditingVarId(null);
  }

  function editVariation(v: Variation) {
    setVarAvatarName(v.avatarName); setVarFramework(v.framework);
    setVarHook(v.hookText); setVarExpansion(v.expansion);
    setEditingVarId(v.id); setShowVariationForm(true); setExpandedSection('variations');
  }

  // Headline CRUD
  function saveHeadline() {
    if (!hlText.trim()) return;
    setHeadlines(prev => [...prev, {
      id: crypto.randomUUID(), text: hlText.trim(), purpose: hlPurpose,
    }]);
    setHlText(''); setShowHeadlineForm(false);
  }

  // Copy to clipboard
  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function buildFullAdCopy(variation: Variation): string {
    let copy = variation.hookText + '\n\n' + variation.expansion;
    if (tropeList) copy += '\n\n' + tropeList;
    if (socialProof) copy += '\n\n' + socialProof;
    if (cta) copy += '\n\n' + cta;
    return copy;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-pink-500" />
          Copy Generator
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Build 5 variations of primary text, headlines, and a universal SEO description. Each variation targets a different reader avatar.
        </p>
      </div>

      <div className="space-y-4">
        {/* Section 1: Primary Text Variations */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('variations')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center text-pink-600 text-sm font-bold">1</div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-slate-700">Primary Text Variations</h4>
                <p className="text-xs text-slate-400">{variations.length}/5 variations — each targets a different avatar</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSection === 'variations' ? 'rotate-180' : ''}`} />
          </button>

          {expandedSection === 'variations' && (
            <div className="px-5 pb-5 border-t border-slate-100">
              {/* Existing Variations */}
              {variations.length > 0 && (
                <div className="space-y-3 mt-4 mb-4">
                  {variations.map((v, i) => (
                    <div key={v.id} className="p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-pink-600">VARIATION {i + 1}</span>
                          <span className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded text-[10px] font-medium">{v.avatarName}</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">{v.framework}</span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => copyToClipboard(buildFullAdCopy(v), v.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg"
                            title="Copy full ad"
                          >
                            {copiedId === v.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => editVariation(v)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setVariations(prev => prev.filter(x => x.id !== v.id))}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 font-medium mb-1">{v.hookText}</p>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{v.expansion}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Variation Form */}
              {showVariationForm ? (
                <div className="mt-4 p-4 border border-pink-200 rounded-xl bg-pink-50/50 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Target Avatar Name *</label>
                      <input
                        type="text"
                        value={varAvatarName}
                        onChange={e => setVarAvatarName(e.target.value)}
                        placeholder="e.g., The Primal Reader, BookTok Friend"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Framework</label>
                      <select
                        value={varFramework}
                        onChange={e => setVarFramework(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400 bg-white"
                      >
                        <option value="">Select framework...</option>
                        {FRAMEWORKS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Hook Text * <span className="text-slate-400">— first ~90 chars appear above the fold</span></label>
                    <textarea
                      value={varHook}
                      onChange={e => setVarHook(e.target.value)}
                      placeholder="The opening hook line..."
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400 bg-white"
                    />
                    <p className="text-xs text-slate-400 mt-0.5">{varHook.length} characters</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Expansion (Stakes Bridge + Body)</label>
                    <textarea
                      value={varExpansion}
                      onChange={e => setVarExpansion(e.target.value)}
                      placeholder="The paragraph(s) after the hook that contextualize it..."
                      rows={4}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400 bg-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveVariation} disabled={!varAvatarName.trim() || !varHook.trim()} className="px-4 py-2 bg-pink-600 text-white text-sm rounded-lg hover:bg-pink-700 disabled:opacity-50">
                      {editingVarId ? 'Update' : 'Add'} Variation
                    </button>
                    <button onClick={resetVariationForm} className="px-4 py-2 text-slate-600 text-sm rounded-lg hover:bg-slate-100">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowVariationForm(true)}
                  disabled={variations.length >= 5}
                  className="mt-4 flex items-center gap-2 px-4 py-2 border-2 border-dashed border-pink-200 text-pink-600 text-sm rounded-xl hover:bg-pink-50 w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" /> Add Primary Text Variation {variations.length > 0 && `(${variations.length}/5)`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Headlines */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('headlines')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center text-pink-600 text-sm font-bold">2</div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-slate-700">Headlines</h4>
                <p className="text-xs text-slate-400">{headlines.length}/5 headlines — consolidated pool, each with a distinct purpose</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSection === 'headlines' ? 'rotate-180' : ''}`} />
          </button>

          {expandedSection === 'headlines' && (
            <div className="px-5 pb-5 border-t border-slate-100">
              {headlines.length > 0 && (
                <div className="space-y-2 mt-4 mb-4">
                  {headlines.map((hl, i) => {
                    const purposeInfo = PURPOSE_LABELS[hl.purpose];
                    return (
                      <div key={hl.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <span className="text-xs font-bold text-slate-400 w-6">{i + 1}.</span>
                        <span className="flex-1 text-sm text-slate-800">{hl.text}</span>
                        <span className="text-xs text-slate-400">{hl.text.length} chars</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${purposeInfo.color}`}>
                          {purposeInfo.label}
                        </span>
                        <button
                          onClick={() => copyToClipboard(hl.text, hl.id)}
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          {copiedId === hl.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setHeadlines(prev => prev.filter(x => x.id !== hl.id))}
                          className="p-1 text-slate-400 hover:text-red-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {showHeadlineForm ? (
                <div className="mt-4 p-4 border border-pink-200 rounded-xl bg-pink-50/50 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Headline Text *</label>
                      <input
                        type="text"
                        value={hlText}
                        onChange={e => setHlText(e.target.value)}
                        placeholder="e.g., A Dark Vampire Romance, She Took His Empire"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400 bg-white"
                      />
                      <p className="text-xs text-slate-400 mt-0.5">{hlText.length} characters {hlText.length > 40 ? '(consider shortening)' : ''}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Purpose</label>
                      <select
                        value={hlPurpose}
                        onChange={e => setHlPurpose(e.target.value as HeadlineEntry['purpose'])}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400 bg-white"
                      >
                        {Object.entries(PURPOSE_LABELS).map(([key, { label }]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveHeadline} disabled={!hlText.trim()} className="px-4 py-2 bg-pink-600 text-white text-sm rounded-lg hover:bg-pink-700 disabled:opacity-50">
                      Add Headline
                    </button>
                    <button onClick={() => setShowHeadlineForm(false)} className="px-4 py-2 text-slate-600 text-sm rounded-lg hover:bg-slate-100">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowHeadlineForm(true)}
                  disabled={headlines.length >= 5}
                  className="mt-4 flex items-center gap-2 px-4 py-2 border-2 border-dashed border-pink-200 text-pink-600 text-sm rounded-xl hover:bg-pink-50 w-full justify-center disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" /> Add Headline {headlines.length > 0 && `(${headlines.length}/5)`}
                </button>
              )}

              {/* Optional Pairing Guide */}
              {headlines.length > 0 && variations.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowPairingGuide(!showPairingGuide)}
                    className="text-xs text-pink-600 hover:text-pink-700 font-medium"
                  >
                    {showPairingGuide ? 'Hide' : 'Show'} pairing guidance (optional)
                  </button>
                  {showPairingGuide && (
                    <textarea
                      value={pairingGuide}
                      onChange={e => setPairingGuide(e.target.value)}
                      placeholder="e.g., Hook 1 (Primal Reader) → Headline 2 or 4&#10;Hook 2 (BookTok Friend) → Headline 1 or 3"
                      rows={4}
                      className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400"
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 3: Static Blocks */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('static')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center text-pink-600 text-sm font-bold">3</div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-slate-700">Static Blocks</h4>
                <p className="text-xs text-slate-400">Trope list, social proof, and CTA — same across all variations</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSection === 'static' ? 'rotate-180' : ''}`} />
          </button>

          {expandedSection === 'static' && (
            <div className="px-5 pb-5 border-t border-slate-100 space-y-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Trope List <span className="text-slate-400">— emoji-led, feeds algorithm targeting</span>
                </label>
                <textarea
                  value={tropeList}
                  onChange={e => setTropeList(e.target.value)}
                  placeholder={"🖤 Fated Mates\n🖤 Possessive Hero\n🖤 Touch Her and Die\n🖤 He Falls First"}
                  rows={5}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Social Proof <span className="text-slate-400">— reader review with star rating</span>
                </label>
                <textarea
                  value={socialProof}
                  onChange={e => setSocialProof(e.target.value)}
                  placeholder={'⚠️ WARNING: Impossible to put down.\n\n"I honestly don\'t know if any other Romance can compete." — ⭐⭐⭐⭐⭐ Reader'}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  CTA <span className="text-slate-400">— bundle list + call to action</span>
                </label>
                <textarea
                  value={cta}
                  onChange={e => setCta(e.target.value)}
                  placeholder={"Books Included in Bundle:\nBook 1\nBook 2\n\nSave money and support the author when you buy direct. Scroll up and one-click now!"}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 4: SEO Description */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('seo')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center text-pink-600 text-sm font-bold">4</div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-slate-700">Universal SEO Description</h4>
                <p className="text-xs text-slate-400">4 paragraphs feeding Andromeda different signal types</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSection === 'seo' ? 'rotate-180' : ''}`} />
          </button>

          {expandedSection === 'seo' && (
            <div className="px-5 pb-5 border-t border-slate-100 space-y-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Paragraph 1 — The Payload <span className="text-slate-400">— mini-synopsis pitch</span>
                </label>
                <textarea
                  value={seoPayload}
                  onChange={e => setSeoPayload(e.target.value)}
                  placeholder="A 2-3 sentence mini-synopsis. Not a blurb — a pitch."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Paragraph 2 — The Comps <span className="text-slate-400">— comp authors with descriptors</span>
                </label>
                <textarea
                  value={seoComps}
                  onChange={e => setSeoComps(e.target.value)}
                  placeholder="Perfect for fans of [Author]'s [quality], [Author]'s [quality]..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Paragraph 3 — The Vibe Stack <span className="text-slate-400">— pop culture / cross-genre comparisons</span>
                </label>
                <textarea
                  value={seoVibeStack}
                  onChange={e => setSeoVibeStack(e.target.value)}
                  placeholder="If you love the tension of [show], the dynamics of [movie]..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Paragraph 4 — The Keyword Sink <span className="text-slate-400">— massive comma-separated keyword list</span>
                </label>
                <textarea
                  value={seoKeywordSink}
                  onChange={e => setSeoKeywordSink(e.target.value)}
                  placeholder="For readers who love: monster romance, beast romance, fated mates, primal play..."
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400 font-mono text-xs"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-200">
        <p className="text-xs text-slate-400">
          {variations.length > 0 && headlines.length > 0
            ? `${variations.length} variations, ${headlines.length} headlines ready.`
            : 'Build your ad copy, then continue to Script Builder for video ads.'}
        </p>
        <button
          onClick={onComplete}
          className="flex items-center gap-2 px-6 py-2.5 bg-pink-600 text-white text-sm font-medium rounded-lg hover:bg-pink-700 shadow-sm"
        >
          Continue to Script Builder <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
