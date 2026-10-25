export type TargetAttribute = {
  id: string;
  description: string;
  weight: number;
  expectedVariants: string[];
};
export type Target = {
  targetId: string;
  assetUrl: string;
  altText: string;
  referencePrompt: string;
  category: string;
  tags: string[];
  sourceType: "project_generated";
  sourceAttribution: string;
  difficulty: "easy" | "medium" | "hard";
  active: boolean;
  hiddenAttributes: TargetAttribute[];
};

export const targets: Target[] = [
  {
    targetId: "still-life-01",
    assetUrl: "/targets/still-life.svg",
    altText:
      "A blue ceramic vase holding yellow flowers on a wooden table beside a sunlit window",
    referencePrompt:
      "A blue ceramic vase filled with yellow flowers sits centered on a wooden table beside a bright window, in warm sunlight with soft shadows.",
    category: "still life",
    tags: ["vase", "flowers"],
    sourceType: "project_generated",
    sourceAttribution: "Prompt Arena original SVG illustration",
    difficulty: "easy",
    active: true,
    hiddenAttributes: [
      {
        id: "subject",
        description: "Blue ceramic vase with yellow flowers",
        weight: 30,
        expectedVariants: ["blue vase", "yellow flowers", "ceramic vase"],
      },
      {
        id: "objects",
        description: "One vase and several flowers",
        weight: 15,
        expectedVariants: ["one vase", "flowers"],
      },
      {
        id: "action",
        description: "Flowers arranged upright in vase",
        weight: 15,
        expectedVariants: ["in a vase", "arranged"],
      },
      {
        id: "setting",
        description: "Wooden table beside a bright window",
        weight: 15,
        expectedVariants: ["table", "window", "indoors"],
      },
      {
        id: "color",
        description: "Blue, yellow, and warm sunlight",
        weight: 10,
        expectedVariants: ["blue", "yellow", "sunlight"],
      },
      {
        id: "composition",
        description: "Vase centered on the table",
        weight: 10,
        expectedVariants: ["center", "on the table"],
      },
      {
        id: "detail",
        description: "Soft morning light and gentle shadows",
        weight: 5,
        expectedVariants: ["light", "shadow"],
      },
    ],
  },
  {
    targetId: "city-bike-01",
    assetUrl: "/targets/city-bike.svg",
    altText:
      "A red bicycle leaning against a brick wall on a sunny city street",
    referencePrompt:
      "A red bicycle leans against a brick wall on a sunny city street, with its dark wheels and spokes casting shadows on the pavement.",
    category: "street",
    tags: ["bicycle", "city"],
    sourceType: "project_generated",
    sourceAttribution: "Prompt Arena original SVG illustration",
    difficulty: "easy",
    active: true,
    hiddenAttributes: [
      {
        id: "subject",
        description: "Red bicycle",
        weight: 30,
        expectedVariants: ["red bicycle", "red bike"],
      },
      {
        id: "objects",
        description: "A single bicycle",
        weight: 15,
        expectedVariants: ["one bicycle", "a bike"],
      },
      {
        id: "action",
        description: "Bicycle leaning against wall",
        weight: 15,
        expectedVariants: ["leaning", "propped"],
      },
      {
        id: "setting",
        description: "Brick wall on a city street",
        weight: 15,
        expectedVariants: ["brick wall", "street", "city"],
      },
      {
        id: "color",
        description: "Red bicycle and warm sunlight",
        weight: 10,
        expectedVariants: ["red", "sunny", "sunlight"],
      },
      {
        id: "composition",
        description: "Bicycle positioned beside wall",
        weight: 10,
        expectedVariants: ["beside", "against"],
      },
      {
        id: "detail",
        description: "Distinctive wheel spokes and shadows",
        weight: 5,
        expectedVariants: ["spokes", "shadow"],
      },
    ],
  },
  {
    targetId: "mountain-camp-01",
    assetUrl: "/targets/mountain-camp.svg",
    altText: "A small orange tent beside an alpine lake with mountains at dusk",
    referencePrompt:
      "A small orange tent is pitched beside a calm alpine lake at dusk, with mountain peaks behind it and their colors reflected in the water.",
    category: "landscape",
    tags: ["tent", "mountains"],
    sourceType: "project_generated",
    sourceAttribution: "Prompt Arena original SVG illustration",
    difficulty: "medium",
    active: true,
    hiddenAttributes: [
      {
        id: "subject",
        description: "Small orange camping tent",
        weight: 30,
        expectedVariants: ["orange tent", "camping tent"],
      },
      {
        id: "objects",
        description: "One tent by a lake",
        weight: 15,
        expectedVariants: ["tent", "lake"],
      },
      {
        id: "action",
        description: "Tent pitched on lakeshore",
        weight: 15,
        expectedVariants: ["pitched", "camping"],
      },
      {
        id: "setting",
        description: "Alpine lake with mountains",
        weight: 15,
        expectedVariants: ["lake", "mountains", "alpine"],
      },
      {
        id: "color",
        description: "Orange tent and purple dusk sky",
        weight: 10,
        expectedVariants: ["orange", "purple", "dusk"],
      },
      {
        id: "composition",
        description: "Tent in foreground, peaks behind",
        weight: 10,
        expectedVariants: ["foreground", "behind"],
      },
      {
        id: "detail",
        description: "Reflection on calm water",
        weight: 5,
        expectedVariants: ["reflection", "water"],
      },
    ],
  },
];
