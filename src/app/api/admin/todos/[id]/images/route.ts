import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const admin = createAdminClient();

  // Verify todo exists
  const { data: todo, error: fetchErr } = await admin
    .from('admin_todos')
    .select('images')
    .eq('id', id)
    .single();

  if (fetchErr || !todo) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  const formData = await req.formData();
  const files = formData.getAll('file') as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }

  const newUrls: string[] = [];

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: png, jpg, gif, webp` },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File "${file.name}" exceeds 5MB limit` },
        { status: 400 }
      );
    }

    const ext = file.name.split('.').pop() || 'png';
    const fileName = `${id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await admin.storage
      .from('admin-todo-images')
      .upload(fileName, file, { contentType: file.type });

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const { data: urlData } = admin.storage
      .from('admin-todo-images')
      .getPublicUrl(fileName);

    newUrls.push(urlData.publicUrl);
  }

  const updatedImages = [...(todo.images || []), ...newUrls];

  const { data: updated, error: updateErr } = await admin
    .from('admin_todos')
    .update({ images: updatedImages, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const { url } = await req.json();

  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Extract storage path from the public URL
  const bucketSegment = '/admin-todo-images/';
  const pathIndex = url.indexOf(bucketSegment);
  if (pathIndex === -1) {
    return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
  }
  const storagePath = url.slice(pathIndex + bucketSegment.length);

  // Delete from storage
  const { error: storageErr } = await admin.storage
    .from('admin-todo-images')
    .remove([storagePath]);

  if (storageErr) {
    return NextResponse.json({ error: storageErr.message }, { status: 500 });
  }

  // Remove URL from the todo's images array
  const { data: todo } = await admin
    .from('admin_todos')
    .select('images')
    .eq('id', id)
    .single();

  const updatedImages = (todo?.images || []).filter((img: string) => img !== url);

  const { data: updated, error: updateErr } = await admin
    .from('admin_todos')
    .update({ images: updatedImages, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}
