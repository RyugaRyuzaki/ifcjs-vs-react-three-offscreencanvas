import * as OBC from "@thatopen/components";
import {CameraControls} from "@react-three/drei";
import {IfcTileLoader} from "./IfcTileLoader";
import {effect} from "@preact/signals-react";
import {fileSignal, groupsSignal, loadAsTileSignal} from "./signal";
import {CustomIfcStreamer} from "./CustomIfcStreamer";
export class BimModel implements OBC.Disposable {
  readonly onDisposed: OBC.Event<any> = new OBC.Event();
  private components!: OBC.Components;
  get domElement() {
    //@ts-ignore
    return this.controls._domElement;
  }
  get camera() {
    return this.controls.camera;
  }
  private loadAsTile = false;

  /**
   *
   */
  constructor(private controls: CameraControls) {
    this.init();
    effect(() => {
      (async () => {
        if (!fileSignal.value) return;
        if (!this.components) return;
        if (this.loadAsTile) {
          const ifcTileLoader = this.components.get(IfcTileLoader);
          await ifcTileLoader.streamIfc(fileSignal.value);
        } else {
          const buffer = new Uint8Array(await fileSignal.value.arrayBuffer());
          const loader = this.components.get(OBC.IfcLoader);
          const group = await loader.load(buffer, true);
          if (!group) return;
          groupsSignal.value = [...groupsSignal.value, group];
        }
      })();
    });
    effect(() => {
      this.loadAsTile = loadAsTileSignal.value;
    });
  }
  async dispose() {
    this.components.dispose();
    (this.components as any) = null;
    (this.controls as any) = null;
    this.onDisposed.trigger();
    this.onDisposed.reset();
  }
  private init() {
    this.components = new OBC.Components();

    const ifcTileLoader = this.components.get(IfcTileLoader);
    ifcTileLoader.enabled = true;

    const customIfcStreamer = this.components.get(CustomIfcStreamer);
    customIfcStreamer.controls = this.controls;
    customIfcStreamer.culler.threshold = 50;
    customIfcStreamer.culler.maxHiddenTime = 3000;
    customIfcStreamer.culler.maxLostTime = 30000;
    customIfcStreamer.culler.setupEvent = false;
    customIfcStreamer.culler.setupEvent = true;

    const loader = this.components.get(OBC.IfcLoader);
    loader.setup();
  }
}
