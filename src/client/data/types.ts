export type ExternalLink = {
  label: string;
  href: string | null;
};

export type NavLink = {
  label: string;
  href: string | null;
  description?: string;
  external?: boolean;
};

export type NavItem = {
  id: string;
  label: string;
  href?: string;
  children?: NavLink[];
};

export type ServiceStatus = "available" | "coming-soon";

export type DigitalService = {
  id: string;
  name: string;
  fullName: string | null;
  description: string;
  status: ServiceStatus;
  url: string | null;
  icon: IconName;
  image?: string;
  badge?: string;
  targetRoles?: string[];
};

export type IconName =
  | "academic"
  | "arrow-right"
  | "book"
  | "building"
  | "calendar"
  | "check"
  | "chevron-down"
  | "clipboard"
  | "clock"
  | "close"
  | "external"
  | "file"
  | "globe"
  | "graduation"
  | "layers"
  | "lock"
  | "mail"
  | "map-pin"
  | "menu"
  | "monitor"
  | "phone"
  | "research"
  | "shield"
  | "users"
  | "wallet"
  | "wrench";
