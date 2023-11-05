import * as THREE from "three";
import { Fragment } from "bim-fragment";
import { FragmentMesh } from "bim-fragment/fragment-mesh";
import { Disposable, Event, FragmentIdMap, } from "./baseType";
import { FragmentManager } from "./FragmentManager";
import { FragmentBoundingBox } from "./src/FragmentBoundingBox";
import { toCompositeID } from "./src/Misc";
import { CameraControls } from "@react-three/drei";

// TODO: Clean up and document

interface HighlightEvents {
  [highlighterName: string]: {
    onHighlight: Event<FragmentIdMap>;
    onClear: Event<null>;
  };
}

interface HighlightMaterials {
  [name: string]: THREE.Material[] | undefined;
}

export class FragmentHighlighter
  implements Disposable {

  highlightMats: HighlightMaterials = {};
  events: HighlightEvents = {};

  multiple: "none" | "shiftKey" | "ctrlKey" = "ctrlKey";
  zoomFactor = 1;
  zoomToSelection = false;

  selection: {
    [selectionID: string]: FragmentIdMap;
  } = {};

  excludeOutline = new Set<string>();

  fillEnabled = true;

  outlineMaterial = new THREE.MeshBasicMaterial( {
    color: "white",
    transparent: true,
    depthTest: false,
    depthWrite: false,
    opacity: 0.4,
  } );


  private _outlineEnabled = true;

  private _outlinedMeshes: { [fragID: string]: THREE.InstancedMesh } = {};
  private _invisibleMaterial = new THREE.MeshBasicMaterial( { visible: false } );

  private _tempMatrix = new THREE.Matrix4();

  private _default = {
    selectName: "select",
    hoverName: "hover",

    mouseDown: false,
    mouseMoved: false,

    selectionMaterial: new THREE.MeshBasicMaterial( {
      color: "#BCF124",
      transparent: true,
      opacity: 0.85,
      depthTest: true,
    } ),

    highlightMaterial: new THREE.MeshBasicMaterial( {
      color: "#6528D7",
      transparent: true,
      opacity: 0.2,
      depthTest: true,
    } ),
  };






  private _bbox: FragmentBoundingBox = new FragmentBoundingBox()
  constructor( private fragmentManager: FragmentManager, private controls: CameraControls ) {

  }

  get(): HighlightMaterials {
    return this.highlightMats;
  }

  async dispose() {
    this._default.highlightMaterial.dispose();
    this._default.selectionMaterial.dispose();
    this._bbox.dispose()
    for ( const matID in this.highlightMats ) {
      const mats = this.highlightMats[matID] || [];
      for ( const mat of mats ) {
        mat.dispose();
      }
    }
    for ( const id in this._outlinedMeshes ) {
      const mesh = this._outlinedMeshes[id];
      mesh.geometry.dispose();
    }
    this.outlineMaterial.dispose();
    this._invisibleMaterial.dispose();
    this.highlightMats = {};
    this.selection = {};
    for ( const name in this.events ) {
      this.events[name].onClear.reset();
      this.events[name].onHighlight.reset();
    }
    this.events = {};
  }

  async add( name: string, material?: THREE.Material[] ) {
    if ( this.highlightMats[name] ) {
      throw new Error( "A highlight with this name already exists." );
    }

    this.highlightMats[name] = material;
    this.selection[name] = {};
    this.events[name] = {
      onHighlight: new Event(),
      onClear: new Event(),
    };

    await this.update();
  }

  async update() {
    if ( !this.fillEnabled ) {
      return;
    }
    const fragments = this.fragmentManager
    for ( const fragmentID in fragments.list ) {
      const fragment = fragments.list[fragmentID];
      this.addHighlightToFragment( fragment );
      const outlinedMesh = this._outlinedMeshes[fragmentID];
      if ( outlinedMesh ) {
        fragment.mesh.updateMatrixWorld( true );
        outlinedMesh.applyMatrix4( fragment.mesh.matrixWorld );
      }
    }
  }
  updateClippingPlanes( planes: THREE.Plane[] ) {
    for ( const name in this.highlightMats ) {
      const materials = this.highlightMats[name];
      materials?.forEach( ( mat: THREE.Material ) => {
        mat.clippingPlanes = planes
      } )
    }
  }

  async highlight(
    name: string,
    result: any,
    removePrevious = true,
    zoomToSelection = this.zoomToSelection
  ) {
    this.checkSelection( name );

    const fragments = this.fragmentManager
    const fragList: Fragment[] = [];
    if ( !result ) {
      await this.clear( name );
      return null;
    }

    const mesh = result.object as FragmentMesh;
    const geometry = mesh.geometry;
    const index = result.face?.a;
    const instanceID = result.instanceId;

    if ( !geometry || index === undefined || instanceID === undefined ) {
      return null;
    }

    if ( removePrevious ) {
      await this.clear( name );
    }

    if ( !this.selection[name][mesh.uuid] ) {
      this.selection[name][mesh.uuid] = new Set<string>();
    }

    fragList.push( mesh.fragment );
    const blockID = mesh.fragment.getVertexBlockID( geometry, index );
    mesh.fragment.blocks
    const itemID = mesh.fragment
      .getItemID( instanceID, blockID )
      .replace( /\..*/, "" );

    const idNum = parseInt( itemID, 10 );
    this.selection[name][mesh.uuid].add( itemID );
    this.addComposites( mesh, idNum, name );
    await this.regenerate( name, mesh.uuid );

    const group = mesh.fragment.group;
    if ( group ) {
      const keys = group.data[idNum][0];
      for ( let i = 0; i < keys.length; i++ ) {
        const fragKey = keys[i];
        const fragID = group.keyFragments[fragKey];
        const fragment = fragments.list[fragID];
        fragList.push( fragment );
        if ( !this.selection[name][fragID] ) {
          this.selection[name][fragID] = new Set<string>();
        }
        this.selection[name][fragID].add( itemID );
        this.addComposites( fragment.mesh, idNum, name );
        await this.regenerate( name, fragID );
      }
    }

    await this.events[name].onHighlight.trigger( this.selection[name] );

    if ( zoomToSelection ) {
      await this.zoomSelection( name );
    }

    return { id: itemID, fragments: fragList[0] };
  }

  async highlightByID(
    name: string,
    ids: FragmentIdMap,
    removePrevious = true,
    zoomToSelection = this.zoomToSelection
  ) {
    if ( removePrevious ) {
      await this.clear( name );
    }
    const styles = this.selection[name];
    for ( const fragID in ids ) {
      if ( !styles[fragID] ) {
        styles[fragID] = new Set<string>();
      }

      const fragments = this.fragmentManager
      const fragment = fragments.list[fragID];

      const idsNum = new Set<number>();
      for ( const id of ids[fragID] ) {
        styles[fragID].add( id );
        idsNum.add( parseInt( id, 10 ) );
      }
      for ( const id of idsNum ) {
        this.addComposites( fragment.mesh, id, name );
      }
      await this.regenerate( name, fragID );
    }

    await this.events[name].onHighlight.trigger( this.selection[name] );

    if ( zoomToSelection ) {
      await this.zoomSelection( name );
    }
  }

  /**
   * Clears any selection previously made by calling {@link highlight}.
   */
  async clear( name?: string ) {
    await this.clearFills( name );

  }



  private async regenerate( name: string, fragID: string ) {
    if ( this.fillEnabled ) {
      await this.updateFragmentFill( name, fragID );
    }

  }

  private async zoomSelection( name: string ) {
    if ( !this.fillEnabled && !this._outlineEnabled ) {
      return;
    }


    const fragments = this.fragmentManager
    this._bbox.reset();

    const selected = this.selection[name];
    if ( !Object.keys( selected ).length ) {
      return;
    }
    for ( const fragID in selected ) {
      const fragment = fragments.list[fragID];
      if ( this.fillEnabled ) {
        const highlight = fragment.fragments[name];
        if ( highlight ) {
          this._bbox.addMesh( highlight.mesh );
        }
      }

      if ( this._outlineEnabled && this._outlinedMeshes[fragID] ) {
        this._bbox.addMesh( this._outlinedMeshes[fragID] );
      }
    }

    const sphere = this._bbox.getSphere();
    sphere.radius *= this.zoomFactor;
    await this.controls.fitToSphere( sphere, true );

  }

  private addComposites( mesh: FragmentMesh, itemID: number, name: string ) {
    const composites = mesh.fragment.composites[itemID];
    if ( composites ) {
      for ( let i = 1; i < composites; i++ ) {
        const compositeID = toCompositeID( itemID, i );
        this.selection[name][mesh.uuid].add( compositeID );
      }
    }
  }

  private async clearStyle( name: string ) {
    const fragments = this.fragmentManager

    for ( const fragID in this.selection[name] ) {
      const fragment = fragments.list[fragID];
      if ( !fragment ) continue;
      const selection = fragment.fragments[name];
      if ( selection ) {
        selection.mesh.removeFromParent();
      }
    }

    await this.events[name].onClear.trigger( null );
    this.selection[name] = {};
  }

  private async updateFragmentFill( name: string, fragmentID: string ) {
    const fragments = this.fragmentManager

    const ids = this.selection[name][fragmentID];
    const fragment = fragments.list[fragmentID];
    if ( !fragment ) return;
    const selection = fragment.fragments[name];
    if ( !selection ) return;

    // #region Old child/parent code
    // const scene = this._components.scene.get();
    // scene.add(selection.mesh); //If we add selection.mesh directly to the scene, it won't be coordinated unless we do so manually.
    // #endregion

    // #region New child/parent code
    const fragmentParent = fragment.mesh.parent;
    if ( !fragmentParent ) return;
    fragmentParent.add( selection.mesh );
    // #endregion

    const isBlockFragment = selection.blocks.count > 1;
    if ( isBlockFragment ) {
      fragment.getInstance( 0, this._tempMatrix )
      selection.setInstance( 0, {
        ids: Array.from( fragment.ids ),
        transform: this._tempMatrix,
      } );

      selection.blocks.setVisibility( true, ids, true );
    } else {
      let i = 0;
      for ( const id of ids ) {
        selection.mesh.count = i + 1;
        const { instanceID } = fragment.getInstanceAndBlockID( id );
        fragment.getInstance( instanceID, this._tempMatrix );
        selection.setInstance( i, { ids: [id], transform: this._tempMatrix } );
        i++;
      }
    }
  }

  private checkSelection( name: string ) {
    if ( !this.selection[name] ) {
      throw new Error( `Selection ${name} does not exist.` );
    }
  }

  private addHighlightToFragment( fragment: Fragment ) {
    for ( const name in this.highlightMats ) {
      if ( !fragment.fragments[name] ) {
        const material = this.highlightMats[name];
        const subFragment = fragment.addFragment( name, material );
        if ( fragment.blocks.count > 1 ) {
          subFragment.setInstance( 0, {
            ids: Array.from( fragment.ids ),
            transform: this._tempMatrix,
          } );
          subFragment.blocks.setVisibility( false );
        }
        subFragment.mesh.renderOrder = 2;
        subFragment.mesh.frustumCulled = false;
      }
    }
  }



  private async clearFills( name: string | undefined ) {
    const names = name ? [name] : Object.keys( this.selection );
    for ( const name of names ) {
      await this.clearStyle( name );
    }
  }




}

