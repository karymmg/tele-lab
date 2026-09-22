-- Create shop-images bucket if it doesn't exist
insert into storage.buckets (id, name, public)
select 'shop-images', 'shop-images', true
where not exists (
  select 1 from storage.buckets where id = 'shop-images'
);

-- Policy to allow anyone to read
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'shop-images' );

-- Policy to allow authenticated users (or admins) to insert
create policy "Auth Insert"
on storage.objects for insert
with check ( bucket_id = 'shop-images' and auth.role() = 'authenticated' );

create policy "Auth Update"
on storage.objects for update
using ( bucket_id = 'shop-images' and auth.role() = 'authenticated' );

create policy "Auth Delete"
on storage.objects for delete
using ( bucket_id = 'shop-images' and auth.role() = 'authenticated' );
