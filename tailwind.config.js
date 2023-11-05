/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			colors: {
				white: "#F2F2F2",
				black: "#0D0D0D",
				halfBlack: "#2a2a2a",
				error: "#FF5252",
				warning: "#FB8C00",
				success: "#4CAF50",
			},
			borderWidth: {
				1: "1px",
			},
			fontSize: {
				xs: ["12px", { lineHeight: "1rem" }],
				sm: ["14px", { lineHeight: "1.25rem" }],
				base: ["16px", { lineHeight: "1.5rem" }],
				lg: ["18px", { lineHeight: "1.75rem" }],
				xl: ["20px", { lineHeight: "1.75rem" }],
				"2xl": ["22px", { lineHeight: "2rem" }],
				"3xl": ["24px", { lineHeight: "2.25rem" }],
				"4xl": ["26px", { lineHeight: "2.5rem" }],
				"5xl": ["28px", { lineHeight: "1" }],
				"6xl": ["30px", { lineHeight: "1" }],
				"7xl": ["32px", { lineHeight: "1" }],
				"8xl": ["34px", { lineHeight: "1" }],
				"9xl": ["36px", { lineHeight: "1" }],
			},
			zIndex: {
				2: "2",
				3: "3",
				1000: "1000",
				2000: "2000",
				3000: "3000",
			},
		},
	},
	plugins: [],
};
