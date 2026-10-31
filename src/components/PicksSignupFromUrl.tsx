"use client";
// The Picks box on prebuilt pages. Reads ?picks= (the result after submitting) in the browser,
// so the page itself can be the same for everyone.
import { Suspense, type ComponentProps } from "react";
import { useSearchParams } from "next/navigation";
import { PicksSignup } from "./PicksSignup";

type Props = Omit<ComponentProps<typeof PicksSignup>, "status">;

function WithStatus(props: Props) {
  const status = useSearchParams().get("picks") ?? undefined;
  return <PicksSignup {...props} status={status} />;
}

export function PicksSignupFromUrl(props: Props) {
  return (
    <Suspense fallback={<PicksSignup {...props} />}>
      <WithStatus {...props} />
    </Suspense>
  );
}
