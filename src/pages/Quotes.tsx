import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { PrinterQuote } from '../lib/types';
import { useProducts } from '../hooks/useProducts';
import { FileText } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/api';

export default function Quotes() {
  const [quotes, setQuotes] = useState<PrinterQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const { products } = useProducts();

  useEffect(() => {
    const q = query(collection(db, 'printerQuotes'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const qts: PrinterQuote[] = [];
      snapshot.forEach((doc) => {
        qts.push({ id: doc.id, ...doc.data() } as PrinterQuote);
      });
      setQuotes(qts);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching quotes:", error);
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, 'printerQuotes');
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-brand-100 text-brand-700 rounded-lg">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Printer Quotes</h2>
          <p className="text-sm text-gray-500 mt-1">Track and compare quotes from different printers.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Printer Quotes Table</h3>
        <p className="text-gray-500 mb-6">This section mirrors the Airtable Printer Quotes tab. You can add quotes for each product here.</p>
        <button className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium">
          Add Quote
        </button>
      </div>
    </div>
  );
}
