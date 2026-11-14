-- A1/A2: luồng đóng sân -> thông báo khách -> khách chọn Hoàn tiền/Dời lịch;
-- chủ sân/NV dời lịch (xóa khỏi danh sách ảnh hưởng), chỉ chủ sân hoàn tiền;
-- khách tự hủy KHÔNG hoàn tiền.
alter table don_dat_san add column if not exists lua_chon_xu_ly varchar(10)
  check (lua_chon_xu_ly in ('Dời lịch','Hoàn tiền'));

create or replace view v_booking as
 SELECT d.ma_dat_san, d.ngay_dat, d.ngay_choi, d.tong_gio, d.tong_tien,
    d.trang_thai_dat_san, d.ten_nguoi_dat, d.sdt_nguoi_dat, d.email_nguoi_dat,
    d.ghi_chu, d.ma_nguoi_dung, d.nguoi_tao, d.da_nhan_san_luc, d.ma_dong_cua,
    c.ma_chi_tiet, c.ma_san, s.ten_san, c.ngay_thue, c.gio_bd, c.gio_kt, c.hieu_luc,
    t.trang_thai_thanh_toan, t.minh_chung, t.phuong_thuc, t.thoi_gian_thanh_toan,
    tk.thoi_gian_het_han AS hold_expires, dc.ly_do AS closure_reason,
    r.so_tien AS refund_amount, r.hinh_anh_minh_chung AS refund_proof, r.trang_thai AS refund_status,
    d.lua_chon_xu_ly
   FROM don_dat_san d
     LEFT JOIN LATERAL ( SELECT x.ma_chi_tiet, x.ma_dat_san, x.ma_san, x.ngay_thue, x.gio_bd, x.gio_kt, x.thanh_tien, x.hieu_luc, x.khoang
           FROM chi_tiet_dat_san x WHERE x.ma_dat_san::text = d.ma_dat_san::text
          ORDER BY x.hieu_luc DESC, x.gio_bd LIMIT 1) c ON true
     LEFT JOIN san s ON s.ma_san::text = c.ma_san::text
     LEFT JOIN LATERAL ( SELECT x.ma_thanh_toan, x.ma_dat_san, x.tong_tien, x.phuong_thuc, x.minh_chung, x.trang_thai_thanh_toan, x.thoi_gian_thanh_toan, x.doi_soat_boi, x.doi_soat_luc
           FROM thanh_toan x WHERE x.ma_dat_san::text = d.ma_dat_san::text
          ORDER BY x.ma_thanh_toan DESC LIMIT 1) t ON true
     LEFT JOIN LATERAL ( SELECT x.ma_tam_khoa, x.ma_dat_san, x.ma_san, x.ngay_thue, x.gio_bd, x.gio_kt, x.nguoi_giu, x.trang_thai, x.thoi_gian_het_han, x.ngay_tao
           FROM lich_dat_tam_khoa x WHERE x.ma_dat_san::text = d.ma_dat_san::text AND x.trang_thai::text = 'Đang giữ'::text
          ORDER BY x.thoi_gian_het_han DESC LIMIT 1) tk ON true
     LEFT JOIN lich_dong_cua_san dc ON dc.ma_dong_cua::text = d.ma_dong_cua::text
     LEFT JOIN LATERAL ( SELECT x.ma_hoan_tien, x.ma_dat_san, x.so_tien, x.nguyen_nhan, x.lua_chon_khach, x.hinh_anh_minh_chung, x.trang_thai, x.nguoi_thuc_hien, x.thoi_gian_hoan, x.ngay_tao
           FROM giao_dich_hoan_tien x WHERE x.ma_dat_san::text = d.ma_dat_san::text
          ORDER BY x.ngay_tao DESC LIMIT 1) r ON true;

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
    select 'TB'||lpad(nextval('seq_tb')::text,8,'0'), d.ma_nguoi_dung, 'courtClosed',
           jsonb_build_object('code',d.ma_dat_san,'court',v_ten_san), d.ma_dat_san
      from don_dat_san d where d.ma_dong_cua=v_ma and d.ma_nguoi_dung is not null;
  return jsonb_build_object('ma_dong_cua',v_ma,'affected',v_count);
end;
$$ language plpgsql;

create or replace function fn_khach_chon_xu_ly(p_ma_dds varchar, p_user varchar, p_lua_chon varchar)
returns void as $$
declare v_owner varchar; v_dc varchar; v_tt varchar;
begin
  select ma_nguoi_dung, ma_dong_cua, trang_thai_dat_san into v_owner, v_dc, v_tt
    from don_dat_san where ma_dat_san=p_ma_dds for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  if v_owner is distinct from p_user then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if v_dc is null then raise exception 'NOT_CANCELLABLE' using errcode='P0001'; end if;
  if v_tt not in ('Chờ xác nhận','Đã xác nhận') then raise exception 'NOT_CANCELLABLE' using errcode='P0001'; end if;
  if p_lua_chon = 'Dời lịch' then
    update don_dat_san set lua_chon_xu_ly='Dời lịch' where ma_dat_san=p_ma_dds;
  elsif p_lua_chon = 'Hoàn tiền' then
    update don_dat_san set lua_chon_xu_ly='Hoàn tiền' where ma_dat_san=p_ma_dds;
    perform fn_yeu_cau_hoan_tien(p_ma_dds, 'Sân đóng cửa', 'Hoàn tiền', p_user);
  else
    raise exception 'EMPTY' using errcode='P0001';
  end if;
  insert into lich_su_thay_doi(ma_lich_su,ma_dat_san,trang_thai,nguoi_thuc_hien,ly_do)
    values ('LS'||lpad(nextval('seq_ls')::text,8,'0'),p_ma_dds,v_tt,p_user,'Khách chọn: '||p_lua_chon);
end;
$$ language plpgsql;

create or replace function fn_huy_dat_san(p_ma_dds varchar, p_user varchar)
returns void as $$
declare v_owner varchar; v_tt varchar; v_bat_dau timestamptz;
begin
  select ma_nguoi_dung, trang_thai_dat_san into v_owner, v_tt from don_dat_san where ma_dat_san=p_ma_dds for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  if v_owner is distinct from p_user then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if v_tt not in ('Chờ xác nhận','Đã xác nhận') then raise exception 'NOT_CANCELLABLE' using errcode='P0001'; end if;
  select min(ts_hcm(ngay_thue,gio_bd)) into v_bat_dau from chi_tiet_dat_san where ma_dat_san=p_ma_dds and hieu_luc;
  if v_bat_dau <= now() then raise exception 'NOT_CANCELLABLE' using errcode='P0001'; end if;
  update chi_tiet_dat_san set hieu_luc=false where ma_dat_san=p_ma_dds;
  update don_dat_san set trang_thai_dat_san='Đã hủy' where ma_dat_san=p_ma_dds;
  insert into lich_su_thay_doi(ma_lich_su,ma_dat_san,trang_thai,nguoi_thuc_hien,ly_do)
    values ('LS'||lpad(nextval('seq_ls')::text,8,'0'),p_ma_dds,'Đã hủy',p_user,'Khách tự hủy (không hoàn tiền)');
end;
$$ language plpgsql;

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
              jsonb_build_object('code',v_dds,'court',v_ten_san,'date',p_ngay::text,'time',to_char(p_bd,'HH24:MI')),v_dds);
  end if;
end;
$$ language plpgsql;
