import { normalizeList, unwrapData } from "../lib/format";
import type { CompanyDocument, CompanyDocumentFolder } from "../types";

const documentsStorageKey = "clinicfeed_company_documents";
const foldersStorageKey = "clinicfeed_company_document_folders";

function readStoredDocuments() {
  try {
    return normalizeList<CompanyDocument>(JSON.parse(localStorage.getItem(documentsStorageKey) || "[]"));
  } catch {
    return [];
  }
}

function readStoredFolders() {
  try {
    return normalizeList<CompanyDocumentFolder>(JSON.parse(localStorage.getItem(foldersStorageKey) || "[]"));
  } catch {
    return [];
  }
}

function writeStoredDocuments(documents: CompanyDocument[]) {
  localStorage.setItem(documentsStorageKey, JSON.stringify(documents));
}

function writeStoredFolders(folders: CompanyDocumentFolder[]) {
  localStorage.setItem(foldersStorageKey, JSON.stringify(folders));
}

function createId() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeFileName(name: string) {
  return name
    .trim()
    .replace(/[^\u0600-\u06FF\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "file";
}

function companyDocumentPath(folderId?: string | null, file?: File | null) {
  if (!folderId || !file) return null;
  return `company-documents/${folderId}/${Date.now()}-${safeFileName(file.name)}`;
}

export async function listCompanyDocumentFolders() {
  return readStoredFolders();
}

export async function createCompanyDocumentFolder(data: Partial<CompanyDocumentFolder>) {
  const now = new Date().toISOString();
  const folder: CompanyDocumentFolder = {
    id: createId(),
    name: data.name || "مجلد جديد",
    description: data.description || null,
    visibility_role: data.visibility_role || "all",
    created_by: data.created_by || "مستخدم النظام",
    created_at: now,
    updated_at: now,
  };
  writeStoredFolders([folder, ...readStoredFolders()]);
  return folder;
}

export async function updateCompanyDocumentFolder(id: string, data: Partial<CompanyDocumentFolder>) {
  let updated: CompanyDocumentFolder | null = null;
  const folders = readStoredFolders().map((folder) => {
    if (folder.id !== id) return folder;
    updated = { ...folder, ...data, updated_at: new Date().toISOString() };
    return updated;
  });
  writeStoredFolders(folders);
  return unwrapData<CompanyDocumentFolder | null>(updated);
}

export async function deleteCompanyDocumentFolder(id: string) {
  writeStoredFolders(readStoredFolders().filter((folder) => folder.id !== id));
  writeStoredDocuments(readStoredDocuments().filter((document) => document.folder_id !== id));
}

export async function listCompanyDocuments() {
  return readStoredDocuments();
}

export async function createCompanyDocument(data: Partial<CompanyDocument>, file?: File | null) {
  const now = new Date().toISOString();
  const filePath = companyDocumentPath(data.folder_id, file) || data.file_path || null;
  const document: CompanyDocument = {
    id: createId(),
    folder_id: data.folder_id || null,
    title: data.title || "مستند داخلي",
    category: data.category || "مستندات إدارية عامة",
    file_url: file ? URL.createObjectURL(file) : data.file_url || null,
    file_name: file?.name || data.file_name || null,
    file_mime_type: file?.type || data.file_mime_type || null,
    file_size: file?.size || data.file_size || null,
    file_path: filePath,
    notes: data.notes || null,
    visibility_role: data.visibility_role || "all",
    uploaded_by: data.uploaded_by || "مستخدم النظام",
    created_at: now,
    updated_at: now,
  };
  const documents = [document, ...readStoredDocuments()];
  writeStoredDocuments(documents);
  return document;
}

export async function updateCompanyDocument(id: string, data: Partial<CompanyDocument>, file?: File | null) {
  let updated: CompanyDocument | null = null;
  const documents = readStoredDocuments().map((document) => {
    if (document.id !== id) return document;
    const filePath = companyDocumentPath(data.folder_id || document.folder_id, file) || data.file_path || document.file_path || null;
    updated = {
      ...document,
      ...data,
      file_url: file ? URL.createObjectURL(file) : data.file_url ?? document.file_url,
      file_name: file?.name || data.file_name || document.file_name,
      file_mime_type: file?.type || data.file_mime_type || document.file_mime_type,
      file_size: file?.size || data.file_size || document.file_size,
      file_path: filePath,
      updated_at: new Date().toISOString(),
    };
    return updated;
  });
  writeStoredDocuments(documents);
  return unwrapData<CompanyDocument | null>(updated);
}

export async function deleteCompanyDocument(id: string) {
  writeStoredDocuments(readStoredDocuments().filter((document) => document.id !== id));
}
