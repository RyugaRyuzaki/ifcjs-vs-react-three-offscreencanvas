import React, { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
	Center,
	ContactShadows,
	Environment,
	AccumulativeShadows,
	RandomizedLight,
	CameraControls,
} from "@react-three/drei";
import { Bloom, DepthOfField, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { FragmentModel } from "./Fragment";
import { Perf } from "r3f-perf";
import { Box3, Sphere, Vector3 } from "three";
import { fileSignal } from "./signal";
import { useSignalEffect } from "@preact/signals-react";

function Model() {
	const mesh = useRef(null);
	const controlRef = useRef<CameraControls>(null);
	const [hovered, setHover] = useState(false);
	const color = hovered ? "hotpink" : "orange";
	const [fragment, setFragment] = useState<FragmentModel | null>(null);

	useSignalEffect(() => {
		if (!fileSignal.value) {
			if (!controlRef.current) return;
			if (fragment) {
				fragment.dispose();
			}
			const loader = new FragmentModel(controlRef.current!);
			setFragment(loader);
		} else {
			if (!fragment) return;
			if (!mesh.current) return;
			(async () => {
				const model = await fragment.loadIfcModel(fileSignal.value!);
				(mesh.current as any).children = [];
				(mesh.current as any).add(model);
				const { min, max } = model.boundingBox as Box3;
				const center = new Vector3().lerpVectors(max, min, 0.5);
				const radius = max.distanceTo(min) * 0.5;
				controlRef.current?.setLookAt(max.x, max.y, max.z, center.x, center.y, center.z);
				controlRef.current?.fitToSphere(new Sphere(center, radius), true);
			})();
		}
	});
	useFrame((state, delta) => {});
	return (
		<>
			<Center ref={mesh}></Center>
			{/* <ContactShadows color={color} position={[0, -1.5, 0]} blur={3} opacity={0.75} /> */}
			<CameraControls smoothTime={0.25} ref={controlRef} />
			<AccumulativeShadows temporal frames={100} alphaTest={0.95} opacity={1} scale={20}>
				<RandomizedLight amount={8} radius={10} ambient={0.5} position={[0, 10, -2.5]} bias={0.001} size={3} />
			</AccumulativeShadows>
		</>
	);
}

export default function App() {
	return (
		<>
			<Perf position="bottom-right" />
			<ambientLight />
			<pointLight position={[10, 10, 5]} />
			<Model />
			<Environment preset="apartment" />
			{/* <EffectComposer>
				<DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} height={480} />
				<Bloom luminanceThreshold={0} luminanceSmoothing={1} height={300} radius={0.2} />
				<Noise opacity={0.01} />
				<Vignette eskil={false} offset={0.1} darkness={1.1} />
			</EffectComposer> */}
		</>
	);
}
