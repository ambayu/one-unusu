import React from "react";
import { Link } from "react-router-dom";
import { Icon } from "./Icon";
import { normalizeExternalUrl } from "../../lib/urls";

type SmartLinkProps = {
  href: string | null;
  children: React.ReactNode;
  className?: string;
  disabledClassName?: string;
  external?: boolean;
  disabledHint?: string;
  showExternalIcon?: boolean;
  onClick?: () => void;
};

export function SmartLink({
  href,
  children,
  className = "",
  disabledClassName = "",
  external = false,
  disabledHint = "Segera tersedia",
  showExternalIcon = false,
  onClick,
}: SmartLinkProps) {
  const destination = external ? normalizeExternalUrl(href) : href;
  if (!destination) {
    return (
      <span
        role="link"
        aria-disabled="true"
        title={disabledHint}
        className={`cursor-not-allowed ${disabledClassName || className}`}
      >
        {children}
        <span className="sr-only"> ({disabledHint})</span>
      </span>
    );
  }

  if (external) {
    return (
      <a
        href={destination}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onClick}
      >
        {children}
        {showExternalIcon ? <Icon name="external" className="size-3.5 shrink-0" /> : null}
        <span className="sr-only"> (membuka tab baru)</span>
      </a>
    );
  }

  return (
    <Link to={destination} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
