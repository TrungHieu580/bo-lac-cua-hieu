# Bộ Lạc Của Hiếu

Game 2D pixel art mô phỏng sinh tồn và phát triển một bộ lạc thời tiền sử bên dòng sông. Bạn dẫn dắt sáu thành viên (Hiếu, Đá, Gió, Mây, Nụ, Sương) cùng săn bắt, hái lượm, khai hoang, trồng trọt và dựng lều. Bối cảnh và nhân vật đều là hư cấu.

**Chơi online:** https://trunghieu580.github.io/bo-lac-cua-hieu/

## Khởi chạy

- Trình duyệt: mở `index.html` (hoặc link GitHub Pages ở trên). Game không cần cài đặt hay thư viện ngoài.
- Chạy server cục bộ (tùy chọn): `python3 -m http.server 8000` rồi mở `http://localhost:8000`.
- Chạy được trên máy tính (chuột, bàn phím) và điện thoại (cảm ứng, bố cục dọc).
- Game tự lưu vào `localStorage` (bản đồ, kho, thành viên, ngày giờ, tiến độ công việc). Ở màn hình chính, bấm **Tiếp tục** để chơi tiếp đúng chỗ đã dừng.

## Điều khiển

| Thao tác | Máy tính | Điện thoại |
| --- | --- | --- |
| Chọn dân làng | Bấm vào nhân vật, giữ Shift để chọn thêm | Chạm vào nhân vật |
| Chọn nhiều người | Bảng **Dân làng** → đánh dấu | Bảng **Dân làng** → đánh dấu → **Xong · chọn mục tiêu** |
| Giao việc | Bấm mục tiêu → chọn người → **Giao việc** | Chạm mục tiêu → chọn người → **Giao việc** |
| Di chuyển camera | Kéo chuột, WASD hoặc phím mũi tên | Kéo một ngón |
| Phóng to / thu nhỏ | Cuộn chuột, phím + / − | Chụm hoặc mở hai ngón |
| Tạm dừng / tốc độ | Space, phím 1-2-3 | Nút **Tạm dừng** và **x1/x2/x4** |
| Mở bảng | V (Dân làng), B (Xây dựng), J (Nhật ký), Esc để đóng | Thanh nút dưới cùng |

Hành động theo mục tiêu: bụi quả → **Hái quả**; cây → **Đốn gỗ**; tảng đá → **Nhặt đá**; đồng cỏ có hươu → **Cử nhóm săn** (từ 2 người, xem trước tỷ lệ thành công, sản lượng và rủi ro); ruộng → **Dọn đất → Gieo hạt → Thu hoạch**; ô trống gần bếp lửa → **Xây lều**; kho → **Nâng cấp kho**; bếp lửa → **Nghỉ bên lửa**.

## Luật chính

- Một ngày: 6:00 làm việc → 18:00 về bếp lửa → 19:00 mỗi người ăn 1 khẩu phần → 21:00 ngủ và xem **nhật ký cuối ngày**.
- Tài nguyên chỉ được cộng vào kho khi nhân vật mang về tới kho. Mỗi điểm tài nguyên có trữ lượng; bụi quả mọc lại sau vài ngày.
- Thiếu ăn làm giảm sức khỏe và tinh thần. Làm việc lâu làm giảm năng lượng; người quá mệt tự bỏ việc để nghỉ, lý do hiện trong bảng Dân làng.
- Lều chứa 3 người ngủ, giúp hồi phục năng lượng tốt hơn. Mưa làm việc ngoài trời chậm lại nhưng giúp ruộng lớn nhanh hơn. Thanh trên hiện dự báo ngày mai.
- Làm việc cùng nhau tăng mức gắn kết. Cặp thân thiết làm nhanh hơn và ít mất tinh thần khi thất bại.
- **Mục tiêu:** đến hết ngày 10, dựng 2 lều, thu hoạch ít nhất 1 ruộng, dự trữ đủ 2 ngày ăn và giữ ít nhất 4 thành viên khỏe mạnh. Đạt mục tiêu rồi vẫn chơi tiếp được.

