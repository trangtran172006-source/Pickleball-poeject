-- Picklehead My Khe · setup.sql — chạy MỘT lần trong Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> dán toàn bộ -> Run).
-- Gồm: 26 bảng + 15 hàm giao dịch + RLS + dữ liệu tham chiếu. Idempotent ở phần seed.

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
-- PHASE 6 · Hàm giao dịch nguyên tử (plpgsql). Chỉ service_role gọi (PostgREST rpc).
-- Mọi nghiệp vụ ghi dữ liệu đi qua các hàm này để đảm bảo tính nguyên tử + chống trùng.

-- Sequence sinh mã
create sequence if not exists seq_nd;   create sequence if not exists seq_dds;
create sequence if not exists seq_ctds; create sequence if not exists seq_tk;
create sequence if not exists seq_tt;   create sequence if not exists seq_ht;
create sequence if not exists seq_ls;   create sequence if not exists seq_don;
create sequence if not exists seq_tb;   create sequence if not exists seq_dc;
create sequence if not exists seq_cl;   create sequence if not exists seq_lsca;
create sequence if not exists seq_otp;

-- ===== Helper: loại ngày (T2-T6 / T7-CN)
create or replace function loai_ngay(p_ngay date) returns varchar as $$
  select case when extract(dow from p_ngay) in (0,6) then 'T7-CN' else 'T2-T6' end;
$$ language sql immutable;

-- ===== Helper: timestamptz từ ngày+giờ naive, hiểu theo Asia/Ho_Chi_Minh
create or replace function ts_hcm(p_ngay date, p_gio time) returns timestamptz as $$
  select (p_ngay + p_gio) at time zone 'Asia/Ho_Chi_Minh';
$$ language sql immutable;

-- ===== Helper: tính tiền 1 khoảng của 1 sân (cộng theo từng ô 30 phút theo đúng khung giờ)
create or replace function tinh_tien(p_san varchar, p_ngay date, p_bd time, p_kt time)
returns numeric as $$
declare v_total numeric := 0; v_cell time; v_ld varchar := loai_ngay(p_ngay); v_price numeric;
begin
  v_cell := p_bd;
  while v_cell < p_kt loop
    select g.muc_gia into v_price
      from san_gia_thue sg
      join gia_thue g on g.ma_gia = sg.ma_gia
      join khung_gio k on k.ma_khung_gio = g.ma_khung_gio
      where sg.ma_san = p_san and g.loai_ngay = v_ld
        and v_cell >= k.gio_bat_dau and v_cell < k.gio_ket_thuc
      limit 1;
    if v_price is null then raise exception 'NO_PRICE' using errcode='P0001'; end if;
    v_total := v_total + v_price;
    v_cell := v_cell + interval '30 minutes';
  end loop;
  return v_total;
end;
$$ language plpgsql stable;

-- ===== Helper: sân có đóng cửa trong khoảng không?
create or replace function san_dong_cua(p_san varchar, p_tu timestamptz, p_den timestamptz)
returns boolean as $$
  select exists(select 1 from lich_dong_cua_san
    where ma_san = p_san and tstzrange(bat_dau,ket_thuc) && tstzrange(p_tu,p_den));
$$ language sql stable;

