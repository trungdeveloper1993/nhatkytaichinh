import { Fund, Transaction } from './types';

// Database mẫu các quỹ:
//  - note (Ghi chú): MỤC ĐÍCH của quỹ (vì sao có quỹ này)
//  - managementMethod (Cách quản lý): được cấp vốn từ đâu, dùng thế nào, phân bổ ra sao
//  - Số dư để trống (0) để người dùng tự nhập
export const INITIAL_FUNDS: Fund[] = [
  {
    id: 'fund-tiet-kiem',
    name: 'Quỹ Tiết Kiệm',
    type: 'bank',
    balance: 0,
    note: 'Tạo nguồn sinh lời ổn định hàng tháng, làm điểm tựa cân bằng cuộc sống khi các kênh đầu tư gặp khó khăn.',
    color: 'emerald',
    allocationPercent: 30,
    managementMethod:
      '- Được cấp vốn từ thu nhập hàng tháng và tiền lời của Quỹ Đầu Tư.\n- Gửi tiết kiệm ở ít nhất 2 ngân hàng (VD: ACB, Agribank).\n- Mỗi ngân hàng chia 3 kỳ hạn: 1 tháng 10%, 3 tháng 20%, 6 tháng 70%. Kỳ hạn ngắn để xử lý biến cố khi Quỹ Khẩn Cấp không đủ.\n- Tiền lãi: trích một khoản cộng dồn cho Quỹ Cá Nhân (tối đa 4 triệu/tháng); phần dư dùng mua vàng để chống lạm phát.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fund-dau-tu',
    name: 'Quỹ Đầu Tư',
    type: 'cash',
    balance: 0,
    note: 'Đầu tư để sinh lợi nhuận từ nhiều kênh (chứng khoán, crypto, bất động sản, kinh doanh) và cơ hội từ công việc. Là động lực tăng trưởng tài sản chính.',
    color: 'indigo',
    allocationPercent: 30,
    managementMethod:
      '- Được phân bổ vốn từ các nguồn thu nhập.\n- Chi vốn ra để đầu tư sinh lời qua chứng khoán, crypto, bất động sản, kinh doanh...',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fund-tu-thien',
    name: 'Quỹ Từ Thiện',
    type: 'bank',
    balance: 0,
    note: 'Giúp đỡ người thực sự cần bằng cái tâm — gieo duyên lành, không vụ lợi.',
    color: 'purple',
    allocationPercent: 5,
    managementMethod:
      '- Được cấp vốn 5% từ thu nhập và tiền lời Quỹ Đầu Tư.\n- Ưu tiên viện phí, nhu yếu phẩm, việc khẩn cấp về tính mạng; ưu tiên trẻ mồ côi, người mất sức lao động. Không đưa tiền mặt trực tiếp.\n- Khi số dư trên 100 triệu: 80% gửi tiết kiệm kỳ hạn 1/3/6 tháng, giữ 20% sẵn sàng giúp đỡ. Tiền lãi giữ lại trong quỹ.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fund-khan-cap',
    name: 'Quỹ Khẩn Cấp',
    type: 'bank',
    balance: 0,
    note: 'Lá chắn tài chính cho bệnh tật, chăm sóc cha mẹ và các rủi ro lớn về sức khỏe, tính mạng.',
    color: 'rose',
    allocationPercent: 10,
    managementMethod:
      '- Được phân bổ từ mọi nguồn thu nhập; quỹ càng nhiều càng có tài chính đề phòng khi khẩn cấp.\n- Khi số dư trên 100 triệu: gửi tiết kiệm kỳ hạn 1/3/6 tháng xoay vòng 80%, giữ 20% sẵn sàng dùng khi cần.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fund-ca-nhan',
    name: 'Quỹ Cá Nhân',
    type: 'cash',
    balance: 0,
    note: 'Trang trải chi phí sinh hoạt hàng tháng (ăn uống, nhu yếu phẩm, giải trí, học tập) và các khoản phát sinh (xăng xe, đi lại).',
    color: 'blue',
    isSpending: true,
    monthlyLimit: 4000000,
    maxBalance: 20000000,
    managementMethod:
      '- Nhận tối đa mỗi tháng theo giới hạn phân bổ đã đặt.\n- Được cấp vốn từ mọi nguồn phân bổ thu nhập.\n- Xài dư được cộng dồn sang tháng sau, tối đa tới trần quỹ đã đặt.\n- Khi đạt/vượt trần, phần chênh lệch được chuyển sang Quỹ Khẩn Cấp.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fund-vang',
    name: 'Quỹ Vàng',
    type: 'cash',
    balance: 0,
    note: 'Tài sản bảo trợ tương lai, phòng khi tiền mất giá và lạm phát kinh tế.',
    color: 'amber',
    allocationPercent: 10,
    managementMethod:
      '- Được phân bổ theo % từ các nguồn thu hàng tháng.\n- Mỗi khi nạp tiền vào quỹ, hãy dùng số tiền đó mua vàng ngay để chống mất giá.\n- Số tiền nhập vào chỉ là TỔNG VỐN đã bỏ ra mua vàng tại thời điểm đó — không phải giá trị vàng theo giá thị trường hiện tại.\n- Vàng quy ra hiện kim để tích trữ, hạn chế giữ tiền mặt bị mất giá theo thời gian.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fund-uoc-mo',
    name: 'Quỹ Ước Mơ',
    type: 'bank',
    balance: 0,
    note: 'Thực hiện những ước mơ của bản thân: du lịch thế giới, xuyên Việt, học tập và trải nghiệm.',
    color: 'indigo',
    allocationPercent: 10,
    managementMethod:
      '- Được cấp vốn 10% từ mọi khoản thu nhập, cộng thêm 10% từ tiền lời Quỹ Đầu Tư.\n- Tích lũy dần cho tới khi đủ để thực hiện từng ước mơ.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fund-du-phong',
    name: 'Quỹ Dự Phòng',
    type: 'bank',
    balance: 0,
    note: 'Chi cho việc sửa chữa, mua sắm đồ dùng cần thiết cho nhà cửa (nhu cầu thiết yếu).',
    color: 'emerald',
    allocationPercent: 5,
    managementMethod:
      '- Được cấp vốn 5% từ mọi khoản thu nhập.\n- Chỉ dùng cho nhu cầu thiết yếu của nhà cửa, tránh chi tiêu tùy hứng.',
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [];
