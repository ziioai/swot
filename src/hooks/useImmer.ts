import { reactive } from 'vue';
import { produce } from 'immer';

export function useImmer(initialState: any) {
  const state = reactive(initialState);

  const updateState = (updater: any) => {
    const nextState = produce(state, updater);
    Object.assign(state, nextState);
  };

  return [state, updateState];
}
