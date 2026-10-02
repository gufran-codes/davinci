import type { SkillContent } from "./schema";

type Item = SkillContent["questions"][number];
type Template = (n: number) => Omit<Item, "role">;
const numeric = (
  prompt: string,
  answer: number | string,
  hint: string,
  explanation: string,
  context = hint,
  visuals: Item["visuals"] = [],
): Omit<Item, "role"> => ({
  prompt,
  answer: String(answer),
  hint,
  explanation,
  context,
  visuals,
  responseType: "short",
});

interface MathScope {
  grade: number;
  slug: string;
  name: string;
  domain: string;
  standard: string;
  objective: string;
  prerequisite?: string;
  terms: string[];
  template: Template;
}
const scopes: MathScope[] = [
  {
    grade: 6,
    slug: "ratios",
    name: "Equivalent ratios",
    domain: "Ratios and proportional relationships",
    standard: "6.RP.A.1",
    terms: ["ratio", "both", "multiply"],
    objective: "Scale both quantities of a ratio by the same factor.",
    template: (n) =>
      numeric(
        `A paint mix uses 2 cups of blue for every 3 cups of white. With ${2 * n} cups of blue, how many cups of white keep the same mix?`,
        3 * n,
        `Find the factor from 2 to ${2 * n}; apply it to 3.`,
        `${2 * n} ÷ 2 = ${n}. Scale both quantities by ${n}: 3 × ${n} = ${3 * n}.`,
        "Keeping a recipe's taste or color means scaling every ingredient equally.",
        [
          {
            type: "table",
            headers: ["Blue (cups)", "White (cups)"],
            rows: [
              ["2", "3"],
              [String(2 * n), "?"],
            ],
          },
        ],
      ),
  },
  {
    grade: 6,
    slug: "unit_rates",
    name: "Unit rates",
    domain: "Ratios and proportional relationships",
    standard: "6.RP.A.2",
    terms: ["per", "divide", "unit"],
    objective: "Calculate a rate per one unit.",
    prerequisite: "g6_math_ratios",
    template: (n) =>
      numeric(
        `${n} notebooks cost $${4 * n}. What is the cost in dollars per notebook?`,
        4,
        `Share the total cost equally among ${n} notebooks.`,
        `${4 * n} ÷ ${n} = 4 dollars per notebook.`,
        "A unit price lets us compare packages of different sizes.",
      ),
  },
  {
    grade: 6,
    slug: "fraction_division",
    name: "Dividing fractions",
    domain: "The number system",
    standard: "6.NS.A.1",
    terms: ["groups", "reciprocal", "divide"],
    objective:
      "Interpret fraction division as the number of groups of a given size.",
    template: (n) =>
      numeric(
        `How many 1/2-cup portions fit in ${n} cups?`,
        2 * n,
        `Each cup contains two half-cup portions.`,
        `${n} ÷ (1/2) = ${n} × 2 = ${2 * n} portions.`,
        "Measure the total with a half-cup scoop; count how many scoops fit.",
      ),
  },
  {
    grade: 6,
    slug: "integers",
    name: "Integers and absolute value",
    domain: "The number system",
    standard: "6.NS.C.7",
    terms: ["distance", "zero", "absolute"],
    objective: "Interpret absolute value as distance from zero.",
    template: (n) =>
      numeric(
        `A submarine is at elevation -${3 * n} meters. What is its distance in meters from sea level?`,
        3 * n,
        "Distance is nonnegative even when the position is below zero.",
        `The absolute value of -${3 * n} is ${3 * n}; it is ${3 * n} units from zero.`,
      ),
  },
  {
    grade: 6,
    slug: "expressions",
    name: "Evaluating expressions",
    domain: "Expressions and equations",
    standard: "6.EE.A.2",
    terms: ["substitute", "multiply", "order"],
    objective:
      "Substitute a value into an expression and follow operation order.",
    template: (n) =>
      numeric(
        `Evaluate 3x + 4 when x = ${n}.`,
        3 * n + 4,
        "Replace x with its value, then multiply before adding.",
        `3 × ${n} + 4 = ${3 * n} + 4 = ${3 * n + 4}.`,
      ),
  },
  {
    grade: 6,
    slug: "one_step_equations",
    name: "One-step equations",
    domain: "Expressions and equations",
    standard: "6.EE.B.7",
    terms: ["equal", "both", "subtract"],
    objective: "Solve an addition equation by maintaining equality.",
    prerequisite: "g6_math_expressions",
    template: (n) =>
      numeric(
        `Solve x + ${n} = ${4 * n}. Give the value of x.`,
        3 * n,
        `Undo adding ${n} by subtracting ${n} from both sides.`,
        `x + ${n} - ${n} = ${4 * n} - ${n}, so x = ${3 * n}. Check: ${3 * n} + ${n} = ${4 * n}.`,
        "Think of equal values on two sides of a balance. The same change preserves equality.",
      ),
  },
  {
    grade: 6,
    slug: "triangle_area",
    name: "Area of triangles",
    domain: "Geometry",
    standard: "6.G.A.1",
    terms: ["base", "height", "half"],
    objective: "Use perpendicular height to find triangle area.",
    template: (n) =>
      numeric(
        `A triangle has base ${2 * n} cm and perpendicular height 5 cm. What is its area in square centimeters?`,
        5 * n,
        "A triangle is half a rectangle with the same base and height.",
        `Area = (${2 * n} × 5) ÷ 2 = ${5 * n} square centimeters.`,
        "Two identical triangles form a parallelogram with twice one triangle's area.",
        [
          {
            type: "geometry",
            shape: "triangle",
            width: 2 * n,
            height: 5,
            label: `Base ${2 * n} cm; perpendicular height 5 cm (schematic)`,
          },
        ],
      ),
  },
  {
    grade: 6,
    slug: "mean",
    name: "Mean as fair share",
    domain: "Statistics and probability",
    standard: "6.SP.B.5",
    terms: ["sum", "divide", "mean"],
    objective: "Calculate and interpret the mean of a small data set.",
    template: (n) =>
      numeric(
        `Four students read ${n}, ${n + 2}, ${n + 4}, and ${n + 6} pages. What is the mean number of pages?`,
        n + 3,
        "Add the four values, then divide by the number of values.",
        `The total is ${4 * n + 12}. Dividing by 4 gives ${n + 3} pages per student.`,
        "Redistribute the total evenly without changing how many pages were read.",
      ),
  },
  {
    grade: 7,
    slug: "proportions",
    name: "Proportional relationships",
    domain: "Ratios and proportional relationships",
    standard: "7.RP.A.2",
    terms: ["constant", "ratio", "per"],
    objective: "Use a constant of proportionality to predict a quantity.",
    prerequisite: "g6_math_unit_rates",
    template: (n) =>
      numeric(
        `A cyclist covers 12 km each hour at constant speed. How far in ${n} hours, in kilometers?`,
        12 * n,
        "Multiply the constant rate by elapsed time.",
        `Distance = rate × time = 12 × ${n} = ${12 * n} km.`,
        "Equal time intervals contribute equal distances.",
        [
          {
            type: "table",
            headers: ["Hours", "Kilometers"],
            rows: [
              ["1", "12"],
              ["2", "24"],
              [String(n), "?"],
            ],
          },
        ],
      ),
  },
  {
    grade: 7,
    slug: "percent",
    name: "Percent change",
    domain: "Ratios and proportional relationships",
    standard: "7.RP.A.3",
    terms: ["percent", "original", "discount"],
    objective: "Find a sale price after a percentage decrease.",
    prerequisite: "g6_math_ratios",
    template: (n) =>
      numeric(
        `A $${20 * n} jacket is discounted by 25%. What is the sale price in dollars?`,
        15 * n,
        "Find one quarter of the original price, then subtract that discount.",
        `25% of ${20 * n} is ${5 * n}. The new price is ${20 * n} - ${5 * n} = $${15 * n}.`,
      ),
  },
  {
    grade: 7,
    slug: "signed_numbers",
    name: "Operations with signed numbers",
    domain: "The number system",
    standard: "7.NS.A.1",
    terms: ["negative", "positive", "zero"],
    objective: "Add signed numbers in a temperature context.",
    prerequisite: "g6_math_integers",
    template: (n) =>
      numeric(
        `The temperature is -${n}°C and rises by ${n + 5}°C. What is the new temperature in °C?`,
        5,
        "Move upward from the starting negative value; cross zero if needed.",
        `-${n} + ${n + 5} = 5. The first ${n} degrees reach zero; 5 more reach 5°C.`,
      ),
  },
  {
    grade: 7,
    slug: "distributive",
    name: "Distributive property",
    domain: "Expressions and equations",
    standard: "7.EE.A.1",
    terms: ["multiply", "each", "distribute"],
    objective: "Apply multiplication to every term inside parentheses.",
    prerequisite: "g6_math_expressions",
    template: (n) =>
      numeric(
        `Expand ${n}(x + 3). What is the constant term in the expanded expression?`,
        3 * n,
        `Multiply ${n} by each term, not just x.`,
        `${n}(x + 3) = ${n}x + ${3 * n}. The constant term is ${3 * n}.`,
      ),
  },
  {
    grade: 7,
    slug: "two_step_equations",
    name: "Two-step equations",
    domain: "Expressions and equations",
    standard: "7.EE.B.4",
    terms: ["subtract", "divide", "both"],
    objective:
      "Undo addition then multiplication to solve a two-step equation.",
    prerequisite: "g6_math_one_step_equations",
    template: (n) =>
      numeric(
        `Solve 3x + 4 = ${3 * n + 4}. Give x.`,
        n,
        "Subtract 4 from both sides, then divide both sides by 3.",
        `3x = ${3 * n + 4} - 4 = ${3 * n}; x = ${3 * n} ÷ 3 = ${n}.`,
        "Undo the operations in reverse order while keeping both sides equal.",
      ),
  },
  {
    grade: 7,
    slug: "scale_drawings",
    name: "Scale drawings",
    domain: "Geometry",
    standard: "7.G.A.1",
    terms: ["scale", "multiply", "corresponding"],
    objective: "Convert a drawing length using a stated scale.",
    prerequisite: "g6_math_ratios",
    template: (n) =>
      numeric(
        `A map scale is 1 cm to 4 km. Two towns are ${n} cm apart on the map. What is their real distance in kilometers?`,
        4 * n,
        "Every centimeter represents the same real-world distance.",
        `${n} × 4 = ${4 * n} km.`,
        "The drawing changes length units but preserves ratios of corresponding distances.",
      ),
  },
  {
    grade: 7,
    slug: "circle_area",
    name: "Area of circles",
    domain: "Geometry",
    standard: "7.G.B.4",
    terms: ["radius", "square", "pi"],
    objective:
      "Use the circle area formula with a specified approximation for pi.",
    template: (n) =>
      numeric(
        `A circle has radius ${n} cm. Using pi = 3.14, find its area in square centimeters.`,
        Number((3.14 * n * n).toFixed(2)),
        "Area uses radius squared, not diameter or circumference.",
        `Area = pi × r² = 3.14 × ${n * n} = ${(3.14 * n * n).toFixed(2)} square centimeters.`,
        "Area measures the surface inside the circle, not the distance around it.",
      ),
  },
  {
    grade: 7,
    slug: "probability",
    name: "Simple probability",
    domain: "Statistics and probability",
    standard: "7.SP.C.7",
    terms: ["favorable", "total", "equally"],
    objective: "Find probability from equally likely outcomes.",
    template: (n) =>
      numeric(
        `A bag has ${n} red and ${n + 2} blue tiles. A tile is chosen at random. What is the probability of red? Give a fraction.`,
        `${n}/${2 * n + 2}`,
        "Count favorable tiles over all tiles, not over only blue tiles.",
        `There are ${n} red tiles out of ${2 * n + 2} total, so the probability is ${n}/${2 * n + 2}.`,
      ),
  },
  {
    grade: 8,
    slug: "exponents",
    name: "Integer exponents",
    domain: "Expressions and equations",
    standard: "8.EE.A.1",
    terms: ["exponent", "add", "base"],
    objective: "Combine powers with the same base.",
    template: (n) =>
      numeric(
        `Write 2^${n} × 2^3 as 2^k. What is k?`,
        n + 3,
        "Multiplying powers joins their repeated factors.",
        `There are ${n} factors of 2 and 3 more, so the exponent is ${n + 3}.`,
      ),
  },
  {
    grade: 8,
    slug: "scientific_notation",
    name: "Scientific notation",
    domain: "Expressions and equations",
    standard: "8.EE.A.3",
    terms: ["power", "ten", "exponent"],
    objective:
      "Interpret scientific notation as multiplication by a power of ten.",
    template: (n) =>
      numeric(
        `Write ${n}.2 × 10^3 as an ordinary number.`,
        n * 1000 + 200,
        "Multiplying by 10³ multiplies by one thousand.",
        `${n}.2 × 1000 = ${n * 1000 + 200}.`,
      ),
  },
  {
    grade: 8,
    slug: "linear_equations",
    name: "Equations with variables on both sides",
    domain: "Expressions and equations",
    standard: "8.EE.C.7",
    terms: ["both", "subtract", "isolate"],
    objective: "Collect variable terms while preserving equality.",
    prerequisite: "g7_math_two_step_equations",
    template: (n) =>
      numeric(
        `Solve 5x + 2 = 2x + ${3 * n + 2}. Give x.`,
        n,
        "Subtract 2x from both sides, then undo the remaining addition and multiplication.",
        `3x + 2 = ${3 * n + 2}; 3x = ${3 * n}; x = ${n}.`,
      ),
  },
  {
    grade: 8,
    slug: "slope",
    name: "Slope from two points",
    domain: "Functions",
    standard: "8.EE.B.5",
    terms: ["rise", "run", "change"],
    objective: "Calculate a rate of change from coordinate differences.",
    prerequisite: "g7_math_proportions",
    template: (n) =>
      numeric(
        `A line passes through (1, 2) and (3, ${2 + 2 * n}). What is its slope?`,
        n,
        "Divide the change in y by the change in x, using the same point order.",
        `Slope = (${2 + 2 * n} - 2) ÷ (3 - 1) = ${2 * n} ÷ 2 = ${n}.`,
        "Slope is how much y changes for a one-unit increase in x.",
        [
          {
            type: "table",
            headers: ["x", "y"],
            rows: [
              ["1", "2"],
              ["3", String(2 + 2 * n)],
            ],
          },
        ],
      ),
  },
  {
    grade: 8,
    slug: "functions",
    name: "Linear function values",
    domain: "Functions",
    standard: "8.F.A.2",
    terms: ["input", "output", "substitute"],
    objective: "Evaluate a linear function rule.",
    prerequisite: "g6_math_expressions",
    template: (n) =>
      numeric(
        `A function has rule y = 2x - 3. Find y when x = ${n}.`,
        2 * n - 3,
        "Insert the input for x and follow the rule in order.",
        `y = 2 × ${n} - 3 = ${2 * n - 3}.`,
      ),
  },
  {
    grade: 8,
    slug: "systems",
    name: "Systems of linear equations",
    domain: "Expressions and equations",
    standard: "8.EE.C.8",
    terms: ["substitute", "both", "intersection"],
    objective: "Find a value satisfying two equations together.",
    prerequisite: "g8_math_linear_equations",
    template: (n) =>
      numeric(
        `The equations are y = x + ${n} and y = 2x. What is x at their intersection?`,
        n,
        "At the intersection both expressions give the same y, so set them equal.",
        `x + ${n} = 2x. Subtract x to get x = ${n}; both equations then give y = ${2 * n}.`,
      ),
  },
  {
    grade: 8,
    slug: "pythagorean",
    name: "Pythagorean theorem",
    domain: "Geometry",
    standard: "8.G.B.7",
    terms: ["square", "hypotenuse", "root"],
    objective: "Find the hypotenuse of a right triangle.",
    template: (n) =>
      numeric(
        `A right triangle has legs ${3 * n} cm and ${4 * n} cm. Find its hypotenuse in centimeters.`,
        5 * n,
        "Add the squares of the two legs, then take the positive square root.",
        `c² = ${9 * n * n} + ${16 * n * n} = ${25 * n * n}; c = ${5 * n} cm.`,
      ),
  },
  {
    grade: 8,
    slug: "dilations",
    name: "Dilations and similarity",
    domain: "Geometry",
    standard: "8.G.A.4",
    terms: ["factor", "corresponding", "multiply"],
    objective: "Apply a dilation scale factor to a length.",
    prerequisite: "g7_math_scale_drawings",
    template: (n) =>
      numeric(
        `A triangle has a side of ${n} cm. A dilation centered at a point uses scale factor 3. What is the corresponding side length in centimeters?`,
        3 * n,
        "A dilation multiplies every distance from its center by the scale factor.",
        `The side length becomes ${n} × 3 = ${3 * n} cm.`,
      ),
  },
  {
    grade: 9,
    slug: "linear_models",
    name: "Building linear models",
    domain: "Algebra I",
    standard: "HSA.CED.A.1",
    terms: ["fixed", "rate", "variable"],
    objective: "Evaluate a model with a fixed charge and a variable rate.",
    prerequisite: "g8_math_functions",
    template: (n) =>
      numeric(
        `A taxi charges $5 plus $3 per mile. What is the cost in dollars for ${n} miles?`,
        5 + 3 * n,
        "Separate the fixed charge from the amount that changes with distance.",
        `Cost = 5 + 3 × ${n} = $${5 + 3 * n}.`,
      ),
  },
  {
    grade: 9,
    slug: "inequalities",
    name: "Solving inequalities",
    domain: "Algebra I",
    standard: "HSA.REI.B.3",
    terms: ["negative", "reverse", "divide"],
    objective: "Reverse an inequality when dividing by a negative number.",
    prerequisite: "g8_math_linear_equations",
    template: (n) =>
      numeric(
        `Solve -2x < -${2 * n}. Choose the correct solution.`,
        `x > ${n}`,
        "Dividing by a negative reverses the inequality direction.",
        `Divide both sides by -2 and reverse <: x > ${n}.`,
        "Try one value on each side of the boundary to check which makes the original inequality true.",
        [],
      ),
  },
  {
    grade: 9,
    slug: "factoring",
    name: "Factoring a common factor",
    domain: "Algebra I",
    standard: "HSA.SSE.A.2",
    terms: ["common", "factor", "distribute"],
    objective: "Extract a common factor from an algebraic expression.",
    prerequisite: "g7_math_distributive",
    template: (n) =>
      numeric(
        `Factor ${n}x + ${4 * n} as ${n}(x + k). What is k?`,
        4,
        `Divide each term by the outside factor ${n}.`,
        `${n}x + ${4 * n} = ${n}(x + 4), so k = 4.`,
      ),
  },
  {
    grade: 9,
    slug: "quadratic_roots",
    name: "Quadratic roots from factors",
    domain: "Algebra I",
    standard: "HSA.REI.B.4",
    terms: ["zero", "factor", "product"],
    objective: "Apply the zero-product property.",
    prerequisite: "g9_math_factoring",
    template: (n) =>
      numeric(
        `For (x - ${n})(x + 2) = 0, what is the positive solution?`,
        n,
        "A product is zero when at least one factor is zero.",
        `x - ${n} = 0 gives x = ${n}; x + 2 = 0 gives -2. The positive solution is ${n}.`,
      ),
  },
  {
    grade: 9,
    slug: "exponential",
    name: "Exponential growth",
    domain: "Algebra I",
    standard: "HSF.LE.A.1",
    terms: ["factor", "multiply", "exponential"],
    objective: "Distinguish repeated multiplication from repeated addition.",
    prerequisite: "g8_math_exponents",
    template: (n) =>
      numeric(
        `A culture starts with ${n} cells and doubles each hour. How many cells after 3 hours?`,
        8 * n,
        "Apply the factor of 2 three times, not an addition of 2 three times.",
        `${n} × 2 × 2 × 2 = ${8 * n}.`,
      ),
  },
  {
    grade: 9,
    slug: "arithmetic_sequences",
    name: "Arithmetic sequences",
    domain: "Algebra I",
    standard: "HSF.BF.A.2",
    terms: ["difference", "term", "add"],
    objective: "Use a constant difference to extend a sequence.",
    prerequisite: "g8_math_functions",
    template: (n) =>
      numeric(
        `A sequence starts ${n}, ${n + 3}, ${n + 6}. What is its sixth term if the pattern continues?`,
        n + 15,
        "From the first term to the sixth there are five equal jumps.",
        `Each jump adds 3. Term 6 is ${n} + 5 × 3 = ${n + 15}.`,
      ),
  },
  {
    grade: 9,
    slug: "function_notation",
    name: "Function notation",
    domain: "Algebra I",
    standard: "HSF.IF.A.2",
    terms: ["input", "substitute", "function"],
    objective: "Evaluate a quadratic function using function notation.",
    prerequisite: "g8_math_functions",
    template: (n) =>
      numeric(
        `If f(x) = x² - 1, what is f(${n})?`,
        n * n - 1,
        "The number inside f( ) is the input, not a multiplier.",
        `f(${n}) = ${n}² - 1 = ${n * n - 1}.`,
      ),
  },
  {
    grade: 9,
    slug: "residuals",
    name: "Residuals in data models",
    domain: "Statistics",
    standard: "HSS.ID.B.6",
    terms: ["observed", "predicted", "difference"],
    objective: "Calculate residual as observed minus predicted.",
    prerequisite: "g6_math_mean",
    template: (n) =>
      numeric(
        `A model predicts ${10 + n} points, but the observed value is ${13 + n}. What is the residual (observed minus predicted)?`,
        3,
        "Keep the subtraction order: observed value first.",
        `${13 + n} - ${10 + n} = 3; the observation is 3 above the prediction.`,
      ),
  },
  {
    grade: 10,
    slug: "triangle_angles",
    name: "Triangle angle relationships",
    domain: "Geometry",
    standard: "HSG.CO.C.10",
    terms: ["sum", "180", "angles"],
    objective: "Use the interior-angle sum of a triangle.",
    template: (n) =>
      numeric(
        `Two interior angles of a triangle are ${20 + n}° and 60°. What is the third angle in degrees?`,
        100 - n,
        "The three interior angles total 180°.",
        `180 - (${20 + n} + 60) = ${100 - n}°.`,
      ),
  },
  {
    grade: 10,
    slug: "similar_triangles",
    name: "Similarity and corresponding sides",
    domain: "Geometry",
    standard: "HSG.SRT.B.5",
    terms: ["corresponding", "ratio", "scale"],
    objective: "Use a common scale factor between similar triangles.",
    prerequisite: "g8_math_dilations",
    template: (n) =>
      numeric(
        `Similar triangles have corresponding sides 4 cm and 12 cm. Another side of the smaller triangle is ${n} cm. Find its corresponding larger side in centimeters.`,
        3 * n,
        "Use larger divided by smaller to find the common scale factor.",
        `12 ÷ 4 = 3, so the corresponding side is ${n} × 3 = ${3 * n} cm.`,
      ),
  },
  {
    grade: 10,
    slug: "right_triangle_ratios",
    name: "Trigonometric ratios",
    domain: "Geometry",
    standard: "HSG.SRT.C.6",
    terms: ["opposite", "hypotenuse", "sine"],
    objective: "Identify sine as opposite over hypotenuse.",
    prerequisite: "g8_math_pythagorean",
    template: (n) =>
      numeric(
        `For an acute angle in a right triangle, the opposite side is ${3 * n} and the hypotenuse is ${5 * n}. What is the sine of that angle? Give a fraction.`,
        "3/5",
        "Match the named sides to sine = opposite ÷ hypotenuse.",
        `sin(angle) = ${3 * n}/${5 * n} = 3/5.`,
      ),
  },
  {
    grade: 10,
    slug: "distance",
    name: "Distance on the coordinate plane",
    domain: "Geometry",
    standard: "HSG.GPE.B.7",
    terms: ["horizontal", "vertical", "pythagorean"],
    objective: "Use coordinate differences to calculate distance.",
    prerequisite: "g8_math_pythagorean",
    template: (n) =>
      numeric(
        `Find the distance from (0, 0) to (${3 * n}, ${4 * n}).`,
        5 * n,
        "The horizontal and vertical changes are legs of a right triangle.",
        `Distance = √((${3 * n})² + (${4 * n})²) = ${5 * n}.`,
      ),
  },
  {
    grade: 10,
    slug: "midpoint",
    name: "Midpoints",
    domain: "Geometry",
    standard: "HSG.GPE.B.6",
    terms: ["average", "coordinates", "midpoint"],
    objective:
      "Find a midpoint coordinate by averaging corresponding coordinates.",
    template: (n) =>
      numeric(
        `A segment joins (${n}, 2) and (${n + 6}, 8). What is the x-coordinate of its midpoint?`,
        n + 3,
        "Average the two x-coordinates; do not mix x and y.",
        `Midpoint x = (${n} + ${n + 6}) ÷ 2 = ${n + 3}.`,
      ),
  },
  {
    grade: 10,
    slug: "arcs",
    name: "Arc length",
    domain: "Geometry",
    standard: "HSG.C.B.5",
    terms: ["fraction", "circumference", "angle"],
    objective: "Calculate arc length as a fraction of circumference.",
    prerequisite: "g7_math_circle_area",
    template: (n) =>
      numeric(
        `A circle has circumference ${8 * n} cm. What is the length in centimeters of a 90° arc?`,
        2 * n,
        "Compare the central angle with a full turn of 360°.",
        `90/360 = 1/4, so the arc is ${8 * n} ÷ 4 = ${2 * n} cm.`,
      ),
  },
  {
    grade: 10,
    slug: "cylinder_volume",
    name: "Cylinder volume",
    domain: "Geometry",
    standard: "HSG.GMD.A.3",
    terms: ["base", "height", "volume"],
    objective: "Multiply circular base area by perpendicular height.",
    prerequisite: "g7_math_circle_area",
    template: (n) =>
      numeric(
        `A cylinder has radius 2 cm and height ${n} cm. Using pi = 3.14, find its volume in cubic centimeters.`,
        Number((12.56 * n).toFixed(2)),
        "First find the circular base area; then multiply by height.",
        `Volume = 3.14 × 2² × ${n} = ${(12.56 * n).toFixed(2)} cubic centimeters.`,
      ),
  },
  {
    grade: 10,
    slug: "conditional_probability",
    name: "Conditional probability",
    domain: "Statistics",
    standard: "HSS.CP.A.3",
    terms: ["restricted", "given", "total"],
    objective: "Restrict the sample space when a condition is given.",
    prerequisite: "g7_math_probability",
    template: (n) =>
      numeric(
        `A club has ${2 * n} seniors, of whom ${n} study art, and 10 juniors. Given that a selected member is a senior, what is the probability they study art?`,
        "1/2",
        "The condition excludes juniors from the denominator.",
        `Among seniors, ${n} out of ${2 * n} study art, so P(art | senior) = 1/2.`,
      ),
  },
];

