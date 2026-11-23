export interface PreservationGuideSection {
  id: string;
  order: string;
  title: string;
  summary: string;
  standardRef: string;
  steps: string[];
  criticalRules: string[];
  checklist: string[];
}

export const PRESERVATION_GUIDES: PreservationGuideSection[] = [
  {
    id: 'photo-capture',
    order: '01',
    title: 'Hướng dẫn chụp ảnh tư liệu',
    summary:
      'Thiết lập hệ thống giá chụp, ánh sáng khuếch tán và hiệu chuẩn khung hình nhằm thu nhận tư liệu sắc nét, không biến dạng hình học.',
    standardRef: 'Tham chiếu FADGI 3–4 sao / ISO 19264-1',
    steps: [
      'Đặt tài liệu lên mặt phẳng trung tính (xám 18% hoặc đen mờ không phản quang), sử dụng thước đo tỷ lệ (mm/cm) và bảng cân bằng màu ở mép ngoài khung hình.',
      'Cố định máy ảnh trên chân máy hoặc giá copy-stand vuông góc 90 độ với mặt phẳng tư liệu; kiểm tra bọt thủy hoặc thước cân bằng điện tử.',
      'Bố trí hai nguồn đèn LED có chỉ số hoàn màu CRI ≥ 95 đặt đối xứng góc 45 độ hai bên để triệt tiêu bóng đổ và hiện tượng lóa bóng trên giấy tráng.',
      'Chụp ở ISO thấp nhất có thể (ISO 100–200), khẩu độ tối ưu f/8–f/11 để đạt độ nét đồng đều từ tâm ra rìa.',
      'Lưu đồng thời tệp RAW/TIFF không nén làm bản gốc bảo quản và xuất tệp JPEG chất lượng cao làm bản hiển thị.',
    ],
    criticalRules: [
      'Không chụp cầm tay trực tiếp dưới ánh đèn trần gây bóng người chụp lên tài liệu.',
      'Không cắt xén quá sát mép giấy; luôn chừa viền an toàn tối thiểu 3–5% quanh rìa bản gốc.',
      'Không tự ý chỉnh sửa màu sắc làm sai lệch vết mực, vết ố lịch sử trên bản gốc.',
    ],
    checklist: [
      'Chân máy vuông góc 90 độ với mặt tư liệu',
      'Ánh sáng 2 bên góc 45 độ đồng đều, không lóa',
      'Có thước đo tỷ lệ hoặc bảng chuẩn màu',
      'Không có bóng tay, bóng máy hoặc gáy sách che chữ',
    ],
  },
  {
    id: 'document-scanning',
    order: '02',
    title: 'Hướng dẫn quét tài liệu',
    summary:
      'Quy trình số hoá bằng máy quét phẳng (flatbed) hoặc máy quét sách không tiếp xúc để bảo vệ cấu trúc vật lý của bản gốc.',
    standardRef: 'Chuẩn quét lưu trữ 300–600 DPI không nén',
    steps: [
      'Kiểm tra tình trạng vật lý trước khi quét: tháo ghim kẹp gỉ sét nếu được phép, vệ sinh bụi bề mặt nhẹ nhàng bằng chổi lông mềm.',
      'Chọn độ phân giải tối thiểu 300 DPI đối với văn bản đánh máy thông thường, 400–600 DPI đối với chữ viết tay nhỏ, bản đồ hoặc ảnh phim.',
      'Sử dụng chế độ màu 24-bit RGB ngay cả với tài liệu đen trắng nhằm lưu giữ trung thực sắc thái giấy và dấu mực lịch sử.',
      'Tắt các bộ lọc tự động làm mịn, khử nhiễu quá tay hoặc tự động cắt nghiêng gây mất ký tự ở lề trang.',
      'Đối với sách đóng gáy chặt, tuyệt đối không đè mạnh gáy lên mặt kính máy quét phẳng; ưu tiên máy quét chữ V hoặc giá đỡ chữ V chuyên dụng.',
    ],
    criticalRules: [
      'Tuyệt đối không dùng máy quét nạp giấy tự động (ADF) cho tài liệu cũ, giòn, rách hoặc có giá trị lịch sử.',
      'Kiểm tra lại toàn bộ trang quét ngay sau khi hoàn tất để đảm bảo không sót trang hoặc mất lề.',
    ],
    checklist: [
      'Mặt kính máy quét sạch bụi và dấu vân tay',
      'Độ phân giải đạt từ 300 DPI trở lên (khuyến nghị 600 DPI cho bản gốc quý)',
      'Định dạng lưu trữ gốc là TIFF hoặc PNG không nén',
      'Giữ nguyên toàn vẹn mép trang, không cắt mất số trang hoặc con dấu',
    ],
  },
  {
    id: 'file-naming',
    order: '03',
    title: 'Hướng dẫn đặt tên tệp',
    summary:
      'Quy tắc đặt tên tệp nhất quán gắn liền với mã định danh Dublin Core để tránh trùng lặp, lỗi mã hoá ký tự và thất lạc liên kết.',
    standardRef: 'Quy chuẩn DIGIARCHIVE: [Mã_định_danh]_[Vai_trò]_[STT].[định_dạng]',
    steps: [
      'Chỉ sử dụng chữ cái không dấu (A–Z), chữ số (0–9), dấu gạch ngang (-) và dấu gạch dưới (_).',
      'Bắt đầu tên tệp bằng Mã định danh (Identifier) duy nhất của bản ghi, ví dụ: DA-VB-1975-012.',
      'Gắn hậu tố phân biệt rõ vai trò tệp: _ORIG cho bản gốc số hoá không chỉnh sửa, _DISP cho bản hiển thị tra cứu.',
      'Nếu tư liệu gồm nhiều trang, bổ sung chỉ số trang có đệm số 0 đứng trước (_P001, _P002...) để sắp xếp đúng thứ tự tự nhiên.',
      'Kiểm tra trùng tên tệp trên toàn kho trước khi lưu trữ chính thức.',
    ],
    criticalRules: [
      'Không dùng dấu cách, ký tự tiếng Việt có dấu hoặc ký tự đặc biệt (/ \\ : * ? " < > |) trong tên tệp.',
      'Không đặt tên chung chung như IMG_001.jpg, scan1.png hoặc tài_liệu_mới_cuối.jpg.',
      'Khi tạo bản chỉnh sửa hoặc bản nén phục vụ web, giữ nguyên tệp _ORIG và lưu bản mới với hậu tố _DISP.',
    ],
    checklist: [
      'Tên tệp khớp hoàn toàn với trường Identifier trong Dublin Core',
      'Không chứa khoảng trắng hoặc ký tự tiếng Việt có dấu',
      'Phân biệt rõ hậu tố _ORIG (bản gốc) và _DISP (bản hiển thị)',
      'Đã chạy kiểm tra không trùng lặp tên tệp trong hệ thống',
    ],
  },
  {
    id: 'backup-321',
    order: '04',
    title: 'Hướng dẫn sao lưu',
    summary:
      'Áp dụng chiến lược sao lưu 3-2-1 và nguyên tắc xác minh thực tế trước khi ghi nhận hoàn thành.',
    standardRef: 'Chiến lược bảo quản số 3-2-1 (3 bản, 2 phương tiện, 1 ngoài cơ sở)',
    steps: [
      'Duy trì ít nhất 03 bản của mỗi tệp gốc: 01 bản chính đang quản lý và 02 bản sao lưu độc lập.',
      'Lưu trữ trên tối thiểu 02 loại phương tiện khác nhau (ví dụ: máy chủ NAS RAID nội bộ và ổ cứng rời lưu trong két bảo quản / băng từ LTO).',
      'Đảm bảo ít nhất 01 bản sao lưu đặt tại vị trí vật lý tách biệt để phòng ngừa rủi ro hỏa hoạn, ngập nước hoặc sự cố điện.',
      'Chỉ đánh dấu trạng thái "Đã sao lưu đầy đủ" sau khi đã kiểm tra thực tế tệp mở được trên cả hai vị trí sao lưu và ghi nhận ngày sao lưu.',
      'Thực hiện rà soát định kỳ 6 tháng/lần đối với các phương tiện lưu trữ ngoại tuyến.',
    ],
    criticalRules: [
      'Không tự động đánh dấu sao lưu thành công khi mới chỉ có ý định hoặc chưa có xác nhận thực tế của người phụ trách.',
      'Không lưu cả 3 bản trên cùng một ổ đĩa vật lý hoặc cùng một máy tính.',
    ],
    checklist: [
      'Đã xác minh vị trí lưu giữ bản gốc vật lý / tệp gốc',
      'Có vị trí sao lưu thứ nhất độc lập (Ví dụ: NAS / Máy chủ tổ chức)',
      'Có vị trí sao lưu thứ hai khác phương tiện hoặc ngoài cơ sở',
      'Đã ghi nhận ngày sao lưu và tên người xác nhận thực tế',
    ],
  },
  {
    id: 'integrity-sha256',
    order: '05',
    title: 'Hướng dẫn kiểm tra tính toàn vẹn',
    summary:
      'Sử dụng mã băm mật mã SHA-256 (checksum) để phát hiện sớm suy giảm dữ liệu (bit rot) hoặc thay đổi trái phép trên tệp gốc.',
    standardRef: 'Chuẩn băm toàn vẹn dữ liệu SHA-256 (FIPS 180-4)',
    steps: [
      'Tạo mã SHA-256 ngay tại thời điểm hoàn tất số hoá tệp gốc để làm dấu vân tay kỹ thuật số chuẩn.',
      'Lưu trữ chuỗi 64 ký tự thập lục phân SHA-256 vào hồ sơ tệp và tệp biên bản xuất kèm kho tư liệu.',
      'Trước và sau mỗi lần sao chép sang ổ đĩa mới hoặc di chuyển máy chủ, tính lại SHA-256 của tệp đích.',
      'Đối chiếu hai chuỗi SHA-256: chỉ khi khớp 100% từng ký tự mới xác nhận tệp nguyên vẹn.',
      'Nếu phát hiện sai lệch mã băm, lập tức cách ly tệp lỗi và phục hồi từ bản sao lưu lành mạnh gần nhất.',
    ],
    criticalRules: [
      'Không mở tệp gốc bằng phần mềm chỉnh sửa rồi lưu đè (Save), vì thao tác lưu lại sẽ thay đổi hoàn toàn mã SHA-256.',
      'Luôn kiểm tra SHA-256 trên chính tệp _ORIG chứ không chỉ kiểm tra trên tệp hiển thị đã nén.',
    ],
    checklist: [
      'Tệp gốc đã được sinh mã SHA-256 ngay khi tiếp nhận',
      'Đã lưu giữ mã SHA-256 trong hệ thống và bản xuất JSON/CSV',
      'Thực hiện đối chiếu lại SHA-256 sau khi sao chép sang bản sao lưu',
    ],
  },
  {
    id: 'original-management',
    order: '06',
    title: 'Quy trình quản lý bản gốc',
    summary:
      'Nguyên tắc bảo toàn tuyệt đối bản gốc vật lý và tệp số gốc (master), tách biệt hoàn toàn khỏi quá trình khai thác và chỉnh sửa.',
    standardRef: 'Nguyên tắc bảo tồn bất biến bản gốc DIGIARCHIVE',
    steps: [
      'Xác minh chính xác nơi lưu giữ hiện nay của bản gốc vật lý (phòng, tủ, hộp, số đăng ký) trước khi ghi nhận vào hồ sơ; nếu chưa kiểm chứng phải ghi rõ "Chưa xác định".',
      'Phân biệt rõ 3 khái niệm trong hồ sơ: Bản gốc (vật lý ban đầu), Bản sao (bản sao chụp/chứng thực vật lý), và Bản số (tệp tin số hoá).',
      'Khoá quyền chỉnh sửa đối với tệp số gốc (_ORIG); mọi thao tác cắt khung, xoay, tăng tương phản hoặc đóng dấu bản quyền chỉ thực hiện trên bản sao (_DISP).',
      'Kiểm tra trạng thái quyền công bố trước khi hiển thị tư liệu ra giao diện khai thác; tài liệu chưa được cấp quyền phải được ẩn nội dung hình ảnh.',
      'Ghi nhận đầy đủ nhật ký thay đổi và xuất phiếu mô tả tư liệu kèm hồ sơ vật lý.',
    ],
    criticalRules: [
      'Không tự nhận bản gốc đang lưu tại một địa điểm cụ thể nếu chưa có xác minh thực địa hoặc biên bản bàn giao.',
      'Không ghi đè tệp số gốc trong bất kỳ trường hợp nào.',
      'Không hiển thị công khai tài liệu hoặc phần nội dung nằm trong phạm vi hạn chế công bố.',
    ],
    checklist: [
      'Đã xác minh thực tế nơi lưu giữ bản gốc (hoặc ghi rõ Chưa xác định)',
      'Tệp gốc được gắn cờ bất biến, mọi chỉnh sửa thực hiện trên bản sao',
      'Đã kiểm tra người cho phép công bố và phạm vi sử dụng hợp lệ',
    ],
  },
];