-- ===== Dọn khóa tạm hết hạn (gọi nội bộ + cron)
create or replace function fn_don_dep() returns void as $$
begin
  -- khóa tạm quá hạn còn 'Đang giữ' -> hết hạn, huỷ đơn tạm, tắt hiệu lực chi tiết
  update lich_dat_tam_khoa set trang_thai='Hết hạn'
    where trang_thai='Đang giữ' and thoi_gian_het_han < now();
  update chi_tiet_dat_san c set hieu_luc=false
    from don_dat_san d where c.ma_dat_san=d.ma_dat_san
      and d.trang_thai_dat_san='Chờ xác nhận'
      and exists(select 1 from lich_dat_tam_khoa t where t.ma_dat_san=d.ma_dat_san
                 and t.trang_thai='Hết hạn');
  update don_dat_san set trang_thai_dat_san='Đã hủy'
    where trang_thai_dat_san='Chờ xác nhận'
      and exists(select 1 from lich_dat_tam_khoa t where t.ma_dat_san=don_dat_san.ma_dat_san and t.trang_thai='Hết hạn');
  -- đơn đã xác nhận mà đã qua giờ chơi -> hoàn tất
  update don_dat_san d set trang_thai_dat_san='Đã hoàn tất'
    where d.trang_thai_dat_san='Đã xác nhận'
      and not exists(select 1 from chi_tiet_dat_san c where c.ma_dat_san=d.ma_dat_san
                     and ts_hcm(c.ngay_thue,c.gio_kt) > now());
  -- ca đã qua giờ kết thúc -> Đã hoàn thiện
  update dang_ky_ca_lam set trang_thai='Đã hoàn thiện'
    where trang_thai='Chưa hoàn thiện' and ts_hcm(ngay_lam_viec,gio_ket_thuc_ca) < now();
end;
$$ language plpgsql;

-- ===== Giữ chỗ: tạo đơn + chi tiết + khóa tạm 5' + thanh toán (nguyên tử)
-- p_items: [{"ma_san":"SAN01","ngay":"2026-11-20","gio_bd":"06:00","gio_kt":"07:30"}, ...]
create or replace function fn_giu_cho(
  p_user varchar, p_ten varchar, p_sdt varchar, p_email varchar,
  p_items jsonb, p_nguoi_tao varchar default null, p_ghi_chu varchar default null)
returns jsonb as $$
declare
  v_ma_dds varchar := 'DS'||lpad(nextval('seq_dds')::text,6,'0');
  v_item jsonb; v_san varchar; v_ngay date; v_bd time; v_kt time;
  v_tien numeric; v_tong numeric := 0; v_gio numeric := 0; v_ngay_choi date;
  v_het timestamptz := now() + interval '5 minutes';
begin
  perform fn_don_dep();
  if jsonb_array_length(p_items) = 0 then raise exception 'EMPTY' using errcode='P0001'; end if;
  -- khóa các dòng sân liên quan để tuần tự hóa
  perform 1 from san where ma_san in (select (e->>'ma_san') from jsonb_array_elements(p_items) e) for update;

  insert into don_dat_san(ma_dat_san,ma_nguoi_dung,ten_nguoi_dat,sdt_nguoi_dat,email_nguoi_dat,
                          tong_gio,tong_tien,trang_thai_dat_san,ghi_chu,nguoi_tao,ngay_choi)
    values (v_ma_dds,p_user,p_ten,p_sdt,p_email,0,0,'Chờ xác nhận',p_ghi_chu,p_nguoi_tao,'1970-01-01');

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_san := v_item->>'ma_san'; v_ngay := (v_item->>'ngay')::date;
    v_bd := (v_item->>'gio_bd')::time; v_kt := (v_item->>'gio_kt')::time;
    v_ngay_choi := v_ngay;
    if v_ngay < current_date then raise exception 'PAST_DATE' using errcode='P0001'; end if;
    if (v_kt - v_bd) < interval '60 minutes' then raise exception 'MIN_DURATION' using errcode='P0001'; end if;
    if san_dong_cua(v_san, ts_hcm(v_ngay,v_bd), ts_hcm(v_ngay,v_kt)) then raise exception 'COURT_CLOSED' using errcode='P0001'; end if;
    v_tien := tinh_tien(v_san,v_ngay,v_bd,v_kt);
    v_tong := v_tong + v_tien;
    v_gio := v_gio + extract(epoch from (v_kt-v_bd))/3600;
    -- chi tiết (ràng buộc loại trừ sẽ ném SLOT_TAKEN nếu trùng)
    begin
      insert into chi_tiet_dat_san(ma_chi_tiet,ma_dat_san,ma_san,ngay_thue,gio_bd,gio_kt,thanh_tien,hieu_luc)
        values ('CT'||lpad(nextval('seq_ctds')::text,8,'0'),v_ma_dds,v_san,v_ngay,v_bd,v_kt,v_tien,true);
    exception when exclusion_violation then raise exception 'SLOT_TAKEN' using errcode='P0001';
    end;
    insert into lich_dat_tam_khoa(ma_tam_khoa,ma_dat_san,ma_san,ngay_thue,gio_bd,gio_kt,nguoi_giu,trang_thai,thoi_gian_het_han)
      values ('TK'||lpad(nextval('seq_tk')::text,8,'0'),v_ma_dds,v_san,v_ngay,v_bd,v_kt,p_user,'Đang giữ',v_het);
  end loop;

  update don_dat_san set tong_tien=v_tong, tong_gio=v_gio, ngay_choi=v_ngay_choi where ma_dat_san=v_ma_dds;
  insert into thanh_toan(ma_thanh_toan,ma_dat_san,tong_tien,trang_thai_thanh_toan)
    values ('TT'||lpad(nextval('seq_tt')::text,8,'0'),v_ma_dds,v_tong,'Chờ thanh toán');
  insert into lich_su_thay_doi(ma_lich_su,ma_dat_san,trang_thai,nguoi_thuc_hien,ly_do)
    values ('LS'||lpad(nextval('seq_ls')::text,8,'0'),v_ma_dds,'Chờ xác nhận',coalesce(p_nguoi_tao,p_user),'Tạo đơn, giữ chỗ');

  return jsonb_build_object('ma_dat_san',v_ma_dds,'tong_tien',v_tong,'het_han',v_het);
