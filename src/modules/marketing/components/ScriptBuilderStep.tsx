import { useState } from 'react';
import { Film, Plus, X, GripVertical, Clock, AlertTriangle, Copy, Check, Upload, Download } from 'lucide-react';

interface Segment {
  id: string;
  order: number;
  startTime: number;
  endTime: number;
  text: string;
  notes: string;
}

const MAX_SEGMENT_DURATION = 2.0; // seconds — hard rule

const DEFAULT_SEGMENTS: Segment[] = [
  { id: crypto.randomUUID(), order: 1, startTime: 0, endTime: 1.5, text: '', notes: 'Hook — strongest line, stops the scroll' },
  { id: crypto.randomUUID(), order: 2, startTime: 1.5, endTime: 3, text: '', notes: 'Second beat — deepens the mystery' },
  { id: crypto.randomUUID(), order: 3, startTime: 3, endTime: 4.5, text: '', notes: 'Escalation — stakes get higher' },
  { id: crypto.randomUUID(), order: 4, startTime: 4.5, endTime: 6, text: '', notes: 'Twist or beat drop moment' },
  { id: crypto.randomUUID(), order: 5, startTime: 6, endTime: 8, text: '', notes: 'Tension peak' },
  { id: crypto.randomUUID(), order: 6, startTime: 8, endTime: 9.5, text: '', notes: 'Resolution tease' },
  { id: crypto.randomUUID(), order: 7, startTime: 9.5, endTime: 12, text: '', notes: 'Book cover + Title + CTA' },
];

