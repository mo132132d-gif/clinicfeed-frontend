import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Download, Edit2, ExternalLink, Eye, FileText, Folder, Plus, Search, Trash2 } from "lucide-react";
import { roleLabels } from "../../lib/constants";
import { formatDate, formatNumber } from "../../lib/format";
import { isAdmin } from "../../lib/permissions";
import {
  createCompanyDocument,
  createCompanyDocumentFolder,
  deleteCompanyDocument,
  deleteCompanyDocumentFolder,
  listCompanyDocumentFolders,
  listCompanyDocuments,
  updateCompanyDocument,
  updateCompanyDocumentFolder,
} from "../../services/companyDocumentService";
import { useAuth } from "../auth/AuthProvider";
import type { CompanyDocument, CompanyDocumentFolder, Role } from "../../types";
import { Button, Card, EmptyState, Field, Input, LoadingState, Modal, Select, Textarea } from "../../components/shared/Primitives";

const documentCategories = [
  "العقود الرسمية",
  "الشراكات والاتفاقيات",
  "الملفات القانونية",
  "السياسات والإجراءات",
  "النماذج والقوالب",
  "ملفات التمويل",
  "ملفات التسويق والعروض",
  "مستندات إدارية عامة",
];

const visibilityOptions: Array<{ value: Role | "all"; label: string }> = [
  { value: "all", label: "كل الموظفين" },
  { value: "admin", label: roleLabels.admin },
  { value: "manager", label: roleLabels.manager },
  { value: "operations", label: roleLabels.operations },
  { value: "sales", label: roleLabels.sales },
  { value: "viewer", label: roleLabels.viewer },
];

const companyDocumentAccept = ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.zip,.rar";

function canViewDocument(document: CompanyDocument, role?: Role) {
  return !document.visibility_role || document.visibility_role === "all" || document.visibility_role === role || role === "admin";
}

function canViewFolder(folder: CompanyDocumentFolder, role?: Role) {
  return !folder.visibility_role || folder.visibility_role === "all" || folder.visibility_role === role || role === "admin";
}

function fileSize(value?: number | string | null) {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) return "-";
  if (size < 1024 * 1024) return `${formatNumber(Math.round(size / 1024))} KB`;
  return `${formatNumber((size / 1024 / 1024).toFixed(1))} MB`;
}

function visibilityLabel(value?: CompanyDocument["visibility_role"]) {
  if (!value || value === "all") return "كل الموظفين";
  return roleLabels[value] || value;
}

function includesSearch(values: Array<string | number | null | undefined>, term: string) {
  if (!term) return true;
  const normalizedTerm = term.trim().toLowerCase();
  return values.some((value) => String(value || "").toLowerCase().includes(normalizedTerm));
}

function fileExtension(document: CompanyDocument) {
  const source = document.file_name || document.file_url || document.file_path || "";
  return source.split(".").pop()?.toLowerCase() || "";
}

function fileKind(document: CompanyDocument) {
  const mime = String(document.file_mime_type || "").toLowerCase();
  const ext = fileExtension(document);
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp"].includes(ext)) return "image";
  if (mime.startsWith("text/") || ["txt", "csv"].includes(ext)) return "text";
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext)) return "office";
  if (["zip", "rar"].includes(ext)) return "archive";
  return "unsupported";
}

