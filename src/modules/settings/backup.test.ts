// Mock-based logic test for backup/restore. Run via:
//   npx tsx src/modules/settings/backup.test.ts
// No real Supabase credentials used.

import { BACKUP_TABLES, BACKUP_SCHEMA_VERSION } from './tables';

// ---- Mock Supabase ----
// We replace the supabase module with a fake that records every operation
// against an in-memory "db" map keyed by table name.

type Row = Record<string, any>;

interface MockDb {
  rows: Record<string, Row[]>;
  log: string[];
}

function makeMockDb(initial: Record<string, Row[]>): MockDb {
  return { rows: { ...initial }, log: [] };
}

function makeMockSupabase(db: MockDb, currentUserId: string) {
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: currentUserId } } }),
    },
    from(table: string) {
      const api = {
        _filters: [] as Array<{ col: string; val: any }>,
        _from: 0,
        _to: Infinity,
        select(_cols: string) {
          return api;
        },
        eq(col: string, val: any) {
          api._filters.push({ col, val });
          return api;
        },
        range(from: number, to: number) {
          api._from = from;
          api._to = to;
          return Promise.resolve(this._execSelect());
        },
        _execSelect() {
          const rows = db.rows[table] ?? null;
          if (rows === null) {
            db.log.push(`select ${table}: MISSING`);
            return { data: null, error: { message: `relation "${table}" does not exist` } };
          }
          const sliced = rows.slice(api._from, api._to + 1);
          db.log.push(`select ${table}[${api._from}..${api._to}] -> ${sliced.length}`);
          return { data: sliced, error: null };
        },
        async insert(rows: Row[]) {
          if (!db.rows[table]) {
            db.log.push(`insert ${table}: MISSING TABLE`);
            return { error: { message: `relation "${table}" does not exist` } };
          }
          // Enforce FK ordering: sample of tables with FKs
          const FK: Record<string, string[]> = {
            monthly_orders: ['order_sources'],
            book_daily_metrics: ['book_products'],
            purchase_orders: ['products'],
            inventory_orders: ['products'],
            book_specs: ['products'],
            printer_quotes: ['products'],
            quarterly_updates: ['tracked_books'],
          };
          const required = FK[table] ?? [];
          for (const r of rows) {
            for (const parent of required) {
              const fkCol =
                parent === 'order_sources'
                  ? 'source_id'
                  : parent === 'book_products'
                    ? 'book_id'
                    : parent === 'tracked_books'
                      ? 'book_id'
                      : 'product_id';
              const fkVal = r[fkCol];
              if (fkVal && !db.rows[parent].some((p) => p.id === fkVal)) {
                return {
                  error: {
                    message: `FK violation on ${table}.${fkCol} -> ${parent}.id`,
                  },
                };
              }
            }
          }
          db.rows[table].push(...rows);
          db.log.push(`insert ${table}: +${rows.length}`);
          return { error: null };
        },
        delete() {
          const runDelete = async () => {
            if (!db.rows[table]) {
              db.log.push(`delete ${table}: MISSING TABLE`);
              return { error: { message: `relation "${table}" does not exist` } };
            }
            const before = db.rows[table].length;
            db.rows[table] = db.rows[table].filter((r) => {
              for (const f of api._filters) {
                if (r[f.col] !== f.val) return true;
              }
              return false;
            });
            const removed = before - db.rows[table].length;
            db.log.push(`delete ${table}: -${removed}`);
            return { error: null };
          };
          // Supabase's real client returns a builder from .delete() that has
          // .eq() and is itself awaitable. Simulate that by returning an
          // object with eq() that triggers the delete, and a then() that
          // runs the delete with any accumulated filters.
          const builder: any = {
            eq(col: string, val: any) {
              api._filters.push({ col, val });
              return runDelete();
            },
            then(resolve: any, reject: any) {
              return runDelete().then(resolve, reject);
            },
          };
          return builder;
        },
      };
      return api;
    },
  };
}

