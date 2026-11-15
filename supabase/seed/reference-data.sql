-- Dữ liệu tham chiếu (idempotent). Chạy sau migrations. Bank config seed riêng từ env trong seed.ts.

-- 2 sân
insert into san(ma_san,ten_san,mo_ta,trang_thai) values
  ('SAN01','Sân 1','Sân tiêu chuẩn Pickleball','Đang hoạt động'),
  ('SAN02','Sân 2','Sân tiêu chuẩn Pickleball','Đang hoạt động')
on conflict (ma_san) do nothing;

-- 3 dải khung giờ (theo ô "Khung giờ" Figma)
insert into khung_gio(ma_khung_gio,ten_khung_gio,gio_bat_dau,gio_ket_thuc) values
  ('KG01','05:00 - 08:00','05:00','08:00'),
  ('KG02','08:00 - 16:00','08:00','16:00'),
  ('KG03','16:00 - 22:00','16:00','22:00')
on conflict (ma_khung_gio) do nothing;

-- Giá theo (sân × khung giờ × loại ngày) = 12 dòng, muc_gia cho 30 phút. BR02: dải trước 16:00 < dải sau.
insert into gia_thue(ma_gia,ma_khung_gio,loai_ngay,muc_gia) values
  ('G_S1_KG01_WD','KG01','T2-T6', 80000), ('G_S1_KG01_WE','KG01','T7-CN',100000),
  ('G_S1_KG02_WD','KG02','T2-T6', 80000), ('G_S1_KG02_WE','KG02','T7-CN',100000),
  ('G_S1_KG03_WD','KG03','T2-T6',110000), ('G_S1_KG03_WE','KG03','T7-CN',130000),
  ('G_S2_KG01_WD','KG01','T2-T6', 80000), ('G_S2_KG01_WE','KG01','T7-CN',100000),
  ('G_S2_KG02_WD','KG02','T2-T6', 80000), ('G_S2_KG02_WE','KG02','T7-CN',100000),
  ('G_S2_KG03_WD','KG03','T2-T6',110000), ('G_S2_KG03_WE','KG03','T7-CN',130000)
on conflict (ma_gia) do nothing;

insert into san_gia_thue(ma_san,ma_gia) values
  ('SAN01','G_S1_KG01_WD'),('SAN01','G_S1_KG01_WE'),('SAN01','G_S1_KG02_WD'),
  ('SAN01','G_S1_KG02_WE'),('SAN01','G_S1_KG03_WD'),('SAN01','G_S1_KG03_WE'),
  ('SAN02','G_S2_KG01_WD'),('SAN02','G_S2_KG01_WE'),('SAN02','G_S2_KG02_WD'),
  ('SAN02','G_S2_KG02_WE'),('SAN02','G_S2_KG03_WD'),('SAN02','G_S2_KG03_WE')
on conflict do nothing;

-- Hàng hóa & dịch vụ mẫu (theo đặc tả Figma UI_21, UI_22, UI_47)
insert into hang_hoa_dich_vu(ma_hhdv,ten_hhdv,loai,nhom,don_vi,gia,mo_ta,anh_minh_hoa,ton_kho) values
  ('HH0001','Nước suối Aquafina','Hàng hóa','Đồ uống','Chai',15000,'Chai 500 ml','/images/products/aquafina.png',200),
  ('HH0002','Sting đỏ','Hàng hóa','Đồ uống','Chai',25000,'Chai 500 ml','/images/products/sting.png',120),
  ('HH0003','Bóng pickleball','Hàng hóa','Phụ kiện','Quả',20000,'Bóng ngoài trời · 40 lỗ','/images/products/ball.png',100),
  ('HH0004','Quấn cán vợt','Hàng hóa','Phụ kiện','Chiếc',30000,'Loại chống trượt · 1 chiếc','/images/products/grip.png',80),
  ('DV0001','Thuê vợt pickleball','Dịch vụ',null,'vợt / buổi',30000,'Vợt tiêu chuẩn, phù hợp mọi trình độ','/images/products/racket.png',null),
  ('DV0002','Khăn thể thao','Dịch vụ',null,'khăn / buổi',10000,'Khăn sạch, sử dụng trong suốt buổi chơi','/images/products/towel.png',null),
  ('DV0003','Huấn luyện viên','Dịch vụ',null,'giờ',200000,'Hướng dẫn kỹ thuật cơ bản và nâng cao','/images/products/coach.png',null)
on conflict (ma_hhdv) do update set
  ten_hhdv = excluded.ten_hhdv,
  loai = excluded.loai,
  nhom = excluded.nhom,
  don_vi = excluded.don_vi,
  gia = excluded.gia,
  mo_ta = excluded.mo_ta,
  anh_minh_hoa = excluded.anh_minh_hoa,
  ton_kho = excluded.ton_kho,
  da_xoa = false;

-- Việc trong ca (theo đặc tả Figma UI_20)
insert into viec_trong_ca(ma_viec,ten_viec,gio_thuc_hien,mo_ta,ten_ca) values
  ('VC0001','Kiểm tra mặt sân và lưới đầu ca','05:15','Đảm bảo mặt sân sạch và lưới căng tiêu chuẩn','Ca sáng'),
  ('VC0002','Bổ sung nước uống tại quầy hàng hóa','06:00','Kiểm tra và làm đầy tủ mát đồ uống','Ca sáng'),
  ('VC0003','Đối chiếu 1 đơn chuyển khoản chờ xác nhận','08:00','Đơn của Lê Hoàng Nam · 220.000đ','Ca sáng'),
  ('VC0004','Chuẩn bị vợt thuê cho khung giờ 18:00','17:30','4 cây vợt tiêu chuẩn · Sân 01, Sân 02','Ca sáng')
on conflict (ma_viec) do update set
  ten_viec = excluded.ten_viec,
  gio_thuc_hien = excluded.gio_thuc_hien,
  mo_ta = excluded.mo_ta,
  ten_ca = excluded.ten_ca;

-- Cấu hình tài khoản nhận tiền (giá trị thật seed từ env trong seed.ts; dòng mẫu cho môi trường kiểm thử)
insert into cau_hinh(id,ngan_hang,ma_bin,chu_tai_khoan,so_tai_khoan,hotline) values
  (true,'Techcombank','970407','HO NGOC NGUYEN','52706939297979','0905999888')
on conflict (id) do nothing;
