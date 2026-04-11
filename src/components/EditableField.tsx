import React, { useState, useRef, useEffect } from 'react';

interface EditableNumProps {
  value: number;
  onSave: (val: number) => void;
  label: string;
  decimal?: boolean;
  prefix?: string;
}

export function EditableNum({ value, onSave, label, decimal, prefix }: EditableNumProps) {
  const [editing, setEditing] = useState(false);
  const safeValue = value ?? 0;
  const [val, setVal] = useState(safeValue.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = () => {
    const parsed = decimal ? parseFloat(val) || 0 : parseInt(val) || 0;
    onSave(parsed);
    setEditing(false);
  };

  const display = prefix ? `${prefix}${safeValue.toFixed(decimal ? 2 : 0)}` : safeValue;

  if (!editing) {
    return (
      <span
        onClick={(e) => {
          e.stopPropagation();
          setVal(safeValue.toString());
          setEditing(true);
        }}
        className="cursor-pointer hover:bg-gray-100 px-2 py-1 -mx-2 rounded-md border border-transparent hover:border-gray-200 transition-all font-medium text-gray-900 group relative flex items-center"
        title={`Edit ${label}`}
      >
        {display}
        <span className="opacity-0 group-hover:opacity-100 absolute right-1 text-gray-400">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <div className="relative flex items-center">
        {prefix && <span className="absolute left-2 text-sm text-gray-500">{prefix}</span>}
        <input
          ref={inputRef}
          type="number"
          min="0"
          step={decimal ? "0.01" : "1"}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
          className={`w-24 py-1 border border-brand-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-sm transition-shadow ${prefix ? 'pl-5 pr-2' : 'px-2'}`}
        />
      </div>
      <button onClick={handleSave} className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors" title="Save">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      </button>
      <button onClick={() => setEditing(false)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" title="Cancel">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </span>
  );
}

interface EditableTextProps {
  value: string;
  onSave: (val: string) => void;
  label: string;
  placeholder?: string;
}

export function EditableText({ value, onSave, label, placeholder }: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const safeValue = value || "";
  const [val, setVal] = useState(safeValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  const handleSave = () => {
    onSave(val);
    setEditing(false);
  };

  if (!editing) {
    return (
      <span
        onClick={(e) => {
          e.stopPropagation();
          setVal(safeValue);
          setEditing(true);
        }}
        className="cursor-pointer hover:bg-gray-100 px-2 py-1 -mx-2 rounded-md border border-transparent hover:border-gray-200 transition-all text-sm text-gray-900 group relative flex items-center min-w-[60px]"
        title={`Edit ${label}`}
      >
        {safeValue || <span className="text-gray-400 italic">Click to set {label.toLowerCase()}</span>}
        <span className="opacity-0 group-hover:opacity-100 absolute right-1 text-gray-400">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setEditing(false);
        }}
        className="flex-1 px-3 py-1.5 border border-brand-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-sm transition-shadow"
      />
      <button onClick={handleSave} className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors" title="Save">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      </button>
      <button onClick={() => setEditing(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" title="Cancel">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </span>
  );
}
