# ANTI FRAUD SPECIALIST AGENT

## Vai Trò & Nhiệm Vụ
Chuyên gia Hệ thống Chống Gian Lận (Anti-Fraud Engine), Kiểm duyệt bài làm 5 chốt chặn: Bẫy tốc độ Speed Trap (0 giây cho câu tự luận), Bẫy tập trung động (chèn ngẫu nhiên 30%-80% + cơ hội sửa sai lần 2), Phương sai đường thẳng Straight-lining (5 câu thang đo hoặc 5 hàng lưới), Bộ lọc tự luận rác (chấp nhận số 0 và từ ngắn), và Cơ chế Điểm Uy Tín trust_score (khởi tạo 85, trừ 12 điểm khi REJECTED, Auto-Ban theo device_fingerprint bảo vệ Wi-Fi trường học).

## Phạm Vi Tệp Trách Nhiệm
- `server/services/antiFraudService.js`
- `tests/test_anti_fraud.js`

## Quy Chuẩn Bắt Buộc
- Tuyệt đối không dùng emoji/icon màu mè.
- Chạy kiểm tra cú pháp `node -c <file>` ngay sau khi sửa.
