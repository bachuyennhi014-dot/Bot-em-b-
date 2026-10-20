# 🤖 DISCORD BOT HỆ THỐNG ORDER & QUẢN LÝ SERVER (24/7)

Hệ thống Bot Discord thực tế viết bằng **Node.js** và **discord.js v14**, tích hợp cơ sở dữ liệu bền vững (SQLite WAL / PostgreSQL), hỗ trợ chạy 24/7 với PM2 hoặc Docker.

---

## 📋 MỤC LỤC

1. [Kiến Trúc & Điểm Nổi Bật](#1-kiến-trúc--điểm-nổi-bật)
2. [Cây Thư Mục Dự Án](#2-cây-thư-mục-dự-án)
3. [Tạo Discord Bot & Lấy Token](#3-tạo-discord-bot--lấy-token)
4. [Tạo Link Mời Bot (Invite Link)](#4-tạo-link-mời-bot-invite-link)
5. [Cài Đặt & Cấu Hình .env](#5-cài-đặt--cấu-hình-env)
6. [Khởi Chạy Bot & Đăng Ký Slash Commands](#6-khởi-chạy-bot--đăng-ký-slash-commands)
7. [Hướng Dẫn Chạy 24/7 Với PM2 & Docker](#7-hướng-dẫn-chạy-247-với-pm2--docker)
8. [Chi Tiết Lệnh & Quy Trình Hoạt Động](#8-chi-tiết-lệnh--quy-trình-hoạt-động)
9. [Hệ Thống Tiền Tệ & "Lợn Đất Của Em Bé"](#9-hệ-thống-tiền-tệ--lợn-đất-của-em-bé)
10. [Bảo Mật & Xử Lý Vi Phạm](#10-bảo-mật--xử-lý-vi-phạm)

---

## 1. KIẾN TRÚC & ĐIỂM NỔI BẬT

- **Admin Tối Cao Duy Nhất:** Discord User ID `1402913586853974156` (kiểm tra trực tiếp ID, không qua nickname/role).
- **Hệ Thống Phân Quyền 3 Cấp:** Admin, Mod (lưu database), Khách hàng (role cấu hình theo guild).
- **Prefix Lệnh:** `*P`
- **Slash Commands:** `/odersetup` và `/setupnhandon`
- **Quỹ Bot ("🐷 Lợn đất của em bé"):** Quỹ tài chính chung của BOT, **hoàn toàn tách biệt** với ví người chơi. Mỗi khi khách thanh toán thành công: Tiền trừ từ ví cá nhân và cộng đúng số đó vào Quỹ Bot.
- **Chống Double Payment & Race Condition:** Sử dụng giao dịch nguyên tử (Atomic Database Transaction & Mutex Lock). Đơn đã thanh toán sẽ bị khoá vĩnh viễn, không thể thanh toán lần 2.
- **Bảo Mật & Mute Tự Động:**
  - Người dùng không có quyền cố ý gọi lệnh Admin/Mod (`*Pmute`, `*Punmute`, `*Paddmod`, `*Plondatebe`, `*Pchecksv`,...): **Tự động Mute BOT 10 phút**.
  - Dùng lệnh `*Poder` sai kênh quá 3 lần: **Tự động Mute BOT 10 phút**.
  - Người bị Mute: Không thể dùng prefix, slash command, button, select menu hay modal của bot.
- **Tính Năng "Mua Nhà 🔓":** Tự động tạo kênh văn bản riêng tư thực tế bằng Discord API, phân quyền chỉ cho người mua và Bot thấy.
- **Dữ Liệu Bền Vững 100%:** Toàn bộ giỏ hàng, đơn hàng đang chờ duyệt, số dư ví, quỹ bot, trạng thái mute, danh sách mod đều lưu trong SQLite WAL / PostgreSQL, **không mất dữ liệu khi restart bot**.

---

## 2. CÂY THƯ MỤC DỰ ÁN

```
project/
├── bot.js                       # Điểm khởi chạy nhanh của bot
├── package.json                 # Khai báo dependencies & scripts
├── .env.example                 # Mẫu cấu hình môi trường
├── ecosystem.config.cjs         # Cấu hình chạy 24/7 với PM2
├── Dockerfile                   # Docker build container 24/7
├── docker-compose.yml           # Docker Compose cấu hình volume
├── README.md                    # Tài liệu hướng dẫn toàn diện
├── data/                        # Thư mục chứa database SQLite (tự sinh)
└── src/
    └── bot/
        ├── index.js             # Khởi tạo Discord Client & Reconnect Handler
        ├── config.js            # Cấu hình Admin ID, Prefix, Thực đơn đồ ăn/uống
        ├── deploy-commands.js   # Script đăng ký Slash Commands lên Discord
        ├── database/
        │   └── db.js            # Quản lý SQLite WAL, Schemas, Atomic Transactions
        ├── services/
        │   ├── economyService.js       # Xử lý Ví, Quỹ Lợn đất, Thanh toán nguyên tử
        │   ├── orderService.js         # Quản lý Giỏ hàng bền vững & Vòng đời đơn
        │   ├── muteService.js          # Hệ thống Mute, Hết hạn tự động, Auto-mute
        │   ├── modService.js           # Kiểm tra Admin & Quản lý Mod
        │   ├── configService.js        # Cấu hình kênh order & Đếm vi phạm sai kênh
        │   └── privateChannelService.js # Tạo kênh Discord riêng tư (Mua nhà)
        ├── middleware/
        │   └── guard.js         # Chặn Mute & Tự động phạt 10 phút vi phạm quyền
        ├── commands/
        │   ├── messageHandler.js       # Điều phối các lệnh prefix (*P)
        │   ├── prefix/
        │   │   ├── poder.js            # Giao diện Order 5 mục
        │   │   ├── pmute.js            # Mute người dùng dùng Bot
        │   │   ├── punmute.js          # Bỏ mute
        │   │   ├── plondatebe.js       # Xem số dư Quỹ Lợn đất
        │   │   ├── paddmod.js          # Thêm Mod mới (Chỉ Admin)
        │   │   └── pchecksv.js         # Kiểm tra tất cả server bot tham gia
        │   └── slash/
        │       ├── odersetup.js        # /odersetup #kênh @role
        │       └── setupnhandon.js     # /setupnhandon #kênh @role
        ├── interactions/
        │   ├── index.js         # Điều phối toàn bộ Interaction
        │   ├── buttonHandler.js # Xử lý Button (Menu, Duyệt đơn, Thanh toán)
        │   └── modalHandler.js  # Xử lý Modal (Số lượng, Nạp thẻ, Tên phòng)
        ├── utils/
        │   ├── embedBuilder.js  # Bộ Embed chuyên nghiệp
        │   ├── logger.js        # Ghi log console & database audit log
        │   └── timeParser.js    # Parse thời gian (10s, 10p, 2h, vv) & Định dạng kc
        └── scripts/
            └── seed-wallet.js   # Script nạp thử nghiệm kim cương vào ví
```

---

## 3. TẠO DISCORD BOT & LẤY TOKEN

1. Truy cập [Discord Developer Portal](https://discord.com/developers/applications).
2. Bấm **New Application**, đặt tên bot và bấm **Create**.
3. Vào tab **Bot** (cột trái):
   - Bấm **Reset Token** để lấy Bot Token. Lưu token này vào file `.env` mục `DISCORD_TOKEN`.
   - **BẬT BẮT BUỘC 3 INTENTS QUAN TRỌNG:**
     - ✅ **Presence Intent**
     - ✅ **Server Members Intent**
     - ✅ **Message Content Intent**
   - Bấm **Save Changes**.
4. Vào tab **General Information**, sao chép **Application ID (Client ID)** và dán vào `.env` mục `CLIENT_ID`.

---

## 4. TẠO LINK MỜI BOT (INVITE LINK)

Vào tab **OAuth2** > **URL Generator**:
1. Trong mục **Scopes**, chọn:
   - ✅ `bot`
   - ✅ `applications.commands`
2. Trong mục **Bot Permissions**, chọn các quyền sau:
   - ✅ **Manage Channels** *(để tạo kênh riêng khi khách mua nhà)*
   - ✅ **View Channels**
   - ✅ **Send Messages**
   - ✅ **Send Messages in Threads**
   - ✅ **Embed Links**
   - ✅ **Attach Files**
   - ✅ **Read Message History**
   - ✅ **Use External Emojis**
3. Sao chép link URL ở dưới cùng và mở trên trình duyệt để mời Bot vào Discord Server của bạn.

---

## 5. CÀI ĐẶT & CẤU HÌNH .ENV

Tạo file `.env` từ file mẫu `.env.example`:

```bash
cp .env.example .env
```

Nội dung `.env`:

```env
# Token lấy từ Discord Developer Portal
DISCORD_TOKEN="YOUR_BOT_TOKEN_HERE"

# Client ID của ứng dụng
CLIENT_ID="YOUR_APPLICATION_ID_HERE"

# Admin tối cao duy nhất
BOT_ADMIN_ID="1402913586853974156"

# Tiền tố lệnh
PREFIX="*P"

# Database: Để trống sẽ tự dùng SQLite tại ./data/bot.sqlite
DATABASE_URL=""

# Giá mua kênh riêng (kc)
DEFAULT_HOUSE_PRICE="200000"
```

---

## 6. KHỞI CHẠY BOT & ĐĂNG KÝ SLASH COMMANDS

### Cài đặt thư viện:
```bash
npm install
```

### Đăng ký Slash Commands (/odersetup, /setupnhandon):
```bash
npm run deploy-commands
```

### Khởi chạy Bot:
```bash
npm start
# Hoặc: node bot.js
```

### Nạp thử kim cương vào ví người chơi để test:
```bash
# Nạp 500.000 kc cho Admin:
node src/bot/scripts/seed-wallet.js 1402913586853974156 500000

# Nạp cho user bất kỳ:
node src/bot/scripts/seed-wallet.js <USER_ID> <SỐ_TIỀN>
```

---

## 7. HƯỚNG DẪN CHẠY 24/7 VỚI PM2 & DOCKER

### Cách 1: Sử dụng PM2 (Khuyên dùng trên VPS Linux/Windows)

PM2 giúp bot tự động restart ngay lập tức khi process gặp sự cố hoặc máy chủ khởi động lại:

```bash
# 1. Cài đặt PM2 toàn cục
npm install -g pm2

# 2. Khởi động bot thông qua file ecosystem cấu hình sẵn
pm2 start ecosystem.config.cjs

# 3. Lưu danh sách tiến trình
pm2 save

# 4. Thiết lập tự chạy cùng hệ điều hành
pm2 startup

# Xem log thời gian thực:
pm2 logs discord-order-bot

# Kiểm tra trạng thái:
pm2 status
```

### Cách 2: Sử dụng Docker & Docker Compose

```bash
# Khởi động bot ở chế độ nền:
docker compose up -d

# Xem log bot:
docker compose logs -f

# Dừng bot:
docker compose down
```

*Lưu ý: Thư mục `./data` được gắn volume trực tiếp ra máy chủ, đảm bảo khi tắt/mở container không bao giờ bị mất dữ liệu database.*

---

## 8. CHI TIẾT LỆNH & QUY TRÌNH HOẠT ĐỘNG

### 1. Lệnh Trợ Giúp: `*Phelp` (Cho Tất Cả Thành Viên)

- Cú pháp: `*Phelp` (hoặc `*Ptrogiup`, `*Pcommands`).
- Hiển thị bảng Embed chi tiết phân rõ làm 2 mục:
  1. **Mục cho Mọi người (Thành viên / Khách hàng):** Hướng dẫn dùng `*Phelp` và quy trình đặt món `*Poder`.
  2. **Mục cho Admin & Mod:** Hướng dẫn các lệnh quản trị `*Plondatebe`, `*Pmute`, `*Punmute`, `*Paddmod`, `*Pchecksv`, `/odersetup`, `/setupnhandon`.
- Kèm quy tắc cảnh báo tự động Mute 10 phút khi cố ý dùng sai quyền.

### 2. Thiết lập Server (Chỉ Admin `1402913586853974156`)

- `/odersetup #kênh @role`: Thiết lập kênh khách hàng được phép đặt món và role khách hàng.
- `/setupnhandon #kênh @role`: Thiết lập kênh nhận đơn và role nhân viên trực đơn.

### 3. Lệnh Order: `*Poder`

- Khách có role chỉ định vào đúng kênh order gõ: `*Poder`.
- Bot gửi Embed tương tác gồm 5 danh mục:
  1. **1️⃣ Đồ ăn:** 🥐 Bánh sừng bò (10.000 kc), 🍫 Bánh socola (20.000 kc), 🍰 Bánh kem cheses (50.000 kc), 🧀 Phô mai (5.000 kc).
  2. **2️⃣ Nước uống:** 🧋 Trà sữa (15.000 kc), 🍋 Trà chanh (10.000 kc), 🍵 Matcha latte (20.000 kc), 🍑 Trà đào (15.000 kc), 💧 Nước lọc (1.000 kc).
  3. **3️⃣ Nạp thẻ:** Mở modal nhập số kc muốn nạp. Trạng thái giao dịch: `TOPUP_PENDING`.
  4. **4️⃣ Giỏ hàng:** Xem các món đã thêm, chỉnh sửa, thanh toán toàn bộ giỏ.
  5. **5️⃣ Mua nhà 🔓:** Nhập tên phòng riêng. Giá: 200.000 kc. Khi được duyệt và thanh toán thành công, Bot tự tạo kênh Discord riêng tư chỉ có người mua và bot xem được.

### 3. Quy Trình Duyệt Đơn & Thanh Toán

1. **Khách đặt món** bấm **💎 Thanh toán bằng tiền**:
   - Tiền **CHƯA** bị trừ.
   - Bot tạo đơn hàng trạng thái `PENDING_ACCEPTANCE`.
   - Gửi Embed tới **Kênh nhận đơn** cho nhân viên kèm 2 nút: `✅ Nhận đơn` và `❌ Từ chối nhận đơn`.
2. **Nhân viên xử lý**:
   - Nếu bấm `❌ Từ chối nhận đơn`: Đơn chuyển sang `REJECTED`, gửi thông báo cho khách, tiền không bị trừ.
   - Nếu bấm `✅ Nhận đơn`: Đơn chuyển sang `ACCEPTED`, gửi hoá đơn có nút **💎 Thanh toán** cho khách.
3. **Khách thanh toán**:
   - Bấm **💎 Thanh toán**:
   - Bot kiểm tra ví người chơi: Nếu thiếu tiền => Báo lỗi "Bạn không đủ kim cương", không trừ tiền.
   - Nếu đủ tiền: Thực hiện **Atomic Transaction**:
     - **Trừ ví khách** đúng số tiền đơn.
     - **Cộng Quỹ "🐷 Lợn đất của em bé"** đúng số tiền đơn.
     - Chuyển đơn sang `PAID`.
     - Vô hiệu hoá nút thanh toán, chống tuyệt đối bấm nhiều lần (Double payment).
   - Nếu là đơn "Mua nhà", Bot tiến hành tạo kênh Discord riêng tư ngay lập tức.

### 4. Quản Lý Quỹ: `*Plondatebe`

- Dành cho **Admin & Mod**.
- Hiển thị:
  - 🐷 **Lợn đất của em bé**
  - Số dư quỹ: `💎 xxx.xxx kc`
  - Tổng tiền đã thu: `💎 xxx.xxx kc`
  - Tổng tiền đã rút: `💎 xxx.xxx kc`
  - Số giao dịch: `xxx`

### 5. Quản Lý Mod: `*Paddmod @user`

- **Chỉ Admin** `1402913586853974156`.
- Cấp quyền Mod để được dùng `*Pmute`, `*Punmute`, `*Plondatebe`.

### 6. Mute Bot: `*Pmute @user <thời gian>` & `*Punmute @user`

- Dành cho **Admin & Mod**.
- Cú pháp: `*Pmute @user 10s`, `10p`, `2h`, `vv` (vĩnh viễn).
- Khác với ban/kick Discord, lệnh này **cấm tương tác với BOT** (không dùng được prefix, slash command, button, select menu hay modal).

### 7. Kiểm Tra Server: `*Pchecksv`

- **Chỉ Admin** `1402913586853974156`.
- Lấy danh sách thực tế toàn bộ các server bot đang tham gia từ Discord API (bao gồm cả server riêng tư).
- Hỗ trợ xem thông tin ID, số thành viên, chủ server, quyền Administrator và nút chuyển trang `⬅️` `➡️`.

---

## 9. HỆ THỐNG TIỀN TỆ & "LỢN ĐẤT CỦA EM BÉ"

> ⚠️ **ĐẶC BIỆT LƯU Ý:**
> - **VÍ NGƯỜI CHƠI:** Tiền riêng của từng cá nhân dùng để mua sắm.
> - **🐷 LỢN ĐẤT CỦA EM BÉ:** Quỹ chung duy nhất của BOT/Server.
>
> Khi người chơi mua hàng thành công:
> - Ví người chơi **bị trừ**.
> - Quỹ Lợn đất **được cộng**.
>
> Người chơi thông thường tuyệt đối không có quyền can thiệp hay rút tiền từ quỹ này.

---

## 10. BẢO MẬT & XỬ LÝ VI PHẠM

1. **Tự Động Mute 10 Phút Vi Phạm Quyền Quản Trị:**
   - Nếu User thường cố tình gọi lệnh `*Pmute`, `*Punmute`, `*Paddmod`, `*Plondatebe`, `*Pchecksv`,... Bot sẽ từ chối và **tự động MUTE BOT 10 phút**, đồng thời ghi nhận vào bảng `violations`.
2. **Tự Động Mute 10 Phút Vi Phạm Kênh Order:**
   - Nếu gọi `*Poder` sai kênh chỉ định quá 3 lần: Hệ thống tự động kích hoạt phạt **MUTE BOT 10 phút**.
3. **Phòng Ngừa Lỗi Mất Dữ Liệu Khi Mất Mạng/Khởi Động Lại:**
   - Trình nghe sự kiện Gateway tự động kết nối lại khi mất mạng.
   - Toàn bộ trạng thái giỏ hàng, đơn hàng, cấu hình, mute được lưu ngay lập tức vào database đĩa cứng.

---
*Phát triển chuyên nghiệp với Discord.js & Node.js — Hoạt động 24/7 ổn định.*
