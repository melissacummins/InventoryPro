import React, { useState, ChangeEvent, useEffect } from 'react';
import { DailyRecord } from '../types';
import { Upload, Plus, CheckCircle, Save, X, FileText, ArrowRight, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

interface DataEntryProps {
  existingData?: DailyRecord[];
  onAddRecord: (record: DailyRecord) => void;
  onBulkAdd: (records: DailyRecord[]) => void;
  onBulkMerge?: (records: Partial<DailyRecord>[]) => void;
  editingRecord?: DailyRecord | null;
  onUpdateRecord?: (record: DailyRecord) => void;
  onCancelEdit?: () => void;
}

interface FieldConfig {
  key: string;
  label: string;
  required?: boolean;
  aliases?: string[];
}

const FIELD_MAPPING_CONFIG: FieldConfig[] = [
  { key: 'date', label: 'Date', required: true, aliases: ['Day', 'Time'] },
  { key: 'pnrAds', label: 'PNR Ads', aliases: ['PNR', 'PNR Spend', 'PNR Ad Spend'] },
  { key: 'contempAds', label: 'Contemp Ads', aliases: ['Contemp', 'Contemp Spend', 'Contemp Ad Spend'] },
  { key: 'trafficAds', label: 'Traffic Ads', aliases: ['Traffic', 'Traffic Spend', 'Traffic Ad Spend'] },
  { key: 'miscAds', label: 'Misc Ads', aliases: ['Misc', 'Misc Spend', 'Other', 'Other Ads'] },
  { key: 'shopifyRev', label: 'Shopify Revenue', aliases: ['Shopify', 'Shopify Sales'] },
  { key: 'amazonRev', label: 'Amazon Revenue', aliases: ['Amazon', 'Amazon Sales', 'KDP', 'Kindle', 'Kindle Direct Publishing'] },
  { key: 'd2dRev', label: 'Draft2Digital Revenue', aliases: ['Draft2Digital', 'D2D', 'Draft 2 Digital'] },
  { key: 'googleRev', label: 'Google Play Revenue', aliases: ['Google Play', 'Google', 'GooglePlay', 'Google Play Books'] },
  { key: 'koboRev', label: 'Kobo Revenue', aliases: ['Kobo', 'Rakuten Kobo', 'Kobo Writing Life'] },
  { key: 'koboPlusRev', label: 'Kobo Plus Revenue', aliases: ['Kobo Plus', 'KoboPlus'] },
];

export const DataEntry: React.FC<DataEntryProps> = ({ 
  existingData = [],
  onAddRecord, 
  onBulkAdd,
  onBulkMerge,
  editingRecord,
  onUpdateRecord,
  onCancelEdit
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'csv'>('manual');
  
  // CSV Import State
  const [targetCategory, setTargetCategory] = useState<string>('');
  
  // Manual Entry State
  const [formData, setFormData] = useState<Partial<DailyRecord>>({
    date: new Date().toISOString().split('T')[0],
  });
  
  const [lastCheckedDate, setLastCheckedDate] = useState<string>('');
  const [dateMatchId, setDateMatchId] = useState<string | null>(null);
  
  // CSV Import State
  const [importStep, setImportStep] = useState<'upload' | 'mapping'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, number>>({}); // fieldKey -> headerIndex
  const [fileName, setFileName] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Handle Explicit Edit Mode (via props)
  useEffect(() => {
    if (editingRecord) {
      setActiveTab('manual');
      setFormData({ ...editingRecord });
      setDateMatchId(editingRecord.id);
      setLastCheckedDate(editingRecord.date);
    }
  }, [editingRecord]);

  // 2. Handle Date Lookup (Auto-load existing data for selected date)
  useEffect(() => {
      // Only run if not in explicit edit mode (i.e. we are in default "Add" mode)
      if (!editingRecord && activeTab === 'manual') {
          const currentDate = formData.date || '';
          
          // Only perform lookup if the date has changed since last check
          // (This prevents overwriting user input while they type in other fields)
          if (currentDate !== lastCheckedDate) {
              setLastCheckedDate(currentDate);
              
              const found = existingData.find(r => r.date === currentDate);
              
              if (found) {
                  // Found existing record for this date -> Load it
                  setFormData({ ...found });
                  setDateMatchId(found.id);
                  setSuccessMsg(`Loaded existing data for ${new Date(currentDate).toLocaleDateString()}.`);
                  setTimeout(() => setSuccessMsg(''), 2000);
              } else {
                  // No record found -> Reset fields to zero for a clean slate
                  setDateMatchId(null);
                  setFormData(prev => ({
                      date: currentDate, // Keep the date user selected
                      pnrAds: 0, contempAds: 0, trafficAds: 0, miscAds: 0,
                      shopifyRev: 0, amazonRev: 0, d2dRev: 0, googleRev: 0, koboRev: 0, koboPlusRev: 0
                  }));
              }
          }
      }
  }, [formData.date, editingRecord, activeTab, existingData, lastCheckedDate]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine the ID: explicit edit ID, OR auto-detected match ID, OR new UUID
    const recordId = editingRecord?.id || dateMatchId || crypto.randomUUID();
    const isUpdate = !!(editingRecord || dateMatchId);

    const recordToSave: DailyRecord = {
        ...(formData as DailyRecord),
        id: recordId,
        date: formData.date || new Date().toISOString().split('T')[0] // Ensure date exists
    };
    
    if (isUpdate && onUpdateRecord) {
      onUpdateRecord(recordToSave);
      setSuccessMsg('Record updated successfully!');
    } else {
      onAddRecord(recordToSave);
      setSuccessMsg('Record added successfully!');
      // After add, we don't necessarily need to reset form if we want to let user keep seeing what they added.
      // But usually reset date or keep same? 
      // Current behavior in logic above: if parent updates existingData, effect might run again.
    }
    
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // --- CSV Logic ---

  const parseCSVRow = (row: string) => {
    const result = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setFileName(file.name);
    setErrorMsg('');
    setSuccessMsg('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setErrorMsg("Failed to read file.");
        setIsProcessing(false);
        return;
      }

      // Handle both CRLF and LF, remove empty lines
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) {
        setErrorMsg("File appears to be empty or missing headers. Please check the file.");
        setIsProcessing(false);
        return;
      }

      // Parse headers from first line
      const headers = parseCSVRow(lines[0]);
      
      // Parse data rows
      const rows = lines.slice(1).map(line => parseCSVRow(line)).filter(row => row.length > 0 && row.some(cell => cell));

      if (rows.length === 0) {
        setErrorMsg("No data rows found in the file.");
        setIsProcessing(false);
        return;
      }

      setCsvHeaders(headers);
      setCsvRows(rows);

      // Auto-map based on similar names
      const initialMapping: Record<string, number> = {};
      const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

      // 1. Find Date
      const dateIdx = headers.findIndex(h => {
          const hNorm = normalize(h);
          return hNorm.includes('date') || hNorm.includes('day') || hNorm.includes('time') || hNorm.includes('reportingstart');
      });
      if (dateIdx !== -1) initialMapping['date'] = dateIdx;

      // 2. Find Amount (Cost/Spend/Revenue)
      const amountIdx = headers.findIndex(h => {
          const hNorm = normalize(h);
          return hNorm.includes('amount') || hNorm.includes('spent') || hNorm.includes('cost') || hNorm.includes('revenue') || hNorm.includes('sales') || hNorm.includes('value');
      });
      if (amountIdx !== -1) initialMapping['amount'] = amountIdx;

      setColumnMapping(initialMapping);
      setImportStep('mapping');
      setIsProcessing(false);
    };

    reader.onerror = () => {
        setErrorMsg("Failed to read file.");
        setIsProcessing(false);
    };

    reader.readAsText(file);
    e.target.value = ''; // Reset input so same file can be selected again
  };

  const handleMappingChange = (fieldKey: string, headerIndexStr: string) => {
    const idx = parseInt(headerIndexStr);
    setColumnMapping(prev => {
      const next = { ...prev };
      if (idx === -1) {
        delete next[fieldKey];
      } else {
        next[fieldKey] = idx;
      }
      return next;
    });
  };

  const executeImport = () => {
    try {
      if (!columnMapping['date'] && columnMapping['date'] !== 0) {
        setErrorMsg("Please map the 'Date' column. It is required.");
        return;
      }

      if (!targetCategory) {
          setErrorMsg("Please select a target category for this data.");
          return;
      }
      if (columnMapping['amount'] === undefined) {
          setErrorMsg("Please map the 'Amount' column.");
          return;
      }

      // Aggregation Logic
      const aggregatedData: Record<string, number> = {};
      let successCount = 0;
      let failCount = 0;

      const parseMoney = (val: string) => {
        if (!val) return 0;
        return parseFloat(val.replace(/[$,"]/g, '')) || 0;
      };

      const parseDate = (val: string) => {
        if (!val) return null;
        const d = new Date(val);
        if (isNaN(d.getTime())) return null;
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
      };

      csvRows.forEach(row => {
          const dateIdx = columnMapping['date'];
          const amountIdx = columnMapping['amount'];
          
          if (row[dateIdx]) {
              const dateStr = parseDate(row[dateIdx]);
              if (dateStr) {
                  const amount = parseMoney(row[amountIdx]);
                  aggregatedData[dateStr] = (aggregatedData[dateStr] || 0) + amount;
                  successCount++;
              } else {
                  failCount++;
              }
          } else {
              failCount++;
          }
      });

      if (Object.keys(aggregatedData).length === 0) {
          setErrorMsg("No valid data found to import.");
          return;
      }

      // Convert to Partial<DailyRecord>[]
      const mergeRecords: Partial<DailyRecord>[] = Object.entries(aggregatedData).map(([date, amount]) => ({
          date,
          [targetCategory]: amount
      }));

      if (onBulkMerge) {
          onBulkMerge(mergeRecords);
          setSuccessMsg(`Successfully imported and merged ${mergeRecords.length} daily totals!`);
      } else {
          setErrorMsg("Bulk merge not supported by parent component.");
          return;
      }
      
      // Cleanup
      setImportStep('upload');
      setCsvHeaders([]);
      setCsvRows([]);
      setColumnMapping({});
      setFileName('');
      setErrorMsg('');
      setTimeout(() => setSuccessMsg(''), 5000);

    } catch (err) {
      console.error(err);
      setErrorMsg("Error processing import. Please check data format.");
    }
  };

  // Helper to determine mode text
  const isEditMode = !!(editingRecord || dateMatchId);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      
      {/* View Switcher (Only show if not editing) */}
      {!editingRecord ? (
        <div className="flex space-x-4 mb-6">
          <button 
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'manual' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Manual Entry
          </button>
          <button 
            onClick={() => setActiveTab('csv')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'csv' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Bulk Upload (CSV)
          </button>
        </div>
      ) : (
        <div className="mb-6 flex items-center justify-between bg-blue-50 p-4 rounded-lg border border-blue-100">
            <div className="flex items-center text-blue-800 font-medium">
                <Save className="w-5 h-5 mr-2" />
                <span>Editing Record for {new Date(formData.date || '').toLocaleDateString()}</span>
            </div>
            <button onClick={onCancelEdit} className="flex items-center text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-md shadow-sm">
                <X className="w-4 h-4 mr-1" />
                Cancel Edit
            </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center border border-green-100">
          <CheckCircle className="w-5 h-5 mr-2" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center border border-red-100">
          <AlertCircle className="w-5 h-5 mr-2" />
          {errorMsg}
        </div>
      )}

      {/* --- Manual Form --- */}
      {activeTab === 'manual' && (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* General */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input 
                type="date" 
                name="date"
                required
                value={formData.date}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {dateMatchId && !editingRecord && (
                 <p className="text-xs text-blue-600 mt-1 flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Found existing data for this date. You are editing the existing record.
                 </p>
              )}
            </div>

            {/* Ad Spend Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Ad Spend</h3>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">PNR Ads</label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input type="number" step="0.01" name="pnrAds" placeholder="0.00" value={formData.pnrAds || ''} onChange={handleInputChange} className="pl-7 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 border p-2" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">Contemp Ads</label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input type="number" step="0.01" name="contempAds" placeholder="0.00" value={formData.contempAds || ''} onChange={handleInputChange} className="pl-7 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 border p-2" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">Traffic Ads</label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input type="number" step="0.01" name="trafficAds" placeholder="0.00" value={formData.trafficAds || ''} onChange={handleInputChange} className="pl-7 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 border p-2" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">Misc Ads</label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input type="number" step="0.01" name="miscAds" placeholder="0.00" value={formData.miscAds || ''} onChange={handleInputChange} className="pl-7 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 border p-2" />
                </div>
              </div>
            </div>

            {/* Revenue Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Revenue</h3>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">Shopify</label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input type="number" step="0.01" name="shopifyRev" placeholder="0.00" value={formData.shopifyRev || ''} onChange={handleInputChange} className="pl-7 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 border p-2" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">Amazon</label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input type="number" step="0.01" name="amazonRev" placeholder="0.00" value={formData.amazonRev || ''} onChange={handleInputChange} className="pl-7 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 border p-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-medium text-gray-500 uppercase">D2D</label>
                   <input type="number" step="0.01" name="d2dRev" value={formData.d2dRev || ''} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md border p-2" placeholder="$" />
                </div>
                <div>
                   <label className="block text-xs font-medium text-gray-500 uppercase">Google Play</label>
                   <input type="number" step="0.01" name="googleRev" value={formData.googleRev || ''} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md border p-2" placeholder="$" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-medium text-gray-500 uppercase">Kobo</label>
                   <input type="number" step="0.01" name="koboRev" value={formData.koboRev || ''} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md border p-2" placeholder="$" />
                </div>
                <div>
                   <label className="block text-xs font-medium text-gray-500 uppercase">Kobo Plus</label>
                   <input type="number" step="0.01" name="koboPlusRev" value={formData.koboPlusRev || ''} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md border p-2" placeholder="$" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t flex justify-end">
            <button 
              type="submit" 
              className={`flex items-center px-6 py-3 text-white rounded-lg transition shadow-md font-medium ${isEditMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isEditMode ? (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Update Record
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Add Record
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* --- CSV Upload View --- */}
      {activeTab === 'csv' && importStep === 'upload' && (
        <div className="space-y-6">
            {/* Mode Selection */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Target Category</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Upload a CSV report (e.g. Facebook Ads, Amazon Ads). We will sum the data by date and merge it into the selected category.
                </p>

                <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Category</label>
                    <select 
                        value={targetCategory} 
                        onChange={(e) => setTargetCategory(e.target.value)}
                        className="block w-full max-w-md border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                    >
                        <option value="">-- Select where this data goes --</option>
                        {FIELD_MAPPING_CONFIG.filter(f => f.key !== 'date').map(field => (
                            <option key={field.key} value={field.key}>{field.label}</option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                        Example: If uploading a Facebook Ads report for your Contemporary books, select "Contemp Ads".
                    </p>
                </div>
            </div>

            <div className="bg-white p-12 rounded-xl shadow-sm border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-center hover:border-blue-400 transition-colors relative">
            {isProcessing ? (
                <div className="flex flex-col items-center">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">Processing file...</h3>
                </div>
            ) : (
                <>
                    <div className="bg-blue-50 p-4 rounded-full mb-4">
                    <Upload className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Upload CSV File</h3>
                    <p className="text-gray-500 mb-6 max-w-md">
                    Upload your Excel/CSV export. We'll help you map the columns in the next step.
                    </p>
                    <input 
                    type="file" 
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 max-w-xs mx-auto"
                    />
                </>
            )}
            </div>
        </div>
      )}

      {/* --- CSV Mapping View --- */}
      {activeTab === 'csv' && importStep === 'mapping' && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
           <div className="flex items-center justify-between mb-6 border-b pb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                   <FileText className="w-5 h-5 mr-2 text-gray-500" />
                   Verify Columns
                </h3>
                <p className="text-sm text-gray-500">File: <span className="font-medium text-gray-800">{fileName}</span> &bull; {csvRows.length} rows found</p>
              </div>
              <button 
                onClick={() => { setImportStep('upload'); setCsvHeaders([]); setColumnMapping({}); setErrorMsg(''); }}
                className="text-sm text-gray-500 hover:text-gray-800 flex items-center bg-gray-100 px-3 py-1.5 rounded-md"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Start Over
              </button>
           </div>

           <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
             <div className="flex items-start">
               <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
               <p className="text-sm text-blue-800">
                 Map the Date and Amount columns for your {FIELD_MAPPING_CONFIG.find(f => f.key === targetCategory)?.label || 'selected category'} report. Data will be summed by date.
               </p>
             </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Date Column <span className="text-red-500">*</span>
                    </label>
                    <select 
                        value={columnMapping['date'] !== undefined ? columnMapping['date'] : -1}
                        onChange={(e) => handleMappingChange('date', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="-1">-- Select Date Column --</option>
                        {csvHeaders.map((header, idx) => (
                        <option key={idx} value={idx}>{header}</option>
                        ))}
                    </select>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Amount/Spend Column <span className="text-red-500">*</span>
                    </label>
                    <select 
                        value={columnMapping['amount'] !== undefined ? columnMapping['amount'] : -1}
                        onChange={(e) => handleMappingChange('amount', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="-1">-- Select Amount Column --</option>
                        {csvHeaders.map((header, idx) => (
                        <option key={idx} value={idx}>{header}</option>
                        ))}
                    </select>
                </div>
           </div>

           <div className="flex justify-end">
              <button 
                onClick={executeImport}
                className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg font-bold shadow-md hover:bg-green-700 transition-colors"
              >
                Complete Import
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
           </div>
        </div>
      )}
    </div>
  );
};