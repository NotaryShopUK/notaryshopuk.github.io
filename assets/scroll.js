const root = document.documentElement;

let lastPosition = root.scrollTop;
let yValue = Math.max(Math.min(root.scrollTop, 180), 0);

const callback = () => {
	yValue += root.scrollTop - lastPosition;
	yValue = Math.max(Math.min(yValue, 180), 0);

	lastPosition = root.scrollTop;

	root.style.setProperty("--y", `${yValue}px`);
	root.style.setProperty("--yv", `${yValue}`);
};

addEventListener("scroll", () => callback());
callback();

const navPopup = document.getElementById("nav-popup");
for (const toggle of document.getElementsByClassName("nav-menu-toggle"))
	toggle.addEventListener("click", () => navPopup.classList.toggle("visible"));
