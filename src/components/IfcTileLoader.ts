import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as FRAG from "@thatopen/fragments";
import * as WEBIFC from "web-ifc";
import {CustomIfcStreamer} from "./CustomIfcStreamer";
import {groupsSignal} from "./signal";
interface StreamedProperties {
  types: {
    [typeID: number]: number[];
  };

  ids: {
    [id: number]: number;
  };

  indexesFile: string;
}
export class IfcTileLoader extends OBC.Component implements OBC.Disposable {
  /**
   * A unique identifier for the component.
   * This UUID is used to register the component within the Components system.
   */
  static readonly uuid = "b07943e1-a81f-455c-a459-516baf395d6f" as const;

  enabled = false;

  /** {@link Disposable.onDisposed} */
  readonly onDisposed = new OBC.Event();

  private webIfc: WEBIFC.LoaderSettings = {
    COORDINATE_TO_ORIGIN: true,
    //@ts-ignore
    OPTIMIZE_PROFILES: true,
  } as const;

  private wasm = {
    path: "https://unpkg.com/web-ifc@0.0.57/",
    absolute: true,
    logLevel: WEBIFC.LogLevel.LOG_LEVEL_OFF as WEBIFC.LogLevel | undefined,
  } as const;

  private excludedCategories = new Set([
    WEBIFC.IFCSPACE,
    WEBIFC.IFCREINFORCINGBAR,
    WEBIFC.IFCOPENINGELEMENT,
  ]);
  // S3 storage ${host}/${bucket_name}/${modelId}
  artifactModelData: {
    [uuid: string]: {
      modelServer: {modelId: string; name: string};
      settings: {
        assets: OBC.StreamedAsset[];
        geometries: OBC.StreamedGeometries;
      };
      groupBuffer: Uint8Array;
      propertyStorageFiles: {name: string; bits: Blob}[];
      propertyServerData: {
        name: string;
        modelId: string;
        data: {[id: number]: any};
      }[];
      streamedGeometryFiles: {[fileName: string]: Uint8Array};
    };
  } = {};

  readonly onUpdateServerModels: OBC.AsyncEvent<any> = new OBC.AsyncEvent();
  /**
   *
   * @param components
   */
  constructor(components: OBC.Components) {
    super(components);
    this.components.add(IfcTileLoader.uuid, this);
  }
  /** {@link Disposable.dispose} */
  dispose() {
    this.artifactModelData = {};
    this.onDisposed.trigger();
    this.onDisposed.reset();
  }

