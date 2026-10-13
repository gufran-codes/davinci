/** Entire utterances only: “thanks, but why…?” must still reach the tutor. */
export function routineReply(transcript: string) {
  const text = transcript.trim().toLowerCase().replace(/[’]/g, "'");
  if (
    /^(?:thanks(?: a lot| so much)?|thank you(?: very much)?)[.!]*$/.test(text)
  )
    return "You’re welcome.";
  if (
    /^(?:hi|hello|hey(?: there)?|hi there|good (?:morning|afternoon|evening))[.!]*$/.test(
      text,
    )
  )
    return "Hi!";
  if (/^(?:are you there|can you hear me|do you hear me)[?.!]*$/.test(text))
    return "I’m here.";
  return undefined;
}

export function isRoutineControl(transcript: string) {
  return /^(?:wait|stop|hold on|one moment|let me think|pause|resume|continue|go on|next|i'm ready|i am ready|okay|ok)[.!?]*$/i.test(
    transcript.trim().replace(/[’]/g, "'"),
  );
}
