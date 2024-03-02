import * as THREE from "three";
import { readPixelsAsync } from "./screen-culler-helper";
const commandType = {
    init: "init",
    addModel: "addModel",
    update: "update",
}
interface IMaterial {
    r: number,
    g: number,
    b: number,
    transparent?: boolean,
    opacity?: number,
}
interface IGeometry {
    position: Float32Array,
    groups?: any[],
    indices?: Uint16Array,
}
interface IInstanceMatrix {
    array: Float32Array,
    normalized: boolean,
    itemSize: number,
    meshPerAttribute: number,
}
interface IInstanceMesh {
    material: IMaterial[] | IMaterial,
    geometry: IGeometry,
    count: number,
    instanceMatrix?: IInstanceMatrix,
    meshMatrix: number[],
}
let offScreen: OffScreen
self.onmessage = async ( e: any ) => {
    const { command, dataSend, pixel } = e.data
    if ( command === commandType.init ) {
        const offScreenCanvas = ( dataSend as OffscreenCanvas );
        if ( !offScreenCanvas ) return
        offScreen = new OffScreen( offScreenCanvas, pixel )

    } else if ( command === commandType.addModel ) {
        if ( !offScreen ) return
        offScreen.addModel( dataSend )
    } else if ( command === commandType.update ) {
        if ( !offScreen ) return
        offScreen.update( dataSend )
        offScreen.onUpdate = ( colors: Set<string> ) => {
            self.postMessage( { colors } )
        }
    }
}


class OffScreen {
    private readonly renderTarget!: THREE.WebGLRenderTarget;
    private readonly _scene = new THREE.Scene();
    private readonly _buffer: Uint8Array;
    private readonly rtWidth = 512
    private readonly rtHeight = 512
    private renderer!: THREE.WebGLRenderer;
    private camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera();
    private readonly materialCache: Map<string, THREE.MeshBasicMaterial>;
    onUpdate!: ( colors: Set<string> ) => void
    /**
     *
     */
    constructor( offScreenCanvas: OffscreenCanvas, pixel: number ) {
        //@ts-ignore
        if ( !offScreenCanvas.style ) offScreenCanvas.style = {}
        //@ts-ignore
        offScreenCanvas.style.width = this.rtWidth
        //@ts-ignore
        offScreenCanvas.style.height = this.rtWidth
        this.renderTarget = new THREE.WebGLRenderTarget( this.rtWidth, this.rtHeight );
        const bufferSize = this.rtWidth * this.rtHeight * 4;
        this._buffer = new Uint8Array( bufferSize );
        const params = { canvas: offScreenCanvas, context: offScreenCanvas.getContext( "webgl2" )! }
        this.renderer = new THREE.WebGLRenderer( { ...params } )
        this.renderer.setPixelRatio( pixel )
        this.materialCache = new Map<string, THREE.MeshBasicMaterial>();

    }
    addModel( dataSends: IInstanceMesh[] ) {
        for ( const dataSend of dataSends ) {
            this.add( dataSend )
        }
    }
    private add( dataSend: IInstanceMesh ) {
        const { material, geometry, count, meshMatrix, instanceMatrix } = dataSend
        const matrix = new THREE.Matrix4().fromArray( meshMatrix )
        let newMaterial: THREE.Material[] | THREE.Material;
        if ( Array.isArray( material ) ) {
            const matArray: THREE.Material[] = [];
            for ( const mat of material ) {
                const colorMaterial = this.createMaterial( mat )
                matArray.push( colorMaterial );
            }
            newMaterial = matArray;
        } else {
            const colorMaterial = this.createMaterial( material )
            newMaterial = colorMaterial;
        }
        const newGeometry = this.createGeometry( geometry )
        const colorMesh = new THREE.InstancedMesh( newGeometry, newMaterial, count );
        if ( instanceMatrix ) {
            //@ts-ignore
            const { array, itemSize, normalized, meshPerAttribute } = instanceMatrix
            colorMesh.instanceMatrix = new THREE.InstancedBufferAttribute( array, itemSize, normalized, meshPerAttribute );
        } else {
            colorMesh.setMatrixAt( 0, new THREE.Matrix4() );
        }
        colorMesh.applyMatrix4( matrix );
        colorMesh.updateMatrix();
        this._scene.add( colorMesh )
    }
    private createMaterial( mat: IMaterial ) {
        const { r, g, b, transparent, opacity } = mat

        const colorEnabled = THREE.ColorManagement.enabled;
        THREE.ColorManagement.enabled = false;
        const code = `rgb(${r}, ${g}, ${b})`;
        const color = new THREE.Color( code );
        let material = this.materialCache.get( code );
        if ( !material ) {
            material = new THREE.MeshBasicMaterial( {
                color,
                side: THREE.DoubleSide,
            } );
            if ( transparent ) material.transparent
            if ( opacity ) material.opacity
            this.materialCache.set( code, material );
        }
        THREE.ColorManagement.enabled = colorEnabled;
        return material;
    }
    private createGeometry( geo: IGeometry ) {
        const { position, groups, indices } = geo
        const geometry: THREE.BufferGeometry = new THREE.BufferGeometry()
        geometry.setAttribute( "position", new THREE.BufferAttribute( position, 3 ) );
        geometry.setIndex( new THREE.BufferAttribute( indices!, 1 ) );
        if ( groups ) geometry.groups = [...groups]
        return geometry
    }
    async update( cameraData: any ) {
        const { quaternion, position } = cameraData
        this.camera.quaternion.fromArray( quaternion );
        this.camera.position.fromArray( position );
        this.renderer.setSize( this.rtWidth, this.rtHeight )
        this.renderer.setRenderTarget( this.renderTarget );
        this.renderer.render( this._scene, this.camera );
        const context = this.renderer.getContext() as WebGL2RenderingContext;
        await readPixelsAsync(
            context,
            0,
            0,
            this.rtWidth,
            this.rtHeight,
            context.RGBA,
            context.UNSIGNED_BYTE,
            this._buffer
        );
        const colors = this.calculateBuffer()
        if ( this.onUpdate ) this.onUpdate( colors )
        this.renderer.setRenderTarget( null );
    }
    private calculateBuffer(): Set<string> {
        const buffer = this._buffer
        const colors = new Set<string>();
        for ( let i = 0; i < buffer.length; i += 4 ) {
            const r = buffer[i];
            const g = buffer[i + 1];
            const b = buffer[i + 2];
            const code = "" + r + "-" + g + "-" + b;
            colors.add( code );
        }
        return colors
    }
}