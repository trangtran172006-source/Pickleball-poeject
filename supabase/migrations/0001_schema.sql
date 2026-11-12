-- PHASE 6 · Picklehead My Khe Beach Club — Schema (21 bảng gốc + 5 bảng bổ sung)
-- Mọi giá trị trạng thái lưu bằng tiếng Việt theo System Design; giao diện ánh xạ sang khóa dịch.
-- Thời gian nghiệp vụ theo Asia/Ho_Chi_Minh. Giá muc_gia tính cho 30 phút.

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- ============================================================= NGƯỜI DÙNG & VAI TRÒ
create table nguoi_dung (
  ma_nguoi_dung        varchar(12) primary key,
  auth_user_id         uuid unique references auth.users(id) on delete cascade,
  ho_ten               varchar(70)  not null,
  email                varchar(255) not null unique,
  so_dien_thoai        varchar(10)  not null unique,
  vai_tro              varchar(10)  not null check (vai_tro in ('customer','staff','owner')),
  gioi_tinh            varchar(5)   check (gioi_tinh in ('Nam','Nữ','Khác')),
  ngay_sinh            date,
  anh_dai_dien         text,
  da_xac_thuc          boolean      not null default false,
  trang_thai_tai_khoan varchar(10)  not null default 'Hoạt động' check (trang_thai_tai_khoan in ('Hoạt động','Khóa')),
  dang_nhap_gan_nhat   timestamptz,
  hoat_dong_gan_nhat   timestamptz,
  ngay_tao             timestamptz  not null default now()
);

create table khach_hang (
  ma_nguoi_dung varchar(12) primary key references nguoi_dung(ma_nguoi_dung) on delete cascade,
  nam_sinh      smallint
);

create table nhan_vien (
  ma_nguoi_dung varchar(12) primary key references nguoi_dung(ma_nguoi_dung) on delete cascade,
  ma_nhan_vien  varchar(15) not null unique
);

create table chu_san (
  ma_nguoi_dung varchar(12) primary key references nguoi_dung(ma_nguoi_dung) on delete cascade
);

-- ============================================================= SÂN, KHUNG GIỜ, GIÁ
create table san (
  ma_san      varchar(10) primary key,
  ten_san     varchar(50) not null,
  mo_ta       varchar(255),
  trang_thai  varchar(20) not null default 'Đang hoạt động' check (trang_thai in ('Đang hoạt động','Đóng cửa')),
  kiem_tra_luc timestamptz not null default now()
);

-- 3 dải khung giờ theo ô "Khung giờ" của Figma (05–08, 08–16, 16–22)
create table khung_gio (
  ma_khung_gio varchar(10) primary key,
  ten_khung_gio varchar(40) not null,
  gio_bat_dau   time not null,
  gio_ket_thuc  time not null
);

-- Giá = hàm (khung giờ, loại ngày); muc_gia cho 30 phút
create table gia_thue (
  ma_gia       varchar(12) primary key,
  ma_khung_gio varchar(10) not null references khung_gio(ma_khung_gio),
  loai_ngay    varchar(6)  not null check (loai_ngay in ('T2-T6','T7-CN')),
  muc_gia      numeric(12,0) not null check (muc_gia >= 0)
);

-- Nối sân ↔ giá (mỗi sân có bộ giá riêng)
create table san_gia_thue (
  ma_san varchar(10) not null references san(ma_san) on delete cascade,
  ma_gia varchar(12) not null references gia_thue(ma_gia) on delete cascade,
  primary key (ma_san, ma_gia)
);