export default function ScriptBuilderStep() {
  const [segments, setSegments] = useState<Segment[]>(DEFAULT_SEGMENTS);
  const [scriptName, setScriptName] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);

  function updateSegment(id: string, field: keyof Segment, value: string | number) {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }

  function addSegment() {
    const lastSegment = segments[segments.length - 1];
    const nextStart = lastSegment ? lastSegment.endTime : 0;
    setSegments(prev => [...prev, {
      id: crypto.randomUUID(),
      order: prev.length + 1,
      startTime: nextStart,
      endTime: nextStart + 1.5,
      text: '',
      notes: '',
    }]);
  }

  function removeSegment(id: string) {
    setSegments(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })));
  }

  function getDuration(seg: Segment) {
    return Math.round((seg.endTime - seg.startTime) * 10) / 10;
  }

  function isOverDuration(seg: Segment) {
    return getDuration(seg) > MAX_SEGMENT_DURATION;
  }

  const totalDuration = segments.length > 0 ? segments[segments.length - 1].endTime : 0;
  const hasOverDuration = segments.some(isOverDuration);
  const hasEmptyText = segments.some(s => !s.text.trim());

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}:${secs.toFixed(1).padStart(4, '0')}`;
    return `${secs.toFixed(1)}s`;
  }

  function copyScript() {
    const lines = segments.map(s =>
      `${formatTime(s.startTime)}–${formatTime(s.endTime)} | ${s.text}`
    ).join('\n');
    const header = scriptName ? `# ${scriptName}\n\n` : '';
    navigator.clipboard.writeText(header + lines);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  function exportCSV() {
    const header = 'Start,End,Duration,Text,Notes\n';
    const rows = segments.map(s =>
      `${s.startTime},${s.endTime},${getDuration(s)},"${s.text.replace(/"/g, '""')}","${s.notes.replace(/"/g, '""')}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scriptName || 'reel-script'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Film className="w-5 h-5 text-pink-500" />
            Script Builder
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Build time-coded reel scripts. Each segment must be 2 seconds or less for optimal pacing.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyScript}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50"
          >
            {copiedAll ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copiedAll ? 'Copied' : 'Copy Script'}
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Script Name & Stats */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={scriptName}
            onChange={e => setScriptName(e.target.value)}
            placeholder="Script name (e.g., MBB Chase Scene Reel)"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pink-400"
          />
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className={`font-medium ${totalDuration > 12 ? 'text-amber-600' : 'text-slate-700'}`}>
              {formatTime(totalDuration)} total
            </span>
            {totalDuration > 12 && (
              <span className="text-xs text-amber-500">(target 10-12s)</span>
            )}
          </div>
          <div className="text-slate-400">|</div>
          <span className="text-slate-600">{segments.length} segments</span>
        </div>
      </div>

      {/* Duration Warning */}
      {hasOverDuration && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700">
            One or more segments exceed 2 seconds. Each text card should be readable in 2 seconds or less.
          </p>
        </div>
      )}

      {/* Segments Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
        {/* Header */}
        <div className="grid grid-cols-[40px_100px_100px_60px_1fr_140px_40px] gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <div>#</div>
          <div>Start</div>
          <div>End</div>
          <div>Dur.</div>
          <div>On-Screen Text</div>
          <div>Notes</div>
          <div></div>
        </div>

        {/* Rows */}
        {segments.map((seg, i) => {
          const duration = getDuration(seg);
          const overDuration = duration > MAX_SEGMENT_DURATION;

          return (
            <div
              key={seg.id}
              className={`grid grid-cols-[40px_100px_100px_60px_1fr_140px_40px] gap-2 px-4 py-3 border-b border-slate-100 items-center ${
                overDuration ? 'bg-amber-50/50' : 'hover:bg-slate-50'
              }`}
            >
              <div className="text-xs text-slate-400 font-medium">{i + 1}</div>
              <div>
                <input
                  type="number"
                  value={seg.startTime}
                  onChange={e => updateSegment(seg.id, 'startTime', parseFloat(e.target.value) || 0)}
                  step={0.5}
                  min={0}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:border-pink-400 text-center"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={seg.endTime}
                  onChange={e => updateSegment(seg.id, 'endTime', parseFloat(e.target.value) || 0)}
                  step={0.5}
                  min={0}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:border-pink-400 text-center"
                />
              </div>
              <div className={`text-xs font-medium text-center ${overDuration ? 'text-amber-600' : 'text-slate-500'}`}>
                {duration}s
                {overDuration && <AlertTriangle className="w-3 h-3 text-amber-500 inline ml-0.5" />}
              </div>
              <div>
                <input
                  type="text"
                  value={seg.text}
                  onChange={e => updateSegment(seg.id, 'text', e.target.value)}
                  placeholder="Text that appears on screen..."
                  className={`w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:border-pink-400 ${
                    !seg.text.trim() ? 'border-slate-200 bg-white' : 'border-green-200 bg-green-50/30'
                  }`}
                />
              </div>
              <div>
                <input
                  type="text"
                  value={seg.notes}
                  onChange={e => updateSegment(seg.id, 'notes', e.target.value)}
                  placeholder="Notes..."
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs text-slate-500 focus:outline-none focus:border-pink-400"
                />
              </div>
              <div>
                <button
                  onClick={() => removeSegment(seg.id)}
                  className="p-1 text-slate-300 hover:text-red-500 rounded"
                  title="Remove segment"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Segment */}
      <button
        onClick={addSegment}
        className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-200 text-slate-500 text-sm rounded-xl hover:border-pink-200 hover:text-pink-600 w-full justify-center mb-6"
      >
        <Plus className="w-4 h-4" /> Add Segment
      </button>

      {/* Visual Timeline Preview */}
      {segments.some(s => s.text.trim()) && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Timeline Preview</h4>
          <div className="relative">
            <div className="flex gap-1 h-20 rounded-xl overflow-hidden border border-slate-200">
              {segments.map((seg, i) => {
                const widthPercent = totalDuration > 0 ? (getDuration(seg) / totalDuration) * 100 : 0;
                const overDuration = getDuration(seg) > MAX_SEGMENT_DURATION;
                return (
                  <div
                    key={seg.id}
                    style={{ width: `${widthPercent}%` }}
                    className={`flex flex-col items-center justify-center p-1 text-center min-w-0 ${
                      overDuration
                        ? 'bg-amber-100 border-r border-amber-200'
                        : i % 2 === 0
                        ? 'bg-pink-50 border-r border-pink-100'
                        : 'bg-purple-50 border-r border-purple-100'
                    }`}
                  >
                    <span className="text-[9px] text-slate-400 font-mono">{formatTime(seg.startTime)}</span>
                    <span className="text-[10px] text-slate-700 font-medium truncate w-full px-1">
                      {seg.text || '...'}
                    </span>
                    <span className="text-[9px] text-slate-400">{getDuration(seg)}s</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
        <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Script Principles</h4>
        <ul className="text-xs text-slate-500 space-y-1">
          <li>Each text card: 2 seconds or less for readability</li>
          <li>Total length: 10-12 seconds (full watch-throughs boost algorithm)</li>
          <li>First frame: immediate curiosity — declarative statements beat conditional ones</li>
          <li>Each card should escalate — build like a thriller trailer</li>
          <li>End with book cover, title, and simple CTA</li>
        </ul>
      </div>
    </div>
  );
}
