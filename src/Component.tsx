import React, { lazy } from "react";
import { Canvas } from "@react-three/offscreen";
const Scene = lazy(() => import("./components/Scene"));
const worker = new Worker(new URL("./worker.tsx", import.meta.url), { type: "module" });

function Component() {
	return <Canvas camera={{ position: [0, 0, 10], fov: 25 }} worker={worker} fallback={<Scene />} />;
}

export default Component;
