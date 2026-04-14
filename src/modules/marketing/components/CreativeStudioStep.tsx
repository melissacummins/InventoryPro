import React, { useState, useRef } from 'react';
import { Upload, ImagePlus, Film, Layers, FolderOpen, Wand2, ChevronRight, X, Eye, Plus } from 'lucide-react';
import type { AdCreative, CreativeType } from '../../../lib/types';

interface Props {
  onComplete: () => void;
}

interface LocalCreative {
  id: string;
  name: string;
  type: CreativeType;
  source: 'upload' | 'dropbox' | 'generated';
  previewUrl: string | null;
  file: File | null;
  tags: string[];
}

export default function CreativeStudioStep({ onComplete }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [creatives, setCreatives] = useState<LocalCreative[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [showGenerate, setShowGenerate] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [generateType, setGenerateType] = useState<'image' | 'video'>('image');

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const isVideo = file.type.startsWith('video/');
      const url = URL.createObjectURL(file);

      setCreatives(prev => [...prev, {
        id: crypto.randomUUID(),
        name: file.name,
        type: isVideo ? 'video' : 'image',
        source: 'upload',
        previewUrl: url,
        file,
        tags: [],
      }]);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeCreative(id: string) {
    const creative = creatives.find(c => c.id === id);
    if (creative?.previewUrl) URL.revokeObjectURL(creative.previewUrl);
    setCreatives(prev => prev.filter(c => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function addTagToCreative(id: string) {
    if (!tagInput.trim()) return;
    setCreatives(prev => prev.map(c =>
      c.id === id ? { ...c, tags: [...c.tags, tagInput.trim()] } : c
    ));
    setTagInput('');
  }

  function removeTagFromCreative(creativeId: string, tagIndex: number) {
    setCreatives(prev => prev.map(c =>
      c.id === creativeId
        ? { ...c, tags: c.tags.filter((_, i) => i !== tagIndex) }
        : c
    ));
  }

  const selected = creatives.find(c => c.id === selectedId);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <ImagePlus className="w-5 h-5 text-pink-500" />
            Creative Studio
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Upload existing ad imagery, connect to Dropbox, or generate new creatives.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Upload & Sources */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-pink-300 hover:bg-pink-50/50 transition-colors"
            >
              <Upload className="w-8 h-8 text-slate-400" />
              <span className="text-sm font-medium text-slate-600">Upload Files</span>
              <span className="text-xs text-slate-400">Images & videos</span>
            </button>

            <button
              className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-colors group"
              onClick={() => {/* Dropbox integration — future */}}
            >
              <FolderOpen className="w-8 h-8 text-slate-400 group-hover:text-blue-500" />
              <span className="text-sm font-medium text-slate-600">Dropbox</span>
              <span className="text-xs text-slate-400">Connect folder</span>
            </button>

            <button
              onClick={() => setShowGenerate(true)}
              className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-purple-300 hover:bg-purple-50/50 transition-colors group"
            >
              <Wand2 className="w-8 h-8 text-slate-400 group-hover:text-purple-500" />
              <span className="text-sm font-medium text-slate-600">Generate</span>
              <span className="text-xs text-slate-400">AI image or video</span>
            </button>
          </div>

          {/* Generate Modal Inline */}
          {showGenerate && (
            <div className="p-5 border border-purple-200 rounded-xl bg-purple-50/50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-purple-800 flex items-center gap-2">
                  <Wand2 className="w-4 h-4" /> Generate Creative
                </h4>
                <button onClick={() => setShowGenerate(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setGenerateType('image')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                      generateType === 'image'
                        ? 'bg-purple-100 text-purple-700 border border-purple-300'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    <ImagePlus className="w-4 h-4" /> Image
                  </button>
                  <button
                    onClick={() => setGenerateType('video')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                      generateType === 'video'
                        ? 'bg-purple-100 text-purple-700 border border-purple-300'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    <Film className="w-4 h-4" /> Video
                  </button>
                </div>
                <textarea
                  value={generatePrompt}
                  onChange={e => setGeneratePrompt(e.target.value)}
                  placeholder="Describe the creative you want to generate... (e.g., 'Dark moody image of a vampire king standing in shadows, gothic castle background, book cover aesthetic')"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 bg-white"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Requires API key configuration. See Settings for setup.
                  </p>
                  <button
                    disabled={!generatePrompt.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Wand2 className="w-4 h-4" /> Generate
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Creative Gallery */}
          {creatives.length > 0 ? (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Your Creatives ({creatives.length})</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {creatives.map(creative => (
                  <div
                    key={creative.id}
                    onClick={() => setSelectedId(creative.id)}
                    className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                      selectedId === creative.id
                        ? 'border-pink-400 shadow-lg shadow-pink-500/10'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="aspect-square bg-slate-100 flex items-center justify-center">
                      {creative.previewUrl && creative.type === 'image' ? (
                        <img src={creative.previewUrl} alt={creative.name} className="w-full h-full object-cover" />
                      ) : creative.previewUrl && creative.type === 'video' ? (
                        <video src={creative.previewUrl} className="w-full h-full object-cover" muted />
                      ) : (
                        <div className="text-center p-4">
                          {creative.type === 'video' ? (
                            <Film className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                          ) : (
                            <ImagePlus className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                          )}
                          <span className="text-xs text-slate-400">{creative.type}</span>
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); removeCreative(creative.id); }}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-xs text-white truncate">{creative.name}</p>
                    </div>
                    {selectedId === creative.id && (
                      <div className="absolute top-2 left-2 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No creatives yet. Upload images/videos or generate new ones.</p>
            </div>
          )}
        </div>

        {/* Right: Selected Creative Details */}
        <div className="lg:col-span-1">
          {selected ? (
            <div className="sticky top-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Selected Creative</h4>
              <div className="aspect-video bg-slate-200 rounded-lg overflow-hidden mb-3">
                {selected.previewUrl && selected.type === 'image' ? (
                  <img src={selected.previewUrl} alt={selected.name} className="w-full h-full object-cover" />
                ) : selected.previewUrl && selected.type === 'video' ? (
                  <video src={selected.previewUrl} className="w-full h-full object-cover" controls muted />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-sm text-slate-400">No preview</span>
                  </div>
                )}
              </div>
              <p className="text-sm font-medium text-slate-800 truncate">{selected.name}</p>
              <p className="text-xs text-slate-500 mb-3">
                {selected.type === 'video' ? 'Video' : 'Image'} — {selected.source}
              </p>

              {/* Tags */}
              <div className="mb-3">
                <label className="text-xs font-medium text-slate-600 mb-1 block">Tags</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {selected.tags.map((tag, i) => (
                    <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-pink-50 text-pink-700 rounded text-xs">
                      {tag}
                      <button onClick={() => removeTagFromCreative(selected.id, i)}>
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTagToCreative(selected.id)}
                    placeholder="Add tag..."
                    className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-pink-400"
                  />
                  <button
                    onClick={() => addTagToCreative(selected.id)}
                    className="px-2 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <Eye className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Select a creative to see details</p>
            </div>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-200">
        <p className="text-xs text-slate-400">
          {creatives.length > 0
            ? `${creatives.length} creative(s) ready. You can proceed without selecting one.`
            : 'Upload or generate creatives, or skip to work with hooks first.'}
        </p>
        <button
          onClick={onComplete}
          className="flex items-center gap-2 px-6 py-2.5 bg-pink-600 text-white text-sm font-medium rounded-lg hover:bg-pink-700 shadow-sm"
        >
          Continue to Hook Workshop <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
