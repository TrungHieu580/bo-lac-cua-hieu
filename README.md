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

## Làng tự vận hành và phát triển (bản cập nhật)

- **Tự động:** mỗi người rảnh tự chọn việc hợp nghề theo nhu cầu của làng (thu hoạch, gieo hạt, dọn đất, xây, hái quả, đi săn theo cặp, đốn gỗ, nhặt đá). Làng tự dựng lều khi thiếu chỗ ngủ, tự nâng cấp kho, tự mở thêm ruộng. Nút **Tự động** dưới cùng để bật/tắt, chọn ưu tiên (Cân bằng / Thức ăn / Xây dựng / Mở rộng) và bật/tắt tự sang ngày mới (mặc định bật: hết ngày tự sang sáng hôm sau, chỉ hiện tóm tắt ngắn). Việc bạn giao tay luôn được ưu tiên.
- **Dân số:** mỗi đêm, nếu còn chỗ ngủ trống, thức ăn đủ từ 3 ngày và tinh thần trung bình từ 55, có thể có người lang thang xin gia nhập; cặp thân thiết (gắn kết từ 70) có thể sinh con. Trẻ con lớn sau 4 ngày rồi mới làm việc.
- **Mở mang:** bản đồ mới 48×36 có bãi cạn qua sông và bãi săn thứ hai bên bờ đông; mở ruộng mới trên bãi cỏ trống; gốc cây mọc thành cây con rồi thành cây; đá tảng mới lộ ra ở nền đá.
- **Công trình mới:** Giàn phơi thịt (mở khóa khi có 7 người: +30 sức chứa thức ăn, thịt săn +25%), Kho lương (9 người: +60 sức chứa thức ăn), Nhà dài (10 người: chỗ ngủ cho 6). Dân làng đi xuyên qua mọi công trình nên không bị kẹt.
- **Kho nhiều cấp:** kho có 4 cấp (sức chứa 40 → 100 → 180 → 300 mỗi loại). Khi gỗ, đá hoặc thức ăn đầy từ 90%, làng ưu tiên nâng cấp kho trước mọi việc xây khác.
- **Ngủ trong lều:** 20:30 mọi người rời bếp lửa, đi về lều hoặc nhà dài của mình rồi vào trong ngủ (trên lều hiện Zzz). Ai không còn chỗ phải ngủ ngoài trời bên lửa, hồi sức kém hơn. Ngày kết thúc khi cả làng đã ngủ yên.
- **Cấp bộ lạc = cấp lửa trại** (5 cấp: Bếp lửa → Lửa trại → Đống lửa lớn → Lửa thiêng → Ngọn lửa tổ tiên). Chạm vào lửa trại để nâng cấp (tốn gỗ, đá, giờ công, cần đủ dân). Mỗi cấp: dân số tối đa 14 / 22 / 30 / 36 / 40, bán kính xây dựng +2 ô, thú dữ sợ lửa xa hơn, ánh lửa sáng hơn, mỗi đêm tinh thần tăng thêm. Lửa trại lớn dần: vòng đá, cột tổ, đầu lâu, cờ, tàn lửa bay.
- **Tù trưởng, Tiên tri, Vu sư:** Hiếu là Tù trưởng (mũ lông) — khi tù trưởng khỏe, cả làng làm việc nhanh hơn 3% mỗi cấp bộ lạc. Cấp 2 mở **Tiên tri** (mũ trùm trắng, lông xanh): báo mộng trước giờ và hướng thú dữ sẽ tới (người gác đánh mạnh hơn 20%, dân chạy sớm hơn), mỗi đêm tăng tinh thần. Cấp 3 mở **Vu sư** (mặt nạ sừng): đi chữa thương cho người bị thương, làm lễ cầu mưa khi ruộng đang lớn, ban phúc đi săn. Làng tự phong chức; chạm lửa trại → Phong Tiên tri / Phong Vu sư để chọn người khác.
- **Kho lương xây thêm được** (tối đa 8, mỗi cái +60 thức ăn). Khi kho chính đã cấp cao nhất mà thức ăn sắp đầy, làng tự xây thêm kho lương.
- **Khai thác đá mạnh hơn:** tảng đá cho 12 đá, mỗi chuyến 3 đá; đá tảng mới lộ ra thường xuyên hơn; từ cấp bộ lạc 2 có 3 **Mỏ đá** ở vùng núi đá (40 đá, mỗi chuyến 4, hồi 16 mỗi đêm).
- **Cân bằng gỗ và đá:** làng cố giữ tỉ lệ gỗ : đá khoảng 1,3 : 1 — bên nào thiếu thì nhiều người được cử đi khai thác bên đó hơn (bảng Tự động ghi rõ đang ưu tiên gì).
- **Nhiệm vụ có thưởng (21 nhiệm vụ):** dựng lều, thu hoạch, đốn gỗ, khai thác đá, lên cấp bộ lạc, hạ thú dữ, tăng dân số, em bé đầu tiên, tồn tại 30 ngày... Thưởng: gỗ, đá, thức ăn, hạt giống, giáo đá, tinh thần/sức khỏe cả làng, +1 kỹ năng, người mới gia nhập, ruộng lớn nhanh, Phúc lành tổ tiên (làm nhanh hơn 10–15% trong vài ngày). Ô Mục tiêu hiện 3 nhiệm vụ đang làm và nút Nhận; quá 2 ngày tự nhận.
- **Nhà chữa bệnh** (mở khi 6 dân, tối đa 2): người có sức khỏe dưới 45 tự vào nằm chữa (tối đa 4 người mỗi nhà), hồi 10 sức khỏe mỗi giờ, thêm 8 mỗi giờ khi vu sư tới chăm; nằm qua đêm được. Trên mái hiện dấu cộng xanh và số người đang chữa.
- **Nhà bếp** (mở khi 7 dân): làng cử một người nấu ăn mỗi chiều; nấu đủ 2 giờ thì bữa tối tiết kiệm 25% thức ăn, mỗi người +3 sức khỏe, +3 tinh thần. Khói bốc lên từ ống khói khi đang nấu.
- **Chuồng thú — chăn nuôi** (mở khi 9 dân, tối đa 3 chuồng): mỗi chuồng bắt đầu với 2 con dê, chứa tối đa 6. Có người chăn thả mỗi sáng thì dê cho sữa (1 thức ăn mỗi 2 con), 35% sinh dê con mỗi đêm; chuồng đầy thì mổ một con (+6 thịt). Không ai chăn thì dê có thể sổng chuồng. Đi săn thành công có 30% bắt sống thêm dê. Sói và hổ có thể vồ dê nếu không có người canh gác.
- **Công trình đồ sộ:** Đền tổ tiên (bộ lạc cấp 3; 80 gỗ, 120 đá, 40 giờ công: mỗi đêm tinh thần +5, thu hút người mới), Vòng đá thiêng (cấp 4; 40 gỗ, 200 đá, 55 giờ công: tinh thần +3, ruộng 30% lớn thêm một bậc mỗi đêm), Đại sảnh tù trưởng (cấp 5; 200 gỗ, 150 đá, 70 giờ công: chỗ ngủ 12 người, cả làng làm nhanh hơn 5%). Tối đa 6 người cùng xây. Có thêm 5 nhiệm vụ cho các công trình mới (tổng 26 nhiệm vụ).
- **Di chuyển công trình:** mọi công trình (lều, nhà dài, kho chung, kho lương, giàn phơi, chòi canh, nhà chữa bệnh, nhà bếp, chuồng thú, xưởng, đền, vòng đá, đại sảnh, cả công trường đang xây) đều có nút **Di chuyển** trong bảng thông tin: chọn chỗ mới, bấm **Chuyển** — miễn phí, chuyển ngay, giữ nguyên tiến độ xây và dê trong chuồng. Không chuyển được khi đang có người ngủ hay nằm chữa bên trong. Lửa trại và ruộng đứng yên.
- **Lưới: Bật/Tắt:** khi xây mới hoặc di chuyển, có thể tắt hít lưới để đặt tự do (máy tính: giữ Shift khi chạm).
- **Xây dựng thẳng hàng:** lều và công trình mới đặt theo lưới quanh lửa trại (các dãy thẳng, cách nhau một lối đi); khi tự chọn vị trí, ô trống hiện gạch đứt và lều tự hít vào ô gần nhất. Ruộng mới mở thẳng hàng, cách đều với ruộng cũ.
- **Thú dữ & bảo vệ làng:** từ ngày 3, ban ngày có thể có sói (ngày 8 trở đi có khi đi thành bầy), gấu (từ ngày 7, nhắm vào kho thức ăn) hoặc hổ (từ ngày 12) tới làng. Dân thường chạy về bếp lửa vì thú (trừ gấu) sợ lửa. Mỗi người có thêm kỹ năng **Bảo vệ**; làng tự cử người canh gác (1 người khi đủ 7 dân, 2 khi 14, 3 khi 24), người giỏi Bảo vệ (từ 3) tự ra giúp khi thiếu người. Hạ được thú thì có thịt và có thể lên kỹ năng. Giao tay: chạm bếp lửa → Canh gác làng / Đánh đuổi thú.
- **Dụng cụ săn bắn — giáo đá:** chế ở bếp lửa (2 gỗ + 1 đá, 1,5 giờ; ở Xưởng chế tác nhanh hơn). Người cầm giáo đánh thú mạnh hơn 70% và ít bị thương hơn; nhóm săn mang giáo dễ thành công hơn, được nhiều thịt hơn. Giáo có thể gãy. Làng tự chế giáo khi thiếu.
- **Chòi canh** (mở khi 8 dân): người gác đứng ở chòi, phát hiện thú từ xa để dân kịp chạy, đánh mạnh hơn 25% gần chòi.
- **Gia đình:** mỗi người có giới tính. Nam và nữ gắn kết từ 60 sẽ nên duyên vợ chồng. Mỗi cặp vợ chồng được xếp một lều riêng (con nhỏ ngủ cùng cha mẹ); chỉ khi cả hai cùng vào lều riêng ban đêm (trên lều hiện trái tim) thì sáng hôm sau người vợ mới có thể mang thai (3 ngày, làm việc chậm hơn, không đi săn) rồi sinh con. Làng tự xây thêm lều khi số cặp vợ chồng nhiều hơn số lều. Bảng Dân làng ghi bạn đời, đang mang thai, con của ai.
- **Mở khóa theo dân số:** 7 người — Giàn phơi thịt; 8 — Câu cá (bến cá dọc bờ sông, mỗi đêm cá hồi lại); 9 — Kho lương; 10 — Nhà dài và Lễ hội lửa trại mỗi 7 ngày (tốn thức ăn, tăng mạnh tinh thần và gắn kết); 12 — Lều thảo dược (mọi người hồi thêm sức khỏe mỗi đêm); 14 — Xưởng chế tác (xây dựng, đốn gỗ, nhặt đá nhanh hơn 20%). Dân số tối đa 40.
- Bản lưu cũ vẫn chơi tiếp được trên bản đồ cũ 36×28 với đầy đủ tính năng mới; chọn **Chơi mới** để có bản đồ lớn.

## Mở rộng sau bản đầu

Mùa khô và mùa mưa, đánh cá, thuần dưỡng thú, chế tác, truyền nghề và trao đổi với bộ lạc lân cận.
