import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const directory = join(tmpdir(), "inviteme-template-studio-assets");
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  try {
    const file = (await request.formData()).get("file");
    if (!(file instanceof File) || file.size > 10 * 1024 * 1024)
      return Response.json({ error: "Ảnh phải nhỏ hơn 10 MB." }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp =
      bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    if (!png && !jpeg && !webp)
      return Response.json({ error: "Chỉ nhận PNG, JPG hoặc WebP." }, { status: 400 });
    const id = randomUUID();
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, id), bytes);
    return Response.json({ src: `/api/template-studio/assets?id=${id}` });
  } catch {
    return Response.json({ error: "Không tải được ảnh." }, { status: 400 });
  }
}
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) {
    const entries = await readdir(directory).catch(() => [] as string[]);
    return Response.json(
      entries
        .filter((value) => /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(value))
        .slice(-150)
        .map((value) => ({
          src: `/api/template-studio/assets?id=${value}`,
          name: `Ảnh ${value.slice(0, 8)}`,
        })),
    );
  }
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(id))
    return new Response(null, { status: 404 });
  try {
    const bytes = await readFile(join(directory, id));
    const type = bytes[0] === 137 ? "image/png" : bytes[0] === 255 ? "image/jpeg" : "image/webp";
    return new Response(bytes, {
      headers: {
        "Content-Type": type,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
