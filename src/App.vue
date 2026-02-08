<script setup>
import { reactive, onMounted, ref, provide } from "vue";
import { useRouter } from "vue-router";
import { SerialManager } from "./utils/serial.js";
import UiModal from "./components/UiModal.vue";

const router = useRouter();
const serial = new SerialManager();

// --- Global State ---
const status = reactive({
  connected: false,
  saving: false,
  message: "Ready to connect",
});

const config = reactive({
  info: { name: "", version: "" },
  matrix: { cols: [], rows: [], diode_dir: "COL2ROW" },
  features: {
    rgb: { enable: false, pin: "GP0", num_pixels: 0 },
    encoder: { enable: false, pad_a: "GP0", pad_b: "GP1" },
    oled: { enable: false },
  },
  layers: [],
  encoder_map: [],
  layouts: [], // For Visual Editor
});

const logs = ref([]);
let expectingDisconnect = false; // Flag to track if disconnect is expected (during save)
let configBackup = null; // Backup config before save

// --- Loading Overlay State ---
const loadingOverlay = reactive({
  visible: false,
  message: "",
});

// --- Serial Log Handler ---
serial.setOnLog((line) => {
  // Keep last 1000 lines
  if (logs.value.length > 1000) logs.value.shift();
  logs.value.push(line);
});

serial.setOnDisconnect(async () => {
  const wasExpected = expectingDisconnect;
  expectingDisconnect = false;

  status.connected = false;
  status.message = "Disconnected";

  if (wasExpected && configBackup) {
    // Show loading overlay
    loadingOverlay.visible = true;
    loadingOverlay.message = "Saving config...";

    // Auto-reconnect after device reset
    status.message = "Reconnecting...";
    await new Promise((r) => setTimeout(r, 2000)); // Wait for device to boot

    loadingOverlay.message = "Reconnecting to keyboard...";

    try {
      await serial.connect();
      status.connected = true;
      status.message = "Reading config...";

      loadingOverlay.message = "Reading configuration...";

      // Read the new config from device
      const deviceConfig = await serial.readConfig();

      // Restore our local config (don't overwrite with device config)
      Object.assign(config, configBackup);
      configBackup = null;

      loadingOverlay.visible = false;
      status.message = "Connected";
    } catch (err) {
      console.error("Auto-reconnect failed:", err);
      status.message = "Reconnect failed";
      loadingOverlay.visible = false;

      // Restore backup anyway
      if (configBackup) {
        Object.assign(config, configBackup);
        configBackup = null;
      }

      // Show error dialog
      dialog.alert(
        "Failed to reconnect automatically. Please click 'Connect' button to reconnect manually.",
        "Reconnection Failed",
      );
    }
  }
});

// --- Modal System ---
const modalState = reactive({
  isOpen: false,
  type: "alert",
  title: "",
  message: "",
  resolve: null,
  reject: null,
});

const dialog = {
  confirm: (message, title = "Confirm") => {
    return new Promise((resolve, reject) => {
      modalState.type = "confirm";
      modalState.title = title;
      modalState.message = message;
      modalState.isOpen = true;
      modalState.resolve = resolve;
      modalState.reject = reject;
    });
  },
  alert: (message, title = "Notice") => {
    return new Promise((resolve) => {
      modalState.type = "alert";
      modalState.title = title;
      modalState.message = message;
      modalState.isOpen = true;
      modalState.resolve = resolve;
      modalState.reject = null;
    });
  },
};

const handleModalConfirm = () => {
  if (modalState.resolve) modalState.resolve(true);
  closeModal();
};

const handleModalCancel = () => {
  if (modalState.reject) modalState.reject(false); // Or resolve(false) depending on preference, usually reject for confirm flow or resolve(false)
  // Let's stick to standard confirm behavior: resolve(true) on OK, resolve(false) on Cancel/Reject?
  // Actually standard window.confirm returns true/false.
  // The implementations above used resolve/reject. Let's start with resolve(false) for easier handling without try-catch everywhere.
  if (modalState.resolve) modalState.resolve(false);
  closeModal();
};

const closeModal = () => {
  modalState.isOpen = false;
  modalState.resolve = null;
  modalState.reject = null;
};

provide("dialog", dialog);

// --- Actions ---
const connectDevice = async () => {
  try {
    status.saving = false; // Reset saving state in case it was stuck
    status.message = "Connecting...";
    await serial.connect();
    status.connected = true;
    status.message = "Reading config...";

    const currentConfig = await serial.readConfig();
    console.log("Read Config:", currentConfig);

    Object.assign(config, currentConfig);

    if (!config.layers || config.layers.length === 0) {
      config.layers = [[]];
    }

    status.message = "Connected";
  } catch (err) {
    console.error(err);
    status.connected = false;
    status.message = "Connection failed";
    dialog.alert("Failed to connect: " + err.message, "Connection Error");
  }
};

