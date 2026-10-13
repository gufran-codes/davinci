import type { Unit } from "./lesson-depth";

export const scienceDepth: Unit[] = [
  {
    id: "g1_science_energy",
    standard: "1-PS4-1",
    core: "Vibrating objects can produce sound. Observations of movement before, during and after a sound help connect the vibration to what we hear.",
    steps: [
      "Observe or feel an object while it makes a sound.",
      "Compare its movement when the sound stops.",
      "Use the paired observations to connect sound with vibration.",
    ],
    example: [
      "A ruler held over a desk edge makes a sound when plucked. What can you observe?",
      "The free end moves back and forth as it sounds.",
      "When that movement stops, the sound stops too.",
      "The vibrating ruler produces the sound",
    ],
    error:
      "Thinking sound requires an object to travel across the room rather than vibrate.",
    transfer:
      "Use observations to identify the sound-producing part of a different object.",
    cases: [
      [
        "A guitar string moves back and forth after it is plucked. What is this movement called?",
        "Vibration",
        ["Melting", "Growth"],
        "Vibration is repeated back-and-forth movement.",
      ],
      [
        "A drum sounds when its stretched top moves. Gently stopping that movement also stops the sound. Which observation links sound and vibration?",
        "The sound stops when the movement stops",
        ["The drum is round", "The drum has a name"],
        "The change in sound accompanies stopping the vibration.",
      ],
      [
        "Which test would help find out whether a humming person's throat vibrates?",
        "Gently feel the outside of the throat while humming and while silent",
        ["Measure the person's shoes", "Look at a wall in another room"],
        "Comparing humming with silence can reveal vibration associated with the sound.",
      ],
    ],
  },
  {
    id: "g2_science_living_things",
    standard: "2-LS2-1",
    core: "Plants need water and light to grow under suitable conditions. A comparison is more informative when the condition being tested is the main difference.",
    steps: [
      "Ask a question about a plant's growing conditions.",
      "Compare similar plants while changing one condition.",
      "Record growth over time and connect the result to the tested condition.",
    ],
    example: [
      "Two similar seedlings receive equal light. Only one receives enough water. What can the comparison investigate?",
      "The plants share light and other conditions.",
      "The main changed condition is water, so growth can inform a question about water.",
      "How water availability affects growth",
    ],
    error:
      "Changing both light and water, then claiming to know which caused the difference.",
    transfer: "Plan a simple fair comparison about plant growth.",
    cases: [
      [
        "Two similar seedlings get equal water. One grows in light and one in darkness. Which condition is being tested?",
        "Light",
        ["Type of plant", "Amount of water"],
        "Light differs while the plant type and water are kept alike.",
      ],
      [
        "To compare how two plants grow, which observation is most useful?",
        "Their heights recorded over several days",
        ["Their pot colors only", "The observer's favorite plant"],
        "Repeated height measurements provide evidence of growth over time.",
      ],
      [
        "A watered plant in sunlight grows more than an unwatered plant in darkness. Can this test show that light alone caused the difference?",
        "No, both light and water changed",
        [
          "Yes, because only light ever affects plants",
          "Yes, because two plants are enough for any claim",
        ],
        "Two conditions changed, so their separate effects cannot be determined from this comparison.",
      ],
    ],
  },
  {
    id: "g3_science_forces",
    standard: "3-PS2-1",
    core: "Balanced forces can leave motion unchanged. Unbalanced forces can change an object's speed or direction; the effects depend on the combined forces.",
    steps: [
      "Identify the pushes and pulls acting on the object.",
      "Compare their directions and strengths.",
      "Use the overall imbalance to predict a change in motion.",
    ],
    example: [
      "Two children pull a wagon in opposite directions with equal strength.",
      "Each pull opposes the other equally.",
      "These two pulls balance, so they do not by themselves change the wagon's motion.",
      "The pulls are balanced",
    ],
    error: "Assuming that every force must make a resting object move.",
    transfer:
      "Predict a change when a previously balanced pair of forces becomes unequal.",
    cases: [
      [
        "A box at rest is pushed equally from opposite sides. What can happen if those horizontal pushes stay balanced?",
        "The box can remain at rest",
        ["The box must move left", "The box must move right"],
        "Equal opposite horizontal forces have no horizontal imbalance to change the resting motion.",
      ],
      [
        "A ball rolls straight. A sideward push changes its path. What did the push change?",
        "Its direction of motion",
        ["Its material into metal", "Its identity as a ball"],
        "The observation is a change of direction caused by the sideward force.",
      ],
      [
        "One student pulls a cart right more strongly than another pulls left. Ignoring other horizontal forces, which way is the combined force?",
        "To the right",
        ["To the left", "There is no combined force"],
        "The stronger rightward pull is not fully balanced by the leftward pull.",
      ],
    ],
  },
  {
    id: "g4_science_earth_systems",
    standard: "4-ESS2-1",
    core: "Water, ice, wind and living things can change land. Weathering breaks material down; erosion moves it, and observations help distinguish those processes.",
    steps: [
      "Describe the visible change without assuming a cause.",
      "Identify evidence for breaking apart versus movement.",
      "Compare conditions to explain which process the evidence supports.",
    ],
    example: [
      "A stream carries loose sand away from a bank.",
      "The sand is moving from one location to another.",
      "That movement is erosion; the observation does not by itself show how the sand first broke off.",
      "Erosion",
    ],
    error:
      "Treating all land changes as the same process or claiming a cause without observations.",
    transfer:
      "Use observations to separate weathering, erosion and deposition.",
    cases: [
      [
        "Water freezes in a rock crack and the crack becomes wider. Which process does this show?",
        "Weathering",
        ["Deposition", "The rock growing new tissue"],
        "The rock is being broken apart where it is, rather than transported.",
      ],
      [
        "After a windy day, sand collects behind a fence. What does this collection illustrate?",
        "Deposition",
        ["Sand being created from nothing", "Melting"],
        "Moving sand settles and accumulates in a new location.",
      ],
      [
        "Two soil trays receive equal artificial rain. One has grass and loses less soil. What conclusion is supported?",
        "Grass reduced soil loss in this test",
        ["Grass prevents every possible flood", "Rain cannot move soil"],
        "The observed difference supports reduced erosion under these test conditions, not an unlimited claim.",
      ],
    ],
  },
  {
    id: "g5_science_matter",
    standard: "5-PS1-2",
    core: "Matter is conserved during many physical and chemical changes when all material remains in a closed system. A gas still has mass even when it is hard to see.",
    steps: [
      "Define which materials are inside the system.",
      "Measure total mass before and after a change.",
      "Account for escaping or entering material before deciding whether mass changed.",
    ],
    example: [
      "Ice melts inside a sealed container whose total mass is 120 grams.",
      "Melting changes the form of the water, not how much material is inside.",
      "With nothing entering or leaving, the total mass stays 120 grams.",
      "120 grams",
    ],
    error: "Assuming that dissolved or gaseous material no longer has mass.",
    transfer:
      "Explain an apparent mass loss by checking whether the system was open.",
    cases: [
      [
        "A sealed bag contains 80 grams of water and 5 grams of salt, excluding the bag's mass. The salt dissolves without spilling. What is the contents' mass in grams?",
        "85",
        ["80", "5"],
        "Dissolved salt remains in the bag; 80 + 5 = 85 grams.",
      ],
      [
        "A reaction in an open cup releases gas and the measured mass decreases. Which explanation is consistent with conservation?",
        "Some matter left the cup as gas",
        ["Matter ceased to exist", "Gases never have mass"],
        "The scale no longer includes gas that escaped from the open system.",
      ],
      [
        "Which setup best tests conservation of total mass during a gas-producing reaction?",
        "Measure a safely designed sealed system before and after",
        [
          "Weigh only the liquid afterward",
          "Ignore the gas because it is invisible",
        ],
        "Including all products, including the gas, keeps the system boundary consistent. Use teacher-approved equipment.",
      ],
    ],
  },
  {
    id: "g6_science_particles",
    standard: "MS-PS1-4",
    core: "The particle model explains changes of state using motion, spacing and interactions. In a physical state change the substance's particles do not become a new substance.",
    steps: [
      "Identify what is changing at the visible scale.",
      "Connect added or removed thermal energy to particle motion and arrangement.",
      "Use the model to explain the observation while conserving the substance.",
    ],
    example: [
      "Liquid water warms before boiling. Describe its particles.",
      "Thermal energy increases the particles' average motion.",
      "They are still water particles; a later state change changes their arrangement and separation.",
      "Faster average motion, same substance",
    ],
    error:
      "Saying particles themselves expand greatly or change identity whenever a substance warms.",
    transfer:
      "Use particle motion to explain a new warming or cooling observation.",
    cases: [
      [
        "A sealed rigid container of gas is warmed. Which particle explanation accounts for increased pressure?",
        "Particles strike the walls more frequently and forcefully on average",
        [
          "Each particle becomes a new chemical element",
          "All particles stop moving",
        ],
        "Higher average particle motion produces stronger and more frequent wall collisions in a fixed volume.",
      ],
      [
        "Water vapor cools and forms droplets on a surface. What changes in the particle model?",
        "Water particles become less separated as liquid forms",
        ["Water particles disappear", "Water becomes a different element"],
        "Condensation changes the arrangement and spacing of water particles, not their chemical identity.",
      ],
      [
        "A student says boiling water disappears forever. Which observation best challenges that claim?",
        "The vapor can be cooled and collected as liquid water",
        ["The pot has a handle", "The stove has a switch"],
        "Recovering water by condensation shows that the water changed state rather than ceased to exist.",
      ],
    ],
  },
  {
    id: "g7_science_photosynthesis",
    standard: "MS-LS1-6; MS-LS1-7",
    core: "Photosynthesis uses light energy to rearrange carbon dioxide and water into sugars, releasing oxygen. Respiration releases usable energy from food; plants perform both processes.",
    steps: [
      "Trace the matter entering and leaving each process.",
      "Distinguish energy transfer from the movement of atoms.",
      "Use evidence to explain how the two processes can occur in the same organism.",
    ],
    example: [
      "A growing plant builds more dry matter. Where does much of its new carbon come from?",
      "Carbon dioxide enters the leaves from the air.",
      "Photosynthesis incorporates that carbon into sugars that support growth.",
      "Carbon dioxide in the air",
    ],
    error: "Treating sunlight as matter, or assuming plants do not respire.",
    transfer:
      "Predict effects of changes in light while keeping matter and energy accounts distinct.",
    cases: [
      [
        "Which input provides energy, rather than carbon atoms, for photosynthesis?",
        "Light",
        ["Carbon dioxide", "Water"],
        "Light supplies energy; carbon dioxide supplies the carbon incorporated into sugars.",
      ],
      [
        "A plant is kept in darkness for several hours. Which statement is most accurate?",
        "It can continue respiration using stored food",
        [
          "It no longer needs energy",
          "It photosynthesizes at the same rate without light",
        ],
        "Respiration can use stored sugars even when photosynthesis lacks its light input.",
      ],
      [
        "In a controlled setup, an aquatic plant produces more oxygen in light than in darkness. What does this support?",
        "Light supports the oxygen-producing process of photosynthesis",
        [
          "Oxygen atoms are created from nothing",
          "The plant never carries out respiration",
        ],
        "The comparison connects light with photosynthetic oxygen production without excluding respiration.",
      ],
    ],
  },
  {
    id: "g8_science_selection",
    standard: "MS-LS4-4",
    core: "Natural selection changes populations across generations when inherited variation affects survival and reproduction in a particular environment. Individuals do not acquire needed inherited traits by wishing for them.",
    steps: [
      "Identify variation already present in a population.",
      "Connect a trait to reproductive success in the stated environment.",
      "Explain how the trait can become more common across generations.",
    ],
    example: [
      "In a beetle population, dark color is inherited and makes beetles less visible on dark bark.",
      "If predators more often eat visible beetles, dark beetles may survive and reproduce more.",
      "Their offspring can inherit dark color, increasing its frequency over generations.",
      "Inherited variation and differential reproduction",
    ],
    error:
      "Explaining population change as individuals choosing a trait because they need it.",
    transfer: "Predict how selection may differ after an environmental change.",
    cases: [
      [
        "Some bacteria already resist an antibiotic. After treatment they reproduce while susceptible bacteria die. Why does resistance become more common?",
        "Resistant survivors leave more descendants",
        [
          "All bacteria deliberately learn resistance",
          "The antibiotic creates a need that guarantees a trait",
        ],
        "Selection favors the resistant variation already present in this described population.",
      ],
      [
        "A dark beetle becomes less visible when bark darkens. Does this guarantee that dark color is advantageous in every habitat?",
        "No, the effect depends on the environment",
        [
          "Yes, dark traits are always superior",
          "Yes, every trait is equally useful everywhere",
        ],
        "Camouflage depends on background and predators, so an advantage is context-dependent.",
      ],
      [
        "Which observation best supports natural selection across generations?",
        "An inherited protective trait increases in frequency among descendants",
        [
          "One animal grows larger after eating",
          "One animal chooses a new hiding place once",
        ],
        "The observation combines inheritance and population change, rather than individual growth or behavior alone.",
      ],
    ],
  },
  {
    id: "g9_science_genetics",
    standard: "HS-LS3-3",
    core: "Genetic models predict probabilities of inherited traits under stated assumptions. Expected proportions describe many outcomes, not a guaranteed schedule for a small family.",
    steps: [
      "Identify parental alleles and the inheritance model.",
      "Combine possible gametes to find offspring probabilities.",
      "Distinguish a predicted probability from a guarantee for individual births.",
    ],
    example: [
      "In a simple complete-dominance model, cross Aa with aa.",
      "The first parent contributes A or a; the second contributes a.",
      "The equally likely offspring genotypes are Aa and aa.",
      "One half Aa and one half aa",
    ],
    error:
      "Assuming a 25% probability guarantees exactly one affected child in every four births.",
    transfer: "Interpret genetic probability and explain model limitations.",
    cases: [
      [
        "Under a simple complete-dominance model, Aa is crossed with Aa. What is the probability of aa?",
        "1/4",
        ["1/2", "3/4"],
        "The equally likely combinations are AA, Aa, aA and aa; one of four is aa.",
      ],
      [
        "Two parents have a modeled 25% probability of an aa child at each birth. They already have three children without aa. What is the modeled probability for the next birth, assuming independence?",
        "25%",
        ["100%", "0%"],
        "Previous independent outcomes do not force the next outcome to complete an expected ratio.",
      ],
      [
        "A trait is influenced by many genes and nutrition. What limits a single-gene Punnett square for that trait?",
        "It omits relevant genetic and environmental influences",
        [
          "It can include every possible influence automatically",
          "Nutrition changes the meaning of probability to certainty",
        ],
        "A simplified one-gene model does not capture all contributors to a complex trait.",
      ],
    ],
  },
  {
    id: "g10_science_conservation",
    standard: "HS-PS1-7",
    core: "Chemical reactions rearrange atoms. Balanced equations conserve each element and support quantitative reasoning about reactant and product amounts.",
    steps: [
      "Count atoms of each element on both sides.",
      "Change coefficients, not chemical subscripts, to balance the counts.",
      "Use coefficient ratios to compare amounts in moles, while conserving total mass in a closed system.",
    ],
    example: [
      "Balance hydrogen reacting with oxygen to form water.",
      "Use 2 H2 and 1 O2 to provide four hydrogen atoms and two oxygen atoms.",
      "2 H2O contains those same counts, giving 2 H2 + O2 → 2 H2O.",
      "Coefficients 2, 1, 2",
    ],
    error:
      "Changing a subscript changes the substance rather than the amount of it.",
    transfer:
      "Use a balanced equation to reason about ratios and limiting reactants.",
    cases: [
      [
        "In 2 H2 + O2 → 2 H2O, how many moles of water can form from 3 moles of O2 with enough H2?",
        "6",
        ["3", "1.5"],
        "The ratio is two moles of water for each mole of oxygen, so 3 × 2 = 6.",
      ],
      [
        "Why may we change a coefficient while balancing an equation but not a formula's subscript?",
        "A coefficient changes amount; a subscript changes chemical composition",
        [
          "Subscripts and coefficients have identical meanings",
          "Balancing requires changing the identities of all substances",
        ],
        "Two water molecules remain water; altering the atoms per molecule specifies a different composition.",
      ],
      [
        "For 2 H2 + O2 → 2 H2O, a mixture has 2 moles H2 and 2 moles O2. Which reactant limits water production?",
        "Hydrogen",
        ["Oxygen", "Neither, because the mole amounts are equal"],
        "Two moles of H2 use only one mole of O2; hydrogen runs out while oxygen remains.",
      ],
    ],
  },
];
