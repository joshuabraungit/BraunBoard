"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/browser";
import { finishVideoUpload, startVideoUpload } from "./actions";

const MAX_BYTES = 50 * 1024 * 1024;

/** Uploads the explainer video straight to storage, then points the order at it. */
export function VideoUpload({ id, hasVideo }: { id: string; hasVideo: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<{ busy: boolean; msg: string | null; err: boolean }>({ busy: false, msg: null, err: false });

  async function upload(file: File) {
    if (file.size > MAX_BYTES) return setState({ busy: false, msg: "That file is over 50MB. Export a smaller one.", err: true });
    setState({ busy: true, msg: "Uploading…", err: false });
    const start = await startVideoUpload(id, file.type);
    if (!start.ok) return setState({ busy: false, msg: start.error, err: true });
    const { error } = await browserClient().storage.from("sponsor-videos").uploadToSignedUrl(start.path, start.token, file, { contentType: file.type });
    if (error) return setState({ busy: false, msg: `Upload failed: ${error.message}`, err: true });
    const done = await finishVideoUpload(id, start.path);
    if (!done.ok) return setState({ busy: false, msg: done.error ?? "Couldn't save the video.", err: true });
    setState({ busy: false, msg: "Uploaded. It's on the client's review link now.", err: false });
    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className={`inline-flex min-h-9 cursor-pointer items-center rounded-md border border-line-strong bg-surface px-3 text-sm font-semibold ${state.busy ? "opacity-60" : ""}`}>
        {hasVideo ? "Replace video" : "Upload explainer video"}
        <input
          ref={input}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="sr-only"
          disabled={state.busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
      </label>
      {state.msg && <span className={`text-xs ${state.err ? "text-red" : "text-ink-2"}`}>{state.msg}</span>}
    </div>
  );
}
