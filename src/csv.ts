import { Fund, Transaction } from './types';

// Cột hợp nhất cho cả Quỹ và Giao dịch trong một file CSV duy nhất.
// Cột đầu "record" cho biết dòng là FUND hay TX.
const COLUMNS = [
  'record',
  'id',
  'type',
  'name',
  'balance',
  'accountNumber',
  'bankName',
  'note',
  'color',
  'monthlyLimit',
  'maxBalance',
  'allocationPercent',
  'isSpending',
  'pinned',
  'managementMethod',
  'createdAt',
  'amount',
  'fundId',
  'toFundId',
  'category',
  'txNotes',
  'date',
];

// Bọc một giá trị theo chuẩn CSV (escape dấu ", , và xuống dòng)
function escapeCsv(value: string | number | undefined): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Xuất toàn bộ quỹ và giao dịch ra chuỗi CSV
export function exportToCsv(funds: Fund[], transactions: Transaction[]): string {
  const lines: string[] = [];
  lines.push(COLUMNS.join(','));

  funds.forEach((f) => {
    const row: Record<string, string | number | undefined> = {
      record: 'FUND',
      id: f.id,
      type: f.type,
      name: f.name,
      balance: f.balance,
      accountNumber: f.accountNumber,
      bankName: f.bankName,
      note: f.note,
      color: f.color,
      monthlyLimit: f.monthlyLimit,
      maxBalance: f.maxBalance,
      allocationPercent: f.allocationPercent,
      isSpending: f.isSpending ? 'true' : '',
      pinned: f.pinned ? 'true' : '',
      managementMethod: f.managementMethod,
      createdAt: f.createdAt,
    };
    lines.push(COLUMNS.map((c) => escapeCsv(row[c])).join(','));
  });

  transactions.forEach((t) => {
    const row: Record<string, string | number | undefined> = {
      record: 'TX',
      id: t.id,
      type: t.type,
      amount: t.amount,
      fundId: t.fundId,
      toFundId: t.toFundId,
      category: t.category,
      txNotes: t.notes,
      date: t.date,
      createdAt: t.createdAt,
    };
    lines.push(COLUMNS.map((c) => escapeCsv(row[c])).join(','));
  });

  return lines.join('\n');
}

// Phân tích toàn bộ chuỗi CSV thành các dòng gồm nhiều trường,
// hỗ trợ trường có dấu ngoặc kép chứa dấu phẩy hoặc ký tự xuống dòng.
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  // Bỏ BOM nếu có
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(current);
      current = '';
    } else if (char === '\n' || char === '\r') {
      // Bỏ qua \n sau \r (CRLF)
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(current);
      current = '';
      rows.push(row);
      row = [];
    } else {
      current += char;
    }
  }

  // Dòng cuối (nếu file không kết thúc bằng ký tự xuống dòng)
  if (current !== '' || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  // Loại các dòng hoàn toàn trống
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

// Phân tích chuỗi CSV thành danh sách quỹ và giao dịch
export function parseCsv(text: string): { funds: Fund[]; transactions: Transaction[] } {
  const rows = parseCsvRows(text);
  if (rows.length === 0) {
    throw new Error('File CSV trống');
  }

  const headers = rows[0].map((h) => h.trim());
  const idx = (name: string) => headers.indexOf(name);

  if (idx('record') === -1) {
    throw new Error('File CSV không đúng định dạng (thiếu cột "record")');
  }

  const funds: Fund[] = [];
  const transactions: Transaction[] = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const get = (name: string) => {
      const j = idx(name);
      return j === -1 ? '' : (cells[j] ?? '').trim();
    };

    const record = get('record');

    if (record === 'FUND') {
      const fundType = get('type') === 'bank' ? 'bank' : 'cash';
      const monthlyLimitStr = get('monthlyLimit');
      const maxBalanceStr = get('maxBalance');
      const allocationStr = get('allocationPercent');
      funds.push({
        id: get('id'),
        name: get('name'),
        type: fundType,
        balance: Number(get('balance')) || 0,
        accountNumber: get('accountNumber') || undefined,
        bankName: get('bankName') || undefined,
        note: get('note') || undefined,
        color: get('color') || 'emerald',
        monthlyLimit: monthlyLimitStr ? Number(monthlyLimitStr) : undefined,
        maxBalance: maxBalanceStr ? Number(maxBalanceStr) : undefined,
        allocationPercent: allocationStr ? Number(allocationStr) : undefined,
        isSpending: get('isSpending') === 'true' ? true : undefined,
        pinned: get('pinned') === 'true' ? true : undefined,
        managementMethod: get('managementMethod') || undefined,
        createdAt: get('createdAt') || new Date().toISOString(),
      });
    } else if (record === 'TX') {
      const rawType = get('type');
      const txType =
        rawType === 'income' || rawType === 'transfer' ? rawType : 'expense';
      transactions.push({
        id: get('id'),
        type: txType,
        amount: Number(get('amount')) || 0,
        fundId: get('fundId'),
        toFundId: get('toFundId') || undefined,
        category: get('category'),
        notes: get('txNotes') || undefined,
        date: get('date'),
        createdAt: get('createdAt') || new Date().toISOString(),
      });
    }
  }

  if (funds.length === 0) {
    throw new Error('Không tìm thấy quỹ nào trong file CSV');
  }

  return { funds, transactions };
}
