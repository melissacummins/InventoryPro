import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from '../lib/types';
import { handleFirestoreError, OperationType } from '../lib/api';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let prods: Product[] = [];
      snapshot.forEach((doc) => {
        prods.push({ id: doc.id, ...doc.data() } as Product);
      });
      
      // Calculate derived fields that depend on other products
      prods = prods.map(p => {
        const isBundle = ["Bundle", "Book Box"].includes(p.category);
        let calculatedBundlesInventory = p.bundlesInventory;
        let calculatedSixMonthBundleSales = p.sixMonthBundleSales || 0;

        if (isBundle && p.booksInBundle) {
          const bookNames = p.booksInBundle.split(",").map(s => s.trim()).filter(Boolean);
          let minAvailable = 9999;
          bookNames.forEach(bName => {
            const bookProd = prods.find(b => b.name === bName);
            if (bookProd && bookProd.bookInventory < minAvailable) {
              minAvailable = bookProd.bookInventory;
            }
          });
          if (minAvailable !== 9999) {
            calculatedBundlesInventory = minAvailable;
          }
        }

        if (!isBundle && p.bundles) {
          const bundleNames = p.bundles.split(",").map(s => s.trim()).filter(Boolean);
          let totalBundleSales = 0;
          bundleNames.forEach(bName => {
            const bundleProd = prods.find(b => b.name === bName);
            if (bundleProd) {
              totalBundleSales += (bundleProd.sixMonthBundleSales || 0);
            }
          });
          calculatedSixMonthBundleSales = totalBundleSales;
        }

        return {
          ...p,
          bundlesInventory: calculatedBundlesInventory,
          sixMonthBundleSales: calculatedSixMonthBundleSales
        };
      });

      setProducts(prods);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching products:", err);
      setError(err);
      setLoading(false);
      handleFirestoreError(err, OperationType.GET, 'products');
    });

    return unsubscribe;
  }, []);

  return { products, loading, error };
}
