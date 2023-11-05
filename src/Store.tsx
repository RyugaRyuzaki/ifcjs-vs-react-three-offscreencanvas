import { create } from "zustand";
export const useStore = create((set) => ({
	file: null,
	fetch: async () => {
		const input = document.createElement("input");

		input.setAttribute("type", "file");

		input.onchange = async (e: any) => {
			const file = e.target.files[0] as File;
			set({ file: file });
		};
		input.click();
		input.remove();
	},
	dispose: () => {
		set({ file: null });
	},
}));
