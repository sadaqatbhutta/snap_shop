import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <motion.div
      className={cn('bg-gray-200 rounded animate-pulse', className)}
      initial={{ opacity: 0.6 }}
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

export function LayoutSkeleton() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Skeleton */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6">
          <Skeleton className="h-8 w-40" />
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </aside>

      {/* Main Content Skeleton */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-8">
          <Skeleton className="h-6 w-32" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </header>
        <div className="p-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </main>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-gray-200">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

export function ConversationsSkeleton() {
  return (
    <div className="flex h-[calc(100vh-160px)] bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Sidebar Skeleton */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50/30">
        <div className="p-4 border-b border-gray-200 space-y-3 bg-white">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area Skeleton */}
      <div className="flex-1 flex flex-col items-center justify-center text-gray-300 bg-gray-50/20">
        <Skeleton className="w-16 h-16 rounded-full mb-4" />
        <Skeleton className="h-4 w-48 mb-2" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <Skeleton className="h-6 w-40" />
      </div>
      <div className="divide-y divide-gray-100">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
    </div>
  );
}
