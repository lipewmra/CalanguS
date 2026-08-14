import React from "react";
import { ZoomIn, Camera, User } from "lucide-react";
import { getInitials } from "../lib/image-utils";

interface FiscalAvatarProps {
  photoUrl?: string;
  name: string;
  role?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  onClick?: () => void;
  showZoomBadge?: boolean;
}

const sizeClasses = {
  xs: "w-7 h-7 text-[10px]",
  sm: "w-9 h-9 text-xs",
  md: "w-11 h-11 text-sm",
  lg: "w-14 h-14 text-base",
  xl: "w-20 h-20 text-xl",
};

export default function FiscalAvatar({
  photoUrl,
  name,
  role,
  size = "md",
  className = "",
  onClick,
  showZoomBadge = true,
}: FiscalAvatarProps) {
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      className={`relative group shrink-0 select-none ${
        isClickable ? "cursor-pointer" : ""
      } ${className}`}
      title={isClickable ? `Clique para ampliar foto de ${name}` : name}
    >
      {photoUrl ? (
        <div className="relative overflow-hidden rounded-full ring-2 ring-indigo-500/20 group-hover:ring-indigo-500 transition-all shadow-xs group-hover:shadow-md">
          <img
            src={photoUrl}
            alt={name}
            className={`${sizeClass} rounded-full object-cover group-hover:scale-105 transition-transform duration-200 bg-slate-100 dark:bg-slate-800`}
          />
          {isClickable && showZoomBadge && (
            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white rounded-full">
              <ZoomIn className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      ) : (
        <div
          className={`${sizeClass} rounded-full bg-gradient-to-tr from-indigo-500 via-indigo-600 to-indigo-700 text-white font-extrabold flex items-center justify-center shadow-xs ring-2 ring-indigo-500/10 group-hover:ring-indigo-500/40 group-hover:scale-105 transition-all`}
        >
          {getInitials(name)}
          {isClickable && showZoomBadge && (
            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white rounded-full">
              <ZoomIn className="w-3 h-3" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
