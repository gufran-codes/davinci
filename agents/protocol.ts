/** AgentSession emits initializing before onEnter has fetched the lesson. */
export function voiceStatusPacket(
  status: string,
  session?: { conversation?: { turnId: string } },
) {
  return {
    type: "status" as const,
    status,
    ...(session?.conversation ? { turnId: session.conversation.turnId } : {}),
  };
}
