// @unocss-include

import { h as vnd, defineComponent, PropType } from 'vue';
import InputNumber from 'primevue/inputnumber';

export default defineComponent({
  name: "NumberInputField",
  props: {
    label: {
      type: String,
      required: true
    },
    modelValue: {
      type: Number,
      required: true
    },
    description: {
      type: Function as PropType<(value: number) => string>,
      required: false
    },
    showButtons: {
      type: Boolean,
      default: true
    },
    id: {
      type: String,
      default: ''
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => vnd("div", { class: "flex-auto" }, [
      vnd("label", { class: "block mb-2", for: props.id }, props.label),
      vnd(InputNumber, { 
        showButtons: props.showButtons,
        modelValue: props.modelValue,
        class: "w-100%",
        id: props.id,
        inputId: props.id,
        'onUpdate:modelValue': (value: number) => emit('update:modelValue', value)
      }),
      vnd("p", { class: "text-xs opacity-60 my-2" }, props?.description?.(props.modelValue))
    ]);
  }
});


