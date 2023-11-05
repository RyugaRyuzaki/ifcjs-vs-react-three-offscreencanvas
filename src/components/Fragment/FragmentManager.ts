import { Fragment, FragmentsGroup, Serializer } from "bim-fragment";
import * as THREE from "three";
import { Disposable, Event } from "./baseType";
export class FragmentManager implements Disposable {
  /**
   *
   */
  onFragmentsLoaded: Event<FragmentsGroup> = new Event();
  list: { [guid: string]: Fragment } = {};
  baseCoordinationModel = "";
  groups: FragmentsGroup[] = [];
  private removeFragmentMesh( fragment: Fragment ) {
    const meshes = this.meshes
    const mesh = fragment.mesh;
    if ( meshes.includes( mesh ) ) {
      meshes.splice( meshes.indexOf( mesh ), 1 );
    }
  }
  private _loader = new Serializer();
  export( group: FragmentsGroup ) {
    return this._loader.export( group );
  }
  async load( data: Uint8Array ) {
    const group = this._loader.import( data );
    const ids: string[] = [];
    for ( const fragment of group.items ) {
      fragment.group = group;
      this.list[fragment.id] = fragment;
      ids.push( fragment.id );
    }
    this.groups.push( group );
    await this.onFragmentsLoaded.trigger( group );
    return group;
  }
  constructor() {

  }
  async disposeGroup( group: FragmentsGroup ) {
    for ( const fragment of group.items ) {
      this.removeFragmentMesh( fragment );
      delete this.list[fragment.id];
    }
    group.dispose( true );
    const index = this.groups.indexOf( group );
    this.groups.splice( index, 1 );

  }
  async dispose() {
    for ( const group of this.groups ) {
      group.dispose( true );
    }
    this.groups = [];
    this.list = {};
  }
  get meshes() {
    const allMeshes: THREE.Mesh[] = [];
    for ( const fragID in this.list ) {
      allMeshes.push( this.list[fragID].mesh );
    }
    return allMeshes;
  }
  coordinate( models = this.groups ) {
    const baseModel = this.groups.find(
      ( group ) => group.uuid === this.baseCoordinationModel
    );

    if ( !baseModel ) {
      console.log( "No base model found for coordination!" );
      return;
    }

    for ( const model of models ) {
      if ( model === baseModel ) {
        continue;
      }
      model.position.set( 0, 0, 0 );
      model.rotation.set( 0, 0, 0 );
      model.scale.set( 1, 1, 1 );
      model.updateMatrix();
      model.applyMatrix4( model.coordinationMatrix.clone().invert() );
      model.applyMatrix4( baseModel.coordinationMatrix );
    }
  }

}