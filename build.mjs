console.time("Finished");

import { promises as fs } from "fs";
import path from "path";

import toml from "@iarna/toml";
import { marked } from "marked";

const STRINGS_DIR = "data";
const TEMPLATE_DIR = "src";
const ASSETS_DIR = "assets";
const DIST_DIR = "dist";

const INDEX = "index";
const PAGE = "page";

const INCLUDE_DELIMS = ["((", "))"];
const STRING_DELIMS = ["{{", "}}"];

const strings = new Map([["index", {}]]);

console.log("Copying assets...");

for (const file of await fs.readdir(ASSETS_DIR))
	await fs.copyFile(path.join(ASSETS_DIR, file), path.join(DIST_DIR, file));

console.log("Reading strings files...");

for (const file of await fs.readdir(STRINGS_DIR)) {
	const ext = path.extname(file);
	const name = path.basename(file, ext);

	if (ext == "" || name == "") continue;
	if (![".md", ".toml"].includes(ext)) continue;

	const fullPath = path.join(STRINGS_DIR, file);
	const contents = (await fs.readFile(fullPath)).toString("utf-8");

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
	if (stack.includes(filePath)) throw new Error("recursive include");

	let contents = (await fs.readFile(filePath)).toString("utf-8");
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

for (const templateName of [INDEX, PAGE])
	await preprocessTemplate(path.join(TEMPLATE_DIR, templateName + ".html"));

console.log("Rendering pages...");

for (const [name, data] of strings.entries()) {
	const template = path.join(TEMPLATE_DIR, (name == INDEX ? INDEX : PAGE) + ".html");
	let contents = templates.get(template);

	const walk = (path, data) => {
		const index = path.indexOf(".");
		if (index == -1) return data[path];

		const newData = data[path.substring(0, index)];
		if (!newData) throw new ReferenceError();

		return walk(path.substring(index + 1), newData);
	};

	let index;
	while ((index = contents.indexOf(STRING_DELIMS[0])) >= 0) {
		const end = index + contents.substring(index).indexOf(STRING_DELIMS[1]);

		const stringName = contents.substring(index + STRING_DELIMS[0].length, end);
		const stringValue = stringName == "."
			? data.markdown.trim()
			: walk(stringName, data.toml);
		
		if (!stringValue) throw new ReferenceError();
		
		contents = contents.substring(0, index)
			+ stringValue
			+ contents.substring(end + STRING_DELIMS[1].length);
	}

	const outputPath = path.join(DIST_DIR, name + ".html");
	await fs.writeFile(outputPath, contents);
}

console.timeEnd("Finished");
