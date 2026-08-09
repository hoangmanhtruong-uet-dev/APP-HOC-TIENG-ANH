"use client";

import { useEffect, useState } from "react";

import { reportClientBoundaryError } from "@/lib/observability/client-error";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [requestId, setRequestId] = useState<string>();
  useEffect(() => {
    let active = true;
    void reportClientBoundaryError(error, "global")
      .then((value) => {
        if (active && value) setRequestId(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [error]);

  return (
    <html lang="vi">
      <body>
        <style>{`
          button:focus-visible {
            outline: 2px solid #1f4ed8;
            outline-offset: 3px;
          }
        `}</style>
        <main
          style={{
            maxWidth: 640,
            margin: "0 auto",
            padding: "64px 24px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1>Ứng dụng đang gặp sự cố</h1>
          <p>
            Hãy tải lại trang. Không có dữ liệu kỹ thuật nhạy cảm được hiển thị
            tại đây.
          </p>
          {requestId ? <p>Mã yêu cầu: {requestId}</p> : null}
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 16, minHeight: 44, padding: "0 18px" }}
          >
            Thử lại
          </button>
        </main>
      </body>
    </html>
  );
}
