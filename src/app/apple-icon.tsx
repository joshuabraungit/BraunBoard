import { ImageResponse } from "next/og";

// The icon phones show when someone saves Braun Board to their home screen: the owl on cream.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const OWL = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="70 55 260 295"><path d="M110 120 L100 62 L156 96 Z" fill="#16140f"/><path d="M290 120 L300 62 L244 96 Z" fill="#16140f"/><ellipse cx="200" cy="215" rx="125" ry="128" fill="#16140f"/><circle cx="158" cy="172" r="44" fill="#faf8f4"/><circle cx="242" cy="172" r="44" fill="#faf8f4"/><circle cx="160" cy="188" r="17" fill="#16140f"/><circle cx="244" cy="188" r="17" fill="#16140f"/><circle cx="165" cy="183" r="4" fill="#fff"/><circle cx="249" cy="183" r="4" fill="#fff"/><circle cx="158" cy="174" r="30" fill="none" stroke="#4cae73" stroke-width="6"/><circle cx="242" cy="174" r="30" fill="none" stroke="#4cae73" stroke-width="6"/><path d="M188 172 L212 172" stroke="#4cae73" stroke-width="6" stroke-linecap="round"/><path d="M186 210 L214 210 L200 236 Z" fill="#c98a1a"/></svg>`,
)}`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#faf8f4" }}>
        <img src={OWL} width={124} height={140} alt="" />
      </div>
    ),
    size,
  );
}
