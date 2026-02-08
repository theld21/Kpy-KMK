<script setup>
import { computed, ref, watch, inject } from "vue";
import { KEY_GROUPS, ALL_KEYS } from "../data/keys.js";
import VisualKey from "../components/VisualKey.vue";

const props = defineProps({
  config: Object,
  status: Object,
});

const dialog = inject("dialog");

const currentLayer = ref(0);
const selectedKeyIndex = ref(null);
const searchKey = ref("");
const isEditingLayout = ref(false); // Toggle for Drag & Drop mode
const activeTab = ref("Basic"); // For Tabbed Key Picker
const viewingEncoder = ref(false); // Track if viewing encoder tab
const autoNextKey = ref(false); // Auto advance to next key after assignment

// --- Logic ---
const formatKey = (keyString) => {
  if (!keyString) return "";
  return keyString.replace("KC.", "");
};

// Filter keys based on search OR active tab
const filteredKeys = computed(() => {
  const query = searchKey.value.toLowerCase();

  // If searching, search EVERYTHING
  if (query) {
    const result = [];
    ALL_KEYS.forEach((k) => {
      if (k.toLowerCase().includes(query)) {
        result.push(k);
      }
    });
    return { "Search Results": result };
  }

  // Otherwise return just the active tab's keys
  // Handle "Layers" specifically as it's dynamic
  if (activeTab.value === "Layers") {
    return { "Layer Switching": layerKeys.value };
  }

  // Handle "Encoder" specifically (if we treat it as a category)
  // For now, let's just stick to KEY_GROUPS categories + "Layers"
  if (KEY_GROUPS[activeTab.value]) {
    return { [activeTab.value]: KEY_GROUPS[activeTab.value] };
  }

  return {};
});

const categories = computed(() => {
  return ["Layers", ...Object.keys(KEY_GROUPS)];
});

const assignKey = (kc) => {
  if (selectedKeyIndex.value === null) return;

  // Handle encoder keys
  if (selectedKeyIndex.value === "encoder_ccw") {
    assignEncoderKey(0, kc);
    return;
  }
  if (selectedKeyIndex.value === "encoder_cw") {
    assignEncoderKey(1, kc);
    return;
  }

  // Handle regular keys
  if (!props.config.layers[currentLayer.value]) return;
  props.config.layers[currentLayer.value][selectedKeyIndex.value] = kc;

  // Auto advance to next key if enabled
  if (autoNextKey.value) {
    // Build list of visible keys sorted by position (row by row, left to right)
    const visibleKeys = [];
    for (let i = 0; i < props.config.layouts.length; i++) {
      const layout = props.config.layouts[i];
      if (layout && layout !== null) {
        visibleKeys.push({ index: i, x: layout.x, y: layout.y });
      }
    }

    // Sort by y (row) then x (column)
    visibleKeys.sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });

    // Find current key position in sorted list
    const currentPos = visibleKeys.findIndex(
      (k) => k.index === selectedKeyIndex.value,
    );

    // Move to next visible key
    if (currentPos !== -1 && currentPos + 1 < visibleKeys.length) {
      selectedKeyIndex.value = visibleKeys[currentPos + 1].index;
    }
  }
};

const assignEncoderKey = (direction, kc) => {
  // direction: 0 = CCW (counter-clockwise), 1 = CW (clockwise)
  if (!props.config.encoder_map || !props.config.encoder_map[0]) {
    props.config.encoder_map = [["KC.VOLD", "KC.VOLU"]];
  }
  props.config.encoder_map[0][direction] = kc;
};

// --- Layer Management ---
const addLayer = () => {
  const size = props.config.layers[0] ? props.config.layers[0].length : 0;
  const newLayer = new Array(size).fill("KC.TRNS");
  props.config.layers.push(newLayer);
  currentLayer.value = props.config.layers.length - 1;
};

