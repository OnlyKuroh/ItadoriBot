"use client";

import { useState, useEffect, useCallback } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { NAV_LINKS, SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("#inicio");
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const sectionIds = NAV_LINKS.map((l) => l.href.replace("#", ""));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(`#${entry.target.id}`);
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled
          ? "glass border-b border-[rgba(196,18,48,0.15)] shadow-2xl shadow-black/80"
          : "bg-transparent"
      )}
    >
      <nav className="section-container flex h-16 items-center justify-between">
        {/* Logo */}
        <motion.a
          href="#inicio"
          className="flex items-center gap-2.5"
          initial={shouldReduceMotion ? {} : { opacity: 0, x: -20 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-8 h-8 rounded-full bg-crimson flex items-center justify-center glow-crimson">
            <span className="font-bebas text-white text-sm leading-none">I</span>
          </div>
          <span className="font-bebas text-xl tracking-wider text-bone uppercase">
            Itadori <span className="text-crimson">Bot</span>
          </span>
        </motion.a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link, i) => (
            <motion.a
              key={link.href}
              href={link.href}
              className={cn(
                "relative px-4 py-2 text-[13px] font-medium tracking-wide transition-colors duration-300 font-poppins rounded-full",
                activeSection === link.href
                  ? "text-crimson"
                  : "text-bone/50 hover:text-bone"
              )}
              initial={shouldReduceMotion ? {} : { opacity: 0, y: -10 }}
              animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.5 }}
            >
              {link.label}
              {activeSection === link.href && !shouldReduceMotion && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute inset-0 rounded-full bg-crimson/10 border border-crimson/20"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </motion.a>
          ))}
          <motion.a
            href="/admin"
            className="ml-2 px-4 py-2 border border-crimson/30 text-crimson text-[13px] font-semibold rounded-full hover:bg-crimson/10 transition-colors"
            initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.9 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, scale: 1 }}
            transition={{ delay: 0.38 }}
          >
            Administração
          </motion.a>
          <motion.a
            href={SITE.discordServer}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 px-5 py-2 bg-crimson text-white text-[13px] font-semibold rounded-full hover:bg-crimson-light transition-colors glow-crimson"
            initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.9 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            Entrar no Servidor
          </motion.a>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="md:hidden p-2 text-bone hover:text-crimson transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="md:hidden glass border-t border-[rgba(196,18,48,0.1)] overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col gap-1 px-5 py-6">
              {NAV_LINKS.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={closeMobile}
                  className={cn(
                    "py-3 px-4 text-lg font-poppins rounded-xl transition-colors",
                    activeSection === link.href
                      ? "text-crimson bg-crimson/5"
                      : "text-bone/70 hover:text-bone hover:bg-white/5"
                  )}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  {link.label}
                </motion.a>
              ))}
              <a
                href={SITE.discordServer}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 px-5 py-3 bg-crimson text-white font-semibold rounded-full text-center hover:bg-crimson-light transition-colors"
              >
                Entrar no Servidor Discord
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
