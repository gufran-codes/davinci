import type { SkillContent } from "./schema";
import { literacyDepth } from "./lesson-depth-literacy";
import { scienceDepth } from "./lesson-depth-science";
import { socialDepth } from "./lesson-depth-social";

type Case = [
  prompt: string,
  answer: string,
  distractors: string[],
  reason: string,
];
export type Unit = {
  id: string;
  standard: string;
  core: string;
  steps: [string, string, string];
  example: [
    prompt: string,
    firstStep: string,
    secondStep: string,
    answer: string,
  ];
  error: string;
  transfer: string;
  cases: [Case, Case, Case];
};

/** Original teaching sequences and applications. Standards are scope references,
 * not claims of complete alignment or educator approval. Preserve existing item
 * positions so persisted assessment identities remain meaningful. */
export const lessonUnits: Unit[] = [
  ...literacyDepth,
  ...scienceDepth,
  ...socialDepth,
  {
    id: "g1_math_place_value",
    standard: "1.NBT.B.2",
    core: "A teen number contains one group of ten and some single ones. Grouping changes how we count, not how many objects there are.",
    steps: [
      "Bundle ten objects into one ten.",
      "Count leftover objects as ones.",
      "Connect the bundles and ones to the two digits.",
    ],
    example: [
      "Represent 16 counters with a ten-frame and single counters.",
      "Put ten counters into one complete group.",
      "Six counters remain; one ten and six ones make sixteen.",
      "1 ten and 6 ones",
    ],
    error: "Reading the tens digit as a count of single objects.",
    transfer: "Recognize the same quantity in grouped and ungrouped forms.",
    cases: [
      [
        "A bundle holds 10 sticks. There are also 7 loose sticks. How many sticks are there altogether?",
        "17",
        ["10", "7", "71"],
        "One ten and seven ones make 17.",
      ],
      [
        "Which describes 14 counters?",
        "1 ten and 4 ones",
        ["4 tens and 1 one", "1 ten and 14 ones"],
        "The 1 counts a group of ten and the 4 counts single ones.",
      ],
      [
        "Jules has 18 beads. She puts 10 in a bag. How many beads stay outside the bag?",
        "8",
        ["10", "28"],
        "Eighteen is one ten and eight ones, so eight stay outside.",
      ],
    ],
  },
  {
    id: "g2_math_money",
    standard: "2.MD.C.8",
    core: "Coin value and coin count are different. Add values in the same unit before finding a total or change.",
    steps: [
      "Name each coin's value in cents.",
      "Combine the values using tens and ones.",
      "Subtract the price from the amount paid to find change.",
    ],
    example: [
      "Pay for a 35-cent sticker with two quarters.",
      "Two quarters have value 25 + 25 = 50 cents.",
      "50 - 35 = 15 cents change.",
      "15 cents",
    ],
    error: "Assuming the collection with more coins is worth more.",
    transfer: "Choose a payment and verify the change in a new purchase.",
    cases: [
      [
        "Two dimes and one nickel have what total value in cents?",
        "25",
        ["3", "15", "30"],
        "Each dime is 10 cents and the nickel is 5, so 10 + 10 + 5 = 25.",
      ],
      [
        "Which collection is worth more: three pennies or one dime?",
        "One dime",
        ["Three pennies", "They have equal value"],
        "The dime is worth 10 cents; three pennies are worth 3 cents.",
      ],
      [
        "A pencil costs 45 cents. You pay 60 cents. How many cents should you receive back?",
        "15",
        ["25", "105"],
        "The change is 60 - 45 = 15 cents. The price and change add back to 60.",
      ],
    ],
  },
  {
    id: "g3_math_area",
    standard: "3.MD.C.7",
    core: "Area counts unit squares covering a surface without gaps or overlaps. Equal rows connect that count to multiplication.",
    steps: [
      "Choose a square unit for covering the surface.",
      "Count squares in one row and the number of equal rows.",
      "For a split shape, add the areas of non-overlapping rectangles.",
    ],
    example: [
      "Find the area of a rectangle with 3 rows of 7 square tiles.",
      "Each row covers 7 square units.",
      "Three equal rows cover 3 × 7 = 21 square units.",
      "21 square units",
    ],
    error:
      "Adding side lengths finds part of the perimeter, not the covered area.",
    transfer: "Find an unknown side or combine rectangular areas.",
    cases: [
      [
        "A rectangle is covered by 4 rows of 6 unit squares. What is its area in square units?",
        "24",
        ["10", "20"],
        "Four rows of six squares cover 4 × 6 = 24 square units.",
      ],
      [
        "A rectangular garden has area 35 square meters and width 5 meters. What is its length in meters?",
        "7",
        ["30", "40"],
        "The missing side satisfies 5 × length = 35, so the length is 7.",
      ],
      [
        "Two non-overlapping rectangles form a floor: one has area 12 square meters and the other 8. What is the total area?",
        "20",
        ["4", "96"],
        "Because the regions do not overlap, add 12 + 8 = 20 square meters.",
      ],
    ],
  },
  {
    id: "g4_math_fraction_operations",
    standard: "4.NF.B.3",
    core: "Adding fractions with the same denominator joins counts of the same-sized parts. The denominator names the unit and stays fixed.",
    steps: [
      "Check that both fractions use the same whole and part size.",
      "Combine or remove the selected parts.",
      "Express the count using the unchanged fractional unit.",
    ],
    example: [
      "Combine 2/7 and 3/7 of the same ribbon.",
      "Both amounts count sevenths, so the units match.",
      "Two sevenths plus three sevenths is five sevenths.",
      "5/7",
    ],
    error: "Adding denominators changes the unit being counted.",
    transfer:
      "Apply fraction addition and subtraction to quantities greater than one whole.",
    cases: [
      [
        "A jug contains 3/8 liter of juice. Add 2/8 liter. How many liters are now in the jug?",
        "5/8",
        ["5/16", "1/8"],
        "Both amounts count eighths of a liter; add the numerators to get 5/8.",
      ],
      [
        "A ribbon is 11/6 meter long. Cut off 4/6 meter. How many meters remain?",
        "7/6",
        ["7/0", "15/6"],
        "Subtract four sixths from eleven sixths to leave seven sixths.",
      ],
      [
        "Why is 1/5 + 2/5 equal to 3/5 rather than 3/10?",
        "We join three pieces that are still fifths",
        [
          "Every addition doubles the whole",
          "The denominator counts only the selected pieces",
        ],
        "Joining selected pieces does not cut each piece smaller or change the whole.",
      ],
    ],
  },
  {
    id: "g5_math_volume",
    standard: "5.MD.C.5",
    core: "Volume counts unit cubes filling a solid. A rectangular prism is a stack of identical rectangular layers.",
    steps: [
      "Count unit cubes in one base layer.",
      "Count how many layers fill the height.",
      "Multiply the layer size by the height and use cubic units.",
    ],
    example: [
      "Find the volume of a box 3 cm long, 2 cm wide and 5 cm high.",
      "Each layer contains 3 × 2 = 6 unit cubes.",
      "Five layers contain 6 × 5 = 30 cubes.",
      "30 cubic centimeters",
    ],
    error: "Using square units or adding three lengths for volume.",
    transfer: "Recover an unknown dimension from a volume and a base area.",
    cases: [
      [
        "A prism measures 4 cm by 3 cm by 6 cm. What is its volume in cubic centimeters?",
        "72",
        ["13", "24"],
        "A layer has 4 × 3 = 12 cubes and six layers contain 72.",
      ],
      [
        "A box has base area 12 square centimeters and volume 84 cubic centimeters. What is its height in centimeters?",
        "7",
        ["72", "96"],
        "Volume equals base area times height, so height = 84 ÷ 12 = 7.",
      ],
      [
        "Two non-overlapping rectangular boxes hold 18 and 25 unit cubes. How many unit cubes do they hold together?",
        "43",
        ["7", "450"],
        "Volumes of non-overlapping solids add: 18 + 25 = 43.",
      ],
    ],
  },
  {
    id: "g6_math_unit_rates",
    standard: "6.RP.A.3",
    core: "A unit rate compares quantities per one unit and lets us compare differently sized purchases or journeys fairly.",
    steps: [
      "Identify the two quantities and their units.",
      "Divide to find the amount per one unit.",
      "Use the unit rate to compare or predict, keeping the units attached.",
    ],
    example: [
      "Five identical notebooks cost $15. Find the cost of eight.",
      "15 ÷ 5 = 3 dollars per notebook.",
      "Eight notebooks cost 8 × 3 = 24 dollars.",
      "$24",
    ],
    error: "Comparing total prices without accounting for package size.",
    transfer:
      "Compare rates and explain why an additive comparison is misleading.",
    cases: [
      [
        "A cyclist travels 45 miles in 3 hours at a steady speed. How many miles per hour is that?",
        "15",
        ["42", "135"],
        "Divide miles by hours: 45 ÷ 3 = 15 miles per hour.",
      ],
      [
        "Pack A has 6 markers for $9. Pack B has 8 markers for $10. Which has the lower price per marker?",
        "Pack B",
        ["Pack A", "Both have the same unit price"],
        "A costs $1.50 per marker; B costs $1.25. B has the lower unit price despite the larger total price.",
      ],
      [
        "A machine fills 18 bottles in 4 minutes at a constant rate. How many bottles can it fill in 10 minutes?",
        "45",
        ["24", "180"],
        "The rate is 18 ÷ 4 = 4.5 bottles per minute; in ten minutes it fills 45.",
      ],
    ],
  },
  {
    id: "g7_math_percent",
    standard: "7.RP.A.3",
    core: "A percent change is measured relative to a specified starting quantity. Successive changes may use different bases.",
    steps: [
      "Identify the original quantity that represents 100 percent.",
      "Multiply that base by the percent expressed as a decimal.",
      "Add or subtract the change; check which base any later percent uses.",
    ],
    example: [
      "A $40 game has a 15% discount.",
      "The discount is 0.15 × 40 = 6 dollars.",
      "Subtract the discount: 40 - 6 = 34 dollars.",
      "$34",
    ],
    error:
      "Treating a 20% decrease and a 20% increase as equal amounts when their bases differ.",
    transfer: "Model tax, markup and successive percent changes.",
    cases: [
      [
        "A $60 jacket is discounted by 25%. What is its sale price in dollars?",
        "45",
        ["15", "35"],
        "The discount is one quarter of 60, or 15; the price becomes 60 - 15 = 45.",
      ],
      [
        "A meal costs $25 before a 20% tip. What is the total cost in dollars including the tip?",
        "30",
        ["5", "45"],
        "The tip is 0.20 × 25 = 5, giving a total of 30.",
      ],
      [
        "A price of $100 rises 10% and then falls 10% of the new price. What is the final price in dollars?",
        "99",
        ["100", "90"],
        "The increase gives 110. Ten percent of 110 is 11, so the final price is 99.",
      ],
    ],
  },
  {
    id: "g8_math_systems",
    standard: "8.EE.C.8",
    core: "A solution of a system must satisfy both equations at once. In a context, each equation expresses a separate constraint.",
    steps: [
      "Define what each variable represents.",
      "Use substitution or elimination to combine the two constraints.",
      "Check the resulting values in both original equations.",
    ],
    example: [
      "Solve y = x + 4 and y = 3x.",
      "Both expressions equal y, so x + 4 = 3x and 4 = 2x.",
      "x = 2 gives y = 6 in both equations.",
      "x = 2, y = 6",
    ],
    error: "A point on one line is not necessarily on the other line.",
    transfer:
      "Interpret intersection, parallel lines, and pricing break-even points.",
    cases: [
      [
        "Adult tickets cost $8 and child tickets cost $5. A group buys 6 tickets for $39. How many adult tickets did they buy?",
        "3",
        ["2", "6"],
        "If a + c = 6, then 8a + 5(6 - a) = 39. Thus 3a = 9 and a = 3.",
      ],
      [
        "What can you conclude about y = 2x + 1 and y = 2x - 3?",
        "There is no common solution",
        ["Every point is a solution", "Their intersection has x = 0"],
        "The lines have the same slope but different intercepts, so they never intersect.",
      ],
      [
        "Plan A costs $12 plus $3 per visit. Plan B costs $6 plus $5 per visit. At how many visits do the plans cost the same?",
        "3",
        ["2", "6"],
        "Set 12 + 3v = 6 + 5v. Then 6 = 2v, so v = 3; each plan costs $21.",
      ],
    ],
  },
  {
    id: "g9_math_quadratic_roots",
    standard: "HSA.REI.B.4",
    core: "A quadratic may have two real roots, one repeated real root, or no real roots. Factoring uses a zero product, not a zero sum.",
    steps: [
      "Rewrite the equation with zero on one side.",
      "Factor when possible and set each factor equal to zero.",
      "Interpret both roots in the original context and reject only values the context disallows.",
    ],
    example: [
      "Solve (x - 4)(x + 3) = 0.",
      "A zero product means x - 4 = 0 or x + 3 = 0.",
      "The roots are 4 and -3; both make the original product zero.",
      "4 and -3",
    ],
    error: "Ignoring the negative root just because it is negative.",
    transfer:
      "Distinguish algebraic roots from meaningful physical dimensions.",
    cases: [
      [
        "Which pair contains all solutions of x² - 5x + 6 = 0?",
        "2 and 3",
        ["-2 and -3", "1 and 6"],
        "Factor to (x - 2)(x - 3) = 0; each factor supplies a root.",
      ],
      [
        "A rectangle has width w and length w + 2. Its area is 15 square units. What is its positive width?",
        "3",
        ["5", "-5"],
        "w(w + 2) = 15 gives (w + 5)(w - 3) = 0. Only width 3 is physically meaningful.",
      ],
      [
        "How many real solutions does (x - 7)² = 0 have?",
        "One distinct real solution",
        ["Two distinct real solutions", "No real solutions"],
        "Both identical factors vanish at x = 7, a repeated root but one distinct solution.",
      ],
    ],
  },
  {
    id: "g10_math_similar_triangles",
    standard: "HSG.SRT.B.5",
    core: "Similar figures preserve corresponding angles and length ratios. Their areas scale by the square of the length scale factor.",
    steps: [
      "Match corresponding vertices and sides.",
      "Use a consistent ratio for all corresponding lengths.",
      "Distinguish length scaling from area scaling and justify similarity from sufficient information.",
    ],
    example: [
      "A triangle is enlarged by scale factor 2. Its original area is 9 square units.",
      "Both base and corresponding height double.",
      "The area multiplier is 2 × 2 = 4, so the new area is 36.",
      "36 square units",
    ],
    error:
      "Applying the length factor directly to area, or assuming equal perimeter proves similarity.",
    transfer:
      "Use similarity in indirect measurement and evaluate insufficient evidence.",
    cases: [
      [
        "A 1.5-meter stick casts a 2-meter shadow. At the same time a tree casts an 8-meter shadow on level ground. How tall is the tree in meters?",
        "6",
        ["4", "10.5"],
        "The triangles have matching sunlight angles. The length scale factor is 8/2 = 4, so height is 1.5 × 4 = 6.",
      ],
      [
        "Two similar triangles have corresponding side lengths 3 and 9. The smaller area is 5. What is the larger area?",
        "45",
        ["15", "30"],
        "The length factor is 3, so the area factor is 9. Multiply 5 by 9.",
      ],
      [
        "Which information is sufficient to establish similarity of two triangles?",
        "Two pairs of corresponding angles are equal",
        ["Their perimeters are equal", "One side in each has the same length"],
        "Two angle matches force the third angle to match and establish AA similarity.",
      ],
    ],
  },
];

