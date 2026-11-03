import { seedRecord, daysAgo, type SeedCollections } from "./types";
const object = (id: string, values: Record<string, string | number | boolean>) => JSON.stringify({ id, values });
const media = (src: string, fileName: string, contentType: string) => JSON.stringify({ src, fileName, contentType, size: 1840000 });
export const studioSeed: SeedCollections = {
  clients: [
    seedRecord({ id: "client-cedar-house", createdAt: daysAgo(120), values: { name: "Cedar House Guest Lodge", website: "https://example.com/cedar-house" } }),
    seedRecord({ id: "client-open-table", createdAt: daysAgo(90), values: { name: "Open Table Community Kitchen", website: "https://example.com/open-table" } })
  ],
  services: [
    seedRecord({ id: "service-strategy", createdAt: daysAgo(150), values: { name: "Content strategy", description: "Interviews, information architecture and a publishing plan the team can maintain." } }),
    seedRecord({ id: "service-development", createdAt: daysAgo(150), values: { name: "Website design and development", description: "Accessible responsive sites with a CMS shaped around the editorial team." } }),
    seedRecord({ id: "service-film", createdAt: daysAgo(150), values: { name: "Brand film", description: "Short documentary films that show the people behind the service." } })
  ],
  "case-studies": [seedRecord({ id: "project-cedar-house", createdAt: daysAgo(60), values: {
    title: "A calmer booking journey for Cedar House", slug: "cedar-house-booking", client: "client-cedar-house",
    services: JSON.stringify(["service-strategy", "service-development", "service-film"]),
    story: "# A welcome before arrival\n\nCedar House's team answered the same room and accessibility questions every day. We rebuilt the site around the decisions guests need to make.\n\n## What changed\n\n- Room details now include step-free access information.\n- The booking link stays visible on small screens.\n- Staff can update seasonal offers without a developer.\n\n> Guests arrive knowing what to expect.\n\nThe team reviewed **every room description** before launch. [Read the guest guide](https://example.com/cedar-house/guide).",
    cover: JSON.stringify({ src: "https://picsum.photos/seed/cedar-house-courtyard/1600/1000", fileName: "cedar-house-courtyard.jpg", alt: "Morning light in the Cedar House courtyard" }),
    films: JSON.stringify([media("https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", "garden-welcome.mp4", "video/mp4"), media("https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm", "garden-detail.webm", "video/webm")]),
    downloads: JSON.stringify([media("/demo/cedar-house-press-kit.pdf", "cedar-house-press-kit.pdf", "application/pdf")]),
    launchedAt: "2026-08-14T08:00:00.000Z", duration: 8, featured: true, sector: "hospitality", website: "https://example.com/cedar-house",
    testimonial: object("testimonial-nandi", { name: "Nandi Jacobs", role: "Lodge manager", quote: "The new site answers guests' practical questions before they call. Our team can finally keep it current.", featured: true, company: "https://example.com/cedar-house" }),
    results: JSON.stringify([object("result-enquiries", { label: "Fewer repetitive enquiries", value: 32, detail: "Compared with the eight weeks before launch; based on the reception log." }), object("result-bookings", { label: "More direct booking clicks", value: 18, detail: "First month after launch compared with the previous month." })])
  } }), seedRecord({ id: "project-open-table", createdAt: daysAgo(30), values: {
    title: "Helping neighbours find Open Table", slug: "open-table-community", client: "client-open-table", services: JSON.stringify(["service-strategy", "service-development"]),
    story: "# A kitchen open to everyone\n\nOpen Table needed reliable opening times, directions and a clear way to volunteer. The new site puts today's service information first.\n\n## Editorial handover\n\nKitchen coordinators update the menu each morning. Volunteers maintain the donation guide from the same CMS.",
    films: "[]", downloads: "[]", launchedAt: "2026-08-28T08:00:00.000Z", duration: 5, featured: false, sector: "community", website: "https://example.com/open-table", results: "[]", testimonial: ""
  } })]
};
