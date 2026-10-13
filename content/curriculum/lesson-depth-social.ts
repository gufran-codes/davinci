import type { Unit } from "./lesson-depth";

// Cases are original classroom scenarios, not quotations or purported archival records.
export const socialDepth: Unit[] = [
  {
    id: "g1_social_studies_rules",
    standard: "C3 D2.Civ.3.K-2",
    core: "Community rules can help people share spaces safely and fairly. We can discuss a rule's purpose and how it affects different people.",
    steps: [
      "Name the shared space or activity.",
      "Identify the problem the rule addresses.",
      "Explain how following the rule affects other people.",
    ],
    example: [
      "A class takes turns at one drinking fountain. Why might that rule help?",
      "Only one person can comfortably use the fountain at a time.",
      "Taking turns gives others a chance and reduces pushing.",
      "It helps people share safely",
    ],
    error: "Thinking a rule's only purpose is to stop people from having fun.",
    transfer: "Explain the purpose of a rule in a different shared space.",
    cases: [
      [
        "In a classroom, students put blocks away so nobody trips. What is one purpose of this rule?",
        "Keeping the floor safe",
        ["Making blocks disappear", "Stopping everyone from learning"],
        "Putting blocks away reduces a hazard for people walking through the room.",
      ],
      [
        "Two children want one swing. Which plan gives both a turn?",
        "Agree on turns and switch",
        ["One child keeps it all day", "Hide the swing from everyone"],
        "Taking turns shares access rather than excluding one child.",
      ],
      [
        "A new classroom rule is hard for some students to follow. What is a useful first response?",
        "Ask what is difficult and discuss a fair solution",
        [
          "Assume every student is being unkind",
          "Never listen to anyone affected",
        ],
        "Understanding the difficulty helps the group consider a workable and fair response.",
      ],
    ],
  },
  {
    id: "g2_social_studies_maps",
    standard: "C3 D2.Geo.1.K-2",
    core: "A map represents places using symbols, relative positions and a key. It leaves out many real-world details to make selected information easier to use.",
    steps: [
      "Read the key before interpreting a symbol.",
      "Use the compass directions and relative positions.",
      "Explain what the map can and cannot tell us.",
    ],
    example: [
      "A map key says a star marks the school. A park is west of the star. Where is the park relative to the school?",
      "The star stands for the school.",
      "The stated direction places the park west of the school.",
      "West",
    ],
    error: "Assuming a symbol's meaning without consulting the key.",
    transfer: "Use a new map key and explain the limits of a simple map.",
    cases: [
      [
        "A map key says a blue line represents a river. What does a blue line on that map mean?",
        "A river",
        ["Every road", "A mountain"],
        "The key defines the symbol for this map.",
      ],
      [
        "On a town map, the library is north of the school. From the school, in which direction is the library?",
        "North",
        ["South", "West"],
        "The map description directly places the library north of the starting location.",
      ],
      [
        "A simple map marks a park and a school but gives no distances. What can you not determine from those labels alone?",
        "The exact distance between them",
        ["That both places are marked", "Which label names the school"],
        "Exact distance requires a scale or distance information, which the description does not supply.",
      ],
    ],
  },
  {
    id: "g3_social_studies_needs_choices",
    standard: "C3 D2.Eco.1.3-5",
    core: "Scarcity means resources cannot meet every want at once. Choosing one use can mean giving up another valuable use, called an opportunity cost.",
    steps: [
      "Identify the limited resource.",
      "List the feasible choices rather than every imagined choice.",
      "Name the best alternative given up when one choice is made.",
    ],
    example: [
      "A class can spend its last $10 on a game or a book, but not both. It chooses the book.",
      "The budget makes the two purchases alternatives.",
      "If the game was the best other choice, giving up the game is the opportunity cost.",
      "The game the class gives up",
    ],
    error:
      "Calling every possible alternative the opportunity cost instead of the best forgone alternative.",
    transfer:
      "Recognize that limited time, not only money, creates trade-offs.",
    cases: [
      [
        "You have 30 minutes and can either play a game or finish a drawing. You choose the drawing. If the game was your best other option, what is the opportunity cost?",
        "The game time you give up",
        ["The finished drawing", "Every game ever made"],
        "Opportunity cost is the best alternative forgone, here playing during those minutes.",
      ],
      [
        "A school has one field and two teams want it at the same time. Which resource is scarce in this situation?",
        "Field space at that time",
        ["All air in the town", "The names of the teams"],
        "There is insufficient field access to satisfy both requests at once.",
      ],
      [
        "A club budget can buy 4 books or 2 balls. It buys the books. Which question helps identify its opportunity cost?",
        "What was the best alternative use of the budget?",
        ["What color is the receipt?", "How many letters are in book?"],
        "The cost of the choice includes the value of the best alternative use given up.",
      ],
    ],
  },
  {
    id: "g4_social_studies_sources",
    standard: "C3 D2.His.10.3-5; D3.2.3-5",
    core: "Historical sources answer different questions depending on who made them, when and why. A source can be useful without being complete or neutral.",
    steps: [
      "Identify the source's creator, date and purpose.",
      "Connect its contents to the question being investigated.",
      "Compare another source to check or supplement its account.",
    ],
    example: [
      "A fictional diary records a child's experience of moving towns. What can it help a historian study?",
      "It provides one person's account of that experience.",
      "It does not by itself establish what every family experienced.",
      "One child's perspective on moving",
    ],
    error:
      "Assuming an eyewitness knows everything or that a personal viewpoint makes a source useless.",
    transfer: "Choose a source suited to a specific historical question.",
    cases: [
      [
        "For a classroom investigation of a town's past, which source most directly records how many people were counted?",
        "A population count made at that time",
        ["A modern drawing of a castle", "A fictional story set elsewhere"],
        "The population record was created to count people, making it relevant to the numerical question.",
      ],
      [
        "A fictional shopkeeper's diary praises a new road. What should a reader consider?",
        "The road may benefit the shopkeeper's business",
        [
          "Personal experience makes every sentence false",
          "One diary establishes everyone's opinion",
        ],
        "The writer's position can shape the perspective; the account remains evidence but is not everyone's view.",
      ],
      [
        "Two accounts describe the same event differently. What would help investigate the difference?",
        "Compare their dates, creators and supporting details",
        [
          "Choose whichever has the nicest handwriting",
          "Discard both without reading",
        ],
        "Source information and corroborating details help explain and evaluate the differing accounts.",
      ],
    ],
  },
  {
    id: "g5_social_studies_government",
    standard: "C3 D2.Civ.13.3-5",
    core: "Public decisions involve responsibilities, resources and the people affected. Evaluating a proposal means considering evidence and trade-offs, not only whether we like it.",
    steps: [
      "Identify the public problem and the decision-maker's role.",
      "Compare the proposed solutions and their likely effects.",
      "Use evidence and explain whose needs may be affected differently.",
    ],
    example: [
      "A fictional town can repair a bridge or build a new sports court this year.",
      "The town should compare safety needs, costs and community benefits.",
      "A decision needs reasons about the problem and limited resources, not just popularity.",
      "Compare evidence and trade-offs",
    ],
    error: "Assuming the most popular proposal has no costs or disadvantages.",
    transfer:
      "Evaluate an unfamiliar public proposal using benefits, costs and affected groups.",
    cases: [
      [
        "A town is deciding where to place a crossing. Which evidence is most useful for safety planning?",
        "Traffic and pedestrian counts at possible locations",
        ["The mayor's favorite color", "The length of the street names"],
        "Counts help identify where people encounter traffic and where a crossing may be useful.",
      ],
      [
        "A park proposal costs more than the available budget. What is a relevant response?",
        "Compare a smaller design and other funding choices",
        ["Pretend the cost does not exist", "Assume all other needs disappear"],
        "Considering feasible alternatives acknowledges limited resources and competing needs.",
      ],
      [
        "A new bus route helps one neighborhood but removes service from another. What should an evaluation include?",
        "Effects on people in both neighborhoods",
        [
          "Only the benefits to the first neighborhood",
          "Only the color of the buses",
        ],
        "A complete evaluation considers both the added access and the access being lost.",
      ],
    ],
  },
  {
    id: "g6_social_studies_sources",
    standard: "C3 D2.His.10.6-8; D3.1.6-8",
    core: "Sourcing asks how a document's origin, purpose and context affect what it can support. Proximity to an event and independence from other accounts are different strengths.",
    steps: [
      "Identify when, by whom and for whom a source was produced.",
      "Specify the claim the source is being used to support.",
      "Evaluate the source's access to information and compare independent evidence.",
    ],
    example: [
      "A fictional merchant's letter describes a port closure and complains about lost sales.",
      "The merchant has direct knowledge of their own trade and a reason to oppose the closure.",
      "The letter can inform economic effects but cannot alone establish effects on every group.",
      "Useful situated evidence, not a complete account",
    ],
    error:
      "Treating primary sources as automatically accurate or biased sources as automatically worthless.",
    transfer:
      "Select sources by relevance, perspective and access to evidence.",
    cases: [
      [
        "A fictional official's report calls a tax successful; a farmer's letter describes hardship from the same tax. What is the best next step?",
        "Compare their evidence, purposes and groups represented",
        [
          "Accept the official automatically",
          "Assume one account must be entirely invented",
        ],
        "Different effects and perspectives may explain the contrast; each claim requires evidence.",
      ],
      [
        "Three websites repeat the same unnamed newspaper report. How many clearly independent accounts does that establish?",
        "One underlying account",
        ["Three independent eyewitnesses", "No possible information at all"],
        "Repeated publication does not create independent origins for the underlying claim.",
      ],
      [
        "Which source is most directly relevant to the prices charged in a particular shop in a particular year?",
        "That shop's dated sales ledger",
        [
          "A modern novel about a different region",
          "An undated sketch of a ship",
        ],
        "The ledger records transactions at the place and time of the question.",
      ],
    ],
  },
  {
    id: "g7_social_studies_trade",
    standard: "C3 D2.Eco.1.6-8; D2.Eco.14.6-8",
    core: "Trade can benefit participants with different resources or production costs, but its benefits and costs may be distributed unevenly. Transport and opportunity costs affect choices.",
    steps: [
      "Identify what each participant can produce and what they want.",
      "Compare what must be given up to produce an alternative.",
      "Explain potential gains from exchange and relevant limits or costs.",
    ],
    example: [
      "Village A grows grain efficiently while village B has skilled potters. Why might they trade?",
      "Each can exchange part of its output for something it values.",
      "Both may gain if exchange terms and transport costs are acceptable.",
      "Exchange can provide mutually valued goods",
    ],
    error:
      "Assuming trade benefits every person equally or that transport is costless.",
    transfer:
      "Analyze how a transport change alters the feasibility and effects of trade.",
    cases: [
      [
        "A bridge reduces the cost of moving grain between two towns. What is one plausible economic effect, other things equal?",
        "More exchanges may become worthwhile",
        [
          "Every price must become zero",
          "Transport costs no longer exist anywhere",
        ],
        "Lower transport costs can make exchanges attractive that were previously too costly.",
      ],
      [
        "A town imports cheaper cloth. Buyers benefit, but some local weavers lose sales. Which conclusion fits both facts?",
        "Trade can have different effects on different groups",
        [
          "Everyone benefits by exactly the same amount",
          "No buyer can benefit from imports",
        ],
        "Consumer gains and competitive pressures on producers can occur together.",
      ],
      [
        "Making one canoe requires a workshop to forgo two baskets. What are those two baskets in this production choice?",
        "The opportunity cost of the canoe",
        [
          "A guarantee of the canoe's sale price",
          "Goods created without resources",
        ],
        "The baskets are the alternative output forgone when resources are used for the canoe.",
      ],
    ],
  },
  {
    id: "g8_social_studies_constitution",
    standard: "C3 D2.Civ.4.6-8",
    core: "The US constitutional system divides national powers among branches and includes checks on their exercise. Distinguish making law, carrying it out and deciding legal disputes.",
    steps: [
      "Identify the government action being described.",
      "Connect that action to a branch's constitutional role.",
      "Explain how a relevant check limits unilateral action.",
    ],
    example: [
      "Congress passes a bill and the president vetoes it. What relationship does this illustrate?",
      "Congress exercises legislative authority while the president can reject the bill.",
      "The veto is a check on legislation; the Constitution also provides a congressional override process.",
      "A check between branches",
    ],
    error: "Assuming separation of powers means the branches never interact.",
    transfer: "Explain a constitutional check in a new institutional scenario.",
    cases: [
      [
        "Which branch of the US federal government passes federal legislation?",
        "Congress, the legislative branch",
        [
          "The executive branch acting alone",
          "The judicial branch writing every statute",
        ],
        "The Constitution assigns federal legislative powers to Congress.",
      ],
      [
        "Why is a presidential veto an example of checks and balances?",
        "It lets one branch limit an action of another",
        [
          "It abolishes Congress permanently",
          "It removes all constitutional limits",
        ],
        "The executive can check legislation, within a system that also permits a congressional override.",
      ],
      [
        "A court decides whether a government action conflicts with the Constitution. Which function is being exercised?",
        "Judicial review",
        ["Conducting an election campaign", "Printing all legislative bills"],
        "Judicial review examines government action against constitutional requirements.",
      ],
    ],
  },
  {
    id: "g9_social_studies_corroboration",
    standard: "C3 D3.1.9-12; D3.2.9-12",
    core: "Corroboration compares sources with attention to independence, perspective and evidentiary quality. Agreement is more informative when accounts do not merely copy one another.",
    steps: [
      "Break a historical claim into details that sources could verify.",
      "Trace whether accounts have independent origins and relevant access.",
      "State the strongest supported conclusion and remaining uncertainty.",
    ],
    example: [
      "Two fictional newspapers quote one official statement about a factory closure.",
      "Their matching claims share one origin rather than two investigations.",
      "An independent employment record could corroborate the closure without relying on the same statement.",
      "Check independent records",
    ],
    error: "Counting copies of the same claim as independent confirmations.",
    transfer:
      "Build a defensible conclusion from sources that agree only partly.",
    cases: [
      [
        "A fictional memoir written decades later conflicts with a dated payroll record about an employment date. What should a historian compare?",
        "Each source's purpose, timing and access to the specific fact",
        ["Only which source is longer", "Only whether the authors are famous"],
        "A record close to the event may be strong for dates, while the memoir may illuminate remembered experience; claims must be evaluated specifically.",
      ],
      [
        "Four accounts share the same unusual error and wording. What should a researcher investigate?",
        "Whether the accounts depend on a common source",
        [
          "Whether repetition makes the error true",
          "Whether matching words prove four eyewitnesses",
        ],
        "Shared wording and errors may reveal copying rather than independent corroboration.",
      ],
      [
        "Two independent records confirm a protest occurred but disagree about crowd size. Which conclusion is currently best supported?",
        "The protest occurred, while its size remains uncertain",
        [
          "The largest estimate must be exact",
          "No protest could have occurred",
        ],
        "Agreement supports the occurrence; the unresolved numerical disagreement should remain qualified.",
      ],
    ],
  },
  {
    id: "g10_social_studies_data_claims",
    standard: "C3 D3.1.9-12; D3.3.9-12",
    core: "Social data support claims only within their definitions, samples and measurement limits. Rates, totals and causal conclusions answer different questions.",
    steps: [
      "Identify what is counted, the population and the time period.",
      "Choose a fair denominator or comparison group.",
      "Distinguish an observed association from a causal conclusion and state uncertainty.",
    ],
    example: [
      "Town A has 20 events among 1,000 residents; town B has 30 among 3,000. Compare events per 1,000 residents.",
      "A has 20 per 1,000 and B has 10 per 1,000.",
      "B has a larger total but a lower population-adjusted rate.",
      "Town A has the higher rate",
    ],
    error:
      "Using a larger total to infer a higher rate without considering population size.",
    transfer:
      "Evaluate a public claim using denominators, sampling and plausible alternative explanations.",
    cases: [
      [
        "City A has 50 library visits per day among 1,000 residents. City B has 80 among 4,000. Which has more visits per 1,000 residents?",
        "City A",
        ["City B", "They have equal rates"],
        "A has 50 per 1,000; B has 80/4 = 20. The larger total in B does not imply a larger rate.",
      ],
      [
        "An online voluntary poll reports 90% support for a policy. What most limits generalizing that result to all residents?",
        "Participants may differ systematically from nonparticipants",
        [
          "Percentages are never meaningful",
          "The result guarantees unanimous support",
        ],
        "Self-selection can produce a sample unrepresentative of the whole population.",
      ],
      [
        "A town's unemployment fell after a training program began, during a wider regional hiring boom. What is needed before attributing the fall to the program alone?",
        "Evidence separating program effects from the regional trend",
        ["A slogan praising the program", "The name of the training building"],
        "The regional change is a plausible alternative influence that the causal claim must address.",
      ],
    ],
  },
];
