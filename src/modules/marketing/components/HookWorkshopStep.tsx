import { useState, useRef } from 'react';
import { Lightbulb, Upload, Plus, X, Star, Quote, MessageSquare, BookOpen, ChevronRight } from 'lucide-react';
import type { AdHook } from '../../../lib/types';

interface Props {
  onComplete: () => void;
}

type HookType = 'quote' | 'declarative' | 'mini_story';

const HOOK_TYPE_INFO: Record<HookType, { label: string; description: string; icon: typeof Quote; example: string }> = {
  quote: {
    label: 'Character Quote',
    description: 'A line of dialogue that creates instant curiosity or tension. Best for spicy/dark content.',
    icon: Quote,
    example: '"I will punish you for making me wait."',
  },
  declarative: {
    label: 'Declarative Stakes',
    description: 'A factual statement that makes the reader go "wait, what?" Best for cold audiences.',
    icon: MessageSquare,
    example: 'He\'s been watching her for a year. She doesn\'t even know his name.',
  },
  mini_story: {
    label: 'Mini-Story Opening',
    description: '2-3 lines that unfold like a trailer. Each line escalates. Best for reel-style ads.',
    icon: BookOpen,
    example: 'She ran.\nHe let her.\nBecause the chase... that\'s where he comes alive.',
  },
};

interface LocalHook {
  id: string;
  text: string;
  hook_type: HookType;
  source: 'manuscript' | 'original';
  source_context: string;
  character: string;
  scene_reference: string;
  is_favorite: boolean;
}

