"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  Search,
  ShoppingCart,
  ClipboardList,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
  BookA,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { logout as logoutAction, selectAuth, selectNeedsProfileCompletion } from "@/store/slices/authSlice";
import toast from "react-hot-toast";
import { SidebarContext } from "@/components/SidebarContext"
import { clearAddressList } from "@/store/slices/addressSlice";
import { clearMerchant } from "@/store/slices/merchantSlice";

const navItems = [
  { label: "浏览商家", href: "/client/browse", icon: Search },
  { label: "购物车", href: "/client/cart", icon: ShoppingCart },
  { label: "我的订单", href: "/client/order", icon: ClipboardList },
  { label: "地址簿", href: "/client/address", icon: BookA },
  { label: "个人资料", href: "/client/profile", icon: User },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const menuRef = useRef<HTMLDivElement>(null);
  const auth = useSelector(selectAuth);
  const needsProfileCompletion = useSelector(selectNeedsProfileCompletion);

  const currentNav = navItems.find((item) => pathname.startsWith(item.href));
  const pageName = currentNav ? currentNav.label : "";

  useEffect(() => {
    if (
      needsProfileCompletion === true &&
      !pathname.startsWith("/client/profile")
    ) {
      toast.error("请先完善个人资料");
      router.replace("/client/profile");
    }
  }, [needsProfileCompletion, pathname, router]);
  
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    dispatch(logoutAction());
    dispatch(clearAddressList());
    dispatch(clearMerchant());
    router.push("/auth/login?role=client");
  };

  return (
    <SidebarContext.Provider value={{ collapsed }}>
      <div className="flex h-screen">
        <aside
          className={`bg-indigo-700 text-white transition-all duration-200 ${
            collapsed ? "w-20" : "w-64"
          }`}
        >
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center">
              <Image src="/images/sf_logo.png" alt="SmartFoodDelivery Logo" width={32} height={32} />
              {!collapsed && <span className="ml-2 text-xl font-bold">SmartFood</span>}
            </div>
            <button onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
          <nav className="mt-6">
            {navItems.map(({ label, href, icon: Icon }) => {
              const disabled = needsProfileCompletion === true && href !== "/client/profile";
              return (
                <Link
                  key={href}
                  href={disabled ? "#" : href}
                  onClick={(e) => {
                    if (disabled) {
                      e.preventDefault();
                      toast("请先完善个人资料");
                    }
                  }}
                  className={`flex items-center px-4 py-3 hover:bg-indigo-600 
                    ${pathname.startsWith(href) ? "bg-indigo-600" : ""} 
                    ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <Icon size={20} />
                  {!collapsed && <span className="ml-3">{label}</span>}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 flex flex-col">
          <header className="flex justify-between items-center bg-white py-6 px-8 shadow">
            <h2 className="text-2xl font-bold">{pageName}</h2>
            <div className="flex items-center space-x-4">
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="flex items-center space-x-2 focus:outline-none px-8"
                >
                  {auth.image ? (
                    <img
                      src={`/api/images?key=${encodeURIComponent(auth.image)}`}
                      alt="avatar"
                      className="w-8 h-8 rounded-full object-cover border"
                    />
                  ) : (
                    <User size={20} />
                  )}
                  {!collapsed && <span className="truncate max-w-xs">{auth.username ?? "Guest"}</span>}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 bg-white border rounded shadow-lg z-10 min-w-max">
                    <button
                      onClick={handleLogout}
                      className="flex items-center justify-center space-x-2 px-4 py-2 hover:bg-gray-100"
                    >
                      <LogOut size={16} />
                      <span>退出登录</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
          <main className="flex-1 bg-gray-100 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarContext.Provider>  
  );
}


