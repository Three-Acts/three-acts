import { useEffect, useRef, useState } from "react";
import { layoutSources, validateContent, validateLayout, type HomeCopy, type LayoutDocument } from "@three-acts/static-content";
import layoutSource from "@three-acts/static-content/documents/layout.json";
import homeSource from "@three-acts/static-content/documents/home.json";
import { HomePage, type HomePageProps } from "../../views/home";

/** Preview builds hydrate the canonical Home renderer. Public builds stay SSR.
 * Only the configured CMS parent can provide its validated source drafts. */
export function HomeCompositionPreview({ origin, ...data }: HomePageProps & { origin: string }) {
  const [state, setState] = useState<{ layout: LayoutDocument; copy: HomeCopy }>({ layout: validateLayout(layoutSource), copy: homeSource });
  const signature = useRef("");
  useEffect(() => {
    if (!origin || window.parent === window) return;
    function receive(event: MessageEvent) {
      if (event.source !== window.parent || event.origin !== origin || event.data?.type !== "three-acts:preview" || !Array.isArray(event.data.documents) || event.data.session !== undefined) return;
      try {
        const documents = event.data.documents as Array<{ id: string; content: unknown }>;
        const layout = validateLayout(documents.find(doc => doc.id === "layout")?.content);
        const copy = validateContent("home", documents.find(doc => doc.id === "home")?.content) as HomeCopy;
        const next = JSON.stringify({ layout, copy });
        if (next === signature.current) return;
        signature.current = next;
        document.dispatchEvent(new CustomEvent("three-acts:composition-rendering"));
        setState({ layout, copy });
      } catch { /* A malformed packet cannot replace the canonical layout. */ }
    }
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: "three-acts:composition-ready" }, origin);
    return () => window.removeEventListener("message", receive);
  }, [origin]);
  useEffect(() => {
    document.querySelector('astro-island[component-export="HomeCompositionPreview"]')?.setAttribute("data-composition-ready", "");
    document.dispatchEvent(new CustomEvent("three-acts:composition-rendered", { detail: { sections: layoutSources(state.layout) } }));
  }, [state]);
  return <HomePage {...data} layout={state.layout} copy={state.copy}/>;
}
