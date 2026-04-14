import { useState } from 'react';
import { Plus, X, Users, Search, Sparkles } from 'lucide-react';
import type { ReaderAvatar, CompAuthor } from '../../../lib/types';

interface Props {
  themes: string[]; setThemes: (v: string[]) => void;
  dynamics: string[]; setDynamics: (v: string[]) => void;
  keyScenes: string[]; setKeyScenes: (v: string[]) => void;
  toneKeywords: string[]; setToneKeywords: (v: string[]) => void;
  compAuthors: CompAuthor[]; setCompAuthors: (v: CompAuthor[]) => void;
  avatars: ReaderAvatar[]; setAvatars: (v: ReaderAvatar[]) => void;
}

function TagSection({ label, color, items, setItems, placeholder }: {
  label: string; color: string; items: string[]; setItems: (v: string[]) => void; placeholder: string;
}) {
  const [input, setInput] = useState('');
  const colorMap: Record<string, string> = {
    purple: 'bg-purple-50 text-purple-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-800',
    slate: 'bg-slate-100 text-slate-700',
  };
  const tagColor = colorMap[color] || colorMap.slate;

  function add() {
    if (input.trim() && !items.includes(input.trim())) {
      setItems([...items, input.trim()]);
      setInput('');
    }
  }

  return (
    <section>
      <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-pink-400" />
        {label}
        <span className="text-[10px] font-normal text-pink-400 bg-pink-50 px-1.5 py-0.5 rounded">AI Generated</span>
      </h4>
      <div className="flex flex-wrap gap-2 mb-3">
        {items.map((item, i) => (
          <span key={i} className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${tagColor}`}>
            {item}
            <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="hover:opacity-70">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={placeholder}
          className="flex-1 max-w-sm px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400"
        />
        <button onClick={add} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}

export default function AIAnalysisResults({
  themes, setThemes, dynamics, setDynamics,
  keyScenes, setKeyScenes, toneKeywords, setToneKeywords,
  compAuthors, setCompAuthors, avatars, setAvatars,
}: Props) {
  const [compName, setCompName] = useState('');
  const [compRelevance, setCompRelevance] = useState('');

  function addComp() {
    if (compName.trim()) {
      setCompAuthors([...compAuthors, { name: compName.trim(), relevance: compRelevance.trim() || 'Similar subgenre', source: null }]);
      setCompName(''); setCompRelevance('');
    }
  }

  return (
    <div className="space-y-8">
      <TagSection label="Themes" color="purple" items={themes} setItems={setThemes} placeholder="Add a theme..." />
      <TagSection label="Character Dynamics" color="blue" items={dynamics} setItems={setDynamics} placeholder="Add a dynamic..." />
      <TagSection label="Key Scenes" color="amber" items={keyScenes} setItems={setKeyScenes} placeholder="Add a scene..." />
      <TagSection label="Tone Keywords" color="slate" items={toneKeywords} setItems={setToneKeywords} placeholder="Add a keyword..." />

      {/* Comp Authors */}
      <section>
        <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-pink-400" />
          Comp Authors
          <span className="text-[10px] font-normal text-pink-400 bg-pink-50 px-1.5 py-0.5 rounded">AI Generated</span>
        </h4>
        <p className="text-xs text-slate-500 mb-3">
          Authors whose readers overlap with this book. Edit relevance or add your own.
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
                <button onClick={() => setCompAuthors(compAuthors.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input type="text" value={compName} onChange={e => setCompName(e.target.value)} placeholder="Author name"
            className="w-40 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400" />
          <input type="text" value={compRelevance} onChange={e => setCompRelevance(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addComp()} placeholder="Why they're relevant"
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400" />
          <button onClick={addComp} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Reader Avatars */}
      <section>
        <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-pink-400" />
          Reader Avatars
          <span className="text-[10px] font-normal text-pink-400 bg-pink-50 px-1.5 py-0.5 rounded">AI Generated</span>
        </h4>
        <p className="text-xs text-slate-500 mb-3">
          Each avatar gets its own primary text variation in the ad copy.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {avatars.map((avatar, i) => (
            <div key={avatar.id} className="p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl border border-pink-100">
              <div className="flex items-start justify-between mb-2">
                <h5 className="text-sm font-semibold text-pink-800">{avatar.name}</h5>
                <button onClick={() => setAvatars(avatars.filter((_, idx) => idx !== i))} className="text-pink-300 hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-slate-600 mb-2">{avatar.description}</p>
              <div className="text-xs text-slate-500"><span className="font-medium">Framework:</span> {avatar.framework}</div>
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
      </section>
    </div>
  );
}