const removeLayer = async (idx) => {
  if (props.config.layers.length <= 1) return;

  const confirmed = await dialog.confirm(
    `Delete Layer ${idx}? This cannot be undone.`,
    "Delete Layer",
  );

  if (confirmed) {
    props.config.layers.splice(idx, 1);
    if (currentLayer.value >= props.config.layers.length) {
      currentLayer.value = props.config.layers.length - 1;
    }
  }
};

const layerKeys = computed(() => {
  const keys = [];
  for (let i = 0; i < props.config.layers.length; i++) {
    keys.push(`KC.MO(${i})`, `KC.TO(${i})`, `KC.TG(${i})`);
  }
  return keys;
});

// --- Layout Management ---
watch(
  () => props.config,
  (newVal) => {
    if (!newVal.layouts) newVal.layouts = [];

    // Auto-generate grid if empty
    const keyCount = newVal.matrix.rows.length * newVal.matrix.cols.length;
    const currentKeys = newVal.layers[0] ? newVal.layers[0].length : 0;

    if (newVal.layouts.length < currentKeys) {
      const cols = newVal.matrix.cols.length || 10;
      for (let i = newVal.layouts.length; i < currentKeys; i++) {
        newVal.layouts.push({
          x: i % cols,
          y: Math.floor(i / cols),
        });
      }
    }
  },
  { deep: true, immediate: true },
);

const updateKeyPosition = (index, newPos) => {
  if (props.config.layouts[index]) {
    props.config.layouts[index].x = newPos.x;
    props.config.layouts[index].y = newPos.y;
  }
};
</script>