const saveConfig = async () => {
  if (!status.connected) return;

  try {
    status.saving = true;
    status.message = "Saving...";

    // Backup current config before save
    configBackup = JSON.parse(JSON.stringify(config));
    expectingDisconnect = true;

    // Deep copy
    const dataToSend = JSON.parse(JSON.stringify(config));

    // Race against a timeout in case the device reboots immediately
    // If the device reboots, the serial write might hang or fail silently.
    // We assume if it takes longer than 1s, the command was sent and device is rebooting.
    const savePromise = serial.sendConfig(dataToSend);
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1000));

    await Promise.race([savePromise, timeoutPromise]);

    status.message = "Saved!";
    // Don't reset message here - let auto-reconnect handle it
  } catch (err) {
    console.error(err);
    expectingDisconnect = false;
    configBackup = null;
    status.message = "Save failed";
    dialog.alert("Failed to save: " + err.message, "Save Error");
  } finally {
    status.saving = false;
  }
};

const sendRaw = async (cmd) => {
  if (!status.connected) return;
  try {
    await serial.sendRaw(cmd);
    // logs.value.push(`> ${cmd}`); // Optional: echo command
  } catch (err) {
    console.error(err);
    dialog.alert("Failed to send command: " + err.message);
  }
};
</script>

<template>
  <div
    class="h-screen flex flex-col overflow-hidden bg-surface-950 text-surface-100 font-sans"
  >
    <!-- Header -->
    <header
      class="h-16 border-b border-surface-800 bg-surface-900/50 backdrop-blur flex items-center justify-between px-6 z-10 shrink-0"
    >
      <div class="flex items-center gap-8">
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.3)]"
          >
            <svg
              class="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
          </div>
          <h1
            class="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-surface-400 bg-clip-text text-transparent"
          >
            Kpy Configurator
          </h1>
        </div>

        <!-- Navigation -->
        <nav
          class="flex items-center gap-1 bg-surface-800/50 p-1 rounded-lg border border-surface-700/50"
        >
          <router-link
            to="/"
            class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:text-white"
            active-class="bg-surface-700 text-white shadow-sm"
            >Keymap</router-link
          >
          <router-link
            to="/settings"
            class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:text-white"
            active-class="bg-surface-700 text-white shadow-sm"
            >Settings</router-link
          >
        </nav>
      </div>

      <div class="flex items-center gap-4">
        <!-- Status Badge -->
        <div
          class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-800/50 border border-surface-700/50 text-xs font-medium transition-colors"
          :class="{
            'border-brand-500/30 bg-brand-500/10 text-brand-300':
              status.connected,
            'text-surface-400': !status.connected,
          }"
        >
          <div
            class="w-1.5 h-1.5 rounded-full"
            :class="
              status.connected ? 'bg-brand-400 animate-pulse' : 'bg-surface-500'
            "
          ></div>
          {{ status.message }}
        </div>

        <!-- Action Buttons -->

        <button
          v-if="!status.connected"
          @click="connectDevice"
          class="btn btn-primary group"
        >
          <svg
            class="w-4 h-4 mr-2 group-hover:animate-pulse"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Connect
        </button>

        <button
          v-else
          @click="saveConfig"
          :disabled="status.saving"
          class="btn btn-primary relative overflow-hidden group"
        >
          <span class="relative z-10 flex items-center">
            <svg
              v-if="!status.saving"
              class="w-4 h-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <svg
              v-else
              class="w-4 h-4 mr-2 animate-spin"
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
            {{ status.saving ? "Saving..." : "Save to Keyboard" }}
          </span>
          <div v-if="status.saving" class="absolute inset-0 bg-white/20"></div>
        </button>
      </div>
    </header>

    <!-- Main Content (Router View) -->
    <main class="flex-1 overflow-hidden">
      <router-view
        :config="config"
        :status="status"
        :logs="logs"
        @save="saveConfig"
        @send-raw="sendRaw"
      ></router-view>
    </main>
    <!-- Global Modal -->
    <UiModal
      :isOpen="modalState.isOpen"
      :type="modalState.type"
      :title="modalState.title"
      :message="modalState.message"
      @confirm="handleModalConfirm"
      @cancel="handleModalCancel"
    />

    <!-- Global Loading Overlay -->
    <div
      v-if="loadingOverlay.visible"
      class="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center"
    >
      <div class="text-center max-w-md px-8">
        <!-- Spinner -->
        <div class="mb-6 flex justify-center">
          <div class="relative">
            <div
              class="w-20 h-20 border-4 border-surface-700 rounded-full"
            ></div>
            <div
              class="w-20 h-20 border-4 border-brand-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0"
            ></div>
          </div>
        </div>

        <!-- Message -->
        <h3 class="text-xl font-bold text-white mb-3">
          {{ loadingOverlay.message }}
        </h3>
      </div>
    </div>
  </div>
</template>
