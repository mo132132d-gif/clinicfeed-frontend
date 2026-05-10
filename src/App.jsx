import { useEffect, useMemo, useState } from "react"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api"
const TOKEN_KEY = "clinicfeed_token"

const supplierStatuses = [
  { value: "Active", label: "نشط" },
  { value: "Pending", label: "قيد المراجعة" },
  { value: "Suspended", label: "موقوف" },
  { value: "Inactive", label: "غير نشط" },
  { value: "Blacklisted", label: "قائمة سوداء" },
]

const contractStatuses = [
  { value: "Active", label: "نشط" },
  { value: "Expired", label: "منتهي" },
  { value: "Terminated", label: "منتهي تعاقديًا" },
]

const categoryOptions = [
  "أجهزة طبية",
  "مستلزمات طبية",
  "أدوية",
  "مختبرات",
  "أسنان",
  "تجميل وجلدية",
  "أدوات جراحية",
  "صيانة وقطع غيار",
  "تدريب وخدمات",
  "أخرى",
]

const documentTypes = [
  { value: "CR", label: "السجل التجاري" },
  { value: "VAT", label: "شهادة ضريبة القيمة المضافة" },
  { value: "Authorization", label: "خطاب تفويض" },
  { value: "Catalog", label: "كتالوج المنتجات" },
  { value: "Price List", label: "قائمة الأسعار" },
  { value: "Other", label: "أخرى" },
]

const allowedExtensions = ["pdf", "doc", "docx", "xls", "xlsx", "png", "jpg", "jpeg"]
const maxFileSize = 10 * 1024 * 1024

const emptySupplierForm = {
  name_ar: "",
  name_en: "",
  cr_number: "",
  vat_number: "",
  city: "",
  category: [],
  status: "Pending",
  notes: "",
}

const emptyContactForm = {
  name: "",
  position: "",
  phone: "",
  whatsapp: "",
  email: "",
  is_primary: false,
}

const emptyContractForm = {
  contract_number: "",
  contract_type: "",
  start_date: "",
  end_date: "",
  status: "Active",
  owner: "",
  notes: "",
  file: null,
}

const emptyDocumentForm = {
  type: "CR",
  expiry_date: "",
  last_updated: "",
  file: null,
}

function cx(...classes) {
  return classes.filter(Boolean).join(" ")
}

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.suppliers)) return payload.suppliers
  if (Array.isArray(payload?.contacts)) return payload.contacts
  if (Array.isArray(payload?.contracts)) return payload.contracts
  if (Array.isArray(payload?.documents)) return payload.documents
  return []
}

function formatDate(value) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toISOString().slice(0, 10)
}

function statusLabel(status) {
  return supplierStatuses.find((item) => item.value === status)?.label || status || "-"
}

function contractStatusLabel(status) {
  return contractStatuses.find((item) => item.value === status)?.label || status || "-"
}

function documentTypeLabel(type) {
  return documentTypes.find((item) => item.value === type)?.label || type || "-"
}

function parseCategories(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function serializeCategories(value) {
  return parseCategories(value).join(",")
}

function expiryState(dateValue) {
  if (!dateValue) return { label: "غير محدد", tone: "muted" }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(`${formatDate(dateValue)}T00:00:00`)
  const days = Math.ceil((date - today) / (1000 * 60 * 60 * 24))
  if (days < 0) return { label: "منتهي", tone: "danger" }
  if (days <= 30) return { label: "ينتهي قريبًا", tone: "warning" }
  return { label: "ساري", tone: "success" }
}

function parseJwt(token) {
  try {
    const [, payload] = token.split(".")
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))
  } catch {
    return null
  }
}

function fileError(file) {
  if (!file) return "الملف مطلوب"
  const extension = file.name.split(".").pop()?.toLowerCase()
  if (!allowedExtensions.includes(extension)) return "نوع الملف غير مسموح"
  if (file.size > maxFileSize) return "حجم الملف يتجاوز 10MB"
  return ""
}

