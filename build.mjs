console.time("Finished");

import fs from "fs-extra";
import path from "path";

import toml from "@iarna/toml";
import { marked } from "marked";

import { minify as htmlMinifier } from "html-minifier";
import { minify as terser } from "terser";
import CleanCSS from "clean-css";

const cleanCss = new CleanCSS({
	inline: false,
	level: 2,
});

const minify = async (inp, out) => {
	const ext = path.extname(inp);
	if (![".html", ".js", ".css"].includes(ext)) {
		await fs.copy(inp, out, { overwrite: true });
		return;
	}

	const code = await fs.readFile(inp, "utf-8");
	let minified;

	switch (ext) {
		case ".html":
			minified = htmlMinifier(code, {
				removeComments: true,
				collapseWhitespace: true,
			});
			break;
		case ".js":
			minified = (await terser(code)).code;
			break;
		case ".css":
			minified = cleanCss.minify(code).styles;
			break;
	}

	await fs.writeFile(out, minified);
};

const STRINGS_DIR = "data";
const TEMPLATE_DIR = "src";
const ASSETS_DIR = "assets";
const DIST_DIR = "dist";

const INDEX = "index";
const PAGE = "page";
const GLOBAL = "global";

const INCLUDE_DELIMS = ["((", "))"];
const STRING_DELIMS = ["{{", "}}"];

const strings = new Map([["index", {}]]);

fs.mkdir(DIST_DIR, { recursive: true });

console.log("Copying assets...");

const processAssetsDir = async (dirs = []) => {
	const assets = path.join(ASSETS_DIR, ...dirs);
	const dist = path.join(DIST_DIR, ...dirs);

	if (!fs.existsSync(dist)) await fs.mkdir(dist);

	for (const entry of await fs.readdir(assets, { withFileTypes: true }))
		if (entry.isDirectory())
			await processAssetsDir(dirs.concat([ entry.name ]));
		else
			await minify(path.join(assets, entry.name), path.join(dist, entry.name));
};

processAssetsDir();

console.log("Reading strings files...");

let global = {};
if (fs.existsSync(GLOBAL + ".toml"))
	global = toml.parse(await fs.readFile(GLOBAL + ".toml", "utf-8"));

for (const file of await fs.readdir(STRINGS_DIR)) {
	const ext = path.extname(file);
	const name = path.basename(file, ext);

	if (ext == "" || name == "") continue;
	if (![".md", ".toml"].includes(ext)) continue;

	const fullPath = path.join(STRINGS_DIR, file);
	const contents = await fs.readFile(fullPath, "utf-8");

	strings.set(
		name,
		Object.assign(
			ext == ".md"
				? { markdown: marked(contents) }
				: { toml: toml.parse(contents) },
			strings.get(name) ?? {},
		),
	);
}

console.log("Preprocessing templates...");

const templates = new Map();
const preprocessTemplate = async (filePath, stack = []) => {
	if (templates.has(filePath)) return templates.get(filePath);
	if (stack.includes(filePath)) {
		console.error("error:");
		console.error(`  in template "${filePath}"`);
		console.error(`  for global preprocessing"`);
		console.error("");
		console.error(`Circular include detected, containing:`);

		for (let i = stack.lastIndexOf(filePath); i < stack.length; i++)
			console.error(`  "${stack[i]}"`);

		process.exit(101);
	}

	let contents = await fs.readFile(filePath, "utf-8");
	const dir = path.dirname(filePath);

	let index;
	while ((index = contents.indexOf(INCLUDE_DELIMS[0])) >= 0) {
		const end = index + contents.substring(index).indexOf(INCLUDE_DELIMS[1]);

		const inclName = contents.substring(index + INCLUDE_DELIMS[0].length, end);
		const inclPath = path.join(dir, inclName);

		contents = contents.substring(0, index)
			+ await preprocessTemplate(inclPath, stack.concat([filePath]))
			+ contents.substring(end + INCLUDE_DELIMS[1].length);
	}

	templates.set(filePath, contents);
	return contents;
};

const templateFiles = await fs.readdir(TEMPLATE_DIR);
for (const templateFile of templateFiles)
	await preprocessTemplate(path.join(TEMPLATE_DIR, templateFile));

console.log("Rendering pages...");

for (const [name, data] of strings.entries()) {
	const templateName = templateFiles.includes(name + ".html") ? name : PAGE;
	const template = path.join(TEMPLATE_DIR, templateName + ".html");
	let contents = templates.get(template);

	const walk = (path, data) => {
		const index = path.indexOf(".");
		if (index == -1) return data[path];

		const property = path.substring(0, index);
		const newData = data[property];

		if ((newData ?? null) == null) return newData;

		return walk(path.substring(index + 1), newData);
	};

	const special = {
		"$content": data.markdown?.trim(),
		"$name": name,
		"$path": `/${name}.html`,
	};

	let index;
	while ((index = contents.indexOf(STRING_DELIMS[0])) >= 0) {
		const end = index + contents.substring(index).indexOf(STRING_DELIMS[1]);

		const stringName = contents.substring(index + STRING_DELIMS[0].length, end);
		const stringValue = special[stringName]
			?? walk(stringName, global)
			?? walk(stringName, data.toml);

		if ((stringValue ?? null) == null) {
			console.error("error:");
			console.error(`  in template "${template}"`);
			console.error(`  for page "${name}"`);
			console.error("");
			console.error(`No value matched lookup {{${stringName}}}.`);

			process.exit(101);
		}

		contents = contents.substring(0, index)
			+ stringValue
			+ contents.substring(end + STRING_DELIMS[1].length);
	}

	const outputPath = path.join(DIST_DIR, name + ".html");
	await fs.writeFile(outputPath, contents);
	await minify(outputPath, outputPath);
}

console.timeEnd("Finished");
