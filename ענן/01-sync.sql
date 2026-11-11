-- איזון · עדכון חי בין שני הטלפונים.
-- טבלה אחת, נפרדת לגמרי משאר הטבלאות בפרויקט. המידע מוצפן בטלפון לפני שהוא מגיע לכאן:
-- השרת שומר רק גוש מוצפן, ולא יכול לקרוא אותו. גם המזהה הוא טביעת אצבע של הקוד המשפחתי, לא הקוד עצמו.

create table if not exists public.izun_homes (
  id text primary key,
  blob text not null,
  rev bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- אין גישה ישירה לטבלה לאף אחד מבחוץ. רק דרך שלוש הפונקציות שלמטה.
alter table public.izun_homes enable row level security;
revoke all on public.izun_homes from anon, authenticated;

-- קריאה: מחזיר את הגוש רק אם יש גרסה חדשה מזו שכבר יש במכשיר. בית שלא קיים: מחזיר ריק.
create or replace function public.izun_pull(p_id text, p_rev bigint default 0)
returns jsonb language sql security definer set search_path = public as $$
  select case when h.rev > p_rev then jsonb_build_object('rev', h.rev, 'blob', h.blob)
              else jsonb_build_object('rev', h.rev) end
  from public.izun_homes h where h.id = p_id;
$$;

-- כתיבה: מתקבלת רק אם המכשיר ראה את הגרסה האחרונה. אחרת הוא מקבל את המספר העדכני, ממזג ושולח שוב.
create or replace function public.izun_push(p_id text, p_blob text, p_rev bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare cur_rev bigint; n int;
begin
  if p_id is null or p_id !~ '^[0-9a-f]{64}$' then raise exception 'bad id'; end if;
  if p_blob is null or length(p_blob) > 3000000 then raise exception 'too big'; end if;
  select rev into cur_rev from public.izun_homes where id = p_id for update;
  if not found then
    if coalesce(p_rev, 0) <> 0 then return jsonb_build_object('ok', false, 'rev', 0); end if;
    select count(*) into n from public.izun_homes;
    if n >= 200 then raise exception 'full'; end if;
    insert into public.izun_homes (id, blob, rev) values (p_id, p_blob, 1);
    return jsonb_build_object('ok', true, 'rev', 1);
  end if;
  if cur_rev <> coalesce(p_rev, 0) then return jsonb_build_object('ok', false, 'rev', cur_rev); end if;
  update public.izun_homes set blob = p_blob, rev = cur_rev + 1, updated_at = now() where id = p_id;
  return jsonb_build_object('ok', true, 'rev', cur_rev + 1);
end $$;

-- מחיקת העותק מהענן, למי שמחזיק את הקוד המשפחתי.
create or replace function public.izun_drop(p_id text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  delete from public.izun_homes where id = p_id;
  return found;
end $$;

revoke all on function public.izun_pull(text, bigint) from public;
revoke all on function public.izun_push(text, text, bigint) from public;
revoke all on function public.izun_drop(text) from public;
grant execute on function public.izun_pull(text, bigint) to anon, authenticated;
grant execute on function public.izun_push(text, text, bigint) to anon, authenticated;
grant execute on function public.izun_drop(text) to anon, authenticated;
