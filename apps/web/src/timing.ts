export function remainingSeconds(
  deadlineAt: string,
  clientNow: number,
  serverOffsetMs: number,
): number {
  return Math.max(
    0,
    Math.ceil(
      (new Date(deadlineAt).getTime() - (clientNow + serverOffsetMs)) / 1000,
    ),
  );
}
