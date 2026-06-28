import { domToBlob } from "modern-screenshot";

function buildScreenshotWrapper(table: HTMLTableElement): HTMLDivElement {
  const wrapper = document.createElement("div");
  Object.assign(wrapper.style, {
    padding: "1rem",
    background:
      "radial-gradient(ellipse 80% 60% at 50% 0%, #1d2e20 0%, transparent 70%), #15141A",
    width: "414px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    color: "#ffffff",
  });

  const header = document.createElement("div");
  Object.assign(header.style, {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.75rem",
    paddingBottom: "0.5rem",
  });

  const logo = document.createElement("img");
  logo.src = "/wclogoedit.png";
  Object.assign(logo.style, {
    width: "20px",
    height: "auto",
    filter: "drop-shadow(0 0 15px rgba(212, 168, 68, 0.3))",
  });

  const title = document.createElement("span");
  title.innerHTML =
    '<span style="color:#2e8b3a">WC26</span> <span style="color:#d4a844">Sweepstake</span>';
  Object.assign(title.style, {
    fontSize: "1.1rem",
    fontWeight: "600",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
  });

  header.appendChild(logo);
  header.appendChild(title);
  wrapper.appendChild(header);

  const clonedTable = table.cloneNode(true) as HTMLTableElement;
  clonedTable.style.fontSize = "0.85rem";
  clonedTable.querySelectorAll("th").forEach((th) => {
    th.style.padding = "0.4rem 0.35rem";
  });
  clonedTable.querySelectorAll("td").forEach((td) => {
    td.style.padding = "0.3rem 0.35rem";
  });
  wrapper.appendChild(clonedTable);

  return wrapper;
}

export async function captureTable(table: HTMLTableElement): Promise<Blob> {
  const wrapper = buildScreenshotWrapper(table);
  document.body.appendChild(wrapper);

  try {
    const blob = await domToBlob(wrapper, { scale: 2 });
    if (!blob) throw new Error("Screenshot failed");
    return blob;
  } finally {
    document.body.removeChild(wrapper);
  }
}

export function buildShareFilename(groupName: string): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "");
  const slug = groupName.toLowerCase().replace(/\s+/g, "-");
  return `sweepstake-${slug}-${timestamp}.png`;
}
