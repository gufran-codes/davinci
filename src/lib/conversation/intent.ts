import type { ConversationIntent } from "../teaching/types";
import type { Question } from "../types";
export interface UnderstoodTurn {
  intent: ConversationIntent;
  answer?: string;
  term?: string;
  confidence?: "low" | "medium" | "high";
  reasoning?: string;
  ambiguity?: "clear" | "ambiguous";
  needsClarification?: boolean;
}
const numbers: Record<string, string> = {
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
  eleven: "11",
  twelve: "12",
  thirteen: "13",
  fourteen: "14",
  fifteen: "15",
  sixteen: "16",
  seventeen: "17",
  eighteen: "18",
  nineteen: "19",
  twenty: "20",
  thirty: "30",
  forty: "40",
  fifty: "50",
  sixty: "60",
  seventy: "70",
  eighty: "80",
  ninety: "90",
};
export function spokenMath(input: string) {
  let text = input
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(
      /^(i think |i guess |maybe |my answer is |the answer is |it is |it's )+/g,
      "",
    )
    .replace(/\b(umm?|uh|er)\b/g, "")
    .replace(/\.{2,}/g, " ")
    .replace(/[?.!,]$/, "")
    .trim();
  text = text.replace(
    /\b(one|two|three|four|five|six|seven|eight|nine) hundred(?: and)?(?: (twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety))?(?:[ -](one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen))?\b/g,
    (_, a, b, c) =>
      String(
        Number(numbers[a]) * 100 +
          Number(numbers[b] ?? 0) +
          Number(numbers[c] ?? 0),
      ),
  );
  text = text
    .replace(/\b(a|one) half\b/g, "1/2")
    .replace(/\b(a|one) quarter\b/g, "1/4");
  text = text.replace(
    /\b([a-z]+|\d+) (halves|thirds?|quarters?|fourths?|fifths?|sixths?|eighths?|tenths?)\b/g,
    (_, n, d) =>
      `${numbers[n] ?? n}/${({ halves: 2, third: 3, thirds: 3, quarter: 4, quarters: 4, fourth: 4, fourths: 4, fifth: 5, fifths: 5, sixth: 6, sixths: 6, eighth: 8, eighths: 8, tenth: 10, tenths: 10 } as Record<string, number>)[d]}`,
  );
  text = text.replace(/\b([a-z]+)[ -]([a-z]+)\b/g, (match, a, b) =>
    Number(numbers[a]) >= 20 && Number(numbers[b]) < 10
      ? String(Number(numbers[a]) + Number(numbers[b]))
      : match,
  );
  text = text.replace(
    /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\b/g,
    (n) => numbers[n],
  );
  text = text
    .replace(/\b(over|divided by)\b/g, "/")
    .replace(/\b(times|multiplied by)\b/g, "*")
    .replace(/\bplus\b/g, "+")
    .replace(/\bminus\b/g, "-");
  return text;
}
/** Stop requests are commands; "stop" alone remains a temporary pause. */
export function requestsSessionEnd(transcript: string) {
  const t = transcript.toLowerCase().replace(/[’]/g, "'").trim();
  if (/\b(?:don't|do not|not ready to|not done|haven't)\b/.test(t))
    return false;
  return (
    (/^(?:(?:please|okay|ok|well|thanks)[, ]+)*(?:(?:can|could|may) (?:we|i|you) |(?:i (?:want|would like) to |let's ))?(?:finish|end|stop|quit|wrap up)(?: (?:the |this |my |our )?(?:session|lesson|learning|practice)| for (?:today|now)| now| here| please)?[.!?]*$/.test(
      t,
    ) &&
      !/^stop[.!?]*$/.test(t)) ||
    /^(?:i(?:'m| am) done(?: for (?:today|now)| (?:with )?(?:this|the lesson|the session))?|that's (?:enough|all)(?: for today)?|no more (?:lessons|questions)(?: today)?|bye|goodbye)[.!?]*$/.test(
      t,
    )
  );
}
export function understandLocally(
  transcript: string,
  q: Question,
): UnderstoodTurn {
  const t = transcript.toLowerCase().replace(/[’]/g, "'").trim();
  if (requestsSessionEnd(t)) return { intent: "end_session" };
  if (
    /\b(?:another|other|different|alternate) (?:way|method|approach|solution)\b/.test(
      t,
    )
  )
    return { intent: "confused", confidence: "low" };
  if (
    /\b(step by step|one step at a time|walk me through|help me with (?:the )?steps)\b/.test(
      t,
    )
  )
    return { intent: "hint" };
  if (/\b(?:show|tell|give|reveal)\b.*\b(?:answer|solution)\b/.test(t))
    return { intent: "reveal" };
  if (q.choices) {
    const letter = t.match(
      /^(?:(?:i think |i choose |option |answer )*)([a-f])[.!?]?$/,
    )?.[1];
    const ordinal = t.match(
      /^(?:(?:i choose|i pick|the answer is) )?(?:the )?(first|second|third|fourth|fifth|sixth)(?: (?:one|choice|option))?[.!?]*$/,
    )?.[1];
    const index = letter
      ? letter.charCodeAt(0) - 97
      : ordinal
        ? ["first", "second", "third", "fourth", "fifth", "sixth"].indexOf(
            ordinal,
          )
        : -1;
    if (index >= 0 && q.choices[index])
      return { intent: "answer", answer: q.choices[index] };
  }
  if (/^(wait|stop|hold on|one moment|let me think|pause)[.!?]*$/.test(t))
    return { intent: "wait" };
  if (/^(?:a little clearer|ready for more|still tricky)[.!?]*$/.test(t))
    return {
      intent: "reflection",
      confidence: /tricky/.test(t) ? "low" : "high",
    };
  if (
    /^(resume|continue|go on|next|i'm ready|i am ready|okay|ok)[.!?]*$/.test(t)
  )
    return { intent: "resume" };
  if (
    /\b(hint|help me start|small clue|what should i do first|where (?:do|should) i start|first step)\b/.test(
      t,
    )
  )
    return { intent: "hint" };
  if (/\b(easier|simpler|smaller example)\b/.test(t))
    return { intent: "easier" };
  if (
    /\b(don't understand|do not understand|don't get|still confused|confusing|this is hard|i don't know|i do not know|another way|different way|different approach|not making sense)\b/.test(
      t,
    )
  )
    return { intent: "confused", confidence: "low" };
  if (
    /\b(stuck|same loop|going in circles|keep repeating|repeating yourself|not helping|too strict|too fast|too slow|boring)\b/.test(
      t,
    )
  )
    return { intent: "feedback", confidence: "low" };
  if (
    /\b(can you hear me|do you hear me|are you there|hello|hey there|hi there|good (?:morning|afternoon|evening)|thank you|thanks|sorry|how are you|who are you|what(?:'s| is) your name|nice to meet you|i (?:like|love)|my favou?rite|i(?:'m| am) (?:tired|sad|upset|frustrated))\b/.test(
      t,
    )
  )
    return { intent: "rapport" };
  if (/\b(show me|picture|draw|see it|a visual)\b/.test(t))
    return { intent: "show" };
  if (
    /^(?:wait[, ]+)?(?:why|how|what|can you explain|could you explain)\b/.test(
      t,
    )
  )
    return {
      intent: /\b(?:mean|define|what is|what are)\b/.test(t) ? "define" : "why",
      term: t,
    };
  if (
    /\b(what (does|is|are).*mean|what is (a |the )?(denominator|numerator|fraction)|define)\b/.test(
      t,
    )
  ) {
    const term = t.match(
      /(?:what does |what is (?:a |the )?|define )(.+?)(?: mean|\?|$)/,
    )?.[1];
    return { intent: "define", term };
  }
  if (
    /^(wait[, ]+)?why\b|^how (does|do|can|come)\b|\bcan you explain (?:this|that|it)\b/.test(
      t,
    )
  )
    return { intent: "why", term: t };
  if (/\b(say (it|that) again|repeat|didn't hear)\b/.test(t))
    return { intent: "repeat" };
  if (/^(actually|no[, ]+i meant|i meant|wait[, ]+it'?s)/.test(t))
    return {
      intent: "correction",
      answer: spokenMath(
        t.replace(/^(actually[, ]*|no[, ]+i meant |i meant |wait[, ]+)/, ""),
      ),
    };
  if (
    /^(i think i know|i'm sure|i am sure|i'm guessing|i am guessing|not sure)[.!?]*$/.test(
      t,
    )
  )
    return {
      intent: "confidence",
      confidence: /guess|not sure/.test(t) ? "low" : "high",
    };
  if (q.responseType === "writing" && !/\?$/.test(t))
    return { intent: "answer", answer: transcript };
  if (
    /\b(because|since|so that|i worked|i multiplied|i divided|i counted|same amount|equal parts)\b/.test(
      t,
    ) &&
    t.split(/\s+/).length >= 5
  ) {
    const stated = t.split(/\b(?:because|since)\b/)[0].trim();
    const answer = spokenMath(stated);
    if (q.subject === "Math" && /^[\d\s+*/().−-]+$/.test(answer))
      return { intent: "answer", answer, reasoning: transcript };
    return { intent: "reasoning", reasoning: transcript };
  }
  if (/\?$/.test(t) || /^(what|who|where|when|tell me|can you)\b/.test(t))
    return { intent: "off_topic" };
  let answer =
    q.subject === "Math"
      ? spokenMath(transcript)
      : transcript
          .replace(/^(i think |it is |it's |the answer is )+/i, "")
          .replace(/[.!?]+$/, "")
          .trim();
  if (q.choices) {
    const match =
      q.choices.find((c) => c.toLowerCase() === answer.toLowerCase()) ??
      q.choices
        .filter((c) => t.includes(c.toLowerCase()) && !/\bnot\b/.test(t))
        .sort((a, b) => b.length - a.length)[0];
    if (match) answer = match;
  }
  if (
    answer.length <= 160 &&
    (/^[\d\s+*/().−-]+$/.test(answer) ||
      q.choices?.includes(answer) ||
      ["yes", "no", "same amount", "different amounts"].includes(
        answer.toLowerCase(),
      ) ||
      q.subject !== "Math")
  )
    return { intent: "answer", answer };
  return { intent: "off_topic" };
}
