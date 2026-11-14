-- A7: nguồn dữ liệu khách hàng đồng nhất cho màn tìm kiếm (nhân viên/chủ sân).
-- Gộp khách đã có tài khoản + khách vãng lai đã đặt sân (không có tài khoản).
create or replace view v_khach_hang as
select
  u.ma_nguoi_dung        as id,
  u.ho_ten               as ho_ten,
  u.so_dien_thoai        as sdt,
  coalesce(u.email,'')   as email,
  u.da_xac_thuc          as co_tai_khoan,
  u.anh_dai_dien         as anh_dai_dien
from nguoi_dung u
where u.vai_tro = 'customer'
union all
select * from (
  select distinct on (d.sdt_nguoi_dat)
    'KH:'||d.sdt_nguoi_dat          as id,
    d.ten_nguoi_dat                 as ho_ten,
    d.sdt_nguoi_dat                 as sdt,
    coalesce(d.email_nguoi_dat,'')  as email,
    false                           as co_tai_khoan,
    null::varchar                   as anh_dai_dien
  from don_dat_san d
  where d.ma_nguoi_dung is null
    and d.sdt_nguoi_dat is not null
    and not exists (select 1 from nguoi_dung u2 where u2.so_dien_thoai = d.sdt_nguoi_dat)
  order by d.sdt_nguoi_dat, d.ngay_dat desc
) w;
