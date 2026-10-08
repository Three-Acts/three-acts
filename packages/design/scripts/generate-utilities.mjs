import { readFile, writeFile } from "node:fs/promises";
import { URL } from "node:url";

const controls = JSON.parse(await readFile(new URL("../src/utilities.json", import.meta.url), "utf8"));
const classes = ["", "landscape:", "tablet:", "desktop:"].flatMap(prefix => Object.values(controls).flatMap(control => control.classes.map(value => prefix + value)));
await writeFile(new URL("../src/utility-candidates.json", import.meta.url), JSON.stringify(classes, null, 2) + "\n");
