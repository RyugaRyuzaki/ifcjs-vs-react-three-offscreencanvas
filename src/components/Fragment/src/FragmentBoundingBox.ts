import * as THREE from "three";
import { FragmentsGroup } from "bim-fragment";
import { InstancedMesh } from "three";
import { Disposable } from "../baseType";
import { Disposer } from "../Disposer";

/**
 * A simple implementation of bounding box that works for fragments. The resulting bbox is not 100% precise, but
 * it's fast, and should suffice for general use cases such as camera zooming or general boundary determination.
 */
export class FragmentBoundingBox implements Disposable {


  private _absoluteMin: THREE.Vector3;
  private _absoluteMax: THREE.Vector3;
  private _meshes: THREE.Mesh[] = [];

  constructor() {

    this._absoluteMin = FragmentBoundingBox.newBound( true );
    this._absoluteMax = FragmentBoundingBox.newBound( false );
  }

  static getDimensions( bbox: THREE.Box3 ) {
    const { min, max } = bbox;
    const width = Math.abs( max.x - min.x );
    const height = Math.abs( max.y - min.y );
    const depth = Math.abs( max.z - min.z );
    const center = new THREE.Vector3();
    center.subVectors( max, min ).divideScalar( 2 ).add( min );
    return { width, height, depth, center };
  }

  static newBound( positive: boolean ) {
    const factor = positive ? 1 : -1;
    return new THREE.Vector3(
      factor * Number.MAX_VALUE,
      factor * Number.MAX_VALUE,
      factor * Number.MAX_VALUE
    );
  }

  static getBounds(
    points: THREE.Vector3[],
    min?: THREE.Vector3,
    max?: THREE.Vector3
  ) {
    const maxPoint = max || this.newBound( false );
    const minPoint = min || this.newBound( true );
    for ( const point of points ) {
      if ( point.x < minPoint.x ) minPoint.x = point.x;
      if ( point.y < minPoint.y ) minPoint.y = point.y;
      if ( point.z < minPoint.z ) minPoint.z = point.z;
      if ( point.x > maxPoint.x ) maxPoint.x = point.x;
      if ( point.y > maxPoint.y ) maxPoint.y = point.y;
      if ( point.z > maxPoint.z ) maxPoint.z = point.z;
    }
    return new THREE.Box3( min, max );
  }

  /** {@link Disposable.dispose} */
  async dispose() {
    for ( const mesh of this._meshes ) {
      Disposer.destroy( mesh );
    }
    this._meshes = [];
  }

  get() {
    const min = this._absoluteMin.clone();
    const max = this._absoluteMax.clone();
    return new THREE.Box3( min, max );
  }

  getSphere() {
    const min = this._absoluteMin.clone();
    const max = this._absoluteMax.clone();
    const dx = Math.abs( ( max.x - min.x ) / 2 );
    const dy = Math.abs( ( max.y - min.y ) / 2 );
    const dz = Math.abs( ( max.z - min.z ) / 2 );
    const center = new THREE.Vector3( min.x + dx, min.y + dy, min.z + dz );
    const radius = center.distanceTo( min );
    return new THREE.Sphere( center, radius );
  }

  getMesh() {
    const bbox = new THREE.Box3( this._absoluteMin, this._absoluteMax );
    const dimensions = FragmentBoundingBox.getDimensions( bbox );
    const { width, height, depth, center } = dimensions;
    const box = new THREE.BoxGeometry( width, height, depth );
    const mesh = new THREE.Mesh( box );
    this._meshes.push( mesh );
    mesh.position.copy( center );
    return mesh;
  }

  reset() {
    this._absoluteMin = FragmentBoundingBox.newBound( true );
    this._absoluteMax = FragmentBoundingBox.newBound( false );
  }

  add( group: FragmentsGroup ) {
    for ( const frag of group.items ) {
      this.addMesh( frag.mesh );
    }
  }

  addMesh( mesh: InstancedMesh ) {
    if ( !mesh.geometry.index ) {
      return;
    }

    const bbox = FragmentBoundingBox.getFragmentBounds( mesh );

    mesh.updateMatrix();
    const meshTransform = mesh.matrix;

    const instanceTransform = new THREE.Matrix4();
    for ( let i = 0; i < mesh.count; i++ ) {
      mesh.getMatrixAt( i, instanceTransform );
      const min = bbox.min.clone();
      const max = bbox.max.clone();

      min.applyMatrix4( instanceTransform );
      min.applyMatrix4( meshTransform );
      max.applyMatrix4( instanceTransform );
      max.applyMatrix4( meshTransform );

      if ( min.x < this._absoluteMin.x ) this._absoluteMin.x = min.x;
      if ( min.y < this._absoluteMin.y ) this._absoluteMin.y = min.y;
      if ( min.z < this._absoluteMin.z ) this._absoluteMin.z = min.z;

      if ( min.x > this._absoluteMax.x ) this._absoluteMax.x = min.x;
      if ( min.y > this._absoluteMax.y ) this._absoluteMax.y = min.y;
      if ( min.z > this._absoluteMax.z ) this._absoluteMax.z = min.z;

      if ( max.x > this._absoluteMax.x ) this._absoluteMax.x = max.x;
      if ( max.y > this._absoluteMax.y ) this._absoluteMax.y = max.y;
      if ( max.z > this._absoluteMax.z ) this._absoluteMax.z = max.z;

      if ( max.x < this._absoluteMin.x ) this._absoluteMin.x = max.x;
      if ( max.y < this._absoluteMin.y ) this._absoluteMin.y = max.y;
      if ( max.z < this._absoluteMin.z ) this._absoluteMin.z = max.z;
    }
  }

  private static getFragmentBounds( mesh: InstancedMesh ) {
    const position = mesh.geometry.attributes.position;

    const maxNum = Number.MAX_VALUE;
    const minNum = -maxNum;
    const min = new THREE.Vector3( maxNum, maxNum, maxNum );
    const max = new THREE.Vector3( minNum, minNum, minNum );

    if ( !mesh.geometry.index ) {
      throw new Error( "Geometry must be indexed!" );
    }

    const indices = Array.from( mesh.geometry.index.array );

    for ( const index of indices ) {
      const x = position.getX( index );
      const y = position.getY( index );
      const z = position.getZ( index );

      if ( x < min.x ) min.x = x;
      if ( y < min.y ) min.y = y;
      if ( z < min.z ) min.z = z;
      if ( x > max.x ) max.x = x;
      if ( y > max.y ) max.y = y;
      if ( z > max.z ) max.z = z;
    }

    return new THREE.Box3( min, max );
  }
}