function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      className={cx(
        "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function SecondaryButton({ children, className = "", ...props }) {
  return (
    <button
      className={cx(
        "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function DangerButton({ children, className = "", ...props }) {
  return (
    <button
      className={cx(
        "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-900/50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function Card({ children, className = "" }) {
  return (
    <section className={cx("rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900", className)}>
      {children}
    </section>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 sm:items-center">
      <div className="my-4 max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">إغلاق</button>
        </div>
        <div className="max-h-[calc(92vh-4.5rem)] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children, required }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      {children}
    </label>
  )
}

function inputClass() {
  return "min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-900"
}

function EmptyState({ title = "لا توجد بيانات", subtitle = "ستظهر البيانات هنا بعد إضافتها." }) {
  return (
    <div className="py-10 text-center">
      <p className="font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    Active: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800",
    Pending: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800",
    Suspended: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800",
    Inactive: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
    Blacklisted: "bg-slate-900 text-white ring-slate-900 dark:bg-black dark:ring-slate-700",
  }
  return <span className={cx("inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ring-1", styles[status] || styles.Inactive)}>{statusLabel(status)}</span>
}

function ExpiryBadge({ date }) {
  const state = expiryState(date)
  const styles = {
    danger: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800",
    warning: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800",
    muted: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  }
  return <span className={cx("inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ring-1", styles[state.tone])}>{state.label}</span>
}

function FileActions({ url, onCopy }) {
  if (!url) return <span className="text-sm text-slate-400">-</span>
  return (
    <div className="inline-flex flex-nowrap items-center gap-2">
      <SecondaryButton onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>فتح الملف</SecondaryButton>
      <SecondaryButton onClick={() => onCopy(url)}>نسخ رابط الملف</SecondaryButton>
    </div>
  )
}

function CategoryBadges({ value }) {
  const categories = parseCategories(value)
  if (categories.length === 0) return <span className="text-slate-400">-</span>
  return (
    <div className="inline-flex flex-nowrap items-center gap-2">
      {categories.map((category) => (
        <span
          key={category}
          className="inline-flex whitespace-nowrap rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-800"
        >
          {category}
        </span>
      ))}
    </div>
  )
}

function CategorySelector({ value, onChange }) {
  const selected = parseCategories(value)
  const toggle = (category) => {
    const exists = selected.includes(category)
    const next = exists ? selected.filter((item) => item !== category) : [...selected, category]
    onChange(next)
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
      <div className="grid gap-2 sm:grid-cols-2">
        {categoryOptions.map((category) => (
          <label key={category} className="flex min-h-9 items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
            <input
              type="checkbox"
              checked={selected.includes(category)}
              onChange={() => toggle(category)}
              className="h-4 w-4 rounded border-slate-300 text-blue-700"
            />
            <span>{category}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function ClinicFeedLogo({ variant = "desktop" }) {
  return (
    <img
      src="/clinicfeed-logo.png.svg"
      alt="ClinicFeed"
      className={cx(
        "block w-auto object-contain",
        variant === "mobile"
          ? "sidebar-logo-img logo-needs-crop h-16 w-[190px] object-cover object-center"
          : "login-logo-img logo-needs-crop h-24 w-[280px] object-cover object-center",
      )}
    />
  )
}

function normalizePhoneForWhatsapp(value) {
  const digits = String(value || "").replace(/\D/g, "")
  if (!digits) return ""
  if (digits.startsWith("966")) return digits
  if (digits.startsWith("0")) return `966${digits.slice(1)}`
  if (digits.length === 9 && digits.startsWith("5")) return `966${digits}`
  return digits
}

function ContactLink({ type, value }) {
  if (!value) return <span className="text-slate-400">-</span>

  if (type === "email") {
    return (
      <a
        href={`mailto:${value}`}
        className="break-all font-semibold text-blue-700 underline-offset-4 hover:underline dark:text-blue-300"
      >
        {value}
      </a>
    )
  }

  const whatsappNumber = normalizePhoneForWhatsapp(value)

  return (
    <details className="relative inline-block">
      <summary className="cursor-pointer list-none font-semibold text-blue-700 underline-offset-4 hover:underline dark:text-blue-300">
        {value}
      </summary>
      <div className="absolute right-0 z-40 mt-2 min-w-36 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <a
          href={`https://wa.me/${whatsappNumber}`}
          target="_blank"
          rel="noreferrer"
          className="block px-4 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          واتساب
        </a>
        <a
          href={`tel:${value}`}
          className="block px-4 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          اتصال
        </a>
      </div>
    </details>
  )
}

export default function App() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "")
  const [user, setUser] = useState(null)
  const [page, setPage] = useState("dashboard")
  const [darkMode] = useState(true)
  const [suppliers, setSuppliers] = useState([])
  const [contacts, setContacts] = useState([])
  const [contracts, setContracts] = useState([])
  const [documents, setDocuments] = useState([])
  const [alerts, setAlerts] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [profileTab, setProfileTab] = useState("info")
  const [profileData, setProfileData] = useState({ contacts: [], contracts: [], documents: [], alerts: null, logs: [] })
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [loading, setLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [modal, setModal] = useState(null)

  const role = user?.role || parseJwt(token)?.role || "admin"
  const canAdd = ["admin", "operations", "sales"].includes(role)
  const canEdit = ["admin", "operations"].includes(role)
  const canArchive = role === "admin"
  const canUpload = ["admin", "operations"].includes(role)

  useEffect(() => {
    document.documentElement.classList.add("dark")
    document.documentElement.style.colorScheme = "dark"
  }, [darkMode])

  useEffect(() => {
    if (token) {
      loadInitialData(token)
    }
  }, [])

  async function apiRequest(path, options = {}) {
    const isFormData = options.body instanceof FormData
    const headers = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    }

    try {
      const response = await fetch(`${API_URL}${path}`, { ...options, headers })
      const text = await response.text()
      const data = text ? JSON.parse(text) : {}

      if (response.status === 401) {
        logout("انتهت الجلسة، الرجاء تسجيل الدخول مرة أخرى")
        throw new Error("انتهت الجلسة، الرجاء تسجيل الدخول مرة أخرى")
      }

      if (!response.ok) {
        throw new Error(data?.error?.message || "تعذر تنفيذ العملية")
      }

      return data
    } catch (err) {
      if (err instanceof TypeError) {
        throw new Error("تعذر الاتصال بالخادم")
      }
      throw err
    }
  }

  function notify(text) {
    setMessage(text)
    setTimeout(() => setMessage(""), 3000)
  }

  function logout(customMessage = "") {
    localStorage.removeItem(TOKEN_KEY)
    setToken("")
    setUser(null)
    setSuppliers([])
    setContacts([])
    setContracts([])
    setDocuments([])
    setSelectedSupplier(null)
    setError(customMessage)
  }

  async function login() {
    try {
      setError("")
      setLoading(true)
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message || "فشل تسجيل الدخول")
      const accessToken = data?.data?.token || data?.token || data?.accessToken || data?.access_token
      if (!accessToken) throw new Error("لم يرجع الخادم رمز الدخول")
      const loginUser = data?.data?.user || data?.user || parseJwt(accessToken) || { role: "admin", email }
      localStorage.setItem(TOKEN_KEY, accessToken)
      setToken(accessToken)
      setUser(loginUser)
      await loadInitialData(accessToken, loginUser)
    } catch (err) {
      setError(err instanceof TypeError ? "تعذر الاتصال بالخادم" : err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadInitialData(accessToken = token, loginUser = user) {
    try {
      setLoading(true)
      setError("")
      const previousToken = token
      if (accessToken && accessToken !== previousToken) setToken(accessToken)

      const authHeaders = { Authorization: `Bearer ${accessToken}` }
      const fetchWithAuth = async (path) => {
        const res = await fetch(`${API_URL}${path}`, { headers: authHeaders })
        const data = await res.json()
        if (res.status === 401) {
          logout("انتهت الجلسة، الرجاء تسجيل الدخول مرة أخرى")
          throw new Error("انتهت الجلسة، الرجاء تسجيل الدخول مرة أخرى")
        }
        return { res, data }
      }
      const requests = await Promise.allSettled([
        fetchWithAuth("/suppliers"),
        fetchWithAuth("/contacts"),
        fetchWithAuth("/contracts"),
        fetchWithAuth("/documents"),
        fetchWithAuth("/alerts"),
        fetchWithAuth("/activity-logs?limit=5"),
      ])

      const [supplierResult, contactResult, contractResult, documentResult, alertResult, activityResult] = requests
      const unpack = (result) => (result.status === "fulfilled" && result.value.res.ok ? result.value.data : null)
      const supplierPayload = unpack(supplierResult)

      if (!supplierPayload) {
        const failed = supplierResult.status === "fulfilled" ? supplierResult.value.data : null
        throw new Error(failed?.error?.message || "فشل جلب الموردين")
      }

      setSuppliers(normalizeList(supplierPayload))
      setContacts(normalizeList(unpack(contactResult)))
      setContracts(normalizeList(unpack(contractResult)))
      setDocuments(normalizeList(unpack(documentResult)))
      setAlerts(unpack(alertResult)?.data || null)
      setRecentActivity(normalizeList(unpack(activityResult)))
      setUser(loginUser || user || parseJwt(accessToken) || { role: "admin" })
    } catch (err) {
      setError(err instanceof TypeError ? "تعذر الاتصال بالخادم" : err.message)
    } finally {
      setLoading(false)
    }
  }

  async function refreshAll() {
    await loadInitialData(token, user)
    if (selectedSupplier) {
      await openSupplierProfile(selectedSupplier, profileTab)
    }
  }

  async function openSupplierProfile(supplier, tab = "info") {
    setSelectedSupplier(supplier)
    setProfileTab(tab)
    try {
      setProfileLoading(true)
      const [supplierContacts, supplierContracts, supplierDocuments, supplierAlerts, supplierLogs] = await Promise.allSettled([
        apiRequest(`/suppliers/${supplier.id}/contacts`),
        apiRequest(`/suppliers/${supplier.id}/contracts`),
        apiRequest(`/suppliers/${supplier.id}/documents`),
        apiRequest(`/suppliers/${supplier.id}/alerts`),
        apiRequest(`/suppliers/${supplier.id}/activity-logs`),
      ])
      const unpack = (result) => (result.status === "fulfilled" ? result.value : null)
      setProfileData({
        contacts: normalizeList(unpack(supplierContacts)),
        contracts: normalizeList(unpack(supplierContracts)),
        documents: normalizeList(unpack(supplierDocuments)),
        alerts: unpack(supplierAlerts)?.data || null,
        logs: normalizeList(unpack(supplierLogs)),
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setProfileLoading(false)
    }
  }

  function closeModal() {
    setModal(null)
    setSaving(false)
  }

  function supplierFormFrom(data) {
    return { ...emptySupplierForm, ...data, category: parseCategories(data?.category) }
  }

  function contactFormFrom(data) {
    return { ...emptyContactForm, ...data, is_primary: Boolean(data?.is_primary) }
  }

  function contractFormFrom(data) {
    return { ...emptyContractForm, ...data, file: null }
  }

  function documentFormFrom(data) {
    return { ...emptyDocumentForm, ...data, file: null }
  }

  function validateSupplier(form) {
    if (!form.name_ar.trim()) return "اسم المورد العربي مطلوب"
    if (!form.status) return "حالة المورد مطلوبة"
    return ""
  }

  function validateContact(form) {
    if (!form.name.trim()) return "اسم جهة التواصل مطلوب"
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "البريد الإلكتروني غير صحيح"
    if (form.phone && !/^\+?[0-9\s-]+$/.test(form.phone)) return "رقم الهاتف غير صحيح"
    if (form.whatsapp && !/^\+?[0-9\s-]+$/.test(form.whatsapp)) return "رقم واتساب غير صحيح"
    return ""
  }

  async function saveSupplier(form, existing) {
    const validation = validateSupplier(form)
    if (validation) return setError(validation)
    try {
      setSaving(true)
      setError("")
      const payload = {
        name_ar: form.name_ar.trim(),
        name_en: form.name_en.trim() || null,
        cr_number: form.cr_number.trim() || null,
        vat_number: form.vat_number.trim() || null,
        city: form.city.trim() || null,
        category: serializeCategories(form.category) || null,
        status: form.status,
        notes: form.notes.trim() || null,
      }
      const path = existing ? `/suppliers/${existing.id}` : "/suppliers"
      const method = existing ? "PUT" : "POST"
      const response = await apiRequest(path, { method, body: JSON.stringify(payload) })
      notify(existing ? "تم تحديث المورد بنجاح" : "تمت إضافة المورد بنجاح")
      closeModal()
      await loadInitialData()
      if (selectedSupplier?.id === response.data?.id) setSelectedSupplier(response.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function archiveSupplier(supplier) {
    if (!window.confirm(`هل تريد أرشفة المورد "${supplier.name_ar || supplier.name_en}"؟ سيتم تغيير الحالة إلى غير نشط.`)) return
    try {
      setSaving(true)
      await apiRequest(`/suppliers/${supplier.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Inactive" }),
      })
      notify("تمت أرشفة المورد بنجاح")
      await refreshAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveContact(form, existing) {
    const validation = validateContact(form)
    if (validation) return setError(validation)
    try {
      setSaving(true)
      const payload = {
        name: form.name.trim(),
        position: form.position.trim() || null,
        phone: form.phone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
        is_primary: Boolean(form.is_primary),
      }
      if (existing) {
        const updatePayload = { ...payload }
        if (payload.is_primary) delete updatePayload.is_primary
        await apiRequest(`/contacts/${existing.id}`, { method: "PUT", body: JSON.stringify(updatePayload) })
        if (payload.is_primary) await apiRequest(`/contacts/${existing.id}/primary`, { method: "PATCH" })
      } else {
        await apiRequest(`/suppliers/${selectedSupplier.id}/contacts`, { method: "POST", body: JSON.stringify(payload) })
      }
      notify(existing ? "تم تحديث جهة التواصل" : "تمت إضافة جهة التواصل")
      closeModal()
      await openSupplierProfile(selectedSupplier, "contacts")
      await loadInitialData()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteContact(contact) {
    if (!window.confirm("هل تريد إزالة جهة التواصل؟")) return
    try {
      setSaving(true)
      await apiRequest(`/contacts/${contact.id}`, { method: "DELETE" })
      notify("تمت إزالة جهة التواصل")
      await openSupplierProfile(selectedSupplier, "contacts")
      await loadInitialData()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function markPrimaryContact(contact) {
    if (!window.confirm("هل تريد تعيين جهة التواصل كجهة رئيسية؟")) return
    try {
      setSaving(true)
      await apiRequest(`/contacts/${contact.id}/primary`, { method: "PATCH" })
      notify("تم تعيين جهة التواصل الرئيسية")
      await openSupplierProfile(selectedSupplier, "contacts")
      await loadInitialData()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function appendFile(formData, file) {
    formData.append("file", file)
  }

  async function saveContract(form, existing) {
    if (!form.contract_number.trim()) return setError("رقم العقد مطلوب")
    if (!form.start_date || !form.end_date) return setError("تاريخ البداية والنهاية مطلوبان")
    if (!existing && !form.file) return setError("ملف العقد مطلوب")
    if (form.file) {
      const validation = fileError(form.file)
      if (validation) return setError(validation)
      if (existing?.file_url && !window.confirm("هل تريد استبدال ملف العقد الحالي؟")) return
    }

    try {
      setSaving(true)
      setError("")
      const payload = {
        contract_number: form.contract_number.trim(),
        contract_type: form.contract_type.trim() || null,
        start_date: form.start_date,
        end_date: form.end_date,
        status: form.status,
        owner: form.owner.trim() || null,
        notes: form.notes.trim() || null,
      }

      if (existing) {
        await apiRequest(`/contracts/${existing.id}`, { method: "PUT", body: JSON.stringify(payload) })
        if (form.file) {
          const formData = new FormData()
          appendFile(formData, form.file)
          await apiRequest(`/contracts/${existing.id}/upload`, { method: "POST", body: formData })
        }
      } else {
        const formData = new FormData()
        Object.entries(payload).forEach(([key, value]) => formData.append(key, value || ""))
        appendFile(formData, form.file)
        await apiRequest(`/suppliers/${selectedSupplier.id}/contracts/upload`, { method: "POST", body: formData })
      }
      notify(existing ? "تم تحديث العقد" : "تمت إضافة العقد")
      closeModal()
      await openSupplierProfile(selectedSupplier, "files")
      await loadInitialData()
    } catch (err) {
      setError(err.message === "Failed to fetch" ? "فشل رفع الملف" : err.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveDocument(form, existing) {
    if (!form.type) return setError("نوع المستند مطلوب")
    if (!existing && !form.file) return setError("ملف المستند مطلوب")
    if (form.file) {
      const validation = fileError(form.file)
      if (validation) return setError(validation)
      if (existing?.file_url && !window.confirm("هل تريد استبدال ملف المستند الحالي؟")) return
    }

    try {
      setSaving(true)
      setError("")
      const payload = {
        type: form.type,
        expiry_date: form.expiry_date || "",
        last_updated: form.last_updated || new Date().toISOString(),
      }

      if (existing) {
        await apiRequest(`/documents/${existing.id}`, { method: "PUT", body: JSON.stringify(payload) })
        if (form.file) {
          const formData = new FormData()
          appendFile(formData, form.file)
          await apiRequest(`/documents/${existing.id}/upload`, { method: "POST", body: formData })
        }
      } else {
        const formData = new FormData()
        Object.entries(payload).forEach(([key, value]) => formData.append(key, value || ""))
        appendFile(formData, form.file)
        await apiRequest(`/suppliers/${selectedSupplier.id}/documents/upload`, { method: "POST", body: formData })
      }
      notify(existing ? "تم تحديث المستند" : "تمت إضافة المستند")
      closeModal()
      await openSupplierProfile(selectedSupplier, "files")
      await loadInitialData()
    } catch (err) {
      setError(err.message === "Failed to fetch" ? "فشل رفع الملف" : err.message)
    } finally {
      setSaving(false)
    }
  }

  async function copyLink(url) {
    await navigator.clipboard.writeText(url)
    notify("تم نسخ رابط الملف")
  }

  const filteredSuppliers = useMemo(() => {
    const text = search.trim().toLowerCase()
    return suppliers.filter((supplier) => {
      const haystack = [
        supplier.name_ar,
        supplier.name_en,
        supplier.city,
        ...parseCategories(supplier.category),
        supplier.cr_number,
        supplier.vat_number,
      ].join(" ").toLowerCase()
      const matchesSearch = !text || haystack.includes(text)
      const matchesStatus = statusFilter === "all" || supplier.status === statusFilter
      const matchesCategory = categoryFilter === "all" || parseCategories(supplier.category).includes(categoryFilter)
      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [suppliers, search, statusFilter, categoryFilter])

  const missingRows = useMemo(() => {
    return suppliers.map((supplier) => {
      const supplierContacts = contacts.filter((contact) => contact.supplier_id === supplier.id)
      const primary = supplierContacts.find((contact) => contact.is_primary)
      const supplierContracts = contracts.filter((contract) => contract.supplier_id === supplier.id)
      const supplierDocuments = documents.filter((document) => document.supplier_id === supplier.id)
      const missing = []
      if (!primary?.email) missing.push("البريد الإلكتروني")
      if (!primary?.phone) missing.push("الهاتف")
      if (!supplier.cr_number) missing.push("السجل التجاري")
      if (!supplier.vat_number) missing.push("الرقم الضريبي")
      if (parseCategories(supplier.category).length === 0) missing.push("التصنيفات")
      if (!primary) missing.push("جهة التواصل الرئيسية")
      if (supplierContracts.length === 0) missing.push("العقد")
      if (!supplierDocuments.some((document) => document.type === "Price List")) missing.push("قائمة الأسعار")
      return { supplier, missing }
    }).filter((row) => row.missing.length > 0)
  }, [suppliers, contacts, contracts, documents])

  const contractAlerts = useMemo(() => {
    return contracts.map((contract) => ({ ...contract, expiry: expiryState(contract.end_date) }))
  }, [contracts])

  const dashboardCounts = {
    total: suppliers.length,
    active: suppliers.filter((supplier) => supplier.status === "Active").length,
    pending: suppliers.filter((supplier) => supplier.status === "Pending").length,
    suspended: suppliers.filter((supplier) => supplier.status === "Suspended").length,
    inactive: suppliers.filter((supplier) => ["Inactive", "Blacklisted"].includes(supplier.status)).length,
    missing: missingRows.length,
    expiredDocs: alerts?.counts?.expired_documents || documents.filter((document) => expiryState(document.expiry_date).tone === "danger").length,
    expiringDocs: alerts?.counts?.documents_expiring_in_30_days || documents.filter((document) => expiryState(document.expiry_date).tone === "warning").length,
    outdatedPrices: alerts?.counts?.outdated_price_lists || 0,
    contractRisk: contractAlerts.filter((contract) => ["danger", "warning"].includes(contract.expiry.tone)).length,
  }

  const currentTitle = selectedSupplier
    ? "ملف المورد"
    : {
        dashboard: "لوحة التحكم",
        suppliers: "الموردون",
        alerts: "التنبيهات",
        missing: "نقص البيانات",
        activity: "سجل التعديلات",
        settings: "الإعدادات",
      }[page] || "لوحة إدارة الموردين"

  if (!token) {
    return (
      <div dir="rtl" className="relative min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="flex min-h-screen items-center justify-center p-6">
          <Card className="w-full max-w-md p-6">
            <div className="mb-6">
              <ClinicFeedLogo variant="login" />
              <h1 className="mt-2 text-2xl font-bold">نظام إدارة الموردين</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">تسجيل الدخول للوحة الداخلية</p>
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</div>}
            <div className="space-y-4">
              <Field label="البريد الإلكتروني">
                <input className={cx(inputClass(), "text-left")} value={email} autoComplete="off" onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="كلمة المرور">
                <input className={cx(inputClass(), "text-left")} type="password" value={password} autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} />
              </Field>
              <PrimaryButton onClick={login} disabled={loading} className="w-full">
                {loading ? "جاري الدخول..." : "دخول"}
              </PrimaryButton>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="relative min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="min-h-screen lg:pr-64 lg:before:fixed lg:before:right-0 lg:before:top-0 lg:before:bottom-0 lg:before:z-0 lg:before:w-64 lg:before:bg-slate-900">
        <aside className="relative z-40 min-h-screen border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:fixed lg:right-0 lg:top-0 lg:bottom-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-l lg:p-5">
          <div className="mb-5 flex flex-col items-start">
            <ClinicFeedLogo variant="mobile" />
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">إدارة الموردين والمستندات</p>
          </div>
          <nav className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:grid-cols-1">
            {[
              ["dashboard", "لوحة التحكم"],
              ["suppliers", "الموردون"],
              ["alerts", "التنبيهات"],
              ["missing", "نقص البيانات"],
              ["activity", "سجل التعديلات"],
              ["settings", "الإعدادات"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => { setPage(id); setSelectedSupplier(null) }}
                className={cx(
                  "min-h-11 truncate rounded-lg px-4 py-3 text-right font-semibold transition",
                  page === id && !selectedSupplier
                    ? "bg-blue-700 text-white"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
                )}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-6">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <h1 className="text-xl font-bold">{currentTitle}</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">لوحة داخلية لإدارة الموردين والعقود والمستندات والتنبيهات</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <div className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {user?.name || user?.email || role}
                </div>
                <SecondaryButton onClick={refreshAll} disabled={loading}>{loading ? "جاري التحديث..." : "تحديث البيانات"}</SecondaryButton>
                <DangerButton onClick={() => logout()}>تسجيل الخروج</DangerButton>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1600px] p-4 sm:p-6">
            {message && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">{message}</div>}
            {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</div>}
            {selectedSupplier ? renderProfile() : (
              <>
                {page === "dashboard" && renderDashboard()}
                {page === "suppliers" && renderSuppliers()}
                {page === "alerts" && renderAlertsPage()}
                {page === "missing" && renderMissingPage()}
                {page === "activity" && renderActivityPage()}
                {page === "settings" && renderSettingsPage()}
              </>
            )}
          </div>
        </main>
      </div>
      {modal && renderModal()}
    </div>
  )

  function renderDashboard() {
    const cards = [
      ["إجمالي الموردين", dashboardCounts.total, "text-blue-700 dark:text-blue-300"],
      ["الموردون النشطون", dashboardCounts.active, "text-emerald-700 dark:text-emerald-300"],
      ["قيد المراجعة", dashboardCounts.pending, "text-amber-700 dark:text-amber-300"],
      ["موقوفون", dashboardCounts.suspended, "text-red-700 dark:text-red-300"],
      ["غير نشط / قائمة سوداء", dashboardCounts.inactive, "text-slate-700 dark:text-slate-200"],
      ["موردون لديهم نقص بيانات", dashboardCounts.missing, "text-cyan-700 dark:text-cyan-300"],
      ["مستندات منتهية", dashboardCounts.expiredDocs, "text-red-700 dark:text-red-300"],
      ["مستندات تنتهي قريبًا", dashboardCounts.expiringDocs, "text-amber-700 dark:text-amber-300"],
      ["قوائم أسعار قديمة", dashboardCounts.outdatedPrices, "text-emerald-700 dark:text-emerald-300"],
      ["عقود منتهية / تنتهي قريبًا", dashboardCounts.contractRisk, "text-indigo-700 dark:text-indigo-300"],
    ]
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(([label, value, color]) => (
            <Card key={label} className="flex min-h-32 flex-col justify-between p-5">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
              <p className={cx("mt-3 text-3xl font-black", color)}>{value}</p>
            </Card>
          ))}
        </div>
        <Card>
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <h2 className="font-bold">آخر التحديثات</h2>
          </div>
          {recentActivity.length === 0 ? <EmptyState title="لا توجد تحديثات حديثة" subtitle="سيظهر سجل التعديلات عند تنفيذ عمليات على البيانات." /> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentActivity.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <span>{item.action} - {item.entity_type}</span>
                  <span className="text-slate-500">{formatDate(item.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    )
  }

  function renderSuppliers() {
    return (
      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">قائمة الموردين</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">بحث وتصفية وإدارة الموردين من قاعدة البيانات الحقيقية.</p>
            </div>
            {canAdd && <PrimaryButton onClick={() => setModal({ type: "supplier", form: supplierFormFrom({}) })}>إضافة مورد</PrimaryButton>}
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_12rem]">
            <input className={inputClass()} placeholder="بحث بالاسم، المدينة، التصنيف، السجل التجاري، الرقم الضريبي" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className={inputClass()} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">كل الحالات</option>
              {supplierStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
            <select className={inputClass()} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">كل التصنيفات</option>
              {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
        </Card>
        <SupplierTable rows={filteredSuppliers} />
      </div>
    )
  }

  function SupplierTable({ rows }) {
    if (loading) {
      return (
        <Card>
          <EmptyState title="جاري تحميل البيانات..." subtitle="يرجى الانتظار." />
        </Card>
      )
    }

    if (rows.length === 0) {
      return (
        <Card>
          <EmptyState
            title={suppliers.length ? "لا توجد نتائج مطابقة" : "لا توجد بيانات"}
            subtitle="جرّب تغيير البحث أو أضف موردًا جديدًا."
          />
        </Card>
      )
    }

    return (
      <>
        <div className="grid gap-3 lg:hidden">
          {rows.map((supplier) => (
            <button
              key={supplier.id}
              onClick={() => openSupplierProfile(supplier)}
              className="w-full rounded-xl border border-slate-200 bg-white p-4 text-right shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-black">
                    {supplier.name_ar || supplier.name_en || "مورد بدون اسم"}
                  </h3>
                  <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                    {supplier.name_en || supplier.city || "-"}
                  </p>
                </div>
                <StatusBadge status={supplier.status} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">المدينة</p>
                  <p className="mt-1 font-bold">{supplier.city || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">آخر تحديث</p>
                  <p className="mt-1 font-bold">{formatDate(supplier.updated_at || supplier.created_at)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">التصنيف</p>
                  <div className="mt-2 overflow-hidden">
                    <CategoryBadges value={supplier.category} />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <Card className="hidden overflow-hidden lg:block">
          <div className="overflow-x-auto">
            <table className="min-w-[1600px] table-auto text-right">
              <thead className="bg-slate-50 text-xs font-bold text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
                <tr>
                  <th className="min-w-[220px] px-4 py-3">اسم المورد عربي</th>
                  <th className="min-w-[220px] px-4 py-3">اسم المورد إنجليزي</th>
                  <th className="min-w-[120px] px-4 py-3">المدينة</th>
                  <th className="min-w-[260px] px-4 py-3">التصنيفات</th>
                  <th className="min-w-[170px] px-4 py-3">رقم السجل التجاري</th>
                  <th className="min-w-[170px] px-4 py-3">الرقم الضريبي</th>
                  <th className="min-w-[140px] px-4 py-3">الحالة</th>
                  <th className="min-w-[130px] px-4 py-3">آخر تحديث</th>
                  <th className="min-w-[300px] px-4 py-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((supplier) => (
                  <tr key={supplier.id} className="align-top hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="whitespace-nowrap px-4 py-4 font-semibold">{supplier.name_ar || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600 dark:text-slate-300">{supplier.name_en || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-4">{supplier.city || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-4"><CategoryBadges value={supplier.category} /></td>
                    <td className="whitespace-nowrap px-4 py-4 font-mono text-xs">{supplier.cr_number || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-mono text-xs">{supplier.vat_number || "-"}</td>
                    <td className="px-4 py-4"><StatusBadge status={supplier.status} /></td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">{formatDate(supplier.updated_at || supplier.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="inline-flex flex-nowrap items-center gap-2">
                        <SecondaryButton onClick={() => openSupplierProfile(supplier)}>عرض الملف</SecondaryButton>
                        {canEdit && <SecondaryButton onClick={() => setModal({ type: "supplier", existing: supplier, form: supplierFormFrom(supplier) })}>تعديل</SecondaryButton>}
                        {canArchive && supplier.status !== "Inactive" && <DangerButton onClick={() => archiveSupplier(supplier)} disabled={saving}>أرشفة</DangerButton>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </>
    )
  }

  function renderProfile() {
    const tabs = [
      ["info", "البيانات الأساسية"],
      ["contacts", "جهات التواصل"],
      ["files", "العقود والمستندات"],
      ["alerts", "التنبيهات"],
      ["missing", "نقص البيانات"],
      ["activity", "سجل النشاط"],
      ["notes", "الملاحظات"],
    ]
    return (
      <div className="space-y-6">
        <Card className="p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
            <SecondaryButton onClick={() => setSelectedSupplier(null)}>العودة للموردين</SecondaryButton>
            <div className="flex flex-wrap gap-2">
              {canEdit && <SecondaryButton onClick={() => setModal({ type: "supplier", existing: selectedSupplier, form: supplierFormFrom(selectedSupplier) })}>تعديل المورد</SecondaryButton>}
              {canArchive && <DangerButton onClick={() => archiveSupplier(selectedSupplier)}>أرشفة المورد</DangerButton>}
            </div>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl font-black">{selectedSupplier.name_ar || selectedSupplier.name_en || "مورد بدون اسم"}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedSupplier.name_en || "-"}</p>
              <p className="mt-2 font-mono text-xs text-slate-400">Supplier ID: {selectedSupplier.id}</p>
            </div>
            <StatusBadge status={selectedSupplier.status} />
          </div>
        </Card>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setProfileTab(id)} className={cx("whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold", profileTab === id ? "bg-blue-700 text-white" : "bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800")}>{label}</button>
          ))}
        </div>
        {profileLoading ? <Card><EmptyState title="جاري تحميل ملف المورد..." subtitle="يتم جلب جهات التواصل والعقود والمستندات." /></Card> : (
          <>
            {profileTab === "info" && renderInfoTab()}
            {profileTab === "contacts" && renderContactsTab()}
            {profileTab === "files" && renderFilesTab()}
            {profileTab === "alerts" && renderSupplierAlertsTab()}
            {profileTab === "missing" && renderSupplierMissingTab()}
            {profileTab === "activity" && renderActivityTab(profileData.logs)}
            {profileTab === "notes" && renderNotesTab()}
          </>
        )}
      </div>
    )
  }

  function renderInfoTab() {
    const rows = [
      ["الاسم العربي", selectedSupplier.name_ar],
      ["الاسم الإنجليزي", selectedSupplier.name_en],
      ["المدينة", selectedSupplier.city],
      ["رقم السجل التجاري", selectedSupplier.cr_number],
      ["الرقم الضريبي", selectedSupplier.vat_number],
      ["الحالة", statusLabel(selectedSupplier.status)],
      ["تاريخ الإنشاء", formatDate(selectedSupplier.created_at)],
      ["آخر تحديث", formatDate(selectedSupplier.updated_at)],
    ]
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {rows.map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-2 break-words font-bold">{value || "-"}</p>
          </Card>
        ))}
        <Card className="p-4 md:col-span-2">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">التصنيفات</p>
          <div className="mt-2"><CategoryBadges value={selectedSupplier.category} /></div>
        </Card>
      </div>
    )
  }

  function renderContactsTab() {
    return (
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h3 className="font-bold">جهات التواصل</h3>
          {canEdit && <PrimaryButton onClick={() => setModal({ type: "contact", form: contactFormFrom({}) })}>إضافة جهة تواصل</PrimaryButton>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] table-fixed text-right">
            <thead className="bg-slate-50 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="w-[18%] px-4 py-3">الاسم</th>
                <th className="w-[16%] px-4 py-3">المنصب</th>
                <th className="w-[14%] px-4 py-3">الجوال</th>
                <th className="w-[14%] px-4 py-3">واتساب</th>
                <th className="w-[18%] px-4 py-3">البريد</th>
                <th className="w-[12%] px-4 py-3">أساسي / غير أساسي</th>
                <th className="w-[20%] px-4 py-3">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {profileData.contacts.length === 0 ? <tr><td colSpan="7"><EmptyState title="لا توجد بيانات" subtitle="لا توجد جهات تواصل لهذا المورد" /></td></tr> : profileData.contacts.map((contact) => (
                <tr key={contact.id}>
                  <td className="break-words px-4 py-4 font-semibold">{contact.name || "-"}</td>
                  <td className="break-words px-4 py-4">{contact.position || "-"}</td>
                  <td className="break-words px-4 py-4 dir-ltr"><ContactLink type="phone" value={contact.phone} /></td>
                  <td className="break-words px-4 py-4 dir-ltr"><ContactLink type="phone" value={contact.whatsapp} /></td>
                  <td className="break-words px-4 py-4"><ContactLink type="email" value={contact.email} /></td>
                  <td className="px-4 py-4">{contact.is_primary ? "أساسي" : "غير أساسي"}</td>
                  <td className="px-4 py-4">
                    {canEdit && <div className="flex flex-wrap gap-2">
                      <SecondaryButton onClick={() => setModal({ type: "contact", existing: contact, form: contactFormFrom(contact) })}>تعديل</SecondaryButton>
                      {!contact.is_primary && <SecondaryButton onClick={() => markPrimaryContact(contact)}>تعيين رئيسي</SecondaryButton>}
                      <DangerButton onClick={() => deleteContact(contact)}>إزالة</DangerButton>
                    </div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    )
  }


  function renderFilesTab() {
    return (
      <div className="space-y-6">
        {renderContractsTab()}
        {renderDocumentsTab()}
      </div>
    )
  }

  function renderContractsTab() {
    return (
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h3 className="font-bold">العقود</h3>
          {canUpload && <PrimaryButton onClick={() => setModal({ type: "contract", form: contractFormFrom({}) })}>إضافة عقد ورفع ملف</PrimaryButton>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] table-fixed text-right">
            <thead className="bg-slate-50 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="w-[14%] px-4 py-3">رقم العقد</th>
                <th className="w-[12%] px-4 py-3">النوع</th>
                <th className="w-[10%] px-4 py-3">البداية</th>
                <th className="w-[10%] px-4 py-3">النهاية</th>
                <th className="w-[10%] px-4 py-3">الحالة</th>
                <th className="w-[10%] px-4 py-3">الصلاحية</th>
                <th className="w-[12%] px-4 py-3">المالك</th>
                <th className="w-[12%] px-4 py-3">الملف</th>
                <th className="w-[18%] px-4 py-3">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {profileData.contracts.length === 0 ? <tr><td colSpan="9"><EmptyState title="لا توجد عقود لهذا المورد" /></td></tr> : profileData.contracts.map((contract) => (
                <tr key={contract.id}>
                  <td className="break-words px-4 py-4 font-semibold">{contract.contract_number || "-"}</td>
                  <td className="break-words px-4 py-4">{contract.contract_type || "-"}</td>
                  <td className="px-4 py-4">{formatDate(contract.start_date)}</td>
                  <td className="px-4 py-4">{formatDate(contract.end_date)}</td>
                  <td className="px-4 py-4">{contractStatusLabel(contract.status)}</td>
                  <td className="px-4 py-4"><ExpiryBadge date={contract.end_date} /></td>
                  <td className="break-words px-4 py-4">{contract.owner || "-"}</td>
                  <td className="break-words px-4 py-4 text-sm">{contract.file_name || contract.file_url || "-"}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <FileActions url={contract.file_url} onCopy={copyLink} />
                      {canEdit && <SecondaryButton onClick={() => setModal({ type: "contract", existing: contract, form: contractFormFrom(contract) })}>تعديل</SecondaryButton>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    )
  }

  function renderDocumentsTab() {
    return (
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h3 className="font-bold">المستندات</h3>
          {canUpload && <PrimaryButton onClick={() => setModal({ type: "document", form: documentFormFrom({}) })}>إضافة مستند ورفع ملف</PrimaryButton>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] table-fixed text-right">
            <thead className="bg-slate-50 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="w-[18%] px-4 py-3">نوع المستند</th>
                <th className="w-[12%] px-4 py-3">تاريخ الانتهاء</th>
                <th className="w-[12%] px-4 py-3">آخر تحديث</th>
                <th className="w-[12%] px-4 py-3">حالة الصلاحية</th>
                <th className="w-[18%] px-4 py-3">الملف</th>
                <th className="w-[20%] px-4 py-3">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {profileData.documents.length === 0 ? <tr><td colSpan="6"><EmptyState title="لا توجد مستندات لهذا المورد" /></td></tr> : profileData.documents.map((document) => (
                <tr key={document.id}>
                  <td className="break-words px-4 py-4 font-semibold">{documentTypeLabel(document.type)}</td>
                  <td className="px-4 py-4">{formatDate(document.expiry_date)}</td>
                  <td className="px-4 py-4">{formatDate(document.last_updated || document.updated_at)}</td>
                  <td className="px-4 py-4"><ExpiryBadge date={document.expiry_date} /></td>
                  <td className="break-words px-4 py-4 text-sm">{document.file_name || document.file_url || "-"}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <FileActions url={document.file_url} onCopy={copyLink} />
                      {canEdit && <SecondaryButton onClick={() => setModal({ type: "document", existing: document, form: documentFormFrom(document) })}>تعديل</SecondaryButton>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    )
  }

  function supplierLocalAlerts(supplier) {
    const rows = []
    if (!supplier.cr_number) rows.push("رقم السجل التجاري مفقود")
    if (!supplier.vat_number) rows.push("الرقم الضريبي مفقود")
    const primary = profileData.contacts.find((contact) => contact.is_primary)
    if (!primary) rows.push("لا توجد جهة تواصل رئيسية")
    if (primary && (!primary.email || !primary.phone)) rows.push("بيانات جهة التواصل الرئيسية غير مكتملة")
    if (!profileData.documents.some((document) => document.type === "Price List")) rows.push("قائمة الأسعار مفقودة")
    return rows
  }

  function renderSupplierAlertsTab() {
    const local = supplierLocalAlerts(selectedSupplier)
    const apiAlerts = profileData.alerts || {}
    const rows = [
      ...(apiAlerts.expired_documents || []).map((item) => `مستند منتهي: ${documentTypeLabel(item.type)}`),
      ...(apiAlerts.documents_expiring_in_30_days || []).map((item) => `مستند ينتهي قريبًا: ${documentTypeLabel(item.type)}`),
      ...(apiAlerts.outdated_price_lists || []).map(() => "قائمة الأسعار أقدم من 90 يومًا"),
      ...(apiAlerts.missing_contact_info || []).map(() => "بيانات التواصل ناقصة"),
      ...local,
    ]
    return (
      <Card className="p-5">
        {rows.length === 0 ? <EmptyState title="لا توجد تنبيهات لهذا المورد" subtitle="بيانات المورد تبدو مكتملة حاليًا." /> : (
          <div className="grid gap-3">
            {rows.map((row, index) => <div key={`${row}-${index}`} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">{row}</div>)}
          </div>
        )}
      </Card>
    )
  }

  function renderSupplierMissingTab() {
    const primary = profileData.contacts.find((contact) => contact.is_primary)
    const missing = []
    if (!primary?.email) missing.push("الإيميل")
    if (!primary?.phone) missing.push("الجوال")
    if (!selectedSupplier.cr_number) missing.push("رقم السجل التجاري")
    if (!selectedSupplier.vat_number) missing.push("الرقم الضريبي")
    if (parseCategories(selectedSupplier.category).length === 0) missing.push("التصنيفات")
    if (!primary) missing.push("جهة التواصل الأساسية")
    if (profileData.contracts.length === 0) missing.push("العقد")
    if (!profileData.documents.some((document) => document.type === "Price List")) missing.push("قائمة الأسعار")

    return (
      <Card className="p-5">
        {missing.length === 0 ? (
          <EmptyState title="لا توجد بيانات ناقصة لهذا المورد" subtitle="كل البيانات الأساسية المطلوبة متوفرة." />
        ) : (
          <div>
            <h3 className="font-bold">بيانات ناقصة</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {missing.map((item) => (
                <span key={item} className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900">
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>
    )
  }

  function renderActivityTab(rows = recentActivity) {
    return (
      <Card className="overflow-hidden">
        {rows.length === 0 ? <EmptyState title="لا توجد سجلات تعديل متاحة حاليًا" subtitle="سيظهر سجل التعديلات عند توفره من الخادم." /> : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] table-auto text-right">
              <thead className="bg-slate-50 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="min-w-[180px] px-4 py-3">المستخدم</th>
                  <th className="min-w-[140px] px-4 py-3">العملية</th>
                  <th className="min-w-[140px] px-4 py-3">الكيان</th>
                  <th className="min-w-[140px] px-4 py-3">التاريخ</th>
                  <th className="min-w-[280px] px-4 py-3">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4 font-mono text-xs">{item.user_id || "-"}</td>
                    <td className="px-4 py-4 font-semibold">{item.action || "-"}</td>
                    <td className="px-4 py-4">{item.entity_type || "-"}</td>
                    <td className="px-4 py-4">{formatDate(item.created_at)}</td>
                    <td className="px-4 py-4 text-slate-500 dark:text-slate-400">{item.entity_id || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    )
  }

  function renderNotesTab() {
    return (
      <Card className="p-5">
        <p className="whitespace-pre-wrap leading-7 text-slate-700 dark:text-slate-200">{selectedSupplier.notes || "لا توجد ملاحظات"}</p>
        {canEdit && <SecondaryButton className="mt-4" onClick={() => setModal({ type: "supplier", existing: selectedSupplier, form: supplierFormFrom(selectedSupplier) })}>تعديل الملاحظات</SecondaryButton>}
      </Card>
    )
  }

  function renderMissingPage() {
    return (
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-bold">نقص البيانات</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">الموردون الذين لديهم بيانات أساسية أو تعاقدية ناقصة.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] table-fixed text-right">
            <thead className="bg-slate-50 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="w-[22%] px-4 py-3">المورد</th>
                <th className="w-[12%] px-4 py-3">المدينة</th>
                <th className="w-[12%] px-4 py-3">الحالة</th>
                <th className="w-[42%] px-4 py-3">البيانات الناقصة</th>
                <th className="w-[12%] px-4 py-3">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {missingRows.length === 0 ? <tr><td colSpan="5"><EmptyState title="لا توجد بيانات ناقصة" subtitle="كل الموردين لديهم البيانات المطلوبة حاليًا." /></td></tr> : missingRows.map(({ supplier, missing }) => (
                <tr key={supplier.id}>
                  <td className="break-words px-4 py-4 font-semibold">{supplier.name_ar || supplier.name_en || "-"}</td>
                  <td className="px-4 py-4">{supplier.city || "-"}</td>
                  <td className="px-4 py-4"><StatusBadge status={supplier.status} /></td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {missing.map((item) => <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{item}</span>)}
                    </div>
                  </td>
                  <td className="px-4 py-4"><SecondaryButton onClick={() => openSupplierProfile(supplier)}>فتح الملف</SecondaryButton></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    )
  }

  function renderGlobalContractsPage() {
    return (
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-bold">العقود</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">قائمة العقود المسجلة حسب بيانات الموردين.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] table-auto text-right">
            <thead className="bg-slate-50 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="min-w-[220px] px-4 py-3">المورد</th>
                <th className="min-w-[160px] px-4 py-3">رقم العقد</th>
                <th className="min-w-[160px] px-4 py-3">النوع</th>
                <th className="min-w-[130px] px-4 py-3">تاريخ البداية</th>
                <th className="min-w-[130px] px-4 py-3">تاريخ النهاية</th>
                <th className="min-w-[140px] px-4 py-3">الصلاحية</th>
                <th className="min-w-[160px] px-4 py-3">المالك</th>
                <th className="min-w-[260px] px-4 py-3">الملف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {contracts.length === 0 ? <tr><td colSpan="8"><EmptyState title="لا توجد عقود" subtitle="ستظهر العقود هنا عند إضافتها من ملف المورد." /></td></tr> : contracts.map((contract) => (
                <tr key={contract.id}>
                  <td className="px-4 py-4 font-semibold">{supplierName(contract.supplier_id)}</td>
                  <td className="px-4 py-4">{contract.contract_number || "-"}</td>
                  <td className="px-4 py-4">{contract.contract_type || "-"}</td>
                  <td className="px-4 py-4">{formatDate(contract.start_date)}</td>
                  <td className="px-4 py-4">{formatDate(contract.end_date)}</td>
                  <td className="px-4 py-4"><ExpiryBadge date={contract.end_date} /></td>
                  <td className="px-4 py-4">{contract.owner || "-"}</td>
                  <td className="px-4 py-4"><FileActions url={contract.file_url} onCopy={copyLink} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    )
  }

  function renderGlobalDocumentsPage() {
    return (
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-bold">المستندات</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">كل مستندات الموردين مع حالة الصلاحية.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] table-auto text-right">
            <thead className="bg-slate-50 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="min-w-[220px] px-4 py-3">المورد</th>
                <th className="min-w-[200px] px-4 py-3">نوع المستند</th>
                <th className="min-w-[140px] px-4 py-3">تاريخ الانتهاء</th>
                <th className="min-w-[140px] px-4 py-3">آخر تحديث</th>
                <th className="min-w-[140px] px-4 py-3">الحالة</th>
                <th className="min-w-[260px] px-4 py-3">الملف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {documents.length === 0 ? <tr><td colSpan="6"><EmptyState title="لا توجد مستندات" subtitle="ستظهر المستندات هنا عند إضافتها من ملف المورد." /></td></tr> : documents.map((document) => (
                <tr key={document.id}>
                  <td className="px-4 py-4 font-semibold">{supplierName(document.supplier_id)}</td>
                  <td className="px-4 py-4">{documentTypeLabel(document.type)}</td>
                  <td className="px-4 py-4">{formatDate(document.expiry_date)}</td>
                  <td className="px-4 py-4">{formatDate(document.last_updated || document.updated_at)}</td>
                  <td className="px-4 py-4"><ExpiryBadge date={document.expiry_date} /></td>
                  <td className="px-4 py-4"><FileActions url={document.file_url} onCopy={copyLink} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    )
  }

  function renderActivityPage() {
    return (
      <div className="space-y-4">
        <Card className="p-5">
          <h2 className="font-bold">سجل التعديلات</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">آخر العمليات التي تم تسجيلها من الخادم.</p>
        </Card>
        {renderActivityTab(recentActivity)}
      </div>
    )
  }

  function renderSettingsPage() {
    return (
      <Card className="p-5">
        <h2 className="font-bold">الإعدادات</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          لا توجد إعدادات قابلة للتعديل حاليًا في نسخة العرض. إعدادات الاتصال والتخزين تتم من ملفات البيئة في الخادم والواجهة.
        </p>
      </Card>
    )
  }

  function renderAlertsPage() {
    const expiredContracts = contractAlerts.filter((contract) => contract.expiry.tone === "danger")
    const expiringContracts = contractAlerts.filter((contract) => contract.expiry.tone === "warning")
    const suppliersWithoutContacts = suppliers.filter((supplier) => !contacts.some((contact) => contact.supplier_id === supplier.id))
    const suppliersWithoutPrimary = suppliers.filter((supplier) => {
      const supplierContacts = contacts.filter((contact) => contact.supplier_id === supplier.id)
      return supplierContacts.length > 0 && !supplierContacts.some((contact) => contact.is_primary)
    })
    const sections = [
      ["مستندات منتهية", alerts?.data?.expired_documents || documents.filter((document) => expiryState(document.expiry_date).tone === "danger"), (item) => `${item.supplier_name_ar || supplierName(item.supplier_id)} - ${documentTypeLabel(item.type)}`],
      ["مستندات تنتهي خلال 30 يومًا", alerts?.data?.documents_expiring_in_30_days || documents.filter((document) => expiryState(document.expiry_date).tone === "warning"), (item) => `${item.supplier_name_ar || supplierName(item.supplier_id)} - ${documentTypeLabel(item.type)}`],
      ["قوائم أسعار قديمة", alerts?.data?.outdated_price_lists || [], (item) => item.supplier_name_ar || supplierName(item.supplier_id)],
      ["بيانات ناقصة", missingRows, (item) => `${item.supplier.name_ar || item.supplier.name_en || "-"} - ${item.missing.join("، ")}`],
      ["موردون لديهم نقص في التواصل", alerts?.data?.missing_contact_info || [], (item) => item.supplier_name_ar || supplierName(item.supplier_id)],
      ["موردون بدون جهة تواصل", suppliersWithoutContacts, (item) => item.name_ar || item.name_en || "-"],
      ["موردون بدون جهة تواصل أساسية", suppliersWithoutPrimary, (item) => item.name_ar || item.name_en || "-"],
      ["عقود منتهية", expiredContracts, (item) => `${supplierName(item.supplier_id)} - ${item.contract_number}`],
      ["عقود تنتهي قريبًا", expiringContracts, (item) => `${supplierName(item.supplier_id)} - ${item.contract_number}`],
    ]
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        {sections.map(([title, rows, render]) => (
          <Card key={title} className="p-5">
            <h2 className="font-bold">{title}</h2>
            {rows.length === 0 ? <EmptyState title="لا توجد بيانات" subtitle="لا توجد عناصر في هذا القسم." /> : (
              <div className="mt-4 grid gap-2">
                {rows.map((item, index) => (
                  <div key={`${title}-${item.id || index}`} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                    <p className="font-semibold">{render(item)}</p>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">تاريخ الانتهاء: {formatDate(item.expiry_date || item.end_date)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    )
  }

  function supplierName(supplierId) {
    const supplier = suppliers.find((item) => item.id === supplierId)
    return supplier?.name_ar || supplier?.name_en || "مورد غير معروف"
  }

  function renderModal() {
    if (modal.type === "supplier") {
      return <SupplierModal />
    }
    if (modal.type === "contact") {
      return <ContactModal />
    }
    if (modal.type === "contract") {
      return <ContractModal />
    }
    if (modal.type === "document") {
      return <DocumentModal />
    }
    return null
  }

  function SupplierModal() {
    const [form, setForm] = useState(modal.form)
    const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
    return (
      <Modal title={modal.existing ? "تعديل مورد" : "إضافة مورد"} onClose={closeModal}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="اسم المورد بالعربي" required><input className={inputClass()} value={form.name_ar} onChange={(e) => set("name_ar", e.target.value)} /></Field>
          <Field label="اسم المورد بالإنجليزي"><input className={inputClass()} value={form.name_en || ""} onChange={(e) => set("name_en", e.target.value)} /></Field>
          <Field label="رقم السجل التجاري"><input className={inputClass()} value={form.cr_number || ""} onChange={(e) => set("cr_number", e.target.value)} /></Field>
          <Field label="الرقم الضريبي"><input className={inputClass()} value={form.vat_number || ""} onChange={(e) => set("vat_number", e.target.value)} /></Field>
          <Field label="المدينة"><input className={inputClass()} value={form.city || ""} onChange={(e) => set("city", e.target.value)} /></Field>
          <div className="md:col-span-2">
            <Field label="التصنيفات">
              <CategorySelector value={form.category} onChange={(value) => set("category", value)} />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">يمكن اختيار أكثر من تصنيف. يوصى باختيار تصنيف واحد على الأقل.</p>
            </Field>
          </div>
          <Field label="الحالة" required><select className={inputClass()} value={form.status} onChange={(e) => set("status", e.target.value)}>{supplierStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
          <Field label="ملاحظات"><textarea className={inputClass()} rows="4" value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <SecondaryButton onClick={closeModal}>إلغاء</SecondaryButton>
          <PrimaryButton disabled={saving} onClick={() => saveSupplier(form, modal.existing)}>{saving ? "جاري الحفظ..." : "حفظ"}</PrimaryButton>
        </div>
      </Modal>
    )
  }

  function ContactModal() {
    const [form, setForm] = useState(modal.form)
    const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
    return (
      <Modal title={modal.existing ? "تعديل جهة تواصل" : "إضافة جهة تواصل"} onClose={closeModal}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="الاسم" required><input className={inputClass()} value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="المنصب"><input className={inputClass()} value={form.position || ""} onChange={(e) => set("position", e.target.value)} /></Field>
          <Field label="الجوال"><input className={cx(inputClass(), "text-left")} value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="واتساب"><input className={cx(inputClass(), "text-left")} value={form.whatsapp || ""} onChange={(e) => set("whatsapp", e.target.value)} /></Field>
          <Field label="البريد الإلكتروني"><input className={cx(inputClass(), "text-left")} value={form.email || ""} onChange={(e) => set("email", e.target.value)} /></Field>
          <label className="mt-7 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.is_primary} onChange={(e) => set("is_primary", e.target.checked)} /> جهة تواصل رئيسية</label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <SecondaryButton onClick={closeModal}>إلغاء</SecondaryButton>
          <PrimaryButton disabled={saving} onClick={() => saveContact(form, modal.existing)}>{saving ? "جاري الحفظ..." : "حفظ"}</PrimaryButton>
        </div>
      </Modal>
    )
  }

  function ContractModal() {
    const [form, setForm] = useState(modal.form)
    const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
    return (
      <Modal title={modal.existing ? "تعديل عقد" : "إضافة عقد"} onClose={closeModal}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="رقم العقد" required><input className={inputClass()} value={form.contract_number || ""} onChange={(e) => set("contract_number", e.target.value)} /></Field>
          <Field label="نوع العقد"><input className={inputClass()} value={form.contract_type || ""} onChange={(e) => set("contract_type", e.target.value)} /></Field>
          <Field label="تاريخ البداية" required><input className={inputClass()} type="date" value={formatDate(form.start_date) === "-" ? "" : formatDate(form.start_date)} onChange={(e) => set("start_date", e.target.value)} /></Field>
          <Field label="تاريخ النهاية" required><input className={inputClass()} type="date" value={formatDate(form.end_date) === "-" ? "" : formatDate(form.end_date)} onChange={(e) => set("end_date", e.target.value)} /></Field>
          <Field label="الحالة"><select className={inputClass()} value={form.status || "Active"} onChange={(e) => set("status", e.target.value)}>{contractStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
          <Field label="المالك"><input className={inputClass()} value={form.owner || ""} onChange={(e) => set("owner", e.target.value)} /></Field>
          <Field label={modal.existing ? "استبدال ملف العقد" : "ملف العقد"} required={!modal.existing}>
            <input className={inputClass()} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={(e) => set("file", e.target.files?.[0] || null)} />
            {form.file && <p className="mt-1 text-xs text-slate-500">الملف المحدد: {form.file.name}</p>}
          </Field>
          <Field label="ملاحظات"><textarea className={inputClass()} rows="4" value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <SecondaryButton onClick={closeModal}>إلغاء</SecondaryButton>
          <PrimaryButton disabled={saving} onClick={() => saveContract(form, modal.existing)}>{saving ? "جاري الرفع..." : "حفظ"}</PrimaryButton>
        </div>
      </Modal>
    )
  }

  function DocumentModal() {
    const [form, setForm] = useState(modal.form)
    const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
    return (
      <Modal title={modal.existing ? "تعديل مستند" : "إضافة مستند"} onClose={closeModal}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="نوع المستند" required><select className={inputClass()} value={form.type || "CR"} onChange={(e) => set("type", e.target.value)}>{documentTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
          <Field label="تاريخ الانتهاء"><input className={inputClass()} type="date" value={formatDate(form.expiry_date) === "-" ? "" : formatDate(form.expiry_date)} onChange={(e) => set("expiry_date", e.target.value)} /></Field>
          <Field label="آخر تحديث"><input className={inputClass()} type="date" value={formatDate(form.last_updated) === "-" ? "" : formatDate(form.last_updated)} onChange={(e) => set("last_updated", e.target.value)} /></Field>
          <Field label={modal.existing ? "استبدال الملف" : "ملف المستند"} required={!modal.existing}>
            <input className={inputClass()} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={(e) => set("file", e.target.files?.[0] || null)} />
            {form.file && <p className="mt-1 text-xs text-slate-500">الملف المحدد: {form.file.name}</p>}
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <SecondaryButton onClick={closeModal}>إلغاء</SecondaryButton>
          <PrimaryButton disabled={saving} onClick={() => saveDocument(form, modal.existing)}>{saving ? "جاري الرفع..." : "حفظ"}</PrimaryButton>
        </div>
      </Modal>
    )
  }
}




