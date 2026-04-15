import { useState } from 'react';
import { Store, Key, CheckCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { saveShopifySettings, deleteShopifySettings, testShopifyConnection } from '../api';
import type { ShopifySettings } from '../../../lib/types';

interface Props {
  settings: ShopifySettings | null;
  onSaved: () => void;
}

export default function ShopifySetup({ settings, onSaved }: Props) {
  const [storeUrl, setStoreUrl] = useState(settings?.store_url || '');
  const [accessToken, setAccessToken] = useState(settings?.access_token || '');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDisconnect, setShowDisconnect] = useState(false);

  const isConfigured = !!settings;

  function normalizeStoreUrl(url: string): string {
    let cleaned = url.trim().toLowerCase();
    cleaned = cleaned.replace(/^https?:\/\//, '');
    cleaned = cleaned.replace(/\/+$/, '');
    if (!cleaned.endsWith('.myshopify.com') && !cleaned.includes('.')) {
      cleaned = `${cleaned}.myshopify.com`;
    }
    return cleaned;
  }

  async function handleSave() {
    setError('');
    setSuccess('');

    const normalizedUrl = normalizeStoreUrl(storeUrl);
    if (!normalizedUrl || !accessToken.trim()) {
      setError('Please fill in both fields.');
      return;
    }

    setSaving(true);
    try {
      await saveShopifySettings({
        store_url: normalizedUrl,
        access_token: accessToken.trim(),
      });
      setStoreUrl(normalizedUrl);
      setSuccess('Shopify credentials saved!');
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setError('');
    setSuccess('');
    setTesting(true);
    try {
      const result = await testShopifyConnection();
      setSuccess(`Connected to "${result.shop.name}" (${result.shop.domain})`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Connection test failed. Check your credentials.');
    } finally {
      setTesting(false);
    }
  }

  async function handleDisconnect() {
    try {
      await deleteShopifySettings();
      setStoreUrl('');
      setAccessToken('');
      setShowDisconnect(false);
      setSuccess('');
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {isConfigured && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-800">Connected to Shopify</p>
            <p className="text-xs text-emerald-600">{settings.store_url}</p>
          </div>
          <button
            onClick={() => setShowDisconnect(!showDisconnect)}
            className="text-xs text-slate-500 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {showDisconnect && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700 mb-3">Are you sure you want to disconnect your Shopify store? This will remove your saved credentials.</p>
          <div className="flex gap-2">
            <button onClick={handleDisconnect} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
              Disconnect
            </button>
            <button onClick={() => setShowDisconnect(false)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
            <Store className="w-4 h-4" /> Store URL
          </label>
          <input
            type="text"
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
            placeholder="melissacummins.myshopify.com"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="text-xs text-slate-400 mt-1">Your Shopify store address (e.g., your-store.myshopify.com)</p>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
            <Key className="w-4 h-4" /> Admin API Access Token
          </label>
          <input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="shpat_xxxxxxxxxxxxxxxxxxxxx"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="text-xs text-slate-400 mt-1">
            From Shopify Dev Dashboard: Create app &rarr; Configure Admin API scopes (read_orders, read_products, read_locations) &rarr; Install &rarr; Copy token
          </p>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-700">{success}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {isConfigured ? 'Update Credentials' : 'Save & Connect'}
        </button>
        {isConfigured && (
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            {testing && <Loader2 className="w-4 h-4 animate-spin" />}
            Test Connection
          </button>
        )}
      </div>
    </div>
  );
}