## Lộ trình chơi thử: từ ngày 1 đến lần thu hoạch đầu tiên

1. **Sáng ngày 1:** Chọn Mây và Nụ → chạm bụi quả gần trại → **Hái quả**. Mỗi chuyến có thêm hạt giống. Chọn Sương và Hiếu → chạm ruộng đất hoang gần trại → **Dọn đất** (6 giờ công, khoảng 3 giờ với 2 người). Chọn Đá và Gió → chạm đồng cỏ phía tây nam → **Cử nhóm săn**.
2. **Trưa ngày 1:** Khi có từ 3 hạt giống trở lên và ruộng đã dọn xong, chọn Sương → chạm ruộng → **Gieo hạt**. Hiếu chuyển sang **Đốn gỗ** ở bìa rừng.
3. **Chiều ngày 1:** Đá và Gió đi săn về thì cho **Nhặt đá** ở chân vách phía bắc. Tối, xem nhật ký và dự báo.
4. **Ngày 2–3:** Gom đủ 10 gỗ và 5 đá → nút **Xây dựng** → **Lều cỏ** → chạm ô trống gần bếp lửa → giao cho Hiếu và Đá. Mây và Nụ tiếp tục hái quả; Sương dọn ruộng thứ hai. Không đi săn vào ngày mưa.
5. **Ngày 4:** Dựng lều thứ hai. Cử Đá và Gió đi săn lần nữa để tăng dự trữ.
6. **Sáng ngày 5** (sớm hơn nếu có mưa): ruộng chín vàng. Chọn Sương (thêm một người nếu muốn) → chạm ruộng → **Thu hoạch**. Sau 2 giờ công, 10 phần lương thực được mang về kho theo từng chuyến. Đây là lần thu hoạch đầu tiên.

## Cấu trúc mã nguồn

| Tệp | Nội dung |
| --- | --- |
| `config.js` | **Toàn bộ thông số cân bằng**: chi phí, thời gian làm việc, sản lượng, năng lượng, săn bắt, thời tiết, thành viên |
| `art.js` | Pixel art vẽ bằng code: ô 24×24, cây, lều, kho, bếp lửa, thú, dân làng, biểu tượng |
| `world.js` | Tạo bản đồ 36×28, vật thể, lưới đi được, tìm đường A* |
| `sim.js` | Mô phỏng: thời gian, công việc, săn nhóm, canh tác, xây dựng, quan hệ, nhật ký, lưu và tải |
| `render.js` | Camera, vẽ theo bội số nguyên, sắp lớp theo tọa độ chân, ánh sáng ngày đêm, mưa |
| `ui.js` | Thanh trên và thanh dưới, bảng dân làng, xây dựng, nhật ký, bảng hành động, modal |
| `main.js` | Vòng lặp game, điều khiển chuột, cảm ứng, bàn phím, tự lưu |

## Đã kiểm tra

- Bot tự chơi 10 ngày với cấu hình hiện tại đạt mục tiêu.
- Hai nhóm cùng lấy một bụi quả: tổng thu không vượt trữ lượng.
- Đổi việc khi đang mang đồ: đồ vẫn được giao vào kho đúng một lần.
- Kho hết thức ăn: người thiếu khẩu phần được ghi tên và bị trừ sức khỏe.
- Tải lại giữa lúc xây lều: vật liệu không bị trừ lần nữa, tiến độ và việc được giữ nguyên.
- Chạy trên màn hình máy tính 1280×800 và trên điện thoại (iPhone 13, Pixel 7) bằng chuột lẫn thao tác chạm.

## Mở rộng sau bản đầu

Mùa khô và mùa mưa, đánh cá, thuần dưỡng thú, chế tác, truyền nghề và trao đổi với bộ lạc lân cận.
