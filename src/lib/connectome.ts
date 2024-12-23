import axios from "axios";

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

let updateInterval: NodeJS.Timeout | null = null;

// Movement neuron configuration
const MOVEMENT_CONFIG = {
  forwardNeurons: ["AVBL", "AVBR", "PVCL", "PVCR"],
  backwardNeurons: ["AVAL", "AVAR", "AVDL", "AVDR"],
  turnNeurons: ["RIVL", "RIVR", "RMEV", "RMED", "SMDVL", "SMDVR", "SMDDR", "SMDDL"],
  leftMuscleNeurons: ["VA1", "VA2", "VA3", "VA4", "VB1", "VB2", "VB3", "VB4"],
  rightMuscleNeurons: ["DA1", "DA2", "DA3", "DA4", "DB1", "DB2", "DB3", "DB4"],
  forwardMultiplier: 35.0,
  backwardMultiplier: 30.0,
  turnMultiplier: 25.0,
  muscleMultiplier: 30.0
};

// Create the BRAIN object first with empty weights
const BRAIN: Brain = {
  weights: {},
  dendriteAccumulate(preSynaptic) {
    if (!this.weights[preSynaptic]) return;
    for (const postSynaptic in this.weights[preSynaptic]) {
      if (!this.postSynaptic[postSynaptic]) {
        this.postSynaptic[postSynaptic] = [0, 0];
      }
      
      let weight = this.weights[preSynaptic][postSynaptic];
      
      // Apply multipliers for movement neurons
      if (MOVEMENT_CONFIG.forwardNeurons.includes(preSynaptic)) {
        weight *= MOVEMENT_CONFIG.forwardMultiplier;
      } else if (MOVEMENT_CONFIG.backwardNeurons.includes(preSynaptic)) {
        weight *= MOVEMENT_CONFIG.backwardMultiplier;
      } else if (MOVEMENT_CONFIG.turnNeurons.includes(preSynaptic)) {
        weight *= MOVEMENT_CONFIG.turnMultiplier;
      } else if (MOVEMENT_CONFIG.leftMuscleNeurons.includes(preSynaptic) || 
                 MOVEMENT_CONFIG.rightMuscleNeurons.includes(preSynaptic)) {
        weight *= MOVEMENT_CONFIG.muscleMultiplier;
      }
      
      // Add random variation to create more dynamic movement
      weight *= (0.9 + Math.random() * 0.2);
      
      this.postSynaptic[postSynaptic][this.nextState] += weight;
    }
  },
  thisState: 0,
  nextState: 1,
  fireThreshold: 10,
  accumleft: 0,
  accumright: 0,
  muscles: ["MVU", "MVL", "MDL", "MVR", "MDR"],
  muscleList: [
    "MDL07", "MDL08", "MDL09", "MDL10", "MDL11", "MDL12", "MDL13", "MDL14", "MDL15", "MDL16",
    "MDL17", "MDL18", "MDL19", "MDL20", "MDL21", "MDL22", "MDL23",
    "MVL07", "MVL08", "MVL09", "MVL10", "MVL11", "MVL12", "MVL13", "MVL14", "MVL15", "MVL16",
    "MVL17", "MVL18", "MVL19", "MVL20", "MVL21", "MVL22", "MVL23",
    "MDR07", "MDR08", "MDR09", "MDR10", "MDR11", "MDR12", "MDR13", "MDR14", "MDR15", "MDR16",
    "MDR17", "MDR18", "MDR19", "MDR20", "MDR21", "MDR22", "MDR23",
    "MVR07", "MVR08", "MVR09", "MVR10", "MVR11", "MVR12", "MVR13", "MVR14", "MVR15", "MVR16",
    "MVR17", "MVR18", "MVR19", "MVR20", "MVR21", "MVR22", "MVR23"
  ],
  mLeft: [
    "MDL07", "MDL08", "MDL09", "MDL10", "MDL11", "MDL12", "MDL13", "MDL14", "MDL15", "MDL16",
    "MDL17", "MDL18", "MDL19", "MDL20", "MDL21", "MDL22", "MDL23",
    "MVL07", "MVL08", "MVL09", "MVL10", "MVL11", "MVL12", "MVL13", "MVL14", "MVL15", "MVL16",
    "MVL17", "MVL18", "MVL19", "MVL20", "MVL21", "MVL22", "MVL23"
  ],
  mRight: [
    "MDR07", "MDR08", "MDR09", "MDR10", "MDR11", "MDR12", "MDR13", "MDR14", "MDR15", "MDR16",
    "MDR17", "MDR18", "MDR19", "MDR20", "MDR21", "MDR22", "MDR23",
    "MVR07", "MVR08", "MVR09", "MVR10", "MVR11", "MVR12", "MVR13", "MVR14", "MVR15", "MVR16",
    "MVR17", "MVR18", "MVR19", "MVR20", "MVR21", "MVR22", "MVR23"
  ],
  musDleft: [
    "MDL07", "MDL08", "MDL09", "MDL10", "MDL11", "MDL12", "MDL13", "MDL14", "MDL15", "MDL16",
    "MDL17", "MDL18", "MDL19", "MDL20", "MDL21", "MDL22", "MDL23"
  ],
  musVleft: [
    "MVL07", "MVL08", "MVL09", "MVL10", "MVL11", "MVL12", "MVL13", "MVL14", "MVL15", "MVL16",
    "MVL17", "MVL18", "MVL19", "MVL20", "MVL21", "MVL22", "MVL23"
  ],
  musDright: [
    "MDR07", "MDR08", "MDR09", "MDR10", "MDR11", "MDR12", "MDR13", "MDR14", "MDR15", "MDR16",
    "MDR17", "MDR18", "MDR19", "MDR20", "MDR21", "MDR22", "MDR23"
  ],
  musVright: [
    "MVR07", "MVR08", "MVR09", "MVR10", "MVR11", "MVR12", "MVR13", "MVR14", "MVR15", "MVR16",
    "MVR17", "MVR18", "MVR19", "MVR20", "MVR21", "MVR22", "MVR23"
  ],
  stimulateHungerNeurons: true,
  stimulateNoseTouchNeurons: false,
  stimulateFoodSenseNeurons: false,
  randExcite() {
    if (!Object.keys(this.connectome).length) return;
    
    // Ensure movement neurons are regularly stimulated
    if (Math.random() < 0.3) { // 30% chance to stimulate movement neurons
      const movementNeurons = [
        ...MOVEMENT_CONFIG.forwardNeurons,
        ...MOVEMENT_CONFIG.backwardNeurons,
        ...MOVEMENT_CONFIG.turnNeurons
      ];
      const randomNeuron = movementNeurons[Math.floor(Math.random() * movementNeurons.length)];
      this.dendriteAccumulate(randomNeuron);
    }
    
    // Regular random excitation
    for (let i = 0; i < 40; i++) {
      const keys = Object.keys(this.connectome);
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      this.dendriteAccumulate(randomKey);
    }
  },
  setup() {
    this.postSynaptic = {};
    this.connectome = {};
    for (const preSynaptic in this.weights) {
      this.connectome[preSynaptic] = () => {
        this.dendriteAccumulate(preSynaptic);
      };
    }
    Object.keys(this.weights).forEach((key) => {
      this.postSynaptic[key] = [0, 0];
    });
  },
  update() {
    if (!Object.keys(this.weights).length) return;
    
    // Always run random excitation for baseline activity
    this.randExcite();

    // Stimulate movement neurons periodically with more varied patterns
    if (Math.random() < 0.6) { // 60% chance each update
      const direction = Math.random();
      
      // Add randomization to neuron selection
      const selectRandomNeurons = (neurons: string[], count: number) => {
        const selected = new Set<string>();
        while (selected.size < count && selected.size < neurons.length) {
          const neuron = neurons[Math.floor(Math.random() * neurons.length)];
          selected.add(neuron);
        }
        return Array.from(selected);
      };

      if (direction < 0.4) { // 40% chance for forward movement
        // Randomly select some forward neurons
        selectRandomNeurons(MOVEMENT_CONFIG.forwardNeurons, 2)
          .forEach(n => this.dendriteAccumulate(n));
        
        // Add some random turning for variation
        if (Math.random() < 0.3) { // 30% chance to add slight turn
          const turnSide = Math.random() < 0.5;
          const turnNeurons = turnSide ? 
            MOVEMENT_CONFIG.turnNeurons.slice(0, 4) : 
            MOVEMENT_CONFIG.turnNeurons.slice(4);
          selectRandomNeurons(turnNeurons, 2)
            .forEach(n => this.dendriteAccumulate(n));
        }
      } else if (direction < 0.7) { // 30% chance for turning
        const turnLeft = Math.random() < 0.5;
        const turnNeurons = turnLeft ? 
          MOVEMENT_CONFIG.turnNeurons.slice(0, 4) : 
          MOVEMENT_CONFIG.turnNeurons.slice(4);
        
        // Stimulate turn neurons multiple times for stronger turns
        selectRandomNeurons(turnNeurons, 2).forEach(n => {
          this.dendriteAccumulate(n);
          this.dendriteAccumulate(n);
        });

        // Add some muscle neurons on the turning side
        const muscleNeurons = turnLeft ? 
          MOVEMENT_CONFIG.leftMuscleNeurons : 
          MOVEMENT_CONFIG.rightMuscleNeurons;
        selectRandomNeurons(muscleNeurons, 3)
          .forEach(n => this.dendriteAccumulate(n));
      } else { // 30% chance for backward movement
        // Randomly select some backward neurons
        selectRandomNeurons(MOVEMENT_CONFIG.backwardNeurons, 2)
          .forEach(n => this.dendriteAccumulate(n));
        
        // Add some random turning for variation
        if (Math.random() < 0.4) { // 40% chance to add slight turn
          const turnSide = Math.random() < 0.5;
          const turnNeurons = turnSide ? 
            MOVEMENT_CONFIG.turnNeurons.slice(0, 4) : 
            MOVEMENT_CONFIG.turnNeurons.slice(4);
          selectRandomNeurons(turnNeurons, 1)
            .forEach(n => this.dendriteAccumulate(n));
        }
      }

      // Randomly stimulate some muscle neurons for more natural movement
      if (Math.random() < 0.3) { // 30% chance
        const allMuscles = [...MOVEMENT_CONFIG.leftMuscleNeurons, ...MOVEMENT_CONFIG.rightMuscleNeurons];
        selectRandomNeurons(allMuscles, 4)
          .forEach(n => this.dendriteAccumulate(n));
      }
    }

    if (this.stimulateHungerNeurons) {
      this.dendriteAccumulate("RIML");
      this.dendriteAccumulate("RIMR");
      this.dendriteAccumulate("RICL");
      this.dendriteAccumulate("RICR");
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
    }
    
    // Always run the connectome to process neural activity
    this.runconnectome();
  },
  runconnectome() {
    if (!Object.keys(this.weights).length) return;
    
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
      this.postSynaptic[ps][this.thisState] = this.postSynaptic[ps][this.nextState];
      this.postSynaptic[ps][this.nextState] = 0;
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
    
    // Process muscle groups with enhanced variation
    for (const muscleName of this.muscleList) {
      if (!this.postSynaptic[muscleName]) {
        this.postSynaptic[muscleName] = [0, 0];
      }
      
      let muscleValue = this.postSynaptic[muscleName][this.nextState];
      
      // Add more random variation to muscle response
      muscleValue *= (0.85 + Math.random() * 0.3); // Increased variation
      
      // Amplify muscle response with random boost
      muscleValue *= 3.0 * (1 + Math.random() * 0.5); // Random boost up to 50%
      
      if (this.mLeft.includes(muscleName)) {
        this.accumleft += muscleValue;
        this.postSynaptic[muscleName][this.nextState] = 0;
      } else if (this.mRight.includes(muscleName)) {
        this.accumright += muscleValue;
        this.postSynaptic[muscleName][this.nextState] = 0;
      }
    }
    
    // Apply non-linear scaling with asymmetric response
    const scaleFactor = 8;
    const asymmetry = 0.2 * (Math.random() - 0.5); // Random asymmetry
    this.accumleft = Math.tanh((this.accumleft / scaleFactor) * (1 + asymmetry)) * scaleFactor * 3;
    this.accumright = Math.tanh((this.accumright / scaleFactor) * (1 - asymmetry)) * scaleFactor * 3;
    
    // Add slight random bias to prevent perfect straight lines
    const bias = Math.random() * 0.4 - 0.2;
    this.accumleft *= (1 + bias);
    this.accumright *= (1 - bias);
    
    // Ensure minimum movement threshold with hysteresis
    const minThreshold = 0.01;
    const hysteresis = 0.005;
    if (Math.abs(this.accumleft) < minThreshold - hysteresis) this.accumleft = 0;
    if (Math.abs(this.accumright) < minThreshold - hysteresis) this.accumright = 0;
  },
  postSynaptic: {},
  connectome: {},
};

export async function initializeWeights() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!apiUrl) {
      console.error("API URL is not configured");
      return;
    }

    const response = await axios.get(`${apiUrl}/api/rpc`, {
      timeout: 5000,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (response.data) {
      BRAIN.weights = response.data;
      BRAIN.setup(); // Re-setup after weights update
    }

    if (!updateInterval) {
      updateInterval = setInterval(async () => {
        try {
          const newResponse = await axios.get(`${apiUrl}/api/rpc`, {
            timeout: 5000,
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          if (newResponse.data) {
            BRAIN.weights = newResponse.data;
            BRAIN.setup(); // Re-setup after weights update
          }
        } catch (error) {
          console.error("Error updating weights:", error);
        }
      }, 180000);
    }
  } catch (error) {
    console.error("Error initializing weights:", error);
    throw new Error("Failed to initialize weights from API");
  }
}

export { BRAIN };
