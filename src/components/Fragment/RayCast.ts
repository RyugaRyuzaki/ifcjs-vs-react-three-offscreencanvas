/* eslint-disable @typescript-eslint/no-explicit-any */
import { InstancedMesh, Mesh, Plane, Raycaster, Vector2, Vector3, Camera } from "three";

export class RayCast {
	rayCaster: Raycaster = new Raycaster();
	mouse: Vector2 = new Vector2()
	private setRayCaster( event: any ) {
		const bounds = this.domElement.getBoundingClientRect();
		const x1 = event.clientX - bounds.left;
		const y1 = event.clientY - bounds.top;
		const x2 = bounds.right - bounds.left;
		const y2 = bounds.bottom - bounds.top;
		this.mouse.x = ( x1 / x2 ) * 2 - 1;
		this.mouse.y = -( y1 / y2 ) * 2 + 1;
		this.rayCaster.setFromCamera( this.mouse, this.camera );
	}
	constructor( private domElement: HTMLElement, private camera: Camera, private clippingPlanes: Plane[] ) {
		( this.rayCaster as any ).firstHitOnly = true;
		this.rayCaster.params.Points!.threshold = 50;
	}


	getRayCastModel( event: any, filterModel: Mesh[] | InstancedMesh[] ) {
		this.setRayCaster( event );
		const result = this.rayCaster.intersectObjects( filterModel );
		const filtered = this.filterClippingPlanes( result );
		return filtered.length > 0 ? filtered[0] : null;
	}


	getRayCastPlane( event: any, plane: Plane ) {
		this.setRayCaster( event );
		return this.rayCaster.ray.intersectPlane( plane, new Vector3() );
	}
	private filterClippingPlanes( objs: THREE.Intersection[] ) {
		if ( !this.clippingPlanes ) {
			return objs;
		}
		const planes = this.clippingPlanes;
		if ( objs.length <= 0 || !planes || planes?.length <= 0 ) return objs;
		return objs.filter( ( elem ) =>
			planes.every( ( elem2 ) => elem2.distanceToPoint( elem.point ) > 0 )
		);
	}
}
