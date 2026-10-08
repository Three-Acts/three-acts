import { compile } from "tailwindcss";
import defaultTheme from "tailwindcss/theme.css?raw";
import projectTheme from "../theme.css?raw";

const compiler = compile(`@layer theme, base, components, utilities;\n@layer theme {${defaultTheme}\n${projectTheme}}\n@custom-variant portrait (@media (width >= 30rem));\n@custom-variant landscape (@media (width >= 48rem));\n@layer utilities { @tailwind utilities; }`);
export async function compileEditorUtilities(design) {
  const classes = [...Object.values(design.elements), ...Object.values(design.components).flatMap(component => Object.values(component.parts))].flatMap(style => style.utilities);
  return (await compiler).build(classes);
}