export function deepenSkill(skill: SkillContent): SkillContent {
  const unit = lessonUnits.find((unit) => unit.id === skill.id);
  if (!unit) return skill;
  const framework =
    skill.subject === "Science"
      ? "NGSS"
      : skill.subject === "Social Studies"
        ? "C3"
        : "CCSS";
  const source =
    framework === "NGSS"
      ? "https://www.nextgenscience.org/search-standards"
      : framework === "C3"
        ? "https://www.socialstudies.org/standards/c3"
        : skill.subject === "Math"
          ? "https://www.thecorestandards.org/Math/"
          : "https://www.thecorestandards.org/ELA-Literacy/";
  return {
    ...skill,
    status: "draft",
    reviewer: null,
    curriculumVersion: "us-lesson-depth-v2",
    provenance: `${skill.provenance} Expanded with original Da Vinci instruction, application, reasoning and transfer tasks; educator review remains pending.`,
    standards: [
      {
        framework,
        reference: unit.standard,
        source,
        alignment: "scope-reference",
      },
    ],
    lesson: {
      coreIdea: unit.core,
      teachingSteps: unit.steps,
      workedExample: {
        prompt: unit.example[0],
        steps: [unit.example[1], unit.example[2]],
        answer: unit.example[3],
      },
      commonError: unit.error,
      transferGoal: unit.transfer,
    },
    questions: [
      ...skill.questions,
      ...unit.cases.map(([prompt, answer, distractors, reason], i) => ({
        role: (["diagnostic", "practice", "mastery"] as const)[i],
        prompt,
        answer,
        choices: [answer, ...distractors],
        explanation: reason,
        context: unit.core,
        hint: unit.steps[Math.min(i, 2)],
        visuals:
          skill.subject === "Math"
            ? []
            : [{ type: "passage", text: prompt, highlights: [] }],
        misconception: { id: `${skill.id}:depth:${i}`, answer: distractors[0] },
      })),
    ],
    misconceptions: [
      ...skill.misconceptions,
      ...unit.cases.map((item, i) => ({
        id: `${skill.id}:depth:${i}`,
        name: unit.error,
        wrongAnswer: item[2][0],
        verification: item[3],
        remediation: ["compare_contrast", "worked_example"],
      })),
    ],
  };
}
