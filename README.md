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
| `civ.js` | Cấp công trình, hạ tầng theo dân số, nghiên cứu, luyện chế, ngành nghề, luật lệ, quân đội & hành quân |
| `land.js` | Bản đồ mở rộng theo cấp bộ lạc, khai hoang rừng, bắc cầu, ranh giới đất làng |
| `saga.js` | Giữ lửa, bốn mùa, voi ma mút, thám hiểm, chó & ngựa, phát minh & thời đại, bộ lạc lân cận, tranh hang |

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

## Văn minh bộ lạc (civ.js)

- **Cấp công trình:** lều cỏ → nhà gỗ → nhà đá (3/4/5 chỗ ngủ), nhà dài 6/8/10; kho lương, giàn phơi (sức chứa ×1,5/×2), bếp, xưởng, nhà chữa bệnh, lều thảo dược, chòi canh, chuồng thú, giếng, trường, nhà hiền triết, doanh trại, lò luyện đều có 3 cấp với hình vẽ/cờ hiệu riêng. Cấp 2 cần 12 dân hoặc bộ lạc cấp 2; cấp 3 cần phát minh Xây đá và 22 dân hoặc bộ lạc cấp 4. Làng tự nâng cấp khi dư vật liệu, ưu tiên chỗ đang thiếu.
- **Định mức hạ tầng theo dân số:** nhà ở, kho lương thực, nước sạch (Giếng nước, 12 người/giếng mỗi cấp), chữa bệnh, phòng thủ, tâm linh, học tập, đường lát đá (lát đá đường đất quanh làng, đi nhanh hơn 30%). Đủ hết: tinh thần +2 mỗi đêm; thiếu: tinh thần giảm, thiếu nước thì sinh bệnh. Làng tự xây thêm hạ tầng còn thiếu.
- **Nghiên cứu:** Nhà hiền triết — học giả nghĩ ra ý tưởng mỗi giờ. 7 phát minh mới: Thảo dược, Xây đá, Luyện quặng, Đội hình chiến đấu, Luật truyền khẩu, Y thuật, Binh pháp.
- **Luyện chế:** Luyện quặng → mỏ quặng đồng ở đồi đá + Lò luyện (2 quặng + 1 gỗ → 1 đồng thỏi). Thợ rèn ở Xưởng chế tác tự làm thứ đang thiếu: giáo đồng, cung tên, giáp da, thuốc thảo dược, công cụ đồng, chum gốm.
- **Ngành nghề:** học giả, thợ rèn, thầy dạy nghề, chiến binh (làng tự cử theo dân số). Trường dạy nghề: trẻ con đi học; làm việc lâu thì lên kinh nghiệm, kỹ năng tới bậc 6–7 (bậc thầy) khi trường được nâng cấp.
- **Luật lệ & kỷ luật:** Chia đều thức ăn, Kính lão & truyền nghề, Lao động chung, Tế lễ định kỳ, Nghĩa vụ quân sự, Giờ giới nghiêm — mỗi luật có lợi có hại; số luật tăng theo cấp bộ lạc. Kỷ luật (0–100) ảnh hưởng tốc độ làm việc và sức chiến đấu; quá thấp thì dân cãi nhau.
- **Quân đội:** Doanh trại (6/10/14 chiến binh), chiến binh luyện tập mỗi ngày, tự ra trận khi có thú dữ/đột kích; trang bị giáo đồng, cung, giáp. **Hành quân** (chạm doanh trại): diệt hang thú dữ (làng yên ổn 5 ngày), tấn công trại Bộ lạc Đá Đỏ (họ thần phục và nộp cống mỗi ngày), chinh phục vùng đất xa (đá, quặng, hạt giống, người theo về).
- **Thịnh vượng:** ở bộ lạc cấp 5, xây Đại sảnh tù trưởng (+5) và giữ mức sống từ 85% trở lên khi đã biết Xây đá (+5) — giới hạn dân số tăng từ 40 lên tối đa 50.
- **Đoàn buôn:** thức ăn, gỗ hoặc đá đầy trên 85% kho thì mỗi đêm làng mang bớt sang Bộ lạc Đá Đỏ đổi lấy thứ đang thiếu (hạt giống, quặng, áo lông, đồng thỏi, ý tưởng); không thiếu gì thì biếu quà cho tới khi kết minh.
- **Đại tiệc mùa màng:** kho thức ăn trên 92% thì mở tiệc lớn (tốn 15% kho, cách nhau ít nhất 3 ngày): tinh thần +6, sức khỏe +4, dân làng thêm gắn bó.
- **Sửa lỗi:** dân số tính cả người đang thám hiểm/hành quân và em bé sắp sinh nên không còn vượt giới hạn; mỗi lần thu hoạch giữ lại 4 hạt giống (sức chứa hạt 40) nên ruộng không còn bỏ trống vì thiếu hạt; bản đồ mở rộng luôn có bãi săn mới (nếu vùng đất mới chật thì chọn đồng cỏ/rừng khác xa làng và dọn cây bụi).