<template>
  <div class="flex h-full overflow-hidden">
    <!-- Right Sidebar (Key Picker) -->
    <aside
      class="w-80 border-r border-surface-800 bg-surface-900/30 flex flex-col shrink-0"
    >
      <!-- Search & Tabs Header -->
      <div class="p-4 border-b border-surface-800 bg-surface-900 z-10">
        <h2
          class="text-xs font-bold text-surface-400 uppercase tracking-wider mb-3"
        >
          Key Picker
        </h2>

        <!-- Categories (Horizontal Scroll) -->
        <select
          v-model="activeTab"
          @change="searchKey = ''"
          class="input-sm w-full bg-surface-800 border-surface-700 focus:border-brand-500 mb-4 text-sm"
        >
          <option v-for="cat in categories" :key="cat" :value="cat">
            {{ cat }}
          </option>
        </select>

        <input
          type="text"
          v-model="searchKey"
          placeholder="Search keys..."
          class="input-sm w-full bg-surface-800 border-surface-700 focus:border-brand-500 mb-4 text-sm"
        />
      </div>

      <!-- Key Grid -->
      <div class="flex-1 overflow-y-auto p-4 content-start">
        <p
          v-if="searchKey && !Object.keys(filteredKeys).length"
          class="text-center text-surface-500 text-sm mt-8"
        >
          No keys found.
        </p>

        <div
          v-for="(group, groupName) in filteredKeys"
          :key="groupName"
          class="mb-6 last:mb-0"
        >
          <h3
            v-if="Object.keys(filteredKeys).length > 1"
            class="text-xs font-bold text-surface-500 mb-3 uppercase tracking-wider pl-1"
          >
            {{ groupName }}
          </h3>

          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="key in group"
              :key="key"
              @click="assignKey(key)"
              class="aspect-square flex items-center justify-center rounded bg-surface-800 border border-surface-700 text-[10px] font-mono hover:bg-surface-700 hover:border-brand-500 hover:text-brand-300 transition-all text-center break-words p-1 shadow-sm"
            >
              {{ key.replace("KC.", "") }}
            </button>
          </div>
        </div>
      </div>
    </aside>

    <!-- Center (Keyboard Preview) -->
    <section class="flex-1 min-w-0 flex flex-col bg-surface-950 relative">
      <!-- Toolbar -->
      <div
        class="h-12 border-b border-surface-800 flex items-center px-4 gap-4 bg-surface-900/20 justify-between shrink-0"
      >
        <!-- Layer Tabs -->
        <div
          class="flex items-center gap-1 overflow-x-auto no-scrollbar mask-grad flex-1"
        >
          <!-- Encoder Tab (only show if encoder is enabled) -->
          <div v-if="config.features.encoder.enable" class="relative shrink-0">
            <button
              @click="
                viewingEncoder = true;
                currentLayer = 0;
              "
              class="px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5"
              :class="
                viewingEncoder
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'
              "
            >
              <svg
                class="w-3 h-3"
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
              Encoder
            </button>
          </div>
          <div
            v-for="(layer, idx) in config.layers"
            :key="idx"
            class="relative group shrink-0"
          >
            <button
              @click="
                viewingEncoder = false;
                currentLayer = idx;
              "
              class="px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap"
              :class="
                currentLayer === idx && !viewingEncoder
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'
              "
            >
              Layer {{ idx }}
            </button>

            <!-- Delete Layer Button -->
            <button
              v-if="config.layers.length > 1"
              @click.stop="removeLayer(idx)"
              class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 text-xs font-bold"
              title="Delete Layer"
            >
              ×
            </button>
          </div>

          <div class="w-px h-6 bg-surface-800 mx-2 shrink-0"></div>

          <button
            @click="addLayer"
            class="w-7 h-7 flex items-center justify-center rounded-full text-surface-500 hover:bg-surface-800 hover:text-brand-400 transition-colors shrink-0"
            title="Add Layer"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>

        <!-- Auto Next Key Toggle -->
        <label
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 cursor-pointer bg-surface-800 text-surface-400 border-surface-700 hover:text-white"
        >
          <input
            type="checkbox"
            v-model="autoNextKey"
            class="w-4 h-4 rounded border-surface-600 bg-surface-900 text-brand-500 focus:ring-brand-500 focus:ring-offset-0 cursor-pointer"
          />
          Auto Next Key
        </label>

        <!-- Edit Layout Toggle -->
        <button
          @click="isEditingLayout = !isEditingLayout"
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0"
          :class="
            isEditingLayout
              ? 'bg-brand-500 text-white border-brand-400 animate-pulse-slow'
              : 'bg-surface-800 text-surface-400 border-surface-700 hover:text-white'
          "
        >
          <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
          {{ isEditingLayout ? "Finish Editing" : "Edit Layout" }}
        </button>
      </div>

      <!-- Encoder Mapping UI (shown when encoder tab is active) -->
      <div
        v-if="viewingEncoder && config.features.encoder.enable"
        class="flex-1 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/10 via-surface-950 to-surface-950"
      >
        <div class="text-center max-w-2xl px-8">
          <div class="mb-8">
            <div
              class="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-500/10 flex items-center justify-center border-2 border-purple-500/30"
            >
              <svg
                class="w-10 h-10 text-purple-400"
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
            </div>
            <h3 class="text-2xl font-bold text-white mb-2">
              Rotary Encoder Mapping
            </h3>
            <p class="text-surface-400 text-sm">
              Click a button below, then select a key from the sidebar
            </p>
          </div>

          <div class="grid grid-cols-2 gap-6 max-w-md mx-auto">
            <!-- Counter-Clockwise (CCW) -->
            <div class="space-y-3">
              <div
                class="text-xs font-bold text-surface-500 uppercase tracking-wider"
              >
                Counter-Clockwise
              </div>
              <button
                @click="selectedKeyIndex = 'encoder_ccw'"
                class="w-full aspect-square rounded-2xl border-4 transition-all flex flex-col items-center justify-center gap-3 group"
                :class="
                  selectedKeyIndex === 'encoder_ccw'
                    ? 'bg-purple-500/20 border-purple-500 shadow-lg shadow-purple-500/30'
                    : 'bg-surface-800/50 border-surface-700 hover:border-purple-500/50 hover:bg-surface-800'
                "
              >
                <svg
                  class="w-12 h-12 transition-transform group-hover:-rotate-[-45deg]"
                  :class="
                    selectedKeyIndex === 'encoder_ccw'
                      ? 'text-purple-400'
                      : 'text-surface-500'
                  "
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z"
                  />
                </svg>
                <div class="text-center">
                  <div
                    class="text-2xl font-bold font-mono"
                    :class="
                      selectedKeyIndex === 'encoder_ccw'
                        ? 'text-purple-300'
                        : 'text-surface-300'
                    "
                  >
                    {{ formatKey(config.encoder_map?.[0]?.[0] || "KC.VOLD") }}
                  </div>
                  <div class="text-[10px] text-surface-500 mt-1">
                    Rotate Left
                  </div>
                </div>
              </button>
            </div>

            <!-- Clockwise (CW) -->
            <div class="space-y-3">
              <div
                class="text-xs font-bold text-surface-500 uppercase tracking-wider"
              >
                Clockwise
              </div>
              <button
                @click="selectedKeyIndex = 'encoder_cw'"
                class="w-full aspect-square rounded-2xl border-4 transition-all flex flex-col items-center justify-center gap-3 group"
                :class="
                  selectedKeyIndex === 'encoder_cw'
                    ? 'bg-purple-500/20 border-purple-500 shadow-lg shadow-purple-500/30'
                    : 'bg-surface-800/50 border-surface-700 hover:border-purple-500/50 hover:bg-surface-800'
                "
              >
                <svg
                  class="w-12 h-12 transition-transform group-hover:rotate-45"
                  :class="
                    selectedKeyIndex === 'encoder_cw'
                      ? 'text-purple-400'
                      : 'text-surface-500'
                  "
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div class="text-center">
                  <div
                    class="text-2xl font-bold font-mono"
                    :class="
                      selectedKeyIndex === 'encoder_cw'
                        ? 'text-purple-300'
                        : 'text-surface-300'
                    "
                  >
                    {{ formatKey(config.encoder_map?.[0]?.[1] || "KC.VOLU") }}
                  </div>
                  <div class="text-[10px] text-surface-500 mt-1">
                    Rotate Right
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Canvas (Keyboard Preview - hidden when viewing encoder) -->
      <div
        v-if="!viewingEncoder"
        class="flex-1 overflow-auto relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-surface-900 via-surface-950 to-surface-950"
        :class="{ 'flex items-center justify-center': !status.connected }"
      >
        <!-- Disconnected State -->
        <div v-if="!status.connected" class="text-center p-8 opacity-50">
          <div
            class="w-24 h-24 mx-auto mb-4 rounded-full bg-surface-800 flex items-center justify-center"
          >
            <svg
              class="w-10 h-10 text-surface-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 class="text-xl font-bold text-surface-300 mb-2">
            No Keyboard Connected
          </h3>
          <p class="text-surface-500 max-w-xs mx-auto">
            Click the "Connect" button in the top right to start configuring
            your KMK device.
          </p>
        </div>

        <!-- Connected Grid -->
        <div v-else class="w-[2000px] h-[2000px] relative">
          <template
            v-for="(key, idx) in config.layers[currentLayer]"
            :key="idx"
          >
            <VisualKey
              v-if="config.layouts[idx]"
              :keyIndex="idx"
              :x="config.layouts[idx].x"
              :y="config.layouts[idx].y"
              :label="formatKey(key)"
              :editing="isEditingLayout"
              @update:position="(pos) => updateKeyPosition(idx, pos)"
              @select="selectedKeyIndex = idx"
              :class="{
                'border-brand-500 scale-105 z-20 ring-2 ring-brand-500 shadow-[0_0_20px_rgba(20,184,166,0.3)]':
                  selectedKeyIndex === idx && !isEditingLayout,
              }"
            />
          </template>
        </div>
      </div>
    </section>
  </div>
</template>
