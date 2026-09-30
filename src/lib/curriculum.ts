import { arithmeticQuestion } from "./teaching/arithmetic-bank";
import { equivalenceQuestion } from "./teaching/fraction-bank";
import {
  expandedConcepts,
  expandedMisconceptions,
  contentQuestion,
  contentById,
  assessReasoning,
  rubricFor,
} from "./teaching/content";
import { Concept, Domain, Question, Subject, strategies } from "./types";
import { gradeAnswer } from "./math";
type Entry = [
  string,
  string,
  Subject,
  Domain,
  string,
  number,
  string[],
  string,
];
const entries: Entry[] = [
  [
    "equal_groups",
    "Equal groups",
    "Math",
    "Multiplication",
    "Multiplication",
    2,
    [],
    "Count equal groups and connect them to repeated addition.",
  ],
  [
    "multiplication_basics",
    "Multiplication as groups",
    "Math",
    "Multiplication",
    "Multiplication",
    2,
    ["equal_groups"],
    "Interpret multiplication as equal groups.",
  ],
  [
    "multiplication_by_2",
    "Multiplying by 2",
    "Math",
    "Multiplication",
    "Multiplication",
    2,
    ["multiplication_basics"],
    "Use doubling to find products.",
  ],
  [
    "multiplication_by_4",
    "Multiplying by 4",
    "Math",
    "Multiplication",
    "Multiplication",
    3,
    ["multiplication_by_2"],
    "Double twice to multiply by four.",
  ],
  [
    "multiplication_by_5",
    "Multiplying by 5",
    "Math",
    "Multiplication",
    "Multiplication",
    3,
    ["multiplication_basics"],
    "Count in fives to find a product.",
  ],
  [
    "multiplication_by_10",
    "Multiplying by 10",
    "Math",
    "Multiplication",
    "Multiplication",
    3,
    ["multiplication_by_5"],
    "Use place value to multiply by ten.",
  ],
  [
    "division_sharing",
    "Sharing equally",
    "Math",
    "Division",
    "Division",
    3,
    ["equal_groups"],
    "Share a total into equal groups.",
  ],
  [
    "division_grouping",
    "Making equal groups",
    "Math",
    "Division",
    "Division",
    3,
    ["division_sharing", "multiplication_basics"],
    "Find how many equal groups fit a total.",
  ],
  [
    "division_inverse",
    "Multiplication & division",
    "Math",
    "Division",
    "Division",
    3,
    ["division_grouping"],
    "Use a known multiplication fact to divide.",
  ],
  [
    "equal_parts",
    "Equal parts of a whole",
    "Math",
    "Fractions",
    "Fractions",
    2,
    [],
    "Recognize that fractional parts must be equal.",
  ],
  [
    "fraction_meaning",
    "Parts of a whole",
    "Math",
    "Fractions",
    "Fractions",
    3,
    ["equal_parts"],
    "Name a shaded fraction of a whole.",
  ],
  [
    "numerator",
    "Understanding the numerator",
    "Math",
    "Fractions",
    "Fractions",
    3,
    ["fraction_meaning"],
    "Identify the number of selected equal parts.",
  ],
  [
    "denominator",
    "Understanding the denominator",
    "Math",
    "Fractions",
    "Fractions",
    3,
    ["fraction_meaning"],
    "Identify the total number of equal parts.",
  ],
  [
    "unit_fractions",
    "One equal part",
    "Math",
    "Fractions",
    "Fractions",
    3,
    ["denominator"],
    "Describe one part of an equally divided whole.",
  ],
  [
    "fraction_number_line",
    "Fractions on a number line",
    "Math",
    "Fractions",
    "Fractions",
    3,
    ["unit_fractions", "numerator"],
    "Locate fractions as numbers between zero and one.",
  ],
  [
    "compare_same_denominator",
    "Comparing equal-sized parts",
    "Math",
    "Fractions",
    "Fractions",
    3,
    ["numerator", "denominator"],
    "Compare fractions with the same denominator.",
  ],
  [
    "compare_same_numerator",
    "Comparing different-sized parts",
    "Math",
    "Fractions",
    "Fractions",
    4,
    ["unit_fractions"],
    "Compare fractions with the same numerator.",
  ],
  [
    "equivalent_fractions",
    "Equivalent fractions",
    "Math",
    "Fractions",
    "Fractions",
    4,
    ["fraction_meaning", "multiplication_by_2"],
    "Recognize different fractions that name the same amount.",
  ],
  [
    "generate_equivalent",
    "Making equivalent fractions",
    "Math",
    "Fractions",
    "Fractions",
    4,
    ["equivalent_fractions", "multiplication_by_4"],
    "Scale both numerator and denominator by the same number.",
  ],
  [
    "simplifying_fractions",
    "Simplifying fractions",
    "Math",
    "Fractions",
    "Fractions",
    4,
    ["generate_equivalent", "division_inverse"],
    "Divide both parts by a common factor.",
  ],
  [
    "common_denominators",
    "Finding common denominators",
    "Math",
    "Fractions",
    "Fractions",
    4,
    ["generate_equivalent", "multiplication_by_4"],
    "Rename fractions using equal-sized parts.",
  ],
  [
    "compare_unlike",
    "Comparing unlike fractions",
    "Math",
    "Fractions",
    "Fractions",
    4,
    ["common_denominators", "compare_same_denominator"],
    "Compare by renaming fractions with common denominators.",
  ],
  [
    "adding_like",
    "Adding equal-sized parts",
    "Math",
    "Fractions",
    "Fractions",
    3,
    ["fraction_meaning", "numerator"],
    "Add numerators while keeping the part size.",
  ],
  [
    "subtracting_like",
    "Subtracting equal-sized parts",
    "Math",
    "Fractions",
    "Fractions",
    3,
    ["adding_like"],
    "Subtract numerators while keeping the part size.",
  ],
  [
    "adding_unlike",
    "Adding unlike fractions",
    "Math",
    "Fractions",
    "Fractions",
    5,
    ["common_denominators", "adding_like"],
    "Rename, then add unlike fractions.",
  ],
  [
    "subtracting_unlike",
    "Subtracting unlike fractions",
    "Math",
    "Fractions",
    "Fractions",
    5,
    ["common_denominators", "subtracting_like"],
    "Rename, then subtract unlike fractions.",
  ],
  [
    "ela_reading_inference",
    "Inferring from text evidence",
    "English",
    "Reading Comprehension",
    "Inference",
    4,
    [],
    "Use details in a passage to support an inference.",
  ],
  [
    "ela_vocabulary_context",
    "Word meaning from context",
    "English",
    "Vocabulary",
    "Context clues",
    4,
    ["ela_reading_inference"],
    "Use surrounding words to figure out an unfamiliar word.",
  ],
  [
    "science_energy_forms",
    "Potential and kinetic energy",
    "Science",
    "Energy",
    "Energy forms",
    4,
    [],
    "Distinguish stored energy from energy of motion.",
  ],
  [
    "social_map_skills",
    "Reading maps",
    "Social Studies",
    "Geography",
    "Map skills",
    4,
    [],
    "Read map direction and scale.",
  ],
];
export const misconceptions = [
  ...expandedMisconceptions,
  {
    id: "denominator_magnitude",
    subject: "Math",
    name: "Larger denominator, larger amount",
    description:
      "May treat the denominator as a measure of quantity rather than part size.",
    conceptIds: [
      "compare_same_numerator",
      "unit_fractions",
      "equivalent_fractions",
    ],
    detectionPatterns: ["Chooses the larger denominator for equal numerators."],
    verificationQuestions: ["Compare 1/3 and 1/6.", "Compare 2/5 and 2/7."],
    remediationStrategies: [
      "visual_fraction_model",
      "concrete_real_world_example",
    ],
  },
  {
    id: "add_both",
    subject: "Math",
    name: "Adding both parts",
    description: "May add denominators as well as numerators.",
    conceptIds: ["adding_like", "adding_unlike"],
    detectionPatterns: ["Returns (a+c)/(b+d)."],
    verificationQuestions: ["1/4 + 1/4", "1/3 + 1/6"],
    remediationStrategies: ["visual_fraction_model", "step_by_step_scaffold"],
  },
  {
    id: "different_means_unequal",
    subject: "Math",
    name: "Different names, different amounts",
    description: "May not yet recognize equivalent fractions.",
    conceptIds: ["equivalent_fractions", "generate_equivalent"],
    detectionPatterns: ["Says scaled fractions are different amounts."],
    verificationQuestions: ["Are 1/2 and 2/4 equal?", "Are 1/3 and 2/6 equal?"],
    remediationStrategies: ["visual_fraction_model", "pattern_discovery"],
  },
  {
    id: "ignore_denominator",
    subject: "Math",
    name: "Comparing only numerators",
    description: "May compare only the top numbers.",
    conceptIds: ["compare_unlike"],
    detectionPatterns: ["Chooses larger numerator despite smaller quantity."],
    verificationQuestions: ["Compare 2/3 and 3/8.", "Compare 3/4 and 4/9."],
    remediationStrategies: ["visual_fraction_model", "prerequisite_review"],
  },
  {
    id: "scale_only_one",
    subject: "Math",
    name: "Changing only one part",
    description: "May scale a numerator without scaling the denominator.",
    conceptIds: [
      "equivalent_fractions",
      "generate_equivalent",
      "simplifying_fractions",
    ],
    detectionPatterns: ["Changes one part while keeping the other unchanged."],
    verificationQuestions: ["1/2 = ?/8", "2/3 = ?/12"],
    remediationStrategies: ["pattern_discovery", "guided_questioning"],
  },
  {
    id: "literal_only",
    subject: "English",
    name: "Literal details instead of inferences",
    description:
      "May repeat a detail stated in the passage instead of inferring.",
    conceptIds: ["ela_reading_inference"],
    detectionPatterns: ["Chooses a stated detail when an inference is asked."],
    verificationQuestions: [
      "What does the character's action suggest?",
      "What is probably true even though the text never says it?",
    ],
    remediationStrategies: [
      "guided_questioning",
      "concrete_real_world_example",
    ],
  },
  {
    id: "energy_used_up",
    subject: "Science",
    name: "Energy disappears when used",
    description: "May believe moving objects lose their energy entirely.",
    conceptIds: ["science_energy_forms"],
    detectionPatterns: ["Says a stopped object has no energy at all."],
    verificationQuestions: [
      "Where does the moving energy go when the ball stops?",
      "Does a parked car on a hill have energy?",
    ],
    remediationStrategies: [
      "concrete_real_world_example",
      "guided_questioning",
    ],
  },
];
export const concepts: Concept[] = entries.map(
  ([id, name, subject, domain, topic, grade, prerequisites, description]) => ({
    id,
    name,
    subject,
    domain,
    topic,
    description,
    gradeBand: [grade, grade],
    gradeRange: [grade, grade],
    prerequisites,
    learningObjectives: [description],
    misconceptionIds: misconceptions
      .filter((m) => m.conceptIds.includes(id))
      .map((m) => m.id),
    teachingStrategyIds: [...strategies],
    diagnosticItems: [`${id}:0`, `${id}:1`],
    practiceItems: [`${id}:2`, `${id}:3`, `${id}:4`],
    masteryItems: [`${id}:5`, `${id}:6`],
  }),
);
concepts.push(...expandedConcepts);
export const conceptById = Object.fromEntries(concepts.map((c) => [c.id, c]));
function rawQuestion(id: string, seed = 0, transfer = false): Question {
  const generated = contentQuestion(id, seed, transfer);
  if (generated) return generated;
  const concept = conceptById[id];
  if (!concept) throw new Error(`Unknown concept: ${id}`);
  const q: Question = {
    id: `${id}:${seed}`,
    conceptId: id,
    subject: concept.subject,
    prompt: "",
    answer: "",
    hint: "",
    explanation: "",
    concrete: "",
    visuals: [],
    transfer,
  };
  if (concept.subject === "Math") mathQuestion(q, id, seed, transfer);
  else {
    const generate = skillGenerators[id];
    if (!generate) throw new Error(`Unknown concept: ${id}`);
    generate(q, Math.abs(seed) % 5, transfer);
  }
  return q;
}
export function getQuestion(id: string, seed = 0, transfer = false): Question {
  const q =
    id === "equivalent_fractions"
      ? equivalenceQuestion(seed, transfer)
      : (arithmeticQuestion(id, seed, transfer) ??
        rawQuestion(id, seed, transfer));
  q.responseModes = [
    "voice",
    q.choices?.length
      ? "multiple_choice"
      : q.subject === "Math"
        ? "numeric"
        : "short_text",
    "whiteboard",
    ...(q.visuals.some((visual) => visual.type === "manipulative")
      ? (["manipulative"] as const)
      : []),
  ];
  q.purpose = transfer ? "transfer" : seed === 0 ? "diagnosis" : "practice";
  q.qualityStatus ??= contentById[id] ? "draft" : "authored";
  q.options ??= q.choices?.map((content, i) => ({
    id: String.fromCharCode(65 + i),
    content,
    correct: gradeSkillAnswer(content, q.answer, q.exact, q.subject),
    misconceptionId:
      content === q.misconception?.answer ? q.misconception.id : undefined,
    diagnosticMeaning:
      content === q.misconception?.answer
        ? `Probe ${q.misconception.id}; one selection is only a hypothesis.`
        : undefined,
  }));
  return q;
}
// Pluggable per-subject grader. Math keeps the bounded arithmetic parser;
// other subjects compare normalized text (case and punctuation tolerant).
export function gradeSkillAnswer(
  input: string,
  answer: string,
  exact = false,
  subject?: Subject,
): boolean {
  if (subject === undefined || subject === "Math")
    return gradeAnswer(input, answer, exact);
  const norm = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[.\s]+$/, "")
      .replace(/\s+/g, " ");
  return norm(input) === norm(answer);
}
export function gradeQuestion(q: Question, input: string): boolean {
  if (q.responseType === "writing")
    return assessReasoning(input, rubricFor(q)).sufficient;
  return gradeSkillAnswer(input, q.answer, q.exact, q.subject);
}
type SkillGenerator = (q: Question, i: number, transfer: boolean) => void;
function fill(
  q: Question,
  prompt: string,
  answer: string,
  hint: string,
  explanation: string,
  concrete: string,
  choices?: string[],
  misconception?: { id: string; answer: string },
) {
  Object.assign(q, {
    prompt,
    answer,
    hint,
    explanation,
    concrete,
    choices,
    misconception,
  });
}
const skillGenerators: Record<string, SkillGenerator> = {
  ela_reading_inference: (q, _i, transfer) =>
    transfer
      ? fill(
          q,
          "Leo hears thunder and grabs a flashlight before the lights flicker. What can you infer?",
          "A storm is coming",
          "What do thunder and flickering lights tell you about the weather?",
          "Thunder and flickering lights are signs of a storm, even though the text never says the word storm.",
          "If your friend packs sunscreen and a towel, what might they be about to do?",
          ["Leo is reading", "A storm is coming", "It is bedtime"],
          { id: "literal_only", answer: "Leo is reading" },
        )
      : fill(
          q,
          "Maya grabbed her umbrella and rain boots before running outside. What can you infer about the weather?",
          "It is probably raining",
          "What do people use umbrellas and rain boots for?",
          "Umbrellas and rain boots are used in rain. The text suggests rain without ever saying so.",
          "If your friend packs sunscreen and a towel, what might they be about to do?",
          ["Maya ran outside", "It is probably raining", "It is bedtime"],
          { id: "literal_only", answer: "Maya ran outside" },
        ),
  ela_vocabulary_context: (q, _i, transfer) =>
    transfer
      ? fill(
          q,
          "In the sentence “The feast was abundant, with food covering every table,” what does “abundant” most likely mean?",
          "plentiful",
          "Look at the words around it. What does food covering every table tell you?",
          "Food covering every table means there is more than enough, so abundant means plentiful.",
          "If a garden is thriving, with tall green plants everywhere, what does thriving mean?",
        )
      : fill(
          q,
          "In the sentence “The arid desert had not seen rain in months,” what does “arid” most likely mean?",
          "dry",
          "What does “had not seen rain in months” tell you about the desert?",
          "No rain for months means the desert is very dry, so arid means dry.",
          "If a garden is thriving, with tall green plants everywhere, what does thriving mean?",
        ),
  science_energy_forms: (q, _i, transfer) =>
    transfer
      ? fill(
          q,
          "A ball rolls down a slide. What happens to its stored energy as it moves?",
          "It changes into moving energy",
          "Does the stored energy disappear, or does it become something else?",
          "Stored energy does not vanish. It changes into moving energy as the ball slides.",
          "A stretched rubber band snaps back. Where did the stored stretch go?",
          [
            "It disappears",
            "It changes into moving energy",
            "It stays stored forever",
          ],
          { id: "energy_used_up", answer: "It disappears" },
        )
      : fill(
          q,
          "A ball sits still at the top of a slide. What kind of energy does it have before it moves?",
          "Stored (potential) energy",
          "The ball is not moving yet. What is waiting inside it?",
          "A still ball on a hill holds stored energy because of its position. It becomes moving energy on the way down.",
          "A stretched rubber band is held still. What is waiting in the stretch?",
          [
            "Stored (potential) energy",
            "Moving (kinetic) energy",
            "No energy at all",
          ],
          { id: "energy_used_up", answer: "No energy at all" },
        ),
  social_map_skills: (q, _i, transfer) =>
    transfer
      ? fill(
          q,
          "A map scale says 1 centimetre stands for 1 kilometre. Two parks are 4 centimetres apart on the map. How far apart are they really?",
          "4 kilometres",
          "Each centimetre is one kilometre. Count the centimetres.",
          "4 centimetres × 1 kilometre each = 4 kilometres in the real world.",
          "Your drawing uses one block for one house. A street 3 blocks long stands for how many houses?",
          ["4 kilometres", "2 kilometres", "1 centimetre"],
        )
      : fill(
          q,
          "On most maps, which direction does the arrow marked N point?",
          "North",
          "What word starts with N on a compass?",
          "The N arrow points north. Maps are usually drawn with north at the top.",
          "Stand up and point to where the sun rises. That direction has its own name too.",
          ["North", "The nearest city", "The map title"],
        ),
};
function mathQuestion(
  q: Question,
  id: string,
  seed: number,
  transfer: boolean,
) {
  const i = Math.abs(seed) % 5,
    n = i + 2,
    d = i + 4;
  const set = (
    prompt: string,
    answer: string,
    hint: string,
    explanation: string,
    concrete: string,
  ) => Object.assign(q, { prompt, answer, hint, explanation, concrete });
  switch (id) {
    case "equal_groups":
    case "multiplication_basics":
    case "multiplication_by_2":
    case "multiplication_by_4":
    case "multiplication_by_5":
    case "multiplication_by_10": {
      const factor =
        id === "multiplication_by_2"
          ? 2
          : id === "multiplication_by_4"
            ? 4
            : id === "multiplication_by_5"
              ? 5
              : id === "multiplication_by_10"
                ? 10
                : 3;
      set(
        transfer
          ? `There are ${n} bags with ${factor} shells in each. How many shells altogether?`
          : `What is ${n} × ${factor}?`,
        `${n * factor}`,
        `Count ${n} groups of ${factor}. What is the total after the first two groups?`,
        `${Array(n).fill(factor).join(" + ")} = ${n * factor}. There are ${n} equal groups.`,
        `Imagine ${n} baskets, each holding ${factor} apples. Count the apples by basket.`,
      );
      q.visuals = [{ type: "array", rows: n, columns: factor }];
      break;
    }
    case "division_sharing":
    case "division_grouping":
    case "division_inverse": {
      const groups = i + 2,
        total = groups * 3;
      set(
        id === "division_grouping"
          ? `${total} counters go into groups of 3. How many groups?`
          : `${total} counters are shared equally between ${groups} people. How many does each get?`,
        `${id === "division_grouping" ? groups : 3}`,
        `Use a multiplication fact. What number times ${id === "division_grouping" ? 3 : groups} makes ${total}?`,
        `${groups} × 3 = ${total}, so ${total} ÷ ${groups} = 3.`,
        `Imagine sharing ${total} crackers fairly onto ${groups} plates.`,
      );
      q.visuals = [
        {
          type: "counters",
          total,
          groups: id === "division_grouping" ? 3 : groups,
        },
      ];
      break;
    }
    case "equal_parts":
      set(
        "To name parts as fractions, must all parts of the whole be equal in size?",
        "Yes",
        "Would two very different-sized slices each be one half?",
        "Fractional parts of one whole must be equal in size.",
        "Imagine sharing a sandwich fairly between two people.",
      );
      q.choices = ["Yes", "No"];
      break;
    case "fraction_meaning":
      set(
        `A whole has ${d} equal parts. ${n} are shaded. What fraction is shaded?`,
        `${n}/${d}`,
        `The bottom tells all the equal parts. The top tells the shaded parts.`,
        `${n} shaded parts out of ${d} equal parts is ${n}/${d}.`,
        `A snack bar has ${d} equal pieces. You keep ${n} pieces.`,
      );
      q.visuals = [{ type: "fraction_bar", numerator: n, denominator: d }];
      break;
    case "numerator":
      set(
        `In ${n}/${d}, what is the numerator?`,
        `${n}`,
        "Which number counts the selected parts?",
        `The top number, ${n}, is the numerator.`,
        `You take ${n} of ${d} equal orange pieces. Which number counts the pieces you took?`,
      );
      q.visuals = [{ type: "fraction_bar", numerator: n, denominator: d }];
      break;
    case "denominator":
      set(
        `In ${n}/${d}, what is the denominator?`,
        `${d}`,
        "Which number tells how many equal parts make a whole?",
        `The bottom number, ${d}, is the denominator.`,
        `A chocolate bar is divided into ${d} equal squares.`,
      );
      q.visuals = [{ type: "fraction_bar", numerator: n, denominator: d }];
      break;
    case "unit_fractions":
      set(
        `A whole is split into ${d} equal parts. What fraction is ONE part?`,
        `1/${d}`,
        "The numerator counts one selected part.",
        `One of ${d} equal parts is 1/${d}.`,
        `Share a pizza equally among ${d} people. What fraction does each get?`,
      );
      q.visuals = [{ type: "fraction_bar", numerator: 1, denominator: d }];
      break;
    case "fraction_number_line":
      set(
        `From 0 to 1 there are ${d} equal steps. What fraction is at step ${n}?`,
        `${n}/${d}`,
        "Count intervals, not the starting mark.",
        `Each step is 1/${d}. After ${n} steps you are at ${n}/${d}.`,
        `A one-metre ribbon has ${d} equal sections. Walk along ${n} of them.`,
      );
      q.visuals = [{ type: "number_line", numerator: n, denominator: d }];
      break;
    case "compare_same_denominator":
      set(
        `Which is larger: 1/${d} or ${n}/${d}?`,
        `${n}/${d}`,
        "The pieces are the same size. Which fraction has more pieces?",
        `${n} pieces is more than one piece when all pieces are the same size.`,
        `Two friends have slices from identical pizzas, each cut into ${d} slices.`,
      );
      q.choices = [`1/${d}`, `${n}/${d}`];
      q.visuals = [{ type: "comparison", a: 1, b: d, c: n, d }];
      break;
    case "compare_same_numerator":
      set(
        `Which is larger: 1/${n} or 1/${d}?`,
        `1/${n}`,
        "When you split the same whole into more pieces, what happens to each piece?",
        `With fewer equal pieces, each piece is larger. So 1/${n} is larger than 1/${d}.`,
        `Two identical cakes are shared by ${n} people and ${d} people. Who gets the larger piece?`,
      );
      q.choices = [`1/${d}`, `1/${n}`];
      q.visuals = [{ type: "comparison", a: 1, b: n, c: 1, d }];
      q.misconception = { id: "denominator_magnitude", answer: `1/${d}` };
      break;
    case "equivalent_fractions":
      set(
        `Do 1/${n} and 2/${n * 2} show the same amount?`,
        "Same amount",
        `If every piece is split in two, does the total amount change?`,
        `Splitting each of ${n} parts in two makes ${n * 2} parts. The same amount now takes 2 pieces.`,
        `Take one of ${n} equal pieces of a sandwich. Cut every piece in half. Did your share change?`,
      );
      q.choices = ["Same amount", "Different amounts"];
      q.visuals = [{ type: "comparison", a: 1, b: n, c: 2, d: n * 2 }];
      q.misconception = {
        id: "different_means_unequal",
        answer: "Different amounts",
      };
      break;
    case "generate_equivalent":
      set(
        `Fill the missing numerator: 1/${n} = ?/${n * 3}`,
        `3`,
        `What do you multiply ${n} by to get ${n * 3}? Do that to the top too.`,
        `Multiply both parts by 3: 1 × 3 = 3 and ${n} × 3 = ${n * 3}.`,
        `Split each of ${n} equal pieces into three smaller pieces. How many small pieces replace your one piece?`,
      );
      q.visuals = [{ type: "comparison", a: 1, b: n, c: 3, d: n * 3 }];
      q.misconception = { id: "scale_only_one", answer: "1" };
      break;
    case "simplifying_fractions":
      set(
        `Write 2/${n * 2} in simplest form.`,
        `1/${n}`,
        `What number divides both 2 and ${n * 2}?`,
        `Divide both parts by 2: 2/${n * 2} = 1/${n}.`,
        `Join pairs of small pieces back together while keeping the same share.`,
      );
      q.exact = true;
      q.visuals = [{ type: "comparison", a: 2, b: n * 2, c: 1, d: n }];
      q.misconception = { id: "scale_only_one", answer: `1/${n * 2}` };
      break;
    case "common_denominators":
      set(
        `Rename 1/${n} with denominator ${n * 2}. What is the whole fraction?`,
        `2/${n * 2}`,
        `Multiply the bottom by 2. What must happen to the top?`,
        `1/${n} = 2/${n * 2}, because both parts were multiplied by 2.`,
        `Cut every piece of a bar into two, without adding or removing any chocolate.`,
      );
      q.exact = true;
      q.visuals = [{ type: "comparison", a: 1, b: n, c: 2, d: n * 2 }];
      break;
    case "compare_unlike":
      set(
        `Which is larger: 2/3 or 3/${i + 7}?`,
        "2/3",
        `Compare each amount with one half.`,
        `2/3 is more than one half. 3/${i + 7} is less than one half.`,
        `Compare two equally sized snack bars, split into different numbers of pieces.`,
      );
      q.choices = [`3/${i + 7}`, "2/3"];
      q.visuals = [{ type: "comparison", a: 2, b: 3, c: 3, d: i + 7 }];
      q.misconception = { id: "ignore_denominator", answer: `3/${i + 7}` };
      break;
    case "adding_like":
      set(
        `What is 1/${d} + 2/${d}?`,
        `3/${d}`,
        "The size of each part stays the same. How many parts do you have together?",
        `1 part + 2 parts = 3 parts, each of size 1/${d}. The sum is 3/${d}.`,
        `You eat one slice, then two more, from a pizza cut into ${d} equal slices.`,
      );
      q.visuals = [{ type: "comparison", a: 1, b: d, c: 2, d }];
      q.misconception = { id: "add_both", answer: `3/${d * 2}` };
      break;
    case "subtracting_like":
      set(
        `What is 3/${d} − 1/${d}?`,
        `2/${d}`,
        "The pieces stay the same size. Remove one of the three pieces.",
        `3 parts − 1 part = 2 parts. The result is 2/${d}.`,
        `You have three of ${d} equal slices and give one away.`,
      );
      q.visuals = [{ type: "fraction_bar", numerator: 3, denominator: d }];
      break;
    case "adding_unlike":
      set(
        `What is 1/${n} + 1/${n * 2}?`,
        `3/${n * 2}`,
        `Rename 1/${n} using denominator ${n * 2}. How many small parts is that?`,
        `1/${n} = 2/${n * 2}. Then 2/${n * 2} + 1/${n * 2} = 3/${n * 2}.`,
        `Make both sets of snack pieces the same size before counting them together.`,
      );
      q.visuals = [{ type: "comparison", a: 1, b: n, c: 1, d: n * 2 }];
      q.misconception = { id: "add_both", answer: `2/${n * 3}` };
      break;
    case "subtracting_unlike":
      set(
        `What is 1/${n} − 1/${n * 2}?`,
        `1/${n * 2}`,
        `Rename 1/${n} using denominator ${n * 2}, then remove one small part.`,
        `1/${n} = 2/${n * 2}. Taking away 1/${n * 2} leaves 1/${n * 2}.`,
        `Cut your large snack piece into two equal pieces, then give one away.`,
      );
      q.visuals = [{ type: "comparison", a: 1, b: n, c: 1, d: n * 2 }];
      break;
    default:
      throw new Error(`Unknown concept: ${id}`);
  }
}
