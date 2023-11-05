import React, { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Center, ContactShadows, Environment, CameraControls } from "@react-three/drei";
import { useStore } from "../Store";
import { FragmentModel } from "./Fragment";
import { Perf } from "r3f-perf";
import { Box3, Sphere, Vector3 } from "three";

function Model() {
	const mesh = useRef(null);
	const controlRef = useRef<CameraControls>(null);
	const [hovered, setHover] = useState(false);
	const color = hovered ? "hotpink" : "orange";
	const { file } = useStore();
	const [fragment, setFragment] = useState<FragmentModel | null>(null);
	useEffect(() => {
		const loader = new FragmentModel(controlRef.current!);
		setFragment(loader);
		return () => {
			loader.dispose();
			setFragment(null);
		};
	}, []);
	useEffect(() => {
		if (!file) return;
		if (!fragment) return;
		if (!mesh.current) return;
		(async () => {
			const model = await fragment.loadIfcModel(file);
			(mesh.current as any).children = [];
			(mesh.current as any).add(model);
			const { min, max } = model.boundingBox as Box3;
			const center = new Vector3().lerpVectors(max, min, 0.5);
			const radius = max.distanceTo(min) * 0.5;
			controlRef.current?.setLookAt(max.x, max.y, max.z, center.x, center.y, center.z);
			controlRef.current?.fitToSphere(new Sphere(center, radius), true);
		})();
	}, [file]);
	useFrame((state, delta) => {});
	return (
		<>
			<Center ref={mesh}></Center>
			<ContactShadows color={color} position={[0, -1.5, 0]} blur={3} opacity={0.75} />
			<CameraControls smoothTime={0.25} ref={controlRef} />
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
			<Environment preset="city" />
		</>
	);
}
