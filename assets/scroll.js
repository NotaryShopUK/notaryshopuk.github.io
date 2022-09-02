const root = document.documentElement;
addEventListener("scroll", () => root.style.setProperty("--y", root.scrollTop));
