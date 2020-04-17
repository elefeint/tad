import { ViewParams } from "./ViewParams";
import { ViewState } from "./ViewState";
import { AppState } from "./AppState";
import * as reltab from "reltab";
import * as constants from "./components/constants";
import { Path, PathTree } from "aggtree";
import * as aggtree from "aggtree";

type RefUpdater = (f: (s: AppState) => AppState) => void; // called after main process initialization completes:

export const initAppState = async (
  rtc: reltab.Connection,
  windowTitle: string,
  baseQuery: reltab.QueryExp,
  initialViewParams: ViewParams | undefined | null,
  updater: RefUpdater
): Promise<void> => {
  const baseSchema = await aggtree.getBaseSchema(rtc, baseQuery);

  // start off with all columns displayed:
  const displayColumns = baseSchema.columns.slice();
  let viewParams;

  if (initialViewParams != null) {
    viewParams = initialViewParams;
  } else {
    const openPaths = new PathTree();
    viewParams = new ViewParams({
      displayColumns,
      openPaths
    });
  }

  const viewState = new ViewState({
    viewParams
  }); // We explicitly set rather than merge() because merge
  // will attempt to deep convert JS objects to Immutables

  updater(
    (st: AppState): AppState =>
      st
        .set("windowTitle", windowTitle)
        .set("rtc", rtc)
        .set("baseSchema", baseSchema)
        .set("baseQuery", baseQuery)
        .set("viewState", viewState)
        .set("initialized", true) as AppState
  );
}; // helper to hoist a ViewParams => ViewParams fn to an AppState => AppState
// Always resets the viewport

const vpUpdate = (f: (vp: ViewParams) => ViewParams) => (
  s: AppState
): AppState => s.updateIn(["viewState", "viewParams"], f) as AppState;

export const toggleShown = (cid: string, updater: RefUpdater): void => {
  updater(vpUpdate(viewParams => viewParams.toggleShown(cid)));
};
export const toggleAllShown = (updater: RefUpdater): void => {
  updater(s => {
    const schema = s.baseSchema;
    const viewParams = s.viewState.viewParams;
    const allShown = schema.columns.length === viewParams.displayColumns.length;
    const nextDisplayColumns = allShown ? [] : schema.columns;
    return vpUpdate(
      viewParams =>
        viewParams.set("displayColumns", nextDisplayColumns) as ViewParams
    )(s);
  });
};
export const togglePivot = (cid: string, updater: RefUpdater): void => {
  updater(vpUpdate(viewParams => viewParams.togglePivot(cid)));
};
export const toggleSort = (cid: string, updater: RefUpdater): void => {
  updater(vpUpdate(viewParams => viewParams.toggleSort(cid)));
};
export const setSortDir = (
  cid: string,
  asc: boolean,
  updater: RefUpdater
): void => {
  updater(vpUpdate(viewParams => viewParams.setSortDir(cid, asc)));
};
export const toggleShowRoot = (updater: RefUpdater): void => {
  updater(
    vpUpdate(
      viewParams =>
        viewParams.set("showRoot", !viewParams.showRoot) as ViewParams
    )
  );
};
export const reorderColumnList = (dstProps: any, srcProps: any) => {
  console.log("reorderColumnList: ", dstProps, srcProps);

  if (dstProps.columnListType !== srcProps.columnListType) {
    console.log("mismatched column list types, ignoring...");
    return;
  }

  const fieldKey = dstProps.columnListType;
  const isSortKey = fieldKey === constants.ColumnListType.SORT;
  dstProps.stateRefUpdater(
    vpUpdate(viewParams => {
      let colList = viewParams.get(fieldKey).slice();

      if (isSortKey) {
        const srcSortKey = srcProps.rowData;
        const srcIndex = colList.findIndex((k: any) => k[0] === srcSortKey[0]);

        if (srcIndex === -1) {
          return viewParams;
        } // remove source from its current position:

        colList.splice(srcIndex, 1);
        const dstSortKey = dstProps.rowData;
        const dstIndex = colList.findIndex((k: any) => k[0] === dstSortKey[0]);

        if (dstIndex === -1) {
          return viewParams;
        }

        colList.splice(dstIndex, 0, srcSortKey);
        return viewParams.set(fieldKey, colList) as ViewParams;
      } else {
        const srcColumnId = srcProps.rowData;
        const srcIndex = colList.indexOf(srcColumnId);

        if (srcIndex === -1) {
          return viewParams;
        } // remove source from its current position:

        colList.splice(srcIndex, 1);
        const dstColumnId = dstProps.rowData;
        const dstIndex = colList.indexOf(dstColumnId);

        if (dstIndex === -1) {
          return viewParams;
        }

        colList.splice(dstIndex, 0, srcColumnId);

        if (fieldKey === "vpivots") {
          // evil hack
          return viewParams.setVPivots(colList);
        } else {
          return viewParams.set(fieldKey, colList) as ViewParams;
        }
      }
    })
  );
};
/*
 * single column version of setting sort key
 * (until we implement compound sort keys)
 */

