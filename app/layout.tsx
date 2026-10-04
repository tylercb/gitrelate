import { Outlet, ScrollRestoration } from "react-router";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

export default function RootLayout() {
  return (
    <>
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </>
  );
}