-- ============================================================= ĐẶT SÂN
create table don_dat_san (
  ma_dat_san        varchar(12) primary key,
  ma_nguoi_dung     varchar(12) references nguoi_dung(ma_nguoi_dung),  -- NULL: khách vãng lai do NV đặt hộ
  ten_nguoi_dat     varchar(70) not null,
  sdt_nguoi_dat     varchar(10) not null,
  email_nguoi_dat   varchar(255),
  ngay_dat          timestamptz not null default now(),
  tong_gio          numeric(4,1) not null,
  tong_tien         numeric(12,0) not null,
  trang_thai_dat_san varchar(20) not null default 'Chờ xác nhận'
                     check (trang_thai_dat_san in ('Chờ xác nhận','Đã xác nhận','Đã hoàn tất','Đã hủy','Đã hủy – hoàn tiền')),
  ghi_chu           varchar(255),
  nguoi_tao         varchar(12) references nguoi_dung(ma_nguoi_dung),  -- NV/chủ đặt hộ
  da_nhan_san_luc   timestamptz,
  ma_dong_cua       varchar(12),  -- FK đặt sau khi có bảng lich_dong_cua_san
  ngay_choi         date not null
);

create table chi_tiet_dat_san (
  ma_chi_tiet   varchar(14) primary key,
  ma_dat_san    varchar(12) not null references don_dat_san(ma_dat_san) on delete cascade,
  ma_san        varchar(10) not null references san(ma_san),
  ngay_thue     date not null,
  gio_bd        time not null,
  gio_kt        time not null,
  thanh_tien    numeric(12,0) not null,
  hieu_luc      boolean not null default true,
  khoang        tsrange generated always as (tsrange((ngay_thue + gio_bd), (ngay_thue + gio_kt))) stored,
  check (gio_kt > gio_bd),
  -- BR2: chống trùng ở tầng DB — không hai dòng đang hiệu lực cùng sân có khoảng thời gian giao nhau
  exclude using gist (ma_san with =, khoang with &&) where (hieu_luc)
);

-- Khóa tạm 5 phút
create table lich_dat_tam_khoa (
  ma_tam_khoa      varchar(14) primary key,
  ma_dat_san       varchar(12) not null references don_dat_san(ma_dat_san) on delete cascade,
  ma_san           varchar(10) not null references san(ma_san),
  ngay_thue        date not null,
  gio_bd           time not null,
  gio_kt           time not null,
  nguoi_giu        varchar(12) references nguoi_dung(ma_nguoi_dung),
  trang_thai       varchar(12) not null default 'Đang giữ' check (trang_thai in ('Đang giữ','Đã xác nhận','Hết hạn','Đã hủy')),
  thoi_gian_het_han timestamptz not null,
  ngay_tao         timestamptz not null default now()
);

create table thanh_toan (
  ma_thanh_toan        varchar(14) primary key,
  ma_dat_san           varchar(12) not null references don_dat_san(ma_dat_san) on delete cascade,
  tong_tien            numeric(12,0) not null,
  phuong_thuc          varchar(20) not null default 'Chuyển khoản' check (phuong_thuc in ('Chuyển khoản')),
  minh_chung           text,
  trang_thai_thanh_toan varchar(25) not null default 'Chờ thanh toán'
                       check (trang_thai_thanh_toan in ('Chờ thanh toán','Đã thanh toán','Thanh toán không hợp lệ','Chờ hoàn tiền','Đã hoàn tiền')),
  thoi_gian_thanh_toan timestamptz,
  doi_soat_boi         varchar(12) references nguoi_dung(ma_nguoi_dung),
  doi_soat_luc         timestamptz
);

create table giao_dich_hoan_tien (
  ma_hoan_tien        varchar(14) primary key,
  ma_dat_san          varchar(12) not null references don_dat_san(ma_dat_san) on delete cascade,
  so_tien             numeric(12,0) not null,
  nguyen_nhan         varchar(255),
  lua_chon_khach      varchar(255),
  hinh_anh_minh_chung text,
  trang_thai          varchar(20) not null default 'Chờ hoàn tiền' check (trang_thai in ('Chờ hoàn tiền','Đã hoàn tiền','Từ chối hoàn tiền')),
  nguoi_thuc_hien     varchar(12) references nguoi_dung(ma_nguoi_dung),
  thoi_gian_hoan      timestamptz,
  ngay_tao            timestamptz not null default now()
);

