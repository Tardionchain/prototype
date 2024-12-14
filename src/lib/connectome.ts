import axios from "axios";
export let weights: Record<string, Record<string, number>> = {};

export async function initializeWeights() {
  try {
    console.log("Fetching weights from the API...");
    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/rpc`,
    );
    weights = response.data;

    // Assign weights to BRAIN
    BRAIN.weights = weights;
    console.log("Assigned weights to BRAIN:", BRAIN.weights);
  } catch (error) {
    console.error("Error fetching weights:", error);
  }
}

interface Brain {
  weights: Record<string, Record<string, number>>;
  dendriteAccumulate: (preSynaptic: string) => void;
  thisState: number;
  nextState: number;
  fireThreshold: number;
  accumleft: number;
  accumright: number;
  muscles: string[];
  muscleList: string[];
  mLeft: string[];
  mRight: string[];
  musDleft: string[];
  musVleft: string[];
  musDright: string[];
  musVright: string[];
  stimulateHungerNeurons: boolean;
  stimulateNoseTouchNeurons: boolean;
  stimulateFoodSenseNeurons: boolean;
  randExcite: () => void;
  setup: () => void;
  update: () => void;
  runconnectome: () => void;
  fireNeuron: (fneuron: string) => void;
  motorcontrol: () => void;
  connectome: Record<string, () => void>;
  postSynaptic: Record<string, [number, number]>;
}

const BRAIN: Brain = {
  weights,
  dendriteAccumulate(preSynaptic) {
    for (const postSynaptic in this.weights[preSynaptic]) {
      if (!this.postSynaptic[postSynaptic]) {
        this.postSynaptic[postSynaptic] = [0, 0]; // Initialize if undefined
      }
      this.postSynaptic[postSynaptic][this.nextState] +=
        this.weights[preSynaptic][postSynaptic];
    }
  },
  thisState: 0,
  nextState: 1,
  fireThreshold: 30,
  accumleft: 0,
  accumright: 0,
  muscles: ["MVU", "MVL", "MDL", "MVR", "MDR"],
  muscleList: [
    "MDL07",
    "MDL08",
    "MDL09",
    "MDL10",
    "MDL11",
    "MDL12",
    "MDL13",
    "MDL14",
    "MDL15",
    "MDL16",
    "MDL17",
    "MDL18",
    "MDL19",
    "MDL20",
    "MDL21",
    "MDL22",
    "MDL23",
    "MVL07",
    "MVL08",
    "MVL09",
    "MVL10",
    "MVL11",
    "MVL12",
    "MVL13",
    "MVL14",
    "MVL15",
    "MVL16",
    "MVL17",
    "MVL18",
    "MVL19",
    "MVL20",
    "MVL21",
    "MVL22",
    "MVL23",
    "MDR07",
    "MDR08",
    "MDR09",
    "MDR10",
    "MDR11",
    "MDR12",
    "MDR13",
    "MDR14",
    "MDR15",
    "MDR16",
    "MDR17",
    "MDR18",
    "MDR19",
    "MDR20",
    "MDL21",
    "MDR22",
    "MDR23",
    "MVR07",
    "MVR08",
    "MVR09",
    "MVR10",
    "MVR11",
    "MVR12",
    "MVR13",
    "MVR14",
    "MVR15",
    "MVR16",
    "MVR17",
    "MVR18",
    "MVR19",
    "MVR20",
    "MVL21",
    "MVR22",
    "MVR23",
  ],
  mLeft: [
    "MDL07",
    "MDL08",
    "MDL09",
    "MDL10",
    "MDL11",
    "MDL12",
    "MDL13",
    "MDL14",
    "MDL15",
    "MDL16",
    "MDL17",
    "MDL18",
    "MDL19",
    "MDL20",
    "MDL21",
    "MDL22",
    "MDL23",
    "MVL07",
    "MVL08",
    "MVL09",
    "MVL10",
    "MVL11",
    "MVL12",
    "MVL13",
    "MVL14",
    "MVL15",
    "MVL16",
    "MVL17",
    "MVL18",
    "MVL19",
    "MVL20",
    "MVL21",
    "MVL22",
    "MVL23",
  ],
  mRight: [
    "MDR07",
    "MDR08",
    "MDR09",
    "MDR10",
    "MDR11",
    "MDR12",
    "MDR13",
    "MDR14",
    "MDR15",
    "MDR16",
    "MDR17",
    "MDR18",
    "MDR19",
    "MDR20",
    "MDL21",
    "MDR22",
    "MDR23",
    "MVR07",
    "MVR08",
    "MVR09",
    "MVR10",
    "MVR11",
    "MVR12",
    "MVR13",
    "MVR14",
    "MVR15",
    "MVR16",
    "MVR17",
    "MVR18",
    "MVR19",
    "MVR20",
    "MVL21",
    "MVR22",
    "MVR23",
  ],
  musDleft: [
    "MDL07",
    "MDL08",
    "MDL09",
    "MDL10",
    "MDL11",
    "MDL12",
    "MDL13",
    "MDL14",
    "MDL15",
    "MDL16",
    "MDL17",
    "MDL18",
    "MDL19",
    "MDL20",
    "MDL21",
    "MDL22",
    "MDL23",
  ],
  musVleft: [
    "MVL07",
    "MVL08",
    "MVL09",
    "MVL10",
    "MVL11",
    "MVL12",
    "MVL13",
    "MVL14",
    "MVL15",
    "MVL16",
    "MVL17",
    "MVL18",
    "MVL19",
    "MVL20",
    "MVL21",
    "MVL22",
    "MVL23",
  ],
  musDright: [
    "MDR07",
    "MDR08",
    "MDR09",
    "MDR10",
    "MDR11",
    "MDR12",
    "MDR13",
    "MDR14",
    "MDR15",
    "MDR16",
    "MDR17",
    "MDR18",
    "MDR19",
    "MDR20",
    "MDL21",
    "MDR22",
    "MDR23",
  ],
  musVright: [
    "MVR07",
    "MVR08",
    "MVR09",
    "MVR10",
    "MVR11",
    "MVR12",
    "MVR13",
    "MVR14",
    "MVR15",
    "MVR16",
    "MVR17",
    "MVR18",
    "MVR19",
    "MVR20",
    "MVL21",
    "MVR22",
    "MVR23",
  ],
  stimulateHungerNeurons: true,
  stimulateNoseTouchNeurons: false,
  stimulateFoodSenseNeurons: false,
  randExcite() {
    for (let i = 0; i < 40; i++) {
      const keys = Object.keys(this.connectome);
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      this.dendriteAccumulate(randomKey);
    }
  },
  setup() {
    this.postSynaptic = {};
    this.connectome = {};

    if (!this.weights || Object.keys(this.weights).length === 0) {
      console.warn("Weights are empty. Cannot set up connectome.");
      return;
    }

    // Initialize connectome using weights
    for (const preSynaptic in this.weights) {
      this.connectome[preSynaptic] = () => {
        this.dendriteAccumulate(preSynaptic);
      };
    }

    // Initialize postSynaptic neurons
    for (const neuron in this.weights) {
      this.postSynaptic[neuron] = [0, 0];
    }

    console.log("BRAIN.connectome initialized:", this.connectome);
  },
  update() {
    if (this.stimulateHungerNeurons) {
      this.dendriteAccumulate("RIML");
      this.dendriteAccumulate("RIMR");
      this.dendriteAccumulate("RICL");
      this.dendriteAccumulate("RICR");
      this.runconnectome();
    }
    if (this.stimulateNoseTouchNeurons) {
      this.dendriteAccumulate("FLPR");
      this.dendriteAccumulate("FLPL");
      this.dendriteAccumulate("ASHL");
      this.dendriteAccumulate("ASHR");
      this.dendriteAccumulate("IL1VL");
      this.dendriteAccumulate("IL1VR");
      this.dendriteAccumulate("OLQDL");
      this.dendriteAccumulate("OLQDR");
      this.dendriteAccumulate("OLQVR");
      this.dendriteAccumulate("OLQVL");
      this.runconnectome();
    }
    if (this.stimulateFoodSenseNeurons) {
      this.dendriteAccumulate("ADFL");
      this.dendriteAccumulate("ADFR");
      this.dendriteAccumulate("ASGR");
      this.dendriteAccumulate("ASGL");
      this.dendriteAccumulate("ASIL");
      this.dendriteAccumulate("ASIR");
      this.dendriteAccumulate("ASJR");
      this.dendriteAccumulate("ASJL");
      this.runconnectome();
    }
  },
  runconnectome() {
    for (const ps in this.postSynaptic) {
      if (
        !this.muscles.includes(ps.substring(0, 3)) &&
        this.postSynaptic[ps][this.thisState] > this.fireThreshold
      ) {
        this.fireNeuron(ps);
      }
    }
    this.motorcontrol();
    for (const ps in this.postSynaptic) {
      this.postSynaptic[ps][this.thisState] =
        this.postSynaptic[ps][this.nextState];
    }
    const temp = this.thisState;
    this.thisState = this.nextState;
    this.nextState = temp;
  },
  fireNeuron(fneuron) {
    if (fneuron !== "MVULVA") {
      this.dendriteAccumulate(fneuron);
      this.postSynaptic[fneuron][this.nextState] = 0;
    }
  },
  motorcontrol() {
    this.accumleft = 0;
    this.accumright = 0;
    for (const muscleName of this.muscleList) {
      // Ensure the muscleName key exists in postSynaptic and is properly initialized
      if (!this.postSynaptic[muscleName]) {
        this.postSynaptic[muscleName] = [0, 0]; // Initialize if undefined
      }

      if (this.mLeft.includes(muscleName)) {
        this.accumleft += this.postSynaptic[muscleName][this.nextState];
        this.postSynaptic[muscleName][this.nextState] = 0;
      } else if (this.mRight.includes(muscleName)) {
        this.accumright += this.postSynaptic[muscleName][this.nextState];
        this.postSynaptic[muscleName][this.nextState] = 0;
      }
    }
  },
  postSynaptic: {},
  connectome: {},
};

export default BRAIN;
