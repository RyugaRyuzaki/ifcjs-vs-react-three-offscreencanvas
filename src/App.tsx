import React, { useEffect } from "react";
import { ToastContainer } from "react-toastify";
import Component from "./Component";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";
import { fileSignal } from "./components/signal";

function App() {
	useEffect(() => {
		return () => {
			fileSignal.value = null;
		};
	}, []);
	const handleLoad = () => {
		const input = document.createElement("input");

		input.setAttribute("type", "file");

		input.onchange = async (e: any) => {
			const file = e.target.files[0] as File;
			fileSignal.value = file;
		};
		input.click();
		input.remove();
	};

	return (
		<>
			<div className="relative w-full h-full flex">
				<div className="w-[5%] h-full border-r-1 border-black">
					<button className="bg-blue-400 text-[14px] p-2" onClick={handleLoad}>
						Load
					</button>
				</div>
				<div className="flex-1 h-full">
					<Component />
				</div>
			</div>
			<ToastContainer
				position="top-right"
				autoClose={1000}
				hideProgressBar={false}
				newestOnTop={false}
				closeOnClick
				rtl={false}
				pauseOnFocusLoss
				draggable
				pauseOnHover
				theme="light"
			/>
		</>
	);
}

export default App;
