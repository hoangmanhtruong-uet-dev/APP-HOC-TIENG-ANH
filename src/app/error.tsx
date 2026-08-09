"use client";

import { useEffect, useState } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { reportClientBoundaryError } from "@/lib/observability/client-error";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [requestId, setRequestId] = useState<string>();
  useEffect(() => {
    let active = true;
    void reportClientBoundaryError(error, "route")
      .then((value) => {
        if (active && value) setRequestId(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <ErrorState
        description={
          requestId
            ? `Hãy thử lại. Nếu lỗi vẫn tiếp diễn, cung cấp mã yêu cầu ${requestId} cho hỗ trợ.`
            : undefined
        }
        action={
          <Button type="button" size="sm" onClick={reset}>
            Thử lại
          </Button>
        }
      />
    </main>
  );
}
