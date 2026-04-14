import React, { useState, useRef } from 'react';
import { Upload, Plus, X, BookOpen, Users, Sparkles, Heart, Search, ChevronRight } from 'lucide-react';
import type { BookAnalysis, ReaderAvatar, CompAuthor } from '../../../lib/types';

interface Props {
  onComplete: () => void;
}

const SUBGENRES = [
  'Dark Mafia Romance', 'Dark Vampire Romance', 'Monster Romance',
  'Paranormal Romance', 'Dark Romance', 'Fantasy Romance',
  'Contemporary Romance', 'Romantic Suspense',
];

const COMMON_TROPES = [
  'Enemies to Lovers', 'Forced Proximity', 'Fated Mates', 'Age Gap',
  'Arranged Marriage', 'Touch Her and Die', 'He Falls First', 'Slow Burn',
  'Who Did This to You', 'Morally Gray Hero', 'Possessive Hero',
  'Strong Heroine', 'Dark Past', 'Grumpy/Sunshine', 'One Bed',
  'Instalove', 'Forbidden Love', 'Second Chance', 'Revenge',
  'Beauty and the Beast', 'Power Couple', 'Mate Bond',
];

const FRAMEWORKS = [
  'Main Character: Hero\'s POV',
  'Main Character: Heroine\'s POV',
  'BookTok Friend: Unhinged Recommendation',
  'BookTok Friend: Tension and Dynamic',
  'Primal/Kink-Curious Reader',
  'Author Invite',
  'Avatar-Specific',
];