end;
$$ language plpgsql;

-- ===== Xác nhận thanh toán (có minh chứng, còn hạn giữ)
create or replace function fn_xac_nhan_thanh_toan(p_ma_dds varchar, p_minh_chung text)
returns void as $$
declare v_user varchar;
begin
  perform 1 from lich_dat_tam_khoa where ma_dat_san=p_ma_dds and trang_thai='Đang giữ'
     and thoi_gian_het_han > now() limit 1;
  if not found then raise exception 'HOLD_EXPIRED' using errcode='P0001'; end if;
  update lich_dat_tam_khoa set trang_thai='Đã xác nhận' where ma_dat_san=p_ma_dds and trang_thai='Đang giữ';
  update don_dat_san set trang_thai_dat_san='Đã xác nhận' where ma_dat_san=p_ma_dds returning ma_nguoi_dung into v_user;
  update thanh_toan set minh_chung=p_minh_chung, trang_thai_thanh_toan='Đã thanh toán',
     thoi_gian_thanh_toan=now() where ma_dat_san=p_ma_dds;
  insert into lich_su_thay_doi(ma_lich_su,ma_dat_san,trang_thai,nguoi_thuc_hien,ly_do)
    values ('LS'||lpad(nextval('seq_ls')::text,8,'0'),p_ma_dds,'Đã xác nhận',v_user,'Tải minh chứng, tự xác nhận');
  if v_user is not null then
    insert into thong_bao(ma_thong_bao,ma_nguoi_dung,loai,tham_so,ma_dat_san)
      values ('TB'||lpad(nextval('seq_tb')::text,8,'0'),v_user,'bookingConfirmed',
              jsonb_build_object('code',p_ma_dds),p_ma_dds);
  end if;
end;
$$ language plpgsql;

-- ===== Giải phóng (hết hạn / người dùng bỏ)
create or replace function fn_giai_phong(p_ma_dds varchar) returns void as $$
begin
  update lich_dat_tam_khoa set trang_thai='Hết hạn' where ma_dat_san=p_ma_dds and trang_thai='Đang giữ';
  update chi_tiet_dat_san set hieu_luc=false where ma_dat_san=p_ma_dds;
  update don_dat_san set trang_thai_dat_san='Đã hủy' where ma_dat_san=p_ma_dds and trang_thai_dat_san='Chờ xác nhận';
