/**
 * Owner dashboard data (GET /api/v1/admin/dashboard). Only the site owner's
 * account can read it; everyone else gets 401 or 403.
 */

import { api } from './client';

export interface Member {
  id: number;
  email: string;
  name: string | null;
  joinedAt: string | null;
  lastSeenAt: string | null;
  signIn: 'Google' | 'Apple' | 'Email';
  isAdmin: boolean;
  isActive: boolean;
  watches: number;
  pushDevices: number;
  cartItems: number;
}

export interface OwnerDashboard {
  generatedAt: string;
  members: {
    total: number;
    new7d: number;
    new30d: number;
    active1d: number;
    active7d: number;
    active30d: number;
    signInMethods: { google: number; apple: number; email: number };
    signupsByDay: { day: string; count: number }[];
    list: Member[];
    listLimit: number;
  };
  waitlist: { total: number; new7d: number; invited: number; converted: number } | null;
  activity: {
    pageViews7d: number;
    productViews7d: number;
    searches7d: number;
    addToCart7d: number;
    shoppers7d: number;
    topPages: { page: string; views: number }[];
  } | null;
  engagement: {
    watches: { active: number; size: number; price: number; shoppers: number } | null;
    alerts7d: { sent: number; opened: number; dismissed: number; failed: number } | null;
    push: { devices: number; shoppers: number; failing: number } | null;
  };
  shopping: {
    cart: { items: number; shoppers: number; valueCents: number } | null;
    checkouts30d: { status: string; count: number; cents: number }[] | null;
    agentDecisions7d: Record<string, number> | null;
    agentProblems7d: { action: string; reason: string; count: number; lastAt: string }[] | null;
  };
  health: {
    dbMs: number;
    buildMs: number;
    deploy: { commit: string | null; message: string | null; environment: string | null; region: string | null };
    listingRuns24h: { store: string; ok: number; notOk: number; lastRunAt: string; lastStatus: string }[] | null;
    newArrivals: { store: string; new24h: number; lastSeenAt: string }[] | null;
    feedback: { open: number; new: number } | null;
    securityEvents7d: { type: string; count: number; lastAt: string }[] | null;
  };
}

export async function getOwnerDashboard(): Promise<OwnerDashboard> {
  const res = await api.get<{ success: boolean; data: OwnerDashboard }>('/admin/dashboard', {
    requiresAuth: true,
    cache: 'no-store',
  });
  return res.data;
}
