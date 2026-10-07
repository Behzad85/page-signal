"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog, DialogTitle } from "./primitives";
import { Button as IconButton } from "../ui/button";
import { DotPattern } from "../ui/dot-pattern";
import GitHubStars from "./GitHubStars";
import { TravelExploreOutlined as TravelExploreOutlined } from "./icons";
import { TouchAppOutlined as TouchAppOutlined } from "./icons";
import { ForumOutlined as ForumOutlined } from "./icons";
import { InfoOutlined as InfoOutlined } from "./icons";
import { InsightsOutlined as InsightsOutlined } from "./icons";
import { MenuOutlined as MenuOutlined } from "./icons";
import { CloseOutlined as CloseOutlined } from "./icons";

const destinations = [
  { href: "/", label: "Website analysis", Icon: TravelExploreOutlined },
  { href: "/ux-audit", label: "UX review", Icon: TouchAppOutlined },
  { href: "/feedback", label: "Feedback", Icon: ForumOutlined },
  { href: "/about", label: "About PageSignal", Icon: InfoOutlined },
];

function Navigation({ pathname, onNavigate }) {
  return <nav aria-label="Workspaces" className="workspace-nav">{destinations.map(({ href, label, Icon }) =>
    <Link key={href} href={href} onClick={onNavigate} aria-current={pathname === href ? "page" : undefined} className="nav-link"><Icon fontSize="small" />{label}</Link>
  )}</nav>;
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const active = destinations.find((item) => item.href === pathname);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <aside className="desktop-rail">
      <Link href="/" className="wordmark"><InsightsOutlined className="brand-symbol" /><span>PageSignal<span className="wordmark-dot">.</span></span></Link>
      <Navigation pathname={pathname} />
      <div className="rail-note"><span>Evidence into action.</span><p>A considered look at your website, one improvement at a time.</p><Link href="/about">How it works</Link></div>
    </aside>
    <header className="mobile-bar"><Link href="/" className="wordmark"><InsightsOutlined className="brand-symbol" /><span>PageSignal.</span></Link><IconButton variant="ghost" size="icon" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><MenuOutlined /></IconButton></header>
    <Dialog open={menuOpen} onClose={() => setMenuOpen(false)} className="ps-navigation-dialog" placement="left">
      <div className="flex items-center justify-between gap-4"><DialogTitle>PageSignal</DialogTitle><IconButton variant="ghost" size="icon" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><CloseOutlined /></IconButton></div>
      <Navigation pathname={pathname} onNavigate={() => setMenuOpen(false)} />
    </Dialog>
    <div className="workspace-content" id="main-content" tabIndex={-1}>
      <div className="workspace-topbar"><div className="workspace-breadcrumb"><span>Workspace</span><span aria-hidden="true">/</span><span>{active?.label || "PageSignal"}</span></div><GitHubStars /></div>
      {children}
      <footer className="workspace-footer"><span>PageSignal — evidence into action.</span><Link href="/about">About this project</Link></footer>
    </div>
  </div>;
}

export function PageHeading({ title, description, children }) {
  return <header className="page-heading"><DotPattern width={18} height={18} cr={0.8} className="heading-dots" /><h1>{title}</h1><p>{description}</p>{children}</header>;
}