create table lich_su_thay_doi (
  ma_lich_su     varchar(14) primary key,
  ma_dat_san     varchar(12) not null references don_dat_san(ma_dat_san) on delete cascade,
  trang_thai     varchar(30) not null,
  nguoi_thuc_hien varchar(12) references nguoi_dung(ma_nguoi_dung),
  ly_do          varchar(255),
  thoi_gian      timestamptz not null default now()
);

-- ============================================================= HÀNG HÓA & DỊCH VỤ
create table hang_hoa_dich_vu (
  ma_hhdv      varchar(12) primary key,
  ten_hhdv     varchar(100) not null,
  loai         varchar(10) not null check (loai in ('Hàng hóa','Dịch vụ')),
  nhom         varchar(20) check (nhom in ('Đồ uống','Phụ kiện')),
  don_vi       varchar(20) not null,
  gia          numeric(12,0) not null check (gia >= 0),
  mo_ta        varchar(255),
  anh_minh_hoa text,
  ton_kho      integer,            -- NULL = không giới hạn (dịch vụ)
  da_xoa       boolean not null default false
);

create table don_hhdv (
  ma_don        varchar(12) primary key,
  ma_nguoi_dung varchar(12) not null references nguoi_dung(ma_nguoi_dung), -- người lập (NV/chủ)
  tong_tien     numeric(12,0) not null,
  phuong_thuc   varchar(12) not null check (phuong_thuc in ('Tiền mặt','Chuyển khoản')),
  ngay_tao      timestamptz not null default now()
);

create table ct_don_hhdv (
  ma_don      varchar(12) not null references don_hhdv(ma_don) on delete cascade,
  ma_hhdv     varchar(12) not null references hang_hoa_dich_vu(ma_hhdv),
  so_luong    integer not null check (so_luong > 0),
  don_gia     numeric(12,0) not null,
  thanh_tien  numeric(12,0) not null,
  primary key (ma_don, ma_hhdv)
);

-- ============================================================= OTP
create table otp (
  ma_otp_id    varchar(14) primary key,
  email        varchar(255) not null,
  ma_otp       text not null,          -- bản băm
  muc_dich     varchar(20) not null check (muc_dich in ('Đăng ký','Quên mật khẩu')),
  so_lan_sai   smallint not null default 0,
  da_su_dung   boolean not null default false,
  het_han_luc  timestamptz not null,
  ngay_tao     timestamptz not null default now()
);

-- ============================================================= BÁO CÁO
create table bao_cao_doanh_thu (
  ma_bao_cao   varchar(14) primary key,
  loai_bc      varchar(20) not null check (loai_bc in ('Thuê sân','Hàng hóa dịch vụ')),
  loai_tg      varchar(20) not null check (loai_tg in ('Ngày','Tuần','Tháng','Năm','Khoảng thời gian')),
  tu_ngay      date not null,
  den_ngay     date not null,
  tong_tien    numeric(14,0) not null default 0,
  thoi_gian_lap timestamptz not null default now(),
  nguoi_lap    varchar(12) references nguoi_dung(ma_nguoi_dung),
  check (den_ngay >= tu_ngay)
);

-- ============================================================= CA LÀM
create table dang_ky_ca_lam (
  ma_ca_lam      varchar(12) primary key,
  ma_nguoi_dung  varchar(12) not null references nguoi_dung(ma_nguoi_dung) on delete cascade,
  ma_nhan_vien   varchar(15) not null,
  ngay_lam_viec  date not null,
  gio_bat_dau_ca time not null,
  gio_ket_thuc_ca time not null,
  ten_ca         varchar(10) not null check (ten_ca in ('Ca sáng','Ca chiều','Ca tối')),
  trang_thai     varchar(15) not null default 'Chưa hoàn thiện' check (trang_thai in ('Chưa hoàn thiện','Đã hoàn thiện')),
  nguoi_tao      varchar(12) references nguoi_dung(ma_nguoi_dung),
  ngay_tao       timestamptz not null default now(),
  unique (ma_nguoi_dung, ngay_lam_viec, gio_bat_dau_ca)
);