  async streamIfc(file: File) {
    const buffer = new Uint8Array(await file?.arrayBuffer());
    const modelId = THREE.MathUtils.generateUUID();
    const name = file.name;
    /* ==========  IfcPropertyTiler  ========== */
    const ifcPropertiesTiler = this.components.get(OBC.IfcPropertiesTiler);
    ifcPropertiesTiler.settings.wasm = this.wasm;
    ifcPropertiesTiler.settings.autoSetWasm = false;
    ifcPropertiesTiler.settings.webIfc = this.webIfc;
    ifcPropertiesTiler.settings.excludedCategories = this.excludedCategories;
    ifcPropertiesTiler.settings.propertiesSize = 500;
    ifcPropertiesTiler.onIndicesStreamed.reset();
    ifcPropertiesTiler.onPropertiesStreamed.reset();
    ifcPropertiesTiler.onProgress.reset();

    // storage in S3 because it's large size
    const jsonFile: StreamedProperties = {
      types: {},
      ids: {},
      indexesFile: `properties`,
    };
    // storage in S3 because it's large size
    const propertyStorageFiles: {name: string; bits: Blob}[] = [];
    // post request to server to storage in mongdb
    const propertyServerData: {
      name: string;
      modelId: string;
      data: {[id: number]: any};
    }[] = [];

    let counter = 0;
    // storage in S3 because it's large size
    let propertyJson: FRAG.IfcProperties;
    // storage in S3 because it's large size
    let assets: OBC.StreamedAsset[] = [];
    // storage in S3 because it's large size
    let geometries: OBC.StreamedGeometries;
    // storage in S3 because it's large size
    let groupBuffer: Uint8Array;

    let geometryFilesCount = 0;
    // storage in S3 because it's large size
    const streamedGeometryFiles: {[fileName: string]: Uint8Array} = {};

    const modelServer = {modelId, name};

    const onSuccess = async () => {
      const customIfcStreamer = this.components.get(CustomIfcStreamer);
      if (!customIfcStreamer) return;
      customIfcStreamer.fromServer = false;
      if (
        propertyStorageFiles.length === 0 ||
        propertyServerData.length === 0 ||
        assets.length === 0 ||
        geometries === undefined ||
        groupBuffer === undefined ||
        !propertyJson
      )
        return;
      const settings = {assets, geometries} as OBF.StreamLoaderSettings;
      const group = await customIfcStreamer.loadFromLocal(
        settings,
        groupBuffer,
        true,
        propertyJson
      );
      groupsSignal.value = [...groupsSignal.value, group];
      const uuid = group.uuid;
      if (!this.artifactModelData[uuid]) {
        this.artifactModelData[uuid] = {
          modelServer,
          settings,
          groupBuffer,
          propertyStorageFiles,
          propertyServerData,
          streamedGeometryFiles,
        };
      }
    };

    ifcPropertiesTiler.onPropertiesStreamed.add(
      async (props: {type: number; data: {[id: number]: any}}) => {
        const {type, data} = props;
        if (!jsonFile.types[type]) jsonFile.types[type] = [];
        jsonFile.types[type].push(counter);
        if (!propertyJson) propertyJson = {};
        for (const id in data) {
          jsonFile.ids[id] = counter;
          if (!propertyJson[id]) propertyJson[id] = data[id];
        }

        const name = `properties-${counter}`;

        propertyServerData.push({data, name, modelId});
        counter++;
      }
    );
    ifcPropertiesTiler.onIndicesStreamed.add(
      async (props: Map<number, Map<number, number[]>>) => {
        const bits = new Blob([JSON.stringify(jsonFile)]);
        propertyStorageFiles.push({
          name: `properties.json`,
          bits,
        });
        const relations = this.components.get(OBC.IfcRelationsIndexer);
        const serializedRels = relations.serializeRelations(props);
        propertyStorageFiles.push({
          name: `properties-indexes.json`,
          bits: new Blob([serializedRels]),
        });
      }
    );
    ifcPropertiesTiler.onProgress.add(async (progress: number) => {
      if (progress !== 1) return;
      await onSuccess();
    });
    await ifcPropertiesTiler.streamFromBuffer(buffer);
    /* ==========  IfcGeometryTiler  ========== */
    const ifcGeometryTiler = this.components.get(OBC.IfcGeometryTiler);
    ifcGeometryTiler.settings.wasm = this.wasm;
    ifcGeometryTiler.settings.autoSetWasm = false;
    ifcGeometryTiler.settings.webIfc = this.webIfc;
    ifcGeometryTiler.settings.excludedCategories = this.excludedCategories;
    ifcGeometryTiler.settings.minGeometrySize = 10;
    ifcGeometryTiler.settings.minAssetsSize = 1000;
    ifcGeometryTiler.onAssetStreamed.reset();
    ifcGeometryTiler.onGeometryStreamed.reset();
    ifcGeometryTiler.onIfcLoaded.reset();
    ifcGeometryTiler.onProgress.reset();

    const streamGeometry = async (
      data: OBC.StreamedGeometries,
      buffer: Uint8Array
    ) => {
      const geometryFile = `geometries-${geometryFilesCount}.frag`;
      if (geometries === undefined) geometries = {};
      for (const id in data) {
        if (!geometries[id]) geometries[id] = {...data[id], geometryFile};
      }
      if (!streamedGeometryFiles[geometryFile])
        streamedGeometryFiles[geometryFile] = buffer;
      geometryFilesCount++;
    };

    ifcGeometryTiler.onAssetStreamed.add(
      async (assetItems: OBC.StreamedAsset[]) => {
        assets = [...assets, ...assetItems];
      }
    );

    ifcGeometryTiler.onGeometryStreamed.add(
      async ({
        data,
        buffer,
      }: {
        data: OBC.StreamedGeometries;
        buffer: Uint8Array;
      }) => {
        await streamGeometry(data, buffer);
      }
    );

    ifcGeometryTiler.onIfcLoaded.add(async (group: Uint8Array) => {
      groupBuffer = group;
      await onSuccess();
    });
    ifcGeometryTiler.onProgress.add(async (progress: number) => {
      if (progress !== 1) return;
      await onSuccess();
    });
    await ifcGeometryTiler.streamFromBuffer(buffer);
  }
}
