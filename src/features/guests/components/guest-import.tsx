"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Download,
  FileSpreadsheet,
  Upload,
  ArrowLeft,
  CircleCheck,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { useRuntime } from "@/core/config/runtime";
import { Button } from "@/shared/ui/button";
import { ErrorState } from "@/shared/feedback/error-state";
import { confirmFile, getOptions, guestKeys, previewFile } from "../api/guest.api";
import type { Preview, ImportResult } from "../schemas/guest.schema";
import { confirmation, importUnits, validateFile } from "../utils/import-selection";
import { canEditPreview, editedCsv, type DraftRow } from "../utils/import-edit";
import { ImportGroupEditor } from "./import-group-editor";
const roleLabels: Record<string, string> = {
  PRIMARY: "Người đại diện",
  SPOUSE: "Vợ/chồng",
  CHILD: "Con",
  OTHER: "Thành viên khác",
};

export function GuestImport({ weddingId, onClose }: { weddingId: string; onClose: () => void }) {
  const { api, queryClient } = useRuntime();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [ack, setAck] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [expired, setExpired] = useState(false);
  const [submitted, setSubmitted] = useState<ReturnType<typeof confirmation> | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [editing, setEditing] = useState<number[] | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const options = useQuery({
    queryKey: guestKeys.options(weddingId),
    queryFn: ({ signal }) => getOptions(api, weddingId, signal),
  });
  const upload = useMutation({
    mutationFn: (file: File) => previewFile(api, weddingId, file),
    onSuccess: (data) => {
      setPreview(data);
      setPreviewPage(1);
      setSelected(
        importUnits(data)
          .filter((unit) => unit.valid)
          .map((unit) => unit.key),
      );
      setAck(false);
      setSubmitted(null);
      setExpired(false);
    },
  });
  const confirm = useMutation({
    mutationFn: (body: ReturnType<typeof confirmation>) => confirmFile(api, weddingId, body),
    onSuccess: (data) => {
      setResult(data);
      void queryClient.invalidateQueries({ queryKey: guestKeys.root(weddingId) });
      void queryClient.invalidateQueries({ queryKey: ["weddings"] });
    },
  });
  const recheck = useMutation({
    mutationFn: async (rows: DraftRow[]) => {
      if (!preview) throw new Error("Không có phiên kiểm tra.");
      const file = new File([editedCsv(preview, rows)], "khach-moi-da-sua.csv", {
        type: "text/csv",
      });
      const error = validateFile(file);
      if (error) throw new Error(error);
      return previewFile(api, weddingId, file, preview.importId);
    },
    onSuccess: (data, rows) => {
      const previouslySelected = new Set(
        chosen.flatMap((unit) => unit.members.map((row) => row.rowNumber)),
      );
      setPreview(data);
      setSelected(
        importUnits(data)
          .filter(
            (unit) =>
              unit.valid &&
              unit.members.some(
                (row) =>
                  previouslySelected.has(row.rowNumber) ||
                  rows.some((edit) => edit.rowNumber === row.rowNumber),
              ),
          )
          .map((unit) => unit.key),
      );
      setAck(false);
      setSubmitted(null);
      confirm.reset();
      setExpired(false);
      if (!data.errors.some((issue) => rows.some((row) => row.rowNumber === issue.rowNumber)))
        setEditing(null);
    },
  });
  useEffect(() => {
    if (!preview) return;
    const timer = setInterval(() => setExpired(Date.now() >= Date.parse(preview.expiresAt)), 1000);
    return () => clearInterval(timer);
  }, [preview]);
  function choose(file?: File) {
    if (!file || upload.isPending) return;
    const error = validateFile(file);
    setFileError(error);
    if (error) return;
    setFileName(file.name);
    upload.mutate(file);
  }
  const units = preview ? importUnits(preview) : [];
  const chosen = units.filter((unit) => selected.includes(unit.key));
  const invalidUnits = units.filter((unit) => !unit.valid);
  const invalidRowCount = invalidUnits.reduce((sum, unit) => sum + unit.members.length, 0);
  const selectedPeople = chosen.reduce((sum, unit) => sum + unit.members.length, 0);
  const needsAck = !!preview?.warnings.some(
    (issue) =>
      issue.code === "POSSIBLE_DUPLICATE" &&
      chosen.some((unit) => unit.members.some((row) => row.rowNumber === issue.rowNumber)),
  );
  const busy = upload.isPending || confirm.isPending || recheck.isPending;
  return (
    <section className="space-y-6">
      <Button variant="ghost" onClick={onClose} disabled={busy}>
        <ArrowLeft /> Danh sách khách mời
      </Button>
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Nhập danh sách · {result ? "Hoàn tất" : preview ? "Bước 2 / 2" : "Bước 1 / 2"}
        </p>
        <h1 className="mt-2 font-serif text-3xl">
          {result
            ? "Đã nhập khách mời"
            : preview
              ? "Kiểm tra trước khi nhập"
              : "Mang những người thân yêu vào danh sách"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Một dòng là một người. Cùng mã nhóm mời để nhận chung một thiệp.
        </p>
      </div>
      {result ? (
        <div className="rounded-xl border bg-card p-8">
          <CircleCheck className="mb-4 size-10 text-emerald-700" />
          <h2 className="font-serif text-2xl">
            {result.importedCount} nhóm mời
            {result.importedParticipantCount !== undefined &&
              ` · ${result.importedParticipantCount} người`}
          </h2>
          <p className="my-4 text-sm text-muted-foreground">
            Khách đã được lưu. Import chưa tạo hoặc gửi thiệp, chưa xác nhận tham dự và chưa xếp
            bàn.
          </p>
          <Button onClick={onClose}>Xem danh sách khách mời</Button>
        </div>
      ) : !preview ? (
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-xl border bg-card p-6">
            <div className="mb-6 flex items-center gap-3">
              <FileSpreadsheet className="text-sage" />
              <h2 className="font-serif text-xl">Tải lên CSV hoặc Excel</h2>
            </div>
            <div
              className="flex min-h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed bg-background p-6 text-center"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (event.dataTransfer.files.length !== 1) setFileError("Chọn đúng một file.");
                else choose(event.dataTransfer.files[0]);
              }}
            >
              <Upload className="mb-4 size-9 text-sage" />
              <p className="font-medium">Kéo thả file vào đây</p>
              <p className="my-3 text-sm text-muted-foreground">
                .csv, .xlsx · tối đa 5 MB · 500 dòng dữ liệu
              </p>
              <Button disabled={busy || !options.data} onClick={() => fileInput.current?.click()}>
                {upload.isPending ? "Đang kiểm tra…" : "Chọn file"}
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,.xlsx"
                className="sr-only"
                aria-label="File khách mời"
                disabled={busy}
                onChange={(event) => choose(event.target.files?.[0])}
              />
              {fileName && <p className="mt-3 break-all text-sm">{fileName}</p>}
            </div>
            {fileError && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {fileError}
              </p>
            )}
            {upload.isError && (
              <div className="mt-4">
                <ErrorState error={upload.error} />
                <p className="mt-2 text-sm">
                  Kiểm tra đủ 10 cột trong mẫu, không chứa công thức, rồi tải lại.
                </p>
              </div>
            )}
          </div>
          <div className="space-y-5 rounded-xl border bg-card p-6">
            <h2 className="font-serif text-xl">Bắt đầu từ file mẫu</h2>
            <Button asChild variant="outline">
              <a href="/templates/khach-moi-legacy.csv" download>
                <Download /> Tải mẫu CSV
              </a>
            </Button>
            <p className="text-sm text-muted-foreground">
              Mở bằng Excel. Giữ nguyên tên 10 cột và lưu điện thoại dạng văn bản để giữ số 0 đầu.
              Thay các dòng ví dụ bằng danh sách khách của bạn trước khi nhập.
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm">
              <li>Mỗi nhóm có đúng một người đại diện.</li>
              <li>Thành viên chỉ điền mã nhóm, họ tên và vai trò.</li>
              <li>Thông tin liên hệ, phân loại và số người được thêm chỉ điền ở dòng đại diện.</li>
              <li>Người chưa biết tên chưa được tạo thành khách.</li>
            </ul>
            {options.isPending && <p className="text-sm">Đang tải danh mục…</p>}
            {options.isError && (
              <ErrorState error={options.error} retry={() => void options.refetch()} />
            )}
            {options.data && (
              <div className="space-y-3 border-t pt-4 text-sm">
                <p>
                  <strong>Phía khách mời:</strong>{" "}
                  {options.data.sides.map((item) => item.label).join(" · ")}
                </p>
                <p>
                  <strong>Mối quan hệ:</strong>{" "}
                  {options.data.relationships.map((item) => item.label).join(" · ")}
                </p>
                <p>
                  <strong>Vai trò:</strong>{" "}
                  {options.data.participantRoles?.map((item) => item.label).join(" · ")}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5">
            <div>
              <p className="font-medium">{fileName}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {units.length} nhóm · {preview.rows.length} người ·{" "}
                {units.filter((unit) => !unit.valid).length} nhóm có lỗi
              </p>
            </div>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setPreview(null);
                setSubmitted(null);
                upload.reset();
                confirm.reset();
              }}
            >
              Chọn file khác
            </Button>
          </div>
          {expired && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 p-4 text-destructive"
            >
              Phiên kiểm tra đã hết hạn. Hãy tải file lên lại.
            </p>
          )}
          {!canEditPreview(preview) && (
            <p className="text-sm text-muted-foreground">
              Sửa trực tiếp hỗ trợ mẫu gia đình 10 cột. Với mẫu cũ hoặc dòng sai cấu trúc, sửa file
              gốc và tải lại.
            </p>
          )}
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted">
                <tr>
                  {[
                    "Chọn",
                    "Nhóm mời / thành viên",
                    "Quyền thêm",
                    "Kết quả kiểm tra",
                    "Chi tiết",
                  ].map((title) => (
                    <th className="p-4 font-medium" key={title}>
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {units.slice((previewPage - 1) * 10, previewPage * 10).map((unit) => (
                  <tr key={unit.key} className="border-t align-top">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        aria-label={`Chọn nhóm ${unit.code ?? unit.members[0]?.fullName}`}
                        disabled={!unit.valid || busy || !!submitted || expired}
                        checked={selected.includes(unit.key)}
                        onChange={(event) =>
                          setSelected(
                            event.target.checked
                              ? [...selected, unit.key]
                              : selected.filter((key) => key !== unit.key),
                          )
                        }
                      />
                    </td>
                    <td className="p-4">
                      <strong>{unit.code ?? "Khách lẻ"}</strong>
                      {unit.members.map((row) => (
                        <p className="mt-2" key={row.rowNumber}>
                          <span className="text-muted-foreground">Dòng {row.rowNumber} · </span>
                          {row.fullName || "Thiếu tên"}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {roleLabels[row.participantType] ?? row.participantType}
                          </span>
                        </p>
                      ))}
                    </td>
                    <td className="p-4 tabular-nums">
                      +{unit.allowance}
                      <p className="mt-2 text-xs text-muted-foreground">Chưa tạo người</p>
                    </td>
                    <td className="max-w-sm p-4">
                      {unit.valid && <span className="text-emerald-700">Hợp lệ</span>}
                      {[...preview.errors, ...preview.warnings]
                        .filter((issue) =>
                          unit.members.some((row) => row.rowNumber === issue.rowNumber),
                        )
                        .map((issue, index) => (
                          <p
                            className={`mt-2 ${preview.errors.includes(issue) ? "text-destructive" : "text-amber-800"}`}
                            key={index}
                          >
                            Dòng {issue.rowNumber} · {issue.column}: {issue.message}
                          </p>
                        ))}
                    </td>
                    <td className="p-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Chi tiết và sửa nhóm ${unit.code ?? unit.members[0]?.fullName}`}
                        disabled={
                          busy ||
                          !!submitted ||
                          expired ||
                          !canEditPreview(preview) ||
                          !options.data
                        }
                        onClick={() => {
                          recheck.reset();
                          setEditing(unit.members.map((row) => row.rowNumber));
                        }}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={busy || expired || !!submitted}
                onClick={() =>
                  setSelected(units.filter((unit) => unit.valid).map((unit) => unit.key))
                }
              >
                Chọn tất cả nhóm hợp lệ
              </Button>
              <Button
                variant="ghost"
                disabled={busy || !!submitted}
                onClick={() => setSelected([])}
              >
                Bỏ chọn tất cả
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span>
                Trang {previewPage} / {Math.max(1, Math.ceil(units.length / 10))}
              </span>
              <Button
                variant="outline"
                disabled={previewPage <= 1 || busy}
                onClick={() => setPreviewPage(previewPage - 1)}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                disabled={previewPage * 10 >= units.length || busy}
                onClick={() => setPreviewPage(previewPage + 1)}
              >
                Sau
              </Button>
            </div>
          </div>
          {preview.errors.length > 0 && (
            <div role="alert" className="rounded-xl border bg-card p-4">
              <p className="mb-2 flex items-center gap-2 font-medium">
                <AlertTriangle className="size-4" />
                {preview.formatVersion === 2
                  ? `${invalidUnits.length} nhóm có lỗi (${invalidRowCount} dòng) sẽ không được nhập.`
                  : `${invalidRowCount} dòng lỗi sẽ không được nhập.`}
              </p>
              <p className="mb-3 text-sm">
                Bạn đang chọn nhập {selectedPeople} người hợp lệ. Sửa lỗi bên dưới hoặc tiếp tục
                nhập phần đã chọn.
              </p>
              {preview.errors.map((issue, index) => {
                const unit = units.find((item) =>
                  item.members.some((row) => row.rowNumber === issue.rowNumber),
                );
                return (
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 border-t py-3"
                    key={index}
                  >
                    <p className="text-sm text-destructive">
                      Dòng {issue.rowNumber} · {issue.column}: {issue.message}
                    </p>
                    {unit && canEditPreview(preview) && options.data ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy || !!submitted || expired}
                        onClick={() => {
                          recheck.reset();
                          setEditing(unit.members.map((row) => row.rowNumber));
                        }}
                      >
                        Sửa dòng {issue.rowNumber}
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Sửa file gốc và tải lại vì dòng sai cấu trúc.
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {needsAck && (
            <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <input
                type="checkbox"
                className="mt-1"
                checked={ack}
                disabled={busy || !!submitted}
                onChange={(event) => setAck(event.target.checked)}
              />
              Tôi đã xem cảnh báo của các nhóm đã chọn. Nếu trùng khách, vẫn tạo bản ghi riêng,
              không gộp hoặc cập nhật khách cũ.
            </label>
          )}
          {confirm.isError && (
            <>
              <ErrorState error={confirm.error} />
              <p className="text-sm text-muted-foreground">
                Có thể thử lại cùng lựa chọn. Nếu dữ liệu đã thay đổi hoặc phiên hết hạn, tải file
                lại để kiểm tra.
              </p>
            </>
          )}
          <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-sm">
              Đã chọn{" "}
              <strong>
                {chosen.length} nhóm · {chosen.reduce((sum, unit) => sum + unit.members.length, 0)}{" "}
                người
              </strong>
            </p>
            <Button
              disabled={busy || !!editing || expired || !selected.length || (needsAck && !ack)}
              onClick={() => {
                if (Date.now() >= Date.parse(preview.expiresAt)) {
                  setExpired(true);
                  return;
                }
                const body = submitted ?? confirmation(preview, selected, ack);
                setSubmitted(body);
                confirm.mutate(body);
              }}
            >
              {confirm.isPending
                ? "Đang nhập…"
                : submitted
                  ? "Thử lại xác nhận"
                  : preview.formatVersion === 2
                    ? `Nhập ${chosen.length} nhóm hợp lệ · ${selectedPeople} người`
                    : `Nhập ${chosen.length} dòng hợp lệ`}
            </Button>
          </div>
          {editing && options.data && (
            <ImportGroupEditor
              formatVersion={preview.formatVersion}
              rows={preview.rows.filter((row) => editing.includes(row.rowNumber))}
              issues={preview.errors}
              options={options.data}
              busy={recheck.isPending}
              error={recheck.isError ? recheck.error : null}
              onClose={() => setEditing(null)}
              onSave={(rows) => recheck.mutate(rows)}
            />
          )}
        </>
      )}
    </section>
  );
}
