<script setup>
import { ref, watch, nextTick } from "vue";

const props = defineProps({
  logs: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["send"]);

const command = ref("");
const logContainer = ref(null);
const autoScroll = ref(true);

const sendCommand = () => {
  if (!command.value.trim()) return;
  emit("send", command.value);
  command.value = "";
};

const clearLogs = () => {
  // We can't clear props, so we just emit an event if we want parent to clear,
  // or we just accept we can't clear from here.
  // For now let's just not implement clear, or emit 'clear'.
};

// Auto scroll to bottom
watch(
  () => props.logs.length,
  async () => {
    if (autoScroll.value && logContainer.value) {
      await nextTick();
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
    }
  },
);
</script>

<template>
  <div
    class="flex flex-col h-96 bg-[#1e1e1e] rounded-lg overflow-hidden border border-surface-700 font-mono text-xs"
  >
    <!-- Toolbar -->
    <div
      class="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]"
    >
      <span class="text-surface-400 font-bold">Serial Monitor</span>
      <div class="flex items-center gap-2">
        <label
          class="flex items-center gap-2 cursor-pointer text-surface-400 hover:text-surface-200"
        >
          <input
            type="checkbox"
            v-model="autoScroll"
            class="rounded bg-surface-800 border-surface-600 text-brand-500 focus:ring-0 w-3 h-3"
          />
          <span>Autoscroll</span>
        </label>
      </div>
    </div>

    <!-- Logs -->
    <div
      ref="logContainer"
      class="flex-1 overflow-y-auto p-4 space-y-1 text-surface-200"
    >
      <div v-if="logs.length === 0" class="text-surface-600 italic">
        No logs yet...
      </div>
      <div
        v-for="(log, idx) in logs"
        :key="idx"
        class="break-words whitespace-pre-wrap"
      >
        <span class="opacity-50 select-none mr-2">{{
          new Date().toLocaleTimeString()
        }}</span>
        <span>{{ log }}</span>
      </div>
    </div>

    <!-- Input -->
    <div class="p-2 bg-[#252526] border-t border-[#333] flex gap-2">
      <span class="text-brand-500 font-bold self-center">&gt;</span>
      <input
        v-model="command"
        @keydown.enter="sendCommand"
        type="text"
        placeholder="Send command..."
        class="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-surface-600 outline-none"
      />
      <button
        @click="sendCommand"
        class="px-3 py-1 bg-surface-700 hover:bg-surface-600 text-white rounded text-xs transition-colors"
      >
        Send
      </button>
    </div>
  </div>
</template>
