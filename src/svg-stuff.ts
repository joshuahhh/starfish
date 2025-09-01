export type SVGContainerElement = HTMLElement & SVGSVGElement;

// export async function imageToFlippedDataUri(url: string): Promise<string> {
//   return new Promise((resolve, reject) => {
//     const img = new Image();
//     img.crossOrigin = "anonymous"; // allow CORS images
//     img.onload = () => {
//       const canvas = document.createElement("canvas");
//       const ctx = canvas.getContext("2d");
//       if (!ctx) {
//         reject(new Error("Could not get canvas context"));
//         return;
//       }

//       canvas.width = img.width;
//       canvas.height = img.height;

//       // Flip horizontally by scaling -1 in X
//       ctx.translate(canvas.width, 0);
//       ctx.scale(-1, 1);
//       ctx.drawImage(img, 0, 0);

//       resolve(canvas.toDataURL());
//     };
//     img.onerror = (err) => reject(err);
//     img.src = url;
//   });
// }

export async function imageToDataUri(
  url: string,
  options?: { flipHorizontal?: boolean },
): Promise<string> {
  const flip = options?.flipHorizontal ?? false;

  if (!flip) {
    // Fast path: fetch + FileReader
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onloadend = () => {
        if (typeof fr.result === "string") {
          resolve(fr.result);
        } else {
          reject(new Error("Unexpected FileReader result"));
        }
      };
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  } else {
    // Canvas path: needed for flipping
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // required for CORS images
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;

        // Flip horizontally
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0);

        resolve(canvas.toDataURL());
      };
      img.onerror = (err) => reject(err);
      img.src = url;
    });
  }
}

export async function downloadSvgAsJpeg(
  svg: SVGContainerElement,
  filename = "image.jpg",
  quality = 0.92,
  scale = 1,
) {
  // get size from viewbox
  const vb = svg.viewBox && svg.viewBox.baseVal;
  const w = vb.width;
  const h = vb.height;

  // Serialize SVG to a Blob URL
  if (!svg.getAttribute("xmlns"))
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const svgString = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml" });
  const svgUrl = URL.createObjectURL(svgBlob);

  // Canvas (hi-dpi aware)
  const dpr = window.devicePixelRatio * scale;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(w * dpr);
  canvas.height = Math.ceil(h * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Optional: white background for JPEG (instead of black on transparency)
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);

  // Draw
  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(svgUrl);
      resolve();
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(svgUrl);
      reject(e);
    };
    img.src = svgUrl;
  });

  // Encode JPEG and download
  const jpegBlob = await new Promise<Blob | null>((r) =>
    canvas.toBlob((b) => r(b), "image/jpeg", quality),
  );
  if (!jpegBlob) throw new Error("Failed to create JPEG blob");

  const a = document.createElement("a");
  a.download = filename;
  a.href = URL.createObjectURL(jpegBlob);
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function inlineSvgImages(svg: SVGElement): Promise<void> {
  const images = Array.from(
    svg.querySelectorAll<SVGImageElement>("image[href], image[xlink\\:href]"),
  );

  await Promise.all(
    images.map(async (img) => {
      const href =
        img.getAttribute("href") ||
        img.getAttributeNS("http://www.w3.org/1999/xlink", "href");
      if (!href) return;

      const url = new URL(href, document.baseURI).href;

      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
      const blob = await res.blob();

      const dataUrl: string = await new Promise((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as string);
        fr.readAsDataURL(blob);
      });

      img.removeAttribute("xlink:href");
      img.setAttribute("href", dataUrl);
    }),
  );
}
