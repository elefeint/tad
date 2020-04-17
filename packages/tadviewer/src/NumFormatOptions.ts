import * as Immutable from "immutable";

export interface NumFormatOptionsProps {
  type: string;
  commas: boolean;
  decimalPlaces: number | undefined;
  exponential: boolean;
}

const defaultNumFormatOptionsProps: NumFormatOptionsProps = {
  type: "NumFormatOptions",
  commas: true,
  decimalPlaces: 2,
  exponential: false
};

export class NumFormatOptions
  extends Immutable.Record(defaultNumFormatOptionsProps)
  implements NumFormatOptionsProps {
  public readonly type!: string;
  public readonly commas!: boolean;
  public readonly decimalPlaces!: number | undefined;
  public readonly exponential!: boolean;

  getFormatter() {
    const fmtOpts = {
      minimumFractionDigits: this.decimalPlaces,
      maximumFractionDigits: this.decimalPlaces,
      useGrouping: this.commas
    };

    const ff = (val?: number | null): string | undefined | null => {
      if (val == null) {
        return null;
      }

      let ret;

      if (this.exponential) {
        if (this.decimalPlaces) {
          ret = val.toExponential(this.decimalPlaces);
        } else {
          ret = val.toExponential();
        }
      } else {
        ret = val.toLocaleString(undefined, fmtOpts);
      }

      return ret;
    };

    return ff;
  }
}
