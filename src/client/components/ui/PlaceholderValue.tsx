import React from "react";
import { PLACEHOLDER_TEXT } from "../../data/site";

type PlaceholderValueProps = {
  value: string | null;
  fallback?: string;
  className?: string;
};

export function PlaceholderValue({
  value,
  fallback = PLACEHOLDER_TEXT,
  className = "",
}: PlaceholderValueProps) {
  if (value) return <span className={className}>{value}</span>;
  return <span className={`italic ${className}`}>{fallback}</span>;
}
