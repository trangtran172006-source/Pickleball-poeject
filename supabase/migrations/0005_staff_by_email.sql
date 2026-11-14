-- A5: "Mã nhân viên" = email nhân viên; chủ sân cấp tài khoản (email + mật khẩu).
-- Nhân viên làm ngoài nên có thể không có SĐT.
alter table nguoi_dung alter column so_dien_thoai drop not null;
alter table nhan_vien      alter column ma_nhan_vien type varchar(100);
alter table dang_ky_ca_lam alter column ma_nhan_vien type varchar(100);

-- Tạo tài khoản nhân viên: email làm mã nhân viên, SĐT có thể rỗng.
create or replace function fn_tao_nhan_vien(p_auth uuid, p_ten varchar, p_email varchar, p_sdt varchar)
returns jsonb language plpgsql as $$
declare v_code varchar := 'ND'||lpad(nextval('seq_nd')::text,6,'0');
begin
  insert into nguoi_dung(ma_nguoi_dung,auth_user_id,ho_ten,email,so_dien_thoai,vai_tro,da_xac_thuc)
    values (v_code,p_auth,p_ten,p_email,nullif(p_sdt,''),'staff',true);
  insert into nhan_vien(ma_nguoi_dung,ma_nhan_vien) values (v_code,p_email);
  return jsonb_build_object('ma_nguoi_dung',v_code,'ma_nhan_vien',p_email);
end;$$;
