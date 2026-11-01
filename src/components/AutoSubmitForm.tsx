"use client";

import type { ComponentProps } from "react";

/**
 * A plain GET form that applies itself: changing any dropdown runs the search right away.
 * Typing in a text box still waits for Enter (or the Search button), so every keystroke isn't a page load.
 * Empty fields are left out of the URL, so links stay short and shareable.
 * Without JavaScript it's just a normal form with a Search button.
 */
export function AutoSubmitForm(props: ComponentProps<"form">) {
  return (
    <form
      {...props}
      onChange={(e) => {
        const el = e.target as HTMLElement;
        if (el.tagName === "SELECT") (e.currentTarget as HTMLFormElement).requestSubmit();
      }}
      onSubmit={(e) => {
        const form = e.currentTarget;
        const blanks = [...form.elements].filter(
          (f): f is HTMLInputElement | HTMLSelectElement => (f instanceof HTMLInputElement || f instanceof HTMLSelectElement) && !!f.name && f.value === "",
        );
        blanks.forEach((f) => (f.disabled = true));
        // Re-enable after the browser has read the form, so the back button finds it usable.
        setTimeout(() => blanks.forEach((f) => (f.disabled = false)), 0);
      }}
    />
  );
}