## Đất đai mở rộng (land.js)

- **Bản đồ lớn dần theo cấp bộ lạc:** 48×36 → 56×42 → 64×48 → 72×54 → 80×60 ô. Mỗi lần lửa trại lên cấp, đất nới ra mọi phía: sông và vách đá kéo dài tự nhiên, thêm rừng, đồng cỏ, đồi đá có tảng đá, bụi quả và một bãi săn mới. Bản lưu cũ tự nới theo cấp hiện tại khi nạp.
- **Ranh giới đất làng:** khi chọn chỗ xây hoặc di chuyển, vòng gạch vàng cho thấy vùng được phép xây (bán kính tăng theo dân số và cấp bộ lạc); có thông báo mỗi khi đất làng nới rộng.
- **Khai hoang rừng:** chạm cây → **Khai hoang** đánh dấu vùng 5×5 ô; dân làng đốn cây, đào gốc (được gỗ), đất thành bãi cỏ trống vĩnh viễn. Khi làng hết chỗ xây hoặc mở ruộng, làng tự khai hoang khu rừng gần nhất.
- **Bắc cầu qua sông:** chạm vào sông → **Bắc cầu** (tối đa 7 ô, mỗi ô 4 gỗ + 1 đá, 1,5 giờ công). Xây xong người và thú đi qua được.

## Di chuyển ruộng & tự sắp xếp làng

- **Ruộng di chuyển được** như công trình: chạm ruộng → **Di chuyển**, giữ nguyên trạng thái (đất đã dọn, lúa đang lớn, lúa chờ mang về). Ruộng tự hít vào lưới thẳng hàng với các ruộng khác.
- **Tự sắp xếp làng** (bảng Xây dựng → **Sắp xếp**): gom công trình cùng loại vào từng khu — kho & chế biến (kho, giàn phơi, kho lương, bếp, xưởng) sát bếp lửa, nhà ở (lều, nhà dài), khu tâm linh (đền, vòng đá, đại sảnh, vách tranh), chữa bệnh, chăn nuôi, chòi canh rải ở rìa làng; ruộng xếp liền nhau thành một cánh đồng. Miễn phí, chuyển ngay, có nút **Hoàn tác**. Sau đó làng tự xây công trình mới cạnh khu cùng loại.

## Cảm hứng từ phim & truyện (Quest for Fire, Alpha, Earth's Children, The Croods, Origins)

Tất cả nằm trong `saga.js`, thông số trong `config.js` (FIRE, SEASONS, MAMMOTH, EXPEDITION, PETS, INVENT, NEIGHBOR).