create table lich_su_ca_lam (
  ma_lich_su_ca   varchar(14) primary key,
  ma_ca_lam       varchar(12) not null references dang_ky_ca_lam(ma_ca_lam) on delete cascade,
  thoi_gian_vao_ca timestamptz not null default now()
);

-- ============================================================= 5 BẢNG BỔ SUNG
create table thong_bao (
  ma_thong_bao  varchar(14) primary key,
  ma_nguoi_dung varchar(12) not null references nguoi_dung(ma_nguoi_dung) on delete cascade,
  loai          varchar(30) not null,
  tham_so       jsonb not null default '{}'::jsonb,
  ma_dat_san    varchar(12) references don_dat_san(ma_dat_san) on delete set null,
  da_doc        boolean not null default false,
  thoi_gian     timestamptz not null default now()
);

create table lich_dong_cua_san (
  ma_dong_cua varchar(12) primary key,
  ma_san      varchar(10) not null references san(ma_san) on delete cascade,
  ly_do       varchar(10) not null check (ly_do in ('Bảo trì','Thời tiết','Sự cố')),
  bat_dau     timestamptz not null,
  ket_thuc    timestamptz not null,
  nguoi_tao   varchar(12) references nguoi_dung(ma_nguoi_dung),
  ngay_tao    timestamptz not null default now(),
  check (ket_thuc > bat_dau)
);

alter table don_dat_san add constraint fk_don_dong_cua
  foreign key (ma_dong_cua) references lich_dong_cua_san(ma_dong_cua) on delete set null;

create table viec_trong_ca (
  ma_viec      varchar(12) primary key,
  ten_viec     varchar(100) not null,
  gio_thuc_hien time,
  mo_ta        varchar(255),
  ten_ca       varchar(10) check (ten_ca in ('Ca sáng','Ca chiều','Ca tối'))
);

create table viec_trong_ca_hoan_thanh (
  ma_ca_lam     varchar(12) not null references dang_ky_ca_lam(ma_ca_lam) on delete cascade,
  ma_viec       varchar(12) not null references viec_trong_ca(ma_viec) on delete cascade,
  hoan_thanh_luc timestamptz not null default now(),
  primary key (ma_ca_lam, ma_viec)
);

create table cau_hinh (
  id            boolean primary key default true check (id),  -- một dòng duy nhất
  ngan_hang     varchar(60) not null,
  ma_bin        varchar(6)  not null,
  chu_tai_khoan varchar(70) not null,
  so_tai_khoan  varchar(30) not null,
  hotline       varchar(15) not null
);

-- ============================================================= INDEX
create index idx_ctds_san_ngay   on chi_tiet_dat_san (ma_san, ngay_thue);
create index idx_dds_nguoi_ngay  on don_dat_san (ma_nguoi_dung, ngay_dat desc);
create index idx_dds_trang_thai  on don_dat_san (trang_thai_dat_san);
create index idx_tb_nguoi_doc    on thong_bao (ma_nguoi_dung, da_doc);
create index idx_don_hhdv_ngay   on don_hhdv (ngay_tao);
create index idx_dkcl_ngay       on dang_ky_ca_lam (ngay_lam_viec);
create index idx_ldcs_san_kg     on lich_dong_cua_san (ma_san, bat_dau, ket_thuc);
create index idx_otp_email       on otp (email, muc_dich);
create index idx_ldtk_het_han    on lich_dat_tam_khoa (thoi_gian_het_han) where (trang_thai = 'Đang giữ');
