const root = document.documentElement;
const callback = () => {
	root.style.setProperty("--y", `${root.scrollTop}px`);
	root.style.setProperty("--yv", root.scrollTop.toString());
};

addEventListener("scroll", () => callback());
callback();
