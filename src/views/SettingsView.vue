<script setup>
import { ref, inject } from "vue";
import DebugConsole from "../components/DebugConsole.vue";

const props = defineProps({
  config: Object,
  status: Object,
  logs: Array,
});

const emit = defineEmits(["save", "send-raw"]);
const dialog = inject("dialog");

const isIdentifying = ref(false);
const matrixInput = ref("");
const lastKeyPressed = ref(""); // Track last pressed key for double-press detection

const updateMatrixPins = (type, valueStr) => {
  const pins = valueStr
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s);
  props.config.matrix[type] = pins;
};

const handleSendRaw = (cmd) => {
  emit("send-raw", cmd);
};

const startIdentification = async () => {
  if (props.status.saving) return;
  const confirmed = await dialog.confirm(
    "This will overwrite your current keymap to identify the matrix. Continue?",
    "Start Identification",
  );
  if (!confirmed) return;

  // Create Probe Config
  const rows = props.config.matrix.rows.length;
  const cols = props.config.matrix.cols.length;

  const probeLayer = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const index = r * cols + c;
      probeLayer.push(`KC.MACRO("${index}_")`);
    }
  }

  // Set config
  props.config.layers = [probeLayer];
  // Clear layouts (to force clean slate)
  props.config.layouts = [];

  // Save to device
  emit("save");

  // Show UI
  isIdentifying.value = true;
  matrixInput.value = "";
  lastKeyPressed.value = "";

  // Focus input next tick
  setTimeout(() => {
    document.getElementById("matrixInput")?.focus();
  }, 100);
};

const handleMatrixInput = (event) => {
  const currentValue = matrixInput.value;
  const lines = currentValue.split("\n");
  const lastLine = lines[lines.length - 1];

  // Extract the last key number from current line
  const matches = lastLine.match(/(\d+)_$/); // Match number followed by underscore at end

  if (matches) {
    const currentKey = matches[1];

    // If same key pressed twice, replace the duplicate with newline
    if (currentKey === lastKeyPressed.value) {
      // Remove the duplicate key entry and add newline
      const withoutDuplicate = currentValue.replace(
        new RegExp(`${currentKey}_$`),
        "",
      );
      matrixInput.value = withoutDuplicate + "\n";
      lastKeyPressed.value = ""; // Reset after newline
    } else {
      lastKeyPressed.value = currentKey;
    }
  }
};

const finishIdentification = async () => {
  const confirmed = await dialog.confirm(
    "Save detected matrix layout?",
    "Finish Identification",
  );
  if (!confirmed) return;

  // Parse input by lines (each line = one physical row)
  const lines = matrixInput.value.split("\n").filter((line) => line.trim());

  const rows = props.config.matrix.rows.length;
  const cols = props.config.matrix.cols.length;
  const totalKeys = rows * cols;

  // Create clean layer
  const cleanLayer = new Array(totalKeys).fill("KC.TRNS");

  // Parse each line to get key indices for that row
  const rowKeyMap = []; // rowKeyMap[rowIndex] = [key indices in that row]

  lines.forEach((line, rowIndex) => {
    const indices = [];
    line.split("_").forEach((s) => {
      const idx = parseInt(s.trim());
      if (!isNaN(idx)) {
        indices.push(idx);
      }
    });
    rowKeyMap[rowIndex] = indices;
  });

  // Build layouts based on row-based input
  const newLayouts = new Array(totalKeys).fill(null);

  rowKeyMap.forEach((keyIndices, rowIndex) => {
    keyIndices.forEach((keyIdx, colIndex) => {
      if (keyIdx < totalKeys) {
        newLayouts[keyIdx] = {
          x: colIndex,
          y: rowIndex,
        };
      }
    });
  });

  props.config.layers = [cleanLayer];
  props.config.layouts = newLayouts;

  isIdentifying.value = false;
  emit("save");
};
</script>

