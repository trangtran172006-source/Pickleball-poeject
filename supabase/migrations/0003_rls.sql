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
