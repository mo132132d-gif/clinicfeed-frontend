import { createBrowserRouter } from "react-router";
import { lazy, Suspense } from "react";
import type { ComponentType } from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { LoadingState } from "../components/shared/Primitives";
import { LoginPage } from "../features/auth/LoginPage";

const DashboardPage = lazy(() => import("../features/dashboard/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const SuppliersPage = lazy(() => import("../features/suppliers/SuppliersPage").then((module) => ({ default: module.SuppliersPage })));
const RequestTicketsPage = lazy(() => import("../features/requestTickets/RequestTicketsPage").then((module) => ({ default: module.RequestTicketsPage })));
const SupplierPaymentRequestsPage = lazy(() => import("../features/supplierPaymentRequests/SupplierPaymentRequestsPage").then((module) => ({ default: module.SupplierPaymentRequestsPage })));
const SupplierProfilePage = lazy(() => import("../features/suppliers/SupplierProfilePage").then((module) => ({ default: module.SupplierProfilePage })));
const UsersPage = lazy(() => import("../features/users/UsersPage").then((module) => ({ default: module.UsersPage })));
const ActivityPage = lazy(() => import("../features/activity/ActivityPage").then((module) => ({ default: module.ActivityPage })));
const AccountPage = lazy(() => import("../features/account/AccountPage").then((module) => ({ default: module.AccountPage })));

function lazyElement(Component: ComponentType) {
  return (
    <Suspense fallback={<LoadingState />}>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  { path: "/login", Component: LoginPage },
  {
    path: "/",
    Component: AppLayout,
    children: [
      { index: true, element: lazyElement(DashboardPage) },
      { path: "suppliers", element: lazyElement(SuppliersPage) },
      { path: "suppliers/:id", element: lazyElement(SupplierProfilePage) },
      { path: "request-tickets", element: lazyElement(RequestTicketsPage) },
      { path: "supplier-payment-requests", element: lazyElement(SupplierPaymentRequestsPage) },
      { path: "users", element: lazyElement(UsersPage) },
      { path: "activity", element: lazyElement(ActivityPage) },
      { path: "account", element: lazyElement(AccountPage) },
    ],
  },
]);

