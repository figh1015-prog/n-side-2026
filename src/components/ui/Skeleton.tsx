import React from 'react'

interface SkeletonProps {
  className?: string
  height?: string
  width?: string
}

export function Skeleton({ className = '', height = 'h-4', width = 'w-full' }: SkeletonProps) {
  return (
    <div className={`skeleton ${height} ${width} ${className}`} />
  )
}

export function SkeletonCard() {
  return (
    <div className="card space-y-3">
      <Skeleton height="h-5" width="w-1/3" />
      <Skeleton height="h-8" width="w-1/2" />
      <Skeleton height="h-3" width="w-2/3" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3 rounded-lg bg-dark-card/50">
          <Skeleton height="h-4" width="w-1/6" />
          <Skeleton height="h-4" width="w-1/4" />
          <Skeleton height="h-4" width="w-1/6" />
          <Skeleton height="h-4" width="w-1/8" />
          <Skeleton height="h-4" width="w-16" />
        </div>
      ))}
    </div>
  )
}
