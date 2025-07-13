'use client';
import { createContext, useContext } from 'react';

export const SidebarContext = createContext<{ collapsed: boolean }>({ collapsed: false });
export const useSidebar = () => useContext(SidebarContext);