// Build an initial db with realistic-ish data
function seedDb(userId: string): MockDb {
  const src1 = { id: 'src-1', user_id: userId, name: 'Amazon', multiplier: 1 };
  const src2 = { id: 'src-2', user_id: userId, name: 'Shopify', multiplier: 5 };
  const prod1 = { id: 'prod-1', user_id: userId, name: 'Book A' };
  const book1 = { id: 'bp-1', user_id: userId, title: 'Book 1' };
  const trackedBook = { id: 'tb-1', user_id: userId, title: 'Tracked 1' };
  const adProj = { id: 'ap-1', user_id: userId, name: 'Project' };

  const seed: Record<string, Row[]> = {
    // Parents
    products: [prod1],
    tracked_books: [trackedBook],
    ad_projects: [adProj],
    order_sources: [src1, src2],
    book_products: [book1],
    // Children
    monthly_orders: [
      { id: 'mo-1', user_id: userId, source_id: 'src-1', month_key: '2026-03', count: 42 },
    ],
    book_daily_metrics: [
      { id: 'bdm-1', user_id: userId, book_id: 'bp-1', date: '2026-03-01' },
    ],
    purchase_orders: [{ id: 'po-1', user_id: userId, product_id: 'prod-1' }],
    inventory_orders: [{ id: 'io-1', user_id: userId, product_id: 'prod-1' }],
    quarterly_updates: [{ id: 'qu-1', user_id: userId, book_id: 'tb-1' }],
    daily_records: Array.from({ length: 1500 }, (_, i) => ({
      id: `dr-${i}`,
      user_id: userId,
      date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
    })),
  };
  // Fill in zeros for the remaining tables so lookups succeed
  for (const t of BACKUP_TABLES) {
    if (!(t.name in seed)) seed[t.name] = [];
  }
  return makeMockDb(seed);
}

// ---- Test runner ----
const USER_A = 'user-a';
const USER_B = 'user-b';

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

// We can't easily inject the mock into backup.ts because it imports a
// singleton. Instead, duplicate the logic here against the mock. This tests
// the shape of the algorithm, not the imported module.

async function createBackupViaMock(sb: any) {
  const { data } = await sb.auth.getUser();
  const tables: Record<string, any[]> = {};
  for (const t of BACKUP_TABLES) {
    const all: any[] = [];
    let from = 0;
    for (;;) {
      const res = await sb.from(t.name).select('*').range(from, from + 999);
      if (res.error) {
        tables[t.name] = [];
        break;
      }
      if (!res.data || res.data.length === 0) break;
      all.push(...res.data);
      if (res.data.length < 1000) break;
      from += 1000;
    }
    if (!(t.name in tables)) tables[t.name] = all;
  }
  return {
    schema_version: BACKUP_SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    user_id: data.user.id,
    tables,
  };
}

async function restoreBackupViaMock(sb: any, backup: any) {
  const { data } = await sb.auth.getUser();
  const userId = data.user.id;
  for (let i = BACKUP_TABLES.length - 1; i >= 0; i--) {
    const t = BACKUP_TABLES[i];
    await sb.from(t.name).delete().eq('user_id', userId);
  }
  let rowsRestored = 0;
  for (const t of BACKUP_TABLES) {
    const rows = backup.tables[t.name];
    if (!rows || rows.length === 0) continue;
    const rewritten = rows.map((r: any) => ({ ...r, user_id: userId }));
    const CHUNK = 500;
    for (let i = 0; i < rewritten.length; i += CHUNK) {
      const { error } = await sb.from(t.name).insert(rewritten.slice(i, i + CHUNK));
      if (error) throw new Error(`restore failed at ${t.name}: ${error.message}`);
      rowsRestored += Math.min(CHUNK, rewritten.length - i);
    }
  }
  return rowsRestored;
}

