import React from "react";
import { ToastContainer } from "react-toastify";
import Component from "./Component";
import { useStore } from "./Store";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

function App() {
	const { fetch } = useStore();

	return (
		<>
			<div className="relative w-full h-full flex">
				<div className="w-[5%] h-full border-r-1 border-black">
					<button className="bg-blue-400 text-[14px] p-2" onClick={fetch}>
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