<template>
  <div class="p-8 max-w-full mx-auto h-full overflow-y-auto">
    <h1 class="text-2xl font-bold mb-6 text-brand-400">Settings</h1>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
      <!-- Matrix Settings -->
      <section class="space-y-4">
        <h2
          class="text-lg font-semibold text-surface-200 border-b border-surface-700 pb-2"
        >
          Matrix Configuration
        </h2>

        <div
          class="bg-surface-900/50 p-6 rounded-xl border border-surface-800 space-y-6"
        >
          <div class="space-y-2">
            <label class="text-sm font-medium text-surface-400 block"
              >Diode Direction</label
            >
            <select
              v-model="config.matrix.diode_dir"
              class="input-sm w-full bg-surface-950"
            >
              <option value="COL2ROW">COL2ROW</option>
              <option value="ROW2COL">ROW2COL</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-surface-400 block"
              >Row Pins ({{ config.matrix.rows.length }})</label
            >
            <input
              type="text"
              :value="config.matrix.rows.join(', ')"
              @change="updateMatrixPins('rows', $event.target.value)"
              class="input-sm w-full font-mono text-sm bg-surface-950"
            />
            <p class="text-xs text-surface-500">
              Comma separated, e.g. GP0, GP1, GP2
            </p>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-surface-400 block"
              >Col Pins ({{ config.matrix.cols.length }})</label
            >
            <input
              type="text"
              :value="config.matrix.cols.join(', ')"
              @change="updateMatrixPins('cols', $event.target.value)"
              class="input-sm w-full font-mono text-sm bg-surface-950"
            />
          </div>

          <div class="pt-4 border-t border-surface-800">
            <button
              @click="startIdentification"
              :disabled="status.saving || !status.connected"
              class="btn btn-secondary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                v-if="status.saving"
                class="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <svg
                v-else
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Start Matrix Identification
            </button>
          </div>
        </div>
      </section>

      <!-- Features Settings -->
      <section class="space-y-4">
        <h2
          class="text-lg font-semibold text-surface-200 border-b border-surface-700 pb-2"
        >
          Features
        </h2>

        <div class="space-y-4">
          <!-- RGB -->
          <div
            class="bg-surface-900/50 p-6 rounded-xl border border-surface-800 transition-all"
            :class="{ 'border-brand-500/30': config.features.rgb.enable }"
          >
            <label
              class="flex items-center justify-between cursor-pointer mb-4"
            >
              <span class="font-medium text-surface-200">RGB Lighting</span>
              <div class="relative inline-flex items-center h-6 w-11 shrink-0">
                <input
                  type="checkbox"
                  v-model="config.features.rgb.enable"
                  class="peer sr-only"
                />
                <div
                  class="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:bg-brand-600 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"
                ></div>
              </div>
            </label>

            <div
              v-if="config.features.rgb.enable"
              class="grid grid-cols-2 gap-4 animate-fade-in"
            >
              <div class="space-y-1">
                <span class="text-xs text-surface-500">Data Pin</span>
                <input
                  type="text"
                  v-model="config.features.rgb.pin"
                  class="input-sm w-full font-mono text-brand-300 bg-surface-950"
                />
              </div>
              <div class="space-y-1">
                <span class="text-xs text-surface-500">Num LEDs</span>
                <input
                  type="number"
                  v-model.number="config.features.rgb.num_pixels"
                  class="input-sm w-full font-mono bg-surface-950"
                />
              </div>
            </div>
          </div>

          <!-- Encoder -->
          <div
            class="bg-surface-900/50 p-6 rounded-xl border border-surface-800 transition-all"
            :class="{ 'border-brand-500/30': config.features.encoder.enable }"
          >
            <label
              class="flex items-center justify-between cursor-pointer mb-4"
            >
              <span class="font-medium text-surface-200">Rotary Encoder</span>
              <div class="relative inline-flex items-center h-6 w-11 shrink-0">
                <input
                  type="checkbox"
                  v-model="config.features.encoder.enable"
                  class="peer sr-only"
                />
                <div
                  class="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:bg-brand-600 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"
                ></div>
              </div>
            </label>

            <div
              v-if="config.features.encoder.enable"
              class="grid grid-cols-2 gap-4 animate-fade-in"
            >
              <div class="space-y-1">
                <span class="text-xs text-surface-500">Pad A</span>
                <input
                  type="text"
                  v-model="config.features.encoder.pad_a"
                  class="input-sm w-full font-mono text-brand-300 bg-surface-950"
                />
              </div>
              <div class="space-y-1">
                <span class="text-xs text-surface-500">Pad B</span>
                <input
                  type="text"
                  v-model="config.features.encoder.pad_b"
                  class="input-sm w-full font-mono text-brand-300 bg-surface-950"
                />
              </div>
            </div>
          </div>

          <!-- OLED -->
          <div
            class="bg-surface-900/50 p-6 rounded-xl border border-surface-800 transition-all opacity-50 cursor-not-allowed"
            title="Coming Soon"
          >
            <label class="flex items-center justify-between cursor-pointer">
              <span class="font-medium text-surface-200">OLED Display</span>
              <div class="relative inline-flex items-center h-6 w-11 shrink-0">
                <input
                  type="checkbox"
                  v-model="config.features.oled.enable"
                  disabled
                  class="peer sr-only"
                />
                <div class="w-11 h-6 bg-surface-800 rounded-full"></div>
              </div>
            </label>
          </div>
        </div>
      </section>
    </div>

    <!-- Debug Console Section -->
    <section v-if="status.connected" class="space-y-4 mb-8">
      <h2
        class="text-lg font-semibold text-surface-200 border-b border-surface-700 pb-2"
      >
        Debug Console
      </h2>
      <DebugConsole :logs="logs" @send="handleSendRaw" />
    </section>

    <!-- Matrix Identification Modal -->
    <div
      v-if="isIdentifying"
      class="fixed inset-0 bg-black/80 backdrop-blur z-50 flex items-center justify-center p-4"
    >
      <div
        class="bg-surface-900 border border-surface-700 p-8 rounded-xl shadow-2xl max-w-2xl w-full"
      >
        <h3 class="text-2xl font-bold text-white mb-4 text-center">
          Identify Matrix
        </h3>
        <div
          class="bg-surface-800/50 rounded-lg p-4 mb-6 text-left space-y-2 text-sm text-surface-300"
        >
          <p><strong>Instructions:</strong></p>
          <p>1. The keyboard has been updated with a "Probe Config".</p>
          <p>
            2. Press <strong>ALL KEYS IN EACH ROW</strong>, from left to right.
          </p>
          <p>
            3. To move to next row:
            <strong>Press the last key twice</strong> (double-press).
          </p>
          <p>
            4. Each key press will show as a number. Keys on the same line =
            same physical row.
          </p>
        </div>

        <!-- Textarea with row labels -->
        <div class="mb-6 relative">
          <!-- Textarea -->
          <textarea
            id="matrixInput"
            v-model="matrixInput"
            @input="handleMatrixInput"
            :rows="Math.min(config.matrix.rows.length, 10)"
            class="w-full font-mono text-sm p-3 bg-surface-950 border border-surface-700 rounded-lg focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-surface-200 resize-none"
            placeholder="Row 1: Press keys...
Row 2: Press keys...
Row 3: Press keys...
Row 4: Press keys..."
            autocomplete="off"
          ></textarea>
        </div>

        <div class="flex gap-4">
          <button
            @click="isIdentifying = false"
            class="btn btn-ghost flex-1 border border-surface-700"
          >
            Cancel
          </button>
          <button @click="finishIdentification" class="btn btn-primary flex-1">
            Finish
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
