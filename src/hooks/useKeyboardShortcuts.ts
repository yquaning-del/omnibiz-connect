import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(onCommandPalette: () => void) {
  const navigate = useNavigate();

  const shortcuts: ShortcutConfig[] = [
    { key: "k", meta: true, action: onCommandPalette, description: "Open command palette" },
    { key: "k", ctrl: true, action: onCommandPalette, description: "Open command palette" },
    { key: "n", shift: true, action: () => navigate("/pos"), description: "New sale" },
    { key: "p", shift: true, action: () => navigate("/products"), description: "Go to products" },
    { key: "i", shift: true, action: () => navigate("/inventory"), description: "Go to inventory" },
    { key: "o", shift: true, action: () => navigate("/orders"), description: "Go to orders" },
    { key: "c", shift: true, action: () => navigate("/customers"), description: "Go to customers" },
    { key: "r", shift: true, action: () => navigate("/reports"), description: "Go to reports" },
    { key: "d", shift: true, action: () => navigate("/dashboard"), description: "Go to dashboard" },
    { key: "s", shift: true, action: () => navigate("/settings"), description: "Go to settings" },
  ];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Only allow command palette shortcut in inputs
        if (
          (event.key === "k" && (event.metaKey || event.ctrlKey)) ||
          event.key === "Escape"
        ) {
          // Allow these
        } else {
          return;
        }
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey || shortcut.meta;
        const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey || shortcut.ctrl;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;

        // For cmd/ctrl+k, check either meta or ctrl
        if (shortcut.meta && shortcut.key === "k") {
          if (keyMatch && (event.metaKey || event.ctrlKey) && !event.shiftKey) {
            event.preventDefault();
            shortcut.action();
            return;
          }
        } else if (keyMatch && ctrlMatch && metaMatch && shiftMatch) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
}

export const shortcutsList = [
  { keys: ["⌘", "K"], description: "Open command palette" },
  { keys: ["⇧", "N"], description: "New sale" },
  { keys: ["⇧", "P"], description: "Go to products" },
  { keys: ["⇧", "I"], description: "Go to inventory" },
  { keys: ["⇧", "O"], description: "Go to orders" },
  { keys: ["⇧", "C"], description: "Go to customers" },
  { keys: ["⇧", "R"], description: "Go to reports" },
  { keys: ["⇧", "D"], description: "Go to dashboard" },
  { keys: ["⇧", "S"], description: "Go to settings" },
];