async function run() {
  console.log('Test 1: backup collects all rows including tables >1000 rows');
  const db1 = seedDb(USER_A);
  const sb1 = makeMockSupabase(db1, USER_A);
  const backup = await createBackupViaMock(sb1);
  assert(backup.schema_version === BACKUP_SCHEMA_VERSION, 'schema_version set');
  assert(backup.user_id === USER_A, 'user_id set');
  assert(backup.tables.daily_records.length === 1500, 'daily_records paginated to 1500');
  assert(backup.tables.order_sources.length === 2, 'order_sources captured');
  assert(backup.tables.monthly_orders.length === 1, 'monthly_orders captured');

  console.log('\nTest 2: restore replaces into empty db and preserves FK order');
  const db2 = seedDb(USER_A);
  // clear everything first
  for (const t of BACKUP_TABLES) db2.rows[t.name] = [];
  const sb2 = makeMockSupabase(db2, USER_A);
  const restored = await restoreBackupViaMock(sb2, backup);
  assert(restored === 1511, `restored ${restored} rows (expected 1511)`);
  assert(db2.rows.daily_records.length === 1500, 'daily_records restored');
  assert(db2.rows.order_sources.length === 2, 'order_sources restored before monthly_orders');
  assert(db2.rows.monthly_orders.length === 1, 'monthly_orders restored after FK parents');

  console.log('\nTest 3: restore overwrites existing rows (replace semantics)');
  const db3 = seedDb(USER_A);
  db3.rows.daily_records.push({ id: 'extra-1', user_id: USER_A, date: '2099-01-01' });
  const beforeExtra = db3.rows.daily_records.length;
  assert(beforeExtra === 1501, 'extra row present before restore');
  const sb3 = makeMockSupabase(db3, USER_A);
  await restoreBackupViaMock(sb3, backup);
  assert(
    db3.rows.daily_records.every((r) => r.id !== 'extra-1'),
    'extra row wiped by replace restore',
  );
  assert(db3.rows.daily_records.length === 1500, 'daily_records back to backup size');

  console.log('\nTest 4: restore rewrites user_id so one user can import another\'s backup');
  const db4 = seedDb(USER_B);
  for (const t of BACKUP_TABLES) db4.rows[t.name] = [];
  const sb4 = makeMockSupabase(db4, USER_B);
  await restoreBackupViaMock(sb4, backup); // backup came from USER_A
  assert(
    db4.rows.daily_records.every((r) => r.user_id === USER_B),
    'every restored row rewritten to USER_B',
  );

  console.log('\nTest 5: delete runs in reverse order, insert in forward order');
  const db5 = seedDb(USER_A);
  const sb5 = makeMockSupabase(db5, USER_A);
  await restoreBackupViaMock(sb5, backup);
  const deletes = db5.log
    .filter((l) => l.startsWith('delete '))
    .map((l) => l.split(' ')[1].replace(':', ''));
  const inserts = db5.log
    .filter((l) => l.startsWith('insert '))
    .map((l) => l.split(' ')[1].replace(':', ''));
  const fwdTables = BACKUP_TABLES.map((t) => t.name);
  const expectedDeletes = [...fwdTables].reverse();
  if (JSON.stringify(deletes) !== JSON.stringify(expectedDeletes)) {
    console.log('  actual:  ', deletes.slice(0, 8).join(','));
    console.log('  expected:', expectedDeletes.slice(0, 8).join(','));
  }
  assert(
    JSON.stringify(deletes) === JSON.stringify(expectedDeletes),
    'deletes follow reverse table order',
  );
  // Large tables get chunked so the same table can appear repeatedly — dedupe
  // consecutive duplicates before checking forward order.
  const uniqueInserts: string[] = [];
  for (const ins of inserts) {
    if (uniqueInserts[uniqueInserts.length - 1] !== ins) uniqueInserts.push(ins);
  }
  let cursor = 0;
  for (const ins of uniqueInserts) {
    const idx = fwdTables.indexOf(ins, cursor);
    assert(idx >= 0, `insert of ${ins} stays in forward order`);
    cursor = idx + 1;
  }

  console.log('\nTest 6: restore tolerates tables missing in backup');
  const partialBackup = { ...backup, tables: { ...backup.tables } };
  delete partialBackup.tables.keywords;
  const db6 = seedDb(USER_A);
  for (const t of BACKUP_TABLES) db6.rows[t.name] = [];
  const sb6 = makeMockSupabase(db6, USER_A);
  await restoreBackupViaMock(sb6, partialBackup);
  assert(db6.rows.daily_records.length === 1500, 'other tables still restored');

  console.log('\nAll tests passed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
