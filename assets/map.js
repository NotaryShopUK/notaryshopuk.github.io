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
			.replace("<br />", "")
	);
	window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`);
});

map.on("pointermove", (event) => {
	const pixel = map.getEventPixel(event.originalEvent);
	const hit = map.hasFeatureAtPixel(pixel);
	map.getTarget().style.cursor = hit ? "pointer": "";
});
