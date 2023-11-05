import * as WEBIFC from "web-ifc";
import * as THREE from "three";

export class Units {
  factor = 1;
  complement = 1;
  private readonly UnitSymbol = {
    "MILLI METRE": "mm",
    METRE: "m",
    SQUARE_METRE: "m²",
    CUBIC_METRE: "m³",
    "KILO GRAM": "kg",
    FOOT: "ft",
    "SQUARE FOOT": "ft²",
    "CUBIC FOOT": "ft³",
  };
  private readonly UnitScale = {
    MILLI: 0.001,
    CENTI: 0.01,
    DECI: 0.1,
    NONE: 1,
    DECA: 10,
    HECTO: 100,
    KILO: 1000,
  };
  units = {}
  apply( matrix: THREE.Matrix4 ) {
    const scale = this.getScaleMatrix();
    const result = scale.multiply( matrix );
    matrix.copy( result );
  }

  setUp( webIfc: WEBIFC.IfcAPI ) {
    this.factor = 1;
    const length = this.getLengthUnits( webIfc );
    this.getAllUnits( webIfc )
    if ( !length ) {
      return;
    }
    const isLengthNull = length === undefined || length === null;
    const isValueNull = length.Name === undefined || length.Name === null;
    if ( isLengthNull || isValueNull ) {
      return;
    }
    if ( length.Name.value === "FOOT" ) {
      this.factor = 0.3048;
    } else if ( length.Prefix?.value === "MILLI" ) {
      this.complement = 0.001;
    }
  }

  private getLengthUnits( webIfc: WEBIFC.IfcAPI ) {
    try {
      const allUnitsAssigns = webIfc.GetLineIDsWithType(
        0,
        WEBIFC.IFCUNITASSIGNMENT
      );
      const unitsAssign = allUnitsAssigns.get( 0 );
      const unitsAssignProps = webIfc.GetLine( 0, unitsAssign );
      for ( const units of unitsAssignProps.Units ) {
        if ( !units || units.value === null || units.value === undefined ) {
          continue;
        }
        const unitsProps = webIfc.GetLine( 0, units.value );
        if ( unitsProps.UnitType && unitsProps.UnitType.value === "LENGTHUNIT" ) {
          return unitsProps;
        }

      }
      return null;
    } catch ( e ) {
      console.log( "Could not get units" );
      return null;
    }
  }
  private getAllUnits( webIfc: WEBIFC.IfcAPI ) {
    try {
      const allUnitsAssigns = webIfc.GetLineIDsWithType(
        0,
        WEBIFC.IFCUNITASSIGNMENT
      );
      const unitsAssign = allUnitsAssigns.get( 0 );
      const unitsAssignProps = webIfc.GetLine( 0, unitsAssign );
      for ( const units of unitsAssignProps.Units ) {
        if ( !units || units.value === null || units.value === undefined ) {
          continue;
        }
        let mType;
        const unitsProps = webIfc.GetLine( 0, units.value );
        const pstrUoM = unitsProps.Prefix ? unitsProps.Prefix.value + " " : "";
        const strUoM = pstrUoM + unitsProps.Name.value;
        if ( unitsProps.UnitType && unitsProps.UnitType.value ) {
          switch ( unitsProps.UnitType.value ) {
            case "MASSUNIT":
              mType = "mass";
              break;
            case "LENGTHUNIT":
              mType = "length";
              break;
            case "AREAUNIT":
              mType = "area";
              break;
            case "VOLUMEUNIT":
              mType = "volume";
              break;
            default:
              break;
          }
          let scale;
          if ( unitsProps.Prefix === null || unitsProps.Prefix === undefined ) scale = this.UnitScale.NONE;
          else scale = this.UnitScale[unitsProps.Prefix.value];
          if ( mType ) {
            this.units[mType] = {
              symbol: this.UnitSymbol[strUoM],
              scale: scale,
            };
          }
        }

      }
    } catch ( e ) {
      console.log( "Could not get units" );
    }
  }

  private getScaleMatrix() {
    const f = this.factor;
    // prettier-ignore
    return new THREE.Matrix4().fromArray( [
      f, 0, 0, 0,
      0, f, 0, 0,
      0, 0, f, 0,
      0, 0, 0, 1,
    ] );
  }
}
