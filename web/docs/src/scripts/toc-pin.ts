/**
 * "On this page" follows the reading: the current section is the one whose
 * heading has reached the top of the window. A last section shorter than
 * the window never brings its heading there, so a click on its link left
 * the section before it current. A section chosen from the table of
 * contents, or reached by its address, now stays current until the reader
 * scrolls on their own (wheel, touch, keys, a press, as on the scroll bar);
 * the scroll that brings the section into view does not count.
 */

type Toc = HTMLElement & { current: HTMLAnchorElement };

const TOCS = "starlight-toc, mobile-starlight-toc";
const SCROLL_KEYS = new Set([
  "ArrowDown",
  "ArrowUp",
  "PageDown",
  "PageUp",
  "Home",
  "End",
  " ",
]);

/** The address of the section held current, or null to follow the reading. */
let pinned: string | null = null;
const guarded = new WeakSet<Toc>();

/**
 * Makes a table of contents ignore the scroll-spy's choice while a section
 * is held: its `current` setter, from Starlight, passes only the held link.
 */
function guard(toc: Toc): void {
  if (guarded.has(toc)) return;
  let prototype: object | null = Object.getPrototypeOf(toc);
  let descriptor: PropertyDescriptor | undefined;
  while (prototype && !descriptor) {
    descriptor = Object.getOwnPropertyDescriptor(prototype, "current");
    prototype = Object.getPrototypeOf(prototype);
  }
  const set = descriptor?.set;
  if (!set) return;
  Object.defineProperty(toc, "current", {
    configurable: true,
    set(this: Toc, link: HTMLAnchorElement) {
      if (pinned === null || link.hash === pinned) set.call(this, link);
    },
  });
  guarded.add(toc);
}

function pin(hash: string): void {
  const tocs = [...document.querySelectorAll<Toc>(TOCS)];
  const links = tocs.map((toc) =>
    [...toc.querySelectorAll<HTMLAnchorElement>("a")].find((a) =>
      a.hash === hash
    )
  );
  if (!links.some(Boolean)) return;
  pinned = hash;
  tocs.forEach((toc, index) => {
    guard(toc);
    const link = links[index];
    if (link) toc.current = link;
  });
}

function release(): void {
  pinned = null;
}

Promise.all([
  customElements.whenDefined("starlight-toc"),
  customElements.whenDefined("mobile-starlight-toc"),
]).then(() => {
  document.querySelectorAll<Toc>(TOCS).forEach(guard);
  if (location.hash) pin(location.hash);
});

document.addEventListener("click", (event) => {
  const link = (event.target as Element | null)?.closest<HTMLAnchorElement>(
    `:is(${TOCS}) a`,
  );
  if (link) pin(link.hash);
});
window.addEventListener("hashchange", () => pin(location.hash));
window.addEventListener("wheel", release, { passive: true });
window.addEventListener("touchmove", release, { passive: true });
// A press anywhere, the scroll bar included; a click on the table of
// contents holds its section again just after.
window.addEventListener("pointerdown", release, { passive: true });
window.addEventListener("keydown", (event) => {
  if (SCROLL_KEYS.has(event.key)) release();
});
