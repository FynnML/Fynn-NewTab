# Fynn New Tab

[English](README.md) · **Tiếng Việt**

Trang tab mới mang phong cách điện ảnh, tùy biến được, dành cho Brave và các trình duyệt Chromium khác. Đặt một hình ảnh hoặc video MP4 làm nền phía sau đồng hồ, thanh tìm kiếm và một vài widget tùy chọn.

Viết bằng HTML, CSS và JavaScript thuần (ES modules) trên Chrome Extension **Manifest V3**. Không framework, không bundler, không cần bước build.

## Ảnh chụp màn hình

| Tab mới | Dashboard |
| :---: | :---: |
| ![Tab mới](docs/screenshots/newtab.png) | ![Dashboard](docs/screenshots/dashboard.png) |

## Tính năng

- **Hình nền** — JPEG, PNG, WebP hoặc video MP4 (tối đa 50 MB mỗi tệp), lưu cục bộ. Ghim một hình nền, hoặc để hình nền Ngày/Đêm tự động chuyển đổi. Xem [Chế độ hình nền](#chế-độ-hình-nền).
- **Tìm kiếm** — Brave, Google, DuckDuckGo hoặc công cụ tìm kiếm do bạn tự đặt. Gõ URL hoặc tên miền sẽ mở thẳng trang đó, và 8 lượt tìm gần nhất luôn sẵn sàng. Xem [Tìm kiếm](#tìm-kiếm).
- **Widget** — Đồng hồ (12h/24h), Ngày, Lời chào, Tìm kiếm và Ghi chú. Mỗi widget đều bật/tắt được.
- **Lời chào** — câu chào ngẫu nhiên theo buổi trong ngày, chỉ chọn lại khi sang buổi mới.
- **Ghi chú** — tạo, sửa, ghim, đánh dấu hoàn thành và xóa các ghi chú ngắn.
- **Dashboard** — bảng trượt ra với các tab *Wallpapers*, *Widgets* và *Settings*.
- **Tùy chỉnh độ dễ đọc** — thanh chỉnh độ đậm lớp phủ (50–180%) và hiệu ứng làm tối/mờ nền khi đang tìm kiếm.
- **Trợ năng** — hộp thoại giữ focus, menu điều khiển được bằng bàn phím, video tự tạm dừng khi tab bị ẩn hoặc khi hệ điều hành yêu cầu giảm chuyển động.
- **Riêng tư và offline** — không analytics, không tài khoản, không background script. Yêu cầu mạng duy nhất là lượt tìm kiếm bạn gửi đi. Font được đóng gói sẵn nên không tải gì từ CDN.

## Yêu cầu

Trình duyệt nền Chromium hỗ trợ Manifest V3 (Brave, Chrome và tương tự). Khuyến nghị Chromium 102 trở lên.

## Cài đặt (unpacked)

Extension chưa có trên Chrome Web Store, nên bạn cần nạp nó dưới dạng extension chưa đóng gói (unpacked).

1. Lấy mã nguồn:
   ```bash
   git clone https://github.com/FynnML/Fynn-NewTab.git
   ```
   hoặc tải ZIP từ GitHub rồi giải nén.
2. Mở trang quản lý extension:
   - Brave: `brave://extensions`
   - Chrome: `chrome://extensions`
3. Bật **Developer mode** (góc trên bên phải).
4. Bấm **Load unpacked** và chọn thư mục chứa `manifest.json` (thư mục gốc của repo, **không phải** thư mục `newtab/`).
5. Mở một tab mới.

**Cập nhật:** chạy `git pull`, rồi bấm biểu tượng reload trên thẻ của extension trong trang extension.

### Xử lý sự cố

- **"Manifest file is missing or unreadable"** — bạn đã chọn nhầm thư mục. Hãy chọn thư mục chứa trực tiếp `manifest.json`.
- **Sửa file nhưng không thấy thay đổi** — reload extension từ trang extension, rồi mở một tab mới.
- **Hình nền không đổi theo giờ** — kiểm tra xem có hình nào đang ở chế độ **Primary** không; Primary luôn ghi đè lịch Ngày/Đêm.

## Cách sử dụng

Mở dashboard bằng nút hình bánh răng ở cuối cạnh phải màn hình. Bấm ra ngoài bảng, bấm lại nút đó hoặc nhấn `Esc` để đóng.

### Phím tắt

| Phím | Tác dụng |
| --- | --- |
| Bất kỳ ký tự nào | Nhảy vào ô tìm kiếm (khi không có ô nhập nào đang focus, dashboard đang đóng và không có hộp thoại nào mở) |
| `Enter` | Tìm kiếm, hoặc mở URL bạn vừa gõ |
| `↑` / `↓` | Di chuyển trong danh sách tìm kiếm gần đây |
| `Esc` | Đóng danh sách tìm kiếm gần đây, menu công cụ tìm kiếm hoặc dashboard (menu công cụ được đóng trước). Hộp thoại cũng đóng bằng `Esc` |

### Tìm kiếm

- **Công cụ:** Brave (mặc định), Google, DuckDuckGo hoặc **Custom**. Đổi bằng biểu tượng trong thanh tìm kiếm, hoặc trong *Settings → Default search engine*.
- **Công cụ tùy chỉnh:** nhập mẫu URL và đặt `%s` ở vị trí từ khóa, ví dụ `https://www.bing.com/search?q=%s`. Nếu không có `%s`, từ khóa sẽ được nối vào cuối URL.
- **Mở thẳng trang:** nội dung trông giống URL (`https://…`, `www.…`, `localhost:3000`, địa chỉ IPv4, hoặc tên miền có đuôi phổ biến như `github.com`) sẽ được mở trực tiếp thay vì tìm kiếm. Những cụm như `node.js` vẫn được coi là từ khóa tìm kiếm.
- **Tìm kiếm gần đây:** 8 mục gần nhất hiện ra khi bạn focus vào ô tìm kiếm đang trống. Xóa từng mục bằng nút ×.

### Widget

| Widget | Mặc định | Ghi chú |
| --- | :---: | --- |
| Clock | Bật | Mặc định 12 giờ, đổi sang 24 giờ trong *Settings* |
| Date | Bật | Thứ, tháng và ngày |
| Greeting | Bật | Sáu buổi, bắt đầu lúc 00:00, 05:00, 11:00, 13:00, 18:00, 22:00 |
| Search | Bật | Xem [Tìm kiếm](#tìm-kiếm) |
| Notes | **Tắt** | Tiêu đề tối đa 80 ký tự, nội dung tối đa 2000. Ghi chú đã ghim lên đầu, sau đó là ghi chú mới cập nhật gần nhất |

### Cài đặt

| Cài đặt | Mặc định | Tác dụng |
| --- | :---: | --- |
| Default search engine | Brave | Công cụ dùng khi mở tab mới |
| Custom engine URL | Bing | Chỉ hiện khi chọn *Custom* |
| Time format | 12-hour | Cách hiển thị đồng hồ |
| Search focus effect | Bật | Làm tối và mờ hình nền khi rê chuột vào hoặc focus ô tìm kiếm |
| Overlay strength | 100% | Làm tối hình nền để chữ dễ đọc (50–180%) |
| Reset settings | — | Đưa mọi cài đặt và công tắc widget ở trên về mặc định |

## Chế độ hình nền

Mở dashboard, vào **Wallpapers** và dùng menu thả xuống trên từng thẻ hình nền. Mỗi hình nền có đúng một chế độ:

| Chế độ | Tác dụng |
| --- | --- |
| **Primary** | Được ghim. Luôn hiển thị vào mọi thời điểm. Chỉ một hình nền có thể là Primary; chọn hình mới sẽ đưa hình cũ về Default. |
| **Day** | Hiển thị từ **06:00 đến 17:59**. |
| **Night** | Hiển thị từ **18:00 đến 05:59**. |
| **Default** | Dự phòng. Hình nền mới tải lên bắt đầu ở chế độ này. |

### Hình nền nào được hiển thị?

Quy tắc đầu tiên khớp sẽ thắng:

1. **Primary**, nếu có.
2. Hình nền **Day** hoặc **Night** khớp với giờ hiện tại.
3. Một hình nền **Default**.
4. **Hình nền tích hợp sẵn** đi kèm extension (`assets/wallpapers/default.mp4`).

Tức là *Primary* nghĩa là "luôn là hình này", còn *Day/Night* nghĩa là "chạy theo đồng hồ".

### Các cách thiết lập thường gặp

- **Một hình nền cố định:** đặt hình đó là **Primary**.
- **Tự động đổi ngày/đêm:** đặt một hình là **Day**, một hình là **Night**, và đảm bảo **không có hình nào là Primary**.
- **Chỉ thử xem:** để hình mới tải lên ở chế độ **Default**.

### Cần biết

- Giờ dựa trên đồng hồ máy tính của bạn và cố định ở 06:00 và 18:00, không gắn với giờ mặt trời mọc/lặn.
- Hình nền được kiểm tra lại mỗi phút và mỗi khi bạn quay lại tab, nên tự đổi mà không cần tải lại trang.
- Nếu nhiều hình nền cùng một chế độ, hình **được tải lên gần nhất** sẽ được dùng. Mỗi chế độ nên chỉ có một hình để tránh nhầm lẫn.
- Hình nền tích hợp sẵn không hiện trong dashboard và không thể xóa. Nó chỉ xuất hiện khi không có hình nền tùy chỉnh nào phù hợp, ví dụ lần chạy đầu tiên hoặc sau khi bạn xóa hết hình của mình.
- Video làm nền được tắt tiếng và lặp lại. Video tạm dừng khi tab bị ẩn và khi hệ thống ưu tiên giảm chuyển động.
- Video được tự động tạo ảnh thu nhỏ để xem trước trong dashboard.

## Dữ liệu của bạn

| Gì | Ở đâu |
| --- | --- |
| Hình nền và ghi chú | Cơ sở dữ liệu IndexedDB `FynnNewTabDB` (hình nền lưu dạng Blob) |
| Cài đặt, trạng thái widget, tìm kiếm gần đây, lời chào gần nhất | `localStorage` (các khóa bắt đầu bằng `fynn-` / `fynn:`) |

Quyền `unlimitedStorage` là quyền duy nhất extension yêu cầu, giúp bạn lưu được video nền dung lượng lớn. Extension không có host permission, content script hay background script.

**Reset settings** chỉ khôi phục tùy chọn. Hình nền, ghi chú và lịch sử tìm kiếm được giữ nguyên; xóa lịch sử tìm kiếm từng mục bằng nút ×. Gỡ extension sẽ xóa toàn bộ dữ liệu của nó.

## Cấu trúc dự án

```text
Fynn-NewTab/
├─ manifest.json
├─ LICENSE
├─ newtab/
│  ├─ index.html
│  ├─ style.css          # chỉ @import các module CSS bên dưới
│  ├─ app.js             # điểm vào: import và khởi động từng module tính năng
│  ├─ CSS/
│  │  ├─ variables.css   # design tokens
│  │  ├─ fonts.css       # @font-face cho font Inter và Great Vibes đi kèm
│  │  ├─ layout.css      # reset, bố cục hero, responsive
│  │  ├─ components.css  # thanh tìm kiếm, menu engine, hộp thoại, UI dùng chung
│  │  ├─ dashboard.css
│  │  ├─ greeting.css
│  │  ├─ notes.css
│  │  └─ wallpaper.css
│  └─ JS/
│     ├─ clock.js        # đồng hồ, ngày, cài đặt 12h/24h
│     ├─ dashboard.js    # bảng, tab, công tắc widget, cài đặt
│     ├─ db.js           # kết nối IndexedDB + các hàm promise nhỏ
│     ├─ dialog.js       # hộp thoại confirm/alert có hỗ trợ trợ năng
│     ├─ greeting.js     # lời chào theo buổi
│     ├─ notes.js        # widget ghi chú
│     ├─ search.js       # công cụ tìm kiếm, nhận diện URL, tìm kiếm gần đây
│     └─ wallpaper.js    # tải lên, chế độ, bộ lập lịch, độ đậm lớp phủ
├─ assets/
│  ├─ fonts/             # Inter và Great Vibes (tự host) + giấy phép OFL
│  ├─ icons/             # biểu tượng công cụ tìm kiếm
│  ├─ images/            # logo Fynn và icon extension
│  └─ wallpapers/        # hình nền tích hợp sẵn (default.mp4)
└─ docs/
   └─ screenshots/
```

`app.js` khởi động các tính năng chỉ dùng localStorage trước (lời chào, đồng hồ, tìm kiếm, lớp phủ, dashboard), sau đó mở IndexedDB và khởi động module hình nền và ghi chú. Một module lỗi sẽ không làm dừng các module còn lại.

## Tùy biến

Không có bước build. Sửa file rồi reload extension từ trang extension.

- **Hình nền tích hợp:** thay `assets/wallpapers/default.mp4` bằng video của bạn. MP4 dung lượng vừa phải giúp extension nhẹ và khởi động nhanh. Nếu muốn dùng tên tệp hoặc định dạng khác, sửa `DEFAULT_WALLPAPER_SRC` ở đầu `newtab/JS/wallpaper.js`. Nếu thiếu tệp, trang sẽ dùng nền tối đơn giản.
- **Câu chào:** sửa các danh sách `GREETINGS` trong `newtab/JS/greeting.js`, hoặc đổi mốc giờ trong `PERIODS`.
- **Thêm công cụ tìm kiếm:** thêm một mục vào `ENGINES` trong `newtab/JS/search.js`, một nút `.engine-option` tương ứng và một `<option>` trong `#searchEngineSetting` ở `newtab/index.html`, cùng một icon trong `assets/icons/`.
- **Giờ Ngày/Đêm:** sửa hàm `getScheduledWallpaperMode()` trong `newtab/JS/wallpaper.js`.

## Giấy phép

Mã nguồn phát hành theo [MIT License](LICENSE).

Các font đi kèm dùng [SIL Open Font License 1.1](assets/fonts/OFL.txt):

- [Inter](https://rsms.me/inter/) © The Inter Project Authors
- [Great Vibes](https://github.com/googlefonts/great-vibes) © The Great Vibes Pro Project Authors ([giấy phép](assets/fonts/OFL-GreatVibes.txt))