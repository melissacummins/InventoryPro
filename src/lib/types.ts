export interface Product {
  id: string; // Firestore document ID
  name: string;
  sku: string;
  category: "Paperback" | "Hardcover" | "Art Pack" | "Bundle" | "Book Box" | "Omnibus";
  basePrice: number;
  productionCost: number;
  shippingCost: number;
  shippingSuppliesCost: number;
  paCosts: number;
  handlingFeeAddOn: number;
  ttShopPrice: number;
  freeShipping: number;
  bookStock: number;
  booksPurchased: number;
  bundlesPurchased: number;
  purchasedViaBundles: number;
  bookInventory: number;
  bundlesInventory: number;
  sixMonthBookSales: number;
  sixMonthBundleSales: number;
  leadTime: number;
  booksInBundle: string;
  bundles: string;
  csvAvgDaily: number;
  csvReorderThreshold: number;
  doNotReorder?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrder {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  orderDate: string;
  expectedDispatch: string;
  expectedArrival: string;
  actualArrival?: string;
  status: 'pending' | 'arrived';
  createdAt: string;
}

export interface Order {
  id: string;
  productId: string;
  type: "add" | "subtract" | "csv_import" | "stock_reset";
  inventoryType: "book" | "bundle";
  quantity: number;
  previousValue: number;
  newValue: number;
  source: string;
  notes: string;
  createdAt: string;
}

export interface BookSpec {
  id: string;
  productId: string;
  printer: string;
  trimSize: string;
  pageCount: number;
  paperType: string;
  coverType: string;
  binding: string;
  interiorColor: string;
  isbn: string;
  weight: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrinterQuote {
  id: string;
  productId: string;
  printer: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  turnaround: string;
  shippingEstimate: number;
  quoteDate: string;
  expiresDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