- **Giữ lửa** *(Quest for Fire)*: lửa trại có lượng củi (🔥 % trên thanh trên), cháy nhanh hơn khi mưa, mùa đông và khi lửa lớn. Mưa bão ban đêm có thể dập bớt lửa. Làng tự cử người thêm củi (3 gỗ → +30%) khi lửa yếu và trước khi trời tối, và để dành gỗ cho lửa. Lửa tắt: thú dữ hết sợ, Nhà bếp không nấu được, ban đêm mọi người lạnh và buồn; phải **Nhóm lại lửa** (cọ que, có thể phải thử nhiều lần) hoặc **Xin lửa** bộ lạc lân cận.
- **Bốn mùa & mùa đông băng hà** *(Earth's Children)*: Xuân – Hạ – Thu – Đông, mỗi mùa 3 ngày. Mùa đông tuyết rơi, bụi quả không ra trái, ruộng lớn chậm, thú ở đồng cỏ sinh sôi chậm, lửa ngốn củi. Ai không có **áo lông thú** bị rét mỗi đêm. Áo lông có được khi săn thành công, hạ thú dữ, săn voi ma mút, đổi với bộ lạc lân cận; qua mỗi mùa đông một phần áo sờn rách.
- **Săn voi ma mút theo nhóm**: thỉnh thoảng (nhiều hơn vào thu, đông) một đàn voi ma mút đi qua đồng cỏ, ở lại 2 ngày. Cần ít nhất 5 thợ săn (3 nếu có đồng minh): cả nhóm tập hợp quanh đàn voi rồi vây đánh 2 giờ. Thành công: 40 thịt + 6 áo lông, ghi vào ký ức. Rủi ro bị thương cao; giáo, chó, ngựa, cung tên giúp tăng tỷ lệ.
- **Thám hiểm vùng đất mới** *(The Croods)*: chạm lửa trại → chọn 2–3 người. Đoàn đi ra bìa bản đồ, rời làng 2 ngày (1 ngày nếu có ngựa), rồi trở về với: mỏ đá lửa, hạt giống lạ, áo lông, ý tưởng mới, người mới, sói con, gặp bộ lạc khác, ngựa hoang… hoặc gặp hổ răng kiếm. Làng tự cử đoàn mỗi 7 ngày khi đủ 12 dân.
- **Thuần hóa sói và ngựa** *(Alpha)*: hạ sói có 35% tìm được sói con; sau 4 ngày nó thành chó săn (tối đa 4). Chó đi theo người canh gác, lao vào thú dữ, sủa báo động (thú bị phát hiện sớm), giúp đi săn. Từ bộ lạc cấp 2, ngựa hoang xuất hiện ở đồng cỏ → **Thuần ngựa** (3 giờ công); ngựa sống trong chuồng thú, giúp săn và thám hiểm nhanh hơn.
- **Phát minh và thời đại** *(Origins)*: mỗi đêm có ý tưởng (theo dân số, xưởng, tiên tri, vách tranh). 11 phát minh qua 3 thời đại — Đồ đá cũ: Bẫy thú, Que khoan lửa, Kim xương & áo da, Rìu đá; Đồ đá mới (3 phát minh + bộ lạc cấp 2): Đồ gốm, Cung tên, Liềm đá, Giày da; Đồ đồng (3 phát minh + bộ lạc cấp 4): Luyện đồng, Bánh xe, Lịch mùa vụ. Chọn nghiên cứu ở bảng Tự động.
- **Bộ lạc lân cận — Bộ lạc Đá Đỏ**: gặp từ ngày 6 hoặc qua thám hiểm. Họ tới thăm với một đề nghị trao đổi: **Đổi**, **Tặng quà** hay **Đuổi đi**. Quan hệ ≥ 75 thì kết minh (gửi quà, cho lửa, góp người săn voi, có người về làm dâu rể); dưới 25 thì họ kéo tới đột kích kho lương (đánh lui như thú dữ). Đôi khi có tranh chấp làm quan hệ xấu đi. Khi bật Tự động, làng tự trao đổi hoặc tặng quà nếu dư dả.
- **Tranh hang & ký ức bộ lạc**: các sự kiện lớn (lửa lên cấp, em bé đầu tiên, voi ma mút, chó đầu tiên, phát minh, thời đại mới, kết minh, vượt mùa đông…) được ghi thành ký ức. Xây **Vách đá vẽ tranh** (8 dân) để dân làng vẽ ký ức lên đá bằng đất son — mỗi bức +1 ý tưởng, cả làng vui hơn; chạm vào vách để xem lịch sử bộ lạc.
- Thêm 12 nhiệm vụ mới (phát minh, áo lông, mùa đông, chó, voi ma mút, thám hiểm, trao đổi, tranh, ngựa, thời đại).

## Mở rộng sau bản đầu

Truyền nghề, đánh cá bằng thuyền, các bộ lạc khác, lễ hội theo mùa.
