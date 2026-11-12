# Picklehead My Khe Beach Club — Hệ thống đặt sân Pickleball trực tuyến

Ứng dụng Next.js (App Router) + Supabase: đặt sân, thanh toán VietQR + ảnh minh chứng, quản lý ca,
bán hàng tại quầy, báo cáo doanh thu, hoàn tiền. 3 vai trò: Khách hàng / Nhân viên / Chủ sân.
Song ngữ Việt (mặc định) – Anh. Font Poppins, màu chủ đạo #1A6C2E.

## Công nghệ
- Next.js 16 (App Router, Route Handlers `/api/*`), TypeScript, Tailwind CSS 4, next-intl.
- Supabase: Auth (mật khẩu băm + phiên), PostgreSQL (26 bảng + 15 hàm giao dịch + RLS), Storage (4 bucket riêng tư).
- Chống trùng lịch bằng ràng buộc loại trừ (btree_gist); giao dịch nguyên tử bằng hàm plpgsql.

## Cài đặt
1. `npm install`
2. Tạo `.env.local` theo `.env.example` (điền khóa Supabase, cấu hình ngân hàng).
3. Áp CSDL: chạy `supabase/migrations/0001_schema.sql`, `0002_functions.sql`, `0003_rls.sql`
   rồi `supabase/seed/reference-data.sql` (hoặc gộp `supabase/setup.sql`) trong Supabase SQL Editor.
4. `npm run dev` → http://localhost:3000

## Lệnh
- `npm run dev` / `npm run build` / `npm start`
- `npm run lint` · `npm run typecheck` · `npm test` (kiểm thử đồng bộ i18n)

## Triển khai (Vercel)
- Đặt các biến môi trường trong `.env.example` ở Project Settings → Environment Variables.
- Không cần proxy trên Vercel; ứng dụng gọi Supabase trực tiếp.
- Vùng hàm nên chọn Singapore (sin1) cho gần Supabase.

## Tài khoản demo
Xem `DEMO_ACCOUNTS.md`. Mật khẩu demo không nằm trong mã nguồn.