export function CompanyDocumentsPage() {
  const { user, setMessage } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CompanyDocument | null | undefined>(undefined);
  const [editingFolder, setEditingFolder] = useState<CompanyDocumentFolder | null | undefined>(undefined);
  const [detailsDocument, setDetailsDocument] = useState<CompanyDocument | null>(null);
  const [previewDocument, setPreviewDocument] = useState<CompanyDocument | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const canManage = isAdmin(user?.role);

  const foldersQuery = useQuery({ queryKey: ["companyDocumentFolders"], queryFn: listCompanyDocumentFolders, staleTime: 30_000 });
  const documentsQuery = useQuery({ queryKey: ["companyDocuments"], queryFn: listCompanyDocuments, staleTime: 30_000 });

  const deleteFolderMutation = useMutation({
    mutationFn: deleteCompanyDocumentFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companyDocumentFolders"] });
      queryClient.invalidateQueries({ queryKey: ["companyDocuments"] });
      setSelectedFolderId(null);
      setMessage("تم حذف المجلد");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCompanyDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companyDocuments"] });
      setMessage("تم حذف المستند");
    },
  });

  const searchTerm = search.trim().toLowerCase();

  const folders = (foldersQuery.data || [])
    .filter((folder) => canViewFolder(folder, user?.role))
    .filter((folder) => includesSearch([folder.name, folder.description], searchTerm));

  const documents = (documentsQuery.data || []).filter((document) => canViewDocument(document, user?.role));

  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId) || null;

  const folderDocuments = useMemo(
    () =>
      documents
        .filter((document) => document.folder_id === selectedFolderId)
        .filter((document) => includesSearch([document.title, document.category, document.file_name, document.notes, document.uploaded_by], searchTerm)),
    [documents, selectedFolderId, searchTerm],
  );

  function confirmDeleteFolder(folder: CompanyDocumentFolder) {
    const count = documents.filter((document) => document.folder_id === folder.id).length;
    const message = count > 0
      ? `المجلد يحتوي على ${count} مستند. هل تريد حذف المجلد وكل مستنداته؟`
      : "هل تريد حذف هذا المجلد؟";

    if (window.confirm(message)) {
      deleteFolderMutation.mutate(folder.id);
    }
  }

  function openFolder(folderId: string) {
    setSelectedFolderId(folderId);
  }

  function handleFolderKeyDown(event: React.KeyboardEvent<HTMLDivElement>, folderId: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFolder(folderId);
    }
  }

  return (
    <div className="space-y-6">
      {editingFolder !== undefined && (
        <CompanyFolderModal folder={editingFolder} onClose={() => setEditingFolder(undefined)} />
      )}

      {editing !== undefined && selectedFolder && (
        <CompanyDocumentModal folder={selectedFolder} document={editing} onClose={() => setEditing(undefined)} />
      )}

      {detailsDocument && (
        <DocumentDetailsModal
          document={detailsDocument}
          canManage={canManage}
          onPreview={() => setPreviewDocument(detailsDocument)}
          onEdit={() => {
            setDetailsDocument(null);
            setEditing(detailsDocument);
          }}
          onDelete={() => {
            deleteMutation.mutate(detailsDocument.id);
            setDetailsDocument(null);
          }}
          onClose={() => setDetailsDocument(null)}
        />
      )}

      {previewDocument && (
        <DocumentPreviewModal document={previewDocument} onClose={() => setPreviewDocument(null)} />
      )}

      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold text-[#8F99B8]">مركز داخلي مستقل عن مستندات الموردين</p>
            <h1 className="mt-1 text-2xl font-black text-white">مركز مستندات ClinicFeed</h1>
            <p className="mt-2 text-sm leading-7 text-[#8F99B8]">
              حفظ العقود والسياسات والنماذج والملفات الرسمية لاستخدامها كمرجع داخلي للموظفين.
            </p>
          </div>

          {canManage && (
            <Button onClick={() => selectedFolder ? setEditing(null) : setEditingFolder(null)}>
              <Plus className="h-4 w-4" />
              {selectedFolder ? "رفع مستند داخل المجلد" : "إنشاء مجلد جديد"}
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8F99B8]" />
          <Input
            className="pr-9"
            placeholder="ابحث عن مجلد أو مستند..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </Card>

      {!selectedFolder ? (
        <Card className="p-5">
          {foldersQuery.isLoading || documentsQuery.isLoading ? (
            <LoadingState label="جاري تحميل مجلدات المستندات..." />
          ) : folders.length === 0 ? (
            <EmptyState title="لا توجد مجلدات مستندات" subtitle="يمكن للمدير إنشاء مجلدات ديناميكية مثل تمويل الأولى أو العقود الرسمية." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {folders.map((folder) => {
                const count = documents.filter((document) => document.folder_id === folder.id).length;

                return (
                  <div
                    key={folder.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openFolder(folder.id)}
                    onKeyDown={(event) => handleFolderKeyDown(event, folder.id)}
                    className="cursor-pointer rounded-3xl border border-[#343A4F] bg-[#252B3A] p-5 text-right transition hover:-translate-y-0.5 hover:border-[#5B73E8]/45 hover:bg-[#2A3348] focus:outline-none focus:ring-2 focus:ring-[#5B73E8]/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-black text-white">{folder.name}</p>
                        <p className="mt-2 line-clamp-2 text-sm leading-7 text-[#8F99B8]">
                          {folder.description || "بدون وصف"}
                        </p>
                      </div>

                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#5B73E8]/15 text-[#8EA0FF]">
                        <Folder className="h-6 w-6" />
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                      <Info label="عدد المستندات" value={count} />
                      <Info label="تاريخ الإنشاء" value={formatDate(folder.created_at)} />
                      <Info label="أنشئ بواسطة" value={folder.created_by || "-"} />
                      <Info label="الصلاحية" value={visibilityLabel(folder.visibility_role)} />
                    </div>

                    {canManage && (
                      <div
                        className="mt-4 flex flex-wrap gap-2"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Button
                          variant="secondary"
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditingFolder(folder);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                          تعديل
                        </Button>

                        <Button
                          variant="danger"
                          onClick={(event) => {
                            event.stopPropagation();
                            confirmDeleteFolder(folder);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          حذف
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-[#30364A] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Button variant="ghost" onClick={() => setSelectedFolderId(null)}>
                <ArrowRight className="h-4 w-4" />
                العودة للمجلدات
              </Button>

              <h2 className="mt-3 text-xl font-black text-white">{selectedFolder.name}</h2>
              <p className="mt-1 text-sm leading-7 text-[#8F99B8]">
                {selectedFolder.description || "مستندات هذا المجلد"}
              </p>
            </div>

            {canManage && (
              <Button onClick={() => setEditing(null)}>
                <Plus className="h-4 w-4" />
                رفع مستند داخل المجلد
              </Button>
            )}
          </div>

          {documentsQuery.isLoading ? (
            <LoadingState label="جاري تحميل مستندات المجلد..." />
          ) : folderDocuments.length === 0 ? (
            <EmptyState title="لا توجد مستندات داخل هذا المجلد" subtitle="يمكن للمدير رفع مستندات مرتبطة بهذا المجلد." />
          ) : (
            <>
              <div className="grid gap-3 p-4 md:hidden">
                {folderDocuments.map((document) => (
                  <Card
                    key={document.id}
                    className="cursor-pointer p-4"
                    onClick={() => setDetailsDocument(document)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-black text-white">{document.title}</p>
                        <p className="mt-1 text-sm text-[#8F99B8]">{document.category}</p>
                      </div>
                      <FileText className="h-5 w-5 shrink-0 text-[#8F99B8]" />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <Info label="الملف" value={document.file_name || "-"} />
                      <Info label="تاريخ الرفع" value={formatDate(document.created_at)} />
                      <Info label="رفع بواسطة" value={document.uploaded_by || "-"} />
                      <Info label="الصلاحية" value={visibilityLabel(document.visibility_role)} />
                    </div>

                    {document.notes && (
                      <p className="mt-3 rounded-xl bg-[#1E2638] p-3 text-sm leading-7 text-[#B8C1DD]">
                        {document.notes}
                      </p>
                    )}
                  </Card>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1100px] table-fixed text-right text-sm">
                  <thead className="bg-[#252B3A] text-[#B8C1DD]">
                    <tr>
                      <th className="w-[18%] px-4 py-4 font-black">عنوان المستند</th>
                      <th className="w-[15%] px-4 py-4 font-black">التصنيف</th>
                      <th className="w-[16%] px-4 py-4 font-black">اسم الملف</th>
                      <th className="w-[9%] px-4 py-4 font-black">الحجم</th>
                      <th className="w-[10%] px-4 py-4 font-black">تاريخ الرفع</th>
                      <th className="w-[11%] px-4 py-4 font-black">رفع بواسطة</th>
                      <th className="w-[10%] px-4 py-4 font-black">الصلاحية</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#30364A]">
                    {folderDocuments.map((document) => (
                      <tr
                        key={document.id}
                        className="cursor-pointer hover:bg-[#343B52]"
                        onClick={() => setDetailsDocument(document)}
                      >
                        <td className="px-4 py-4">
                          <p className="truncate font-black text-white">{document.title}</p>
                          <p className="truncate text-xs text-[#8F99B8]">{document.notes || "-"}</p>
                        </td>
                        <td className="truncate px-4 py-4 text-[#B8C1DD]">{document.category}</td>
                        <td className="truncate px-4 py-4 text-[#B8C1DD]">{document.file_name || "-"}</td>
                        <td className="truncate px-4 py-4 text-[#B8C1DD]">{fileSize(document.file_size)}</td>
                        <td className="truncate px-4 py-4 text-[#B8C1DD]">{formatDate(document.created_at)}</td>
                        <td className="truncate px-4 py-4 text-[#B8C1DD]">{document.uploaded_by || "-"}</td>
                        <td className="truncate px-4 py-4 text-[#B8C1DD]">{visibilityLabel(document.visibility_role)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

function CompanyFolderModal({ folder, onClose }: { folder?: CompanyDocumentFolder | null; onClose: () => void }) {
  const { user, setMessage } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: folder?.name || "",
    description: folder?.description || "",
    visibility_role: folder?.visibility_role || "all",
  });

  const mutation = useMutation({
    mutationFn: () =>
      folder
        ? updateCompanyDocumentFolder(folder.id, form)
        : createCompanyDocumentFolder({ ...form, created_by: user?.name || "مستخدم النظام" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companyDocumentFolders"] });
      setMessage(folder ? "تم تحديث المجلد" : "تم إنشاء المجلد");
      onClose();
    },
    onError: () => setError("تعذر حفظ المجلد"),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return setError("اسم المجلد مطلوب");
    mutation.mutate();
  }

  return (
    <Modal title={folder ? "تعديل مجلد" : "إنشاء مجلد جديد"} onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <Field label="اسم المجلد" required>
          <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </Field>

        <Field label="صلاحية الظهور">
          <Select
            value={form.visibility_role}
            onChange={(event) => setForm({ ...form, visibility_role: event.target.value as Role | "all" })}
          >
            {visibilityOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </Field>

        <Field label="الوصف / الملاحظات">
          <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </Field>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>إلغاء</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs font-bold text-[#8F99B8]">{label}</p>
      <p className="mt-1 truncate font-black text-[#F3F6F9]">{value || "-"}</p>
    </div>
  );
}

function DocumentDetailsModal({
  document,
  canManage,
  onPreview,
  onEdit,
  onDelete,
  onClose,
}: {
  document: CompanyDocument;
  canManage: boolean;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const href = document.file_url || document.file_path || "";

  return (
    <Modal title="تفاصيل المستند" onClose={onClose}>
      <div className="space-y-5">
        <div className="rounded-2xl border border-[#30364A] bg-[#1E2638] p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#5B73E8]/15 text-[#8EA0FF]">
              <FileText className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <h2 className="text-xl font-black text-white">{document.title}</h2>
              <p className="mt-1 text-sm text-[#8F99B8]">{document.category}</p>
            </div>
          </div>

          {document.notes && (
            <p className="mt-4 rounded-xl bg-[#252B3A] p-3 text-sm leading-7 text-[#B8C1DD]">
              {document.notes}
            </p>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Info label="اسم الملف" value={document.file_name || "-"} />
          <Info label="حجم الملف" value={fileSize(document.file_size)} />
          <Info label="نوع الملف" value={document.file_mime_type || fileExtension(document) || "-"} />
          <Info label="تاريخ الرفع" value={formatDate(document.created_at)} />
          <Info label="رفع بواسطة" value={document.uploaded_by || "-"} />
          <Info label="الصلاحية" value={visibilityLabel(document.visibility_role)} />
          <Info label="مسار التخزين" value={document.file_path || "-"} />
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[#30364A] pt-4">
          {href && (
            <Button variant="secondary" onClick={onPreview}>
              <Eye className="h-4 w-4" />
              معاينة
            </Button>
          )}

          {href && (
            <Button variant="secondary" onClick={() => window.open(href, "_blank")}>
              <ExternalLink className="h-4 w-4" />
              فتح في تبويب جديد
            </Button>
          )}

          {href && (
            <Button onClick={() => window.open(href, "_blank")}>
              <Download className="h-4 w-4" />
              تحميل
            </Button>
          )}

          {canManage && (
            <Button variant="secondary" onClick={onEdit}>
              <Edit2 className="h-4 w-4" />
              تعديل
            </Button>
          )}

          {canManage && (
            <Button variant="danger" onClick={() => window.confirm("هل تريد حذف هذا المستند؟") && onDelete()}>
              <Trash2 className="h-4 w-4" />
              حذف
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function DocumentPreviewModal({ document, onClose }: { document: CompanyDocument; onClose: () => void }) {
  const href = document.file_url || document.file_path || "";
  const kind = fileKind(document);

  return (
    <Modal title={`معاينة: ${document.title}`} onClose={onClose}>
      <div className="space-y-4">
        {kind === "image" && href && (
          <div className="overflow-hidden rounded-2xl border border-[#30364A] bg-[#101624]">
            <img src={href} alt={document.title} className="max-h-[70vh] w-full object-contain" />
          </div>
        )}

        {kind === "pdf" && href && (
          <iframe title={document.title} src={href} className="h-[70vh] w-full rounded-2xl border border-[#30364A] bg-[#101624]" />
        )}

        {kind === "text" && href && (
          <iframe title={document.title} src={href} className="h-[60vh] w-full rounded-2xl border border-[#30364A] bg-white text-slate-950" />
        )}

        {!["image", "pdf", "text"].includes(kind) && (
          <div className="rounded-2xl border border-[#30364A] bg-[#1E2638] p-6 text-center">
            <FileText className="mx-auto h-10 w-10 text-[#8F99B8]" />
            <p className="mt-4 font-black text-white">المعاينة غير متاحة لهذا النوع من الملفات، يمكنك تحميل الملف.</p>
            <p className="mt-2 text-sm text-[#8F99B8]">{document.file_name || document.file_path || "-"}</p>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          {href && (
            <Button variant="secondary" onClick={() => window.open(href, "_blank")}>
              <ExternalLink className="h-4 w-4" />
              فتح في تبويب جديد
            </Button>
          )}

          {href && (
            <Button onClick={() => window.open(href, "_blank")}>
              <Download className="h-4 w-4" />
              تحميل
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function CompanyDocumentModal({
  folder,
  document,
  onClose,
}: {
  folder: CompanyDocumentFolder;
  document?: CompanyDocument | null;
  onClose: () => void;
}) {
  const { user, setMessage } = useAuth();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: document?.title || "",
    category: document?.category || documentCategories[0],
    visibility_role: document?.visibility_role || "all",
    notes: document?.notes || "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      document
        ? updateCompanyDocument(document.id, form, file)
        : createCompanyDocument({ ...form, folder_id: folder.id, uploaded_by: user?.name || "مستخدم النظام" }, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companyDocuments"] });
      setMessage(document ? "تم تحديث المستند الداخلي" : "تم رفع المستند الداخلي");
      onClose();
    },
    onError: () => setError("تعذر حفظ المستند"),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return setError("عنوان المستند مطلوب");
    if (!document && !file) return setError("ملف المستند مطلوب");
    if (!document && !folder.id) return setError("تعذر تحديد مسار المجلد لحفظ الملف");
    mutation.mutate();
  }

  return (
    <Modal title={document ? "تعديل مستند داخلي" : "رفع مستند داخلي"} onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="عنوان المستند" required>
            <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </Field>

          <Field label="التصنيف" required>
            <Select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              {documentCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </Select>
          </Field>

          <Field label="صلاحية الظهور">
            <Select
              value={form.visibility_role}
              onChange={(event) => setForm({ ...form, visibility_role: event.target.value as Role | "all" })}
            >
              {visibilityOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </Field>

          <Field label={document ? "استبدال الملف" : "ملف المستند"} required={!document}>
            <Input
              type="file"
              accept={companyDocumentAccept}
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            {file && <p className="mt-2 text-xs text-[#8F99B8]">{file.name}</p>}
          </Field>

          <div className="md:col-span-2">
            <Field label="ملاحظات">
              <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>إلغاء</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}