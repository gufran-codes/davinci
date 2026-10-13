/** Read only closed JSON strings in the ordered structured-output envelope.
 * SDK partial JSON parsing can complete an unfinished string; that text must
 * never be spoken. Task identity must arrive before any speech is accepted. */
export function closedSpeechChunks(
  snapshot: string,
  identity: { questionId: string; strategyId: string },
) {
  if (snapshot.length > 16000) throw Error("Speech envelope is too large");
  const header = snapshot.match(
    /^\s*\{\s*"questionId"\s*:\s*("(?:[^"\\]|\\.)*")\s*,\s*"strategyId"\s*:\s*("(?:[^"\\]|\\.)*")\s*,\s*"chunks"\s*:\s*\[/,
  );
  if (!header) return [];
  if (
    JSON.parse(header[1]) !== identity.questionId ||
    JSON.parse(header[2]) !== identity.strategyId
  )
    throw Error("Speech task identity changed");
  const chunks: string[] = [];
  let rest = snapshot.slice(header[0].length);
  while (true) {
    // Require the following delimiter too, including when a delta ends in an
    // escaped quote. JSON.parse rejects invalid control characters/escapes.
    const token = rest.match(/^\s*("(?:[^"\\]|\\.)*")\s*([,\]])/);
    if (!token) break;
    const chunk = JSON.parse(token[1]) as string;
    if (!chunk.trim() || chunk.length > 1500 || chunks.length >= 16)
      throw Error("Invalid speech chunk");
    chunks.push(chunk.trim());
    rest = rest.slice(token[0].length);
    if (token[2] === "]") break;
  }
  return chunks;
}

/** Complete thought boundaries only. The exact authored question may use a
 * colon or no terminal punctuation, so it has an explicit exception. */
export function completeSpeechChunk(text: string, requiredQuestion?: string) {
  return text === requiredQuestion || /[.!?]["'”’)]?$/.test(text);
}
