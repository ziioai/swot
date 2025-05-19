// @unocss-include

import { h as vnd, defineComponent, ref } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';

/**
 * A dialog component for uploading files with drag and drop support
 */
export default defineComponent({
  name: "FileUploadDialog",
  props: {
    visible: {
      type: Boolean,
      required: true
    },
    title: {
      type: String,
      default: "上传文件"
    },
    acceptedFileTypes: {
      type: String,
      default: "application/json"
    }
  },
  emits: ['update:visible', 'fileUploaded'],
  setup(props, { emit }) {
    const toast = useToast();
    const dragActive = ref(false);
    const fileInputRef = ref<HTMLInputElement | null>(null);

    // Handle file selection from the file input
    const handleFileInput = (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (input.files && input.files.length > 0) {
        processFile(input.files[0]);
      }
    };

    // Handle drag events
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragActive.value = true;
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragActive.value = true;
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragActive.value = false;
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragActive.value = false;
      
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        processFile(e.dataTransfer.files[0]);
      }
    };

    // Process the selected file
    const processFile = (file: File) => {
      // // Check if the file type is accepted
      // if (props.acceptedFileTypes && !file.type.match(props.acceptedFileTypes)) {
      //   toast.add({
      //     severity: "error",
      //     summary: "文件类型错误",
      //     detail: `请上传 ${props.acceptedFileTypes} 类型的文件`,
      //     life: 3000
      //   });
      //   return;
      // }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          // Emit the file content
          emit('fileUploaded', {
            name: file.name,
            content: e.target?.result,
            file: file
          });
          
          // Close the dialog
          emit('update:visible', false);
          
          toast.add({
            severity: "success",
            summary: "文件上传成功",
            detail: `已成功上传文件 ${file.name}`,
            life: 3000
          });
        } catch (error: any) {
          toast.add({
            severity: "error",
            summary: "文件处理错误",
            detail: error.message || "无法处理上传的文件",
            life: 3000
          });
        }
      };

      reader.onerror = () => {
        toast.add({
          severity: "error",
          summary: "读取文件错误",
          detail: "无法读取上传的文件",
          life: 3000
        });
      };

      // Read the file as text
      reader.readAsText(file);
    };

    // Trigger the file input click
    const openFileSelector = () => {
      fileInputRef.value?.click();
    };

    return () => {
      return vnd(Dialog, {
        visible: props.visible,
        header: props.title,
        modal: true,
        'onUpdate:visible': (value: boolean) => emit('update:visible', value),
        style: { width: '30rem' },
        class: "p-fluid"
      }, {
        default: () => [
          // Hidden file input
          vnd('input', {
            ref: fileInputRef,
            type: 'file',
            accept: props.acceptedFileTypes,
            style: { display: 'none' },
            onChange: handleFileInput
          }),
          
          // Drag & Drop area
          vnd('div', {
            class: [
              'border-2 border-dashed rounded-lg p-6 mb-4 text-center cursor-pointer transition-all',
              dragActive.value ? 'border-primary bg-primary-50 dark:bg-primary-900/20' : 'border-gray-300 dark:border-gray-700',
            ],
            onDragenter: handleDragEnter,
            onDragover: handleDragOver,
            onDragleave: handleDragLeave,
            onDrop: handleDrop,
            onClick: openFileSelector
          }, [
            vnd('i', { 
              class: ['pi pi-upload text-4xl mb-3', dragActive.value ? 'text-primary' : 'text-gray-500'] 
            }),
            vnd('h3', { class: 'font-medium mb-2' }, '拖拽文件到此处或点击上传'),
            vnd('p', { class: 'text-sm text-gray-600 dark:text-gray-400 mb-0' }, 
              `支持的文件类型: ${props.acceptedFileTypes === 'application/json' ? 'JSON' : props.acceptedFileTypes}`
            ),
          ]),
          
          // Buttons
          vnd('div', { class: 'flex justify-end gap-2' }, [
            vnd(Button, {
              label: '选择文件',
              icon: 'pi pi-folder-open',
              onClick: openFileSelector
            }),
            vnd(Button, {
              label: '取消',
              icon: 'pi pi-times',
              class: 'p-button-secondary',
              onClick: () => emit('update:visible', false)
            })
          ])
        ]
      });
    };
  }
});