export const secondaryMath: SkillContent[] = scopes.map((s) => ({
  id: `g${s.grade}_math_${s.slug}`,
  name: s.name,
  grade: s.grade,
  subject: "Math",
  domain: s.domain,
  topic: s.name,
  objective: s.objective,
  prerequisites: s.prerequisite ? [s.prerequisite] : [],
  strategies: ["guided_questioning", "symbolic_first", "worked_example"],
  misconceptions: [],
  standards: [
    {
      framework: "CCSS",
      reference: s.standard,
      source: `https://www.thecorestandards.org/Math/Content/${s.grade < 9 ? s.grade : s.standard.split(".")[0]}/`,
      alignment: "scope-reference",
    },
  ],
  status: "draft",
  reviewer: null,
  provenance:
    "Original Da Vinci practice authored against US scope references. Automated arithmetic checks are not educator review or complete standards alignment.",
  curriculumVersion: "us-secondary-v1",
  questions: [2, 3, 4, 5, 6, 7].map((n, i) => ({
    ...s.template(n),
    role: (["diagnostic", "practice", "mastery"] as const)[i % 3],
  })),
  glossary: {
    [s.name.toLowerCase()]: s.objective,
    equation: "An equation states that two expressions have the same value.",
    variable:
      "A variable is a symbol representing a quantity that can vary or be unknown.",
    coefficient: "A coefficient multiplies a variable.",
    ratio: "A ratio compares quantities multiplicatively.",
    function:
      "A function assigns exactly one output to each input in its domain.",
  },
  rubric: {
    criteria: [
      {
        id: "relationship",
        description: s.objective,
        terms: s.terms,
        weight: 1,
      },
      {
        id: "reason",
        description: "Connect a mathematical step to a justification.",
        terms: ["because", "so", "therefore", "means"],
        weight: 1,
      },
    ],
    minScore: 0.75,
    counterEvidence: [],
    sampleExplanation: s.template(2).explanation,
  },
}));
