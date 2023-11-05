import { Dexie } from "dexie";
import * as pako from "pako";
import { FragmentsGroup } from "bim-fragment"
import { FragmentManager } from './FragmentManager';
interface IFile {
  id: string;
  file: Blob;
}

class ModelDatabase extends Dexie {
  models!: Dexie.Table<IFile, number>;
  static readonly origin = window.location.origin
  constructor() {
    super( ModelDatabase.origin );
    this.version( 2 ).stores( {
      models: "id, file",
    } );
  }
}


export class ModelCache {
  private _db: ModelDatabase;
  async getFragmentGroup( id: string ) {
    const { fragmentsCacheID, propertiesCacheID } = this.getIDs( id );

    if ( !fragmentsCacheID || !propertiesCacheID ) {
      return null;
    }

    const fragments = this.fragmentManager
    if ( !fragments ) return null
    const fragmentFile = await this.getModelFromLocalCache( fragmentsCacheID );
    if ( fragmentFile === null || fragmentFile === undefined ) {
      return null
    }

    const fragmentsData = await fragmentFile.arrayBuffer();
    const deCompressedFrag = pako.inflate( fragmentsData )
    const buffer = new Uint8Array( deCompressedFrag );
    const group = await fragments.load( buffer );

    const propertiesFile = await this.getModelFromLocalCache( propertiesCacheID );
    if ( propertiesFile !== null ) {
      // @ts-ignore
      group.properties = await this.deCompressProperty( propertiesFile )
    }
    return group;
  }
  private async getModelFromLocalCache( id: string ): Promise<Blob> {
    const found = await this._db.models.where( "id" ).equals( id ).toArray();
    return found[0]?.file;
  }
  private async save( id: string, url: string ) {
    const rawData = await fetch( url );
    const file = await rawData.blob()
    await this._db.open();
    await this._db.models.add( {
      id,
      file,
    } );
    this._db.close();
    URL.revokeObjectURL( url )
  }
  private async delete( ids: string[] ) {
    try {
      await this._db.open();
      for ( const id of ids ) {
        await this._db.models.where( "id" ).equals( id ).delete();
      }
      this._db.close();
    } catch ( error ) {
      console.log( error );
    }

  }
  getIdFromLocal( file: File ) {
    return `${file.name}-${file.lastModified}-${file.size}`
  }
  async saveFragmentGroup( group: FragmentsGroup, id = group.uuid ) {
    const fragments = await this.fragmentManager
    if ( !fragments ) return
    const { fragmentsCacheID, propertiesCacheID } = this.getIDs( id );
    const exported = fragments.export( group );
    const compressedFrag = pako.deflate( new Uint8Array( exported ) )
    const fragmentsFile = new File( [new Blob( [compressedFrag] )], fragmentsCacheID );
    const fragmentsUrl = URL.createObjectURL( fragmentsFile );
    await this.save( fragmentsCacheID, fragmentsUrl );
    // @ts-ignore
    if ( group.properties ) {
      // @ts-ignore
      await this.compressProperty( group.properties, propertiesCacheID )
    }
  }
  private async compressProperty( properties: any, propertiesCacheID: string ) {
    const compressedProp = pako.deflate( JSON.stringify( properties ) )
    const jsonFile = new File( [new Blob( [compressedProp] )], propertiesCacheID );
    const propertiesUrl = URL.createObjectURL( jsonFile );
    await this.save( propertiesCacheID, propertiesUrl );
  }
  private async deCompressProperty( propertiesFile: any ) {
    const propData = await propertiesFile.arrayBuffer();
    const deCompressedProp = pako.inflate( propData, { to: 'string' } )
    return JSON.parse( deCompressedProp )
  }
  private getIDs( id: string ) {
    return {
      fragmentsCacheID: `${id}-fragments`,
      propertiesCacheID: `${id}-properties`,
    };
  }
  /**
   *
   */
  constructor( private fragmentManager: FragmentManager ) {
    this._db = new ModelDatabase();
  }

}