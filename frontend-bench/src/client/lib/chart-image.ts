/**
 * Renders a chart's SVG to a PNG blob. Computed styles are inlined so CSS variables,
 * theme colours and fonts survive serialisation; the image keeps a provenance footer.
 */
import { appState } from "../state.js";
import { atlasMeta } from "./atlas.js";
const STYLE_PROPS = [
  "fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity", "stroke-dasharray", "stroke-linejoin", "stroke-linecap",
  "opacity", "font-size", "font-family", "font-weight", "text-anchor", "dominant-baseline", "paint-order", "visibility", "display",
  "stop-color", "stop-opacity",
];

export async function chartToPng(container: HTMLElement, title: string, scale = 2): Promise<Blob> {
  const svg = [...container.querySelectorAll<SVGSVGElement>("svg.recharts-surface")].sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
  if (!svg) throw new Error("No chart to export");
  const { width, height } = svg.getBoundingClientRect();
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const source = svg.querySelectorAll("*");
  const target = clone.querySelectorAll("*");
  source.forEach((element, index) => {
    const computed = getComputedStyle(element);
    (target[index] as SVGElement | undefined)?.setAttribute("style", STYLE_PROPS.map((name) => `${name}:${computed.getPropertyValue(name)}`).join(";"));
  });
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  // A data: URL, not a blob: URL, so the served CSP (img-src 'self' data:) needs no loosening.
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
  {
    const image = new Image();
    image.decoding = "async";
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Chart image failed to render")); image.src = url; });
    // Legend items marked in the HTML figcaption ([data-png-legend] with a [data-png-swatch] child) are redrawn in
    // the image, so an exported chart keeps its key; the swatch colour is read from its computed style.
    const legend = [...container.querySelectorAll<HTMLElement>("[data-png-legend]")].map((item) => {
      const swatch = item.querySelector<Element>("[data-png-swatch]");
      const computed = swatch ? getComputedStyle(swatch) : null;
      const visible = (value: string | undefined) => value && value !== "none" && value !== "rgba(0, 0, 0, 0)" && value !== "transparent" ? value : null;
      const color = visible(computed?.backgroundColor) ?? visible(computed?.stroke) ?? visible(computed?.borderTopColor) ?? "#62666d";
      return { label: item.textContent?.trim() ?? "", color };
    }).filter((item) => item.label);
    const testData = Boolean(appState.snapshot.testData);
    const line = 16;
    const pad = 24, header = 40;
    const footer = 12 + (legend.length ? line : 0) + line + (testData ? line : 0);
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil((width + pad * 2) * scale);
    canvas.height = Math.ceil((height + pad * 2 + header + footer) * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    context.scale(scale, scale);
    const root = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    context.fillStyle = root.getPropertyValue("--card").trim() || "#ffffff";
    context.fillRect(0, 0, width + pad * 2, height + pad * 2 + header + footer);
    context.fillStyle = root.getPropertyValue("--foreground").trim() || "#08090a";
    context.font = `600 15px ${body.fontFamily}`;
    context.fillText(title, pad, pad + 16);
    context.drawImage(image, pad, pad + header, width, height);
    const muted = root.getPropertyValue("--muted-foreground").trim() || "#62666d";
    context.font = `400 11px ${body.fontFamily}`;
    let y = pad + header + height + 12;
    if (legend.length) {
      y += line - 4;
      let x = pad;
      for (const item of legend) {
        context.fillStyle = item.color;
        context.fillRect(x, y - 8, 10, 8);
        context.fillStyle = muted;
        context.fillText(item.label, x + 14, y);
        x += 14 + context.measureText(item.label).width + 16;
      }
      y += 4;
    }
    // Provenance on its own line (capture date, catalog date, dataset); fixture runs add a TEST DATA line below it.
    y += line;
    context.fillStyle = muted;
    context.fillText(`Bench Console · captured ${new Date().toISOString().slice(0, 10)} · catalog ${atlasMeta.asOf} · dataset ${appState.workload}`, pad, y);
    if (testData) {
      y += line;
      context.fillStyle = root.getPropertyValue("--warning-text").trim() || "#8a5a00";
      context.fillText("TEST DATA: invented fixture values, not a measurement", pad, y);
    }
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG encoding failed"))), "image/png"));
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyBlob(blob: Blob): Promise<void> {
  if (!("ClipboardItem" in window) || !navigator.clipboard?.write) throw new Error("Image copy is not supported in this browser");
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}
