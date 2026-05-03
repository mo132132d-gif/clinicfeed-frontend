import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import { AuthProvider } from "../features/auth/AuthProvider";
import { router } from "./routes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="fixed right-6 top-4 z-[9999] flex items-center rounded-2xl bg-slate-950 px-5 py-3 shadow-2xl ring-1 ring-white/10">
          <img
            src="/clinicfeed-logo.png.svg"
            alt="ClinicFeed"
            className="h-14 w-auto object-contain"
          />
        </div>

        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