end;
$$ language plpgsql;

-- ===== Hủy đặt sân (chủ sở hữu, chưa bắt đầu) -> chờ hoàn tiền
create or replace function fn_huy_dat_san(p_ma_dds varchar, p_user varchar) returns void as $$
declare v_owner varchar; v_tt varchar; v_bat_dau timestamptz;
begin
  select ma_nguoi_dung, trang_thai_dat_san into v_owner, v_tt from don_dat_san where ma_dat_san=p_ma_dds for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  if v_owner is distinct from p_user then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if v_tt not in ('Chờ xác nhận','Đã xác nhận') then raise exception 'NOT_CANCELLABLE' using errcode='P0001'; end if;
  select min(ts_hcm(ngay_thue,gio_bd)) into v_bat_dau from chi_tiet_dat_san where ma_dat_san=p_ma_dds and hieu_luc;
  if v_bat_dau <= now() then raise exception 'NOT_CANCELLABLE' using errcode='P0001'; end if;
  update chi_tiet_dat_san set hieu_luc=false where ma_dat_san=p_ma_dds;
  if v_tt='Đã xác nhận' then
    update don_dat_san set trang_thai_dat_san='Đã hủy' where ma_dat_san=p_ma_dds;
    update thanh_toan set trang_thai_thanh_toan='Chờ hoàn tiền' where ma_dat_san=p_ma_dds;
  else
    update don_dat_san set trang_thai_dat_san='Đã hủy' where ma_dat_san=p_ma_dds;
  end if;
  insert into lich_su_thay_doi(ma_lich_su,ma_dat_san,trang_thai,nguoi_thuc_hien,ly_do)
    values ('LS'||lpad(nextval('seq_ls')::text,8,'0'),p_ma_dds,'Đã hủy',p_user,'Khách hủy lịch');
end;
$$ language plpgsql;

-- ===== Từ chối thanh toán (đối soát)
create or replace function fn_tu_choi_thanh_toan(p_ma_dds varchar, p_nguoi varchar, p_ly_do varchar default null)
returns void as $$
begin
  update thanh_toan set trang_thai_thanh_toan='Thanh toán không hợp lệ', doi_soat_boi=p_nguoi, doi_soat_luc=now()
    where ma_dat_san=p_ma_dds;
  update chi_tiet_dat_san set hieu_luc=false where ma_dat_san=p_ma_dds;
  update don_dat_san set trang_thai_dat_san='Đã hủy' where ma_dat_san=p_ma_dds;
  insert into lich_su_thay_doi(ma_lich_su,ma_dat_san,trang_thai,nguoi_thuc_hien,ly_do)
    values ('LS'||lpad(nextval('seq_ls')::text,8,'0'),p_ma_dds,'Đã hủy',p_nguoi,coalesce(p_ly_do,'Thanh toán không hợp lệ'));
end;
$$ language plpgsql;

-- ===== Đổi lịch (cùng đơn giá + cùng thời lượng + ô mới trống)
create or replace function fn_doi_lich(p_ma_ct varchar, p_san varchar, p_ngay date, p_bd time, p_kt time, p_nguoi varchar)
returns void as $$
declare v_dds varchar; v_old_tien numeric; v_new_tien numeric; v_old_dur interval; v_new_dur interval;
begin
  select ma_dat_san, thanh_tien, (gio_kt-gio_bd) into v_dds, v_old_tien, v_old_dur
    from chi_tiet_dat_san where ma_chi_tiet=p_ma_ct and hieu_luc for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  v_new_dur := p_kt - p_bd;
  if v_new_dur <> v_old_dur then raise exception 'DURATION_MISMATCH' using errcode='P0001'; end if;
  v_new_tien := tinh_tien(p_san,p_ngay,p_bd,p_kt);
  if v_new_tien <> v_old_tien then raise exception 'PRICE_MISMATCH' using errcode='P0001'; end if;
  if san_dong_cua(p_san,ts_hcm(p_ngay,p_bd),ts_hcm(p_ngay,p_kt)) then raise exception 'COURT_CLOSED' using errcode='P0001'; end if;
  begin
    update chi_tiet_dat_san set ma_san=p_san, ngay_thue=p_ngay, gio_bd=p_bd, gio_kt=p_kt where ma_chi_tiet=p_ma_ct;
  exception when exclusion_violation then raise exception 'SLOT_TAKEN' using errcode='P0001';
  end;
  update don_dat_san set ngay_choi=p_ngay where ma_dat_san=v_dds;
  insert into lich_su_thay_doi(ma_lich_su,ma_dat_san,trang_thai,nguoi_thuc_hien,ly_do)
    values ('LS'||lpad(nextval('seq_ls')::text,8,'0'),v_dds,'Dời lịch',p_nguoi,'Đổi sang '||p_ngay||' '||p_bd);
