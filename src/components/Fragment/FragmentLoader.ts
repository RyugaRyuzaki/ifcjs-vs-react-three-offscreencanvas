import * as WEBIFC from "web-ifc";
import { FragmentsGroup } from "bim-fragment";
import { Disposable, Event, } from "./baseType";
import { FragmentManager } from "./FragmentManager";
import { DataConverter, GeometryReader } from "./src";
import { ModelCache } from './ModelCache';
export * from "./src/types";
import { toast } from "react-toastify";

/**
 * Reads all the geometry of the IFC file and generates a set of
 * [fragments](https://github.com/ifcjs/fragment). It can also return the
 * properties as a JSON file, as well as other sets of information within
 * the IFC file.
 */
export class FragmentIfcLoader
  implements Disposable {
  private before = performance.now()
  enabled: boolean = true;

  private modelCache!: ModelCache
  onIfcLoaded: Event<FragmentsGroup> = new Event();

  // For debugging purposes
  // isolatedItems = new Set<number>();

  onLocationsSaved = new Event<{ [id: number]: number[] }>();

  private _webIfc = new WEBIFC.IfcAPI();

  private readonly _geometry = new GeometryReader();
  private readonly _converter: DataConverter;
  fragmentManager: FragmentManager = new FragmentManager();

  onIfcTree: Event<any> = new Event();
  onIfcElement: Event<any> = new Event();
  onIfcProperty: Event<any> = new Event();
  onCalculateList!: ( list: any ) => void
  constructor() {
    this._converter = new DataConverter();
    this.modelCache = new ModelCache( this.fragmentManager )

  }

  get(): WEBIFC.IfcAPI {
    return this._webIfc;
  }

  get settings() {
    return this._converter?.settings;
  }
  get units() {
    return this._converter?.units
  }

  /** {@link Disposable.dispose} */
  async dispose() {
    this._geometry.cleanUp();
    this._converter.cleanUp();
    this.fragmentManager.dispose()
    this.onIfcLoaded.reset();
    this.onLocationsSaved.reset();
    this.onIfcTree.reset();
    this.onIfcElement.reset();
    this.onIfcProperty.reset();

    this.unloadWindow = false;
    ( this._webIfc as any ) = null;
    ( this._geometry as any ) = null;
    ( this._converter as any ) = null;
  }

  /** Loads the IFC file and converts it to a set of fragments. */
  //
  async loadIfcModel( file: File, ) {
    this.before = performance.now()
    const id = this.modelCache.getIdFromLocal( file )
    let model = await this.modelCache.getFragmentGroup( id ) as FragmentsGroup
    if ( !model ) {
      const buffer = await file.arrayBuffer()
      const data = new Uint8Array( buffer );
      model = await this.load( data, file.name ) as FragmentsGroup;
      await this.modelCache.saveFragmentGroup( model, id )
    }
    toast.success( `Model's loaded in ${( ( performance.now() - this.before ) / 1000 ).toFixed( 1 )} s` );

    return model
  }
  async load( data: Uint8Array, name: string ) {
    if ( this.settings?.saveLocations ) {
      this._geometry.saveLocations = true;
    }
    const before = performance.now();
    await this.readIfcFile( data );

    await this.readAllGeometries();

    const items = this._geometry.items;
    const model = await this._converter.generate( this._webIfc, items );
    model.name = name;

    if ( this.settings.saveLocations ) {
      await this.onLocationsSaved.trigger( this._geometry.locations );
    }


    if ( this.settings.coordinate ) {
      const isFirstModel = this.fragmentManager.groups.length === 0;
      if ( isFirstModel ) {
        this.fragmentManager.baseCoordinationModel = model.uuid;
      } else {
        this.fragmentManager.coordinate( [model] );
      }
    }

    this.cleanUp();

    this.fragmentManager.groups.push( model );
    for ( const fragment of model.items ) {
      fragment.group = model;
      this.fragmentManager.list[fragment.id] = fragment;
    }

    await this.onIfcLoaded.trigger( model );

    console.log( `Loading the IFC took ${performance.now() - before} ms!` );
    // @ts-ignore
    const { properties, keyFragments } = model


    return model;
  }



  private async readIfcFile( data: Uint8Array ) {
    const { path, absolute } = this.settings.wasm;
    this._webIfc.SetWasmPath( path, absolute );
    await this._webIfc.Init();
    this._webIfc.OpenModel( data, this.settings.webIfc );
  }

  private async readAllGeometries() {
    this._converter.saveIfcCategories( this._webIfc );

    // Some categories (like IfcSpace) need to be created explicitly
    const optionals = this.settings.optionalCategories;

    // Force IFC space to be transparent
    if ( optionals.includes( WEBIFC.IFCSPACE ) ) {
      const index = optionals.indexOf( WEBIFC.IFCSPACE );
      optionals.splice( index, 1 );
      this._webIfc.StreamAllMeshesWithTypes( 0, [WEBIFC.IFCSPACE], ( mesh ) => {
        if ( this.isExcluded( mesh.expressID ) ) {
          return;
        }
        this._geometry.streamMesh( this._webIfc, mesh, true );
      } );
    }

    // Load rest of optional categories (if any)
    if ( optionals.length ) {
      this._webIfc.StreamAllMeshesWithTypes( 0, optionals, ( mesh ) => {
        if ( this.isExcluded( mesh.expressID ) ) {
          return;
        }
        this._geometry.streamMesh( this._webIfc, mesh );
      } );
    }

    // Load common categories
    this._webIfc.StreamAllMeshes( 0, ( mesh: WEBIFC.FlatMesh ) => {
      if ( this.isExcluded( mesh.expressID ) ) {
        return;
      }
      this._geometry.streamMesh( this._webIfc, mesh );
    } );
  }

  private cleanUp() {
    ( this._webIfc as any ) = null;
    this._webIfc = new WEBIFC.IfcAPI();
    this._geometry.cleanUp();
    this._converter.cleanUp();
  }

  private isExcluded( id: number ) {
    const category = this._converter.categories[id];
    return this.settings.excludedCategories.has( category );
  }

  private onUnloadWindow = ( e: any ) => {
    e.returnValue = "Dữ liệu chưa được lưu. Bạn có chắc chắn muốn rời trang?";
  };
  set unloadWindow( unload: boolean ) {
    if ( unload ) {
      window.addEventListener( "beforeunload", this.onUnloadWindow );
    } else {
      window.removeEventListener( "beforeunload", this.onUnloadWindow );
    }
  }

  //
}

