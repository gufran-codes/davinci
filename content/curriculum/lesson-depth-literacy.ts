import type { Unit } from "./lesson-depth";

export const literacyDepth: Unit[] = [
  {
    id: "g1_english_sequence",
    standard: "RL.1.3",
    core: "A story's events happen in an order. Following what a character does first, next and last helps us explain the story.",
    steps: [
      "Name the character and what they want.",
      "Track each action in the order it happens.",
      "Retell the beginning, middle and end using details from the text.",
    ],
    example: [
      "Mina found a seed. She planted it. Later a shoot appeared. Retell the order.",
      "Finding the seed comes before planting it.",
      "The shoot appears after the seed is planted.",
      "Find, plant, grow",
    ],
    error:
      "Choosing the most exciting event rather than the event that happened first.",
    transfer: "Use sequence words to explain an unfamiliar short story.",
    cases: [
      [
        "Leo put on his boots, opened the door, and splashed in a puddle. What did he do first?",
        "Put on his boots",
        ["Opened the door", "Splashed in a puddle"],
        "The boots are mentioned before the door and the puddle.",
      ],
      [
        "A bird gathered twigs. Then it made a nest. Finally it rested inside. What happened after gathering twigs?",
        "It made a nest",
        ["It rested inside", "It flew away"],
        "The word then places making the nest next.",
      ],
      [
        "Nia wanted to send a card. She drew a picture, wrote a message, and mailed it. Which sentence retells the ending?",
        "Nia sent the card",
        ["Nia began her picture", "Nia decided to write"],
        "Mailing the finished card is the final action.",
      ],
    ],
  },
  {
    id: "g2_english_main_idea",
    standard: "RI.2.2",
    core: "The main topic tells what a whole informational passage is about. Details explain parts of that topic but are not the whole topic.",
    steps: [
      "Notice what most sentences discuss.",
      "Group related details under a shared topic.",
      "Choose a topic broad enough to include the important details.",
    ],
    example: [
      "Owls have strong claws. Their eyes help them see in dim light. Their wings can be quiet. Name the topic.",
      "Every detail describes an owl feature.",
      "The topic is owl features, not only eyes or wings.",
      "Features of owls",
    ],
    error: "Using one interesting detail as the topic of the whole passage.",
    transfer: "Distinguish the topic of a paragraph from one supporting fact.",
    cases: [
      [
        "Roots hold a plant in the ground. They also take in water. What is this passage mainly about?",
        "What roots do",
        ["How flowers look", "The color of soil"],
        "Both sentences describe jobs performed by roots.",
      ],
      [
        "A town library lends books. It also lends music and holds story time. Which title fits the whole passage?",
        "What a Library Offers",
        ["One Blue Book", "How Music Is Made"],
        "The title includes all three library services.",
      ],
      [
        "Penguins have feathers that help keep them warm. Many huddle together in cold weather. Which detail belongs in this passage?",
        "A layer of fat also helps them stay warm",
        ["Some stones are smooth", "Boats have anchors"],
        "The added detail supports the shared topic of keeping warm.",
      ],
    ],
  },
  {
    id: "g3_english_inference",
    standard: "RL.3.3",
    core: "Readers infer a character's feelings or traits from actions, words and consequences. An inference needs a detail that actually supports it.",
    steps: [
      "Find what the character says or does.",
      "Explain what that detail suggests.",
      "Check that the inference fits rather than contradicts the text.",
    ],
    example: [
      "Ari gave his last umbrella to a neighbor and walked home in the rain. What trait is supported?",
      "Giving away his only umbrella helps someone else at a cost to himself.",
      "That action supports generosity rather than selfishness.",
      "Generosity",
    ],
    error: "Inventing a feeling or motive that no story detail supports.",
    transfer: "Compare two possible inferences and choose stronger evidence.",
    cases: [
      [
        "Before the recital, Maya's hands shook and she reread the first line five times. How does Maya probably feel?",
        "Nervous",
        ["Bored", "Sleepy"],
        "Shaking hands and repeated checking support nervousness before performing.",
      ],
      [
        "Dev's tower fell twice. He changed the base and began again. Which trait is best supported?",
        "Persistent",
        ["Careless about finishing", "Unwilling to try"],
        "He keeps working after setbacks and changes his approach.",
      ],
      [
        "Sara said, 'I don't mind,' but stared at the last cookie on Ben's plate. Which inference is best supported?",
        "She may still want the cookie",
        ["She has never eaten a cookie", "She dislikes every dessert"],
        "Her attention to the cookie suggests a desire her words do not directly express.",
      ],
    ],
  },
  {
    id: "g4_english_compare_texts",
    standard: "RI.4.9",
    core: "Combining information from two texts means keeping track of what each contributes and using their shared topic to build a fuller understanding.",
    steps: [
      "Identify each text's main point and supporting details.",
      "Separate information shared by both from information unique to one.",
      "Combine compatible details without claiming that either text says more than it does.",
    ],
    example: [
      "Text A describes how bees carry pollen. Text B describes flowers producing seeds after pollination. How do they connect?",
      "Text A explains pollen movement.",
      "Text B explains a result, so together they connect movement with seed production.",
      "They describe different parts of pollination",
    ],
    error: "Assuming that a fact stated in one text appears in both.",
    transfer:
      "Synthesize two short informational sources without erasing their differences.",
    cases: [
      [
        "Text A: Trees shade streets. Text B: Trees absorb some rainwater. Which conclusion uses both texts?",
        "Trees can help streets in more than one way",
        ["Both texts explain tree roots", "Trees stop every flood"],
        "Shade and rainwater absorption are two distinct benefits, and neither source claims complete flood prevention.",
      ],
      [
        "Text A: Bats use echoes to locate insects. Text B: Many bats rest in caves during the day. Which fact comes only from Text A?",
        "Echoes help bats find food",
        ["Bats rest in caves", "Bats rest during the day"],
        "Only Text A describes locating insects by echoes.",
      ],
      [
        "Text A: The new trail is shorter. Text B: The new trail has steeper slopes. Which summary is most accurate?",
        "The trail saves distance but may require harder climbing",
        [
          "The trail must be easier for everyone",
          "The trail is both longer and flatter",
        ],
        "Shorter distance and steeper climbing can both be true; the texts describe different features.",
      ],
    ],
  },
  {
    id: "g5_english_context",
    standard: "L.5.4",
    core: "A word's meaning depends on context, including contrasts, examples and word parts. A familiar dictionary meaning may not fit a particular sentence.",
    steps: [
      "Read the sentence and nearby clues.",
      "Try a possible meaning in place of the word.",
      "Reject meanings that contradict the action or contrast.",
    ],
    example: [
      "The route was arduous: steep climbs and deep mud slowed every step. What does arduous mean?",
      "The clues describe effort and difficulty.",
      "Difficult fits the sentence; quick does not.",
      "Difficult or demanding",
    ],
    error:
      "Choosing a word's most familiar meaning without testing the sentence.",
    transfer:
      "Explain which contextual clue supports a meaning in a new passage.",
    cases: [
      [
        "Unlike the abundant apples, pears were scarce; only two remained. What does scarce mean?",
        "In short supply",
        ["Very colorful", "Recently picked"],
        "The contrast with abundant and the count of two signal a small supply.",
      ],
      [
        "The committee tabled the proposal and agreed to discuss it next month. What does tabled mean here?",
        "Postponed consideration",
        ["Built a wooden table", "Approved immediately"],
        "Agreeing to discuss it later supports postponement, not a furniture meaning.",
      ],
      [
        "Kai's explanation was precise: it gave exact distances and times. Which clue best supports the meaning of precise?",
        "Exact distances and times",
        ["The name Kai", "The word explanation alone"],
        "Exact measurements directly support the meaning accurate and specific.",
      ],
    ],
  },
  {
    id: "g6_english_evidence",
    standard: "RL.6.1",
    core: "An inference connects a textual detail to a conclusion through reasoning. Strong evidence bears directly on the claim, not just the same character.",
    steps: [
      "State the inference without adding unsupported facts.",
      "Select the action or language most relevant to it.",
      "Explain how that detail supports the inference and what remains uncertain.",
    ],
    example: [
      "A musician practices after everyone leaves, replaying the passage she missed. Infer a motive.",
      "Repeated practice targets the specific missed passage.",
      "The detail supports wanting to improve; it does not establish that she will win a competition.",
      "She wants to improve that passage",
    ],
    error:
      "Confusing a plausible prediction with a conclusion supported by the passage.",
    transfer:
      "Evaluate competing interpretations using the strongest relevant details.",
    cases: [
      [
        "Tomas claimed the broken vase was unimportant, but carefully saved each fragment in a box. Which inference is strongest?",
        "The vase matters to him despite his words",
        ["He plans to sell every fragment", "He has forgotten the vase"],
        "Preserving every fragment conflicts with his claim of indifference; no sale is mentioned.",
      ],
      [
        "Alia reread the letter, smiled, and immediately began packing. Which conclusion goes beyond the evidence?",
        "She has won a scholarship overseas",
        ["The letter appears to please her", "She starts preparing to leave"],
        "The passage supports pleasure and packing, but gives neither the letter's contents nor a destination.",
      ],
      [
        "Rin refused the prize, saying the whole team had built the machine. Which detail best supports valuing shared credit?",
        "Rin said the whole team built it",
        ["The machine exists", "There was a prize"],
        "Rin's explanation explicitly links the achievement to the team's contribution.",
      ],
    ],
  },
  {
    id: "g7_english_argument",
    standard: "RI.7.8",
    core: "An argument connects a claim, evidence and reasoning. Relevant evidence addresses the claim; sufficient evidence supports its breadth and strength.",
    steps: [
      "Identify exactly what the claim asserts.",
      "Check whether the evidence addresses that assertion.",
      "Look for sample limits, unsupported generalizations or missing links.",
    ],
    example: [
      "A club says all students prefer chess because its five members do. Evaluate the evidence.",
      "The five members provide evidence about themselves.",
      "Their preferences do not establish what all students prefer.",
      "The sample is too narrow for the claim",
    ],
    error:
      "Treating one relevant example as sufficient support for a universal claim.",
    transfer: "Revise the scope of a claim to match its evidence.",
    cases: [
      [
        "Claim: A later bus improves club attendance. Evidence: Attendance rose after the bus changed, but clubs also became free. What limits the argument?",
        "The fee change offers another explanation",
        [
          "Attendance data can never be useful",
          "Bus times cannot affect attendance",
        ],
        "Two changes occurred together, so the increase cannot be attributed to the bus alone.",
      ],
      [
        "A writer argues that reusable bottles reduce disposable-bottle waste. Which evidence is most relevant?",
        "A school counted fewer discarded disposable bottles after issuing reusable ones",
        ["Reusable bottles come in many colors", "The writer likes sports"],
        "Discarded-bottle counts address the specific waste claim.",
      ],
      [
        "A survey of 20 volunteers found 15 preferred a quieter cafeteria. Which claim is supported without overgeneralizing?",
        "Most surveyed volunteers preferred a quieter cafeteria",
        [
          "Every student dislikes the cafeteria",
          "Noise causes all school absences",
        ],
        "Fifteen of twenty is a majority of that sample, not proof about every student or absences.",
      ],
    ],
  },
  {
    id: "g8_english_conflicting_sources",
    standard: "RI.8.9",
    core: "Sources may disagree because they use different evidence, time periods, definitions or interpretations. Identify the exact disagreement before judging it.",
    steps: [
      "Compare the question and scope each source addresses.",
      "Separate conflicting facts from different interpretations of agreed facts.",
      "Identify evidence that could resolve the specific disagreement.",
    ],
    example: [
      "A report counts 100 park visitors on Saturday; another reports a weekday average of 40. Are the counts necessarily inconsistent?",
      "The sources measure different time periods.",
      "Both can be accurate; matching days and counting methods would permit comparison.",
      "No, their scopes differ",
    ],
    error:
      "Calling different measurements a contradiction without checking what was measured.",
    transfer:
      "Reconcile apparent conflicts or identify precisely what additional evidence is needed.",
    cases: [
      [
        "Source A says a route is fastest by travel time. Source B calls another route shortest by distance. Why can both be correct?",
        "They compare different measures",
        ["Distance and time are identical", "One source must be dishonest"],
        "Traffic and speed can make the shortest distance slower than another route.",
      ],
      [
        "Two articles agree that sales rose 12%. One credits advertising; the other credits a price cut. What do they disagree about?",
        "The explanation for the increase",
        ["Whether sales rose", "The numerical size of the rise"],
        "The fact and magnitude are shared; the causal interpretation differs.",
      ],
      [
        "Two reports give different totals for the same event on the same day. What should a reader check first?",
        "Their definitions and counting methods",
        ["Which title is more exciting", "Which report is longer"],
        "Different inclusion rules or collection methods can explain conflicting totals.",
      ],
    ],
  },
  {
    id: "g9_english_rhetoric",
    standard: "RI.9-10.6",
    core: "Rhetorical analysis explains how language choices advance a purpose for an audience. Naming a device is not enough; connect it to its effect and limits.",
    steps: [
      "Identify the speaker, audience and proposed action.",
      "Examine a specific language choice or organization pattern.",
      "Explain how that choice supports the purpose without treating persuasion as proof.",
    ],
    example: [
      "A speaker repeats 'we can' before three community proposals. Analyze the repetition.",
      "The repeated inclusive phrase links the audience to each proposal.",
      "It encourages shared agency, but does not establish the proposals' costs or feasibility.",
      "It builds a sense of collective ability",
    ],
    error: "Assuming a persuasive emotional appeal verifies the factual claim.",
    transfer:
      "Compare the effects of different rhetorical choices while evaluating evidence separately.",
    cases: [
      [
        "A campaign speech asks, 'Will we leave our neighbors in darkness?' before proposing streetlights. What is the question's rhetorical function?",
        "It frames support as responsibility toward neighbors",
        [
          "It provides the project's exact budget",
          "It neutrally lists all policy alternatives",
        ],
        "The question appeals to shared responsibility and makes refusal emotionally uncomfortable.",
      ],
      [
        "A conservation article opens with one family's flood experience, then presents regional data. How does this structure support its purpose?",
        "It connects a personal case to a broader pattern",
        [
          "It proves every flood has one cause",
          "It makes all numerical evidence unnecessary",
        ],
        "The narrative engages readers while the data address whether the issue extends beyond one family.",
      ],
      [
        "An advertisement calls its product 'the only responsible choice' but gives no comparison data. Which evaluation is strongest?",
        "The moral framing is persuasive language, not evidence of superiority",
        [
          "The phrase proves every alternative is harmful",
          "Persuasive writing cannot contain facts",
        ],
        "The wording creates a moral contrast but supplies no comparative evidence.",
      ],
    ],
  },
  {
    id: "g10_english_argument_validity",
    standard: "RI.9-10.8",
    core: "A sound argument requires acceptable premises and a logical connection to the conclusion. Correlation, popularity and selective evidence do not alone establish causation or truth.",
    steps: [
      "Separate the argument's premises from its conclusion.",
      "Test whether the conclusion follows and whether alternatives were excluded.",
      "Evaluate the evidence's accuracy, relevance and scope.",
    ],
    example: [
      "All oak trees are plants. This tree is an oak. Therefore this tree is a plant. Evaluate the inference.",
      "The first premise includes every oak in the class of plants.",
      "The second places this tree in that class, so the conclusion follows.",
      "The inference is valid",
    ],
    error:
      "Accepting a conclusion because it sounds plausible without checking whether the premises support it.",
    transfer:
      "Distinguish valid reasoning from unsupported causal and either-or claims.",
    cases: [
      [
        "Students who visit the library often score higher. A writer concludes that library visits alone cause higher scores. What is missing?",
        "Evidence addressing other possible influences",
        ["A more enthusiastic headline", "Proof that libraries contain books"],
        "Prior achievement, resources and study habits may influence both visits and scores.",
      ],
      [
        "A writer says, 'Either adopt my schedule or accept that nobody cares about learning.' What is the reasoning flaw?",
        "It excludes other possible schedules and motives",
        [
          "It provides too many measured alternatives",
          "It distinguishes evidence from opinion carefully",
        ],
        "The argument presents a false choice between one proposal and indifference.",
      ],
      [
        "An essay cites three successful projects but ignores twelve failed projects using the same method. What most weakens its conclusion?",
        "Selective use of evidence",
        ["The use of multiple examples", "The fact that projects have names"],
        "Omitting relevant failures distorts the overall evidence about the method.",
      ],
    ],
  },
];
