-- =============================================================
-- 0008_complete_fixes.sql
-- Tổng hợp sửa lỗi A1..A8, B1..B6, C (Owner, Staff, Customer)
-- =============================================================

-- 1. Mở rộng độ dài ma_nhan_vien để lưu email (A5)
alter table nhan_vien alter column ma_nhan_vien type varchar(255);
alter table dang_ky_ca_lam alter column ma_nhan_vien type varchar(255);

update nhan_vien nv
   set ma_nhan_vien = nd.email
  from nguoi_dung nd
 where nv.ma_nguoi_dung = nd.ma_nguoi_dung
   and nv.ma_nhan_vien <> nd.email;

update dang_ky_ca_lam dk
   set ma_nhan_vien = nd.email
  from nguoi_dung nd
 where dk.ma_nguoi_dung = nd.ma_nguoi_dung
   and dk.ma_nhan_vien <> nd.email;

-- 2. Cập nhật view v_booking hỗ trợ đặt nhiều sân (A3) và thời gian đóng cửa sân (C.Owner.8)
create or replace view v_booking as
select d.ma_dat_san, d.ngay_dat, d.ngay_choi, d.tong_gio, d.tong_tien, d.trang_thai_dat_san,
       d.ten_nguoi_dat, d.sdt_nguoi_dat, d.email_nguoi_dat, d.ghi_chu, d.ma_nguoi_dung,
       d.nguoi_tao, d.da_nhan_san_luc, d.ma_dong_cua,
       c.ma_chi_tiet, c.ma_san, c.ten_san, c.ngay_thue, c.gio_bd, c.gio_kt, c.hieu_luc,
       t.trang_thai_thanh_toan, t.minh_chung, t.phuong_thuc, t.thoi_gian_thanh_toan,
       k.thoi_gian_het_han as hold_expires,
       l.ly_do as closure_reason,
       h.so_tien as refund_amount, h.hinh_anh_minh_chung as refund_proof, h.trang_thai as refund_status,
       d.lua_chon_xu_ly,
       l.bat_dau as closure_start,
       l.ket_thuc as closure_end
  from don_dat_san d
  left join lateral (
    select ((array_agg(x.ma_chi_tiet order by x.hieu_luc desc, x.ma_san, x.gio_bd))[1])::varchar(14) as ma_chi_tiet,
           ((array_agg(x.ma_san order by x.hieu_luc desc, x.ma_san, x.gio_bd))[1])::varchar(10) as ma_san,
           (coalesce(
             string_agg(distinct s.ten_san, ', ' order by s.ten_san) filter (where x.hieu_luc),
             string_agg(distinct s.ten_san, ', ' order by s.ten_san)
           ))::varchar(50) as ten_san,
           coalesce(min(x.ngay_thue) filter (where x.hieu_luc), min(x.ngay_thue)) as ngay_thue,
           coalesce(min(x.gio_bd) filter (where x.hieu_luc), min(x.gio_bd)) as gio_bd,
           coalesce(max(x.gio_kt) filter (where x.hieu_luc), max(x.gio_kt)) as gio_kt,
           bool_or(x.hieu_luc) as hieu_luc
      from chi_tiet_dat_san x
      join san s on s.ma_san = x.ma_san
     where x.ma_dat_san = d.ma_dat_san
  ) c on true
  left join thanh_toan t on t.ma_dat_san = d.ma_dat_san
  left join lateral (
    select thoi_gian_het_han from lich_dat_tam_khoa
     where ma_dat_san = d.ma_dat_san and trang_thai = 'Đang giữ'
     order by thoi_gian_het_han desc limit 1
  ) k on true
  left join lich_dong_cua_san l on l.ma_dong_cua = d.ma_dong_cua
  left join lateral (
    select so_tien, hinh_anh_minh_chung, trang_thai from giao_dich_hoan_tien
     where ma_dat_san = d.ma_dat_san order by ngay_tao desc limit 1
  ) h on true;

