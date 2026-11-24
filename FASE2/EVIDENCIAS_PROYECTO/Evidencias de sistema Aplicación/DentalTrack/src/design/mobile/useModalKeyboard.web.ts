import { useEffect } from "react";

/** Completa teclado y nombre de los overlays web; el portal restaura el foco. */
export function useModalKeyboard() {
  useEffect(() => {
    const top = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>(
          '[role="dialog"][aria-modal="true"]',
        ),
      )
        .filter((e) => e.getClientRects().length)
        .at(-1);
    let previous: HTMLElement | undefined;
    const focusNew = () => {
      const dialog = top();
      if (dialog === previous) return;
      previous = dialog;
      if (!dialog) return;
      if (
        !dialog.hasAttribute("aria-label") &&
        !dialog.hasAttribute("aria-labelledby")
      ) {
        const title = dialog.querySelector<HTMLElement>(
          '[role="heading"],h1,h2,[dir="auto"]',
        );
        if (title?.textContent)
          dialog.setAttribute("aria-label", title.textContent);
      }
      dialog.setAttribute("tabindex", "-1");
      if (!dialog.contains(document.activeElement))
        dialog.focus({ preventScroll: true });
    };
    const observer = new MutationObserver(focusNew);
    observer.observe(document.body, { childList: true, subtree: true });
    focusNew();
    const keys = (event: KeyboardEvent) => {
      const dialog = top();
      if (!dialog || event.defaultPrevented) return;
      if (event.key === "Escape") {
        const dismiss =
          dialog.querySelector<HTMLElement>('[aria-label="Cerrar"]') ??
          dialog.parentElement?.querySelector<HTMLElement>(
            '[aria-label="Cerrar diálogo"]',
          );
        if (dismiss) {
          event.preventDefault();
          dismiss.click();
        }
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button,a[href],input,select,textarea,[tabindex="0"]',
        ),
      ).filter(
        (e) =>
          !e.closest("[inert]") &&
          !e.hasAttribute("disabled") &&
          e.getAttribute("aria-disabled") !== "true" &&
          e.getClientRects().length,
      );
      const first = controls[0],
        last = controls.at(-1);
      if (!first) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      if (
        !dialog.contains(document.activeElement) ||
        document.activeElement === dialog ||
        (event.shiftKey
          ? document.activeElement === first
          : document.activeElement === last)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      }
    };
    document.addEventListener("keydown", keys);
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", keys);
    };
  }, []);
}
