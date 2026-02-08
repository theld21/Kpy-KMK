<script setup>
import { useDraggable } from "@vueuse/core";
import { ref, watch, onMounted } from "vue";

const props = defineProps({
  keyIndex: Number,
  x: Number,
  y: Number,
  label: String,
  editing: Boolean,
});

const emit = defineEmits(["update:position", "select"]);

const el = ref(null);

// NOTE: useDraggable uses window coordinates by default.
// We need relative coordinates to the container.
// For simplicity in this v1 of Editor, let's use a simpler onMousedown approach
// or use style bindings directly if we assume grid snapping isn't strictly enforced yet,
// OR we just map visual x/y to style.left/top.

// Let's interpret x/y as "grid units" (approx 64px + gap).
const GRID_SIZE = 70; // 64px key + gap
const OFFSET_X = 50;
const OFFSET_Y = 50;

// If editing is enabled, allow drag.
// We'll use a simple native drag implementation for "grid snapping".

const startDrag = (event) => {
  if (!props.editing) {
    emit("select");
    return;
  }

  const startX = event.clientX;
  const startY = event.clientY;
  const initialUnitX = props.x;
  const initialUnitY = props.y;

  const onMouseMove = (e) => {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // Calculate new grid units
    // Round to nearest 0.5 unit (half-grid)
    const newUnitX = Math.max(
      0,
      Math.round((initialUnitX + dx / GRID_SIZE) * 2) / 2,
    );
    const newUnitY = Math.max(
      0,
      Math.round((initialUnitY + dy / GRID_SIZE) * 2) / 2,
    );

    emit("update:position", { x: newUnitX, y: newUnitY });
  };

  const onMouseUp = () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
};
</script>

<template>
  <div
    ref="el"
    @mousedown="startDrag"
    class="absolute w-16 h-16 rounded-xl flex items-center justify-center text-sm font-bold shadow-md transition-all duration-75 select-none border z-10"
    :class="[
      editing
        ? 'cursor-move border-brand-500/50 border-dashed bg-brand-500/5 hover:bg-brand-500/20'
        : 'cursor-pointer border-surface-700/50 bg-surface-800/50 text-surface-300 hover:-translate-y-0.5',
    ]"
    :style="{
      left: x * GRID_SIZE + OFFSET_X + 'px',
      top: y * GRID_SIZE + OFFSET_Y + 'px',
    }"
  >
    <span class="z-10">{{ label }}</span>

    <!-- Depth Effect (only when not editing for cleaner look) -->
    <div
      v-if="!editing"
      class="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-black/20 pointer-events-none"
    ></div>

    <div
      v-if="editing"
      class="absolute -top-2 -right-2 text-[10px] bg-brand-600 text-white px-1 rounded-full opacity-50"
    >
      {{ keyIndex }}
    </div>
  </div>
</template>