-- 3. Cập nhật hàm xác nhận thanh toán để lưu đủ thông tin sân & khung giờ vào thông báo (C.Customer.3)
create or replace function fn_xac_nhan_thanh_toan(p_ma_dds varchar, p_minh_chung text)
returns void as $$
declare v_user varchar; v_san varchar; v_ngay text; v_bd text; v_kt text; v_tt varchar;
begin
  select ma_nguoi_dung, trang_thai_dat_san into v_user, v_tt from don_dat_san where ma_dat_san=p_ma_dds;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  if v_tt = 'Đã hủy' then raise exception 'HOLD_EXPIRED' using errcode='P0001'; end if;
  update lich_dat_tam_khoa set trang_thai='Đã xác nhận' where ma_dat_san=p_ma_dds and trang_thai='Đang giữ';
  update don_dat_san set trang_thai_dat_san='Đã xác nhận' where ma_dat_san=p_ma_dds;
  update thanh_toan set minh_chung=p_minh_chung, trang_thai_thanh_toan='Đã thanh toán',
         thoi_gian_thanh_toan=now() where ma_dat_san=p_ma_dds;
  insert into lich_su_thay_doi(ma_lich_su,ma_dat_san,trang_thai,nguoi_thuc_hien,ly_do)
    values ('LS'||lpad(nextval('seq_ls')::text,8,'0'),p_ma_dds,'Đã xác nhận',v_user,'Tải minh chứng, tự xác nhận');
  if v_user is not null then
    select ten_san, ngay_thue::text, to_char(gio_bd,'HH24:MI'), to_char(gio_kt,'HH24:MI')
      into v_san, v_ngay, v_bd, v_kt from v_booking where ma_dat_san=p_ma_dds;
    insert into thong_bao(ma_thong_bao,ma_nguoi_dung,loai,tham_so,ma_dat_san)
      values ('TB'||lpad(nextval('seq_tb')::text,8,'0'),v_user,'bookingConfirmed',
              jsonb_build_object('code',p_ma_dds,'court',coalesce(v_san,''),'date',coalesce(v_ngay,''),'start',coalesce(v_bd,''),'end',coalesce(v_kt,'')),p_ma_dds);
  end if;
end;
$$ language plpgsql;

-- 4. Cập nhật hàm hủy đặt sân của khách: không chuyển sang chờ hoàn tiền, gửi thông báo hủy kèm thông tin sân/giờ (A1, C.Customer.3)
create or replace function fn_huy_dat_san(p_ma_dds varchar, p_user varchar) returns void as $$
declare v_owner varchar; v_tt varchar; v_bat_dau timestamptz; v_san varchar; v_ngay text; v_bd text; v_kt text;
begin
  select ma_nguoi_dung, trang_thai_dat_san into v_owner, v_tt from don_dat_san where ma_dat_san=p_ma_dds for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  if v_owner is distinct from p_user then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if v_tt not in ('Chờ xác nhận','Đã xác nhận') then raise exception 'NOT_CANCELLABLE' using errcode='P0001'; end if;
  select min(ts_hcm(ngay_thue,gio_bd)) into v_bat_dau from chi_tiet_dat_san where ma_dat_san=p_ma_dds and hieu_luc;
  if v_bat_dau <= now() then raise exception 'NOT_CANCELLABLE' using errcode='P0001'; end if;
  select ten_san, ngay_thue::text, to_char(gio_bd,'HH24:MI'), to_char(gio_kt,'HH24:MI')
    into v_san, v_ngay, v_bd, v_kt from v_booking where ma_dat_san=p_ma_dds;
  update chi_tiet_dat_san set hieu_luc=false where ma_dat_san=p_ma_dds;
  update don_dat_san set trang_thai_dat_san='Đã hủy', ma_dong_cua=null where ma_dat_san=p_ma_dds;
  insert into lich_su_thay_doi(ma_lich_su,ma_dat_san,trang_thai,nguoi_thuc_hien,ly_do)
    values ('LS'||lpad(nextval('seq_ls')::text,8,'0'),p_ma_dds,'Đã hủy',p_user,'Khách tự hủy (không hoàn tiền)');
  if v_owner is not null then
    insert into thong_bao(ma_thong_bao,ma_nguoi_dung,loai,tham_so,ma_dat_san)
      values ('TB'||lpad(nextval('seq_tb')::text,8,'0'),v_owner,'bookingCancelled',
              jsonb_build_object('code',p_ma_dds,'court',coalesce(v_san,''),'date',coalesce(v_ngay,''),'start',coalesce(v_bd,''),'end',coalesce(v_kt,'')),p_ma_dds);
  end if;
end;
$$ language plpgsql;

