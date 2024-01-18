/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from "three";

/**
 * A tool to safely remove meshes and geometries from memory to
 * [prevent memory leaks](https://threejs.org/docs/#manual/en/introduction/How-to-dispose-of-objects).
 */
export class Disposer {


  /**
   * Removes a mesh, its geometry and its materials from memory. If you are
   * using any of these in other parts of the application, make sure that you
   * remove them from the mesh before disposing it.
   *
   * @param mesh - the [mesh](https://threejs.org/docs/#api/en/objects/Mesh)
   * to remove.
   *
   * @param materials - whether to dispose the materials of the mesh.
   *
   * @param recursive - whether to recursively dispose the children of the mesh.
   */
  static destroy(
    mesh: THREE.Mesh | THREE.LineSegments,
    materials = true,
    recursive = true
  ) {
    mesh.removeFromParent();
    Disposer.disposeGeometryAndMaterials( mesh, materials );
    if ( recursive && mesh.children.length ) {
      Disposer.disposeChildren( mesh );
    }
    mesh.material = [];
    ( mesh.geometry as any ) = null;
    mesh.children.length = 0;
  }

  /**
   * Disposes a geometry from memory.
   *
   * @param geometry - the
   * [geometry](https://threejs.org/docs/#api/en/core/BufferGeometry)
   * to remove.
   */
  private static disposeGeometry( geometry: THREE.BufferGeometry ) {
    //@ts-ignore
    if ( geometry.boundsTree ) {
      //@ts-ignore
      geometry.disposeBoundsTree();
    }
    geometry.dispose();
  }

  private static disposeGeometryAndMaterials(
    mesh: THREE.Mesh | THREE.LineSegments,
    materials: boolean
  ) {
    if ( mesh.geometry ) {
      Disposer.disposeGeometry( mesh.geometry );
    }
    if ( materials ) {
      Disposer.disposeMaterial( mesh );
    }
  }

  private static disposeChildren( mesh: THREE.Mesh | THREE.LineSegments ) {
    for ( const child of mesh.children ) {
      Disposer.destroy( child as THREE.Mesh );
    }
  }

  private static disposeMaterial( mesh: THREE.Mesh | THREE.LineSegments ) {
    if ( mesh.material ) {
      if ( Array.isArray( mesh.material ) ) {
        for ( const mat of mesh.material ) {
          mat.dispose();
        }
      } else {
        mesh.material.dispose();
      }
    }
  }
}

