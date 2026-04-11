import { doc, updateDoc, addDoc, collection, writeBatch, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Product, Order, PurchaseOrder } from './types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function updateProductField(productId: string, field: keyof Product, value: any) {
  const productRef = doc(db, 'products', productId);
  try {
    await updateDoc(productRef, {
      [field]: value,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `products/${productId}`);
  }
}

export async function updateProduct(productId: string, updates: Partial<Product>) {
  const productRef = doc(db, 'products', productId);
  try {
    await updateDoc(productRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `products/${productId}`);
  }
}

export async function deleteProduct(productId: string) {
  const productRef = doc(db, 'products', productId);
  try {
    await import('firebase/firestore').then(({ deleteDoc }) => deleteDoc(productRef));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
  }
}

export async function addInventoryOrder(order: Omit<Order, 'id' | 'createdAt'>) {
  const ordersRef = collection(db, 'orders');
  try {
    await addDoc(ordersRef, {
      ...order,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'orders');
  }
}

export async function createPurchaseOrder(data: Omit<PurchaseOrder, 'id' | 'createdAt'>) {
  try {
    const docRef = await addDoc(collection(db, 'purchaseOrders'), {
      ...data,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'purchaseOrders');
  }
}

export async function markPurchaseOrderArrived(po: PurchaseOrder, actualArrival: string, product: Product) {
  try {
    // 1. Update the PO
    const poRef = doc(db, 'purchaseOrders', po.id);
    await updateDoc(poRef, {
      status: 'arrived',
      actualArrival
    });

    // 2. Add inventory
    await processInventoryChange(product, 'add', 'book', po.quantity, `PO: ${po.id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'purchaseOrders');
  }
}

export async function deletePurchaseOrder(id: string) {
  try {
    await deleteDoc(doc(db, 'purchaseOrders', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `purchaseOrders/${id}`);
  }
}

export async function processInventoryChange(
  product: Product,
  type: "add" | "subtract",
  inventoryType: "book" | "bundle",
  quantity: number,
  source: string = "Manual"
) {
  const batch = writeBatch(db);
  
  // 1. Update Product
  const productRef = doc(db, 'products', product.id);
  const updates: Partial<Product> = { updatedAt: new Date().toISOString() };
  let previousValue = 0;
  let newValue = 0;

  if (type === "add") {
    if (inventoryType === "book") {
      previousValue = product.bookStock || 0;
      newValue = previousValue + quantity;
      updates.bookStock = newValue;
      updates.bookInventory = newValue - (product.booksPurchased || 0) - (product.purchasedViaBundles || 0);
    } else {
      previousValue = product.bundlesInventory || 0;
      newValue = previousValue + quantity;
      updates.bundlesInventory = newValue;
    }
  } else {
    if (inventoryType === "book") {
      previousValue = product.bookInventory || 0;
      updates.booksPurchased = (product.booksPurchased || 0) + quantity;
      updates.bookInventory = (product.bookStock || 0) - updates.booksPurchased - (product.purchasedViaBundles || 0);
      updates.sixMonthBookSales = (product.sixMonthBookSales || 0) + quantity;
      newValue = updates.bookInventory;
    } else {
      previousValue = product.bundlesInventory || 0;
      newValue = Math.max(0, previousValue - quantity);
      updates.bundlesInventory = newValue;
      updates.sixMonthBundleSales = (product.sixMonthBundleSales || 0) + quantity;
    }
  }

  batch.update(productRef, updates);

  // 2. Add Order Log
  const orderRef = doc(collection(db, 'orders'));
  batch.set(orderRef, {
    productId: product.id,
    type,
    inventoryType,
    quantity,
    previousValue,
    newValue,
    source,
    notes: `Manual ${type} of ${quantity} ${inventoryType}(s)`,
    createdAt: new Date().toISOString()
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'batch: products/orders');
  }
}
