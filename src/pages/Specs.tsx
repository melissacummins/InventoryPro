import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { BookSpec } from '../lib/types';
import { useProducts } from '../hooks/useProducts';
import { BookOpen } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/api';

export default function Specs() {
  const [specs, setSpecs] = useState<BookSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const { products } = useProducts();

  useEffect(() => {
    const q = query(collection(db, 'bookSpecs'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sp: BookSpec[] = [];
      snapshot.forEach((doc) => {
        sp.push({ id: doc.id, ...doc.data() } as BookSpec);
      });
      setSpecs(sp);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching specs:", error);
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, 'bookSpecs');
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
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Book Specifications</h2>
          <p className="text-sm text-gray-500 mt-1">Physical details for each book product.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Book Specifications Table</h3>
        <p className="text-gray-500 mb-6">This section mirrors the Airtable Book Specifications tab. You can add specs for each product here.</p>
        <button className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium">
          Add Specification
        </button>
      </div>
    </div>
  );
}
