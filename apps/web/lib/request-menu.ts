/** Native details menus retain their appearance and keyboard toggle behavior. */
export function bindRequestMenus(root: HTMLElement, doc: Document = document) {
  const menus = () => Array.from(root.querySelectorAll<HTMLDetailsElement>("details.requestMenu"));
  const closeExcept = (keep?: HTMLDetailsElement) => {
    for (const menu of menus()) if (menu !== keep) menu.open = false;
  };
  const outside = (event: Event) => {
    const target = event.target;
    for (const menu of menus()) if (!(target instanceof Node) || !menu.contains(target)) menu.open = false;
  };
  const keydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") closeExcept();
  };
  const click = (event: Event) => {
    if (!(event.target instanceof Element)) return;
    const menu = event.target.closest<HTMLDetailsElement>("details.requestMenu");
    if (!menu || !root.contains(menu)) return;
    if (event.target.closest("button")) menu.open = false;
    else if (event.target.closest("summary")) closeExcept(menu);
  };
  const toggle = (event: Event) => {
    const menu = event.target;
    if (menu instanceof HTMLDetailsElement && menu.open) closeExcept(menu);
  };
  doc.addEventListener("pointerdown", outside, true);
  doc.addEventListener("keydown", keydown);
  root.addEventListener("click", click, true);
  root.addEventListener("toggle", toggle, true);
  return () => {
    doc.removeEventListener("pointerdown", outside, true);
    doc.removeEventListener("keydown", keydown);
    root.removeEventListener("click", click, true);
    root.removeEventListener("toggle", toggle, true);
  };
}