-- 5. Cập nhật hàm đóng cửa sân (A1, C.Customer.3)
create or replace function fn_dong_cua_san(p_san varchar, p_ly_do varchar, p_tu timestamptz, p_den timestamptz, p_nguoi varchar)
returns jsonb as $$
declare v_ma varchar := 'DC'||lpad(nextval('seq_dc')::text,6,'0'); v_count int; v_ten_san varchar;
begin
  insert into lich_dong_cua_san(ma_dong_cua,ma_san,ly_do,bat_dau,ket_thuc,nguoi_tao)
    values (v_ma,p_san,p_ly_do,p_tu,p_den,p_nguoi);
  update don_dat_san d set ma_dong_cua=v_ma, lua_chon_xu_ly=null
    from chi_tiet_dat_san c where c.ma_dat_san=d.ma_dat_san and c.hieu_luc and c.ma_san=p_san
      and tstzrange(ts_hcm(c.ngay_thue,c.gio_bd), ts_hcm(c.ngay_thue,c.gio_kt)) && tstzrange(p_tu,p_den)
      and d.trang_thai_dat_san in ('Chờ xác nhận','Đã xác nhận');
  get diagnostics v_count = row_count;
  select ten_san into v_ten_san from san where ma_san=p_san;
  insert into thong_bao(ma_thong_bao,ma_nguoi_dung,loai,tham_so,ma_dat_san)
    select 'TB'||lpad(nextval('seq_tb')::text,8,'0'), v.ma_nguoi_dung, 'courtClosed',
           jsonb_build_object('code',v.ma_dat_san,'court',coalesce(v.ten_san,v_ten_san),'date',coalesce(v.ngay_thue::text,''),'start',coalesce(to_char(v.gio_bd,'HH24:MI'),''),'end',coalesce(to_char(v.gio_kt,'HH24:MI'),'')), v.ma_dat_san
      from v_booking v where v.ma_dong_cua=v_ma and v.ma_nguoi_dung is not null;
  return jsonb_build_object('ma_dong_cua',v_ma,'affected',v_count);
end;
$$ language plpgsql;

-- 6. Cập nhật hàm đổi lịch (A2, C.Owner.12, C.Customer.3)
create or replace function fn_doi_lich(p_ma_ct varchar, p_san varchar, p_ngay date, p_bd time, p_kt time, p_nguoi varchar)
returns void as $$
declare v_dds varchar; v_old_tien numeric; v_new_tien numeric; v_old_dur interval; v_new_dur interval; v_user varchar; v_ten_san varchar;
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
  update don_dat_san set ngay_choi=p_ngay, ma_dong_cua=null, lua_chon_xu_ly=null
    where ma_dat_san=v_dds returning ma_nguoi_dung into v_user;
  insert into lich_su_thay_doi(ma_lich_su,ma_dat_san,trang_thai,nguoi_thuc_hien,ly_do)
    values ('LS'||lpad(nextval('seq_ls')::text,8,'0'),v_dds,'Dời lịch',p_nguoi,'Đổi sang '||p_ngay||' '||p_bd);
  select ten_san into v_ten_san from san where ma_san=p_san;
  if v_user is not null then
    insert into thong_bao(ma_thong_bao,ma_nguoi_dung,loai,tham_so,ma_dat_san)
      values ('TB'||lpad(nextval('seq_tb')::text,8,'0'),v_user,'bookingRescheduled',
              jsonb_build_object('code',v_dds,'court',v_ten_san,'date',p_ngay::text,'time',to_char(p_bd,'HH24:MI'),'start',to_char(p_bd,'HH24:MI'),'end',to_char(p_kt,'HH24:MI')),v_dds);
  end if;
end;
$$ language plpgsql;

-- 7. Cập nhật hàm xác nhận hoàn tiền: giải phóng khung giờ + xóa ma_dong_cua + thông báo đủ thông tin (A1, UC_4.2)
create or replace function fn_xac_nhan_hoan_tien(p_ma_dds varchar, p_minh_chung text, p_nguoi varchar)
returns void as $$
declare v_user varchar; v_san varchar; v_ngay text; v_bd text; v_kt text;
begin
  select ten_san, ngay_thue::text, to_char(gio_bd,'HH24:MI'), to_char(gio_kt,'HH24:MI')
    into v_san, v_ngay, v_bd, v_kt from v_booking where ma_dat_san=p_ma_dds;
  update giao_dich_hoan_tien set hinh_anh_minh_chung=p_minh_chung, trang_thai='Đã hoàn tiền',
     thoi_gian_hoan=now(), nguoi_thuc_hien=p_nguoi
     where ma_dat_san=p_ma_dds and trang_thai='Chờ hoàn tiền';
  update chi_tiet_dat_san set hieu_luc=false where ma_dat_san=p_ma_dds;
  update thanh_toan set trang_thai_thanh_toan='Đã hoàn tiền' where ma_dat_san=p_ma_dds;
  update don_dat_san set trang_thai_dat_san='Đã hủy – hoàn tiền', ma_dong_cua=null where ma_dat_san=p_ma_dds
     returning ma_nguoi_dung into v_user;
  insert into lich_su_thay_doi(ma_lich_su,ma_dat_san,trang_thai,nguoi_thuc_hien,ly_do)
    values ('LS'||lpad(nextval('seq_ls')::text,8,'0'),p_ma_dds,'Đã hủy – hoàn tiền',p_nguoi,'Đã hoàn tiền');
  if v_user is not null then
    insert into thong_bao(ma_thong_bao,ma_nguoi_dung,loai,tham_so,ma_dat_san)
      values ('TB'||lpad(nextval('seq_tb')::text,8,'0'),v_user,'bookingRefunded',
              jsonb_build_object('code',p_ma_dds,'court',coalesce(v_san,''),'date',coalesce(v_ngay,''),'start',coalesce(v_bd,''),'end',coalesce(v_kt,'')),p_ma_dds);
  end if;
