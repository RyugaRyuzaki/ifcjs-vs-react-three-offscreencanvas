import * as FRAGS from "@thatopen/fragments";
import React, {useEffect, useRef} from "react";
import {useFrame} from "@react-three/fiber";
import {ContactShadows, Environment, CameraControls} from "@react-three/drei";
import {Perf} from "r3f-perf";
import {fileSignal, groupsSignal} from "./signal";
import {BimModel} from "./BimModel";
import {useSignals} from "@preact/signals-react/runtime";

const SceneModel = () => {
  useSignals();
  const controlRef = useRef<CameraControls | null>(null);
  useEffect(() => {
    if (!controlRef.current) return;
    const bim = new BimModel(controlRef.current);
    return () => {
      fileSignal.value = null;
      bim.dispose();
    };
  }, []);
  useFrame((_state, _delta) => {});

  return (
    <>
      {groupsSignal.value.map((group: FRAGS.FragmentsGroup) => (
        <primitive key={group.uuid} object={group} />
      ))}
      <CameraControls ref={controlRef} smoothTime={0.25} />
      <ContactShadows
        color={"orange"}
        position={[0, -1.5, 0]}
        blur={1}
        opacity={1}
        width={20}
        height={20}
      />
    </>
  );
};

export default function App() {
  const isDev = import.meta.env.DEV;
  return (
    <>
      {isDev && <Perf position="bottom-right" />}
      <ambientLight />
      <pointLight position={[10, 10, 5]} />
      <SceneModel />
      <Environment preset="apartment" />
    </>
  );
}
