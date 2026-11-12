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

-- Hàng hóa & dịch vụ mẫu
insert into hang_hoa_dich_vu(ma_hhdv,ten_hhdv,loai,nhom,don_vi,gia,mo_ta,ton_kho) values
  ('HH0001','Nước suối Aquafina 500ml','Hàng hóa','Đồ uống','chai',10000,'Nước suối tinh khiết',200),
  ('HH0002','Nước tăng lực Revive','Hàng hóa','Đồ uống','chai',15000,'Bù khoáng',120),
  ('HH0003','Khăn thể thao','Hàng hóa','Phụ kiện','cái',35000,'Khăn cotton',60),
  ('DV0001','Thuê vợt Pickleball','Dịch vụ',null,'lượt',30000,'Vợt tiêu chuẩn',null),
  ('DV0002','Thuê bóng Pickleball','Dịch vụ',null,'lượt',10000,'Bóng thi đấu',null)
on conflict (ma_hhdv) do nothing;

-- Việc trong ca (mẫu theo từng ca)
insert into viec_trong_ca(ma_viec,ten_viec,gio_thuc_hien,mo_ta,ten_ca) values
  ('VC0001','Kiểm tra lưới và mặt sân','05:15','Đảm bảo lưới căng, mặt sân sạch','Ca sáng'),
  ('VC0002','Mở cửa và bật đèn khu vực','05:10',null,'Ca sáng'),
  ('VC0003','Kiểm kê hàng hóa đầu ca','12:10','Đối chiếu tồn kho','Ca chiều'),
  ('VC0004','Vệ sinh khu vực nghỉ','12:30',null,'Ca chiều'),
  ('VC0005','Tổng vệ sinh cuối ngày','21:40','Dọn sân, tắt đèn','Ca tối'),
  ('VC0006','Chốt doanh thu tiền mặt','21:50',null,'Ca tối')
on conflict (ma_viec) do nothing;

-- Cấu hình tài khoản nhận tiền (giá trị thật seed từ env trong seed.ts; dòng mẫu cho môi trường kiểm thử)
insert into cau_hinh(id,ngan_hang,ma_bin,chu_tai_khoan,so_tai_khoan,hotline) values
  (true,'Techcombank','970407','HO NGOC NGUYEN','52706939297979','0905999888')
on conflict (id) do nothing;