export default function HookWorkshopStep({ onComplete }: Props) {
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [hooks, setHooks] = useState<LocalHook[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<HookType | 'all'>('all');

  // Form state
  const [hookText, setHookText] = useState('');
  const [hookType, setHookType] = useState<HookType>('quote');
  const [hookSource, setHookSource] = useState<'manuscript' | 'original'>('manuscript');
  const [hookContext, setHookContext] = useState('');
  const [hookCharacter, setHookCharacter] = useState('');
  const [hookScene, setHookScene] = useState('');

  function resetForm() {
    setHookText('');
    setHookType('quote');
    setHookSource('manuscript');
    setHookContext('');
    setHookCharacter('');
    setHookScene('');
    setShowAddForm(false);
    setEditingId(null);
  }

  function saveHook() {
    if (!hookText.trim()) return;

    if (editingId) {
      setHooks(prev => prev.map(h => h.id === editingId ? {
        ...h,
        text: hookText.trim(),
        hook_type: hookType,
        source: hookSource,
        source_context: hookContext.trim(),
        character: hookCharacter.trim(),
        scene_reference: hookScene.trim(),
      } : h));
    } else {
      setHooks(prev => [...prev, {
        id: crypto.randomUUID(),
        text: hookText.trim(),
        hook_type: hookType,
        source: hookSource,
        source_context: hookContext.trim(),
        character: hookCharacter.trim(),
        scene_reference: hookScene.trim(),
        is_favorite: false,
      }]);
    }
    resetForm();
  }

  function editHook(hook: LocalHook) {
    setHookText(hook.text);
    setHookType(hook.hook_type);
    setHookSource(hook.source);
    setHookContext(hook.source_context);
    setHookCharacter(hook.character);
    setHookScene(hook.scene_reference);
    setEditingId(hook.id);
    setShowAddForm(true);
  }

  function toggleFavorite(id: string) {
    setHooks(prev => prev.map(h => h.id === id ? { ...h, is_favorite: !h.is_favorite } : h));
  }

  function removeHook(id: string) {
    setHooks(prev => prev.filter(h => h.id !== id));
  }

  function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) return;

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const textIdx = headers.findIndex(h => h.includes('text') || h.includes('hook') || h.includes('quote'));
      const typeIdx = headers.findIndex(h => h.includes('type'));
      const charIdx = headers.findIndex(h => h.includes('character') || h.includes('speaker'));
      const sceneIdx = headers.findIndex(h => h.includes('scene') || h.includes('context'));

      const newHooks: LocalHook[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        const hookTextVal = textIdx >= 0 ? cols[textIdx] : cols[0];
        if (!hookTextVal) continue;

        let parsedType: HookType = 'quote';
        if (typeIdx >= 0) {
          const rawType = cols[typeIdx]?.toLowerCase() || '';
          if (rawType.includes('declarative') || rawType.includes('stake')) parsedType = 'declarative';
          else if (rawType.includes('mini') || rawType.includes('story')) parsedType = 'mini_story';
        }

        newHooks.push({
          id: crypto.randomUUID(),
          text: hookTextVal,
          hook_type: parsedType,
          source: 'manuscript',
          source_context: '',
          character: charIdx >= 0 ? (cols[charIdx] || '') : '',
          scene_reference: sceneIdx >= 0 ? (cols[sceneIdx] || '') : '',
          is_favorite: false,
        });
      }

      setHooks(prev => [...prev, ...newHooks]);
    };
    reader.readAsText(file);
    if (csvInputRef.current) csvInputRef.current.value = '';
  }

  const filtered = filterType === 'all' ? hooks : hooks.filter(h => h.hook_type === filterType);
  const favorites = hooks.filter(h => h.is_favorite);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-pink-500" />
            Hook Workshop
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Select hooks from your manuscript or craft original ones. The first line of the ad stops the scroll.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            onChange={handleCSVImport}
            className="hidden"
          />
          <button
            onClick={() => csvInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50"
          >
            <Upload className="w-4 h-4" /> Import Hooks CSV
          </button>
          <button
            onClick={() => { resetForm(); setShowAddForm(true); }}
            className="flex items-center gap-2 px-3 py-2 bg-pink-600 text-white text-sm rounded-lg hover:bg-pink-700"
          >
            <Plus className="w-4 h-4" /> Add Hook
          </button>
        </div>
      </div>

      {/* Hook Type Guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {(Object.entries(HOOK_TYPE_INFO) as [HookType, typeof HOOK_TYPE_INFO[HookType]][]).map(([type, info]) => {
          const Icon = info.icon;
          return (
            <div key={type} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-pink-500" />
                <h5 className="text-sm font-semibold text-slate-700">{info.label}</h5>
              </div>
              <p className="text-xs text-slate-500 mb-2">{info.description}</p>
              <p className="text-xs text-slate-400 italic">"{info.example}"</p>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="mb-6 p-5 border border-pink-200 rounded-xl bg-pink-50/50">
          <h4 className="text-sm font-semibold text-slate-700 mb-4">
            {editingId ? 'Edit Hook' : 'Add New Hook'}
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Hook Text *</label>
              <textarea
                value={hookText}
                onChange={e => setHookText(e.target.value)}
                placeholder="Write or paste your hook here..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400 bg-white"
              />
              <p className="text-xs text-slate-400 mt-1">
                {hookText.length} characters — first ~90 characters appear above the fold
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Hook Type</label>
                <select
                  value={hookType}
                  onChange={e => setHookType(e.target.value as HookType)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400 bg-white"
                >
                  <option value="quote">Character Quote</option>
                  <option value="declarative">Declarative Stakes</option>
                  <option value="mini_story">Mini-Story Opening</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Source</label>
                <select
                  value={hookSource}
                  onChange={e => setHookSource(e.target.value as 'manuscript' | 'original')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400 bg-white"
                >
                  <option value="manuscript">From Manuscript</option>
                  <option value="original">Original</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Character</label>
                <input
                  type="text"
                  value={hookCharacter}
                  onChange={e => setHookCharacter(e.target.value)}
                  placeholder="e.g., Marco, Catalina"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Scene Reference</label>
              <input
                type="text"
                value={hookScene}
                onChange={e => setHookScene(e.target.value)}
                placeholder="e.g., Chapter 12 chase scene, The first kiss in the library"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400 bg-white"
              />
            </div>

            {hookSource === 'manuscript' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Surrounding Context</label>
                <textarea
                  value={hookContext}
                  onChange={e => setHookContext(e.target.value)}
                  placeholder="Paste 2-3 lines of context around this hook from the manuscript..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400 bg-white"
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={saveHook}
                disabled={!hookText.trim()}
                className="px-4 py-2 bg-pink-600 text-white text-sm rounded-lg hover:bg-pink-700 disabled:opacity-50"
              >
                {editingId ? 'Update Hook' : 'Save Hook'}
              </button>
              <button onClick={resetForm} className="px-4 py-2 text-slate-600 text-sm rounded-lg hover:bg-slate-100">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      {hooks.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium text-slate-500">Filter:</span>
          {(['all', 'quote', 'declarative', 'mini_story'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                filterType === f
                  ? 'bg-pink-100 text-pink-700'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {f === 'all' ? 'All' : f === 'quote' ? 'Quotes' : f === 'declarative' ? 'Declarative' : 'Mini-Story'}
              {f === 'all' ? ` (${hooks.length})` : ` (${hooks.filter(h => h.hook_type === f).length})`}
            </button>
          ))}
        </div>
      )}

      {/* Hook List */}
      {filtered.length > 0 ? (
        <div className="space-y-3 mb-6">
          {filtered.map(hook => {
            const typeInfo = HOOK_TYPE_INFO[hook.hook_type];
            const TypeIcon = typeInfo.icon;
            return (
              <div
                key={hook.id}
                className={`p-4 rounded-xl border transition-colors ${
                  hook.is_favorite
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-1">
                    <TypeIcon className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">{hook.text}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        hook.hook_type === 'quote' ? 'bg-purple-100 text-purple-700' :
                        hook.hook_type === 'declarative' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {typeInfo.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        hook.source === 'manuscript' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {hook.source === 'manuscript' ? 'Manuscript' : 'Original'}
                      </span>
                      {hook.character && (
                        <span className="text-[10px] text-slate-500">by {hook.character}</span>
                      )}
                      {hook.scene_reference && (
                        <span className="text-[10px] text-slate-400">— {hook.scene_reference}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleFavorite(hook.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        hook.is_favorite ? 'text-amber-500 bg-amber-100' : 'text-slate-300 hover:text-amber-400 hover:bg-amber-50'
                      }`}
                      title="Toggle favorite"
                    >
                      <Star className="w-4 h-4" fill={hook.is_favorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => editHook(hook)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => removeHook(hook.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400 mb-6">
          <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No hooks yet. Import from a CSV or add them manually.</p>
        </div>
      )}

      {/* Favorites Summary */}
      {favorites.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-2">
            <Star className="w-4 h-4" fill="currentColor" /> Favorited Hooks ({favorites.length})
          </h4>
          <p className="text-xs text-amber-600">
            These hooks will be prioritized in the Copy Generator step.
          </p>
        </div>
      )}

      {/* Action */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-400">
          {hooks.length > 0
            ? `${hooks.length} hook(s) ready. ${favorites.length > 0 ? `${favorites.length} favorited.` : 'Star your best hooks.'}`
            : 'Add hooks to use in your ad copy, or skip to write them in the Copy Generator.'}
        </p>
        <button
          onClick={onComplete}
          className="flex items-center gap-2 px-6 py-2.5 bg-pink-600 text-white text-sm font-medium rounded-lg hover:bg-pink-700 shadow-sm"
        >
          Continue to Copy Generator <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