export default function BookAnalysisStep({ onComplete }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bookTitle, setBookTitle] = useState('');
  const [series, setSeries] = useState('');
  const [subgenre, setSubgenre] = useState('');
  const [selectedTropes, setSelectedTropes] = useState<string[]>([]);
  const [customTrope, setCustomTrope] = useState('');
  const [themes, setThemes] = useState<string[]>([]);
  const [themeInput, setThemeInput] = useState('');
  const [dynamics, setDynamics] = useState<string[]>([]);
  const [dynamicInput, setDynamicInput] = useState('');
  const [keyScenes, setKeyScenes] = useState<string[]>([]);
  const [sceneInput, setSceneInput] = useState('');
  const [toneKeywords, setToneKeywords] = useState<string[]>([]);
  const [toneInput, setToneInput] = useState('');
  const [heatLevel, setHeatLevel] = useState('');
  const [avatars, setAvatars] = useState<ReaderAvatar[]>([]);
  const [compAuthors, setCompAuthors] = useState<CompAuthor[]>([]);
  const [compName, setCompName] = useState('');
  const [compRelevance, setCompRelevance] = useState('');
  const [showAvatarForm, setShowAvatarForm] = useState(false);
  const [csvImported, setCsvImported] = useState(false);

  // Avatar form state
  const [avatarName, setAvatarName] = useState('');
  const [avatarDesc, setAvatarDesc] = useState('');
  const [avatarDesires, setAvatarDesires] = useState('');
  const [avatarTropes, setAvatarTropes] = useState('');
  const [avatarFramework, setAvatarFramework] = useState('');

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) return;

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const rows = lines.slice(1);

      // Parse CSV - flexible column matching
      const titleIdx = headers.findIndex(h => h.includes('title') || h.includes('book'));
      const seriesIdx = headers.findIndex(h => h.includes('series'));
      const subgenreIdx = headers.findIndex(h => h.includes('subgenre') || h.includes('genre'));
      const tropesIdx = headers.findIndex(h => h.includes('trope'));
      const themesIdx = headers.findIndex(h => h.includes('theme'));
      const dynamicsIdx = headers.findIndex(h => h.includes('dynamic') || h.includes('character'));
      const scenesIdx = headers.findIndex(h => h.includes('scene') || h.includes('key'));
      const toneIdx = headers.findIndex(h => h.includes('tone') || h.includes('keyword'));
      const heatIdx = headers.findIndex(h => h.includes('heat') || h.includes('spice'));

      // Use first data row for single-book import
      if (rows.length > 0) {
        const cols = rows[0].split(',').map(c => c.trim());
        if (titleIdx >= 0 && cols[titleIdx]) setBookTitle(cols[titleIdx]);
        if (seriesIdx >= 0 && cols[seriesIdx]) setSeries(cols[seriesIdx]);
        if (subgenreIdx >= 0 && cols[subgenreIdx]) setSubgenre(cols[subgenreIdx]);
        if (tropesIdx >= 0 && cols[tropesIdx]) {
          setSelectedTropes(cols[tropesIdx].split(';').map(t => t.trim()).filter(Boolean));
        }
        if (themesIdx >= 0 && cols[themesIdx]) {
          setThemes(cols[themesIdx].split(';').map(t => t.trim()).filter(Boolean));
        }
        if (dynamicsIdx >= 0 && cols[dynamicsIdx]) {
          setDynamics(cols[dynamicsIdx].split(';').map(d => d.trim()).filter(Boolean));
        }
        if (scenesIdx >= 0 && cols[scenesIdx]) {
          setKeyScenes(cols[scenesIdx].split(';').map(s => s.trim()).filter(Boolean));
        }
        if (toneIdx >= 0 && cols[toneIdx]) {
          setToneKeywords(cols[toneIdx].split(';').map(t => t.trim()).filter(Boolean));
        }
        if (heatIdx >= 0 && cols[heatIdx]) setHeatLevel(cols[heatIdx]);
        setCsvImported(true);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function addTag(list: string[], setList: (v: string[]) => void, value: string, setValue: (v: string) => void) {
    if (value.trim() && !list.includes(value.trim())) {
      setList([...list, value.trim()]);
      setValue('');
    }
  }

  function removeTag(list: string[], setList: (v: string[]) => void, index: number) {
    setList(list.filter((_, i) => i !== index));
  }

  function toggleTrope(trope: string) {
    setSelectedTropes(prev =>
      prev.includes(trope) ? prev.filter(t => t !== trope) : [...prev, trope]
    );
  }

  function addCompAuthor() {
    if (compName.trim()) {
      setCompAuthors([...compAuthors, {
        name: compName.trim(),
        relevance: compRelevance.trim() || 'Similar subgenre',
        source: null,
      }]);
      setCompName('');
      setCompRelevance('');
    }
  }

  function addAvatar() {
    if (avatarName.trim()) {
      setAvatars([...avatars, {
        id: crypto.randomUUID(),
        name: avatarName.trim(),
        description: avatarDesc.trim(),
        desires: avatarDesires.split(',').map(d => d.trim()).filter(Boolean),
        tropes_searched: avatarTropes.split(',').map(t => t.trim()).filter(Boolean),
        framework: avatarFramework,
      }]);
      setAvatarName('');
      setAvatarDesc('');
      setAvatarDesires('');
      setAvatarTropes('');
      setAvatarFramework('');
      setShowAvatarForm(false);
    }
  }

  const canProceed = bookTitle.trim() && subgenre && selectedTropes.length > 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-pink-500" />
            Book Analysis
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Define your book's themes, tropes, character dynamics, and reader personas. This data drives every ad.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50"
          >
            <Upload className="w-4 h-4" /> Import CSV
          </button>
        </div>
      </div>

      {csvImported && (
        <div className="mb-6 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          CSV imported successfully. Review and adjust the data below.
        </div>
      )}

      <div className="space-y-8">
        {/* Book Details */}
        <section>
          <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Book Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Book Title *</label>
              <input
                type="text"
                value={bookTitle}
                onChange={e => setBookTitle(e.target.value)}
                placeholder="e.g., My Brutal Beast"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Series</label>
              <input
                type="text"
                value={series}
                onChange={e => setSeries(e.target.value)}
                placeholder="e.g., Claimed by Beasts"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Subgenre *</label>
              <select
                value={subgenre}
                onChange={e => setSubgenre(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400"
              >
                <option value="">Select subgenre...</option>
                {SUBGENRES.map(sg => (
                  <option key={sg} value={sg}>{sg}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">Heat Level</label>
            <div className="flex gap-2">
              {['Closed Door', 'Fade to Black', 'Steamy', 'Explicit', 'Dark + Explicit'].map(level => (
                <button
                  key={level}
                  onClick={() => setHeatLevel(level)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    heatLevel === level
                      ? 'bg-pink-100 text-pink-700 border-2 border-pink-300'
                      : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Tropes */}
        <section>
          <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-500" /> Tropes *
          </h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {COMMON_TROPES.map(trope => (
              <button
                key={trope}
                onClick={() => toggleTrope(trope)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedTropes.includes(trope)
                    ? 'bg-pink-100 text-pink-700 border border-pink-300'
                    : 'bg-slate-100 text-slate-600 border border-transparent hover:bg-slate-200'
                }`}
              >
                {trope}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customTrope}
              onChange={e => setCustomTrope(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTag(selectedTropes, setSelectedTropes, customTrope, setCustomTrope)}
              placeholder="Add custom trope..."
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400"
            />
            <button
              onClick={() => addTag(selectedTropes, setSelectedTropes, customTrope, setCustomTrope)}
              className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Themes */}
        <section>
          <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Themes</h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {themes.map((theme, i) => (
              <span key={i} className="flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                {theme}
                <button onClick={() => removeTag(themes, setThemes, i)} className="hover:text-purple-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={themeInput}
              onChange={e => setThemeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTag(themes, setThemes, themeInput, setThemeInput)}
              placeholder="e.g., Power and control, Redemption, Identity..."
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400"
            />
            <button
              onClick={() => addTag(themes, setThemes, themeInput, setThemeInput)}
              className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Character Dynamics */}
        <section>
          <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Character Dynamics</h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {dynamics.map((d, i) => (
              <span key={i} className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                {d}
                <button onClick={() => removeTag(dynamics, setDynamics, i)} className="hover:text-blue-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={dynamicInput}
              onChange={e => setDynamicInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTag(dynamics, setDynamics, dynamicInput, setDynamicInput)}
              placeholder="e.g., He kneels for her, She carries a knife on her thigh..."
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400"
            />
            <button
              onClick={() => addTag(dynamics, setDynamics, dynamicInput, setDynamicInput)}
              className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Key Scenes */}
        <section>
          <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Key Scenes / Moments</h4>
          <div className="space-y-2 mb-3">
            {keyScenes.map((scene, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2 bg-amber-50 rounded-lg text-sm text-amber-800">
                <span className="flex-1">{scene}</span>
                <button onClick={() => removeTag(keyScenes, setKeyScenes, i)} className="hover:text-amber-900 shrink-0 mt-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={sceneInput}
              onChange={e => setSceneInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTag(keyScenes, setKeyScenes, sceneInput, setSceneInput)}
              placeholder="e.g., The chase scene in Chapter 12, The first kiss in the library..."
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400"
            />
            <button
              onClick={() => addTag(keyScenes, setKeyScenes, sceneInput, setSceneInput)}
              className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Tone Keywords */}
        <section>
          <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Tone Keywords</h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {toneKeywords.map((kw, i) => (
              <span key={i} className="flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                {kw}
                <button onClick={() => removeTag(toneKeywords, setToneKeywords, i)} className="hover:text-slate-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={toneInput}
              onChange={e => setToneInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTag(toneKeywords, setToneKeywords, toneInput, setToneInput)}
              placeholder="e.g., Dark, Intense, Tender, Possessive, Playful..."
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400"
            />
            <button
              onClick={() => addTag(toneKeywords, setToneKeywords, toneInput, setToneInput)}
              className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Comp Authors */}
        <section>
          <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-pink-500" /> Comp Authors
          </h4>
          <p className="text-xs text-slate-500 mb-3">
            Add authors whose readers overlap with this book. Include why they're relevant — not just big names, but viral and trending authors whose audience matches.
          </p>
          {compAuthors.length > 0 && (
            <div className="space-y-2 mb-3">
              {compAuthors.map((comp, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-slate-800">{comp.name}</span>
                    <span className="text-xs text-slate-500 ml-2">— {comp.relevance}</span>
                    {comp.source && <span className="text-xs text-pink-500 ml-2">({comp.source})</span>}
                  </div>
                  <button
                    onClick={() => setCompAuthors(compAuthors.filter((_, idx) => idx !== i))}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={compName}
              onChange={e => setCompName(e.target.value)}
              placeholder="Author name"
              className="w-40 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400"
            />
            <input
              type="text"
              value={compRelevance}
              onChange={e => setCompRelevance(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCompAuthor()}
              placeholder="Why they're relevant (e.g., dark mafia worlds, possessive alphas)"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400"
            />
            <button
              onClick={addCompAuthor}
              className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Reader Avatars */}
        <section>
          <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-pink-500" /> Reader Avatars
          </h4>
          <p className="text-xs text-slate-500 mb-3">
            Define the specific reader types for this book. Each avatar gets its own primary text variation in the ad copy.
          </p>

          {avatars.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {avatars.map((avatar, i) => (
                <div key={avatar.id} className="p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl border border-pink-100">
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="text-sm font-semibold text-pink-800">{avatar.name}</h5>
                    <button
                      onClick={() => setAvatars(avatars.filter((_, idx) => idx !== i))}
                      className="text-pink-300 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 mb-2">{avatar.description}</p>
                  <div className="text-xs text-slate-500">
                    <span className="font-medium">Framework:</span> {avatar.framework}
                  </div>
                  {avatar.desires.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {avatar.desires.map((d, j) => (
                        <span key={j} className="px-2 py-0.5 bg-white/60 text-pink-700 rounded text-[10px]">{d}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {showAvatarForm ? (
            <div className="p-4 border border-pink-200 rounded-xl bg-pink-50/50 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Avatar Name</label>
                  <input
                    type="text"
                    value={avatarName}
                    onChange={e => setAvatarName(e.target.value)}
                    placeholder="e.g., The Primal Reader"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Framework</label>
                  <select
                    value={avatarFramework}
                    onChange={e => setAvatarFramework(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400 bg-white"
                  >
                    <option value="">Select framework...</option>
                    {FRAMEWORKS.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea
                  value={avatarDesc}
                  onChange={e => setAvatarDesc(e.target.value)}
                  placeholder="Who is this reader? What are they looking for?"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Desires (comma-separated)</label>
                <input
                  type="text"
                  value={avatarDesires}
                  onChange={e => setAvatarDesires(e.target.value)}
                  placeholder="e.g., body worship, being chosen, primal energy"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tropes She Searches For (comma-separated)</label>
                <input
                  type="text"
                  value={avatarTropes}
                  onChange={e => setAvatarTropes(e.target.value)}
                  placeholder="e.g., monster romance, fated mates, possessive hero"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400 bg-white"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={addAvatar}
                  disabled={!avatarName.trim()}
                  className="px-4 py-2 bg-pink-600 text-white text-sm rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Avatar
                </button>
                <button
                  onClick={() => setShowAvatarForm(false)}
                  className="px-4 py-2 text-slate-600 text-sm rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAvatarForm(true)}
              className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-pink-200 text-pink-600 text-sm rounded-xl hover:bg-pink-50 w-full justify-center"
            >
              <Plus className="w-4 h-4" /> Add Reader Avatar
            </button>
          )}
        </section>

        {/* Action */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-400">
            {canProceed
              ? 'Book analysis ready. Continue to Creative Studio or save to revisit later.'
              : 'Fill in book title, subgenre, and at least one trope to continue.'}
          </p>
          <button
            onClick={onComplete}
            disabled={!canProceed}
            className="flex items-center gap-2 px-6 py-2.5 bg-pink-600 text-white text-sm font-medium rounded-lg hover:bg-pink-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to Creative Studio <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
