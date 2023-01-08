class DirectionsButton extends ol.control.Control {
	constructor() {
		const label = document.createElement("span");
		label.innerText = "Get directions";

		const button = document.createElement("button");
		button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M12 3.515L3.515 12 12 20.485 20.485 12 12 3.515zm.707-2.122l9.9 9.9a1 1 0 0 1 0 1.414l-9.9 9.9a1 1 0 0 1-1.414 0l-9.9-9.9a1 1 0 0 1 0-1.414l9.9-9.9a1 1 0 0 1 1.414 0zM13 10V7.5l3.5 3.5-3.5 3.5V12h-3v3H8v-4a1 1 0 0 1 1-1h4z"/></svg>`;
		button.appendChild(label);

		const element = document.createElement("div");
		element.className = "directions ol-unselectable ol-control";
		element.appendChild(button);

		super({ element });

		button.addEventListener(
			"click",
			() => window.open(container.getAttribute("data-directions")),
		);
	}
}

const container = document.getElementById("map");

const lonLat = container
	.getAttribute("data-lon-lat")
	.split(",")
	.map((s) => parseFloat(s.trim()));

const feature = new ol.Feature({
	geometry: new ol.geom.Point(ol.proj.fromLonLat(lonLat)),
	name: container.getAttribute("data-name"),
});

feature.setStyle(
	new ol.style.Style({
		image: new ol.style.Icon({
			anchor: [0.5, 1],
			src: "/img/pin.png",
		}),
	})
);

const vectorSource = new ol.source.Vector({
	features: [feature],
});

const map = new ol.Map({
	target: container,
	controls: ol.control.defaults.defaults().extend([new DirectionsButton()]),
	layers: [
		new ol.layer.Tile({
			source: new ol.source.OSM(),
		}),
		new ol.layer.Vector({
			source: vectorSource,
		}),
	],
	view: new ol.View({
		center: ol.proj.fromLonLat(lonLat),
		zoom: 13,
	}),
});

map.on("click", (event) => {
	const hit = map.hasFeatureAtPixel(event.pixel);
	if (!hit) return;

	const address = encodeURIComponent(
		container
			.getAttribute("data-address")
			.replaceAll("<br />", "")
	);
	window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`);
});

map.on("pointermove", (event) => {
	const pixel = map.getEventPixel(event.originalEvent);
	const hit = map.hasFeatureAtPixel(pixel);
	map.getTarget().style.cursor = hit ? "pointer": "";
});
