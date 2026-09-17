import { Concept, Domain, Question, strategies } from "./types";
type Entry = [string, string, Domain, number, string[], string];
const entries: Entry[] = [
  [
    "equal_groups",
    "Equal groups",
    "Multiplication",
    2,
    [],
    "Count equal groups and connect them to repeated addition.",
  ],
  [
    "multiplication_basics",
    "Multiplication as groups",
    "Multiplication",
    2,
    ["equal_groups"],
    "Interpret multiplication as equal groups.",
  ],
  [
    "multiplication_by_2",
    "Multiplying by 2",
    "Multiplication",
    2,
    ["multiplication_basics"],
    "Use doubling to find products.",
  ],
  [
    "multiplication_by_4",
    "Multiplying by 4",
    "Multiplication",
    3,
    ["multiplication_by_2"],
    "Double twice to multiply by four.",
  ],
  [
    "multiplication_by_5",
    "Multiplying by 5",
    "Multiplication",
    3,
    ["multiplication_basics"],
    "Count in fives to find a product.",
  ],
  [
    "multiplication_by_10",
    "Multiplying by 10",
    "Multiplication",
    3,
    ["multiplication_by_5"],
    "Use place value to multiply by ten.",
  ],
  [
    "division_sharing",
    "Sharing equally",
    "Division",
    3,
    ["equal_groups"],
    "Share a total into equal groups.",
  ],
  [
    "division_grouping",
    "Making equal groups",
    "Division",
    3,
    ["division_sharing", "multiplication_basics"],
    "Find how many equal groups fit a total.",
  ],
  [
    "division_inverse",
    "Multiplication & division",
    "Division",
    3,
    ["division_grouping"],
    "Use a known multiplication fact to divide.",
  ],
  [
    "equal_parts",
    "Equal parts of a whole",
    "Fractions",
    2,
    [],
    "Recognize that fractional parts must be equal.",
  ],
  [
    "fraction_meaning",
    "Parts of a whole",
    "Fractions",
    3,
    ["equal_parts"],
    "Name a shaded fraction of a whole.",
  ],
  [
    "numerator",
    "Understanding the numerator",
    "Fractions",
    3,
    ["fraction_meaning"],
    "Identify the number of selected equal parts.",
  ],
  [
    "denominator",
    "Understanding the denominator",
    "Fractions",
    3,
    ["fraction_meaning"],
    "Identify the total number of equal parts.",
  ],
  [
    "unit_fractions",
    "One equal part",
    "Fractions",
    3,
    ["denominator"],
    "Describe one part of an equally divided whole.",
  ],
  [
    "fraction_number_line",
    "Fractions on a number line",
    "Fractions",
    3,
    ["unit_fractions", "numerator"],
    "Locate fractions as numbers between zero and one.",
  ],
  [
    "compare_same_denominator",
    "Comparing equal-sized parts",
    "Fractions",
    3,
    ["numerator", "denominator"],
    "Compare fractions with the same denominator.",
  ],
  [
    "compare_same_numerator",
    "Comparing different-sized parts",
    "Fractions",
    4,
    ["unit_fractions"],
    "Compare fractions with the same numerator.",
  ],
  [
    "equivalent_fractions",
    "Equivalent fractions",
    "Fractions",
    4,
    ["fraction_meaning", "multiplication_by_2"],
    "Recognize different fractions that name the same amount.",
  ],
  [
    "generate_equivalent",
    "Making equivalent fractions",
    "Fractions",
    4,
    ["equivalent_fractions", "multiplication_by_4"],
    "Scale both numerator and denominator by the same number.",
  ],
  [
    "simplifying_fractions",
    "Simplifying fractions",
    "Fractions",
    4,
    ["generate_equivalent", "division_inverse"],
    "Divide both parts by a common factor.",
  ],
  [
    "common_denominators",
    "Finding common denominators",
    "Fractions",
    4,
    ["generate_equivalent", "multiplication_by_4"],
    "Rename fractions using equal-sized parts.",
  ],
  [
    "compare_unlike",
    "Comparing unlike fractions",
    "Fractions",
    4,
    ["common_denominators", "compare_same_denominator"],
    "Compare by renaming fractions with common denominators.",
  ],
  [
    "adding_like",
    "Adding equal-sized parts",
    "Fractions",
    3,
    ["fraction_meaning", "numerator"],
    "Add numerators while keeping the part size.",
  ],
  [
    "subtracting_like",
    "Subtracting equal-sized parts",
    "Fractions",
    3,
    ["adding_like"],
    "Subtract numerators while keeping the part size.",
  ],
  [
    "adding_unlike",
    "Adding unlike fractions",
    "Fractions",
    5,
    ["common_denominators", "adding_like"],
    "Rename, then add unlike fractions.",
  ],
  [
    "subtracting_unlike",
    "Subtracting unlike fractions",
    "Fractions",
    5,
    ["common_denominators", "subtracting_like"],
    "Rename, then subtract unlike fractions.",
  ],
];
export const misconceptions = [
  {
    id: "denominator_magnitude",
    name: "Larger denominator, larger amount",
    description:
      "May treat the denominator as a measure of quantity rather than part size.",
    conceptIds: ["compare_same_numerator", "unit_fractions"],
    detectionPatterns: ["Chooses the larger denominator for equal numerators."],
    verificationQuestions: ["Compare 1/3 and 1/6.", "Compare 2/5 and 2/7."],
    remediationStrategies: [
      "visual_fraction_model",
      "concrete_real_world_example",
    ],
  },
  {
    id: "add_both",
    name: "Adding both parts",
    description: "May add denominators as well as numerators.",
    conceptIds: ["adding_like", "adding_unlike"],
    detectionPatterns: ["Returns (a+c)/(b+d)."],
    verificationQuestions: ["1/4 + 1/4", "1/3 + 1/6"],
    remediationStrategies: ["visual_fraction_model", "step_by_step_scaffold"],
  },
  {
    id: "different_means_unequal",
    name: "Different names, different amounts",
    description: "May not yet recognize equivalent fractions.",
    conceptIds: ["equivalent_fractions", "generate_equivalent"],
    detectionPatterns: ["Says scaled fractions are different amounts."],
    verificationQuestions: ["Are 1/2 and 2/4 equal?", "Are 1/3 and 2/6 equal?"],
    remediationStrategies: ["visual_fraction_model", "pattern_discovery"],
  },
  {
    id: "ignore_denominator",
    name: "Comparing only numerators",
    description: "May compare only the top numbers.",
    conceptIds: ["compare_unlike"],
    detectionPatterns: ["Chooses larger numerator despite smaller quantity."],
    verificationQuestions: ["Compare 2/3 and 3/8.", "Compare 3/4 and 4/9."],
    remediationStrategies: ["visual_fraction_model", "prerequisite_review"],
  },
  {
    id: "scale_only_one",
    name: "Changing only one part",
    description: "May scale a numerator without scaling the denominator.",
    conceptIds: ["generate_equivalent", "simplifying_fractions"],
    detectionPatterns: ["Changes one part while keeping the other unchanged."],
    verificationQuestions: ["1/2 = ?/8", "2/3 = ?/12"],
    remediationStrategies: ["pattern_discovery", "guided_questioning"],
  },
];
export const concepts: Concept[] = entries.map(
  ([id, name, domain, grade, prerequisites, description]) => ({
    id,
    name,
    domain,
    description,
    gradeBand: [grade, Math.min(6, grade + 1)],
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
export const conceptById = Object.fromEntries(concepts.map((c) => [c.id, c]));
export function getQuestion(id: string, seed = 0, transfer = false): Question {
  const i = Math.abs(seed) % 5,
    n = i + 2,
    d = i + 4;
  const q: Question = {
    id: `${id}:${seed}`,
    conceptId: id,
    prompt: "",
    answer: "",
    hint: "",
    explanation: "",
    concrete: "",
    visuals: [],
    transfer,
  };
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
  return q;
}