export const setSortKey = (
  sortKey: Array<[string, boolean]>,
  updater: RefUpdater
) => {
  console.log("setSortKey: ", sortKey);
  updater(
    vpUpdate(viewParams => viewParams.set("sortKey", sortKey) as ViewParams)
  );
};

export const setColumnOrder = (
  displayColumns: Array<string>,
  updater: RefUpdater
) => {
  updater(
    vpUpdate(
      viewParams =>
        viewParams.set("displayColumns", displayColumns) as ViewParams
    )
  );
};

export const openPath = (path: Path, updater: RefUpdater) => {
  updater(vpUpdate(viewParams => viewParams.openPath(path)));
};

export const closePath = (path: Path, updater: RefUpdater) => {
  updater(vpUpdate(viewParams => viewParams.closePath(path)));
};

export const setAggFn = (
  cid: string,
  aggFn: reltab.AggFn,
  updater: RefUpdater
) => {
  updater(vpUpdate(viewParams => viewParams.setAggFn(cid, aggFn)));
};

export const updateViewport = (
  top: number,
  bottom: number,
  updater: RefUpdater
) => {
  updater(
    st =>
      st.update(
        "viewState",
        vs =>
          vs.set("viewportTop", top).set("viewportBottom", bottom) as ViewState
      ) as AppState
  );
};

export const setDefaultFormatOptions = (
  colType: string,
  opts: any,
  updater: RefUpdater
) => {
  updater(
    vpUpdate(
      viewParams =>
        viewParams.setIn(["defaultFormats", colType], opts) as ViewParams
    )
  );
};

export const setColumnFormatOptions = (
  cid: string,
  opts: any,
  updater: RefUpdater
) => {
  updater(vpUpdate(viewParams => viewParams.setColumnFormat(cid, opts)));
};

export const setShowHiddenCols = (show: boolean, updater: RefUpdater) => {
  updater(
    vpUpdate(viewParams => viewParams.set("showHiddenCols", show) as ViewParams)
  );
};

export const setExportDialogOpen = (
  openState: boolean,
  saveFilename: string,
  updater: RefUpdater
) => {
  updater(
    s =>
      s
        .set("exportDialogOpen", openState)
        .set("exportFilename", saveFilename) as AppState
  );
};

export const setExportProgress = (
  percentComplete: number,
  updater: RefUpdater
) => {
  updater(s => s.set("exportPercent", percentComplete) as AppState);
};

export const setFilter = (fe: reltab.FilterExp, updater: RefUpdater) => {
  updater(
    vpUpdate(viewParams => viewParams.set("filterExp", fe) as ViewParams)
  );
};

/*
 * TODO: dead code?
export const ensureDistinctColVals = (colId: string, updater: RefUpdater) => {
  updater(appState => {
    const updSet = appState.requestedColumnVals.add(colId);
    return appState.set("requestedColumnVals", updSet);
  });
};
*/