end;
$$ language plpgsql;

-- ===== Yêu cầu hoàn tiền (owner mở đơn hoàn)
create or replace function fn_yeu_cau_hoan_tien(p_ma_dds varchar, p_nguyen_nhan varchar, p_lua_chon varchar, p_nguoi varchar)
returns varchar as $$
declare v_ma varchar := 'HT'||lpad(nextval('seq_ht')::text,8,'0'); v_tien numeric;
begin
  select tong_tien into v_tien from don_dat_san where ma_dat_san=p_ma_dds;
  insert into giao_dich_hoan_tien(ma_hoan_tien,ma_dat_san,so_tien,nguyen_nhan,lua_chon_khach,trang_thai,nguoi_thuc_hien)
    values (v_ma,p_ma_dds,v_tien,p_nguyen_nhan,p_lua_chon,'Chờ hoàn tiền',p_nguoi)
    on conflict do nothing;
  update thanh_toan set trang_thai_thanh_toan='Chờ hoàn tiền' where ma_dat_san=p_ma_dds;
  return v_ma;
end;
$$ language plpgsql;

-- ===== Xác nhận hoàn tiền (có minh chứng)
create or replace function fn_xac_nhan_hoan_tien(p_ma_dds varchar, p_minh_chung text, p_nguoi varchar)
returns void as $$
declare v_user varchar;
begin
  update giao_dich_hoan_tien set hinh_anh_minh_chung=p_minh_chung, trang_thai='Đã hoàn tiền',
     thoi_gian_hoan=now(), nguoi_thuc_hien=p_nguoi
     where ma_dat_san=p_ma_dds and trang_thai='Chờ hoàn tiền';
  update thanh_toan set trang_thai_thanh_toan='Đã hoàn tiền' where ma_dat_san=p_ma_dds;
  update don_dat_san set trang_thai_dat_san='Đã hủy – hoàn tiền' where ma_dat_san=p_ma_dds
     returning ma_nguoi_dung into v_user;
  insert into lich_su_thay_doi(ma_lich_su,ma_dat_san,trang_thai,nguoi_thuc_hien,ly_do)
    values ('LS'||lpad(nextval('seq_ls')::text,8,'0'),p_ma_dds,'Đã hủy – hoàn tiền',p_nguoi,'Đã hoàn tiền');
  if v_user is not null then
    insert into thong_bao(ma_thong_bao,ma_nguoi_dung,loai,tham_so,ma_dat_san)
      values ('TB'||lpad(nextval('seq_tb')::text,8,'0'),v_user,'bookingRefunded',jsonb_build_object('code',p_ma_dds),p_ma_dds);
  end if;
end;
$$ language plpgsql;

