import React from "react";
import {ToastContainer} from "react-toastify";
import Component from "./Component";
import {fileSignal, loadAsTileSignal} from "./components/signal";
import {useSignals} from "@preact/signals-react/runtime";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

function App() {
  useSignals();
  const handleLoad = () => {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = ".ifc";
    input.multiple = false;

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
        <div className="w-[20%] h-full ">
          <button
            className="bg-blue-400 text-[14px] p-2 w-full m-auto"
            onClick={handleLoad}
          >
            Load
          </button>
          <div className="w-full flex justify-center my-2">
            <input
              type="checkbox"
              checked={loadAsTileSignal.value}
              onChange={(e) => (loadAsTileSignal.value = e.target.checked)}
            />
            <p className="my-auto mx-2">Load As BIM-Tiles</p>
          </div>
        </div>
        <div className="h-full w-[2px] bg-slate-600" />
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
