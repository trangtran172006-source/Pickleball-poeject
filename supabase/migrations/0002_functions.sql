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
