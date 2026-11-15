/* Shared page behaviour: menu state, scroll progress, back-to-top, scroll reveal, section highlight. */
(function(){
  const d = document, root = d.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nav = d.querySelector(".site-nav");

  /* scroll progress line + solid menu over the hero + back-to-top */
  const bar = d.createElement("div"); bar.className = "scroll-bar";
  if (nav) nav.appendChild(bar);
  const top = d.createElement("button");
  top.type = "button"; top.className = "totop"; top.setAttribute("aria-label", "맨 위로");
  top.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  top.addEventListener("click", () => scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }));
  d.body.appendChild(top);
  function onScroll(){                              // cheap enough to run on every scroll event (no rAF: see reveal)
    const y = scrollY, h = root.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${h > 0 ? Math.min(1, y / h) : 0})`;
    if (nav) nav.classList.toggle("solid", y > 24);
    top.classList.toggle("show", y > 640);
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* scroll reveal: [data-rv] fades up; [data-rv-kids] staggers its children.
     Anything already on the first screen stays as it is, so the page is complete at rest. */
  function reveal(){
    if (reduce || !("IntersectionObserver" in window)) return;
    const targets = [];
    d.querySelectorAll("[data-rv]").forEach(el => targets.push(el));
    d.querySelectorAll("[data-rv-kids]").forEach(g => [...g.children].forEach((el, i) => { el.style.setProperty("--i", Math.min(i, 8)); targets.push(el); }));
    /* show one element: drop the hidden state, and after the fade make sure it really ended
       (a paused animation timeline, e.g. a hidden window, would otherwise leave it at opacity 0) */
    const show = el => {
      el.classList.remove("rv-pre"); io.unobserve(el);
      setTimeout(() => { el.classList.remove("rv-on"); el.getAnimations().forEach(a => a.finish()); }, d.hidden ? 0 : 1400);
    };
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) show(e.target); }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0 });   // 0: very tall blocks still fire
    /* no requestAnimationFrame here: it never fires in a background tab, which left blocks hidden */
    const pre = targets.filter(el => el.getBoundingClientRect().top >= innerHeight * 0.92);
    pre.forEach(el => el.classList.add("rv-pre"));
    void d.body.offsetHeight;                       // commit the hidden state before the transition class
    pre.forEach(el => { el.classList.add("rv-on"); io.observe(el); });
    /* safety net: whatever has scrolled past (anchor jump, fast scroll, find-in-page) is shown */
    const sweep = () => d.querySelectorAll(".rv-pre").forEach(el => { if (el.getBoundingClientRect().top < innerHeight) show(el); });
    addEventListener("scroll", sweep, { passive: true });
    /* scroll events and IntersectionObserver both pause while a tab is hidden; a timer still runs */
    const tick = setInterval(() => { sweep(); if (!d.querySelector(".rv-pre")) clearInterval(tick); }, 400);
    addEventListener("hashchange", sweep);
    addEventListener("beforeprint", () => d.querySelectorAll(".rv-pre").forEach(show));
  }
  reveal();

  /* #anchor links to blocks that the page script draws (e.g. research.html#area-3): the browser looks for the
     target before it exists, so jump there once everything is drawn (this script runs last) */
  function toHash(){
    const id = decodeURIComponent(location.hash.slice(1)), el = id && d.getElementById(id);
    if (!el) return;
    /* show the target first: its fade-up offset (22 px) would otherwise leave it under the menu once it settles */
    [el, ...el.querySelectorAll(".rv-pre")].forEach(x => { x.classList.remove("rv-pre", "rv-on"); x.getAnimations().forEach(a => a.finish()); });
    el.scrollIntoView({ behavior: "instant", block: "start" });
    dispatchEvent(new Event("scroll"));             // reveal's sweep shows whatever is now on screen
  }
  if (location.hash) { toHash(); addEventListener("load", toHash, { once: true }); }   // again after fonts/images settle

  /* highlight the menu item for the section in view (home page sections) */
  const spy = [...d.querySelectorAll('.site-nav a[data-spy]')];
  if (spy.length && "IntersectionObserver" in window) {
    const home = d.querySelector('.site-nav a[data-home]');
    const map = new Map(spy.map(a => [a.dataset.spy, a]));
    const secs = [...map.keys()].map(id => d.getElementById(id)).filter(Boolean);
    const vis = new Set();
    const set = a => { d.querySelectorAll(".site-nav ul a").forEach(x => x.removeAttribute("aria-current")); if (a) a.setAttribute("aria-current", "page"); };
    const io = new IntersectionObserver(es => {
      es.forEach(e => e.isIntersecting ? vis.add(e.target.id) : vis.delete(e.target.id));
      const cur = secs.find(s => vis.has(s.id));
      set(cur ? map.get(cur.id) : home);
    }, { rootMargin: "-45% 0px -50% 0px" });
    secs.forEach(s => io.observe(s));
  }
})();
