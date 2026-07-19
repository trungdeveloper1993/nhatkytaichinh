import { Fund, Transaction } from './types';

// Database mẫu các quỹ (mô tả đã tóm tắt, không kèm mục tiêu số tiền)
export const INITIAL_FUNDS: Fund[] = [
  {
    id: 'fund-tiet-kiem',
    name: 'Quỹ Tiết Kiệm',
    type: 'bank',
    balance: 395000000,
    note: 'Nguồn sinh lời ổn định hàng tháng, giúp cân bằng cuộc sống khi đầu tư gặp khó khăn. Gửi tiết kiệm ở nhiều ngân hàng, chia kỳ hạn 1/3/6 tháng (10%/20%/70%); kỳ hạn ngắn để xử lý biến cố.',
    color: 'emerald',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fund-dau-tu',
    name: 'Quỹ Đầu Tư',
    type: 'cash',
    balance: 1840647277,
    note: 'Sinh lợi nhuận từ đầu tư (chứng khoán, crypto, bất động sản, kinh doanh) và công việc.',
    color: 'indigo',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fund-tu-thien',
    name: 'Quỹ Từ Thiện',
    type: 'bank',
    balance: 6217000,
    note: 'Giúp đỡ người thực sự cần: ưu tiên viện phí, nhu yếu phẩm, việc khẩn cấp về tính mạng; ưu tiên trẻ mồ côi và người mất sức lao động. Không đưa tiền mặt trực tiếp.',
    color: 'purple',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fund-khan-cap',
    name: 'Quỹ Khẩn Cấp',
    type: 'bank',
    balance: 16795000,
    note: 'Dự phòng bệnh tật, chăm sóc cha mẹ, xử lý rủi ro lớn về sức khỏe và tính mạng. Không giới hạn bổ sung.',
    color: 'rose',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fund-ca-nhan',
    name: 'Quỹ Cá Nhân',
    type: 'cash',
    balance: 4300000,
    note: 'Chi phí sinh hoạt hàng tháng (ăn uống, nhu yếu phẩm, giải trí, học tập) và các khoản phát sinh (xăng xe, đi lại).',
    color: 'blue',
    isSpending: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'fund-vang',
    name: 'Quỹ Vàng',
    type: 'cash',
    balance: 25000000,
    note: 'Phòng khi tiền mất giá, lạm phát. Vàng như tài sản bảo trợ cho tương lai.',
    color: 'amber',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fund-uoc-mo',
    name: 'Quỹ Ước Mơ',
    type: 'bank',
    balance: 0,
    note: 'Thực hiện ước mơ: du lịch thế giới, xuyên Việt, học tập.',
    color: 'indigo',
    allocationPercent: 10,
    createdAt: new Date().toISOString()
  },
  {
    id: 'fund-du-phong',
    name: 'Quỹ Dự Phòng',
    type: 'bank',
    balance: 0,
    note: 'Sửa chữa và mua sắm đồ dùng cần thiết cho nhà cửa.',
    color: 'emerald',
    allocationPercent: 5,
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [];