-- ===== Đóng cửa sân + đánh dấu lịch bị ảnh hưởng
create or replace function fn_dong_cua_san(p_san varchar, p_ly_do varchar, p_tu timestamptz, p_den timestamptz, p_nguoi varchar)
returns jsonb as $$
declare v_ma varchar := 'DC'||lpad(nextval('seq_dc')::text,6,'0'); v_count int;
begin
  insert into lich_dong_cua_san(ma_dong_cua,ma_san,ly_do,bat_dau,ket_thuc,nguoi_tao)
    values (v_ma,p_san,p_ly_do,p_tu,p_den,p_nguoi);
  update don_dat_san d set ma_dong_cua=v_ma
    from chi_tiet_dat_san c where c.ma_dat_san=d.ma_dat_san and c.hieu_luc and c.ma_san=p_san
      and tstzrange(ts_hcm(c.ngay_thue,c.gio_bd), ts_hcm(c.ngay_thue,c.gio_kt)) && tstzrange(p_tu,p_den)
      and d.trang_thai_dat_san in ('Chờ xác nhận','Đã xác nhận');
  get diagnostics v_count = row_count;
  return jsonb_build_object('ma_dong_cua',v_ma,'affected',v_count);
end;
$$ language plpgsql;

-- ===== Xem trước số lịch bị ảnh hưởng (không ghi)
create or replace function fn_xem_truoc_dong_cua(p_san varchar, p_tu timestamptz, p_den timestamptz)
returns int as $$
  select count(distinct d.ma_dat_san)::int from don_dat_san d
    join chi_tiet_dat_san c on c.ma_dat_san=d.ma_dat_san and c.hieu_luc
   where c.ma_san=p_san and tstzrange(ts_hcm(c.ngay_thue,c.gio_bd),ts_hcm(c.ngay_thue,c.gio_kt)) && tstzrange(p_tu,p_den)
     and d.trang_thai_dat_san in ('Chờ xác nhận','Đã xác nhận');
$$ language sql stable;

-- ===== Tạo đơn hàng hóa/dịch vụ (trừ tồn kho)
-- p_items: [{"ma_hhdv":"HH0001","so_luong":2}, ...]
create or replace function fn_tao_don_hhdv(p_nguoi varchar, p_items jsonb, p_phuong_thuc varchar)
returns jsonb as $$
declare v_ma varchar := 'OD'||lpad(nextval('seq_don')::text,6,'0'); v_item jsonb;
        v_hh varchar; v_sl int; v_gia numeric; v_ton int; v_tong numeric := 0;
begin
  insert into don_hhdv(ma_don,ma_nguoi_dung,tong_tien,phuong_thuc) values (v_ma,p_nguoi,0,p_phuong_thuc);
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_hh := v_item->>'ma_hhdv'; v_sl := (v_item->>'so_luong')::int;
    select gia, ton_kho into v_gia, v_ton from hang_hoa_dich_vu where ma_hhdv=v_hh and not da_xoa for update;
    if not found then raise exception 'PRODUCT_NOT_FOUND' using errcode='P0001'; end if;
    if v_ton is not null and v_ton < v_sl then raise exception 'OUT_OF_STOCK' using errcode='P0001'; end if;
    if v_ton is not null then update hang_hoa_dich_vu set ton_kho=ton_kho-v_sl where ma_hhdv=v_hh; end if;
    insert into ct_don_hhdv(ma_don,ma_hhdv,so_luong,don_gia,thanh_tien) values (v_ma,v_hh,v_sl,v_gia,v_gia*v_sl);
    v_tong := v_tong + v_gia*v_sl;
  end loop;
  update don_hhdv set tong_tien=v_tong where ma_don=v_ma;
  return jsonb_build_object('ma_don',v_ma,'tong_tien',v_tong);
end;
$$ language plpgsql;

-- Cấp quyền gọi cho service_role (RLS bị bỏ qua bởi service_role; cần execute trên hàm)
grant execute on all functions in schema public to service_role;
-- PHASE 6 · RLS: bật trên MỌI bảng, KHÔNG cấp policy cho anon/authenticated.
-- service_role (dùng ở tầng server) bỏ qua RLS. Nếu khóa công khai bị lạm dụng cũng không đọc được dữ liệu.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname='public' loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);
  end loop;
end $$;

-- Thu hồi quyền trực tiếp của anon/authenticated (phòng vệ nhiều lớp)
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
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