end;
$$ language plpgsql;

-- 8. Dọn dẹp dữ liệu cũ trước khi áp dụng logic mới
update don_dat_san set ma_dong_cua = null
 where trang_thai_dat_san not in ('Chờ xác nhận', 'Đã xác nhận')
   and ma_dong_cua is not null;

update thanh_toan t set trang_thai_thanh_toan = 'Đã thanh toán'
  from don_dat_san d
 where t.ma_dat_san = d.ma_dat_san
   and d.trang_thai_dat_san = 'Đã hủy'
   and d.ma_dong_cua is null
   and t.trang_thai_thanh_toan = 'Chờ hoàn tiền'
   and not exists (select 1 from giao_dich_hoan_tien g where g.ma_dat_san = d.ma_dat_san);

-- Backfill tham_so cho thông báo hiện có để hiển thị đủ Sân + Ngày + Khung giờ (C.Customer.3)
update thong_bao tb
   set tham_so = tb.tham_so || jsonb_build_object(
     'code', coalesce(tb.tham_so->>'code', v.ma_dat_san),
     'court', coalesce(nullif(tb.tham_so->>'court',''), v.ten_san, ''),
     'date', coalesce(nullif(tb.tham_so->>'date',''), v.ngay_thue::text, v.ngay_choi::text, ''),
     'start', coalesce(nullif(tb.tham_so->>'start',''), to_char(v.gio_bd,'HH24:MI'), ''),
     'end', coalesce(nullif(tb.tham_so->>'end',''), to_char(v.gio_kt,'HH24:MI'), '')
   )
  from v_booking v
 where tb.ma_dat_san = v.ma_dat_san;

-- 9. Đồng bộ danh mục Hàng hóa & Dịch vụ theo đặc tả Figma (C.Staff.1)
update hang_hoa_dich_vu set da_xoa = true where ma_hhdv not in ('HH0001','HH0002','HH0003','HH0004','DV0001','DV0002','DV0003');

insert into hang_hoa_dich_vu(ma_hhdv,ten_hhdv,loai,nhom,don_vi,gia,mo_ta,anh_minh_hoa,ton_kho,da_xoa) values
  ('HH0001','Nước suối Aquafina','Hàng hóa','Đồ uống','Chai',15000,'Chai 500 ml','/images/products/aquafina.png',200,false),
  ('HH0002','Sting đỏ','Hàng hóa','Đồ uống','Chai',25000,'Chai 500 ml','/images/products/sting.png',120,false),
  ('HH0003','Bóng pickleball','Hàng hóa','Phụ kiện','Quả',20000,'Bóng ngoài trời · 40 lỗ','/images/products/ball.png',100,false),
  ('HH0004','Quấn cán vợt','Hàng hóa','Phụ kiện','Chiếc',30000,'Loại chống trượt · 1 chiếc','/images/products/grip.png',80,false),
  ('DV0001','Thuê vợt pickleball','Dịch vụ',null,'vợt / buổi',30000,'Vợt tiêu chuẩn, phù hợp mọi trình độ','/images/products/racket.png',null,false),
  ('DV0002','Khăn thể thao','Dịch vụ',null,'khăn / buổi',10000,'Khăn sạch, sử dụng trong suốt buổi chơi','/images/products/towel.png',null,false),
  ('DV0003','Huấn luyện viên','Dịch vụ',null,'giờ',200000,'Hướng dẫn kỹ thuật cơ bản và nâng cao','/images/products/coach.png',null,false)
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

-- 10. Đồng bộ Việc cần làm trong ca theo đặc tả Figma UI_20 (C.Staff.2)
delete from viec_trong_ca where ma_viec not in ('VC0001','VC0002','VC0003','VC0004');
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

grant select on v_booking to service_role;
grant execute on all functions in schema public to service_role;
