<script setup>
import { onMounted, onUnmounted, ref } from "vue";

const props = defineProps({
  isOpen: Boolean,
  title: String,
  message: String,
  type: {
    type: String,
    default: "alert", // 'alert' or 'confirm'
  },
  confirmText: {
    type: String,
    default: "OK",
  },
  cancelText: {
    type: String,
    default: "Cancel",
  },
});

const emit = defineEmits(["confirm", "cancel"]);

// Close on Escape
const handleKeydown = (e) => {
  if (props.isOpen && e.key === "Escape") {
    if (props.type === "confirm") emit("cancel");
    else emit("confirm"); // Alert just closes
  }
};

onMounted(() => window.addEventListener("keydown", handleKeydown));
onUnmounted(() => window.removeEventListener("keydown", handleKeydown));
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="type === 'confirm' ? emit('cancel') : emit('confirm')"
      >
        <div
          class="bg-surface-900 border border-surface-700 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in"
        >
          <!-- Header -->
          <div
            class="px-6 py-4 border-b border-surface-800 flex justify-between items-center bg-surface-800/50"
          >
            <h3 class="text-lg font-bold text-white">{{ title }}</h3>
          </div>

          <!-- Body -->
          <div class="p-6 text-surface-300 leading-relaxed">
            {{ message }}
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 bg-surface-950/30 flex justify-end gap-3">
            <button
              v-if="type === 'confirm'"
              @click="emit('cancel')"
              class="btn btn-ghost"
            >
              {{ cancelText }}
            </button>
            <button
              @click="emit('confirm')"
              class="btn btn-primary min-w-[80px]"
              ref="confirmBtn"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.animate-scale-in {
  animation: scaleIn 0.2s ease-out;
}

@keyframes scaleIn {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
