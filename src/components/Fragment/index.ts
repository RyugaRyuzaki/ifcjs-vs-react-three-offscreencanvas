import * as THREE from 'three'
import {
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree,
} from "three-mesh-bvh";
import { CameraControls } from "@react-three/drei";
import { FragmentHighlighter } from "./FragmentHighlighter";
import { FragmentIfcLoader } from "./FragmentLoader";
import { Disposable } from "./baseType";
import { RayCast } from './RayCast';
import { ScreenCuller } from './Culler';
import { FragmentsGroup } from 'bim-fragment';

export class FragmentModel implements Disposable {
  /**
   *
   */
  private clippingPlanes: THREE.Plane[] = []
  private highlight: THREE.MeshLambertMaterial = new THREE.MeshLambertMaterial( {
    transparent: true,
    opacity: 0.5,
    color: 0xb1e80c,
    side: THREE.DoubleSide,
    depthWrite: true,
    depthTest: false,
  } )
  private select: THREE.MeshLambertMaterial = new THREE.MeshLambertMaterial( {
    transparent: true,
    opacity: 0.5,
    color: "green",
    side: THREE.DoubleSide,
    depthWrite: true,
    depthTest: false,
  } )
  fragmentIfcLoader: FragmentIfcLoader = new FragmentIfcLoader()
  fragmentHighlighter!: FragmentHighlighter
  get domElement() {
    //@ts-ignore
    return this.controls._domElement
  }
  get camera() {
    return this.controls.camera
  }
  set setupEvent( enabled: boolean ) {
    if ( !this.domElement ) return
    if ( enabled ) {
      this.domElement.addEventListener( 'mousemove', this.onMouseMove )
      this.domElement.addEventListener( 'click', this.onSingleClick )
      this.controls.addEventListener( 'controlstart', this.onUpdateCulling )
      this.controls.addEventListener( 'controlend', this.onUpdateCulling )
    } else {
      this.domElement.removeEventListener( 'mousemove', this.onMouseMove )
      this.domElement.removeEventListener( 'click', this.onSingleClick )
      this.controls.removeEventListener( 'controlstart', this.onUpdateCulling )
      this.controls.removeEventListener( 'controlend', this.onUpdateCulling )
    }
  }

  private rayCast!: RayCast
  _found: any | null = null
  set found( event: any ) {
    this._found = this.rayCast.getRayCastModel( event, this.filterModels )
  }
  get found() {
    return this._found
  }
  get filterModels(): THREE.Mesh[] | THREE.InstancedMesh[] {
    return [...this.fragmentIfcLoader.fragmentManager.meshes]
  }
  private culling!: ScreenCuller

  constructor( private controls: CameraControls ) {
    this.initFragment()
    this.culling = new ScreenCuller( this.camera )
    FragmentModel.setupBVH()

  }
  dispose: () => Promise<void> = () => {
    return new Promise( () => {
      this.fragmentIfcLoader?.dispose()
      this.fragmentHighlighter?.dispose()
      this.culling?.dispose()
      this.setupEvent = false
    } )
  }

  private initFragment() {
    this.fragmentHighlighter = new FragmentHighlighter( this.fragmentIfcLoader.fragmentManager, this.controls )
    this.fragmentHighlighter.add( "highlight", [this.highlight] )
    this.fragmentHighlighter.add( "select", [this.select] )
    this.rayCast = new RayCast( ( this.domElement as HTMLElement ), this.camera, this.clippingPlanes )
  }
  private static setupBVH() {
    ( THREE.BufferGeometry.prototype as any ).computeBoundsTree = computeBoundsTree;
    ( THREE.BufferGeometry.prototype as any ).disposeBoundsTree = disposeBoundsTree;
    THREE.Mesh.prototype.raycast = acceleratedRaycast;
  }

  private onMouseMove = async ( event: any ) => {
    this.found = event
    await this.fragmentHighlighter.highlight( "highlight", this.found )

  }
  private onUpdateCulling = async () => {
    if ( !this.culling ) return
    this.culling.needsUpdate = true
  }
  private onSingleClick = async () => {
    await this.fragmentHighlighter.highlight( "select", this.found )
  }

  async loadIfcModel( file: File ) {
    const model = await this.fragmentIfcLoader.loadIfcModel( file )
    await this.fragmentHighlighter.update()
    this.setupEvent = true
    this.culling?.addModel( model )
    return model
  }

}