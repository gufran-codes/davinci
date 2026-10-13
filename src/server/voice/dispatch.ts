// Protocol JobStatus: pending=0, running=1, success=2, failed=3.
// A completed dispatch can remain listed after its worker has left the room.
export function reusableTutorDispatch(dispatch: {
  agentName: string;
  state?: {
    deletedAt: bigint;
    jobs: { state?: { status: number; endedAt: bigint } }[];
  };
}) {
  if (
    dispatch.agentName !== "primer-tutor" ||
    (dispatch.state?.deletedAt ?? 0n) > 0n
  )
    return false;
  const jobs = dispatch.state?.jobs ?? [];
  return (
    !jobs.length ||
    jobs.some(
      (job) =>
        !job.state ||
        (job.state.endedAt === 0n && [0, 1].includes(job.state.status)),
    )
  );
}
